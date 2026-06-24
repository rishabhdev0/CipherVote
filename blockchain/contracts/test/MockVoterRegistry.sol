// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockVoterRegistry {
    mapping(address => bool) public verified;

    function setVerified(address voter, bool value) external {
        verified[voter] = value;
    }

    function isVoterVerified(address voter) external view returns (bool) {
        return verified[voter];
    }
}
