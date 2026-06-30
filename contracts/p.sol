// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract AutoPartNFT_Pro_V2 is
    ERC721URIStorage,
    AccessControlEnumerable,
    ERC2981
{
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");
    uint96 public constant RETAILER_ROYALTY_BPS = 500; // 5%

    address[10] public manufacturers; 
    uint256 public manufacturerCount; 

    error InvalidManufacturer();
    error QuantityExceedsOrLess(uint256 quantity);
    error InvalidProductHash();
    error RequestAlreadyFulfilled();
    error RequestDoesNotExist();
    error ArrayLengthMismatch();

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
        address minter;
    }

    struct SupplyRequest {
        address requester;
        bytes32 productHash;
        uint256 quantity;
        uint256 requestTime;
        bool fulfilled;
    }

    struct RetailerDetails {
        string name;
        string location;
        bool isActive;
    }

    enum SaleStatus {
        UNSOLD,
        IN_TRANSIT,
        SOLD,
        RETURNED
    }

    mapping(uint256 => SupplyRequest) public supplyRequests;
    mapping(uint256 => SaleStatus) public saleStatus;

    uint256 private _nextRequestId;

    mapping(uint256 => string) public partOwner;
    mapping(uint256 => address) public nftCustodian;
    mapping(uint256 => PartDetails) public parts;
    mapping(address => RetailerDetails) public retailerDetails;

    uint256 private _nextTokenId;

    // Events
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

    constructor() ERC721("Auto_Part", "APT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
         
    }

function joinAsManufacturer(address _newManufacturer) external {
    require(_newManufacturer != address(0), "Invalid address");
    require(manufacturerCount < 10, "Registry full");
    require(!hasRole(MANUFACTURER_ROLE,_newManufacturer), "Already a manufacturer");

    manufacturers[manufacturerCount] = _newManufacturer;
    manufacturerCount++;

    _grantRole(MANUFACTURER_ROLE, _newManufacturer);
}

    function createSupplyRequest(
        bytes32 _productHash,
        uint256 _quantity
    ) external onlyRole(RETAILER_ROLE) {
        if (_quantity == 0 || _quantity > 100)
            revert QuantityExceedsOrLess(_quantity);
        if (_productHash == bytes32(0)) revert InvalidProductHash();

        uint256 requestId = _nextRequestId++;
        supplyRequests[requestId] = SupplyRequest({
            requester: msg.sender,
            productHash: _productHash,
            quantity: _quantity,
            requestTime: block.timestamp,
            fulfilled: false
        });
        emit SupplyRequestCreated(
            requestId,
            msg.sender,
            _productHash,
            _quantity
        );
    }

    function fulfillSupplyRequest(
        uint256 requestId,
        string[] calldata uris,
        bytes32[] calldata metadataHashes
    ) external onlyRole(MANUFACTURER_ROLE) returns (uint256[] memory) {
        SupplyRequest storage req = supplyRequests[requestId];
        if (req.fulfilled) revert RequestAlreadyFulfilled();
        if (req.requester == address(0)) revert RequestDoesNotExist();
        if (
            uris.length != req.quantity || metadataHashes.length != req.quantity
        ) revert ArrayLengthMismatch();

        uint256[] memory tokenIds = new uint256[](req.quantity);
        for (uint256 i = 0; i < req.quantity; i++) {
            tokenIds[i] = _mintToRetailer(
                req.requester,
                uris[i],
                metadataHashes[i]
            );
        }
        req.fulfilled = true;

        emit SupplyRequestFulfilled(requestId, tokenIds);
        return tokenIds;
    }

    function _mintToRetailer(
        address retailer,
        string memory uri,
        bytes32 metadataHash
    ) internal returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(retailer, tokenId);
        _setTokenURI(tokenId, uri);

        parts[tokenId] = PartDetails({
            status: PartStatus.NEW,
            metadataHash: metadataHash,
            mintedAt: block.timestamp,
            minter: msg.sender
        });
        nftCustodian[tokenId] = retailer;
        saleStatus[tokenId] = SaleStatus.UNSOLD;
        _setTokenRoyalty(tokenId, retailer, RETAILER_ROYALTY_BPS);

        emit PartMinted(tokenId, retailer, metadataHash, block.timestamp);
        emit SupplyChainTransfer(
            tokenId,
            address(0),
            retailer,
            "Manufacturer",
            "Retailer",
            block.timestamp
        );
        return tokenId;
    }

    function mintPartToRetailer(
        address retailer,
        string calldata uri,
        bytes32 metadataHash
    ) public onlyRole(MANUFACTURER_ROLE) returns (uint256) {
        require(retailer != address(0), "Invalid retailer address");
        return _mintToRetailer(retailer, uri, metadataHash);
    }

    function batchMintToRetailers(
        address[] calldata retailers,
        string[] calldata uris,
        bytes32[] calldata metadataHashes
    ) external onlyRole(MANUFACTURER_ROLE) {
        if (
            retailers.length != uris.length ||
            metadataHashes.length != uris.length
        ) revert ArrayLengthMismatch();
        for (uint256 i = 0; i < retailers.length; i++) {
            mintPartToRetailer(retailers[i], uris[i], metadataHashes[i]);
        }
    }

    function soldToCustomer(
        uint256 tokenId,
        string calldata customerPhoneNumber,
        string calldata trackingNumber
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(hasRole(RETAILER_ROLE, msg.sender), "Only retailer can sell");
        require(bytes(customerPhoneNumber).length > 0, "Phone number required");
        require(saleStatus[tokenId] == SaleStatus.UNSOLD, "part already sold");

        PartStatus status = parts[tokenId].status;
        require(
            status == PartStatus.NEW ||
                status == PartStatus.REPAIRED ||
                status == PartStatus.REFURBISHED,
            "Part cannot be sold in current state"
        );

        partOwner[tokenId] = customerPhoneNumber;
        nftCustodian[tokenId] = msg.sender;
        saleStatus[tokenId] = SaleStatus.SOLD;

        emit PartSoldToCustomer(
            tokenId,
            customerPhoneNumber,
            msg.sender,
            block.timestamp
        );
        if (bytes(trackingNumber).length > 0) {
            emit PartShipped(
                tokenId,
                customerPhoneNumber,
                trackingNumber,
                block.timestamp
            );
        }
    }

function reportDefectiveReturn(
    uint256 tokenId
) external onlyRole(RETAILER_ROLE) {
    require(ownerOf(tokenId) == msg.sender, "Only current custodian");
    require(bytes(partOwner[tokenId]).length > 0, "Part not sold");

    PartStatus status = parts[tokenId].status;
    require(
        status == PartStatus.NEW ||
            status == PartStatus.REPAIRED ||
            status == PartStatus.REFURBISHED,
        "Part already returned or recalled"
    );

    address originalMinter = parts[tokenId].minter;

    parts[tokenId].status = PartStatus.DEFECTIVE_RETURNED;

    _transfer(msg.sender, originalMinter, tokenId);

    nftCustodian[tokenId] = originalMinter;
    delete partOwner[tokenId];
    saleStatus[tokenId] = SaleStatus.RETURNED;
    _resetTokenRoyalty(tokenId);

    emit DefectiveReturned(tokenId, msg.sender, block.timestamp);
    emit SupplyChainTransfer(
        tokenId,
        msg.sender,
        originalMinter,
        "Retailer",
        "Manufacturer",
        block.timestamp
    );
}

    function repairPart(uint256 tokenId) external onlyRole(MANUFACTURER_ROLE) {
        require(
            ownerOf(tokenId) == msg.sender,
            "Manufacturer doesn't own the part"
        );
        require(
            parts[tokenId].status == PartStatus.DEFECTIVE_RETURNED,
            "Part not in defective state"
        );
        parts[tokenId].status = PartStatus.REPAIRED;
        emit PartRepaired(tokenId, block.timestamp);
    }

    function refurbishPart(
        uint256 tokenId
    ) external onlyRole(MANUFACTURER_ROLE) {
        require(
            ownerOf(tokenId) == msg.sender,
            "Manufacturer doesn't own the part"
        );
        require(
            parts[tokenId].status == PartStatus.DEFECTIVE_RETURNED,
            "Part not in defective state"
        );
        parts[tokenId].status = PartStatus.REFURBISHED;
        emit PartRefurbished(tokenId, block.timestamp);
    }

    function transferToRetailer(address to, uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(hasRole(MANUFACTURER_ROLE, msg.sender), "Only manufacturer");
        require(
            hasRole(RETAILER_ROLE, to),
            "Recipient must be a registered retailer"
        );
        require(saleStatus[tokenId] == SaleStatus.UNSOLD, "part already sold");

        PartStatus status = parts[tokenId].status;
        require(
            status == PartStatus.NEW ||
                status == PartStatus.REPAIRED ||
                status == PartStatus.REFURBISHED,
            "Part not in transferable state"
        );

        _transfer(msg.sender, to, tokenId);
        nftCustodian[tokenId] = to;

        _setTokenRoyalty(tokenId, to, RETAILER_ROYALTY_BPS);

        emit SupplyChainTransfer(
            tokenId,
            msg.sender,
            to,
            "Manufacturer",
            "Retailer",
            block.timestamp
        );
    }

    function recallPart(uint256 tokenId) external onlyRole(MANUFACTURER_ROLE) {
        require(
            parts[tokenId].status != PartStatus.RECALLED,
            "Already recalled"
        );
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

    function transferFrom(
        address,
        address,
        uint256
    ) public pure override(ERC721, IERC721) {
        revert(
            "Use soldToCustomer, transferToRetailer, or reportDefectiveReturn"
        );
    }

    function safeTransferFrom(
        address,
        address,
        uint256,
        bytes memory
    ) public pure override(ERC721, IERC721) {
        revert(
            "Use soldToCustomer, transferToRetailer, or reportDefectiveReturn"
        );
    }

    function addRetailer(
        address retailer,
        string memory _name,
        string memory _location
    ) external onlyRole(MANUFACTURER_ROLE) {
        grantRole(RETAILER_ROLE, retailer);

        retailerDetails[retailer] = RetailerDetails({
            name: _name,
            location: _location,
            isActive: true
        });
    }

    function removeRetailer(
        address retailer
    ) external onlyRole(MANUFACTURER_ROLE) {
        revokeRole(RETAILER_ROLE, retailer);
          retailerDetails[retailer].isActive = false;
    }

    function getAllRetailers() 
    external 
    view 
    returns (
        address[] memory addresses,
        string[] memory names,
        string[] memory locations,
        bool[] memory activeStatus
    ) 
{
    uint256 count = getRoleMemberCount(RETAILER_ROLE);
    addresses = new address[](count);
    names = new string[](count);
    locations = new string[](count);
    activeStatus = new bool[](count);

    for (uint256 i = 0; i < count; i++) {
        address retailer = getRoleMember(RETAILER_ROLE, i);
        addresses[i] = retailer;
        names[i] = retailerDetails[retailer].name;
        locations[i] = retailerDetails[retailer].location;
        activeStatus[i] = retailerDetails[retailer].isActive;
    }
    return (addresses, names, locations, activeStatus);
}

    function setDefaultRoyalty(
        address receiver,
        uint96 feeBasisPoints
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setDefaultRoyalty(receiver, feeBasisPoints);
    }

    function getCustomerPhoneNumber(
        uint256 tokenId
    ) external view returns (string memory) {
        return partOwner[tokenId];
    }

    function getNFTCustodian(uint256 tokenId) external view returns (address) {
        return nftCustodian[tokenId];
    }

    function getSaleStatus(uint256 tokenId) external view returns (SaleStatus) {
        return saleStatus[tokenId];
    }

    function verifyPartAuthenticity(
        uint256 tokenId
    )
        external
        view
        returns (
            bool isAuthentic,
            PartStatus status,
            bytes32 metadataHash,
            address currentCustodian,
            uint256 mintedAt
        )
    {
        require(_ownerOf(tokenId) != address(0), "Part does not exist");
        PartDetails memory part = parts[tokenId];
        return (
            part.status != PartStatus.RECALLED,
            part.status,
            part.metadataHash,
            nftCustodian[tokenId],
            part.mintedAt
        );
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC721URIStorage, AccessControlEnumerable, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
