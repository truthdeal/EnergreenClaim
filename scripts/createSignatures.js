const { ethers } = require('hardhat');
const { BigNumber } = require('@ethersproject/bignumber');

const XLSX = require('xlsx');
const fetch = require('node-fetch');
require('dotenv').config();



// tgeTimeStamp can be changed in case of a new TGE date
const tgeTimestamp = 1684713600; //  2023-05-22 00:00:00 UTC 


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
    console.log("vestingDate: ", vestingDate.toUTCString());
    vestingDate = vestingDate.getTime() / 1000 ;
    
    return vestingDate;
}

async function getNewVestingWeek(_timestamp) {
    let vestingDate = new Date(Number(_timestamp.toString()) * 1000);
    vestingDate.setUTCDate(vestingDate.getUTCDate() + 7);
    console.log("vestingDate: ", vestingDate.toUTCString());
    vestingDate = vestingDate.getTime() / 1000 ;
    
    return vestingDate;
}

async function createJsonData (xlData, claimContractAddress, claimStartTimestamp, signer , isPublic) {


    let jsonData = [];

    for (let data of xlData) {
        let user = data.address;
        let contract = claimContractAddress;
        let totalTokens = data.totalAmount;
        let tgeAmount = data.tgeAmount;
        let claimLimit ;
        let vestingAmount = data.vestingAmount;
        let date ;

        for (let i = 0; i < data.vestingPeriod + 1; i++) {

            if (i == 0) {
                claimLimit = ethers.utils.parseEther(tgeAmount.toString());   
                date = tgeTimestamp;      
            }
            else {
                claimLimit = claimLimit.add(ethers.utils.parseEther(vestingAmount.toString())); 
                if (i == 1) {
                    date = claimStartTimestamp ;
                    console.log("date: ", date);
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
            let signature = await signToken(contract, user, claimLimit, date , signer);

            let jsonStr = {
                _recipient: user,
                _claimLimit: claimLimit.toString(),
                _claimStartTimestamp: date,
                signature: signature
            };

            // Yeni JSON dosyasını oluşturuyoruz
            let newJsonData = {
                user: user,
                contract: contract,
                startDate: date,
                unlocked: claimLimit.toString(),
                totalTokens: totalTokens,
                jsonStr: JSON.stringify(jsonStr)
            };

            jsonData.push(newJsonData);
        }
    }

    return jsonData;


}

async function priv1Sign() {
    const claimContractAddress = "0x63A01A2714F2cea4152B0883706E248473FE85CC" ; // change for each claim contract

    const claimStartTimestamp = 1708560000 // 2024-02-22 00:00:00 UTC // change for each claim contract
    const privateKey = process.env.PRIV1_SIGNER_PRIVATE_KEY; // change for each claim contract

    const workbook = XLSX.readFile('scripts/src/wallets.xlsx'); // Excel file path // change for each claim contract
    const sheet_name_list = workbook.SheetNames;
    const xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]); // sheet_name_list[0] is the first sheet in the workbook // change for each claim contract

    // İmzalama işlemini yapacak olan cüzdanın private keyi
    let provider = ethers.provider;
    let account = new ethers.Wallet(privateKey);
    const signer = account.connect(provider);

    let _jsonData = await createJsonData(xlData, claimContractAddress, claimStartTimestamp, signer , false);

    return _jsonData;

}

async function priv2sign() {
    const claimContractAddress = "0x13894aB24ACa4b3b0489eef0e818E1230546FE0a" ; // change for each claim contract

    const claimStartTimestamp = 1705881600 // 2024-01-22 00:00:00 UTC // change for each claim contract
    const privateKey = process.env.PRIV2_SIGNER_PRIVATE_KEY; // change for each claim contract

    const workbook = XLSX.readFile('scripts/src/wallets.xlsx'); // Excel file path // change for each claim contract
    const sheet_name_list = workbook.SheetNames;
    const xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[1]]); // sheet_name_list[1] is the second sheet in the workbook // change for each claim contract

    // İmzalama işlemini yapacak olan cüzdanın private keyi

    let provider = ethers.provider;
    let account = new ethers.Wallet(privateKey);
    const signer = account.connect(provider);


    let _jsonData = await createJsonData(xlData, claimContractAddress, claimStartTimestamp, signer , false);

    return _jsonData;
}

async function publicSign() {
    const claimContractAddress = "0x0553CeB6248a5dd5592B735DfCA56c6cF93e8967" ; // change for each claim contract

    const claimStartTimestamp = 1687392000 // 2024-01-22 00:00:00 UTC // change for each claim contract
    const privateKey = process.env.PUBLIC_SIGNER_PRIVATE_KEY; // change for each claim contract

    const workbook = XLSX.readFile('scripts/src/wallets.xlsx'); // Excel file path // change for each claim contract
    const sheet_name_list = workbook.SheetNames;
    const xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[2]]); // sheet_name_list[2] is the third sheet in the workbook // change for each claim contract

    // İmzalama işlemini yapacak olan cüzdanın private keyi

    let provider = ethers.provider;
    let account = new ethers.Wallet(privateKey);
    const signer = account.connect(provider);


    let _jsonData = await createJsonData(xlData, claimContractAddress, claimStartTimestamp, signer , true);

    return _jsonData;
}

async function writeJsonData() {

    let jsonDataPrivSale1 = await priv1Sign().catch(console.error);
    let jsonDataPrivSale2 = await priv2sign().catch(console.error);
    let jsonDataPublicSale = await publicSign().catch(console.error);

    let new_workbook = XLSX.utils.book_new();
    let new_worksheet = XLSX.utils.json_to_sheet(jsonDataPrivSale1);
    let new_worksheet2 = XLSX.utils.json_to_sheet(jsonDataPrivSale2);
    let new_worksheet3 = XLSX.utils.json_to_sheet(jsonDataPublicSale);
    XLSX.utils.book_append_sheet(new_workbook, new_worksheet, "PrivSale1 Signatures");
    XLSX.utils.book_append_sheet(new_workbook, new_worksheet2, "PrivSale2 Signatures");
    XLSX.utils.book_append_sheet(new_workbook, new_worksheet3, "PublicSale Signatures");
    XLSX.writeFile(new_workbook, 'scripts/signatureList/signatures.xlsx');

    console.log(jsonDataPublicSale);
}

 

writeJsonData().catch(console.error);