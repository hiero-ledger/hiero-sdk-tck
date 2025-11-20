// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ContractCallQueryTest
 * @dev A comprehensive contract for testing ContractCallQuery with various return types
 * 
 * To compile this contract:
 * 1. Visit https://remix.ethereum.org/
 * 2. Create a new file and paste this contract code
 * 3. Go to the "Solidity Compiler" tab
 * 4. Select compiler version 0.8.20 or higher
 * 5. Click "Compile contract-call-query.sol"
 * 6. Click "Compilation Details" and copy the "object" bytecode
 * 7. Replace the bytecode in test-contract-call-query.ts
 * 
 * Alternative: Use solc command line
 * solc --bin --optimize contract-call-query.sol
 */
contract ContractCallQueryTest {
    string public message;
    uint256 public storedUint256;
    int256 public storedInt256;
    bool public storedBool;
    address public storedAddress;
    bytes32 public storedBytes32;
    
    // Event for testing logs
    event MessageSet(string newMessage, address indexed setter);
    event NumberSet(uint256 newNumber);
    
    constructor(string memory _initialMessage) {
        message = _initialMessage;
        storedUint256 = 42;
        storedInt256 = -123;
        storedBool = true;
        storedAddress = msg.sender;
        storedBytes32 = keccak256(abi.encodePacked("test"));
    }
    
    // String return functions
    function getMessage() public view returns (string memory) {
        return message;
    }
    
    function setMessage(string memory _newMessage) public {
        message = _newMessage;
        emit MessageSet(_newMessage, msg.sender);
    }
    
    // Boolean return functions
    function getBool() public view returns (bool) {
        return storedBool;
    }
    
    function getTrue() public pure returns (bool) {
        return true;
    }
    
    function getFalse() public pure returns (bool) {
        return false;
    }
    
    // Integer return functions (various sizes)
    function getInt8() public pure returns (int8) {
        return -42;
    }
    
    function getUint8() public pure returns (uint8) {
        return 255;
    }
    
    function getInt16() public pure returns (int16) {
        return -1000;
    }
    
    function getUint16() public pure returns (uint16) {
        return 65535;
    }
    
    function getInt32() public pure returns (int32) {
        return -100000;
    }
    
    function getUint32() public pure returns (uint32) {
        return 4294967295;
    }
    
    function getInt64() public pure returns (int64) {
        return -9223372036854775807;
    }
    
    function getUint64() public pure returns (uint64) {
        return 18446744073709551615;
    }
    
    function getInt256() public view returns (int256) {
        return storedInt256;
    }
    
    function getUint256() public view returns (uint256) {
        return storedUint256;
    }
    
    function getMultipleIntegers() public pure returns (uint256, int256, uint8) {
        return (100, -50, 25);
    }
    
    // Address return functions
    function getAddress() public view returns (address) {
        return storedAddress;
    }
    
    function getSenderAddress() public view returns (address) {
        return msg.sender;
    }
    
    // Bytes return functions
    function getBytes32() public view returns (bytes32) {
        return storedBytes32;
    }
    
    function getFixedBytes() public pure returns (bytes32) {
        return 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
    }
    
    function getDynamicBytes() public pure returns (bytes memory) {
        return hex"deadbeef";
    }
    
    // Array return functions
    function getUint256Array() public pure returns (uint256[] memory) {
        uint256[] memory arr = new uint256[](3);
        arr[0] = 1;
        arr[1] = 2;
        arr[2] = 3;
        return arr;
    }
    
    function getAddressArray() public pure returns (address[] memory) {
        address[] memory arr = new address[](2);
        arr[0] = address(0x0000000000000000000000000000000000000001);
        arr[1] = address(0x0000000000000000000000000000000000000002);
        return arr;
    }
    
    // Multiple return values
    function getMultipleValues() public view returns (
        string memory,
        uint256,
        bool,
        address
    ) {
        return (message, storedUint256, storedBool, storedAddress);
    }
    
    // Function with parameters that returns result
    function addNumbers(uint256 a, uint256 b) public pure returns (uint256) {
        return a + b;
    }
    
    function concatenateStrings(string memory a, string memory b) public pure returns (string memory) {
        return string(abi.encodePacked(a, b));
    }
    
    // Function that reverts
    function alwaysRevert() public pure {
        revert("This function always reverts");
    }
    
    function revertWithCustomMessage(string memory errorMsg) public pure {
        revert(errorMsg);
    }
    
    // Function that emits events (for log testing)
    function emitEvents() public {
        emit MessageSet("Event message", msg.sender);
        emit NumberSet(storedUint256);
    }
    
    // Functions with different complexity levels
    function complexCalculation(uint256 input) public pure returns (uint256) {
        uint256 result = input;
        for (uint i = 0; i < 100; i++) {
            result = result * 2 + 1;
            if (result > 1000000) {
                result = result / 2;
            }
        }
        return result;
    }
    
    // Test different integer sizes
    function getInt24() public pure returns (int24) {
        return -8388607;
    }
    
    function getUint24() public pure returns (uint24) {
        return 16777215;
    }
    
    function getInt40() public pure returns (int40) {
        return -549755813887;
    }
    
    function getUint40() public pure returns (uint40) {
        return 1099511627775;
    }
    
    function getInt48() public pure returns (int48) {
        return -140737488355327;
    }
    
    function getUint48() public pure returns (uint48) {
        return 281474976710655;
    }
    
    function getInt56() public pure returns (int56) {
        return -36028797018963967;
    }
    
    function getUint56() public pure returns (uint56) {
        return 72057594037927935;
    }
    
    // Empty function
    function doNothing() public pure {
        // Does nothing
    }
    
    // Payable function
    function deposit() public payable returns (uint256) {
        return msg.value;
    }
    
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}

