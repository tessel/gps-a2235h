#GPS
Driver for the gps-a2235h Tessel GPS module. The hardware documentation for this module can be found [here](https://github.com/tessel/hardware/blob/master/modules-overview.md#gps).

If you run into any issues you can ask for support on the [GPS Module Forums](http://forums.tessel.io/category/gps).

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

var gps = gpsLib.use(tessel.port['A']);

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
```

###Methods
&#x20;<a href="#api-gps-powerOff-callback-Turns-the-GPS-chip-off" name="api-gps-powerOff-callback-Turns-the-GPS-chip-off">#</a> gps<b>.powerOff</b>( callback() ) Turns the GPS chip off.  

&#x20;<a href="#api-gps-powerOn-callback-Turns-the-GPS-chip-on" name="api-gps-powerOn-callback-Turns-the-GPS-chip-on">#</a> gps<b>.powerOn</b>( callback() ) Turns the GPS chip on.  

&#x20;<a href="#api-gps-setCoordinateFormat-format-callback-Configure-how-the-module-reports-latitude-and-longitude-options-are-deg-min-sec-deg-min-dec-and-deg-dec" name="api-gps-setCoordinateFormat-format-callback-Configure-how-the-module-reports-latitude-and-longitude-options-are-deg-min-sec-deg-min-dec-and-deg-dec">#</a> gps<b>.setCoordinateFormat</b>( format, callback() ) Configure how the module reports latitude and longitude: options are 'deg-min-sec', 'deg-min-dec', and 'deg-dec'.  

###Events
&#x20;<a href="#api-gps-on-altitude-callback-altitudeObj-Emitted-when-altitude-data-is-available-Emitted-in-the-form-altitude-in-meters-timestamp" name="api-gps-on-altitude-callback-altitudeObj-Emitted-when-altitude-data-is-available-Emitted-in-the-form-altitude-in-meters-timestamp">#</a> gps<b>.on</b>( 'altitude', callback(altitudeObj) ) Emitted when altitude data is available. Emitted in the form {altitude in meters, timestamp}.  

&#x20;<a href="#api-gps-on-coordinates-callback-coordinateObj-Emitted-when-coordinate-data-is-available-Emitted-in-the-form-latitude-longitude-timestamp" name="api-gps-on-coordinates-callback-coordinateObj-Emitted-when-coordinate-data-is-available-Emitted-in-the-form-latitude-longitude-timestamp">#</a> gps<b>.on</b>( 'coordinates', callback(coordinateObj) ) Emitted when coordinate data is available. Emitted in the form {latitude, longitude, timestamp}.  

&#x20;<a href="#api-gps-on-error-callback-err-Emitted-upon-error" name="api-gps-on-error-callback-err-Emitted-upon-error">#</a> gps<b>.on</b>( 'error', callback(err) ) Emitted upon error.  

&#x20;<a href="#api-gps-on-powerOff-callback-Emitted-when-the-module-has-been-powered-off" name="api-gps-on-powerOff-callback-Emitted-when-the-module-has-been-powered-off">#</a> gps<b>.on</b>( 'powerOff', callback() ) Emitted when the module has been powered off.  

&#x20;<a href="#api-gps-on-powerOn-callback-Emitted-when-the-module-has-been-powered-on" name="api-gps-on-powerOn-callback-Emitted-when-the-module-has-been-powered-on">#</a> gps<b>.on</b>( 'powerOn', callback() ) Emitted when the module has been powered on.  

&#x20;<a href="#api-gps-on-ready-callback-Emitted-upon-first-successful-communication-between-the-Tessel-and-the-module" name="api-gps-on-ready-callback-Emitted-upon-first-successful-communication-between-the-Tessel-and-the-module">#</a> gps<b>.on</b>( 'ready', callback() ) Emitted upon first successful communication between the Tessel and the module.  

####Also emits parsed NMEA objects by type:
&#x20;<a href="#api-gps-on-active-satellites-callback-data-NMEA-GPGSA-GPS-DOP-and-active-satellites" name="api-gps-on-active-satellites-callback-data-NMEA-GPGSA-GPS-DOP-and-active-satellites">#</a> gps<b>.on</b>( 'active-satellites', callback(data) ) NMEA GPGSA: GPS DOP and active satellites.  

&#x20;<a href="#api-gps-on-fix-callback-data-NMEA-GPGGA-Global-positioning-system-fix-data" name="api-gps-on-fix-callback-data-NMEA-GPGGA-Global-positioning-system-fix-data">#</a> gps<b>.on</b>( 'fix', callback(data) ) NMEA GPGGA: Global positioning system fix data.  

&#x20;<a href="#api-gps-on-nav-info-callback-data-NMEA-GPRMC-Recommended-minimum-specific-GPS-Transit-data" name="api-gps-on-nav-info-callback-data-NMEA-GPRMC-Recommended-minimum-specific-GPS-Transit-data">#</a> gps<b>.on</b>( 'nav-info', callback(data) ) NMEA GPRMC: Recommended minimum specific GPS/Transit data.  

&#x20;<a href="#api-gps-on-satellite-list-partial-callback-data-NMEA-GPGSV-GPS-satellites-in-view" name="api-gps-on-satellite-list-partial-callback-data-NMEA-GPGSV-GPS-satellites-in-view">#</a> gps<b>.on</b>( 'satellite-list-partial', callback(data) ) NMEA GPGSV: GPS satellites in view.  

&#x20;<a href="#api-gps-on-track-info-callback-data-NMEA-GPVTG-Track-made-good-and-ground-speed" name="api-gps-on-track-info-callback-data-NMEA-GPVTG-Track-made-good-and-ground-speed">#</a> gps<b>.on</b>( 'track-info', callback(data) ) NMEA GPVTG: Track made good and ground speed.  

###Further Examples  
* [GPS Options](https://github.com/tessel/gps-a2235h/blob/master/examples/gps-options.js). This gps example logs a stream of data: coordinates, detected satellites, timestamps, and altitude.  

###License
MIT or Apache 2.0, at your option