var tessel = require('tessel');
var hardware = tessel.port('a');

var gps = require('../').connect(hardware);

gps.on('ready', function() {
  console.log("Module connected. Commencing tests...");
});

gps.on('error', function(err) {
  console.log("Error Connecting:", err);
});

// gps.on('connected', function() {
// 	console.log('GPS connected. Waiting for data...');
// 	gps.on('data', function() {
// 		console.log(gps.getSatellites()); //if numSat is 0, try going outside
// 		console.log(gps.getCoordinates()); //options: 'deg-min-sec', 'deg-dec', default 'deg-min-dec'
// 		console.log(gps.getAltitude()); //options: 'feet', defaults to meters
// 		console.log (gps.geofence({lat: [42.29, 'N'], lon: [71.27, 'W']}, {lat: [42.30, 'N'], lon: [71.26, 'W']}));
// 	});
// });