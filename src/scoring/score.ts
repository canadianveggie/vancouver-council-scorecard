import type { Councillor, Outcome, Party, RecordedVote, Vote } from '../data/types'

const baseValues: Record<RecordedVote, number> = {
  Proposed: 2, Supported: 1, Abstained: 0, Absent: 0, Opposed: -1, Amended: -2,
}

export type CategoryGrade = {
  category: string
  letterGrade: string
  voteScores: Record<string, number | null>
}

export type CouncillorScore = {
  councillorId: string
  partyId: string
  letterGrade: string
  categoryGrades: CategoryGrade[]
}

export type PartyScore = {
  partyId: string
  letterGrade: string
  councillors: CouncillorScore[]
  categoryGrades: CategoryGrade[]
}

export type ScorecardResults = {
  parties: PartyScore[]
}

export function scoreRecordedVote(recordedVote: RecordedVote, desiredOutcome: Outcome, weight: number) {
  const direction = desiredOutcome === 'pass' ? 1 : -1
  return baseValues[recordedVote] * direction * weight
}

export function gradeForScore(averageScore: number) {
  if (averageScore > 1) return 'A+'
  if (averageScore > 0.9) return 'A'
  if (averageScore > 0.75) return 'B'
  if (averageScore > 0.4) return 'C'
  if (averageScore >= 0) return 'D'
  return 'F'
}

function gradeForVoteScores(voteScores: Record<string, number | null>, votes: Vote[]) {
  const scoredVotes = votes.filter((vote) => voteScores[vote.id] !== null && voteScores[vote.id] !== undefined)
  const total = scoredVotes.reduce((sum, vote) => sum + voteScores[vote.id]!, 0)
  const totalWeight = scoredVotes.reduce((sum, vote) => sum + vote.weight, 0)
  return gradeForScore(totalWeight === 0 ? 0 : total / totalWeight)
}

function categoryGrade(category: string, votes: Vote[], voteScores: Record<string, number | null>): CategoryGrade {
  return { category, letterGrade: gradeForVoteScores(voteScores, votes), voteScores }
}

function scoreForVote(councillorId: string, vote: Vote) {
  const recordedVote = vote.councillorVotes[councillorId]
  return recordedVote ? scoreRecordedVote(recordedVote, vote.desiredOutcome, vote.weight) : null
}

function scoresForCouncillor(councillor: Councillor, votes: Vote[], categories: string[]): CouncillorScore {
  const categoryGrades = categories.map((category) => {
    const categoryVotes = votes.filter((vote) => vote.category === category)
    const voteScores = Object.fromEntries(categoryVotes.map((vote) => [vote.id, scoreForVote(councillor.id, vote)]))
    return categoryGrade(category, categoryVotes, voteScores)
  })
  const voteScores = Object.fromEntries(votes.map((vote) => [vote.id, scoreForVote(councillor.id, vote)]))

  return {
    councillorId: councillor.id,
    partyId: councillor.partyId,
    letterGrade: gradeForVoteScores(voteScores, votes),
    categoryGrades,
  }
}

function averageVoteScores(councillors: CouncillorScore[], vote: Vote) {
  const scores = councillors.map((councillor) => {
    const category = councillor.categoryGrades.find((result) => result.category === vote.category)
    return category?.voteScores[vote.id]
  })
  const recordedScores = scores.filter((score): score is number => score !== null && score !== undefined)
  return recordedScores.length === 0
    ? null
    : recordedScores.reduce((sum, score) => sum + score, 0) / recordedScores.length
}

function scoresForParty(councillors: CouncillorScore[], votes: Vote[], categories: string[], partyId: string): PartyScore {
  const categoryGrades = categories.map((category) => {
    const categoryVotes = votes.filter((vote) => vote.category === category)
    const voteScores = Object.fromEntries(categoryVotes.map((vote) => [vote.id, averageVoteScores(councillors, vote)]))
    return categoryGrade(category, categoryVotes, voteScores)
  })
  const voteScores = Object.fromEntries(votes.map((vote) => [vote.id, averageVoteScores(councillors, vote)]))

  return {
    partyId,
    letterGrade: gradeForVoteScores(voteScores, votes),
    councillors,
    categoryGrades,
  }
}

export function calculateScores(
  votes: Vote[],
  councillors: Councillor[],
  parties: Party[],
  selectedCategories: string[],
): ScorecardResults {
  const selectedVotes = votes.filter((vote) => selectedCategories.includes(vote.category))
  const councillorScores = councillors.map((councillor) => scoresForCouncillor(councillor, selectedVotes, selectedCategories))

  return {
    parties: parties.map((party) => scoresForParty(
      councillorScores.filter((councillor) => councillor.partyId === party.id),
      selectedVotes,
      selectedCategories,
      party.id,
    )),
  }
}
