import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

type AgendaVote = {
  date: string
  item: string
  speakers: number
  source: string
}

const args = process.argv.slice(2)
const outputFlag = args.indexOf('--out')
const outputPath = outputFlag >= 0 ? args[outputFlag + 1] : null
const sources = args.filter((arg, index) => arg !== '--out' && (outputFlag < 0 || index !== outputFlag + 1))

if (sources.length === 0) {
  console.error('Usage: pnpm agenda:speakers <agenda-url-or-file> [more sources] [--out output.csv]')
  process.exit(1)
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function csv(value: string | number) {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function meetingDate(html: string, source: string) {
  const dateLocation = html.match(
    /<div\b[^>]*(?:id|class)=["'][^"']*meetingDateLocation[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  )
  const text = stripHtml(dateLocation?.[1] ?? html)
  const match = text.match(/([A-Z][a-z]+ \d{1,2})(?:,\s*\d{1,2})?(?:\s+and\s+\d{1,2})?,\s*(\d{4})/)
  if (match) return `${match[1]}, ${match[2]}`

  const urlDate = source.match(/\/(\d{4})(\d{2})(\d{2})\//)
  if (urlDate) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]
    return `${months[Number(urlDate[2]) - 1]} ${Number(urlDate[3])}, ${urlDate[1]}`
  }

  throw new Error(`Could not find a meeting date in ${source}`)
}

async function loadSource(source: string) {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source, { headers: { 'User-Agent': 'VancouverCouncilScorecard/1.0' } })
    if (!response.ok) throw new Error(`Could not fetch ${source}: ${response.status} ${response.statusText}`)
    return response.text()
  }
  return readFile(path.resolve(source), 'utf8')
}

function scrape(html: string, source: string): AgendaVote[] {
  const date = meetingDate(html, source)
  const headings = [...html.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)]
  const results: AgendaVote[] = []

  headings.forEach((heading, index) => {
    const item = stripHtml(heading[1])
    if (!/^\d+\./.test(item)) return

    const start = heading.index ?? 0
    const end = index + 1 < headings.length ? headings[index + 1].index ?? html.length : html.length
    const section = stripHtml(html.slice(start, end))
    const speakerMatch = section.match(/Registered speakers[^:]*:\s*(\d+)/i)
    const noSpeakers = /\(no speakers\b/i.test(section)
    if (!speakerMatch && !noSpeakers) return

    results.push({
      date,
      item,
      speakers: speakerMatch ? Number(speakerMatch[1]) : 0,
      source,
    })
  })

  return results
}

const rows: AgendaVote[] = []
for (const source of sources) {
  const html = await loadSource(source)
  rows.push(...scrape(html, source))
}

const output = [
  'Date,Item,Number of speakers,Source',
  ...rows.map((row) => [row.date, row.item, row.speakers, row.source].map(csv).join(',')),
].join('\n') + '\n'

if (outputPath) {
  await writeFile(path.resolve(outputPath), output)
  console.error(`Wrote ${rows.length} agenda items to ${outputPath}`)
} else {
  process.stdout.write(output)
}
