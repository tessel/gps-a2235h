#GPS
Driver for the gps-a2235h Tessel GPS module ([A2235-H](http://www.mouser.com/catalog/specsheets/EVA2235-H.pdf)).

##Installation
```sh
npm install gps-a2235h
```

##Example
```js
/**********************************************************
This gps example logs a stream of data:
coordinates, detected satellites, timestamps, and altitude.
For best results, try it while outdoors.
**********************************************************/

var tessel = require('tessel');
var gps = require('gps-a2235h').use(tessel.port['A']);

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
```

##Methods

##### * `gps.powerOff(callback())` Turns the GPS chip off.

##### * `gps.powerOn(callback())` Turns the GPS chip on.

##### * `gps.setCoordinateFormat(format, callback())` Configure how the module reports latitude and longitude: options are 'deg-min-sec', 'deg-min-dec', and 'deg-dec'.

##Events

##### * `gps.on('altitude', callback(altitudeObj))` Emitted when altitude data is available. Emitted in the form {altitude in meters, timestamp}.

##### * `gps.on('coordinates', callback(coordinateObj))` Emitted when coordinate data is available. Emitted in the form {latitude, longitude, timestamp}.

##### * `gps.on('error', callback(err))` Emitted upon error.

##### * `gps.on('powerOff', callback())` Emitted when the module has been powered off.

##### * `gps.on('powerOn', callback())` Emitted when the module has been powered on.

##### * `gps.on('ready', callback())` Emitted upon first successful communication between the Tessel and the module.

Also emits parsed NMEA objects by type.

## License

MIT or Apache 2.0, at your option
