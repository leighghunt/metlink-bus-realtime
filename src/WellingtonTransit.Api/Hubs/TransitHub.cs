using Microsoft.AspNetCore.SignalR;
using WellingtonTransit.Api.Services;

namespace WellingtonTransit.Api.Hubs;

/// <summary>
/// SignalR hub for real-time vehicle position broadcasting.
/// Clients connect here and receive VehicleUpdates messages pushed by TransitPollingService.
/// On connection, the client receives a snapshot of all current vehicles.
/// </summary>
public class TransitHub(TransitStateService state) : Hub
{
    public override async Task OnConnectedAsync()
    {
        // Send current state snapshot to the newly connected client
        var snapshot = state.Vehicles.Values.ToList();
        if (snapshot.Count > 0)
            await Clients.Caller.SendAsync("VehicleUpdates", snapshot);

        await base.OnConnectedAsync();
    }
}
