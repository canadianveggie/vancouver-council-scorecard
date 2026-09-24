import type { Dispatch, SetStateAction } from "react"
import { useEffect, useState } from "react"
import scorecardJson from "../data/generated/scorecard.json"
import type {
	ScorecardData,
	Vote,
	VoteOverride,
	VoteOverrides,
} from "./data/types"
import {
	type CategoryGrade,
	type CouncillorScore,
	calculateScores,
	type PartyScore,
} from "./scoring/score"

const data = scorecardJson as ScorecardData

const categoryDescriptions: Record<string, string> = {
	Housing: "Homes, density, and neighbourhood plans.",
	Transportation: "How people move around the city.",
	Environment: "Climate action and resilient communities.",
	Safety: "Vision Zero and public safety.",
	Affordability: "The cost of living in Vancouver.",
	Governance: "Integrity, accountability, and democracy.",
}

function formatScore(score: number | null) {
	if (score === null) return "—"
	const roundedScore = Math.round(score)
	return roundedScore > 0 ? `+${roundedScore}` : `${roundedScore}`
}

function scoreClass(score: number | null) {
	if (score === null) return "score-muted"
	return score >= 0 ? "score-positive" : "score-negative"
}

function gradeClass(grade: string) {
	return `grade-${grade.toLowerCase().replace("+", "-plus")}`
}

function partyGroupClasses(index: number, count: number) {
	return [
		index === 0 ? "party-group-start" : "",
		index === count - 1 ? "party-group-end" : "",
	]
		.filter(Boolean)
		.join(" ")
}

function selectedVotesForCategory(category: string) {
	return data.votes.filter((vote) => vote.category === category)
}

function categoryResult(
	score: PartyScore | CouncillorScore,
	category: string,
): CategoryGrade | undefined {
	return score.categoryGrades.find((result) => result.category === category)
}

function formatOverallGrade(score: PartyScore | CouncillorScore) {
	return score.letterGrade
}

function councillorInitials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.map((part) => part[0])
		.join("")
		.toUpperCase()
}

const overrideOptions: Array<{
	label: string
	description: string
	override: VoteOverride
}> = [
	{
		label: "-3",
		description: "Want this vote to fail, weight 3",
		override: { desiredOutcome: "fail", weight: 3 },
	},
	{
		label: "-2",
		description: "Want this vote to fail, weight 2",
		override: { desiredOutcome: "fail", weight: 2 },
	},
	{
		label: "👎",
		description: "Want this vote to fail, weight 1",
		override: { desiredOutcome: "fail", weight: 1 },
	},
	{ label: "🚫", description: "Ignore this vote", override: { ignored: true } },
	{
		label: "👍",
		description: "Want this vote to pass, weight 1",
		override: { desiredOutcome: "pass", weight: 1 },
	},
	{
		label: "+2",
		description: "Want this vote to pass, weight 2",
		override: { desiredOutcome: "pass", weight: 2 },
	},
	{
		label: "+3",
		description: "Want this vote to pass, weight 3",
		override: { desiredOutcome: "pass", weight: 3 },
	},
]

function overridesMatch(left: VoteOverride, right: VoteOverride) {
	if ("ignored" in left || "ignored" in right) {
		return "ignored" in left && "ignored" in right
	}
	return (
		left.desiredOutcome === right.desiredOutcome && left.weight === right.weight
	)
}

function VoteOverrideControl({
	vote,
	overrides,
	setOverrides,
}: {
	vote: Vote
	overrides: VoteOverrides
	setOverrides: Dispatch<SetStateAction<VoteOverrides>>
}) {
	const activeOverride = overrides[vote.id]
	const [open, setOpen] = useState(false)
	const defaultOverride: VoteOverride = {
		desiredOutcome: vote.desiredOutcome,
		weight: vote.weight,
	}
	const selectedOverride = activeOverride ?? defaultOverride
	const selectedOption =
		overrideOptions.find((option) =>
			overridesMatch(selectedOverride, option.override),
		) ?? overrideOptions[3]

	function selectOverride(nextOverride: VoteOverride) {
		setOverrides((current) => {
			const next = { ...current }
			if (overridesMatch(nextOverride, defaultOverride)) delete next[vote.id]
			else next[vote.id] = nextOverride
			return next
		})
		setOpen(false)
	}

	return (
		<div
			aria-label={`Set preference for ${vote.title}`}
			className={`vote-override ${open ? "is-open" : ""}`}
			role="radiogroup"
		>
			<button
				aria-expanded={open}
				aria-label={`${selectedOption.description}. Click to change.`}
				className={`vote-override-current ${activeOverride ? "overridden" : ""}`}
				onClick={() => setOpen((current) => !current)}
				type="button"
			>
				{selectedOption.label}
			</button>
			<div className="vote-override-options">
				{overrideOptions.map((option) => {
					const selected = overridesMatch(selectedOverride, option.override)
					return (
						<button
							aria-pressed={selected}
							aria-label={option.description}
							className={`vote-override-option ${selected ? "selected" : ""} ${selected && activeOverride ? "overridden" : ""}`}
							key={option.label}
							onClick={() => selectOverride(option.override)}
							title={option.description}
							type="button"
						>
							{option.label}
						</button>
					)
				})}
			</div>
		</div>
	)
}

function ScoreTable({
	selectedCategories,
	overrides,
	setOverrides,
}: {
	selectedCategories: string[]
	overrides: VoteOverrides
	setOverrides: Dispatch<SetStateAction<VoteOverrides>>
}) {
	const [expandedParties, setExpandedParties] = useState<Set<string>>(new Set())
	const [revealedPartyNames, setRevealedPartyNames] = useState<Set<string>>(
		new Set(),
	)
	const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
		new Set(),
	)
	const [selectedVote, setSelectedVote] = useState<Vote | null>(null)
	const results = calculateScores(
		data.votes,
		data.councillors,
		data.parties,
		selectedCategories,
		overrides,
	)

	useEffect(() => {
		if (!selectedVote) return
		function closeOnEscape(event: KeyboardEvent) {
			if (event.key === "Escape") setSelectedVote(null)
		}
		document.addEventListener("keydown", closeOnEscape)
		return () => document.removeEventListener("keydown", closeOnEscape)
	}, [selectedVote])

	function toggle(
		setter: Dispatch<SetStateAction<Set<string>>>,
		value: string,
	) {
		setter((current) => {
			const next = new Set(current)
			if (next.has(value)) next.delete(value)
			else next.add(value)
			return next
		})
	}

	function toggleParty(partyId: string) {
		toggle(setExpandedParties, partyId)
		setRevealedPartyNames((current) => {
			const next = new Set(current)
			if (next.has(partyId)) next.delete(partyId)
			else next.add(partyId)
			return next
		})
	}

	return (
		<div
			className={`score-table-shell ${expandedParties.size ? "has-expanded-party" : ""}`}
		>
			<table className="score-table">
				<caption className="sr-only">
					Voting report card. Parties are sorted by average score, highest
					first.
				</caption>
				<thead>
					<tr>
						<th className="category-header" rowSpan={2} scope="col">
							Category
						</th>
						{results.parties.map((partyScore) => {
							const party = data.parties.find(
								(item) => item.id === partyScore.partyId,
							)
							if (!party) return null
							const expanded = expandedParties.has(party.id)
							return (
								<th
									className={`party-header ${expanded && partyScore.councillors.length > 1 ? "party-header-expanded" : ""} ${revealedPartyNames.has(party.id) ? "party-name-revealed" : ""}`}
									colSpan={
										expanded ? Math.max(partyScore.councillors.length, 1) : 1
									}
									key={party.id}
									scope="colgroup"
								>
									<button
										aria-label={party.name}
										type="button"
										onClick={() => toggleParty(party.id)}
										aria-expanded={expanded}
									>
										{party.logo && (
											<img
												alt=""
												className="party-logo"
												src={`${import.meta.env.BASE_URL}${party.logo}`}
											/>
										)}
										<span className="party-name-label">{party.name}</span>
									</button>
								</th>
							)
						})}
					</tr>
					<tr>
						{results.parties.flatMap((partyScore) =>
							expandedParties.has(partyScore.partyId) ? (
								partyScore.councillors.map((councillor, index) => {
									const metadata = data.councillors.find(
										(item) => item.id === councillor.councillorId,
									)
									return metadata ? (
										<th
											className={`councillor-header ${partyGroupClasses(index, partyScore.councillors.length)}`}
											key={metadata.id}
											scope="col"
											title={metadata.name}
										>
											<span className="councillor-name-full">
												{metadata.name}
											</span>
											<span
												className="councillor-name-initials"
												aria-hidden="true"
											>
												{councillorInitials(metadata.name)}
											</span>
										</th>
									) : null
								})
							) : (
								<th
									className="party-subheader-spacer"
									key={`${partyScore.partyId}-spacer`}
								/>
							),
						)}
					</tr>
				</thead>
				<tbody>
					<tr className="overall-table-row">
						<th scope="row">Overall grade</th>
						{results.parties.flatMap((partyScore) =>
							expandedParties.has(partyScore.partyId) ? (
								partyScore.councillors.map((councillor, index) => (
									<td
										className={`${gradeClass(councillor.letterGrade)} councillor-cell ${partyGroupClasses(index, partyScore.councillors.length)}`}
										key={councillor.councillorId}
									>
										{formatOverallGrade(councillor)}
									</td>
								))
							) : (
								<td
									className={`${gradeClass(partyScore.letterGrade)} party-cell party-group-start party-group-end`}
									key={partyScore.partyId}
								>
									{formatOverallGrade(partyScore)}
								</td>
							),
						)}
					</tr>
					{selectedCategories.flatMap((category) => {
						const expanded = expandedCategories.has(category)
						const votes = selectedVotesForCategory(category)
						const rows = [
							{ id: category, voteId: null as string | null },
							...(expanded
								? votes.map((vote) => ({ id: vote.id, voteId: vote.id }))
								: []),
						]
						return rows.map((row, index) => (
							<tr
								className={`category-table-row ${expanded ? "vote-table-row" : ""}`}
								key={`${category}-${row.id}`}
							>
								<th scope="row">
									{index === 0 ? (
										<button
											className="row-expander category-expander"
											type="button"
											onClick={() => toggle(setExpandedCategories, category)}
											aria-expanded={expanded}
											title={categoryDescriptions[category]}
										>
											<span className="table-plus" aria-hidden="true">
												{expanded ? "-" : "+"}
											</span>
											<span>{category}</span>
										</button>
									) : (
										<span className="vote-row-label">
											<span className="vote-title-row">
												<span>{votes[index - 1].title}</span>
												<button
													className="vote-info-button"
													type="button"
													aria-label={`More information about ${votes[index - 1].title}`}
													onClick={() => setSelectedVote(votes[index - 1])}
												>
													i
												</button>
												<VoteOverrideControl
													vote={votes[index - 1]}
													overrides={overrides}
													setOverrides={setOverrides}
												/>
											</span>
										</span>
									)}
								</th>
								{results.parties.flatMap((partyScore) => {
									const partyCategory = categoryResult(partyScore, category)
									if (expandedParties.has(partyScore.partyId)) {
										return partyScore.councillors.map((councillor, index) => {
											const councillorCategory = categoryResult(
												councillor,
												category,
											)
											const value = row.voteId
												? (councillorCategory?.voteScores[row.voteId] ?? null)
												: null
											const recordedVote = row.voteId
												? data.votes.find((vote) => vote.id === row.voteId)
														?.councillorVotes[councillor.councillorId]
												: null
											return (
												<td
													className={`${row.voteId ? scoreClass(value) : gradeClass(councillorCategory?.letterGrade ?? "D")} councillor-cell ${partyGroupClasses(index, partyScore.councillors.length)}`}
													key={councillor.councillorId}
												>
													{row.voteId ? (
														<>
															<span>{formatScore(value)}</span>
															<small className="recorded-vote">
																{recordedVote ?? "Not eligible"}
															</small>
														</>
													) : (
														councillorCategory?.letterGrade
													)}
												</td>
											)
										})
									}
									const value = row.voteId
										? (partyCategory?.voteScores[row.voteId] ?? null)
										: null
									return (
										<td
											className={`${row.voteId ? scoreClass(value) : gradeClass(partyCategory?.letterGrade ?? "D")} party-cell party-group-start party-group-end`}
											key={partyScore.partyId}
										>
											{row.voteId
												? formatScore(value)
												: partyCategory?.letterGrade}
										</td>
									)
								})}
							</tr>
						))
					})}
				</tbody>
			</table>
			{selectedVote && (
				<div className="vote-modal-backdrop">
					<div
						className="vote-modal"
						role="dialog"
						aria-modal="true"
						aria-labelledby="vote-modal-title"
					>
						<div className="vote-modal-heading">
							<div>
								<p className="eyebrow">Vote details</p>
								<h3 id="vote-modal-title">{selectedVote.title}</h3>
							</div>
							<button
								className="vote-modal-close"
								type="button"
								aria-label="Close vote details"
								onClick={() => setSelectedVote(null)}
							>
								×
							</button>
						</div>
						<dl className="vote-metadata">
							<div>
								<dt>Date</dt>
								<dd>{selectedVote.date}</dd>
							</div>
							<div>
								<dt>Outcome</dt>
								<dd>{selectedVote.outcome}</dd>
							</div>
						</dl>
						{selectedVote.description && (
							<p className="vote-modal-paragraph">{selectedVote.description}</p>
						)}
						{selectedVote.outcomeDetails && (
							<p className="vote-modal-paragraph">
								{selectedVote.outcomeDetails}
							</p>
						)}
						{(selectedVote.newsUrl || selectedVote.sourceUrl) && (
							<div className="vote-modal-links">
								{selectedVote.newsUrl && (
									<a
										className="source-link"
										href={selectedVote.newsUrl}
										target="_blank"
										rel="noreferrer"
									>
										News coverage ↗
									</a>
								)}
								{selectedVote.sourceUrl && (
									<a
										className="source-link"
										href={selectedVote.sourceUrl}
										target="_blank"
										rel="noreferrer"
									>
										Council minutes ↗
									</a>
								)}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	)
}

function App() {
	const [selectedCategories, setSelectedCategories] = useState<string[]>([])
	const [overrides, setOverrides] = useState<VoteOverrides>({})

	useEffect(() => {
		if (selectedCategories.length !== 3) return
		const reportCard = document.getElementById("report-card")
		if (!reportCard) return
		reportCard.scrollIntoView({
			behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
				? "auto"
				: "smooth",
			block: "start",
		})
	}, [selectedCategories.length])

	function toggleCategory(category: string) {
		setSelectedCategories((current) => {
			if (current.includes(category))
				return current.filter((item) => item !== category)
			if (current.length >= 3) return current
			return [...current, category]
		})
	}

	return (
		<main className="page-shell">
			<nav className="topbar" aria-label="Primary navigation">
				<a className="brand" href="/">
					Vancouver Council <span>Scorecard</span>
				</a>
				<a className="text-link" href="#about">
					About this project <span aria-hidden="true">↗</span>
				</a>
			</nav>

			<section className="hero" aria-labelledby="page-title">
				<p className="eyebrow">Vancouver · 2022-2026</p>
				<h1 id="page-title">
					Vote based on actions
					<br />
					<em>not just promises</em>
				</h1>
				<p className="hero-copy">
					Build a personal report card from the issues you care about. Compare
					parties, explore individual councillors, and see the votes behind
					every result.
				</p>
				<a className="primary-button" href="#categories">
					Choose your categories <span aria-hidden="true">↓</span>
				</a>
			</section>

			<section
				className="selection-panel"
				id="categories"
				aria-labelledby="category-heading"
			>
				<div className="section-heading">
					<div>
						<p className="eyebrow">Step 01</p>
						<h2 id="category-heading">Choose up to three priorities</h2>
					</div>
					<span className="selection-count">
						{selectedCategories.length} / 3 selected
					</span>
				</div>
				<div className="category-grid">
					{data.categories.map((category) => {
						const selected = selectedCategories.includes(category)
						const unavailable = selectedCategories.length >= 3 && !selected
						return (
							<button
								className={`category-card ${selected ? "selected" : ""}`}
								key={category}
								type="button"
								aria-pressed={selected}
								disabled={unavailable}
								onClick={() => toggleCategory(category)}
							>
								<span className="category-check" aria-hidden="true">
									{selected ? "✓" : "+"}
								</span>
								<span className="category-name">{category}</span>
								<span className="category-description">
									{categoryDescriptions[category] ??
										"Council decisions in this area."}
								</span>
							</button>
						)
					})}
				</div>
			</section>

			<section
				className="preview-panel"
				id="report-card"
				aria-labelledby="preview-heading"
			>
				<div className="section-heading">
					<div>
						<p className="eyebrow">Your report card</p>
						<h2 id="preview-heading">
							{selectedCategories.length
								? "Voting report card"
								: "The results will appear here"}
						</h2>
					</div>
				</div>
				{!selectedCategories.length ? (
					<div className="empty-state">
						<div className="empty-mark" aria-hidden="true">
							✦
						</div>
						<p>Choose at least one category to compare the voting records.</p>
					</div>
				) : (
					<ScoreTable
						selectedCategories={selectedCategories}
						overrides={overrides}
						setOverrides={setOverrides}
					/>
				)}
			</section>

			<footer id="about" className="footer">
				<span>Vancouver Council Scorecard</span>
				<span>Independent project · Data and methodology coming soon</span>
			</footer>
		</main>
	)
}

export default App
