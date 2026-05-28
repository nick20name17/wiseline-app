import { format, isSameDay, isSameMonth, isSameYear } from 'date-fns'

const formatter = new Intl.NumberFormat('en-US', {
  style: 'unit',
  unit: 'pound',
  unitDisplay: 'short',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})

export const formatWeight = (weight: number) => {
  const formatted = formatter.format(weight)
  return formatted.replace(/\blb\b/, 'lbs')
}

export const formatLength = (inches: number, short = false) => {
  const feet = Math.floor(inches / 12)
  const remainingInches = inches % 12

  const inchesFormatted =
    Math.abs(remainingInches - Math.round(remainingInches)) < 0.01
      ? remainingInches.toFixed(0)
      : remainingInches.toFixed(1)

  const main = `${feet}’ ${inchesFormatted}”`

  if (short) return main

  return `${main} (${inches.toFixed(1)}”)`
}

export const capitalize = (str: string | undefined): string =>
  str
    ? str
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : ''

export const formatInitials = ({
  firstName,
  lastName
}: {
  firstName: string | undefined
  lastName: string | undefined
}) => {
  if (!firstName || !lastName) return '-'

  return firstName.charAt(0).toUpperCase() + lastName.charAt(0).toUpperCase()
}

const ordinalRules = new Intl.PluralRules('en-US', { type: 'ordinal' })

const suffixes: Record<Intl.LDMLPluralRule, string> = {
  one: 'st',
  two: 'nd',
  few: 'rd',
  other: 'th',
  zero: 'th',
  many: 'th'
}

export const ordinal = (n: number) => {
  const rule = ordinalRules.select(n)
  return `${n}${suffixes[rule]}`
}

export const formatDateRange = (min: string, max: string) => {
  if (isSameDay(min, max)) {
    return format(min, 'EEE, d.MM.yyyy')
  }

  if (isSameMonth(min, max)) {
    return `${format(min, 'EEE')}–${format(max, 'EEE')}, ${format(min, 'd')}–${format(max, 'd.MM.yyyy')}`
  }

  if (isSameYear(min, max)) {
    return `${format(min, 'EEE, d.MM')} – ${format(max, 'EEE, d.MM.yyyy')}`
  }

  return `${format(min, 'EEE, d.MM.yyyy')} – ${format(max, 'EEE, d.MM.yyyy')}`
}
