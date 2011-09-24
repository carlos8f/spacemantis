/**
 * @author carlos8f / http://s8f.org/
 */

THREE.Ship = function ( geometry, material ) {

	THREE.Mesh.call( this, geometry, material );

  this.travelLocation = new THREE.Vector3();

  this.speed = 0;
  this.maxSpeed = 2;

  var tmpDirection = new THREE.Vector3();

  this.update = function( parentMatrixWorld, forceUpdate, camera ) {

    this.followTarget();

    // call supr
		this.supr.update.call( this, parentMatrixWorld, forceUpdate, camera );

  };

  this.followTarget = function() {

    tmpDirection.sub( this.travelLocation, this.position );
    var length = tmpDirection.length();

    if ( length > this.maxSpeed ) {

      tmpDirection.normalize().multiplyScalar( this.maxSpeed );

      this.position.addSelf( tmpDirection );
    }
    else {
      
      tmpDirection.normalize().multiplyScalar( length );
      this.position.addSelf( tmpDirection );

    }

  };

};


THREE.Ship.prototype = new THREE.Mesh();
THREE.Ship.prototype.constructor = THREE.Ship;
THREE.Ship.prototype.supr = THREE.Mesh.prototype;
