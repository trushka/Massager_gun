var scrImg,//='GALAXY_S20_screen.jpg',
	scrLogo='samsung.svg',
	scrVideo='surf.mp4';

var lightPositions=[
	[12.799999999999999, 69.14646301269532, -10.7],

	[24.5, 69.44646301269532, -6],
	[24.5, 56.6, -6],
	[24.5, 43, -6],
];


var container=document.querySelector('#_3d'), canvas = container.firstChild;
var renderer =new THREE.WebGLRenderer( {alpha:true, antialias: true, canvas:canvas } );
var lookAt, targZoom;
var scrMap=new THREE.TextureLoader().load(scrImg||'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');
var scrMap1=new THREE.TextureLoader().load(scrLogo);
scrMap1.repeat.set(.8, .8);
scrMap1.offset.set(.5, .5);
scrMap.offset.set(.5, .5);

var video=document.createElement('video'),
	vMap = new THREE.VideoTexture(video);
video.oncanplay=function(){
	video.play();
	vMap.repeat.x=video.videoHeight/video.videoWidth
	vMap.offset.set(.5, .5)
}
video.muted=true;
video.src=scrVideo;

//scrMap1.flipY=scrMap.flipY=false;

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 45, 1, 10, 2000 );
//renderer.shadowMap.type = THREE.PCFSoftShadowMap;//BasicShadowMap;
//camera.zoom=1.2;

renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMappingExposure=2.35;

scrMap.anisotropy=scrMap1.anisotropy=renderer.getMaxAnisotropy();

(window.onresize = function () {
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	camera.aspect = canvas.width / canvas.height;
	camera.updateProjectionMatrix();
} )();

var loaded1, loaded2, paused, telOpacity,
	animation= {
		stage: 0,
		setStage: function(val){
			animation.stage=Math.max(val, animation.stage);
			if (val==animation.stage) console.log('stage:', animation.stage);
			else console.warn(val,'<',animation.stage)
		},
		step: function(old, cond) {
			if (animation.stage!=old) return false;
			if (cond) console.log('stage:', ++animation.stage)
			return cond;
		}
	};

new THREE.RGBELoader()
 .setDataType( THREE.UnsignedByteType )
 //.setPath( 'textures/equirectangular/' )
 .load( 'pedestrian_overpass_1k.hdr', function ( texture ) {

	var envMap = pmremGenerator.fromEquirectangular( texture ).texture;

	scene.environment = envMap;

	texture.dispose();
	pmremGenerator.dispose();
	loaded2=true;
})

var pmremGenerator = new THREE.PMREMGenerator( renderer );
pmremGenerator.compileEquirectangularShader();
var loader = new THREE.GLTFLoader();

var dracoLoader = new THREE.DRACOLoader();
dracoLoader.setDecoderPath( 'js/' );
loader.setDRACOLoader( dracoLoader );
var mGun, fan, display,
 dMaterial=new THREE.MeshBasicMaterial({
 	color: '#123',
 	transparent: true,
 	blending: 2
 }),
 header = new THREE.Group();
loader.load( 'm_gun.glb', function ( obj ) {

	scene.add(mGun=obj.scene.getObjectByName('M_gun'));

	fan=scene.getObjectByName('Fan');
	mGun.scale.multiplyScalar(10);
	mGun.position.y=-.7;

	mGun.traverse(o=>{if (o.isMesh) {

		if (/Glass/.test(o.name)) {
			o.renderOrder=1;
			o.material.depthWrite=false;
		}
		if (/(Digit)|(Power)/.test(o.parent.name+o.name)) {
			o.renderOrder=2;
			o.material=dMaterial
		}

		o.geometry.computeVertexNormalsFine();
		o.material.flatShading=false;
		//o.material.side=0;

	}});
	mGun.add(header);

	header.add(scene.getObjectByName('sphere'), scene.getObjectByName('Patron'));

	// var screen=scene.getObjectByName('screen')
	// screen.material = new THREE.MeshBasicMaterial({
	// 	map: scrMap, color: '#fff',
	// 	onBeforeCompile: function(sh){
	// 		sh.vertexShader=sh.vertexShader.replace('#include <uv_vertex>',
	// 			'vUv = ( uvTransform * vec3( (position.xy+vec2(0., -2.5))/156., 1 ) ).xy;');
	// 		console.log(sh)
	// 	}
	// });
	// screen.material.color.multiplyScalar(1.1);
	// screen.material.toneMapped=false;//encoding=3007;

	// scene.getObjectByName('glass_F').renderOrder=3;

	var light=new THREE.DirectionalLight('#fff', .3);
	light.position.set(-5.7,6,-7);
	scene.add(light);

	scene.add(new THREE.HemisphereLight('#abc', '#543', 1));
	light=new THREE.PointLight('#fff', 0.01, 0, 1.5);
	//light.position.position.set;
	scene.add(light);

	oControls=new THREE.OrbitControls(camera, renderer.domElement);
	//oControls.target.set(0,80.8,0);

	var k0=.02, k=.025,
	 hidePhone, targDistance,
	 t0=performance.now(), tCor=20, // 1000ms / 50fps
	 tMax=100;

	//oControls.update;
	//oControls.enableDamping=true;
	//oControls.autoRotate=true;
	oControls.autoRotateSpeed=8;
	//oControls.minDistance=220;

	oControls.update();
	 targPos = vec3(-42, 11, 0);
	var pos0=camera.position.set(300,700,-650).clone();

	scene.add(camera);
	scene.rotation.y=1.8;
	
	requestAnimationFrame(function animate(){

		requestAnimationFrame(animate);

		if (paused || !loaded1 || !loaded2) return;
		//paused=true;
		var now=performance.now(),
		 dt=Math.min(tMax, now-t0),
		 tScale=dt/tCor;

		t0=now;

		fan.rotation.y+=.35*tScale;
		var deltaPos=targPos.clone().sub(camera.position),
			dl=deltaPos.lengthSq(), deltaTarg, angle;

		//if (k<k0) k+=.0002;
		if (!oControls.autoRotate || animation.stage>6)
		 camera.position.add(deltaPos.multiplyScalar(k*tScale)).add(deltaPos.cross(camera.up).multiplyScalar(2));

		oControls.update();

		renderer.render( scene, camera );

		//prevTime = time;

	})
	if (loaded2) renderer.domElement.style.opacity=1;
	loaded1=true;
} );
