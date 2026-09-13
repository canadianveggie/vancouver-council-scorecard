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

export type DesiredOutcome = 'pass' | 'fail'

export type RecordedVote =
  | 'Proposed'
  | 'Supported'
  | 'Abstained'
  | 'Absent'
  | 'Opposed'
  | 'Amended in Opposition'

export type Vote = {
  id: string
  title: string
  categories: string[]
  date: string
  desiredOutcome: DesiredOutcome
  outcome: string
  outcomeDetails: string | null
  weight: 1 | 2 | 3
  sourceUrl: string | null
  councillorVotes: Record<string, RecordedVote | null>
}

export type ScorecardData = {
  schemaVersion: 1
  categories: string[]
  parties: Party[]
  councillors: Councillor[]
  votes: Vote[]
}
