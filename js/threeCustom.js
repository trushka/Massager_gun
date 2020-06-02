var vec3=function(x,y,z) {return new THREE.Vector3(x,y,z)};

THREE.BufferGeometry.prototype.computeVertexNormalsFine = function () {

	var index = this.index;
	var attributes = this.attributes;

	if ( attributes.position ) {

		if ( index ) {

			var positions = attributes.position.array;

			if ( attributes.normal === undefined ) {

				this.setAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( positions.length ), 3 ) );

			} else {

				// reset existing normals to zero

				var array = attributes.normal.array;

				for ( var i = 0, il = array.length; i < il; i ++ ) {

					array[ i ] = 0;

				}

			}

			var normals = attributes.normal.array;
			var indices = index.array;

			var vA, vB, vC,  a, b, c;
			var pA = new vec3(), pB = new vec3(), pC = new vec3();
			var cb = new vec3(), ab = new vec3(), ac = new vec3();

			indices.forEach (function( el, i ) {
				if (i%3) return;

				vA = indices[ i + 0 ] * 3;
				vB = indices[ i + 1 ] * 3;
				vC = indices[ i + 2 ] * 3;

				pA.fromArray( positions, vA );
				pB.fromArray( positions, vB );
				pC.fromArray( positions, vC );

				cb.subVectors( pC, pB );
				ab.subVectors( pA, pB );
				ac.subVectors( pA, pC );

				a=ab.angleTo(ac);
				b=ab.angleTo(cb);
				c=Math.PI-a-b;

				cb.cross( ab );

				normals[ vA ] += cb.x*a;
				normals[ vA + 1 ] += cb.y*a;
				normals[ vA + 2 ] += cb.z*a;

				normals[ vB ] += cb.x*b;
				normals[ vB + 1 ] += cb.y*b;
				normals[ vB + 2 ] += cb.z*b;

				normals[ vC ] += cb.x*c;
				normals[ vC + 1 ] += cb.y*c;
				normals[ vC + 2 ] += cb.z*c;

			})

			this.normalizeNormals();

			attributes.normal.needsUpdate = true;

		} else {
			console.warn('indexed only!');
			this.computeVertexNormals()
		}

	}

}