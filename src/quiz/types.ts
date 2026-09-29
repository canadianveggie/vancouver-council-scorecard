export type QuizAnswer = "S" | "O"
export type PartyPosition = "Support" | "Oppose"

export type QuizImage = {
	src: string
	source: {
		name: string
		url: string
	}
}

export type QuizIssue = {
	id: string
	title: string
	category: string
	context: string
	argumentFor: string
	argumentAgainst: string
	image: QuizImage | null
	partyPositions: Record<string, PartyPosition>
	newsLink: string | null
}

export type QuizData = {
	issues: QuizIssue[]
}
