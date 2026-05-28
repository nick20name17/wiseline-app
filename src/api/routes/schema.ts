interface LoadRouteExtraInfo {
  routeId: number
  lat: number
  lng: number
}
export interface LoadRoute {
  load_id: number
  order: string
  c_city: string
  c_state: string
  c_zip: string
  c_country: string
  dispatch_point: boolean
  c_address: string
  c_name: string
  extra_info: LoadRouteExtraInfo
  position: number
  id: number
}

type CreateLoadRoutePayload = Omit<LoadRoute, 'id'>

export interface UpdateLoadRoutePayload {
  id: number
  payload: Partial<CreateLoadRoutePayload>
}
