/**
 * Records one build — the HTML prototype or the React port — as a set of captures plus screenshots.
 *
 *   bun tools/parity/capture.ts demo   http://localhost:8848
 *   bun tools/parity/capture.ts port   http://localhost:5173
 *
 * The prototype is the baseline; recording it is the first thing done and the last thing changed.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { chromium, type Page as BrowserPage } from 'playwright'

import { type Capture, collectSource } from './collect.ts'
import { PAGES, pageName, VIEWPORTS, type Page } from './manifest.ts'

const [side, origin] = process.argv.slice(2)

if (side !== 'demo' && side !== 'port') {
  console.error('usage: capture.ts <demo|port> <origin>')
  process.exit(1)
}
if (!origin) {
  console.error('an origin is required — nothing is assumed about where a build is served')
  process.exit(1)
}

const outputDir = join(import.meta.dir, '..', '..', 'parity', side)

const urlFor = (page: Page) =>
  side === 'demo' ? `${origin}/${page.demo}` : `${origin}${page.route}`

/**
 * Which views a page has, asked of the page rather than of a list here: the prototype toggles `.view`
 * divs, and it is the authority on which ones exist. A page with none is captured once, as itself.
 */
const viewsOf = (browserPage: BrowserPage) =>
  browserPage.evaluate(() =>
    Array.from(document.querySelectorAll('.view'))
      .map(view => view.id)
      .filter(Boolean)
  )

/**
 * The port renders only the view it is showing, so its DOM cannot be asked what the others are — it is
 * told, from what the prototype said. That also keeps both sides walking the same list while the port
 * is unfinished and renders nothing for half of it.
 */
const portViews = async (page: Page) => {
  const baseline = JSON.parse(
    await readFile(join(import.meta.dir, '..', '..', 'parity', 'demo', 'captures.json'), 'utf8')
  ) as { page: string; view: string | null }[]

  return [
    ...new Set(
      baseline.filter(capture => capture.page === pageName(page)).map(capture => capture.view)
    )
  ].filter((view): view is string => view !== null)
}

/** The prototype's own way in is its `navigate()`; the port's is its URL. */
const showView = (browserPage: BrowserPage, view: string, page: Page) =>
  side === 'demo'
    ? browserPage.evaluate(viewId => {
        const navigate = (window as unknown as { navigate?: (page: string) => void }).navigate
        if (typeof navigate === 'function') navigate(viewId.replace(/^view-/, ''))
      }, view)
    : browserPage.goto(`${origin}${page.route}?view=${view.replace(/^view-/, '')}`, {
        waitUntil: 'networkidle'
      })

const browser = await chromium.launch()
const captures: Capture[] = []

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height }
  })
  /**
   * The port guards its pages and would answer every one of them with the sign-in screen. The
   * prototype has no guard and defaults to a Manager viewing every department, so that is who the
   * port is captured as — anything else compares two different people's screens.
   */
  await context.addInitScript(() => {
    localStorage.setItem('wl_role', 'manager')
    localStorage.setItem('wl_dept', 'all')
  })

  const browserPage = await context.newPage()

  for (const page of PAGES) {
    const name = pageName(page)
    const url = urlFor(page)

    const response = await browserPage.goto(url, { waitUntil: 'networkidle' }).catch(() => null)
    if (!response || !response.ok()) {
      console.warn(`skip ${name} @ ${viewport.name} — ${url} did not load`)
      continue
    }

    const views = side === 'demo' ? await viewsOf(browserPage) : await portViews(page)
    for (const view of views.length ? views : [null]) {
      if (view) {
        await showView(browserPage, view, page)
        // the prototype's view transition is 400ms, and a screenshot mid-fade is not a baseline
        await browserPage.waitForTimeout(600)
      }

      const collected = (await browserPage.evaluate(collectSource)) as Pick<
        Capture,
        'comments' | 'tree'
      >
      captures.push({ page: name, view, viewport: viewport.name, ...collected })

      const shot = [name, view ?? 'page', viewport.name].join('__')
      await mkdir(join(outputDir, 'shots'), { recursive: true })
      await browserPage.screenshot({
        path: join(outputDir, 'shots', `${shot}.png`),
        fullPage: true,
        animations: 'disabled'
      })
      console.log(`${shot}: ${collected.comments.length} data-comment`)
    }
  }

  await context.close()
}

await browser.close()
await writeFile(join(outputDir, 'captures.json'), `${JSON.stringify(captures, null, 2)}\n`)
console.log(`\n${captures.length} captures → parity/${side}/`)
