import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parse } from 'csv-parse/sync'
import type {
  Councillor,
  Outcome,
  Party,
  RecordedVote,
  ScorecardData,
  Vote,
} from '../src/data/types'

type SourceRow = Record<string, string>

const root = process.cwd()
const dataDirectory = path.join(root, 'data')
const sourcePath = path.join(dataDirectory, 'votes.csv')
const generatedDirectory = path.join(dataDirectory, 'generated')
const outputPath = path.join(generatedDirectory, 'scorecard.json')

const metadataHeaders = [
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
]
const categories = [
  'Housing',
  'Transportation',
  'Environment',
  'Safety',
  'Affordability',
  'Governance',
]
const acceptedVoteValues = new Set<RecordedVote>([
  'Proposed',
  'Supported',
  'Abstained',
  'Absent',
  'Opposed',
  'Amended',
])
const datePattern = new RegExp(`^(\\d{4}-\\d{2}-\\d{2})$`)

const errors: string[] = []
const warnings: string[] = []

function error(message: string) {
  errors.push(message)
}

function warning(message: string) {
  warnings.push(message)
}

function required(row: SourceRow, field: string, rowNumber: number) {
  const value = row[field]?.trim() ?? ''
  if (!value) error(`Row ${rowNumber}: ${field} is required`)
  return value
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function loadJsonFile<T>(fileName: string): Promise<T> {
  return JSON.parse(await readFile(path.join(dataDirectory, fileName), 'utf8')) as T
}

function validateMetadata(parties: Party[], councillors: Councillor[]) {
  const partyIds = new Set<string>()
  for (const party of parties) {
    if (!party.id || !party.name) error(`Party is missing an id or name`)
    if (partyIds.has(party.id)) error(`Duplicate party id: ${party.id}`)
    partyIds.add(party.id)
  }

  const councillorIds = new Set<string>()
  for (const councillor of councillors) {
    if (!councillor.id || !councillor.name) error(`Councillor is missing an id or name`)
    if (councillorIds.has(councillor.id)) error(`Duplicate councillor id: ${councillor.id}`)
    if (!partyIds.has(councillor.partyId)) {
      error(`${councillor.name}: unknown party id ${councillor.partyId}`)
    }
    councillorIds.add(councillor.id)
  }

  return councillorIds
}

function parseWeight(value: string, rowNumber: number): 1 | 2 | 3 {
  if (!value) {
    warning(`Row ${rowNumber}: Weight is blank; defaulting to 1`)
    return 1
  }

  const weight = Number(value)
  if (![1, 2, 3].includes(weight)) {
    error(`Row ${rowNumber}: Weight must be 1, 2, or 3`)
    return 1
  }
  return weight as 1 | 2 | 3
}

function parseOutcome(value: string, rowNumber: number): Outcome {
  const desired = value.toLowerCase()
  if (desired !== 'pass' && desired !== 'fail') {
    error(`Row ${rowNumber}: Outcome must be Pass or Fail`)
    return 'pass'
  }
  return desired
}

function parseCategory(value: string, rowNumber: number) {
  if (value && !categories.includes(value)) {
    error(`Row ${rowNumber}: unknown category ${value}`)
  }
  return value
}

function parseDate(value: string, rowNumber: number) {
  if (!datePattern.test(value)) {
    error(`Row ${rowNumber}: Date must be YYYY-MM-DD`)
  }
  return value
}

function parseSourceUrl(value: string, rowNumber: number) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported protocol')
    return value
  } catch {
    error(`Row ${rowNumber}: News Link must be a valid HTTP(S) URL`)
    return value
  }
}

function parseRecordedVote(value: string, councillorName: string, rowNumber: number) {
  if (!value) return null
  if (!acceptedVoteValues.has(value as RecordedVote)) {
    error(`Row ${rowNumber}: ${councillorName} has unknown vote value ${value}`)
    return null
  }
  return value as RecordedVote
}

async function build() {
  const [parties, councillors, csv] = await Promise.all([
    loadJsonFile<Party[]>('parties.json'),
    loadJsonFile<Councillor[]>('councillors.json'),
    readFile(sourcePath, 'utf8'),
  ])
  validateMetadata(parties, councillors)
  const sourceRows = parse(csv, { columns: true, skip_empty_lines: true, relax_column_count: false }) as SourceRow[]
  const sourceHeaders = Object.keys(sourceRows[0] ?? {})
  const sourceCouncillorNames = sourceHeaders.filter((header) => !metadataHeaders.includes(header))
  const councillorsByName = new Map(councillors.map((councillor) => [councillor.name, councillor]))

  for (const header of metadataHeaders) {
    if (!sourceHeaders.includes(header)) error(`CSV is missing required column ${header}`)
  }
  for (const name of sourceCouncillorNames) {
    if (!councillorsByName.has(name)) error(`CSV councillor column has no metadata record: ${name}`)
  }
  for (const councillor of councillors) {
    if (!sourceCouncillorNames.includes(councillor.name)) {
      warning(`Councillor ${councillor.name} has no column in the current CSV`)
    }
  }

  const usedVoteIds = new Set<string>()
  const votes: Vote[] = sourceRows.map((row, index) => {
    const rowNumber = index + 2
    const title = required(row, 'Vote', rowNumber)
    const baseId = slugify(title)
    const id = baseId || `vote-${index + 1}`
    if (usedVoteIds.has(id)) error(`Row ${rowNumber}: duplicate generated vote id ${id}`)
    usedVoteIds.add(id)

    const councillorVotes: Record<string, RecordedVote | null> = {}
    for (const name of sourceCouncillorNames) {
      const councillor = councillorsByName.get(name)
      if (!councillor) continue
      councillorVotes[councillor.id] = parseRecordedVote(row[name]?.trim() ?? '', name, rowNumber)
    }

    return {
      id,
      title,
      category: parseCategory(required(row, 'Category', rowNumber), rowNumber),
      date: parseDate(required(row, 'Date', rowNumber), rowNumber),
      desiredOutcome: parseOutcome(required(row, 'Desired', rowNumber), rowNumber),
      outcome: parseOutcome(required(row, 'Outcome', rowNumber)),
      outcomeDetails: row['Outcome Details']?.trim() || null,
      weight: parseWeight(row.Weight?.trim() ?? '', rowNumber),
      newsUrl: parseSourceUrl(row['News Link']?.trim() ?? '', rowNumber),
      sourceUrl: parseSourceUrl(row['Meeting Minutes']?.trim() ?? '', rowNumber),
      councillorVotes,
    }
  })

  const output: ScorecardData = {
    categories,
    parties,
    councillors,
    votes,
  }

  if (warnings.length > 0) {
    console.warn(`\nWarnings (${warnings.length}):`)
    for (const message of warnings) console.warn(`- ${message}`)
  }
  if (errors.length > 0) {
    console.error(`\nValidation failed with ${errors.length} error(s):`)
    for (const message of errors) console.error(`- ${message}`)
    process.exitCode = 1
    return
  }

  await mkdir(generatedDirectory, { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`)
  console.log(`Built ${votes.length} votes for ${councillors.length} councillors and ${parties.length} parties`)
  console.log(`Output: ${path.relative(root, outputPath)}`)
}

build().catch((cause) => {
  console.error(cause)
  process.exitCode = 1
})
