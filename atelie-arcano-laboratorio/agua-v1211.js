/* Ateliê Arcano V12.11 — poças, lagoas e respingos conformes ao relevo (modelo ilustrativo, não calibrado).
   Chuva, interceptação vegetal, infiltração, percolação, escoamento e evapotranspiração.
   Simulação conservativa na malha, com multiplicador de tempo e gotas 3D visíveis. */
(function(){
'use strict';
const T=window.THREE, $=id=>document.getElementById(id), clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const diag=$('diag'),stage=$('stage');
function fail(error){if(diag)diag.textContent='Não foi possível iniciar a água 3D: '+(error&&error.message||error);console.error('[Arcano V12.11]',error);}
if(!T){fail('Three.js não carregou. Verifique a conexão.');return;}
const mobile=innerWidth<680, NX=mobile?68:96,NZ=mobile?56:78,W=20,L=16;
const dx=W/(NX-1), dz=L/(NZ-1),size=NX*NZ;
const soil=new Float32Array(size),depth=new Float32Array(size),delta=new Float32Array(size),blocked=new Uint8Array(size);
const soilMoisture=new Float32Array(size),soilCapacity=new Float32Array(size),deepWater=new Float32Array(size);
const canopy=new Float32Array(size),cover=new Float32Array(size),permeability=new Float32Array(size);
const area=dx*dz,stats={rain:0,infiltrated:0,evaporated:0,transpired:0,outflow:0};
const mudRGB=[.18,.11,.075];
const turbidity=new Float32Array(size);
const soilErosion={loam:.37,loose:1.0,clay:.73,compacted:.13};
let soilType='loam',totalImpacts=0;
const baseCapacity=new Float32Array(size),basePermeability=new Float32Array(size);
const nx=i=>-W*.5+i*dx,nz=j=>-L*.5+j*dz, idx=(i,j)=>j*NX+i;
const smooth=(t)=>t*t*(3-2*t);
function rand(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
const random=rand(22026),basins=[
 {x:-2.65,z:-2.15,sx:2.15,sz:1.63,deep:1.08},
 {x:3.05,z:.58,sx:2.25,sz:2.55,deep:1.46},
 {x:-.8,z:3.8,sx:2.3,sz:1.7,deep:1.11},
 {x:3.0,z:5.63,sx:1.40,sz:1.05,deep:.65}];
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
 ctx.fillStyle='#927258';ctx.fillRect(0,0,256,256);
 for(let i=0;i<220;i++){ctx.fillStyle=['#6d513c','#7c5945','#b08b6b','#654b3a','#a38160'][Math.floor(r()*5)];
 ctx.beginPath();ctx.ellipse(r()*256,r()*256,2+r()*15,1+r()*5,r()*6.28,0,6.28);ctx.fill();}
 for(let i=0;i<1600;i++){ctx.fillStyle=r()>.5?'#24160f3d':'#d7ba8b35';ctx.fillRect(r()*256,r()*256,.5+r()*2,.5+r()*2);}
 const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(5,4);
 tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex;
}
const landG=grid(),landP=landG.attributes.position.array,colors=new Float32Array(size*3),dry=new Float32Array(size*3);
for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
 const k=idx(i,j),x=nx(i),z=nz(j),h=elevation(x,z);soil[k]=h;landP[k*3+1]=h;
 blocked[k]=rockAt(x,z)?1:0;
 const moss=.5+.5*Math.sin(x*1.4-z*.88),v=clamp(.48+.29*Math.sin(x*.43+z*.3)+.15*moss,.14,.9);
 cover[k]=clamp(.05+.60*moss+.24*Math.sin(z*.55+x*1.33),0,.82);
 soilCapacity[k]=.060+.085*cover[k]+.023*(.5+.5*Math.cos(x*1.7-z*.8));
 permeability[k]=.003+.002*cover[k]+.0007*(.5+.5*Math.sin(x*.9+z*1.4));
 const a=new T.Color(h<-.10?'#a47e62':'#b99b7d'),b=new T.Color((h>.52&&moss>.78)?'#777960':'#8d6952');
 a.lerp(b,clamp(.32+v*.45,0,1));for(let m=0;m<3;m++)dry[k*3+m]=colors[k*3+m]=a.toArray()[m];
}
baseCapacity.set(soilCapacity);basePermeability.set(permeability);
landG.setAttribute('color',new T.BufferAttribute(colors,3));landG.computeVertexNormals();
const land=new T.Mesh(landG,new T.MeshStandardMaterial({map:groundTexture(),vertexColors:true,roughness:1,side:T.DoubleSide}));
land.receiveShadow=true;land.name='Terra batida e barro dinâmico V12.10';scene.add(land);
const slab=new T.Mesh(new T.BoxGeometry(W,.52,L),new T.MeshStandardMaterial({color:'#614832',roughness:1}));
slab.position.y=Math.min(...soil)-.55;slab.receiveShadow=true;scene.add(slab);
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
// O renderizador da V12.9 dependia de um shader transparente em todas as faces,
// inclusive nas áreas secas. Alguns WebGL móveis não apresentavam as poças.
// Aqui desenhamos APENAS triângulos molhados: cor opaca, malha rastreável e sem "água invisível".
const SURFACE_VISIBLE=.006, SURFACE_RIPPLE=.012, SURFACE_POND=.018;
const waterG=grid(),wet=new Float32Array(size),flow=new Float32Array(size*2);
const waterColors=new Float32Array(size*3),waterIndices=waterG.index.array;
const waterClear=new T.Color('#347f99'),waterBright=new T.Color('#4894a8');
const waterMud=new T.Color('#876043');
const waterClearRGB=waterClear.toArray(),waterBrightRGB=waterBright.toArray(),waterMudRGB=waterMud.toArray();
waterG.setAttribute('wet',new T.BufferAttribute(wet,1).setUsage(T.DynamicDrawUsage));
waterG.setAttribute('flow',new T.BufferAttribute(flow,2).setUsage(T.DynamicDrawUsage));
waterG.setAttribute('turbidity',new T.BufferAttribute(turbidity,1).setUsage(T.DynamicDrawUsage));
waterG.setAttribute('color',new T.BufferAttribute(waterColors,3).setUsage(T.DynamicDrawUsage));
waterG.setDrawRange(0,0);
const waterM=new T.MeshBasicMaterial({
 vertexColors:true,side:T.DoubleSide,transparent:false,depthWrite:true,toneMapped:false,fog:true
});
const water=new T.Mesh(waterG,waterM);
water.frustumCulled=false;water.renderOrder=3;water.name='Poças e lagoas visíveis V12.10';
scene.add(water);
function impactHeightAt(x,z){
 const h=sample(soil,x,z),d=sample(depth,x,z);
 return d>=SURFACE_RIPPLE?h+d:h;
}
function displayWaterHeightAt(x,z){
 const h=sample(soil,x,z),d=sample(depth,x,z);
 return h+(d>=SURFACE_VISIBLE?d+.015:.010);
}
// Gotas físicas visuais: cilindro alongado, brilho em pixels e halos suaves.
const MAX_DROPS=mobile?230:420,MAX_SPLASH=mobile?160:260,MAX_RIPPLES=mobile?32:54;
const drops=[],splashes=[],ripples=[],dropPos=new Float32Array(MAX_DROPS*3);
const dropG=new T.BufferGeometry();dropG.setAttribute('position',new T.BufferAttribute(dropPos,3));
const dropTexture=(()=>{const c=document.createElement('canvas');c.width=c.height=64;
 const x=c.getContext('2d'),g=x.createRadialGradient(32,32,1,32,32,30);
 g.addColorStop(0,'rgba(229,245,252,.82)');g.addColorStop(.28,'rgba(175,209,222,.64)');
 g.addColorStop(.57,'rgba(110,172,194,.20)');g.addColorStop(1,'rgba(110,172,194,0)');
 x.fillStyle=g;x.fillRect(0,0,64,64);return new T.CanvasTexture(c);})();
const halo=new T.Points(dropG,new T.PointsMaterial({color:'#bad4df',map:dropTexture,transparent:true,
 size:mobile?10:9,sizeAttenuation:false,depthWrite:false,opacity:.46}));
halo.frustumCulled=false;halo.renderOrder=5;scene.add(halo);
const streak=new T.InstancedMesh(new T.CylinderGeometry(.012,.016,.32,6),
 new T.MeshBasicMaterial({color:'#b0cdd9',transparent:true,opacity:.66,depthWrite:false}),MAX_DROPS);
streak.frustumCulled=false;streak.renderOrder=5;streak.count=0;scene.add(streak);
// Sprays: true droplets of soil or water moving in small arcs.
const splashMesh=new T.InstancedMesh(new T.IcosahedronGeometry(.055,0),
 new T.MeshBasicMaterial({color:'#e1ebee',transparent:true,opacity:.80,depthWrite:false}),MAX_SPLASH);
splashMesh.frustumCulled=false;splashMesh.renderOrder=6;splashMesh.count=0;scene.add(splashMesh);
// Cada gota em uma poça cria duas cristas sucessivas sem planos flutuantes.
const rippleMaterial=new T.ShaderMaterial({side:T.DoubleSide,transparent:true,depthWrite:false,depthTest:true,
 vertexShader:'attribute float strength; attribute float mud; varying float vStrength; varying float vMud; void main(){vStrength=strength;vMud=mud;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:'precision mediump float; varying float vStrength; varying float vMud; void main(){if(vStrength<.012)discard;vec3 col=mix(vec3(.42,.68,.74),vec3(.76,.90,.92),min(vStrength,1.));col=mix(col,vec3(.66,.49,.32),clamp(vMud,0.,1.)*.87);gl_FragColor=vec4(col,clamp(vStrength,0.,.84));}'
});
const RIPPLE_SEG=32,ripplePool=[];
function ringGeometry(){
 // Dois anéis, três vértices em cada seção: borda - crista - borda.
 const g=new T.BufferGeometry(),p=new Float32Array((RIPPLE_SEG+1)*6*3);
 const strengths=new Float32Array((RIPPLE_SEG+1)*6),muds=new Float32Array((RIPPLE_SEG+1)*6),tri=[];
 for(let n=0;n<RIPPLE_SEG;n++)for(let band=0;band<2;band++){
  const k=n*6+band*3,j=(n+1)*6+band*3;
  for(let e=0;e<2;e++)tri.push(k+e,j+e,k+e+1,k+e+1,j+e,j+e+1);
 }
 g.setAttribute('position',new T.BufferAttribute(p,3).setUsage(T.DynamicDrawUsage));
 g.setAttribute('strength',new T.BufferAttribute(strengths,1).setUsage(T.DynamicDrawUsage));
 g.setAttribute('mud',new T.BufferAttribute(muds,1).setUsage(T.DynamicDrawUsage));
 g.setIndex(tri);return g;
}
for(let i=0;i<MAX_RIPPLES;i++){
 const mesh=new T.Mesh(ringGeometry(),rippleMaterial);mesh.visible=false;mesh.frustumCulled=false;mesh.renderOrder=6;
 scene.add(mesh);ripplePool.push(mesh);
}
// Bilinear interpolation along every ripple vertex means the rings rise and bend with water and land.
function sample(a,x,z){
 const ix=clamp((x+W*.5)/dx,0,NX-1.001),iz=clamp((z+L*.5)/dz,0,NZ-1.001);
 const i=Math.floor(ix),j=Math.floor(iz),tx=ix-i,tz=iz-j;
 return (a[idx(i,j)]*(1-tx)+a[idx(i+1,j)]*tx)*(1-tz)+
 (a[idx(i,j+1)]*(1-tx)+a[idx(i+1,j+1)]*tx)*tz;
}
function waterHeight(x,z){return sample(soil,x,z)+sample(depth,x,z);}
function setSoilType(next){
 soilType=next;
 const cfg={loam:[1,1],loose:[1.18,1.85],clay:[1.35,.24],compacted:[.66,.12]}[next]||[1,1];
 for(let k=0;k<size;k++){
  soilCapacity[k]=baseCapacity[k]*cfg[0];permeability[k]=basePermeability[k]*cfg[1];
  if(soilMoisture[k]>soilCapacity[k]){depth[k]+=soilMoisture[k]-soilCapacity[k];soilMoisture[k]=soilCapacity[k];}
 }
 land.material.color.set(next==='clay'?'#b6a08f':next==='loose'?'#c8ae94':next==='compacted'?'#bcb5ad':'#ffffff');
 rebuild();updateInfo(true);
}
// Ondas no solo são marcas baixas e curtas; em poças há dois anéis que se espalham.
const groundRippleMaterial=rippleMaterial.clone();
groundRippleMaterial.fragmentShader='precision mediump float; varying float vStrength; void main(){if(vStrength<.018)discard;gl_FragColor=vec4(.53,.37,.24,clamp(vStrength*.72,0.,.43));}';
function updateRipples(dt){
 for(let i=ripples.length-1;i>=0;i--){
  const r=ripples[i];r.age+=dt;
  if(r.age>=r.life){r.mesh.visible=false;ripples.splice(i,1);continue;}
  const mesh=r.mesh,g=mesh.geometry,p=g.attributes.position.array,fade=g.attributes.strength.array,mud=g.attributes.mud.array;
  const phase=r.age/r.life,liquid=r.kind==='water';
  const outer=liquid?(.045+phase*.94):(.005+phase*.06);
  const inner=liquid?(.025+Math.max(0,phase-.15)*.82):0;
  const outerFade=(1-phase)*(liquid?.92:.24);
  const innerFade=liquid?(1-phase)*.65*clamp((phase-.14)*6,0,1):0;
  let visible=0;
  for(let n=0;n<=RIPPLE_SEG;n++){
   const angle=n/RIPPLE_SEG*Math.PI*2,c=Math.cos(angle),sn=Math.sin(angle);
   for(let band=0;band<2;band++){
    const rad=band===0?outer:inner,strength=band===0?outerFade:innerFade;
    const halfWidth=liquid?.026+rad*.010:.004+rad*.003;
    for(let e=0;e<3;e++){
     const rr=Math.max(.003,rad+(e-1)*halfWidth),x=r.x+c*rr,z=r.z+sn*rr,k=n*6+band*3+e;
     const edge=x>W*.5-.08||x<-W*.5+.08||z>L*.5-.08||z<-L*.5+.08;
     const waterHere=sample(depth,x,z);
     // Amostra topografia em todos os vértices, sem anel em plano horizontal.
     const y=liquid?displayWaterHeightAt(x,z):sample(soil,x,z);
     p[k*3]=x;p[k*3+1]=y+(liquid?.008:.004);p[k*3+2]=z;
     const allowed=!edge&&!rockAt(x,z)&&(!liquid||waterHere>=SURFACE_RIPPLE)&&!( !liquid&&waterHere>=SURFACE_RIPPLE);
     fade[k]=(allowed&&e===1&&strength>.01)?strength:0;
     mud[k]=liquid?sample(turbidity,x,z):0;
     visible+=fade[k];
    }
   }
  }
  mesh.visible=visible>.02;
  g.attributes.position.needsUpdate=true;g.attributes.strength.needsUpdate=true;g.attributes.mud.needsUpdate=true;
 }
}
const dropObj=new T.Object3D(),splashObj=new T.Object3D();
let mode='rain',process='combined',level=3,lastRainLevel=3,timeScale=4,paused=false,showWet=true,enableInfiltration=true;
let rainStyle='enhanced',time=0,visualTime=0,acc=0,spawnAcc=0,lastUI=0,wetted=0,frame=0;
const rainLevels=[0,.32,.63,1,1.57,2.4],rainNames=['Sem chuva','Garoa','Chuva fraca','Chuva moderada','Chuva forte','Temporal intenso'];
// Chuva ampliada para visualizar a formação no time-lapse, sem criar lagos artificialmente.
// Chuva moderada: parte infiltra, parte escoa às depressões; temporal ainda pode inundar.
const rainMeters=[0,.0004,.0012,.0035,.007,.013];
function add(x,z,vol){
 const i=Math.round((x+W/2)/dx),j=Math.round((z+L/2)/dz);
 if(i<1||j<1||i>=NX-1||j>=NZ-1)return;
 const k=idx(i,j);if(!blocked[k])depth[k]=Math.min(1.65,depth[k]+vol);
}
function seed(m){
 depth.fill(0);delta.fill(0);soilMoisture.fill(0);deepWater.fill(0);canopy.fill(0);turbidity.fill(0);
 ripples.forEach(r=>r.mesh.visible=false);ripples.length=0;totalImpacts=0;
 drops.length=0;splashes.length=0;dropG.setDrawRange(0,0);streak.count=splashMesh.count=0;
 stats.rain=stats.infiltrated=stats.evaporated=stats.transpired=stats.outflow=0;
 time=0;visualTime=0;acc=0;spawnAcc=0;lastUI=0;
 // Reiniciar no seco, sem poças pré-fabricadas: observar as poças se formando.
 for(let k=0;k<size;k++)soilMoisture[k]=soilCapacity[k]*.025;
 rebuild();updateInfo(true);
}
// A chuva é alimentada por um campo uniforme; gotas animadas representam a mesma chuva,
// sem depositar um segundo volume ao colidir (evita contagem dupla).
function hydrologyStep(dt){
 const rain=rainMeters[level]*dt*(mode==='storm'?1.28:mode==='lagoon'?1.23:1);
 const interp=process==='retention'?1.75:process==='infiltration'?.95:1;
 const infiltrate=process==='runoff'?.11:process==='infiltration'?3.0:process==='retention'?.8:1;
 const evaporate=process==='retention'?3.1:process==='runoff'?.65:1;
 const speed=process==='runoff'?1.65:1;
 for(let k=0;k<size;k++){
  if(blocked[k])continue;
  if(rain>0){
   const canopyCap=.007+cover[k]*.037;
   const retained=Math.min(rain*cover[k]*.55*interp,Math.max(0,canopyCap-canopy[k]));
   canopy[k]+=retained;depth[k]+=rain-retained;stats.rain+=rain*area;
  }
  const sat=clamp(soilMoisture[k]/soilCapacity[k],0,1);
  if(enableInfiltration&&depth[k]>.000001){
   const remaining=soilCapacity[k]-soilMoisture[k];
   const intake=Math.min(depth[k],Math.max(0,remaining),
     permeability[k]*infiltrate*(.08+1.15*(1-sat)**1.4)*dt);
   depth[k]-=intake;soilMoisture[k]+=intake;stats.infiltrated+=intake*area;
  }
  // Parte da água sai dos poros superficiais e alimenta a camada subterrânea.
  const saturation=clamp(soilMoisture[k]/soilCapacity[k],0,1);
  // Percolação continua após a chuva, abrindo poros para absorver água da superfície.
  const seep=Math.min(soilMoisture[k],Math.max(0,saturation-.42)*.0030*dt);
  soilMoisture[k]-=seep;deepWater[k]+=seep;
  // Água interceptada por folhas / palhada evapora antes de tocar a terra.
  const ec=Math.min(canopy[k],(.00020+cover[k]*.00012)*evaporate*dt);
  canopy[k]-=ec;stats.evaporated+=ec*area;
  // Evaporação da água exposta continua mesmo quando a chuva é desligada.
  const es=Math.min(depth[k],.00040*evaporate*dt);
  depth[k]-=es;stats.evaporated+=es*area;
  const soilEvap=Math.min(soilMoisture[k],.000065*evaporate*dt);
  soilMoisture[k]-=soilEvap;stats.evaporated+=soilEvap*area;
  const roots=Math.min(soilMoisture[k],cover[k]*.00013*evaporate*dt);
  soilMoisture[k]-=roots;stats.transpired+=roots*area;
  // Formação progressiva de lama: partículas soltas sob chuva/turbulência.
  const erosion=soilErosion[soilType]||.37;
  const stirred=depth[k]>.002 ? rain*erosion*(7.0-4.5*cover[k]) : 0;
  const runoffStir=depth[k]>.002 ? erosion*depth[k]*.006*dt : 0;
  const settle=.0026*dt*(1.0+Math.max(0,1.0-erosion));
  turbidity[k]=clamp(turbidity[k]+stirred+runoffStir-settle,0,({loam:.32,loose:1,clay:.78,compacted:.14}[soilType]||.32));
 }
 flowStep(dt,speed);
}
function flowStep(dt,multiplier){
 delta.fill(0);const speed=(.62+rainLevels[level]*.07)*dt*2.0*multiplier;
 for(let j=1;j<NZ-1;j++)for(let i=1;i<NX-1;i++){
  const k=idx(i,j),v=depth[k];if(blocked[k]||v<.000008)continue;
  const head=soil[k]+v,neigh=[k-1,k+1,k-NX,k+NX],transfer=[0,0,0,0];let sum=0;
  for(let n=0;n<4;n++){const q=neigh[n];if(blocked[q])continue;
   const diff=head-soil[q]-depth[q];if(diff<=0)continue;
   const amount=diff*speed*(n<2?dz/dx:dx/dz)*.38;transfer[n]=amount;sum+=amount;
  }
  const fraction=sum>v?v/sum:1;
  for(let n=0;n<4;n++)if(transfer[n]){const a=transfer[n]*fraction;delta[k]-=a;delta[neigh[n]]+=a;}
 }
 for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
  const k=idx(i,j);
  if(blocked[k]){depth[k]=0;continue;}
  depth[k]=Math.max(0,depth[k]+delta[k]);
  if(i===0||j===0||i===NX-1||j===NZ-1){
   const escape=depth[k]*Math.min(.25,dt*.35);
   depth[k]-=escape;stats.outflow+=escape*area;
  }
 }
}
function rebuild(){
 const p=waterG.attributes.position.array,w=waterG.attributes.wet.array,f=waterG.attributes.flow.array;
 const vc=waterG.attributes.color.array;
 let count=0,faceIndex=0;
 for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
  const k=idx(i,j),v=depth[k];
  const show=v>=SURFACE_VISIBLE;
  w[k]=clamp((v-.002)/.013,0,1);
  p[k*3+1]=soil[k]+(show?v+.015:.010);
  if(show)count++;
  const left=idx(Math.max(0,i-1),j),right=idx(Math.min(NX-1,i+1),j);
  const up=idx(i,Math.max(0,j-1)),down=idx(i,Math.min(NZ-1,j+1));
  f[k*2]=(soil[left]+depth[left]-soil[right]-depth[right])*.6;
  f[k*2+1]=(soil[up]+depth[up]-soil[down]-depth[down])*.6;
  // Mistura gradual azul -> barro, e contraste sutil para mostrar movimento.
  const muddiness=clamp(turbidity[k]*.89,0,.89);
  const wave=.5+.5*Math.sin(nx(i)*11.0+nz(j)*8.0-visualTime*2.7);
  const highlight=.09+wave*.09;
  for(let m=0;m<3;m++){
   const clear=waterClearRGB[m]*(1-highlight)+waterBrightRGB[m]*highlight;
   vc[k*3+m]=clear*(1-muddiness)+waterMudRGB[m]*muddiness;
  }
  const sat=showWet?clamp(soilMoisture[k]/Math.max(soilCapacity[k],.001)*.95+w[k]*.35,0,.94):0;
  for(let m=0;m<3;m++)colors[3*k+m]=dry[3*k+m]*(1-sat)+mudRGB[m]*sat;
 }
 // Escolhemos triângulos molhados, em vez de um plano transparente sobre todo o relevo.
 for(let j=0;j<NZ-1;j++)for(let i=0;i<NX-1;i++){
  const a=idx(i,j),b=a+1,c=a+NX,d=c+1;
  // Apenas triângulos com 2 ou 3 vértices molhados; evita pintar os trechos secos.
  const triA=(depth[a]>=SURFACE_VISIBLE?1:0)+(depth[b]>=SURFACE_VISIBLE?1:0)+(depth[c]>=SURFACE_VISIBLE?1:0);
  const triB=(depth[b]>=SURFACE_VISIBLE?1:0)+(depth[c]>=SURFACE_VISIBLE?1:0)+(depth[d]>=SURFACE_VISIBLE?1:0);
  if(triA>=2){waterIndices[faceIndex++]=a;waterIndices[faceIndex++]=c;waterIndices[faceIndex++]=b;}
  if(triB>=2){waterIndices[faceIndex++]=b;waterIndices[faceIndex++]=c;waterIndices[faceIndex++]=d;}
 }
 waterG.setDrawRange(0,faceIndex);
 wetted=count*area;
 waterG.index.needsUpdate=true;
 waterG.attributes.position.needsUpdate=true;
 waterG.attributes.color.needsUpdate=true;
 waterG.attributes.wet.needsUpdate=true;waterG.attributes.flow.needsUpdate=true;
 waterG.attributes.turbidity.needsUpdate=true;landG.attributes.color.needsUpdate=true;
 waterG.computeVertexNormals();
}
// O solo define a cor, a altura e o número das partículas expelidas.
function spawnSplash(x,z,h){
 const i=Math.round((x+W*.5)/dx),j=Math.round((z+L*.5)/dz);
 if(i<0||j<0||i>=NX||j>=NZ)return;
 const k=idx(i,j);if(blocked[k])return;
 totalImpacts++;
 const saturation=clamp(soilMoisture[k]/Math.max(.001,soilCapacity[k]),0,1);
 const inWater=sample(depth,x,z)>=SURFACE_RIPPLE;
 const muddy=turbidity[k];
 // Um impacto em poça mobiliza pequenas partículas; água barrenta expele gotículas castanhas.
 if(inWater)turbidity[k]=clamp(turbidity[k]+.0018*(soilErosion[soilType]||.37),0,1);
 const waterTint=new T.Color('#a8c8d6').lerp(new T.Color('#907058'),muddy*.91);
 const dirtTint=new T.Color(soilType==='clay'?'#795743':soilType==='loose'?'#82634c':
   soilType==='compacted'?'#8e847b':'#90745b');
 dirtTint.lerp(new T.Color('#584436'),saturation*.45);
 const count=inWater?7+Math.floor(random()*5):
   saturation>.58?4+Math.floor(random()*3):1+Math.floor(random()*3);
 const tint=inWater?waterTint:dirtTint;
 const power=inWater?.45:saturation>.58?.24:.14;
 for(let j=0;j<count&&splashes.length<MAX_SPLASH;j++){
  const a=random()*Math.PI*2,v=power*(.52+random()*.8);
  // Partículas minúsculas, sem faíscas de luz: pequenos fragmentos de água ou lama.
  splashes.push({
   x,z,y:h+(inWater?.018:.012),vx:Math.cos(a)*v,vz:Math.sin(a)*v,
   vy:(inWater?.52:saturation>.58?.30:.16)*(.5+random()*.8),
   life:inWater?.20+random()*.23:.14+random()*.15,age:0,
   color:tint.clone(),
   size:inWater?.13+random()*.10:saturation>.58?.11+random()*.10:.08+random()*.07
  });
 }
 if(ripples.length<MAX_RIPPLES){
  // Ondas de solo são pontuais; as de água propagam-se por mais tempo e distância.
  if(inWater||random()<.54){
   const mesh=ripplePool.find(m=>!m.visible&&!ripples.some(r=>r.mesh===m));
   if(mesh){
    mesh.material=inWater?rippleMaterial:groundRippleMaterial;
    mesh.visible=true;
    ripples.push({mesh,x,z,kind:inWater?'water':'ground',age:0,
     life:inWater?.55+random()*.40:.10+random()*.10});
   }
  }
 }
}
function dropStep(dt){
 const rainfall=rainLevels[level]*(mode==='storm'?1.4:1);
 spawnAcc+=rainfall*(mobile?155:230)*dt;
 const toSpawn=Math.min(55,Math.floor(spawnAcc));spawnAcc-=toSpawn;
 for(let k=0;k<toSpawn&&drops.length<MAX_DROPS;k++){
  const x=(random()-.5)*(W-.8),z=(random()-.5)*(L-.8);
  drops.push({x,z,y:2.2+random()*4.3,speed:4.4+random()*3.2,stretch:.70+random()*.75});
 }
 const factor=1+Math.log2(timeScale)*.12;
 let displayedImpacts=0;
 for(let i=drops.length-1;i>=0;i--){
  const d=drops[i];d.y-=d.speed*dt*factor;
  const gh=impactHeightAt(d.x,d.z);
  if(d.y<=gh){
   if(displayedImpacts<5){spawnSplash(d.x,d.z,gh);displayedImpacts++;}
   drops[i]=drops[drops.length-1];drops.pop();
  }
 }
 const enhanced=rainStyle==='enhanced';
 streak.material.opacity=enhanced?.67:.46;
 halo.material.size=enhanced?(mobile?10:9):(mobile?7:6);
 halo.material.opacity=enhanced?.49:.31;
 for(let i=0;i<drops.length;i++){
  const d=drops[i],o=i*3;dropPos[o]=d.x;dropPos[o+1]=d.y-.1;dropPos[o+2]=d.z;
  dropObj.position.set(d.x,d.y,d.z);dropObj.rotation.set(0,0,-.095);
  dropObj.scale.set(enhanced?1.05:.78,enhanced?d.stretch*.90:d.stretch*.7,enhanced?1.05:.78);
  dropObj.updateMatrix();streak.setMatrixAt(i,dropObj.matrix);
 }
 dropG.setDrawRange(0,drops.length);dropG.attributes.position.needsUpdate=true;
 streak.count=drops.length;streak.instanceMatrix.needsUpdate=true;
 for(let i=splashes.length-1;i>=0;i--){
  const p=splashes[i];p.age+=dt;p.vy-=4.8*dt;p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;
  if(p.age>=p.life||p.y<impactHeightAt(p.x,p.z)){
   splashes[i]=splashes[splashes.length-1];splashes.pop();
  }
 }
 for(let i=0;i<splashes.length;i++){
  const p=splashes[i];splashObj.position.set(p.x,p.y,p.z);
  splashObj.rotation.set(0,0,0);splashObj.scale.setScalar(p.size);
  splashObj.updateMatrix();splashMesh.setMatrixAt(i,splashObj.matrix);splashMesh.setColorAt(i,p.color);
 }
 splashMesh.count=splashes.length;splashMesh.instanceMatrix.needsUpdate=true;
 if(splashMesh.instanceColor)splashMesh.instanceColor.needsUpdate=true;
 updateRipples(dt);
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
function setRainLevel(value){
 level=clamp(value,0,5);
 if(level>0)lastRainLevel=level;
 $('intensity').value=String(level);
 $('stopRain').textContent=level===0?'🌧 Retomar chuva':'☀ Parar chuva';
 $('stopRain').setAttribute('aria-pressed',String(level===0));
 updateInfo(true);
}
$('intensity').addEventListener('change',e=>setRainLevel(+e.target.value));
$('stopRain').addEventListener('click',()=>setRainLevel(level===0?(lastRainLevel||3):0));
$('process').addEventListener('change',e=>{process=e.target.value;updateInfo(true);});
$('timelapse').addEventListener('change',e=>{timeScale=clamp(+e.target.value,1,64);acc=0;updateInfo(true);});
$('infiltration').addEventListener('change',e=>{enableInfiltration=e.target.checked;updateInfo(true);});
$('wetVisual').addEventListener('change',e=>{showWet=e.target.checked;rebuild();updateInfo(true);});
$('rainStyle').addEventListener('change',e=>{rainStyle=e.target.value;updateInfo(true);});
$('soilType').addEventListener('change',e=>setSoilType(e.target.value));
for(const btn of document.querySelectorAll('[data-mode]'))btn.addEventListener('click',()=>setMode(btn.dataset.mode));
function setMode(next){
 mode=next;level=next==='storm'?5:next==='lagoon'?4:next==='puddle'?3:3;
 setRainLevel(level);seed(mode);
 document.querySelectorAll('[data-mode]').forEach(el=>el.classList.toggle('active',el.dataset.mode===mode));
 $('hint').textContent={rain:'Chuva cai sobre a terra e se divide em infiltração, escoamento e evapotranspiração.',
 puddle:'Relevo seco no começo: observe as poças surgirem e se unirem nas depressões.',
 lagoon:'Acompanhe a lagoa se formando, enchendo e extravasando pelo terreno.',
 storm:'Temporal: a terra satura e aumenta o escoamento entre as pedras 3D.'}[mode];
}
$('replay').addEventListener('click',()=>seed(mode));
$('pause').addEventListener('click',()=>{paused=!paused;$('pause').textContent=paused?'▶ Continuar':'⏸ Pausar';updateInfo(true);});
$('cam').addEventListener('click',()=>{yaw=.83;pitch=.79;radius=24;});
function updateInfo(force){
 const now=performance.now();if(!force&&now-lastUI<420)return;lastUI=now;
 const pct=Math.round(level/5*100),name=rainNames[level];
 $('intensityName').textContent=name;$('rainMeter').style.setProperty('--rain-fill',pct+'%');
 let surface=0,stored=0,ground=0,leaf=0,saturated=0,participating=0;
 let lagoonWet=0,lagoonCells=0,lagoonMax=0,otherPuddles=0,mudTotal=0,mudWeight=0,wetSoilOnly=0;
 for(let k=0;k<size;k++)if(!blocked[k]){
  surface+=depth[k];stored+=soilMoisture[k];ground+=deepWater[k];leaf+=canopy[k];
   if(depth[k]>.010){mudTotal+=turbidity[k]*depth[k];mudWeight+=depth[k];}
  const soilSat=clamp(soilMoisture[k]/soilCapacity[k],0,1);
  saturated+=soilSat;participating++;
  if(soilSat>.18&&depth[k]<SURFACE_VISIBLE)wetSoilOnly++;
  const i=k%NX,j=Math.floor(k/NX),x=nx(i),z=nz(j),b=basins[1];
  const q=((x-b.x)/b.sx)**2+((z-b.z)/b.sz)**2;
  if(q<.72){lagoonCells++;if(depth[k]>=SURFACE_VISIBLE)lagoonWet++;lagoonMax=Math.max(lagoonMax,depth[k]);}
  if(depth[k]>=SURFACE_VISIBLE&&q>.72)otherPuddles++;
 }
 surface*=area;stored*=area;ground*=area;leaf*=area;
 $('rainDetail').textContent='Chuva '+name+' • '+timeScale+'× • '+drops.length+' gotas 3D';
 $('soilStats').textContent='Terra: '+Math.round(saturated/Math.max(1,participating)*100)+'% saturada · '+stored.toFixed(1)+' m³ retidos no solo';
 $('waterStats').textContent='Poças '+wetted.toFixed(1)+' m² ('+Math.round(wetted/(participating*area)*100)+'% do terreno) · água superficial '+surface.toFixed(1)+' m³';
 $('wetGroundStats').textContent='Terra úmida sem poça: '+(wetSoilOnly*area).toFixed(1)+' m² · infiltração acumulada '+stats.infiltrated.toFixed(1)+' m³ · subterrâneo '+ground.toFixed(1)+' m³';
 $('splashStats').textContent='Impactos visíveis '+totalImpacts+' · '+splashes.length+' partículas · '+ripples.length+' ondulações no relevo';
  $('mudStats').textContent='Sedimentos suspensos: '+Math.round(mudTotal/Math.max(.0001,mudWeight)*100)+'% · '+({loam:'terra comum',loose:'terra solta',clay:'barro argiloso',compacted:'terra compactada'}[soilType]||soilType);
 $('lakeStats').textContent='Lagoa: '+Math.round(lagoonWet/Math.max(1,lagoonCells)*100)+'% da bacia coberta · profundidade '+lagoonMax.toFixed(2)+' m · '+otherPuddles+' células de poças';
 $('cycleStats').textContent='Infiltrou '+stats.infiltrated.toFixed(1)+' m³ · folhas '+leaf.toFixed(1)+' m³ · evapotranspiração '+(stats.evaporated+stats.transpired).toFixed(1)+' m³ · drenou '+stats.outflow.toFixed(1)+' m³';
 $('simClock').textContent='Tempo simulado: '+(time<60?time.toFixed(0)+' s':(time/60).toFixed(1)+' min')+(paused?' · PAUSADO':'');
 $('info').textContent=level===0?'Chuva cessou: poças infiltram, evaporam e escoam • toque para adicionar água':'Parte da chuva infiltra na terra; as depressões concentram poças • arraste para girar';
}

let last=performance.now();function loop(now){
 requestAnimationFrame(loop);const dt=Math.min((now-last)/1000,.065);last=now;
 if(!paused&&!document.hidden){
  time+=dt*timeScale;visualTime+=dt*(1+.16*Math.log2(timeScale));
  dropStep(dt);
  acc+=dt*timeScale;
  const step=timeScale>=64?.22:timeScale>=16?.14:timeScale>=4?.09:.06;
  let steps=0;while(acc>=step&&steps<12){hydrologyStep(step);acc-=step;steps++;}
  if(acc>step*14)acc=step*14;
  if(++frame%2===0)rebuild();
  updateInfo(false);
 }
 setView();renderer.render(scene,camera);
}

window.addEventListener('resize',resize);
window.addEventListener('error',e=>{if((e.filename||'').includes('agua-v1211'))fail(e.error||e.message);});
window.arcanoWaterV1211={scene,renderer,seed,setMode,add,setSoilType,terrain:land,water,stones,soilMoisture,deepWater,canopy,depth,soil,turbidity,stats,impactHeightAt,setRainLevel,getMode:()=>mode,getWetArea:()=>wetted,getImpacts:()=>totalImpacts};
try{resize();setMode('puddle');requestAnimationFrame(loop);}catch(e){fail(e);}
})();