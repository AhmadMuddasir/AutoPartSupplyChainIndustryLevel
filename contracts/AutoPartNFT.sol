// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
 

contract AutoPartNFT_Pro_V2 is ERC721URIStorage, AccessControl {
  
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant RETAILER_ROLE    = keccak256("RETAILER_ROLE");

    // The manufacturer's address (set once, cannot be changed)
    address public immutable manufacturer;

    // --- Part Lifecycle Status ---
    enum PartStatus {
        NEW,                  // freshly minted, never defective
        RECALLED,             // manufacturer-flagged recall (all transfers blocked)
        DEFECTIVE_RETURNED,   // returned to manufacturer, waiting for repair
        REPAIRED,             // manufacturer repaired, ready for sale
        REFURBISHED           // manufacturer refurbished (higher standard than simple repair)
    }

    struct PartDetails {
        PartStatus status;
        bytes32 metadataHash;   // tamper-proof metadata fingerprint
        uint256 mintedAt;
    }

    mapping(uint256 => PartDetails) public parts;
    uint256 private _nextTokenId;

    // --- Events ---
    event PartMinted(uint256 indexed tokenId, address indexed to, bytes32 metadataHash, uint256 timestamp);
    event SupplyChainTransfer(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        string fromRole,
        string toRole,
        uint256 timestamp
    );
    event DefectiveReturned(uint256 indexed tokenId, address indexed retailer, uint256 timestamp);
    event PartRepaired(uint256 indexed tokenId, uint256 timestamp);
    event PartRefurbished(uint256 indexed tokenId, uint256 timestamp);
    event PartRecalled(uint256 indexed tokenId, uint256 timestamp);

    // -----------------------------------------------------------
    constructor(address _manufacturer) ERC721("AutoPart Pro V2", "APART2") {
        require(_manufacturer != address(0), "Invalid manufacturer");
        manufacturer = _manufacturer;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANUFACTURER_ROLE, _manufacturer);
        // admin can add retailers later
    }

    // -----------------------------------------------------------
    // Minting (Manufacturer only)
    // -----------------------------------------------------------
    function mintPartToRetailer(
        address retailer,
        string calldata uri,
        bytes32 metadataHash
    ) public onlyRole(MANUFACTURER_ROLE) returns (uint256) {
        require(retailer != address(0), "Invalid retailer");
        uint256 tokenId = _nextTokenId++;
        _safeMint(retailer, tokenId);
        _setTokenURI(tokenId, uri);

        parts[tokenId] = PartDetails({
            status: PartStatus.NEW,
            metadataHash: metadataHash,
            mintedAt: block.timestamp
        });

        emit PartMinted(tokenId, retailer, metadataHash, block.timestamp);
        emit SupplyChainTransfer(tokenId, address(0), retailer, "Manufacturer", "Retailer", block.timestamp);
        return tokenId;
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

    // -----------------------------------------------------------
    // Supply Chain Transfers
    // -----------------------------------------------------------

    /**
     * @notice Retailer transfers a part to a customer.
     *         Allowed only when status is NEW, REPAIRED, or REFURBISHED.
     */
    function transferToCustomer(address to, uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(hasRole(RETAILER_ROLE, msg.sender), "Only retailer can transfer to customer");
        require(to != address(0), "Invalid customer");
        PartStatus status = parts[tokenId].status;
        require(
            status == PartStatus.NEW || status == PartStatus.REPAIRED || status == PartStatus.REFURBISHED,
            "Part cannot be sold in current state"
        );

        _transfer(msg.sender, to, tokenId);
        emit SupplyChainTransfer(tokenId, msg.sender, to, "Retailer", "Customer", block.timestamp);
    }

    /**
     * @notice Manufacturer transfers a part to a retailer.
     *         Allowed for NEW parts (if minted to themselves) or after repair/refurbish.
     */
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
        emit SupplyChainTransfer(tokenId, msg.sender, to, "Manufacturer", "Retailer", block.timestamp);
    }

    /**
     * @notice Generic transfer functions are disabled to enforce the correct supply chain logic.
     */
    function transferFrom(address, address, uint256) public pure override(IERC721,ERC721) {
        revert("Use transferToCustomer or transferToRetailer");
    }
    function safeTransferFrom(address, address, uint256, bytes memory) public pure override(IERC721,ERC721) {
        revert("Use transferToCustomer or transferToRetailer");
    }

    // Allow secondary market trades between customers (no role check)
    function customerTransfer(address to, uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(!hasRole(MANUFACTURER_ROLE, msg.sender) && !hasRole(RETAILER_ROLE, msg.sender), "Customers only");
        PartStatus status = parts[tokenId].status;
        require(
            status == PartStatus.NEW || status == PartStatus.REPAIRED || status == PartStatus.REFURBISHED,
            "Cannot transfer recalled or defective part"
        );
        _transfer(msg.sender, to, tokenId);
        // no SupplyChainTransfer event needed for secondary market
    }

    // -----------------------------------------------------------
    // Defect & Return Flow
    // -----------------------------------------------------------

    /**
     * @notice Retailer returns a defective part to the manufacturer.
     *         The NFT is immediately transferred to the manufacturer and status is set to DEFECTIVE_RETURNED.
     */
    function reportDefectiveAndReturn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(hasRole(RETAILER_ROLE, msg.sender), "Only retailer can return defective part");
        PartStatus status = parts[tokenId].status;
        require(
            status == PartStatus.NEW || status == PartStatus.REPAIRED || status == PartStatus.REFURBISHED,
            "Part already returned or recalled"
        );

        parts[tokenId].status = PartStatus.DEFECTIVE_RETURNED;
        _transfer(msg.sender, manufacturer, tokenId);

        emit DefectiveReturned(tokenId, msg.sender, block.timestamp);
        emit SupplyChainTransfer(tokenId, msg.sender, manufacturer, "Retailer", "Manufacturer", block.timestamp);
    }

    /**
     * @notice Manufacturer marks a returned part as repaired.
     */
    function repairPart(uint256 tokenId) external onlyRole(MANUFACTURER_ROLE) {
        require(ownerOf(tokenId) == msg.sender, "Manufacturer doesn't own the part");
        require(parts[tokenId].status == PartStatus.DEFECTIVE_RETURNED, "Part not in defective state");
        parts[tokenId].status = PartStatus.REPAIRED;
        emit PartRepaired(tokenId, block.timestamp);
    }

    /**
     * @notice Manufacturer marks a returned part as refurbished (higher standard).
     */
    function refurbishPart(uint256 tokenId) external onlyRole(MANUFACTURER_ROLE) {
        require(ownerOf(tokenId) == msg.sender, "Manufacturer doesn't own the part");
        require(parts[tokenId].status == PartStatus.DEFECTIVE_RETURNED, "Part not in defective state");
        parts[tokenId].status = PartStatus.REFURBISHED;
        emit PartRefurbished(tokenId, block.timestamp);
    }

    // -----------------------------------------------------------
    // Recall (unchanged, but status is now PartStatus.RECALLED)
    // -----------------------------------------------------------
    function recallPart(uint256 tokenId) external onlyRole(MANUFACTURER_ROLE) {
        require(parts[tokenId].status != PartStatus.RECALLED, "Already recalled");
        parts[tokenId].status = PartStatus.RECALLED;
        emit PartRecalled(tokenId, block.timestamp);
    }

    function isRecalled(uint256 tokenId) external view returns (bool) {
        return parts[tokenId].status == PartStatus.RECALLED;
    }

    // -----------------------------------------------------------
    // Role Management
    // -----------------------------------------------------------
    function addRetailer(address retailer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(RETAILER_ROLE, retailer);
    }
    function removeRetailer(address retailer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(RETAILER_ROLE, retailer);
    }

    // Required by Solidity
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}