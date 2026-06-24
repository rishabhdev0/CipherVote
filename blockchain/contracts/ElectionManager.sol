// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/access/Ownable.sol";
contract ElectionManager is Ownable {
    enum Status{DRAFT,ACTIVE,PAUSED,CLOSED,RESULTS_DECLARED}
    struct Election{uint256 id;string title;string constituency;uint256 startTime;uint256 endTime;Status status;uint256 candidateCount;uint256 eligibilityRoot;}
    mapping(uint256=>Election) public elections;
    mapping(address=>bool) public admins;
    uint256 public electionCount;
    uint256 public constant MIN_ELECTION_WINDOW = 7 days;
    event ElectionCreated(uint256 indexed electionId,string title);
    event ElectionActivated(uint256 indexed electionId);
    event CandidateAdded(uint256 indexed electionId,uint256 candidateId);
    event EligibilityRootUpdated(uint256 indexed electionId,uint256 root);
    event ElectionWindowUpdated(uint256 indexed electionId,uint256 startTime,uint256 endTime);
    event ElectionClosed(uint256 indexed electionId);
    event ResultsDeclared(uint256 indexed electionId);
    modifier onlyAdmin(){require(admins[msg.sender],"Not admin");_;}
    modifier electionExists(uint256 eId){require(eId>0&&eId<=electionCount,"Election missing");_;}
    constructor() Ownable(msg.sender){admins[msg.sender]=true;}
    function grantAdminRole(address a) external onlyOwner{require(a!=address(0),"Bad admin");admins[a]=true;}
    function revokeAdminRole(address a) external onlyOwner{require(a!=owner(),"Owner admin required");admins[a]=false;}
    function createElection(string calldata title,string calldata,string calldata constituency,uint256 start,uint256 end) external onlyAdmin returns(uint256){
        require(bytes(title).length>0,"Title required");
        require(start<end,"Bad window");
        require(end-start>=MIN_ELECTION_WINDOW,"Window too short");
        electionCount++;
        elections[electionCount]=Election(electionCount,title,constituency,start,end,Status.DRAFT,0,0);
        emit ElectionCreated(electionCount,title);return electionCount;
    }
    function addCandidate(uint256 eId,string calldata,string calldata,string calldata) external onlyAdmin electionExists(eId){
        require(elections[eId].status==Status.DRAFT,"Only draft");
        require(block.timestamp<elections[eId].startTime,"Started");
        elections[eId].candidateCount++;
        emit CandidateAdded(eId,elections[eId].candidateCount);
    }
    function activateElection(uint256 eId) external onlyAdmin electionExists(eId){
        Election storage e=elections[eId];
        require(e.status==Status.DRAFT,"Only draft");
        require(e.candidateCount>=2,"Need 2+ cands");
        require(elections[eId].eligibilityRoot!=0,"Missing eligibility root");
        require(block.timestamp<e.endTime,"Ended");
        require(e.endTime-e.startTime>=MIN_ELECTION_WINDOW,"Window too short");
        e.status=Status.ACTIVE;emit ElectionActivated(eId);
    }
    function setEligibilityRoot(uint256 eId,uint256 root) external onlyAdmin electionExists(eId){
        require(elections[eId].status==Status.DRAFT,"Only draft");require(root!=0,"Bad root");
        elections[eId].eligibilityRoot=root;emit EligibilityRootUpdated(eId,root);
    }
    function updateElectionWindow(uint256 eId,uint256 start,uint256 end) external onlyAdmin electionExists(eId){
        require(elections[eId].status==Status.DRAFT,"Only draft");
        require(start<end,"Bad window");
        require(end-start>=MIN_ELECTION_WINDOW,"Window too short");
        elections[eId].startTime=start;
        elections[eId].endTime=end;
        emit ElectionWindowUpdated(eId,start,end);
    }
    function closeElection(uint256 eId) external onlyAdmin electionExists(eId){require(elections[eId].status==Status.ACTIVE||elections[eId].status==Status.PAUSED,"Not open");elections[eId].status=Status.CLOSED;emit ElectionClosed(eId);}
    function pauseElection(uint256 eId) external onlyAdmin electionExists(eId){require(elections[eId].status==Status.ACTIVE,"Not active");elections[eId].status=Status.PAUSED;}
    function resumeElection(uint256 eId) external onlyAdmin electionExists(eId){require(elections[eId].status==Status.PAUSED,"Not paused");require(block.timestamp<elections[eId].endTime,"Ended");elections[eId].status=Status.ACTIVE;}
    function declareResults(uint256 eId) external onlyAdmin electionExists(eId){require(elections[eId].status==Status.CLOSED,"Not closed");elections[eId].status=Status.RESULTS_DECLARED;emit ResultsDeclared(eId);}
    function isElectionActive(uint256 eId) external view returns(bool){Election storage e=elections[eId];return e.status==Status.ACTIVE&&block.timestamp>=e.startTime&&block.timestamp<=e.endTime;}
    function getCandidateCount(uint256 eId) external view returns(uint256){return elections[eId].candidateCount;}
    function getEligibilityRoot(uint256 eId) external view returns(uint256){return elections[eId].eligibilityRoot;}
    function getElection(uint256 eId) external view returns(Election memory){return elections[eId];}
}
