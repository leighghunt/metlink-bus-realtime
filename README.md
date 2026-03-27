# Wellington Transit — Live Tracker

A rewrite of the original Node.js/Leaflet app using **.NET 9 Minimal API**, **React + Vite**, and **MapLibre GL JS**.

## Architecture

```
WellingtonTransit/
├── src/
│   ├── WellingtonTransit.Api/        ← .NET 9 backend
│   │   ├── Hubs/TransitHub.cs        ← SignalR hub
│   │   ├── Models/Models.cs          ← All data models
│   │   ├── Services/
│   │   │   ├── MetlinkApiClient.cs   ← Metlink REST + GTFS-RT client
│   │   │   ├── TransitPollingService.cs  ← Background polling (5s vehicles, 60s trips)
│   │   │   ├── TransitStateService.cs    ← In-memory vehicle/stop/route store
│   │   │   └── VehiclePersistenceService.cs  ← Daily CSV + GPX export
│   │   └── Program.cs                ← Minimal API endpoints + DI wiring
│   └── WellingtonTransit.Web/        ← React frontend
│       └── src/
│           ├── components/
│           │   ├── TransitMap.tsx    ← MapLibre map with markers & trails
│           │   └── Sidebar.tsx       ← Route filtering, status, search
│           ├── hooks/useTransitHub.ts ← SignalR client hook
│           ├── stores/useTransitStore.ts ← useReducer state store
│           ├── types/index.ts        ← Shared types + helpers
│           └── App.tsx               ← Root component
└── WellingtonTransit.sln
```

## Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- A [Metlink API key](https://opendata.metlink.org.nz/)

## Getting started

### 1. Configure your API key

Edit `src/WellingtonTransit.Api/appsettings.Development.json`:

```json
{
  "Metlink": {
    "ApiKey": "YOUR_METLINK_API_KEY_HERE"
  }
}
```

Or use dotnet user-secrets (recommended):

```bash
cd src/WellingtonTransit.Api
dotnet user-secrets set "Metlink:ApiKey" "your-key-here"
```

### 2. Run the backend

```bash
cd src/WellingtonTransit.Api
dotnet run
# API runs on http://localhost:5000
```

### 3. Run the frontend (development)

```bash
cd src/WellingtonTransit.Web
npm install
npm run dev
# Frontend runs on http://localhost:5173
# Proxies /api and /hubs to the .NET backend automatically
```

### 4. Build for production

```bash
cd src/WellingtonTransit.Web
npm run build
# Outputs to src/WellingtonTransit.Api/wwwroot
# Then just run: dotnet run --project src/WellingtonTransit.Api
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/vehicles` | All current vehicle positions (snapshot) |
| GET | `/api/routes` | All routes from Metlink GTFS |
| GET | `/api/stops` | All stops from Metlink GTFS |
| GET | `/api/stop-departures/{stopId}` | Live departure predictions for a stop |
| GET | `/api/export/csv/{yyyyMMdd}` | Download daily vehicle position CSV |
| GET | `/api/export/gpx/{yyyyMMdd}` | Download daily positions as GPX track |
| WS  | `/hubs/transit` | SignalR hub — pushes `VehicleUpdates` every 5s |

## Map tile style

The map uses OpenStreetMap tiles by default. To use a styled map (e.g. Stadia Maps or Thunderforest), 
update the `style` object in `src/components/TransitMap.tsx`. MapLibre GL supports any vector or raster 
tile source, including MapTiler and Stadia's free tiers.

## Vehicle colour coding

| Colour | Meaning |
|--------|---------|
| 🟢 Green | On time (delay ≤ 60s) |
| 🟡 Yellow | Slightly late (1–5 min) |
| 🟠 Orange | Late (5–10 min) |
| 🔴 Red | Very late (> 10 min) |
| ⚫ Grey | Stale data (> 5 min since last update) |

Vehicles with no update for > 15 minutes are removed from the map automatically.
