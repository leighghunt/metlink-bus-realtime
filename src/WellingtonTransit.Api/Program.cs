using WellingtonTransit.Api.Hubs;
using WellingtonTransit.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Services
builder.Services.AddSingleton<TransitStateService>();
builder.Services.AddSingleton<VehiclePersistenceService>();
builder.Services.AddHttpClient<MetlinkApiClient>();
builder.Services.AddHostedService<TransitPollingService>();

builder.Services.AddSignalR();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                      ?? ["http://localhost:5173"];
        policy.WithOrigins(origins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Required for SignalR
    });
});

var app = builder.Build();

app.UseCors();

// Serve the React app in production
app.UseDefaultFiles();
app.UseStaticFiles();

// ── REST endpoints ─────────────────────────────────────────────────────────

app.MapGet("/api/vehicles", (TransitStateService state) =>
    Results.Ok(state.Vehicles.Values));

app.MapGet("/api/stops", (TransitStateService state) =>
    Results.Ok(state.Stops.Values));

app.MapGet("/api/routes", (TransitStateService state) =>
    Results.Ok(state.Routes.Values));

app.MapGet("/api/stop-departures/{stopId}", async (string stopId, MetlinkApiClient metlink) =>
{
    var raw = await metlink.GetStopDeparturesRawAsync(stopId);
    return raw is null
        ? Results.Problem("Failed to fetch departures")
        : Results.Content(raw, "application/json");
});

app.MapGet("/api/export/gpx/{dateStr}", (string dateStr, VehiclePersistenceService persistence) =>
{
    try
    {
        var gpx = persistence.BuildGpx(dateStr);
        return Results.File(
            System.Text.Encoding.UTF8.GetBytes(gpx),
            "application/gpx+xml",
            $"{dateStr}.gpx");
    }
    catch (FileNotFoundException)
    {
        return Results.NotFound($"No data found for date {dateStr}");
    }
});

app.MapGet("/api/export/csv/{dateStr}", (string dateStr, VehiclePersistenceService persistence) =>
{
    var path = persistence.CsvFilePath(dateStr);
    return File.Exists(path)
        ? Results.File(path, "text/csv", $"{dateStr}.csv")
        : Results.NotFound($"No data found for date {dateStr}");
});

// ── SignalR hub ────────────────────────────────────────────────────────────

app.MapHub<TransitHub>("/hubs/transit");

// SPA fallback — serve index.html for any unmatched route
app.MapFallbackToFile("index.html");

app.Run();
