import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { decodeAnswers, encodeAnswers, resultPath } from "./url"

describe("quiz URL encoding", () => {
	it("round trips answers", () => {
		const answers = ["S", "O", "S"] as const
		assert.deepEqual(decodeAnswers(encodeAnswers([...answers]), 3), answers)
	})

	it("rejects invalid answers", () => {
		assert.equal(decodeAnswers("SOA", 3), null)
		assert.equal(decodeAnswers("SO", 3), null)
	})

	it("builds a base-aware result path", () => {
		assert.equal(
			resultPath("green", ["S", "O"], "/vancouver-council-scorecard/"),
			"/vancouver-council-scorecard/results-green.html?votes=SO",
		)
	})
})
