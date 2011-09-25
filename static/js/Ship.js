/**
 * @author carlos8f / http://s8f.org/
 */

THREE.Ship = function ( geometry, material ) {

	THREE.Mesh.call( this, geometry, material );

  this.travelPosition = new THREE.Vector3();

};


THREE.Ship.prototype = new THREE.Mesh();
THREE.Ship.prototype.constructor = THREE.Ship;
THREE.Ship.prototype.supr = THREE.Mesh.prototype;
