import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parse } from 'csv-parse/sync'

type Row = Record<string, string>

const root = process.cwd()
const votesPath = path.join(root, 'data', 'votes.csv')
const councilVotesPath = path.join(root, 'data', 'council-votes.csv')
const councilRecordsPath = path.join(root, 'data', 'council-voting-records.csv')
const outputPath = path.join(root, 'data', 'vote-reconciliation.csv')

const councillors = [
  'Ken Sim',
  'Brian Montague',
  'Sarah Kirby-Yung',
  'Mike Klassen',
  'Lenny Zhou',
  'Peter Meiszner',
  'Lisa Dominato',
  'Rebecca Bligh',
  'Pete Fry',
  'Adriane Carr',
  'Christine Boyle',
  'Lucy Maloney',
  'Sean Orr',
]

const councilMemberNames: Record<string, string> = {
  'Ken Sim': 'Mayor K Sim',
  'Brian Montague': 'Councillor B Montague',
  'Sarah Kirby-Yung': 'Councillor S Kirby-Yung',
  'Mike Klassen': 'Councillor M Klassen',
  'Lenny Zhou': 'Councillor L Zhou',
  'Peter Meiszner': 'Councillor P Meiszner',
  'Lisa Dominato': 'Councillor L Dominato',
  'Rebecca Bligh': 'Councillor R Bligh',
  'Pete Fry': 'Councillor P Fry',
  'Adriane Carr': 'Councillor A Carr',
  'Christine Boyle': 'Councillor C Boyle',
  'Lucy Maloney': 'Councillor L Maloney',
  'Sean Orr': 'Councillor S Orr',
}

const outputHeaders = [
  'Row Type',
  'Vote',
  'Description',
  'Date',
  'Outcome',
  'NewsLink',
  ...councillors,
]

function csv(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function values(rows: Row[], field: string) {
  return [...new Set(rows.map((row) => row[field]?.trim() ?? '').filter(Boolean))].join(' | ')
}

async function main() {
  const [votesSource, councilVotesSource, recordsSource] = await Promise.all([
    readFile(votesPath, 'utf8'),
    readFile(councilVotesPath, 'utf8'),
    readFile(councilRecordsPath, 'utf8'),
  ])

  const votes = parse(votesSource, { columns: true, skip_empty_lines: true }) as Row[]
  const councilVotes = parse(councilVotesSource, { columns: true, delimiter: ';', skip_empty_lines: true }) as Row[]
  const records = parse(recordsSource, { columns: true, delimiter: ';', skip_empty_lines: true }) as Row[]

  const councilVotesByNumber = new Map<string, Row[]>()
  for (const row of councilVotes) {
    const voteNumber = row['Vote Number']?.trim()
    if (!voteNumber) continue
    const existing = councilVotesByNumber.get(voteNumber) ?? []
    existing.push(row)
    councilVotesByNumber.set(voteNumber, existing)
  }

  const recordsByVote = new Map<string, Row[]>()
  for (const row of records) {
    const key = `${row['Meeting ID']}|${row['Vote Number']}`
    const existing = recordsByVote.get(key) ?? []
    existing.push(row)
    recordsByVote.set(key, existing)
  }

  const blank = Object.fromEntries(outputHeaders.map((header) => [header, '']))
  const output: Row[] = []
  let matchedVotes = 0
  let councilVoteRows = 0

  for (const vote of votes) {
    output.push({
      ...blank,
      'Row Type': 'Vote',
      Vote: vote.Vote ?? '',
      Description: vote.Description ?? '',
      Date: vote.Date ?? '',
      Outcome: vote.Outcome ?? '',
      NewsLink: vote['News Link'] ?? '',
      ...Object.fromEntries(councillors.map((name) => [name, vote[name] ?? ''])),
    })

    const voteNumbers = (vote.voteIDs ?? '').split('|').map((id) => id.trim()).filter(Boolean)
    const matchedCouncilVotes = voteNumbers.flatMap((number) => councilVotesByNumber.get(number) ?? [])
    if (matchedCouncilVotes.length > 0) matchedVotes += 1

    for (const councilVote of matchedCouncilVotes) {
      const key = `${councilVote['Meeting ID']}|${councilVote['Vote Number']}`
      const matchingRecords = recordsByVote.get(key) ?? []
      output.push({
        ...blank,
        'Row Type': 'CouncilVote',
        Vote: `${councilVote['Meeting ID'] ?? ''}:${councilVote['Vote Number'] ?? ''}`,
        Description: councilVote['Agenda Description'] ?? '',
        Date: councilVote['Vote Date'] ?? '',
        Decision: councilVote['Vote Decision'] ?? '',
        ...Object.fromEntries(
          councillors.map((name) => [
            name,
            values(matchingRecords.filter((record) => record['Council Member'] === councilMemberNames[name]), 'Vote'),
          ]),
        ),
      })
      councilVoteRows += 1
    }

    output.push(blank)
  }

  const serialized = [
    outputHeaders.join(','),
    ...output.map((row) => outputHeaders.map((header) => csv(row[header] ?? '')).join(',')),
  ].join('\n') + '\n'
  await writeFile(outputPath, serialized)
  console.log(`Reconciled ${votes.length} votes; ${matchedVotes} had CouncilVote matches.`)
  console.log(`Included ${councilVoteRows} CouncilVote rows.`)
  console.log(`Output: ${path.relative(root, outputPath)}`)
}

main().catch((cause) => {
  console.error(cause)
  process.exitCode = 1
})
