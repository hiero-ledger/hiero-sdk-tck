// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ExecuteTests
 * @dev A contract that accepts HBAR deposits and manages a message.
 * This version includes both payable and non-payable functions to
 * support a full range of Hedera SDK testing scenarios.
 */
contract ExecuteTests {

    // State variable to store the message.
    string public message;
    bytes32 public num;
    // Event to be emitted when a message is sent via the specific function.
    event MessageSent(address indexed sender, string message);
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }
    
    modifier notOwner() {
        require(msg.sender != owner, "Caller is the owner");
        _;
    }
    
    constructor() {
        owner = msg.sender; // The account that deploys the contract is the owner.
    }
    
    function unprotectedFunction() public view notOwner {
        // This function's logic will only execute if the caller not the owner.
    }

    function protectedFunction() public view onlyOwner {
        // This function's logic will only execute if the caller is the owner.
    }
    
    /**
     * @notice NON-PAYABLE FUNCTION
     * @dev Updates the message. This function is NOT payable and will reject
     * any transaction that tries to send HBAR to it (except for an amount of 0).
     */
    function setMessage(string memory _newMessage) public {
        message = _newMessage;
    }

    function setNumber(bytes32 _foo) public {
        num = _foo;
    }

    /**
     * @notice PAYABLE FUNCTION
     * @dev Accepts HBAR deposits. The `payable` keyword allows this function
     * to receive HBAR.
     */
    function deposit() public payable {
        // This function is intentionally empty. Its only job is to be `payable`
        // so that the contract can receive HBAR through it.
    }
   
    /**
     * @dev A view function to retrieve the current message.
     */
    function getMessage() public view returns (string memory) {
        return message;
    }

    function empty() public {
        message = "new message";
    }

    /**
     * @notice EMITS AN EVENT
     * @dev A simple function that takes a string and emits it in an event.
     * This is useful for testing event listening capabilities.
     * @param _logMessage The message to be included in the event log.
     */
    function sendMessageEvent(string memory _logMessage) public {
        emit MessageSent(msg.sender, _logMessage);
    }

    
    function alwaysRevert() public pure {
        revert("This function is designed to fail.");
    }


    function addNumbers(uint256 a, uint256 b) public pure returns (uint256) {
        return a + b;
    }

    /**
     * @dev A view function to check the contract's current HBAR balance.
     * This is useful for verifying that a deposit test was successful.
     * The balance is returned in tinybars (the smallest unit, like wei).
     */
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
}