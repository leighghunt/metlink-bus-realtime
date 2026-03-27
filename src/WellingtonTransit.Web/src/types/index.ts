export interface VehiclePosition {
  vehicleRef: string
  lat: number
  long: number
  bearing: number
  routeId: string
  route: string
  tripId: string
  departureTime: string
  timestamp: number
  delaySeconds: number | null
}

export interface Stop {
  stopId: string
  stopCode: string
  stopName: string
  stopLat: number
  stopLon: number
}

export interface Route {
  routeId: string
  routeShortName: string
  routeLongName: string
  routeDesc: string
  routeType: number  // 0=tram, 1=subway, 2=rail, 3=bus, 4=ferry
  routeColor: string
  routeTextColor: string
}

export type VehicleMode = 'bus' | 'train' | 'ferry' | 'unknown'

export const TRAIN_ROUTES = ['KPL', 'HVL', 'JVL', 'MEL', 'WRL']
export const FERRY_ROUTES = ['QDF']

export function getVehicleMode(route: string): VehicleMode {
  if (TRAIN_ROUTES.includes(route)) return 'train'
  if (FERRY_ROUTES.includes(route)) return 'ferry'
  if (route) return 'bus'
  return 'unknown'
}

export function getDelayColour(delaySeconds: number | null): string {
  if (delaySeconds === null || delaySeconds <= 60) return '#22c55e'  // green
  if (delaySeconds <= 300) return '#eab308'                          // yellow
  if (delaySeconds <= 600) return '#f97316'                          // orange
  return '#ef4444'                                                   // red
}

export function isStale(timestamp: number, thresholdMs = 5 * 60 * 1000): boolean {
  return Date.now() - timestamp * 1000 > thresholdMs
}
