/**
 * What the field shows of a line's description: EBMS keeps it as a memo with CRLF breaks, and most
 * end in one, which would only give every row an empty second line.
 */
export const shownDescription = (description: string | null) => description?.trimEnd() ?? ''

/**
 * What a description edit saves, or `null` when nothing was changed. A textarea reads the memo's CRLF
 * back as LF, so the two are compared as LF and the edit is saved with the memo's CRLF.
 */
export const editedDescription = (description: string | null, typed: string) =>
  typed === shownDescription(description).replaceAll('\r\n', '\n')
    ? null
    : typed.replaceAll('\n', '\r\n')
