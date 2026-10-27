import { applyDepartmentCounts, refetchCapacity } from '@/features/board'
import { applyShippingCounts } from '@/features/shipping'
import { openLiveSocket } from '@/lib/live-socket'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

/**
 * Keeps every tab strip's counts current as anyone changes them, and has the day strips and Machine
 * Capacities read again for the days whose capacity moved. The pages still read their counts as they
 * open: the socket only follows changes made in the app, not orders arriving from EBMS.
 */
export const useLiveCounts = () => {
  const client = useQueryClient()
  useEffect(
    () =>
      openLiveSocket('ws/counts/', message => {
        if (typeof message !== 'object' || message === null) return
        // The two kinds of message are told apart by their top-level key.
        if ('capacity_changed' in message) {
          refetchCapacity(client, message.capacity_changed)
          return
        }
        if ('shipping' in message) applyShippingCounts(client, message.shipping)
        if ('departments' in message) applyDepartmentCounts(client, message.departments)
      }),
    [client]
  )
}
