var express = require('express'),
    app = require('../app'),
    io = require('socket.io').listen(app),
    _ = require('underscore'),
    Box2D = require('box2d');

var clients = {}, dynamicBodies = {}, obstacles = [], lastWorldSnapshot = {}, _world, _gravity = 0, _damping = 1.0;
var _emptyVector = new Box2D.b2Vec2(0, 0);

var _frameRate = 60;
var _timeStep = 1/_frameRate, _iterations = 1;

function newId(length) {
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  var str = '';
  for (var i = 0; i < length; i++) {
    var rnum = Math.floor(Math.random() * chars.length);
    str += chars.substring(rnum, rnum+1);
  }
  return clients.hasOwnProperty(str) ? newId(length) : str;
}

function initBox2d() {
  _world = new Box2D.b2World(new Box2D.b2Vec2(0, _gravity), false);
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

    //initialize body
    var bdef=new Box2D.b2BodyDef();
    bdef.position=new Box2D.b2Vec2(x, y);
    bdef.angle=0;
    bdef.fixedRotation=true;
    var body = _world.CreateBody(bdef);

    //initialize shape
    var fixdef = new Box2D.b2FixtureDef;
    fixdef.shape = new Box2D.b2PolygonShape();
    fixdef.shape.SetAsBox(w/2, h/2);
    fixdef.restitution = 0.0;
    fixdef.friction = 1.0;

    body.CreateFixture(fixdef);

    obstacles.push({x: x, y: y, z: z, w: w, h: h, d: d, c: 0x5555ff});
  }
}

function createDynamicBody(client) {
  var size = 0.1; // Hard-coded for now

  //initialize body
  var def=new Box2D.b2BodyDef();
  def.type = Box2D.b2Body.b2_dynamicBody;
  def.position = new Box2D.b2Vec2(client.state.x, client.state.y);
  //def.angle=math.radians(0); // 0 degrees
  def.linearDamping = _damping;  //gradually reduces velocity, makes the car reduce speed slowly if neither accelerator nor brake is pressed
  def.bullet = true; //dedicates more time to collision detection - car travelling at high speeds at low framerates otherwise might teleport through obstacles.

  var body = _world.CreateBody(def);
  var massData = {mass: client.m, center: _emptyVector};
  body.SetMassData(massData);

  //initialize shape
  var fixdef= new Box2D.b2FixtureDef();
  fixdef.density = 0.0;
  fixdef.friction = 1.0; //friction when rubbing against other shapes
  fixdef.restitution = 0.3;  //amount of force feedback when hitting something. >0 makes the car bounce off, it's fun!
  fixdef.shape = new Box2D.b2CircleShape(size * 20);
  //fixdef.shape.SetAsBox(width/2, height/2);
  body.CreateFixture(fixdef);

  return body;
}

function newClient(id) {
  clients[id] = {
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
  dynamicBodies[id] = createDynamicBody(clients[id]);
  return clients[id];
}

io.sockets.on('connection', function (socket) {
  var id = newId(4);
  var client = newClient(id);

  socket.on('move', function(state) {
    // TODO: check game rules to ensure a valid move.
    client.state = state;
  });
  socket.on('disconnect', function() {
    _world.DestroyBody(dynamicBodies[id]);
    delete dynamicBodies[id];
    delete clients[id];
    // Broadcast disconnect
    socket.broadcast.emit('leave', id);
  });
  socket.on('sync', function() {
    socket.emit('sync', {clients: clients});
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
    
    if (lastWorldSnapshot.hasOwnProperty(id)) {
      // Compute delta state.
      var delta = {};
      var lastClientState = lastWorldSnapshot[id];
      var changed = false;
      for (var prop in clientState) {
	if (prop != 'x' && prop != 'y' && clientState[prop] != lastClientState[prop]) {
	  delta[prop] = clientState[prop];
	  changed = true;
	}
      }
      if (changed) {
	snapshot[id] = _.extend(delta, {x: dynamicBodies[id].m_xf.position.x, y: dynamicBodies[id].m_xf.position.y});
	anyChange = true;
      }
    }
    else {
      // No previous snapshot of this client, send the whole state.
      snapshot[id] = _.extend({x: dynamicBodies[id].m_xf.position.x, y: dynamicBodies[id].m_xf.position.y}, clientState);
      anyChange = true;
    }
    lastWorldSnapshot[id] = _.extend({}, clientState);
  }
  if (anyChange) {
    io.sockets.emit('snapshot', snapshot);
  }
}

function step() {
  for (var id in dynamicBodies) {
    var state = clients[id].state;
    if (state.e == 1) {
      dynamicBodies[id].ApplyImpulse(new Box2D.b2Vec2(state.vx, state.vy), _emptyVector);
    }
  }

  _world.Step(_timeStep, _iterations);
  _world.ClearForces();
}

initBox2d();
generateObstacles();
updateClients();
setInterval(step, 1000/_frameRate);
