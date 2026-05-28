export interface FileParams {
  model_name: 'PackageItem' | 'Package' | 'Skid'
  model_id: number
  folder?: string
}

export interface ModelFile {
  id: number
  full_path: string
  size: number
  last_modified: string
}
