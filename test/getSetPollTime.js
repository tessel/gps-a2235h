
var tessel = require('tessel');

var port = process.argv[2] || 'C';
var gps = require('../').use(tessel.port[port]);
var exitStatus = 0;

console.log('# testing on port', port);
console.log('1..9');

// Test default setting
if (gps.getPollTime() !== 2000) {
    console.log('not ok - expecting default poll time to be 2000, the value is', gps.getPollTime());
    exitStatus = 1;
} else {
    console.log('ok - default poll time is 2000');
}

// Test set to a value
gps.setPollTime(4473);
if (gps.getPollTime() !== 4473) {
    console.log('not ok - expecting poll time to be 4473, the value is', gps.getPollTime());
    exitStatus = 1;
} else {
    console.log('ok - poll time is 4473 after being set to 4473');
}

// Test minimum value
gps.setPollTime(1999);
if (gps.getPollTime() !== 2000) {
    console.log('not ok - expecting minimum poll time to be 2000, the value is', gps.getPollTime());
    exitStatus = 1;
} else {
    console.log('ok - poll time is 2000 after being set to 1999');
}
gps.setPollTime(55);
if (gps.getPollTime() !== 2000) {
    console.log('not ok - expecting minimum poll time to be 2000, the value is', gps.getPollTime());
    exitStatus = 1;
} else {
    console.log('ok - poll time is 2000 after being set to 55');
}

// Test maximum value
gps.setPollTime(60001);
if (gps.getPollTime() !== 60000) {
    console.log('not ok - expecting maximum poll time to be 60000, the value is', gps.getPollTime());
    exitStatus = 1;
} else {
    console.log('ok - poll time is 60000 after being set to 60001');
}
gps.setPollTime(8899983);
if (gps.getPollTime() !== 60000) {
    console.log('not ok - expecting maximum poll time to be 60000, the value is', gps.getPollTime());
    exitStatus = 1;
} else {
    console.log('ok - poll time is 60000 after being set to 8899983');
}

// Test invalid values
gps.setPollTime("testing");
if (gps.getPollTime() !== 2000) {
    console.log('not ok - expecting fallback poll time to be 2000, the value is', gps.getPollTime());
    exitStatus = 1;
} else {
    console.log('ok - poll time is 2000 after being set to testing');
}
gps.setPollTime({time: 4000});
if (gps.getPollTime() !== 2000) {
    console.log('not ok - expecting fallback poll time to be 2000, the value is', gps.getPollTime());
    exitStatus = 1;
} else {
    console.log('ok - poll time is 2000 after being set to testing');
}
gps.setPollTime(function () { return 4000;});
if (gps.getPollTime() !== 2000) {
    console.log('not ok - expecting fallback poll time to be 2000, the value is', gps.getPollTime());
    exitStatus = 1;
} else {
    console.log('ok - poll time is 2000 after being set to testing');
}

process.exit(0);

