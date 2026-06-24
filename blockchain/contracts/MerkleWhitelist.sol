// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/access/Ownable.sol";
contract MerkleWhitelist is Ownable {
    mapping(uint256=>bytes32) public merkleRoots;
    event RootUpdated(uint256 indexed electionId,bytes32 root);
    constructor() Ownable(msg.sender){}
    function setMerkleRoot(uint256 eId,bytes32 root) external onlyOwner{merkleRoots[eId]=root;emit RootUpdated(eId,root);}
    function verify(uint256 eId,bytes32 leaf,bytes32[] calldata proof) external view returns(bool){
        bytes32 c=leaf;for(uint i=0;i<proof.length;i++)c=c<proof[i]?keccak256(abi.encodePacked(c,proof[i])):keccak256(abi.encodePacked(proof[i],c));
        return c==merkleRoots[eId];
    }
}