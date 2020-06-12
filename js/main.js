var scrImg,//='GALAXY_S20_screen.jpg',
	scrLogo='samsung.svg',
	scrVideo='surf.mp4';

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
	[3,2,1,6,5,0]
]


var container=document.querySelector('#_3d'),
	canvas = container.querySelector('canvas'),
	speedDiv = container.querySelector('.speed'),
	forceDiv = container.querySelector('.force'),
	powerDiv = container.querySelector('.power');
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
			 	'	gl_FragColor+=vec4(color,.2)*(1./(pow2(mY-vY-10.5)*attenuation+1.)'+
			 	'+1./(pow2(mY-vY)*attenuation+1.)+1./(pow2(mY-vY+10.5)*attenuation+1.));\n}');
			//if (isLamp) console.log(sh.fragmentShader)
		}
		if (isLamp) {
			o.material.emissive.set('#030404');
			o.material.color.set('#030608');
			o.material.metalness=.97;
		}

		if (/Glass/.test(o.name)) {
			o.material=new THREE.MeshPhysicalMaterial(o.material);
			o.material.defines.PHYSICAL='';
			o.material.transparent=true;
			o.material.transparency=.9;
			o.material.color.multiplyScalar(6)
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

	header.add(scene.getObjectByName('sphere'), scene.getObjectByName('Patron'));

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
	 
	var pos0=camera.position.set(1100,400,-150).clone();
	var m9=0, targM9=0, targZoom=2.2, rotation=0;
	var targPos0 = vec3(-42, 10, 0), 
		targPos=vec3(120, 250, -50);//targPos0.clone(),
		axis=vec3(-.3,1,0).normalize();

	scene.add(camera);

	(animation.reset=function() {
			oControls.autoRotateSpeed=0;
			animation.stage=0;
			k=k0;
			targY=-6;
			//m9=0;
			targZoom=.167;
			oControls.minDistance=0;
			console.log('reset');
	})();
	
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
		var deltaPos=targPos.clone().sub(camera.position),
			dl=deltaPos.lengthSq(), deltaTarg, angle;

		mY.value+=.22*(Math.abs(mY.value-5)/19+.64)*tScale;

		if (animation.stage>0){
			if (k<k0) k+=.00025*tScale;
			mGun.scale.x+=(targZoom-mGun.scale.x)*k*tScale;
			//mGun.position.y+=(targY-mGun.position.y)*k;
			//camera.updateProjectionMatrix();
			mGun.scale.y=mGun.scale.z=mGun.scale.x;
		}
		m9+=(targM9-m9)*k*tScale;
		camera.projectionMatrix.elements[9]=m9*camera.zoom*camera.zoom;

		if (!oControls.autoRotateSpeed) camera.position.add(deltaPos.multiplyScalar(k0*tScale))//(animation.stage>1?k:k0)
		 .add(deltaPos.cross(camera.up).multiplyScalar(2));

		if (animation.stage==2){// && m9<.55
			targPos.applyAxisAngle(axis, tScale*k*k*60)
			if (targPos.x<13 && targPos.z<0 && k>.01) animation.reset()
		}
		//animation.step(3, targPos.z>40);

		if (animation.stage<2){
			targPos.lerp(targPos0, k0*tScale);
			if (t1>9000) container.classList.remove('visible');
		}

		if (animation.step(1, camera.position.manhattanDistanceTo(mGun.position)<85)) {
			targM9=.8;
			container.classList.add('visible');
			k=0.00001;
			t1=0;
		}
		if (animation.step(2, t1>10000)) {
			targZoom=.115;
			targM9=0;
			mY.value=-190;
			rotation+=Math.PI*2;
			//targPos=();
			//oControls.minDistance=44;
			k=0.00001;
		}


		var velosity = 5.5*(1+Math.sin(now/2000))+5;
		setDigit(1, Math.floor(velosity/10));
		setDigit(2, Math.floor(velosity%10));

		var force = 4.5*(1+Math.cos(now/2000))+76;
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
	if (!digits[digit] || digits[digit].value===value) return;
	digits[digit].value=value;
	digits[digit].forEach(function(seg, i){
		seg.visible=false;
	});
	(segments[value]||[]).forEach(function(seg, i){
		digits[digit][seg].visible=true;
	})
}

