// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

/**********************************************************
This gps example logs a stream of data:
coordinates, detected satellites, timestamps, and altitude.
For best results, try it while outdoors.
**********************************************************/

var tessel = require('tessel');
var gps = require('../').use(tessel.port['A']); // Replace '../' with 'gps-a2235h' in your own code

var satsInRange = 0;
var satsFixed = 0;

// Wait until the module is connected
gps.on('ready', function () {
  console.log('GPS module powered and ready. Waiting for satellites...');
  // Emit coordinates when we get a coordinate fix
  gps.on('coordinates', function (coords) {
    console.log('Lat:', coords.lat, '\tLon:', coords.lon, '\tTimestamp:', coords.timestamp);
  });

  // Emit altitude when we get an altitude fix
  gps.on('altitude', function (alt) {
    console.log('Got an altitude of', alt.alt, 'meters (timestamp: ' + alt.timestamp + ')');
  });

  // Emitted whenever satellites are in view
  gps.on('satellite-list-partial', function (data) {
    satsInRange = data.satsInView;
    console.log(satsInRange, 'satellites in range,', satsFixed, 'fixed.');
  });

  // Emitted when we have information about a fix on satellites
  gps.on('fix', function (data) {
    satsFixed = data.numSat;
    console.log(satsInRange, 'satellites in range,', satsFixed, 'fixed.');
  });
});
