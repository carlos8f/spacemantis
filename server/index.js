var express = require('express'),
    app = require('../app'),
    io = require('socket.io').listen(app);

var clients = {}, obstacles = [];

function newId(length) {
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  var str = '';
  for (var i = 0; i < length; i++) {
    var rnum = Math.floor(Math.random() * chars.length);
    str += chars.substring(rnum, rnum+1);
  }
  return str;
};

function emitSnapshot() {
  // Generate snapshot.
  var snapshot = [];
  for (var i in clients) {
    snapshot.push({id: clients[i].id, state: clients[i].state});
    if (clients[i].state.d == 1) {
      delete clients[i];
    }
  }

  io.sockets.emit('snapshot', snapshot);
};

function generateObstacles() {
  var clearArea = 50, x, y, z, w, h, d = 6;
  var num = 500;
  for ( var i = 0; i < num; i++) {
    w = Math.round(Math.random() * 10 + 2);
    h = Math.round(Math.random() * 10 + 2);

    x = Math.round(( Math.random() - 0.5 ) * 500);
    y = Math.round(( Math.random() - 0.5 ) * 500);
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

io.sockets.on('connection', function (socket) {
  var id = newId(4);
  socket.emit('join', {id: id, obstacles: obstacles});
  socket.cid = id;
  var client = {
    id: id,
    socket: socket,
    state: {
      c: 0x0055ff, // Color
      e: 0, // Engine on
      r: 0, // Rotation (up)
      x: (Math.random() - 0.5) * 100,
      y: (Math.random() - 0.5) * 100,
      d: 0, // Destroyed?
      m: 2.0, // Ship masse
      rs: 0.1, // Rotation speed
      vx: 0, // Velocity X
      vy: 1 // Velocity Y
    }
  };
  clients[id] = client;
  socket.on('move', function(state) {
    // TODO: check game rules to ensure a valid move.
    client.state = state;
    emitSnapshot();
  });
  socket.on('disconnect', function() {
    clients[socket.cid].state.d = 1;
    emitSnapshot();
  });
  emitSnapshot();
});

generateObstacles();
