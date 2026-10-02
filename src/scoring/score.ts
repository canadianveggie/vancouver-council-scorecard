import type {
	Councillor,
	Outcome,
	Party,
	RecordedVote,
	Vote,
	VoteOverrides,
} from "../data/types"

const baseValues: Record<RecordedVote, number> = {
	Proposed: 2,
	Supported: 1,
	Abstained: 0,
	Absent: NaN,
	Opposed: -1,
	Amended: -2,
}

export type CategoryGrade = {
	category: string
	totalScore: number
	totalWeight: number
	applicableVoteCount: number
	averageScore: number
	letterGrade: string
	voteScores: Record<string, number | null>
}

export type CouncillorScore = {
	councillorId: string
	partyId: string
	totalScore: number
	totalWeight: number
	applicableVoteCount: number
	averageScore: number
	letterGrade: string
	categoryGrades: CategoryGrade[]
}

export type PartyScore = {
	partyId: string
	totalScore: number
	totalWeight: number
	applicableVoteCount: number
	averageScore: number
	letterGrade: string
	councillors: CouncillorScore[]
	categoryGrades: CategoryGrade[]
}

export type ScorecardResults = {
	parties: PartyScore[]
}

export function scoreRecordedVote(
	recordedVote: RecordedVote,
	desiredOutcome: Outcome,
	weight: number,
) {
	const direction = desiredOutcome === "pass" ? 1 : -1
	const weighted = baseValues[recordedVote] * direction * weight
	if (Number.isNaN(weighted)) {
		return null
	}
	return weighted
}

export function gradeForScore(averageScore: number) {
	if (averageScore >= 1) return "A+"
	if (averageScore > 0.9) return "A"
	if (averageScore > 0.75) return "B"
	if (averageScore > 0.4) return "C"
	if (averageScore >= -0.2) return "D"
	return "F"
}

function scoreSummary(
	voteScores: Record<string, number | null>,
	votes: Vote[],
) {
	const scoredVotes = votes.filter(
		(vote) => voteScores[vote.id] !== null && voteScores[vote.id] !== undefined,
	)
	const totalScore = scoredVotes.reduce(
		(sum, vote) => sum + (voteScores[vote.id] ?? 0),
		0,
	)
	const totalWeight = scoredVotes.reduce((sum, vote) => sum + vote.weight, 0)
	return {
		totalScore,
		totalWeight,
		applicableVoteCount: scoredVotes.length,
		averageScore: totalWeight === 0 ? 0 : totalScore / totalWeight,
	}
}

function categoryGrade(
	category: string,
	votes: Vote[],
	voteScores: Record<string, number | null>,
): CategoryGrade {
	const summary = scoreSummary(voteScores, votes)
	return {
		category,
		...summary,
		letterGrade: gradeForScore(summary.averageScore),
		voteScores,
	}
}

function overallAverageScore(categoryGrades: CategoryGrade[]) {
	return categoryGrades.length === 0
		? 0
		: categoryGrades.reduce(
				// Cap best at 1.1 and worst at -0.1 for each category
				(sum, categoryGrade) =>
					sum + Math.max(Math.min(categoryGrade.averageScore, 1.1), -0.1),
				0,
			) / categoryGrades.length
}

function scoreForVote(councillorId: string, vote: Vote) {
	const recordedVote = vote.councillorVotes[councillorId]
	return recordedVote
		? scoreRecordedVote(recordedVote, vote.desiredOutcome, vote.weight)
		: null
}

function votesWithOverrides(votes: Vote[], overrides: VoteOverrides) {
	return votes.flatMap((vote) => {
		const override = overrides[vote.id]
		if (override && "ignored" in override) return []
		if (!override) return [vote]
		return [
			{
				...vote,
				desiredOutcome: override.desiredOutcome,
				weight: override.weight,
			},
		]
	})
}

function scoresForCouncillor(
	councillor: Councillor,
	votes: Vote[],
	categories: string[],
): CouncillorScore {
	const categoryGrades = categories.map((category) => {
		const categoryVotes = votes.filter((vote) => vote.category === category)
		const voteScores = Object.fromEntries(
			categoryVotes.map((vote) => [vote.id, scoreForVote(councillor.id, vote)]),
		)
		return categoryGrade(category, categoryVotes, voteScores)
	})
	const voteScores = Object.fromEntries(
		votes.map((vote) => [vote.id, scoreForVote(councillor.id, vote)]),
	)
	const summary = scoreSummary(voteScores, votes)
	const averageScore = overallAverageScore(categoryGrades)

	return {
		councillorId: councillor.id,
		partyId: councillor.partyId,
		...summary,
		averageScore,
		letterGrade: gradeForScore(averageScore),
		categoryGrades,
	}
}

function averageVoteScores(councillors: CouncillorScore[], vote: Vote) {
	const scores = councillors.map((councillor) => {
		const category = councillor.categoryGrades.find(
			(result) => result.category === vote.category,
		)
		return category?.voteScores[vote.id]
	})
	const recordedScores = scores.filter(
		(score): score is number => score !== null && score !== undefined,
	)
	return recordedScores.length === 0
		? null
		: recordedScores.reduce((sum, score) => sum + score, 0) /
				recordedScores.length
}

function scoresForParty(
	councillors: CouncillorScore[],
	votes: Vote[],
	categories: string[],
	partyId: string,
): PartyScore {
	const categoryGrades = categories.map((category) => {
		const categoryVotes = votes.filter((vote) => vote.category === category)
		const voteScores = Object.fromEntries(
			categoryVotes.map((vote) => [
				vote.id,
				averageVoteScores(councillors, vote),
			]),
		)
		return categoryGrade(category, categoryVotes, voteScores)
	})
	const voteScores = Object.fromEntries(
		votes.map((vote) => [vote.id, averageVoteScores(councillors, vote)]),
	)
	const summary = scoreSummary(voteScores, votes)
	const averageScore = overallAverageScore(categoryGrades)

	return {
		partyId,
		...summary,
		averageScore,
		letterGrade: gradeForScore(averageScore),
		councillors: [...councillors].sort(
			(a, b) =>
				b.averageScore - a.averageScore ||
				a.councillorId.localeCompare(b.councillorId),
		),
		categoryGrades,
	}
}

export function calculateScores(
	votes: Vote[],
	councillors: Councillor[],
	parties: Party[],
	selectedCategories: string[],
	overrides: VoteOverrides = {},
): ScorecardResults {
	const selectedVotes = votesWithOverrides(
		votes.filter((vote) => selectedCategories.includes(vote.category)),
		overrides,
	)
	const councillorScores = councillors.map((councillor) =>
		scoresForCouncillor(councillor, selectedVotes, selectedCategories),
	)

	const partyScores = parties.map((party) =>
		scoresForParty(
			councillorScores.filter((councillor) => councillor.partyId === party.id),
			selectedVotes,
			selectedCategories,
			party.id,
		),
	)

	return {
		parties: partyScores.sort(
			(a, b) =>
				b.averageScore - a.averageScore || a.partyId.localeCompare(b.partyId),
		),
	}
}
