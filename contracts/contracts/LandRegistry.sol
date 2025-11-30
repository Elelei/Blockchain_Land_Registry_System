// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LandRegistry
 * @dev Comprehensive blockchain-based land registry system
 */
contract LandRegistry is AccessControl, Pausable, ReentrancyGuard {
    // Role definitions
    bytes32 public constant SUPERADMIN_ROLE = keccak256("SUPERADMIN_ROLE");
    bytes32 public constant GOVERNMENT_ROLE = keccak256("GOVERNMENT_ROLE");
    bytes32 public constant PROPERTY_OWNER_ROLE = keccak256("PROPERTY_OWNER_ROLE");
    bytes32 public constant LEGAL_PROFESSIONAL_ROLE = keccak256("LEGAL_PROFESSIONAL_ROLE");

    // Counters (replacing Counters library with simple uint256)
    uint256 private _propertyIds = 0;
    uint256 private _transactionIds = 0;

    // Enums
    enum PropertyStatus {
        Pending,
        Approved,
        Rejected,
        ListedForSale,
        SaleInProgress,
        Sold
    }

    enum TransactionStatus {
        Pending,
        Approved,
        Rejected,
        Completed,
        Cancelled
    }

    // Structs
    struct Property {
        uint256 id;
        string state;
        string district;
        string village;
        string surveyNumber;
        address owner;
        uint256 marketValue;
        string propertyId; // Unique property ID
        string ipfsHash; // IPFS hash for documents
        PropertyStatus status;
        uint256 registeredAt;
        uint256 lastUpdated;
        bool isActive;
    }

    struct Transaction {
        uint256 id;
        uint256 propertyId;
        address seller;
        address buyer;
        uint256 price;
        TransactionStatus status;
        uint256 requestedAt;
        uint256 completedAt;
        string ipfsHash; // Transaction documents
    }

    // Mappings
    mapping(uint256 => Property) public properties;
    mapping(uint256 => Transaction) public transactions;
    mapping(address => uint256[]) public ownerProperties;
    mapping(uint256 => uint256[]) public propertyTransactions;
    mapping(address => bool) public registeredUsers;
    mapping(address => string) public userRoles; // For frontend display
    mapping(address => string[]) public superadminVillages; // Village assignments for superadmins

    // Events
    event PropertyRegistered(
        uint256 indexed propertyId,
        address indexed owner,
        string propertyIdStr,
        uint256 marketValue
    );
    event PropertyStatusChanged(
        uint256 indexed propertyId,
        PropertyStatus oldStatus,
        PropertyStatus newStatus
    );
    event PropertyListedForSale(
        uint256 indexed propertyId,
        address indexed seller,
        uint256 price
    );
    event PurchaseRequested(
        uint256 indexed transactionId,
        uint256 indexed propertyId,
        address indexed buyer,
        address seller,
        uint256 price
    );
    event PurchaseApproved(
        uint256 indexed transactionId,
        uint256 indexed propertyId,
        address indexed buyer
    );
    event PurchaseRejected(
        uint256 indexed transactionId,
        uint256 indexed propertyId,
        address indexed buyer
    );
    event OwnershipTransferred(
        uint256 indexed propertyId,
        address indexed oldOwner,
        address indexed newOwner,
        uint256 transactionId
    );
    event UserRegistered(address indexed user, string role);
    event DocumentsUpdated(uint256 indexed propertyId, string ipfsHash);

    // Modifiers
    modifier onlyPropertyOwner(uint256 _propertyId) {
        require(
            properties[_propertyId].owner == msg.sender,
            "Only property owner can perform this action"
        );
        _;
    }

    modifier validProperty(uint256 _propertyId) {
        require(
            properties[_propertyId].id != 0,
            "Property does not exist"
        );
        require(
            properties[_propertyId].isActive,
            "Property is not active"
        );
        _;
    }

    modifier validTransaction(uint256 _transactionId) {
        require(
            transactions[_transactionId].id != 0,
            "Transaction does not exist"
        );
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SUPERADMIN_ROLE, msg.sender);
        registeredUsers[msg.sender] = true;
        userRoles[msg.sender] = "Superadmin";
        emit UserRegistered(msg.sender, "Superadmin");
    }

    /**
     * @dev Register a new user
     */
    function registerUser(
        address _user,
        bytes32 _role,
        string memory _roleName
    ) external onlyRole(SUPERADMIN_ROLE) {
        require(!registeredUsers[_user], "User already registered");
        require(_role != bytes32(0), "Invalid role");
        
        registeredUsers[_user] = true;
        userRoles[_user] = _roleName;
        _grantRole(_role, _user);
        
        emit UserRegistered(_user, _roleName);
    }

    /**
     * @dev Register a new property
     */
    function registerProperty(
        string memory _state,
        string memory _district,
        string memory _village,
        string memory _surveyNumber,
        address _owner,
        uint256 _marketValue,
        string memory _ipfsHash
    ) external whenNotPaused returns (uint256) {
        require(bytes(_state).length > 0, "State is required");
        require(bytes(_district).length > 0, "District is required");
        require(bytes(_village).length > 0, "Village is required");
        require(bytes(_surveyNumber).length > 0, "Survey number is required");
        require(_owner != address(0), "Invalid owner address");
        require(_marketValue > 0, "Market value must be greater than 0");

        _propertyIds++;
        uint256 newPropertyId = _propertyIds;

        // Generate unique property ID
        string memory uniquePropertyId = string(abi.encodePacked(
            _state,
            "-",
            _district,
            "-",
            _village,
            "-",
            _surveyNumber,
            "-",
            toString(newPropertyId)
        ));

        Property memory newProperty = Property({
            id: newPropertyId,
            state: _state,
            district: _district,
            village: _village,
            surveyNumber: _surveyNumber,
            owner: _owner,
            marketValue: _marketValue,
            propertyId: uniquePropertyId,
            ipfsHash: _ipfsHash,
            status: PropertyStatus.Pending,
            registeredAt: block.timestamp,
            lastUpdated: block.timestamp,
            isActive: true
        });

        properties[newPropertyId] = newProperty;
        ownerProperties[_owner].push(newPropertyId);

        if (!registeredUsers[_owner]) {
            registeredUsers[_owner] = true;
            userRoles[_owner] = "Property Owner";
            _grantRole(PROPERTY_OWNER_ROLE, _owner);
            emit UserRegistered(_owner, "Property Owner");
        }

        emit PropertyRegistered(newPropertyId, _owner, uniquePropertyId, _marketValue);
        
        return newPropertyId;
    }

    /**
     * @dev Approve or reject a property registration
     */
    function approveProperty(
        uint256 _propertyId,
        bool _approve
    ) external onlyRole(SUPERADMIN_ROLE) validProperty(_propertyId) {
        Property storage property = properties[_propertyId];
        PropertyStatus oldStatus = property.status;
        
        require(
            property.status == PropertyStatus.Pending,
            "Property is not pending approval"
        );

        if (_approve) {
            property.status = PropertyStatus.Approved;
        } else {
            property.status = PropertyStatus.Rejected;
            property.isActive = false;
        }

        property.lastUpdated = block.timestamp;
        
        emit PropertyStatusChanged(_propertyId, oldStatus, property.status);
    }

    /**
     * @dev List a property for sale
     */
    function listPropertyForSale(
        uint256 _propertyId,
        uint256 _price
    ) external whenNotPaused nonReentrant 
        onlyPropertyOwner(_propertyId) validProperty(_propertyId) {
        
        Property storage property = properties[_propertyId];
        
        require(
            property.status == PropertyStatus.Approved,
            "Property must be approved before listing"
        );
        require(_price > 0, "Price must be greater than 0");

        PropertyStatus oldStatus = property.status;
        property.status = PropertyStatus.ListedForSale;
        property.lastUpdated = block.timestamp;

        emit PropertyStatusChanged(_propertyId, oldStatus, PropertyStatus.ListedForSale);
        emit PropertyListedForSale(_propertyId, msg.sender, _price);
    }

    /**
     * @dev Request to purchase a property
     */
    function requestToPurchase(
        uint256 _propertyId,
        uint256 _price,
        string memory _ipfsHash
    ) external whenNotPaused nonReentrant validProperty(_propertyId) payable {
        Property storage property = properties[_propertyId];
        
        require(
            property.status == PropertyStatus.ListedForSale,
            "Property is not listed for sale"
        );
        require(
            property.owner != msg.sender,
            "Cannot purchase your own property"
        );
        require(msg.value >= _price, "Insufficient payment");
        require(_price >= property.marketValue, "Price below market value");

        _transactionIds++;
        uint256 newTransactionId = _transactionIds;

        Transaction memory newTransaction = Transaction({
            id: newTransactionId,
            propertyId: _propertyId,
            seller: property.owner,
            buyer: msg.sender,
            price: _price,
            status: TransactionStatus.Pending,
            requestedAt: block.timestamp,
            completedAt: 0,
            ipfsHash: _ipfsHash
        });

        transactions[newTransactionId] = newTransaction;
        propertyTransactions[_propertyId].push(newTransactionId);
        
        property.status = PropertyStatus.SaleInProgress;
        property.lastUpdated = block.timestamp;

        emit PurchaseRequested(
            newTransactionId,
            _propertyId,
            msg.sender,
            property.owner,
            _price
        );
    }

    /**
     * @dev Process purchase request (approve or reject)
     */
    function processPurchaseRequest(
        uint256 _transactionId,
        bool _approve
    ) external whenNotPaused nonReentrant validTransaction(_transactionId) {
        Transaction storage transaction = transactions[_transactionId];
        
        require(
            transaction.seller == msg.sender,
            "Only seller can process the request"
        );
        require(
            transaction.status == TransactionStatus.Pending,
            "Transaction already processed"
        );

        Property storage property = properties[transaction.propertyId];

        if (_approve) {
            transaction.status = TransactionStatus.Approved;
            emit PurchaseApproved(_transactionId, transaction.propertyId, transaction.buyer);
        } else {
            transaction.status = TransactionStatus.Rejected;
            property.status = PropertyStatus.ListedForSale;
            
            // Refund buyer
            (bool success, ) = payable(transaction.buyer).call{
                value: transaction.price
            }("");
            require(success, "Refund failed");
            
            emit PurchaseRejected(_transactionId, transaction.propertyId, transaction.buyer);
        }

        transaction.completedAt = block.timestamp;
        property.lastUpdated = block.timestamp;
    }

    /**
     * @dev Complete the purchase and transfer ownership
     */
    function completePurchase(
        uint256 _transactionId
    ) external whenNotPaused nonReentrant validTransaction(_transactionId) {
        Transaction storage transaction = transactions[_transactionId];
        
        require(
            transaction.status == TransactionStatus.Approved,
            "Transaction must be approved first"
        );
        require(
            transaction.buyer == msg.sender,
            "Only buyer can complete the purchase"
        );

        Property storage property = properties[transaction.propertyId];
        
        // Remove property from old owner's list
        uint256[] storage oldOwnerProps = ownerProperties[property.owner];
        for (uint256 i = 0; i < oldOwnerProps.length; i++) {
            if (oldOwnerProps[i] == transaction.propertyId) {
                oldOwnerProps[i] = oldOwnerProps[oldOwnerProps.length - 1];
                oldOwnerProps.pop();
                break;
            }
        }

        // Transfer ownership
        address oldOwner = property.owner;
        property.owner = transaction.buyer;
        property.marketValue = transaction.price;
        // Set status to Approved so new owner can list it for sale again
        property.status = PropertyStatus.Approved;
        property.lastUpdated = block.timestamp;

        // Add to new owner's list
        ownerProperties[transaction.buyer].push(transaction.propertyId);

        // Register buyer if not already registered
        if (!registeredUsers[transaction.buyer]) {
            registeredUsers[transaction.buyer] = true;
            userRoles[transaction.buyer] = "Property Owner";
            _grantRole(PROPERTY_OWNER_ROLE, transaction.buyer);
            emit UserRegistered(transaction.buyer, "Property Owner");
        }

        // Transfer payment to seller
        (bool success, ) = payable(transaction.seller).call{
            value: transaction.price
        }("");
        require(success, "Payment transfer failed");

        transaction.status = TransactionStatus.Completed;
        transaction.completedAt = block.timestamp;

        emit OwnershipTransferred(
            transaction.propertyId,
            oldOwner,
            transaction.buyer,
            _transactionId
        );
    }

    /**
     * @dev Update property documents (IPFS hash)
     */
    function updatePropertyDocuments(
        uint256 _propertyId,
        string memory _ipfsHash
    ) external onlyPropertyOwner(_propertyId) validProperty(_propertyId) {
        properties[_propertyId].ipfsHash = _ipfsHash;
        properties[_propertyId].lastUpdated = block.timestamp;
        
        emit DocumentsUpdated(_propertyId, _ipfsHash);
    }

    /**
     * @dev Remove property from sale
     */
    function removeFromSale(
        uint256 _propertyId
    ) external onlyPropertyOwner(_propertyId) validProperty(_propertyId) {
        Property storage property = properties[_propertyId];
        
        require(
            property.status == PropertyStatus.ListedForSale ||
            property.status == PropertyStatus.SaleInProgress,
            "Property is not for sale"
        );

        PropertyStatus oldStatus = property.status;
        property.status = PropertyStatus.Approved;
        property.lastUpdated = block.timestamp;

        emit PropertyStatusChanged(_propertyId, oldStatus, PropertyStatus.Approved);
    }

    /**
     * @dev Get property details
     */
    function getProperty(
        uint256 _propertyId
    ) external view returns (Property memory) {
        require(
            properties[_propertyId].id != 0,
            "Property does not exist"
        );
        return properties[_propertyId];
    }

    /**
     * @dev Get all properties owned by an address
     */
    function getOwnerProperties(
        address _owner
    ) external view returns (uint256[] memory) {
        return ownerProperties[_owner];
    }

    /**
     * @dev Get transaction details
     */
    function getTransaction(
        uint256 _transactionId
    ) external view validTransaction(_transactionId) returns (Transaction memory) {
        return transactions[_transactionId];
    }

    /**
     * @dev Get all transactions for a property
     */
    function getPropertyTransactions(
        uint256 _propertyId
    ) external view returns (uint256[] memory) {
        return propertyTransactions[_propertyId];
    }

    /**
     * @dev Get total number of properties
     */
    function getTotalProperties() external view returns (uint256) {
        return _propertyIds;
    }

    /**
     * @dev Add superadmin and assign villages (Documentation: addSuperAdmin)
     * @param _superadmin Address of the superadmin to register
     * @param _villages Array of village names to assign to this superadmin
     * @param _roleName Display name for the role
     */
    function addSuperAdmin(
        address _superadmin,
        string[] memory _villages,
        string memory _roleName
    ) external onlyRole(SUPERADMIN_ROLE) {
        require(_superadmin != address(0), "Invalid address");
        require(!registeredUsers[_superadmin], "User already registered");
        
        registeredUsers[_superadmin] = true;
        userRoles[_superadmin] = _roleName;
        _grantRole(SUPERADMIN_ROLE, _superadmin);
        
        // Assign villages
        for (uint256 i = 0; i < _villages.length; i++) {
            superadminVillages[_superadmin].push(_villages[i]);
        }
        
        emit UserRegistered(_superadmin, _roleName);
    }

    /**
     * @dev Get villages assigned to a superadmin
     */
    function getSuperadminVillages(address _superadmin) external view returns (string[] memory) {
        return superadminVillages[_superadmin];
    }

    /**
     * @dev View purchase requests for a property (Documentation: viewRequest)
     * @param _propertyId The property ID to view requests for
     * @return Array of transaction IDs that are pending for this property
     */
    function viewRequest(uint256 _propertyId) public view returns (uint256[] memory) {
        require(properties[_propertyId].id != 0, "Property does not exist");
        
        uint256[] memory allTransactions = propertyTransactions[_propertyId];
        uint256 pendingCount = 0;
        
        // Count pending transactions
        for (uint256 i = 0; i < allTransactions.length; i++) {
            if (transactions[allTransactions[i]].status == TransactionStatus.Pending) {
                pendingCount++;
            }
        }
        
        // Create array of pending transaction IDs
        uint256[] memory pendingTransactions = new uint256[](pendingCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allTransactions.length; i++) {
            if (transactions[allTransactions[i]].status == TransactionStatus.Pending) {
                pendingTransactions[index] = allTransactions[i];
                index++;
            }
        }
        
        return pendingTransactions;
    }

    /**
     * @dev Get property information for owner (Documentation: landInfoOwner)
     * Includes comprehensive data including request status
     * @param _propertyId The property ID
     * @return Property struct with full details
     * @return Array of pending transaction IDs for this property
     */
    function landInfoOwner(uint256 _propertyId) external view returns (Property memory, uint256[] memory) {
        require(properties[_propertyId].id != 0, "Property does not exist");
        require(
            properties[_propertyId].owner == msg.sender,
            "Only property owner can access this information"
        );
        
        uint256[] memory pendingRequests = viewRequest(_propertyId);
        return (properties[_propertyId], pendingRequests);
    }

    /**
     * @dev Get property information for general users (Documentation: landInfoUser)
     * Public property information without sensitive owner details
     * @param _propertyId The property ID
     * @return Property struct (public view)
     */
    function landInfoUser(uint256 _propertyId) external view returns (Property memory) {
        require(properties[_propertyId].id != 0, "Property does not exist");
        require(properties[_propertyId].isActive, "Property is not active");
        return properties[_propertyId];
    }

    /**
     * @dev View assets owned by an address (Documentation: viewAssets)
     * Alias for getOwnerProperties for documentation alignment
     * @param _owner The owner address
     * @return Array of property IDs owned by the address
     */
    function viewAssets(address _owner) external view returns (uint256[] memory) {
        return ownerProperties[_owner];
    }

    /**
     * @dev List property for sale (Documentation: makeAvailable)
     * Alias for listPropertyForSale for documentation alignment
     */
    function makeAvailable(
        uint256 _propertyId,
        uint256 _price
    ) external whenNotPaused nonReentrant 
        onlyPropertyOwner(_propertyId) validProperty(_propertyId) {
        // Call the existing listPropertyForSale function
        Property storage property = properties[_propertyId];
        
        require(
            property.status == PropertyStatus.Approved,
            "Property must be approved before listing"
        );
        require(_price > 0, "Price must be greater than 0");

        PropertyStatus oldStatus = property.status;
        property.status = PropertyStatus.ListedForSale;
        property.lastUpdated = block.timestamp;

        emit PropertyStatusChanged(_propertyId, oldStatus, PropertyStatus.ListedForSale);
        emit PropertyListedForSale(_propertyId, msg.sender, _price);
    }

    /**
     * @dev Request to purchase from land owner (Documentation: requestToLandOwner)
     * Alias for requestToPurchase for documentation alignment
     */
    function requestToLandOwner(
        uint256 _propertyId,
        uint256 _price,
        string memory _ipfsHash
    ) external whenNotPaused nonReentrant validProperty(_propertyId) payable {
        // Call the existing requestToPurchase function
        Property storage property = properties[_propertyId];
        
        require(
            property.status == PropertyStatus.ListedForSale,
            "Property is not listed for sale"
        );
        require(
            property.owner != msg.sender,
            "Cannot purchase your own property"
        );
        require(msg.value >= _price, "Insufficient payment");
        require(_price >= property.marketValue, "Price below market value");

        _transactionIds++;
        uint256 newTransactionId = _transactionIds;

        Transaction memory newTransaction = Transaction({
            id: newTransactionId,
            propertyId: _propertyId,
            seller: property.owner,
            buyer: msg.sender,
            price: _price,
            status: TransactionStatus.Pending,
            requestedAt: block.timestamp,
            completedAt: 0,
            ipfsHash: _ipfsHash
        });

        transactions[newTransactionId] = newTransaction;
        propertyTransactions[_propertyId].push(newTransactionId);
        
        property.status = PropertyStatus.SaleInProgress;
        property.lastUpdated = block.timestamp;

        emit PurchaseRequested(
            newTransactionId,
            _propertyId,
            msg.sender,
            property.owner,
            _price
        );
    }

    /**
     * @dev Process purchase request (Documentation: processRequest)
     * Alias for processPurchaseRequest for documentation alignment
     */
    function processRequest(
        uint256 _transactionId,
        bool _approve
    ) external whenNotPaused nonReentrant validTransaction(_transactionId) {
        // Call the existing processPurchaseRequest function
        Transaction storage transaction = transactions[_transactionId];
        
        require(
            transaction.seller == msg.sender,
            "Only seller can process the request"
        );
        require(
            transaction.status == TransactionStatus.Pending,
            "Transaction already processed"
        );

        Property storage property = properties[transaction.propertyId];

        if (_approve) {
            transaction.status = TransactionStatus.Approved;
            emit PurchaseApproved(_transactionId, transaction.propertyId, transaction.buyer);
        } else {
            transaction.status = TransactionStatus.Rejected;
            property.status = PropertyStatus.ListedForSale;
            
            // Refund buyer
            (bool success, ) = payable(transaction.buyer).call{
                value: transaction.price
            }("");
            require(success, "Refund failed");
            
            emit PurchaseRejected(_transactionId, transaction.propertyId, transaction.buyer);
        }

        transaction.completedAt = block.timestamp;
        property.lastUpdated = block.timestamp;
    }

    /**
     * @dev Complete purchase and transfer ownership (Documentation: buyProperty)
     * Alias for completePurchase for documentation alignment
     */
    function buyProperty(uint256 _transactionId) external whenNotPaused nonReentrant validTransaction(_transactionId) {
        // Call the existing completePurchase function
        Transaction storage transaction = transactions[_transactionId];
        
        require(
            transaction.status == TransactionStatus.Approved,
            "Transaction must be approved first"
        );
        require(
            transaction.buyer == msg.sender,
            "Only buyer can complete the purchase"
        );

        Property storage property = properties[transaction.propertyId];
        
        // Remove property from old owner's list
        uint256[] storage oldOwnerProps = ownerProperties[property.owner];
        for (uint256 i = 0; i < oldOwnerProps.length; i++) {
            if (oldOwnerProps[i] == transaction.propertyId) {
                oldOwnerProps[i] = oldOwnerProps[oldOwnerProps.length - 1];
                oldOwnerProps.pop();
                break;
            }
        }

        // Transfer ownership
        address oldOwner = property.owner;
        property.owner = transaction.buyer;
        property.marketValue = transaction.price;
        // Set status to Approved so new owner can list it for sale again
        property.status = PropertyStatus.Approved;
        property.lastUpdated = block.timestamp;

        // Add to new owner's list
        ownerProperties[transaction.buyer].push(transaction.propertyId);

        // Register buyer if not already registered
        if (!registeredUsers[transaction.buyer]) {
            registeredUsers[transaction.buyer] = true;
            userRoles[transaction.buyer] = "Property Owner";
            _grantRole(PROPERTY_OWNER_ROLE, transaction.buyer);
            emit UserRegistered(transaction.buyer, "Property Owner");
        }

        // Transfer payment to seller
        (bool success, ) = payable(transaction.seller).call{
            value: transaction.price
        }("");
        require(success, "Payment transfer failed");

        transaction.status = TransactionStatus.Completed;
        transaction.completedAt = block.timestamp;

        emit OwnershipTransferred(
            transaction.propertyId,
            oldOwner,
            transaction.buyer,
            _transactionId
        );
    }

    /**
     * @dev Pause contract (emergency stop)
     */
    function pause() external onlyRole(SUPERADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyRole(SUPERADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Helper function to convert uint to string
     */
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /**
     * @dev Receive function to accept ether
     */
    receive() external payable {}
}
