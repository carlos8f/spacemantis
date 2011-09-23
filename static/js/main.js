
var camera, scene, renderer, ship, stats, vector1, s;

$(init);

function init() {

  // scene and camera

  scene = new THREE.Scene();
  //scene.fog = new THREE.FogExp2( 0xffffff, 0.002 );

  // world

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
    ship.scale.set( 2, 2, 2 );
    ship.lookSpeed = 4;
    ship.movementSpeed = 150;
    ship.constrainVertical = [ -0.7, 0.7 ];
    ship.mouseLook = false;
    //ship.rotationAutoUpdate = true;
    scene.addChild( ship );

    camera = new THREE.FollowCamera( 60, window.innerWidth / window.innerHeight, 1, 10000, ship );
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

