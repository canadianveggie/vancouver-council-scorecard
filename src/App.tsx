import type { Dispatch, SetStateAction } from "react"
import { useEffect, useRef, useState } from "react"
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
import { parseVoteOverrides, serializeVoteOverrides } from "./sharing/url"

const data = scorecardJson as ScorecardData

function categoriesFromUrl() {
	if (typeof window === "undefined") return []
	const value = new URLSearchParams(window.location.search).get("categories")
	if (!value) return []
	return value
		.split(",")
		.filter(
			(category, index, categories) =>
				data.categories.includes(category) &&
				categories.indexOf(category) === index,
		)
		.slice(0, 3)
}

const categoryDescriptions: Record<string, string> = {
	Housing: "Homes, density, and neighbourhood plans.",
	Transportation: "How people move around the city.",
	Environment: "Climate action and resilient communities.",
	Safety: "Vision Zero and public safety.",
	Affordability: "The cost of living in Vancouver.",
	Governance: "Integrity, accountability, and democracy.",
	Urbanism: "Land use, planning, and public spaces.",
}

function formatScore(score: number | null) {
	if (score === null) return "—"
	const roundedScore = Math.round(score)
	return roundedScore > 0 ? `+${roundedScore}` : `${roundedScore}`
}

function scoreClass(score: number | null) {
	if (score === null) return "score-muted"
	if (score === 0) return "score-zero"
	const level = Math.min(6, Math.max(1, Math.ceil(Math.abs(score))))
	return `${score > 0 ? "score-positive" : "score-negative"} score-level-${level}`
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

function formatGradeSummary(
	score: CategoryGrade | PartyScore | CouncillorScore,
	denominator: number,
) {
	return `(${Math.round(score.totalScore)}/${denominator})`
}

function councillorInitials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.map((part) => part[0])
		.join("")
		.toUpperCase()
}

async function copyText(text: string) {
	if (navigator.clipboard) {
		try {
			await navigator.clipboard.writeText(text)
			return true
		} catch {
			// Fall through to the legacy copy method for restricted clipboard access.
		}
	}

	const input = document.createElement("textarea")
	input.value = text
	input.setAttribute("readonly", "")
	input.style.position = "fixed"
	input.style.opacity = "0"
	document.body.appendChild(input)
	input.select()
	const copied = document.execCommand("copy")
	document.body.removeChild(input)
	return copied
}

const overrideOptions: Array<{
	label: string
	textLabel: string
	description: string
	override: VoteOverride
}> = [
	{
		label: "😡",
		textLabel: "-3",
		description: "Want this vote to fail, weight 3",
		override: { desiredOutcome: "fail", weight: 3 },
	},
	{
		label: "☹️",
		textLabel: "-2",
		description: "Want this vote to fail, weight 2",
		override: { desiredOutcome: "fail", weight: 2 },
	},
	{
		label: "👎",
		textLabel: "-1",
		description: "Want this vote to fail, weight 1",
		override: { desiredOutcome: "fail", weight: 1 },
	},
	{
		label: "🚫",
		textLabel: "0",
		description: "Ignore this vote",
		override: { ignored: true },
	},
	{
		label: "👍",
		textLabel: "+1",
		description: "Want this vote to pass, weight 1",
		override: { desiredOutcome: "pass", weight: 1 },
	},
	{
		label: "🙂",
		textLabel: "+2",
		description: "Want this vote to pass, weight 2",
		override: { desiredOutcome: "pass", weight: 2 },
	},
	{
		label: "❤️",
		textLabel: "+3",
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
	isOpen,
	setIsOpen,
}: {
	vote: Vote
	overrides: VoteOverrides
	setOverrides: Dispatch<SetStateAction<VoteOverrides>>
	isOpen: boolean
	setIsOpen: (open: boolean) => void
}) {
	const activeOverride = overrides[vote.id]
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
		setIsOpen(false)
	}

	return (
		<div
			aria-label={`Set preference for ${vote.title}`}
			className={`vote-override ${isOpen ? "is-open" : ""}`}
			role="radiogroup"
		>
			<button
				aria-expanded={isOpen}
				aria-label={`${selectedOption.description}. Click to change.`}
				className={`vote-override-current ${activeOverride ? "overridden" : ""}`}
				onClick={() => setIsOpen(!isOpen)}
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
							<span aria-hidden="true">{option.label}</span>
							<span className="vote-override-option-label">
								{option.textLabel}
							</span>
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
	const [openOverrideVoteId, setOpenOverrideVoteId] = useState<string | null>(
		null,
	)
	const [selectedVote, setSelectedVote] = useState<Vote | null>(null)
	const scoreTableShellRef = useRef<HTMLDivElement>(null)
	const results = calculateScores(
		data.votes,
		data.councillors,
		data.parties,
		selectedCategories,
		overrides,
	)
	const tableLayoutKey = JSON.stringify({
		expandedParties: [...expandedParties],
		overrides,
		selectedCategories,
	})

	useEffect(() => {
		if (!selectedVote) return
		function closeOnEscape(event: KeyboardEvent) {
			if (event.key === "Escape") setSelectedVote(null)
		}
		document.addEventListener("keydown", closeOnEscape)
		return () => document.removeEventListener("keydown", closeOnEscape)
	}, [selectedVote])

	useEffect(() => {
		const shell = scoreTableShellRef.current
		const table = shell?.querySelector(".score-table")
		const tableHead = table?.querySelector("thead")
		if (!shell || !table || !tableHead) return
		const shellElement = shell
		const tableElement = table
		const tableHeadElement = tableHead

		const stickyHeader = document.createElement("div")
		stickyHeader.className = `score-table-sticky-header ${shellElement.className}`
		stickyHeader.setAttribute("aria-hidden", "true")
		stickyHeader.dataset.layoutKey = tableLayoutKey
		const stickyTable = table.cloneNode(false) as HTMLTableElement
		const sourceRow = table.querySelector("tbody tr")
		const sourceCells = sourceRow ? [...sourceRow.children] : []
		const columnGroup = document.createElement("colgroup")
		for (let index = 0; index < sourceCells.length; index += 1) {
			const column = document.createElement("col")
			columnGroup.appendChild(column)
		}
		stickyTable.appendChild(columnGroup)
		stickyTable.appendChild(tableHeadElement.cloneNode(true))
		stickyHeader.appendChild(stickyTable)
		for (const button of stickyHeader.querySelectorAll("button")) {
			button.tabIndex = -1
		}
		document.body.appendChild(stickyHeader)

		function handleStickyClick(event: MouseEvent) {
			if (!(event.target instanceof Element)) return
			const stickyButton = event.target.closest("button")
			if (!stickyButton) return
			const label = stickyButton.getAttribute("aria-label")
			const originalButton = [
				...tableElement.querySelectorAll("thead button"),
			].find((button) => button.getAttribute("aria-label") === label) as
				| HTMLButtonElement
				| undefined
			originalButton?.click()
		}

		function updateStickyHeader() {
			const shellRect = shellElement.getBoundingClientRect()
			const tableRect = tableElement.getBoundingClientRect()
			const headerHeight = tableHeadElement.getBoundingClientRect().height
			const isVisible = shellRect.top < 0 && shellRect.bottom > headerHeight

			stickyHeader.style.display = isVisible ? "block" : "none"
			if (!isVisible) return

			stickyHeader.style.left = `${shellRect.left}px`
			stickyHeader.style.width = `${shellRect.width}px`
			stickyTable.style.tableLayout = "fixed"
			stickyTable.style.width = `${tableRect.width}px`
			for (const [index, sourceCell] of sourceCells.entries()) {
				const column = columnGroup.children[index] as HTMLTableColElement
				column.style.width = `${sourceCell.getBoundingClientRect().width}px`
			}
			stickyHeader.scrollLeft = shellElement.scrollLeft
		}

		updateStickyHeader()
		stickyHeader.addEventListener("click", handleStickyClick)
		shellElement.addEventListener("scroll", updateStickyHeader)
		window.addEventListener("scroll", updateStickyHeader)
		window.addEventListener("resize", updateStickyHeader)
		return () => {
			stickyHeader.removeEventListener("click", handleStickyClick)
			shellElement.removeEventListener("scroll", updateStickyHeader)
			window.removeEventListener("scroll", updateStickyHeader)
			window.removeEventListener("resize", updateStickyHeader)
			stickyHeader.remove()
		}
	}, [tableLayoutKey])

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
			ref={scoreTableShellRef}
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
													isOpen={openOverrideVoteId === votes[index - 1].id}
													setIsOpen={(open) =>
														setOpenOverrideVoteId(
															open ? votes[index - 1].id : null,
														)
													}
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
														<>
															<span>{councillorCategory?.letterGrade}</span>
															{expanded && councillorCategory && (
																<small className="grade-summary">
																	{formatGradeSummary(
																		councillorCategory,
																		councillorCategory.applicableVoteCount,
																	)}
																</small>
															)}
														</>
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
												: partyCategory && (
														<>
															<span>{partyCategory.letterGrade}</span>
															{expanded && (
																<small className="grade-summary">
																	{formatGradeSummary(
																		partyCategory,
																		partyCategory.totalWeight,
																	)}
																</small>
															)}
														</>
													)}
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
						{selectedVote.description && (
							<p className="vote-modal-paragraph">{selectedVote.description}</p>
						)}
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
	const [selectedCategories, setSelectedCategories] =
		useState<string[]>(categoriesFromUrl)
	const [overrides, setOverrides] = useState<VoteOverrides>(() =>
		parseVoteOverrides(
			data.votes,
			new URLSearchParams(window.location.search).get("overrides"),
		),
	)
	const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "failed">(
		"idle",
	)
	const hasMounted = useRef(false)
	const hasMountedCategories = useRef(false)
	const hasOverrides = Object.keys(overrides).length > 0

	useEffect(() => {
		const isInitialRender = !hasMounted.current
		hasMounted.current = true
		const url = new URL(window.location.href)
		if (selectedCategories.length) {
			url.searchParams.set("categories", selectedCategories.join(","))
		} else {
			url.searchParams.delete("categories")
		}
		const serializedOverrides = serializeVoteOverrides(data.votes, overrides)
		if (serializedOverrides) {
			url.searchParams.set("overrides", serializedOverrides)
		} else {
			url.searchParams.delete("overrides")
		}
		if (selectedCategories.length === 3 && !isInitialRender) {
			url.hash = "report-card"
		} else if (selectedCategories.length !== 3 && url.hash === "#report-card") {
			url.hash = ""
		}
		window.history.replaceState(null, "", url)
	}, [selectedCategories, overrides])

	useEffect(() => {
		const isInitialRender = !hasMountedCategories.current
		hasMountedCategories.current = true
		if (selectedCategories.length !== 3 || isInitialRender) return
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
			if (current.includes(category)) {
				setOverrides((currentOverrides) => {
					const next = { ...currentOverrides }
					for (const vote of data.votes) {
						if (vote.category === category) delete next[vote.id]
					}
					return next
				})
				return current.filter((item) => item !== category)
			}
			if (current.length >= 3) return current
			return [...current, category]
		})
	}

	async function shareReport() {
		const copied = await copyText(window.location.href)
		setShareStatus(copied ? "copied" : "failed")
		window.setTimeout(() => setShareStatus("idle"), 2500)
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
				<p className="eyebrow">Vancouver City Council Voting Record</p>
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
						<p className="eyebrow">Categories</p>
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
					{selectedCategories.length > 0 && (
						<div className="report-actions">
							{hasOverrides && (
								<button
									className="secondary-button"
									type="button"
									onClick={() => setOverrides({})}
								>
									Reset to Defaults
								</button>
							)}
							<button
								className="secondary-button"
								type="button"
								onClick={shareReport}
							>
								{shareStatus === "copied" ? "Copied!" : "Share"}
							</button>
							<span className="sr-only" aria-live="polite">
								{shareStatus === "copied"
									? "Share link copied to clipboard."
									: shareStatus === "failed"
										? "Unable to copy the share link."
										: ""}
							</span>
						</div>
					)}
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

			<section
				className="methodology-section"
				id="about"
				aria-labelledby="about-heading"
			>
				<p className="eyebrow">About this project</p>
				<h2 id="about-heading">How it works</h2>
				<p className="methodology-copy">
					This scorecard was inspired by the excellent{" "}
					<a
						href="https://visionzerovancouver.ca/2026/09/16/vancouver-council-full-term-report/"
						target="_blank"
						rel="noreferrer"
					>
						Vision Zero Vancouver full-term report
					</a>
					.
				</p>
				<h3>More details</h3>
				<p className="methodology-copy">
					Clicking on a category will show the votes that make up the score.
					<br />
					Each vote has details with links to news coverage and the council
					minutes.
					<br />
					Clicking on a party will show the individual councillors and their
					scores.
				</p>

				<h3>Scoring</h3>
				<ul className="scoring-list">
					<li>
						<strong>+1</strong>
						<span>for a positive vote</span>
					</li>
					<li>
						<strong>-1</strong>
						<span>for a negative vote</span>
					</li>
					<li>
						<strong>0</strong>
						<span>for abstaining</span>
					</li>
					<li>
						<strong>n/a</strong>
						<span>for being absent</span>
					</li>
					<li>
						<strong>+2</strong>
						<span>for proposing a positive vote</span>
					</li>
					<li>
						<strong>-2</strong>
						<span>for amending a positive vote to try and kill it</span>
					</li>
				</ul>
				<p className="methodology-copy">
					Grades are averages across the councillors and weighted for each vote.
				</p>
				<h3>Customization</h3>
				<p className="methodology-copy">
					Customize the report card to reflect your priorities.
					<br />
					Choose the three categories that matter most to you.
					<br />
					For each vote, you can change the desired outcome, adjust its weight,
					or ignore it entirely.
					<br />
					Results update immediately, and your customizations are saved when you
					share your report card.
				</p>
				<h3>Data sources</h3>
				<p className="methodology-copy">
					The data was sourced from the City of Vancouver&apos;s{" "}
					<a
						href="https://opendata.vancouver.ca/explore/dataset/council-voting-records/information"
						target="_blank"
						rel="noreferrer"
					>
						Council Voting Records
					</a>{" "}
					open data source, correlated with{" "}
					<a
						href="https://app.vancouver.ca/CouncilMeetingPublic/"
						target="_blank"
						rel="noreferrer"
					>
						meeting minutes
					</a>
					, and cross-referenced with online news articles.
					<br />
					Not every vote is featured, but I tried to highlight the most
					influential and news-worthy ones from the past 4 years.
				</p>
				<h3>Feedback</h3>
				<p className="methodology-copy">
					If I messed up encoding any of the data, please let me know at{" "}
					<a href="https://canadianveggie.com" target="_blank" rel="noreferrer">
						canadianveggie.com
					</a>
					.
				</p>
			</section>

			<footer className="footer">
				<span>Vancouver Council Scorecard</span>
				<span>
					Made by{" "}
					<a href="https://canadianveggie.com" target="_blank" rel="noopener">
						@canadianveggie
					</a>
				</span>
			</footer>
		</main>
	)
}

export default App
