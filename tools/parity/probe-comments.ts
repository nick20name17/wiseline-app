/**
 * Asks the prototype, one comment at a time, whether the element a legacy review comment is pinned to
 * can still be reached — and how. Every attempt starts from a fresh load, because a reveal leaves the
 * page in a state that would flatter the next one.
 *
 *   bun tools/parity/probe-comments.ts <comments.json> <origin>
 *
 * The answer per comment is the migration plan for that comment: `direct` needs nothing, `reveal`
 * needs the port to ship the same hook, and `unreachable` needs a person.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { chromium } from 'playwright'

type LegacyComment = {
  id: number
  path: string
  dc: string | null
  view: string | null
  body: string
}
type Reach = 'direct' | 'reveal' | 'unreachable' | 'no-anchor'

const [file, origin] = process.argv.slice(2)
if (!file || !origin) {
  console.error('usage: probe-comments.ts <comments.json> <origin>')
  process.exit(1)
}

const comments = JSON.parse(await readFile(file, 'utf8')) as LegacyComment[]
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

const results: {
  id: number
  path: string
  dc: string | null
  reach: Reach
  tag?: string
  text?: string
}[] = []

for (const comment of comments) {
  if (!comment.dc) {
    results.push({ id: comment.id, path: comment.path, dc: null, reach: 'no-anchor' })
    continue
  }

  await page.goto(`${origin}/${comment.path}`, { waitUntil: 'networkidle' })

  const found = await page.evaluate(
    ([dataComment, view]) => {
      const find = () =>
        document.querySelector(`[data-comment="${CSS.escape(dataComment as string)}"]`)
      const onscreen = (element: Element | null) => !!element?.getClientRects().length

      const describe = (element: Element, reach: string) => ({
        reach,
        tag: element.tagName.toLowerCase(),
        text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 50)
      })

      const direct = find()
      if (onscreen(direct)) return describe(direct as Element, 'direct')

      const reveal = (
        window as unknown as { __ebmsReveal?: (dc: string, view?: string) => boolean }
      ).__ebmsReveal
      if (typeof reveal !== 'function') return { reach: 'unreachable' }

      reveal(dataComment as string, (view as string) ?? undefined)
      const after = find()
      return onscreen(after) ? describe(after as Element, 'reveal') : { reach: 'unreachable' }
    },
    [comment.dc, comment.view] as const
  )

  results.push({
    id: comment.id,
    path: comment.path,
    dc: comment.dc,
    ...(found as { reach: Reach })
  })
}

await browser.close()

const tally = results.reduce<Record<string, number>>((totals, result) => {
  totals[result.reach] = (totals[result.reach] ?? 0) + 1
  return totals
}, {})

console.table(tally)
for (const result of results.filter(entry => entry.reach === 'unreachable'))
  console.log(`unreachable  ${result.path}  ${result.dc}`)

const out = join(import.meta.dir, '..', '..', 'parity', 'comments-reach.json')
await writeFile(out, `${JSON.stringify(results, null, 2)}\n`)
console.log(`\n→ ${out}`)
