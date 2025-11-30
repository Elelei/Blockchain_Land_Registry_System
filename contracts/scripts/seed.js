const hre = require("hardhat");

/**
 * Seed script to populate the contract with sample data for testing
 * Run after deploying the contract
 */
async function main() {
  console.log("🌱 Seeding contract with sample data...");

  const [deployer, owner1, owner2, buyer1] = await hre.ethers.getSigners();

  // Get contract address from deployment
  const contractAddress = require("../../frontend/src/config/contract-address.json").address;
  
  if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
    console.error("❌ Contract address not found. Please deploy the contract first.");
    process.exit(1);
  }

  const LandRegistry = await hre.ethers.getContractFactory("LandRegistry");
  const contract = LandRegistry.attach(contractAddress);

  console.log("📝 Registering users...");

  // Register users
  try {
    const PROPERTY_OWNER_ROLE = await contract.PROPERTY_OWNER_ROLE();
    
    await contract.registerUser(
      owner1.address,
      PROPERTY_OWNER_ROLE,
      "Property Owner"
    );
    console.log("✅ Registered owner1:", owner1.address);

    await contract.registerUser(
      owner2.address,
      PROPERTY_OWNER_ROLE,
      "Property Owner"
    );
    console.log("✅ Registered owner2:", owner2.address);
  } catch (error) {
    console.log("ℹ️ Users may already be registered");
  }

  console.log("🏠 Registering properties...");

  // Register properties
  const properties = [
    {
      state: "Maharashtra",
      district: "Mumbai",
      village: "Andheri",
      surveyNumber: "SUR-001",
      owner: owner1.address,
      marketValue: hre.ethers.parseEther("50"),
      ipfsHash: "QmSampleHash001"
    },
    {
      state: "Maharashtra",
      district: "Pune",
      village: "Hinjewadi",
      surveyNumber: "SUR-002",
      owner: owner1.address,
      marketValue: hre.ethers.parseEther("75"),
      ipfsHash: "QmSampleHash002"
    },
    {
      state: "Karnataka",
      district: "Bangalore",
      village: "Whitefield",
      surveyNumber: "SUR-003",
      owner: owner2.address,
      marketValue: hre.ethers.parseEther("100"),
      ipfsHash: "QmSampleHash003"
    }
  ];

  for (const prop of properties) {
    try {
      const tx = await contract
        .connect(await hre.ethers.getSigner(prop.owner))
        .registerProperty(
          prop.state,
          prop.district,
          prop.village,
          prop.surveyNumber,
          prop.owner,
          prop.marketValue,
          prop.ipfsHash
        );
      await tx.wait();
      console.log(`✅ Registered property: ${prop.surveyNumber}`);
    } catch (error) {
      console.log(`⚠️ Error registering ${prop.surveyNumber}:`, error.message);
    }
  }

  console.log("✅ Approving properties...");

  // Approve all properties
  try {
    const totalProps = await contract.getTotalProperties();
    for (let i = 1; i <= Number(totalProps); i++) {
      try {
        const tx = await contract.approveProperty(i, true);
        await tx.wait();
        console.log(`✅ Approved property ${i}`);
      } catch (error) {
        // Property might already be approved or not exist
      }
    }
  } catch (error) {
    console.log("⚠️ Error approving properties:", error.message);
  }

  console.log("✅ Seeding complete!");
  console.log("\n📊 Sample Accounts:");
  console.log("Deployer (Superadmin):", deployer.address);
  console.log("Owner 1:", owner1.address);
  console.log("Owner 2:", owner2.address);
  console.log("Buyer 1:", buyer1.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
