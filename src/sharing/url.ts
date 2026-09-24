import type { Vote, VoteOverride, VoteOverrides } from "../data/types"

const stateCodes: Record<string, string> = {
	ignore: "0",
	"fail:1": "1",
	"fail:2": "2",
	"fail:3": "3",
	"pass:1": "4",
	"pass:2": "5",
	"pass:3": "6",
}

function stateCode(override: VoteOverride) {
	if ("ignored" in override) return stateCodes.ignore
	return stateCodes[`${override.desiredOutcome}:${override.weight}`]
}

function overrideFromCode(code: string): VoteOverride | undefined {
	if (code === "0") return { ignored: true }
	if (code >= "1" && code <= "3") {
		return { desiredOutcome: "fail", weight: Number(code) }
	}
	if (code >= "4" && code <= "6") {
		return { desiredOutcome: "pass", weight: Number(code) - 3 }
	}
	return undefined
}

function isDefaultOverride(vote: Vote, override: VoteOverride) {
	return (
		!("ignored" in override) &&
		override.desiredOutcome === vote.desiredOutcome &&
		override.weight === vote.weight
	)
}

export function serializeVoteOverrides(
	votes: Vote[],
	overrides: VoteOverrides,
) {
	const indexWidth = Math.max(1, (votes.length - 1).toString(36).length)
	return Object.entries(overrides)
		.map(([voteId, override]) => {
			const index = votes.findIndex((vote) => vote.id === voteId)
			const code = stateCode(override)
			if (index < 0 || !code || isDefaultOverride(votes[index], override)) {
				return null
			}
			return `${index.toString(36).padStart(indexWidth, "0")}${code}`
		})
		.filter((entry): entry is string => entry !== null)
		.sort()
		.join("")
}

export function parseVoteOverrides(
	votes: Vote[],
	serialized: string | null,
): VoteOverrides {
	if (!serialized) return {}
	const indexWidth = Math.max(1, (votes.length - 1).toString(36).length)
	const chunkWidth = indexWidth + 1
	const overrides: VoteOverrides = {}

	for (
		let offset = 0;
		offset + chunkWidth <= serialized.length;
		offset += chunkWidth
	) {
		const index = Number.parseInt(
			serialized.slice(offset, offset + indexWidth),
			36,
		)
		const override = overrideFromCode(serialized[offset + indexWidth])
		const vote = votes[index]
		if (!vote || !override || isDefaultOverride(vote, override)) continue
		overrides[vote.id] = override
	}

	return overrides
}
