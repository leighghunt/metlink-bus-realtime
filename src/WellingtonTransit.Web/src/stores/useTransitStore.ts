import { useReducer, useCallback } from 'react'
import type { VehiclePosition, Route, Stop } from '../types'

interface TransitState {
  vehicles: Record<string, VehiclePosition>
  routes: Record<string, Route>
  stops: Record<string, Stop>
  activeRoutes: Set<string>       // route IDs the user wants visible
  selectedVehicle: string | null
  selectedStop: string | null
}

type Action =
  | { type: 'UPSERT_VEHICLES'; payload: VehiclePosition[] }
  | { type: 'SET_ROUTES'; payload: Route[] }
  | { type: 'SET_STOPS'; payload: Stop[] }
  | { type: 'TOGGLE_ROUTE'; routeId: string }
  | { type: 'SET_ALL_ROUTES'; visible: boolean }
  | { type: 'SELECT_VEHICLE'; vehicleRef: string | null }
  | { type: 'SELECT_STOP'; stopCode: string | null }

function reducer(state: TransitState, action: Action): TransitState {
  switch (action.type) {
    case 'UPSERT_VEHICLES': {
      const next = { ...state.vehicles }
      const newActiveRoutes = new Set(state.activeRoutes)
      let routesChanged = false
      for (const v of action.payload) {
        next[v.vehicleRef] = v
        // If routes haven't loaded yet, treat every vehicle's route as active
        // so they're visible from the first SignalR message
        if (v.routeId && !state.routes[v.routeId] && !newActiveRoutes.has(v.routeId)) {
          newActiveRoutes.add(v.routeId)
          routesChanged = true
        }
      }
      return routesChanged
        ? { ...state, vehicles: next, activeRoutes: newActiveRoutes }
        : { ...state, vehicles: next }
    }
    case 'SET_ROUTES': {
      const routes: Record<string, Route> = {}
      const activeRoutes = new Set<string>()
      for (const r of action.payload) {
        routes[r.routeId] = r
        activeRoutes.add(r.routeId)
      }
      return { ...state, routes, activeRoutes }
    }
    case 'SET_STOPS': {
      const stops: Record<string, Stop> = {}
      for (const s of action.payload) stops[s.stopCode] = s
      return { ...state, stops }
    }
    case 'TOGGLE_ROUTE': {
      const next = new Set(state.activeRoutes)
      next.has(action.routeId) ? next.delete(action.routeId) : next.add(action.routeId)
      return { ...state, activeRoutes: next }
    }
    case 'SET_ALL_ROUTES': {
      const next = action.visible
        ? new Set(Object.keys(state.routes))
        : new Set<string>()
      return { ...state, activeRoutes: next }
    }
    case 'SELECT_VEHICLE':
      return { ...state, selectedVehicle: action.vehicleRef, selectedStop: null }
    case 'SELECT_STOP':
      return { ...state, selectedStop: action.stopCode, selectedVehicle: null }
    default:
      return state
  }
}

const initialState: TransitState = {
  vehicles: {},
  routes: {},
  stops: {},
  activeRoutes: new Set(),
  selectedVehicle: null,
  selectedStop: null,
}

export function useTransitStore() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const upsertVehicles = useCallback((vehicles: VehiclePosition[]) =>
    dispatch({ type: 'UPSERT_VEHICLES', payload: vehicles }), [])

  const setRoutes = useCallback((routes: Route[]) =>
    dispatch({ type: 'SET_ROUTES', payload: routes }), [])

  const setStops = useCallback((stops: Stop[]) =>
    dispatch({ type: 'SET_STOPS', payload: stops }), [])

  const toggleRoute = useCallback((routeId: string) =>
    dispatch({ type: 'TOGGLE_ROUTE', routeId }), [])

  const setAllRoutes = useCallback((visible: boolean) =>
    dispatch({ type: 'SET_ALL_ROUTES', visible }), [])

  const selectVehicle = useCallback((vehicleRef: string | null) =>
    dispatch({ type: 'SELECT_VEHICLE', vehicleRef }), [])

  const selectStop = useCallback((stopCode: string | null) =>
    dispatch({ type: 'SELECT_STOP', stopCode }), [])

  return {
    ...state,
    upsertVehicles,
    setRoutes,
    setStops,
    toggleRoute,
    setAllRoutes,
    selectVehicle,
    selectStop,
  }
}
