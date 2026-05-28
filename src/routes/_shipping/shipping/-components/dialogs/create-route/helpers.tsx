type RouteLike = {
  position?: number | null
  extra_info?: { lat?: number; lng?: number } | null
}

export const shouldUpdateRoute = (
  current: RouteLike,
  next: { lat?: number; lng?: number },
  nextPosition: number
) => {
  const curPosition = current.position ?? null
  const curLat = current.extra_info?.lat ?? null
  const curLng = current.extra_info?.lng ?? null

  return curPosition !== nextPosition || curLat !== next.lat || curLng !== next.lng
}
