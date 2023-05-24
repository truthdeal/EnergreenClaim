const { ethers } = require('hardhat');
const { BigNumber } = require('@ethersproject/bignumber');
const fs = require('fs');

const XLSX = require('xlsx');
const fetch = require('node-fetch');
require('dotenv').config();

/*  Sepolia Adresses

Energreen Claim PrivateSale1: 0x63A01A2714F2cea4152B0883706E248473FE85CC
Energreen Claim PrivateSale2: 0x13894aB24ACa4b3b0489eef0e818E1230546FE0a
Energreen Claim PublicSale: 0x0553CeB6248a5dd5592B735DfCA56c6cF93e8967

Energreen Claim PrivateSale1 Sepolia: 0x63A01A2714F2cea4152B0883706E248473FE85CC
Energreen Claim PrivateSale2 Sepolia: 0x13894aB24ACa4b3b0489eef0e818E1230546FE0a
Energreen Claim PublicSale Sepolia: 0x0553CeB6248a5dd5592B735DfCA56c6cF93e8967

Test Private 1 Claim Contract: 0xB1F8C1eC669f34d06Ac0a808f012082c30B7F9c2
Test Private 2 Claim Contract: 0xfFBdD3a2713C56a6E98f59E564aad7C784E1d6A6
Test Public Claim Contract: 0xaC9f4fd3Fde70511BC93d361338e5E206b41E44C

*/

// tgeTimeStamp can be changed in case of a new TGE date
const tgeTimestamp = 1685016900; //  2023-05-25 12:15:00 UTC 

const workbook = XLSX.readFile('scripts/src/mainnetWallets.xlsx'); // Excel file path // change for each claim contract
const sheet_name_list = workbook.SheetNames;


async function signToken(_claimContractAddress, _address, amount, startTime , _signer) {
    amount = BigNumber.from(amount).toString();
    startTime = BigNumber.from(startTime).toString();

    let messageHash = ethers.utils.solidityKeccak256(
        ['address', 'address', 'uint256', 'uint256'],
        [_claimContractAddress, _address, amount, startTime]
    );

    let messageHashBinary = ethers.utils.arrayify(messageHash);

    let signatureRet = await _signer.signMessage(messageHashBinary);
    return signatureRet;
}

async function getNewVestingMonth(_timestamp) {
    let vestingDate = new Date(Number(_timestamp.toString()) * 1000);
    vestingDate.setUTCMonth(vestingDate.getUTCMonth() + 1);
   // console.log("vestingDate: ", vestingDate.toUTCString());
    vestingDate = vestingDate.getTime() / 1000 ;
    
    return vestingDate;
}

async function getNewVestingWeek(_timestamp) {
    let vestingDate = new Date(Number(_timestamp.toString()) * 1000);
    vestingDate.setUTCDate(vestingDate.getUTCDate() + 7);
   // console.log("vestingDate: ", vestingDate.toUTCString());
    vestingDate = vestingDate.getTime() / 1000 ;
    
    return vestingDate;
}

async function createJsonData (xlData, claimContractAddress, _claimStartTimestamp, signer , isPublic , _isExcel) {


    let jsonData = [];
    let jsonUserData = [];
    let jsonBulkData = [];

    for (let data of xlData) {
        let user = data.address;
        let contract = claimContractAddress;
        let totalTokens = data.totalAmount;
        let tgeAmount = data.tgeAmount;
        let _claimLimit ;
        let vestingAmount = data.vestingAmount;
        let date ;
        let _newJsonData = [] ;

        for (let i = 0; i < data.vestingPeriod + 1; i++) {

            if (i == 0) {
                _claimLimit = ethers.utils.parseEther(tgeAmount.toString());   
                date = tgeTimestamp;      
            }
            else {
                _claimLimit = _claimLimit.add(ethers.utils.parseEther(vestingAmount.toString())); 
                if (i == 1) {
                    date = _claimStartTimestamp ;
                    //console.log("date: ", date);
                }
                else {
                    if (isPublic) {
                        date = await getNewVestingWeek(date);
                    }
                    else {
                        date = await getNewVestingMonth(date);
                    }
                }
            }
            let signature = await signToken(contract, user, _claimLimit, date , signer);

            let jsonStr = {
                recipient: user,
                claimLimit: _claimLimit.toString(),
                claimStartTimestamp: date,
                signature: signature
            };

            // Yeni JSON dosyasını oluşturuyoruz
            let newJsonData = {
                user: user,
                contract: contract,
                startDate: date,
                unlocked: _claimLimit.toString(),
                totalTokens: totalTokens,
                jsonStr: JSON.stringify(jsonStr) 
            };

            if (_isExcel) {
                jsonData.push(newJsonData);
            }
            else {
                _newJsonData.push(jsonStr); // for saving other values in excel file, use  _newJsonData.push(newJsonData) instead
            }
        }

        if(!_isExcel) {
            jsonUserData.push(user);
            jsonBulkData.push(_newJsonData);
        }
    }

    if(!_isExcel) {
        let newJsonData_ = {};
        for (i = 0; i < jsonUserData.length; i++) {
            newJsonData_[jsonUserData[i]] = jsonBulkData[i];
        }
        return newJsonData_;
    } else {
        return jsonData;
    }

}

async function priv1Sign(isExcel) {
    const claimContractAddress = "0x63A01A2714F2cea4152B0883706E248473FE85CC" ; // change for each claim contract

    const claimStartTimestamp = 1708560000 // 2024-02-22 00:00:00 UTC // change for each claim contract
    const privateKey = process.env.PRIV1_SIGNER_PRIVATE_KEY; // change for each claim contract

    const xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]); // sheet_name_list[0] is the first sheet in the workbook // change for each claim contract

    // İmzalama işlemini yapacak olan cüzdanın private keyi
    let provider = ethers.provider;
    let account = new ethers.Wallet(privateKey);
    const signer = account.connect(provider);

    let _jsonData = await createJsonData(xlData, claimContractAddress, claimStartTimestamp, signer , false , isExcel);

    console.log("Private 1 signing is completed");
    return _jsonData;

}

async function priv2sign(isExcel) {
    const claimContractAddress = "0x13894aB24ACa4b3b0489eef0e818E1230546FE0a" ; // change for each claim contract

    const claimStartTimestamp = 1705881600 // 2024-01-22 00:00:00 UTC // change for each claim contract
    const privateKey = process.env.PRIV2_SIGNER_PRIVATE_KEY; // change for each claim contract

    const xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[1]]); // sheet_name_list[1] is the second sheet in the workbook // change for each claim contract

    // İmzalama işlemini yapacak olan cüzdanın private keyi

    let provider = ethers.provider;
    let account = new ethers.Wallet(privateKey);
    const signer = account.connect(provider);


    let _jsonData = await createJsonData(xlData, claimContractAddress, claimStartTimestamp, signer , false, isExcel);

    console.log("Private 2 signing is completed");
    return _jsonData;
}

async function publicSign(isExcel) {
    const claimContractAddress = "0x0553CeB6248a5dd5592B735DfCA56c6cF93e8967" ; // change for each claim contract

    const claimStartTimestamp = 1687392000 // 2023-06-22 00:00:00 UTC // change for each claim contract
    const privateKey = process.env.PUBLIC_SIGNER_PRIVATE_KEY; // change for each claim contract

    const xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[2]]); // sheet_name_list[2] is the third sheet in the workbook // change for each claim contract

    // İmzalama işlemini yapacak olan cüzdanın private keyi

    let provider = ethers.provider;
    let account = new ethers.Wallet(privateKey);
    const signer = account.connect(provider);


    let _jsonData = await createJsonData(xlData, claimContractAddress, claimStartTimestamp, signer , true , isExcel);

    console.log("Public signing is completed");
    return _jsonData;
}

async function writeJsonData() {
    let _isExcel = true;
    let jsonDataPrivSale1 = await priv1Sign(_isExcel).catch(console.error);
    let jsonDataPrivSale2 = await priv2sign(_isExcel).catch(console.error);
    let jsonDataPublicSale = await publicSign(_isExcel).catch(console.error);

    let new_workbook = XLSX.utils.book_new();
    let new_worksheet = XLSX.utils.json_to_sheet(jsonDataPrivSale1);
    let new_worksheet2 = XLSX.utils.json_to_sheet(jsonDataPrivSale2);
    let new_worksheet3 = XLSX.utils.json_to_sheet(jsonDataPublicSale);
    XLSX.utils.book_append_sheet(new_workbook, new_worksheet, "PrivSale1 Signatures");
    XLSX.utils.book_append_sheet(new_workbook, new_worksheet2, "PrivSale2 Signatures");
    XLSX.utils.book_append_sheet(new_workbook, new_worksheet3, "PublicSale Signatures");
    XLSX.writeFile(new_workbook, 'scripts/signatureList/Mainnet_signatures.xlsx');

    console.log("\nExcel file is created\n");

    _isExcel = false;
    jsonDataPrivSale1 = await priv1Sign(_isExcel).catch(console.error);
    jsonDataPrivSale2 = await priv2sign(_isExcel).catch(console.error);
    jsonDataPublicSale = await publicSign(_isExcel).catch(console.error);

    // write json data to file
    fs.writeFileSync('scripts/signatureList/Mainnet_private1.json', JSON.stringify(jsonDataPrivSale1));
    console.log("\nPrivate 1 json file is created");
    fs.writeFileSync('scripts/signatureList/Mainnet_private2.json', JSON.stringify(jsonDataPrivSale2));
    console.log("Private 2 json file is created");
    fs.writeFileSync('scripts/signatureList/Mainnet_public.json', JSON.stringify(jsonDataPublicSale));
    console.log("Public json file is created\n\nDONE!");


}

 

writeJsonData().catch(console.error);