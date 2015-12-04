// Copyright 2014 Technical Machine, Inc. See the COPYRIGHT
// file at the top-level directory of this distribution.
//
// Licensed under the Apache License, Version 2.0 <LICENSE-APACHE or
// http://www.apache.org/licenses/LICENSE-2.0> or the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>, at your
// option. This file may not be copied, modified, or distributed
// except according to those terms.

var hw = process.binding('hw');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

exports.debug = 0;  //  Set to 1 for debug console logs, 2 for printed NMEA messages


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
  self.hasFix = false;

  hw.swuart_enable();
  var count = 0;
  
  function isReady(){
    //  Once we are on, emit the connected event
    self.emit('ready');
    self._checkConnection();

    if (exports.debug == 2) {
      console.log("Printing out NEMA messages, this could interrupt ability for GPS lock");
      setInterval(function(){
        var buff = hw.swuart_receive();
        console.log(buff.toString());
      }, 500);    
    }

    if (callback) {
      callback();
    }
  }

  // Turn the module on
  function powerSequence(){
    if (exports.debug) {
      console.log("power sequence", count);
    }
    self.powerOn(function(){
      // send over the gps start cmd
      hw.gps_init();

      setTimeout(function(){
        // check for some uart data
        if (hw.swuart_receive().length > 0) {
          self.powerState = 'on';

          isReady();
        } else {
          self.powerState = 'off';
          // if we can't find any, error out
          count++;
          if (count > 3) {
            self.emit("error", new Error("Could not find GPS module"));
          } else {
            powerSequence();
          }
        }
      }, 1000); // hold for 1s to see if we get any nmea messages
    });
  }

  // check for 1s to see gps is already on nmea setting
  setTimeout(function(){
    if (hw.swuart_receive().length > 0) {
      // we're already in a nmea state
      self.powerState = 'on';
      isReady();
    } else {
      // we're not in a nmea state, do the power cycle
      powerSequence();
    }
  }, 1000);

  // poll every 2 seconds by default, can bump this up but it'll consume more cpu
  var pollTime = 2000;
  self.getPollTime = function () {
    return pollTime;
  };
  self.setPollTime = function (time) {
    time = parseInt(time, 10);
    if (isNaN(time)) {
        time = 2000;
        if (exports.debug) {
            console.log('time must be an integer between 2000 and 60000');
        }
    }
    if (time < 2000) {
        // No less than 2 seconds
        if (exports.debug) {
          console.log("time must be at least 2000ms (2s)");
        }
        time = 2000;
    } else if (time > 60000) {
        // No more than 60 seconds
        if (exports.debug) {
          console.log("time must not be greater than 60000ms (60s)");
        }
        time = 60000;
    }
    pollTime = time;
    return self;
  };
};

util.inherits(GPS, EventEmitter);


GPS.prototype._checkConnection = function(){
  var self = this;
  // poll for connections
  setTimeout(function(){
    if (hw.gps_get_fix()){
      self.hasFix = true;
      self.emit('coordinates', {
        lat: hw.gps_get_latitude(),
        lon: hw.gps_get_longitude(),
        speed: hw.gps_get_speed(),
        timestamp: hw.gps_get_time(),
        datestamp: hw.gps_get_date()
      });
      self.emit('altitude', {
        alt: hw.gps_get_altitude(),
        timestamp: hw.gps_get_time(),
        datestamp: hw.gps_get_date()
      });
      self.emit('fix', {
        numSat: hw.gps_get_satellites()
      });
    } else {
      if (self.hasFix) {
        // we had a fix but we dropped it
        // reduce usage on the mcu so we emit less noise
        self.emit('dropped');
      }
      self.hasFix = false;
    }

    self._checkConnection();
  }, self.getPollTime());
}

// Imports power on/off sequences
var common = require('../common').loadPowerFunctions(GPS, exports.debug);

module.exports = GPS;