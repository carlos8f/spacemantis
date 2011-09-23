
var camera, scene, renderer, ship, stats;

$(init);

function init() {

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2( 0x000000, 0.0045 );

  // grid
  var cubeMaterial = new THREE.MeshBasicMaterial( { color: 0x00ff00, wireframe: true, opacity: 0.9 } );
  var distance = 1000;
  for ( var i = 0; i < distance; i++ ) {
    var cubeGeom = new THREE.CubeGeometry( Math.ceil(Math.random() * 10), Math.ceil(Math.random() * 10), Math.ceil(Math.random() * 10));
    var mesh = new THREE.Mesh( cubeGeom, cubeMaterial );
    mesh.position.set(( Math.random() - 0.5 ) * distance,
    ( Math.random() - 0.5 ) * distance,
    0 );

    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
    scene.addChild( mesh );

  }

  for ( var i = 0; i < distance; i++ ) {
    var cubeGeom = new THREE.CubeGeometry( Math.ceil(Math.random() * 10), Math.ceil(Math.random() * 10), Math.ceil(Math.random() * 10));
    var mesh = new THREE.Mesh( cubeGeom, cubeMaterial );
    mesh.position.set(( Math.random() - 0.5 ) * distance,
    ( Math.random() - 0.5 ) * distance,
    100 );

    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
    scene.addChild( mesh );

  }

  for ( var i = 0; i < distance; i++ ) {
    var cubeGeom = new THREE.CubeGeometry( Math.ceil(Math.random() * 10), Math.ceil(Math.random() * 10), Math.ceil(Math.random() * 10));
    var mesh = new THREE.Mesh( cubeGeom, cubeMaterial );
    mesh.position.set(( Math.random() - 0.5 ) * distance,
    ( Math.random() - 0.5 ) * distance,
    -100 );

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

  function addModel ( geometry ) {
    
    ship = new THREE.Ship( geometry, new THREE.MeshFaceMaterial() );
    ship.lookSpeed = 4;
    ship.movementSpeed = 150;
    ship.mouseLook = false;
    ship.rotation.x = Math.PI * 0.5;
    ship.matrixAutoUpdate = true;
    scene.addChild( ship );

    camera = new THREE.FollowCamera( 60, window.innerWidth / window.innerHeight, 1, 2000, ship, 100, 10, 200 );
    ship.addChild( camera );

    $('.info').html('Space demo.<br /><small>Controls: WASD w/ mouse<br /><a href="#" onclick="ship.reset();">reset ship</a> | <a href="#" onclick="ship.toggleMouseLook();">toggle mouseLook</a></small>');

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
		stats.domElement.style.top = '0px';
    $('body').append( stats.domElement );

    animate();

  }

  // renderer

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setClearColorHex( 0x000000, 1 );
  renderer.setSize( window.innerWidth, window.innerHeight );

  $('body').append( renderer.domElement );
}


function animate() {
  requestAnimationFrame(animate);
  renderer.render( scene, camera );
  stats.update();
}

