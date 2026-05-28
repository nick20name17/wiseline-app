// export interface GeocodeParams {
//   city: string
//   country: string
//   street?: string
//   state: string
//   limit?: number
// }

// export interface GeocodeResponse {
//   place_id: number
//   licence: string
//   osm_type: string
//   osm_id: number
//   lat: string
//   lon: string
//   class: string
//   type: string
//   place_rank: number
//   importance: number
//   addresstype: string
//   name: string
//   display_name: string
//   boundingbox: string[]
// }

export interface GeocodeParams {
  address: string
}
export interface GeocodeResponse {
  results: Result[]
  status: string
}

interface Result {
  address_components: AddressComponent[]
  formatted_address: string
  geometry: Geometry
  place_id: string
  types: string[]
}

interface AddressComponent {
  long_name: string
  short_name: string
  types: string[]
}

interface Geometry {
  location: Location
  location_type: string
  viewport: Viewport
}

interface Location {
  lat: number
  lng: number
}

interface Viewport {
  northeast: Northeast
  southwest: Southwest
}

interface Northeast {
  lat: number
  lng: number
}

interface Southwest {
  lat: number
  lng: number
}
