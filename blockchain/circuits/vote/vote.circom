pragma circom 2.0.0;
include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";
template VoteCircuit() {
    signal input commitment; signal input electionId;
    signal input maxCandidates; signal input voterNullifier; signal input eligibilityRoot;
    signal input candidateId; signal input salt; signal input voterSecret;
    signal input merklePathElements[20]; signal input merklePathIndices[20];
    component vh=Poseidon(4);
    vh.inputs[0]<==electionId;vh.inputs[1]<==candidateId;vh.inputs[2]<==salt;vh.inputs[3]<==voterSecret;
    commitment===vh.out;
    component nh=Poseidon(2);nh.inputs[0]<==voterSecret;nh.inputs[1]<==electionId;voterNullifier===nh.out;
    component leaf=Poseidon(2);leaf.inputs[0]<==voterSecret;leaf.inputs[1]<==electionId;
    signal current[21];current[0]<==leaf.out;
    component levels[20];
    signal left[20];signal right[20];
    for(var i=0;i<20;i++){
        merklePathIndices[i]*(merklePathIndices[i]-1)===0;
        left[i]<==current[i]*(1-merklePathIndices[i])+merklePathElements[i]*merklePathIndices[i];
        right[i]<==merklePathElements[i]*(1-merklePathIndices[i])+current[i]*merklePathIndices[i];
        levels[i]=Poseidon(2);
        levels[i].inputs[0]<==left[i];levels[i].inputs[1]<==right[i];
        current[i+1]<==levels[i].out;
    }
    eligibilityRoot===current[20];
    component lb=LessEqThan(32);lb.in[0]<==1;lb.in[1]<==candidateId;lb.out===1;
    component ub=LessEqThan(32);ub.in[0]<==candidateId;ub.in[1]<==maxCandidates;ub.out===1;
    signal ci;ci<--1/candidateId;candidateId*ci===1;
    signal si;si<--1/salt;salt*si===1;
}
component main{public[commitment,electionId,maxCandidates,voterNullifier,eligibilityRoot]}=VoteCircuit();
