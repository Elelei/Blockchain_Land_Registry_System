# Blockchain Land Registry System

A decentralized land registry system built on Ethereum blockchain using Solidity smart contracts and React frontend. This system enables secure, transparent, and immutable property registration and transaction management.

## 🏗️ Project Structure

```
Blockchain-Land-Registry-System--main/
├── contracts/              # Smart contracts (Hardhat)
│   ├── contracts/         # Solidity contracts
│   ├── scripts/           # Deployment and utility scripts
│   ├── test/              # Contract tests
│   └── hardhat.config.js  # Hardhat configuration
├── frontend/              # React frontend (Vite)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts (Web3)
│   │   ├── config/        # Configuration files
│   │   ├── services/      # Services (IPFS, etc.)
│   │   └── utils/         # Utility functions
│   └── vite.config.js     # Vite configuration
└── package.json           # Root package.json with workspace scripts
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (v9 or higher) - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)
- **MetaMask** browser extension (for frontend interaction)

## 🚀 Quick Start

### 1. Install Dependencies

Install all dependencies for root, contracts, and frontend:

```bash
npm run setup
```

Or manually:

```bash
npm install
npm install --prefix contracts
npm install --prefix frontend
```

### 2. Start Local Blockchain

In a new terminal, start a local Hardhat node:

```bash
npm run start:blockchain
```

Or:

```bash
cd contracts
npx hardhat node
```

This will start a local Ethereum node on `http://127.0.0.1:8545` with 20 test accounts pre-funded with ETH.

### 3. Deploy Contracts

In another terminal, deploy the contracts to the local network:

```bash
npm run deploy:local
```

Or:

```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```

The contract address will be automatically saved to `frontend/src/config/contract-address.json`.

### 4. Start Frontend

In another terminal, start the development server:

```bash
npm run dev
```

Or:

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000` (opens automatically).

## 🧪 Testing

### Test Smart Contracts

Run the contract tests:

```bash
npm run test
```

Or:

```bash
cd contracts
npm run test
```

Run tests in watch mode:

```bash
npm run test:watch
```

### Test Frontend

Run frontend tests (if configured):

```bash
cd frontend
npm run test
```

## 🏃 Available Scripts

### Root Level Scripts

- `npm run setup` - Install all dependencies
- `npm run compile` - Compile smart contracts
- `npm run test` - Run contract tests
- `npm run test:watch` - Run tests in watch mode
- `npm run deploy:local` - Deploy contracts to local network
- `npm run node` - Start local Hardhat node
- `npm run dev` - Start frontend development server
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build
- `npm run clean` - Clean all node_modules and build artifacts
- `npm run lint` - Lint frontend code
- `npm run start:blockchain` - Start local blockchain node
- `npm run start:frontend` - Start frontend dev server

### Contract Scripts (in `contracts/` directory)

- `npm run compile` - Compile contracts
- `npm run test` - Run tests
- `npm run deploy` - Deploy contracts
- `npm run node` - Start Hardhat node

### Frontend Scripts (in `frontend/` directory)

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run lint` - Lint code

## 🔧 Configuration

### Hardhat Configuration

The Hardhat configuration is in `contracts/hardhat.config.js`. It's configured for:
- Solidity version: 0.8.20
- Local network on port 8545
- Chain ID: 1337

### Frontend Configuration

- **Vite Config**: `frontend/vite.config.js`
- **Contract Address**: `frontend/src/config/contract-address.json` (auto-generated on deployment)
- **Constants**: `frontend/src/config/constants.js`

### Network Configuration

The frontend is configured to connect to:
- **RPC URL**: `http://127.0.0.1:8545`
- **Chain ID**: 1337 (Hardhat local network)

To use MetaMask with the local network:
1. Open MetaMask
2. Add Network:
   - Network Name: Hardhat Local
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 1337
   - Currency Symbol: ETH
3. Import one of the test accounts from Hardhat node (private keys are displayed in the terminal)

## 📱 Usage

### User Roles

The system supports the following roles:
- **Superadmin**: Full system access
- **Government Authority**: Approve/reject property registrations
- **Property Owner**: Register and manage properties
- **Legal Professional**: Assist with transactions
- **Buyer**: Purchase properties

### Workflow

1. **Connect Wallet**: Connect MetaMask to the local network
2. **Register User**: Superadmin must register users with appropriate roles
3. **Register Property**: Property owners can register new properties
4. **Approve Property**: Government authority approves/rejects registrations
5. **List for Sale**: Owners can list approved properties for sale
6. **Initiate Transaction**: Buyers can initiate purchase transactions
7. **Complete Transaction**: Legal professionals and government can approve transactions

## 🛠️ Development

### Adding New Features

1. **Smart Contracts**: Add new contracts in `contracts/contracts/`
2. **Frontend Components**: Add components in `frontend/src/components/`
3. **Tests**: Add contract tests in `contracts/test/`

### Code Style

- Smart contracts follow Solidity style guide
- Frontend uses ESLint for code quality
- Run `npm run lint` to check code style

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**
   - Change the port in `frontend/vite.config.js` or `contracts/hardhat.config.js`

2. **Contract Not Deployed**
   - Ensure Hardhat node is running
   - Check contract address in `frontend/src/config/contract-address.json`

3. **MetaMask Connection Issues**
   - Ensure MetaMask is connected to the correct network (Chain ID: 1337)
   - Check RPC URL is correct

4. **Dependencies Issues**
   - Run `npm run clean` and then `npm run setup`

5. **Windows Path Issues**
   - All scripts are now cross-platform compatible
   - Use npm scripts instead of bash scripts on Windows

## 📦 Build for Production

Build the frontend:

```bash
npm run build
```

The production build will be in `frontend/dist/`.

Preview the production build:

```bash
npm run preview
```

## 🔐 Security Notes

- This is a development/demo project
- Never use test accounts or private keys in production
- Always audit smart contracts before deploying to mainnet
- Use proper access control and security measures in production

## 📄 License

This project is for educational purposes.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions, please open an issue in the repository.

---

**Happy Coding! 🚀**
