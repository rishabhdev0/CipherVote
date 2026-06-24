// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IElectionManager {
    function isElectionActive(uint256 eId) external view returns(bool);
    function getCandidateCount(uint256 eId) external view returns(uint256);
    function getEligibilityRoot(uint256 eId) external view returns(uint256);
}
interface IVoterRegistry { function isVoterVerified(address wallet) external view returns(bool); }
interface IEmergencyControl { function systemPaused() external view returns(bool); }

contract Voting is ReentrancyGuard,Ownable {
    struct Vote{bytes32 voteHash;bytes32 commitment;bytes32 nullifier;uint256 electionId;uint256 timestamp;bool isValid;}
    address public zkpVerifier;address public electionManager;address public voterRegistry;address public emergencyControl;
    bool public zkpRequired;bool public initialized;
    mapping(address=>bool) public authorizedRelayers;
    mapping(bytes32=>Vote) public votes;
    mapping(uint256=>uint256) public electionVoteCounts;
    mapping(uint256=>mapping(uint256=>uint256)) public candidateVotes;
    mapping(address=>mapping(uint256=>bool)) public hasVoted;
    mapping(bytes32=>bool) public nullifiersUsed;
    event Initialized(address zkp,address electionManager,address voterRegistry,address emergencyControl);
    event ZKPRequirementUpdated(bool required);
    event RelayerUpdated(address indexed relayer,bool authorized);
    event VoteCast(bytes32 indexed voteHash,uint256 indexed electionId,uint256 timestamp,bytes32 commitment,bool zkpVerified);
    event EncryptedBallotCast(bytes32 indexed ballotHash,uint256 indexed electionId,address indexed voter,bytes32 ballotCommitment,bytes32 nullifier,bool zkpVerified);
    error AlreadyInitialized();error AlreadyVoted();error NullifierReused();error ZKPVerificationFailed();error ElectionInactive();error VoterNotVerified();error InvalidCandidate();error SystemPaused();error NotRelayer();error InvalidVoter();error InvalidEligibilityRoot();
    constructor() Ownable(msg.sender){}
    function initialize(address _zkp,address _em,address _vr,address _ec) external onlyOwner{if(initialized)revert AlreadyInitialized();zkpVerifier=_zkp;electionManager=_em;voterRegistry=_vr;emergencyControl=_ec;initialized=true;emit Initialized(_zkp,_em,_vr,_ec);}
    function setZKPRequired(bool r) external onlyOwner{zkpRequired=r;emit ZKPRequirementUpdated(r);}
    function setRelayer(address relayer,bool authorized) external onlyOwner{authorizedRelayers[relayer]=authorized;emit RelayerUpdated(relayer,authorized);}
    function castVote(uint256 eId,uint256 cId,bytes32 salt,uint256 commitment,uint256 nullifier,uint256 eligibilityRoot,uint256[2] calldata pA,uint256[2][2] calldata pB,uint256[2] calldata pC) external nonReentrant{
        _castVote(msg.sender,eId,cId,salt,commitment,nullifier,eligibilityRoot,pA,pB,pC);
    }
    function castVoteFor(address voter,uint256 eId,uint256 cId,bytes32 salt,uint256 commitment,uint256 nullifier,uint256 eligibilityRoot,uint256[2] calldata pA,uint256[2][2] calldata pB,uint256[2] calldata pC) external nonReentrant{
        if(!authorizedRelayers[msg.sender])revert NotRelayer();
        _castVote(voter,eId,cId,salt,commitment,nullifier,eligibilityRoot,pA,pB,pC);
    }
    function castEncryptedBallotFor(address voter,uint256 eId,bytes32 ballotCommitment,uint256 nullifier,uint256 eligibilityRoot,uint256 proofCommitment,uint256[2] calldata pA,uint256[2][2] calldata pB,uint256[2] calldata pC) external nonReentrant{
        if(!authorizedRelayers[msg.sender])revert NotRelayer();
        _castEncryptedBallot(voter,eId,ballotCommitment,nullifier,eligibilityRoot,proofCommitment,pA,pB,pC);
    }
    function _castVote(address voter,uint256 eId,uint256 cId,bytes32 salt,uint256 commitment,uint256 nullifier,uint256 eligibilityRoot,uint256[2] calldata pA,uint256[2][2] calldata pB,uint256[2] calldata pC) internal{
        if(voter==address(0))revert InvalidVoter();
        if(emergencyControl!=address(0)&&IEmergencyControl(emergencyControl).systemPaused())revert SystemPaused();
        if(electionManager!=address(0)&&!IElectionManager(electionManager).isElectionActive(eId))revert ElectionInactive();
        if(voterRegistry!=address(0)&&!IVoterRegistry(voterRegistry).isVoterVerified(voter))revert VoterNotVerified();
        uint256 maxCandidates=electionManager==address(0)?0:IElectionManager(electionManager).getCandidateCount(eId);
        if(cId==0||(maxCandidates>0&&cId>maxCandidates))revert InvalidCandidate();
        if(hasVoted[voter][eId])revert AlreadyVoted();
        bytes32 nh=bytes32(nullifier);
        if(nullifier>0&&nullifiersUsed[nh])revert NullifierReused();
        bool zkpOk=false;
        if(zkpRequired){
            if(zkpVerifier==address(0)||commitment==0)revert ZKPVerificationFailed();
            if(electionManager!=address(0)&&eligibilityRoot!=IElectionManager(electionManager).getEligibilityRoot(eId))revert InvalidEligibilityRoot();
            (bool s,bytes memory data)=zkpVerifier.call(abi.encodeWithSignature("verifyVoteProof(uint256[2],uint256[2][2],uint256[2],uint256,uint256,uint256,uint256,uint256)",pA,pB,pC,commitment,eId,maxCandidates,nullifier,eligibilityRoot));
            if(!s||data.length==0||!abi.decode(data,(bool)))revert ZKPVerificationFailed();
            zkpOk=true;
        }
        bytes32 voteHash=keccak256(abi.encodePacked(voter,eId,salt,block.chainid));
        votes[voteHash]=Vote(voteHash,bytes32(commitment),nh,eId,block.timestamp,true);
        hasVoted[voter][eId]=true;if(nullifier>0)nullifiersUsed[nh]=true;
        electionVoteCounts[eId]++;candidateVotes[eId][cId]++;
        emit VoteCast(voteHash,eId,block.timestamp,bytes32(commitment),zkpOk);
    }
    function _castEncryptedBallot(address voter,uint256 eId,bytes32 ballotCommitment,uint256 nullifier,uint256 eligibilityRoot,uint256 proofCommitment,uint256[2] calldata pA,uint256[2][2] calldata pB,uint256[2] calldata pC) internal{
        if(voter==address(0))revert InvalidVoter();
        if(ballotCommitment==bytes32(0))revert ZKPVerificationFailed();
        if(emergencyControl!=address(0)&&IEmergencyControl(emergencyControl).systemPaused())revert SystemPaused();
        if(electionManager!=address(0)&&!IElectionManager(electionManager).isElectionActive(eId))revert ElectionInactive();
        if(voterRegistry!=address(0)&&!IVoterRegistry(voterRegistry).isVoterVerified(voter))revert VoterNotVerified();
        if(hasVoted[voter][eId])revert AlreadyVoted();
        bytes32 nh=bytes32(nullifier);
        if(nullifier>0&&nullifiersUsed[nh])revert NullifierReused();
        bool zkpOk=false;
        uint256 maxCandidates=electionManager==address(0)?0:IElectionManager(electionManager).getCandidateCount(eId);
        if(zkpRequired){
            if(zkpVerifier==address(0)||proofCommitment==0)revert ZKPVerificationFailed();
            if(electionManager!=address(0)&&eligibilityRoot!=IElectionManager(electionManager).getEligibilityRoot(eId))revert InvalidEligibilityRoot();
            (bool s,bytes memory data)=zkpVerifier.call(abi.encodeWithSignature("verifyVoteProof(uint256[2],uint256[2][2],uint256[2],uint256,uint256,uint256,uint256,uint256)",pA,pB,pC,proofCommitment,eId,maxCandidates,nullifier,eligibilityRoot));
            if(!s||data.length==0||!abi.decode(data,(bool)))revert ZKPVerificationFailed();
            zkpOk=true;
        }
        bytes32 ballotHash=keccak256(abi.encodePacked(voter,eId,ballotCommitment,block.chainid));
        votes[ballotHash]=Vote(ballotHash,ballotCommitment,nh,eId,block.timestamp,true);
        hasVoted[voter][eId]=true;if(nullifier>0)nullifiersUsed[nh]=true;
        electionVoteCounts[eId]++;
        emit EncryptedBallotCast(ballotHash,eId,voter,ballotCommitment,nh,zkpOk);
    }
    function getCandidateVotes(uint256 eId,uint256 cId) external view returns(uint256){return candidateVotes[eId][cId];}
    function getTotalVotes(uint256 eId) external view returns(uint256){return electionVoteCounts[eId];}
    function voterHasVoted(address voter,uint256 eId) external view returns(bool){return hasVoted[voter][eId];}
    function getVote(bytes32 h) external view returns(Vote memory){return votes[h];}
}
