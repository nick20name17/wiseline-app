/**
 * Dumps a prototype page's store, as the page itself builds it, into JSON the port seeds from.
 *
 *   bun tools/port/dump-seed.ts <page> <origin>      # e.g. home http://localhost:8848
 *
 * Retyping the seed by hand would be both enormous and dangerous. A quarter of the review comments
 * anchor to `data-comment` values built at runtime from entity ids — `wrap-locrow-13`, `prod-donebtn-4`
 * — so an order that comes out with a different id takes its comments with it. Letting the prototype
 * compute its own seed and copying the result is the only way those ids are guaranteed to match.
 *
 * Deterministic because the prototype pins its own clock: `TODAY` is a constant, not `new Date()`.
 * `localStorage` is cleared first so a previous session's cross-page state cannot leak into the seed.
 */
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { chromium } from 'playwright'

const [page, origin] = process.argv.slice(2)
if (!page || !origin) {
  console.error('usage: dump-seed.ts <page> <origin>')
  process.exit(1)
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const browserPage = await context.newPage()

await browserPage.goto(`${origin}/${page}.html`, { waitUntil: 'domcontentloaded' })
await browserPage.evaluate(() => localStorage.clear())
await browserPage.reload({ waitUntil: 'networkidle' })

// `store` is a top-level `const` in the page's script: it lives in the global lexical scope, which a
// bare identifier reaches and `window.store` does not
const seed = await browserPage.evaluate('store.get()')

await browser.close()

const out = join(import.meta.dir, '..', '..', 'src', 'features', page === 'home' ? 'trim' : page, 'seed.json')
await writeFile(out, `${JSON.stringify(seed, null, 2)}\n`)
console.log(`${out} — ${Object.keys(seed as object).join(', ')}`)
