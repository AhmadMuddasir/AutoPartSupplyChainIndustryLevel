// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract AutoPartNFT_Pro_V2 is ERC721URIStorage, AccessControl, ERC2981 {
    
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant RETAILER_ROLE    = keccak256("RETAILER_ROLE");

    address public immutable manufacturer;
    uint96 public constant RETAILER_ROYALTY_BPS = 500; // 5%

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

    // ════════════════════════════════════════════════════════════
    // Minimal Supply Request System
    // ════════════════════════════════════════════════════════════
    struct SupplyRequest {
        address requester;
        bytes32 productHash;     // e.g., keccak256("Toyota Brake Pad 2023")
        uint256 quantity;
        uint256 requestTime;
        bool fulfilled;
    }

    mapping(uint256 => SupplyRequest) public supplyRequests;
    uint256 private _nextRequestId;

    // ════════════════════════════════════════════════════════════
    // Ownership & Sales Tracking
    // ════════════════════════════════════════════════════════════
    mapping(uint256 => string) public partOwner;
    mapping(uint256 => address) public nftCustodian;
    
    enum SaleStatus { UNSOLD, IN_TRANSIT, SOLD, RETURNED }
    mapping(uint256 => SaleStatus) public saleStatus;

    mapping(uint256 => PartDetails) public parts;
    uint256 private _nextTokenId;

    // ════════════════════════════════════════════════════════════
    // EVENTS
    // ════════════════════════════════════════════════════════════
    event PartMinted(uint256 indexed tokenId, address indexed to, bytes32 metadataHash, uint256 timestamp);
    event SupplyChainTransfer(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        string fromRole,
        string toRole,
        uint256 timestamp
    );
    event PartSoldToCustomer(uint256 indexed tokenId, string phoneNumber, address indexed retailer, uint256 timestamp);
    event PartShipped(uint256 indexed tokenId, string phoneNumber, string trackingNumber, uint256 timestamp);
    event DefectiveReturned(uint256 indexed tokenId, address indexed retailer, uint256 timestamp);
    event PartRepaired(uint256 indexed tokenId, uint256 timestamp);
    event PartRefurbished(uint256 indexed tokenId, uint256 timestamp);
    event PartRecalled(uint256 indexed tokenId, uint256 timestamp);

    // Supply Request Events
    event SupplyRequestCreated(uint256 indexed requestId, address indexed retailer, bytes32 productHash, uint256 quantity);
    event SupplyRequestFulfilled(uint256 indexed requestId, uint256[] tokenIds);

    constructor(address _manufacturer) 
        ERC721("AutoPart Pro V2", "APART2") 
    {
        require(_manufacturer != address(0), "Invalid manufacturer");
        manufacturer = _manufacturer;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANUFACTURER_ROLE, _manufacturer);
        _setDefaultRoyalty(_manufacturer, 200);
    }

    // ════════════════════════════════════════════════════════════
    // SUPPLY REQUEST FUNCTIONS
    // ════════════════════════════════════════════════════════════

    function createSupplyRequest(bytes32 productHash, uint256 quantity) 
        external 
        onlyRole(RETAILER_ROLE) 
    {
        require(quantity > 0 && quantity <= 50, "Quantity must be between 1 and 50");
        require(productHash != bytes32(0), "Invalid product hash");

        uint256 requestId = _nextRequestId++;
        
        supplyRequests[requestId] = SupplyRequest({
            requester: msg.sender,
            productHash: productHash,
            quantity: quantity,
            requestTime: block.timestamp,
            fulfilled: false
        });

        emit SupplyRequestCreated(requestId, msg.sender, productHash, quantity);
    }

    function fulfillSupplyRequest(
        uint256 requestId,
        string[] calldata uris,
        bytes32[] calldata metadataHashes
    ) 
        external 
        onlyRole(MANUFACTURER_ROLE) 
        returns (uint256[] memory) 
    {
        SupplyRequest storage req = supplyRequests[requestId];
        require(!req.fulfilled, "Request already fulfilled");
        require(req.requester != address(0), "Request does not exist");
        require(uris.length == req.quantity && metadataHashes.length == req.quantity, "Array length mismatch");

        uint256[] memory tokenIds = new uint256[](req.quantity);

        for (uint256 i = 0; i < req.quantity; i++) {
            tokenIds[i] = _mintToRetailer(req.requester, uris[i], metadataHashes[i]);
        }

        req.fulfilled = true;
        emit SupplyRequestFulfilled(requestId, tokenIds);
        return tokenIds;
    }

    // Internal helper
    function _mintToRetailer(address retailer, string calldata uri, bytes32 metadataHash) 
        internal 
        returns (uint256) 
    {
        uint256 tokenId = _nextTokenId++;
        _safeMint(retailer, tokenId);
        _setTokenURI(tokenId, uri);

        parts[tokenId] = PartDetails({
            status: PartStatus.NEW,
            metadataHash: metadataHash,
            mintedAt: block.timestamp
        });

        nftCustodian[tokenId] = retailer;
        saleStatus[tokenId] = SaleStatus.UNSOLD;
        _setTokenRoyalty(tokenId, retailer, RETAILER_ROYALTY_BPS);

        emit PartMinted(tokenId, retailer, metadataHash, block.timestamp);
        emit SupplyChainTransfer(tokenId, address(0), retailer, "Manufacturer", "Retailer", block.timestamp);
        return tokenId;
    }

    // Original direct mint (kept for flexibility)
    function mintPartToRetailer(
        address retailer,
        string calldata uri,
        bytes32 metadataHash
    ) public onlyRole(MANUFACTURER_ROLE) returns (uint256) {
        require(retailer != address(0), "Invalid retailer");
        return _mintToRetailer(retailer, uri, metadataHash);
    }

    function batchMintToRetailers(
        address[] calldata retailers,
        string[] calldata uris,
        bytes32[] calldata metadataHashes
    ) external onlyRole(MANUFACTURER_ROLE) {
        require(retailers.length == uris.length && uris.length == metadataHashes.length, "Array length mismatch");
        for (uint256 i = 0; i < retailers.length; i++) {
            mintPartToRetailer(retailers[i], uris[i], metadataHashes[i]);
        }
    }

    // ════════════════════════════════════════════════════════════
    // SELL TO CUSTOMER
    // ════════════════════════════════════════════════════════════
    function soldToCustomer(
        uint256 tokenId,
        string calldata customerPhoneNumber,
        string calldata trackingNumber
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(hasRole(RETAILER_ROLE, msg.sender), "Only retailer can sell");
        require(bytes(customerPhoneNumber).length > 0, "Phone number required");
        
        PartStatus status = parts[tokenId].status;
        require(
            status == PartStatus.NEW || status == PartStatus.REPAIRED || status == PartStatus.REFURBISHED,
            "Part cannot be sold in current state"
        );
        
        partOwner[tokenId] = customerPhoneNumber;
        nftCustodian[tokenId] = msg.sender;
        saleStatus[tokenId] = SaleStatus.SOLD;
        
        emit PartSoldToCustomer(tokenId, customerPhoneNumber, msg.sender, block.timestamp);
        
        if (bytes(trackingNumber).length > 0) {
            emit PartShipped(tokenId, customerPhoneNumber, trackingNumber, block.timestamp);
        }
    }

    // ════════════════════════════════════════════════════════════
    // DEFECT & MAINTENANCE FLOW
    // ════════════════════════════════════════════════════════════
    function reportDefectiveReturn(uint256 tokenId) external onlyRole(RETAILER_ROLE) {
        require(ownerOf(tokenId) == msg.sender, "Only current custodian");
        require(bytes(partOwner[tokenId]).length > 0, "Part not sold");
        require(saleStatus[tokenId] == SaleStatus.SOLD, "Part must be sold before return");
        
        PartStatus status = parts[tokenId].status;
        require(
            status == PartStatus.NEW || status == PartStatus.REPAIRED || status == PartStatus.REFURBISHED,
            "Part already returned or recalled"
        );

        parts[tokenId].status = PartStatus.DEFECTIVE_RETURNED;
        
        _transfer(msg.sender, manufacturer, tokenId);
        nftCustodian[tokenId] = manufacturer;
        delete partOwner[tokenId];
        saleStatus[tokenId] = SaleStatus.RETURNED;

        _resetTokenRoyalty(tokenId);

        emit DefectiveReturned(tokenId, msg.sender, block.timestamp);
        emit SupplyChainTransfer(tokenId, msg.sender, manufacturer, "Retailer", "Manufacturer", block.timestamp);
    }

    function repairPart(uint256 tokenId) external onlyRole(MANUFACTURER_ROLE) {
        require(ownerOf(tokenId) == msg.sender, "Manufacturer doesn't own the part");
        require(parts[tokenId].status == PartStatus.DEFECTIVE_RETURNED, "Part not in defective state");
        parts[tokenId].status = PartStatus.REPAIRED;
        emit PartRepaired(tokenId, block.timestamp);
    }

    function refurbishPart(uint256 tokenId) external onlyRole(MANUFACTURER_ROLE) {
        require(ownerOf(tokenId) == msg.sender, "Manufacturer doesn't own the part");
        require(parts[tokenId].status == PartStatus.DEFECTIVE_RETURNED, "Part not in defective state");
        parts[tokenId].status = PartStatus.REFURBISHED;
        emit PartRefurbished(tokenId, block.timestamp);
    }

    // ════════════════════════════════════════════════════════════
    // SUPPLY CHAIN TRANSFER
    // ════════════════════════════════════════════════════════════
    function transferToRetailer(address to, uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(hasRole(MANUFACTURER_ROLE, msg.sender), "Only manufacturer");
        require(hasRole(RETAILER_ROLE, to), "Recipient must be a registered retailer");
        
        PartStatus status = parts[tokenId].status;
        require(
            status == PartStatus.NEW || status == PartStatus.REPAIRED || status == PartStatus.REFURBISHED,
            "Part not in transferable state"
        );

        _transfer(msg.sender, to, tokenId);
        nftCustodian[tokenId] = to;
        _setTokenRoyalty(tokenId, to, RETAILER_ROYALTY_BPS);

        emit SupplyChainTransfer(tokenId, msg.sender, to, "Manufacturer", "Retailer", block.timestamp);
    }

    // ════════════════════════════════════════════════════════════
    // RECALL
    // ════════════════════════════════════════════════════════════
    function recallPart(uint256 tokenId) external onlyRole(MANUFACTURER_ROLE) {
        require(parts[tokenId].status != PartStatus.RECALLED, "Already recalled");
        parts[tokenId].status = PartStatus.RECALLED;
        
        if (bytes(partOwner[tokenId]).length > 0) {
            saleStatus[tokenId] = SaleStatus.RETURNED;
            delete partOwner[tokenId];
        }
        emit PartRecalled(tokenId, block.timestamp);
    }

    function isRecalled(uint256 tokenId) external view returns (bool) {
        return parts[tokenId].status == PartStatus.RECALLED;
    }

    // ════════════════════════════════════════════════════════════
    // DISABLE GENERIC TRANSFERS
    // ════════════════════════════════════════════════════════════
    function transferFrom(address, address, uint256) public pure override(ERC721, IERC721) {
        revert("Use soldToCustomer, transferToRetailer, or reportDefectiveReturn");
    }
    
    function safeTransferFrom(address, address, uint256, bytes memory) public pure override(ERC721, IERC721) {
        revert("Use soldToCustomer, transferToRetailer, or reportDefectiveReturn");
    }

    // ════════════════════════════════════════════════════════════
    // ROLE MANAGEMENT
    // ════════════════════════════════════════════════════════════
    function addRetailer(address retailer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(RETAILER_ROLE, retailer);
    }
    
    function removeRetailer(address retailer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(RETAILER_ROLE, retailer);
    }

    // ════════════════════════════════════════════════════════════
    // ROYALTY MANAGEMENT
    // ════════════════════════════════════════════════════════════
    function setDefaultRoyalty(address receiver, uint96 feeBasisPoints) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _setDefaultRoyalty(receiver, feeBasisPoints);
    }

    // ════════════════════════════════════════════════════════════
    // QUERY FUNCTIONS
    // ════════════════════════════════════════════════════════════
    function getCustomerPhoneNumber(uint256 tokenId) external view returns (string memory) {
        return partOwner[tokenId];
    }
    
    function getNFTCustodian(uint256 tokenId) external view returns (address) {
        return nftCustodian[tokenId];
    }
    
    function getSaleStatus(uint256 tokenId) external view returns (SaleStatus) {
        return saleStatus[tokenId];
    }

    function verifyPartAuthenticity(uint256 tokenId) external view returns (bool) {
    return parts[tokenId].status != PartStatus.RECALLED && 
           ownerOf(tokenId) != address(0);
}

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721URIStorage, AccessControl, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}