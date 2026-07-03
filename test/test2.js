const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("AutoPartNFT_Pro_V3", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployContractFixture() {
    const [owner, manufacturer1, retailer1, customer1, otherAccount] = await ethers.getSigners();

    const Contract = await ethers.getContractFactory("AutoPartNFT_Pro_V3");
    const contract = await Contract.deploy();

    // Common mock data
    const mockHash = ethers.id("mockProductData");
    const mockUri = "ipfs://mockURI";

    return { contract, owner, manufacturer1, retailer1, customer1, otherAccount, mockHash, mockUri };
  }

  describe("Deployment & Roles", function () {
    it("Should assign the DEFAULT_ADMIN_ROLE to the deployer", async function () {
      const { contract, owner } = await loadFixture(deployContractFixture);
      const adminRole = await contract.DEFAULT_ADMIN_ROLE();
      expect(await contract.hasRole(adminRole, owner.address)).to.be.true;
    });

    it("Should set the right name and symbol", async function () {
      const { contract } = await loadFixture(deployContractFixture);
      expect(await contract.name()).to.equal("Auto_Part");
      expect(await contract.symbol()).to.equal("APT");
    });
  });

  describe("Manufacturer Management", function () {
    it("Should allow an address to join as a manufacturer", async function () {
      const { contract, manufacturer1 } = await loadFixture(deployContractFixture);
      
      await contract.connect(manufacturer1).joinAsManufacturer("Acme Corp", "Detroit");
      
      const mfgRole = await contract.MANUFACTURER_ROLE();
      expect(await contract.hasRole(mfgRole, manufacturer1.address)).to.be.true;

      const [addresses, names, locations] = await contract.getAllManufacturers();
      expect(addresses).to.include(manufacturer1.address);
      expect(names).to.include("Acme Corp");
      expect(locations).to.include("Detroit");
    });

    it("Should revert if trying to join as a manufacturer twice", async function () {
      const { contract, manufacturer1 } = await loadFixture(deployContractFixture);
      
      await contract.connect(manufacturer1).joinAsManufacturer("Acme Corp", "Detroit");
      
      await expect(
        contract.connect(manufacturer1).joinAsManufacturer("Acme 2", "Chicago")
      ).to.be.revertedWithCustomError(contract, "youAreAlreadyaManufacturer");
    });
  });

  describe("Retailer Management", function () {
    it("Should allow an address to request to be a retailer and a manufacturer to approve it", async function () {
      const { contract, manufacturer1, retailer1 } = await loadFixture(deployContractFixture);
      
      // Setup manufacturer
      await contract.connect(manufacturer1).joinAsManufacturer("Acme Corp", "Detroit");

      // Request retailer
      await contract.connect(retailer1).requestForRetailer("AutoParts R Us", "New York");
      
      const requests = await contract.getRetailerRequests();
      expect(requests).to.include(retailer1.address);

      // Approve retailer
      await contract.connect(manufacturer1).addRetailer(retailer1.address);
      
      const retailerRole = await contract.RETAILER_ROLE();
      expect(await contract.hasRole(retailerRole, retailer1.address)).to.be.true;
    });
  });

  describe("Supply Chain & Minting", function () {
    async function setupRolesFixture() {
      const fixtureData = await deployContractFixture();
      const { contract, manufacturer1, retailer1 } = fixtureData;
      
      await contract.connect(manufacturer1).joinAsManufacturer("Acme Corp", "Detroit");
      await contract.connect(retailer1).requestForRetailer("AutoParts R Us", "New York");
      await contract.connect(manufacturer1).addRetailer(retailer1.address);
      
      return fixtureData;
    }

    it("Should create and fulfill a supply request", async function () {
      const { contract, manufacturer1, retailer1, mockHash, mockUri } = await loadFixture(setupRolesFixture);
      
      // Retailer creates request
      const quantity = 2;
      await expect(contract.connect(retailer1).createSupplyRequest(mockHash, quantity))
        .to.emit(contract, "SupplyRequestCreated");

      // Manufacturer fulfills
      // The first request has ID 0
      const requestId = 0;
      await expect(
        contract.connect(manufacturer1).fulfillSupplyRequest(
          requestId, 
          [mockUri, mockUri], 
          [mockHash, mockHash]
        )
      ).to.emit(contract, "SupplyRequestFulfilled");

      // Check part details
      const tokenId = 0; // First minted token
      const custodian = await contract.getNFTCustodian(tokenId);
      expect(custodian).to.equal(retailer1.address);
      
      const status = await contract.getSaleStatus(tokenId);
      expect(status).to.equal(0); // SaleStatus.UNSOLD
    });

    it("Should ship a part and confirm delivery", async function () {
      const { contract, manufacturer1, retailer1, mockHash, mockUri } = await loadFixture(setupRolesFixture);
      
      // Directly mint to retailer for testing speed
      await contract.connect(manufacturer1).mintPartToRetailer(retailer1.address, mockUri, mockHash);
      const tokenId = 0;

      // Ship part
      const phone = "555-0199";
      const tracking = "TRACK123";
      await expect(contract.connect(retailer1).shipPart(tokenId, phone, tracking))
        .to.emit(contract, "PartShipped")
        .withArgs(tokenId, phone, tracking, /* ignore timestamp */ (val) => true);

      let status = await contract.getSaleStatus(tokenId);
      expect(status).to.equal(1); // IN_TRANSIT

      // Confirm delivery
      await expect(contract.connect(retailer1).confirmDelivery(tokenId))
        .to.emit(contract, "DeliveryConfirmed");

      status = await contract.getSaleStatus(tokenId);
      expect(status).to.equal(2); // SOLD
      
      const recordedPhone = await contract.getCustomerPhoneNumber(tokenId);
      expect(recordedPhone).to.equal(phone);
    });
  });

  describe("SBT Properties (Soulbound)", function () {
    it("Should revert manual transfers via transferFrom", async function () {
      const { contract, manufacturer1, retailer1, mockHash, mockUri, otherAccount } = await loadFixture(deployContractFixture);
      
      await contract.connect(manufacturer1).joinAsManufacturer("Acme", "Detroit");
      await contract.connect(retailer1).requestForRetailer("Retailer", "NY");
      await contract.connect(manufacturer1).addRetailer(retailer1.address);

      await contract.connect(manufacturer1).mintPartToRetailer(retailer1.address, mockUri, mockHash);
      
      // Attempt manual transfer
      await expect(
        contract.connect(retailer1).transferFrom(retailer1.address, otherAccount.address, 0)
      ).to.be.revertedWithCustomError(contract, "TransferBlocked");
    });
  });
});