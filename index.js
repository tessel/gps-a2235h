var tessel = require('tessel');

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var nmea = require('nmea');

var power = 'off';

var GPS = function (hardware) {
	//set this.types for each type
	//type: fix, nav-info, 2waypoint, autopilot-b
	this.hardware = hardware;
	this.onOff = this.hardware.gpio(3);

	var self = this;

	// Tell Tessel to start UART at GPS baud rate
	this.uart = this.hardware.UART({baudrate : 115200});

	this.uart.on('data', function(bytes) {
		if (power === 'off') {
			power = 'on';
		}
	});

	this.powerOn(function() {
		self.emit('connected');
		self.buffer = {};

		var incoming = new String;
		// All receiving is done over a receive event:
		self.uart.on('data', function(bytes) {
			self.emit('data');
			bytes.forEach(function (line) {
				var currentChar = String.fromCharCode(parseInt(line));
				if (currentChar === '$') {
					self.updateBuffer(incoming);
					incoming = '$'
				} else {
					incoming += currentChar;
				}
			});
		});
	});
}

util.inherits(GPS, EventEmitter);

GPS.prototype.powerOn = function (callback) {
	var self = this;
    //turns on GPS
    setTimeout(function() {
    	if (power == 'off') {
	        self.onOff.output().high();
	        tessel.sleep(250); //should change this out for setTimeout when that works
	        self.onOff.low();
	        tessel.sleep(250);
	        power = 'on';
    	}
    	self.setup(self.hardware)
    	callback && callback();
	}, 1500);
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

GPS.prototype.getCoordinates = function (format) {
    //returns the latest received coordinates of the device and a timestamp
    //format can be "deg-min-sec" (degree, minute, second),
    //                                "deg-min-dec" (degree, minutes in decimal) [default]
    //                                "deg-dec" (degree decimal),
    //                                "utm" (universal transverse mercator) NOT CURRENTLY SUPPORTED
    var buffer = this.buffer;
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
        var buffer = this.buffer;
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
	var buffer = this.buffer;
	if ('fix' in buffer) {
		data = buffer['fix'];
		numSat = data.numSat;
		return {numSat: numSat, timestamp: parseFloat(data.timestamp)};
	} else {return 'no satellite data in buffer'}
}

GPS.prototype.geofence = function (minCoordinates, maxCoordinates) {
	//takes in coordinates, draws a square with width 2x'range'
	// returns boolean 'inRange' which is true when coordinates within square
	var buffer = this.buffer;
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
		currentCoords = this.getCoordinates(this.buffer);
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

GPS.prototype.setup = function () {
	// Tell Tessel to start UART at GPS baud rate
	this.uart = this.hardware.UART({baudrate : 115200});

	//Configure GPS baud rate to NMEA
	var characters = [0xA0, 0xA2, 0x00, 0x18, 0x81, 0x02, 0x01, 0x01, 0x00, 0x01, 0x01, 0x01, 0x05, 0x01, 0x01, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x25, 0x80, 0x01, 0x3A, 0xB0, 0xB3];
	this.uart.write(characters);

	//Reset baud rate to talk to Tessel
	this.uart = this.hardware.UART({baudrate : 9600});
}

GPS.prototype.updateBuffer = function (incoming) {
	var datum = nmea.parse(incoming);
	if (datum != undefined) {
		var type = datum.type.toString();
		//update each type in buffer to latest data
		this.buffer[type] = datum;
	}
}

var connect = function(hardware) {
	var gps = new GPS(hardware);
	return gps;
}

module.exports.connect = connect;
module.exports.GPS = GPS;