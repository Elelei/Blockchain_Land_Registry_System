const hre = require("hardhat");

async function main() {
  console.log("Deploying LandRegistry contract...");

  const LandRegistry = await hre.ethers.getContractFactory("LandRegistry");
  const landRegistry = await LandRegistry.deploy();

  await landRegistry.waitForDeployment();

  const address = await landRegistry.getAddress();
  console.log("LandRegistry deployed to:", address);

  // Save deployment address
  const fs = require("fs");
  const deploymentInfo = {
    address: address,
    network: hre.network.name,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(
    "../frontend/src/config/contract-address.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("Deployment info saved to frontend/src/config/contract-address.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
