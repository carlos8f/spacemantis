var express = require('express'),
    app = require('../app'),
    io = require('socket.io').listen(app);

var clients = {};

var newId = function(length) {
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  var str = '';
  for (var i = 0; i < length; i++) {
    var rnum = Math.floor(Math.random() * chars.length);
    str += chars.substring(rnum, rnum+1);
  }
  return str;
};

var emitSnapshot = function() {
  // Generate snapshot.
  var snapshot = [];
  for (var i in clients) {
    snapshot.push({id: clients[i].id, state: clients[i].state});
    if (clients[i].state.destroyed) {
      delete clients[i];
    }
  }

  io.sockets.emit('snapshot', snapshot);
};

io.sockets.on('connection', function (socket) {
  var id = newId(4);
  socket.emit('join', id);
  socket.cid = id;
  var client = {
    id: id,
    socket: socket,
    state: {
      ry: 0,
      rx: 0,
      x: 0,
      y: 0,
      z: 0,
      destroyed: false
    }
  };
  clients[id] = client;
  socket.on('move', function(state) {
    // TODO: check game rules to ensure a valid move.
    client.state = state;
    emitSnapshot();
  });
  socket.on('disconnect', function() {
    console.log('disconnect: '+ socket.cid);
    clients[socket.cid].state.destroyed = true;
    emitSnapshot();
  });
  emitSnapshot();
});

