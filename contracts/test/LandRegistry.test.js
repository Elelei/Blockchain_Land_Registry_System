const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LandRegistry", function () {
  let landRegistry;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const LandRegistry = await ethers.getContractFactory("LandRegistry");
    landRegistry = await LandRegistry.deploy();
    await landRegistry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner as superadmin", async function () {
      expect(await landRegistry.hasRole(await landRegistry.SUPERADMIN_ROLE(), owner.address)).to.be.true;
    });

    it("Should register owner as user", async function () {
      expect(await landRegistry.registeredUsers(owner.address)).to.be.true;
    });
  });

  describe("User Registration", function () {
    it("Should allow superadmin to register new users", async function () {
      const PROPERTY_OWNER_ROLE = await landRegistry.PROPERTY_OWNER_ROLE();
      
      await landRegistry.registerUser(
        addr1.address,
        PROPERTY_OWNER_ROLE,
        "Property Owner"
      );

      expect(await landRegistry.registeredUsers(addr1.address)).to.be.true;
    });

    it("Should revert if user already registered", async function () {
      const PROPERTY_OWNER_ROLE = await landRegistry.PROPERTY_OWNER_ROLE();
      
      await landRegistry.registerUser(
        addr1.address,
        PROPERTY_OWNER_ROLE,
        "Property Owner"
      );

      await expect(
        landRegistry.registerUser(
          addr1.address,
          PROPERTY_OWNER_ROLE,
          "Property Owner"
        )
      ).to.be.revertedWith("User already registered");
    });
  });

  describe("Property Registration", function () {
    it("Should register a new property", async function () {
      await landRegistry.connect(addr1).registerProperty(
        "State1",
        "District1",
        "Village1",
        "SUR-001",
        addr1.address,
        ethers.parseEther("100"),
        "QmHash123"
      );

      const property = await landRegistry.getProperty(1);
      expect(property.state).to.equal("State1");
      expect(property.owner).to.equal(addr1.address);
      expect(property.status).to.equal(0); // Pending
    });

    it("Should revert with invalid inputs", async function () {
      await expect(
        landRegistry.connect(addr1).registerProperty(
          "",
          "District1",
          "Village1",
          "SUR-001",
          addr1.address,
          ethers.parseEther("100"),
          "QmHash123"
        )
      ).to.be.revertedWith("State is required");

      await expect(
        landRegistry.connect(addr1).registerProperty(
          "State1",
          "District1",
          "Village1",
          "SUR-001",
          ethers.ZeroAddress,
          ethers.parseEther("100"),
          "QmHash123"
        )
      ).to.be.revertedWith("Invalid owner address");

      await expect(
        landRegistry.connect(addr1).registerProperty(
          "State1",
          "District1",
          "Village1",
          "SUR-001",
          addr1.address,
          0,
          "QmHash123"
        )
      ).to.be.revertedWith("Market value must be greater than 0");
    });
  });

  describe("Property Approval", function () {
    beforeEach(async function () {
      await landRegistry.connect(addr1).registerProperty(
        "State1",
        "District1",
        "Village1",
        "SUR-001",
        addr1.address,
        ethers.parseEther("100"),
        "QmHash123"
      );
    });

    it("Should allow superadmin to approve property", async function () {
      await landRegistry.approveProperty(1, true);
      const property = await landRegistry.getProperty(1);
      expect(property.status).to.equal(1); // Approved
    });

    it("Should allow superadmin to reject property", async function () {
      await landRegistry.approveProperty(1, false);
      const property = await landRegistry.getProperty(1);
      expect(property.status).to.equal(2); // Rejected
      expect(property.isActive).to.be.false;
    });
  });

  describe("Property Sale", function () {
    beforeEach(async function () {
      await landRegistry.connect(addr1).registerProperty(
        "State1",
        "District1",
        "Village1",
        "SUR-001",
        addr1.address,
        ethers.parseEther("100"),
        "QmHash123"
      );
      await landRegistry.approveProperty(1, true);
    });

    it("Should list property for sale", async function () {
      await landRegistry.connect(addr1).listPropertyForSale(1, ethers.parseEther("150"));
      const property = await landRegistry.getProperty(1);
      expect(property.status).to.equal(3); // ListedForSale
    });

    it("Should allow purchase request", async function () {
      await landRegistry.connect(addr1).listPropertyForSale(1, ethers.parseEther("150"));
      
      await landRegistry.connect(addr2).requestToPurchase(
        1,
        ethers.parseEther("150"),
        "QmHash456",
        { value: ethers.parseEther("150") }
      );

      const transaction = await landRegistry.getTransaction(1);
      expect(transaction.buyer).to.equal(addr2.address);
      expect(transaction.status).to.equal(0); // Pending
    });

    it("Should complete purchase flow", async function () {
      await landRegistry.connect(addr1).listPropertyForSale(1, ethers.parseEther("150"));
      
      await landRegistry.connect(addr2).requestToPurchase(
        1,
        ethers.parseEther("150"),
        "QmHash456",
        { value: ethers.parseEther("150") }
      );

      await landRegistry.connect(addr1).processPurchaseRequest(1, true);
      
      await landRegistry.connect(addr2).completePurchase(1);

      const property = await landRegistry.getProperty(1);
      expect(property.owner).to.equal(addr2.address);
      expect(property.status).to.equal(5); // Sold

      const transaction = await landRegistry.getTransaction(1);
      expect(transaction.status).to.equal(3); // Completed
    });
  });

  describe("Access Control", function () {
    it("Should pause contract", async function () {
      await landRegistry.pause();
      expect(await landRegistry.paused()).to.be.true;
    });

    it("Should unpause contract", async function () {
      await landRegistry.pause();
      await landRegistry.unpause();
      expect(await landRegistry.paused()).to.be.false;
    });
  });
});
