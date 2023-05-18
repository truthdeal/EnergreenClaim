// Import necessary modules
const { ethers } = require('hardhat');
const { expect } = require("chai");
const { BigNumber } = require('@ethersproject/bignumber');

// Define total supply for claim
const CLAIM_TOTAL_SUPPLY = ethers.utils.parseEther("100000");

// Initialize variables
let provider = ethers.getDefaultProvider();
let tokenInstance, owner, holder, signer, acc1, acc2, claimStartTimestamp;

// Function to travel in time in the EVM
async function timeTravelV2(sec) {
    await ethers.provider.send('evm_increaseTime', [sec]);
    await ethers.provider.send('evm_mine');
}

// Function to get current block timestamp
async function getCurrentTimestamp() {
    return (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
}

// Test suite for the EnergreenToken Claim
describe("EnergreenToken Claim", function () {
    // Run before all tests
    this.beforeAll(async function () {
        [owner, holder, signer, acc1, acc2, acc3, acc4, acc5, acc6, acc7, acc8, acc9, acc10 ] = await ethers.getSigners();

        let TestERC20 = await ethers.getContractFactory("TestERC20");
        let Claim = await ethers.getContractFactory("EnergreenClaim");

        tokenInstance = await TestERC20.deploy(CLAIM_TOTAL_SUPPLY, "TEST", "TEST");

        claimInstance = await Claim.deploy(
            tokenInstance.address,
            holder.address,
            signer.address
        );
        // Assert contract deployment
        expect(claimInstance.address).not.to.equal('');

        // Renounce ownership function should be disabled
        expect(claimInstance.renounceOwnership()).to.be.revertedWith("can't renounceOwnership here");

        // Transfer tokens to the holder's address
        await tokenInstance.transfer(holder.address, CLAIM_TOTAL_SUPPLY);
        expect(BigNumber.from(await tokenInstance.balanceOf(holder.address)).toString()).to.equal(CLAIM_TOTAL_SUPPLY);
        
        // Increase allowance to the claim contract
        await tokenInstance.connect(holder).increaseAllowance(claimInstance.address, CLAIM_TOTAL_SUPPLY);
    });


    // Test for the case when a signature is made for a claim in the future
    it("2 saat sonraya imzaliyor", async () => {
        timeTravelV2(60);

        claimStartTimestamp = await getCurrentTimestamp() + 2 * 60 * 60;
        let amount = ethers.utils.parseEther("250");
        let sig = await signToken(claimInstance.address, acc1.address, amount, claimStartTimestamp);

        await expect(claimInstance.connect(acc1).claimTokens(acc1.address, amount, claimStartTimestamp, sig)).to.be.revertedWith("tried to claim at future timestamp");

        // Move 2 hours into the future
        timeTravelV2(2 * 60 * 60 + 15);

        // Claim should work normally
        await claimInstance.connect(acc1).claimTokens(acc1.address, amount, claimStartTimestamp, sig);

        expect(BigNumber.from(await tokenInstance.balanceOf(acc1.address)).toString()).to.equal(amount);
    });

    // Test for the "testClaimInfo" function
    it("testClaimInfo function test", async () => {
        claimStartTimestamp = await getCurrentTimestamp() + 2 * 60 * 60;
        let amount = ethers.utils.parseEther("300");
        let sig = await signToken(claimInstance.address, acc1.address, amount, claimStartTimestamp);

        await expect(claimInstance.connect(acc1).testClaimInfo(acc1.address, amount, claimStartTimestamp, sig)).to.be.revertedWith("tried to claim at future timestamp");

        // 2 saat sonraya git
        timeTravelV2(2 * 60 * 60 + 15);

        await claimInstance.changeBlacklistStatus(acc1.address, true);
        expect((await claimInstance.isBlacklisted([acc1.address])).join(",")).to.equal("true");

        await expect(claimInstance.connect(acc1).testClaimInfo(acc1.address, amount, claimStartTimestamp, sig)).to.be.revertedWith("recipient in blacklist");

        await claimInstance.changeBlacklistStatus(acc1.address, false);
        expect((await claimInstance.isBlacklisted([acc1.address])).join(",")).to.equal("false");

        const x = await claimInstance.connect(acc1).testClaimInfo(acc1.address, amount, claimStartTimestamp, sig);
        expect(x[0]).to.equal(ethers.utils.parseEther("250")); // onceki adimda 250 cekti
        expect(x[1]).to.equal(ethers.utils.parseEther("50"));  // 50 kaldi
    });

    // Test for the case when a fake signature is used
    it("fake signature test", async () => {
        let claimAmount = ethers.utils.parseEther("250");
        let amount = BigNumber.from(claimAmount).toString();
        let startTime = BigNumber.from(claimStartTimestamp).toString();
        let messageHash = ethers.utils.solidityKeccak256(
            ['address', 'uint256', 'uint256'],
            [acc1.address, amount, startTime]
        );

        let acc2PrivKey = "0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897"; // hardhat test Account #10
        acc2 = new ethers.Wallet(acc2PrivKey, provider);

        let messageHashBinary = ethers.utils.arrayify(messageHash);
        let signature = await acc2.signMessage(messageHashBinary);

        await expect(claimInstance.connect(acc1).claimTokens(acc1.address, claimAmount, claimStartTimestamp, signature)).to.be.revertedWith('wrong signature');
    });

    // Test for the case when a user tries to make a claim twice
    it("double claim test", async () => {
        let amount = ethers.utils.parseEther("250");
        let sig = await signToken(claimInstance.address, acc1.address, amount, claimStartTimestamp);
        await expect(claimInstance.connect(acc1).claimTokens(acc1.address, amount, claimStartTimestamp, sig)).to.be.revertedWith('claim amount previosly claimed by recipient');
    });

    // Test for the case when a user tries to process another user's claim
    it("trying process another users claim", async () => {
        // claim defined to acc8
        let claimAmount = ethers.utils.parseEther("232");
        let signature2 = await signToken(claimInstance.address, acc8.address, claimAmount, claimStartTimestamp);

        // acc7 executes transaction
        await claimInstance.connect(acc7).claimTokens(acc8.address, claimAmount, claimStartTimestamp, signature2);

        // acc8 (real claim owner gets token)
        expect(BigNumber.from(await tokenInstance.balanceOf(acc8.address)).toString()).to.equal(claimAmount);
        // acc7 zero blaance
        expect(BigNumber.from(await tokenInstance.balanceOf(acc7.address)).toString()).to.equal("0");
    });

    // Test for the case when a user makes a second claim
    it("second claim test", async () => {
        // let claimAmount = ethers.utils.parseEther("50");  // amount claimed this month
        let claimLimit = ethers.utils.parseEther("300");  // total claimable amount, including past periods.

        claimStartTimestamp = (await getCurrentTimestamp()) + 2 * 60 * 60;

        let signature2 = await signToken(claimInstance.address, acc1.address, claimLimit, claimStartTimestamp);

        // if tries to claim before the time, it gets an error
        await expect(claimInstance.connect(acc1).claimTokens(acc1.address, claimLimit, claimStartTimestamp, signature2)).to.revertedWith("tried to claim at future timestamp");

        // 1 hour later if tries to claim before the time, it gets an error
        await timeTravelV2(1 * 60 * 60 + 15);
        await expect(claimInstance.connect(acc1).claimTokens(acc1.address, claimLimit, claimStartTimestamp, signature2)).to.revertedWith("tried to claim at future timestamp");

        // when claim time arrives, can claim
        await timeTravelV2(60*60);
        await claimInstance.connect(acc1).claimTokens(acc1.address, claimLimit, claimStartTimestamp, signature2);

        expect(BigNumber.from(await tokenInstance.balanceOf(acc1.address)).toString()).to.equal(claimLimit);
    });

    // Test for the case when a user makes a third claim
    it("third claim test", async () => {
        let claimLimit = ethers.utils.parseEther("400");  // total claimable amount, including past periods.

        // view function for claim information is being tested
        let oldClaimed = await claimInstance.connect(acc1).getClaimAmount(acc1.address);
        expect(oldClaimed.toString()).to.equal(ethers.utils.parseEther("300"));

        // sign for 24 hours later
        claimStartTimestamp = await getCurrentTimestamp() + 24 * 60 * 60;
        let signature2 = await signToken(claimInstance.address, acc1.address, claimLimit, claimStartTimestamp);

        // can't claim before the time comes
        await timeTravelV2(12*60*60);
        await expect(claimInstance.connect(acc1).claimTokens(acc1.address, claimLimit, claimStartTimestamp, signature2)).to.revertedWith("tried to claim at future timestamp");

        // claim time
        await timeTravelV2(12*60*60+15);
        await claimInstance.connect(acc1).claimTokens(acc1.address, claimLimit, claimStartTimestamp, signature2);

        expect(BigNumber.from(await tokenInstance.balanceOf(acc1.address)).toString()).to.equal(claimLimit);
    });

    it("blacklist test", async () => {
        let claimLimit = ethers.utils.parseEther("1");
        claimStartTimestamp = await getCurrentTimestamp();
        let signature = await signToken(claimInstance.address, acc9.address, claimLimit, claimStartTimestamp);

        await claimInstance.changeBlacklistStatus(acc9.address, true);
        expect((await claimInstance.isBlacklisted([acc9.address])).join(",")).to.equal("true");

        await expect(claimInstance.connect(acc9).claimTokens(acc9.address, claimLimit, claimStartTimestamp, signature)).to.revertedWith("recipient in blacklist");

        expect(BigNumber.from(await tokenInstance.balanceOf(acc9.address)).toString()).to.equal("0");

        await claimInstance.changeBlacklistStatus(acc9.address, false);
        expect((await claimInstance.isBlacklisted([acc9.address])).join(",")).to.equal("false");
        await claimInstance.connect(acc9).claimTokens(acc9.address, claimLimit, claimStartTimestamp, signature);
        expect(BigNumber.from(await tokenInstance.balanceOf(acc9.address)).toString()).to.equal(claimLimit.toString());
    });

    async function signToken(_claimContractAddress, _address, amount, startTime) {
        amount = BigNumber.from(amount).toString();
        startTime = BigNumber.from(startTime).toString();
        // console.log(_address, amount, startTime);

        // The contract address is also included in the signature to prevent accidental use in different claim contracts.
        let messageHash = ethers.utils.solidityKeccak256(
            ['address', 'address', 'uint256', 'uint256'],
            [_claimContractAddress, _address, amount, startTime]
        );
        let messageHashBinary = ethers.utils.arrayify(messageHash);

        let signatureRet = await signer.signMessage(messageHashBinary);
        return signatureRet;
    }

});
