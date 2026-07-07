// const { expect } = require("chai");
// const { ethers } = require("hardhat");

// describe("AutoPartNFT_Pro_V3", function () {
//   let contract;
//   let admin, manufacturer1, manufacturer2, retailer1, retailer2, customer, other;

//   const DEFAULT_URI = "ipfs://QmTest";
//   const DEFAULT_HASH = ethers.keccak256(ethers.toUtf8Bytes("test"));

//   beforeEach(async function () {
//     [admin, manufacturer1, manufacturer2, retailer1, retailer2, customer, other] =
//       await ethers.getSigners();

//     const AutoPartNFT = await ethers.getContractFactory("AutoPartNFT_Pro_V3");
//     contract = await AutoPartNFT.deploy();
//     await contract.waitForDeployment();
//   });

//   // Helper to get the last minted token ID
//   async function getLastTokenId() {
//     const filter = contract.filters.PartMinted();
//     const events = await contract.queryFilter(filter);
//     return events[events.length - 1].args.tokenId;
//   }

//   // Setup: one manufacturer and one retailer
//   async function setupManufacturerAndRetailer() {
//     await contract.connect(manufacturer1).joinAsManufacturer("Tesla", "Austin, TX");
//     await contract.connect(retailer1).requestForRetailer("AutoZone", "Houston, TX");
//     await contract.connect(manufacturer1).addRetailer(retailer1.address);
//   }

//   // Mint a part to a retailer (default: retailer1)
//   async function mintPartToRetailer(retailer = retailer1) {
//     await setupManufacturerAndRetailer();
//     await contract.connect(manufacturer1).mintPartToRetailer(
//       retailer.address,
//       DEFAULT_URI,
//       DEFAULT_HASH
//     );
//     return await getLastTokenId();
//   }

//   // Make manufacturer1 also a retailer (for transfer tests)
//   async function makeManufacturerRetailer() {
//     await contract.connect(manufacturer1).requestForRetailer("Tesla Retail", "Austin");
//     await contract.connect(manufacturer1).addRetailer(manufacturer1.address);
//   }

//   describe("Manufacturer Management", function () {
//     it("Should allow a user to join as manufacturer", async function () {
//       await contract.connect(manufacturer1).joinAsManufacturer("Tesla", "Austin, TX");
//       expect(await contract.hasRole(await contract.MANUFACTURER_ROLE(), manufacturer1.address)).to.be.true;

//       const [addrs, names, locations] = await contract.getAllManufacturers();
//       expect(addrs.length).to.equal(1);
//       expect(addrs[0]).to.equal(manufacturer1.address);
//       expect(names[0]).to.equal("Tesla");
//       expect(locations[0]).to.equal("Austin, TX");
//     });

//     it("Should not allow duplicate manufacturer registration", async function () {
//       await contract.connect(manufacturer1).joinAsManufacturer("Tesla", "Austin, TX");
//       await expect(
//         contract.connect(manufacturer1).joinAsManufacturer("Tesla", "Austin, TX")
//       ).to.be.revertedWithCustomError(contract, "youAreAlreadyaManufacturer");
//     });

//     it("Should enforce max manufacturer limit (10)", async function () {
//       const signers = await ethers.getSigners();
//       for (let i = 0; i < 10; i++) {
//         await contract.connect(signers[i]).joinAsManufacturer(`M${i}`, `Loc${i}`);
//       }
//       await expect(
//         contract.connect(signers[10]).joinAsManufacturer("TooMany", "Overflow")
//       ).to.be.revertedWithCustomError(contract, "ManufacturerRegistryIsFull");
//     });

//     it("Should allow DEFAULT_ADMIN_ROLE to remove a manufacturer", async function () {
//       await contract.connect(manufacturer1).joinAsManufacturer("Tesla", "Austin, TX");
//       await contract.connect(admin).removeManufacturer(manufacturer1.address);
//       expect(await contract.hasRole(await contract.MANUFACTURER_ROLE(), manufacturer1.address)).to.be.false;
//       const [addrs] = await contract.getAllManufacturers();
//       expect(addrs.length).to.equal(0);
//     });

//     it("Should not allow non-admin to remove manufacturer", async function () {
//       await contract.connect(manufacturer1).joinAsManufacturer("Tesla", "Austin, TX");
//       await expect(
//         contract.connect(manufacturer2).removeManufacturer(manufacturer1.address)
//       ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
//     });
//   });

//   describe("Retailer Management", function () {
//     beforeEach(async function () {
//       await contract.connect(manufacturer1).joinAsManufacturer("Tesla", "Austin, TX");
//     });

//     it("Should allow a user to request retailer status", async function () {
//       await contract.connect(retailer1).requestForRetailer("AutoZone", "Houston, TX");
//       const requests = await contract.getRetailerRequests();
//       expect(requests.length).to.equal(1);
//       expect(requests[0]).to.equal(retailer1.address);
      
//       const details = await contract.retailerDetails(retailer1.address);
//       expect(details.name).to.equal("AutoZone");
//       expect(details.location).to.equal("Houston, TX");
//       expect(details.isApprove).to.be.false;
//     });

//     it("Should allow manufacturer to approve retailer request", async function () {
//       await contract.connect(retailer1).requestForRetailer("AutoZone", "Houston, TX");
//       await contract.connect(manufacturer1).addRetailer(retailer1.address);
//       expect(await contract.hasRole(await contract.RETAILER_ROLE(), retailer1.address)).to.be.true;
//       const details = await contract.retailerDetails(retailer1.address);
//       expect(details.isApprove).to.be.true;
//     });

//     it("Should not approve retailer without a pending request", async function () {
//       await expect(
//         contract.connect(manufacturer1).addRetailer(retailer1.address)
//       ).to.be.revertedWith("Retailer request not found");
//     });

//     it("Should allow manufacturer to remove retailer", async function () {
//       await contract.connect(retailer1).requestForRetailer("AutoZone", "Houston, TX");
//       await contract.connect(manufacturer1).addRetailer(retailer1.address);
//       await contract.connect(manufacturer1).removeRetailer(retailer1.address);
//       expect(await contract.hasRole(await contract.RETAILER_ROLE(), retailer1.address)).to.be.false;
//       expect((await contract.retailerDetails(retailer1.address)).isApprove).to.be.false;
//     });

//     it("Should not allow non-manufacturer to add retailer", async function () {
//       await contract.connect(retailer1).requestForRetailer("AutoZone", "Houston, TX");
//       await expect(
//         contract.connect(retailer2).addRetailer(retailer1.address)
//       ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
//     });
//   });

//   describe("Supply Request & Minting", function () {
//     beforeEach(async function () {
//       await setupManufacturerAndRetailer();
//     });

//     it("Should allow retailer to create supply request", async function () {
//       const productHash = ethers.keccak256(ethers.toUtf8Bytes("Part123"));
//       await contract.connect(retailer1).createSupplyRequest(productHash, 3);
//       const req = await contract.supplyRequests(0);
//       expect(req.requester).to.equal(retailer1.address);
//       expect(req.productHash).to.equal(productHash);
//       expect(req.quantity).to.equal(3);
//       expect(req.fulfilled).to.be.false;
//     });

//     it("Should allow manufacturer to fulfill supply request", async function () {
//       const productHash = ethers.keccak256(ethers.toUtf8Bytes("Part123"));
//       await contract.connect(retailer1).createSupplyRequest(productHash, 2);

//       const uris = [DEFAULT_URI, DEFAULT_URI];
//       const hashes = [DEFAULT_HASH, DEFAULT_HASH];

//       const tx = await contract.connect(manufacturer1).fulfillSupplyRequest(0, uris, hashes);
//       const receipt = await tx.wait();
//       const event = receipt.logs
//         .map(log => contract.interface.parseLog(log))
//         .find(parsed => parsed && parsed.name === "SupplyRequestFulfilled");
//       const tokenIds = event.args.tokenIds;

//       expect(tokenIds.length).to.equal(2);

//       const req = await contract.supplyRequests(0);
//       expect(req.fulfilled).to.be.true;

//       for (let i = 0; i < 2; i++) {
//         const tokenId = tokenIds[i];
//         expect(await contract.ownerOf(tokenId)).to.equal(retailer1.address);
//         const part = await contract.parts(tokenId);
//         expect(part.status).to.equal(0); // NEW
//         expect(part.minter).to.equal(manufacturer1.address);
//         expect(await contract.saleStatus(tokenId)).to.equal(0); // UNSOLD
//         expect(await contract.nftCustodian(tokenId)).to.equal(retailer1.address);
//       }
//     });

//     it("Should not fulfill non-existent request", async function () {
//       const uris = [DEFAULT_URI];
//       const hashes = [DEFAULT_HASH];
//       await expect(
//         contract.connect(manufacturer1).fulfillSupplyRequest(999, uris, hashes)
//       ).to.be.revertedWithCustomError(contract, "RequestDoesNotExist");
//     });

//     it("Should not fulfill already fulfilled request", async function () {
//       const productHash = ethers.keccak256(ethers.toUtf8Bytes("Part123"));
//       await contract.connect(retailer1).createSupplyRequest(productHash, 1);
//       const uris = [DEFAULT_URI];
//       const hashes = [DEFAULT_HASH];
//       await contract.connect(manufacturer1).fulfillSupplyRequest(0, uris, hashes);
//       await expect(
//         contract.connect(manufacturer1).fulfillSupplyRequest(0, uris, hashes)
//       ).to.be.revertedWithCustomError(contract, "RequestAlreadyFulfilled");
//     });

//     it("Should not allow non-manufacturer to fulfill request", async function () {
//       const productHash = ethers.keccak256(ethers.toUtf8Bytes("Part123"));
//       await contract.connect(retailer1).createSupplyRequest(productHash, 1);
//       const uris = [DEFAULT_URI];
//       const hashes = [DEFAULT_HASH];
//       await expect(
//         contract.connect(retailer2).fulfillSupplyRequest(0, uris, hashes)
//       ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
//     });
//   });

//   describe("Shipping, Delivery & Returns", function () {
//     let tokenId;

//     beforeEach(async function () {
//       tokenId = await mintPartToRetailer();
//     });

//     it("Should allow retailer to ship part to customer", async function () {
//       const phone = "+1234567890";
//       const tracking = "UPS123456";
//       await contract.connect(retailer1).shipPart(tokenId, phone, tracking);
//       expect(await contract.saleStatus(tokenId)).to.equal(1); // IN_TRANSIT
//       expect(await contract.partOwner(tokenId)).to.equal(phone);
//       expect(await contract.nftCustodian(tokenId)).to.equal(retailer1.address);
//     });

//     it("Should not ship already sold part", async function () {
//       const phone = "+1234567890";
//       await contract.connect(retailer1).shipPart(tokenId, phone, "TRACK");
//       await expect(
//         contract.connect(retailer1).shipPart(tokenId, phone, "TRACK2")
//       ).to.be.revertedWithCustomError(contract, "AlreadySold");
//     });

//     it("Should allow retailer to confirm delivery", async function () {
//       const phone = "+1234567890";
//       await contract.connect(retailer1).shipPart(tokenId, phone, "TRACK");
//       await contract.connect(retailer1).confirmDelivery(tokenId);
//       expect(await contract.saleStatus(tokenId)).to.equal(2); // SOLD
//     });

//     it("Should not confirm delivery if not IN_TRANSIT", async function () {
//       await expect(
//         contract.connect(retailer1).confirmDelivery(tokenId)
//       ).to.be.revertedWithCustomError(contract, "NotInTransit");
//     });

//     it("Should allow retailer to report defective return after delivery", async function () {
//       const phone = "+1234567890";
//       await contract.connect(retailer1).shipPart(tokenId, phone, "TRACK");
//       await contract.connect(retailer1).confirmDelivery(tokenId);
//       await contract.connect(retailer1).reportDefectiveReturn(tokenId);
//       expect(await contract.saleStatus(tokenId)).to.equal(3); // RETURNED
//       expect(await contract.ownerOf(tokenId)).to.equal(manufacturer1.address);
//       expect(await contract.nftCustodian(tokenId)).to.equal(manufacturer1.address);
//       const part = await contract.parts(tokenId);
//       expect(part.status).to.equal(2); // DEFECTIVE_RETURNED
//       expect(await contract.partOwner(tokenId)).to.equal("");
//     });

//     it("Should not return part that is not sold", async function () {
//       await expect(
//         contract.connect(retailer1).reportDefectiveReturn(tokenId)
//       ).to.be.revertedWithCustomError(contract, "PartNotSold");
//     });

//     it("Should allow manufacturer to repair a defective part", async function () {
//       const phone = "+1234567890";
//       await contract.connect(retailer1).shipPart(tokenId, phone, "TRACK");
//       await contract.connect(retailer1).confirmDelivery(tokenId);
//       await contract.connect(retailer1).reportDefectiveReturn(tokenId);
//       await contract.connect(manufacturer1).repairPart(tokenId);
//       const part = await contract.parts(tokenId);
//       expect(part.status).to.equal(3); // REPAIRED
//       expect(await contract.saleStatus(tokenId)).to.equal(0); // UNSOLD
//     });

//     it("Should allow manufacturer to refurbish a defective part", async function () {
//       const phone = "+1234567890";
//       await contract.connect(retailer1).shipPart(tokenId, phone, "TRACK");
//       await contract.connect(retailer1).confirmDelivery(tokenId);
//       await contract.connect(retailer1).reportDefectiveReturn(tokenId);
//       await contract.connect(manufacturer1).refurbishPart(tokenId);
//       const part = await contract.parts(tokenId);
//       expect(part.status).to.equal(4); // REFURBISHED
//       expect(await contract.saleStatus(tokenId)).to.equal(0); // UNSOLD
//     });

//     it("Should not repair if not in defective state", async function () {
//       await expect(
//         contract.connect(manufacturer1).repairPart(tokenId)
//       ).to.be.revertedWithCustomError(contract, "OnlyManufacturer");
//     });
//   });

//   describe("Transfer to Retailer", function () {
//     let tokenId;

//     beforeEach(async function () {
//       // Setup manufacturer and retailer1
//       await contract.connect(manufacturer1).joinAsManufacturer("Tesla", "Austin, TX");
//       await contract.connect(retailer1).requestForRetailer("AutoZone", "Houston, TX");
//       await contract.connect(manufacturer1).addRetailer(retailer1.address);
//       // Make manufacturer1 also a retailer (for selling)
//       await contract.connect(manufacturer1).requestForRetailer("Tesla Retail", "Austin");
//       await contract.connect(manufacturer1).addRetailer(manufacturer1.address);
//       // Register retailer2
//       await contract.connect(retailer2).requestForRetailer("NAPA", "Chicago, IL");
//       await contract.connect(manufacturer1).addRetailer(retailer2.address);
//     });

//     it("Should allow manufacturer to transfer NFT to another retailer", async function () {
//       // Mint to manufacturer1
//       await contract.connect(manufacturer1).mintPartToRetailer(
//         manufacturer1.address,
//         DEFAULT_URI,
//         DEFAULT_HASH
//       );
//       tokenId = await getLastTokenId();
//       await contract.connect(manufacturer1).transferToRetailer(retailer2.address, tokenId);
//       expect(await contract.ownerOf(tokenId)).to.equal(retailer2.address);
//       expect(await contract.nftCustodian(tokenId)).to.equal(retailer2.address);
//     });

//     it("Should not transfer if recipient is not a retailer", async function () {
//       await contract.connect(manufacturer1).mintPartToRetailer(
//         manufacturer1.address,
//         DEFAULT_URI,
//         DEFAULT_HASH
//       );
//       tokenId = await getLastTokenId();
//       await expect(
//         contract.connect(manufacturer1).transferToRetailer(other.address, tokenId)
//       ).to.be.revertedWithCustomError(contract, "RecipientNotRetailer");
//     });

//     it("Should not transfer if part is already sold", async function () {
//       // Mint to manufacturer1
//       await contract.connect(manufacturer1).mintPartToRetailer(
//         manufacturer1.address,
//         DEFAULT_URI,
//         DEFAULT_HASH
//       );
//       tokenId = await getLastTokenId();
//       // Sell it: manufacturer1 is also a retailer, so they can ship and confirm
//       await contract.connect(manufacturer1).shipPart(tokenId, "+123", "TRACK");
//       await contract.connect(manufacturer1).confirmDelivery(tokenId);
//       // Attempt transfer to retailer2, should revert with AlreadySold
//       await expect(
//         contract.connect(manufacturer1).transferToRetailer(retailer2.address, tokenId)
//       ).to.be.revertedWithCustomError(contract, "AlreadySold");
//     });

//     it("Should not transfer if caller is not manufacturer", async function () {
//       // Mint to retailer1 (so retailer1 owns the token)
//       await contract.connect(manufacturer1).mintPartToRetailer(
//         retailer1.address,
//         DEFAULT_URI,
//         DEFAULT_HASH
//       );
//       tokenId = await getLastTokenId();
//       // retailer1 calls transferToRetailer (owner but not manufacturer)
//       await expect(
//         contract.connect(retailer1).transferToRetailer(retailer2.address, tokenId)
//       ).to.be.revertedWithCustomError(contract, "OnlyManufacturer");
//     });
//   });

//   describe("Recall", function () {
//     let tokenId;

//     beforeEach(async function () {
//       tokenId = await mintPartToRetailer();
//     });

//     it("Should allow manufacturer to recall a part", async function () {
//       await contract.connect(manufacturer1).recallPart(tokenId);
//       const part = await contract.parts(tokenId);
//       expect(part.status).to.equal(1); // RECALLED
//     });

//     it("Should not recall already recalled part", async function () {
//       await contract.connect(manufacturer1).recallPart(tokenId);
//       await expect(
//         contract.connect(manufacturer1).recallPart(tokenId)
//       ).to.be.revertedWithCustomError(contract, "AlreadyRecalled");
//     });

//     it("Should clear customer data if recalled after sale", async function () {
//       const phone = "+1234567890";
//       await contract.connect(retailer1).shipPart(tokenId, phone, "TRACK");
//       await contract.connect(retailer1).confirmDelivery(tokenId);
//       await contract.connect(manufacturer1).recallPart(tokenId);
//       expect(await contract.partOwner(tokenId)).to.equal("");
//       expect(await contract.saleStatus(tokenId)).to.equal(3); // RETURNED
//     });
//   });

//   describe("Royalties", function () {
//     let tokenId;

//     beforeEach(async function () {
//       tokenId = await mintPartToRetailer();
//     });

//     it("Should allow admin to set default royalty", async function () {
//       // Reset per-token royalty by returning the part
//       const phone = "+1234567890";
//       await contract.connect(retailer1).shipPart(tokenId, phone, "TRACK");
//       await contract.connect(retailer1).confirmDelivery(tokenId);
//       await contract.connect(retailer1).reportDefectiveReturn(tokenId);
      
//       // Now token is back with manufacturer1 and royalty is reset.
//       await contract.connect(admin).setDefaultRoyalty(manufacturer1.address, 300);
//       const info = await contract.royaltyInfo(tokenId, 1000);
//       expect(info[0]).to.equal(manufacturer1.address);
//       expect(info[1]).to.equal(30); // 1000 * 3% = 30
//     });

//     it("Should not allow non-admin to set default royalty", async function () {
//       await expect(
//         contract.connect(manufacturer1).setDefaultRoyalty(manufacturer1.address, 300)
//       ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
//     });
//   });

//   describe("Blocked Transfers", function () {
//     let tokenId;

//     beforeEach(async function () {
//       tokenId = await mintPartToRetailer();
//     });

//     it("Should revert on transferFrom", async function () {
//       await expect(
//         contract.connect(retailer1).transferFrom(retailer1.address, other.address, tokenId)
//       ).to.be.revertedWithCustomError(contract, "TransferBlocked");
//     });

//     it("Should revert on safeTransferFrom (4-param)", async function () {
//       await expect(
//         contract.connect(retailer1)["safeTransferFrom(address,address,uint256,bytes)"](
//           retailer1.address,
//           other.address,
//           tokenId,
//           "0x"
//         )
//       ).to.be.revertedWithCustomError(contract, "TransferBlocked");
//     });
//   });

//   describe("View Functions", function () {
//     let tokenId;

//     beforeEach(async function () {
//       tokenId = await mintPartToRetailer();
//     });

//     it("Should return correct customer phone number", async function () {
//       const phone = "+1234567890";
//       await contract.connect(retailer1).shipPart(tokenId, phone, "TRACK");
//       await contract.connect(retailer1).confirmDelivery(tokenId);
//       expect(await contract.getCustomerPhoneNumber(tokenId)).to.equal(phone);
//     });

//     it("Should return correct NFT custodian", async function () {
//       expect(await contract.getNFTCustodian(tokenId)).to.equal(retailer1.address);
//     });

//     it("Should verify part authenticity", async function () {
//       const result = await contract.verifyPartAuthenticity(tokenId);
//       expect(result.isAuthentic).to.be.true;
//       expect(result.status).to.equal(0); // NEW
//       expect(result.metadataHash).to.equal(DEFAULT_HASH);
//       expect(result.currentCustodian).to.equal(retailer1.address);
//       expect(result.mintedAt).to.be.gt(0);
//     });

//     it("Should revert on non-existent part verification", async function () {
//       await expect(
//         contract.verifyPartAuthenticity(999)
//       ).to.be.revertedWithCustomError(contract, "PartDoesNotExist");
//     });
//   });
// });