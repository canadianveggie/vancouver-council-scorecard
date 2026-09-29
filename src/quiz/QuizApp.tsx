import { useMemo, useState } from "react"
import quizJson from "../../data/generated/quiz.json"
import scorecardJson from "../../data/generated/scorecard.json"
import type { ScorecardData } from "../data/types"
import { calculatePartyMatches } from "./matching"
import { quizOrder } from "./random"
import type { QuizAnswer, QuizData } from "./types"
import { resultPath } from "./url"

const data = quizJson as QuizData
const scorecard = scorecardJson as ScorecardData
const baseUrl = import.meta.env.BASE_URL

function assetUrl(path: string) {
	return `${baseUrl}${path.replace(/^\//, "")}`
}

function QuizHeader() {
	return (
		<nav className="quiz-topbar" aria-label="Primary navigation">
			<a className="brand" href={baseUrl}>
				Vancouver Council <span>Scorecard</span>
			</a>
			<a className="text-link" href={`${baseUrl}index.html`}>
				View the scorecard <span aria-hidden="true">↗</span>
			</a>
		</nav>
	)
}

function Intro({ onStart }: { onStart: () => void }) {
	return (
		<>
			<section className="quiz-hero" aria-labelledby="quiz-title">
				<p className="eyebrow">Vancouver Council Voting Quiz</p>
				<h1 id="quiz-title">
					How would you vote?
					<br />
					<em>Make your record.</em>
				</h1>
				<p className="quiz-hero-copy">
					Answer 11 questions about the decisions that divided Vancouver City
					Council. We&apos;ll compare your choices with the positions taken by
					each party.
				</p>
				<button
					className="primary-button quiz-start"
					type="button"
					onClick={onStart}
				>
					Start the quiz <span aria-hidden="true">→</span>
				</button>
			</section>
			<section className="quiz-intro-notes" aria-label="About the quiz">
				<div>
					<span className="quiz-note-number">01</span>
					<strong>11 issues</strong>
					<p>Housing, safety, climate, transportation, and more.</p>
				</div>
				<div>
					<span className="quiz-note-number">02</span>
					<strong>Two choices</strong>
					<p>Support or oppose each proposition. No fence-sitting.</p>
				</div>
				<div>
					<span className="quiz-note-number">03</span>
					<strong>One result</strong>
					<p>See which party&apos;s record most closely matches yours.</p>
				</div>
			</section>
			<section className="quiz-method-note">
				<p className="eyebrow">A note on method</p>
				<p>
					Every issue is weighted equally. Party positions are editorialized
					from council votes, public statements, and the context of each
					decision. This is a starting point for exploring the record, not a
					voting recommendation.
				</p>
			</section>
		</>
	)
}

function IssueCard({
	issue,
	answer,
	onAnswer,
}: {
	issue: QuizData["issues"][number]
	answer: QuizAnswer | undefined
	onAnswer: (answer: QuizAnswer) => void
}) {
	return (
		<article className="issue-card">
			<div className="issue-card-main">
				<div className="issue-summary">
					<div className="issue-visual">
						{issue.image ? (
							<img
								alt=""
								className="issue-image"
								src={assetUrl(issue.image.src)}
							/>
						) : (
							<div className="issue-image-placeholder" aria-hidden="true">
								<span>Image coming soon</span>
							</div>
						)}
						{issue.image && (
							<a
								className="issue-image-source"
								href={issue.image.source.url}
								target="_blank"
								rel="noreferrer"
							>
								{issue.image.source.name} <span aria-hidden="true">↗</span>
							</a>
						)}
					</div>
					<div className="issue-card-heading">
						<p className="eyebrow">{issue.category}</p>
						<h2 id="current-issue-title">{issue.title}</h2>
						<p className="issue-context">{issue.context}</p>
						{issue.newsLink && (
							<a
								className="issue-news-link"
								href={issue.newsLink}
								target="_blank"
								rel="noreferrer"
							>
								Read the news coverage <span aria-hidden="true">↗</span>
							</a>
						)}
					</div>
				</div>
			</div>
			<fieldset className="issue-choice">
				<legend>How would you vote?</legend>
				<div className="issue-arguments">
					<div className="argument argument-for">
						<span className="argument-label">The case for</span>
						<p>{issue.argumentFor}</p>
						<label
							className={`choice-button ${answer === "S" ? "selected" : ""}`}
						>
							<input
								checked={answer === "S"}
								name={`answer-${issue.id}`}
								onChange={() => onAnswer("S")}
								type="radio"
								value="S"
							/>
							<span className="choice-mark" aria-hidden="true">
								S
							</span>
							<span>
								<strong>Support</strong>
								<small>I would support this</small>
							</span>
						</label>
					</div>
					<div className="argument argument-against">
						<span className="argument-label">The case against</span>
						<p>{issue.argumentAgainst}</p>
						<label
							className={`choice-button ${answer === "O" ? "selected" : ""}`}
						>
							<input
								checked={answer === "O"}
								name={`answer-${issue.id}`}
								onChange={() => onAnswer("O")}
								type="radio"
								value="O"
							/>
							<span className="choice-mark" aria-hidden="true">
								O
							</span>
							<span>
								<strong>Oppose</strong>
								<small>I would oppose this</small>
							</span>
						</label>
					</div>
				</div>
			</fieldset>
		</article>
	)
}

function QuizRunner() {
	const order = useMemo(() => quizOrder(data.issues.length), [])
	const [currentIndex, setCurrentIndex] = useState(0)
	const [answers, setAnswers] = useState<Partial<Record<string, QuizAnswer>>>(
		{},
	)
	const issue = data.issues[order[currentIndex]]
	const answer = answers[issue.id]
	const isLast = currentIndex === order.length - 1

	function setAnswer(nextAnswer: QuizAnswer) {
		setAnswers((current) => ({ ...current, [issue.id]: nextAnswer }))
	}

	function finish() {
		const canonicalAnswers = data.issues.map((item) => answers[item.id])
		if (canonicalAnswers.some((item): item is undefined => !item)) return
		const typedAnswers = canonicalAnswers as QuizAnswer[]
		const winner = calculatePartyMatches(
			data.issues,
			scorecard.parties,
			typedAnswers,
		)[0]
		const path = resultPath(winner.party.id, typedAnswers, baseUrl)
		window.location.assign(new URL(path, window.location.origin).href)
	}

	return (
		<section className="quiz-runner" aria-labelledby="current-issue-title">
			<div className="quiz-progress-row">
				<span className="eyebrow">Your voting record</span>
				<span className="quiz-progress-count">
					{currentIndex + 1} <span aria-hidden="true">/</span> {order.length}
				</span>
			</div>
			<div className="quiz-progress" aria-hidden="true">
				<div
					style={{ width: `${((currentIndex + 1) / order.length) * 100}%` }}
				/>
			</div>
			<IssueCard issue={issue} answer={answer} onAnswer={setAnswer} />
			<div className="quiz-navigation">
				<button
					className="quiz-back-button"
					disabled={currentIndex === 0}
					onClick={() => setCurrentIndex((current) => current - 1)}
					type="button"
				>
					<span aria-hidden="true">←</span> Back
				</button>
				<button
					className="primary-button quiz-next-button"
					disabled={!answer}
					onClick={() =>
						isLast ? finish() : setCurrentIndex((current) => current + 1)
					}
					type="button"
				>
					{isLast ? "See my result" : "Next issue"}{" "}
					<span aria-hidden="true">→</span>
				</button>
			</div>
		</section>
	)
}

export default function QuizApp() {
	const [started, setStarted] = useState(false)

	return (
		<main className="page-shell quiz-page">
			<QuizHeader />
			{started ? <QuizRunner /> : <Intro onStart={() => setStarted(true)} />}
			<footer className="footer">
				<span>Vancouver Council Scorecard</span>
				<a href={`${baseUrl}index.html#about`}>About the project ↗</a>
			</footer>
		</main>
	)
}
