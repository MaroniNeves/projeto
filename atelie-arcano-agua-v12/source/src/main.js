import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/** Ateliê Arcano V12 · acqua 3D + original procedural PNG sprites.
 * Isolated WebGL2 renderer. No purchased or unlicensed assets.
 * Inspired by the techniques in boona13's MIT 3D water shader (not copied).
 */
const $ = id => document.getElementById(id);
const diag = s => { $('diag').textContent = String(s); };
window.addEventListener('error', e => diag('Erro de script: '+e.message));
window.addEventListener('unhandledrejection', e => diag('Falha: '+(e.reason?.message||e.reason)));
const canvas = $('stage');
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();diag('Contexto WebGL perdido. Feche outras abas 3D e recarregue.');});
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.12));
renderer.setSize(innerWidth,innerHeight,false);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.06;
const scene=new THREE.Scene();scene.background=new THREE.Color('#293e48');scene.fog=new THREE.FogExp2('#293e48',.025);
const camera=new THREE.PerspectiveCamera(47,innerWidth/innerHeight,.1,130);camera.position.set(11,8.8,14.5);
const controls=new OrbitControls(camera,canvas);controls.target.set(0,.0,0);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=5;controls.maxDistance=35;controls.maxPolarAngle=1.47;controls.minPolarAngle=.18;
scene.add(new THREE.HemisphereLight(0xb7e6f5,0x354238,1.7));
const sun=new THREE.DirectionalLight(0xffe8c1,2.2);sun.position.set(-7,15,6);scene.add(sun);
const rim=new THREE.DirectionalLight(0x94ddeb,.75);rim.position.set(5,5,-12);scene.add(rim);

// Licensed sprite policy: the five textures were procedurally authored for this version.
const load = new THREE.TextureLoader();
const textures = Object.fromEntries(await Promise.all([
 ['rain','rain_streak'],['ring','water_ripple'],['impact','rain_splash'],['foam','shore_foam'],['caustics','water_caustics']
].map(async ([key,file])=>{
 const tex=await load.loadAsync(`./sprites/${file}.png`);
 tex.colorSpace=THREE.SRGBColorSpace;
 if(key==='caustics'||key==='foam'){tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(1,1);}
 return [key,tex];
})));

let seed=32839;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const floorCanvas=document.createElement('canvas');floorCanvas.width=floorCanvas.height=256;
const g=floorCanvas.getContext('2d');g.fillStyle='#4a514a';g.fillRect(0,0,256,256);
for(let i=0;i<7000;i++){const l=Math.round(32+rnd()*34);g.fillStyle=`rgba(${l+22},${l+29},${l+26},${.07+rnd()*.17})`;g.fillRect(rnd()*256,rnd()*256,1+rnd()*3,1+rnd()*3);}
const groundTex=new THREE.CanvasTexture(floorCanvas);groundTex.colorSpace=THREE.SRGBColorSpace;groundTex.wrapS=groundTex.wrapT=THREE.RepeatWrapping;groundTex.repeat.set(5,5);groundTex.anisotropy=2;
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({map:groundTex,roughness:.94,metalness:.02}));floor.rotation.x=-Math.PI/2;floor.position.y=-.067;scene.add(floor);

// Rough environment around water: not part of the effect sprite; actual 3D meshes.
const stones=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.4,0),new THREE.MeshStandardMaterial({color:0x77827d,roughness:1,flatShading:true}),88);
const stoneD=new THREE.Object3D();for(let i=0;i<88;i++){
 const a=rnd()*Math.PI*2,r=6.6+rnd()*6;
 stoneD.position.set(Math.cos(a)*r,-.038,Math.sin(a)*r);
 stoneD.rotation.set(rnd()*.27,a,rnd()*.29);
 stoneD.scale.set(.24+rnd()*1.1,.17+rnd()*.55,.28+rnd()*.8);
 stoneD.updateMatrix();stones.setMatrixAt(i,stoneD.matrix);
}stones.instanceMatrix.needsUpdate=true;scene.add(stones);
const reed=new THREE.InstancedMesh(new THREE.ConeGeometry(.07,.72,5),new THREE.MeshStandardMaterial({color:0x8ca79a,roughness:.95}),108);
const reD=new THREE.Object3D();for(let i=0;i<108;i++){
 const a=(i/108)*Math.PI*2+(rnd()-.5)*.08,r=8.1+rnd()*1.1;
 reD.position.set(Math.cos(a)*r,-.04,Math.sin(a)*r*.70);
 reD.rotation.set((rnd()-.5)*.1,0,(rnd()-.5)*.24);
 reD.scale.set(.5+rnd()*.6,.7+rnd()*1.1,.5+rnd()*.6);
 reD.updateMatrix();reed.setMatrixAt(i,reD.matrix);
}reed.instanceMatrix.needsUpdate=true;scene.add(reed);

const waterVS = /* glsl */`
uniform float uTime; uniform float uWave;
varying vec2 vUV; varying vec3 vP; varying float vHeight;
float h(vec2 p,float t){return .033*sin(p.x*1.6+t*1.0)*cos(p.y*1.7-t*.9)+.020*sin(p.x*3.7+p.y*1.4-t*1.8)+.012*cos(p.y*5.2-t*2.1);}
void main(){vec3 p=position;float w=h(p.xz,uTime)*uWave;p.y+=w;vUV=uv;vP=p;vHeight=w;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}
`;
const waterFS=/* glsl */`
uniform float uTime,uGrow,uSeed,uOpacity,uReflect,uWave,uShore;
uniform vec3 uDeep,uShallow;uniform sampler2D uFoam,uCaustics;
varying vec2 vUV; varying vec3 vP; varying float vHeight;
float h(vec2 p,float t){return .033*sin(p.x*1.6+t*1.0)*cos(p.y*1.7-t*.9)+.020*sin(p.x*3.7+p.y*1.4-t*1.8)+.012*cos(p.y*5.2-t*2.1);}
float clamp01(float v){return clamp(v,0.,1.);}
void main(){
 vec2 p=(vUV-.5)*2.; float a=atan(p.y,p.x);
 float border=1.+.065*sin(a*5.+uSeed)+.075*cos(a*9.-uSeed*1.3)+.028*sin(a*17.+uSeed*2.3)+.018*sin(a*29.-uSeed);
 float radial=length(p/vec2(.99,.91));float radius=max(uGrow,.0001)*border;
 float d=radial/radius;if(d>1.)discard;
 // A narrow alpha falloff conceals the hard clipped edge; foam lives inside the shore.
 float edge=1.-smoothstep(.966,1.0,d);
 float ds=.036; vec2 grad=vec2(h(vP.xz+vec2(ds,0),uTime)-h(vP.xz-vec2(ds,0),uTime), h(vP.xz+vec2(0,ds),uTime)-h(vP.xz-vec2(0,ds),uTime))/(2.*ds);
 float c1=texture2D(uCaustics,vP.xz*.17+vec2(uTime*.018,uTime*.013)).r;
 float c2=texture2D(uCaustics,vP.xz*.23+vec2(-uTime*.011,uTime*.020)).g;
 vec3 n=normalize(vec3(-grad.x*4.1*uWave,1.,-grad.y*4.1*uWave));
 vec3 viewDir=normalize(cameraPosition - (vec3(vP.x,vP.y+.02,vP.z)+vec3(0.)));
 float fresnel=pow(1.-clamp01(dot(n,viewDir)),3.2);
 float depth=pow(clamp01(1.-d),1.28);
 vec3 body=mix(uShallow,uDeep,depth*.9);
 vec3 sky=vec3(.63,.82,.90)+vec3(.22,.12,.04)*clamp01(n.x*.5+n.z*.5);
 float reflection=clamp01(.23+fresnel*.58+uReflect*.15);
 vec3 color=mix(body,sky,reflection);
 float waves=(sin(vP.x*6.4+uTime*1.4)*sin(vP.z*5.8-uTime*.9)+1.)*.5;
 color+=vec3(.035,.095,.101)*waves;
 color+=vec3(.064,.146,.155)*pow(c1*c2,2.)*.72;
 vec3 sunDir=normalize(vec3(-.3,.91,.33));
 float sparkle=pow(max(dot(reflect(-sunDir,n),normalize(vec3(.25,.8,.38))),0.),64.);
 color+=vec3(.23,.24,.20)*sparkle;
 float foamTex=texture2D(uFoam,vP.xz*.35+vec2(uTime*.023,0.)).a;
 float shore=smoothstep(.79,.93,d)*(1.-smoothstep(.977,1.,d));
 float wline=.45+.26*sin(a*17.+uTime*.9)+foamTex*.36;
 color=mix(color,vec3(.83,.97,.95),clamp01(shore*wline*uShore*.63));
 float ring=sin(radial*33.0-uTime*4.1)*.5+.5;
 color+=vec3(.035,.09,.10)*ring*(1.-d)*.3;
 gl_FragColor=vec4(color,clamp01(uOpacity*edge));
}`;
function pool(x,z,w,h,deep,shallow,seed){
 const uniforms={uTime:{value:0},uGrow:{value:0},uWave:{value:1},uSeed:{value:seed},uDeep:{value:new THREE.Color(deep)},uShallow:{value:new THREE.Color(shallow)},uOpacity:{value:.97},uReflect:{value:1},uShore:{value:1},uFoam:{value:textures.foam},uCaustics:{value:textures.caustics}};
 const mat=new THREE.ShaderMaterial({uniforms,vertexShader:waterVS,fragmentShader:waterFS,transparent:true,depthWrite:true,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h,64,48),mat);mesh.geometry.rotateX(-Math.PI/2);mesh.position.set(x,.02,z);mesh.frustumCulled=false;mesh.renderOrder=2;scene.add(mesh);
 return {mesh,mat,x,z,w,h};
}
const lagoon=pool(0,0,16.4,11.6,'#0d4c60','#68b3b7',1.1);
const puddles=[
 pool(-3.2,1.45,3.8,2.6,'#27677b','#90c3c8',.5),
 pool(2.6,.86,4.5,3.0,'#245f74','#86b7c3',2.4),
 pool(.1,-2.5,3.0,2.15,'#235f77','#88b9c2',4.2),
 pool(4.9,-2.7,2.8,1.75,'#2b6476','#91bfca',6.5)
];
// Soft shadows/damp ground under each puddle. These are physical ground quads, not fake ponds.
const dampTex=new THREE.CanvasTexture((()=>{const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');const gr=ctx.createRadialGradient(64,64,17,64,64,64);gr.addColorStop(0,'rgba(12,29,38,.45)');gr.addColorStop(.58,'rgba(12,29,38,.29)');gr.addColorStop(1,'rgba(12,29,38,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,128,128);return c;})());
for(const p of puddles){const damp=new THREE.Mesh(new THREE.PlaneGeometry(p.w*1.25,p.h*1.3),new THREE.MeshBasicMaterial({map:dampTex,transparent:true,depthWrite:false,opacity:.8}));damp.rotation.x=-Math.PI/2;damp.position.set(p.x,-.05,p.z);damp.renderOrder=1;scene.add(damp);p.damp=damp;}

// Visually resolved tapered drops. Camera-facing sprite planes occupy true moving positions in 3D.
const MAX=400;
const dropGeom=new THREE.PlaneGeometry(.09,.61);
const rainMat=new THREE.MeshBasicMaterial({map:textures.rain,color:0xc7eef9,transparent:true,opacity:.88,depthWrite:false,side:THREE.DoubleSide,blending:THREE.NormalBlending});
const rain=new THREE.InstancedMesh(dropGeom,rainMat,MAX);rain.instanceMatrix.setUsage(THREE.DynamicDrawUsage);rain.frustumCulled=false;rain.renderOrder=6;scene.add(rain);
const dropPos=new Float32Array(MAX*3),speed=new Float32Array(MAX),lengths=new Float32Array(MAX),dropD=new THREE.Object3D();
for(let i=0;i<MAX;i++){dropPos[i*3]=(rnd()-.5)*27;dropPos[i*3+1]=1+rnd()*17;dropPos[i*3+2]=(rnd()-.5)*21;speed[i]=7.5+rnd()*7;lengths[i]=.6+rnd()*1.1;}
// Ground splashes use short-lived translucent ring-and-crown sprites on a 3D plane.
const rings=[];const ringGeometry=new THREE.PlaneGeometry(1,1);
for(let i=0;i<28;i++){
 const tex=i%4===0?textures.impact:textures.ring;
 const mesh=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({map:tex,color:i%4===0?0xcaf0f3:0xb7e4eb,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,blending:THREE.NormalBlending}));
 mesh.rotation.x=-Math.PI/2;mesh.position.y=.056;mesh.visible=false;mesh.renderOrder=7;scene.add(mesh);rings.push({mesh,life:2,duration:1,x:0,z:0});
}
let ringCursor=0;
function splash(x,z,tiny=false){let v=rings[ringCursor++%rings.length];v.life=0;v.duration=.62+rnd()*.64;v.x=x;v.z=z;v.mesh.position.set(x,.068,z);v.mesh.scale.setScalar(tiny?.16:.30);v.mesh.visible=true;v.tiny=tiny;}
const state={mode:'rain',time:0,paused:false,intensity:.65,emitAt:0,frames:0,fpsTime:0};
const names={rain:'Chuva · gotas translúcidas e respingos',puddle:'Poças · água refletiva crescendo',lagoon:'Lagoa · reflexos, espuma e ondas',storm:'Temporal · chuva sobre lagoa 3D'};
function smooth(x){x=THREE.MathUtils.clamp(x,0,1);return x*x*(3-2*x);}
function reset(){state.time=0;state.emitAt=0;for(const p of [lagoon,...puddles]){p.mat.uniforms.uGrow.value=0;}for(const r of rings){r.life=99;r.mesh.visible=false;}}
function setMode(mode){if(!(mode in names))return;state.mode=mode;reset();
 $('hint').textContent=names[mode]+'. Toque na água para criar ondas. Arraste para girar.';
 document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
 lagoon.mesh.visible=(mode==='lagoon'||mode==='storm');
 for(const p of puddles){p.mesh.visible=(mode==='puddle'||mode==='rain');p.damp.visible=p.mesh.visible;}
 reed.visible=(mode==='lagoon'||mode==='storm');
 rain.visible=(mode==='rain'||mode==='puddle'||mode==='storm');
 camera.position.set(mode==='puddle'?8:11,mode==='puddle'?7.4:8.8,mode==='puddle'?11.5:14.5);controls.target.set(0,0,0);controls.update();
}
function countDrops(){return state.mode==='lagoon'?0:Math.floor((state.mode==='puddle'?165:state.mode==='rain'?290:MAX)*state.intensity);}
const raycaster=new THREE.Raycaster(),point=new THREE.Vector2();let last=performance.now();
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)*.001,.045);last=now;if(document.hidden)return;
 if(!state.paused)state.time+=dt;const t=state.time;
 const growthLagoon=smooth(t/4.4);lagoon.mat.uniforms.uGrow.value=growthLagoon;
 for(const [i,p] of puddles.entries()){p.mat.uniforms.uGrow.value=state.mode==='rain'?smooth((t-i*.3)/1.8):smooth((t-i*.4)/3);p.mat.uniforms.uTime.value=t;p.mat.uniforms.uWave.value=.52;p.mat.uniforms.uReflect.value=1.3;p.mat.uniforms.uShore.value=.60;}
 lagoon.mat.uniforms.uTime.value=t;lagoon.mat.uniforms.uWave.value=1.25;lagoon.mat.uniforms.uReflect.value=.82;lagoon.mat.uniforms.uShore.value=1.15;
 const n=countDrops();rain.count=n;
 if(!state.paused && n>0){for(let i=0;i<n;i++){
  const j=i*3;dropPos[j+1]-=dt*speed[i];if(dropPos[j+1]<.04){dropPos[j+1]=10+rnd()*7;dropPos[j]=(rnd()-.5)*26;dropPos[j+2]=(rnd()-.5)*21;}
  dropD.position.set(dropPos[j],dropPos[j+1],dropPos[j+2]);dropD.quaternion.copy(camera.quaternion);
  dropD.scale.set(.75+rnd()*.02,lengths[i],1);dropD.updateMatrix();rain.setMatrixAt(i,dropD.matrix);
 }rain.instanceMatrix.needsUpdate=true;}
 if(!state.paused && state.mode!=='lagoon' && t>state.emitAt){
  state.emitAt=t+(state.mode==='storm'?.055:.095)/Math.max(.25,state.intensity);
  if(state.mode==='storm'){
    const a=rnd()*Math.PI*2,r=Math.sqrt(rnd())*.74*growthLagoon;
    const x=Math.cos(a)*8.2*r,z=Math.sin(a)*5.8*r;
    splash(x,z,true);
  }else{
    const p=puddles[Math.floor(rnd()*4)],a=rnd()*Math.PI*2,r=Math.sqrt(rnd())*.38*p.mat.uniforms.uGrow.value;
    splash(p.x+Math.cos(a)*p.w*r,p.z+Math.sin(a)*p.h*r,true);
  }
 }
 if(!state.paused){for(const r of rings){if(r.life>=r.duration){r.mesh.visible=false;continue;}r.life+=dt;const p=r.life/r.duration;r.mesh.scale.setScalar((r.tiny?.2:.35)+p*(r.tiny?.55:1.4));r.mesh.material.opacity=.68*(1-p)**1.7;}}
 controls.update();renderer.render(scene,camera);
 state.frames++;state.fpsTime+=dt;if(state.fpsTime>1.3){$('info').textContent=`${names[state.mode]} · ${Math.round(state.frames/state.fpsTime)} FPS · ${n} gotas · Arraste para girar`;state.fpsTime=0;state.frames=0;}
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
$('replay').addEventListener('click',reset);
$('pause').addEventListener('click',()=>{state.paused=!state.paused;$('pause').textContent=state.paused?'▶ Continuar':'⏸ Pausar';});
$('cam').addEventListener('click',()=>{camera.position.set(11,8.8,14.5);controls.target.set(0,0,0);controls.update();});
$('intensity').addEventListener('input',e=>state.intensity=Number(e.target.value)/100);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);});
canvas.addEventListener('pointerup',e=>{point.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(point,camera);
 const targets=state.mode==='lagoon'||state.mode==='storm'?[lagoon.mesh]:puddles.map(p=>p.mesh);
 const hits=raycaster.intersectObjects(targets,false);if(hits.length)splash(hits[0].point.x,hits[0].point.z,false);
});
setMode('rain');requestAnimationFrame(animate);
