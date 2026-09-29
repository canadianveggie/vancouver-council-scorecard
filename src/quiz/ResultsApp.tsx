import { useEffect, useState } from "react"
import quizJson from "../../data/generated/quiz.json"
import scorecardJson from "../../data/generated/scorecard.json"
import type { ScorecardData } from "../data/types"
import { calculatePartyMatches } from "./matching"
import type { QuizData } from "./types"
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

function ResultActions({ partyName }: { partyName: string }) {
	const [status, setStatus] = useState<"idle" | "copied" | "shared">("idle")

	async function share(party: string) {
		const url = window.location.href
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
	const winnerCardContent = winner ? (
		<>
			<div className="winner-party-mark">
				{winner.party.logo && (
					<img alt="" src={`${baseUrl}${winner.party.logo}`} />
				)}
			</div>
			<div>
				<p className="winner-label">The closest match</p>
				<h2>{winner.party.name}</h2>
				<p className="winner-match">{winner.percentage}% match</p>
			</div>
		</>
	) : null

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
				{winner.party.website ? (
					<a
						className="winner-card"
						href={winner.party.website}
						target="_blank"
						rel="noopener noreferrer"
						aria-label={`Visit ${winner.party.name}'s website (opens in a new tab)`}
					>
						{winnerCardContent}
					</a>
				) : (
					<div className="winner-card">{winnerCardContent}</div>
				)}
				<ResultActions partyName={winner.party.name} />
			</section>

			<section className="ranking-section" aria-labelledby="ranking-title">
				<p className="eyebrow">The full ranking</p>
				<h2 id="ranking-title">You were also similar to:</h2>
				<div className="party-ranking">
					{matches.slice(1).map((match, index) => (
						<div className="party-ranking-row" key={match.party.id}>
							<span className="ranking-number">{index + 2}.</span>
							{match.party.logo && (
								<img
									alt=""
									className="ranking-logo"
									src={`${baseUrl}${match.party.logo}`}
								/>
							)}
							<strong>{match.party.name}</strong>
							<span className="ranking-match">{match.percentage}% match</span>
						</div>
					))}
				</div>
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
