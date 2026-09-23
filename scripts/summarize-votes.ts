import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parse } from 'csv-parse/sync'

type SourceRow = Record<string, string>

const root = process.cwd()
const sourcePath = path.join(root, 'data', 'votes.csv')
const metadataHeaders = new Set([
  'Vote',
  'Description',
  'Category',
  'Date',
  'Desired',
  'Outcome',
  'Outcome Details',
  'Weight',
  'News Link',
  'Meeting Minutes',
  'voteId',
])

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = getKey(item)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

function printTable(title: string, rows: Array<[string, string | number]>) {
  console.log(`\n${title}`)
  const width = Math.max(...rows.map(([label]) => label.length))
  for (const [label, value] of rows) {
    console.log(`  ${label.padEnd(width)}  ${value}`)
  }
}

async function summarize() {
  const csv = await readFile(sourcePath, 'utf8')
  const rows = parse(csv, { columns: true, skip_empty_lines: true }) as SourceRow[]
  if (rows.length === 0) {
    console.log('No votes found.')
    return
  }

  const headers = Object.keys(rows[0])
  const councillors = headers.filter((header) => !metadataHeaders.has(header))
  const categories = rows.map((row) => row.Category.trim()).filter(Boolean)
  const outcomes = countBy(rows, (row) => row.Outcome.trim() || 'Blank')
  const years = countBy(rows, (row) => row.Date.slice(0, 4) || 'Unknown')
  const categoryTotals = countBy(categories, (category) => category)
  const recordedVoteValues = new Set(['Supported', 'Opposed', 'Abstained', 'Absent', 'Proposed', 'Amended'])
  const knownVotes = rows.flatMap((row) => councillors.map((name) => row[name]?.trim()).filter(Boolean))
  const votesByValue = countBy(knownVotes, (value) => value)
  const missingSources = rows.filter((row) => !row['News Link']?.trim()).length
  const missingDescriptions = rows.filter((row) => !row.Description?.trim()).length
  const weightedTotal = rows.reduce((sum, row) => sum + (Number(row.Weight) || 0), 0)

  const unanimous = rows.filter((row) => {
    const votes = councillors
      .map((name) => row[name]?.trim())
      .filter((vote): vote is string => Boolean(vote) && vote !== 'Absent')
    return votes.length >= 2 && new Set(votes).size === 1
  }).length
  const contested = rows.filter((row) => {
    const votes = councillors.map((name) => row[name]?.trim())
    return votes.includes('Supported') && votes.includes('Opposed')
  }).length

  console.log(`Vote summary for ${path.relative(root, sourcePath)}`)
  console.log(`Total votes: ${rows.length}`)
  console.log(`Councillor columns: ${councillors.length}`)
  console.log(`Total assigned weight: ${weightedTotal}`)

  printTable('Category totals', categoryTotals.map(([label, count]) => [label, count]))
  printTable('Outcome totals', outcomes)
  printTable('Votes by year', years.sort((a, b) => a[0].localeCompare(b[0])))
  printTable('Recorded vote values', votesByValue)
  printTable('Coverage checks', [
    ['Votes with no source link', missingSources],
    ['Votes with no description', missingDescriptions],
    ['Votes with a unanimous recorded result', unanimous],
    ['Votes with recorded support and opposition', contested],
    ['Unknown councillor cells', rows.length * councillors.length - knownVotes.length],
  ])

  const councillorRows = councillors.map((name) => {
    const values = rows.map((row) => row[name]?.trim()).filter(Boolean)
    const proposed = values.filter((value) => value === 'Proposed').length
    const supported = values.filter((value) => value === 'Supported').length
    const opposed = values.filter((value) => value === 'Opposed').length
    const amended = values.filter((value) => value === 'Amended').length
    const absent = values.filter((value) => value === 'Absent').length
    const recorded = values.filter((value) => recordedVoteValues.has(value)).length
    return [name, `${recorded} recorded; ${proposed} proposed; ${supported} supported; ${opposed} opposed; ${amended} amended; ${absent} absent`] as [string, string]
  })
  printTable('Councillor coverage and positions', councillorRows)
}

summarize().catch((cause) => {
  console.error(cause)
  process.exitCode = 1
})
