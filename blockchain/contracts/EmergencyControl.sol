// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/access/Ownable.sol";
contract EmergencyControl is Ownable {
    bool public systemPaused;uint256 public anomalyCount;
    mapping(address=>bool) public reporters;
    event SystemPaused(address indexed by,string reason);event SystemResumed(address indexed by);
    event ReporterUpdated(address indexed reporter,bool trusted);
    modifier onlyReporter(){require(reporters[msg.sender],"Not reporter");_;}
    constructor() Ownable(msg.sender){reporters[msg.sender]=true;emit ReporterUpdated(msg.sender,true);}
    function setReporter(address reporter,bool trusted) external onlyOwner{reporters[reporter]=trusted;emit ReporterUpdated(reporter,trusted);}
    function pauseSystem(string calldata reason) external onlyOwner{systemPaused=true;emit SystemPaused(msg.sender,reason);}
    function resumeSystem() external onlyOwner{systemPaused=false;anomalyCount=0;emit SystemResumed(msg.sender);}
    function reportAnomaly() external onlyReporter{anomalyCount++;if(anomalyCount>=10){systemPaused=true;emit SystemPaused(msg.sender,"Auto-pause");}}
}
