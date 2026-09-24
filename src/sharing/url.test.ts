import assert from "node:assert/strict"
import { test } from "node:test"
import type { Vote } from "../data/types"
import { parseVoteOverrides, serializeVoteOverrides } from "./url"

const votes: Vote[] = [
	{
		id: "housing-1",
		title: "Build homes",
		category: "Housing",
		description: "",
		date: "2024-01-01",
		desiredOutcome: "pass",
		outcome: "pass",
		outcomeDetails: null,
		weight: 1,
		newsUrl: null,
		sourceUrl: null,
		councillorVotes: {},
	},
	{
		id: "safety-1",
		title: "Improve safety",
		category: "Safety",
		description: "",
		date: "2024-01-02",
		desiredOutcome: "fail",
		outcome: "fail",
		outcomeDetails: null,
		weight: 2,
		newsUrl: null,
		sourceUrl: null,
		councillorVotes: {},
	},
]

test("serializes and parses compact vote overrides", () => {
	const overrides = {
		"housing-1": { desiredOutcome: "fail" as const, weight: 3 },
		"safety-1": { ignored: true as const },
	}
	const serialized = serializeVoteOverrides(votes, overrides)

	assert.equal(serialized, "0310")
	assert.deepEqual(parseVoteOverrides(votes, serialized), overrides)
})

test("omits default overrides and ignores malformed entries", () => {
	const serialized = serializeVoteOverrides(votes, {
		"housing-1": { desiredOutcome: "pass", weight: 1 },
	})

	assert.equal(serialized, "")
	assert.deepEqual(parseVoteOverrides(votes, "zz7bad"), {})
})
