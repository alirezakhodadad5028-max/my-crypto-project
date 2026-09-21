# My Crypto Project

A collection of smart contracts built while learning Web3 and smart contract security.

## Projects

### 1. MyToken (ERC-20)
Basic ERC-20 token with tests.

### 2. MyNFT (ERC-721)
NFT collection with metadata support.

### 3. ProToken
Production-grade ERC-20 with:
- Capped supply
- Pausable
- Burnable
- Access control

### 4. SafeProToken
Defends against Approval Race attacks.

### 5. SimpleDEX
A working DEX with:
- Liquidity pools
- Token swaps (0.3% fee)
- Slippage protection
- Deadline protection
- Reentrancy guard

## Tech Stack

- Solidity 0.8.28
- Hardhat 3
- OpenZeppelin Contracts 5
- Ethers.js v6

## Deployed Contracts (Sepolia)

| Contract | Address |
|---|---|
| MyToken | `0x09d1...` |
| MyNFT | `0x1318...` |
| ProToken | `0x7126...` |
| SimpleDEX | `0xCC1D...` |

All verified on [Sepolia Etherscan](https://sepolia.etherscan.io).

## Security Focus

- Access Control (Ownable)
- Reentrancy (CEI + ReentrancyGuard)
- Approval Race defense
- Front-running / Sandwich defense (Slippage + Deadline)

## How to Run

```bash
npm install
npx hardhat compile
npx hardhat test
