import { expect } from "chai";
import { network } from "hardhat";

describe("SimpleDEX", function () {
  let tokenA, tokenB, dex, ethers;
  let owner, user1, user2;

  beforeEach(async function () {
    const connection = await network.connect();
    ethers = connection.ethers;

    [owner, user1, user2] = await ethers.getSigners();

    const TokenA = await ethers.getContractFactory("ProToken");
    tokenA = await TokenA.deploy(1000000);

    const TokenB = await ethers.getContractFactory("ProToken");
    tokenB = await TokenB.deploy(1000000);

    const DEX = await ethers.getContractFactory("SimpleDEX");
    dex = await DEX.deploy(tokenA.target, tokenB.target);

    await tokenA.transfer(user1.address, 1000n * 10n ** 18n);
    await tokenB.transfer(user1.address, 1000n * 10n ** 18n);
    await tokenA.transfer(user2.address, 1000n * 10n ** 18n);
    await tokenB.transfer(user2.address, 1000n * 10n ** 18n);
  });

  it("Should set the right token addresses", async function () {
    expect(await dex.tokenA()).to.equal(tokenA.target);
    expect(await dex.tokenB()).to.equal(tokenB.target);
  });

  it("Should add liquidity correctly", async function () {
    const amountA = 100n * 10n ** 18n;
    const amountB = 200n * 10n ** 18n;

    await tokenA.connect(user1).approve(dex.target, amountA);
    await tokenB.connect(user1).approve(dex.target, amountB);

    await dex.connect(user1).addLiquidity(amountA, amountB);

    const [reserveA, reserveB] = await dex.getReserves();
    expect(reserveA).to.equal(amountA);
    expect(reserveB).to.equal(amountB);
    expect(await dex.balanceOf(user1.address)).to.equal(amountA + amountB);
  });

  it("Should swap tokens correctly", async function () {
    const amountA = 100n * 10n ** 18n;
    const amountB = 100n * 10n ** 18n;

    await tokenA.connect(user1).approve(dex.target, amountA);
    await tokenB.connect(user1).approve(dex.target, amountB);
    await dex.connect(user1).addLiquidity(amountA, amountB);

    const swapAmount = 10n * 10n ** 18n;
    await tokenA.connect(user2).approve(dex.target, swapAmount);

    const block = await ethers.provider.getBlock("latest");
    const deadline = block.timestamp + 3600;

    const balanceBefore = await tokenB.balanceOf(user2.address);
    await dex.connect(user2).swap(tokenA.target, swapAmount, 0, deadline);
    const balanceAfter = await tokenB.balanceOf(user2.address);

    expect(balanceAfter).to.be.greaterThan(balanceBefore);
  });

  it("Should revert swap if deadline passed", async function () {
    const amountA = 100n * 10n ** 18n;
    const amountB = 100n * 10n ** 18n;

    await tokenA.connect(user1).approve(dex.target, amountA);
    await tokenB.connect(user1).approve(dex.target, amountB);
    await dex.connect(user1).addLiquidity(amountA, amountB);

    const swapAmount = 10n * 10n ** 18n;
    await tokenA.connect(user2).approve(dex.target, swapAmount);

    const block = await ethers.provider.getBlock("latest");
    const pastDeadline = block.timestamp - 1;

    await expect(
      dex.connect(user2).swap(tokenA.target, swapAmount, 0, pastDeadline)
    ).to.be.revert(ethers);
  });

  it("Should revert swap if slippage too high", async function () {
    const amountA = 100n * 10n ** 18n;
    const amountB = 100n * 10n ** 18n;

    await tokenA.connect(user1).approve(dex.target, amountA);
    await tokenB.connect(user1).approve(dex.target, amountB);
    await dex.connect(user1).addLiquidity(amountA, amountB);

    const swapAmount = 10n * 10n ** 18n;
    await tokenA.connect(user2).approve(dex.target, swapAmount);

    const block = await ethers.provider.getBlock("latest");
    const deadline = block.timestamp + 3600;

    const tooHighMinAmount = 100n * 10n ** 18n;

    await expect(
      dex.connect(user2).swap(tokenA.target, swapAmount, tooHighMinAmount, deadline)
    ).to.be.revert(ethers);
  });

  it("Should remove liquidity correctly", async function () {
    const amountA = 100n * 10n ** 18n;
    const amountB = 100n * 10n ** 18n;

    await tokenA.connect(user1).approve(dex.target, amountA);
    await tokenB.connect(user1).approve(dex.target, amountB);
    await dex.connect(user1).addLiquidity(amountA, amountB);

    const lpTokens = await dex.balanceOf(user1.address);
    await dex.connect(user1).removeLiquidity(lpTokens);

    const [reserveA, reserveB] = await dex.getReserves();
    expect(reserveA).to.equal(0);
    expect(reserveB).to.equal(0);
    expect(await dex.balanceOf(user1.address)).to.equal(0);
  });

  it("Should not allow swap with invalid token", async function () {
    const amountA = 100n * 10n ** 18n;
    const amountB = 100n * 10n ** 18n;

    await tokenA.connect(user1).approve(dex.target, amountA);
    await tokenB.connect(user1).approve(dex.target, amountB);
    await dex.connect(user1).addLiquidity(amountA, amountB);

    const block = await ethers.provider.getBlock("latest");
    const deadline = block.timestamp + 3600;

    await expect(
      dex.connect(user2).swap(owner.address, 10n * 10n ** 18n, 0, deadline)
    ).to.be.revert(ethers);
  });

  it("Should not allow addLiquidity with zero amount", async function () {
    await expect(
      dex.connect(user1).addLiquidity(0, 100n * 10n ** 18n)
    ).to.be.revert(ethers);
  });
});