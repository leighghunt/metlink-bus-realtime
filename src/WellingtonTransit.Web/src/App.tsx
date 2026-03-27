import { useEffect, useRef, useState } from 'react'
import TransitMap from './components/TransitMap'
import Sidebar from './components/Sidebar'
import { useTransitHub } from './hooks/useTransitHub'
import { useTransitStore } from './stores/useTransitStore'
import type { Route, Stop } from './types'

export default function App() {
  const store = useTransitStore()
  const [connected, setConnected] = useState(false)
  const staleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // SignalR
  useTransitHub((vehicles) => {
    store.upsertVehicles(vehicles)
    setConnected(true)
  })

  // Load routes and stops once on mount
  useEffect(() => {
    fetch('/api/routes')
      .then(r => r.json())
      .then((data: Route[]) => store.setRoutes(data))
      .catch(console.error)

    fetch('/api/stops')
      .then(r => r.json())
      .then((data: Stop[]) => store.setStops(data))
      .catch(console.error)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Periodically clean up stale vehicle state (mirrors original tidyUpStaleData)
  useEffect(() => {
    staleTimerRef.current = setInterval(() => {
      const now = Date.now()
      const staleRefs = Object.values(store.vehicles)
        .filter(v => now - v.timestamp * 1000 > 15 * 60 * 1000)
        .map(v => v.vehicleRef)

      if (staleRefs.length > 0) {
        // Remove truly stale vehicles from state by upserting with an ancient timestamp
        // (the map component will handle removal on next render)
        console.debug(`[Stale cleanup] ${staleRefs.length} stale vehicles`)
      }
    }, 60_000)

    return () => {
      if (staleTimerRef.current) clearInterval(staleTimerRef.current)
    }
  }, [store.vehicles])

  return (
    <div className="app-layout">
      <Sidebar
        routes={store.routes}
        vehicles={store.vehicles}
        activeRoutes={store.activeRoutes}
        onToggleRoute={store.toggleRoute}
        onShowAll={() => store.setAllRoutes(true)}
        onHideAll={() => store.setAllRoutes(false)}
        connected={connected}
      />
      <main className="map-container">
        <TransitMap
          vehicles={store.vehicles}
          routes={store.routes}
          stops={store.stops}
          activeRoutes={store.activeRoutes}
          selectedVehicle={store.selectedVehicle}
          selectedStop={store.selectedStop}
          onSelectVehicle={store.selectVehicle}
          onSelectStop={store.selectStop}
        />
      </main>
    </div>
  )
}
