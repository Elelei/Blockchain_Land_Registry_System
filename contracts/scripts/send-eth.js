const hre = require("hardhat");

/**
 * Script to send ETH from deployer to a target address
 * Usage: npx hardhat run scripts/send-eth.js --network localhost
 * 
 * Set TARGET_ADDRESS environment variable with your wallet address
 * Set AMOUNT environment variable for amount in ETH (default: 100)
 */
async function main() {
  console.log("💰 Sending ETH to wallet...");

  // Get the deployer (has 10,000 ETH)
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  const deployerBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(deployerBalance), "ETH");

  // Get target address from environment variable
  const TARGET_ADDRESS = process.env.TARGET_ADDRESS;
  
  if (!TARGET_ADDRESS) {
    console.error("❌ TARGET_ADDRESS not set!");
    console.error("Usage: $env:TARGET_ADDRESS=\"0x...\"; npm run send-eth");
    process.exit(1);
  }

  // Validate address
  if (!hre.ethers.isAddress(TARGET_ADDRESS)) {
    console.error("❌ Invalid address format:", TARGET_ADDRESS);
    process.exit(1);
  }

  // Get amount (default 100 ETH)
  const amountETH = process.env.AMOUNT || "100";
  const amountWei = hre.ethers.parseEther(amountETH);

  console.log("Target address:", TARGET_ADDRESS);
  console.log("Amount to send:", amountETH, "ETH");

  try {
    // Check current balance
    const currentBalance = await hre.ethers.provider.getBalance(TARGET_ADDRESS);
    console.log("Current balance:", hre.ethers.formatEther(currentBalance), "ETH");

    // Send ETH
    console.log("Sending ETH...");
    const tx = await deployer.sendTransaction({
      to: TARGET_ADDRESS,
      value: amountWei
    });

    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");
    
    await tx.wait();
    console.log("✅ Transaction confirmed!");

    // Check new balance
    const newBalance = await hre.ethers.provider.getBalance(TARGET_ADDRESS);
    console.log("New balance:", hre.ethers.formatEther(newBalance), "ETH");
    console.log("✅ Success! Your wallet now has", hre.ethers.formatEther(newBalance), "ETH");

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

