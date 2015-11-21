var os = require('os');

function use (hardware) {
  var GPS;
  // If we're running Linux, this is T2
  if (os.platform() === 'linux') {
    // Import the T2 driver (doesn't have a binary dep)
    GPS = require('./lib/tessel_2/driver');
  }
  // Otherwise, use the T1 driver
  else {
    GPS = require('./lib/tessel_1/driver');
  }

  return new GPS(hardware);
}

exports.use = use;
