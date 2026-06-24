// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/access/Ownable.sol";
contract DisputeResolution is Ownable {
    enum Status{FILED,UNDER_REVIEW,UPHELD,DISMISSED}
    struct Dispute{uint256 id;address filer;uint256 electionId;string description;Status status;uint256 createdAt;}
    mapping(uint256=>Dispute) public disputes;uint256 public disputeCount;
    event DisputeFiled(uint256 indexed id,address indexed filer);event DisputeResolved(uint256 indexed id,Status status);
    constructor() Ownable(msg.sender){}
    function fileDispute(uint256 eId,string calldata desc) external returns(uint256){require(eId>0,"Bad election");require(bytes(desc).length>0,"Empty dispute");disputeCount++;disputes[disputeCount]=Dispute(disputeCount,msg.sender,eId,desc,Status.FILED,block.timestamp);emit DisputeFiled(disputeCount,msg.sender);return disputeCount;}
    function resolveDispute(uint256 id,bool upheld,string calldata) external onlyOwner{require(id>0&&id<=disputeCount,"Bad dispute");require(disputes[id].status==Status.FILED||disputes[id].status==Status.UNDER_REVIEW,"Already resolved");disputes[id].status=upheld?Status.UPHELD:Status.DISMISSED;emit DisputeResolved(id,disputes[id].status);}
}
