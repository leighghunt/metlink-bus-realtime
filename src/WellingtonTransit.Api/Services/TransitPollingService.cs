using Microsoft.AspNetCore.SignalR;
using WellingtonTransit.Api.Hubs;
using WellingtonTransit.Api.Models;

namespace WellingtonTransit.Api.Services;

/// <summary>
/// Polls Metlink every 5 seconds for vehicle positions and every 60 seconds for trip updates.
/// Also seeds stops and routes once on startup.
/// On each vehicle update, writes to TransitStateService and pushes to SignalR clients.
/// </summary>
public class TransitPollingService(
    MetlinkApiClient metlink,
    TransitStateService state,
    IHubContext<TransitHub> hub,
    ILogger<TransitPollingService> logger) : BackgroundService
{
    private static readonly TimeSpan VehicleInterval = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan TripUpdateInterval = TimeSpan.FromSeconds(60);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Seed static data once on startup (with a brief delay to avoid hammering the API)
        await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
        await SeedStaticDataAsync(stoppingToken);

        // Start both polling loops concurrently
        await Task.WhenAll(
            PollVehiclePositionsAsync(stoppingToken),
            PollTripUpdatesAsync(stoppingToken));
    }

    private async Task SeedStaticDataAsync(CancellationToken ct)
    {
        logger.LogInformation("Seeding stops and routes...");

        var stops = await metlink.GetStopsAsync(ct);
        state.SetStops(stops);
        logger.LogInformation("Loaded {Count} stops", stops.Count);

        var routes = await metlink.GetRoutesAsync(ct);
        state.SetRoutes(routes);
        logger.LogInformation("Loaded {Count} routes", routes.Count);
    }

    private async Task PollVehiclePositionsAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                var feed = await metlink.GetVehiclePositionsAsync(ct);
                if (feed?.Entity is { Count: > 0 } entities)
                    await ProcessVehicleUpdatesAsync(entities, ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Error in vehicle position poll");
            }

            await Task.Delay(VehicleInterval, ct);
        }
    }

    private async Task PollTripUpdatesAsync(CancellationToken ct)
    {
        // Stagger trip updates slightly so both loops don't hit at the same time
        await Task.Delay(TimeSpan.FromSeconds(5), ct);

        while (!ct.IsCancellationRequested)
        {
            try
            {
                var feed = await metlink.GetTripUpdatesAsync(ct);
                if (feed?.Entity is { Count: > 0 } entities)
                    ProcessTripUpdates(entities);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Error in trip update poll");
            }

            await Task.Delay(TripUpdateInterval, ct);
        }
    }

    private async Task ProcessVehicleUpdatesAsync(List<MetlinkVehicleEntity> entities, CancellationToken ct)
    {
        var updated = new List<VehiclePosition>();

        foreach (var entity in entities)
        {
            var v = entity.Vehicle;
            if (v?.Position == null || v.Vehicle == null || v.Trip == null)
                continue;

            if (v.Position.Latitude == 0 && v.Position.Longitude == 0)
                continue;

            var vehicleRef = v.Vehicle.Id;
            var tripId = v.Trip.TripId;
            var route = tripId.Contains('_')
                ? tripId[..tripId.IndexOf('_')]
                : tripId;

            // Preserve existing delay if we have one
            state.TryGetVehicle(vehicleRef, out var existing);

            var position = new VehiclePosition
            {
                VehicleRef = vehicleRef,
                Lat = v.Position.Latitude,
                Long = v.Position.Longitude,
                Bearing = v.Position.Bearing,
                RouteId = v.Trip.RouteId,
                Route = route,
                TripId = tripId,
                DepartureTime = v.Trip.StartTime,
                Timestamp = v.Timestamp,
                DelaySeconds = existing?.DelaySeconds,
            };

            state.UpsertVehicle(position);
            updated.Add(position);
        }

        if (updated.Count > 0)
        {
            // Broadcast all updates in one call to avoid N hub invocations
            await hub.Clients.All.SendAsync("VehicleUpdates", updated, ct);
            logger.LogDebug("Broadcast {Count} vehicle updates", updated.Count);
        }
    }

    private void ProcessTripUpdates(List<MetlinkTripUpdateEntity> entities)
    {
        foreach (var entity in entities)
        {
            var tu = entity.TripUpdate;
            if (tu?.Vehicle == null || tu.StopTimeUpdate?.Arrival == null)
                continue;

            state.UpdateVehicleDelay(tu.Vehicle.Id, tu.StopTimeUpdate.Arrival.Delay);
        }
    }
}
