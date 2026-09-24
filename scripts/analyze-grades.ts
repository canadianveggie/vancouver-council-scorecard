import scorecardJson from "../data/generated/scorecard.json"
import type { ScorecardData } from "../src/data/types"
import { calculateScores, scoreRecordedVote } from "../src/scoring/score"

const data = scorecardJson as ScorecardData
const results = calculateScores(
	data.votes,
	data.councillors,
	data.parties,
	data.categories,
)

function average(values: number[]) {
	return values.length === 0
		? 0
		: values.reduce((sum, value) => sum + value, 0) / values.length
}

function currentCouncillorAverage(
	councillorId: string,
	excludeAbsent: boolean,
) {
	const eligible = data.votes.filter((vote) => {
		const recordedVote = vote.councillorVotes[councillorId]
		return recordedVote && (!excludeAbsent || recordedVote !== "Absent")
	})
	const totalScore = eligible.reduce(
		(sum, vote) =>
			sum +
			scoreRecordedVote(
				// biome-ignore lint/style/noNonNullAssertion: eligble vote guard
				vote.councillorVotes[councillorId]!,
				vote.desiredOutcome,
				vote.weight,
			),
		0,
	)
	const totalWeight = eligible.reduce((sum, vote) => sum + vote.weight, 0)
	return totalWeight === 0 ? 0 : totalScore / totalWeight
}

console.log("Phase 5 grade analysis")
console.log(
	`Dataset: ${data.votes.length} votes, ${data.councillors.length} councillors, ${data.parties.length} parties`,
)
console.log(
	"\nFixed thresholds: A+ > 1, A > 0.9, B > 0.75, C > 0.4, D >= 0, F < 0",
)

console.log("\nParty ranges by category (weighted average score)")
for (const category of data.categories) {
	const scores = results.parties.map(
		(party) =>
			party.categoryGrades.find((grade) => grade.category === category)
				?.averageScore ?? 0,
	)
	console.log(
		`  ${category.padEnd(16)} ${Math.min(...scores).toFixed(2)} to ${Math.max(...scores).toFixed(2)}; midpoint ${average(scores).toFixed(2)}`,
	)
}

console.log("\nParty size and totals (all categories selected)")
for (const party of results.parties) {
	console.log(
		`  ${party.partyId.padEnd(16)} ${party.councillors.length} councillors; ${party.letterGrade}; average ${party.averageScore.toFixed(2)}; total ${party.totalScore.toFixed(2)} over ${party.applicableVoteCount} applicable votes`,
	)
}

const absenceDeltas = data.councillors
	.map((councillor) => ({
		name: councillor.name,
		current: currentCouncillorAverage(councillor.id, false),
		withoutAbsences: currentCouncillorAverage(councillor.id, true),
	}))
	.sort(
		(a, b) =>
			Math.abs(b.withoutAbsences - b.current) -
			Math.abs(a.withoutAbsences - a.current),
	)

console.log(
	"\nLargest average-score changes when Absent is excluded from the denominator",
)
for (const result of absenceDeltas.slice(0, 5)) {
	console.log(
		`  ${result.name.padEnd(24)} ${result.current.toFixed(2)} -> ${result.withoutAbsences.toFixed(2)}`,
	)
}

console.log("\nNormalized comparison")
console.log(
	"  A min-max normalized score would make each party relative to the other parties in that category; it is not used by the initial report card.",
)
