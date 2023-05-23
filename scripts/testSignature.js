  const { ethers } = require('hardhat');
  const { BigNumber } = require('@ethersproject/bignumber');

    let provider = ethers.provider;
    let account = new ethers.Wallet(process.env.PRIVATE_KEY);
    signer = account.connect(provider);

    async function signToken(_claimContractAddress, _address, amount, startTime) {
        console.log("amount before:");
        console.log(amount);
        amount = BigNumber.from(amount).toString();
        console.log("amount: ");
        console.log(amount);

        console.log("startTime before:");
        console.log(startTime);
        startTime = BigNumber.from(startTime).toString();
        console.log("startTime: ");
        console.log(startTime);
        console.log(_address, amount, startTime);

        // yanlislikla farkli claim kotnratlarinda kullanimlamasi icin signature icinde kontratin adresi de var
        let messageHash = ethers.utils.solidityKeccak256(
            ['address', 'address', 'uint256', 'uint256'],
            [_claimContractAddress, _address, amount, startTime]
        );
        console.log("messageHash: ", messageHash);
        
        let messageHashBinary = ethers.utils.arrayify(messageHash);
        console.log("messageHashBinary: ", messageHashBinary);

        let signatureRet = await signer.signMessage(messageHashBinary);
        return signatureRet;
    }

    async function main() {
        let claimContractAddress = "0x9ecEA68DE55F316B702f27eE389D10C2EE0dde84";
        let address = "0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB";
        let amount = 1684315414;
        let startTime = 1684315414;

        let signature = await signToken(claimContractAddress, address, amount, startTime);
        console.log("signature: ", signature);
        console.log("signer address: ", account.address);
    }

    main() ;