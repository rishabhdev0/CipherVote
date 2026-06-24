// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockZKPVerifier {
    bool public valid = true;

    function setValid(bool value) external {
        valid = value;
    }

    function verifyVoteProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256
    ) external view returns (bool) {
        return valid;
    }
}
