// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract AutoPartNFT_Pro_V3 is
    ERC721URIStorage,
    AccessControlEnumerable,
    ERC2981
{
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");
    uint96 public constant RETAILER_ROYALTY_BPS = 500; // 5%

    
    address[] public manufacturers;
    uint256 public constant  maxManufacturerCount = 10;

   
    error InvalidManufacturer();
    error ManufacturerRegistryIsFull();
    error youAreAlreadyaManufacturer();
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
    error AlreadyShipped();
    error NotInTransit();
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
        IN_TRANSIT, 
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

    struct ManufacturerDetails{
        string Manufacturername;
        string location;

    }

    struct RetailerDetails {
        string name;
        string location;
        bool   isActive;
    }

    mapping(uint256 => PartDetails)     public parts;
    mapping(uint256 => SaleStatus)    public saleStatus;
    mapping(uint256 => string)    public partOwner;
    mapping(uint256 => address)     public nftCustodian;
    mapping(uint256 => SupplyRequest) public supplyRequests;
    mapping(address => RetailerDetails) public retailerDetails;
    mapping(address => ManufacturerDetails) public manufacturerDetails;


    uint256 private _nextTokenId;
    uint256 private _nextRequestId;

    event PartMinted(uint256 indexed tokenId, address indexed to, bytes32 metadataHash, uint256 timestamp);
    event SupplyChainTransfer(uint256 indexed tokenId, address indexed from, address indexed to, string fromRole, string toRole, uint256 timestamp);
    event PartShipped(uint256 indexed tokenId, string phoneNumber, string trackingNumber, uint256 timestamp);
    event DeliveryConfirmed(uint256 indexed tokenId, uint256 timestamp);
    event PartSoldToCustomer(uint256 indexed tokenId, string phoneNumber, address indexed retailer, uint256 timestamp);
    event DefectiveReturned(uint256 indexed tokenId, address indexed retailer, uint256 timestamp);
    event PartRepaired(uint256 indexed tokenId, uint256 timestamp);
    event PartRefurbished(uint256 indexed tokenId, uint256 timestamp);
    event PartRecalled(uint256 indexed tokenId, uint256 timestamp);
    event SupplyRequestCreated(uint256 indexed requestId, address indexed retailer, bytes32 productHash, uint256 quantity);
    event SupplyRequestFulfilled(uint256 indexed requestId, uint256[] tokenIds);

    constructor() ERC721("Auto_Part", "APT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function joinAsManufacturer(string memory _name,string memory _location) external {
        if (manufacturers.length >= maxManufacturerCount) revert ManufacturerRegistryIsFull();
        if (hasRole(MANUFACTURER_ROLE, msg.sender)) revert youAreAlreadyaManufacturer();

        manufacturers.push(msg.sender);
        manufacturerDetails[msg.sender] = ManufacturerDetails({
            Manufacturername:_name,
            location:_location
        });

        _grantRole(MANUFACTURER_ROLE, msg.sender);
    }

function removeManufacturer(address manufacturer)
    external
    onlyRole(DEFAULT_ADMIN_ROLE)
{
    if (!hasRole(MANUFACTURER_ROLE, manufacturer))
        revert InvalidManufacturer();

    _revokeRole(MANUFACTURER_ROLE, manufacturer);

    delete manufacturerDetails[manufacturer];

    uint256 length = manufacturers.length;
    for (uint256 i = 0; i < length; i++) {
        if (manufacturers[i] == manufacturer) {
            manufacturers[i] = manufacturers[length - 1];
            manufacturers.pop();
            break;
        }
    }
}

    function getAllManufacturers() external view returns (
        address[] memory _addresses,
        string[] memory _name,
        string[] memory _location
        )
        
         {
        uint256 count = manufacturers.length;
        _addresses = new address[](count);
        _name = new string[](count);
        _location = new string[](count);

        for (uint256 i = 0; i < count; i++) {
            address addr = manufacturers[i];
            _addresses[i] = addr;

            _name[i] = manufacturerDetails[addr].Manufacturername;
            _location[i] = manufacturerDetails[addr].location;

        }
        return (_addresses,_name,_location);
    }

    


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


    function _mintToRetailer(address retailer, 
    string memory uri, bytes32 metadataHash)
        internal returns (uint256)
    {
        uint256 tokenId = _nextTokenId++;
        _safeMint(retailer, tokenId);
        _setTokenURI(tokenId, uri);

        parts[tokenId] = PartDetails({
            status:       PartStatus.NEW,
            metadataHash: metadataHash,
            mintedAt:     block.timestamp,
            minter:       msg.sender
        });
        nftCustodian[tokenId]  = retailer;
        saleStatus[tokenId]    = SaleStatus.UNSOLD;
        _setTokenRoyalty(tokenId, retailer, RETAILER_ROYALTY_BPS);

        emit PartMinted(tokenId, retailer, metadataHash, block.timestamp);
        emit SupplyChainTransfer(tokenId, address(0), retailer, "Manufacturer", "Retailer", block.timestamp);
        return tokenId;
    }

    function mintPartToRetailer(address retailer, string calldata uri, bytes32 metadataHash)
        public onlyRole(MANUFACTURER_ROLE) returns (uint256)
    {
        if (retailer == address(0)) revert InvalidRetailerAddress();
        if (!hasRole(RETAILER_ROLE, retailer)) revert RecipientNotRetailer();
        return _mintToRetailer(retailer, uri, metadataHash);
    }

    function batchMintToRetailers(
        address[] calldata retailers,
        string[]  calldata uris,
        bytes32[] calldata metadataHashes
    ) external onlyRole(MANUFACTURER_ROLE) {
        if (retailers.length != uris.length || uris.length != metadataHashes.length)
            revert ArrayLengthMismatch();
        for (uint256 i = 0; i < retailers.length; i++) {
            mintPartToRetailer(retailers[i], uris[i], metadataHashes[i]);
        }
    }


    function shipPart(
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
        saleStatus[tokenId]   = SaleStatus.IN_TRANSIT; // ✅ IN_TRANSIT is now used!

        emit PartShipped(tokenId, customerPhoneNumber, trackingNumber, block.timestamp);
    }


    function confirmDelivery(uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender)               revert NotOwner();
        if (!hasRole(RETAILER_ROLE, msg.sender))           revert OnlyRetailer();
        if (saleStatus[tokenId] != SaleStatus.IN_TRANSIT) revert NotInTransit();

        saleStatus[tokenId] = SaleStatus.SOLD;

        emit DeliveryConfirmed(tokenId, block.timestamp);
        emit PartSoldToCustomer(tokenId, partOwner[tokenId], msg.sender, block.timestamp);
    }


    function reportDefectiveReturn(uint256 tokenId) external onlyRole(RETAILER_ROLE) {
        if (ownerOf(tokenId) != msg.sender)               revert OnlyCurrentCustodian();
        if (saleStatus[tokenId] != SaleStatus.SOLD)       revert PartNotSold();

        PartStatus st = parts[tokenId].status;
        if (st != PartStatus.NEW && st != PartStatus.REPAIRED && st != PartStatus.REFURBISHED)
            revert AlreadyReturnedOrRecalled();

        address originalMinter = parts[tokenId].minter;
        parts[tokenId].status  = PartStatus.DEFECTIVE_RETURNED;
        _transfer(msg.sender, originalMinter, tokenId);
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
        saleStatus[tokenId]   = SaleStatus.UNSOLD; // ✅ RESET so it can be sold again!
        emit PartRepaired(tokenId, block.timestamp);
    }

    function refurbishPart(uint256 tokenId) external onlyRole(MANUFACTURER_ROLE) {
        if (ownerOf(tokenId) != msg.sender)                                revert OnlyManufacturer();
        if (parts[tokenId].status != PartStatus.DEFECTIVE_RETURNED)       revert NotInDefectiveState();
        
        parts[tokenId].status = PartStatus.REFURBISHED;
        saleStatus[tokenId]   = SaleStatus.UNSOLD; // ✅ RESET so it can be sold again!
        emit PartRefurbished(tokenId, block.timestamp);
    }


    function transferToRetailer(address to, uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender)           revert NotOwner();
        if (!hasRole(MANUFACTURER_ROLE, msg.sender))  revert OnlyManufacturer();
        if (!hasRole(RETAILER_ROLE, to))               revert RecipientNotRetailer();
        if (saleStatus[tokenId] != SaleStatus.UNSOLD) revert AlreadySold();

        PartStatus st = parts[tokenId].status;
        if (st != PartStatus.NEW && st != PartStatus.REPAIRED && st != PartStatus.REFURBISHED)
            revert PartNotTransferable();

        _transfer(msg.sender, to, tokenId);
        nftCustodian[tokenId] = to;
        _setTokenRoyalty(tokenId, to, RETAILER_ROYALTY_BPS);

        emit SupplyChainTransfer(tokenId, msg.sender, to, "Manufacturer", "Retailer", block.timestamp);
    }


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


    function transferFrom(address, address, uint256)
        public pure override(ERC721, IERC721)
    { revert TransferBlocked(); }

    function safeTransferFrom(address, address, uint256, bytes memory)
        public pure override(ERC721, IERC721)
    { revert TransferBlocked(); }


    function addRetailer(address retailer, string memory _name, string memory _location)
        external onlyRole(MANUFACTURER_ROLE)
    {
        _grantRole(RETAILER_ROLE, retailer);
        retailerDetails[retailer] = RetailerDetails({ name: _name, location: _location, isActive: true });
    }

    function removeRetailer(address retailer) external onlyRole(MANUFACTURER_ROLE) {
        _revokeRole(RETAILER_ROLE, retailer);
        retailerDetails[retailer].isActive = false;
    }

    function getAllRetailers() external view returns (
        address[] memory addresses,
        string[]  memory names,
        string[]  memory locations,
        bool[]    memory activeStatus
    ) {
        uint256 count = getRoleMemberCount(RETAILER_ROLE);
        addresses    = new address[](count);
        names        = new string[](count);
        locations    = new string[](count);
        activeStatus = new bool[](count);

        for (uint256 i = 0; i < count; i++) {
            address r    = getRoleMember(RETAILER_ROLE, i);
            addresses[i]    = r;
            names[i]        = retailerDetails[r].name;
            locations[i]    = retailerDetails[r].location;
            activeStatus[i] = retailerDetails[r].isActive;
        }
    }


    function setDefaultRoyalty(address receiver, uint96 feeBasisPoints)
        external onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _setDefaultRoyalty(receiver, feeBasisPoints);
    }


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
        if (_ownerOf(tokenId) == address(0)) revert PartDoesNotExist();
        PartDetails memory p = parts[tokenId];
        return (
            p.status != PartStatus.RECALLED,
            p.status,
            p.metadataHash,
            nftCustodian[tokenId],
            p.mintedAt
        );
    }


    function supportsInterface(bytes4 interfaceId)
        public view virtual
        override(ERC721URIStorage, AccessControlEnumerable, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}