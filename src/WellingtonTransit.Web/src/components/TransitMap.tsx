import { useEffect, useRef, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { VehiclePosition, Stop, Route } from '../types'
import { getDelayColour, getVehicleMode, isStale } from '../types'

const WELLINGTON_CENTER: [number, number] = [174.7762, -41.2865]
const PORIRUA_CENTER: [number, number] = [174.8397, -41.1355]

// How many trail segments to keep per vehicle
const MAX_TRAIL_SEGMENTS = 20

interface TrailEntry {
  from: [number, number]
  to: [number, number]
  timestamp: number
}

interface Props {
  vehicles: Record<string, VehiclePosition>
  routes: Record<string, Route>
  stops: Record<string, Stop>
  activeRoutes: Set<string>
  selectedVehicle: string | null
  selectedStop: string | null
  onSelectVehicle: (ref: string | null) => void
  onSelectStop: (code: string | null) => void
}

export default function TransitMap({
  vehicles,
  routes,
  stops,
  activeRoutes,
  selectedVehicle,
  selectedStop,
  onSelectVehicle,
  onSelectStop,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const vehicleMarkers = useRef<Record<string, maplibregl.Marker>>({})
  const stopMarkers = useRef<Record<string, maplibregl.Marker>>({})
  const trails = useRef<Record<string, TrailEntry[]>>({})
  const popup = useRef<maplibregl.Popup | null>(null)
  const prevVehicles = useRef<Record<string, VehiclePosition>>({})

  // Initialise map once
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: PORIRUA_CENTER,
      zoom: 11,
    })

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.current.addControl(
      new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }),
      'top-right'
    )

    popup.current = new maplibregl.Popup({ closeButton: true, maxWidth: '280px' })

    // Add trail source + layer
    map.current.on('load', () => {
      map.current!.addSource('trails', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.current!.addLayer({
        id: 'trails',
        type: 'line',
        source: 'trails',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2,
          'line-opacity': ['get', 'opacity'],
        },
      })
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Update vehicle markers when vehicles or activeRoutes change
  useEffect(() => {
    if (!map.current) return

    const now = Date.now()

    for (const [ref, vehicle] of Object.entries(vehicles)) {
      // Drop vehicles that haven't reported in 15 minutes
      const reallyStale = isStale(vehicle.timestamp, 15 * 60 * 1000)
      if (reallyStale) {
        removeVehicleMarker(ref)
        continue
      }

      // Filter by active routes — hide marker but don't skip entirely so
      // the vehicle is still tracked in state and can reappear when toggled
      // Also show the vehicle even if its route hasn't loaded yet (routes
      // arrive via a separate fetch and may lag behind the first SignalR batch)
      const visible = activeRoutes.has(vehicle.routeId)

      // Build colour
      const stale = isStale(vehicle.timestamp)

      const color = stale ? '#6b7280' : getDelayColour(vehicle.delaySeconds)
      const mode = getVehicleMode(vehicle.route)

      // Trail update
      const prev = prevVehicles.current[ref]
      if (prev && (prev.lat !== vehicle.lat || prev.long !== vehicle.long)) {
        if (!trails.current[ref]) trails.current[ref] = []
        trails.current[ref].push({
          from: [prev.long, prev.lat],
          to: [vehicle.long, vehicle.lat],
          timestamp: now,
        })
        // Trim to max segments
        if (trails.current[ref].length > MAX_TRAIL_SEGMENTS)
          trails.current[ref].shift()
      }

      // Create or update marker
      if (!vehicleMarkers.current[ref]) {
        const el = createVehicleElement(ref, color, mode, vehicle.bearing)
        const marker = new maplibregl.Marker({ element: el, rotation: 0 })
          .setLngLat([vehicle.long, vehicle.lat])
          .addTo(map.current!)

        el.addEventListener('click', () => onSelectVehicle(ref))
        vehicleMarkers.current[ref] = marker
      } else {
        vehicleMarkers.current[ref].setLngLat([vehicle.long, vehicle.lat])
        updateVehicleElement(vehicleMarkers.current[ref].getElement(), color, vehicle.bearing)
      }

      vehicleMarkers.current[ref].getElement().style.display = visible ? 'block' : 'none'
    }

    prevVehicles.current = { ...vehicles }
    updateTrails()
  }, [vehicles, routes, activeRoutes, onSelectVehicle])

  // Update stop markers when stops or activeRoutes change
  useEffect(() => {
    if (!map.current) return

    for (const [code, stop] of Object.entries(stops)) {
      if (!stopMarkers.current[code]) {
        const el = createStopElement()
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([stop.stopLon, stop.stopLat])
          .addTo(map.current!)

        el.addEventListener('click', (e) => {
          e.stopPropagation()
          onSelectStop(code)
        })
        stopMarkers.current[code] = marker
      }
    }
  }, [stops, onSelectStop])

  // Show vehicle popup
  useEffect(() => {
    if (!map.current || !popup.current) return
    if (!selectedVehicle) { popup.current.remove(); return }

    const vehicle = vehicles[selectedVehicle]
    if (!vehicle) return

    const route = routes[vehicle.routeId]
    const mode = getVehicleMode(vehicle.route)
    const modeEmoji = mode === 'train' ? '🚆' : mode === 'ferry' ? '⛴️' : '🚌'
    const delay = vehicle.delaySeconds
    const delayText = delay === null ? '' : delay > 60
      ? `<span class="delay-badge late">${Math.round(delay / 60)}m late</span>`
      : `<span class="delay-badge ontime">On time</span>`

    popup.current
      .setLngLat([vehicle.long, vehicle.lat])
      .setHTML(`
        <div class="transit-popup">
          <div class="popup-header">
            <span class="popup-mode">${modeEmoji}</span>
            <div>
              <div class="popup-title">${route?.routeShortName ?? vehicle.route} ${route?.routeDesc ?? ''}</div>
              <div class="popup-sub">Vehicle ${vehicle.vehicleRef}</div>
            </div>
            ${delayText}
          </div>
          <div class="popup-detail">Trip: ${vehicle.tripId}</div>
          <div class="popup-detail">Departure: ${vehicle.departureTime}</div>
          <div class="popup-detail">Bearing: ${Math.round(vehicle.bearing)}°</div>
        </div>
      `)
      .addTo(map.current!)
  }, [selectedVehicle, vehicles, routes])

  // Show stop popup
  useEffect(() => {
    if (!map.current || !popup.current) return
    if (!selectedStop) { popup.current.remove(); return }

    const stop = stops[selectedStop]
    if (!stop) return

    popup.current
      .setLngLat([stop.stopLon, stop.stopLat])
      .setHTML(`
        <div class="transit-popup">
          <div class="popup-header">
            <span class="popup-mode">🚏</span>
            <div>
              <div class="popup-title">${stop.stopName}</div>
              <div class="popup-sub">Stop ${stop.stopCode}</div>
            </div>
          </div>
          <div class="popup-detail" id="departures-${stop.stopCode}">Loading departures…</div>
        </div>
      `)
      .addTo(map.current!)

    // Fetch departures asynchronously and update the popup content
    fetch(`/api/stop-departures/${stop.stopCode}`)
      .then(r => r.json())
      .then(data => {
        const el = document.getElementById(`departures-${stop.stopCode}`)
        if (!el) return
        const deps = data?.departures ?? []
        if (deps.length === 0) { el.textContent = 'No upcoming departures'; return }
        el.innerHTML = deps.slice(0, 5).map((d: {
          serviceId?: string
          destination?: { name?: string }
          departure?: { expected?: string; aimed?: string }
          status?: string
        }) => {
          const time = d.departure?.expected ?? d.departure?.aimed ?? ''
          const due = time ? new Date(time).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' }) : ''
          return `<div class="departure-row">
            <span class="dep-service">${d.serviceId ?? ''}</span>
            <span class="dep-dest">${d.destination?.name ?? ''}</span>
            <span class="dep-time">${due}</span>
          </div>`
        }).join('')
      })
      .catch(() => {
        const el = document.getElementById(`departures-${stop.stopCode}`)
        if (el) el.textContent = 'Could not load departures'
      })
  }, [selectedStop, stops])

  const updateTrails = useCallback(() => {
    if (!map.current?.getSource('trails')) return

    const now = Date.now()
    const features: GeoJSON.Feature[] = []

    for (const [, segments] of Object.entries(trails.current)) {
      const len = segments.length
      segments.forEach((seg, i) => {
        const age = now - seg.timestamp
        const opacity = Math.max(0, 1 - age / 60000) * (i / len)
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [seg.from, seg.to] },
          properties: { color: '#60a5fa', opacity },
        })
      })
    }

    const source = map.current.getSource('trails') as maplibregl.GeoJSONSource
    source.setData({ type: 'FeatureCollection', features })
  }, [])

  function removeVehicleMarker(ref: string) {
    vehicleMarkers.current[ref]?.remove()
    delete vehicleMarkers.current[ref]
    delete trails.current[ref]
  }

  return (
    <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
  )
}

// ── Marker helpers ──────────────────────────────────────────────────────────

function createVehicleElement(
  _ref: string,
  color: string,
  mode: string,
  bearing: number
): HTMLElement {
  const el = document.createElement('div')
  el.className = 'vehicle-marker'
  el.style.cssText = `
    width: 18px; height: 18px;
    border-radius: 50%;
    background: ${color};
    border: 2px solid rgba(255,255,255,0.9);
    box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    cursor: pointer;
    transition: background 0.3s;
    position: relative;
  `

  // Bearing arrow
  const arrow = document.createElement('div')
  arrow.className = 'bearing-arrow'
  arrow.style.cssText = `
    position: absolute;
    top: -6px; left: 50%;
    transform: translateX(-50%) rotate(${bearing}deg);
    width: 0; height: 0;
    border-left: 3px solid transparent;
    border-right: 3px solid transparent;
    border-bottom: 6px solid ${color};
    transform-origin: center bottom;
  `
  el.appendChild(arrow)

  // Mode icon as tiny text overlay
  if (mode === 'train') {
    el.style.borderRadius = '3px'
  } else if (mode === 'ferry') {
    el.style.borderRadius = '30% 30% 50% 50%'
  }

  return el
}

function updateVehicleElement(el: HTMLElement, color: string, bearing: number) {
  el.style.background = color
  const arrow = el.querySelector('.bearing-arrow') as HTMLElement | null
  if (arrow) {
    arrow.style.borderBottomColor = color
    arrow.style.transform = `translateX(-50%) rotate(${bearing}deg)`
  }
}

function createStopElement(): HTMLElement {
  const el = document.createElement('div')
  el.className = 'stop-marker'
  el.style.cssText = `
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #3b82f6;
    border: 1.5px solid rgba(255,255,255,0.8);
    opacity: 0.7;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.2s;
  `
  el.addEventListener('mouseenter', () => {
    el.style.opacity = '1'
    el.style.transform = 'scale(1.4)'
  })
  el.addEventListener('mouseleave', () => {
    el.style.opacity = '0.7'
    el.style.transform = 'scale(1)'
  })
  return el
}
