// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/access/Ownable.sol";
contract VoteDelegation is Ownable {
    struct Delegation{address delegator;address delegate;uint256 electionId;bool isActive;bool isUsed;}
    mapping(uint256=>Delegation) public delegations;uint256 public delegationCount;
    event DelegationCreated(uint256 indexed id,address delegator,address delegate,uint256 electionId);
    event DelegationRevoked(uint256 indexed id);
    event DelegationUsed(uint256 indexed id,address indexed by);
    mapping(address=>bool) public trustedVotingContracts;
    event TrustedVotingContractUpdated(address indexed account,bool trusted);
    constructor() Ownable(msg.sender){}
    modifier onlyTrustedVoting(){require(trustedVotingContracts[msg.sender],"Not trusted voting");_;}
    function setTrustedVotingContract(address account,bool trusted) external onlyOwner{trustedVotingContracts[account]=trusted;emit TrustedVotingContractUpdated(account,trusted);}
    function createDelegation(address delegate,uint256 electionId,uint256) external returns(uint256){
        require(delegate!=address(0),"Bad delegate");
        require(delegate!=msg.sender,"Self delegation");
        require(electionId>0,"Bad election");
        delegationCount++;delegations[delegationCount]=Delegation(msg.sender,delegate,electionId,true,false);
        emit DelegationCreated(delegationCount,msg.sender,delegate,electionId);return delegationCount;
    }
    function revokeDelegation(uint256 id) external{Delegation storage d=delegations[id];require(d.delegator==msg.sender,"Not delegator");require(d.isActive&&!d.isUsed,"Not active");d.isActive=false;emit DelegationRevoked(id);}
    function markUsed(uint256 id) external onlyTrustedVoting{Delegation storage d=delegations[id];require(d.isActive&&!d.isUsed,"Not usable");d.isUsed=true;d.isActive=false;emit DelegationUsed(id,msg.sender);}
    function getDelegation(uint256 id) external view returns(Delegation memory){return delegations[id];}
}
