/**
 * Lifts each prototype page's stylesheet into the port, whole and in order.
 *
 *   bun tools/port/extract-css.ts <path-to-wiseline-demo>
 *
 * An earlier version pulled the rules every page shares into one `base.css`. It was wrong, and
 * measurably: the shared rules are the density overrides the prototype puts *last*, so hoisting them
 * into a file loaded *first* flipped the cascade — `.btn` went from 30px to 36px, and the sign-in card
 * grew 6px. Every page would have carried its own version of that bug.
 *
 * So nothing is shared. Fifteen stylesheets repeat perhaps twenty rules each, which costs a few
 * kilobytes and buys the only thing that matters here: each page cascades exactly as it did.
 *
 * Every `<style>` on the page counts, attributes and all: the role switcher ships its own block as
 * `<style data-comment="role-switch-style">`, and a pattern that only matched a bare `<style>` left the
 * «Viewing as» control unstyled — static instead of a fixed floating pill, which the pixel gate saw
 * and nothing else would have.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { scopeCss } from './scope.ts'

const demoDir = process.argv[2]
if (!demoDir) {
  console.error('usage: extract-css.ts <path-to-wiseline-demo>')
  process.exit(1)
}

/**
 * Pages another page mounts inline, and the class that marks where. Each gets a second sheet scoped
 * under that class, so its rules outrank the host's for the classes both define — see `scope.ts`.
 */
const HOSTED: Record<string, string> = { stockcards: 'wl-stockcards-host' }

const outDir = join(import.meta.dir, '..', '..', 'src', 'styles')
await mkdir(outDir, { recursive: true })

const files = (await readdir(demoDir)).filter(name => name.endsWith('.html')).sort()

for (const file of files) {
  const html = await readFile(join(demoDir, file), 'utf8')
  const css = Array.from(html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g))
    .map(match => match[1])
    .join('\n')

  const page = file.replace(/\.html$/, '')
  await writeFile(join(outDir, `${page}.css`), `${scopeCss(css, page)}\n`)
  console.log(`${page}.css — ${(css.length / 1024).toFixed(1)} kB`)

  const hostClass = HOSTED[page]
  if (!hostClass) continue

  await writeFile(join(outDir, `${page}.hosted.css`), `${scopeCss(css, page, hostClass)}\n`)
  console.log(`${page}.hosted.css — under .${hostClass}`)
}
