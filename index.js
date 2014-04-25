var util = require('util');
var EventEmitter = require('events').EventEmitter;
var nmea = require('nmea');
var Packetizer = require('./lib/packetizer');

var DEBUG = true;

var GPS = function (hardware, callback) {
  /*
  Constructor

  Args
    hardware
      The Tessel port to use
    callback
      Callback function
  */
  var self = this;
  //set this.types for each type
  //type: fix, nav-info, 2waypoint, autopilot-b
  this.hardware = hardware;
  this.onOff = this.hardware.gpio(3);
  this.powerState = 'off';
  this.timeoutDuration = 10*1000;
  this.format = 'deg-min-dec';
  this.numSats = 0;

  // Turn the module on
  self.initialPowerSequence(function(err) {
    if (!err) {
      // Once we are on, emit the connected event
      self.beginDecoding(function() {

        self.on('fix', self.onFix);

        self.on('coordinates', function() {
          console.log('Why can\'t I pick it up externally?');
        });

        setImmediate(function() {
          self.emit('ready');
          if (callback) {
            callback();
          }
        });
      });
    } else {
      setImmediate(function() {
        self.emit('error', err);
      });
    }
  });
};

util.inherits(GPS, EventEmitter);

GPS.prototype.initialPowerSequence = function (callback) {
  /*
  Turn on and establish contact with the A2235-H GPS module 

  Arg
    callback
      Callback function; arg: err
  */
  var self = this;
  //  Tell Tessel to start UART at GPS baud rate
  this.uart = this.hardware.UART({baudrate : 115200});

  var noReceiveTimeout;

  function waitForData () {
    //  Remove this listener when we hear something (anything) from the GPS
    self.removeListener('data', waitForData);

    clearTimeout(noReceiveTimeout);

    //  And note that we are on
    self.powerState = 'on';

    //  Tell the A2235-H that we want it to give us NMEA strings over UART
    self.uartExchange(callback);
  }

  function noDataRecieved () {
    // Remove the listener for any data
    self.removeListener('data', waitForData);
    // Clear the timeout 
    clearTimeout(noReceiveTimeout);
    // Call the callback
    if (callback) {
      callback(new Error('Unable to connect to module...'));
    }
  }

  /*
  Wait for a second to see if we get data. If we do, call callback;
  If we don't, toggle power and set timeout again
  If we still don't get it, something bigger is wrong
  */

  // This event listener will wait for valid data to note that we are on
  self.uart.once('data', function(data) {
    waitForData(data);
  });

  // Set the timeout to try to turn on if not already
  noReceiveTimeout = setTimeout(function alreadyOn() {
    // Try to turn on
    self.powerOn(function() {
      // If it's still not on
      if (DEBUG) {
        console.log('state after power cycle:', self.powerState);
      }
      if (self.powerState === 'off') {
        // Set the timeout once more
        if (DEBUG) {
          console.log('Trying once more...');
        }
        noReceiveTimeout = setTimeout(function() {
          // If we still didn't get anything, fail the connect
          noDataRecieved();
        }, 1000);
      }
    });
  }, 1000);
};

GPS.prototype.powerOn = function (callback) {
  /*
  Try to turn the power on. Note that the A2235-H responds to a pulse, not the
  state of the power pin (it toggles).

  Arg
    callback
      Callback function; arg: err
  */
  var self = this;
  self.power('on', function() {
    setImmediate(function() {
      self.emit('powerOn');
    });
    if (callback) {
      callback();
    }
  });
};

GPS.prototype.powerOff = function (callback) {
  /*
  Try to turn the power off. Note that the A2235-H responds to a pulse, not the
  state of the power pin (it toggles).

  Arg
    callback
      Callback function; arg: err
  */
  var self = this;
  self.power('off', function() {
    setImmediate(function() {
      self.emit('powerOff');
    });
    if (callback) {
      callback();
    }
  });
};

GPS.prototype.power = function(state, callback) {
  /*
  Toggle the power pin of the A2235-H (attached to hardware.gpio[3]). Assumes
  the module knows what power state it is in.

  Args
    state
      'on' - turn the power on
      'off' - turn the power off
    callback
      Callback function
  */
  // We need to switch from this state to the given state
  var switchState = (state === 'on' ? 'off' : 'on');
  var self = this;

  // Pull power high
  if (self.powerState === switchState) {
    if (DEBUG) {
      console.log('high');
    }
    self.onOff.output().high();
    setTimeout(function backLow() {
      if (DEBUG) {
        console.log('low');
      }
      self.onOff.low();
      // Pull power low
      if (self.powerState === switchState) {
        // Set a timeout for it to have time to turn on and start sending
        setTimeout(callback, 500);
      }
    }, 250);
  } else if (callback) {
    callback();
  }
};

GPS.prototype.beginDecoding = function(callback) {
  /*
  After making contact with the A2235-H, start decoging its NMEA messages to
  get information from the GPS satellites

  Arg
    callback
      Callback function
  */
  var self = this;
  // Eventually replace this with stream packetizing... sorry Kolker
  // Initializer our packetizer
  var packetizer = new Packetizer(this.uart);
  // Tell it to start packetizing
  packetizer.packetize();
  // When we get a packet
  packetizer.on('packet', function(packet) {
    if (DEBUG) {
      console.log('  Packet\t', packet);
    }
    // Make sure this is a valid packet
    if (packet[0] === '$') {
      // Parse it
      var datum = nmea.parse(packet);

      if (DEBUG) {  //  pretty print
        console.log('    Got Data:');
        Object.keys(datum).forEach(function (key) {
          console.log('     ', key, '\n       ', datum[key]);
          });
        console.log();
      }
      // If sucessful, emit the parsed NMEA object by its type
      if (datum) {
        setImmediate(function() {
          // Emit the type of packet
          self.emit(datum.type, datum);
        });
      }
    }
  });

  if (callback) { 
    callback();
  }
};

GPS.prototype.uartExchange = function (callback) {
  /*
  The A2235-H has been configured in hardware to use UART, but we need to send 
  it this command so that it gives us NMEA messages as opposed to SiRF binary.

  Arg
    callback
      Callback function
  */
  //Configure GPS baud rate to 9600, talk in NMEA 
  var characters = new Buffer([0xA0, 0xA2, 0x00, 0x18, 0x81, 0x02, 0x01, 0x01, 0x00, 0x01, 0x01, 0x01, 0x05, 0x01, 0x01, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x25, 0x80, 0x01, 0x3A, 0xB0, 0xB3]);

  // Write the message
  this.uart.write(characters);

  // Reset UART baud rate
  this.uart = this.hardware.UART({baudrate : 9600});

  if (callback) {
    callback();
  }
};

GPS.prototype.setCoordinateFormat = function(format) {
  /*
  Configure how the module reports latitude and longitude

  Arg
    format
      'deg-min-sec' - Degrees + minutes + seconds
      'deg-dec' - Degrees and fractions thereof, as a decimal
      'deg-min-dec' - Degrees + minutes and fractions thereof, as a decimal
      'utm' - Report coordinates in the  Universal Transverse Mercator
        coordinate system. Not currently supported.
  */  
  this.format = format;
  if (format === 'utm') {
    // if at some point we want to go through this pain: http://www.uwgb.edu/dutchs/usefuldata/utmformulas.htm
    console.warn('UTM not currently supported. Voice your outrage to @selkeymoonbeam.');
  } else if (format != 'deg-min-sec' || format != 'deg-dec' || format != 'deg-min-dec') {
    this.format = null;
    console.warn('Invalid format. Must be \'dig-min-sec\', \'deg-dec\', or \'deg-min-dec\'');
  } else {
    this.format = format;
  }
};

GPS.prototype.onFix = function(fix) {
  /*
  Called when we get a NMEA message which indicates that the GPS has a 3D fix 
  on its position.

  Arg
    fix
      The output of nmea.parse(): an object containing the parsed NEMA message
  */
  this.emitNumSatellites(fix);
  this.emitCoordinates(fix);
};

GPS.prototype.emitNumSatellites = function(fix) {
  /*
  List the satellites the module can see

  Arg
    fix
      The output of nmea.parse(): an object containing the parsed NEMA message
  */
  var self = this;
  if (self.numSats === 0 && fix.numSat > 0) {
    setImmediate(function() {
      self.emit('connected', fix.numSat);
    });
  } else if (self.numSats > 0 && fix.numSat === 0) {
    setImmediate(function() {
      self.emit('disconnected', fix.numSat);
    });
  }
  self.numSats = fix.numSat;

  setImmediate(function() {
    self.emit('numSatellites', fix.numSat);
  });
};

GPS.prototype.emitCoordinates = function(fix) {
  /*
  Format and emit the coordinates in fix
  
  Arg
    fix
      The output of nmea.parse(): an object containing the parsed NEMA message
  */
  var self = this;
  if (self.numSats) {
    var latPole = fix.latPole;
    var lonPole = fix.lonPole;
    var lat = fix.lat;
    var lon = fix.lon;
    var dec = lat.indexOf('.');
    var latDeg = parseFloat(lat.slice(0, dec-2));
    var latMin = parseFloat(lat.slice(dec-2, lat.length));
    dec = lon.indexOf('.');
    var lonDeg = parseFloat(lon.slice(0, dec-2));
    var lonMin = parseFloat(lon.slice(dec-2, lon.length));
    var longitude;
    var latitude;
    var latSec;
    var lonSec;

    if (self.format === 'deg-min-sec') {
      latSec = parseFloat(latMin.toString().split('.')[1] * 0.6);
      latMin = parseInt(latMin.toString().split('.')[0]);

      lonSec = parseFloat(lonMin.toString().split('.')[1] * 0.6);
      lonMin = parseInt(lonMin.toString().split('.')[0]);

      latitude = [latDeg, latMin, latSec, latPole];
      longitude = [lonDeg, lonMin, lonSec, lonPole];
    } else if (self.format === 'deg-dec') {
      lat = latDeg + (latMin / 60);
      lon = lonDeg + (lonMin / 60);

      latitude = [lat, latPole];
      longitude = [lon, lonPole];
    } else {
      latitude = [latDeg, latMin, latPole];
      longitude = [lonDeg, lonMin, lonPole];
    }
    var coordinates = {lat: latitude, lon: longitude, timestamp: parseFloat(fix.timestamp)};

    setImmediate(function() {
      self.emit('altitude', {alt: fix.alt, timestamp: parseFloat(fix.timestamp)});
      self.emit('coordinates', coordinates);
    });
  }
};

GPS.prototype.emitAltitude = function(fix) {
  /*
  Emit the altitude in the given fix

  Arg
    fix
      The output of nmea.parse(): an object containing the parsed NEMA message
  */
  var self = this;
  if (self.numSas !== 0) {

    fix.alt = parseInt(fix.alt);

    setImmediate(function() {
      self.emit('altitude', {alt: fix.alt, timestamp: parseFloat(fix.timestamp)});
    });
  }
};

GPS.prototype.getAttribute = function(attribute, callback) {
  /*
  Extract a specific attribute from incoming NMEA data and call the given 
  callback with the value

  Args
    attribute
      The key for a value in the parsed NMEA object. See documentation for the 
        nmea module on npm for a complete list of attributes:
        https://www.npmjs.org/package/nmea
    callback
      Callback function to call for the data in the specific attribute
  */
  var self = this;
  var failTimeout;
  var failHandler;
  var successHandler;

  successHandler = function(attributeData) {
    clearTimeout(failTimeout);
    if (callback) {
      callback(null, attributeData);
    }
  };

  failHandler = function() {
    self.removeListener(attribute, successHandler);
    if (callback) {
      callback(new Error('Timeout Error.'));
    }
  };

  self.once(attribute, successHandler);

  failTimeout = setTimeout(failHandler, self.timeoutDuration);
};

GPS.prototype.getNumSatellites = function(callback) {
  //  Pass the number of visible satellites to the callback.
  this.getAttribute('numSatellites', callback);
};

GPS.prototype.getNumSatDependentAttribute = function(attribute, callback) {
  /*
  Check to see if satellites are visible and call the callback if they are

  Args
    attribute
      The attribute to act on if satellites are visible
    callback
      Callback function to call with the given attribute if satellites are 
      visible. Args: err, attributeData
  */
  var self = this;
  self.getAttribute('numSatellites', function(err, num) {
    if (err) {
      if (callback) {
       callback(err);
      }
    } else if (num === 0) {
      if (callback) {
        callback(new Error('No Satellites available.'), 0);
      }
    } else {
      self.getAttribute(attribute, callback);
    }
  });
};

GPS.prototype.getCoordinates = function (callback) {
  //  Pass the coordinates to the callback
  this.getNumSatDependentAttribute('coordinates', callback);
};

GPS.prototype.getAltitude = function (callback) {
  //  Pass the altitude to the callback
  this.getNumSatDependentAttribute('altitude', callback);
};

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
};

module.exports.connect = connect;
module.exports.GPS = GPS;
