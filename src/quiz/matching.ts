import type { Party } from "../data/types"
import type { PartyPosition, QuizAnswer, QuizIssue } from "./types"

export type PartyMatch = {
	party: Party
	matchedIssues: number
	totalIssues: number
	percentage: number
}

function answerToPosition(answer: QuizAnswer): PartyPosition {
	return answer === "S" ? "Support" : "Oppose"
}

export function calculatePartyMatches(
	issues: QuizIssue[],
	parties: Party[],
	answers: QuizAnswer[],
): PartyMatch[] {
	return parties
		.map((party, partyIndex) => {
			const matchedIssues = issues.reduce(
				(total, issue, issueIndex) =>
					total +
					(issue.partyPositions[party.id] ===
					answerToPosition(answers[issueIndex])
						? 1
						: 0),
				0,
			)
			return {
				party,
				matchedIssues,
				totalIssues: issues.length,
				percentage: issues.length
					? Math.round((matchedIssues / issues.length) * 100)
					: 0,
				partyIndex,
			}
		})
		.sort(
			(left, right) =>
				right.matchedIssues - left.matchedIssues ||
				left.partyIndex - right.partyIndex,
		)
		.map(({ partyIndex: _partyIndex, ...match }) => match)
}
