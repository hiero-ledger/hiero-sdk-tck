// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MessageStorage {
    string public message;

    function setMessage(string memory _newMessage) public {
        message = _newMessage;
    }

    function getMessage() public view returns (string memory) {
        return message;
    }
}