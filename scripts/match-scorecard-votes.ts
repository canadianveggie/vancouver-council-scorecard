import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parse } from 'csv-parse/sync'

type Row = Record<string, string>
type Metadata = Row & { date: Date; normalized: string }

const root = process.cwd()
const scorecardPath = path.join(root, 'data', 'votes.csv')
const metadataPath = path.join(root, 'data', 'council-votes.csv')
const dryRun = process.argv.includes('--dry-run')

const aliases: Record<string, string[]> = {
  "Renter's Office closure": ['renter office'],
  '2023 operating budget': ['2023 budget'],
  'Missing-middle multiplex zoning': ['missing middle housing'],
  'Broadway active-transport lanes': ['broadway active transportation'],
  'Intersection safety cameras': ['intersection safety cameras'],
  'Cornwall Avenue speed reduction': ['cornwall'],
  'Road-paint maintenance plan': ['road paint'],
  'Additional transportation-safety funding': ['active transportation infrastructure'],
  'West-side parking minimums': ['parking minimum'],
  'Hastings rapid-transit priority': ['hastings', 'rapid transit'],
  'Water Street pedestrian pilot': ['water street', 'pedestrian zone'],
  'Granville-Robson scramble crossing': ['scramble crossing'],
  'Temporary modular-housing lease extension': ['temporary modular housing'],
  'Park Board abolition request': ['park board'],
  'Urgent Chinatown measures': ['urgent measures', 'chinatown'],
  '30 km/h on non-arterials': ['safer slower streets'],
  'Dedicated bus lanes on priority routes': ['bus rapid transit'],
  'Accelerated pedestrian-safety measures': ['pedestrian safety'],
  'Citywide parking minimum removal': ['elimination minimum parking'],
  'Scale back Water Street pilot': ['water street'],
  'Reintroduce two-way Beach Avenue': ['beach avenue'],
  'Shared e-scooter pilot': ['e-scooter'],
  'Police access to traffic cameras': ['traffic camera network'],
  '2025 operating budget': ['2025 budget'],
  'Bitcoin-friendly city study': ['bitcoin'],
  'Mushroom dispensary licence reinstatement': ['mushroom'],
  'Kitsilano Pool reimagining': ['kitsilano pool'],
  'Right to Cool for strata buildings': ['cooling rights'],
  'Park Board transition plan': ['park board transition'],
  'Zero-percent 2026 tax direction': ['zero percent', 'property tax'],
  "Renew Vancouver's Vision Zero plan": ['vision zero'],
  'Safer Slower Streets': ['safer slower'],
  'School active-travel planning': ['school travel'],
  'No Right on Red study': ['right on red'],
  'Fatal-crash speed-data collection': ['speed data'],
  'UBCx commitment': ['next stop ubc'],
  'Safe Streets for Trick or Treat': ['trick or treat'],
  '16th and Willow flashing crosswalk': ['16th', 'willow'],
  'Dim bright headlights': ['headlight glare'],
  'Priority snow removal on transit routes': ['snow removal'],
  'Car Free Day emergency grant': ['car free'],
  'Prevent rollback of safety projects': ['road safety'],
  'Vision Zero action-plan implementation': ['vision zero'],
  'Low-income transit pass request': ['fare free transit'],
  'VGH bike-lane redesign': ['vgh', 'bike'],
  'Granville Street pedestrian-zone extension': ['granville', 'pedestrian'],
  'Additional active-transport funding': ['active transportation pathway'],
  'Villages Planning Program': ['villages plan'],
  '105 Keefer Street condo rezoning': ['105 keefer'],
  'Grandview Highway and Southeast Marine social housing': ['2518 2540 grandview', '1925 southeast marine'],
  '2156-2174 West 14th Avenue rental tower': ['2156 2174 west 14th'],
  '701 Kingsway rental tower': ['701 kingsway'],
  '523-549 East 10th Avenue rental building': ['523 549 east 10th'],
  '2175 West 7th Avenue rental tower': ['2175 west 7th'],
  '1780 East Broadway Safeway towers': ['1780 east broadway'],
  'Vancouver Social Housing Initiative': ['social housing initiative'],
  '1026-1108 West 41st Avenue rental rezoning': ['1026 1108 west 41st'],
  '1551-1581 West 7th Avenue rezoning': ['1551 1581 west 7th'],
  '520-590 West 29th and 4510-4550 Ash rezoning': ['520 590 west 29th', '4510 4550 ash'],
  '75 East 8th Avenue rezoning': ['75 east 8th'],
  '441 East Pender Street rezoning': ['441 east pender'],
  '6151-6261 Granville Street rezoning': ['6151 6261 granville'],
}

function normalize(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function csv(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function daysBetween(a: Date, b: Date) {
  return Math.abs(a.getTime() - b.getTime()) / 86_400_000
}

function candidateScore(title: string, scorecardDate: Date, metadata: Metadata) {
  const phrases = aliases[title] ?? [title]
  const text = metadata.normalized
  const matched = phrases.filter((phrase) => normalize(phrase).split(' ').every((token) => text.includes(token))).length
  if (matched === 0) return 0
  const dateDistance = daysBetween(scorecardDate, metadata.date)
  return matched * 1000 - dateDistance
}

async function main() {
  const [scorecardSource, metadataSource] = await Promise.all([
    readFile(scorecardPath, 'utf8'),
    readFile(metadataPath, 'utf8'),
  ])
  const scorecard = parse(scorecardSource, { columns: true, skip_empty_lines: true }) as Row[]
  const metadataRows = parse(metadataSource, { columns: true, delimiter: ';', skip_empty_lines: true }) as Row[]
  const metadata: Metadata[] = metadataRows.map((row) => ({
    ...row,
    date: new Date(row['Vote Date']),
    normalized: normalize(row['Agenda Description']),
  }))

  const headers = Object.keys(scorecard[0] ?? {})
  const outputHeaders = [...headers.filter((header) => !['meetingID', 'voteIDs'].includes(header)), 'meetingID', 'voteIDs']
  const unmatched: string[] = []
  const ambiguous: Array<{ title: string; candidates: string[] }> = []
  const output = scorecard.map((row) => {
    const scorecardDate = new Date(row.Date)
    const scored = metadata
      .map((item) => {
        return { item, score: candidateScore(row.Vote, scorecardDate, item) }
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
    const close = scored.filter(({ item, score }) => score >= (scored[0]?.score ?? 0) - 15 && daysBetween(scorecardDate, item.date) <= 1460)
    const selected = close.slice(0, 20)
    const meetingIds = [...new Set(selected.map(({ item }) => item['Meeting ID']))]
    const voteIds = [...new Set(selected.map(({ item }) => item['Vote Number']))]
    if (selected.length === 0) unmatched.push(row.Vote)
    if (selected.length > 1) ambiguous.push({ title: row.Vote, candidates: voteIds })
    return { ...row, meetingID: meetingIds.join('|'), voteIDs: voteIds.join('|') }
  })

  console.log(`Matched ${output.length - unmatched.length} of ${output.length} scorecard votes`)
  console.log(`Unmatched: ${unmatched.length}; multiple candidate vote IDs: ${ambiguous.length}`)
  if (unmatched.length) console.log(`\nUnmatched:\n- ${unmatched.join('\n- ')}`)
  if (ambiguous.length) console.log(`\nMultiple candidates:\n${ambiguous.map(({ title, candidates }) => `- ${title}: ${candidates.join(', ')}`).join('\n')}`)
  if (dryRun) return

  const serialized = [
    outputHeaders.join(','),
    ...output.map((row) => outputHeaders.map((header) => csv(row[header] ?? '')).join(',')),
  ].join('\n') + '\n'
  await writeFile(scorecardPath, serialized)
  console.log(`Updated ${path.relative(root, scorecardPath)}`)
}

main().catch((cause) => {
  console.error(cause)
  process.exitCode = 1
})
