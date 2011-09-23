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

THREE.FollowCamera = function ( fov, aspect, near, far, target, cameraDistance, minDistance, maxDistance ) {

	THREE.Camera.call( this, fov, aspect, near, far, target );

  var mouseDragStart = new THREE.Vector3();
  var mouseDragCurrent = new THREE.Vector3();
  var leftClicking = false;
  var rightClicking = false;
  var thetaX = 0;
  var thetaY = -2.5;
  var thetaXOffset = 0;
  var thetaYOffset = -2.5;
  cameraDistance = cameraDistance || 16;
  minDistance = minDistance || 10;
  maxDistance = maxDistance || 40;

	// custom update

	this.update = function( parentMatrixWorld, forceUpdate, camera ) {
    
    if ( forceUpdate || this.matrixWorldNeedsUpdate ) {

      this.position.x = -cameraDistance * Math.sin( thetaX * Math.PI / 360 );
		  this.position.z = cameraDistance * Math.cos( thetaX * Math.PI / 360 );
      this.position.y = -20 * cameraDistance * Math.sin( thetaY * Math.PI / 360 );

      this.position.addSelf( this.target.position );

      this.updateMatrix();
			this.matrix.lookAt( this.position, this.target.position, this.up );
      
      this.matrixWorld.copy( this.matrix );

      this.matrixWorldNeedsUpdate = false;
			forceUpdate = true;

			THREE.Matrix4.makeInvert( this.matrixWorld, this.matrixWorldInverse );

    }

    // update children

    for ( var i = 0; i < this.children.length; i ++ ) {

      this.children[ i ].update( this.matrixWorld, forceUpdate, camera );

    }

	};

  function onDocumentMouseDown( event ) {

		event.preventDefault();

    switch ( event.button ) {
      case 0: leftClicking = true; break;
      case 2: rightClicking = true; break;
    }

    mouseDragStart.x = mouseDragCurrent.x = constrain( ( event.clientX / window.innerWidth ) * 2 - 1, -1.0, 1.0 );
    mouseDragStart.y = mouseDragCurrent.y = constrain( - ( event.clientY / window.innerHeight ) * 2 + 1, -1.0, 1.0 );

  }

  function onDocumentMouseUp( event ) {

		event.preventDefault();

    switch ( event.button ) {
      case 0: leftClicking = false; break;
      case 2: rightClicking = false; break;
    }

    thetaXOffset = thetaX;
    thetaYOffset = thetaY;

  }

  function onDocumentMouseMove( event ) {

    event.preventDefault();

    if ( leftClicking ) {

      mouseDragCurrent.x = constrain( ( event.clientX / window.innerWidth ) * 2 - 1, -1.0, 1.0 );
      mouseDragCurrent.y = constrain( - ( event.clientY / window.innerHeight ) * 2 + 1, -1.0, 1.0 );

      thetaX = constrain( thetaXOffset + (mouseDragCurrent.x - mouseDragStart.x) * 360, -360, 360 );
      thetaY = constrain( thetaYOffset + (mouseDragCurrent.y - mouseDragStart.y) * 10, -10, 10 );
      
    }

  }

  function onDocumentScroll( event ) {

    event.preventDefault();

    cameraDistance -= event.wheelDelta / 60;
    cameraDistance = constrain( cameraDistance, minDistance, maxDistance );
    
  }

  function constrain ( scalar, min, max ) {

    if ( scalar > max ) {

      return max;

    }
    else if ( scalar < min ) {

      return min;

    }

    return scalar;

  }

  document.addEventListener( 'mousedown', onDocumentMouseDown, false );
  document.addEventListener( 'mouseup', onDocumentMouseUp, false );
  document.addEventListener( 'mousemove', onDocumentMouseMove, false );
  document.addEventListener( 'mousewheel', onDocumentScroll, false );

};


THREE.FollowCamera.prototype = new THREE.Camera();
THREE.FollowCamera.prototype.constructor = THREE.FollowCamera;
THREE.FollowCamera.prototype.supr = THREE.Camera.prototype;


