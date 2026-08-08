/**
 * The gate. Compares a recorded port against the recorded prototype on three axes and prints one
 * verdict per page:
 *
 *   1. `data-comment` parity — the migration key for every existing review comment, so a missing one
 *      is a comment that cannot be carried over. Checked first because it is the cheapest to read.
 *   2. structure — the normalised tree, which catches a hierarchy change a screenshot cannot see.
 *   3. pixels — what a reviewer actually looks at.
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

  for (const [index, child] of left.children.entries()) {
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
  const missing = baseline.comments.filter(comment => !have.has(comment))
  if (missing.length)
    problems.push(`${missing.length} data-comment missing: ${missing.slice(0, 8).join(', ')}`)

  const structural = firstStructuralDiff(baseline.tree, candidate.tree)
  if (structural) problems.push(structural)

  const pixels = await pixelDiff(key).catch(() => null)
  if (!pixels) problems.push('no screenshot on one side')
  else if (pixels.ratio > PIXEL_BUDGET)
    problems.push(`${(pixels.ratio * 100).toFixed(2)}% pixels differ ${pixels.note}`.trim())

  if (problems.length) {
    failures += 1
    console.log(`✗ ${key}`)
    for (const problem of problems) console.log(`    ${problem}`)
  } else {
    console.log(`✓ ${key}`)
  }
}

process.exit(failures ? 1 : 0)
