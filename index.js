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
var Packetizer = require('./lib/packetizer');

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
  self.format = 'deg-min-dec';
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
    var dec = lon.indexOf('.');
    var latDeg = parseFloat(lat.slice(0, dec-2));
    var latMin = parseFloat(lat.slice(dec-2, lat.length));
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

// Toggle the power pin of the A2235-H (attached to hardware.gpio[3]). Assumes the module knows what power state it is in.
GPS.prototype._power = function (state, callback) {
  /*
  Args
    state
      'on' - turn the power on
      'off' - turn the power off
    callback
      Callback function
  */
  //  We need to switch from this state to the given state
  var switchState = (state === 'on' ? 'off' : 'on');
  var self = this;

  //  Pull power high
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
      //  Pull power low
      if (self.powerState === switchState) {
        //  Set a timeout for it to have time to turn on and start sending
        setTimeout(callback, 500);
      }
    }, 250);
  } else if (callback) {
    callback();
  }
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

// Turns the GPS chip off
GPS.prototype.powerOff = function (callback) {
  /*
  Try to turn the power off. Note that the A2235-H responds to a pulse, not the
  state of the power pin (it toggles).

  Arg
    callback
      Callback function; arg: err
  */
  var self = this;
  self._power('off', function () {
    setImmediate(function () {
      self.emit('powerOff');
    });
    if (callback) {
      callback();
    }
  });
};

// Turns the GPS chip on
GPS.prototype.powerOn = function (callback) {
  /*
  Try to turn the power on. Note that the A2235-H responds to a pulse, not the
  state of the power pin (it toggles).

  Arg
    callback
      Callback function; arg: err
  */
  var self = this;
  self._power('on', function () {
    setImmediate(function () {
      self.emit('powerOn');
    });
    if (callback) {
      callback();
    }
  });
};

// Configure how the module reports latitude and longitude: options are 'deg-min-sec', 'deg-min-dec', and 'deg-dec'
GPS.prototype.setCoordinateFormat = function (format, callback) {
  /*
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
    //  if at some point we want to go through this pain: http://www.uwgb.edu/dutchs/usefuldata/utmformulas.htm
    console.warn('UTM not currently supported. Voice your outrage to @selkeymoonbeam.');
  } else if (format != 'deg-min-sec' || format != 'deg-dec' ||
    format != 'deg-min-dec') {
    this.format = null;
    console.warn('Invalid format. Must be \'deg-min-sec\', \'deg-dec\', or \'deg-min-dec\'');
  } else {
    this.format = format;
  }

  if (callback) {
    callback();
  }
};

function use (hardware) {
  return new GPS(hardware);
}

exports.use = use;
exports.GPS = GPS;
