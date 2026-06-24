// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/access/Ownable.sol";
contract AuditLog is Ownable {
    struct LogEntry{uint256 id;string eventType;address actor;bytes32 resourceId;string description;uint8 severity;uint256 timestamp;}
    mapping(uint256=>LogEntry) public logs;
    mapping(address=>bool) public trustedWriters;
    uint256 public logCount;
    event EventLogged(uint256 indexed id,string eventType,address indexed actor,uint8 severity);
    event CriticalEventLogged(uint256 indexed id,string eventType,address indexed actor,string description);
    event WriterUpdated(address indexed writer,bool trusted);
    modifier onlyTrustedWriter(){require(trustedWriters[msg.sender],"Not trusted writer");_;}
    constructor() Ownable(msg.sender){trustedWriters[msg.sender]=true;emit WriterUpdated(msg.sender,true);}
    function setTrustedWriter(address writer,bool trusted) external onlyOwner{trustedWriters[writer]=trusted;emit WriterUpdated(writer,trusted);}
    function logEvent(string calldata t,address actor,bytes32 res,string calldata desc,uint8 sev) external onlyTrustedWriter{
        logCount++;logs[logCount]=LogEntry(logCount,t,actor,res,desc,sev,block.timestamp);
        emit EventLogged(logCount,t,actor,sev);
        if(sev>=3)emit CriticalEventLogged(logCount,t,actor,desc);
    }
    function getLog(uint256 id) external view returns(LogEntry memory){return logs[id];}
}
