// Copyright 2014 Technical Machine, Inc. See the COPYRIGHT
// file at the top-level directory of this distribution.
//
// Licensed under the Apache License, Version 2.0 <LICENSE-APACHE or
// http://www.apache.org/licenses/LICENSE-2.0> or the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>, at your
// option. This file may not be copied, modified, or distributed
// except according to those terms.

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var nmea = require('nmea');
var Packetizer = require('./packetizer');
var converter = require('coordinator')
var toUTM = converter('latlong', 'utm');
var defaultUTMZone = 10;

var DEBUG = 0;  //  Set to 1 for debug console logs, 2 for printed NMEA messages

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
  self.hardware = hardware;
  self.onOff = self.hardware.digital[2];
  self.powerState = 'off';
  self.timeoutDuration = 10*1000;
  self.options = {
    format: 'deg-min-dec'
  };
  self.uart = null;
  self.packetizer = null;

  //  Turn the module on
  self._initialPowerSequence(function (err) {
    if (!err) {
      //  Once we are on, emit the connected event
      self._beginParsing(function () {
        self.emit('ready');
      });
    } else {
      self.emit('error', err);
    }
    if (callback) {
      callback();
    }
  });
};

util.inherits(GPS, EventEmitter);

// After making contact with the A2235-H, start parsing its NMEA messages to get information from the GPS satellites
GPS.prototype._beginParsing = function (callback) {
  /*
  Arg
    callback
      Callback function
  */
  var self = this;
  //  Eventually replace this with stream packetizing... sorry Kolker
  //  Initializer our packetizer
  self.packetizer = new Packetizer(self.uart);
  //  Tell it to start packetizing
  self.packetizer.packetize();
  //  When we get a packet
  self.packetizer.on('packet', function (packet) {
    if (DEBUG) {
      console.log('  Packet\t', packet);
    }
    //  Make sure this is a valid packet
    if (packet[0] === '$') {
      //  Parse it
      var datum = nmea.parse(packet);

      if (DEBUG >= 2) {  //  pretty print
        console.log('    Got Data:');
        Object.keys(datum).forEach(function (key) {
          console.log('     ', key, '\n       ', datum[key]);
          });
        console.log();
      }
      // If sucessful, emit the parsed NMEA object by its type
      if (datum) {
        //  Emit the packet by its type
        self.emit(datum.type, datum);
        //  Emit coordinates
        self._emitCoordinates(datum);
        //  Ditto for altitude
        self._emitAltitude(datum);
      }
    }
  });

  if (callback) {
    callback();
  }
};

// Format and emit altitude reading as {altitude in meters, timestamp}
GPS.prototype._emitAltitude = function (parsed) {
  /*
  Arg
    parsed
      The output of nmea.parse(): an object containing the parsed NEMA message
  */
  var self = this;
  if (parsed.alt !== undefined) {

    parsed.alt = parseInt(parsed.alt);

    setImmediate(function () {
      self.emit('altitude', {alt: parsed.alt,
        timestamp: parseFloat(parsed.timestamp)});
    });
  }
};

// Format and emit coordinates as {latitude, longitude, timestamp}
GPS.prototype._emitCoordinates = function (parsed) {
  /*
  Arg
    parsed
      The output of nmea.parse(): an object containing the parsed NEMA message
  */
  var self = this;
  if (parsed.latPole !== '' && parsed.lonPole !== '' &&
    parsed.lon !== undefined && parsed.lat !== undefined) {
    var latPole = parsed.latPole;
    var lonPole = parsed.lonPole;
    var lat = parsed.lat;
    var lon = parsed.lon;
    var decLat = lat.indexOf('.');
    var decLon = lon.indexOf('.');
    var latDeg = parseFloat(lat.slice(0, decLat-2));
    var latMin = parseFloat(lat.slice(decLat-2, lat.length));
    var lonDeg = parseFloat(lon.slice(0, decLon-2));
    var lonMin = parseFloat(lon.slice(decLon-2, lon.length));
    var longitude;
    var latitude;
    var latSec;
    var lonSec;

    if (self.options.format === 'deg-min-sec') {
      latSec = parseFloat(latMin.toString().split('.')[1] * 0.6);
      latMin = parseInt(latMin.toString().split('.')[0]);

      lonSec = parseFloat(lonMin.toString().split('.')[1] * 0.6);
      lonMin = parseInt(lonMin.toString().split('.')[0]);

      latitude = [latDeg, latMin, latSec, latPole];
      longitude = [lonDeg, lonMin, lonSec, lonPole];
    } else if (self.options.format === 'deg-dec') {
      lat = latDeg + (latMin / 60);
      lon = lonDeg + (lonMin / 60);

      latitude = [lat, latPole];
      longitude = [lon, lonPole];
    } else if (self.options.format === 'utm') {
      // Convert to degree notation
      lat = latDeg + (latMin / 60);
      lon = lonDeg + (lonMin / 60);

      // Negate if we're in the southern hemisphere
      // for compatibility with coordinator lib
      if (latPole === 'S') {
        lat = -lat;
      }

      // Negate if we're in the western hemisphere
      // for compatibility with coordinator lib
      if (lonPole === 'W') {
        lon = -lon;
      }

      // Convert to UTM
      utm = toUTM(lat, lon, self.options.zone);

      latitude = utm.northing;
      longitude = utm.easting;
    } else {
      latitude = [latDeg, latMin, latPole];
      longitude = [lonDeg, lonMin, lonPole];
    }
    var coordinates = {lat: latitude, lon: longitude,
      timestamp: parseFloat(parsed.timestamp)};

    setImmediate(function () {
      self.emit('coordinates', coordinates);
    });
  }
};

GPS.prototype._initialPowerSequence = function (callback) {
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
    self.uart.removeListener('data', waitForData);

    clearTimeout(noReceiveTimeout);

    //  And note that we are on
    self.powerState = 'on';

    //  Tell the A2235-H that we want it to give us NMEA strings over UART
    self._switchToNMEA9800(callback);
  }

  function noDataRecieved () {
    //  Remove the listener for any data
    self.uart.removeListener('data', waitForData);
    //  Clear the timeout
    clearTimeout(noReceiveTimeout);
    //  Call the callback
    if (callback) {
      callback(new Error('Unable to connect to module...'));
    }
  }

  /*
  Wait for a second to see if we get data. If we do, call callback;
  If we don't, toggle power and set timeout again
  If we still don't get it, something bigger is wrong
  */

  //  This event listener will wait for valid data to note that we are on
  self.uart.once('data', function (data) {
    waitForData(data);
  });

  //  Set the timeout to try to turn on if not already
  noReceiveTimeout = setTimeout(function alreadyOn() {
    //  Try to turn on
    self.powerOn(function () {
      //  If it's still not on
      if (DEBUG) {
        console.log('state after power cycle:', self.powerState);
      }
      if (self.powerState === 'off') {
        //  Set the timeout once more
        if (DEBUG) {
          console.log('Trying once more...');
        }
        noReceiveTimeout = setTimeout(function () {
          //  If we still didn't get anything, fail the connect
          noDataRecieved();
        }, 1000);
      }
    });
  }, 1000);
};


GPS.prototype._switchToNMEA9800 = function (callback) {
  /*
  The A2235-H has been configured in hardware to use UART, but we need to send
  it this command so that it gives us NMEA messages as opposed to SiRF binary.

  Arg
    callback
      Callback function
  */
  //  Configure GPS baud rate to 9600, talk in NMEA
  var characters = new Buffer([0xA0, 0xA2, 0x00, 0x18, 0x81, 0x02, 0x01, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x05, 0x01, 0x01, 0x01, 0x00, 0x01, 0x00, 0x01,
    0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x25, 0x80, 0x01, 0x3A, 0xB0, 0xB3]);

  //  Write the message
  this.uart.write(characters);

  //  Reset UART baud rate
  this.uart = this.hardware.UART({baudrate : 9600});

  if (callback) {
    callback();
  }
};

// Configure how the module reports latitude and longitude: options are 'deg-min-sec', 'deg-min-dec', and 'deg-dec'
GPS.prototype.setCoordinateFormat = function (options, callback) {
  /*
  Arg
    options.format
      'deg-min-sec' - Degrees + minutes + seconds
      'deg-dec' - Degrees and fractions thereof, as a decimal
      'deg-min-dec' - Degrees + minutes and fractions thereof, as a decimal
      'utm' - Report coordinates in the  Universal Transverse Mercator
        coordinate system.
    options.zone
      NUM - the zone used in UTM calculations
  */

  // Sanitize Input
  // Old style of passing in format as string
  if (typeof options === 'string') {
    // Save the requested format
    var formatString = options;
    // Create a new set of options
    options = {};
    // Set format as a property
    options.format = formatString;
    // Warn for now
    console.warn("Argument style deprecated, please pass in an object (see docs)");
  }
  // Callback only passed in
  else if (typeof options !== 'object') {
    self.emit('error', 'Invalid options for coordinate format');
    return;
  }

  var err;
  // If this is a UTM format
  if (options.format === 'utm') {
    console.log('setting itm format', options.format)
    // Set the format itself
    this.options = options;

    // If the format zone was not suggested in the options
    if (!this.options.zone) {
      // Set it to a default
      this.options.zone = defaultUTMZone;
    }
  } 
  // If the format is not of the other valid types
  else if (options.format != 'deg-min-sec' && options.format != 'deg-dec' &&
    options.format != 'deg-min-dec') {
    // Set the error var
    err = new Error('Invalid format. Must be \'deg-min-sec\', \'deg-dec\', or \'deg-min-dec\'');
  // Otherwise, set it and continue
  } else {
    this.options = options;
  }

  // If a callback was provided, call it with an error, if any
  if (typeof callback === 'function') {
    return callback(err);
  }
};
// Imports power on/off sequences
var common = require('../common').loadPowerFunctions(GPS, DEBUG);

module.exports = GPS;