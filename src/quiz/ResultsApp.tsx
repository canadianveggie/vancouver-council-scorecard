import { useEffect, useState } from "react"
import quizJson from "../../data/generated/quiz.json"
import scorecardJson from "../../data/generated/scorecard.json"
import type { ScorecardData } from "../data/types"
import { calculatePartyMatches } from "./matching"
import type { PartyPosition, QuizAnswer, QuizData } from "./types"
import { decodeAnswers, resultPath } from "./url"

const data = quizJson as QuizData
const scorecard = scorecardJson as ScorecardData
const baseUrl = import.meta.env.BASE_URL

async function copyText(value: string) {
	if (navigator.clipboard) {
		try {
			await navigator.clipboard.writeText(value)
			return true
		} catch {
			// Use the legacy method below when clipboard permissions are unavailable.
		}
	}
	const input = document.createElement("textarea")
	input.value = value
	input.setAttribute("readonly", "")
	input.style.position = "fixed"
	input.style.opacity = "0"
	document.body.appendChild(input)
	input.select()
	const copied = document.execCommand("copy")
	document.body.removeChild(input)
	return copied
}

function partyIdFromPath() {
	const match = window.location.pathname.match(/results-([^/]+)\.html$/)
	return match?.[1] ?? null
}

function ResultsHeader() {
	return (
		<nav className="quiz-topbar" aria-label="Primary navigation">
			<a className="brand" href={baseUrl}>
				Vancouver Council <span>Scorecard</span>
			</a>
			<div className="site-nav-links">
				<a className="text-link" href={`${baseUrl}index.html`}>
					Scorecard
				</a>
				<a className="text-link" href={`${baseUrl}quiz.html`}>
					Take the quiz
				</a>
			</div>
		</nav>
	)
}

function InvalidResult() {
	return (
		<section className="invalid-result">
			<p className="eyebrow">Result unavailable</p>
			<h1>That voting record is incomplete.</h1>
			<p>
				Start the quiz again to create a complete result link you can share.
			</p>
			<a className="primary-button" href={`${baseUrl}quiz.html`}>
				Take the quiz <span aria-hidden="true">→</span>
			</a>
		</section>
	)
}

function ResultsFooter() {
	return (
		<footer className="footer">
			<span>Vancouver Council Scorecard</span>
			<span>
				Made by{" "}
				<a href="https://canadianveggie.com" target="_blank" rel="noopener">
					@canadianveggie
				</a>
			</span>
		</footer>
	)
}

function WinnerCard({
	party,
	percentage,
}: {
	party: ScorecardData["parties"][number]
	percentage?: number
}) {
	const content = (
		<>
			<div className="winner-party-mark">
				{party.logo && <img alt="" src={`${baseUrl}${party.logo}`} />}
			</div>
			<div>
				<p className="winner-label">The closest match</p>
				<h2>{party.name}</h2>
				{percentage !== undefined && (
					<p className="winner-match">{percentage}% match</p>
				)}
			</div>
		</>
	)

	if (!party.website) return <div className="winner-card">{content}</div>

	return (
		<a
			className="winner-card"
			href={party.website}
			target="_blank"
			rel="noopener noreferrer"
			aria-label={`Visit ${party.name}'s website (opens in a new tab)`}
		>
			{content}
		</a>
	)
}

function voteLabel(value: QuizAnswer | PartyPosition) {
	return value === "S" || value === "Support" ? "S" : "O"
}

function VoteCell({
	value,
	matched,
	isUserVote = false,
}: {
	value: QuizAnswer | PartyPosition
	matched?: boolean
	isUserVote?: boolean
}) {
	const label = voteLabel(value)
	const fullLabel = label === "S" ? "Support" : "Oppose"
	const alignment =
		matched === true
			? ", matches your answer"
			: matched === false
				? ", differs from your answer"
				: ""
	return (
		<td
			className={`vote-cell vote-${label.toLowerCase()} ${matched === true ? "is-match" : ""} ${matched === false ? "is-miss" : ""} ${isUserVote ? "is-user-vote" : ""}`}
			aria-label={`${fullLabel}${alignment}`}
		>
			{label}
		</td>
	)
}

function ResultActions({ partyName }: { partyName: string }) {
	const [status, setStatus] = useState<"idle" | "copied" | "shared">("idle")

	async function share(party: string) {
		const shareUrl = new URL(window.location.href)
		shareUrl.search = ""
		shareUrl.hash = ""
		const url = shareUrl.toString()
		if (navigator.share) {
			try {
				await navigator.share({
					title: "My Vancouver Council voting match",
					text: `My voting record would be most like ${party}. Which Vancouver political party would you be?`,
					url,
				})
				setStatus("shared")
				window.setTimeout(() => setStatus("idle"), 2500)
				return
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") return
			}
		}
		if (await copyText(url)) {
			setStatus("copied")
			window.setTimeout(() => setStatus("idle"), 2500)
		}
	}

	return (
		<div className="result-actions">
			<button
				className="share-button"
				type="button"
				onClick={() => share(partyName)}
			>
				<span aria-hidden="true">↗</span>
				{status === "copied"
					? "Link copied"
					: status === "shared"
						? "Shared"
						: "Share my result"}
			</button>
			<a className="primary-button" href={`${baseUrl}quiz.html`}>
				Retake the quiz <span aria-hidden="true">↗</span>
			</a>
			<output className="sr-only" aria-live="polite">
				{status === "copied" ? "Your result link was copied." : ""}
			</output>
		</div>
	)
}

export default function ResultsApp() {
	const answers = decodeAnswers(
		new URLSearchParams(window.location.search).get("votes"),
		data.issues.length,
	)
	const matches = answers
		? calculatePartyMatches(data.issues, scorecard.parties, answers)
		: []
	const winner = matches[0]
	const winnerPartyId = winner?.party.id
	const requestedPartyId = partyIdFromPath()
	const requestedParty = requestedPartyId
		? scorecard.parties.find((party) => party.id === requestedPartyId)
		: undefined

	useEffect(() => {
		if (
			!winnerPartyId ||
			!requestedPartyId ||
			requestedPartyId === winnerPartyId
		)
			return
		const canonicalPath = resultPath(winnerPartyId, answers ?? [], baseUrl)
		window.history.replaceState(null, "", canonicalPath)
	}, [answers, requestedPartyId, winnerPartyId])

	if (!answers || !winner) {
		if (requestedParty) {
			return (
				<main className="page-shell quiz-page results-page">
					<ResultsHeader />
					<section className="results-hero" aria-labelledby="results-title">
						<p className="eyebrow">Your result</p>
						<h1 id="results-title">
							Your voting record would be most similar to:
						</h1>
						<WinnerCard party={requestedParty} />
						<a
							className="primary-button inline-button"
							href={`${baseUrl}quiz.html`}
						>
							Take the quiz <span aria-hidden="true">→</span>
						</a>
					</section>
					<ResultsFooter />
				</main>
			)
		}

		return (
			<main className="page-shell quiz-page results-page">
				<ResultsHeader />
				<InvalidResult />
			</main>
		)
	}

	return (
		<main className="page-shell quiz-page results-page">
			<ResultsHeader />
			<section className="results-hero" aria-labelledby="results-title">
				<p className="eyebrow">Your result</p>
				<h1 id="results-title">Your voting record would be most similar to:</h1>
				<WinnerCard party={winner.party} percentage={winner.percentage} />
				<ResultActions partyName={winner.party.name} />
			</section>

			<section className="ranking-section" aria-labelledby="ranking-title">
				<p className="eyebrow">Compare your record</p>
				<h2 id="ranking-title">How your votes line up</h2>
				<div className="vote-comparison-scroll">
					<table className="vote-comparison">
						<caption className="sr-only">
							Your answers compared with each party&apos;s position on every
							quiz issue.
						</caption>
						<thead>
							<tr>
								<th scope="col" aria-label="Ranking" />
								<th scope="col">Party</th>
								<th scope="col">Match</th>
								{data.issues.map((issue, index) => (
									<th
										key={issue.id}
										scope="col"
										title={issue.title}
										aria-label={`Issue ${index + 1}: ${issue.title}`}
									>
										{issue.image ? (
											<img
												className="comparison-issue-image"
												alt=""
												src={`${baseUrl}${issue.image.src}`}
											/>
										) : (
											<span>{index + 1}</span>
										)}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							<tr className="comparison-your-votes">
								<th scope="row" />
								<th scope="row">Your votes</th>
								<td className="comparison-match" />
								{answers.map((answer, index) => (
									<VoteCell
										key={data.issues[index].id}
										value={answer}
										isUserVote
									/>
								))}
							</tr>
							{matches.map((match, index) => (
								<tr key={match.party.id}>
									<th scope="row" className="comparison-rank">
										{index + 1}
									</th>
									<th scope="row" className="comparison-party">
										{match.party.name}
									</th>
									<td className="comparison-match">
										{match.percentage}% match
									</td>
									{data.issues.map((issue, issueIndex) => {
										const partyPosition = issue.partyPositions[match.party.id]
										const partyVote = voteLabel(partyPosition)
										return (
											<VoteCell
												key={issue.id}
												value={partyPosition}
												matched={partyVote === answers[issueIndex]}
											/>
										)
									})}
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<p className="comparison-note">
					<strong>S</strong> = Support · <strong>O</strong> = Oppose
				</p>
			</section>

			<section
				className="results-method"
				aria-labelledby="results-method-title"
			>
				<p className="eyebrow">How this works</p>
				<h2 id="results-method-title">
					A simple comparison of {data.issues.length} choices.
				</h2>
				<p>
					Your answers are compared with each party&apos;s historical position
					on the issue, based on the council vote and the public record.
				</p>
				<p>
					<strong>Note:</strong> Parties may oppose issues for a variety of
					reasons, and their current position may not match how they voted in
					the past.
				</p>
				<p>Visit the scorecard to see more votes and go even deeper.</p>
				<a
					className="primary-button inline-button"
					href={`${baseUrl}index.html`}
				>
					Open the full scorecard <span aria-hidden="true">↗</span>
				</a>
			</section>
			<ResultsFooter />
		</main>
	)
}
