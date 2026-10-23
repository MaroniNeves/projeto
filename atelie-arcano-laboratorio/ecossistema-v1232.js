/* Ateliê Arcano V12.33 — gramados densos e terreno sem piscadas.
 * Malhas FBX/OBJ compactadas dos arquivos do usuário; não simula parâmetros de
 * campo cientificamente calibrados. Conserva modelos invisíveis fora da lupa.
 */
(function(){
'use strict';
const T=window.THREE,api=window.arcanoWaterV1226,raw=window.ARCANO_ASSETS_V1232;
const $=id=>document.getElementById(id);
if(!T||!api||!raw){console.warn('[Arcano Ecologia] Cena ou pacote ainda não disponível.');return;}
const NX=innerWidth<680?68:96,NZ=innerWidth<680?56:78,W=20,L=16,dx=W/(NX-1),dz=L/(NZ-1);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),rand=(seed)=>()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const random=rand(6232026),cells=NX*NZ,cover=new Float32Array(cells),traffic=new Float32Array(cells),roadMask=new Float32Array(cells),riverMask=new Float32Array(cells);
const green=new T.Color('#477e3d'),roadColor=new T.Color('#9e7954');
// Pequenas fontes renováveis de sementes e néctar das plantas; se esgotam
// localmente quando as operárias forrageiam e se recuperam com vegetação viva.
const foodResources=new Float32Array(cells);
const realm=new T.Group();realm.name='V12.32 | Rio estrada grama e fauna do solo';api.scene.add(realm);
const foliage=new T.Group(),rocks=new T.Group(),animals=new T.Group(),roads=new T.Group();
foliage.name='Tufos reais de grama Quaternius';rocks.name='Cinco geometrias de pedras Rocks.fbx';
animals.name='Formigas e minhocas minúsculas';roads.name='Estrada e ponte demonstrativas';
for(const g of [foliage,rocks,animals,roads])realm.add(g);
const meshLibrary={},textureLibrary={};let ready=false, biologicalSpeed=4,previewMagnification=1, trampleEnabled=true;
const grassPatches=[],rockPositions=[],colonies=[],worms=[],antDraws=[],wormDraws=[];
const nestDisplays=new Map();
let colonySequence=0,ecologicalDays=0,burrowLength=0,castsReturned=0;
const ecoEvents=[];
function recordEcoEvent(message){
 const entry='Dia '+Math.floor(ecologicalDays)+' · '+message;
 if(ecoEvents[0]===entry)return;
 ecoEvents.unshift(entry);ecoEvents.length=Math.min(6,ecoEvents.length);
}
const targetNativeGrass=api.forestInstances.filter(a=>a.type==='grass');
const roadZ=x=>4.6-.67*Math.sin(x*.47+.6)+.20*Math.sin(x*1.34);
const riverX=z=>-2.3+.55*Math.sin(z*.69)+.48*Math.sin(z*.29+1.3);
function idx(x,z){const i=clamp(Math.round((x+W*.5)/dx),0,NX-1),j=clamp(Math.round((z+L*.5)/dz),0,NZ-1);return j*NX+i;}
function position(k){const i=k%NX,j=(k-i)/NX;return {x:-W*.5+i*dx,z:-L*.5+j*dz};}
function height(x,z){
 const fx=clamp((x+W*.5)/dx,0,NX-1.00001),fz=clamp((z+L*.5)/dz,0,NZ-1.00001);
 const i=fx|0,j=fz|0,a=fx-i,b=fz-j;
 const A=api.soil[j*NX+i],B=api.soil[j*NX+i+1],C=api.soil[(j+1)*NX+i],D=api.soil[(j+1)*NX+i+1];
 return A*(1-a)*(1-b)+B*a*(1-b)+C*(1-a)*b+D*a*b;
}
const mobileDevice=innerWidth<680;
const grassBudgets=mobileDevice?{high:7200,balanced:4100,low:760}:{high:14000,balanced:7600,low:1400};
let grassDrawn=0,lastGrassQuality='';
function applyGrassQuality(){
 const quality=api.getGraphicsQuality()||'balanced';
 const ratio=Math.min(1,(grassBudgets[quality]||grassBudgets.balanced)/grassBudgets.high);
 grassDrawn=0;
 for(const m of foliage.children)if(m.isInstancedMesh){
  m.count=Math.min(m.userData.planted||0,Math.round((m.userData.planted||0)*ratio));
  grassDrawn+=m.count;m.instanceMatrix.needsUpdate=true;
 }
 lastGrassQuality=quality;
}
async function loadMeshes(){
 const bytes=Uint8Array.from(atob(raw.compressed),c=>c.charCodeAt(0));
 if(!('DecompressionStream' in window))throw new Error('Navegador sem DecompressionStream');
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
 const data=JSON.parse(await new Response(stream).text());
 for(const [name,source] of Object.entries(data)){
  const geom=new T.BufferGeometry();
  geom.setAttribute('position',new T.Float32BufferAttribute(source.v,3));
  if(source.uv)geom.setAttribute('uv',new T.Float32BufferAttribute(source.uv,2));
  geom.setIndex(source.i);geom.computeVertexNormals();geom.computeBoundingSphere();
  meshLibrary[name]=geom;
 }
 for(const [name,src] of Object.entries(raw.textures)){
  const t=new T.TextureLoader().load(src);t.colorSpace=T.SRGBColorSpace;
  t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=innerWidth<680?2:4;
  textureLibrary[name]=t;
 }
 ready=true;
}
function material(kind){
 const map=textureLibrary[kind]||null;
 const tint=kind==='rock'?'#d5d0c5':'#73935b';
 return new T.MeshStandardMaterial({color:tint,map,roughness:1,metalness:0,side:T.DoubleSide,
  alphaTest:kind==='rock'?0:.38,transparent:false,depthWrite:true});
}
function makeMesh(name,kind){const geo=meshLibrary[name];return geo?new T.Mesh(geo,material(kind)):null;}
// V12.34: a estrada é uma ALTERAÇÃO DE COR no shader do solo,
 // nunca uma fita de polígonos sobreposta. Apenas a ponte é geometria extra.
const footprintSites=[];
const printShapes=new T.Group();printShapes.name='Pegadas de lama compactada';roads.add(printShapes);
function generateFootprints(){
 printShapes.clear();footprintSites.length=0;
 const sole=new T.CircleGeometry(.045,10);
 const mudMaterial=new T.MeshStandardMaterial({
  color:'#36261b',transparent:true,opacity:.0,depthWrite:false,
  polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2,
  roughness:1,metalness:0,side:T.DoubleSide
 });
 // Sempre existe apenas uma malha instanciada para solas e calcanhares.
 const max=160,stamps=new T.InstancedMesh(sole,mudMaterial,max);
 stamps.name='Marcas de passos pressionadas no barro';
 stamps.count=0;stamps.frustumCulled=false;printShapes.add(stamps);
 const dummy=new T.Object3D(),marks=[];
 for(let k=0;k<76;k++){
  const x=-8.6+k*.226,z=roadZ(x),side=k%2?1:-1;
  for(let part=0;part<2;part++){
   const fx=x+(part?.047:0),fz=z+side*.15+(part?.016:0);
   const cell=idx(fx,fz);
   if(roadMask[cell]<.55||riverMask[cell]>.64||api.depth[cell]>.09)continue;
   const tilt=Math.atan2(roadZ(x+.08)-roadZ(x-.08),.16);
   dummy.position.set(fx,height(fx,fz)+.016,fz);
   dummy.rotation.set(-Math.PI/2,0,tilt);
   dummy.scale.set(part?.80:1.25,part?1.15:1.6,1);
   dummy.updateMatrix();marks.push(dummy.matrix.clone());
  }
 }
 footprintSites.push(...marks);
 for(let i=0;i<Math.min(max,marks.length);i++)stamps.setMatrixAt(i,marks[i]);
 stamps.count=Math.min(max,marks.length);stamps.instanceMatrix.needsUpdate=true;
 return stamps;
}
let muddyFootprints=null;
function markFootprint(x,z){
 if(!muddyFootprints)return;
 const k=idx(x,z),moist=api.soilMoisture[k]/Math.max(.001,api.soilCapacity[k]);
 if(moist<.33||api.depth[k]>.045)return;
 const o=new T.Object3D();
 for(const offset of [-.09,.09]){
  const fx=x+.048*(random()-.5),fz=z+offset;
  o.position.set(fx,height(fx,fz)+.017,fz);
  o.rotation.set(-Math.PI/2,0,random()*.36-.18);
  o.scale.set(.85+random()*.45,1.1+random()*.45,1);o.updateMatrix();
  footprintSites.push(o.matrix.clone());
  if(footprintSites.length>160)footprintSites.shift();
 }
 for(let i=0;i<footprintSites.length;i++)muddyFootprints.setMatrixAt(i,footprintSites[i]);
 muddyFootprints.count=footprintSites.length;
 muddyFootprints.instanceMatrix.needsUpdate=true;
 updateFootprints();
}
function updateFootprints(){
 if(!muddyFootprints)return;
 let wet=0;for(let k=0;k<cells;k+=7){
  if(roadMask[k]>.60)wet=Math.max(wet,
   clamp(api.soilMoisture[k]/Math.max(.001,api.soilCapacity[k]),0,1));
 }
 const intensity=clamp((wet-.32)*1.25,0,.74);
 muddyFootprints.visible=intensity>.02;
 muddyFootprints.material.opacity=intensity*.70;
}
function makeRoad(){
 // Travessia apenas se a ESTRADA cruza um vão REAL do rio. Duas margens
 // verificadas, tablado com viga por baixo e encontros firmes no terreno.
 let crossing=null,nearest=Infinity;
 for(let x=-7;x<7;x+=.06){
  const z=roadZ(x),k=idx(x,z),river=riverMask[k];
  if(river>.65&&Math.abs(x-riverX(z))<nearest){
   crossing=x;nearest=Math.abs(x-riverX(z));
  }
 }
 if(crossing!==null){
  function findBank(direction){
   for(let d=.12;d<2.1;d+=.05){
    const x=crossing+d*direction,z=roadZ(x),k=idx(x,z);
    if(riverMask[k]<.08&&api.depth[k]<.045&&roadMask[k]>.45)
     return {x,z,y:height(x,z)};
   }
   return null;
  }
  const left=findBank(-1),right=findBank(1);
  if(left&&right){
   const length=Math.hypot(right.x-left.x,right.z-left.z);
   if(length>.7&&length<4.1){
    const bridge=new T.Group();bridge.name='Ponte com encontros reais nas duas margens';
    const wood=new T.MeshStandardMaterial({color:'#786047',roughness:1,metalness:0});
    const edge=new T.MeshStandardMaterial({color:'#4b3729',roughness:1,metalness:0});
    const midX=(left.x+right.x)*.5,midZ=(left.z+right.z)*.5;
    const course=Math.atan2(right.z-left.z,right.x-left.x);
    const up=Math.max(left.y,right.y)+.09;
    const beamY=up-.075;
    // Vigas longitudinais conectam as cabeceiras e suportam todas as tábuas.
    for(const side of [-1,1]){
     const beam=new T.Mesh(new T.BoxGeometry(length+.22,.13,.10),edge);
     beam.rotation.y=-course;
     const lateral=side*.47;
     beam.position.set(midX-Math.sin(course)*lateral,beamY,midZ+Math.cos(course)*lateral);
     beam.castShadow=true;bridge.add(beam);
    }
    const planks=Math.max(5,Math.ceil(length/.17));
    for(let i=0;i<planks;i++){
     const t=(i+.5)/planks;
     const plank=new T.Mesh(new T.BoxGeometry(length/planks*.92,.075,1.22),wood);
     plank.rotation.y=-course;
     plank.position.set(left.x+(right.x-left.x)*t,up,
      left.z+(right.z-left.z)*t);
     plank.castShadow=true;plank.receiveShadow=true;bridge.add(plank);
    }
    for(const bank of [left,right]){
     // Encontros enterrados nas duas margens; sem pontas no ar.
     const base=new T.Mesh(new T.BoxGeometry(.24,.16,1.30),edge);
     base.rotation.y=-course;
     base.position.set(bank.x,bank.y+.043,bank.z);
     base.castShadow=true;base.receiveShadow=true;bridge.add(base);
     for(const side of [-1,1]){
      const dx=-Math.sin(course)*side*.47,dz=Math.cos(course)*side*.47;
      const support=new T.Mesh(new T.BoxGeometry(.095,
       Math.max(.13,up-bank.y+.13),.095),wood);
      support.position.set(bank.x+dx,(up+bank.y)*.5-.015,bank.z+dz);
      support.castShadow=true;bridge.add(support);
     }
    }
    roads.add(bridge);
    console.info('[Arcano] Ponte ancorada entre margens',left,right,'vão',length.toFixed(2));
   }
  }else{
   console.warn('[Arcano] Sem duas margens válidas: ponte não criada.');
  }
 }
 muddyFootprints=generateFootprints();updateFootprints();
}
function initializeLandscape(){
 for(let k=0;k<cells;k++){
  const {x,z}=position(k),distRoad=Math.abs(z-roadZ(x)),distRiver=Math.abs(x-riverX(z));
  roadMask[k]=clamp(1-distRoad/.83,0,1);riverMask[k]=clamp(1-distRiver/.68,0,1);
  // A estrada recebe a compactação histórica; rio rebaixa o leito local.
  if(riverMask[k]>.05){
   // Profundidade física só nasce na fonte; impedir poças azuis geradas em todas as células.
   api.soil[k]-=Math.pow(riverMask[k],1.5)*.13;
  }
  if(roadMask[k]>.1){traffic[k]=.68+roadMask[k]*.23;
   api.permeability[k]*=(1-roadMask[k]*.44);}
  const shade=.5+.5*Math.sin(x*.85+z*.34)*Math.cos(z*.6);
  const moist=api.soilMoisture[k]/Math.max(.001,api.soilCapacity[k]);
  cover[k]=clamp(.77+.17*shade+.15*moist-roadMask[k]*.96-riverMask[k]*.91,0,1);
  foodResources[k]=Math.max(0,cover[k]*(1-roadMask[k])*.12);
 }
 const geom=api.terrain.geometry,positionAttribute=geom.getAttribute('position');
 for(let k=0;k<cells;k++)positionAttribute.setY(k,api.soil[k]);
 positionAttribute.needsUpdate=true;geom.computeVertexNormals();
 makeRoad();
}
// Um só renderizador aplica verde, barro e chuva a cada quadro.
// Uma segunda escrita periódica causava a piscada observada no Android.
function terrainTint(){/* delegated to main rebuild() */}
function grassShape(){
 const names=['grassShort1','grassMixed1','grassTall1','grassMixed2'];
 const max=grassBudgets.high,meshes=new Map(),dummies=new Map();
 for(const name of names){
  const kind=name.startsWith('grassMixed')?'grassMixed':name==='grassTall1'?'grassTall':'grassShort';
  const geo=meshLibrary[name];if(!geo)continue;
  const m=new T.InstancedMesh(geo,material(kind),max);
  m.frustumCulled=false;m.castShadow=false;m.receiveShadow=true;
  m.userData.planted=0;m.count=0;m.name='Capim original em moitas · '+name;
  meshes.set(name,m);dummies.set(name,new T.Object3D());foliage.add(m);
 }
 if(!meshes.size)return;
 const cols=mobileDevice?82:112,rows=mobileDevice?66:98,sites=[];
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)sites.push([i,j]);
 for(let i=sites.length-1;i>0;i--){
  const j=Math.floor(random()*(i+1)),tmp=sites[i];sites[i]=sites[j];sites[j]=tmp;
 }
 let planted=0;
 for(const [i,j] of sites){
  if(planted>=max)break;
  const x0=-9.35+(i+.5)/cols*18.7,z0=-7.35+(j+.5)/rows*14.7;
  const k0=idx(x0,z0),density=clamp(cover[k0]*(1-traffic[k0]),0,1);
  if(density<.11||api.depth[k0]>.035)continue;
  const count=density>.70?4:density>.42?3:2;
  for(let n=0;n<count&&planted<max;n++){
   const x=x0+(random()-.5)*.21,z=z0+(random()-.5)*.20,k=idx(x,z);
   const life=clamp(cover[k]*(1-traffic[k]),0,1);
   if(life<.12||random()>Math.min(1,life*1.24)||api.depth[k]>.025)continue;
   const roll=random();
   const name=riverMask[k]>.21&&roll<.22?'grassTall1':roll<.40?'grassShort1':
    roll<.76?'grassMixed1':'grassMixed2';
   const mesh=meshes.get(name),o=dummies.get(name);
   if(!mesh)continue;
   const base=name==='grassTall1'?.37:name==='grassShort1'?.31:.32;
   const scale=base*(.75+random()*.53);
   o.position.set(x,height(x,z)-.014,z);o.rotation.set(0,random()*Math.PI*2,0);
   o.scale.set(scale*(.76+random()*.35),scale*(.84+random()*.40),
    scale*(.80+random()*.38));o.updateMatrix();
   const index=mesh.userData.planted++;
   mesh.setMatrixAt(index,o.matrix);
   grassPatches.push({x,z,k,mesh,index,matrix:o.matrix.clone()});planted++;
  }
 }
 for(const mesh of meshes.values())mesh.instanceMatrix.needsUpdate=true;
 applyGrassQuality();
}
// FOLHAS: pequena malha 3D low-poly de seis faces (nervura central elevada),
// nas cores dos modelos Quaternius já carregados. O próprio MegaKit/Ultimate
// possui texturas de folha; este fragmento usa geometria pequena isolada para
// queda individual sem carregar centenas de FBX/GLB adicionais.
const fallingLeaves=[],leafLitterField=new Float32Array(cells);
const leafMeshes=[],leafGroup=new T.Group();
leafGroup.name='Queda de folhas, serrapilheira e decomposição';realm.add(leafGroup);
let leafClock=0,leafVisualClock=0,leafDeposited=0,leafCollected=0;
function leafGeometry(){
 const geo=new T.BufferGeometry();
 const v=[
  0,0,-.08, -.039,0,-.018, 0,.012,.020,
  0,0,-.08,0,.012,.020,.039,0,-.018,
  -.039,0,-.018,-.049,0,.052,0,.012,.020,
  0,.012,.020,-.049,0,.052,0,0,.092,
  0,.012,.020,0,0,.092,.049,0,.052,
  .039,0,-.018,0,.012,.020,.049,0,.052
 ];
 geo.setAttribute('position',new T.Float32BufferAttribute(v,3));
 geo.computeVertexNormals();return geo;
}
function setupLeafVisuals(){
 const geometry=leafGeometry(),palette=[
  '#598739','#c8ab54','#b96443','#5b7140'
 ];
 const capacity=mobileDevice?260:520;
 for(let kind=0;kind<4;kind++){
  const material=new T.MeshStandardMaterial({color:palette[kind],
   roughness:1,metalness:0,side:T.DoubleSide,depthWrite:true});
  const m=new T.InstancedMesh(geometry,material,capacity);
  m.name=['Folhas verdes','Folhas amarelas','Folhas outonais',
   'Agulhas de pinheiro'][kind];
  m.count=0;m.frustumCulled=false;m.castShadow=false;
  leafGroup.add(m);leafMeshes.push(m);
 }
}
function treeLeafKind(a){
 const n=(a.modelName||'').toLowerCase();
 if(a.type==='pine'||/pine/.test(n))return 3;
 if(/maple|bordo|red/.test(n))return 2;
 if(/birch|bétula|yellow/.test(n))return 1;
 return 0;
}
function spawnFallingLeaf(){
 const trees=api.forestInstances.filter(a=>(a.type==='tree'||a.type==='pine')&&a.obj.visible);
 if(!trees.length||fallingLeaves.length>=(mobileDevice?230:460))return;
 const a=trees[Math.floor(random()*trees.length)];
 const width=clamp(a.crownWidth*.25,.20,.95),angle=random()*6.283;
 const radial=Math.sqrt(random())*width;
 const x=clamp(a.x+Math.cos(angle)*radial,-9.5,9.5);
 const z=clamp(a.z+Math.sin(angle)*radial,-7.5,7.5);
 const ground=height(x,z),startY=Math.max(ground+.22,
  (a.dropY||ground+2.3)-random()*.9);
 fallingLeaves.push({kind:treeLeafKind(a),x,z,y:startY,ground,
  age:0,mass:.0006+random()*.0006,stage:'falling',
  turn:random()*6.28,phase:random()*6.28,
  rotX:random()*6.28,rotZ:random()*6.28,scale:.45+random()*.65});
}
function collectLeafFragments(k,limit){
 if(limit<=0||leafLitterField[k]<=0)return 0;
 let remaining=Math.min(limit,leafLitterField[k]),picked=0;
 for(const leaf of fallingLeaves){
  if(leaf.stage!=='ground'||idx(leaf.x,leaf.z)!==k||leaf.mass<=0)continue;
  const take=Math.min(leaf.mass,remaining);
  leaf.mass-=take;picked+=take;remaining-=take;
  if(leaf.mass<.000008)leaf.stage='picked';
  if(remaining<.000005)break;
 }
 leafLitterField[k]=Math.max(0,leafLitterField[k]-picked);
 leafCollected+=picked;return picked;
}
function animateLeafFall(dt){
 if(!leafMeshes.length)return;
 const atm=api.atmosphere.getMetrics();
 const rain=api.getRainLevel?.()||0;
 const wind=clamp((atm.wind||0)/3,0,1.4);
 leafClock+=dt*(1+wind*.7+(rain>=3?.45:0));
 while(leafClock>1.0){
  leafClock-=1.0;spawnFallingLeaf();
 }
 const compostMult=1+(rain>0?.45:0)+
  clamp((atm.humidity||.5),0,1)*.5;
 for(let i=fallingLeaves.length-1;i>=0;i--){
  const leaf=fallingLeaves[i];
  if(leaf.stage==='picked'){fallingLeaves.splice(i,1);continue;}
  leaf.age+=dt;
  if(leaf.stage==='falling'){
   leaf.y-=dt*(.38+wind*.18);
   leaf.x=clamp(leaf.x+dt*(wind*.06+Math.sin(leaf.phase+leaf.age*2)*.06),-9.7,9.7);
   leaf.z=clamp(leaf.z+dt*Math.cos(leaf.phase+leaf.age*2)*.055,-7.7,7.7);
   leaf.rotX+=dt*2.6;leaf.rotZ+=dt*1.8;leaf.turn+=dt*.6;
   leaf.ground=height(leaf.x,leaf.z);
   if(leaf.y<=leaf.ground+.02){
    leaf.y=leaf.ground+.018;leaf.stage='ground';
    const k=idx(leaf.x,leaf.z);leafLitterField[k]+=leaf.mass;
    leaf.age=0;
   }
  }else{
   const k=idx(leaf.x,leaf.z),water=clamp(api.soilMoisture[k]/
    Math.max(.001,api.soilCapacity[k]),0,1.4);
   // Serrapilheira apodrece gradualmente; solo úmido acelera a conversão.
   const decomposed=Math.min(leaf.mass,dt*(.0000009+.0000025*water)*compostMult);
   leaf.mass-=decomposed;
   leafLitterField[k]=Math.max(0,leafLitterField[k]-decomposed);
   api.soilLitter[k]=clamp(api.soilLitter[k]+decomposed*.76,0,1.8);
   api.soilOrganic[k]=clamp(api.soilOrganic[k]+decomposed*.24,0,1.8);
   leafDeposited+=decomposed;
   leaf.y=height(leaf.x,leaf.z)+.019;
   if(leaf.mass<.00001){fallingLeaves.splice(i,1);continue;}
  }
 }
 leafVisualClock+=dt;
 if(leafVisualClock<.055)return;
 leafVisualClock=0;
 const counts=[0,0,0,0],obj=new T.Object3D();
 for(const leaf of fallingLeaves){
  const kind=leaf.kind,m=leafMeshes[kind],index=counts[kind]++;
  if(index>=m.instanceMatrix.count){counts[kind]--;continue;}
  obj.position.set(leaf.x,leaf.y,leaf.z);
  obj.rotation.set(leaf.stage==='falling'?leaf.rotX:-Math.PI/2,leaf.turn,
   leaf.stage==='falling'?leaf.rotZ:0);
  const size=leaf.scale*(kind===3?.48:1);
  obj.scale.setScalar(size);obj.updateMatrix();m.setMatrixAt(index,obj.matrix);
 }
 for(let kind=0;kind<4;kind++){
  const m=leafMeshes[kind];m.count=counts[kind];
  m.instanceMatrix.needsUpdate=true;
 }
}
function rockShape(){
 api.stones.visible=false;const names=['rock1','rock2','rock3','rock4','rock5'];
 const mat=material('rock');
 for(let i=0;i<45;i++){
  const physical=api.rockSolids[i%Math.max(1,api.rockSolids.length)];
  const x=physical?physical.x:(random()-.5)*18.4;
  const z=physical?physical.z:(random()-.5)*14.4,k=idx(x,z);
  if(roadMask[k]>.65)continue;
  const key=names[i%names.length];const geom=meshLibrary[key];if(!geom)continue;
  const m=new T.Mesh(geom,mat.clone());m.name='Rocks.fbx '+key;
  const scale=.30+random()*.65;
  m.scale.set(scale*(.70+random()*.8),scale*(.46+random()*.65),scale*(.65+random()*.8));
  m.rotation.set((random()-.5)*.35,random()*Math.PI*2,(random()-.5)*.35);
  m.position.set(x,height(x,z)-.065,z);
  m.castShadow=true;m.receiveShadow=true;rocks.add(m);rockPositions.push({x,z});
 }
}
function ecologicalDayRate(dt){return dt*biologicalSpeed/1440;}
// Trilha química discreta na malha: evapora/é lavada pela chuva e é reforçada
// quando a forrageadora retorna com alimento.
function reinforceTrail(c,site,intensity=1){
 const start=idx(c.x,c.z),a=position(start),b=position(site);
 const count=Math.max(2,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/dx));
 for(let step=0;step<=count;step++){
  const t=step/count,k=idx(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t);
  const dry=clamp(api.soilMoisture[k]/Math.max(.001,api.soilCapacity[k]),0,1);
  c.pheromones[k]=clamp(c.pheromones[k]+(.05+.26*intensity)*(1-dry*.15),0,2);
 }
 c.lastFoodSite=site;
}
function chooseFoodSites(c){
 const origin=idx(c.x,c.z),o=position(origin),sites=[];
 for(let iz=-8;iz<=8;iz+=2)for(let ix=-8;ix<=8;ix+=2){
  const x=clamp(Math.round((c.x+W*.5)/dx)+ix,0,NX-1);
  const z=clamp(Math.round((c.z+L*.5)/dz)+iz,0,NZ-1),k=z*NX+x;
  const site=position(k),distance=Math.hypot(o.x-site.x,o.z-site.z);
  const food=foodResources[k]+api.soilLitter[k]*.55+leafLitterField[k]*.85;
  const pheromone=c.pheromones[k];
  const submerged=api.depth[k]>.06;
  sites.push({k,score:(food*1.85+pheromone*.26)/(1+distance*.27)
   *(submerged?.05:1)*(1-roadMask[k]*.28)});
 }
 sites.sort((a,b)=>b.score-a.score);
 return sites.slice(0,18);
}
function newColony(x,z,workers=24,food=12,founder=false){
 const c={id:colonySequence++,queen:true,queenFertile:true,queenAge:0,x,z,
 workers,food,deathProgress:0,eggProgress:0,foodGathered:0,
 brood:founder?[]:[{stage:'egg',age:0,count:5},{stage:'larva',age:8,count:4},
  {stage:'pupa',age:18,count:3}],
 scouts:0,foragers:0,nurses:0,builders:0,guards:0,dead:0,
 temperature:23,queenStress:0,pheromones:new Float32Array(cells),lastFoodSite:idx(x,z),
 tunnels:Math.max(.09,workers*.003),chambers:1,spoil:Math.max(.03,workers*.0006),
 foodStored:food*.35,founder, reproductiveCooldown:0,daysWithoutFood:0};
 distributeTasks(c);return c;
}
function distributeTasks(c){
 const n=c.workers;
 c.foragers=Math.floor(n*.44);c.nurses=Math.floor(n*.23);
 c.builders=Math.floor(n*.17);c.guards=Math.floor(n*.10);
 c.scouts=Math.max(0,n-c.foragers-c.nurses-c.builders-c.guards);
}
function nestSurface(c){
 const anchor=position(idx(c.x,c.z)),y=height(c.x,c.z);
 if(nestDisplays.has(c.id))return nestDisplays.get(c.id);
 const g=new T.Group();g.name='Formigueiro colônia '+(c.id+1);g.position.set(c.x,y,c.z);
 const granules=new T.MeshStandardMaterial({color:'#98764e',roughness:1,metalness:0});
 const mound=new T.Mesh(new T.ConeGeometry(.18,.085,16,3),granules);
 mound.rotation.y=c.id*1.2;mound.position.y=.035;g.add(mound);
 const entrance=new T.Mesh(new T.CircleGeometry(.042,20),
  new T.MeshBasicMaterial({color:'#24170f',depthWrite:false,side:T.DoubleSide}));
 entrance.rotation.x=-Math.PI/2;entrance.position.y=.088;g.add(entrance);
 const rim=new T.Mesh(new T.TorusGeometry(.056,.012,5,20),
  new T.MeshStandardMaterial({color:'#b48c62',roughness:1,metalness:0}));
 rim.rotation.x=-Math.PI/2;rim.position.y=.092;g.add(rim);
 const grainsG=new T.SphereGeometry(.009,4,3);
 for(let i=0;i<18;i++){
  const angle=i*2.399,dist=.08+.085*random();
  const grain=new T.Mesh(grainsG,granules);
  grain.position.set(Math.cos(angle)*dist,.012+random()*.025,Math.sin(angle)*dist);
  grain.scale.set(.4+random(),.30+random(),.5+random());g.add(grain);
 }
 realm.add(g);nestDisplays.set(c.id,{group:g,mound,entrance,rim});
 updateNestSurface(c);
 return nestDisplays.get(c.id);
}
function updateNestSurface(c){
 const nest=nestDisplays.get(c.id);if(!nest)return;
 const scale=clamp(.55+c.spoil*1.4,.65,1.75);
 nest.mound.scale.set(scale,Math.min(1.55,scale*.7),scale);
 nest.group.position.y=height(c.x,c.z);
 nest.entrance.visible=c.workers>0||c.queen;
 nest.rim.visible=nest.entrance.visible;
}
// Galerias computadas abaixo da superfície: comprimento/câmaras são físicos
// no estado do solo, mas não se abre geometria cara no mapa à distância.
function excavateNest(c,days,safe){
 if(c.workers<=0)return;
 const k=idx(c.x,c.z);
 const saturation=clamp(api.soilMoisture[k]/Math.max(.001,api.soilCapacity[k]),0,1);
 const effort=Math.max(0,c.builders)*days*.00045*safe*(1-saturation*.6);
 if(effort<=0)return;
 const available=Math.min(effort,.018*days);
 c.tunnels=clamp(c.tunnels+available,0,8);
 const previousChambers=c.chambers;
 c.chambers=Math.min(12,1+Math.floor(c.tunnels/.32));
 if(c.chambers>previousChambers)
  recordEcoEvent('Colônia '+(c.id+1)+' construiu a câmara '+c.chambers+'.');
 c.spoil=clamp(c.spoil+available*.64,0,1);
 burrowLength+=available;
 // Solo escavado vai para o monte exterior. Túneis melhoram macroporosidade
 // local mas obras excessivas não transformam o solo em meio infinito.
 api.permeability[k]=clamp(api.permeability[k]*(1+available*.13),.000001,.16);
 api.soilBiota[k]=clamp(api.soilBiota[k]+available*.06,0,1);
 updateNestSurface(c);
}
function initialColonies(){
 recordEcoEvent('Início com rainhas, crias e operárias.');
 for(const [x,z] of [[-6,2.5],[4.5,2.9],[-2,-4.1]]){
  const c=newColony(x,z,24+colonies.length*12,15,false);
  colonies.push(c);nestSurface(c);
 }
 const totalWormSites=mobileDevice?28:48;
 for(let i=0;i<totalWormSites;i++){
  let x=(random()-.5)*15,z=(random()-.5)*11;
  // Favorece lama AREJADA, sem criar minhocas em água funda.
  // Uma faixa junto ao rio recebe mais grupos que terras secas.
  let best=-1;
  for(let tries=0;tries<28;tries++){
   const tz=(random()-.5)*13;
   const nearRiver=i%3===0;
   const tx=nearRiver?riverX(tz)+(random()<.5?-1:1)*(.60+random()*.52):
     (random()-.5)*18;
   const kk=idx(tx,tz);
   const score=goodForWorms(kk)+
    (nearRiver&&api.depth[kk]<.045?.28:0)-
    roadMask[kk]*.38;
   if(score>best){best=score;x=tx;z=tz;}
  }
  worms.push({x,z,adults:3+Math.floor(random()*5),juveniles:2,
   cocoons:[{days:10,count:1,incubation:39+random()*27}],organic:.1,
   burrows:0,matureProgress:0,deathProgress:0,pairProgress:0,
   juvenileMaturityDays:55+random()*22,locomotion:random()*6.28,
   depth:.14+random()*.23,castings:0,age:30+random()*180});
 }
}
function goodForWorms(k){
 const moist=api.soilMoisture[k]/Math.max(.0001,api.soilCapacity[k]);
 const temp=api.atmosphere.getMetrics().temperature;
 // Lamas oxigenadas próximas das margens são favoráveis; água funda/anóxica
 // e solo seco NÃO são. A matéria orgânica sustenta a reprodução.
 const muddy=clamp((moist-.28)/.34,0,1)*clamp((1.13-moist)/.21,0,1);
 const oxygen=clamp((.085-api.depth[k])/.08,.03,1);
 const organic=.45+.55*clamp(api.soilOrganic[k]/.25,0,1);
 return muddy*oxygen*organic*clamp((temp-9)/9,0,1)*clamp((36-temp)/13,0,1);
}
function addCarcass(x,z,mass=.03){
 const k=idx(x,z);api.soilLitter[k]=clamp(api.soilLitter[k]+mass,0,1.8);
 api.soilOrganic[k]=clamp(api.soilOrganic[k]+mass*.15,0,1.8);
 return k;
}
// Passos ecológicos discretos por dia simulado; parâmetros são didáticos
// e dependem de espécies/condições reais, não constituem previsão de campo.
function lifeDay(days){
 ecologicalDays+=days;
 // Fotossíntese e desenvolvimento da vegetação renovam sementes/néctar;
 // não surgem novas fontes sobre estrada, área alagada ou gramado morto.
 for(let k=0;k<cells;k++){
  const vegetation=clamp(cover[k]*(1-traffic[k]),0,1);
  const growth=clamp(api.soilPlant[k],0,1.3);
  const submersion=api.depth[k]>.065?.12:1;
  foodResources[k]=clamp(foodResources[k]+
   days*(.001+.012*vegetation*growth)*submersion*(1-roadMask[k]),0,.24);
 }
 const climate=api.atmosphere.getMetrics(),temp=climate.temperature;
 for(const c of [...colonies]){
  if(!c.pheromones)c.pheromones=new Float32Array(cells);
  const k=idx(c.x,c.z);
  const moist=clamp(api.soilMoisture[k]/Math.max(.0001,api.soilCapacity[k]),0,1.8);
  const flooded=api.depth[k]>.075;
  c.temperature=temp;c.reproductiveCooldown=Math.max(0,c.reproductiveCooldown-days);
  const safe=clamp((temp-10)/10,0,1)*clamp((39-temp)/10,0,1)*
   clamp((moist-.04)/.28,0,1)*clamp((1.16-moist)/.4,0,1)*
   (flooded?.13:1);
  // Feromônios evaporam e são lavados pela água superficial/chuva.
  const decay=clamp((.13+Math.max(0,moist-.7)*.18)*days,0,.85);
  for(let i=0;i<cells;i++)c.pheromones[i]*=(1-decay);
  distributeTasks(c);
  let gathered=0,searchBudget=days*(.014+.0014*c.foragers)*safe;
  const sites=chooseFoodSites(c);
  for(const item of sites){
   if(searchBudget<=0)break;
   const site=item.k;
   const available=foodResources[site]+api.soilLitter[site]*.70+leafLitterField[site]*.85;
   const possible=Math.min(available,searchBudget);
   if(possible<.000015)continue;
   const take=possible*Math.min(1,.55+.35*c.pheromones[site]);
   const plantFood=Math.min(foodResources[site],take);
   foodResources[site]-=plantFood;
   const leafTaken=collectLeafFragments(site,Math.max(0,take-plantFood));
   c.leafCargo=clamp((c.leafCargo||0)+leafTaken*125,0,1.0);
   const litterFood=Math.min(api.soilLitter[site],Math.max(0,take-plantFood-leafTaken));
   api.soilLitter[site]-=litterFood;
   searchBudget-=take;
   gathered+=take;
   reinforceTrail(c,site,Math.min(1,take*30));
  }
  c.food=clamp(c.food+gathered*35,0,360);
  c.foodGathered+=gathered;c.foodStored=clamp(c.foodStored+gathered*7,0,120);
  // Fezes e restos da alimentação entram novamente na camada orgânica.
  const detritus=gathered*.13+days*c.workers*.000012;
  api.soilOrganic[k]=clamp(api.soilOrganic[k]+detritus*.75,0,1.8);
  api.soilLitter[k]=clamp(api.soilLitter[k]+detritus*.25,0,1.8);
  castsReturned+=detritus;
  const broodFood=c.brood.reduce((sum,g)=>sum+(g.stage==='larva'?g.count:0),0)*.004;
  // Rainha fundadora claustral utiliza reservas durante os primeiros ovos.
  // Ao surgir a primeira operária, o consumo comum da colônia é retomado.
  const founding=c.founder&&c.workers===0;
  const need=days*(founding?.078:(.19+.015*c.workers+broodFood));
  const ration=Math.min(c.food,need);c.food-=ration;
  const fed=need>0?ration/need:1;
  c.daysWithoutFood=fed<.38?c.daysWithoutFood+days:Math.max(0,c.daysWithoutFood-days*.25);
  // Morte de operárias, agravada por escassez, calor, enchentes e idade.
  c.deathProgress+=days*c.workers*
   (.0028+(1-safe)*.013+Math.max(0,.62-fed)*.034);
  const casualties=Math.min(c.workers,Math.floor(c.deathProgress));
  c.deathProgress-=casualties;
  if(casualties){
   c.workers-=casualties;c.dead+=casualties;
   addCarcass(c.x,c.z,casualties*.0018);
   if(casualties>=7)recordEcoEvent('Colônia '+(c.id+1)+' perdeu '+casualties+' operárias.');
  }
  const nurseEfficiency=clamp(c.nurses/Math.max(1,c.brood.length*1.3),0,1);
  if(c.queen&&c.queenFertile&&safe>.42&&fed>.50&&c.food>1.2){
   // Rainha põe ovos; operárias estéreis não se tornam rainhas.
   c.eggProgress+=days*(.72+c.workers*.026)*safe;
   const eggs=Math.min(9,Math.floor(c.eggProgress));
   if(eggs>0){
    c.eggProgress-=eggs;
    c.brood.push({stage:'egg',age:0,count:eggs});
    c.food=Math.max(0,c.food-eggs*.028);
   }
  }
  let born=0;const next=[];
  const development=clamp((temp-11)/16,.18,1.25)*clamp(fed*.75+nurseEfficiency*.25,.12,1);
  for(const cohort of c.brood){
   cohort.age+=days*development;
   if(cohort.stage==='egg'&&cohort.age>=9)cohort.stage='larva';
   if(cohort.stage==='larva'&&cohort.age>=24)cohort.stage='pupa';
   if(cohort.stage==='pupa'&&cohort.age>=40){born+=cohort.count;continue;}
   if(fed<.3&&random()<days*.08){
    const lost=Math.min(cohort.count,Math.max(1,Math.ceil(cohort.count*.12)));
    cohort.count-=lost;addCarcass(c.x,c.z,lost*.00024);
   }
   if(cohort.count>0)next.push(cohort);
  }
  c.brood=next.slice(-96);
  c.workers=clamp(c.workers+born,0,240);
  if(c.founder&&born>0)recordEcoEvent('Primeiras operárias da colônia '+(c.id+1)+' nasceram.');
  if(c.workers>0)c.founder=false;
  c.queenAge+=days;
  // Reservas e proteção das operárias influenciam a sobrevivência da rainha.
  // Períodos prolongados sem alimentação, água ou oxigênio causam colapso.
  if(c.queen){
   const danger=safe<.18||fed<.22?1:safe<.35||fed<.52?.32:-.48;
   c.queenStress=clamp((c.queenStress||0)+days*danger,0,80);
  }
  if(c.queen&&(c.queenAge>365*9||c.queenStress>34)){
   c.queen=false;c.queenFertile=false;
   addCarcass(c.x,c.z,.004);
   recordEcoEvent('Rainha da colônia '+(c.id+1)+' morreu.');
  }
  distributeTasks(c);
  excavateNest(c,days,safe);
  const nuptialWeather=temp>21&&temp<31&&moist>.25&&moist<.8&&!flooded;
  if(c.queen&&c.workers>140&&c.food>36&&c.queenAge>110&&
   nuptialWeather&&c.reproductiveCooldown===0&&colonies.length<6&&
   random()<days*.018){
   let fx=c.x,fz=c.z,found=false;
   for(let tries=0;tries<24;tries++){
    const angle=random()*Math.PI*2,dist=2.2+random()*3.8;
    const px=clamp(c.x+Math.cos(angle)*dist,-9,9);
    const pz=clamp(c.z+Math.sin(angle)*dist,-7,7),newK=idx(px,pz);
    if(roadMask[newK]>.38||riverMask[newK]>.36||api.depth[newK]>.035)continue;
    if(colonies.some(other=>Math.hypot(other.x-px,other.z-pz)<1.45))continue;
    fx=px;fz=pz;found=true;break;
   }
   if(found){
    // Rainha jovem fecundada em voo nupcial, de forma probabilística.
    const daughter=newColony(fx,fz,0,8,true);
    daughter.brood.push({stage:'egg',age:0,count:3});
    colonies.push(daughter);nestSurface(daughter);visualizeAnimals();
    recordEcoEvent('Nova rainha fundou a colônia '+(daughter.id+1)+'.');
    c.food-=7;c.reproductiveCooldown=110;
   }
  }
 }
 let hatchedToday=0;
 for(const w of worms){
  const k=idx(w.x,w.z),safe=goodForWorms(k);
  const moist=clamp(api.soilMoisture[k]/Math.max(.0001,api.soilCapacity[k]),0,1.8);
  const wetEnough=moist>.35&&moist<1.13;
  // Alimentam-se do detrito e dos microrganismos que o colonizam.
  const litter=Math.min(api.soilLitter[k],days*w.adults*.0017*safe);
  api.soilLitter[k]-=litter;
  // As minhocas também ingerem pequenas parcelas do solo rico em detritos.
  // Toda massa de húmus gerada vem de matéria ingerida; não surge do nada.
  const organicIngested=Math.min(api.soilOrganic[k],
   days*w.adults*.00014*safe);
  api.soilOrganic[k]-=organicIngested;
  const consumed=litter+organicIngested;
  const nutrition=clamp(consumed/Math.max(.00001,days*w.adults*.00019),0,1);
  const casts=consumed*.73;
  w.castings+=casts;castsReturned+=casts;
  api.soilOrganic[k]=clamp(api.soilOrganic[k]+casts*.62,0,1.8);
  api.soilN[k]=clamp(api.soilN[k]+casts*.14,0,1.3);
  api.soilP[k]=clamp(api.soilP[k]+casts*.051,0,1.3);
  api.soilBiota[k]=clamp(api.soilBiota[k]+days*w.adults*.00028*safe,0,1);
  const work=days*w.adults*.00125*safe;
  w.burrows+=work;burrowLength+=work;
  api.permeability[k]=clamp(api.permeability[k]*(1+work*.022),.000001,.16);
  // Hermafroditas com fecundação cruzada: exigem >= 2 adultos para casulos.
  if(w.adults>=2&&safe>.42&&nutrition>.34){
   w.pairProgress+=days*Math.min(w.adults/4,2)*.082*safe*nutrition;
   const pairings=Math.min(2,Math.floor(w.pairProgress));
   if(pairings>0){
    w.pairProgress-=pairings;
    for(let i=0;i<pairings;i++)w.cocoons.push({
     days:0,count:1+Math.floor(random()*3),incubation:31+random()*43
    });
   }
  }
  let hatch=0;const cocoons=[];
  for(const cocoon of w.cocoons){
   cocoon.days+=days*(safe>.22?1:.25);
   if(cocoon.days>=cocoon.incubation)hatch+=cocoon.count;
   else cocoons.push(cocoon);
  }
  w.cocoons=cocoons.slice(-40);
  w.juveniles=Math.min(130,w.juveniles+hatch);
  hatchedToday+=hatch;
  w.matureProgress+=days*w.juveniles/Math.max(40,w.juvenileMaturityDays)*safe;
  const mature=Math.min(w.juveniles,Math.floor(w.matureProgress));
  w.matureProgress-=mature;w.juveniles-=mature;w.adults+=mature;
  // Mortalidade e reciclagem orgânica com pouca umidade ou inundação anóxica.
  w.deathProgress+=w.adults*days*(safe<.13?.034:.0027+Math.max(0,.35-nutrition)*.011);
  const deaths=Math.min(w.adults,Math.floor(w.deathProgress));
  w.deathProgress-=deaths;
  if(deaths){w.adults-=deaths;addCarcass(w.x,w.z,deaths*.003);}
  w.adults=Math.min(95,w.adults);w.age+=days;
  // Migração lenta das galerias entre células à procura de alimento e umidade.
  if(w.adults>0){
   const heading=position(k),options=[k,k-1,k+1,k-NX,k+NX];
   let best=k,bestScore=-1;
   for(const near of options){
    if(near<0||near>=cells)continue;
    const target=position(near);
    if(Math.hypot(target.x-heading.x,target.z-heading.z)>Math.max(dx,dz)*1.3)continue;
    const score=goodForWorms(near)+api.soilLitter[near]*.35+
      (near===k?.14:0)+random()*.075;
    if(score>bestScore){bestScore=score;best=near;}
   }
   const target=position(best),step=Math.min(1,days*.18);
   w.x+=(target.x-w.x)*step;w.z+=(target.z-w.z)*step;
  }
  // Enterram-se mais quando o ar seca; aproximam-se da superfície após chuva.
  w.depth=clamp(w.depth+(wetEnough&&safe>.4?-.013:.023)*days,.016,.48);
 }
 if(hatchedToday>0&&Math.floor(ecologicalDays)%10===0)
  recordEcoEvent(hatchedToday+' minhocas eclodiram dos casulos.');
}
function visualizeAnimals(){
 for(const child of [...animals.children]){
  animals.remove(child);
  if(child.isInstancedMesh)child.material.dispose();
  if(child.userData.animatedWorm){child.geometry.dispose();child.material.dispose();}
 }
 antDraws.length=0;wormDraws.length=0;
 const variants=['ant1','ant2','ant3','antRed','ant4','ant5'];
 for(const c of colonies){
  const geo=meshLibrary[variants[c.id%6]]||meshLibrary.ant1;if(!geo)continue;
  const max=mobileDevice?10:18;
  const mesh=new T.InstancedMesh(geo,new T.MeshStandardMaterial({
   color:c.id%2?'#a3533b':'#49332b',roughness:1,metalness:0,side:T.DoubleSide}),max);
  mesh.name='Operárias · reconhecimento, coleta, retorno · colônia '+(c.id+1);
  mesh.count=Math.min(max,Math.ceil(c.workers*.2));
  mesh.frustumCulled=false;mesh.castShadow=false;animals.add(mesh);
  antDraws.push({m:mesh,c,max});
 }
 const wormModels=['worm1','worm2','worm3'];
 for(let i=0;i<worms.length;i++){
  const w=worms[i],base=meshLibrary[wormModels[i%3]];
  if(!base)continue;
  const geometry=base.clone(),pos=geometry.getAttribute('position');
  geometry.computeBoundingBox();
  const box=geometry.boundingBox,size=new T.Vector3();box.getSize(size);
  const axis=size.x>size.y&&size.x>size.z?0:size.z>size.y?2:1;
  const side=axis===0?2:0;
  const low=axis===0?box.min.x:axis===1?box.min.y:box.min.z;
  const high=axis===0?box.max.x:axis===1?box.max.y:box.max.z;
  const m=new T.Mesh(geometry,new T.MeshStandardMaterial({
   color:i%3===0?'#90716d':i%3===1?'#9f7e74':'#84625e',
   roughness:1,metalness:0,side:T.DoubleSide}));
  m.name='Minhoca OBJ com segmentos e contrações '+i;
  m.castShadow=false;m.frustumCulled=false;
  m.userData.animatedWorm=true;animals.add(m);
  wormDraws.push({m,w,pos,orig:Float32Array.from(pos.array),
   axis,side,span:Math.max(.0001,high-low),low,phase:random()*6.28});
 }
}let wormVisualFrame=0;
function moveAnimals(t){
 const o=new T.Object3D(),magnify=previewMagnification;
 for(const {m,c,max} of antDraws){
  m.count=Math.min(max,Math.max(0,Math.ceil(c.workers*.2)));
  const target=position(c.lastFoodSite??idx(c.x,c.z));
  for(let i=0;i<m.count;i++){
   const cycle=(t*(.10+.014*(i%4))+i*.17+c.id*.13)%2;
   const outward=cycle<1,along=outward?cycle:2-cycle;
   const swing=.03*Math.sin(t*2.2+i*2.7);
   const x=c.x+(target.x-c.x)*along+Math.sin(i*1.7)*swing;
   const z=c.z+(target.z-c.z)*along+Math.cos(i*1.7)*swing;
   o.position.set(x,height(x,z)+.008,z);
   o.rotation.set(0,Math.atan2(target.x-c.x,target.z-c.z)+(outward?0:Math.PI),0);
   o.scale.setScalar((api.depth[idx(x,z)]>.06?.006:.014)*magnify);
   o.updateMatrix();m.setMatrixAt(i,o.matrix);
  }
  m.instanceMatrix.needsUpdate=true;
 }
 wormVisualFrame++;
 for(const item of wormDraws){
  const {m,w,pos,orig,axis,side,span,low,phase}=item;
  const k=idx(w.x,w.z),quality=goodForWorms(k);
  const moisture=clamp(api.soilMoisture[k]/Math.max(.001,api.soilCapacity[k]),0,1.5);
  const emerging=w.adults>0&&moisture>.36&&moisture<1.06&&
   quality>.24&&Math.sin(t*.13+w.locomotion)>.12;
  m.visible=emerging||previewMagnification>1;
  if(!m.visible)continue;
  const phaseNow=t*2.8+phase;
  for(let j=0;j<pos.count;j++){
   const u=clamp((orig[j*3+axis]-low)/span,0,1);
   const wave=Math.sin(phaseNow-u*12.6);
   for(let component=0;component<3;component++){
    let value=orig[j*3+component];
    if(component===axis)value+=.032*span*wave;
    else if(component===side)value+=.045*span*Math.sin(phaseNow-u*9.3)*Math.sin(u*Math.PI);
    pos.array[j*3+component]=value;
   }
  }
  pos.needsUpdate=true;
  if(wormVisualFrame%6===0)m.geometry.computeVertexNormals();
  const cx=w.x+.036*Math.sin(t*.33+w.locomotion);
  const cz=w.z+.026*Math.sin(t*.26+phase);
  m.position.set(cx,height(cx,cz)-(emerging?.008:w.depth)+.009,cz);
  m.rotation.set(0,w.locomotion+t*.032,0);
  const extension=.068*(1+.12*Math.sin(phaseNow)),radial=.068*(1-.06*Math.sin(phaseNow));
  m.scale.setScalar(radial*magnify);
  m.scale.setComponent(axis,extension*magnify);
 }
}function updateGrassMeshes(){
 const o=new T.Object3D();
 for(const patch of grassPatches){
  if(patch.index>=patch.mesh.count)continue;
  const k=patch.k,wear=traffic[k],c=cover[k],alive=clamp(c*(1-wear),0,1);
  const scale=alive>.045?(.25+.75*alive):.0001;
  o.matrix.copy(patch.matrix);
  o.matrix.decompose(o.position,o.quaternion,o.scale);
  o.scale.multiplyScalar(scale);o.updateMatrix();
  patch.mesh.setMatrixAt(patch.index,o.matrix);
 }
 for(const m of foliage.children)if(m.isInstancedMesh)m.instanceMatrix.needsUpdate=true;
}
function trample(x,z,weight=.22){
 if(!trampleEnabled)return;
 markFootprint(x,z);
 const centerX=clamp(Math.round((x+W*.5)/dx),0,NX-1),centerZ=clamp(Math.round((z+L*.5)/dz),0,NZ-1);
 for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){
  const ix=centerX+i,iz=centerZ+j;if(ix<0||iz<0||ix>=NX||iz>=NZ)continue;
  const k=iz*NX+ix,f=Math.max(0,1-Math.hypot(i,j)/2.7);
  traffic[k]=clamp(traffic[k]+weight*f,0,1);
  api.soilPlant[k]=clamp(api.soilPlant[k]-.15*weight*f,.02,1.25);
  api.permeability[k]=Math.max(.00001,api.permeability[k]*(1-weight*f*.06));
 }
 updateGrassMeshes();
}
let ecologicalAccumulator=0,time=0,grassAccumulator=0,uiAccumulator=0;
function update(dt){
 if(!ready)return;
 dt=Math.min(dt,.09);time+=dt;ecologicalAccumulator+=ecologicalDayRate(dt);
 animateLeafFall(dt);
 grassAccumulator+=dt;uiAccumulator+=dt;
 // Recarrega o rio somente pela fonte a montante, sem água infinita em toda a cena.
 if(grassAccumulator>.7){
  grassAccumulator=0;
  if(api.getGraphicsQuality()!==lastGrassQuality)applyGrassQuality();
  updateFootprints();
  // Alimentação distribuída ao longo da entrada do canal.
  // A célula única forçada a 9 cm criava um disco azul desconectado no canto.
  // Adiciona pequenas parcelas sem substituir a profundidade existente.
  for(let entry=0;entry<7;entry++){
   const z=-7.26+entry*.17,x=riverX(z),k=idx(x,z);
   const water=(.0045-entry*.00035);
   if(water>0&&riverMask[k]>.36&&api.depth[k]<.06)
    api.depth[k]=Math.min(.06,api.depth[k]+water);
  }
  for(let cell=0;cell<cells;cell++){
   const sat=api.soilMoisture[cell]/Math.max(.001,api.soilCapacity[cell]);
   const good=clamp(api.soilPlant[cell]*.57+api.soilHealth[cell]*.25+sat*.18,0,1);
   if(roadMask[cell]>.48)traffic[cell]=Math.max(traffic[cell],.55);
   else traffic[cell]=clamp(traffic[cell]-.0004*biologicalSpeed,0,1);
   cover[cell]=clamp(cover[cell]*.999+good*.001-roadMask[cell]*.0005,0,1);
  }
  updateGrassMeshes();
 }
 while(ecologicalAccumulator>1){lifeDay(1);ecologicalAccumulator-=1;if(nestCutGroup.visible)drawNestCutaway();}
 moveAnimals(time);
 if(uiAccumulator>1.4){uiAccumulator=0;status();}
}
function status(){
 const workers=colonies.reduce((a,b)=>a+b.workers,0),eggs=colonies.reduce((a,b)=>a+b.brood.filter(g=>g.stage==='egg').reduce((sum,c)=>sum+c.count,0),0);
 const larva=colonies.reduce((a,b)=>a+b.brood.reduce((sum,c)=>sum+(c.stage==='larva'?c.count:0),0),0);
 const adults=worms.reduce((a,b)=>a+b.adults,0),cocoons=worms.reduce((a,b)=>a+b.cocoons.reduce((sum,c)=>sum+c.count,0),0);
 updateColonyInspector();
 const el=$('ecoStatus');if(el)el.textContent=
  grassDrawn+' tufos de grama ('+lastGrassQuality+') · '+colonies.length+' colônias · '+workers+' operárias · '+eggs+' ovos · '+larva+' larvas · '+adults+' minhocas adultas · '+cocoons+' casulos · galerias '+burrowLength.toFixed(1)+' m simulados · resíduos '+castsReturned.toFixed(2)+' u. '+
  'É uma simulação ecológica simplificada; rainhas e crias ficam nos ninhos. Quase invisíveis fora da lupa.';
 const eventPanel=$('ecoEvents');if(eventPanel)eventPanel.textContent=ecoEvents.join('\n');
}
const nestCutGroup=new T.Group();
nestCutGroup.name='Raio-X das galerias do formigueiro';
nestCutGroup.visible=false;realm.add(nestCutGroup);
function drawNestCutaway(){
 for(const mesh of [...nestCutGroup.children]){
  nestCutGroup.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();
 }
 const id=Number($('ecoColonySelect')?.value||0),c=colonies.find(x=>x.id===id);
 if(!c)return;
 const points=[],dep=clamp(.15+c.tunnels*.16,.19,.96);
 const y=height(c.x,c.z),branches=Math.min(7,2+Math.floor(c.chambers/2));
 const origin=new T.Vector3(c.x,y-.055,c.z);
 for(let b=0;b<branches;b++){
  const angle=b*2.39996323,radius=Math.min(.85,.18+c.tunnels*.1)*(b+1)/branches;
  const start=new T.Vector3(c.x,y-.055-dep*.22,c.z);
  const end=new T.Vector3(c.x+Math.cos(angle)*radius,
   y-.09-dep*(.35+.07*b),c.z+Math.sin(angle)*radius);
  points.push(origin,start,start,end);
 }
 const geo=new T.BufferGeometry().setFromPoints(points);
 const material=new T.LineBasicMaterial({color:'#dda970',transparent:true,
  opacity:.8,depthTest:false,depthWrite:false});
 const lines=new T.LineSegments(geo,material);lines.renderOrder=20;
 nestCutGroup.add(lines);nestCutGroup.visible=!!$('ecoBurrows')?.checked;
}
function updateColonyInspector(){
 const select=$('ecoColonySelect'),panel=$('ecoColonyDetails');
 if(!select||!panel)return;
 const prior=select.value;
 if(select.options.length!==colonies.length){
  select.textContent='';
  for(const c of colonies){
   const option=document.createElement('option');
   option.value=String(c.id);option.textContent='Colônia '+(c.id+1);
   select.appendChild(option);
  }
  select.value=colonies.some(c=>String(c.id)===prior)?prior:String(colonies[0]?.id??0);
 }
 const c=colonies.find(c=>String(c.id)===select.value);if(!c)return;
 const stages={egg:0,larva:0,pupa:0};
 for(const brood of c.brood)stages[brood.stage]+=brood.count;
 panel.textContent='👑 Rainha '+(c.queen?'viva, fértil':'ausente')+
  ' · alimento '+c.food.toFixed(1)+' · '+c.workers+' operárias: '+
  c.foragers+' coletoras, '+c.scouts+' exploradoras, '+c.nurses+
  ' cuidadoras, '+c.builders+' escavadoras, '+c.guards+' guardas'+
  ' · '+stages.egg+' ovos, '+stages.larva+' larvas, '+stages.pupa+
  ' pupas · '+c.tunnels.toFixed(2)+' m de túneis · '+c.chambers+
  ' câmaras · feromônios '+c.pheromones.reduce((a,v)=>a+v,0).toFixed(1);
}
async function setup(){
 await loadMeshes();initializeLandscape();grassShape();rockShape();setupLeafVisuals();initialColonies();visualizeAnimals();
 drawNestCutaway();
 const board=$('ecoStatus');if(board)board.textContent='Pacotes enviados integrados: '+Object.keys(meshLibrary).length+' malhas · '+colonies.length+' colônias.';
 const s=$('ecoSpeed');if(s){s.oninput=e=>{biologicalSpeed=clamp(+e.target.value,1,200);$('ecoSpeedVal').textContent=biologicalSpeed+'×';};}
 const mag=$('ecoMagnify');if(mag)mag.onchange=e=>{previewMagnification=e.target.checked?6:1;};
 const sim=$('ecoTraffic');if(sim)sim.onclick=()=>{
  for(let i=0;i<36;i++){
   const x=-8+random()*16;
   trample(x,roadZ(x)+(random()-.5)*.8,.12);
  }
  status();
 };
 const colonySelect=$('ecoColonySelect');if(colonySelect)colonySelect.onchange=()=>{updateColonyInspector();drawNestCutaway();};
 const cut=$('ecoBurrows');if(cut)cut.onchange=()=>{drawNestCutaway();nestCutGroup.visible=cut.checked;};
 const feed=$('ecoFeedColony');if(feed)feed.onclick=()=>{
  const id=Number($('ecoColonySelect')?.value||0);
  const c=colonies.find(x=>x.id===id);if(!c)return;
  // Resíduos orgânicos alimentam microrganismos e as forrageadoras reais.
  for(let j=-4;j<=4;j++)for(let i=-4;i<=4;i++){
   const x=clamp(c.x+i*dx,-9.5,9.5),z=clamp(c.z+j*dz,-7.5,7.5);
   const k=idx(x,z),dist=Math.hypot(i,j);
   if(dist<1||dist>5||api.depth[k]>.07)continue;
   api.soilLitter[k]=clamp(api.soilLitter[k]+.035/(1+dist),0,1.8);
  }
  status();
 };
 const advance=$('ecoAdvance');if(advance)advance.onclick=()=>{
  for(let d=0;d<30;d++)lifeDay(1);
  if(nestCutGroup.visible)drawNestCutaway();
  status();
 };
 const organic=$('ecoCarcass');if(organic)organic.onclick=()=>{
  addCarcass(4,3,.16);addCarcass(-5,-2,.10);status();
 };
 const toggle=$('ecoToggle');if(toggle)toggle.onchange=e=>{
  realm.visible=e.target.checked;
  window.arcanoEcoV1232.active=e.target.checked;
  api.stones.visible=!e.target.checked;
  if(api.grass)api.grass.visible=!e.target.checked&&!api.forestGroup.visible;
 };
 const original=api.grass;if(original)original.visible=false;
 for(const obj of targetNativeGrass)obj.obj.visible=false;
 window.arcanoEcoV1232={active:true,cover,traffic,roadMask,riverMask,colonies,worms,
  trample,addCarcass,update,status,api,ready:()=>ready,setMagnification:n=>previewMagnification=n,
  getColony:id=>colonies.find(c=>c.id===id),getWorms:()=>worms,inspectColony:updateColonyInspector,
  events:ecoEvents,getDays:()=>ecologicalDays};
 let last=performance.now();function frame(now){requestAnimationFrame(frame);const dt=Math.min(.09,(now-last)/1000);last=now;if(!document.hidden)update(dt);}
 requestAnimationFrame(frame);status();
}
setup().catch(e=>{
 console.error('[Arcano V12.32] falha ao inicializar ecossistema:',e);
 const el=$('ecoStatus');if(el)el.textContent='Falha no carregamento de modelos: '+(e.message||e);
});
})();