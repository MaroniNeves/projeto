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
// Subtle basins model the actual lower areas where the water gathers.
const basins=[[-3.2,1.45,2.4,1.6],[2.6,.86,2.7,1.9],[.1,-2.5,2,1.4],[4.9,-2.7,1.85,1.15]];
const terrainGeo=new THREE.PlaneGeometry(100,100,96,96);terrainGeo.rotateX(-Math.PI/2);
const vertices=terrainGeo.attributes.position;
for(let i=0;i<vertices.count;i++){
  const x=vertices.getX(i),z=vertices.getZ(i);
  let depression=0;
  for(const [cx,cz,rx,rz] of basins){
    const d=((x-cx)/rx)**2+((z-cz)/rz)**2;
    depression-=.13*Math.exp(-d*1.55);
  }
  const micro=.014*Math.sin(x*.8+z*.38)*Math.cos(z*.55-x*.24);
  vertices.setY(i,depression+micro);
}
terrainGeo.computeVertexNormals();
const floor=new THREE.Mesh(terrainGeo,new THREE.MeshStandardMaterial({map:groundTex,roughness:.94,metalness:.02}));
floor.position.y=-.067;scene.add(floor);
const soilMaps={dry:null,wet:null};
const soilTextureURLs=['./terrain/soil_dry_anime.jpg','./terrain/mud_wet_anime.jpg'];
const applySoil=(tex)=>{tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(7,7);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=2;return tex;};
Promise.all(soilTextureURLs.map(url=>load.loadAsync(url).then(applySoil))).then(([dry,wet])=>{
  soilMaps.dry=dry;soilMaps.wet=wet;
  floor.material.map=dry;floor.material.needsUpdate=true;
  // Smooth dry -> wet texture transition; no abrupt texture swap.
  const wetLayer=new THREE.Mesh(terrainGeo.clone(),new THREE.MeshStandardMaterial({map:wet,transparent:true,depthWrite:false,opacity:0,roughness:.74,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
  wetLayer.position.y=-.064;
  wetLayer.renderOrder=1;scene.add(wetLayer);soilMaps.layer=wetLayer;
}).catch(e=>diag('Textura CC0 de solo não carregou: '+(e.message||e)));


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
function pool(x,z,w,h,deep,shallow,seed,rot=0){
 const uniforms={uTime:{value:0},uGrow:{value:0},uWave:{value:1},uSeed:{value:seed},uDeep:{value:new THREE.Color(deep)},uShallow:{value:new THREE.Color(shallow)},uOpacity:{value:.97},uReflect:{value:1},uShore:{value:1},uFoam:{value:textures.foam},uCaustics:{value:textures.caustics}};
 const mat=new THREE.ShaderMaterial({uniforms,vertexShader:waterVS,fragmentShader:waterFS,transparent:true,depthWrite:true,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h,64,48),mat);mesh.geometry.rotateX(-Math.PI/2);mesh.position.set(x,.02,z);mesh.rotation.y=rot;mesh.frustumCulled=false;mesh.renderOrder=2;scene.add(mesh);
 return {mesh,mat,x,z,w,h,rot};
}
const lagoon=pool(0,0,16.4,11.6,'#0d4c60','#68b3b7',1.1);
const puddles=[
 pool(-3.2,1.45,3.8,2.6,'#27677b','#90c3c8',.5),
 pool(2.6,.86,4.5,3.0,'#245f74','#86b7c3',2.4),
 pool(.1,-2.5,3.0,2.15,'#235f77','#88b9c2',4.2),
 pool(4.9,-2.7,2.8,1.75,'#2b6476','#91bfca',6.5)
];
// Três canais reúnem poças somente quando o nível da chuva está alto.
const channels=[
  {p:pool(-.35,1.18,2.45,.47,'#225e67','#75a9ad',8.1,-.10),begin:.25},
  {p:pool(3.70,-.86,.55,2.75,'#24565f','#76b5b7',8.8,-.06),begin:.43},
  {p:pool(2.53,-2.57,2.20,.40,'#255d68','#7cb6b9',9.2,.05),begin:.60}
];
// Tiny surface run-offs feed basins; thin 3D moving water, not 2D decals.
const rivulets=[
  {p:pool(-5.10,2.07,3.1,.30,'#2d6e73','#83aeb0',9.6,-.10),begin:.20},
  {p:pool(6.20,.31,3.2,.27,'#285d65','#80b0b1',10.2,-.55),begin:.34},
  {p:pool(5.27,-4.31,2.6,.24,'#285c66','#78acad',10.7,.18),begin:.51}
];
// Soft shadows/damp ground under each puddle. These are physical ground quads, not fake ponds.
const dampTex=new THREE.CanvasTexture((()=>{const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');const gr=ctx.createRadialGradient(64,64,17,64,64,64);gr.addColorStop(0,'rgba(12,29,38,.45)');gr.addColorStop(.58,'rgba(12,29,38,.29)');gr.addColorStop(1,'rgba(12,29,38,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,128,128);return c;})());
// Two translucent meshes provide an earthy shoreline independent of the water plane.
const mudCanvas=document.createElement('canvas');mudCanvas.width=mudCanvas.height=256;
const mudCtx=mudCanvas.getContext('2d');
const grad=mudCtx.createRadialGradient(128,128,65,128,128,124);
grad.addColorStop(0,'rgba(39,25,16,0)');grad.addColorStop(.23,'rgba(55,40,27,.08)');
grad.addColorStop(.56,'rgba(57,39,25,.78)');grad.addColorStop(.76,'rgba(89,62,39,.90)');
grad.addColorStop(1,'rgba(41,27,18,0)');mudCtx.fillStyle=grad;mudCtx.fillRect(0,0,256,256);
const mudTex=new THREE.CanvasTexture(mudCanvas);
function shore(p,large=1){
  const mud=new THREE.Mesh(new THREE.PlaneGeometry(p.w*1.57*large,p.h*1.56*large),
    new THREE.MeshBasicMaterial({map:mudTex,transparent:true,depthWrite:false,opacity:0,color:0x79664e}));
  mud.rotation.x=-Math.PI/2;mud.rotation.z=p.rot||0;mud.position.set(p.x,-.049,p.z);
  mud.renderOrder=0;scene.add(mud);p.mud=mud;
  const damp=new THREE.Mesh(new THREE.PlaneGeometry(p.w*1.40,p.h*1.37),
    new THREE.MeshBasicMaterial({map:dampTex,transparent:true,depthWrite:false,opacity:0}));
  damp.rotation.x=-Math.PI/2;damp.rotation.z=p.rot||0;
  damp.position.set(p.x,-.047,p.z);damp.renderOrder=1;scene.add(damp);p.damp=damp;
}
for(const p of puddles)shore(p);
for(const o of [...channels,...rivulets]){shore(o.p,.70);o.p.mesh.visible=false;o.p.damp.visible=false;o.p.mud.visible=false;}

// Visually resolved tapered drops. Camera-facing sprite planes occupy true moving positions in 3D.
const RAIN_LEVELS = [
 {name:'Sem chuva',drops:0,speed:0,streak:0,alpha:0,splash:Infinity,wave:0,drizzle:0},
 {name:'Garoa',drops:38,speed:.67,streak:.48,alpha:.38,splash:.52,wave:.12,drizzle:.3},
 {name:'Chuva fraca',drops:95,speed:.86,streak:.67,alpha:.50,splash:.29,wave:.25,drizzle:.45},
 {name:'Chuva moderada',drops:182,speed:1.02,streak:.95,alpha:.64,splash:.15,wave:.48,drizzle:.63},
 {name:'Chuva forte',drops:286,speed:1.27,streak:1.28,alpha:.77,splash:.092,wave:.78,drizzle:.8},
 {name:'Temporal intenso',drops:400,speed:1.62,streak:1.60,alpha:.90,splash:.049,wave:1.12,drizzle:1}
];
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
const modeLevels={rain:3,puddle:2,lagoon:0,storm:5};
const state={mode:'rain',time:0,paused:false,level:modeLevels.rain,emitAt:0,frames:0,fpsTime:0,wetness:0,rainNow:0,waterLevel:0};
const levelSpec=()=>RAIN_LEVELS[state.level];
function updateRainLevel(level){
 state.level=THREE.MathUtils.clamp(Math.round(Number(level)||0),0,5);
 modeLevels[state.mode]=state.level;
 const cfg=levelSpec();
 $('intensity').value=String(state.level);
 $('intensityName').textContent=cfg.name;
 $('rainDetail').textContent=cfg.drops ? cfg.drops+' gotas 3D · '+cfg.name.toLowerCase()+' · respingos e ondas' : 'Céu seco · sem gotas nem respingos';
 $('rainMeter').style.setProperty('--rain-fill',String(state.level*20)+'%');
 rainMat.opacity=cfg.alpha;
 state.emitAt=state.time;
}
const names={rain:'Chuva · solo que absorve água e poças nas depressões',puddle:'Poças · bordas grossas de lama e filetes',lagoon:'Lagoa · reflexos e ondulações nas margens',storm:'Temporal · solo encharcado e chuva intensa'};
function smooth(x){x=THREE.MathUtils.clamp(x,0,1);return x*x*(3-2*x);}
function reset(){state.time=0;state.emitAt=0;state.wetness=0;state.waterLevel=0;for(const p of [lagoon,...puddles,...channels.map(o=>o.p),...rivulets.map(o=>o.p)])p.mat.uniforms.uGrow.value=0;for(const r of rings){r.life=99;r.mesh.visible=false;}}
function setMode(mode){if(!(mode in names))return;state.mode=mode;reset();updateRainLevel(modeLevels[mode]);
 $('hint').textContent=names[mode]+'. Toque na água para criar ondas. Arraste para girar.';
 document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
 lagoon.mesh.visible=(mode==='lagoon'||mode==='storm');
 for(const p of puddles){p.mesh.visible=(mode==='puddle'||mode==='rain');p.damp.visible=p.mesh.visible;p.mud.visible=p.mesh.visible;}for(const o of [...channels,...rivulets]){o.p.mesh.visible=false;o.p.damp.visible=false;o.p.mud.visible=false;}
 reed.visible=(mode==='lagoon'||mode==='storm');
 rain.visible=true; // nível zero = cena seca em todos os modos
 camera.position.set(mode==='puddle'?8:11,mode==='puddle'?7.4:8.8,mode==='puddle'?11.5:14.5);controls.target.set(0,0,0);controls.update();
}
function countDrops(){return levelSpec().drops;}
const raycaster=new THREE.Raycaster(),point=new THREE.Vector2();let last=performance.now();
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)*.001,.045);last=now;if(document.hidden)return;
 if(!state.paused)state.time+=dt;const t=state.time;
 const growthLagoon=smooth(t/4.4);lagoon.mat.uniforms.uGrow.value=growthLagoon;
const cfg=levelSpec();
const targetRain=cfg.drizzle;
const blend=1-Math.exp(-dt*1.35);
if(!state.paused){
  state.rainNow=THREE.MathUtils.lerp(state.rainNow,targetRain,blend);
  state.wetness=state.rainNow>0.02?Math.min(1,state.wetness+dt*(.014+.047*state.rainNow)):Math.max(0,state.wetness-dt*.009);
  state.waterLevel=Math.min(1,Math.max(0,state.waterLevel+dt*(state.rainNow*.069-.009)));
}
const rainFactor=state.rainNow;
const n=Math.round(THREE.MathUtils.lerp(0,cfg.drops,smooth(rainFactor/Math.max(.01,cfg.drizzle))));
rain.count=n;
for(const [i,p] of puddles.entries()){
  const depressionBias=[.035,.105,.20,.29][i];
  const localWet=Math.max(0,state.waterLevel-depressionBias);
  const fill=smooth(localWet*(i===0?1.85:1.62));
  p.mat.uniforms.uGrow.value=fill;
  p.mat.uniforms.uTime.value=t;
  p.mat.uniforms.uWave.value=.24+.55*rainFactor;
  p.mat.uniforms.uReflect.value=1.20;
  p.mat.uniforms.uShore.value=.38;
  p.damp.visible=p.mesh.visible && fill>.004;
  p.damp.material.opacity=.1+fill*.51;
  p.damp.scale.set(.64+fill*.42,1,.64+fill*.36);
  p.mud.visible=p.mesh.visible && fill>.002;
  p.mud.material.opacity=.17+fill*.60;
  p.mud.scale.set(.80+fill*.36,1,.80+fill*.30);
  const mudTone=.78-.48*state.wetness;
  p.mud.material.color.setRGB(mudTone,mudTone*.91,mudTone*.78);
}
const connect=smooth((state.waterLevel-.50)/.36)*smooth((rainFactor-.68)/.30);
for(const o of channels){
  const p=o.p, f=smooth((connect-o.begin)*1.9);
  p.mesh.visible=(state.mode==='rain'||state.mode==='puddle')&&f>.003;
  p.mat.uniforms.uGrow.value=f;p.mat.uniforms.uTime.value=t;p.mat.uniforms.uWave.value=.20+.55*rainFactor;
  p.damp.visible=p.mud.visible=p.mesh.visible;
  p.mud.material.opacity=.12+.44*f;p.damp.material.opacity=.08+.23*f;
  p.mud.material.color.setRGB(.56-state.wetness*.20,.42-state.wetness*.13,.28-state.wetness*.08);
}
const runoff=smooth((state.waterLevel-.09)/.35)*smooth((rainFactor-.34)/.5);
for(const o of rivulets){
  const p=o.p,f=smooth((runoff-o.begin)*1.8);
  p.mesh.visible=(state.mode==='rain'||state.mode==='puddle')&&f>.005;
  p.mat.uniforms.uGrow.value=.15+f*.85;p.mat.uniforms.uTime.value=t;
  p.mat.uniforms.uWave.value=.17+.46*rainFactor;
  p.mesh.scale.x=.22+.78*f;
  p.mud.visible=p.damp.visible=p.mesh.visible;
  p.mud.material.opacity=.07+.30*f;p.damp.material.opacity=.03+.17*f;
  p.mud.material.color.setRGB(.54-state.wetness*.19,.42-state.wetness*.12,.30-state.wetness*.09);
}
lagoon.mat.uniforms.uTime.value=t;
lagoon.mat.uniforms.uWave.value=.68+.72*cfg.wave;
lagoon.mat.uniforms.uReflect.value=.82;lagoon.mat.uniforms.uShore.value=1.15;
const groundBrightness=1-.20*state.wetness;
floor.material.color.setRGB(groundBrightness,groundBrightness*.98,groundBrightness*.95);
floor.material.roughness=.94-.21*state.wetness;
if(soilMaps.layer)soilMaps.layer.material.opacity=.92*smooth(state.wetness);
 if(!state.paused && n>0){for(let i=0;i<n;i++){
  const j=i*3;dropPos[j+1]-=dt*speed[i]*cfg.speed;if(dropPos[j+1]<.04){dropPos[j+1]=10+rnd()*7;dropPos[j]=(rnd()-.5)*26;dropPos[j+2]=(rnd()-.5)*21;}
  dropD.position.set(dropPos[j],dropPos[j+1],dropPos[j+2]);dropD.quaternion.copy(camera.quaternion);
  dropD.rotateZ(state.level>=4?-.085:state.level===3?-.035:0);
  dropD.scale.set(.66,lengths[i]*cfg.streak,1);dropD.updateMatrix();rain.setMatrixAt(i,dropD.matrix);
 }rain.instanceMatrix.needsUpdate=true;}
 if(!state.paused && n>0 && t>state.emitAt){
  state.emitAt=t+cfg.splash;
  if(state.mode==='storm'||state.mode==='lagoon'){
    const a=rnd()*Math.PI*2,r=Math.sqrt(rnd())*.74*growthLagoon;
    const x=Math.cos(a)*8.2*r,z=Math.sin(a)*5.8*r;
    splash(x,z,true);
  }else{
    const p=puddles[Math.floor(rnd()*4)],a=rnd()*Math.PI*2;
  const grown=p.mat.uniforms.uGrow.value;
  const r=(rnd()<.58?.90:.55)*grown;
  if(grown>.02) splash(p.x+Math.cos(a)*p.w*.5*r,p.z+Math.sin(a)*p.h*.5*r,true);
  }
 }
 if(!state.paused){for(const r of rings){if(r.life>=r.duration){r.mesh.visible=false;continue;}r.life+=dt;const p=r.life/r.duration;r.mesh.scale.setScalar((r.tiny?.2:.35)+p*(r.tiny?.55:1.4));r.mesh.material.opacity=.68*(1-p)**1.7;}}
 controls.update();renderer.render(scene,camera);
 state.frames++;state.fpsTime+=dt;if(state.fpsTime>1.3){$('info').textContent=`${names[state.mode]} · ${cfg.name} · ${Math.round(state.frames/state.fpsTime)} FPS · ${n} gotas`;state.fpsTime=0;state.frames=0;}
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
$('replay').addEventListener('click',reset);
$('pause').addEventListener('click',()=>{state.paused=!state.paused;$('pause').textContent=state.paused?'▶ Continuar':'⏸ Pausar';});
$('cam').addEventListener('click',()=>{camera.position.set(11,8.8,14.5);controls.target.set(0,0,0);controls.update();});
$('intensity').addEventListener('input',e=>updateRainLevel(e.target.value));
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);});
canvas.addEventListener('pointerup',e=>{point.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(point,camera);
 const targets=state.mode==='lagoon'||state.mode==='storm'?[lagoon.mesh]:puddles.map(p=>p.mesh);
 const hits=raycaster.intersectObjects(targets,false);if(hits.length)splash(hits[0].point.x,hits[0].point.z,false);
});
setMode('rain');requestAnimationFrame(animate);
