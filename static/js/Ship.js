/**
 * @author mikael emtinger / http://gomo.se/
 * @author alteredq / http://alteredqualia.com/
 *
 * parameters = {
 *  fov: <float>,
 *  aspect: <float>,
 *  near: <float>,
 *  far: <float>,

 *  movementSpeed: <float>,
 *  lookSpeed: <float>,
 *  rollSpeed: <float>,

 *  autoForward: <bool>,
 * 	mouseLook: <bool>,

 *  domElement: <HTMLElement>,
 * }
 */

THREE.Ship = function ( geometry, material ) {

	THREE.Mesh.call( this, geometry, material );

	// API

	this.mouseLook = true;
	this.autoForward = false;

	this.lookSpeed = 1;
	this.movementSpeed = 1;
	this.rollSpeed = 1;

	this.constrainVertical = [ -0.9, 0.9 ];
  this.constrainRoll = [ -0.9, 0.9 ];

	this.domElement = document;

	// disable default camera behavior

	this.useTarget = false;
	this.matrixAutoUpdate = false;

	// internals

	this.forward = new THREE.Vector3( 0, 0, 1 );
	this.roll = 0;

	this.lastUpdate = -1;
	this.delta = 0;

	var xTemp = new THREE.Vector3();
	var yTemp = new THREE.Vector3();
	var zTemp = new THREE.Vector3();
	var rollMatrix = new THREE.Matrix4();

  var firePrimary = false;
  var fireSecondary = false;

  this.thrust = 0;

	var doRoll = false, rollDirection = 1, thrustDir = 0, sideSpeed = 0, upSpeed = 0;

	var mouseX = 0, mouseY = 0;

	var windowHalfX = window.innerWidth / 2;
	var windowHalfY = window.innerHeight / 2;

  this.reset = function() {
    this.position = new THREE.Vector3();
    this.forward = new THREE.Vector3( 0, 0, 1 );
    this.thrust = 0;
    this.roll = 0;
    return false;
  };

  this.toggleMouseLook = function() {
    this.mouseLook = this.mouseLook ? false : true;
    return false;
  }

	// custom update

	this.update = function( parentMatrixWorld, forceUpdate, camera ) {

		var now = new Date().getTime();

		if ( this.lastUpdate == -1 ) this.lastUpdate = now;

		this.delta = ( now - this.lastUpdate ) / 1000;
		this.lastUpdate = now;

		if ( this.mouseLook ) {

			var actualLookSpeed = this.delta * this.lookSpeed;

			this.rotateHorizontally( actualLookSpeed * mouseX );
			this.rotateVertically( actualLookSpeed * mouseY );

		}

		var actualSpeed = this.delta * this.movementSpeed;

    var thrust = this.thrust;

    switch ( thrustDir ) {

      case 1: thrust += (thrust * 0.05) + 0.01; break;
      case -1: thrust -= (thrust * 0.05) + 0.01; break;
      case 0:
        if ( thrust > 0 ) {

          thrust -= (thrust * 0.05);

        } else if ( thrust < 0 ) {

          thrust += (- thrust * 0.05);

        }
        break;
    }

    if ( thrust > 1 ) {

      thrust = 1;

    } else if ( thrust < -1 ) {

      thrust = -1;

    }

    this.thrust = thrust;

		this.translateZ( actualSpeed * thrust );
		//this.translateX( actualSpeed * sideSpeed );
		//this.translateY( actualSpeed * upSpeed );

		if( doRoll ) {

			this.roll += this.rollSpeed * this.delta * rollDirection;
      
      // Constrain roll
      if ( this.roll > this.constrainRoll [ 1 ] ) {

        this.roll = this.constrainRoll [ 1 ];

      } else if ( this.roll < this.constrainRoll [ 0 ] ) {

        this.roll = this.constrainRoll [ 0 ];

      }
		}

		// cap forward up / down

		if( this.forward.y > this.constrainVertical[ 1 ] ) {

			this.forward.y = this.constrainVertical[ 1 ];
			this.forward.normalize();

		} else if( this.forward.y < this.constrainVertical[ 0 ] ) {

			this.forward.y = this.constrainVertical[ 0 ];
			this.forward.normalize();

		}


		// construct unrolled camera matrix

		zTemp.copy( this.forward );
		yTemp.set( 0, 1, 0 );

		xTemp.cross( yTemp, zTemp ).normalize();
		yTemp.cross( zTemp, xTemp ).normalize();

		this.matrix.n11 = xTemp.x; this.matrix.n12 = yTemp.x; this.matrix.n13 = zTemp.x;
		this.matrix.n21 = xTemp.y; this.matrix.n22 = yTemp.y; this.matrix.n23 = zTemp.y;
		this.matrix.n31 = xTemp.z; this.matrix.n32 = yTemp.z; this.matrix.n33 = zTemp.z;


		// calculate roll matrix

		rollMatrix.identity();
		rollMatrix.n11 = Math.cos( this.roll ); rollMatrix.n12 = -Math.sin( this.roll );
		rollMatrix.n21 = Math.sin( this.roll ); rollMatrix.n22 =  Math.cos( this.roll );


		// multiply camera with roll

		this.matrix.multiplySelf( rollMatrix );
		this.matrixWorldNeedsUpdate = true;


		// set position

		this.matrix.n14 = this.position.x;
		this.matrix.n24 = this.position.y;
		this.matrix.n34 = this.position.z;


		// call supr
		this.supr.update.call( this, parentMatrixWorld, forceUpdate, camera );

	};

	this.translateX = function ( distance ) {

		this.position.x += this.matrix.n11 * distance;
		this.position.y += this.matrix.n21 * distance;
		this.position.z += this.matrix.n31 * distance;

	};

	this.translateY = function ( distance ) {

		this.position.x += this.matrix.n12 * distance;
		this.position.y += this.matrix.n22 * distance;
		this.position.z += this.matrix.n32 * distance;

	};

	this.translateZ = function ( distance ) {

		this.position.x -= this.matrix.n13 * distance;
		this.position.y -= this.matrix.n23 * distance;
		this.position.z -= this.matrix.n33 * distance;

	};


	this.rotateHorizontally = function ( amount ) {

		// please note that the amount is NOT degrees, but a scale value

		xTemp.set( this.matrix.n11, this.matrix.n21, this.matrix.n31 );
		xTemp.multiplyScalar( amount );

		this.forward.subSelf( xTemp );
		this.forward.normalize();

	};

	this.rotateVertically = function ( amount ) {

		// please note that the amount is NOT degrees, but a scale value

		yTemp.set( this.matrix.n12, this.matrix.n22, this.matrix.n32 );
		yTemp.multiplyScalar( amount );

		this.forward.addSelf( yTemp );
		this.forward.normalize();

	};

	function onKeyDown( event ) {

		switch( event.keyCode ) {

			case 38: /*up*/
			case 87: /*W*/ thrustDir = 1; break;

			case 37: /*left*/
			case 65: /*A*/ doRoll = true; rollDirection = 1; break;

			case 40: /*down*/
			case 83: /*S*/ thrustDir = -1; break;

			case 39: /*right*/
			case 68: /*D*/ doRoll = true; rollDirection = -1; break;

		}

	};

	function onKeyUp( event ) {

		switch( event.keyCode ) {

			case 38: /*up*/
			case 87: /*W*/ thrustDir = 0; break;

			case 37: /*left*/
			case 65: /*A*/ doRoll = false; sideSpeed = 0; break;

			case 40: /*down*/
			case 83: /*S*/ thrustDir = 0; break;

			case 39: /*right*/
			case 68: /*D*/ doRoll = false; sideSpeed = 0; break;

			case 82: /*R*/ upSpeed = 0; break;
			case 70: /*F*/ upSpeed = 0; break;

		}

	};

	function onMouseMove( event ) {

		mouseX = ( event.clientX - windowHalfX ) / window.innerWidth;
		mouseY = ( event.clientY - windowHalfY ) / window.innerHeight;

	};

	function onMouseDown ( event ) {

		event.preventDefault();
		event.stopPropagation();

		switch ( event.button ) {

			case 0: firePrimary = true; break;
			case 2: fireSecondary = true; break;

		}

	};

	function onMouseUp ( event ) {

		event.preventDefault();
		event.stopPropagation();

		switch ( event.button ) {

			case 0: firePrimary = false; break;
			case 2: fireSecondary = false; break;

		}

	};

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );

	this.domElement.addEventListener( 'mousemove', onMouseMove, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mouseup', onMouseUp, false );
	this.domElement.addEventListener( 'keydown', onKeyDown, false );
	this.domElement.addEventListener( 'keyup', onKeyUp, false );

};


THREE.Ship.prototype = new THREE.Mesh();
THREE.Ship.prototype.constructor = THREE.Ship;
THREE.Ship.prototype.supr = THREE.Mesh.prototype;


