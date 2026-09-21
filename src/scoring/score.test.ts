import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Councillor, Party, Vote } from '../data/types'
import { calculateScores, scoreRecordedVote } from './score'

const parties: Party[] = [
  { id: 'abc', name: 'ABC', logo: null },
  { id: 'green', name: 'Green', logo: null },
]

const councillors: Councillor[] = [
  { id: 'alice', name: 'Alice', partyId: 'abc' },
  { id: 'bob', name: 'Bob', partyId: 'green' },
  { id: 'newcomer', name: 'Newcomer', partyId: 'abc' },
]

const votes: Vote[] = [
  {
    id: 'housing-1',
    title: 'Build homes',
    category: 'Housing',
    date: '2024-01-01',
    desiredOutcome: 'pass',
    outcome: 'Passed',
    outcomeDetails: null,
    weight: 2,
    sourceUrl: null,
    councillorVotes: { alice: 'Proposed', bob: 'Opposed', newcomer: null },
  },
  {
    id: 'safety-1',
    title: 'Improve safety',
    category: 'Safety',
    date: '2024-02-01',
    desiredOutcome: 'fail',
    outcome: 'Failed',
    outcomeDetails: null,
    weight: 1,
    sourceUrl: null,
    councillorVotes: { alice: 'Supported', bob: 'Absent', newcomer: 'Abstained' },
  },
]

test('scores a vote using direction and weight', () => {
  assert.equal(scoreRecordedVote('Proposed', 'pass', 2), 4)
  assert.equal(scoreRecordedVote('Supported', 'fail', 3), -3)
  assert.equal(scoreRecordedVote('Amended', 'fail', 1), 2)
})

test('calculates councillor and party totals', () => {
  const results = calculateScores(votes, councillors, parties, ['Housing', 'Safety'])
  const alice = results.councillors.find((councillor) => councillor.councillorId === 'alice')!
  const bob = results.councillors.find((councillor) => councillor.councillorId === 'bob')!
  const newcomer = results.councillors.find((councillor) => councillor.councillorId === 'newcomer')!

  assert.equal(alice.total, 3)
  assert.equal(alice.applicableVotes, 2)
  assert.equal(bob.total, -2)
  assert.equal(bob.absentVotes, 1)
  assert.equal(newcomer.total, 0)
  assert.equal(newcomer.applicableVotes, 1)
  assert.equal(newcomer.voteScores['housing-1'], null)

  assert.equal(results.parties.find((party) => party.partyId === 'abc')?.total, 3)
  assert.equal(results.parties.find((party) => party.partyId === 'green')?.total, -2)
})

test('only includes votes from selected categories', () => {
  const results = calculateScores(votes, councillors, parties, ['Housing'])
  assert.deepEqual(results.selectedVoteIds, ['housing-1'])
  assert.equal(results.councillors.find((councillor) => councillor.councillorId === 'alice')?.total, 4)
})
