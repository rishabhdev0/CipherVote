const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Governance and auxiliary contracts", function () {
  it("VoteDelegation validates delegate/election and restricts markUsed", async function () {
    const [owner, delegator, delegate, attacker, voting] =
      await ethers.getSigners();
    const Factory = await ethers.getContractFactory("VoteDelegation");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();

    await expect(
      contract.connect(delegator).createDelegation(ethers.ZeroAddress, 1, 0),
    ).to.be.revertedWith("Bad delegate");
    await expect(
      contract.connect(delegator).createDelegation(delegator.address, 1, 0),
    ).to.be.revertedWith("Self delegation");
    await expect(
      contract.connect(delegator).createDelegation(delegate.address, 0, 0),
    ).to.be.revertedWith("Bad election");

    await expect(
      contract.connect(delegator).createDelegation(delegate.address, 1, 0),
    ).to.emit(contract, "DelegationCreated");
    await expect(contract.connect(attacker).markUsed(1)).to.be.revertedWith(
      "Not trusted voting",
    );
    await contract
      .connect(owner)
      .setTrustedVotingContract(voting.address, true);
    await expect(contract.connect(voting).markUsed(1)).to.emit(
      contract,
      "DelegationUsed",
    );
    await expect(
      contract.connect(delegator).revokeDelegation(1),
    ).to.be.revertedWith("Not active");
  });

  it("VoteDelegation allows only delegator to revoke active delegation", async function () {
    const [, delegator, delegate, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("VoteDelegation");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    await contract.connect(delegator).createDelegation(delegate.address, 1, 0);
    await expect(
      contract.connect(attacker).revokeDelegation(1),
    ).to.be.revertedWith("Not delegator");
    await expect(contract.connect(delegator).revokeDelegation(1)).to.emit(
      contract,
      "DelegationRevoked",
    );
  });

  it("DisputeResolution rejects invalid disputes and only owner resolves", async function () {
    const [, filer, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DisputeResolution");
    const dispute = await Factory.deploy();
    await dispute.waitForDeployment();

    await expect(
      dispute.connect(filer).fileDispute(0, "bad"),
    ).to.be.revertedWith("Bad election");
    await expect(dispute.connect(filer).fileDispute(1, "")).to.be.revertedWith(
      "Empty dispute",
    );
    await expect(dispute.connect(filer).fileDispute(1, "evidence")).to.emit(
      dispute,
      "DisputeFiled",
    );
    await expect(dispute.connect(attacker).resolveDispute(1, true, "done")).to
      .be.reverted;
    await expect(dispute.resolveDispute(2, true, "missing")).to.be.revertedWith(
      "Bad dispute",
    );
    await expect(dispute.resolveDispute(1, true, "done")).to.emit(
      dispute,
      "DisputeResolved",
    );
    await expect(dispute.resolveDispute(1, true, "again")).to.be.revertedWith(
      "Already resolved",
    );
  });

  it("MerkleWhitelist restricts root updates and verifies proofs", async function () {
    const [, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MerkleWhitelist");
    const merkle = await Factory.deploy();
    await merkle.waitForDeployment();
    const leafA = ethers.keccak256(ethers.toUtf8Bytes("a"));
    const leafB = ethers.keccak256(ethers.toUtf8Bytes("b"));
    const root =
      leafA < leafB
        ? ethers.keccak256(ethers.concat([leafA, leafB]))
        : ethers.keccak256(ethers.concat([leafB, leafA]));
    await expect(merkle.connect(attacker).setMerkleRoot(1, root)).to.be
      .reverted;
    await expect(merkle.setMerkleRoot(1, root)).to.emit(merkle, "RootUpdated");
    expect(await merkle.verify(1, leafA, [leafB])).to.equal(true);
  });

  it("ZKPVerifier enforces owner-only key setup and public input shape", async function () {
    const [, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ZKPVerifier");
    const verifier = await Factory.deploy();
    await verifier.waitForDeployment();
    const g1 = [1, 2];
    const g2 = [
      [1, 2],
      [3, 4],
    ];
    await expect(
      verifier
        .connect(attacker)
        .setVerifyingKey(g1, g2, g2, g2, [g1, g1, g1, g1, g1, g1]),
    ).to.be.reverted;
    await expect(
      verifier.setVerifyingKey(g1, g2, g2, g2, [g1]),
    ).to.be.revertedWithCustomError(verifier, "InvalidICLength");
    expect(
      await verifier.verifyProofView(
        [0, 0],
        [
          [0, 0],
          [0, 0],
        ],
        [0, 0],
        [1, 2, 3],
      ),
    ).to.equal(false);
    await expect(
      verifier.verifyVoteProof(
        [0, 0],
        [
          [0, 0],
          [0, 0],
        ],
        [0, 0],
        1,
        1,
        1,
        1,
        999,
      ),
    ).to.be.revertedWithCustomError(verifier, "VKNotSet");
  });
});
