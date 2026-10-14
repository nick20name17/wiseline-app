import { useState } from 'react'
import type { PackageLabel } from '../lib/package-label'
import { PackageLabelSheet } from './package-label'

/** One label at a time: `print` mounts the sheet, which unmounts itself once the dialog closes. */
export const usePackageLabel = () => {
  const [label, setLabel] = useState<PackageLabel | null>(null)
  const sheet = label ? <PackageLabelSheet label={label} onDone={() => setLabel(null)} /> : null
  return { print: setLabel, sheet }
}
