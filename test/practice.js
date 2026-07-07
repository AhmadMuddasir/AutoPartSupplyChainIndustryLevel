const {expect} = require("chai");
const {ethers} = require("hardhat");
const {loadFixture} = require("@nomicfoundation/hardhat-network-helpers");


describe("AutoPartNFT",()=>{
async function deployContractFixture(){
     const [owner,manufacturer1,retailer1,customer1,otherAccount] = await ethers.getSigners();

     const Contract = await ethers.getContractFactory("AutoPartNFT_Pro_V3");
     const contract = await Contract.deploy();

     const mockHash = ethers.id("mockProductData");
     const mockUri = "ipfs//mockUri"

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
               const {contract,retailer1,manufacturer1} = await loadFixture(deployContractFixture);
               await contract.connect(manufacturer1).joinAsManufacturer("acme","bbb");
               await contract.connect(retailer1).requestForRetailer("ahmad","delhi");
               const retailerRole = await contract.RETAILER_ROLE();
          
               expect(await contract.hasRole(retailerRole,retailer1.address)).to.be.true;

               const request = await contract.getRetailerRequests();
               expect(request).to.include(retailer1.address);
          })
     })

     

})