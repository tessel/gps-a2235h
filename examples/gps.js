/*********************************************
This gps example logs a stream of data:
number of satellites, coordinates, altitude,
and whether or not it is within a geofence.
For best results, try it while outdoors.
*********************************************/

var tessel = require('tessel');
var gps = require('../').connect(tessel.port("A"));

// Initialize the GPS
gps.on('connected', function() {
	console.log('GPS connected. Waiting for data...');
	// Stream data
	gps.on('data', function() {
		console.log(gps.getSatellites()); //if numSat is 0, try going outside
		console.log(gps.getCoordinates()); //options: 'deg-min-sec', 'deg-dec', default 'deg-min-dec'
		console.log(gps.getAltitude()); //options: 'feet', defaults to meters
		// Set geofence with specified opposite corners (minimum, maximum).
		// If position data is available, returns boolean true if gps is within the rectangle
		console.log (gps.geofence({lat: [42.29, 'N'], lon: [71.27, 'W']}, {lat: [42.30, 'N'], lon: [71.26, 'W']}));
	});
});

var led1 = tessel.led(1).output().high();
var led2 = tessel.led(2).output().low();

setInterval(function () {
  led1.toggle();
  led2.toggle();
}, 100);
