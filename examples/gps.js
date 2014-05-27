/**********************************************************
This gps example logs a stream of data:
coordinates, detected satellites, timestamps, and altitude.
For best results, try it while outdoors.
**********************************************************/

// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

var tessel = require('tessel');
var gps = require('../').use(tessel.port['A']);

//  Initialize the GPS
gps.on('ready', function () {
  console.log('GPS module powered and ready. Waiting for satellites...');

  //  Act on some of the built-in event emissions
  gps.on('coordinates', function (coords) {
    console.log('Got some coordinates!');
    console.log('  Lat:\t', coords.lat);
    console.log('  Lat:\t', coords.lon);
    console.log('  Timestamp:\t', coords.timestamp);
  });

  gps.on('altitude', function (alt) {
    console.log('Got an altitude of', alt.alt,
      'meters (timestamp: ' + alt.timestamp + ')');
  });

  //  All data from the module is emitted by its type parameter. Parse one!
  gps.on('satellite-list-partial', function (parsed) {
    console.log('\nDetected (at least) the following satellites:');
    //  Note that the module needs to do more than just
    //  detect a satellite in order to lock onto it
    parsed.satellites.forEach(function (sat) {
      console.log(' ', sat);
    });
  });

  //  Have the module act on a specific piece of data
  var parseDate = function (parsed) {
    //  Extract and print the date and time from the given NMEA message
    if (parsed.timestamp !== '' && parsed.date !== '') {
      var time = parsed.timestamp;
      var date = parsed.date;

      //  Parse the data
      var day = date.slice(0, 2);
      var month = date.slice(2, 4);
      var year = date.slice(4);
      var hours = time.slice(0, 2);
      var minutes = time.slice(2, 4);
      var seconds = time.slice(4);

      console.log('\nCurrent GPS date and time:');
      console.log('  Year:\t\t 20' + year);
      console.log('  Month:\t', month);
      console.log('  Day:\t\t', day);
      console.log('  Timestamp:\t', hours + ':' + minutes + ':' + seconds);
    }
  }
  //  This NMEA message type contains date/time info
  //  Let's call parseDate with it!
  gps.on('nav-info', parseDate);
});

process.ref();
