// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

/**********************************************************
This gps example logs a stream of data:
coordinates, detected satellites, timestamps, and altitude.
For best results, try it while outdoors.
**********************************************************/

var tessel = require('tessel');
var gpsLib = require('../'); // Replace '../' with 'gps-a2235h' in your own code
gpsLib.debug = 0; // switch this to 1 for debug logs, 2 for printing out raw nmea messages

// GPS uses software UART, which is only available on Port C on Tessel 1
// we use Port C because it is port most isolated from RF noise
// Port C doesn't exist on Tessel 2 so use Port A
var portToUse = 'C';

if (!tessel.port[portToUse]) {
  portToUse = 'A';
}

var gps = gpsLib.use(tessel.port[portToUse]);

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

  // Emitted when we have information about a fix on satellites
  gps.on('fix', function (data) {
    console.log(data.numSat, 'fixed.');
  });

  gps.on('dropped', function(){
    // we dropped the gps signal
    console.log("gps signal dropped");
  });
});

gps.on('error', function(err){
  console.log("got this error", err);
});
