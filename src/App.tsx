import { useMemo, useState } from 'react'
import scorecardJson from '../data/generated/scorecard.json'
import type { ScorecardData } from './data/types'
import { calculateScores, type CouncillorScore, type PartyScore } from './scoring/score'

const data = scorecardJson as ScorecardData

const categoryDescriptions: Record<string, string> = {
  Housing: 'Homes, density, and neighbourhood plans.',
  Transportation: 'How people move around the city.',
  Environment: 'Climate action and resilient communities.',
  Safety: 'Vision Zero and public safety.',
  Affordability: 'The cost of living in Vancouver.',
  Governance: 'Integrity, accountability, and democracy.',
}

function formatScore(score: number | null) {
  if (score === null) return '—'
  return score > 0 ? `+${score}` : `${score}`
}

function scoreClass(score: number | null) {
  if (score === null) return 'score-muted'
  return score >= 0 ? 'score-positive' : 'score-negative'
}

function selectedVotesForCategory(category: string) {
  return data.votes.filter((vote) => vote.category === category)
}

function scoreForVote(score: PartyScore | CouncillorScore, voteId: string) {
  if ('councillorScores' in score) {
    return score.councillorScores.reduce((total, councillor) => total + (councillor.voteScores[voteId] ?? 0), 0)
  }
  return score.voteScores[voteId]
}

function scoreForCategory(
  score: PartyScore | CouncillorScore,
  category: string,
  categoryResults: Map<string, ReturnType<typeof calculateScores>>,
) {
  if ('councillorScores' in score) {
    return categoryResults.get(category)?.parties.find((party) => party.partyId === score.partyId)?.total ?? 0
  }
  return categoryResults.get(category)?.councillors.find((councillor) => councillor.councillorId === score.councillorId)?.total ?? 0
}

function ScoreTable({ selectedCategories }: { selectedCategories: string[] }) {
  const [expandedParties, setExpandedParties] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const overallResults = useMemo(
    () => calculateScores(data.votes, data.councillors, data.parties, selectedCategories),
    [selectedCategories],
  )
  const categoryResults = useMemo(
    () => new Map(selectedCategories.map((category) => [
      category,
      calculateScores(data.votes, data.councillors, data.parties, [category]),
    ])),
    [selectedCategories],
  )
  const sortedPartyScores = [...overallResults.parties].sort((a, b) => {
    const scoreDifference = b.total - a.total
    if (scoreDifference !== 0) return scoreDifference
    return (data.parties.find((party) => party.id === a.partyId)?.name ?? '').localeCompare(
      data.parties.find((party) => party.id === b.partyId)?.name ?? '',
    )
  })

  function toggleParty(partyId: string) {
    setExpandedParties((current) => {
      const next = new Set(current)
      if (next.has(partyId)) next.delete(partyId)
      else next.add(partyId)
      return next
    })
  }

  function toggleCategory(category: string) {
    setExpandedCategories((current) => {
      const next = new Set(current)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  return (
    <div className="score-table-shell">
      <table className="score-table">
        <thead>
          <tr>
            <th className="category-header" rowSpan={2} scope="col">Category</th>
            {sortedPartyScores.map((partyScore) => {
              const party = data.parties.find((item) => item.id === partyScore.partyId)
              if (!party) return null
              const expanded = expandedParties.has(party.id)
              return (
                <th
                  className="party-header"
                  colSpan={expanded ? partyScore.councillorScores.length : 1}
                  key={party.id}
                  scope="colgroup"
                >
                  <button type="button" onClick={() => toggleParty(party.id)} aria-expanded={expanded}>
                    <span className="column-plus" aria-hidden="true">{expanded ? '−' : '+'}</span>
                    <span>{party.name}</span>
                  </button>
                </th>
              )
            })}
            <th className="total-header" rowSpan={2} scope="col">All parties</th>
          </tr>
          <tr>
            {sortedPartyScores.flatMap((partyScore) => expandedParties.has(partyScore.partyId)
              ? partyScore.councillorScores.map((councillorScore) => {
                const councillor = data.councillors.find((item) => item.id === councillorScore.councillorId)
                return councillor ? <th className="councillor-header" key={councillor.id} scope="col">{councillor.name}</th> : null
              })
              : [])}
          </tr>
        </thead>
        <tbody>
          <tr className="overall-table-row">
            <th scope="row">Overall grade</th>
            {sortedPartyScores.flatMap((partyScore) => expandedParties.has(partyScore.partyId)
              ? partyScore.councillorScores.map((councillor) => <td className={scoreClass(councillor.total)} key={councillor.councillorId}>{formatScore(councillor.total)}</td>)
              : <td className={scoreClass(partyScore.total)} key={partyScore.partyId}>{formatScore(partyScore.total)}</td>)}
            <td className={`total-cell ${scoreClass(overallResults.councillors.reduce((total, councillor) => total + councillor.total, 0))}`}>
              {formatScore(overallResults.councillors.reduce((total, councillor) => total + councillor.total, 0))}
            </td>
          </tr>
          {selectedCategories.flatMap((category) => {
            const expanded = expandedCategories.has(category)
            const rows = [
              { id: category, label: category, date: categoryDescriptions[category], voteId: null },
              ...(expanded ? selectedVotesForCategory(category).map((vote) => ({ id: vote.id, label: vote.title, date: vote.date, voteId: vote.id })) : []),
            ]
            return rows.map((row, index) => (
              <tr className={`category-table-row ${expanded ? 'vote-table-row' : ''}`} key={`${category}-${row.id}`}>
                <th scope="row">
                  {index === 0 && (
                    <button className="row-expander category-expander" type="button" onClick={() => toggleCategory(category)} aria-expanded={expanded} title={categoryDescriptions[category]}>
                      <span className="table-plus" aria-hidden="true">{expanded ? '−' : '+'}</span>
                      <span>{category}</span>
                    </button>
                  )}
                  {index > 0 && <span className="vote-row-label">{row.label}<small>{row.date}</small></span>}
                </th>
                {sortedPartyScores.flatMap((partyScore) => expandedParties.has(partyScore.partyId)
                  ? partyScore.councillorScores.map((councillor) => {
                    const value = row.voteId ? scoreForVote(councillor, row.voteId) : scoreForCategory(councillor, category, categoryResults)
                    return <td className={scoreClass(value)} key={councillor.councillorId}>{formatScore(value)}</td>
                  })
                  : <td className={scoreClass(row.voteId ? scoreForVote(partyScore, row.voteId) : scoreForCategory(partyScore, category, categoryResults))} key={partyScore.partyId}>{formatScore(row.voteId ? scoreForVote(partyScore, row.voteId) : scoreForCategory(partyScore, category, categoryResults))}</td>)}
                <td className={`total-cell ${scoreClass(row.voteId ? data.councillors.reduce((total, councillor) => total + (scoreForVote(overallResults.councillors.find((score) => score.councillorId === councillor.id)!, row.voteId!) ?? 0), 0) : (categoryResults.get(category)?.councillors.reduce((total, councillor) => total + councillor.total, 0) ?? 0))}`}>
                  {formatScore(row.voteId ? data.councillors.reduce((total, councillor) => total + (scoreForVote(overallResults.councillors.find((score) => score.councillorId === councillor.id)!, row.voteId!) ?? 0), 0) : (categoryResults.get(category)?.councillors.reduce((total, councillor) => total + councillor.total, 0) ?? 0))}
                </td>
              </tr>
            ))
          })}
        </tbody>
      </table>
    </div>
  )
}

function App() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

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
        <h1 id="page-title">Vote based on actions<br /><em>not just promises</em></h1>
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
            <h2 id="preview-heading">{selectedCategories.length ? 'Voting report card' : 'The results will appear here'}</h2>
          </div>
          <span className="status-pill">{selectedCategories.length ? `${selectedCategories.join(' · ')}` : 'Waiting for priorities'}</span>
        </div>

        {!selectedCategories.length ? (
          <div className="empty-state">
            <div className="empty-mark" aria-hidden="true">✦</div>
            <p>Choose at least one category to compare the voting records.</p>
          </div>
        ) : (
          <ScoreTable selectedCategories={selectedCategories} />
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
