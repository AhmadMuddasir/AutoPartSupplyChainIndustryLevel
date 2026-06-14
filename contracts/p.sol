// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";


contract AutoPartNFT is ERC721URIStorage,AccessControl {//inheritance
     
     //custom errors
     error InvalidUser();
     error InvalidRetailer();

     bytes32 public constant  MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");    
     bytes32 public constant  RETAILER_ROLE = keccak256("RETAILER_ROLE");

     address public immutable manufacturer;

     enum PartStatus {
          NEW,
          RECALLED,
          DEFECTIVE_RETURNED,
          REPAIRED,
          REFURBISHED
     }

     struct PartDetails{
          PartStatus status;
          bytes32 metadataHash;
          uint256 mintedAt;
     }
      
     mapping(uint256=>PartDetails) public parts;

     uint256 private _nextTokenId;

     event PartMinted(uint indexed tokenId,address indexed to,bytes32 metadataHas,uint256 timestamp);

     event SupplyChainTransfer(
          uint indexed tokenID,
          address indexed from,
          address indexed to,
          string fromRole,
          string toRole,
          uint timestamp
     );
     event DefectiveReturned(uint indexed tokenId,address indexed retailer,uint256 timestamp);
     event PartRepaired(uint indexed tokenId,uint timestamp);
     event PartRefurbished(uint indexed tokenId,uint timestamp);
     event PartRecalled(uint indexed tokenId, uint timestamp);

     constructor(address _manufacturer) ERC721("AutoPart","ATP"){
          if(_manufacturer == address(0)){
               revert InvalidUser();
          }
          manufacturer = _manufacturer;
          _grantRole(DEFAULT_ADMIN_ROLE,msg.sender);
          _grantRole(MANUFACTURER_ROLE,_manufacturer);

     }

     function mintPartToRetailer(
          address retailer,
          string calldata uri,
          bytes32 metadataHash
     )public onlyRole(MANUFACTURER_ROLE) returns (uint256){
               if(retailer != address(0)){
                    revert InvalidRetailer();
               }
               uint tokenID = _nextTokenId++;
               _safeMint(retailer,tokenID);
               _setTokenURI(tokenID,uri);

               parts[tokenID] = PartDetails({
                    status:PartStatus.NEW,
                    metadataHash:metadataHash,
                    mintedAt:block.timestamp
               })
     
     emit PartMinted(tokenID,retailer,metadataHash,block.timestamp);
     emit SupplyChainTransfer(tokenID,address(0),retailer,"Manufacturer", "Retailer", block.timestamp);
     return tokenID;
     }

     function batchMintToRetailer(
          address[] calldata retailers,
          string[] calldata uris,
          bytes32[] calldata metadataHashes
     )

     

}