export type Party = {
  id: string
  name: string
  logo: string | null
}

export type Councillor = {
  id: string
  name: string
  partyId: string
  notes?: string | null
}

export type Outcome = 'pass' | 'fail'

export type RecordedVote =
  | 'Proposed'
  | 'Supported'
  | 'Abstained'
  | 'Absent'
  | 'Opposed'
  | 'Amended'

export type Vote = {
  id: string
  title: string
  category: string
  date: string
  desiredOutcome: Outcome
  outcome: Outcome
  outcomeDetails: string | null
  weight: number
  newsUrl: string | null
  sourceUrl: string | null
  councillorVotes: Record<string, RecordedVote | null>
}

export type ScorecardData = {
  categories: string[]
  parties: Party[]
  councillors: Councillor[]
  votes: Vote[]
}
