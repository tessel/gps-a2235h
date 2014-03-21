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
      getNumSatellitesTest
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
  console.log("Running test to find number of satellites");
  var gate = 0;
  var eventNum;
  gps.getNumSatellites(function(err, num) {
    if (err) {
      return callback && callback(err);
    }
    else {
      if (num != undefined && gate === 1) {
        if (eventNum === num) {
          console.log("Num Satellites Test Passed!");
          callback && callback();
        }
        else {
          callback && callback("Different values returned to event and callback.");
        }
      }
      else {
        callback && callback("Num Satellites event not hit or num undefined");
      }
    }
  });

  gps.once('numSatellites', function(num) {
    gate++;
    eventNum = num;
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