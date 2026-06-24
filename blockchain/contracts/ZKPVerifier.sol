// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
contract ZKPVerifier is Ownable, ReentrancyGuard {
    struct G1Point{uint256 x;uint256 y;}
    struct G2Point{uint256[2] x;uint256[2] y;}
    struct Proof{G1Point a;G2Point b;G1Point c;}
    struct VK{G1Point alpha;G2Point beta;G2Point gamma;G2Point delta;G1Point[] ic;}
    VK private vk;
    bool public vkIsSet;
    uint256 public constant N_PUBLIC=5;
    uint256 constant SF=21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 constant PQ=21888242871839275222246405745257275088696311157297823662689037894645226208583;
    mapping(bytes32=>mapping(uint256=>bool)) public nullifierUsed;
    event VerifyingKeySet(address indexed by,uint256 icLength);
    event NullifierRecorded(bytes32 indexed nullifier,uint256 indexed electionId);
    error VKNotSet();error InvalidICLength();error ProofInvalid();error NullifierAlreadyUsed();
    constructor() Ownable(msg.sender){}
    function setVerifyingKey(uint256[2] calldata a,uint256[2][2] calldata b,uint256[2][2] calldata g,uint256[2][2] calldata d,uint256[2][] calldata ic) external onlyOwner{
        if(ic.length!=N_PUBLIC+1)revert InvalidICLength();
        vk.alpha=G1Point(a[0],a[1]);vk.beta=G2Point(b[0],b[1]);vk.gamma=G2Point(g[0],g[1]);vk.delta=G2Point(d[0],d[1]);
        delete vk.ic;for(uint i=0;i<ic.length;i++)vk.ic.push(G1Point(ic[i][0],ic[i][1]));
        vkIsSet=true;emit VerifyingKeySet(msg.sender,ic.length);
    }
    function verifyVoteProof(uint256[2] calldata pA,uint256[2][2] calldata pB,uint256[2] calldata pC,uint256 commitment,uint256 electionId,uint256 maxCandidates,uint256 nullifier,uint256 eligibilityRoot) external nonReentrant returns(bool){
        if(!vkIsSet)revert VKNotSet();
        bytes32 nh=bytes32(nullifier);
        if(nullifierUsed[nh][electionId])revert NullifierAlreadyUsed();
        uint256[] memory pub=new uint256[](5);pub[0]=commitment;pub[1]=electionId;pub[2]=maxCandidates;pub[3]=nullifier;pub[4]=eligibilityRoot;
        Proof memory proof=Proof(G1Point(pA[0],pA[1]),G2Point(pB[0],pB[1]),G1Point(pC[0],pC[1]));
        if(!_verify(proof,pub))revert ProofInvalid();
        nullifierUsed[nh][electionId]=true;emit NullifierRecorded(nh,electionId);return true;
    }
    function verifyProofView(uint256[2] calldata pA,uint256[2][2] calldata pB,uint256[2] calldata pC,uint256[] calldata pub) external view returns(bool){
        if(!vkIsSet||pub.length!=N_PUBLIC)return false;
        return _verify(Proof(G1Point(pA[0],pA[1]),G2Point(pB[0],pB[1]),G1Point(pC[0],pC[1])),pub);
    }
    function _verify(Proof memory proof,uint256[] memory pub) internal view returns(bool){
        if(!vkIsSet||pub.length+1!=vk.ic.length)return false;
        G1Point memory vkX=G1Point(0,0);vkX=_add(vkX,vk.ic[0]);
        for(uint i=0;i<pub.length;i++){require(pub[i]<SF,"overflow");vkX=_add(vkX,_mul(vk.ic[i+1],pub[i]));}
        return _pairing(proof.a,proof.b,_neg(vk.alpha),vk.beta,_neg(vkX),vk.gamma,_neg(proof.c),vk.delta);
    }
    function _add(G1Point memory p1,G1Point memory p2) internal view returns(G1Point memory r){uint256[4] memory i=[p1.x,p1.y,p2.x,p2.y];bool s;assembly{s:=staticcall(sub(gas(),2000),6,i,0x80,r,0x40)switch s case 0{invalid()}}}
    function _mul(G1Point memory p,uint256 s) internal view returns(G1Point memory r){uint256[3] memory i=[p.x,p.y,s];bool ok;assembly{ok:=staticcall(sub(gas(),2000),7,i,0x60,r,0x40)switch ok case 0{invalid()}}}
    function _neg(G1Point memory p) internal pure returns(G1Point memory){return(p.x==0&&p.y==0)?p:G1Point(p.x,PQ-(p.y%PQ));}
    function _pairing(G1Point memory a1,G2Point memory a2,G1Point memory b1,G2Point memory b2,G1Point memory c1,G2Point memory c2,G1Point memory d1,G2Point memory d2) internal view returns(bool){
        uint256[24] memory i;i[0]=a1.x;i[1]=a1.y;i[2]=a2.x[0];i[3]=a2.x[1];i[4]=a2.y[0];i[5]=a2.y[1];i[6]=b1.x;i[7]=b1.y;i[8]=b2.x[0];i[9]=b2.x[1];i[10]=b2.y[0];i[11]=b2.y[1];i[12]=c1.x;i[13]=c1.y;i[14]=c2.x[0];i[15]=c2.x[1];i[16]=c2.y[0];i[17]=c2.y[1];i[18]=d1.x;i[19]=d1.y;i[20]=d2.x[0];i[21]=d2.x[1];i[22]=d2.y[0];i[23]=d2.y[1];
        uint256[1] memory out;bool s;assembly{s:=staticcall(sub(gas(),2000),8,i,0x300,out,0x20)switch s case 0{invalid()}}return out[0]!=0;
    }
    function getVerifyingKeyStatus() external view returns(bool,uint256){return(vkIsSet,vk.ic.length);}
    function isNullifierUsed(bytes32 n,uint256 eId) external view returns(bool){return nullifierUsed[n][eId];}
}
