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
  
  // console.log("handleVehicleData")
  // console.log(data.DelaySeconds)
  
  if(data.DelaySeconds>60){
    colour = 'yellow';
    fillColour = '#ffff33';
    if(data.DelaySeconds>150){
        colour = 'orange';
        fillColour = '#FFA500';
      if(data.DelaySeconds>300){
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
      radius: 30}).addTo(map)
      .bindPopup(popupText(data.VehicleRef))      
        
                                
      // .bindPopup("Getting info...")
      // .on("popupopen", function(e){onPopupBusOpen(e, data.VehicleRef)})

     );
    
          
      if(!stale){
        markers[data.VehicleRef].bindTooltip(tooltipText(data.VehicleRef), 
        {
            permanent: true, 
            direction: 'center',
            className: "labels"
        })      
      }
    
  }

  
  // markers[data.VehicleRef] = L.marker([data.Lat, data.Long]);
  // console.log(markers[data.VehicleRef]);
  // markers[data.VehicleRef].addToMap(map);
  // console.log(vehicles);
}






var lastZoom;
map.on('zoomend', function() {
  var zoomThreashold=15
  var zoom = map.getZoom();
  if (zoom < zoomThreashold && (!lastZoom || lastZoom >= zoomThreashold)) {
    map.eachLayer(function(l) {
      if (l.getTooltip) {
        var toolTip = l.getTooltip();
        if (toolTip) {
          this.map.closeTooltip(toolTip);
        }
      }
    });
  } else if (zoom >= zoomThreashold && (!lastZoom || lastZoom < zoomThreashold)) {
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



function handleStopsData(data){

  nearStopMarkers[data.stop_id] = (L.circle([data.stop_lat, data.stop_lon], {
      color: 'blue',
      // fillColor: fillColour,
      // fillOpacity: 0.5,
      opacity: 0.2,
      radius: 5}).addTo(map)
      .bindPopup(popupStopText(data))
      .on("popupopen", function(e){onPopupStopOpen(e, data.stop_id)}));
    
}



// function popupText(data){
//   // let now = new Date();
//   // var seconds = (new Date(now) - new Date(data.RecordedAtTime))/1000;
//   // let age = Math.round(seconds) + 's';
//   // if (seconds > 60){
//   //   age = Math.round(seconds/60) + 'm';
//   // }
//   // return data.ServiceID + ': ' + data.VehicleRef + ' ' + age
  
//   let time = new Date(data.RecordedAtTime).toLocaleTimeString();
//   let delay = data.DelaySeconds > 60? ' (Delayed ' + data.DelaySeconds + 's)':'';
  
//   let description = 'Bus ' + data.ServiceID + ' (' + data.VehicleRef + ')\n' 
//   if(['KPL', 'HVL', 'JVL', 'MEL', 'WRL'].includes(data.ServiceID)){
//     description = "(" + new Date(data.DepartureTime).toLocaleTimeString() + ' ' + data.OriginStopName + " -> " + data.DestinationStopName + ")\n";     
//    }
  
//   let popup = description + time + delay;
//   // console.log(popup);
//   return popup;
// }

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
  var delaySeconds = vehicles[vehicleRef].DelaySeconds
  
  
  // let time = new Date(data.RecordedAtTime).toLocaleTimeString();
  let delay = delaySeconds > 60? ' (Delayed ' + delaySeconds + 's) ':'';
  
  let transport = "Bus "

  if(['KPL', 'HVL', 'JVL', 'MEL', 'WRL'].includes(route)){
    transport = "Train "
  }

  let description = transport + delay + route + " (" + vehicleRef + ")"
  
  if(['KPL', 'HVL', 'JVL', 'MEL', 'WRL'].includes(route)){
    description = 'Train ' + route + ' (' + vehicleRef + ')\n' + delay
  }

  return description;
}

function tooltipText(vehicleRef){
    
  var vehicle = vehicles[vehicleRef].entity.vehicle;
  var trip = vehicles[vehicleRef].entity.vehicle.trip;
  var route = trip.trip_id.substring(0, trip.trip_id.indexOf("_"));

  return route;
}


// function onPopupBusOpen(data, vehicleRef){
//   console.log("onPopupBusOpen")


//   // console.log(data)
  
//   var vehicle = vehicles[vehicleRef].entity.vehicle;
//   var trip = vehicles[vehicleRef].entity.vehicle.trip;
//   var route = trip.trip_id.substring(0, trip.trip_id.indexOf("_"));
//   var delaySeconds = vehicles[vehicleRef].DelaySeconds
  
  
//   // let time = new Date(data.RecordedAtTime).toLocaleTimeString();
//   let delay = delaySeconds > 60? ' (Delayed ' + delaySeconds + 's) ':'';
  
//   let transport = "Bus "

//   if(['KPL', 'HVL', 'JVL', 'MEL', 'WRL'].includes(route)){
//     transport = "Train "
//   }

//   let description = transport + delay + route + " (" + vehicleRef + ")"
  
//   if(['KPL', 'HVL', 'JVL', 'MEL', 'WRL'].includes(route)){
//     description = 'Train ' + route + ' (' + vehicleRef + ')\n' + delay
//   }
//   // if(['KPL', 'HVL', 'JVL', 'MEL', 'WRL'].includes(route)){
//   //   description = "(" + trip.start_time + ' ' + data.OriginStopName + " -> " + data.DestinationStopName + ")\n";     
//   //  }

// // {
// // 	id: "2e339e44-dd99-4f28-92ee-ef8bf20d7aa9",
// // 	vehicle: {
// // 		trip: {
// // 			schedule_relationship: 0,
// // 			start_time: "13:50:00",
// // 			trip_id: "HVL__0__3616__RAIL__Rail_MTuWThF-XHol_1"
// // 		},
// // 		vehicle: {
// // 			id: "4268"
// // 		},
// // 		position: {
// // 			bearing: 18,
// // 			latitude: -41.2346764,
// // 			longitude: 174.8351746
// // 		}
// // 	}
// // }  
//   // data.popup.setContent("Service " + vehicles[vehicleRef].entity.vehicle.vehicle.id + " " + vehicles[vehicleRef].entity.vehicle.trip.trip_id)
//   data.popup.setContent(description);
  
//   // console.log(vehicleRef)
//   // console.log(vehicles[vehicleRef].entity)

//   // console.log(vehicles[vehicleRef])


//   // getStopDepartures(stop_id)
  
  
// }










function getStopDepartures(stopNumber, popup){
  const stopDeparturesRequest = new XMLHttpRequest();
  stopDeparturesRequest.stopNumber = stopNumber;
  stopDeparturesRequest.popup = popup;
  stopDeparturesRequest.onload = getStopDeparturesListener;
  stopDeparturesRequest.open('get', '/stopDepartures/' + stopNumber);
  stopDeparturesRequest.send();

  
//   const stopDeparturesRequestOld = new XMLHttpRequest();
//   stopDeparturesRequestOld.onload = getStopDeparturesListener;
//   stopDeparturesRequestOld.open('get', '/stopDeparturesOld/' + stopNumber);
//   stopDeparturesRequestOld.send();


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
//   let nextInboundDeparture = null;
//   let nextInboundDepartureInfo = null;
//   let nextOutboundDeparture = null;
//   let nextOutboundDepartureInfo = null;

//   let announcedInbound = false;
//   let announcedOutbound = false;
//   let announcementCutoffSeconds = 900;
//   let now = new moment();
  
//   const includeSchoolBuses = $('#includeSchoolBuses').is(':checked')
//   console.log(includeSchoolBuses);

  
//   // let listResults = document.getElementById('listResults');
//   // listResults.style.display = 'block';
//   // while (listResults.firstChild) {
//   //   listResults.removeChild(listResults.firstChild);
//   // }


//   if(stopDepartures.Services){
//     stopDepartures.Services.forEach(function(stopDeparture){

//       // Are we ignoring School Buses?
//       if(!includeSchoolBuses && stopDeparture.Service.Mode=="School"){
//         return;
//       }
//       let expectedDeparture = new moment(stopDeparture.DisplayDeparture);
      
//       let inbound = stopDeparture.Direction == "Inbound";

//       if(inbound){
//         if(!nextInboundDeparture || expectedDeparture < nextInboundDeparture){
//           nextInboundDeparture = expectedDeparture;
//           nextInboundDepartureInfo = stopDeparture;
//         }
//       } else {
//         if(!nextOutboundDeparture || expectedDeparture < nextOutboundDeparture){
//           nextOutboundDeparture = expectedDeparture;
//           nextOutboundDepartureInfo = stopDeparture;
//         }
//       }


//       let calculatedDepartureSeconds = (expectedDeparture - now)/1000;

//       // console.log('calculatedDepartureSeconds');
//       // console.log(calculatedDepartureSeconds);
//       // console.log('stopDeparture.DisplayDepartureSeconds')
//       // console.log(stopDeparture.DisplayDepartureSeconds)


//       if(calculatedDepartureSeconds < announcementCutoffSeconds){

//         let message = describeService(stopDeparture);

//         const speech = new SpeechSynthesisUtterance(message);
//         speech.voice = selectedVoice;
//         speechSynthesis.speak(speech);


//         let displayMessage = stopDeparture.Service.Code
//         + ' to ' + stopDeparture.DestinationStopName + ' '
//         + new moment(stopDeparture.DisplayDeparture).format('LT')

//         let node = document.createElement("LI");
//         node.className = 'list-group-item list-group-item-action';
//         var textnode = document.createTextNode(displayMessage);         // Create a text node
//         node.appendChild(textnode);                              // Append the text to <li>
//         listResults.appendChild(node);



//         if(inbound==true)
//         {
//           announcedInbound = true;
//         } else{
//           announcedOutbound = true;
//         }
//       }    

//     });

//   }

//   if(!announcedInbound || !announcedOutbound){
//     let message;
//     if(nextInboundDeparture==null && nextOutboundDeparture==null){
//       message = "There are no services listed."
//       console.log(message);
//       const speech = new SpeechSynthesisUtterance(message);
//       speech.voice = selectedVoice;
//       speechSynthesis.speak(speech);
//     } else {
      
//     }

//     if(nextInboundDeparture){
//       message = 'No Inbound departures in the next ' + moment.duration(announcementCutoffSeconds , "seconds").humanize();
//       message += '. Next service is ' + describeService(nextInboundDepartureInfo);
//       console.log(message);
//       const speech = new SpeechSynthesisUtterance(message);
//       speech.voice = selectedVoice;
//       speechSynthesis.speak(speech);
//     } 

//     if(nextOutboundDeparture){
//       message = 'No Outbound departures in the next ' + moment.duration(announcementCutoffSeconds , "seconds").humanize();
//       message += '. Next service is ' + describeService(nextOutboundDepartureInfo);
//       console.log(message);
//       const speech = new SpeechSynthesisUtterance(message);
//       speech.voice = selectedVoice;
//       speechSynthesis.speak(speech);
//     } 

//   }


function describeService(service){

  let now = new moment();
  let expectedDeparture = new moment(service.DisplayDeparture);
  let calculatedDepartureSeconds = (expectedDeparture - now)/1000;

  let message;
  if(service.Service.Mode.toUpperCase() == 'BUS'){
    message = 'The ' + service.Service.Code 
              /* + ' from "' + service.OriginStopName + '"'*/  
              + ' to "' + service.DestinationStopName + '"'
              + ' is departing in ' + moment.duration(calculatedDepartureSeconds, "seconds").humanize();
  } else
  {
    if(service.Service.Mode.toUpperCase() == 'SCHOOL'){
      message = 'The School Bus departing in ' + moment.duration(calculatedDepartureSeconds, "seconds").humanize();
    } else
    {
      message = 'The '  + service.Service.Mode
                /* + ' from "' + service.OriginStopName + '"'*/ 
                + ' to "' + service.DestinationStopName + '"'
                + ' is departing in ' + moment.duration(calculatedDepartureSeconds, "seconds").humanize();
    }
  }
  let calculatedDelay = (new moment(service.AimedDeparture) - new moment(service.DisplayDeparture))/1000;
  
  if(calculatedDelay > 60 || service.DepartureStatus == 'delayed'){
    message += ". It's " + moment.duration(calculatedDelay, "seconds").humanize() + " late.";
    
  }

  console.log(message);

  message = message.replace(/WgtnStn/gi, 'Wellington')
  message = message.replace(/WELL-All stops/gi, 'Wellington (all stops)')
  message = message.replace(/JOHN-All stops/gi, 'Johnsonville (all stops)')
  message = message.replace(/UPPE/gi, 'Upper Hutt')
  message = message.replace(/WaikanaeStn/gi, 'Whycan-i')
  message = message.replace(/WAIK - All stops/gi, 'Whycan-i (all stops)')
  message = message.replace(/WAIK-All stops/gi, 'Whycan-i (all stops)')
  message = message.replace(/Waikanae/gi, 'whycan-i')
  message = message.replace(/Papakowhai/gi, 'pahpah-co fi')
  message = message.replace(/Paremata/gi, 'Para-mata')
  message = message.replace(/Whitby-NavigationDr/gi, 'Whitby, Navigation Drive')
  message = message.replace(/Porirua/gi, 'Poory Rua')
  message = message.replace(/RaumatiBchShops-Rau/gi, 'Row mati Beach Shops')
  message = message.replace(/Raumati/gi, 'Row mati')
  message = message.replace(/ParaparaumuStn-/gi, 'Para Para Umu Station ')
  message = message.replace(/Paraparaumu/gi, 'Para Para Umu')
  message = message.replace(/MELL - All stops/gi, 'Melling (all stops)')
  message = message.replace(/PORI - All stops/gi, 'Poory Rua (all stops)')
  message = message.replace(/TAIT - All stops\*/gi, 'Taita (all stops)')
  

  message = message.replace(/KapitiHealthCtr \(op/gi, 'Kapiti Health Centre')
  // message = message.replace(/Paekakariki/gi, 'Para Para Umu')
  

  console.log(message);
  
  return message;
}

