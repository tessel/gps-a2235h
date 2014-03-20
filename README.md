#GPS
Driver for the gps-a2235h Tessel GPS module ([A2235-H](http://www.mouser.com/catalog/specsheets/EVA2235-H.pdf)).

##Installation
```sh
npm install gps-a2235h
```

##Example
```js
var tessel = require('tessel');
var hardware = tessel.port('b');

var gps = require('gps-a2235h').use(hardware);

gps.on('ready', function() {
	
	gps.getCoordinates(function(err, coordinates) {
		if (err) {
			console.log("Error retrieving coordinates", coordinates);
		}
	});
	
	gps.getAltitude(function(err, altitude) {
		if (err) {
			console.log("Error retrieving altitude", altitude);
		}	
	});
	
	gps.setGeofence({lat: [42.29, 'N'], lon: [71.27, 'W']}, {lat: [42.30, 'N'], lon: [71.26, 'W']}, function(err) {
		if (err) {
			console.log("Error setting geofence", geofence);
		}
	});
});

gps.on('coordinates', function(coordinates) {
	console.log("Module is located at", coordinates);
});

gps.on('altitude', function(altitude) {
	console.log("Module is at altitude of", altitude);
});

gps.on('geofence', function(coordinates) {
	console.log("Module has entered geofence at", coordinates);
});

gps.on('error', function(err) {
	console.log("Unable to communicate with module...", err);
});
```

##Methods

Get the current coordinates of the GPS module.
*  **`gps`.getCoordinates(`format`, `function(err, coordinates) {...}` )**

Get the current altitude of the GPS module.
*  **`gps`.getAltitude(`format`, `function(err, altitude) {...}` )**

Get the current number of reachable satellites.
*  **`gps`.getNumSatellites(`function(err) {...}` )**

Get notified when the GPS is inside of specified geofence.

Example geofence: `{lat: [42.29, 'N'], lon: [71.27, 'W']}, {lat: [42.30, 'N'], lon: [71.26, 'W']}`
*  **`gps`.setGeofence(`minCoordinates`, `maxCoordinates`, `function(err) {...}` )**

Turn the GPS on.
*  **`gps`.powerOn(`function(err) {...}` )**

Turn the GPS off.
*  **`gps`.powerOff(`function(err) {...}`)**

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
* **`gps`.on(`numSatellites`, `function(satellite) {...}` )**

`geofence` called when the module has entered a geofence.
* **`gps`.on(`geofence`, `function(coordinates) {...}` )**

`powerOn` called when the module turns on.
* **`gps`.on(`powerOn`, `function() {...}` )**

`powerOff` called when the module turns off.
* **`gps`.on(`powerOff`, `function() {...}` )**

## License

MIT
