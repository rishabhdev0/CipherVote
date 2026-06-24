const { expect } = require("chai");
const { ethers } = require("hardhat");

const PROOF_A = [0, 0];
const PROOF_B = [
  [0, 0],
  [0, 0],
];
const PROOF_C = [0, 0];
const SALT = ethers.keccak256(ethers.toUtf8Bytes("salt"));
const BALLOT_COMMITMENT = ethers.keccak256(ethers.toUtf8Bytes("encrypted-ballot"));
const ROOT = 999;

describe("Voting integrity controls", function () {
  async function deployFixture() {
    const [owner, relayer, voter, outsider] = await ethers.getSigners();
    const Voting = await ethers.getContractFactory("Voting");
    const ElectionManager = await ethers.getContractFactory(
      "MockElectionManager",
    );
    const VoterRegistry = await ethers.getContractFactory("MockVoterRegistry");
    const EmergencyControl = await ethers.getContractFactory(
      "MockEmergencyControl",
    );
    const ZKPVerifier = await ethers.getContractFactory("MockZKPVerifier");

    const voting = await Voting.deploy();
    const electionManager = await ElectionManager.deploy();
    const voterRegistry = await VoterRegistry.deploy();
    const emergency = await EmergencyControl.deploy();
    const zkp = await ZKPVerifier.deploy();
    await Promise.all([
      voting.waitForDeployment(),
      electionManager.waitForDeployment(),
      voterRegistry.waitForDeployment(),
      emergency.waitForDeployment(),
      zkp.waitForDeployment(),
    ]);

    await voting.initialize(
      await zkp.getAddress(),
      await electionManager.getAddress(),
      await voterRegistry.getAddress(),
      await emergency.getAddress(),
    );
    await voting.setRelayer(relayer.address, true);
    await voterRegistry.setVerified(voter.address, true);

    return {
      owner,
      relayer,
      voter,
      outsider,
      voting,
      electionManager,
      voterRegistry,
      emergency,
      zkp,
    };
  }

  it("makes initialize callable only once", async function () {
    const { voting, zkp, electionManager, voterRegistry, emergency } =
      await deployFixture();
    await expect(
      voting.initialize(
        await zkp.getAddress(),
        await electionManager.getAddress(),
        await voterRegistry.getAddress(),
        await emergency.getAddress(),
      ),
    ).to.be.revertedWithCustomError(voting, "AlreadyInitialized");
  });

  it("rejects relayed voting from non-relayers", async function () {
    const { voting, outsider, voter } = await deployFixture();
    await expect(
      voting
        .connect(outsider)
        .castVoteFor(
          voter.address,
          1,
          1,
          SALT,
          0,
          0,
          ROOT,
          PROOF_A,
          PROOF_B,
          PROOF_C,
        ),
    ).to.be.revertedWithCustomError(voting, "NotRelayer");
  });

  it("rejects inactive elections", async function () {
    const { voting, relayer, voter, electionManager } = await deployFixture();
    await electionManager.setActive(false);
    await expect(
      voting
        .connect(relayer)
        .castVoteFor(
          voter.address,
          1,
          1,
          SALT,
          0,
          0,
          ROOT,
          PROOF_A,
          PROOF_B,
          PROOF_C,
        ),
    ).to.be.revertedWithCustomError(voting, "ElectionInactive");
  });

  it("rejects unverified voters", async function () {
    const { voting, relayer, voter, voterRegistry } = await deployFixture();
    await voterRegistry.setVerified(voter.address, false);
    await expect(
      voting
        .connect(relayer)
        .castVoteFor(
          voter.address,
          1,
          1,
          SALT,
          0,
          0,
          ROOT,
          PROOF_A,
          PROOF_B,
          PROOF_C,
        ),
    ).to.be.revertedWithCustomError(voting, "VoterNotVerified");
  });

  it("rejects candidate ids outside the election candidate count", async function () {
    const { voting, relayer, voter, electionManager } = await deployFixture();
    await electionManager.setCandidateCount(2);
    await expect(
      voting
        .connect(relayer)
        .castVoteFor(
          voter.address,
          1,
          3,
          SALT,
          0,
          0,
          ROOT,
          PROOF_A,
          PROOF_B,
          PROOF_C,
        ),
    ).to.be.revertedWithCustomError(voting, "InvalidCandidate");
  });

  it("rejects voting while emergency paused", async function () {
    const { voting, relayer, voter, emergency } = await deployFixture();
    await emergency.setPaused(true);
    await expect(
      voting
        .connect(relayer)
        .castVoteFor(
          voter.address,
          1,
          1,
          SALT,
          0,
          0,
          ROOT,
          PROOF_A,
          PROOF_B,
          PROOF_C,
        ),
    ).to.be.revertedWithCustomError(voting, "SystemPaused");
  });

  it("emits VoteCast and blocks duplicate votes", async function () {
    const { voting, relayer, voter } = await deployFixture();
    await expect(
      voting
        .connect(relayer)
        .castVoteFor(
          voter.address,
          1,
          1,
          SALT,
          0,
          0,
          ROOT,
          PROOF_A,
          PROOF_B,
          PROOF_C,
        ),
    ).to.emit(voting, "VoteCast");
    await expect(
      voting
        .connect(relayer)
        .castVoteFor(
          voter.address,
          1,
          2,
          ethers.keccak256(ethers.toUtf8Bytes("second")),
          0,
          0,
          ROOT,
          PROOF_A,
          PROOF_B,
          PROOF_C,
        ),
    ).to.be.revertedWithCustomError(voting, "AlreadyVoted");
  });

  it("blocks nullifier reuse across voters", async function () {
    const { voting, relayer, voter, outsider, voterRegistry } =
      await deployFixture();
    await voterRegistry.setVerified(outsider.address, true);
    await voting
      .connect(relayer)
      .castVoteFor(
        voter.address,
        1,
        1,
        SALT,
        0,
        123,
        ROOT,
        PROOF_A,
        PROOF_B,
        PROOF_C,
      );
    await expect(
      voting
        .connect(relayer)
        .castVoteFor(
          outsider.address,
          1,
          2,
          ethers.keccak256(ethers.toUtf8Bytes("other")),
          0,
          123,
          ROOT,
          PROOF_A,
          PROOF_B,
          PROOF_C,
        ),
    ).to.be.revertedWithCustomError(voting, "NullifierReused");
  });

  it("decodes the ZKP verifier return value and rejects false", async function () {
    const { voting, relayer, voter, zkp } = await deployFixture();
    await voting.setZKPRequired(true);
    await zkp.setValid(false);
    await expect(
      voting
        .connect(relayer)
        .castVoteFor(
          voter.address,
          1,
          1,
          SALT,
          111,
          222,
          ROOT,
          PROOF_A,
          PROOF_B,
          PROOF_C,
        ),
    ).to.be.revertedWithCustomError(voting, "ZKPVerificationFailed");
  });

  it("sets zkpVerified only after verifier returns true", async function () {
    const { voting, relayer, voter } = await deployFixture();
    await voting.setZKPRequired(true);
    await expect(
      voting
        .connect(relayer)
        .castVoteFor(
          voter.address,
          1,
          1,
          SALT,
          111,
          222,
          ROOT,
          PROOF_A,
          PROOF_B,
          PROOF_C,
        ),
    ).to.emit(voting, "VoteCast");
    expect(await voting.getTotalVotes(1)).to.equal(1);
  });

  it("accepts encrypted ballots on-chain without revealing candidate counts", async function () {
    const { voting, relayer, voter } = await deployFixture();
    await expect(
      voting
        .connect(relayer)
        .castEncryptedBallotFor(
          voter.address,
          1,
          BALLOT_COMMITMENT,
          456,
          ROOT,
          0,
          PROOF_A,
          PROOF_B,
          PROOF_C,
        ),
    ).to.emit(voting, "EncryptedBallotCast");
    expect(await voting.getTotalVotes(1)).to.equal(1);
    expect(await voting.getCandidateVotes(1, 1)).to.equal(0);
    expect(await voting.voterHasVoted(voter.address, 1)).to.equal(true);
  });

  it("blocks duplicate encrypted ballots and reused encrypted nullifiers", async function () {
    const { voting, relayer, voter, outsider, voterRegistry } =
      await deployFixture();
    await voterRegistry.setVerified(outsider.address, true);
    await voting
      .connect(relayer)
      .castEncryptedBallotFor(
        voter.address,
        1,
        BALLOT_COMMITMENT,
        789,
        ROOT,
        0,
        PROOF_A,
        PROOF_B,
        PROOF_C,
      );
    await expect(
      voting
        .connect(relayer)
        .castEncryptedBallotFor(
          voter.address,
          1,
          ethers.keccak256(ethers.toUtf8Bytes("second-ballot")),
          790,
          ROOT,
          0,
          PROOF_A,
          PROOF_B,
          PROOF_C,
        ),
    ).to.be.revertedWithCustomError(voting, "AlreadyVoted");
    await expect(
      voting
        .connect(relayer)
        .castEncryptedBallotFor(
          outsider.address,
          1,
          ethers.keccak256(ethers.toUtf8Bytes("outsider-ballot")),
          789,
          ROOT,
          0,
          PROOF_A,
          PROOF_B,
          PROOF_C,
        ),
    ).to.be.revertedWithCustomError(voting, "NullifierReused");
  });
});
