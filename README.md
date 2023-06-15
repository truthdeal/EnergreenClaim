# EnergreenClaim Smart Contracts

This repository contains smart contracts that manage the token claiming process for the Energreen token (`egrn`). There are four contracts:

1. `EnergreenClaim`: The base contract which provides the logic for managing and processing token claims.
2. `EnergreenClaimPrivateSale1`, `EnergreenClaimPrivateSale2` and `EnergreenClaimPublic`: These contracts inherit from the base contract and are designed to handle claims from different types of sales.

## 1. EnergreenClaim

`EnergreenClaim` is the base contract which manages the claiming of Energreen tokens. It makes use of OpenZeppelin's `ReentrancyGuard` and `Ownable` contracts to prevent re-entrancy attacks and to provide basic access control.

### Key Data Structures:

- `egrn`: The instance of the Energreen token.
- `signer`: The address authorized to sign transactions.
- `tokenHolder`: The address that holds tokens ready for claiming.
- `blacklist`: A mapping structure to keep track of addresses that are blacklisted.
- `claimed`: A mapping to keep track of the total amount claimed by an address.

### Key Functions:

- `constructor(address _tokenAddress , address _signer)`: Initializes the contract, setting the Energreen token address and the signer address.

- `renounceOwnership()`: Overrides the `renounceOwnership` function from `Ownable` to prevent the contract ownership from being renounced.

- `setSigner(address _signer)`: Changes the `signer` address.

- `setTokenHolder(address _tokenHolder)`: Changes the `tokenHolder` address.

- `changeBlacklistStatus(address _address, bool value)`: Changes the blacklist status of a given address.

- `isBlacklisted(address[] memory _addressList)`: Checks if a list of addresses are blacklisted.

- `claimTokens(address _recipient, uint256 _claimLimit, uint256 _claimStartTimestamp, bytes calldata signature)`: Claims tokens on behalf of a recipient address, with specified claim limit and start timestamp.

- `testClaimInfo(address _recipient, uint256 _claimLimit, uint256 _claimStartTimestamp, bytes calldata _signature)`: Tests the claim information of a given address, claim limit, and start timestamp. This function helps to determine the claim status before executing the claim.

## 2. EnergreenClaimPrivateSale1, EnergreenClaimPrivateSale2, and EnergreenClaimPublic

These contracts inherit from the `EnergreenClaim` base contract and specialize in managing claims for specific sales: Private Sale 1, Private Sale 2, and Public Sale.

### Key Functions:

- `constructor(address _tokenAddress, address _signer)`: Initializes each contract with a specific `tokenHolder` address for each sale. This `tokenHolder` address has the tokens that are available for claiming for that specific sale.

## Deployed Contract Addresses

Energreen Token Mainnet: 0xDB8d6D3AC21e4efE3675BBB18514010AC9C5558F

Energreen Claim PrivateSale1 : 0x63A01A2714F2cea4152B0883706E248473FE85CC

Energreen Claim PrivateSale2 : 0x13894aB24ACa4b3b0489eef0e818E1230546FE0a

Energreen Claim PublicSale : 0x0553CeB6248a5dd5592B735DfCA56c6cF93e8967

## Note

The "signer" in the context of these contracts is an authorized address that validates the claims by signing the transactions. The "holder" is the address that provides the tokens for the claim.

Blacklist functionality is present for security purposes. If an address is blacklisted, it can't claim tokens even if it has a valid claim.
