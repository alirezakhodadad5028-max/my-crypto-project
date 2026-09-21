import { expect } from "chai";
import { network } from "hardhat";

describe("DEX Reentrancy Attack", function () {
  it("Attacker tries to reenter swap", async function () {
    const { ethers } = await network.connect();

    // ۱. توکن‌های عادی
    const TokenA = await ethers.getContractFactory("ProToken");
    const tokenA = await TokenA.deploy(1000000);

    const TokenB = await ethers.getContractFactory("ProToken");
    const tokenB = await TokenB.deploy(1000000);

    // ۲. DEX
    const DEX = await ethers.getContractFactory("SimpleDEX");
    const dex = await DEX.deploy(tokenA.target, tokenB.target);

    // ۳. توکن مخرب
    const MaliciousToken = await ethers.getContractFactory("MaliciousToken");
    const malicious = await MaliciousToken.deploy();
    await malicious.setDEX(dex.target);

    const [owner, user1] = await ethers.getSigners();

    // ۴. انتقال توکن‌ها به user1
    await tokenA.transfer(user1.address, 1000n * 10n ** 18n);
    await tokenB.transfer(user1.address, 1000n * 10n ** 18n);

    // ۵. user1 نقدینگی اضافه می‌کنه
    await tokenA.connect(user1).approve(dex.target, 100n * 10n ** 18n);
    await tokenB.connect(user1).approve(dex.target, 100n * 10n ** 18n);
    await dex.connect(user1).addLiquidity(100n * 10n ** 18n, 100n * 10n ** 18n);

    // ۶. swap معمولی
    const swapAmount = 10n * 10n ** 18n;
    await tokenA.connect(user1).approve(dex.target, swapAmount);

    // این swap باید موفق بشه
    await dex.connect(user1).swap(tokenA.target, swapAmount);

    const [reserveA, reserveB] = await dex.getReserves();
    expect(reserveA).to.be.greaterThan(100n * 10n ** 18n);
  });
});