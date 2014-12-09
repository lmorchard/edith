var os = require('os');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var csv = require('csv');
var gui = require('nw.gui');

import { greet } from './hello/hello_world';

var DEBUG = true;

var regionName, itemName, minSell, maxBuy, orders;

var handleLogChange = _.debounce(function (filename) {
  var fn = path.join(LOGS_PATH, filename);
  var parser = csv.parse({columns: true}, function (err, data) {
    processNewExport(err, data, filename);
  });
  fs.createReadStream(fn).pipe(parser);
}, 300);

var LOGS_PATH;

if (process.platform == 'win32') {
  LOGS_PATH = getUserHome() + '/Documents/EVE/logs/Marketlogs';
} else {
  LOGS_PATH = '/Users/lmorchard/Library/Application Support/EVE Online/p_drive/User/My Documents/EVE/logs/Marketlogs/';
}

fs.watch(LOGS_PATH, function (event, filename) {
  if ('change' == event) {
    handleLogChange(filename);
  }
});

//if (DEBUG) handleLogChange('Catch-Adaptive Invulnerability Field II-2014.11.30 230738.txt');
if (DEBUG) handleLogChange('Catch-Adaptive Invulnerability Field II-2014.12.02 230340.txt');

function normalizeExportRow (row) {
  row.bid = (row.bid === 'True');
  ['price', 'volRemaining', 'volEntered', 'range',
    'minVolume', 'duration', 'jumps'].forEach(function (name) {
    row[name] = parseFloat(row[name]);
  });
  return row;
}

$('input[name=autoCopy]').click(copyPrice);

function copyPrice () {
  var copyOption = $('input[name=autoCopy]:checked').val();
  var copyVal = (copyOption === 'buy') ?
    (maxBuy + 0.01) : (minSell - 0.01);
  copyVal = parseInt(copyVal * 100) / 100;

  var clipboard = gui.Clipboard.get();
  clipboard.set('' + copyVal);
}

function processNewExport (err, data, filename) {
  var parts = filename.split('-');

  regionName = parts[0];
  itemName = parts[1];

  orders = _.chain(data)
    .map(normalizeExportRow)
    .filter(function (row) { return row.jumps === 0; })
    .groupBy('bid')
    .value();

  minSell = _.reduce(orders[false], function (result, row) {
    return (null === result) ? row.price :
      Math.min(result, row.price);
  }, null);

  maxBuy = _.reduce(orders[true], function (result, row) {
    return Math.max(result, row.price);
  }, 0);

  var revenue = minSell - maxBuy;

  $('#itemName').text(itemName);
  $('#sellPrice').val(minSell);
  $('#buyPrice').val(maxBuy);
  $('#revenue').val(revenue);

  copyPrice();
}

function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

function log (msg) {
  document.getElementById('msgs').value += Date.now() + ': ' + msg + "\n";
}
