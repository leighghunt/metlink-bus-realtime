const express = require('express');
const axios = require('axios');
const app = express();

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

let vehiclePositionURL = 'https://api.opendata.metlink.org.nz/v1/gtfs-rt/vehiclepositions';
let stopsURL = 'https://api.opendata.metlink.org.nz/v1/gtfs/stops';
let stopDeparturesURLOld = 'https://www.metlink.org.nz/api/v1/StopDepartures/'
let stopDeparturesURL = 'https://api.opendata.metlink.org.nz/v1/stop-predictions'





// Updated API documentation at https://opendata.metlink.org.nz/getting-started

function callVehiclePositionAPI(){
  console.log('callVehiclePositionAPI....');
  // console.log(process.env.metlink_api_key)
    
  axios.get(vehiclePositionURL, {
  headers: {
    'x-api-key': process.env.metlink_api_key
  }})
  .then(function (response) {

    handleVehiclePositionResponse(response.data);      
  })
  .catch(function (error) {
    console.log(error);
  })

  // console.log(vehicles);
}

function handleVehiclePositionResponse(data){    
  
  let recordedAtTime = Date(data["header"]["timestamp"]);
  console.log(recordedAtTime);

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

        vehicles[vehicleRef] = {
          VehicleRef: vehicleRef,
          // ServiceID: entity.ServiceID,      // get from trips?
          RecordedAtTime: recordedAtTime,
          Lat: entity["vehicle"]["position"]["latitude"],
          Long: entity["vehicle"]["position"]["longitude"],
          // DelaySeconds: entity.DelaySeconds,
          Bearing: entity["vehicle"]["position"]["bearing"],
          DepartureTime: entity["vehicle"]["trip"]["start_time"],
          // OriginStopID: entity.OriginStopID,
          // OriginStopName: entity.OriginStopName,
          // DestinationStopID: entity.DestinationStopID,
          // DestinationStopName: entity.DestinationStopName
          entity: entity
        }

        io.emit('location', vehicles[vehicleRef]); //{vehicle: service});

      } else {
        // console.log("ERRRrrrr....")
        // console.log(entity);
        // Ignore - sometimes it returns zero location

      }
    }
  });
}

function callStopsAPI(){
  console.log('callStopsAPI....');
  // console.log(process.env.metlink_api_key)
    
  axios.get(stopsURL, {
  headers: {
    'x-api-key': process.env.metlink_api_key
  }})
  .then(function (response) {

    handleStopsResponse(response.data);      
  })
  .catch(function (error) {
    console.log(error);
  })

  console.log(vehicles);
}




function handleStopsResponse(data){    
  console.log(data[0]);
  data.forEach(function(stop){
    stops[stop.stop_code] = stop;
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


app.get('/stopDeparturesOld/:stop', function(request, response) {
  console.log(request.params.stop);

  axios.get(stopDeparturesURLOld + request.params.stop)
  .then(function (apiResponse) {
    console.log(apiResponse.data)
   response.send(JSON.stringify(apiResponse.data));      
  })
  .catch(function (error) {
    // handle error
    console.log(error);
    response.status(500).send(error)
  })  
});


app.get('/stopDepartures/:stop', function(request, response) {
  console.log(request.params.stop);

  axios.get(stopDeparturesURL + "?stop_id=" + request.params.stop, {
  headers: {
    'x-api-key': process.env.metlink_api_key
  }})
  .then(function (apiResponse) {
    console.log(apiResponse.data)
   response.send(JSON.stringify(apiResponse.data));      
  })
  .catch(function (error) {
    // handle error
    console.log(error);
    response.status(500).send(error)
  })  
});





setTimeout(callVehiclePositionAPI, 1000); // Avoid firing immediately so we don't balst the API and get throttled.

setTimeout(callStopsAPI, 1000); // Avoid firing immediately so we don't balst the API and get throttled.

setInterval(callVehiclePositionAPI, 30000);

console.log(vehicles);
