var express = require('express'),
    app = require('../app'),
    io = require('socket.io').listen(app),
    _ = require('underscore');

var clients = {}, obstacles = [], lastWorldSnapshot = {};

function newId(length) {
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  var str = '';
  for (var i = 0; i < length; i++) {
    var rnum = Math.floor(Math.random() * chars.length);
    str += chars.substring(rnum, rnum+1);
  }
  return clients.hasOwnProperty(str) ? newId(length) : str;
}

function generateObstacles() {
  var clearArea = 50, x, y, z, w, h, d = 6;
  var num = 500;
  for (var i = 0; i < num; i++) {
    w = Math.round(Math.random() * 10 + 2);
    h = Math.round(Math.random() * 10 + 2);

    x = Math.round((Math.random() - 0.5) * 500);
    y = Math.round((Math.random() - 0.5) * 500);
    z = (d/2) - 3;

    if (x < clearArea && x > -clearArea) {
      i--;
      continue;
    }
    if (y < clearArea && y > -clearArea) {
      i--;
      continue;
    }
    obstacles.push({x: x, y: y, z: z, w: w, h: h, d: d, c: 0x5555ff});
  }
}

function newClient(id) {
  return {
    id: id,
    c: 0x0055ff, // Color
    m: 2.0, // Ship mass
    rs: 0.1, // Rotation speed
    state: {
      e: 0, // Engine on/direction
      r: 0, // Rotation
      x: (Math.random() - 0.5) * 100, // Position X
      y: (Math.random() - 0.5) * 100, // Position Y
      d: 0, // Destroyed?
      vx: 0, // Velocity X
      vy: 1 // Velocity Y
    }
  };
}

io.sockets.on('connection', function (socket) {
  var id = newId(4);
  var client = clients[id] = newClient(id);

  socket.on('move', function(state) {
    // TODO: check game rules to ensure a valid move.
    client.state = state;
  });
  socket.on('disconnect', function() {
    delete clients[id];
    // Broadcast disconnect
    socket.broadcast.emit('leave', id);
  });
  // Send initial data to client: world obstacles and complete client snapshots.
  socket.emit('init', {id: id, clients: clients, obstacles: obstacles});
  // Broadcast connect
  socket.broadcast.emit('join', client);
});

function updateClients() {
  setTimeout(updateClients, 100);
  var snapshot = {};
  var anyChange = false;
  for (var id in clients) {
    var clientState = clients[id].state;
    var delta = {};
    if (lastWorldSnapshot.hasOwnProperty(id)) {
      // Compute delta state.
      var lastClientState = lastWorldSnapshot[id];
      var changed = false;
      for (var prop in clientState) {
	if (clientState[prop] != lastClientState[prop]) {
	  delta[prop] = clientState[prop];
	  changed = true;
	}
      }
      if (changed) {
	snapshot[id] = delta;
	anyChange = true;
      }
    }
    else {
      // No previous snapshot of this client, send the whole state.
      snapshot[id] = _.extend(delta, clientState);
      anyChange = true;
    }
    lastWorldSnapshot[id] = _.extend({}, clientState);
  }
  if (anyChange) {
    io.sockets.emit('snapshot', snapshot);
  }
}

generateObstacles();
updateClients();
