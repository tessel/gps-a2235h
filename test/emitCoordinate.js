var tessel = require('tessel');
var t1;
var port;

if (tessel.port['C']) {
  t1 = true
  port = 'C';
}
else {
  t1 = false;
  port = 'A';
}

var gps = require('../').use(tessel.port[port]);
var exitStatus = 0;

console.log('# testing on port', port);
// T1 doesn't expose the function to emit coordinates
if (t1) {
  console.log('1..1');
  console.log('ok - T1 does not need this test');
  process.exit(0);
}
else {
  console.log('1..2');

  var NMEAEmitSim = { 
    sentence: 'RMC',
    type: 'nav-info',
    timestamp: '191742.339',
    status: 'valid',
    lat: '4747.9760', // Notice how the lat coord has the decimal at a different index
    latPole: 'N',
    lon: '12205.0757',
    lonPole: 'W',
    speedKnots: 1.33,
    trackTrue: 29.17,
    date: '251115',
    variation: 0,
    variationPole: '',
    talker_id: 'GP'
  }

  gps.once('coordinate', function(coordinate) {
    console.log('got htese', coordinate);
    if (coordinate.latitude != 47) {
      console.log('not ok - incorrect latitude parsed.');
    }
    else {
      console.log('ok - latitude parsed correctly.');
    }

    if (coordinate.latitude != 47) {
      console.log('not ok - incorrect longitude parsed.');
    }
    else {
      console.log('ok - longitude parsed correctly.');
    }
  });
  console.log('emitting coorded')
  gps._emitCoordinates(NMEAEmitSim);
}

