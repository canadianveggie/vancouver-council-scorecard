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

export function quizOrder(length: number) {
	return shuffled(Array.from({ length }, (_, index) => index))
}
