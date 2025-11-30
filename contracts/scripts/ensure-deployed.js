const hre = require("hardhat");

/**
 * Script to ensure contract is deployed
 * Checks if contract exists, if not, deploys it
 * Usage: npx hardhat run scripts/ensure-deployed.js --network localhost
 */
async function main() {
  console.log("🔍 Checking contract deployment...");

  // Get contract address from config
  let contractAddress;
  const path = require("path");
  const configPath = path.join(__dirname, "../../frontend/src/config/contract-address.json");
  try {
    const contractConfig = require(configPath);
    contractAddress = contractConfig.address;
  } catch (error) {
    console.log("No contract address found in config, will deploy new one");
    contractAddress = null;
  }

  // Check if Hardhat node is running
  try {
    await hre.ethers.provider.getBlockNumber();
    console.log("✓ Hardhat node is running");
  } catch (error) {
    console.error("❌ Hardhat node is not running!");
    console.error("Please start it with: npm run start:blockchain");
    process.exit(1);
  }

  // Check if contract exists at address
  if (contractAddress && contractAddress !== "0x0000000000000000000000000000000000000000") {
    try {
      const code = await hre.ethers.provider.getCode(contractAddress);
      if (code !== "0x") {
        console.log(`✓ Contract already deployed at: ${contractAddress}`);
        console.log("Contract is ready to use!");
        return;
      } else {
        console.log(`⚠ Contract address exists but no contract found at ${contractAddress}`);
        console.log("Redeploying...");
      }
    } catch (error) {
      console.log("⚠ Could not check contract, redeploying...");
    }
  }

  // Deploy contract
  console.log("📝 Deploying LandRegistry contract...");
  
  const LandRegistry = await hre.ethers.getContractFactory("LandRegistry");
  const landRegistry = await LandRegistry.deploy();
  await landRegistry.waitForDeployment();

  const address = await landRegistry.getAddress();
  console.log("✅ LandRegistry deployed to:", address);

  // Save deployment address
  const fs = require("fs");
  const deploymentInfo = {
    address: address,
    network: hre.network.name,
    timestamp: new Date().toISOString()
  };

  // Ensure directory exists
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(
    configPath,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("✅ Deployment info saved to frontend/src/config/contract-address.json");
  console.log("\n🎉 Contract is ready! You can now connect your wallet.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

