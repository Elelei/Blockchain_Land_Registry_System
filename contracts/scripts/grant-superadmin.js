const hre = require("hardhat");

/**
 * Script to grant SUPERADMIN_ROLE to a specific address
 * Usage: npx hardhat run scripts/grant-superadmin.js --network localhost
 * 
 * You can modify the TARGET_ADDRESS below or pass it as an environment variable
 */
async function main() {
  console.log("🔐 Granting SUPERADMIN_ROLE...");

  // Get the deployer (current superadmin)
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  // Get contract address
  const contractAddress = require("../../frontend/src/config/contract-address.json").address;
  
  if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
    console.error("❌ Contract address not found. Please deploy the contract first.");
    process.exit(1);
  }

  // Get target address from environment variable or use a default
  // You can set TARGET_ADDRESS=0xYourAddress before running, or modify below
  const TARGET_ADDRESS = process.env.TARGET_ADDRESS || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  console.log("Target address to grant superadmin:", TARGET_ADDRESS);

  const LandRegistry = await hre.ethers.getContractFactory("LandRegistry");
  const contract = LandRegistry.attach(contractAddress);

  // Check if deployer has superadmin role
  const SUPERADMIN_ROLE = await contract.SUPERADMIN_ROLE();
  const hasRole = await contract.hasRole(SUPERADMIN_ROLE, deployer.address);
  
  if (!hasRole) {
    console.error("❌ Deployer does not have SUPERADMIN_ROLE. Cannot grant role.");
    process.exit(1);
  }

  try {
    // Grant SUPERADMIN_ROLE
    console.log("Granting SUPERADMIN_ROLE...");
    const tx1 = await contract.grantRole(SUPERADMIN_ROLE, TARGET_ADDRESS);
    await tx1.wait();
    console.log("✅ Granted SUPERADMIN_ROLE");

    // Register user if not already registered
    const isRegistered = await contract.registeredUsers(TARGET_ADDRESS);
    if (!isRegistered) {
      console.log("Registering user...");
      const tx2 = await contract.registerUser(
        TARGET_ADDRESS,
        SUPERADMIN_ROLE,
        "Superadmin"
      );
      await tx2.wait();
      console.log("✅ User registered as Superadmin");
    } else {
      // Update user role display
      console.log("Updating user role...");
      // Note: registerUser will fail if already registered, so we just grant the role
      console.log("✅ User already registered, role granted");
    }

    // Verify
    const hasSuperadminRole = await contract.hasRole(SUPERADMIN_ROLE, TARGET_ADDRESS);
    if (hasSuperadminRole) {
      console.log("✅ Success! Address", TARGET_ADDRESS, "now has SUPERADMIN_ROLE");
    } else {
      console.error("❌ Failed to verify role assignment");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

