// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract AutoPartNFT_Pro_V2 is ERC721URIStorage, AccessControl, ERC2981 {

    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant RETAILER_ROLE     = keccak256("RETAILER_ROLE");
    uint96  public constant RETAILER_ROYALTY_BPS = 500; // 5%

    // Custom Errors
    error InvalidManufacturer();
    error ManufacturerRegistryFull();
    error AlreadyManufacturer();
    error InvalidRetailerAddress();
    error QuantityOutOfRange();
    error InvalidProductHash();
    error RequestAlreadyFulfilled();
    error RequestDoesNotExist();
    error ArrayLengthMismatch();
    error NotOwner();
    error OnlyRetailer();
    error PhoneRequired();
    error AlreadySold();
    error CannotSellInCurrentState();
    error OnlyCurrentCustodian();
    error PartNotSold();
    error AlreadyReturnedOrRecalled();
    error OnlyManufacturer();
    error RecipientNotRetailer();
    error PartNotTransferable();
    error NotInDefectiveState();
    error AlreadyRecalled();
    error PartDoesNotExist();
    error TransferBlocked();

    enum PartStatus {
        NEW,
        RECALLED,
        DEFECTIVE_RETURNED,
        REPAIRED,
        REFURBISHED
    }

    enum SaleStatus {
        UNSOLD,
        SOLD,
        RETURNED
    }

    struct PartDetails {
        PartStatus status;
        bytes32    metadataHash;
        uint256    mintedAt;
        address    minter;
    }

    struct SupplyRequest {
        address  requester;
        bytes32  productHash;
        uint256  quantity;
        uint256  requestTime;
        bool     fulfilled;
    }

    struct RetailerDetails {
        string name;
        string location;
        bool   isActive;
    }

    // Storage
    mapping(uint256 => PartDetails)     public parts;
    mapping(uint256 => SaleStatus)      public saleStatus;
    mapping(uint256 => string)          public partOwner;
    mapping(uint256 => address)         public nftCustodian;
    mapping(uint256 => SupplyRequest)   public supplyRequests;
    mapping(address => RetailerDetails) public retailerDetails;

    // Iterable Storage Arrays replacing AccessControlEnumerable
    address[] public manufacturers;
    address[] public retailers;

    uint256 private _nextTokenId;
    uint256 private _nextRequestId;

    // Events
    event PartMinted(uint256 indexed tokenId, address indexed to, bytes32 metadataHash, uint256 timestamp);
    event SupplyChainTransfer(uint256 indexed tokenId, address indexed from, address indexed to, string fromRole, string toRole, uint256 timestamp);
    event PartSoldToCustomer(uint256 indexed tokenId, string phoneNumber, address indexed retailer, uint256 timestamp);
    event PartShipped(uint256 indexed tokenId, string phoneNumber, string trackingNumber, uint256 timestamp);
    event DefectiveReturned(uint256 indexed tokenId, address indexed retailer, uint256 timestamp);
    event PartRepaired(uint256 indexed tokenId, uint256 timestamp);
    event PartRefurbished(uint256 indexed tokenId, uint256 timestamp);
    event PartRecalled(uint256 indexed tokenId, uint256 timestamp);
    event SupplyRequestCreated(uint256 indexed requestId, address indexed retailer, bytes32 productHash, uint256 quantity);
    event SupplyRequestFulfilled(uint256 indexed requestId, uint256[] tokenIds);

    constructor() ERC721("Auto_Part", "APT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ========== MANUFACTURER MANAGEMENT ==========

    function joinAsManufacturer(address _newManufacturer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_newManufacturer == address(0))          revert InvalidManufacturer();
        if (manufacturers.length >= 10)              revert ManufacturerRegistryFull();
        if (hasRole(MANUFACTURER_ROLE, _newManufacturer)) revert AlreadyManufacturer();
        
        _grantRole(MANUFACTURER_ROLE, _newManufacturer);
        manufacturers.push(_newManufacturer);
    }

    function getAllManufacturers() external view returns (address[] memory) {
        return manufacturers;
    }

    // ========== SUPPLY REQUEST ==========

    function createSupplyRequest(bytes32 _productHash, uint256 _quantity)
        external onlyRole(RETAILER_ROLE)
    {
        if (_quantity == 0 || _quantity > 100) revert QuantityOutOfRange();
        if (_productHash == bytes32(0))         revert InvalidProductHash();

        uint256 requestId = _nextRequestId++;
        supplyRequests[requestId] = SupplyRequest({
            requester:   msg.sender,
            productHash: _productHash,
            quantity:    _quantity,
            requestTime: block.timestamp,
            fulfilled:   false
        });
        emit SupplyRequestCreated(requestId, msg.sender, _productHash, _quantity);
    }

    function fulfillSupplyRequest(
        uint256 requestId,
        string[] calldata uris,
        bytes32[] calldata metadataHashes
    ) external onlyRole(MANUFACTURER_ROLE) returns (uint256[] memory) {
        SupplyRequest storage req = supplyRequests[requestId];
        if (req.fulfilled)              revert RequestAlreadyFulfilled();
        if (req.requester == address(0)) revert RequestDoesNotExist();
        if (uris.length != req.quantity || metadataHashes.length != req.quantity)
            revert ArrayLengthMismatch();

        uint256[] memory tokenIds = new uint256[](req.quantity);
        for (uint256 i = 0; i < req.quantity; i++) {
            tokenIds[i] = _mintToRetailer(req.requester, uris[i], metadataHashes[i]);
        }
        req.fulfilled = true;
        emit SupplyRequestFulfilled(requestId, tokenIds);
        return tokenIds;
    }

    // ========== MINTING ==========

    function _mintToRetailer(address retailerAddr, string memory uri, bytes32 metadataHash)
        internal returns (uint256)
    {
        uint256 tokenId = _nextTokenId++;
        _safeMint(retailerAddr, tokenId);
        _setTokenURI(tokenId, uri);

        parts[tokenId] = PartDetails({
            status:       PartStatus.NEW,
            metadataHash: metadataHash,
            mintedAt:     block.timestamp,
            minter:       msg.sender
        });
        nftCustodian[tokenId]  = retailerAddr;
        saleStatus[tokenId]    = SaleStatus.UNSOLD;
        _setTokenRoyalty(tokenId, retailerAddr, RETAILER_ROYALTY_BPS);

        emit PartMinted(tokenId, retailerAddr, metadataHash, block.timestamp);
        emit SupplyChainTransfer(tokenId, address(0), retailerAddr, "Manufacturer", "Retailer", block.timestamp);
        return tokenId;
    }

    function mintPartToRetailer(address retailerAddr, string calldata uri, bytes32 metadataHash)
        public onlyRole(MANUFACTURER_ROLE) returns (uint256)
    {
        if (retailerAddr == address(0)) revert InvalidRetailerAddress();
        return _mintToRetailer(retailerAddr, uri, metadataHash);
    }

    function batchMintToRetailers(
        address[] calldata retailersList,
        string[]  calldata uris,
        bytes32[] calldata metadataHashes
    ) external onlyRole(MANUFACTURER_ROLE) {
        if (retailersList.length != uris.length || uris.length != metadataHashes.length)
            revert ArrayLengthMismatch();
        for (uint256 i = 0; i < retailersList.length; i++) {
            mintPartToRetailer(retailersList[i], uris[i], metadataHashes[i]);
        }
    }

    // ========== SELL TO CUSTOMER ==========

    function soldToCustomer(
        uint256 tokenId,
        string calldata customerPhoneNumber,
        string calldata trackingNumber
    ) external {
        if (ownerOf(tokenId) != msg.sender)               revert NotOwner();
        if (!hasRole(RETAILER_ROLE, msg.sender))           revert OnlyRetailer();
        if (bytes(customerPhoneNumber).length == 0)        revert PhoneRequired();
        if (saleStatus[tokenId] != SaleStatus.UNSOLD)     revert AlreadySold();

        PartStatus st = parts[tokenId].status;
        if (st != PartStatus.NEW && st != PartStatus.REPAIRED && st != PartStatus.REFURBISHED)
            revert CannotSellInCurrentState();

        partOwner[tokenId]    = customerPhoneNumber;
        nftCustodian[tokenId] = msg.sender;
        saleStatus[tokenId]   = SaleStatus.SOLD;

        emit PartSoldToCustomer(tokenId, customerPhoneNumber, msg.sender, block.timestamp);
        if (bytes(trackingNumber).length > 0) {
            emit PartShipped(tokenId, customerPhoneNumber, trackingNumber, block.timestamp);
        }
    }

    // ========== DEFECT & REPAIR FLOW ==========

    function reportDefectiveReturn(uint256 tokenId) external onlyRole(RETAILER_ROLE) {
        if (ownerOf(tokenId) != msg.sender)               revert OnlyCurrentCustodian();
        if (saleStatus[tokenId] != SaleStatus.SOLD)       revert PartNotSold();

        PartStatus st = parts[tokenId].status;
        if (st != PartStatus.NEW && st != PartStatus.REPAIRED && st != PartStatus.REFURBISHED)
            revert AlreadyReturnedOrRecalled();

        address originalMinter = parts[tokenId].minter;
        parts[tokenId].status  = PartStatus.DEFECTIVE_RETURNED;
        
        // Bypassing overriden transfer blocks via OpenZeppelin's internal _update mechanism safely
        _update(originalMinter, tokenId, msg.sender);
        
        nftCustodian[tokenId]  = originalMinter;
        delete partOwner[tokenId];
        saleStatus[tokenId]    = SaleStatus.RETURNED;
        _resetTokenRoyalty(tokenId);

        emit DefectiveReturned(tokenId, msg.sender, block.timestamp);
        emit SupplyChainTransfer(tokenId, msg.sender, originalMinter, "Retailer", "Manufacturer", block.timestamp);
    }

    function repairPart(uint256 tokenId) external onlyRole(MANUFACTURER_ROLE) {
        if (ownerOf(tokenId) != msg.sender)                                revert OnlyManufacturer();
        if (parts[tokenId].status != PartStatus.DEFECTIVE_RETURNED)       revert NotInDefectiveState();
        parts[tokenId].status = PartStatus.REPAIRED;
        saleStatus[tokenId]   = SaleStatus.UNSOLD;
        emit PartRepaired(tokenId, block.timestamp);
    }

    function refurbishPart(uint256 tokenId) external onlyRole(MANUFACTURER_ROLE) {
        if (ownerOf(tokenId) != msg.sender)                                revert OnlyManufacturer();
        if (parts[tokenId].status != PartStatus.DEFECTIVE_RETURNED)       revert NotInDefectiveState();
        parts[tokenId].status = PartStatus.REFURBISHED;
        saleStatus[tokenId]   = SaleStatus.UNSOLD;
        emit PartRefurbished(tokenId, block.timestamp);
    }

    // ========== SUPPLY CHAIN TRANSFER ==========

    function transferToRetailer(address to, uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender)           revert NotOwner();
        if (!hasRole(MANUFACTURER_ROLE, msg.sender))  revert OnlyManufacturer();
        if (!hasRole(RETAILER_ROLE, to))               revert RecipientNotRetailer();
        if (saleStatus[tokenId] != SaleStatus.UNSOLD) revert AlreadySold();

        PartStatus st = parts[tokenId].status;
        if (st != PartStatus.NEW && st != PartStatus.REPAIRED && st != PartStatus.REFURBISHED)
            revert PartNotTransferable();

        _update(to, tokenId, msg.sender);
        nftCustodian[tokenId] = to;
        _setTokenRoyalty(tokenId, to, RETAILER_ROYALTY_BPS);

        emit SupplyChainTransfer(tokenId, msg.sender, to, "Manufacturer", "Retailer", block.timestamp);
    }

    // ========== RECALL ==========

    function recallPart(uint256 tokenId) external onlyRole(MANUFACTURER_ROLE) {
        if (parts[tokenId].status == PartStatus.RECALLED) revert AlreadyRecalled();
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

    // ========== BLOCK ALL STANDARD EXTERNAL TRANSFERS ==========

    function transferFrom(address, address, uint256)
        public pure override(ERC721, IERC721)
    { revert TransferBlocked(); }

    function safeTransferFrom(address, address, uint256)
        public pure override(ERC721, IERC721)
    { revert TransferBlocked(); }

    function safeTransferFrom(address, address, uint256, bytes memory)
        public pure override(ERC721, IERC721)
    { revert TransferBlocked(); }

    // ========== RETAILER MANAGEMENT ==========

    function addRetailer(address retailerAddr, string memory _name, string memory _location)
        external onlyRole(MANUFACTURER_ROLE)
    {
        if (!hasRole(RETAILER_ROLE, retailerAddr)) {
            _grantRole(RETAILER_ROLE, retailerAddr);
            retailers.push(retailerAddr);
        }
        retailerDetails[retailerAddr] = RetailerDetails({ name: _name, location: _location, isActive: true });
    }

    function removeRetailer(address retailerAddr) external onlyRole(MANUFACTURER_ROLE) {
        _revokeRole(RETAILER_ROLE, retailerAddr);
        retailerDetails[retailerAddr].isActive = false;
    }

    function getAllRetailers() external view returns (
        address[] memory addresses,
        string[]  memory names,
        string[]  memory locations,
        bool[]    memory activeStatus
    ) {
        uint256 count = retailers.length;
        addresses    = new address[](count);
        names        = new string[](count);
        locations    = new string[](count);
        activeStatus = new bool[](count);

        for (uint256 i = 0; i < count; i++) {
            address r    = retailers[i];
            addresses[i]    = r;
            names[i]        = retailerDetails[r].name;
            locations[i]    = retailerDetails[r].location;
            activeStatus[i] = retailerDetails[r].isActive;
        }
    }

    // ========== ROYALTY MANAGEMENT ==========

    function setDefaultRoyalty(address receiver, uint96 feeBasisPoints)
        external onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _setDefaultRoyalty(receiver, feeBasisPoints);
    }

    // ========== QUERY / VERIFICATION ==========

    function getCustomerPhoneNumber(uint256 tokenId) external view returns (string memory) {
        return partOwner[tokenId];
    }

    function getNFTCustodian(uint256 tokenId) external view returns (address) {
        return nftCustodian[tokenId];
    }

    function getSaleStatus(uint256 tokenId) external view returns (SaleStatus) {
        return saleStatus[tokenId];
    }

    function verifyPartAuthenticity(uint256 tokenId) external view returns (
        bool    isAuthentic,
        PartStatus status,
        bytes32 metadataHash,
        address currentCustodian,
        uint256 mintedAt
    ) {
        PartDetails memory p = parts[tokenId];
        if (p.mintedAt == 0) revert PartDoesNotExist();
        return (
            p.status != PartStatus.RECALLED,
            p.status,
            p.metadataHash,
            nftCustodian[tokenId],
            p.mintedAt
        );
    }

    // ========== INTERFACE SUPPORT ==========

    function supportsInterface(bytes4 interfaceId)
        public view virtual
        override(ERC721URIStorage, AccessControl, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}