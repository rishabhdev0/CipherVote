// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockEmergencyControl {
    bool public systemPaused;

    function setPaused(bool value) external {
        systemPaused = value;
    }
}
