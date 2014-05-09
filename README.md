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
coordinates, detected satellites, timestamps, and altitude
For best results, try it while outdoors.
**********************************************************/

var tessel = require('tessel');
var gps = require('gps-a2235h').use(tessel.port("A"));

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

Get the current coordinates of the GPS module.
*  **`gps`.getCoordinates(`function(err, coordinates) {...}` )**

Get the current altitude of the GPS module.
*  **`gps`.getAltitude(`function(err, altitude) {...}` )**

Get the current number of reachable satellites.
*  **`gps`.getNumSatellites(`function(err) {...}` )**

Get notified when the GPS is inside of specified geofence.

Example geofence: `{lat: [42.29, 'N'], lon: [71.27, 'W']}, {lat: [42.30, 'N'], lon: [71.26, 'W']}`
*  **`gps`.setGeofence(`minCoordinates`, `maxCoordinates`, `function(err) {...}` )**

Turn the GPS on.
*  **`gps`.powerOn(`function(err) {...}` )**

Turn the GPS off.
*  **`gps`.powerOff(`function(err) {...}`)**

Set the format that you would like data to be returned.
Current options are `'deg-min-sec'` or `'deg-dec'`. Default is `'deg-min-dec'`.
*  **`gps`.setCoordinateFormat(`format`)**

##Events

`ready` called when module has can communicate with Tessel.
* **`gps`.on(`ready`, `function(coordinates) {...}` )**

`error` called when there is a problem communicating with module.
* **`gps`.on(`error`, `function(coordinates) {...}` )**

`coordinates` called when we have finished calculating our position via satellites.
* **`gps`.on(`coordinates`, `function(coordinates) {...}` )**

`altitude` called when we have finished calculating our altitude via satellies.
* **`gps`.on(`altitude`, `function(altitude) {...}` )**

`numSatellites` called when we've discovered all available satellites. If this number is zero, you won't be able to get GPS data.
* **`gps`.on(`numSatellites`, `function(numSatellites) {...}` )**

`geofence` called when the module has entered a geofence.
* **`gps`.on(`geofence`, `function(coordinates) {...}` )**

`powerOn` called when the module turns on.
* **`gps`.on(`powerOn`, `function() {...}` )**

`powerOff` called when the module turns off.
* **`gps`.on(`powerOff`, `function() {...}` )**

## License

MIT
