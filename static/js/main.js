var camera, scene, renderer, stats, ship, projector, ray, plane, mouse2d, mouse3d;

$(init);

function init() {

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2( 0xffffff, 0.0045 );

  var cubeGeom, mesh;

  // grid
  plane = new THREE.Mesh( new THREE.PlaneGeometry( 1000, 1000, 100, 100 ), new THREE.MeshBasicMaterial( { color: 0x555555, opacity: 0.8, wireframe: true } ) );
  scene.addChild( plane );

  var cubeMaterial = new THREE.MeshBasicMaterial( { color: 0x888888, wireframe: true, opacity: 0.9 } );
  var distance = 1000;
  for ( var i = 0; i < distance; i++ ) {
    cubeGeom = new THREE.CubeGeometry( Math.ceil(Math.random() * 10), Math.ceil(Math.random() * 10), Math.ceil(Math.random() * 10));
    mesh = new THREE.Mesh( cubeGeom, cubeMaterial );
    mesh.position.set(( Math.random() - 0.5 ) * distance,
    ( Math.random() - 0.5 ) * distance,
    0 );

    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
    scene.addChild( mesh );

  }

  for ( var i = 0; i < distance; i++ ) {
    cubeGeom = new THREE.CubeGeometry( Math.ceil(Math.random() * 10), Math.ceil(Math.random() * 10), Math.ceil(Math.random() * 10));
    mesh = new THREE.Mesh( cubeGeom, cubeMaterial );
    mesh.position.set(( Math.random() - 0.5 ) * distance,
    ( Math.random() - 0.5 ) * distance,
    150 );

    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
    scene.addChild( mesh );

  }

  for ( var i = 0; i < distance; i++ ) {
    cubeGeom = new THREE.CubeGeometry( Math.ceil(Math.random() * 10), Math.ceil(Math.random() * 10), Math.ceil(Math.random() * 10));
    mesh = new THREE.Mesh( cubeGeom, cubeMaterial );
    mesh.position.set(( Math.random() - 0.5 ) * distance,
    ( Math.random() - 0.5 ) * distance,
    -150 );

    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
    scene.addChild( mesh );

  }

  // lights
  light = new THREE.DirectionalLight( 0xffffff );
  light.position.set( 1, 1, 1 );
  scene.addChild( light );

  light = new THREE.DirectionalLight( 0xffffff );
  light.position.set( -1, -1, -1 );
  scene.addChild( light );

  light = new THREE.AmbientLight( 0x222222 );
  scene.addChild( light );

  // ship
  var binLoader = new THREE.BinaryLoader();
  binLoader.load( { model: '/models/ship.js', callback: function( geometry ) { addModel( geometry ) } } );

  projector = new THREE.Projector();
  mouse2d = new THREE.Vector3();
  mouse3d = new THREE.Vector3();
  var windowHalfX = window.innerWidth / 2;
	var windowHalfY = window.innerHeight / 2;

  function constrain( scalar, min, max ) {

    if ( scalar > max ) {
      return max;
    }
    else if ( scalar < min ) {
      return min;
    }

    return scalar;

  }

	function onMouseUp ( event ) {

    if ( event.button == 2 ) {
      mouse2d.set( (event.clientX - windowHalfX) / window.innerWidth, - ((event.clientY - windowHalfY) / window.innerHeight) ).multiplyScalar( 2 );
      mouse3d = projector.unprojectVector( mouse2d.clone(), camera );
      ray.direction = mouse3d.subSelf( camera.position ).normalize();
      var intersects = ray.intersectObject( plane );
      if ( intersects.length > 0 ) {
        ship.travelLocation.copy( intersects[0].point );
      }
    }

	};

	document.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	document.addEventListener( 'mouseup', onMouseUp, false );

  function addModel ( geometry ) {
    
    ship = new THREE.Ship( geometry, new THREE.MeshFaceMaterial() );
    ship.lookSpeed = 4;
    ship.movementSpeed = 150;
    ship.mouseLook = false;
    ship.rotation.x = Math.PI * 0.5;
    ship.matrixAutoUpdate = true;
    ship.scale.set( 2, 2, 2 );
    scene.addChild( ship );

    camera = new THREE.FollowCamera( 60, window.innerWidth / window.innerHeight, 1, 2000, ship, 110, 10, 200 );
    ship.addChild( camera );
    ray = new THREE.Ray( camera.position, null );

    $('.info').empty();

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
		stats.domElement.style.top = '0px';
    $('body').append( stats.domElement );

    animate();

  }

  // renderer

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setClearColorHex( 0xffffff, 1 );
  renderer.setSize( window.innerWidth, window.innerHeight );

  $('body').append( renderer.domElement );
}

function animate() {
  requestAnimationFrame(animate);

  renderer.render( scene, camera );
  stats.update();
}
