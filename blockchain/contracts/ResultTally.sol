// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/access/Ownable.sol";
contract ResultTally is Ownable {
    struct Snapshot{uint256 electionId;uint256[] candidateIds;uint256[] voteCounts;uint256 totalVotes;uint256 timestamp;}
    mapping(uint256=>Snapshot[]) public snapshots;
    mapping(uint256=>bool) public resultsDeclared;
    mapping(uint256=>uint256) public winnerCandidateId;
    event SnapshotTaken(uint256 indexed electionId,uint256 totalVotes);
    event ResultsDeclared(uint256 indexed electionId,uint256 winner);
    constructor() Ownable(msg.sender){}
    function takeSnapshot(uint256 eId,uint256[] calldata cIds,uint256[] calldata votes) external onlyOwner{
        require(cIds.length==votes.length,"Length mismatch");
        uint256 total=0;for(uint i=0;i<votes.length;i++)total+=votes[i];
        snapshots[eId].push(Snapshot(eId,cIds,votes,total,block.timestamp));
        emit SnapshotTaken(eId,total);
    }
    function declareResults(uint256 eId,uint256 winner) external onlyOwner{resultsDeclared[eId]=true;winnerCandidateId[eId]=winner;emit ResultsDeclared(eId,winner);}
    function getSnapshotCount(uint256 eId) external view returns(uint256){return snapshots[eId].length;}
}
