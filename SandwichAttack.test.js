import { expect } from "chai";
import { network } from "hardhat";

describe("Sandwich Attack Simulation", function () {
  let tokenA, tokenB, dex, ethers;
  let owner, victim, attacker;

  beforeEach(async function () {
    const connection = await network.connect();
    ethers = connection.ethers;

    [owner, victim, attacker] = await ethers.getSigners();

    const TokenA = await ethers.getContractFactory("ProToken");
    tokenA = await TokenA.deploy(1000000);

    const TokenB = await ethers.getContractFactory("ProToken");
    tokenB = await TokenB.deploy(1000000);

    const DEX = await ethers.getContractFactory("SimpleDEX");
    dex = await DEX.deploy(tokenA.target, tokenB.target);

    // انتقال توکن‌ها
    await tokenA.transfer(victim.address, 1000n * 10n ** 18n);
    await tokenB.transfer(victim.address, 1000n * 10n ** 18n);
    await tokenA.transfer(attacker.address, 10000n * 10n ** 18n);
    await tokenB.transfer(attacker.address, 10000n * 10n ** 18n);

    // victim نقدینگی اضافه می‌کنه
    await tokenA.connect(victim).approve(dex.target, 500n * 10n ** 18n);
    await tokenB.connect(victim).approve(dex.target, 500n * 10n ** 18n);
    await dex.connect(victim).addLiquidity(500n * 10n ** 18n, 500n * 10n ** 18n);
  });

  it("Sandwich attack: victim loses without slippage protection", async function () {
    const swapAmount = 50n * 10n ** 18n;
    await tokenA.connect(victim).approve(dex.target, swapAmount);

    const block = await ethers.provider.getBlock("latest");
    const deadline = block.timestamp + 3600;

    // ۱. مهاجم قبل از victim، توکن A می‌خره → قیمت A بالا می‌ره
    await tokenA.connect(attacker).approve(dex.target, 200n * 10n ** 18n);
    await dex.connect(attacker).swap(tokenA.target, 200n * 10n ** 18n, 0, deadline);

    // ۲. victim الان swap می‌کنه، ولی قیمت خرابه → B کمتر می‌گیره
    const victimBefore = await tokenB.balanceOf(victim.address);
    await dex.connect(victim).swap(tokenA.target, swapAmount, 0, deadline);
    const victimAfter = await tokenB.balanceOf(victim.address);
    const victimReceived = victimAfter - victimBefore;

    // ۳. مهاجم Bهایی که خریده رو می‌فروشه → سود می‌کنه
    const attackerBefore = await tokenB.balanceOf(attacker.address);
    await tokenB.connect(attacker).approve(dex.target, attackerBefore);
    await dex.connect(attacker).swap(tokenB.target, attackerBefore, 0, deadline);
    const attackerAfter = await tokenB.balanceOf(attacker.address);

    // victim B کمتری گرفته (چون قیمت خراب شده)
    console.log("Victim received:", victimReceived.toString());
    expect(victimReceived).to.be.lessThan(50n * 10n ** 18n);
  });

  it("Slippage protection blocks sandwich attack", async function () {
    const swapAmount = 50n * 10n ** 18n;
    await tokenA.connect(victim).approve(dex.target, swapAmount);

    const block = await ethers.provider.getBlock("latest");
    const deadline = block.timestamp + 3600;

    // ۱. مهاجم قبل از victim، توکن A می‌خره → قیمت A بالا می‌ره
    await tokenA.connect(attacker).approve(dex.target, 200n * 10n ** 18n);
    await dex.connect(attacker).swap(tokenA.target, 200n * 10n ** 18n, 0, deadline);

    // ۲. victim با minAmountOut بالا swap می‌کنه
    //    چون قیمت خراب شده، مقدار خروجی از minAmountOut کمتره
    //    → تراکنش revert میشه!
    const minAmountOut = 49n * 10n ** 18n;

    await expect(
      dex.connect(victim).swap(tokenA.target, swapAmount, minAmountOut, deadline)
    ).to.be.revert(ethers);
  });
});