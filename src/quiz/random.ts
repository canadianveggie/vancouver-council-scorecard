const SESSION_ORDER_KEY = "vancouver-council-quiz-order"

function shuffled(values: number[]) {
	const result = [...values]
	for (let index = result.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(Math.random() * (index + 1))
		const current = result[index]
		result[index] = result[randomIndex]
		result[randomIndex] = current
	}
	return result
}

function validOrder(value: unknown, length: number): value is number[] {
	return (
		Array.isArray(value) &&
		value.length === length &&
		new Set(value).size === length &&
		value.every((item) => Number.isInteger(item) && item >= 0 && item < length)
	)
}

export function quizOrder(length: number) {
	if (typeof window !== "undefined") {
		try {
			const stored = JSON.parse(
				window.sessionStorage.getItem(SESSION_ORDER_KEY) ?? "null",
			) as unknown
			if (validOrder(stored, length)) return stored
		} catch {
			// Storage may be unavailable in private browsing or during tests.
		}
	}

	const order = shuffled(Array.from({ length }, (_, index) => index))
	if (typeof window !== "undefined") {
		try {
			window.sessionStorage.setItem(SESSION_ORDER_KEY, JSON.stringify(order))
		} catch {
			// The quiz still works if session storage is unavailable.
		}
	}
	return order
}
