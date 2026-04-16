# Blockchain Land Registry System

A decentralized land registry system built on blockchain to provide secure, transparent, and tamper-proof management of land ownership records.

## Overview

Traditional land registry systems often suffer from issues such as data manipulation, lack of transparency, and inefficient manual processes. This project leverages blockchain technology and smart contracts to create a trustworthy system for registering, transferring, and verifying land ownership.

## Features

- Secure registration of land parcels on the blockchain
- Ownership verification using smart contracts
- Transparent history of ownership transfers
- Role-based access for administrators, land officers, and owners
- Web-based frontend for interacting with the system

## Tech Stack

- **Frontend**: JavaScript (React) 
- **Smart Contracts**: Solidity
- **Blockchain Platform**: Ethereum / Hardhat 
- **Tools**: Node.js, Web3 libraries

## Project Structure

- `contracts/` – Solidity smart contracts for land registration and ownership management
- `frontend/` – Frontend application for users and administrators
- `package.json` – Project dependencies and scripts
- `.eslintrc.json` – Linting configuration
- `LICENSE` – MIT License for this project

## Setup and Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/Elelei/Blockchain_Land_Registry_System.git
   cd Blockchain_Land_Registry_System
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile and deploy smart contracts (update these commands based on your tooling, e.g. Hardhat/Truffle):
   ```bash
   # example
   npx hardhat compile
   npx hardhat run scripts/deploy.js --network localhost
   ```

4. Run the frontend:
   ```bash
   cd frontend
   npm install
   npm start
   ```

5. Open the app in your browser at:
   ```text
   http://localhost:3000
   ```

## Usage

- Register new land parcels by providing ownership and property details.
- Transfer ownership between parties via blockchain transactions.
- View the history of transactions for a given land parcel.
- Verify current owner and land status through the smart contract.

## Future Improvements

- Integration with government registries and GIS data
- Advanced search and filtering for properties
- Multi-signature approvals for sensitive transactions
- Enhanced authentication and user management

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
