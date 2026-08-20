/**
 * The gate. Compares a recorded port against the recorded prototype on three axes and prints one
 * verdict per page:
 *
 *   1. `data-comment` parity — the migration key for every existing review comment, so a missing one
 *      is a comment that cannot be carried over. Checked first because it is the cheapest to read.
 *   2. structure — the normalised tree, which catches a hierarchy change a screenshot cannot see.
 *   3. pixels — what a reviewer actually looks at. Reported as `⚠` and never fatal: a percentage cannot
 *      tell a moved element from a map tile that had not loaded, and the first two axes are the ones a
 *      review comment depends on.
 *
 *   bun tools/parity/compare.ts [page]
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

import type { Capture, Node } from './collect.ts'

const only = process.argv[2]
const root = join(import.meta.dir, '..', '..', 'parity')

/** Below this the difference is antialiasing, above it somebody moved something. */
const PIXEL_BUDGET = 0.001

const read = async (side: 'demo' | 'port') =>
  JSON.parse(await readFile(join(root, side, 'captures.json'), 'utf8')) as Capture[]

const keyOf = (capture: Capture) =>
  [capture.page, capture.view ?? 'page', capture.viewport].join('__')

/**
 * Anchors the port cannot have, named one at a time with the reason — not a switch for silencing others.
 *
 * `stockcards-frame` is the prototype's `<iframe>`. Trim hosts the Stock Cards screen as a component
 * here (the prototype's own note asks for exactly that), so there is no frame element for a comment to
 * land on. A comment written against it belongs to the window, which is `stockcards-modal`, still there.
 *
 * `nav-warehouse` is the link to a page this port no longer has. #119 asked what the Warehouse screen was
 * for; it was never in the canvas — the prototype invented it — and the answer was to drop it. The link
 * therefore goes from every sidebar, which is fifteen pages' worth of one missing anchor.
 */
const ABSENT_BY_DESIGN = new Set(['stockcards-frame', 'nav-warehouse'])

/**
 * Walks both trees together and stops at the first disagreement, reporting the path to it. One
 * honest difference is more useful than a hundred consequences of it.
 */
const firstStructuralDiff = (left: Node, right: Node, path = 'body'): string | null => {
  if (left.tag !== right.tag) return `${path}: <${left.tag}> became <${right.tag}>`
  if (left.text !== right.text) return `${path}: text "${left.text}" became "${right.text}"`

  const lost = left.classes.filter(cls => !right.classes.includes(cls))
  if (lost.length) return `${path}: lost class ${lost.join(' ')}`

  if (left.comment !== right.comment)
    return `${path}: data-comment ${left.comment ?? '—'} became ${right.comment ?? '—'}`

  if (left.children.length !== right.children.length)
    return `${path}: ${left.children.length} children became ${right.children.length}`

  /**
   * At the root, children are paired by name rather than by position.
   *
   * Everything below is compared in order, because order is the layout. But the root's children are the
   * app, whichever overlay is open, and the toast — and in the port an overlay is portalled to `#root`,
   * so it arrives whenever it mounts: a modal keyed to reset its draft re-appends itself and lands after
   * the toast. The prototype writes the same three in a fixed order in its HTML. What matters is that the
   * same overlay is there and that its inside matches, and both of those are still checked.
   */
  if (path === 'body') {
    const nameOf = (node: Node) => node.comment ?? `${node.tag}.${node.classes.join('.')}`
    const byName = new Map(right.children.map(child => [nameOf(child), child]))

    for (const child of left.children) {
      const twin = byName.get(nameOf(child))
      if (!twin) return `${path}: no ${nameOf(child)} among the port's own children`
      const next = firstStructuralDiff(child, twin, `${path} > ${nameOf(child)}`)
      if (next) return next
    }
    return null
  }

  for (const [index, child] of left.children.entries()) {
    // an element the port is not supposed to have takes its subtree with it — see `ABSENT_BY_DESIGN`
    if (child.comment && ABSENT_BY_DESIGN.has(child.comment)) continue

    const next = firstStructuralDiff(
      child,
      right.children[index],
      `${path} > ${child.tag}[${index}]`
    )
    if (next) return next
  }
  return null
}

const pixelDiff = async (key: string) => {
  const load = async (side: 'demo' | 'port') =>
    PNG.sync.read(await readFile(join(root, side, 'shots', `${key}.png`)))

  const [before, after] = await Promise.all([load('demo'), load('port')])
  if (before.width !== after.width || before.height !== after.height)
    return { ratio: 1, note: `${before.width}×${before.height} vs ${after.width}×${after.height}` }

  const differing = pixelmatch(before.data, after.data, null, before.width, before.height, {
    threshold: 0.1
  })
  return { ratio: differing / (before.width * before.height), note: '' }
}

const [demo, port] = await Promise.all([read('demo'), read('port')])
const ported = new Map(port.map(capture => [keyOf(capture), capture]))

let failures = 0
let drifted = 0

for (const baseline of demo) {
  const key = keyOf(baseline)
  if (only && !key.startsWith(only)) continue

  const candidate = ported.get(key)
  if (!candidate) {
    console.log(`⋯ ${key} — not ported yet`)
    continue
  }

  const problems: string[] = []

  const have = new Set(candidate.comments)
  const missing = baseline.comments.filter(
    comment => !have.has(comment) && !ABSENT_BY_DESIGN.has(comment)
  )
  if (missing.length)
    problems.push(`${missing.length} data-comment missing: ${missing.slice(0, 8).join(', ')}`)

  // the roots are a `<body>` on one side and the mount `<div>` on the other; only what is in them counts
  const asRoot = (node: Node): Node => ({
    ...node,
    tag: 'root',
    classes: [],
    comment: null,
    text: ''
  })
  const structural = firstStructuralDiff(asRoot(baseline.tree), asRoot(candidate.tree))
  if (structural) problems.push(structural)

  /**
   * The pixel diff reports; it does not decide.
   *
   * Anchors and structure are the contract — a comment lands on an element or it does not — and they
   * fail the run. A percentage is a net: it is how three cascade bugs were found, and it is also how a
   * sub-pixel of antialiasing or a map tile that had not arrived reads as a broken screen. So it is
   * printed, loudly, on every screen that drifts past the budget, and looked at rather than obeyed.
   */
  const pixels = await pixelDiff(key).catch(() => null)
  const drift =
    !pixels || pixels.ratio > PIXEL_BUDGET
      ? (pixels
          ? `${(pixels.ratio * 100).toFixed(2)}% pixels differ ${pixels.note}`
          : 'no screenshot on one side'
        ).trim()
      : null

  if (problems.length) {
    failures += 1
    console.log(`✗ ${key}`)
    for (const problem of problems) console.log(`    ${problem}`)
    if (drift) console.log(`    ${drift}`)
  } else if (drift) {
    drifted += 1
    console.log(`⚠ ${key}`)
    console.log(`    ${drift}`)
  } else {
    console.log(`✓ ${key}`)
  }
}

if (drifted)
  console.log(
    `\n${drifted} screen${drifted === 1 ? '' : 's'} drifted past the pixel budget — look, then decide`
  )

process.exit(failures ? 1 : 0)
