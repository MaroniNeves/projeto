/* Ateliê Arcano V12.32 — ecossistema demonstrativo integrado.
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
const realm=new T.Group();realm.name='V12.32 | Rio estrada grama e fauna do solo';api.scene.add(realm);
const foliage=new T.Group(),rocks=new T.Group(),animals=new T.Group(),roads=new T.Group();
foliage.name='Tufos reais de grama Quaternius';rocks.name='Cinco geometrias de pedras Rocks.fbx';
animals.name='Formigas e minhocas minúsculas';roads.name='Estrada e ponte demonstrativas';
for(const g of [foliage,rocks,animals,roads])realm.add(g);
const meshLibrary={},textureLibrary={};let ready=false, biologicalSpeed=4,previewMagnification=1, trampleEnabled=true;
const grassPatches=[],rockPositions=[],colonies=[],worms=[],antDraws=[],wormDraws=[];
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
function qualityMax(){return innerWidth<680?660:1180;}
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
function makeRoad(){
 // Trilho de terra com as mesmas cotas do terreno, interrompido no rio.
 const points=[],indices=[],uv=[],colors=[];let col=0;
 for(let i=0;i<=140;i++){
  const x=-9.15+i*(18.3/140),z=roadZ(x);
  if(Math.abs(x-riverX(z))<.70)continue;
  const half=.55+.08*Math.sin(x*1.2);
  const left=z-half,right=z+half;
  points.push(x,height(x,left)+.018,left,x,height(x,right)+.018,right);
  uv.push(i/11,0,i/11,1);
  colors.push(.77,.62,.47,.77,.62,.47);
  if(col>0){ // Discontinuity at the bridge is handled as a separate patch, skip larger spans.
   const old=points.length/3-4,current=points.length/3-2;
   if(Math.abs(points[current*3]-points[old*3])<.30)indices.push(old,old+1,current,old+1,current+1,current);
  }
  col++;
 }
 const geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.Float32BufferAttribute(points,3));
 geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
 const mat=new T.MeshStandardMaterial({color:'#a78662',roughness:1,metalness:0,side:T.DoubleSide});
 const m=new T.Mesh(geo,mat);m.name='Estrada compactada, margens irregulares';m.receiveShadow=true;roads.add(m);
 // Pequena ponte de madeira no cruzamento do rio.
 const bx=riverX(roadZ(-2)),bz=roadZ(bx);
 const wood=new T.MeshStandardMaterial({color:'#76563d',roughness:1,metalness:0});
 for(let k=-3;k<=3;k++){
  const plank=new T.Mesh(new T.BoxGeometry(.22,.09,1.42),wood);
  plank.position.set(bx+k*.24,height(bx,bz)+.23,bz);plank.castShadow=true;roads.add(plank);
 }
}
function initializeLandscape(){
 for(let k=0;k<cells;k++){
  const {x,z}=position(k),distRoad=Math.abs(z-roadZ(x)),distRiver=Math.abs(x-riverX(z));
  roadMask[k]=clamp(1-distRoad/.83,0,1);riverMask[k]=clamp(1-distRiver/.68,0,1);
  // A estrada recebe a compactação histórica; rio rebaixa o leito local.
  if(riverMask[k]>.05){
   const cut=Math.pow(riverMask[k],1.5)*.13;
   api.soil[k]-=cut;
   api.depth[k]=Math.max(api.depth[k],riverMask[k]*.055);
  }
  if(roadMask[k]>.1){traffic[k]=.68+roadMask[k]*.23;
   api.permeability[k]*=(1-roadMask[k]*.44);}
  const shade=.5+.5*Math.sin(x*.85+z*.34)*Math.cos(z*.6);
  const moist=api.soilMoisture[k]/Math.max(.001,api.soilCapacity[k]);
  cover[k]=clamp(.56+.28*shade+.17*moist-roadMask[k]*.92-riverMask[k]*.92,0,1);
 }
 const geom=api.terrain.geometry,positionAttribute=geom.getAttribute('position');
 for(let k=0;k<cells;k++)positionAttribute.setY(k,api.soil[k]);
 positionAttribute.needsUpdate=true;geom.computeVertexNormals();
 makeRoad();
}
function terrainTint(){
 const colors=api.terrain.geometry.getAttribute('color');if(!colors)return;
 const base=window.arcanoEcoV1232BaseColor;
 if(!base){
  const first=new Float32Array(colors.array);
  window.arcanoEcoV1232BaseColor=first;
 }
 const original=window.arcanoEcoV1232BaseColor;
 for(let k=0;k<cells;k++){
  let factor=clamp(cover[k]*(1-traffic[k])*.57,0,.52);
  const greenRoad=clamp(roadMask[k]*.74,0,.74);
  for(let c=0;c<3;c++){
   const grassCol=[green.r,green.g,green.b][c],pathCol=[roadColor.r,roadColor.g,roadColor.b][c];
   let val=original[k*3+c]*(1-factor)+grassCol*factor;
   val=val*(1-greenRoad)+pathCol*greenRoad;
   colors.array[k*3+c]=val;
  }
 }
 colors.needsUpdate=true;
}
function grassShape(){
 const grassList=['grassShort1','grassMixed1','grassTall1','grassMixed2'];
 let patches=innerWidth<680?650:1150,attempts=patches*10;
 const instances=new Map(),dummies=new Map();
 for(let j=0;j<grassList.length;j++){
  const name=grassList[j],kind=(name==='grassMixed1'||name==='grassMixed2')?'grassMixed':(name==='grassTall1'?'grassTall':'grassShort');
  const geometry=meshLibrary[name];if(!geometry)continue;
  const m=new T.InstancedMesh(geometry,material(kind),patches);
  m.frustumCulled=false;m.castShadow=false;m.receiveShadow=true;m.count=0;
  m.name='Moitas originais: '+name;instances.set(name,m);dummies.set(name,new T.Object3D());foliage.add(m);
 }
 let placed=0;
 while(attempts-->0 && placed<patches){
  const x=(random()-.5)*18.9,z=(random()-.5)*14.9,k=idx(x,z);
  if(random()>cover[k]*(1-traffic[k]))continue;
  if(api.depth[k]>.02||api.soil[k]<-.7)continue;
  const nearRiver=riverMask[k]>.23;
  const desired=nearRiver&&random()>.32?'grassTall1':
    random()>.72?'grassMixed1':random()>.58?'grassMixed2':'grassShort1';
  const mesh=instances.get(desired);if(!mesh||mesh.count>=patches)continue;
  const dummy=dummies.get(desired);const scale=(desired==='grassTall1'?.42:.25)*(.72+random()*.65);
  dummy.position.set(x,height(x,z)-.015,z);
  dummy.rotation.set(0,random()*Math.PI*2,0);
  dummy.scale.set(scale*(.7+random()*.55),scale*(.85+random()*.5),scale*(.7+random()*.5));
  dummy.updateMatrix();mesh.setMatrixAt(mesh.count++,dummy.matrix);
  grassPatches.push({x,z,k,mesh,index:mesh.count-1,matrix:dummy.matrix.clone(),dummy:new T.Object3D()});placed++;
 }
 for(const m of instances.values())m.instanceMatrix.needsUpdate=true;
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
function initialColonies(){
 const locations=[[-6,2.5],[4.5,2.9],[-2,-4.1]];
 for(let i=0;i<locations.length;i++){
  const [x,z]=locations[i];colonies.push({id:i,queen:true,queenAge:0,x,z,workers:24+i*12,
   food:12,deathProgress:0,brood:[{stage:'egg',age:0,count:5},{stage:'larva',age:8,count:4},{stage:'pupa',age:18,count:3}],
   scouts:4,foragers:12,nurses:5,builders:4,guards:3,dead:0,foodGathered:0,temperature:23});
 }
 for(let i=0;i<14;i++){
  const x=(random()-.5)*16,z=(random()-.5)*12;
  worms.push({x,z,adults:2+Math.floor(random()*4),juveniles:2,
    cocoons:[{days:10,count:1}],organic:0.1,burrows:0,matureProgress:0,deathProgress:0});
 }
}
function goodForWorms(k){
 const moist=api.soilMoisture[k]/Math.max(.0001,api.soilCapacity[k]);
 const temp=api.atmosphere.getMetrics().temperature;
 return clamp((moist-.20)/.35,0,1)*clamp((.94-moist)/.24,0,1)*
   clamp((temp-9)/9,0,1)*clamp((36-temp)/13,0,1);
}
function addCarcass(x,z,mass=.03){
 const k=idx(x,z);api.soilLitter[k]=clamp(api.soilLitter[k]+mass,0,1.8);
 api.soilOrganic[k]=clamp(api.soilOrganic[k]+mass*.15,0,1.8);
 return k;
}
function lifeDay(days){
 const temp=api.atmosphere.getMetrics().temperature;
 for(const c of colonies){
  const k=idx(c.x,c.z),moist=api.soilMoisture[k]/Math.max(.0001,api.soilCapacity[k]);
  c.temperature=temp;
  const safe=clamp(1-Math.max(0,moist-.84)*3,0,1)*clamp((temp-12)/11,0,1)*clamp((37-temp)/12,0,1);
  // Forrageadoras exploram células vizinhas, não apenas a entrada do ninho.
  const sites=[];
  for(let iz=-5;iz<=5;iz+=2)for(let ix=-5;ix<=5;ix+=2){
   const x=clamp(Math.round((c.x+W*.5)/dx)+ix,0,NX-1);
   const z=clamp(Math.round((c.z+L*.5)/dz)+iz,0,NZ-1);sites.push(z*NX+x);
  }
  sites.sort((a,b)=>api.soilLitter[b]-api.soilLitter[a]);
  let budget=days*(.014+.0007*c.foragers)*safe,gathered=0;
  for(const place of sites){
   if(budget<=0)break;
   const taken=Math.min(api.soilLitter[place],budget);
   api.soilLitter[place]-=taken;budget-=taken;gathered+=taken;
  }
  c.food+=gathered*27;c.foodGathered+=gathered;
  // Fezes, limpeza do ninho e restos de alimento voltam à matéria orgânica.
  api.soilOrganic[k]=clamp(api.soilOrganic[k]+gathered*.12,0,1.7);
  c.food=Math.max(0,c.food-days*(.14+.015*c.workers));
  c.deathProgress=(c.deathProgress||0)+days*c.workers*(.004+(1-safe)*.016);
  const casualties=Math.min(c.workers,Math.floor(c.deathProgress));
  c.deathProgress-=casualties;
  if(casualties){c.workers-=casualties;c.dead+=casualties;addCarcass(c.x,c.z,casualties*.0014);}
  // Operárias não botam ovos. A rainha fértil inicia todas as coortes.
  if(c.queen&&c.food>1.1&&safe>.32){
   c.brood.push({stage:'egg',age:0,count:Math.max(1,Math.round(days*(.85+.021*c.workers)*safe))});
   c.food-=days*.32;
  }
  let born=0;const next=[];
  for(const group of c.brood){
   group.age+=days;
   if(group.stage==='egg'&&group.age>=8)group.stage='larva';
   if(group.stage==='larva'&&group.age>=20)group.stage='pupa';
   if(group.stage==='pupa'&&group.age>=34){born+=group.count;continue;}
   next.push(group);
  }
  c.workers=clamp(c.workers+born,0,240);c.brood=next;
  c.queenAge+=days;
  if(c.queenAge>365*9){c.queen=false;}
  const n=c.workers;
  // As funções são tarefas, não castas obrigatórias e imutáveis.
  c.foragers=Math.round(n*.45);c.nurses=Math.round(n*.22);
  c.builders=Math.round(n*.17);c.guards=Math.round(n*.10);
  c.scouts=Math.max(0,n-c.foragers-c.nurses-c.builders-c.guards);
  api.soilBiota[k]=clamp(api.soilBiota[k]+days*.0012*c.builders,0,1);
  api.permeability[k]=clamp(api.permeability[k]*(1+days*.0003*c.builders),.000001,.16);
  // Fundação de nova colônia por voo nupcial de alados (modelo simplificado).
  // Não cria rainha fértil a partir de uma operária comum.
  const matingWeather=temp>21&&temp<31&&moist>.25&&moist<.80;
  if(c.queen&&c.workers>185&&c.food>60&&c.queenAge>120&&matingWeather&&
     colonies.length<5&&random()<days*.006){
   const nearby={...c,id:colonies.length,x:clamp(c.x+4*(random()-.5),-8,8),
    z:clamp(c.z+4*(random()-.5),-6,6),workers:0,deathProgress:0,
    queen:true,queenAge:0,food:8,brood:[],dead:0,foodGathered:0};
   c.food-=4;colonies.push(nearby);
  }
 }
 for(const w of worms){
  const k=idx(w.x,w.z),safe=goodForWorms(k);
  const litter=Math.min(api.soilLitter[k],days*w.adults*.0019*safe);
  api.soilLitter[k]-=litter;
  api.soilOrganic[k]=clamp(api.soilOrganic[k]+litter*.80,0,1.6);
  api.soilN[k]=clamp(api.soilN[k]+litter*.12,0,1.3);
  api.soilP[k]=clamp(api.soilP[k]+litter*.045,0,1.3);
  api.soilBiota[k]=clamp(api.soilBiota[k]+days*w.adults*.0003*safe,0,1);
  api.permeability[k]=clamp(api.permeability[k]*(1+days*w.adults*.00017*safe),.000001,.16);
  w.burrows+=days*w.adults*.001*safe;
  // Minhocas: hermafroditas, mas tipicamente acasalam em pares e formam casulos.
  if(w.adults>=2&&safe>.46&&random()<days*clamp(w.adults*.07,0,.5)){
   w.cocoons.push({days:0,count:1+Math.floor(random()*2)});
  }
  let hatch=0;
  w.cocoons=w.cocoons.filter(co=>{co.days+=days;if(co.days>29){hatch+=co.count;return false;}return true;});
  w.juveniles+=hatch;
  w.matureProgress=(w.matureProgress||0)+days*.085*w.juveniles*safe;
  const grow=Math.min(w.juveniles,Math.floor(w.matureProgress));
  w.matureProgress-=grow;w.juveniles-=grow;w.adults+=grow;
  w.deathProgress+=w.adults*days*(safe<.15?.04:.003);
  const death=Math.min(w.adults,Math.floor(w.deathProgress));
  w.deathProgress-=death;
  if(death){w.adults-=death;addCarcass(w.x,w.z,.002*death);}
  w.adults=Math.min(w.adults,85);w.juveniles=Math.min(w.juveniles,95);
 }
}
function visualizeAnimals(){
 animals.clear();antDraws.length=0;wormDraws.length=0;
 const variants=['ant1','ant2','ant3','antRed','ant4','ant5'];
 for(let j=0;j<colonies.length;j++)for(let v=0;v<2;v++){
  const c=colonies[j],key=variants[(j*2+v)%variants.length],geo=meshLibrary[key];
  if(!geo)continue;
  const count=innerWidth<680?7:14;
  const m=new T.InstancedMesh(geo,
   new T.MeshStandardMaterial({color:(j===2||key==='antRed')?'#a3533b':'#49332b',
    roughness:1,metalness:0,side:T.DoubleSide}),count);
  m.name='Operárias minúsculas · '+key+' · colônia '+(j+1);
  m.count=Math.min(count,Math.ceil(c.foragers/2));
  m.castShadow=false;m.frustumCulled=false;animals.add(m);antDraws.push({m,c,variant:v});
 }
 const variantsWorm=['worm1','worm2','worm3'];
 for(let kind=0;kind<variantsWorm.length;kind++){
  const geo=meshLibrary[variantsWorm[kind]];if(!geo)continue;
  const max=innerWidth<680?5:8;
  const m=new T.InstancedMesh(geo,
   new T.MeshStandardMaterial({color:kind===0?'#9b736c':kind===1?'#86645e':'#ab877c',
    roughness:1,metalness:0,side:T.DoubleSide}),max);
  m.count=Math.min(max,Math.ceil(worms.length/3));
  m.name='Minhocas minúsculas · '+variantsWorm[kind];m.castShadow=false;
  animals.add(m);wormDraws.push({m,offset:kind});
 }
}
function moveAnimals(t){
 const obj=new T.Object3D(),magnify=previewMagnification;
 for(const {m,c,variant} of antDraws){
  for(let i=0;i<m.count;i++){
   const theta=t*.27+i*2.399+c.id*.91+variant*1.23,dist=.25+.75*((i%7)/7);
   const x=c.x+Math.cos(theta)*dist,z=c.z+Math.sin(theta)*dist;
   obj.position.set(x,height(x,z)+.008,z);obj.rotation.set(0,-theta,0);
   obj.scale.setScalar(.016*magnify);obj.updateMatrix();m.setMatrixAt(i,obj.matrix);
  }
  m.instanceMatrix.needsUpdate=true;
 }
 for(const {m,offset} of wormDraws){
  for(let i=0;i<m.count;i++){
   const w=worms[(i*3+offset)%worms.length],k=idx(w.x,w.z),safe=goodForWorms(k);
   const visible=safe>.42&&Math.sin(t*.08+i)>.35;
   obj.position.set(w.x+.12*Math.sin(t*.05+i),height(w.x,w.z)-(visible?.02:.12),w.z);
   obj.rotation.set(0,i*2.13,0);obj.scale.setScalar(.065*magnify);
   obj.updateMatrix();m.setMatrixAt(i,obj.matrix);
  }
  m.instanceMatrix.needsUpdate=true;
 }
}
function updateGrassMeshes(){
 const o=new T.Object3D();
 for(const patch of grassPatches){
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
 const centerX=clamp(Math.round((x+W*.5)/dx),0,NX-1),centerZ=clamp(Math.round((z+L*.5)/dz),0,NZ-1);
 for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){
  const ix=centerX+i,iz=centerZ+j;if(ix<0||iz<0||ix>=NX||iz>=NZ)continue;
  const k=iz*NX+ix,f=Math.max(0,1-Math.hypot(i,j)/2.7);
  traffic[k]=clamp(traffic[k]+weight*f,0,1);
  api.soilPlant[k]=clamp(api.soilPlant[k]-.15*weight*f,.02,1.25);
  api.permeability[k]=Math.max(.00001,api.permeability[k]*(1-weight*f*.06));
 }
 updateGrassMeshes();terrainTint();
}
let ecologicalAccumulator=0,time=0,grassAccumulator=0,uiAccumulator=0;
function update(dt){
 if(!ready)return;
 dt=Math.min(dt,.09);time+=dt;ecologicalAccumulator+=ecologicalDayRate(dt);
 grassAccumulator+=dt;uiAccumulator+=dt;
 // Recarrega o rio somente pela fonte a montante, sem água infinita em toda a cena.
 if(grassAccumulator>.7){
  grassAccumulator=0;
  const zx=-7.1,xx=riverX(zx),k=idx(xx,zx);
  api.depth[k]=Math.max(api.depth[k],.09);
  for(let cell=0;cell<cells;cell++){
   const sat=api.soilMoisture[cell]/Math.max(.001,api.soilCapacity[cell]);
   const good=clamp(api.soilPlant[cell]*.57+api.soilHealth[cell]*.25+sat*.18,0,1);
   if(roadMask[cell]>.48)traffic[cell]=Math.max(traffic[cell],.55);
   else traffic[cell]=clamp(traffic[cell]-.0004*biologicalSpeed,0,1);
   cover[cell]=clamp(cover[cell]*.999+good*.001-roadMask[cell]*.0005,0,1);
  }
  updateGrassMeshes();terrainTint();
 }
 while(ecologicalAccumulator>1){lifeDay(1);ecologicalAccumulator-=1;}
 moveAnimals(time);
 if(uiAccumulator>1.4){uiAccumulator=0;status();}
}
function status(){
 const workers=colonies.reduce((a,b)=>a+b.workers,0),eggs=colonies.reduce((a,b)=>a+b.brood.filter(g=>g.stage==='egg').reduce((sum,c)=>sum+c.count,0),0);
 const larva=colonies.reduce((a,b)=>a+b.brood.reduce((sum,c)=>sum+(c.stage==='larva'?c.count:0),0),0);
 const adults=worms.reduce((a,b)=>a+b.adults,0),cocoons=worms.reduce((a,b)=>a+b.cocoons.reduce((sum,c)=>sum+c.count,0),0);
 const el=$('ecoStatus');if(el)el.textContent=
  colonies.length+' colônias · '+workers+' operárias · '+eggs+' ovos · '+larva+' larvas · '+adults+' minhocas adultas · '+cocoons+' casulos. '+
  'É uma simulação ecológica simplificada; rainhas e crias ficam nos ninhos. Quase invisíveis fora da lupa.';
}
async function setup(){
 await loadMeshes();initializeLandscape();grassShape();rockShape();initialColonies();visualizeAnimals();
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
  trample,addCarcass,update,status,api,ready:()=>ready,setMagnification:n=>previewMagnification=n};
 let last=performance.now();function frame(now){requestAnimationFrame(frame);const dt=Math.min(.09,(now-last)/1000);last=now;if(!document.hidden)update(dt);}
 requestAnimationFrame(frame);status();
}
setup().catch(e=>{
 console.error('[Arcano V12.32] falha ao inicializar ecossistema:',e);
 const el=$('ecoStatus');if(el)el.textContent='Falha no carregamento de modelos: '+(e.message||e);
});
})();