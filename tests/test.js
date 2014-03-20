var tessel = require('tessel');
var hardware = tessel.port('a');

var gps = require('../').connect(hardware);

var async = require('async');

gps.on('ready', function() {
  console.log("Module connected. Commencing tests...");
  beginTests();
});

gps.on('error', function(err) {
  console.log("Error Connecting:", err);
});

function beginTests() {
  async.waterfall(
    [
      getCoordinatesTest
    ],
    function(err, results) {
      if (err) {
        failModule();
      }
      else{
        passModule();
      }
    })
}

function getNumSatellitesTest() {
  gps.getNumSatellites(function(err, num, timestamp) {
    console.log("Got these many in the callback", num, timestamp);
  });

  gps.on('numSatellites', function(num, timestamp) {
    console.log("Got this many in event", num, timestamp);
  })
}
function getCoordinatesTest() {
  gps.getCoordinates(function(err, coords) {
    if (err) {
      callback && callback(err);
    }
    else {
      console.log("Got these sweet coordinates", coords);
      callback && callback();
    }
  })
}

function passModule() {
  console.log("YOU FUCKING PASSED!");
  tessel.led(2).high();
}

function failModule(err) {
  console.log("Failed! Try again.", err);
  tessel.led(1).high();
}

// gps.on('connected', function() {
// 	console.log('GPS connected. Waiting for data...');
// 	gps.on('data', function() {
// 		console.log(gps.getSatellites()); //if numSat is 0, try going outside
// 		console.log(gps.getCoordinates()); //options: 'deg-min-sec', 'deg-dec', default 'deg-min-dec'
// 		console.log(gps.getAltitude()); //options: 'feet', defaults to meters
// 		console.log (gps.geofence({lat: [42.29, 'N'], lon: [71.27, 'W']}, {lat: [42.30, 'N'], lon: [71.26, 'W']}));
// 	});
// });