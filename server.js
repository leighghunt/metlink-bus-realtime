const express = require('express');
const axios = require('axios');
const app = express();
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { dir } = require('console');
const togpx = require('togpx');

// Setup SocketIO
var server = require('http').Server(app);
const io = require('socket.io')(server);

app.use(express.static('public'));

app.get('/', function(request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

server.listen(process.env.PORT);


var vehicles = {};
var trails = {};
var stops = {};
var routes = {};

let vehiclePositionURL = 'https://api.opendata.metlink.org.nz/v1/gtfs-rt/vehiclepositions';
let stopsURL = 'https://api.opendata.metlink.org.nz/v1/gtfs/stops';
let stopDeparturesURLOld = 'https://www.metlink.org.nz/api/v1/StopDepartures/'
let stopDeparturesURL = 'https://api.opendata.metlink.org.nz/v1/stop-predictions'
let tripUpdatesURL = "https://api.opendata.metlink.org.nz/v1/gtfs-rt/tripupdates"
let routesURL = "https://api.opendata.metlink.org.nz/v1/gtfs/routes"

let dataDir = "/Data"


// Updated API documentation at https://opendata.metlink.org.nz/getting-started

function callVehiclePositionAPI(){
  console.log('callVehiclePositionAPI....');
  // console.log(process.env.metlink_api_key)
    
  axios.get(vehiclePositionURL, {
  headers: {
    'x-api-key': process.env.METLINK_API_KEY
  }})
  .then(function (response) {

    handleVehiclePositionResponse(response.data);      
  })
  .catch(function (error) {
    console.error(error);
  })

  // console.log(vehicles);
}

function handleVehiclePositionResponse(data){    
  
  let recordedAtTime = Date(data["header"]["timestamp"]);
  // console.log(recordedAtTime);

  data["entity"].forEach(function(entity){
  
    let vehicleRef = entity["vehicle"]["vehicle"]["id"];

    let changeDetected = true;
    if(vehicles[vehicleRef]){
      if(vehicles[vehicleRef].RecordedAtTime == recordedAtTime){
        changeDetected = false;
      }
    }

    if(changeDetected){
      // console.log(vehicleRef);
      
      if(entity["vehicle"]["position"]["latitude"] != 0 || entity["vehicle"]["position"]["longitude"] != 0){
        
        var vehicle = vehicles[vehicleRef];
        
        // if(vehicleRef==4230)
        // {
        //   console.log(vehicle)
        // }

        var Lat = entity["vehicle"]["position"]["latitude"]
        var Long = entity["vehicle"]["position"]["longitude"]
        var Bearing = entity["vehicle"]["position"]["bearing"]
        var DepartureTime = entity["vehicle"]["trip"]["start_time"]         
        var Trip = entity["vehicle"]["trip"];
        var RouteId = entity["vehicle"]["trip"]["route_id"];
        var Route = Trip.trip_id.substring(0, Trip.trip_id.indexOf("_"));
        
        // console.log("Route")
        // console.log(Route)

        if(vehicle!=null){
          vehicle.RecordedAtTime = recordedAtTime
          vehicle.Lat = Lat
          vehicle.Long = Long
          // DelaySeconds: entity.DelaySeconds
          vehicle.Bearing = Bearing
          vehicle.DepartureTime = DepartureTime
          vehicle.entity = entity
          vehicle.Trip = Trip
          vehicle.RouteId = RouteId
          vehicle.Route = Route
        } else {
      
          vehicles[vehicleRef] = {
            VehicleRef: vehicleRef,
            // ServiceID: entity.ServiceID,      // get from trips?
            RecordedAtTime: recordedAtTime,
            Lat: Lat,
            Long: Long,
            // DelaySeconds: entity.DelaySeconds,
            Bearing: Bearing,
            DepartureTime: DepartureTime,
            // OriginStopID: entity.OriginStopID,
            // OriginStopName: entity.OriginStopName,
            // DestinationStopID: entity.DestinationStopID,
            // DestinationStopName: entity.DestinationStopName
            entity: entity,
            Trip: Trip,
            RouteId: RouteId,
            Route: Route
            // trip: entity.vehicle.trip,
            // route: entity.vehicle.trip.substring(0, entity.vehicle.trip.indexOf("_"))
          }

        }

        persistVehicle(vehicles[vehicleRef]);      
      
        io.emit('location', vehicles[vehicleRef]); //{vehicle: service});

      } else {
        // console.log("ERRRrrrr....")
        // console.log(entity);
        // Ignore - sometimes it returns zero location

      }
    }
  });
}

function persistVehicle(vehicle) {
  try{
    // Get current date in New Zealand timezone
    const now = moment().tz('Pacific/Auckland');
    const dateStr = now.format('YYYYMMDD');
    const vehicleRef = vehicle.VehicleRef; // Assuming vehicleRef is a property of vehicle

    // Create filename
    const dirname = path.join(__dirname, dataDir, dateStr);
    if(dirname && !fs.existsSync(dirname)){
      fs.mkdirSync(dirname);
    }
    const filename = `${dateStr}_${vehicleRef}.geojson`;
    const filePath = path.join(dirname, filename);

    let geojsonData;

    // Check if file exists
    if (fs.existsSync(filePath)) {
      // Read existing data
      const existingData = fs.readFileSync(filePath);
      geojsonData = JSON.parse(existingData);
    } else {
      // Create new GeoJSON structure
      geojsonData = {
        type: "FeatureCollection",
        features: []
      };
    }

    // Create a new feature for the vehicle
    const feature = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [vehicle.Long, vehicle.Lat]
      },
      properties: {
        VehicleRef: vehicle.VehicleRef,
        // RecordedAtTime: vehicle.RecordedAtTime,
        Bearing: vehicle.Bearing,
        // entity: vehicle.entity,
        // Trip: vehicle.Trip,
        TripStartDate: vehicle.Trip.start_date,
        TripStartTime: vehicle.Trip.start_time,
        TipId: vehicle.Trip.trip_id,
        timestamp: vehicle.entity.vehicle.timestamp,
        // RouteId: vehicle.RouteId,
        DelaySeconds: vehicle.DelaySeconds,
        Route: vehicle.Route
      }
    };

    // Append new vehicle data
    geojsonData.features.push(feature);

    // Save updated data to disk in GeoJSON format
    fs.writeFileSync(filePath, JSON.stringify(geojsonData, null, 2));

  }
  catch(err){
    console.error('Error persisting vehicle data for vehicle ' + vehicle.VehicleRef);
    console.error(err)
  }
}


function geoJsonByVehicle(vehicleRef) {
  return geoJsonByVehicleAndDate(vehicleRef, null);
}

function geoJsonByVehicleAndDate(vehicleRef, dateStr) {
  if(dateStr == null){
    // Get current date in New Zealand timezone
    const now = moment().tz('Pacific/Auckland');
    dateStr = now.format('YYYYMMDD');
  }

  // Create filename
  const dirname = path.join(__dirname, dataDir, dateStr);
  if(dirname && !fs.existsSync(dirname)){
    fs.mkdirSync(dirname);
  }
  const filename = `${dateStr}_${vehicleRef}.geojson`;
  const filePath = path.join(dirname, filename);

  let geojsonData;

  // Check if file exists
  if (fs.existsSync(filePath)) {
    // Read existing data
    const existingData = fs.readFileSync(filePath);
    geojsonData = JSON.parse(existingData);

    return geojsonData;
  } else {
    console.error(`File not found: ${filePath}`);
    return null;
  }
}

function geoJsonToGpxByVehicle(vehicleRef) {
  return geoJsonToGpxByVehicleAndDate(vehicleRef, null);
}
  
function geoJsonToGpxByVehicleAndDate(vehicleRef, dateStr) {
  let geojsonData = geoJsonByVehicleAndDate(vehicleRef, dateStr);
  return geoJsonToGpx(geojsonData);
}

function geoJsonToGpx(geojsonData) {
  return togpx(geojsonData);
}

function callStopsAPI(){
  // console.log('callStopsAPI....');
  // console.log(process.env.metlink_api_key)
    
  axios.get(stopsURL, {
  headers: {
    'x-api-key': process.env.METLINK_API_KEY
  }})
  .then(function (response) {

    handleStopsResponse(response.data);      
  })
  .catch(function (error) {
    console.log(error);
  })

  // console.log(vehicles);
}




function handleStopsResponse(data){    
  // console.log(data[0]);
  data.forEach(function(stop){
    stops[stop.stop_code] = stop;
  })
  
  // console.log(stops["PORI"])

}



function callTripUpdatesAPI(){
  // console.log('callTripUpdatesAPI....');
  // console.log(process.env.metlink_api_key)
    
  axios.get(tripUpdatesURL, {
  headers: {
    'x-api-key': process.env.METLINK_API_KEY
  }})
  .then(function (response) {

    handleTripUpdatesResponse(response.data.entity);      
  })
  .catch(function (error) {
    console.error(error);
  })

  // console.log(vehicles);
}




function handleTripUpdatesResponse(data){    
  // console.log(data[0]);
  data.forEach(function(entity){
    // stops[stop.stop_code] = stop;
    
    if(entity.trip_update!=null && entity.trip_update.stop_time_update!=null && entity.trip_update.stop_time_update.arrival!=null){
      // console.log(entity.trip_update.vehicle)
      // console.log(entity.trip_update.stop_time_update.arrival.delay)

      var vehicle = vehicles[entity.trip_update.vehicle.id];
      if(vehicle!=null){
        vehicle.DelaySeconds = entity.trip_update.stop_time_update.arrival.delay;
        
        // console.log(vehicles[entity.trip_update.vehicle.id]);
      }
    }
    
    
  })
  
  // console.log(stops["PORI"])

}



// http://expressjs.com/en/starter/basic-routing.html
app.get('/latest', function(request, response) {
  response.send(JSON.stringify(vehicles));
});


// http://expressjs.com/en/starter/basic-routing.html
app.get('/stops', function(request, response) {
  response.send(JSON.stringify(stops));
});



function callRoutesAPI(){
  // console.log('callRoutesAPI....');
  // console.log(process.env.metlink_api_key)
    
  axios.get(routesURL, {
  headers: {
    'x-api-key': process.env.METLINK_API_KEY
  }})
  .then(function (response) {

    handleRoutesResponse(response.data);      
  })
  .catch(function (error) {
    console.error(error);
  })

}




function handleRoutesResponse(data){    
  // console.log(data[0]);
  data.forEach(function(route){
    routes[route.route_id] = route;
  })
  
  // console.log(stops["PORI"])

}



// http://expressjs.com/en/starter/basic-routing.html
app.get('/routes', function(request, response) {
  response.send(JSON.stringify(routes));
});


app.get('/stopDeparturesOld/:stop', function(request, response) {
  // console.log(request.params.stop);

  axios.get(stopDeparturesURLOld + request.params.stop)
  .then(function (apiResponse) {
    // console.log(apiResponse.data)
   response.send(JSON.stringify(apiResponse.data));      
  })
  .catch(function (error) {
    // handle error
    // console.error(error);
    response.status(500).send(error)
  })  
});


app.get('/stopDepartures/:stop', function(request, response) {
  // console.log(request.params.stop);

  axios.get(stopDeparturesURL + "?stop_id=" + request.params.stop, {
  headers: {
    'x-api-key': process.env.METLINK_API_KEY
  }})
  .then(function (apiResponse) {
    // console.log(apiResponse.data)
   response.send(JSON.stringify(apiResponse.data));      
  })
  .catch(function (error) {
    // handle error
    // console.error(error);
    response.status(500).send(error)
  })  
});




app.get('/gpx/:vehicleRef', function(request, response) {
  console.log(request.params.vehicleRef);
  const gpx = geoJsonToGpxByVehicle(request.params.vehicleRef);
  response.send(gpx)
});

app.get('/geoJson/:vehicleRef/:dateStr', function(request, response) {
  console.log(request.params.vehicleRef);
  console.log(request.params.dateStr);
  const gpx = geoJsonByVehicleAndDate(request.params.vehicleRef, request.params.dateStr);
  response.send(gpx)
});



setTimeout(callVehiclePositionAPI, 1000); // Avoid firing immediately so we don't balst the API and get throttled.

setTimeout(callStopsAPI, 1000); 
setTimeout(callRoutesAPI, 1000); 

setTimeout(callTripUpdatesAPI, 5000); // Avoid firing immediately so we don't balst the API and get throttled.


// setInterval(callVehiclePositionAPI, 30000);
setInterval(callVehiclePositionAPI, 5000);
setInterval(callTripUpdatesAPI, 60000); // Check Trip Updates every minute

// console.log(vehicles);
