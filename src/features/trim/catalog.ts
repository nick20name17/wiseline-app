/**
 * The trim profiles a stock card can be printed for, keyed by the code its QR encodes.
 *
 * A scan carries only the Product ID, so this is what turns it into a line someone can read. It is a
 * plain map rather than the Stock Cards page's card list because a card can be deleted and reprinted
 * while the profile it names goes on existing.
 */
export const PRODUCT_CATALOG: Record<string, string> = {
  TSWB262: 'Sidewall Flashing',
  TDRIP24: 'Drip Edge',
  TRAKE24: 'Rake Trim',
  TVAL26: 'Valley',
  TGABLE26: 'Gable Trim',
  TRIDGE26: 'Ridge Cap',
  TDE8262: 'Eave Trim',
  TWCAP24: 'W-Valley',
  TCORN26: 'Outside Corner'
}
