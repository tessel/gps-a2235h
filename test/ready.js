/**********************************************************
This gps example logs a stream of data:
coordinates, detected satellites, timestamps, and altitude.
For best results, try it while outdoors.
**********************************************************/

// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

var tessel = require('tessel');

var port = process.argv[2] || 'C';
var gps = require('../').use(tessel.port[port]);

console.log('# testing on port', port);
console.log('1..1');

gps.on('ready', function () {
  console.log('ok - gps is ready and connected');
  process.exit(0);
});
