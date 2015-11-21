module.exports.loadPowerFunctions = function(GPS, DEBUG) {
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
      self.emit('power-on');
      if (callback) {
        callback();
      }
    });
  };
}