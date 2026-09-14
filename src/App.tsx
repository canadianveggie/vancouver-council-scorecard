import { useMemo, useState } from 'react'
import scorecardJson from '../data/generated/scorecard.json'
import type { Party, ScorecardData, Vote } from './data/types'
import { calculateScores } from './scoring/score'

const data = scorecardJson as ScorecardData

const categoryDescriptions: Record<string, string> = {
  Housing: 'Homes, density, and neighbourhood plans.',
  Transportation: 'How people move around the city.',
  Cycling: 'Safe and convenient cycling infrastructure.',
  Climate: 'Climate action and resilient communities.',
  Safety: 'Vision Zero and public safety.',
  Affordability: 'The cost of living in Vancouver.',
  Governance: 'Integrity, accountability, and democracy.',
}

function formatScore(score: number) {
  return score > 0 ? `+${score}` : `${score}`
}

function voteLabel(score: number | null) {
  if (score === null) return 'Not eligible'
  return `${formatScore(score)} points`
}

function PartyRow({
  party,
  voteById,
  score,
}: {
  party: Party
  voteById: Map<string, Vote>
  score: ReturnType<typeof calculateScores>['parties'][number]
}) {
  return (
    <details className="party-row">
      <summary className="party-summary">
        <span className="expand-icon" aria-hidden="true">+</span>
        <span className="party-name">{party.name}</span>
        <span className="party-meta">{score.councillorScores.length} councillors</span>
        <strong className={`score-number ${score.total >= 0 ? 'positive' : 'negative'}`}>
          {formatScore(score.total)}
        </strong>
      </summary>
      <div className="party-details">
        {score.councillorScores.map((councillorScore) => (
          <article className="councillor-card" key={councillorScore.councillorId}>
            <div className="councillor-heading">
              <div>
                <h4>{data.councillors.find((councillor) => councillor.id === councillorScore.councillorId)?.name}</h4>
                <p>{councillorScore.applicableVotes} applicable votes · {councillorScore.absentVotes} absent</p>
              </div>
              <strong className={`score-number ${councillorScore.total >= 0 ? 'positive' : 'negative'}`}>
                {formatScore(councillorScore.total)}
              </strong>
            </div>
            <div className="vote-score-list">
              {Object.entries(councillorScore.voteScores).map(([voteId, voteScore]) => {
                const vote = voteById.get(voteId)
                if (!vote) return null
                return (
                  <div className="vote-score" key={voteId}>
                    <span>{vote.title}</span>
                    <span>{voteLabel(voteScore)}</span>
                  </div>
                )
              })}
            </div>
          </article>
        ))}
      </div>
    </details>
  )
}

function VoteDetails({ vote }: { vote: Vote }) {
  return (
    <article className="vote-detail">
      <div>
        <p className="vote-date">{vote.date} · Weight {vote.weight}</p>
        <h4>{vote.title}</h4>
        <p className="vote-outcome">Desired: <strong>{vote.desiredOutcome}</strong> · Result: {vote.outcome}</p>
        {vote.outcomeDetails && <p className="vote-explanation">{vote.outcomeDetails}</p>}
      </div>
      {vote.sourceUrl && (
        <a className="source-link" href={vote.sourceUrl} target="_blank" rel="noreferrer">
          Source <span aria-hidden="true">↗</span>
        </a>
      )}
    </article>
  )
}

function App() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const results = useMemo(
    () => calculateScores(data.votes, data.councillors, data.parties, selectedCategories),
    [selectedCategories],
  )
  const partyById = useMemo(() => new Map(data.parties.map((party) => [party.id, party])), [])
  const voteById = useMemo(() => new Map(data.votes.map((vote) => [vote.id, vote])), [])
  const selectedVotes = data.votes.filter((vote) => results.selectedVoteIds.includes(vote.id))

  function toggleCategory(category: string) {
    setSelectedCategories((current) => {
      if (current.includes(category)) return current.filter((item) => item !== category)
      if (current.length >= 3) return current
      return [...current, category]
    })
  }

  return (
    <main className="page-shell">
      <nav className="topbar" aria-label="Primary navigation">
        <a className="brand" href="/">Vancouver Council <span>Scorecard</span></a>
        <a className="text-link" href="#about">About this project <span aria-hidden="true">↗</span></a>
      </nav>

      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Vancouver · 2022-2026</p>
        <h1 id="page-title">Which council votes<br /><em>matter to you?</em></h1>
        <p className="hero-copy">
          Build a personal report card from the issues you care about. Compare
          parties, explore individual councillors, and see the votes behind every result.
        </p>
        <a className="primary-button" href="#categories">Choose your categories <span aria-hidden="true">↓</span></a>
      </section>

      <section className="selection-panel" id="categories" aria-labelledby="category-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Step 01</p>
            <h2 id="category-heading">Choose up to three priorities</h2>
          </div>
          <span className="selection-count">{selectedCategories.length} / 3 selected</span>
        </div>
        <div className="category-grid">
          {data.categories.map((category) => {
            const selected = selectedCategories.includes(category)
            const unavailable = selectedCategories.length >= 3 && !selected
            return (
              <button
                className={`category-card ${selected ? 'selected' : ''}`}
                key={category}
                type="button"
                aria-pressed={selected}
                disabled={unavailable}
                onClick={() => toggleCategory(category)}
              >
                <span className="category-check" aria-hidden="true">{selected ? '✓' : '+'}</span>
                <span className="category-name">{category}</span>
                <span className="category-description">{categoryDescriptions[category] ?? 'Council decisions in this area.'}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="preview-panel" aria-labelledby="preview-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your report card</p>
            <h2 id="preview-heading">{selectedCategories.length ? 'Party voting totals' : 'The results will appear here'}</h2>
          </div>
          <span className="status-pill">{selectedCategories.length ? `${selectedCategories.join(' · ')}` : 'Waiting for priorities'}</span>
        </div>

        {!selectedCategories.length ? (
          <div className="empty-state">
            <div className="empty-mark" aria-hidden="true">✦</div>
            <p>Choose at least one category to compare the voting records.</p>
          </div>
        ) : (
          <div className="report-card">
            {results.parties.map((partyScore) => {
              const party = partyById.get(partyScore.partyId)
              if (!party) return null
              return <PartyRow key={party.id} party={party} score={partyScore} voteById={voteById} />
            })}
          </div>
        )}
      </section>

      {selectedCategories.length > 0 && (
        <section className="vote-panel" aria-labelledby="votes-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">The evidence</p>
              <h2 id="votes-heading">Votes in your priorities</h2>
            </div>
            <span className="selection-count">{selectedVotes.length} votes</span>
          </div>
          <div className="category-results">
            {selectedCategories.map((category) => {
              const categoryVotes = selectedVotes.filter((vote) => vote.categories.includes(category))
              return (
                <details className="category-result" key={category} open>
                  <summary>
                    <span className="expand-icon" aria-hidden="true">+</span>
                    <span>{category}</span>
                    <span>{categoryVotes.length} votes</span>
                  </summary>
                  <div className="vote-list">
                    {categoryVotes.map((vote) => <VoteDetails key={vote.id} vote={vote} />)}
                  </div>
                </details>
              )
            })}
          </div>
        </section>
      )}

      <footer id="about" className="footer">
        <span>Vancouver Council Scorecard</span>
        <span>Independent project · Data and methodology coming soon</span>
      </footer>
    </main>
  )
}

export default App
