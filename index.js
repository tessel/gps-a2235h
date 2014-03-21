var tessel = require('tessel');

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var nmea = require('nmea');
var Packetizer = require('./lib/packetizer');

var DEBUG = true;

var GPS = function (hardware, callback) {
  //set this.types for each type
  //type: fix, nav-info, 2waypoint, autopilot-b
  this.hardware = hardware;
  this.onOff = this.hardware.gpio(3);
  this.powerState = 'off';
  this.timeoutDuration = 10*1000;
  this.format = 'deg-min-dec';
  this.numSats = 0;

  // Turn the module on
  this.initialPowerSequence(function(err) {
    if (!err) {
      // Once we are on, emit the connected event
      this.beginDecoding(function() {

        this.on('fix', this.onFix.bind(this));

        this.on('coordinates', function() {
          console.log("Why can't I pick it up externally?");
        })

        setImmediate(function() {
          this.emit('ready');
        }.bind(this));

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
    // If the leading byte is the header bit
    // Remove this listener
    self.removeListener('data', waitForValidData);

    clearTimeout(noReceiveTimeout);

    // And note that we are on
    self.powerState = 'on';

    self.uartExchange(callback);
  }

  function noDataRecieved() {
    // Remove the listener for any data
    self.removeListener('data', waitForValidData);
    // Clear the timeout 
    clearTimeout(noReceiveTimeout);
    // Call the callback
    callback && callback(new Error("Unable to connect to module..."));
  }

  /*
  Wait for a second to see if we get data. If we do, call callback;
  If we don't, toggle power and set timeout again
  If we still don't get it, something bigger is wrong
  */

  // This event listener will wait for valid data to note that we are on
  this.uart.once('data', waitForValidData);

  // Set the timeout to try to turn on if not already
  noReceiveTimeout = setTimeout(function alreadyOn() {
    // Try to turn on
    this.powerOn(function() {
      // If it's still not on
      if (DEBUG) console.log("state after power cycle:", this.powerState);
      if (this.powerState === 'off') {
        // Set the timeout once more
        if (DEBUG) console.log("Trying once more...");
        noReceiveTimeout = setTimeout(function() {
          // If we still didn't get anything, fail the connect
          noDataRecieved();
        }, 1000);
      }
    }.bind(this));
  }.bind(this), 1000);

}

// Try to turn the power on.
// The GPS holds toggle state but we can't sometimes we
// may have to toggle power twice. 
GPS.prototype.powerOn = function (callback) {
  this.power('on', function() {
    setImmediate(function() {
      this.emit('powerOn');
    }.bind(this))
    callback && callback();
  }.bind(this));
}

GPS.prototype.powerOff = function (callback) {
  this.power('off', function() {
    setImmediate(function() {
      this.emit('powerOff');
    }.bind(this))
    callback && callback();
  }.bind(this));
}

GPS.prototype.power = function(state, callback) {
  // We should switch from this state to passed in state
  var switchState = (state === 'on' ? 'off' : 'on');
  var self = this;

  // Pull power high
  if (this.powerState === switchState) {
    if (DEBUG) console.log("high");
    self.onOff.output().high();
    setTimeout(function backLow() {
      if (DEBUG) console.log("low");
      self.onOff.low();
      // Pull power low
      if (this.powerState === switchState) {
        // Set a timeout for it to have time to turn on and start sending
        setTimeout(callback, 500);
      }
    }.bind(this), 250);

  }
  else {
    callback && callback();
  }
}

// Eventually replace this with stream packetizing... sorry Kolker
GPS.prototype.beginDecoding = function(callback) {

  // Initializer our packetizer
  var packetizer = new Packetizer(this.uart);
  // Tell it to start packetizing
  packetizer.packetize();
  // When we get a packet
  packetizer.on('packet', function(packet) {
    if (DEBUG) console.log("Got packet.");
    // Make sure this is a valid packet
    if (packet[0] === '$') {
      // Parse it
      var datum = nmea.parse(packet);

      if (DEBUG) { console.log("Got Data: ", datum);}
      // If sucessful
      if (datum) {
        setImmediate(function() {
          // Emit the type of packet
          this.emit(datum.type, datum);
        }.bind(this));
      }
    }
  }.bind(this));

  callback && callback();
}

GPS.prototype.uartExchange = function (callback) {
  //Configure GPS baud rate to NMEA
  var characters = new Buffer([0xA0, 0xA2, 0x00, 0x18, 0x81, 0x02, 0x01, 0x01, 0x00, 0x01, 0x01, 0x01, 0x05, 0x01, 0x01, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x25, 0x80, 0x01, 0x3A, 0xB0, 0xB3]);

  // Write the message
  this.uart.write(characters);

  //Reset baud rate to talk to Tessel
  this.uart = this.hardware.UART({baudrate : 9600});

  return callback && callback();
}

GPS.prototype.setCoordinateFormat = function(format) {
  this.format = format;
  if (format === 'utm') {
    // if at some point we want to go through this pain: http://www.uwgb.edu/dutchs/usefuldata/utmformulas.htm
    console.warn('UTM not currently supported. Voice your outrage to @selkeymoonbeam.');
    return
  } 
  else if (format != 'deg-min-sec' || format != 'deg-dec' || format != 'deg-min-dec') {
    this.format = null;
    console.warn("Invalid format. Must be 'dig-min-sec', 'deg-dec', or 'deg-min-dec'");
    return
  }
  else {
    this.format = format;
  }
}

GPS.prototype.onFix = function(fix) {
  this.emitNumSatellites(fix);
  this.emitCoordinates(fix);
}

GPS.prototype.emitNumSatellites = function(fix) {
  if (this.numSats === 0 && fix.numSat > 0) {
    setImmediate(function() {
      this.emit('connected', fix.numSat);
    }.bind(this));
  }
  else if (this.numSats > 0 && fix.numSat === 0) {
    setImmediate(function() {
      this.emit('disconnected', fix.numSat);
    }.bind(this));
  }
  this.numSats = fix.numSat;

  setImmediate(function() {
    this.emit('numSatellites', fix.numSat);
  }.bind(this));
}

GPS.prototype.emitCoordinates = function(data) {
  if (this.numSats) {

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

    if (this.format === 'deg-min-sec') {
        latSec = parseFloat(latMin.toString().split('.')[1] * .6);
        latMin = parseInt(latMin.toString().split('.')[0]);

        lonSec = parseFloat(lonMin.toString().split('.')[1] * .6);
        lonMin = parseInt(lonMin.toString().split('.')[0]);

        latitude = [latDeg, latMin, latSec, latPole];
        longitude = [lonDeg, lonMin, lonSec, lonPole];
    } else if (this.format === 'deg-dec') {
        lat = latDeg + (latMin / 60);
        lon = lonDeg + (lonMin / 60);

        latitude = [lat, latPole];
        longitude = [lon, lonPole];
    } else {
        latitude = [latDeg, latMin, latPole];
        longitude = [lonDeg, lonMin, lonPole];
    }
    coordinates = {lat: latitude, lon: longitude, timestamp: parseFloat(data.timestamp)}

    setImmediate(function() {
      this.emit('altitude', {alt: alt, timestamp: parseFloat(data.timestamp)});
    }.bind(this));
  }
}

GPS.prototype.emitAltitude = function(data) {

  if (this.numSas != 0) {

    data.alt = parseInt(data.alt);

    setImmediate(function() {
      this.emit('altitude', {alt: alt, timestamp: parseFloat(data.timestamp)});
    }.bind(this));
  }
}

GPS.prototype.getAttribute = function(attribute, callback) {
  var failTimeout
    , failHandler
    , successHandler;

  successHandler = function(attributeData) {
    clearTimeout(failTimeout);
    callback && callback(null, attributeData);
  }

  failHandler = function() {
    this.removeListener(attribute, successHandler);
    callback && callback(new Error("Timeout Error."));
  }

  this.once(attribute, successHandler);

  failTimeout = setTimeout(failHandler.bind(this), this.timeoutDuration);
}

GPS.prototype.getNumSatellites = function(callback) {
  this.getAttribute('numSatellites', callback);
}

GPS.prototype.getNumSatDependentAttribute = function(attribute, callback) {
  this.getAttribute('numSatellites', function(err, num) {
    if (err) {
      return callback && callback(err);
    }
    else if (num === 0) {
      return callback && callback(new Error("No Satellites available."));
    }
    else {
      this.getAttribute(attribute, callback);
    }
  }.bind(this));
}
GPS.prototype.getCoordinates = function (callback) {
  this.getNumSatDependentAttribute('coordinates', callback);
}

GPS.prototype.getAltitude = function (callback) {
  this.getNumSatDependentAttribute('altitude', callback);
}

// GPS.prototype.geofence = function (minCoordinates, maxCoordinates) {
// 	// takes in coordinates, draws a rectangle from minCoordinates to maxCoordinates
// 	// returns boolean 'inRange' which is true when coordinates are in the rectangle
// 	var buffer = this.cached;
// 	var inRange = false;
// 	if ((minCoordinates.lat.length === 2) && (maxCoordinates.lat.length === 2)) {
// 		if (minCoordinates.lat[1] === 'S') {
// 			minLat = -minCoordinates.lat[0];
// 		} else {minLat = minCoordinates.lat[0]}
// 		if (minCoordinates.lon[1] === 'W') {
// 			minLon = -minCoordinates.lon[0];
// 		} else {minLon = minCoordinates.lon[0]}
// 		if (maxCoordinates.lat[1] === 'S') {
// 			maxLat = -maxCoordinates.lat[0];
// 		} else {maxLat = maxCoordinates.lat[0]}
// 		if (maxCoordinates.lon[1] === 'W') {
// 			maxLon = -maxCoordinates.lon[0];
// 		} else {maxLon = maxCoordinates.lon[0]}

// 		//get current coordinates
// 		currentCoords = this.getCoordinates(this.cached);
// 		if (currentCoords != 'no navigation data in buffer') {
// 			if (currentCoords.lat[1] === 'S') {
// 				currentLat = -currentCoords.lat[0];
// 			} else {currentLat = currentCoords.lat[0]}
// 			if (currentCoords.lon[1] === 'W') {
// 				currentLon = -currentCoords.lon[0];
// 			} else {currentLon = currentCoords.lon[0]}

// 			//compare current coordinates with geofence
// 			if ((currentLat > minLat) && (currentLat < maxLat) && (currentLon > minLon) && (currentLon < maxLon)) {
// 				inRange = true;
// 			} else {inRange = false}
// 			var timestamp = currentCoords.timestamp;
// 			return {inRange: inRange, timestamp: timestamp}
// 		} else {return 'no position data'}
// 	} else {return 'please use deg-dec coordinates'}
// }

var connect = function(hardware) {
	return new GPS(hardware);
}

module.exports.connect = connect;
module.exports.GPS = GPS;
