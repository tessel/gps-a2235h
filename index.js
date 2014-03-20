var tessel = require('tessel');

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var nmea = require('nmea');
var Packetizer = require('./lib/packetizer');

var GPS = function (hardware, callback) {
	//set this.types for each type
	//type: fix, nav-info, 2waypoint, autopilot-b
	this.hardware = hardware;
	this.onOff = this.hardware.gpio(3);
	this.powerState = 'off';
  this.cached = {};

	// Turn the module on
	this.initialPowerSequence(function(err) {
    console.log("In callback");
    if (!err) {
      // Once we are on, emit the connected event
      console.log("Finished power sequence.");
      this.beginDecoding(function() {
        console.log("Done decoding...");
        // setImmediate(function() {
        //   console.log("Done Emitting...");
        //   this.emit('ready');
        // }.bind(this))
      }.bind(this));
    }
    else {
      setImmediate(function() {
        this.emit('error', err);
      }.bind(this))
    }
	}.bind(this));
}

util.inherits(GPS, EventEmitter);

GPS.prototype.initialPowerSequence = function(callback) {

  var self = this;
	// Tell Tessel to start UART at GPS baud rate
	this.uart = this.hardware.UART({baudrate : 115200});

  var noReceiveTimeout;

  function waitForValidData(bytes) {

    console.log("Shit got data", bytes);
    // If the leading byte is the header bit
    // Remove this listener
    self.removeListener('data', waitForValidData);

    clearTimeout(noReceiveTimeout);

    // And not that we are on
    self.powerState = 'on';

    self.uartExchange(callback);
  }

  function noDataRecieved() {
    console.log("No data received bro...");
    self.removeListener('data', waitForValidData);
    clearTimeout(noReceiveTimeout);
    callback && callback(new Error("Unable to connect to module..."));
  }

  /*
  Wait for a second to see if we get data. If we do, call callback;
  If we don't, toggle power and set timeout again
  If we still don't get it, something bigger is wrong
  */

  // This event listener will wait for valid data to note that we are on
	this.uart.once('data', waitForValidData);

  noReceiveTimeout = setTimeout(function alreadyOn() {
    console.log("Wasn't initially on...");
    this.powerOn(function() {
      noReceiveTimeout = setTimeout(function() {
        console.log("Is it here?");
        noDataRecieved();
        console.log("Maybe"); 
      }, 1000);
    });
  }.bind(this), 1000);

}

// Try to turn the power on.
// The GPS holds toggle state but we can't sometimes we
// may have to toggle power twice. 
GPS.prototype.powerOn = function (callback) {
	var self = this;
  // Pull power high
  if (this.powerState === 'off') {
    console.log("High");
    self.onOff.output().high();

    setTimeout(function backLow() {
      // Pull power low
      console.log("Low")
      self.onOff.low();
      // Set a timeout for it to have time to turn on and start sending
      setTimeout(callback, 100);
    }, 250);

  }
  else {

    callback && callback();
  }
}

GPS.prototype.powerOff = function (callback) {
	var self = this;
    //turns off GPS
    if (power === 'on') {
        self.onOff.output().high();
        tessel.sleep(250); //should change this out for setTimeout when that works
        self.onOff.low();
        tessel.sleep(250);
        power = 'off';
    }
    callback && callback();
}

// Eventually replace this with stream packetizing... sorry Kolker
GPS.prototype.beginDecoding = function(callback) {

  // var packetizer = new Packetizer(this.uart);
  // packetizer.packetize();
  // packetizer.on('packet', function(packet) {
  //   var datum = nmea.parse(packet);
  //   if (datum) {
  //     var type = datum.type.toString();
  //     //update each type in buffer to latest data
  //     this.cached[type] = datum;
  //   }
  // });
  callback && callback();
}

GPS.prototype.uartExchange = function (callback) {
	//Configure GPS baud rate to NMEA
	var characters = new Buffer([0xA0, 0xA2, 0x00, 0x18, 0x81, 0x02, 0x01, 0x01, 0x00, 0x01, 0x01, 0x01, 0x05, 0x01, 0x01, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x25, 0x80, 0x01, 0x3A, 0xB0, 0xB3]);

	this.uart.write(characters);

	//Reset baud rate to talk to Tessel
	this.uart = this.hardware.UART({baudrate : 9600});

  return callback && callback();
}

GPS.prototype.getCoordinates = function (format) {
    //returns the latest received coordinates of the device and a timestamp
    //format can be "deg-min-sec" (degree, minute, second),
    //                                "deg-min-dec" (degree, minutes in decimal) [default]
    //                                "deg-dec" (degree decimal),
    //                                "utm" (universal transverse mercator) NOT CURRENTLY SUPPORTED
    var buffer = this.cached;
    if ('fix' in buffer) {
    	var data = buffer['fix'];
        var latPole = data['latPole'];
        var lonPole = data['lonPole'];
        var lat = data['lat'];
        var lon = data['lon'];
        var dec = lat.indexOf('.');
        latDeg = parseFloat(lat.slice(0,dec-2));
        latMin = parseFloat(lat.slice(dec-2, lat.length));
        var dec = lon.indexOf('.');
        lonDeg = parseFloat(lon.slice(0,dec-2));
        lonMin = parseFloat(lon.slice(dec-2, lon.length));

        if (format === 'utm') {
            //if at some point we want to go through this pain: http://www.uwgb.edu/dutchs/usefuldata/utmformulas.htm
            latitude = 'UTM not currently supported.'
            longitude = 'Voice your outrage to @selkeymoonbeam.'
        } else if (format === 'deg-min-sec') {
            latSec = parseFloat(latMin.toString().split('.')[1] * .6);
            latMin = parseInt(latMin.toString().split('.')[0]);

            lonSec = parseFloat(lonMin.toString().split('.')[1] * .6);
            lonMin = parseInt(lonMin.toString().split('.')[0]);

            latitude = [latDeg, latMin, latSec, latPole];
            longitude = [lonDeg, lonMin, lonSec, lonPole];
        } else if (format === 'deg-dec') {
            lat = latDeg + (latMin / 60);
            lon = lonDeg + (lonMin / 60);

            latitude = [lat, latPole];
            longitude = [lon, lonPole];
        } else {
            latitude = [latDeg, latMin, latPole];
            longitude = [lonDeg, lonMin, lonPole];
        }
        coordinates = {lat: latitude, lon: longitude, timestamp: parseFloat(data.timestamp)}
    	return coordinates
    } else {
    	return 'no navigation data in buffer'}
}

GPS.prototype.getAltitude = function (format) {
        //returns the latest received altitude of the device and a timestamp
        //default is in meters, format 'feet' also available
        var buffer = this.cached;
        if ('fix' in buffer) {
        	data = buffer['fix'];
        	data.alt = parseInt(data.alt);
        	if (format === 'feet') {
                alt = (data.alt / .0254) / 12;
	        } else {alt = data.alt}
	        return {alt: alt, timestamp: parseFloat(data.timestamp)};
        } else {return 'no altitude data in buffer'}
}

GPS.prototype.getSatellites = function () {
	//returns number of satellites last found
	var buffer = this.cached;
	if ('fix' in buffer) {
		data = buffer['fix'];
		numSat = data.numSat;
		return {numSat: numSat, timestamp: parseFloat(data.timestamp)};
	} else {return 'no satellite data in buffer'}
}

GPS.prototype.geofence = function (minCoordinates, maxCoordinates) {
	// takes in coordinates, draws a rectangle from minCoordinates to maxCoordinates
	// returns boolean 'inRange' which is true when coordinates are in the rectangle
	var buffer = this.cached;
	var inRange = false;
	if ((minCoordinates.lat.length === 2) && (maxCoordinates.lat.length === 2)) {
		if (minCoordinates.lat[1] === 'S') {
			minLat = -minCoordinates.lat[0];
		} else {minLat = minCoordinates.lat[0]}
		if (minCoordinates.lon[1] === 'W') {
			minLon = -minCoordinates.lon[0];
		} else {minLon = minCoordinates.lon[0]}
		if (maxCoordinates.lat[1] === 'S') {
			maxLat = -maxCoordinates.lat[0];
		} else {maxLat = maxCoordinates.lat[0]}
		if (maxCoordinates.lon[1] === 'W') {
			maxLon = -maxCoordinates.lon[0];
		} else {maxLon = maxCoordinates.lon[0]}

		//get current coordinates
		currentCoords = this.getCoordinates(this.cached);
		if (currentCoords != 'no navigation data in buffer') {
			if (currentCoords.lat[1] === 'S') {
				currentLat = -currentCoords.lat[0];
			} else {currentLat = currentCoords.lat[0]}
			if (currentCoords.lon[1] === 'W') {
				currentLon = -currentCoords.lon[0];
			} else {currentLon = currentCoords.lon[0]}

			//compare current coordinates with geofence
			if ((currentLat > minLat) && (currentLat < maxLat) && (currentLon > minLon) && (currentLon < maxLon)) {
				inRange = true;
			} else {inRange = false}
			var timestamp = currentCoords.timestamp;
			return {inRange: inRange, timestamp: timestamp}
		} else {return 'no position data'}
	} else {return 'please use deg-dec coordinates'}
}

var connect = function(hardware) {
	return new GPS(hardware);
}

module.exports.connect = connect;
module.exports.GPS = GPS;
