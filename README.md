#GPS
Driver for the gps-a2235h Tessel GPS module. The hardware documentation for this module can be found [here](https://github.com/tessel/hardware/blob/master/modules-overview.md#gps).

If you run into any issues you can ask for support on the [GPS Module Forums](http://forums.tessel.io/category/gps).

The GPS module can currently only be run from Port C using software UART. Port C is the most isolated from RF noise and is best for locking onto GPS signals. 

###Installation
```sh
npm install gps-a2235h
```

###Example
```js
/**********************************************************
This gps example logs a stream of data:
coordinates, detected satellites, timestamps, and altitude.
For best results, try it while outdoors.
**********************************************************/

var tessel = require('tessel');
var gpsLib = require('gps-a2235h');
gpsLib.debug = 0; // switch this to 1 for debug logs, 2 for printing out raw nmea messages

// GPS uses software UART, which is only available on Port C
// we use Port C because it is port most isolated from RF noise
var gps = gpsLib.use(tessel.port['C']); 

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
```

###Methods
&#x20;<a href="#api-gps-setCoordinateFormat-options-callback-Sets-coordinate-output-notation" name="api-gps-setCoordinateFormat-options-callback-Sets-coordinate-output-notation">#</a> gps<b>.setCoordinateFormat</b>(options, callback() )
 Sets the output format for coordinates. This is only available on Tessel 2. Valid options:
 ```
 options.format: 'deg-min-sec', 'deg-dec', deg-min-dec, 'utm'
 options.zone: INTEGER (used for UTM calculations)
 ```
 
&#x20;<a href="#api-gps-powerOff-callback-Turns-the-GPS-chip-off" name="api-gps-powerOff-callback-Turns-the-GPS-chip-off">#</a> gps<b>.powerOff</b>( callback() )  
 Turns the GPS chip off.  

&#x20;<a href="#api-gps-powerOn-callback-Turns-the-GPS-chip-on" name="api-gps-powerOn-callback-Turns-the-GPS-chip-on">#</a> gps<b>.powerOn</b>( callback() )  
 Turns the GPS chip on.  


###Events
&#x20;<a href="#api-gps-on-altitude-callback-altitudeObj-Emitted-when-altitude-data-is-available-Emitted-in-the-form-altitude-in-meters-timestamp" name="api-gps-on-altitude-callback-altitudeObj-Emitted-when-altitude-data-is-available-Emitted-in-the-form-altitude-in-meters-timestamp">#</a> gps<b>.on</b>( 'altitude', callback(altitudeObj) )  
 Emitted when altitude data is available. Emitted in the form {altitude in meters, timestamp}.  

&#x20;<a href="#api-gps-on-coordinates-callback-coordinateObj-Emitted-when-coordinate-data-is-available-Emitted-in-the-form-latitude-longitude-timestamp" name="api-gps-on-coordinates-callback-coordinateObj-Emitted-when-coordinate-data-is-available-Emitted-in-the-form-latitude-longitude-timestamp">#</a> gps<b>.on</b>( 'coordinates', callback(coordinateObj) )  
 Emitted when coordinate data is available. Emitted in the form {latitude, longitude, timestamp}.  

&#x20;<a href="#api-gps-on-error-callback-err-Emitted-upon-error" name="api-gps-on-error-callback-err-Emitted-upon-error">#</a> gps<b>.on</b>( 'error', callback(err) )  
 Emitted upon error.  

&#x20;<a href="#api-gps-on-power-off-callback-Emitted-when-the-module-has-been-powered-off" name="api-gps-on-power-off-callback-Emitted-when-the-module-has-been-powered-off">#</a> gps<b>.on</b>( 'power-off', callback() )  
 Emitted when the module has been powered off.  

&#x20;<a href="#api-gps-on-power-on-callback-Emitted-when-the-module-has-been-powered-on" name="api-gps-on-power-on-callback-Emitted-when-the-module-has-been-powered-on">#</a> gps<b>.on</b>( 'power-on', callback() )  
 Emitted when the module has been powered on.  

&#x20;<a href="#api-gps-on-ready-callback-Emitted-upon-first-successful-communication-between-the-Tessel-and-the-module" name="api-gps-on-ready-callback-Emitted-upon-first-successful-communication-between-the-Tessel-and-the-module">#</a> gps<b>.on</b>( 'ready', callback() )  
 Emitted upon first successful communication between the Tessel and the module.  


###License
MIT or Apache 2.0, at your option