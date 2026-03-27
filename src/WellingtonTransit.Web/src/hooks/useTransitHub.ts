import { useEffect, useRef, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import type { VehiclePosition } from '../types'

export function useTransitHub(onVehicleUpdates: (vehicles: VehiclePosition[]) => void) {
  const connectionRef = useRef<signalR.HubConnection | null>(null)
  const callbackRef = useRef(onVehicleUpdates)
  callbackRef.current = onVehicleUpdates

  const connect = useCallback(async () => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/transit')
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    connection.on('VehicleUpdates', (vehicles: VehiclePosition[]) => {
      callbackRef.current(vehicles)
    })

    connection.onreconnecting(() => console.info('[SignalR] Reconnecting...'))
    connection.onreconnected(() => console.info('[SignalR] Reconnected'))
    connection.onclose(() => console.warn('[SignalR] Connection closed'))

    try {
      await connection.start()
      console.info('[SignalR] Connected')
    } catch (err) {
      console.error('[SignalR] Connection failed:', err)
    }

    connectionRef.current = connection
  }, [])

  useEffect(() => {
    connect()
    return () => {
      connectionRef.current?.stop()
    }
  }, [connect])
}
