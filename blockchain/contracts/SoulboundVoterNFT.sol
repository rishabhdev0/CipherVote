// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
contract SoulboundVoterNFT is ERC721, Ownable {
    enum Tier{BRONZE,SILVER,GOLD,PLATINUM}
    struct Credential{uint256 tokenId;uint256 issuedAt;uint256 electionsParticipated;uint256 electionsEligible;Tier tier;bool isRevoked;}
    mapping(address=>Credential) public credentials;mapping(address=>bool) public hasMinted;mapping(address=>bool) public issuers;mapping(address=>bool) public participationRecorders;
    uint256 private _counter;string private _baseURI2;
    event CredentialMinted(address indexed voter,uint256 tokenId);event ParticipationRecorded(address indexed voter,uint256 electionId);event TierUpgraded(address indexed voter,Tier newTier);event IssuerUpdated(address indexed account,bool allowed);event ParticipationRecorderUpdated(address indexed account,bool allowed);
    modifier onlyIssuer(){require(issuers[msg.sender]||msg.sender==owner(),"Not issuer");_;}
    modifier onlyRecorder(){require(participationRecorders[msg.sender]||msg.sender==owner(),"Not recorder");_;}
    constructor() ERC721("CipherVote Voter Credential","CVC") Ownable(msg.sender){issuers[msg.sender]=true;participationRecorders[msg.sender]=true;}
    function setIssuer(address account,bool allowed) external onlyOwner{issuers[account]=allowed;emit IssuerUpdated(account,allowed);}
    function setParticipationRecorder(address account,bool allowed) external onlyOwner{participationRecorders[account]=allowed;emit ParticipationRecorderUpdated(account,allowed);}
    function _update(address to,uint256 id,address auth) internal override returns(address f){f=super._update(to,id,auth);require(f==address(0)||to==address(0),"Soulbound");}
    function mint(address voter) external onlyIssuer returns(uint256){require(!hasMinted[voter],"Already minted");_counter++;_mint(voter,_counter);credentials[voter]=Credential(_counter,block.timestamp,0,0,Tier.BRONZE,false);hasMinted[voter]=true;emit CredentialMinted(voter,_counter);return _counter;}
    function recordParticipation(address voter,uint256 eId,string calldata) external onlyRecorder{require(hasMinted[voter],"No credential");require(!credentials[voter].isRevoked,"Revoked");credentials[voter].electionsParticipated++;_updateTier(voter);emit ParticipationRecorded(voter,eId);}
    function incrementEligibleElections(address voter) external onlyRecorder{if(hasMinted[voter]&&!credentials[voter].isRevoked)credentials[voter].electionsEligible++;}
    function _updateTier(address voter) internal{uint256 p=credentials[voter].electionsParticipated;Tier t=p>=10?Tier.PLATINUM:p>=7?Tier.GOLD:p>=3?Tier.SILVER:Tier.BRONZE;if(t!=credentials[voter].tier){credentials[voter].tier=t;emit TierUpgraded(voter,t);}}
    function getCredential(address voter) external view returns(Credential memory){return credentials[voter];}
    function getTierName(address voter) external view returns(string memory){Tier t=credentials[voter].tier;if(t==Tier.PLATINUM)return"PLATINUM";if(t==Tier.GOLD)return"GOLD";if(t==Tier.SILVER)return"SILVER";return"BRONZE";}
    function tokenURI(uint256 id) public view override returns(string memory){return string(abi.encodePacked(_baseURI2,Strings.toString(id)));}
    function setBaseURI(string calldata uri) external onlyOwner{_baseURI2=uri;}
    function revokeCredential(address voter) external onlyOwner{credentials[voter].isRevoked=true;}
}
