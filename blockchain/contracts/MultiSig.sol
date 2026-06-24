// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract MultiSig {
    address[] public owners;mapping(address=>bool) public isOwner;uint256 public required;
    struct Tx{address to;bytes data;bool executed;uint256 approvals;}
    Tx[] public transactions;mapping(uint256=>mapping(address=>bool)) public approved;
    event TxSubmitted(uint256 indexed id,address indexed by,address indexed to);event TxApproved(uint256 indexed id,address indexed by);event TxExecuted(uint256 indexed id);
    modifier onlyOwner(){require(isOwner[msg.sender],"Not owner");_;}
    constructor(address[] memory _owners,uint256 _required){require(_owners.length>0,"No owners");require(_required>0&&_required<=_owners.length,"Bad threshold");for(uint i=0;i<_owners.length;i++){require(_owners[i]!=address(0)&&!isOwner[_owners[i]],"Bad owner");isOwner[_owners[i]]=true;owners.push(_owners[i]);}required=_required;}
    function submitTx(address to,bytes calldata data) external onlyOwner returns(uint256){require(to!=address(0),"Bad target");transactions.push(Tx(to,data,false,0));emit TxSubmitted(transactions.length-1,msg.sender,to);return transactions.length-1;}
    function approveTx(uint256 id) external onlyOwner{require(id<transactions.length,"Bad tx");require(!approved[id][msg.sender],"Already approved");approved[id][msg.sender]=true;transactions[id].approvals++;emit TxApproved(id,msg.sender);if(transactions[id].approvals>=required)_execute(id);}
    function _execute(uint256 id) internal{Tx storage t=transactions[id];require(!t.executed,"Executed");t.executed=true;(bool s,)=t.to.call(t.data);require(s,"Call failed");emit TxExecuted(id);}
}
