import type { QuizAnswer } from "./types"

const ANSWER_PATTERN = /^[SO]+$/

export function encodeAnswers(answers: QuizAnswer[]) {
	return answers.join("")
}

export function decodeAnswers(
	serialized: string | null,
	issueCount: number,
): QuizAnswer[] | null {
	if (!serialized || serialized.length !== issueCount) return null
	if (!ANSWER_PATTERN.test(serialized)) return null
	return [...serialized] as QuizAnswer[]
}

export function resultPath(
	partyId: string,
	answers: QuizAnswer[],
	baseUrl: string,
) {
	const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
	return `${normalizedBase}results-${partyId}.html?votes=${encodeAnswers(answers)}`
}
