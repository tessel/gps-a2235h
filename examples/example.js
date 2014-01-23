console.log('arrived')
var tessel = require('tessel');
console.log('tessel ok')
var hardware = tessel.port('b');

console.log('things required')

var gps = require('./index.js').connect(hardware);

console.log('gps acquired')

// gps.turnOn();

// console.log('power on')

// gps.turnOff();

// console.log('power off')

// // VAR S BECAUSE NOTHING EVER WORKS
// var s = [
// "$GPGSA,A,1,,,,,,,,,,,,,,,*1E",
// "$GPGSV,3,1,12,29,75,266,39,05,48,047,,26,43,108,,15,35,157,*78",
// "$GPGSV,3,2,12,21,30,292,,18,21,234,,02,18,093,,25,13,215,*7F",
// "$GPGSV,3,3,12,30,11,308,,16,,333,,12,,191,,07,-4,033,*62",
// "$GPRMC,085542.023,V,,,,,,,041211,,,N*45",
// "$GPGGA,085543.023,,,,,0,00,,,M,0.0,M,,0000*58",
// "$IIBWC,160947,6008.160,N,02454.290,E,162.4,T,154.3,M,001.050,N,DEST*1C",
// "$IIAPB,A,A,0.001,L,N,V,V,154.3,M,DEST,154.3,M,154.2,M*19",
// "$GPGGA,123519,4807.038,N,01131.324,E,1,08,0.9,545.4,M,46.9,M, , *42"
// ];

// for (var i=0; i < s.length; i++) {
//     // gps.data = nmea.parse(s[i]);
//     // console.log(getCoordinates(datum, 'deg-min-sec'));
//     // console.log(getAltitude(datum))
//     // getSpeed(datum)
//     // satellites(datum)
// };