/**
 * @author carlos8f / http://s8f.org/
 */

THREE.Ship = function ( geometry, material ) {

	THREE.Mesh.call( this, geometry, material );

  this.travelLocation = new THREE.Vector3();

  this.thrust = 0;
  this.maxSpeed = 2; // 2/sec
  this.acceleration = 0.5; // speed/sec

  this.lastUpdate = -1;
	this.delta = 0;

  var tmpDirection = new THREE.Vector3();

  this.update = function( parentMatrixWorld, forceUpdate, camera ) {

    var now = new Date().getTime();
		if ( this.lastUpdate == -1 ) this.lastUpdate = now;
		this.delta = ( now - this.lastUpdate ) / 1000;
		this.lastUpdate = now;

    this.followTarget();

    // call supr
		this.supr.update.call( this, parentMatrixWorld, forceUpdate, camera );

  };

  this.followTarget = function() {

    tmpDirection.sub( this.travelLocation, this.position );
    var length = tmpDirection.length();
    
    if ( !length ) {
      
      return;
      
    }

    if ( length > 10 ) {

      this.thrust += this.acceleration * this.delta;

    }
    else {

      this.thrust -= this.acceleration * this.delta;

    }

    this.thrust = constrain( this.thrust, 0, 1 );

    tmpDirection.multiplyScalar( this.thrust * this.maxSpeed * this.delta );
    this.position.addSelf( tmpDirection );
    plane.position.addSelf( tmpDirection );

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

};


THREE.Ship.prototype = new THREE.Mesh();
THREE.Ship.prototype.constructor = THREE.Ship;
THREE.Ship.prototype.supr = THREE.Mesh.prototype;
