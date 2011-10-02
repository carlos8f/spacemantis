var SpaceMantis = function SpaceMantis(container, stats) {
  var _container = container, _stats = stats;

  var _camera,
    _scene,
    _renderer;

  var _frameRate = 60;

  var _timeStep = 1/_frameRate,
    _iterations = 1;

  var _world, _ship, _plane, _ray;

  var _dynamicBodies = {};

  var _socket;
  var _myId;

  var _fov = 60,
    _near = 1,
    _far = 3000;

  var _gravity = 0;
  var _damping = 1.0;

  var _velocity = new Box2D.b2Vec2(0, 1);

  var _projector = new THREE.Projector();
  var _mouse2d = new THREE.Vector3();
  var _mouse3d = new THREE.Vector3();
  var _windowHalfX, _windowHalfY, _windowWidth, _windowHeight;

  var _emptyVector = new Box2D.b2Vec2(0, 0);

  var _lastTargetRotation = 0;
  var _halfRotations = 0;

  var _shipGeometry;

  function updateMetrics() {
    _windowWidth = window.innerWidth;
    _windowHeight = window.innerHeight;
    _windowHalfX = _windowWidth / 2;
    _windowHalfY = _windowHeight / 2;

    if (typeof _renderer != 'undefined') {
      _renderer.setSize(_windowWidth, _windowHeight);
    }
    if (typeof _camera != 'undefined') {
      _camera.aspect = _windowWidth / _windowHeight;
      _camera.updateProjectionMatrix();
    }
  }

  function init(shipGeometry) {
    _shipGeometry = shipGeometry;
    updateMetrics();
    initScene();
    initBox2d();
    initSocket();
    initView();
    initPlane();
    initLights();
    initEvents();
  }

  function run() {
    setInterval(step, 1000/_frameRate);
    updateMetrics();
    render();
    var info = document.getElementById('info');
    info.innerHTML = 'W: thrust<br />Right click: change direction<br />Left click/drag: move camera';
  }

  function initBox2d() {
    _world = new Box2D.b2World(new Box2D.b2Vec2(0, _gravity), false);
  }

  function createDynamicBody(client) {
    var material = new THREE.MeshLambertMaterial({color: client.c, opacity: 1}),
      mesh = new THREE.Mesh(_shipGeometry, material);

    var size = 0.1; // Hard-coded for now

    mesh.scale.set( size, size, size );
    mesh.position.x = client.state.x;
    mesh.position.y = client.state.y;
    mesh.position.z = 0; // It's a 2d game.
    mesh.rotation.x = Math.PI / 2; // Pointing up.

    //initialize body
    var def=new Box2D.b2BodyDef();
    def.type = Box2D.b2Body.b2_dynamicBody;
    def.position = new Box2D.b2Vec2(client.state.x, client.state.y);
    //def.angle=math.radians(0); // 0 degrees
    def.linearDamping = _damping;  //gradually reduces velocity, makes the car reduce speed slowly if neither accelerator nor brake is pressed
    def.bullet = true; //dedicates more time to collision detection - car travelling at high speeds at low framerates otherwise might teleport through obstacles.

    var body = _world.CreateBody(def);
    var userData = {mesh: mesh, rs: client.rs};
    body.SetUserData(userData);
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

    _scene.addChild(mesh);

    body.state = client.state;

    return body;
  }

  function initSocket() {
    _socket = io.connect();
    _socket.on('init', function (data) {
      _myId = data.id;
      initObstacles(data.obstacles);
      for (var id in data.clients) {
	_dynamicBodies[id] = createDynamicBody(data.clients[id]);
	if (id == _myId) {
	  _ship = _dynamicBodies[id];
	  _camera = new THREE.FollowCamera(_fov, _windowWidth / _windowHeight, _near, _far, _ship.m_userData.mesh, 80, 10, 200);
	  _ray = new THREE.Ray(_camera.position, null);
	  run();
	}
      }
    });
    _socket.on('join', function (client) {
      _dynamicBodies[client.id] = createDynamicBody(client);
    });
    _socket.on('leave', function(id) {
      var body = _dynamicBodies[id];
      _scene.removeChild(body.m_userData.mesh);
      _world.DestroyBody(_dynamicBodies[id]);
      delete _dynamicBodies[id];
    });
    _socket.on('snapshot', function (snapshot) {
      for (var id in snapshot) {
	if (id != _myId) {
	  var delta = snapshot[id];
	  var bodyState = _dynamicBodies[id].state;
	  for (var prop in delta) {
	    bodyState[prop] = delta[prop];
	  }
	}
      }
    });
  }

  function initScene() {
    _scene = new THREE.Scene();
    _scene.fog = new THREE.FogExp2( 0x000000, 0.0045 );
  }

  function initPlane() {
    _plane = new THREE.Mesh( new THREE.PlaneGeometry( 500, 500, 10, 10 ), new THREE.MeshBasicMaterial( { color: 0x991100, wireframe: true, opacity: 0.5 } ) );
    _plane.position.z = -3;
    _scene.addChild( _plane );

    // @todo: set up an edgechain for plane bounds.
  }

  function initObstacles(obstacles) {
    var obstaclesLength = obstacles.length;

    for ( var i = 0; i < obstaclesLength; i++) {
      var data = obstacles[i];

      var material =  new THREE.MeshLambertMaterial( { color: data.c } );
      var cube = new THREE.CubeGeometry( data.w, data.h, data.d );
      var mesh = new THREE.Mesh( cube, material );
      mesh.position.set(data.x, data.y, data.z);

      //initialize body
      var bdef=new Box2D.b2BodyDef();
      bdef.position=new Box2D.b2Vec2(mesh.position.x, mesh.position.y);
      bdef.angle=0;
      bdef.fixedRotation=true;
      var body = _world.CreateBody(bdef);

      //initialize shape
      var fixdef = new Box2D.b2FixtureDef;
      fixdef.shape = new Box2D.b2PolygonShape();
      fixdef.shape.SetAsBox(data.w/2, data.h/2);
      fixdef.restitution = 0.0;
      fixdef.friction = 1.0;

      body.CreateFixture(fixdef);

      mesh.updateMatrix();
      mesh.matrixAutoUpdate = false;
      _scene.addChild(mesh);
    }
  }

  function initView() {
    _renderer = new THREE.WebGLRenderer({ antialias: true });
    _renderer.setSize(_windowWidth, _windowHeight);
    _renderer.setClearColorHex(0x000000, 1);
    _container.appendChild(_renderer.domElement);
  }

  function initLights() {
    var ambient = new THREE.AmbientLight( 0x555555 );
    _scene.addLight( ambient );

    var directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.x = 2;
    directionalLight.position.y = 1.2;
    directionalLight.position.z = 10;
    directionalLight.position.normalize();
    _scene.addLight( directionalLight );

    directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.x = -2;
    directionalLight.position.y = 1.2;
    directionalLight.position.z = -10;
    directionalLight.position.normalize();
    _scene.addLight( directionalLight );

    var pointLight = new THREE.PointLight(0x6666ff, 0.5);
    pointLight.position.x = 2000;
    pointLight.position.y = 1200;
    pointLight.position.z = 10000;
    _scene.addLight(pointLight);
  }

  function onMouseDown( event ) {
    if ( event.button == 2 ) {
      _mouse2d.set((event.clientX - _windowHalfX) / _windowWidth, - ((event.clientY - _windowHalfY) / _windowHeight)).multiplyScalar(2);
      _mouse3d = _projector.unprojectVector( _mouse2d.clone(), _camera );
      _ray.direction = _mouse3d.subSelf( _camera.position ).normalize();
      var intersects = _ray.intersectObject(_plane);
      if (intersects.length > 0) {
        _velocity.Set(intersects[0].point.x - _ship.m_userData.mesh.position.x, intersects[0].point.y - _ship.m_userData.mesh.position.y);
        _velocity.Normalize();
	_ship.state.vx = _velocity.x;
	_ship.state.vy = _velocity.y;
        _ship.state.r = -Math.atan2(_ship.state.vx, _ship.state.vy);

        var diff = _ship.state.r - _lastTargetRotation;

        // Correct an angle greater than 180.
        if (diff > Math.PI) {
          _halfRotations--;
        }
        else if (diff < -Math.PI) {
          _halfRotations++;
        }

        _lastTargetRotation = _ship.state.r;
        _ship.state.r += _halfRotations * Math.PI * 2;
	move();
      }
    }
  }

  function move() {
    _socket.emit('move', _ship.state);
  }

  function onKeyDown( event ) {
    event.preventDefault();
    event.stopPropagation();

    switch( event.keyCode ) {
      case 87: /*W*/ _ship.state.e = 1; move(); break;
      //case 32: /*space*/ _autoPilot = _autoPilot ? false : true; break;
    }
  }

  function onKeyUp( event ) {
    event.preventDefault();
    event.stopPropagation();

    switch( event.keyCode ) {
      case 87: /*W*/ _ship.state.e = 0; move(); break;
    }
  }

  function initEvents() {
    document.addEventListener('contextmenu', function (event) { event.preventDefault(); }, false);
    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    window.addEventListener('resize', updateMetrics, false);
  }

  function render() {
    requestAnimationFrame(render);
    _renderer.render(_scene, _camera);

    _stats.update();
  }

  function step() {
    for (var id in _dynamicBodies) {
      var body = _dynamicBodies[id];
      if (body.state.e == 1) {
	body.ApplyImpulse(new Box2D.b2Vec2(body.state.vx, body.state.vy), _emptyVector);
      }
      var position = body.m_xf.position;
      var mesh = body.m_userData.mesh;
      mesh.position.x = position.x;
      mesh.position.y = position.y;
      mesh.rotation.y += (body.state.r - mesh.rotation.y) * body.m_userData.rs;
    }

    _world.Step(_timeStep, _iterations);
    _world.ClearForces();
  }

  // ship
  var binLoader = new THREE.BinaryLoader();
  binLoader.load({ model: '/models/simpleship.js', callback: init });
}

/**
 * Provides requestAnimationFrame in a cross browser way.
 * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 */

if ( !window.requestAnimationFrame ) {
  window.requestAnimationFrame = ( function() {
    return window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
	window.setTimeout( callback, 1000 / _frameRate );
      };
  })();
}
