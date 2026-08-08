import { useSyncExternalStore } from 'react'

/**
 * The prototype's store, with the same shape and the same semantics.
 *
 * Each page defines one of these at the top of its script with all of its seed data, mutates it
 * through action functions, and re-renders on change. The port keeps that arrangement rather than
 * spreading the state across component `useState`: the store's keys are the prototype's own idea of
 * what this screen is made of, they are documented as such, and they are the shape a real API will be
 * fitted to. Splitting them up would be a redesign nobody asked for and the fidelity gate cannot check.
 *
 * `set` takes a patch or a function returning one and shallow-merges, exactly as the prototype's does —
 * an action that returns `{ orders }` leaves every other key alone.
 */
export type Store<T> = {
  get: () => T
  set: (updater: Partial<T> | ((state: T) => Partial<T>)) => void
  subscribe: (listener: () => void) => () => void
}

export const createStore = <T extends object>(initialState: T): Store<T> => {
  let state = initialState
  const listeners = new Set<() => void>()

  return {
    get: () => state,
    set: updater => {
      state = { ...state, ...(typeof updater === 'function' ? updater(state) : updater) }
      listeners.forEach(listener => listener())
    },
    subscribe: listener => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}

/**
 * Reads a slice of a store. The selector's result is compared by identity, so a slice must be a value
 * the store keeps rather than one built on each call — `state.orders`, not `state.orders.filter(…)`.
 * Deriving belongs outside, where the React Compiler can see it.
 */
export const useStore = <T extends object, Slice>(store: Store<T>, select: (state: T) => Slice) =>
  useSyncExternalStore(store.subscribe, () => select(store.get()))
