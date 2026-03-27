using System.Text.Json;
using System.Text.Json.Serialization;
using WellingtonTransit.Api.Models;
using Route = WellingtonTransit.Api.Models.Route;

namespace WellingtonTransit.Api.Services;

public class MetlinkApiClient(HttpClient httpClient, IConfiguration config, ILogger<MetlinkApiClient> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString
    };

    private const string VehiclePositionsUrl = "https://api.opendata.metlink.org.nz/v1/gtfs-rt/vehiclepositions";
    private const string TripUpdatesUrl = "https://api.opendata.metlink.org.nz/v1/gtfs-rt/tripupdates";
    private const string StopsUrl = "https://api.opendata.metlink.org.nz/v1/gtfs/stops";
    private const string RoutesUrl = "https://api.opendata.metlink.org.nz/v1/gtfs/routes";
    private const string StopPredictionsUrl = "https://api.opendata.metlink.org.nz/v1/stop-predictions";

    private string ApiKey => config["Metlink:ApiKey"] ?? throw new InvalidOperationException("Metlink:ApiKey not configured");

    private HttpRequestMessage BuildRequest(string url) =>
        new(HttpMethod.Get, url) { Headers = { { "x-api-key", ApiKey } } };

    public async Task<MetlinkVehiclePositionFeed?> GetVehiclePositionsAsync(CancellationToken ct = default)
    {
        try
        {
          logger.LogInformation("Fetching vehicle positions from Metlink API");
          logger.LogInformation("Using Api Key: {ApiKey}", ApiKey);

            using var response = await httpClient.SendAsync(BuildRequest(VehiclePositionsUrl), ct);
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync(ct);
            return JsonSerializer.Deserialize<MetlinkVehiclePositionFeed>(json, JsonOptions);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to fetch vehicle positions");
            return null;
        }
    }

    public async Task<MetlinkTripUpdateFeed?> GetTripUpdatesAsync(CancellationToken ct = default)
    {
        try
        {
            using var response = await httpClient.SendAsync(BuildRequest(TripUpdatesUrl), ct);
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync(ct);
            return JsonSerializer.Deserialize<MetlinkTripUpdateFeed>(json, JsonOptions);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to fetch trip updates");
            return null;
        }
    }

    public async Task<List<Stop>> GetStopsAsync(CancellationToken ct = default)
    {
        try
        {
            using var response = await httpClient.SendAsync(BuildRequest(StopsUrl), ct);
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync(ct);

            // Metlink returns an array of stops with snake_case keys
            using var doc = JsonDocument.Parse(json);
            var result = new List<Stop>();
            foreach (var el in doc.RootElement.EnumerateArray())
            {
                result.Add(new Stop
                {
                    StopId = el.GetProperty("stop_id").GetString() ?? "",
                    StopCode = el.GetProperty("stop_code").GetString() ?? "",
                    StopName = el.GetProperty("stop_name").GetString() ?? "",
                    StopLat = el.GetProperty("stop_lat").GetDouble(),
                    StopLon = el.GetProperty("stop_lon").GetDouble(),
                });
            }
            return result;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to fetch stops");
            return [];
        }
    }

    public async Task<List<Route>> GetRoutesAsync(CancellationToken ct = default)
    {
        try
        {
            using var response = await httpClient.SendAsync(BuildRequest(RoutesUrl), ct);
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync(ct);

            using var doc = JsonDocument.Parse(json);
            var result = new List<Route>();
            foreach (var el in doc.RootElement.EnumerateArray())
            {
                result.Add(new Route
                {
                    RouteId = GetStr(el, "route_id"),
                    RouteShortName = GetStr(el, "route_short_name"),
                    RouteLongName = GetStr(el, "route_long_name"),
                    RouteDesc = GetStr(el, "route_desc"),
                    RouteType = el.TryGetProperty("route_type", out var rt) ? rt.GetInt32() : 3,
                    RouteColor = GetStr(el, "route_color"),
                    RouteTextColor = GetStr(el, "route_text_color"),
                });
            }
            return result;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to fetch routes");
            return [];
        }
    }

    public async Task<string?> GetStopDeparturesRawAsync(string stopId, CancellationToken ct = default)
    {
        try
        {
            using var response = await httpClient.SendAsync(
                BuildRequest($"{StopPredictionsUrl}?stop_id={stopId}"), ct);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync(ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to fetch stop departures for {StopId}", stopId);
            return null;
        }
    }

    private static string GetStr(JsonElement el, string key) =>
        el.TryGetProperty(key, out var p) ? (p.GetString() ?? "") : "";
}
