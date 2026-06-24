const crypto = require("crypto");
const prisma = require("../config/database");
const { poseidonHash, voterSecretFor } = require("./zkp.proof.service");
const { recordEligibility } = require("./nft.credential.service");

function hexToField(hex) {
  return BigInt(
    "0x" + crypto.createHash("sha256").update(String(hex)).digest("hex"),
  ).toString();
}

async function leafFor({ electionId, voter }) {
  const secret = await voterSecretFor(voter);
  return String(await poseidonHash([hexToField(electionId), secret]));
}

async function buildMerkleTree(leaves) {
  let levels = [leaves.map(String)];
  if (levels[0].length === 0) return { root: null, paths: {} };
  while (levels.at(-1).length > 1) {
    const prev = levels.at(-1),
      next = [];
    for (let i = 0; i < prev.length; i += 2) {
      const left = prev[i],
        right = prev[i + 1] || prev[i];
      next.push(String(await poseidonHash([left, right])));
    }
    levels.push(next);
  }
  const paths = {};
  for (let i = 0; i < levels[0].length; i++) {
    const elements = [],
      indices = [];
    let index = i;
    for (let level = 0; level < levels.length - 1; level++) {
      const sibling = index % 2 === 0 ? index + 1 : index - 1;
      elements.push(levels[level][sibling] || levels[level][index]);
      indices.push(index % 2);
      index = Math.floor(index / 2);
    }
    while (elements.length < 20) {
      elements.push("0");
      indices.push(0);
    }
    paths[levels[0][i]] = {
      merklePathElements: elements.slice(0, 20),
      merklePathIndices: indices.slice(0, 20),
    };
  }
  return { root: levels.at(-1)[0], paths };
}

async function rebuildElectionEligibility(electionId) {
  const election = await prisma.election.findUnique({
    where: { id: electionId },
  });
  if (!election) throw new Error("Election not found");
  if (election.status !== "DRAFT")
    throw new Error(
      "Eligibility root can only be rebuilt while election is DRAFT",
    );
  const selectedCount = await prisma.electionVoterSelection.count({
    where: { electionId, status: "SELECTED" },
  });
  const voters =
    selectedCount > 0
      ? (
          await prisma.electionVoterSelection.findMany({
            where: { electionId, status: "SELECTED" },
            include: { voter: true },
            orderBy: { voterId: "asc" },
          })
        )
          .map((row) => row.voter)
          .filter(
            (v) =>
              v.status === "VERIFIED" &&
              !v.isBlacklisted &&
              v.faceVerified &&
              v.idVerified &&
              v.livenessVerified &&
              (election.constituency === "ALL" ||
                v.constituency === election.constituency),
          )
      : await prisma.voter.findMany({
          where: {
            status: "VERIFIED",
            isBlacklisted: false,
            faceVerified: true,
            idVerified: true,
            livenessVerified: true,
            OR: [
              { constituency: election.constituency },
              { constituency: "ALL" },
            ],
          },
          orderBy: { id: "asc" },
        });
  const rows = [];
  for (const voter of voters) {
    const leaf = await leafFor({ electionId, voter });
    const commitment = crypto
      .createHash("sha256")
      .update(`${electionId}:${leaf}`)
      .digest("hex");
    rows.push({ voter, leaf, commitment });
  }
  const tree = await buildMerkleTree(rows.map((r) => r.leaf));
  await prisma.$transaction(async (tx) => {
    await tx.eligibilityCommitment.deleteMany({ where: { electionId } });
    for (const row of rows) {
      await tx.eligibilityCommitment.create({
        data: {
          electionId,
          voterId: row.voter.id,
          leaf: row.leaf,
          commitment: row.commitment,
          merklePath: tree.paths[row.leaf] || null,
        },
      });
    }
    await tx.election.update({
      where: { id: electionId },
      data: { merkleRoot: tree.root, totalRegistered: rows.length },
    });
  });
  return {
    electionId,
    merkleRoot: tree.root,
    eligibleVoters: rows.length,
    selectionMode:
      selectedCount > 0 ? "EXPLICIT_EC_ROLL" : "ALL_VERIFIED_IN_CONSTITUENCY",
  };
}

async function getVoterEligibilityPackage({ electionId, voterId }) {
  const record = await prisma.eligibilityCommitment.findUnique({
    where: { electionId_voterId: { electionId, voterId } },
  });
  if (!record || record.revokedAt)
    throw new Error("Eligibility commitment not issued");
  return {
    commitment: record.commitment,
    leaf: record.leaf,
    merklePath: record.merklePath,
    issuedAt: record.issuedAt,
  };
}

async function listElectionRoll({
  electionId,
  status,
  page = 1,
  limit = 25,
  search,
}) {
  const where = { electionId };
  if (status) where.status = status;
  if (search)
    where.voter = {
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { voterIdNumber: { contains: search, mode: "insensitive" } },
        { walletAddress: { contains: search, mode: "insensitive" } },
      ],
    };
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);
  const [data, total] = await Promise.all([
    prisma.electionVoterSelection.findMany({
      where,
      skip,
      take,
      include: {
        voter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            constituency: true,
            voterIdNumber: true,
            status: true,
            faceVerified: true,
            idVerified: true,
            livenessVerified: true,
            isBlacklisted: true,
            registeredAt: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.electionVoterSelection.count({ where }),
  ]);
  return { data, total, pages: Math.ceil(total / take), page: Number(page) };
}

async function listSelectableVoters({
  electionId,
  page = 1,
  limit = 25,
  search,
  status = "VERIFIED",
}) {
  const election = await prisma.election.findUnique({
    where: { id: electionId },
  });
  if (!election) throw new Error("Election not found");
  const selected = await prisma.electionVoterSelection.findMany({
    where: { electionId },
    select: { voterId: true, status: true, reason: true },
  });
  const byVoter = new Map(
    selected.map((row) => [
      row.voterId,
      { status: row.status, reason: row.reason },
    ]),
  );
  const where = {
    status,
    isBlacklisted: false,
    OR: [{ constituency: election.constituency }, { constituency: "ALL" }],
  };
  if (search)
    where.AND = [
      {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { voterIdNumber: { contains: search, mode: "insensitive" } },
          { walletAddress: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);
  const [voters, total] = await Promise.all([
    prisma.voter.findMany({
      where,
      skip,
      take,
      orderBy: { registeredAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        constituency: true,
        voterIdNumber: true,
        status: true,
        faceVerified: true,
        idVerified: true,
        livenessVerified: true,
        isBlacklisted: true,
        registeredAt: true,
      },
    }),
    prisma.voter.count({ where }),
  ]);
  return {
    data: voters.map((v) => ({
      ...v,
      electionSelection: byVoter.get(v.id) || null,
      identityComplete: v.faceVerified && v.idVerified && v.livenessVerified,
    })),
    total,
    pages: Math.ceil(total / take),
    page: Number(page),
  };
}

async function setElectionVoterSelection({
  electionId,
  voterId,
  status,
  userId,
  reason,
}) {
  const election = await prisma.election.findUnique({
    where: { id: electionId },
  });
  if (!election) throw new Error("Election not found");
  if (election.status !== "DRAFT")
    throw new Error(
      "Election roll can only be changed while election is DRAFT",
    );
  const voter = await prisma.voter.findUnique({ where: { id: voterId } });
  if (!voter) throw new Error("Voter not found");
  if (
    !(
      election.constituency === "ALL" ||
      voter.constituency === election.constituency
    )
  )
    throw new Error("Voter is outside election constituency");
  if (
    status === "SELECTED" &&
    (voter.status !== "VERIFIED" ||
      voter.isBlacklisted ||
      !voter.faceVerified ||
      !voter.idVerified ||
      !voter.livenessVerified)
  )
    throw new Error(
      "Only fully verified non-blacklisted voters can be selected",
    );
  const now = new Date();
  const data = { status, reason: reason || null };
  if (status === "SELECTED")
    Object.assign(data, {
      selectedById: userId,
      selectedAt: now,
      rejectedById: null,
      rejectedAt: null,
      revokedById: null,
      revokedAt: null,
    });
  if (status === "REJECTED")
    Object.assign(data, { rejectedById: userId, rejectedAt: now });
  if (status === "REVOKED")
    Object.assign(data, { revokedById: userId, revokedAt: now });
  const row = await prisma.electionVoterSelection.upsert({
    where: { electionId_voterId: { electionId, voterId } },
    create: { electionId, voterId, ...data },
    update: data,
    include: {
      voter: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          constituency: true,
          voterIdNumber: true,
          status: true,
        },
      },
    },
  });
  await prisma.eligibilityCommitment.deleteMany({
    where: { electionId, voterId },
  });
  await prisma.election.update({
    where: { id: electionId },
    data: {
      merkleRoot: null,
      totalRegistered: await prisma.electionVoterSelection.count({
        where: { electionId, status: "SELECTED" },
      }),
    },
  });
  if (status === "SELECTED") await recordEligibility(voterId);
  return row;
}

module.exports = {
  rebuildElectionEligibility,
  getVoterEligibilityPackage,
  buildMerkleTree,
  leafFor,
  listElectionRoll,
  listSelectableVoters,
  setElectionVoterSelection,
};
