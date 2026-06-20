// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract AutoPartNFT_Pro_V2 is ERC721URIStorage, AccessControl, ERC2981 {
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER");

    address public immutable manufacturer;
    uint96 public constant RETAILER_ROYALITY_BPS = 500;

    //errors
    error InvalidManufacurer();
    error QuantityExceedsorLess(uint256 quantity);
    error InvalidProductHash();
    error RequestAlreadtFulfilled();
    error RequestDoesNotExist();
    error ArrayLengthMismatched();

    enum PartStatus {
        NEW,
        RECALLED,
        DEFECTIVE_RETURNED,
        REPAIRED,
        REFURBISHED
    }

    struct PartDetails {
        PartStatus status;
        bytes32 metadataHash;
        uint256 mintedAt;
    }

    struct SupplyRequest {
        address requester;
        bytes32 productHash;
        uint256 quantity;
        uint    requestTime;
        bool    ulfilled;
    }

    mapping(uint => SupplyRequest) public SupplyRequests;
    uint256 private _nextRequestId;

    mapping(uint256 => string) public partOwner;
    mapping(uint256 => address) public nftCustodian;

    enum SaleStatus {
        UNSOLD,
        IN_TRANSIT,
        SOLD,
        RETURNED
    }

    mapping(uint256 => PartDetails) public parts;

    uint256 private _nextTokenId;

    event PartMinted(
        uint256 indexed tokenId,
        address indexed to,
        bytes32 metadataHash,
        uint256 timestamp
    );
    event SupplyChainTransfer(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        string fromRole,
        string toRole,
        uint256 timestamp
    );

    //all events
    event PartSoldToCustomer(
        uint256 indexed tokenId,
        string phoneNumber,
        address indexed retailer,
        uint256 timestamp
    );
    event PartShipped(
        uint256 indexed tokenId,
        string phoneNumber,
        string trackingNumber,
        uint256 timestamp
    );
    event DefectiveReturned(
        uint256 indexed tokenId,
        address indexed retailer,
        uint256 timestamp
    );
    event PartRepaired(uint256 indexed tokenId, uint256 timestamp);
    event PartRefurbished(uint256 indexed tokenId, uint256 timestamp);
    event PartRecalled(uint256 indexed tokenId, uint256 timestamp);
    event SupplyRequestCreated(
        uint256 indexed requestId,
        address indexed retailer,
        bytes32 productHash,
        uint256 quantity
    );
    event SupplyRequestFulfilled(uint256 indexed requestId, uint256[] tokenIds);

    constructor(address _manufacturer) ERC721("Auto_Part", "APT") {
        if (_manufacturer == address(0)) {
            revert InvalidManufacurer();
        }
        manufacturer = _manufacturer;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANUFACTURER_ROLE, manufacturer);
        _setDefaultRoyalty(_manufacturer, 200); //2%
    }

    function createSupplyRequest(
        bytes32 _productHash,
        uint256 _quantity
    ) external onlyRole(RETAILER_ROLE) {
        if (_quantity < 0 && _quantity >= 100) {
            revert QuantityExceedsorLess(_quantity);
        }
        if (_productHash == bytes32(0)) {
            revert InvalidProductHash();
        }

        uint256 requestId = _nextRequestId++;

        SupplyRequests[requestId] = SupplyRequest({
            requester:msg.sender,
            productHash:_productHash,
            quantity:_quantity,
            requestTime:block.timestamp,
            fulfilled:false
        });
        emit SupplyRequestCreated(requestId,msg.sender,_productHash,quantity);
    }

    function fullfillSupplyRequest(
        uint256 requestId,
        string[] calldata uris,
        bytes32 calldata metadataHashes
    )
    external
    onlyRole(MANUFACTURER_ROLE)
    returns(uint256[] memory)
    {
        SupplyRequests storage req = SupplyRequests[requestId];
        if(req.fulfilled){ revert RequestAlreadtFulfilled();}
        if(req.requester == address(0)){ revert RequestDoesNotExist();}
        if(uris.length != req.quantity && metadataHashes.length != req.quantity)
        {revert ArrayLengthMismatched()} 

        uint256[] memory tokenIds = new uint256[](req.quantity);

        for(uint i=0;i<req.quantity;i++){
            tokenIds[i] = _mintToRetailer(req.requester,uris[i],metadataHashes[i]);
        }
        req.fulfilled = true;
        return tokenIds;
    }






















    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC721URIStorage, AccessControl, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
