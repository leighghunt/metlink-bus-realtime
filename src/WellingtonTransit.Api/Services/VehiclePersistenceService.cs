using System.Globalization;
using WellingtonTransit.Api.Models;

namespace WellingtonTransit.Api.Services;

/// <summary>
/// Persists vehicle positions to a daily CSV file, matching the original app's behaviour.
/// Also provides GPX export from the daily CSV.
/// </summary>
public class VehiclePersistenceService(IConfiguration config, ILogger<VehiclePersistenceService> logger)
{
    private string DataDir => config["Persistence:DataDir"] ?? Path.Combine(AppContext.BaseDirectory, "Data");

    private string CsvPath(string dateStr) => Path.Combine(DataDir, $"{dateStr}.csv");

    private static string NzDate() =>
        TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow,
            TimeZoneInfo.FindSystemTimeZoneById("New Zealand Standard Time"))
            .ToString("yyyyMMdd");

    public void AppendVehicle(VehiclePosition vehicle)
    {
        try
        {
            Directory.CreateDirectory(DataDir);
            var line = string.Join(",",
                vehicle.VehicleRef,
                vehicle.Timestamp,
                vehicle.Long.ToString(CultureInfo.InvariantCulture),
                vehicle.Lat.ToString(CultureInfo.InvariantCulture),
                vehicle.TripId,
                vehicle.DelaySeconds?.ToString() ?? "",
                vehicle.Bearing.ToString(CultureInfo.InvariantCulture));

            File.AppendAllText(CsvPath(NzDate()), line + Environment.NewLine);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to persist vehicle {VehicleRef}", vehicle.VehicleRef);
        }
    }

    public string? CsvFilePath(string? dateStr = null) =>
        CsvPath(dateStr ?? NzDate());

    public string BuildGpx(string dateStr)
    {
        var path = CsvPath(dateStr);
        if (!File.Exists(path))
            throw new FileNotFoundException($"No data for {dateStr}", path);

        // Group positions by vehicle
        var vehicleData = new Dictionary<string, List<(string Timestamp, double Lon, double Lat)>>();

        foreach (var line in File.ReadLines(path))
        {
            var parts = line.Split(',');
            if (parts.Length < 4) continue;

            var vehicleRef = parts[0].Trim();
            if (!long.TryParse(parts[1].Trim(), out var ts)) continue;
            if (!double.TryParse(parts[2].Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out var lon)) continue;
            if (!double.TryParse(parts[3].Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out var lat)) continue;

            var iso = DateTimeOffset.FromUnixTimeSeconds(ts).ToString("yyyy-MM-ddTHH:mm:ssZ");
            if (!vehicleData.ContainsKey(vehicleRef))
                vehicleData[vehicleRef] = [];
            vehicleData[vehicleRef].Add((iso, lon, lat));
        }

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("""<?xml version="1.0" encoding="UTF-8"?>""");
        sb.AppendLine("""<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="WellingtonTransit">""");

        foreach (var (vehicleRef, points) in vehicleData)
        {
            sb.AppendLine($"  <trk><name>Vehicle {vehicleRef}</name><trkseg>");
            foreach (var (timestamp, lon, lat) in points)
                sb.AppendLine($"""    <trkpt lat="{lat}" lon="{lon}"><time>{timestamp}</time></trkpt>""");
            sb.AppendLine("  </trkseg></trk>");
        }

        sb.AppendLine("</gpx>");
        return sb.ToString();
    }
}
