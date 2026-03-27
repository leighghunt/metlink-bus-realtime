namespace WellingtonTransit.Api.Models;

public record VehiclePosition
{
    public string VehicleRef { get; init; } = "";
    public double Lat { get; init; }
    public double Long { get; init; }
    public float Bearing { get; init; }
    public string RouteId { get; init; } = "";
    public string Route { get; init; } = "";
    public string TripId { get; init; } = "";
    public string DepartureTime { get; init; } = "";
    public long Timestamp { get; init; }
    public int? DelaySeconds { get; set; }
}

public record Stop
{
    public string StopId { get; init; } = "";
    public string StopCode { get; init; } = "";
    public string StopName { get; init; } = "";
    public double StopLat { get; init; }
    public double StopLon { get; init; }
}

public record Route
{
    public string RouteId { get; init; } = "";
    public string RouteShortName { get; init; } = "";
    public string RouteLongName { get; init; } = "";
    public string RouteDesc { get; init; } = "";
    public int RouteType { get; init; }
    public string RouteColor { get; init; } = "";
    public string RouteTextColor { get; init; } = "";
}

// Metlink API response shapes
public record MetlinkVehiclePositionFeed
{
    public MetlinkFeedHeader? Header { get; init; }
    public List<MetlinkVehicleEntity> Entity { get; init; } = [];
}

public record MetlinkFeedHeader
{
    public long Timestamp { get; init; }
}

public record MetlinkVehicleEntity
{
    public string Id { get; init; } = "";
    public MetlinkVehicleData? Vehicle { get; init; }
}

public record MetlinkVehicleData
{
    public MetlinkTrip? Trip { get; init; }
    public MetlinkPosition? Position { get; init; }
    public MetlinkVehicleDescriptor? Vehicle { get; init; }
    public long Timestamp { get; init; }
}

public record MetlinkTrip
{
    public string TripId { get; init; } = "";
    public string RouteId { get; init; } = "";
    public string StartTime { get; init; } = "";
    public string StartDate { get; init; } = "";
}

public record MetlinkPosition
{
    public double Latitude { get; init; }
    public double Longitude { get; init; }
    public float Bearing { get; init; }
}

public record MetlinkVehicleDescriptor
{
    public string Id { get; init; } = "";
}

public record MetlinkTripUpdateFeed
{
    public List<MetlinkTripUpdateEntity> Entity { get; init; } = [];
}

public record MetlinkTripUpdateEntity
{
    public MetlinkTripUpdate? TripUpdate { get; init; }
}

public record MetlinkTripUpdate
{
    public MetlinkTripUpdateVehicle? Vehicle { get; init; }
    public MetlinkStopTimeUpdate? StopTimeUpdate { get; init; }
}

public record MetlinkTripUpdateVehicle
{
    public string Id { get; init; } = "";
}

public record MetlinkStopTimeUpdate
{
    public MetlinkArrival? Arrival { get; init; }
}

public record MetlinkArrival
{
    public int Delay { get; init; }
}

public record StopDeparture
{
    public List<Departure> Departures { get; init; } = [];
}

public record Departure
{
    public string ServiceId { get; init; } = "";
    public string Status { get; init; } = "";
    public int? Delay { get; init; }
    public DepartureDestination? Destination { get; init; }
    public DepartureTime? DepartureTime { get; init; }
}

public record DepartureDestination
{
    public string Name { get; init; } = "";
}

public record DepartureTime
{
    public string? Aimed { get; init; }
    public string? Expected { get; init; }
}
