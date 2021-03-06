var lightPositions=[
	[12.799999999999999, 69.14646301269532, -10.7],

	[24.5, 69.44646301269532, -6],
	[24.5, 56.6, -6],
	[24.5, 43, -6],
];
var segments=[
	[1,2,3,4,5,6],
	[1,2],
	[6,1,0,4,3],
	[6,1,0,3,2],
	[1,2,0,5],
	[6,3,0,5,2],
	[6,5,4,3,2,0],
	[6,1,2],
	[1,2,3,4,5,6,0],
	[3,2,1,6,5,0],
	[0]
];

var container=document.querySelector('#_3d'),
	canvas = container.querySelector('canvas'),
	speedDiv = container.querySelector('.speed'),
	forceDiv = container.querySelector('.force'),
	powerDiv = container.querySelector('.power');
var renderer =new THREE.WebGLRenderer( {alpha:true, antialias: true, canvas:canvas } );
var lookAt, targZoom;

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 45, 1, 10, 2000 );
//renderer.shadowMap.type = THREE.PCFSoftShadowMap;//BasicShadowMap;
//camera.zoom=1.2;

renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMappingExposure=2.35;

(window.onresize = function () {
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	camera.aspect = canvas.width / canvas.height;
	camera.zoom=Math.min(1, camera.aspect);
	camera.updateProjectionMatrix();
} )();

var loaded1, loaded2, paused, telOpacity, tex0,
	animation= {
		stage: 0,
		setStage: function(val){
			animation.stage=Math.max(val, animation.stage);
			if (val==animation.stage) console.log('stage:', animation.stage);
			else console.warn(val,'<',animation.stage)
		},
		step: function(stage, cond) {
			if (animation.stage!=stage-1) return false;
			if (cond) ++animation.stage;// console.log('stage:', )
			return cond;
		}
	};

new THREE.RGBELoader()
 .setDataType( THREE.UnsignedByteType )
 //.setPath( 'textures/equirectangular/' )
 .load( 'pedestrian_overpass_1k.hdr', function ( texture ) {

	var envMap = pmremGenerator.fromEquirectangular( texture ).texture;

	scene.environment = envMap;

	tex0=texture//.dispose();
	pmremGenerator.dispose();
	loaded2=true;
})

// scene.environment = new THREE.CubeTextureLoader()
// .setPath( 'images/' ).load( [
// 	'posx.jpg', 'negx.jpg',
// 	'posy.jpg', 'negy.jpg',
// 	'posz.jpg', 'negz.jpg'
//  ],
//  function(){loaded2=true} );

var pmremGenerator = new THREE.PMREMGenerator( renderer );
pmremGenerator.compileEquirectangularShader();
var loader = new THREE.GLTFLoader();

var dracoLoader = new THREE.DRACOLoader();
dracoLoader.setDecoderPath( 'js/' );
dracoLoader.preload();
loader.setDRACOLoader( dracoLoader );

var mGun, fan, display, digits=[0, [],[],[],[]],
 speedPos=vec3(), forcePos=vec3(), powerPos,
 dMaterial=new THREE.MeshBasicMaterial({color: '#1118ff'}),
 inner=new THREE.MeshBasicMaterial({color:0, side:1}),
 inner2=new THREE.MeshBasicMaterial({color:0, side:2}),
 header = new THREE.Group(),
 mColor=new THREE.Color('#247'),
 lColor=new THREE.Color('#ccb'),
 mY={value: -90},
 mAttenuation={value: 1},
 lAttenuation={value: .03};

scene.rotation.y=1.1844;//1.8;

loader.load( 'm_gun.glb', function ( obj ) {

	dracoLoader.dispose();

	scene.add(mGun=obj.scene.getObjectByName('M_gun'));

	fan=scene.getObjectByName('Fan');
	mGun.scale.multiplyScalar(10);
	mGun.position.y=-.7;//-6;//
	//mGun.rotation.y=.04;

	mGun.traverse(o=>{if (o.isMesh) {

		o.material.side=0;

		var isLamp=(o.name=='Lamp');

		o.material.onBeforeCompile = function(sh){
			sh.uniforms.color={value: isLamp?lColor:mColor};
			sh.uniforms.attenuation=isLamp?lAttenuation:mAttenuation;
			sh.uniforms.mY=mY;
			sh.vertexShader='varying float vY;\n'+sh.vertexShader.replace('}', '	vY=worldPosition.y;\n}');

			sh.fragmentShader='varying float vY;\nuniform vec3 color;\nuniform float mY, attenuation;\n'
			 +sh.fragmentShader.replace('}',
			 	'	gl_FragColor+=vec4(color,.2)*(1./(pow2(mY-vY-10.)*attenuation+1.)'+
			 	'+1./(pow2(mY-vY)*attenuation+1.)+1./(pow2(mY-vY+10.)*attenuation+1.));\n}');
			//if (isLamp) console.log(sh.fragmentShader)
		}
		if (isLamp) {
			o.material.emissive.set('#020203');
			o.material.color.set('#07090b');
			o.material.metalness=.98;
		}

		if (/Glass/.test(o.name)) {
			o.material=new THREE.MeshPhysicalMaterial(o.material);
			o.material.defines.PHYSICAL='';
			o.material.transparent=true;
			o.material.transparency=.9;
			o.material.color.multiplyScalar(6);
			o.material.envMapIntensity=1.5;
		}
		if (/(Display)|(Inner)/.test(o.name)) {
			o.material=inner2;
		}
		if (/(Digit)|(Power)/.test(o.parent.name+o.name)) {
			//o.renderOrder=2;
			o.material=dMaterial;

			o.updateWorldMatrix(true);

			var match=o.name.match(/^\d/);

			if (match) {
				let digit=o.parent.name.replace('Digit', '')
				digits[digit][match[0]]=o;
				o.visible=false;

				if (match==3) (/1|2/.test(digit)?speedPos:forcePos).add(o.localToWorld(o.geometry.boundingSphere.center.clone()))
			} else{
				powerPos=o.localToWorld(o.geometry.boundingSphere.center.clone());
			}
			//console.log(o.geometry.boundingSphere.center.toArray())
		}

		o.geometry.computeVertexNormalsFine();
		o.material.flatShading=false;
		//o.material.side=0;

	}});
	mGun.worldToLocal(speedPos.multiplyScalar(.5));
	mGun.worldToLocal(forcePos.multiplyScalar(.5));
	mGun.worldToLocal(powerPos);

	mGun.add(header);

	header.add(scene.getObjectByName('sphere'), scene.getObjectByName('Pin')); //, scene.getObjectByName('Patron')

	[
		scene.getObjectByName('Back'),
		scene.getObjectByName('Main'),
		scene.getObjectByName('Top')
		//scene.getObjectByName('Bottom'),
	].forEach(o=>{
		var obj=o.clone();
		obj.material=inner;
		obj.renderOrder=1;
		mGun.add(obj);
	});

	//var lights=new THREE.Group();

	var light=new THREE.DirectionalLight('#fff', .3);
	light.position.set(-5.7,6,-7);
	scene.add(light);

	scene.add(new THREE.HemisphereLight('#abc', '#543', 1));
	light=new THREE.PointLight('#fff', 0.01, 0, 1.5);
	//light.position.position.set;
	scene.add(light);

	oControls=new THREE.OrbitControls(camera, renderer.domElement);
	//oControls.target.set(0,80.8,0);

	var k=.002, k0=.02,
	 hidePhone, targDistance,
	 tMax=100, tCor=20, // 1000ms / 50fps
	 t0=performance.now(), t1=t0;

	//oControls.update;
	//oControls.enableDamping=true;
	oControls.autoRotate=true;
	//oControls.minDistance=220;

	oControls.update();
	 
	var pos0=camera.position.set(300,700,-650).clone();
	var m9=0, targM9=0, targZoom=2.2, rotation=0;
	var targPos0 = vec3(-42, 10, 0), 
		targPos=vec3(59, 10, 5),//targPos0.clone(),//
		axis=vec3(-.3,1,0).normalize(),
		velocity=-1, force=-1, targV, targF;

	scene.add(camera);

	(animation.reset=function() {
			oControls.autoRotateSpeed=0;
			animation.stage=0;
			k=k0;
			targY=-6;
			//m9=0;
			targZoom=.167;
			oControls.minDistance=0;
			container.classList.remove('typewriter');
			console.log('reset');
			//velocity=force=-1;
	})();
	//container.classList.add('typewriter');

	var battery = container.querySelector('.b div');
	//battery.onanimationiteration=//function(){mY.value=-90};
	battery.onanimationstart=function(){mY.value=-55};
	container.addEventListener('transitionstart', function(e){
		//if (!this.classList.contains('visible')) return;
		//console.log(e);
		if (e.target.classList.contains('speed')) {
			//velocity=-0.9;
			targV=12.5+Math.random()*25;
		}
		if (e.target.classList.contains('force')) {
			targF=45.5+Math.random()*31;
			//force=-0.9
		}
	})

	requestAnimationFrame(function animate(){

		requestAnimationFrame(animate);

		if (paused || !loaded1 || !loaded2) return;
		//paused=true;
		var now=performance.now(),
		 dt=Math.min(tMax, now-t0),
		 tScale=dt/tCor;

		t0=now;
		t1+=dt;

		fan.rotation.y+=.32*tScale;
		header.position.x=1.5*Math.sin(t1/23)-1.2;

		var deltaPos=targPos.clone().sub(camera.position),
			dl=deltaPos.lengthSq(), deltaTarg, angle;

		mY.value+=.24*(Math.abs(mY.value-5)/19+.65)*tScale;

		if (animation.stage>0){
			if (k<k0) k+=.00025*tScale;
			mGun.scale.x+=(targZoom-mGun.scale.x)*k*tScale;
			//mGun.position.y+=(targY-mGun.position.y)*k;
			//camera.updateProjectionMatrix();
			mGun.scale.y=mGun.scale.z=mGun.scale.x;
		}
		m9+=(targM9-m9)*k*tScale;
		camera.projectionMatrix.elements[9]=m9*camera.zoom*camera.zoom*camera.zoom;

		if (!oControls.autoRotateSpeed) camera.position.add(deltaPos.multiplyScalar(k0*tScale))//(animation.stage>1?k:k0)
		 .add(deltaPos.cross(camera.up).multiplyScalar(2));

		if (animation.stage>1){// && m9<.55
			targPos.applyAxisAngle(axis, tScale*k*k*60);
			if (t1>10000 && targPos.x<13 && targPos.z<0 && k>.01) animation.reset();
			if (animation.step(3, t1>1000)) container.classList.add('battery');
			if (animation.step(4, t1>4000)) container.classList.add('typewriter');
			if (animation.step(5, t1>6800)) container.classList.remove('battery');
			if (animation.step(6, mY.value>28)) mY.value=-55;
			//if (animation.step(7, t1>7000)) velocity=force=-1;
			//if (animation.step(7, t1>9500)) container.classList.remove('typewriter');
			
		}
		//animation.step(3, targPos.z>40);

		if (animation.stage<2){
			targPos.lerp(targPos0, k0*tScale);
			if (t1>7500) container.classList.remove('visible');
		}
		if (animation.stage>=1){
			if (targV) velocity+=(targV-velocity)*tScale*.35/targV;
			if (targF) force+=(targF-force)*tScale*.5/targF;
		}

		if (animation.step(1, camera.position.manhattanDistanceTo(mGun.position)<78)) {
			container.classList.remove('typewriter');
			targM9=.8;
			container.classList.add('visible');
			k=0.00001;
			t1=0;
		}
		if (animation.step(2, t1>10000)) {
			t1=0;
			targZoom=.115;
			targM9=0;
			//mY.value=-250;
			rotation+=Math.PI*2;
			//targPos=();
			//oControls.minDistance=44;
			k=0.00001;
		}


		//var velocity = 5.5*(1+Math.sin(now/2000))+5;
		setDigit(1, Math.floor(velocity/10));
		setDigit(2, Math.floor(velocity%10));

		//var force = 4.5*(1+Math.cos(now/2000))+76;
		setDigit(3, Math.floor(force/10));
		setDigit(4, Math.floor(force%10));

		oControls.update();

		renderer.render( scene, camera );

		var scrPos=mGun.localToWorld(speedPos.clone()).project(camera).multiply(vec3(innerWidth/2, -innerHeight/2, 1));
		speedDiv.style.transform='translate('+scrPos.x.toFixed(1)+'px, '+scrPos.y.toFixed(1)+'px)';

		scrPos=mGun.localToWorld(forcePos.clone()).project(camera).multiply(vec3(innerWidth/2, -innerHeight/2, 1));
		forceDiv.style.transform='translate('+scrPos.x.toFixed(1)+'px, '+scrPos.y.toFixed(1)+'px)';

		scrPos=mGun.localToWorld(powerPos.clone()).project(camera).multiply(vec3(innerWidth/2, -innerHeight/2, 1));
		powerDiv.style.transform='translate('+scrPos.x.toFixed(1)+'px, '+scrPos.y.toFixed(1)+'px)';
	})

	if (loaded2) renderer.domElement.style.opacity=1;
	loaded1=true;
} );

function setDigit(digit, value) {
	if (value<0) value=10;
	if (!digits[digit] || digits[digit].value===value) return;
	digits[digit].value=value;
	digits[digit].forEach(function(seg, i){
		seg.visible=false;
	});
	(segments[value]||[]).forEach(function(seg, i){
		digits[digit][seg].visible=true;
	})
}

