# Web3 Homework Transfer UI

This project turns a Stitch-inspired `Transfer Assets` mobile wallet design into a real Web3 homework app.

It is built to cover a minimal Web3 frontend workflow:

- connect an EVM wallet
- switch to `Sepolia`
- send test `ETH`
- connect a Solana wallet
- use `Devnet`
- send test `SOL`

## Features

- Stitch-style mobile transfer UI rebuilt with React and Tailwind CSS
- EVM wallet support for MetaMask, Rabby, OKX Wallet, and compatible injected wallets
- Solana wallet support for Phantom and compatible injected wallets
- Sepolia ETH transfer flow
- Solana Devnet SOL transfer flow
- wallet state refresh and recent transaction links
- automatic form reset after a successful transfer

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- `viem`
- `@solana/web3.js`

## Getting Started

```bash
nvm use 22
npm install
npm run dev
```

Or with `fnm`:

```bash
fnm use 22.22.0
npm install
npm run dev
```

## Homework Mapping

This app is designed for a Web3 homework assignment that asks for:

- two wallets
- faucet funds
- a page with buttons and inputs
- one ETH transfer
- one Solana transfer

This repository covers the page and transfer logic directly. You still need to:

1. prepare your own EVM wallet and Solana wallet
2. claim Sepolia ETH and Devnet SOL from faucets
3. complete both transfers with your own accounts
4. record the transaction links for submission

## Submission Tips

Suggested submission materials:

- repository link
- deployed project link
- short code walkthrough
- Sepolia transaction link
- Solana Devnet transaction link

## Notes

- everything here is intended for testnet use only
- the app expects injected browser wallets
- chunk size warnings during build come from Web3 SDK size and do not block usage
