import assert from "node:assert/strict"
import { test } from "node:test"
import type { Councillor, Party, Vote } from "../data/types"
import { calculateScores, gradeForScore, scoreRecordedVote } from "./score"

const parties: Party[] = [
	{ id: "abc", name: "ABC", logo: null },
	{ id: "green", name: "Green", logo: null },
]

const councillors: Councillor[] = [
	{ id: "alice", name: "Alice", partyId: "abc" },
	{ id: "bob", name: "Bob", partyId: "green" },
	{ id: "newcomer", name: "Newcomer", partyId: "abc" },
]

const votes: Vote[] = [
	{
		id: "housing-1",
		title: "Build homes",
		category: "Housing",
		date: "2024-01-01",
		desiredOutcome: "pass",
		outcome: "Passed",
		outcomeDetails: null,
		weight: 2,
		sourceUrl: null,
		councillorVotes: { alice: "Proposed", bob: "Opposed", newcomer: null },
	},
	{
		id: "safety-1",
		title: "Improve safety",
		category: "Safety",
		date: "2024-02-01",
		desiredOutcome: "fail",
		outcome: "Failed",
		outcomeDetails: null,
		weight: 1,
		sourceUrl: null,
		councillorVotes: {
			alice: "Supported",
			bob: "Absent",
			newcomer: "Abstained",
		},
	},
]

test("scores a vote using direction and weight", () => {
	assert.equal(scoreRecordedVote("Proposed", "pass", 2), 4)
	assert.equal(scoreRecordedVote("Supported", "fail", 3), -3)
	assert.equal(scoreRecordedVote("Amended", "fail", 1), 2)
})

test("calculates councillor and party grades", () => {
	const results = calculateScores(votes, councillors, parties, [
		"Housing",
		"Safety",
	])
	const abc = results.parties.find((party) => party.partyId === "abc")!
	const alice = abc.councillors.find(
		(councillor) => councillor.councillorId === "alice",
	)!
	const bob = results.parties.find((party) => party.partyId === "green")
		?.councillors[0]
	const newcomer = abc.councillors.find(
		(councillor) => councillor.councillorId === "newcomer",
	)!

	assert.equal(alice.letterGrade, "A")
	assert.equal(
		alice.categoryGrades.find((category) => category.category === "Housing")
			?.letterGrade,
		"A+",
	)
	assert.equal(
		alice.categoryGrades.find((category) => category.category === "Housing")
			?.voteScores["housing-1"],
		4,
	)
	assert.equal(bob.letterGrade, "F")
	assert.equal(
		newcomer.categoryGrades.find((category) => category.category === "Housing")
			?.voteScores["housing-1"],
		null,
	)

	assert.equal(abc.letterGrade, "A+")
	assert.equal(
		results.parties.find((party) => party.partyId === "green")?.letterGrade,
		"F",
	)
})

test("only includes votes from selected categories", () => {
	const results = calculateScores(votes, councillors, parties, ["Housing"])
	assert.equal(
		results.parties.find((party) => party.partyId === "abc")?.councillors[0]
			.letterGrade,
		"A+",
	)
})

test("ranks parties and councillors by average score", () => {
	const results = calculateScores(votes, councillors, parties, [
		"Housing",
		"Safety",
	])
	assert.deepEqual(
		results.parties.map((party) => party.partyId),
		["abc", "green"],
	)
	assert.deepEqual(
		results.parties[0].councillors.map((councillor) => councillor.councillorId),
		["alice", "newcomer"],
	)
})

test("uses documented fixed grade boundaries", () => {
	assert.equal(gradeForScore(1.01), "A+")
	assert.equal(gradeForScore(1), "A")
	assert.equal(gradeForScore(0.9), "B")
	assert.equal(gradeForScore(0.75), "C")
	assert.equal(gradeForScore(0.4), "D")
	assert.equal(gradeForScore(-0.01), "D")
	assert.equal(gradeForScore(-0.21), "F")
})
