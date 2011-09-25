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
	}

	var _frameRate = 30;

	var _timeStep = 1/10,
		_iterations = 1;

	var _world, _ship, _plane, _ray;

	var _bodies = [];

	var _fov = 60,
		_near = 1,
		_far = 3000;

  var _gravity = 0;

  var _velocity = new box2d.b2Vec2(0, 0);

  var _projector = new THREE.Projector();
  var _mouse2d = new THREE.Vector3();
  var _mouse3d = new THREE.Vector3();
  var _windowHalfX = window.innerWidth / 2;
	var _windowHalfY = window.innerHeight / 2;

  var _loopInterval;

	function init() {
    initScene();
    initBox2d();
    initShip();
		initView();
    initPlane();
		initLights();
		initEvents();

		run();
	}

  function run() {
    _loopInterval = setInterval(loop, 1000/_frameRate);
  }

  function stop() {
    clearInterval(_loopInterval);
  }

	function initBox2d() {
    _world = new box2d.b2World(new box2d.b2Vec2(0, _gravity), false);
	}

	function drawWall(x,y,width,height, cX,cY,cZ) {
		/*
		 * Create box
		 */
		var boxSd = new box2d.b2BoxDef();
		boxSd.extents.Set(width, height);
		boxSd.friction = 1;
		var boxBd = new box2d.b2BodyDef();
		boxBd.AddShape(boxSd);
		boxBd.position.Set(x, y);

		_world.CreateBody(boxBd);
		drawBox(x,y,width,height, cX, cY, cZ);
	}

	function addCubeVisual(x, y, width, height, depth ) {
		var geometry = new THREE.CubeGeometry( width, height, depth ),
			material = new THREE.MeshBasicMaterial( { color: 0x555555, wireframe: true } ),
			cube = new THREE.Mesh( geometry, material );

		cube.position.set( x, y, 0 );

		_scene.addObject( cube );
		return cube;
	}

	function addCube( x, y, size ) {
		var width = size,
			height = width,
			depth = height;

    //initialize body
    var def=new box2d.b2BodyDef();
    def.type = box2d.b2Body.b2_dynamicBody;
    def.position=new box2d.b2Vec2(x, y);
    //def.angle=math.radians(0); // 0 degrees
    def.linearDamping=0.2;  //gradually reduces velocity, makes the car reduce speed slowly if neither accelerator nor brake is pressed
    def.bullet=true; //dedicates more time to collision detection - car travelling at high speeds at low framerates otherwise might teleport through obstacles.
    def.angularDamping=0.3;

    var body = _world.CreateBody(def);
    var userData = {mesh: addCubeVisual(x, y, width, height, depth )};
    body.SetUserData(userData);

    //initialize shape
    var fixdef= new box2d.b2FixtureDef();
    fixdef.density = 0.0;
    fixdef.friction = 0.0; //friction when rubbing against other shapes
    fixdef.restitution = 0.0;  //amount of force feedback when hitting something. >0 makes the car bounce off, it's fun!
    fixdef.shape=new box2d.b2PolygonShape;
    fixdef.shape.SetAsBox(width/2, height/2);
    body.CreateFixture(fixdef);

    _bodies.push( body );

    userData.mesh.body = body;

    return userData.mesh;
	}

  function initScene() {
    _scene = new THREE.Scene();
    _scene.fog = new THREE.FogExp2( 0xffffff, 0.0045 );
  }

  function initShip() {
    _ship = addCube( 0, 0, 5 );
  }

  function initPlane() {
    _plane = new THREE.Mesh( new THREE.PlaneGeometry( 500, 500, 75, 75 ), new THREE.MeshBasicMaterial( { color: 0x555555, opacity: 0.5, wireframe: true } ) );
    _plane.position.z = -20;
    _scene.addChild( _plane );
  }

	function initView() {
    _camera = new THREE.FollowCamera( _fov, _metrics.stage.width / _metrics.stage.height, _near, _far, _ship, 80, 10, 200 );

    _ray = new THREE.Ray( _camera.position, null );

		_renderer = new THREE.WebGLRenderer( { antialias: true } );
		_renderer.setSize( _metrics.stage.width, _metrics.stage.height );

		_container.appendChild(_renderer.domElement);
	}

	function initLights() {
		_scene.addLight( new THREE.AmbientLight( Math.random() * 0x202020 ) );
	}

  function onMouseUp( event ) {
    if ( event.button == 2 ) {
      _mouse2d.set( (event.clientX - _windowHalfX) / _metrics.stage.width, - ((event.clientY - _windowHalfY) / _metrics.stage.height) ).multiplyScalar( 2 );
      _mouse3d = _projector.unprojectVector( _mouse2d.clone(), _camera );
      _ray.direction = _mouse3d.subSelf( _camera.position ).normalize();
      var intersects = _ray.intersectObject( _plane );
      if ( intersects.length > 0 ) {
        _velocity.Set(intersects[0].point.x - _ship.position.x, intersects[0].point.y - _ship.position.y);
        _velocity.Normalize();
        _velocity.Multiply(0.5);
      }
    }
	};

  function onResize() {
    _renderer.setSize(window.innerWidth, window.innerHeight);
    _camera.aspect = window.innerWidth / window.innerHeight;
    _camera.updateProjectionMatrix();
  }

  function initEvents() {
    document.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
    document.addEventListener( 'mouseup', onMouseUp, false );
    window.addEventListener( 'resize', onResize, false );
	}

	function loop() {
    _ship.body.ApplyImpulse( _velocity, new box2d.b2Vec2(0, 0) );

		_world.Step(_timeStep, _iterations);
    _world.ClearForces();

		for(var i = 0, max = _bodies.length; i < max; i++) {
			var body = _bodies[i];
      var mesh = body.GetUserData().mesh;
      var position = body.GetPosition();
      mesh.position.set(position.x, position.y, 0);
			mesh.rotation.z = body.GetAngle() * (Math.PI / 180); // ?
		}

		_renderer.render( _scene, _camera );

		_stats.update();
	}

  function constrain( scalar, min, max ) {
    if ( scalar > max ) {
      return max;
    }
    else if ( scalar < min ) {
      return min;
    }

    return scalar;
  }

	init();
}
