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
const realm=new T.Group();realm.name='V12.32 | Rio estrada grama e fauna do solo';api.scene.add(realm);
const foliage=new T.Group(),rocks=new T.Group(),animals=new T.Group(),roads=new T.Group();
foliage.name='Tufos reais de grama Quaternius';rocks.name='Cinco geometrias de pedras Rocks.fbx';
animals.name='Formigas e minhocas minúsculas';roads.name='Estrada e ponte demonstrativas';
for(const g of [foliage,rocks,animals,roads])realm.add(g);
const meshLibrary={},textureLibrary={};let ready=false, biologicalSpeed=4,previewMagnification=1, trampleEnabled=true;
const grassPatches=[],rockPositions=[],colonies=[],worms=[],antDraws=[],wormDraws=[];
const nestDisplays=new Map();
let colonySequence=0,ecologicalDays=0,burrowLength=0,castsReturned=0;
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
 // Ponte curta — estrada de terra é somente a máscara cromática no solo.
 const bx=-2.15,bz=roadZ(bx);
 const wood=new T.MeshStandardMaterial({color:'#76563d',roughness:1,metalness:0});
 for(let k=-3;k<=3;k++){
  const plank=new T.Mesh(new T.BoxGeometry(.22,.08,1.42),wood);
  plank.position.set(bx+k*.24,height(bx,bz)+.15,bz);
  plank.castShadow=true;plank.receiveShadow=true;roads.add(plank);
 }
 muddyFootprints=generateFootprints();
 updateFootprints();
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
  cover[k]=clamp(.56+.28*shade+.17*moist-roadMask[k]*.92-riverMask[k]*.92,0,1);
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
  const food=api.soilLitter[k]+.35*api.soilOrganic[k];
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
 temperature:23,pheromones:new Float32Array(cells),lastFoodSite:idx(x,z),
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
 c.chambers=Math.min(12,1+Math.floor(c.tunnels/.32));
 c.spoil=clamp(c.spoil+available*.64,0,1);
 burrowLength+=available;
 // Solo escavado vai para o monte exterior. Túneis melhoram macroporosidade
 // local mas obras excessivas não transformam o solo em meio infinito.
 api.permeability[k]=clamp(api.permeability[k]*(1+available*.13),.000001,.16);
 api.soilBiota[k]=clamp(api.soilBiota[k]+available*.06,0,1);
 updateNestSurface(c);
}
function initialColonies(){
 for(const [x,z] of [[-6,2.5],[4.5,2.9],[-2,-4.1]]){
  const c=newColony(x,z,24+colonies.length*12,15,false);
  colonies.push(c);nestSurface(c);
 }
 for(let i=0;i<14;i++){
  let x=(random()-.5)*15,z=(random()-.5)*11;
  // Populações concentram-se perto de solo úmido e rico em húmus.
  for(let tries=0;tries<14&&goodForWorms(idx(x,z))<.22;tries++){
   x=(random()-.5)*15;z=(random()-.5)*11;
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
 return clamp((moist-.20)/.35,0,1)*clamp((.94-moist)/.24,0,1)*
   clamp((temp-9)/9,0,1)*clamp((36-temp)/13,0,1);
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
  let gathered=0,searchBudget=days*(.014+.00085*c.foragers)*safe;
  const sites=chooseFoodSites(c);
  for(const item of sites){
   if(searchBudget<=0)break;
   const site=item.k;
   const possible=Math.min(api.soilLitter[site],searchBudget);
   if(possible<.000015)continue;
   const take=possible*Math.min(1,.55+.35*c.pheromones[site]);
   api.soilLitter[site]-=take;searchBudget-=take;
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
  const need=days*(.19+.015*c.workers+broodFood);
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
  c.queenAge+=days;
  if(c.queen&&c.queenAge>365*9){
   c.queen=false;c.queenFertile=false;
   addCarcass(c.x,c.z,.004);
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
    c.food-=7;c.reproductiveCooldown=110;
   }
  }
 }
 for(const w of worms){
  const k=idx(w.x,w.z),safe=goodForWorms(k);
  const moist=clamp(api.soilMoisture[k]/Math.max(.0001,api.soilCapacity[k]),0,1.8);
  const wetEnough=moist>.35&&moist<1.13;
  // Alimentam-se do detrito e dos microrganismos que o colonizam.
  const litter=Math.min(api.soilLitter[k],days*w.adults*.0017*safe);
  api.soilLitter[k]-=litter;
  const casts=litter*.80+days*w.adults*.000018*safe;
  w.castings+=casts;castsReturned+=casts;
  api.soilOrganic[k]=clamp(api.soilOrganic[k]+casts*.62,0,1.8);
  api.soilN[k]=clamp(api.soilN[k]+casts*.14,0,1.3);
  api.soilP[k]=clamp(api.soilP[k]+casts*.051,0,1.3);
  api.soilBiota[k]=clamp(api.soilBiota[k]+days*w.adults*.00028*safe,0,1);
  const work=days*w.adults*.00125*safe;
  w.burrows+=work;burrowLength+=work;
  api.permeability[k]=clamp(api.permeability[k]*(1+work*.022),.000001,.16);
  // Hermafroditas com fecundação cruzada: exigem >= 2 adultos para casulos.
  if(w.adults>=2&&safe>.42){
   w.pairProgress+=days*Math.min(w.adults/4,2)*.082*safe;
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
  w.matureProgress+=days*w.juveniles/Math.max(40,w.juvenileMaturityDays)*safe;
  const mature=Math.min(w.juveniles,Math.floor(w.matureProgress));
  w.matureProgress-=mature;w.juveniles-=mature;w.adults+=mature;
  // Mortalidade e reciclagem orgânica com pouca umidade ou inundação anóxica.
  w.deathProgress+=w.adults*days*(safe<.13?.034:.0027);
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
 grassAccumulator+=dt;uiAccumulator+=dt;
 // Recarrega o rio somente pela fonte a montante, sem água infinita em toda a cena.
 if(grassAccumulator>.7){
  grassAccumulator=0;
  if(api.getGraphicsQuality()!==lastGrassQuality)applyGrassQuality();
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
 while(ecologicalAccumulator>1){lifeDay(1);ecologicalAccumulator-=1;}
 moveAnimals(time);
 if(uiAccumulator>1.4){uiAccumulator=0;status();}
}
function status(){
 const workers=colonies.reduce((a,b)=>a+b.workers,0),eggs=colonies.reduce((a,b)=>a+b.brood.filter(g=>g.stage==='egg').reduce((sum,c)=>sum+c.count,0),0);
 const larva=colonies.reduce((a,b)=>a+b.brood.reduce((sum,c)=>sum+(c.stage==='larva'?c.count:0),0),0);
 const adults=worms.reduce((a,b)=>a+b.adults,0),cocoons=worms.reduce((a,b)=>a+b.cocoons.reduce((sum,c)=>sum+c.count,0),0);
 const el=$('ecoStatus');if(el)el.textContent=
  grassDrawn+' tufos de grama ('+lastGrassQuality+') · '+colonies.length+' colônias · '+workers+' operárias · '+eggs+' ovos · '+larva+' larvas · '+adults+' minhocas adultas · '+cocoons+' casulos. '+
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