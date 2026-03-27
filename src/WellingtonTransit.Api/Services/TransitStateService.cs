using System.Collections.Concurrent;
using WellingtonTransit.Api.Models;

namespace WellingtonTransit.Api.Services;

/// <summary>
/// In-memory store for all live vehicle, stop, and route state.
/// Thread-safe — written by background services, read by API endpoints and SignalR hub.
/// </summary>
public class TransitStateService
{
    private readonly ConcurrentDictionary<string, VehiclePosition> _vehicles = new();
    private readonly ConcurrentDictionary<string, Stop> _stops = new();
    private readonly ConcurrentDictionary<string, Route> _routes = new();

    // Vehicles
    public IReadOnlyDictionary<string, VehiclePosition> Vehicles => _vehicles;

    public void UpsertVehicle(VehiclePosition vehicle) =>
        _vehicles[vehicle.VehicleRef] = vehicle;

    public bool TryGetVehicle(string vehicleRef, out VehiclePosition? vehicle) =>
        _vehicles.TryGetValue(vehicleRef, out vehicle);

    public void UpdateVehicleDelay(string vehicleRef, int delaySeconds)
    {
        if (_vehicles.TryGetValue(vehicleRef, out var existing))
            _vehicles[vehicleRef] = existing with { DelaySeconds = delaySeconds };
    }

    // Stops
    public IReadOnlyDictionary<string, Stop> Stops => _stops;

    public void SetStops(IEnumerable<Stop> stops)
    {
        _stops.Clear();
        foreach (var stop in stops)
            _stops[stop.StopCode] = stop;
    }

    // Routes
    public IReadOnlyDictionary<string, Route> Routes => _routes;

    public void SetRoutes(IEnumerable<Route> routes)
    {
        _routes.Clear();
        foreach (var route in routes)
            _routes[route.RouteId] = route;
    }
}
