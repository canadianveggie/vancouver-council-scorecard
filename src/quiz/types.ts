export type QuizAnswer = "S" | "O"
export type PartyPosition = "Support" | "Oppose"

export type QuizIssue = {
	id: string
	title: string
	category: string
	context: string
	argumentFor: string
	argumentAgainst: string
	imageUrl: string | null
	partyPositions: Record<string, PartyPosition>
	newsLink: string | null
}

export type QuizData = {
	issues: QuizIssue[]
}
