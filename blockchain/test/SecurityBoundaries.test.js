const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("P0 security boundaries", function () {
  it("restricts audit log writes to trusted writers", async function () {
    const [owner, writer, attacker] = await ethers.getSigners();
    const AuditLog = await ethers.getContractFactory("AuditLog");
    const audit = await AuditLog.deploy();
    await audit.waitForDeployment();

    await expect(
      audit
        .connect(attacker)
        .logEvent("VOTE", attacker.address, ethers.ZeroHash, "fake", 4),
    ).to.be.revertedWith("Not trusted writer");

    await expect(audit.setTrustedWriter(writer.address, true)).to.emit(
      audit,
      "WriterUpdated",
    );
    await expect(
      audit
        .connect(writer)
        .logEvent("VOTE", owner.address, ethers.ZeroHash, "ok", 4),
    ).to.emit(audit, "CriticalEventLogged");
  });

  it("restricts emergency anomaly reports to trusted reporters", async function () {
    const [, reporter, attacker] = await ethers.getSigners();
    const EmergencyControl = await ethers.getContractFactory(
      "EmergencyControl",
    );
    const emergency = await EmergencyControl.deploy();
    await emergency.waitForDeployment();

    await expect(
      emergency.connect(attacker).reportAnomaly(),
    ).to.be.revertedWith("Not reporter");
    await expect(emergency.setReporter(reporter.address, true)).to.emit(
      emergency,
      "ReporterUpdated",
    );
    await emergency.connect(reporter).reportAnomaly();
    expect(await emergency.anomalyCount()).to.equal(1);
  });

  it("restricts result snapshots and validates snapshot lengths", async function () {
    const [, attacker] = await ethers.getSigners();
    const ResultTally = await ethers.getContractFactory("ResultTally");
    const tally = await ResultTally.deploy();
    await tally.waitForDeployment();

    await expect(tally.connect(attacker).takeSnapshot(1, [1], [7])).to.be
      .reverted;
    await expect(tally.takeSnapshot(1, [1, 2], [7])).to.be.revertedWith(
      "Length mismatch",
    );
    await expect(tally.takeSnapshot(1, [1, 2], [7, 3])).to.emit(
      tally,
      "SnapshotTaken",
    );
  });

  it("restricts voter registration and verification to verifiers", async function () {
    const [, verifier, voter, attacker] = await ethers.getSigners();
    const VoterRegistry = await ethers.getContractFactory("VoterRegistry");
    const registry = await VoterRegistry.deploy();
    await registry.waitForDeployment();
    const identityHash = ethers.keccak256(ethers.toUtf8Bytes("identity"));

    await expect(
      registry
        .connect(attacker)
        .registerVoter(voter.address, identityHash, "NORTH", 30),
    ).to.be.revertedWith("Not verifier");

    await registry.grantVerifierRole(verifier.address);
    await expect(
      registry
        .connect(verifier)
        .registerVoter(voter.address, identityHash, "NORTH", 30),
    ).to.emit(registry, "VoterRegistered");
    await expect(registry.connect(verifier).verifyVoter(voter.address)).to.emit(
      registry,
      "VoterVerified",
    );
    expect(await registry.isVoterVerified(voter.address)).to.equal(true);
  });

  it("requires relayer authorization before castVoteFor", async function () {
    const [owner, relayer, voter] = await ethers.getSigners();
    const Voting = await ethers.getContractFactory("Voting");
    const voting = await Voting.deploy();
    await voting.waitForDeployment();

    await expect(
      voting.connect(relayer).castVoteFor(
        voter.address,
        1,
        1,
        ethers.ZeroHash,
        0,
        0,
        0,
        [0, 0],
        [
          [0, 0],
          [0, 0],
        ],
        [0, 0],
      ),
    ).to.be.revertedWithCustomError(voting, "NotRelayer");

    await voting.connect(owner).setRelayer(relayer.address, true);
    await expect(
      voting.connect(relayer).castVoteFor(
        voter.address,
        1,
        1,
        ethers.ZeroHash,
        0,
        0,
        0,
        [0, 0],
        [
          [0, 0],
          [0, 0],
        ],
        [0, 0],
      ),
    ).to.emit(voting, "VoteCast");
  });

  it("requires multisig owner membership, unique owners, and valid thresholds", async function () {
    const [owner, other, attacker] = await ethers.getSigners();
    const MultiSig = await ethers.getContractFactory("MultiSig");

    await expect(
      MultiSig.deploy([owner.address, owner.address], 1),
    ).to.be.revertedWith("Bad owner");
    await expect(MultiSig.deploy([owner.address], 2)).to.be.revertedWith(
      "Bad threshold",
    );

    const multiSig = await MultiSig.deploy([owner.address, other.address], 2);
    await multiSig.waitForDeployment();
    await expect(
      multiSig.connect(attacker).submitTx(owner.address, "0x"),
    ).to.be.revertedWith("Not owner");
    await expect(multiSig.connect(owner).submitTx(owner.address, "0x")).to.emit(
      multiSig,
      "TxSubmitted",
    );
    await expect(multiSig.connect(attacker).approveTx(0)).to.be.revertedWith(
      "Not owner",
    );
  });
});
