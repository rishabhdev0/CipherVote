const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SoulboundVoterNFT", function () {
  it("mints a credential and blocks transfers", async function () {
    const [owner, voter, receiver] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SoulboundVoterNFT");
    const nft = await Factory.deploy();
    await nft.waitForDeployment();

    await expect(nft.mint(voter.address)).to.emit(nft, "CredentialMinted");
    expect(await nft.ownerOf(1)).to.equal(voter.address);

    await expect(
      nft.connect(voter).transferFrom(voter.address, receiver.address, 1),
    ).to.be.revertedWith("Soulbound");
  });

  it("role-gates minting and participation recording", async function () {
    const [owner, issuer, recorder, voter, attacker] =
      await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SoulboundVoterNFT");
    const nft = await Factory.deploy();
    await nft.waitForDeployment();

    await expect(nft.connect(attacker).mint(voter.address)).to.be.revertedWith(
      "Not issuer",
    );
    await expect(nft.setIssuer(issuer.address, true)).to.emit(
      nft,
      "IssuerUpdated",
    );
    await expect(nft.connect(issuer).mint(voter.address)).to.emit(
      nft,
      "CredentialMinted",
    );

    await expect(
      nft.connect(attacker).recordParticipation(voter.address, 1, "0x"),
    ).to.be.revertedWith("Not recorder");
    await expect(nft.setParticipationRecorder(recorder.address, true)).to.emit(
      nft,
      "ParticipationRecorderUpdated",
    );
    await expect(
      nft.connect(recorder).recordParticipation(voter.address, 1, "0x"),
    ).to.emit(nft, "ParticipationRecorded");

    await expect(
      nft.connect(attacker).incrementEligibleElections(voter.address),
    ).to.be.revertedWith("Not recorder");
    await nft.connect(recorder).incrementEligibleElections(voter.address);
    const credential = await nft.getCredential(voter.address);
    expect(credential.electionsEligible).to.equal(1);
  });
});
