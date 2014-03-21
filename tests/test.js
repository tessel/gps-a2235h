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
      getNumSatellitesTest,
      getCoordinateTest
    ],
    function(err, results) {
      if (err) {
        failModule(err);
      }
      else{
        passModule();
      }
    })

}

function getCoordinateTest(callback) {
  console.log("Testing for coordinates...");
  gps.on('coordinates', function(coordinates) {
    console.log("Oh shit we actually got some?", coordinates);
  });

  gps.getCoordinates(function(err, coordinates) {
    console.log("Nope, error", err);  
    if (err) {
      return callback && callback(err);
    }
    else {
      console.log("This is what we got", coordinates);
    }
  })
} 

function getNumSatellitesTest(callback) {
  console.log("Running test to find number of satellites");
  var gate = 0;
  var eventNum;
  gps.getNumSatellites(function(err, num) {
    if (err) {
      return callback && callback(err);
    }
    else {
      eventNum = num;
      gate++;
    }
  });

  gps.once('numSatellites', function(num) {
      if (num != undefined && gate === 1) {
        if (eventNum === num) {
          console.log("Num Satellites Test Passed!");
          return callback && callback();
        }
        else {
          return callback && callback("Different values returned to event and callback.");
        }
      }
      else {
        return callback && callback("Num Satellites event not hit or num undefined");
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

setInterval(function() {}, 20000);

// gps.on('connected', function() {
// 	console.log('GPS connected. Waiting for data...');
// 	gps.on('data', function() {
// 		console.log(gps.getSatellites()); //if numSat is 0, try going outside
// 		console.log(gps.getCoordinates()); //options: 'deg-min-sec', 'deg-dec', default 'deg-min-dec'
// 		console.log(gps.getAltitude()); //options: 'feet', defaults to meters
// 		console.log (gps.geofence({lat: [42.29, 'N'], lon: [71.27, 'W']}, {lat: [42.30, 'N'], lon: [71.26, 'W']}));
// 	});
// });