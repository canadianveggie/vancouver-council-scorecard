import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Party } from "../data/types"
import { calculatePartyMatches } from "./matching"
import type { QuizIssue } from "./types"

const parties: Party[] = [
	{ id: "onecity", name: "OneCity", logo: null },
	{ id: "abc", name: "ABC", logo: null },
]

const issues: QuizIssue[] = [
	{
		id: "one",
		title: "One",
		category: "Housing",
		context: "",
		argumentFor: "",
		argumentAgainst: "",
		imageUrl: null,
		partyPositions: { onecity: "Support", abc: "Oppose" },
		newsLink: null,
	},
	{
		id: "two",
		title: "Two",
		category: "Housing",
		context: "",
		argumentFor: "",
		argumentAgainst: "",
		imageUrl: null,
		partyPositions: { onecity: "Oppose", abc: "Support" },
		newsLink: null,
	},
]

describe("calculatePartyMatches", () => {
	it("ranks parties by exact issue agreement", () => {
		const matches = calculatePartyMatches(issues, parties, ["S", "S"])
		assert.deepEqual(
			matches.map((match) => [
				match.party.id,
				match.matchedIssues,
				match.percentage,
			]),
			[
				["onecity", 1, 50],
				["abc", 1, 50],
			],
		)
	})

	it("uses party order as a deterministic tie breaker", () => {
		const matches = calculatePartyMatches(issues, parties, ["S", "O"])
		assert.equal(matches[0].party.id, "onecity")
		assert.equal(matches[0].percentage, 100)
	})
})
