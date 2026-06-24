// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/access/Ownable.sol";
contract VoterRegistry is Ownable {
    enum VoterStatus{UNREGISTERED,PENDING,VERIFIED,REJECTED,BLACKLISTED}
    struct Voter{address wallet;bytes32 identityHash;string constituency;uint256 age;VoterStatus status;uint256 registeredAt;uint256 verifiedAt;bool isBlacklisted;}
    mapping(address=>Voter) public voters;
    mapping(address=>bool) public verifiers;
    event VoterRegistered(address indexed wallet,string constituency);
    event VoterVerified(address indexed wallet,uint256 timestamp);
    event VoterBlacklisted(address indexed wallet,string reason);
    event VerifierRoleUpdated(address indexed verifier,bool trusted);
    constructor() Ownable(msg.sender){verifiers[msg.sender]=true;}
    modifier onlyVerifier(){require(verifiers[msg.sender],"Not verifier");_;}
    function grantVerifierRole(address v) external onlyOwner{verifiers[v]=true;emit VerifierRoleUpdated(v,true);}
    function revokeVerifierRole(address v) external onlyOwner{verifiers[v]=false;emit VerifierRoleUpdated(v,false);}
    function registerVoter(address wallet,bytes32 idHash,string calldata constituency,uint256 age) external onlyVerifier{
        require(voters[wallet].status==VoterStatus.UNREGISTERED,"Already registered");
        voters[wallet]=Voter(wallet,idHash,constituency,age,VoterStatus.PENDING,block.timestamp,0,false);
        emit VoterRegistered(wallet,constituency);
    }
    function verifyVoter(address wallet) external onlyVerifier{
        require(voters[wallet].status==VoterStatus.PENDING,"Not pending");
        voters[wallet].status=VoterStatus.VERIFIED;voters[wallet].verifiedAt=block.timestamp;
        emit VoterVerified(wallet,block.timestamp);
    }
    function blacklistVoter(address wallet,string calldata reason) external onlyOwner{
        voters[wallet].status=VoterStatus.BLACKLISTED;voters[wallet].isBlacklisted=true;
        emit VoterBlacklisted(wallet,reason);
    }
    function isVoterVerified(address wallet) external view returns(bool){return voters[wallet].status==VoterStatus.VERIFIED;}
    function getVoter(address wallet) external view returns(Voter memory){return voters[wallet];}
}
