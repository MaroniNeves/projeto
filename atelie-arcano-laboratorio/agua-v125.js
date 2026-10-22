/* Ateliê Arcano V12.5 — simulador integrado à aba Água. MIT.
   Gotas alimentam uma única malha; o fluxo usa diferenças de altura e respeita pedras.
   Compatível com Three.js r152 em navegadores Android com WebGL2. */
(function(){
'use strict';
const T=window.THREE, $=id=>document.getElementById(id), clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const diag=$('diag'),stage=$('stage');
function fail(error){if(diag)diag.textContent='Não foi possível iniciar a água 3D: '+(error&&error.message||error);console.error('[Arcano V12.5]',error);}
if(!T){fail('Three.js não carregou. Verifique a conexão.');return;}
const mobile=innerWidth<680, NX=mobile?68:96,NZ=mobile?56:78,W=20,L=16;
const dx=W/(NX-1), dz=L/(NZ-1),size=NX*NZ;
const soil=new Float32Array(size),depth=new Float32Array(size),delta=new Float32Array(size),blocked=new Uint8Array(size);
const nx=i=>-W*.5+i*dx,nz=j=>-L*.5+j*dz, idx=(i,j)=>j*NX+i;
const smooth=(t)=>t*t*(3-2*t);
function rand(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
const random=rand(22026),basins=[
 {x:-2.65,z:-2.15,sx:1.75,sz:1.23,deep:.66},
 {x:3.05,z:.58,sx:1.52,sz:2.0,deep:.86},
 {x:-.8,z:3.8,sx:2.0,sz:1.43,deep:.75},
 {x:3.0,z:5.63,sx:1.25,sz:.88,deep:.43}];
const rocks=[[-1.75,-4.7,.55],[.4,-3.3,.56],[.68,-1.8,.56],[-.65,-.5,.46],[.88,.65,.5],[-.9,1.65,.51],[.64,2.85,.51],[-1.35,4.75,.56],[2.2,4.65,.46],[2.5,-3.7,.44],[-3.95,2.5,.58],[4.6,.2,.47],[-3.5,-.1,.37],[5.3,4.5,.45],[-5.6,-4.8,.43],[5.8,-2.7,.47],[-5.7,4.7,.42]];
const center=z=>-.72+.63*Math.sin(z*.75)+.20*Math.sin(z*1.52);
function elevation(x,z){
 let y=.32-.073*z+.16*Math.sin(x*.83+z*.26)+.115*Math.cos(z*1.22-x*.34)+.055*Math.sin(x*2.25+z*1.92);
 y-=.36*Math.exp(-.5*((x-center(z))/.87)**2);
 for(const b of basins){const d=((x-b.x)/b.sx)**2+((z-b.z)/b.sz)**2;y-=b.deep*Math.exp(-1.5*d);}
 return y;
}
function rockAt(x,z){return rocks.some(([rx,rz,r])=>((x-rx)**2+(z-rz)**2)<(r*.86)**2);}
const scene=new T.Scene();scene.background=new T.Color('#b6c6bc');scene.fog=new T.Fog('#b6c6bc',20,39);
const camera=new T.PerspectiveCamera(46,1,.1,90);
let renderer;
try{renderer=new T.WebGLRenderer({canvas:stage,antialias:!mobile,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.35:1.8));renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.shadowMap.enabled=true;
renderer.shadowMap.type=T.PCFSoftShadowMap;}catch(e){fail(e);return;}
scene.add(new T.HemisphereLight('#fff5e4','#6c8378',2.2));
const light=new T.DirectionalLight('#fff0c8',2.35);light.position.set(-8,13,7);
light.castShadow=true;light.shadow.mapSize.set(mobile?512:1024,mobile?512:1024);
Object.assign(light.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:.5,far:38});
light.shadow.bias=-.00035;scene.add(light);
function grid(){
 const g=new T.BufferGeometry(),p=new Float32Array(size*3),uv=new Float32Array(size*2),tri=[];
 for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
  const k=idx(i,j);p[k*3]=nx(i);p[k*3+2]=nz(j);uv[k*2]=i/(NX-1);uv[k*2+1]=j/(NZ-1);
  if(j<NZ-1&&i<NX-1){const a=k,b=k+1,c=k+NX,d=c+1;tri.push(a,c,b,b,c,d);}
 }
 g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(tri);return g;
}
function groundTexture(){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),r=rand(2233);
 ctx.fillStyle='#e4c99e';ctx.fillRect(0,0,256,256);
 for(let i=0;i<220;i++){ctx.fillStyle=['#d3af7d','#bca07b','#f2d6a6','#bd926c','#cab18a'][Math.floor(r()*5)];
 ctx.beginPath();ctx.ellipse(r()*256,r()*256,2+r()*15,1+r()*5,r()*6.28,0,6.28);ctx.fill();}
 for(let i=0;i<1600;i++){ctx.fillStyle=r()>.5?'#62483220':'#fff5ce45';ctx.fillRect(r()*256,r()*256,.5+r()*2,.5+r()*2);}
 const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(5,4);
 tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex;
}
const landG=grid(),landP=landG.attributes.position.array,colors=new Float32Array(size*3),dry=new Float32Array(size*3);
for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
 const k=idx(i,j),x=nx(i),z=nz(j),h=elevation(x,z);soil[k]=h;landP[k*3+1]=h;
 blocked[k]=rockAt(x,z)?1:0;
 const moss=.5+.5*Math.sin(x*1.4-z*.88),v=clamp(.48+.29*Math.sin(x*.43+z*.3)+.15*moss,.14,.9);
 const a=new T.Color(h<-.10?'#c3a07e':'#e1c292'),b=new T.Color((h>.52&&moss>.78)?'#7c9579':'#b58e68');
 a.lerp(b,clamp(.32+v*.45,0,1));for(let m=0;m<3;m++)dry[k*3+m]=colors[k*3+m]=a.toArray()[m];
}
landG.setAttribute('color',new T.BufferAttribute(colors,3));landG.computeVertexNormals();
const land=new T.Mesh(landG,new T.MeshStandardMaterial({map:groundTexture(),vertexColors:true,roughness:1,side:T.DoubleSide}));
land.receiveShadow=true;land.name='Solo arenoso anime V12.5';scene.add(land);
const slab=new T.Mesh(new T.BoxGeometry(W,.52,L),new T.MeshStandardMaterial({color:'#856b50',roughness:1}));
slab.position.y=-1.75;slab.receiveShadow=true;scene.add(slab);
const stones=new T.Group();scene.add(stones);
const stoneGeo=new T.DodecahedronGeometry(1,0),stonePalette=['#858e89','#958575','#6b817c','#a69984','#6b7972'];
for(let i=0;i<rocks.length;i++){
 const [x,z,r]=rocks[i],g=new T.Mesh(stoneGeo,new T.MeshStandardMaterial({color:stonePalette[i%stonePalette.length],flatShading:true,roughness:1}));
 g.scale.set(r,r*(.75+random()*.25),r*(.85+random()*.3));g.position.set(x,elevation(x,z)+r*.31,z);
 g.rotation.set(random()*.23,random()*6.28,random()*.26);g.castShadow=true;g.receiveShadow=true;stones.add(g);
}
const grass=new T.InstancedMesh(new T.ConeGeometry(.092,.42,3),new T.MeshStandardMaterial({color:'#849878',roughness:1,flatShading:true}),mobile?62:138);
const ob=new T.Object3D();let gcount=0;
for(let k=0;k<grass.count;k++){
 const x=(random()-.5)*W,z=(random()-.5)*L,y=elevation(x,z);
 if(rockAt(x,z)||y<-.15)continue;const s=.45+random()*1.2;
 ob.position.set(x,y+.09,z);ob.scale.set(s,s,s);ob.rotation.y=random()*6.28;ob.updateMatrix();grass.setMatrixAt(gcount++,ob.matrix);
}grass.count=gcount;grass.castShadow=true;scene.add(grass);
// Uma única superfície: a água é armazenada em volumes por vértice, não em poças/planos sobrepostos.
const waterG=grid(),wet=new Float32Array(size),flow=new Float32Array(size*2);
waterG.setAttribute('wet',new T.BufferAttribute(wet,1));waterG.setAttribute('flow',new T.BufferAttribute(flow,2));
const waterM=new T.ShaderMaterial({side:T.DoubleSide,transparent:true,depthWrite:false,
 uniforms:{uTime:{value:0}},
 vertexShader:'attribute float wet; attribute vec2 flow; uniform float uTime; varying float vWet; varying vec2 vFlow; varying vec3 vPos; void main(){vec3 p=position;vWet=wet;vFlow=flow;p.y+=.009*min(wet,1.)*(sin(p.x*8.+uTime*2.)+sin(p.z*6.-uTime*1.6));vPos=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
 fragmentShader:'precision mediump float; uniform float uTime; varying float vWet; varying vec2 vFlow; varying vec3 vPos; void main(){float alpha=smoothstep(.06,.57,vWet);if(alpha<.015) discard;vec2 dir=normalize(vFlow+vec2(.22,.36));float wave=dot(vPos.xz,dir)*11.-uTime*(1.1+min(length(vFlow),2.));float rings=.5+.5*sin(wave+sin(vPos.x*4.+vPos.z*3.));float skew=.5+.5*sin(vPos.x*2.7-vPos.z*3.8+uTime*1.3);vec3 a=vec3(.09,.29,.36),b=vec3(.25,.55,.59),c=vec3(.67,.82,.77);vec3 col=mix(a,b,.42+.32*skew);col=mix(col,c,pow(rings,15.)*.21);gl_FragColor=vec4(col,alpha*.89);}'
// fragment remains intentionally restrained: water is not a glowing spell.
});
const water=new T.Mesh(waterG,waterM);water.renderOrder=3;water.name='Superfície compartilhada de água';scene.add(water);
const MAX_DROPS=mobile?170:310,dropPos=new Float32Array(MAX_DROPS*3);dropPos.fill(-999);
const dropG=new T.BufferGeometry();dropG.setAttribute('position',new T.BufferAttribute(dropPos,3));
const dropPoints=new T.Points(dropG,new T.PointsMaterial({color:'#b4d8df',size:.068,transparent:true,opacity:.86,depthWrite:false}));
dropPoints.frustumCulled=false;scene.add(dropPoints);const drops=[];
let mode='rain',level=3,paused=false,time=0,acc=0,spawnAcc=0,lastUI=0,wetted=0,frame=0,waterVersion=0;
const rainLevels=[0,.32,.63,1,1.57,2.4],rainNames=['Sem chuva','Garoa','Chuva fraca','Chuva moderada','Chuva forte','Temporal intenso'];
function add(x,z,vol){
 const i=Math.round((x+W/2)/dx),j=Math.round((z+L/2)/dz);
 if(i<1||j<1||i>=NX-1||j>=NZ-1)return;
 const k=idx(i,j);if(!blocked[k])depth[k]=Math.min(1.65,depth[k]+vol);
}
function seed(m){
 depth.fill(0);drops.length=0;
 for(let j=1;j<NZ-1;j++)for(let i=1;i<NX-1;i++){
  const k=idx(i,j);if(blocked[k])continue;const x=nx(i),z=nz(j),r=Math.abs(x-center(z));
  if(r<.30&&z>-6.3&&z<5.4)depth[k]=Math.max(depth[k],.095*(1-r/.35));
  for(const b of basins){
   const q=((x-b.x)/b.sx)**2+((z-b.z)/b.sz)**2;
   const lakeY=elevation(b.x,b.z)+b.deep*.23+(m==='lagoon'?.32:m==='puddle'?.14:.08);
   if(q<(m==='lagoon'?1.32:1.02))depth[k]=Math.max(depth[k],clamp(lakeY-soil[k],0,m==='lagoon'?.72:.44));
  }
 }
 if(m==='storm')for(let k=0;k<size;k++)if(!blocked[k])depth[k]+=.034;
 rebuild();updateInfo(true);
}
function flowStep(dt){
 delta.fill(0);const speed=(.65+rainLevels[level]*.10)*dt*2.0;
 for(let j=1;j<NZ-1;j++)for(let i=1;i<NX-1;i++){
  const k=idx(i,j),v=depth[k];if(blocked[k]||v<.000008)continue;
  const head=soil[k]+v,neigh=[k-1,k+1,k-NX,k+NX],transfer=[0,0,0,0];let sum=0;
  for(let n=0;n<4;n++){const q=neigh[n];if(blocked[q])continue;
   const diff=head-soil[q]-depth[q];if(diff<=0)continue;
   const amount=diff*speed*(n<2?dz/dx:dx/dz)*.38;transfer[n]=amount;sum+=amount;}
  const fraction=sum>v?v/sum:1;
  for(let n=0;n<4;n++)if(transfer[n]){const a=transfer[n]*fraction;delta[k]-=a;delta[neigh[n]]+=a;}
 }
 for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
  const k=idx(i,j);
  if(blocked[k]){depth[k]=0;continue;}
  depth[k]=Math.max(0,depth[k]+delta[k]-.000015*dt);
  if(i===0||j===0||i===NX-1||j===NZ-1)depth[k]*=.86;
 }
}
function rebuild(){
 const p=waterG.attributes.position.array,w=waterG.attributes.wet.array,f=waterG.attributes.flow.array;
 let count=0;
 for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
  const k=idx(i,j),v=depth[k],t=clamp(v/.085,0,1);
  w[k]=t;p[3*k+1]=soil[k]+(t>.03?v+.028:-.021);
  if(v>.012)count++;
  const left=idx(Math.max(0,i-1),j),right=idx(Math.min(NX-1,i+1),j);
  const up=idx(i,Math.max(0,j-1)),down=idx(i,Math.min(NZ-1,j+1));
  f[k*2]=(soil[left]+depth[left]-soil[right]-depth[right])*.6;
  f[k*2+1]=(soil[up]+depth[up]-soil[down]-depth[down])*.6;
  const mud=clamp(t*.43+(v>.015?.04:0),0,.60);
  colors[k*3]=dry[k*3]*(1-mud)+.21*mud;
  colors[k*3+1]=dry[k*3+1]*(1-mud)+.23*mud;
  colors[k*3+2]=dry[k*3+2]*(1-mud)+.19*mud;
 }
 wetted=count*dx*dz;
 waterG.attributes.position.needsUpdate=true;waterG.attributes.wet.needsUpdate=true;waterG.attributes.flow.needsUpdate=true;
 landG.attributes.color.needsUpdate=true;waterG.computeVertexNormals();waterVersion++;
}
function dropStep(dt){
 const rate=rainLevels[level]*(mode==='storm'?1.45:1)*95;
 spawnAcc+=rate*dt;
 const newDrops=Math.min(40,Math.floor(spawnAcc));spawnAcc-=newDrops;
 for(let k=0;k<newDrops&&drops.length<MAX_DROPS;k++){
  const x=(random()-.5)*(W-1.1),z=(random()-.5)*(L-1.1);
  drops.push({x,z,y:3+random()*3.8,speed:3.9+random()*2.5,volume:.035+random()*.036});
 }
 for(let i=drops.length-1;i>=0;i--){
  const d=drops[i];d.y-=d.speed*dt;
  const gx=Math.round((d.x+W/2)/dx),gz=Math.round((d.z+L/2)/dz);
  if(gx<0||gz<0||gx>=NX||gz>=NZ||d.y<soil[idx(gx,gz)]+depth[idx(gx,gz)]){
   add(d.x,d.z,d.volume);
   drops[i]=drops[drops.length-1];drops.pop();
  }
 }
 for(let i=0;i<MAX_DROPS;i++){
  const d=drops[i],o=i*3;dropPos[o]=d?d.x:-999;dropPos[o+1]=d?d.y:-999;dropPos[o+2]=d?d.z:-999;
 }
 dropG.attributes.position.needsUpdate=true;
}
function resize(){
 const w=innerWidth,h=innerHeight;
 renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
let yaw=.83,pitch=.79,radius=24,drag=false, moved=false, prevX=0,prevY=0,pinch=0;
const target=new T.Vector3(0,-.12,0);
function setView(){camera.position.set(target.x+radius*Math.cos(pitch)*Math.sin(yaw),target.y+radius*Math.sin(pitch),target.z+radius*Math.cos(pitch)*Math.cos(yaw));camera.lookAt(target);}
function tapAdd(event){
 const rect=stage.getBoundingClientRect(),mouse=new T.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
 const ray=new T.Raycaster();ray.setFromCamera(mouse,camera);const found=ray.intersectObject(land);
 if(found.length){const p=found[0].point;for(let i=0;i<25;i++){const a=random()*Math.PI*2,r=random()*.6;add(p.x+Math.cos(a)*r,p.z+Math.sin(a)*r,.105);}
 rebuild();updateInfo(true);}
}
stage.addEventListener('pointerdown',e=>{drag=true;moved=false;prevX=e.clientX;prevY=e.clientY;try{stage.setPointerCapture(e.pointerId);}catch(_){}});
stage.addEventListener('pointermove',e=>{if(!drag)return;const a=e.clientX-prevX,b=e.clientY-prevY;if(Math.abs(a)+Math.abs(b)>3)moved=true;
 yaw-=a*.006;pitch=clamp(pitch+b*.004,.22,1.46);prevX=e.clientX;prevY=e.clientY;});
stage.addEventListener('pointerup',e=>{if(drag&&!moved)tapAdd(e);drag=false;});
stage.addEventListener('pointercancel',()=>drag=false);
stage.addEventListener('wheel',e=>{e.preventDefault();radius=clamp(radius+Math.sign(e.deltaY)*1.5,11,34);},{passive:false});
stage.addEventListener('touchmove',e=>{if(e.touches.length!==2){pinch=0;return;}
 const a=e.touches[0],b=e.touches[1],dist=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
 if(pinch)radius=clamp(radius+(pinch-dist)*.04,11,34);pinch=dist;},{passive:true});
stage.addEventListener('touchend',()=>pinch=0,{passive:true});
$('intensity').addEventListener('change',e=>{level=clamp(+e.target.value,0,5);updateInfo(true);});
for(const btn of document.querySelectorAll('[data-mode]'))btn.addEventListener('click',()=>setMode(btn.dataset.mode));
function setMode(next){
 mode=next;level=next==='storm'?5:next==='lagoon'?2:next==='puddle'?1:3;
 $('intensity').value=String(level);seed(mode);document.querySelectorAll('[data-mode]').forEach(el=>el.classList.toggle('active',el.dataset.mode===mode));
 $('hint').textContent={rain:'Chuva alimenta uma única água contínua que desce pelo terreno e contorna as pedras.',puddle:'Poças orgânicas aparecem nas depressões do solo arenoso e se conectam.',lagoon:'A água acumula na lagoa, extravasa pelo relevo e forma filetes.',storm:'Temporal intenso: gotas viram água ao tocar o solo e se espalham.'}[mode];
}
$('replay').addEventListener('click',()=>seed(mode));
$('pause').addEventListener('click',()=>{paused=!paused;$('pause').textContent=paused?'▶ Continuar':'⏸ Pausar';updateInfo(true);});
$('cam').addEventListener('click',()=>{yaw=.83;pitch=.79;radius=24;});
function updateInfo(force){
 if(!force&&time-lastUI<.32)return;lastUI=time;
 const pct=Math.round(level/5*100),name=rainNames[level];
 $('intensityName').textContent=name;$('rainMeter').style.setProperty('--rain-fill',pct+'%');
 $('rainDetail').textContent='Água contínua: '+wetted.toFixed(1)+' m² molhados • '+drops.length+' gotas no ar • '+rocks.length+' pedras 3D'+(paused?' • PAUSADO':'');
 $('info').textContent='Toque no terreno: adicionar água • arraste: girar • pinça: zoom';
}
let last=performance.now();function loop(now){
 requestAnimationFrame(loop);const dt=Math.min((now-last)/1000,.075);last=now;
 if(!paused&&!document.hidden){
  time+=dt;dropStep(dt);acc+=dt;let steps=0;
  while(acc>=.032&&steps<3){flowStep(.032);acc-=.032;steps++;}
  if(acc>.10)acc=.10;if(++frame%2===0)rebuild();waterM.uniforms.uTime.value=time;
  updateInfo(false);
 }
 setView();renderer.render(scene,camera);
}
window.addEventListener('resize',resize);
window.addEventListener('error',e=>{if((e.filename||'').includes('agua-v125'))fail(e.error||e.message);});
window.arcanoWaterV125={scene,renderer,seed,setMode,add,terrain:land,water,stones,getMode:()=>mode,getWetArea:()=>wetted};
try{resize();setMode('rain');requestAnimationFrame(loop);}catch(e){fail(e);}
})();