/* globals moment */

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






// console.log('hello world :o');

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


var thunderforestMap = L.tileLayer(tileLayerUrl, {
  opacity: 0.3,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);


var socket = io.connect(window.location.hostname);
var vehicles = {};
var trails = {};
var routes = [];
// var routeLayers = {};
console.log(vehicles);

var allStops = [];
var nearStops = [];

var nearStopMarkers = [];

var overlayMaps = {};
// var layerControl = {};


var markers= {
  "Routes": routes,
  "Stops": nearStopMarkers
};

// var routeLayers = [];
var baseMaps = {
  "Thunder Forest": thunderforestMap
}

overlayMaps["Stops"] = L.layerGroup([]);


var layerControl = L.control.layers(baseMaps, overlayMaps).addTo(map);

var haltStateUpdateCounter = 0;
// overlayMaps["Stops"].on('add', updateState);
map.on('overlayadd', updateState);
map.on('overlayremove', updateState);
map.on('zoomend', updateState);
map.on('moveend', updateState);

function haltStateUpdate(){
  console.log("haltStateUpdate - " + haltStateUpdateCounter + " -> " + ++haltStateUpdateCounter)
}

function resumeStateUpdate(){
  console.log("resumeStateUpdate - " + haltStateUpdateCounter + " -> " + --haltStateUpdateCounter)
}

// layerControl.on('remove', updateState);

function updateState(){
  if(haltStateUpdateCounter<=0){
    console.log('updateState')
    var URL = "?"
    
//     for(var route_id in routes){
//       var route = routes[route_id]
//       var routeLabel = route.route_short_name + " " + route.route_desc  
//     }

    var layersShown = [];
    var layersNotShown = [];
    
    for (var layerId in overlayMaps) {
      if (map.hasLayer(overlayMaps[layerId]))
      {
        layersShown.push(layerId.split(" ")[0])
      } else {
        layersNotShown.push(layerId.split(" ")[0])
      }
    }

    if(layersShown.length<15){
      URL+="layersShow="
      for (var i in layersShown) {
        URL += layersShown[i] + ",";
      }
    } else {
       if(layersNotShown.length<15){
          URL+="layersDontShow="
          for (var i in layersNotShown) {
            URL += layersNotShown[i] + ",";
          }
        } 
    }
    
    if(URL[URL.length-1] == ","){
      URL = URL.substring(0, URL.length-1)
    }

    URL+="&lat=" + map.getCenter().lat
    URL+="&lng=" + map.getCenter().lng
    URL+="&zoom=" + map.getZoom()
      // URL += layerId.substring(0, layerId.indexOf(" ")) + ",";

    window.history.replaceState(null, "", URL)
  }
}

function restoreState(){
  haltStateUpdate()
  console.log('restoreState')
  
  var urlParams = new URLSearchParams(window.location.search);
  
  var layersShow = urlParams.get("layersShow");
  var layersDontShow = urlParams.get("layersDontShow");
  
  if(layersShow){
    for (var i in overlayMaps) {
      map.removeLayer(overlayMaps[i]);
    }

    var layers = layersShow.split(",")
    for(var i in layers){
      console.log(layers[i])
      for (var layerId in overlayMaps) {
        if(layers[i]==layerId.split(" ")[0]){
          map.addLayer(overlayMaps[layerId])
        }
      }
    }
    
  } else {
      if(layersDontShow){
        var layers = layersDontShow.split(",")
        for(var i in layers){
          console.log(layers[i])
          for (var layerId in overlayMaps) {
            if(layers[i]==layerId.split(" ")[0]){
              // if (map.hasLayer(overlayMaps[layerId]))
              // {
                map.removeLayer(overlayMaps[layerId])
              // }
            }
          }
        }
    }
  }

  // console.log(map.getCenter())
  // console.log(map.getZoom())
  var lat = urlParams.get("lat")
  var lng = urlParams.get("lng")
  var zoom = urlParams.get("zoom")
  if(lat && lng && zoom){
    map.setView({lng: lng, lat: lat}, zoom);
  }
  // console.log(map.getCenter())
  // console.log(map.getZoom())

//   var layersShown = [];
//   var layersNotShown = [];

//   for (var layerId in overlayMaps) {
//     if (map.hasLayer(overlayMaps[layerId]))
//     {
//       layersShown.push(layerId.split(" ")[0])
//     } else {
//       layersNotShown.push(layerId.split(" ")[0])
//     }
//   }

//   if(layersShown.length<15){
//     URL+="LayersShow="
//     for (var i in layersShown) {
//       URL += layersShown[i] + ",";
//     }
//   } else {
//      if(layersNotShown.length<15){
//         URL+="LayersDontShow="
//         for (var i in layersNotShown) {
//           URL += layersNotShown[i] + ",";
//         }
//       } 
//   }

//   URL+="&lat=" + map.getCenter().lat
//   URL+="&lng=" + map.getCenter().lng
//   URL+="&zoom=" + map.getZoom()
//     // URL += layerId.substring(0, layerId.indexOf(" ")) + ",";

    resumeStateUpdate()
}

restoreState()

// Let's pause state updating for 10 seconds whilst things settle down....
haltStateUpdate()
window.setTimeout(resumeStateUpdate, 10000)
window.setInterval(tidyUpStaleData, 60000)

// map.locate({setView: false, maxZoom: 16});

function onLocationFound(e) {
    var radius = e.accuracy;

    // L.marker(e.latlng).addTo(map)

    L.circle(e.latlng, radius).addTo(map)
          .bindPopup("You are within " + radius + " meters from this point");
  
    ourLocation = e;
    // findNearestStops();

}

function onLocationError(e) {
    alert(e.message);
}

map.on('locationerror', onLocationError);
map.on('locationfound', onLocationFound);


// window.setTimeout(function(){
//   // map.removeLayer("236 Porirua - Papakowhai - Paremata - Whitby (Navigation Drive)");
//   map.removeLayer(overlayMaps["KPL Kapiti Line (Wellington - Waikanae)"]);
//   map.addLayer(overlayMaps["Stops"]);
// }, 5000)



// $('#addAllOverlays').on('click', function(event) {
//     for (var i in overlayMaps) {
//         if (this._layers[i].overlay) {
//             if (!this._map.hasLayer(this._layers[i].layer)) {
//                 this._map.addLayer(this._layers[i].layer);
//             }
//         }
//     }
// });

function addAllOverlays(){
  haltStateUpdate()
    for (var i in overlayMaps) {
        map.addLayer(overlayMaps[i]);
    }
  resumeStateUpdate()
  updateState()
}


// $('#removeAllOverlays').on('click', function(event) {
function removeAllOverlays(){
  haltStateUpdate()
    for (var i in overlayMaps) {
        map.removeLayer(overlayMaps[i]);
    }
  resumeStateUpdate()
  updateState()
}


console.log('About to connect to sockets');
console.log(window.location.hostname);
var io = window.io;

// Get Routes and add them to the map as empty layers...
const getRoutesListener = function() {
  haltStateUpdate()
  console.log('getRoutesListener')
  var data = JSON.parse(this.responseText);
  
  routes = data;
  
  // for(var route = )
  for(var route_id in routes){
    var route = routes[route_id]
    // console.log(route)
    // console.log(routes[route])
    var routeLayerGroup = L.layerGroup([]);
    routeLayerGroup.addTo(map);
    
    var routeLabel = route.route_short_name + " " + route.route_desc

    overlayMaps[routeLabel] = routeLayerGroup
    layerControl.addOverlay(routeLayerGroup, routeLabel)
    
  }
  
  resumeStateUpdate()
  restoreState()
  
  // layerControl = L.control.layers(baseMaps, overlayMaps).addTo(map);
}



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


const routesRequest = new XMLHttpRequest();
routesRequest.onload = getRoutesListener;
routesRequest.open('get', '/routes');
routesRequest.send();



const vehiclesRequest = new XMLHttpRequest();
vehiclesRequest.onload = getVehiclesListener;
vehiclesRequest.open('get', '/latest');
vehiclesRequest.send();





const getStopsListener = function() {
  // console.log('getStopsListener')
  var data = JSON.parse(this.responseText);

  for(var stop in data){
    allStops.push(data[stop]);
  }

  if(allStops.length>0){
    for(var stop in allStops){
      handleStopsData(allStops[stop]);
    }
        
    // layerControl.addOverlay(overlayMaps["Stops"], "Stops").addTo(map)
  }
}



function handleStopsData(data){
  
  nearStopMarkers[data.stop_id] = (L.circle([data.stop_lat, data.stop_lon], {
      color: 'blue',
      // fillColor: fillColour,
      // fillOpacity: 0.5,
      opacity: 0.2,
      radius: 5})//.addTo(map)
      .bindPopup(popupStopText(data))
      .on("popupopen", function(e){onPopupStopOpen(e, data.stop_id)}));

  overlayMaps["Stops"].addLayer(nearStopMarkers[data.stop_id])
  
}


const stopsRequest = new XMLHttpRequest();
stopsRequest.onload = getStopsListener;
stopsRequest.open('get', '/stops');
stopsRequest.send();




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
  
  // console.log("handleVehicleData")
  // console.log(data.DelaySeconds)
  
  if(data.DelaySeconds>60){
    colour = 'yellow';
    fillColour = '#ffff33';
    if(data.DelaySeconds>300){
        colour = 'orange';
        fillColour = '#FFA500';
      if(data.DelaySeconds>600){
        colour = 'red';
        fillColour = '#FF0033';
      }      
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
  var stale = false
  if(timeSinceRecorded_ms > 5 * 60 * 1000){
    stale = true
    colour = 'grey';
    fillColour = '#666666';
  }

  // Really stale data - over 15 mins since recording - don't render
  if(timeSinceRecorded_ms > 15 * 60000){
    return;
  }
  
  // Add to routeLayers - create if doesn't exist
  
//   var routeLayer = routeLayers[data.RouteId]
  
//   if(routeLayer==null){
//   console.log("routeLayers")
//   console.log(routeLayers)
//     var routeLayer = L.layerGroup([littleton, denver, aurora, golden]);
//     // routeLayers[data.RouteId] = 
//     // routeLayer = 
//   }
    
  
  var route_id = data.RouteId
  var route = routes[route_id]
  if(route==null){
    console.warn("routes not ready yet")
    return;
  }
  var routeLabel = route.route_short_name + " " + route.route_desc


  if(markers[data.VehicleRef]){
    let historyLine = L.polyline([markers[data.VehicleRef].getLatLng(), [data.Lat, data.Long]], {
      color: colour,
      width: 10})//.addTo(map);

    overlayMaps[routeLabel].addLayer(historyLine)

    if(!trails[data.VehicleRef]){
      trails[data.VehicleRef] = [];
    }
    trails[data.VehicleRef].push(historyLine);
    let opacity = 1;
    for(var index = trails[data.VehicleRef].length - 1;index >=0; --index){
      trails[data.VehicleRef][index].setStyle({opacity:opacity});
      opacity -= 0.05;
      if(opacity<=0){
        map.removeLayer(trails[data.VehicleRef].shift());        
      }
    }

    var newLatLng = new L.LatLng(data.Lat, data.Long);
    markers[data.VehicleRef].setLatLng(newLatLng);
    markers[data.VehicleRef].setStyle({
      color: colour,
      fillColor: fillColour});
    // markers[data.VehicleRef]
    //   .bindPopup("Getting info...")
    //   .on("popupopen", function(e){onPopupBusOpen(e, data.VehicleRef)});
      // ._popup.setContent(popupText(data));
  } else
  {
    markers[data.VehicleRef] = (L.circle([data.Lat, data.Long], {
      color: colour,
      fillColor: fillColour,
      fillOpacity: 0.5,
      radius: 30})//.addTo(map)
      // .bindPopup(popupText(data.VehicleRef))      
      .bindPopup("Getting info...")
      .on("popupopen", function(e){onPopupBusOpen(e, data.VehicleRef)})

     ); 
    

    overlayMaps[routeLabel].addLayer(markers[data.VehicleRef])

  }
  
  
  let tooltip = markers[data.VehicleRef].getTooltip();
  if(tooltip == null || tooltip.getContent() != tooltipText(data.VehicleRef)){
    
    
    if(tooltip!=null){
      markers[data.VehicleRef].unbindTooltip();  
    }
    markers[data.VehicleRef].bindTooltip(tooltipText(data.VehicleRef), 
    {
        permanent: true, 
        direction: 'right',
        className: "labels"
    })      
    
    if(map.getZoom()<zoomTooltipThreashold){
      
        var toolTip = markers[data.VehicleRef].getTooltip();
        if (toolTip) {
          this.map.closeTooltip(toolTip);
        }
    }
  }

  
  // markers[data.VehicleRef] = L.marker([data.Lat, data.Long]);
  // console.log(markers[data.VehicleRef]);
  // markers[data.VehicleRef].addToMap(map);
  // console.log(vehicles);
}


function tidyUpStaleData(){
  console.log("tidyUpStaleData")

    // Clear up markers....
    for(var i in vehicles){
      var vehicle = vehicles[i]
      // console.log(i)
      // console.log(vehicles[i])
      let recordedAtTime = new Date(vehicle.RecordedAtTime);
      let timeNow = new Date();
      let timeSinceRecorded_ms = timeNow - recordedAtTime;

      
      // 5 minutes?
      if(timeSinceRecorded_ms > 5 * 60 * 1000){
        var colour = 'grey';
        var fillColour = '#666666';
        
        if(trails[vehicle.VehicleRef]!=null && trails[vehicle.VehicleRef].length>0){
          console.log("Removing stale trails for vehicle " + vehicle.VehicleRef)
          for(var index = trails[vehicle.VehicleRef].length - 1;index >=0; --index){
            map.removeLayer(trails[vehicle.VehicleRef].shift());        
          }
          trails[vehicle.VehicleRef] = null
        }

        if(markers[vehicle.VehicleRef]!=null){
          // Really stale data - over 15 mins since recording - remove
          if(timeSinceRecorded_ms > 15 * 60000){
            console.log("Removing stale marker for vehicle " + vehicle.VehicleRef)
            map.removeLayer(markers[vehicle.VehicleRef]);
            markers[vehicle.VehicleRef] = null
          } else {
            markers[vehicle.VehicleRef].setStyle({
              color: colour,
              fillColor: fillColour}
            );
          }
        }
      }

      
    }
//     if(vehicles[data.VehicleRef] && vehicles[data.VehicleRef].RecordedAtTime == data.RecordedAtTime){
//     // console.log('no update');

//     if(markers[data.VehicleRef]){
//     let historyLine = L.polyline([markers[data.VehicleRef].getLatLng(), [data.Lat, data.Long]], {
//       color: colour,
//       width: 10})//.addTo(map);

//     overlayMaps[routeLabel].addLayer(historyLine)

//     if(!trails[data.VehicleRef]){
//       trails[data.VehicleRef] = [];
//     }
//     trails[data.VehicleRef].push(historyLine);

}

var zoomTooltipThreashold=15


var lastZoom;
map.on('zoomend', function() {
  var zoom = map.getZoom();
  if (zoom < zoomTooltipThreashold && (!lastZoom || lastZoom >= zoomTooltipThreashold)) {
    map.eachLayer(function(l) {
      if (l.getTooltip) {
        var toolTip = l.getTooltip();
        if (toolTip) {
          this.map.closeTooltip(toolTip);
        }
      }
    });
  } else if (zoom >= zoomTooltipThreashold && (!lastZoom || lastZoom < zoomTooltipThreashold)) {
    map.eachLayer(function(l) {
      if (l.getTooltip) {
        var toolTip = l.getTooltip();
        if (toolTip) {
          this.map.addLayer(toolTip);
        }
      }
    });
  }
  lastZoom = zoom;
})



function popupStopText(data){
  // console.log("popup")
  return data.stop_code + ": " + data.stop_name;
}

function onPopupStopOpen(data, stop_id){
  console.log("onPopupOpen")

  console.log(data)
  
  var d = new Date()
  data.popup.setContent("UPDATING...")

  console.log(stop_id)

  getStopDepartures(stop_id, data.popup)
  
  
}

function popupText(vehicleRef){
    
  var vehicle = vehicles[vehicleRef].entity.vehicle;
  var trip = vehicles[vehicleRef].entity.vehicle.trip;
  var route = trip.trip_id.substring(0, trip.trip_id.indexOf("_"));
  // var route = vehicles[vehicleRef].route
  var delaySeconds = vehicles[vehicleRef].DelaySeconds
  var recordedAtTime = new Date(vehicles[vehicleRef].RecordedAtTime)
  
  
  // let time = new Date(data.RecordedAtTime).toLocaleTimeString();
  let delay = delaySeconds > 60? ' (Delayed ' + delaySeconds + 's) ':'';
  
  let transport = "Bus "

  if(['KPL', 'HVL', 'JVL', 'MEL', 'WRL'].includes(route)){
    transport = "Train "
  }

  if(['QDF'].includes(route)){
    transport = "Ferry "
  }

  let description = transport + route + delay + " (" + vehicleRef + ")"
  
  let timeNow = new Date();
  let timeSinceRecorded_ms = timeNow - recordedAtTime;

  if(timeSinceRecorded_ms > 60000){
    description += " recorded at " + recordedAtTime
  }
  

  return description;
}

function tooltipText(vehicleRef){
    
  var vehicle = vehicles[vehicleRef].entity.vehicle;
  var trip = vehicles[vehicleRef].entity.vehicle.trip;
  var route = trip.trip_id.substring(0, trip.trip_id.indexOf("_"));
  var delaySeconds = vehicles[vehicleRef].DelaySeconds

  let delay = delaySeconds > 60? ' +' + delaySeconds + 's':'';

  return route + delay;
}


function onPopupBusOpen(data, vehicleRef){
    data.popup.setContent(popupText(vehicleRef));
  
}










function getStopDepartures(stopNumber, popup){
  const stopDeparturesRequest = new XMLHttpRequest();
  stopDeparturesRequest.stopNumber = stopNumber;
  stopDeparturesRequest.popup = popup;
  stopDeparturesRequest.onload = getStopDeparturesListener;
  stopDeparturesRequest.open('get', '/stopDepartures/' + stopNumber);
  stopDeparturesRequest.send();

  

}

const getStopDeparturesListener = function() {
  // parse our response to convert to JSON
  console.log('getStopDeparturesListener')
  console.log(this.stopNumber)
  let stopDepartures = JSON.parse(this.responseText);
  let departures = stopDepartures.departures;
  
  
  // console.log(stopDepartures)
  if(departures != null && departures.length>0){
    var nextDeparture = departures[0]
    console.log(nextDeparture)
    // this.popup.setContent("UPDATED")
    
    // var now = new Date()
    // var expected = new Date(departures[0].arrival.expected==null?departures[0].arrival.aimed:departures[0].arrival.expected);
    // console.log(expected - now);
    
    var expected = new moment(nextDeparture.departure.expected==null?nextDeparture.departure.aimed:nextDeparture.departure.expected);
    this.popup.setContent("Service " + nextDeparture.service_id + " to " +  nextDeparture.destination.name + " is due " + expected.fromNow() + "\n"
                         + " " + nextDeparture.status + " " + nextDeparture.delay)
  }
}



