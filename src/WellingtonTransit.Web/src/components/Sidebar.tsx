import { useMemo, useState } from 'react'
import type { Route, VehiclePosition } from '../types'
import { getVehicleMode } from '../types'

interface Props {
  routes: Record<string, Route>
  vehicles: Record<string, VehiclePosition>
  activeRoutes: Set<string>
  onToggleRoute: (routeId: string) => void
  onShowAll: () => void
  onHideAll: () => void
  connected: boolean
}

type FilterMode = 'all' | 'bus' | 'train' | 'ferry'

export default function Sidebar({
  routes,
  vehicles,
  activeRoutes,
  onToggleRoute,
  onShowAll,
  onHideAll,
  connected,
}: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [search, setSearch] = useState('')

  const vehiclesByRoute = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const v of Object.values(vehicles)) {
      counts[v.routeId] = (counts[v.routeId] ?? 0) + 1
    }
    return counts
  }, [vehicles])

  const totalActive = useMemo(
    () => Object.values(vehicles).filter(v => activeRoutes.has(v.routeId)).length,
    [vehicles, activeRoutes]
  )

  const filteredRoutes = useMemo(() => {
    return Object.values(routes).filter(r => {
      const mode = getVehicleMode(r.routeShortName)
      if (filterMode !== 'all' && mode !== filterMode) return false
      if (search) {
        const q = search.toLowerCase()
        if (!r.routeShortName.toLowerCase().includes(q) && !r.routeDesc.toLowerCase().includes(q))
          return false
      }
      return true
    }).sort((a, b) => a.routeShortName.localeCompare(b.routeShortName, undefined, { numeric: true }))
  }, [routes, filterMode, search])

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <div className="sidebar-branding">
            <span className="sidebar-logo">⚡</span>
            <div>
              <div className="sidebar-title">Wellington Transit</div>
              <div className="sidebar-sub">Live tracker</div>
            </div>
          </div>
          <button className="collapse-btn" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {!collapsed && (
          <>
            <div className="status-row">
              <span className={`status-dot ${connected ? 'status-dot--live' : 'status-dot--offline'}`} />
              <span className="status-label">{connected ? 'Live' : 'Connecting…'}</span>
              <span className="vehicle-count">{totalActive} vehicles</span>
            </div>

            <div className="mode-filter">
              {(['all', 'bus', 'train', 'ferry'] as FilterMode[]).map(m => (
                <button
                  key={m}
                  className={`mode-btn ${filterMode === m ? 'mode-btn--active' : ''}`}
                  onClick={() => setFilterMode(m)}
                >
                  {m === 'all' ? 'All' : m === 'bus' ? '🚌' : m === 'train' ? '🚆' : '⛴️'}
                </button>
              ))}
            </div>

            <input
              className="search-input"
              placeholder="Search routes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            <div className="bulk-actions">
              <button className="bulk-btn" onClick={onShowAll}>Show all</button>
              <button className="bulk-btn" onClick={onHideAll}>Hide all</button>
            </div>
          </>
        )}
      </div>

      {!collapsed && (
        <div className="route-list">
          {filteredRoutes.length === 0 && (
            <div className="route-empty">No routes match</div>
          )}
          {filteredRoutes.map(route => {
            const active = activeRoutes.has(route.routeId)
            const count = vehiclesByRoute[route.routeId] ?? 0
            const mode = getVehicleMode(route.routeShortName)
            const modeIcon = mode === 'train' ? '🚆' : mode === 'ferry' ? '⛴️' : '🚌'

            return (
              <div
                key={route.routeId}
                className={`route-item ${active ? 'route-item--active' : ''}`}
                onClick={() => onToggleRoute(route.routeId)}
              >
                <div className="route-item-left">
                  <span className="route-icon">{modeIcon}</span>
                  <div>
                    <div className="route-name">{route.routeShortName}</div>
                    <div className="route-desc">{route.routeDesc}</div>
                  </div>
                </div>
                <div className="route-item-right">
                  {count > 0 && <span className="route-badge">{count}</span>}
                  <div className={`route-toggle ${active ? 'route-toggle--on' : ''}`} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </aside>
  )
}
