var SpaceMantis = function SpaceMantis(container, stats) {
  var _self = this,
    _container = container,
    _stats = stats,
    box2d = exports; // Poor man's commonjs module!

  var _camera,
    _scene,
    _renderer;

  var _metrics = {
    stage: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    world: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  };

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
  var _engineOn = false;
  var _autoPilot = false;
  var _damping = 1.0;

  var _velocity = new box2d.b2Vec2(0, 0);

  var _projector = new THREE.Projector();
  var _mouse2d = new THREE.Vector3();
  var _mouse3d = new THREE.Vector3();
  var _windowHalfX = window.innerWidth / 2;
  var _windowHalfY = window.innerHeight / 2;

  var _emptyVector = new box2d.b2Vec2(0, 0);

  var _rotationSpeed = 0.1;

  var _targetRotation = 0;
  var _lastTargetRotation = 0;
  var _halfRotations = 0;

  var _shipGeometry;

  function init(shipGeometry) {
    _shipGeometry = shipGeometry;
    initScene();
    initBox2d();
    initSocket();
    initView();
    initPlane();
    initLights();
    initEvents();

    run();
  }

  function run() {
    setInterval(step, 1000/_frameRate);
    render();
    var info = document.getElementById('info');
    info.innerHTML = 'W: thrust<br />Right click: change direction<br />Left click/drag: move camera';
  }

  function initBox2d() {
    _world = new box2d.b2World(new box2d.b2Vec2(0, _gravity), false);
  }

  function createDynamicBody( snapshot ) {
    var material = new THREE.MeshLambertMaterial( { color: 0x0055ff, opacity: 1 } ),
      mesh = new THREE.Mesh( _shipGeometry, material );

    var size = 0.1; // Size matters

    mesh.scale.set( size, size, size );
    mesh.position.x = snapshot.state.x;
    mesh.position.y = snapshot.state.y;
    mesh.position.z = 0; // It's a 2d game.
    mesh.rotation.x = snapshot.state.r;

    //initialize body
    var def=new box2d.b2BodyDef();
    def.type = box2d.b2Body.b2_dynamicBody;
    def.position = new box2d.b2Vec2(snapshot.state.x, snapshot.state.y);
    //def.angle=math.radians(0); // 0 degrees
    def.linearDamping = _damping;  //gradually reduces velocity, makes the car reduce speed slowly if neither accelerator nor brake is pressed
    def.bullet = true; //dedicates more time to collision detection - car travelling at high speeds at low framerates otherwise might teleport through obstacles.
    def.angularDamping = 0.3;

    var body = _world.CreateBody(def);
    var userData = {mesh: mesh};
    body.SetUserData(userData);
    var massData = {mass: snapshot.state.m, center: _emptyVector};
    body.SetMassData(massData);

    //initialize shape
    var fixdef= new box2d.b2FixtureDef();
    fixdef.density = 0.0;
    fixdef.friction = 1.0; //friction when rubbing against other shapes
    fixdef.restitution = 0.3;  //amount of force feedback when hitting something. >0 makes the car bounce off, it's fun!
    fixdef.shape = new box2d.b2CircleShape(size * 20);
    //fixdef.shape.SetAsBox(width/2, height/2);
    body.CreateFixture(fixdef);

    _scene.addChild(mesh);

    return body;
  }

  function initSocket() {
    _socket = io.connect();
    _socket.on('join', function (data) {
      _myId = data.id;
      initObstacles(data.obstacles);
    });
    _socket.on('snapshot', function (snapshot) {
      if (typeof _myId != 'undefined') {
        for (var i in snapshot) {
          processSnapshot(snapshot[i]);
        }
      }
    });
  }

  function processSnapshot(snapshot) {
    var id = snapshot.id;
    if (typeof _dynamicBodies[id] == 'undefined' && snapshot.state.d == 0) {
      _dynamicBodies[id] = createDynamicBody(snapshot);
      if (id == _myId) {
        _ship = _dynamicBodies[id];
      }
    }
    else if (snapshot.state.d == 1) {
      destroyBody(id);
    }
    else if (id != _myId) {
      _dynamicBodies[id].state = snapshot.state;
    }
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
      var bdef=new box2d.b2BodyDef();
      bdef.position=new box2d.b2Vec2(mesh.position.x, mesh.position.y);
      bdef.angle=0;
      bdef.fixedRotation=true;
      var body = _world.CreateBody(bdef);

      //initialize shape
      var fixdef = new box2d.b2FixtureDef;
      fixdef.shape = new box2d.b2PolygonShape();
      fixdef.shape.SetAsBox(data.w/2, data.h/2);
      fixdef.restitution = 0.0;
      fixdef.friction = 1.0;

      body.CreateFixture(fixdef);

      var userData = {mesh: mesh};
      body.SetUserData(userData);

      userData.mesh.body = body;

      mesh.updateMatrix();
      mesh.matrixAutoUpdate = false;
      _scene.addChild(mesh);
    }
  }

  function initView() {
    _renderer = new THREE.WebGLRenderer( { antialias: true } );
    _renderer.setSize( _metrics.stage.width, _metrics.stage.height );
    _renderer.setClearColorHex( 0x000000, 1 );
    _container.appendChild(_renderer.domElement);
  }

  function initLights() {
    var ambient = new THREE.AmbientLight( 0x555555 );
    _scene.addLight( ambient );

    var directionalLight = new THREE.DirectionalLight( 0xffffff, 2 );
    directionalLight.position.x = 2;
    directionalLight.position.y = 1.2;
    directionalLight.position.z = 10;
    directionalLight.position.normalize();
    _scene.addLight( directionalLight );

    directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
    directionalLight.position.x = - 2;
    directionalLight.position.y = 1.2;
    directionalLight.position.z = - 10;
    directionalLight.position.normalize();
    _scene.addLight( directionalLight );

    var pointLight = new THREE.PointLight( 0x6666ff, 0.5 );
    pointLight.position.x = 2000;
    pointLight.position.y = 1200;
    pointLight.position.z = 10000;
    _scene.addLight( pointLight );
  }

  function onMouseDown( event ) {
    if ( event.button == 2 ) {
      _mouse2d.set( (event.clientX - _windowHalfX) / _metrics.stage.width, - ((event.clientY - _windowHalfY) / _metrics.stage.height) ).multiplyScalar( 2 );
      _mouse3d = _projector.unprojectVector( _mouse2d.clone(), _camera );
      _ray.direction = _mouse3d.subSelf( _camera.position ).normalize();
      var intersects = _ray.intersectObject( _plane );
      if ( intersects.length > 0 ) {
        _velocity.Set(intersects[0].point.x - _ship.position.x, intersects[0].point.y - _ship.userData.mesh.position.y);
        _velocity.Normalize();
        _targetRotation = -Math.atan2(_velocity.x, _velocity.y);

        var diff = _targetRotation - _lastTargetRotation;

        // Correct an angle greater than 180.
        if (diff > Math.PI) {
          _halfRotations--;
        }
        else if (diff < -Math.PI) {
          _halfRotations++;
        }

        _lastTargetRotation = _targetRotation;
        _targetRotation += _halfRotations * Math.PI*2;
      }
    }
  }

  function sendState() {

  }

  function onKeyDown( event ) {
    event.preventDefault();
    event.stopPropagation();

    switch( event.keyCode ) {
      case 87: /*W*/ _engineOn = true; break;
      //case 32: /*space*/ _autoPilot = _autoPilot ? false : true; break;
    }
  }

  function onKeyUp( event ) {
    event.preventDefault();
    event.stopPropagation();

    switch( event.keyCode ) {
      case 87: /*W*/ _engineOn = false; break;
    }
  }

  function onResize() {
    _renderer.setSize(window.innerWidth, window.innerHeight);
    _camera.aspect = window.innerWidth / window.innerHeight;
    _camera.updateProjectionMatrix();
  }

  function initEvents() {
    document.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
    document.addEventListener( 'mousedown', onMouseDown, false );
    document.addEventListener( 'keydown', onKeyDown, false );
    document.addEventListener( 'keyup', onKeyUp, false );
    window.addEventListener( 'resize', onResize, false );
  }

  function render() {
    requestAnimationFrame(render);

    if (typeof _ship != 'undefined' && typeof _camera == 'undefined') {
      var userData = _ship.GetUserData();
      _camera = new THREE.FollowCamera( _fov, _metrics.stage.width / _metrics.stage.height, _near, _far, userData.mesh, 80, 10, 200 );
      _ray = new THREE.Ray( _camera.position, null );
    }

    if (typeof _camera != 'undefined') {
      _renderer.render( _scene, _camera );
    }

    _stats.update();
  }

  function step() {
    if (typeof _ship != 'undefined') {
      if (_engineOn || _autoPilot) {
        _ship.ApplyImpulse(_velocity, _emptyVector);
      }
      var position = _ship.GetPosition();
      var userData = _ship.GetUserData();
      var mesh = userData.mesh;
      mesh.position.set(position.x, position.y, 0);
      mesh.rotation.y += (_targetRotation - mesh.rotation.y) * _rotationSpeed;
      //_ship.rotation.z = body.GetAngle() * (Math.PI / 180);

      if (mesh.position.x > 250 || mesh.position.x < -250 || mesh.position.y > 250 || mesh.position.y < -250) {
        mesh.position.set(0, 0);
        _ship.SetPosition(_emptyVector);
      }
    }

    _world.Step(_timeStep, _iterations);
    _world.ClearForces();
  }

  // ship
  var binLoader = new THREE.BinaryLoader();
  binLoader.load( { model: '/models/simpleship.js', callback: init } );
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
	window.setTimeout( callback, 1000 / 60 );
      };
  })();
}
