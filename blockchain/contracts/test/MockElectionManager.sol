// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockElectionManager {
    bool public active = true;
    uint256 public candidateCount = 3;
    uint256 public eligibilityRoot = 999;

    function setActive(bool value) external {
        active = value;
    }

    function setCandidateCount(uint256 value) external {
        candidateCount = value;
    }

    function isElectionActive(uint256) external view returns (bool) {
        return active;
    }

    function getCandidateCount(uint256) external view returns (uint256) {
        return candidateCount;
    }

    function getEligibilityRoot(uint256) external view returns (uint256) {
        return eligibilityRoot;
    }
}
