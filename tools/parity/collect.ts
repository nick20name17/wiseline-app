/**
 * What a page is reduced to before two builds are compared. Runs inside the browser on both sides,
 * so the prototype and the port are read by one function rather than two that agree today.
 *
 * Attributes are deliberately not part of the shape: the React side carries `data-review-src` that
 * the prototype cannot have, and inline `style` moves whenever a measured layout is written back.
 * `data-comment` is read explicitly because it is the one attribute the port promises to keep.
 */

/** Carry no visual meaning; they would only add noise to a structural diff. */
const IGNORED_TAGS = ['SCRIPT', 'STYLE', 'LINK', 'META', 'TEMPLATE', 'NOSCRIPT']

export type Node = {
  tag: string
  /** Sorted, so a class list reordered by a refactor is not a difference. */
  classes: string[]
  comment: string | null
  /** Own text only — a parent does not inherit what its children say. */
  text: string
  children: Node[]
}

export type Capture = {
  page: string
  view: string | null
  viewport: string
  comments: string[]
  tree: Node
}

/** Serialised and evaluated in the page, so it closes over nothing — the tag list is inlined. */
export const collectSource = `(${((ignoredTags: string[]) => {
  const skip = new Set(ignoredTags)

  const ownText = (element: Element) =>
    Array.from(element.childNodes)
      .filter(node => node.nodeType === 3)
      .map(node => node.textContent ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

  const visible = (element: Element) => {
    const style = getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    return element.getClientRects().length > 0
  }

  const walk = (element: Element): unknown => ({
    tag: element.tagName.toLowerCase(),
    classes: Array.from(element.classList).sort(),
    comment: element.getAttribute('data-comment'),
    text: ownText(element),
    children: Array.from(element.children)
      .filter(child => !skip.has(child.tagName) && visible(child))
      .map(walk)
  })

  const comments = Array.from(document.querySelectorAll('[data-comment]'))
    .filter(element => visible(element))
    .map(element => element.getAttribute('data-comment') as string)
    .sort()

  return { comments, tree: walk(document.body) }
}).toString()})(${JSON.stringify(IGNORED_TAGS)})`
