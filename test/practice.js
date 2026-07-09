const {expect} = require("chai");
const {ethers} = require("hardhat");
const {loadFixture} = require("@nomicfoundation/hardhat-network-helpers");


describe("AutoPartNFT",()=>{
async function deployContractFixture(){
     const [owner,manufacturer1,retailer1,customer1,otherAccount] = await ethers.getSigners();

     const Contract = await ethers.getContractFactory("AutoPartNFT_Pro_V3");
     const contract = await Contract.deploy();

     const mockHash = ethers.id("mockProductData");
     const mockUri = "ipfs//mockUri";

     return {contract,owner,manufacturer1,retailer1,customer1,otherAccount,mockHash,mockUri};
}

     describe("Deployment & Roles",()=>{
          it("Should assign the DEFAULT_ADMIN_ROLE to the deployer",async()=>{
              const {contract,owner} = await loadFixture(deployContractFixture);
              const adminRole = await contract.DEFAULT_ADMIN_ROLE();
              expect(await contract.hasRole(adminRole,owner.address)).to.equal(true);
          });

          it("should set the right name and symbol",async()=>{
               const {contract} = await loadFixture(deployContractFixture);
               expect(await contract.name()).to.equal("Auto_Part");
               expect(await contract.symbol()).to.equal("APT");
          });

          
     })
     describe("Manufacturer managemant",()=>{
          it("it should allow an address to join as manufacturer",async()=>{
               const {contract,manufacturer1} = await loadFixture(deployContractFixture);
               await contract.connect(manufacturer1).joinAsManufacturer("toyta","ghy");
               const mfgRole = await contract.MANUFACTURER_ROLE();
               expect(await contract.hasRole(mfgRole,manufacturer1.address)).to.be.true;

               const [addresses,names,locations] = await contract.getAllManufacturers();
               expect(addresses).to.include(manufacturer1.address);
               expect(names).to.include("toyta");
               expect(locations).to.include("ghy");
          })

          it("should revert if trying to join manufacture twice",async()=>{
               const {contract,manufacturer1} =await loadFixture(deployContractFixture);
               await contract.connect(manufacturer1).joinAsManufacturer("aaa","bbb");
               await expect(contract.connect(manufacturer1).joinAsManufacturer("aaa","bbb")).to.be.revertedWithCustomError(contract,"youAreAlreadyaManufacturer");
          });
     })

     describe("Retailer Management",()=>{
          it("Should allow an address to request to be retailer and a manufacturer approve it",async()=>{
               const {contract, manufacturer1, retailer1} = await loadFixture(deployContractFixture);
               await contract.connect(manufacturer1).joinAsManufacturer("acme","bbb");
               await contract.connect(retailer1).requestForRetailer("ahmad","delhi");
               const request = await contract.getRetailerRequests();
               expect(request).to.include(retailer1.address);
               await contract.connect(manufacturer1).addRetailer(retailer1.address);
               const retailerRole = await contract.RETAILER_ROLE();          
               expect(await contract.hasRole(retailerRole,retailer1.address)).to.be.true;
          })
     })

     describe("Supply Chain & Minting",()=>{
           async function setUpRolesFixtures(){
               const fixtureData = await deployContractFixture();
               const {contract,manufacturer1,retailer1} = fixtureData;
               await contract.connect(manufacturer1).joinAsManufacturer("Acme","Detroit");
               await contract.connect(retailer1).requestForRetailer("aaa","bbb");
               await contract.connect(manufacturer1).addRetailer(retailer1.address);

               return fixtureData;
          }

          it("should create and fulfilled a supply request",async function (){
               const {contract,manufacturer1,retailer1,mockHash,mockUri} = await loadFixture(setUpRolesFixtures);
               const quantity = 2;

               await expect(contract.connect(retailer1).createSupplyRequest(mockHash,quantity))
               .to.emit(contract,"SupplyRequestCreated");

               const requestId = 0;

               await expect(
                    contract.connect(manufacturer1).fulfillSupplyRequest(
                         requestId,
                         [mockUri,mockUri],
                         [mockHash,mockHash]
                    )
               ).to.emit(contract,"SupplyRequestFulfilled");

               const tokenId = 0;
               const custodian = await contract.getNFTCustodian(tokenId);
               expect(custodian).to.equal(retailer1.address);

               const status = await contract.getSaleStatus(tokenId);
               expect(status).to.equal(0);
          });
          it("should ship a part and confirm delivery",async()=>{
               const {contract,manufacturer1,retailer1,mockHash,mockUri} = await loadFixture(setUpRolesFixtures);

               await contract.connect(manufacturer1).mintPartToRetailer(retailer1.address,mockUri,mockHash);
               const tokenid = 0;
               const phone = "8638984191";
               const tracking = "Track123";

               await expect(contract.connect(retailer1).shipPart(tokenid,phone,tracking))
               .to.emit(contract,"PartShipped")
               .withArgs(tokenid,phone,tracking,(val) => true);

               let status = await contract.getSaleStatus(tokenid);
               expect(status).to.equal(1);

               await expect(contract.connect(retailer1).confirmDelivery(tokenid))
               .to.emit(contract,"DeliveryConfirmed");

               status = await contract.getSaleStatus(tokenid);
               expect(status).to.equal(2);

               const recordedPhone = await contract.getCustomerPhoneNumber(tokenid);
               expect(recordedPhone).to.equal(phone);

          });

          describe("SBT properties ",()=>{
              it("should revert manual transfer by a transfer from",async()=>{
               const {contract,manufacturer1,retailer1,mockHash,mockUri,otherAccount} = await loadFixture(deployContractFixture);
               await contract.connect(manufacturer1).joinAsManufacturer("aaa","bbb");
               await contract.connect(retailer1).requestForRetailer("Retailer","rrr");
               await contract.connect(manufacturer1).addRetailer(retailer1.address);
               await contract.connect(manufacturer1).mintPartToRetailer(retailer1.address,mockUri,mockHash);

               await expect(
                    contract.connect(retailer1).transferFrom(retailer1.address, otherAccount.address, 0)
               ).to.be.revertedWithCustomError(contract,"TransferBlocked");
                }) 
          })

     })

     

})