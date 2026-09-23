import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parse } from 'csv-parse/sync'

type RecordRow = Record<string, string>
type MetadataRow = {
  meetingType: string
  voteDate: string
  voteNumber: string
  agendaDescription: string
  voteStartDateTime: string
  voteDecision: string
}

const root = process.cwd()
const inputPath = path.join(root, 'data', 'council-voting-records.csv')
const outputPath = path.join(root, 'data', 'council-votes.csv')

function csv(value: string) {
  return /[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

async function main() {
  const source = await readFile(inputPath, 'utf8')
  const rows = parse(source, {
    bom: true,
    columns: true,
    delimiter: ';',
    skip_empty_lines: true,
  }) as RecordRow[]

  const seen = new Set<string>()
  const metadata: MetadataRow[] = []
  for (const row of rows) {
    const item: MetadataRow = {
      meetingType: row['Meeting Type'] ?? '',
      voteDate: row['Vote Date'] ?? '',
      voteNumber: row['Vote Number'] ?? '',
      agendaDescription: row['Agenda Description'] ?? '',
      voteStartDateTime: row['Vote Start Date Time'] ?? '',
      voteDecision: row.Decision ?? '',
    }
    const key = [
      item.meetingType,
      item.voteDate,
      item.voteNumber,
      item.agendaDescription,
      item.voteStartDateTime,
      item.voteDecision,
    ].join('\u001f')
    if (seen.has(key)) continue
    seen.add(key)
    metadata.push(item)
  }

  metadata.sort((a, b) =>
    `${a.voteDate} ${a.voteStartDateTime} ${a.voteNumber}`.localeCompare(
      `${b.voteDate} ${b.voteStartDateTime} ${b.voteNumber}`,
    ),
  )

  const headers = [
    'Meeting Type',
    'Vote Date',
    'Vote Number',
    'Agenda Description',
    'Vote Start Date Time',
    'Vote Decision',
  ]
  const fields: Array<keyof MetadataRow> = [
    'meetingType',
    'voteDate',
    'voteNumber',
    'agendaDescription',
    'voteStartDateTime',
    'voteDecision',
  ]
  const output = [
    headers.join(';'),
    ...metadata.map((item) => fields.map((field) => csv(item[field])).join(';')),
  ].join('\n') + '\n'

  await writeFile(outputPath, output)
  console.log(`Reduced ${rows.length.toLocaleString()} records to ${metadata.length.toLocaleString()} unique votes`)
  console.log(`Output: ${path.relative(root, outputPath)}`)
}

main().catch((cause) => {
  console.error(cause)
  process.exitCode = 1
})
