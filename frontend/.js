// frontend/
// ├── app/
// │   ├── layout.jsx              # Root layout
// │   ├── page.jsx                # Home page
// │   ├── manufacturer/
// │   │   └── page.jsx
// │   ├── retailer/
// │   │   └── page.jsx
// │   ├── parts/
// │   │   └── page.jsx
// │   └── customer/
// │       └── page.jsx
// ├── components/
// │   ├── common/
// │   │   ├── Navbar.jsx
// │   │   ├── ConnectButton.jsx
// │   │   └── TransactionToast.jsx
// │   ├── modals/
// │   │   ├── JoinManufacturerModal.jsx
// │   │   ├── AddRetailerModal.jsx
// │   │   ├── CreateSupplyRequestModal.jsx
// │   │   ├── FulfillSupplyModal.jsx
// │   │   ├── ShipPartModal.jsx
// │   │   ├── ConfirmDeliveryModal.jsx
// │   │   ├── ReportDefectiveModal.jsx
// │   │   ├── RepairPartModal.jsx
// │   │   ├── RefurbishPartModal.jsx
// │   │   ├── RecallPartModal.jsx
// │   │   └── TransferPartModal.jsx
// │   ├── manufacturer/
// │   │   ├── ManufacturerDashboard.jsx
// │   │   ├── ManufacturerList.jsx
// │   │   └── PendingRequests.jsx
// │   ├── retailer/
// │   │   ├── RetailerDashboard.jsx
// │   │   ├── InventoryTable.jsx
// │   │   └── RequestSupplyForm.jsx
// │   ├── parts/
// │   │   ├── PartsInventory.jsx
// │   │   └── PartStatusBadge.jsx
// │   └── customer/
// │       └── CustomerLookup.jsx
// ├── lib/
// │   ├── contract/
// │   │   ├── abis/
// │   │   │   └── AutoPartNFT_Pro_V3.json    # Copy from Hardhat
// │   │   ├── constants.js                    # Contract address
// │   │   └── getContract.js
// │   ├── context/
// │   │   ├── AppContext.jsx                  # Global state
// │   │   └── AppProvider.jsx
// │   ├── hooks/
// │   │   ├── useApp.js                       # useContext hook
// │   │   ├── useContract.js
// │   │   ├── useManufacturer.js
// │   │   ├── useRetailer.js
// │   │   ├── useParts.js
// │   │   └── useCustomer.js
// │   └── utils/
// │       ├── errors.js
// │       └── formatters.js
// ├── public/
// │   └── ...
// ├── .env.local
// ├── tailwind.config.js
// ├── next.config.js
// ├── package.json
// └── README.md