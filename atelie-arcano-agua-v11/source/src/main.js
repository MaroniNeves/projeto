import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const $=id=>document.getElementById(id),canvas=$('stage');
function fail(s){$('error').textContent=s}
window.addEventListener('error',e=>fail('Erro Three.js: '+e.message));
window.addEventListener('unhandledrejection',e=>fail('Erro ao carregar: '+(e.reason?.message||e.reason)));
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail('WebGL perdeu o contexto. Feche outras abas 3D e recarregue.')});
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'})}catch(e){fail('Não foi possível iniciar o WebGL: '+e.message);throw e}
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.15));renderer.setSize(innerWidth,innerHeight,false);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x15262c);scene.fog=new THREE.FogExp2(0x15262c,.035);
const camera=new THREE.PerspectiveCamera(49,innerWidth/innerHeight,.1,150);camera.position.set(9,8.4,13);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.target.set(0,.05,0);controls.minDistance=5;controls.maxDistance=35;controls.maxPolarAngle=1.47;
scene.add(new THREE.HemisphereLight(0xb0daed,0x3e4b35,1.4));
const sun=new THREE.DirectionalLight(0xffdeb1,2.0);sun.position.set(-9,18,8);scene.add(sun);
const grd=new THREE.Mesh(new THREE.PlaneGeometry(90,90),new THREE.MeshStandardMaterial({color:0x364840,roughness:1}));grd.rotation.x=-Math.PI/2;grd.position.y=-.08;scene.add(grd);
const grid=new THREE.GridHelper(50,30,0x526862,0x526862);grid.position.y=-.074;grid.material.transparent=true;grid.material.opacity=.13;scene.add(grid);
let seed=1273;function rnd(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296}
const stone=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.3,0),new THREE.MeshStandardMaterial({color:0x737e78,roughness:1,flatShading:true}),60),dummy=new THREE.Object3D();
for(let i=0;i<60;i++){let a=rnd()*Math.PI*2,r=7+rnd()*5;dummy.position.set(r*Math.cos(a),0,r*Math.sin(a));dummy.rotation.y=a;dummy.scale.set(.4+rnd()*1.7,.18+rnd()*.5,.4+rnd()*1.6);dummy.updateMatrix();stone.setMatrixAt(i,dummy.matrix)}stone.instanceMatrix.needsUpdate=true;scene.add(stone);
const vert=/*glsl*/\`
uniform float time;uniform float wave;varying vec2 uv0;varying vec3 pos0;
void main(){vec3 p=position;float h=sin(p.x*2.8+time*1.5)*.037+cos(p.z*2.2-time*1.2)*.027+sin((p.x+p.z)*5.0+time*2.3)*.012;p.y+=h*wave;uv0=uv;pos0=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}
\`;
const frag=/*glsl*/\`
uniform float time;uniform float grow;uniform float seed;uniform vec3 deep;uniform vec3 shallow;varying vec2 uv0;varying vec3 pos0;
void main(){vec2 p=(uv0-.5)*2.0;float a=atan(p.y,p.x);float edge=1.0+.075*sin(a*6.0+seed)+.05*cos(a*11.0-seed*1.7);
float r=length(p/vec2(.97,.83));float lim=max(.001,grow)*edge;if(r>lim)discard;float v=clamp(r/max(lim,.01),0.0,1.0);
vec3 col=mix(deep,shallow,smoothstep(.15,.98,v));float w=sin(pos0.x*4.0+time*1.5)*cos(pos0.z*4.2-time*1.1);
col+=vec3(.06,.15,.16)*(w*.5+.5);float foam=smoothstep(.88,1.0,v)*(.24+.12*sin(a*19.0+time*1.5));col=mix(col,vec3(.7,.88,.86),foam);
float glitter=pow(max(0.0,sin(p.x*17.0+time*2.1)*cos(p.y*11.0-time*1.6)),14.0);col+=vec3(.12,.18,.15)*glitter;gl_FragColor=vec4(col,.96);}
\`;
function makeWater(x,z,w,h,deep,shallow,offset){const g=new THREE.PlaneGeometry(w,h,48,32);g.rotateX(-Math.PI/2);
const m=new THREE.ShaderMaterial({vertexShader:vert,fragmentShader:frag,side:THREE.DoubleSide,transparent:true,depthWrite:true,uniforms:{time:{value:0},wave:{value:1},grow:{value:0},seed:{value:offset},deep:{value:new THREE.Color(deep)},shallow:{value:new THREE.Color(shallow)}}});
const mesh=new THREE.Mesh(g,m);mesh.position.set(x,.025,z);mesh.frustumCulled=false;scene.add(mesh);return {mesh,m,x,z,w,h}}
const lagoon=makeWater(0,0,15.8,11.3,'#184152','#5097a2',1.2);
const puddles=[makeWater(-3,1.5,3.5,2.6,'#234656','#73a6a9',1),makeWater(2.3,.7,4.8,3.3,'#244a60','#7aadaf',2),makeWater(0,-2.5,3.2,2.4,'#264a5a','#6fa3a4',4),makeWater(4.9,-2.8,2.6,1.8,'#214554','#63969e',5)];
const reeds=new THREE.InstancedMesh(new THREE.ConeGeometry(.07,.6,5),new THREE.MeshStandardMaterial({color:0x95a591,flatShading:true}),70);
for(let i=0;i<70;i++){const a=(i/70)*Math.PI*2,r=8.35+rnd()*.6;dummy.position.set(Math.cos(a)*r,.05,Math.sin(a)*r*.71);dummy.scale.set(.45+rnd(),.5+rnd()*1.7,.45+rnd());dummy.rotation.set(0,rnd()*3,0);dummy.updateMatrix();reeds.setMatrixAt(i,dummy.matrix)}reeds.instanceMatrix.needsUpdate=true;scene.add(reeds);
const maxRain=620,rain=new THREE.InstancedMesh(new THREE.CylinderGeometry(.012,.012,.46,4),new THREE.MeshBasicMaterial({color:0xb7e5ed,transparent:true,opacity:.55,depthWrite:false}),maxRain);
rain.instanceMatrix.setUsage(THREE.DynamicDrawUsage);rain.frustumCulled=false;scene.add(rain);
const drop=new Float32Array(maxRain*3),speed=new Float32Array(maxRain),scale=new Float32Array(maxRain);
for(let i=0;i<maxRain;i++){drop[i*3]=(rnd()-.5)*23;drop[i*3+1]=rnd()*14;drop[i*3+2]=(rnd()-.5)*19;speed[i]=8+rnd()*8;scale[i]=.6+rnd()*.8}
const rippleGeo=new THREE.TorusGeometry(1,.022,4,26),ripples=[];
for(let i=0;i<18;i++){const mesh=new THREE.Mesh(rippleGeo,new THREE.MeshBasicMaterial({color:0xa9e7e7,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));mesh.rotation.x=-Math.PI/2;mesh.position.y=.058;mesh.visible=false;scene.add(mesh);ripples.push({mesh,age:2,duration:1})}
let nextRing=0,mode='rain',elapsed=0,paused=false,intensity=.65,nextImpact=0,last=performance.now();
function impact(x,z){const o=ripples[nextRing++%ripples.length];o.age=0;o.duration=.6+rnd()*.7;o.mesh.position.set(x,.059,z);o.mesh.visible=true}
function ease(v){v=THREE.MathUtils.clamp(v,0,1);return v*v*(3-2*v)}
function reset(){elapsed=0;nextImpact=0;for(const p of [lagoon,...puddles])p.m.uniforms.grow.value=0;for(const o of ripples)o.mesh.visible=false}
const messages={rain:'Chuva real em 3D sobre poças com respingos',puddle:'Quatro poças de água surgem e se espalham pelo solo',lagoon:'Uma lagoa aparece e ganha ondulações',storm:'Temporal sobre uma lagoa em formação'};
function setMode(v){mode=v;reset();lagoon.mesh.visible=v==='lagoon'||v==='storm';reeds.visible=lagoon.mesh.visible;puddles.forEach(p=>p.mesh.visible=v==='rain'||v==='puddle');rain.visible=v!=='lagoon';$('hint').textContent=messages[v];
document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===v))}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
$('replay').addEventListener('click',reset);
$('pause').addEventListener('click',()=>{paused=!paused;$('pause').textContent=paused?'▶ Retomar':'⏸ Pausar'});
$('cam').addEventListener('click',()=>{camera.position.set(9,8.4,13);controls.target.set(0,0,0);controls.update()});
$('intensity').addEventListener('input',e=>intensity=Number(e.target.value)/100);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false)});
const pointer=new THREE.Vector2(),ray=new THREE.Raycaster();
canvas.addEventListener('pointerup',e=>{pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(pointer,camera);const objects=lagoon.mesh.visible?[lagoon.mesh]:puddles.map(p=>p.mesh);const hits=ray.intersectObjects(objects,false);if(hits.length)impact(hits[0].point.x,hits[0].point.z)});
let lastInfo=0,frames=0;
function tick(now){requestAnimationFrame(tick);let dt=Math.min(.05,(now-last)/1000);last=now;if(document.hidden)return;if(!paused)elapsed+=dt;
lagoon.m.uniforms.time.value=elapsed;lagoon.m.uniforms.grow.value=ease(elapsed/4.4);
puddles.forEach((p,i)=>{p.m.uniforms.time.value=elapsed;p.m.uniforms.grow.value=ease((elapsed-i*.35)/(mode==='rain'?1.8:3.0))});
const n=mode==='lagoon'?0:Math.round((mode==='puddle'?170:mode==='rain'?410:maxRain)*intensity);rain.count=n;
if(!paused){for(let i=0;i<n;i++){let k=i*3;drop[k+1]-=dt*speed[i];if(drop[k+1]<0){drop[k+1]=9+rnd()*6;drop[k]=(rnd()-.5)*23;drop[k+2]=(rnd()-.5)*19}dummy.position.set(drop[k],drop[k+1],drop[k+2]);dummy.scale.set(1,scale[i],1);dummy.rotation.set(0,0,0);dummy.updateMatrix();rain.setMatrixAt(i,dummy.matrix)}rain.instanceMatrix.needsUpdate=true;
if(elapsed>nextImpact){nextImpact=elapsed+(mode==='storm'?.09:.18)/Math.max(.2,intensity);if(lagoon.mesh.visible){let a=rnd()*6.283,r=Math.sqrt(rnd())*lagoon.m.uniforms.grow.value*.6;impact(Math.cos(a)*lagoon.w*r*.5,Math.sin(a)*lagoon.h*r*.5)}else{let p=puddles[Math.floor(rnd()*puddles.length)],a=rnd()*6.283,r=Math.sqrt(rnd())*.32*p.m.uniforms.grow.value;impact(p.x+Math.cos(a)*p.w*r,p.z+Math.sin(a)*p.h*r)}}}
ripples.forEach(o=>{if(!o.mesh.visible)return;if(!paused)o.age+=dt;if(o.age>=o.duration){o.mesh.visible=false;return}const f=o.age/o.duration;o.mesh.scale.setScalar(.13+.65*f);o.mesh.material.opacity=.52*Math.sin(Math.PI*f)});
controls.update();renderer.render(scene,camera);frames++;if(now-lastInfo>1200){$('info').textContent='Gotas 3D: '+n+' · Água animada · 1 renderizador · Arraste para girar';lastInfo=now;frames=0}}
setMode('rain');requestAnimationFrame(tick);
