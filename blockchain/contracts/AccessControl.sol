// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/access/AccessControl.sol";
contract CipherVoteAccessControl is AccessControl {
    bytes32 public constant SUPER_ADMIN_ROLE = keccak256("SUPER_ADMIN");
    bytes32 public constant ELECTION_COMMISSION_ROLE = keccak256("ELECTION_COMMISSION");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR");
    bytes32 public constant FRAUD_ANALYST_ROLE = keccak256("FRAUD_ANALYST");
    bytes32 public constant VOTER_ROLE = keccak256("VOTER");
    constructor(){_grantRole(DEFAULT_ADMIN_ROLE,msg.sender);_grantRole(SUPER_ADMIN_ROLE,msg.sender);_grantRole(ELECTION_COMMISSION_ROLE,msg.sender);}
    function grantVoterRole(address v) external onlyRole(ELECTION_COMMISSION_ROLE){_grantRole(VOTER_ROLE,v);}
    function isAdmin(address a) external view returns(bool){return hasRole(SUPER_ADMIN_ROLE,a);}
}