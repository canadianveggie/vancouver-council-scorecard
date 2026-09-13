import type {
  Councillor,
  DesiredOutcome,
  Party,
  RecordedVote,
  Vote,
} from '../data/types'

const baseValues: Record<RecordedVote, number> = {
  Proposed: 2,
  Supported: 1,
  Abstained: 0,
  Absent: 0,
  Opposed: -1,
  'Amended in Opposition': -2,
}

export type CouncillorScore = {
  councillorId: string
  partyId: string
  total: number
  applicableVotes: number
  absentVotes: number
  voteScores: Record<string, number | null>
}

export type PartyScore = {
  partyId: string
  total: number
  councillorScores: CouncillorScore[]
}

export type ScorecardResults = {
  selectedVoteIds: string[]
  councillors: CouncillorScore[]
  parties: PartyScore[]
}

export function scoreRecordedVote(
  recordedVote: RecordedVote,
  desiredOutcome: DesiredOutcome,
  weight: number,
) {
  const direction = desiredOutcome === 'pass' ? 1 : -1
  return baseValues[recordedVote] * direction * weight
}

function selectedVotes(votes: Vote[], selectedCategories: string[]) {
  return votes.filter((vote) =>
    vote.categories.some((category) => selectedCategories.includes(category)),
  )
}

export function calculateScores(
  votes: Vote[],
  councillors: Councillor[],
  parties: Party[],
  selectedCategories: string[],
): ScorecardResults {
  const selected = selectedVotes(votes, selectedCategories)
  const councillorScores = councillors.map((councillor) => {
    const voteScores: Record<string, number | null> = {}
    let total = 0
    let applicableVotes = 0
    let absentVotes = 0

    for (const vote of selected) {
      const recordedVote = vote.councillorVotes[councillor.id]
      if (recordedVote === null || recordedVote === undefined) {
        voteScores[vote.id] = null
        continue
      }

      const score = scoreRecordedVote(recordedVote, vote.desiredOutcome, vote.weight)
      voteScores[vote.id] = score
      total += score
      applicableVotes += 1
      if (recordedVote === 'Absent') absentVotes += 1
    }

    return {
      councillorId: councillor.id,
      partyId: councillor.partyId,
      total,
      applicableVotes,
      absentVotes,
      voteScores,
    }
  })

  const partyScores = parties.map((party) => {
    const partyCouncillors = councillorScores.filter(
      (councillor) => councillor.partyId === party.id,
    )
    return {
      partyId: party.id,
      total: partyCouncillors.reduce((total, councillor) => total + councillor.total, 0),
      councillorScores: partyCouncillors,
    }
  })

  return {
    selectedVoteIds: selected.map((vote) => vote.id),
    councillors: councillorScores,
    parties: partyScores,
  }
}
