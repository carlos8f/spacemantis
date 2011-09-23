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

	this.movementSpeed = 1;

  this.domElement = document;

	// disable default camera behavior
	this.useTarget = false;
	this.matrixAutoUpdate = false;

	this.lastUpdate = -1;
	this.delta = 0;

  this.thrust = 0;
	var thrustDir = 0;

	// custom update

	this.update = function( parentMatrixWorld, forceUpdate, camera ) {

		var now = new Date().getTime();

		if ( this.lastUpdate == -1 ) this.lastUpdate = now;

		this.delta = ( now - this.lastUpdate ) / 1000;
		this.lastUpdate = now;

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

    this.thrust = constrain( thrust, -1, 1 );

		

		// call supr
		this.supr.update.call( this, parentMatrixWorld, forceUpdate, camera );

	};

  function constrain( scalar, min, max ) {

    if ( scalar > max ) {

      return max;

    }
    else if ( scalar < min ) {

      return min;

    }

    return scalar;

  }

	function onKeyDown( event ) {

		switch( event.keyCode ) {

			case 38: /*up*/
			case 87: /*W*/ thrustDir = 1; break;

			case 40: /*down*/
			case 83: /*S*/ thrustDir = -1; break;

		}

	};

	function onKeyUp( event ) {

		switch( event.keyCode ) {

			case 38: /*up*/
			case 87: /*W*/ thrustDir = 0; break;

			case 40: /*down*/
			case 83: /*S*/ thrustDir = 0; break;

		}

	};

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'keydown', onKeyDown, false );
	this.domElement.addEventListener( 'keyup', onKeyUp, false );
};


THREE.Ship.prototype = new THREE.Mesh();
THREE.Ship.prototype.constructor = THREE.Ship;
THREE.Ship.prototype.supr = THREE.Mesh.prototype;


