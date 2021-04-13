// client-side js
// run by the browser each time your view template is loaded

// https://richlloydmiles.medium.com/calculate-the-distance-between-two-points-on-earth-using-javascript-38e12c9a0f52
const degreesToRadians = degrees => degrees * (Math.PI / 180)
const radiansToDegrees = radians => radians * (180 / Math.PI)
const centralSubtendedAngle = (locationX, locationY) => {
  const locationXLatRadians = degreesToRadians(locationX.latitude)
  const locationYLatRadians = degreesToRadians(locationY.latitude)
return radiansToDegrees(
    Math.acos(
      Math.sin(locationXLatRadians) * Math.sin(locationYLatRadians) +
        Math.cos(locationXLatRadians) *
          Math.cos(locationYLatRadians) *
          Math.cos(
            degreesToRadians(
              Math.abs(locationX.longitude - locationY.longitude)
            )
       )
    )
  )
}


const earthRadius = 6371
const greatCircleDistance = angle => 2 * Math.PI * earthRadius * (angle / 360)

function calcDistanceBetweenTwoPoints(locationX, locationY) {
  // console.log("calcDistanceBetweenTwoPoints")
  // console.log(locationX);

  // console.log(locationY);

  return greatCircleDistance(centralSubtendedAngle(locationX, locationY))
}  






console.log('hello world :o');

var porirua = [-41.135461, 174.839714]
var poriruaCollege = [-41.141636, 174.873872]

console.log(L); 
var L = window.L;
var map = L.map('map').setView(porirua, 11);

var tileLayerOSM = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

// Available Thundermap themes:
var theme = 'transport'; // Others: cycle, landscape, outdoors, transport-dark, spinal-map, pioneer, mobile-atlas, neighbourhood
// theme = 'cycle';
theme = 'transport-dark';
// theme = 'outdoors;
// theme = 'neighbourhood';

var tileLayerThunderforest = 'https://{s}.tile.thunderforest.com/' + theme + '/{z}/{x}/{y}{r}.png?apikey=7dd44766c60140818b8816a0d8521fc2';

var tileLayerUrl = tileLayerThunderforest;

var ourLocation = {};


L.tileLayer(tileLayerUrl, {
  opacity: 0.3,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

map.locate({setView: false, maxZoom: 16});

function onLocationFound(e) {
    var radius = e.accuracy;

    // L.marker(e.latlng).addTo(map)

    L.circle(e.latlng, radius).addTo(map)
          .bindPopup("You are within " + radius + " meters from this point");
  
    ourLocation = e;
    findNearestStops();

}

function onLocationError(e) {
    alert(e.message);
}

map.on('locationerror', onLocationError);
map.on('locationfound', onLocationFound);


console.log('About to connect to sockets');
console.log(window.location.hostname);
var io = window.io;

var socket = io.connect(window.location.hostname);
var vehicles = {};
var markers= {};
var trails = {};
console.log(vehicles);

var allStops = [];
var nearStops = [];

var nearStopMarkers = [];

// a helper function to call when our request for dreams is done
const getVehiclesListener = function() {
  // parse our response to convert to JSON
  console.log('getVehiclesListener')
  let latestVehicles = JSON.parse(this.responseText);

  // iterate through every dream and add it to our page
  for(var VehicleRef in latestVehicles){
    handleVehicleData(latestVehicles[VehicleRef]);
  }
}

const vehiclesRequest = new XMLHttpRequest();
vehiclesRequest.onload = getVehiclesListener;
vehiclesRequest.open('get', '/latest');
vehiclesRequest.send();








const getStopsListener = function() {
  // parse our response to convert to JSON
  console.log('getStopsListener')
  var data = JSON.parse(this.responseText);

  for(var stop in data){
    allStops.push(data[stop]);
  }

  
  // // iterate through every dream and add it to our page
  // allStops = st
  // for(var stop in stops){
  //   handleStopsData(stops[stop]);
  // }
  
  console.log(allStops["PORI"]);
  findNearestStops();


}

const stopsRequest = new XMLHttpRequest();
stopsRequest.onload = getStopsListener;
stopsRequest.open('get', '/stops');
stopsRequest.send();


function findNearestStops(){
  if(ourLocation != {} && allStops != {}){
    console.log("OK...")
    console.log(ourLocation)
    console.log(allStops[0]);

    // allStops[0].distance=calcDistanceBetweenTwoPoints({latitude: allStops[0].stop_lat, longitude: allStops[0].stop_lon}, ourLocation);



    allStops.forEach(function (element, index, array) {
      // console.log(element)
      array[index].distance=calcDistanceBetweenTwoPoints({latitude: element.stop_lat, longitude: element.stop_lon}, ourLocation);
    });


    // restrict to those within 1km
    // apiResponse.data = apiResponse.data.filter(element => distanceBetweenLocations.calc({latitude: element.stop_lat, longitude: element.stop_lon}, location) <= 1)
    nearStops = allStops.filter(element => element.distance <= 1)
    console.log(nearStops.length)

    nearStops = nearStops.sort(function(a, b) {
      
      var distA = a.distance;
      var distB = b.distance;

      if (distA < distB) {
        return -1;
      }
      if (distA > distB) {
        return 1;
      }

      // names must be equal
      return 0;
    });

    console.log(nearStops)
    
    // console.log(allStops[0])


//     for(var nearStop in nearStops){
//       // console.log(nearStop)
//       handleStopsData(nearStops[nearStop]);
//     }


    for(var stop in allStops){
      // console.log(nearStop)
      handleStopsData(allStops[stop]);
    }

    
  }
}




socket.on('location', function (data) {
  // console.log(data);
  handleVehicleData(data);
});
          
function handleVehicleData(data){

  if(vehicles[data.VehicleRef] && vehicles[data.VehicleRef].RecordedAtTime == data.RecordedAtTime){
    // console.log('no update');
    return;
  }
  
  vehicles[data.VehicleRef] = data;
  let colour = 'green';
  let fillColour = '#3f0';
  if(data.DelaySeconds>60){
    colour = 'yellow';
    fillColour = '#ffff33';
    if(data.DelaySeconds>300){
      colour = 'red';
      fillColour = '#FF0033';
    }      
  }
  // console.log(data);
  let recordedAtTime = new Date(data.RecordedAtTime);
  let timeNow = new Date();
  let timeSinceRecorded_ms = timeNow - recordedAtTime;
  // console.log(timeSinceRecorded_ms/60000);
  // if(data.){
  // }

  // Stale data - over 5 mins since recording?
  if(timeSinceRecorded_ms > 300000){
        colour = 'grey';
        fillColour = '#666666';
  }

  // Really stale data - over 60 mins since recording - don't render
  if(timeSinceRecorded_ms > 3600000){
    return;
  }

  if(markers[data.VehicleRef]){
    let historyLine = L.polyline([markers[data.VehicleRef].getLatLng(), [data.Lat, data.Long]], {
      color: colour,
      width: 10}).addTo(map);

    if(!trails[data.VehicleRef]){
      trails[data.VehicleRef] = [];
    }
    trails[data.VehicleRef].push(historyLine);
    let opacity = 1;
    for(var index = trails[data.VehicleRef].length - 1;index >=0; --index){
      trails[data.VehicleRef][index].setStyle({opacity:opacity});
      opacity -= 0.1;
      if(opacity<=0){
        map.removeLayer(trails[data.VehicleRef].shift());        
      }
    }

    var newLatLng = new L.LatLng(data.Lat, data.Long);
    markers[data.VehicleRef].setLatLng(newLatLng);
    markers[data.VehicleRef].setStyle({
      color: colour,
      fillColor: fillColour});
    markers[data.VehicleRef]._popup.setContent(popupText(data));
  } else
  {
    markers[data.VehicleRef] = (L.circle([data.Lat, data.Long], {
      color: colour,
      fillColor: fillColour,
      fillOpacity: 0.5,
      radius: 30}).addTo(map)
      .bindPopup(popupText(data)));
    
  }

  
  // markers[data.VehicleRef] = L.marker([data.Lat, data.Long]);
  // console.log(markers[data.VehicleRef]);
  // markers[data.VehicleRef].addToMap(map);
  // console.log(vehicles);
}





function handleStopsData(data){

  nearStopMarkers[data.stop_id] = (L.circle([data.stop_lat, data.stop_lon], {
      color: 'blue',
      // fillColor: fillColour,
      // fillOpacity: 0.5,
      radius: 5}).addTo(map)
      .bindPopup(popupStopText(data)));
    
}



function popupText(data){
  // let now = new Date();
  // var seconds = (new Date(now) - new Date(data.RecordedAtTime))/1000;
  // let age = Math.round(seconds) + 's';
  // if (seconds > 60){
  //   age = Math.round(seconds/60) + 'm';
  // }
  // return data.ServiceID + ': ' + data.VehicleRef + ' ' + age
  
  let time = new Date(data.RecordedAtTime).toLocaleTimeString();
  let delay = data.DelaySeconds > 60? ' (Delayed ' + data.DelaySeconds + 's)':'';
  
  let description = 'Bus ' + data.ServiceID + ' (' + data.VehicleRef + ')\n' 
  if(['KPL', 'HVL', 'JVL', 'MEL', 'WRL'].includes(data.ServiceID)){
    description = "(" + new Date(data.DepartureTime).toLocaleTimeString() + ' ' + data.OriginStopName + " -> " + data.DestinationStopName + ")\n";     
   }
  
  let popup = description + time + delay;
  // console.log(popup);
  return popup;
}

function popupStopText(data){
  console.log("popup")
  return data.stop_code + ": " + data.stop_name;
}