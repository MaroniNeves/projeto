/* Ateliê Arcano V12.24 — poças, lagoas e respingos conformes ao relevo (modelo ilustrativo, não calibrado).
   Chuva, interceptação vegetal, infiltração, percolação, escoamento e evapotranspiração.
   Simulação conservativa na malha, com multiplicador de tempo e gotas 3D visíveis. */
(function(){
'use strict';
const T=window.THREE, $=id=>document.getElementById(id), clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const diag=$('diag'),stage=$('stage');
function fail(error){if(diag)diag.textContent='Não foi possível iniciar a água 3D: '+(error&&error.message||error);console.error('[Arcano V12.24]',error);}
if(!T){fail('Three.js não carregou. Verifique a conexão.');return;}
const mobile=innerWidth<680, NX=mobile?68:96,NZ=mobile?56:78,W=20,L=16;
const dx=W/(NX-1), dz=L/(NZ-1),size=NX*NZ;
const soil=new Float32Array(size),depth=new Float32Array(size),delta=new Float32Array(size),blocked=new Uint8Array(size);
const soilMoisture=new Float32Array(size),soilCapacity=new Float32Array(size),deepWater=new Float32Array(size);
const canopy=new Float32Array(size),cover=new Float32Array(size),permeability=new Float32Array(size);
const area=dx*dz,stats={rain:0,infiltrated:0,evaporated:0,transpired:0,outflow:0};
const mudRGB=[.18,.11,.075];
const turbidity=new Float32Array(size);
const basinHold=new Float32Array(size),shoreField=new Float32Array(size);
let foamCount=0;
// Erosão agora depende de cada perfil de solo, não de uma chave global obsoleta.
let soilType='mosaico',totalImpacts=0;
const baseCapacity=new Float32Array(size),basePermeability=new Float32Array(size);
// V12.22 — Textura é areia/silte/argila; húmus, calcário, várzea e salinidade
// são propriedades do perfil, não categorias granulométricas equivalentes.
// Coeficientes normalizados e pedagógicos, sem alegação de kg/ha calibrados.
const SOIL_PROFILES={
 franco:{name:'Franco equilibrado',capacity:1,drain:1.45,organic:.50,n:.64,p:.55,k:.59,ca:.59,ph:6.5,salt:.04,fix:.08,erosion:.33,col:'#8f7357'},
 arenoso:{name:'Arenoso',capacity:.58,drain:2.70,organic:.18,n:.22,p:.25,k:.27,ca:.32,ph:6.0,salt:.04,fix:.02,erosion:.86,col:'#c3aa79'},
 argiloso:{name:'Argiloso',capacity:1.34,drain:.45,organic:.44,n:.49,p:.34,k:.63,ca:.58,ph:6.2,salt:.05,fix:.25,erosion:.43,col:'#a67256'},
 siltoso:{name:'Siltoso',capacity:1.18,drain:.98,organic:.43,n:.53,p:.48,k:.51,ca:.51,ph:6.5,salt:.05,fix:.12,erosion:.92,col:'#a9a08c'},
 humoso:{name:'Humoso / orgânico',capacity:1.52,drain:1.12,organic:.91,n:.79,p:.69,k:.67,ca:.55,ph:6.2,salt:.02,fix:.03,erosion:.18,col:'#423329'},
 calcario:{name:'Calcário (alcalino)',capacity:.92,drain:1.36,organic:.35,n:.44,p:.32,k:.52,ca:.92,ph:7.9,salt:.09,fix:.23,erosion:.35,col:'#c4b8a0'},
 aluvial:{name:'Aluvial / várzea',capacity:1.48,drain:.58,organic:.77,n:.73,p:.65,k:.72,ca:.65,ph:6.8,salt:.04,fix:.12,erosion:.40,col:'#665044'},
 lateritico:{name:'Laterítico / canga',capacity:.89,drain:.87,organic:.23,n:.32,p:.12,k:.37,ca:.29,ph:5.1,salt:.03,fix:.67,erosion:.58,col:'#a34f38'},
 pedregoso:{name:'Pedregoso',capacity:.48,drain:2.25,organic:.18,n:.29,p:.31,k:.38,ca:.54,ph:6.8,salt:.03,fix:.05,erosion:.56,col:'#8d857b'},
 salino:{name:'Salino',capacity:.84,drain:.77,organic:.22,n:.42,p:.39,k:.44,ca:.56,ph:7.9,salt:.83,fix:.17,erosion:.64,col:'#b6b09c'},
 compactado:{name:'Compactado',capacity:.75,drain:.19,organic:.30,n:.40,p:.38,k:.47,ca:.48,ph:6.3,salt:.05,fix:.12,erosion:.21,col:'#837264'}
};
const SOIL_KEYS=Object.keys(SOIL_PROFILES);
const soilKeyIndex=new Uint8Array(size);
const soilOrganic=new Float32Array(size),soilLitter=new Float32Array(size),soilN=new Float32Array(size),
 soilP=new Float32Array(size),soilK=new Float32Array(size),soilCa=new Float32Array(size),
 soilPH=new Float32Array(size),soilSalinity=new Float32Array(size),soilBiota=new Float32Array(size),
 soilPlant=new Float32Array(size),soilHealth=new Float32Array(size),soilLimiting=new Uint8Array(size);
const SOIL_LIMITS=['água','nitrogênio','fósforo','potássio','cálcio','pH','salinidade','oxigênio'];
const plantNeeds={moisture:.50,n:.58,p:.50,k:.48,ca:.45};
let soilEcologySeconds=0,plantVisualSeconds=0,soilUpdates=0;
function chooseMosaicSoil(x,z,h,k){
 const stream=Math.abs(x-center(z));
 const wet=h<-.25||stream<.75;
 if(wet)return 'aluvial';
 const n=.5+.24*Math.sin(x*.57+z*.48)+.25*Math.cos(x*.36-z*.59);
 if(h>.67&&n>.66)return 'pedregoso';
 if(n<.25)return 'arenoso';
 if(n>.82)return 'humoso';
 if(x>3.6&&z>1.2)return 'calcario';
 if(x< -3.0&&z>0)return 'lateritico';
 if(n>.62)return 'argiloso';
 if(h<.03)return 'siltoso';
 return 'franco';
}
function soilProfileIndex(key){return Math.max(0,SOIL_KEYS.indexOf(key));}
function configureSoilCells(preserve=true){
 for(let k=0;k<size;k++){
  const i=k%NX,j=Math.floor(k/NX),x=nx(i),z=nz(j);
  const key=soilType==='mosaico'?chooseMosaicSoil(x,z,soil[k],k):soilType;
  const p=SOIL_PROFILES[key]||SOIL_PROFILES.franco;
  soilKeyIndex[k]=soilProfileIndex(key);
  const cap=baseCapacity[k]*p.capacity,perm=basePermeability[k]*p.drain;
  soilCapacity[k]=cap;permeability[k]=perm;
  if(soilMoisture[k]>cap){depth[k]+=soilMoisture[k]-cap;soilMoisture[k]=cap;}
  soilOrganic[k]=preserve?clamp(soilOrganic[k]*.38+p.organic*.62,.02,1.2):p.organic;
  soilLitter[k]=preserve?soilLitter[k]:p.organic*.17;
  soilN[k]=preserve?clamp(soilN[k]*.35+p.n*.65,0,1.2):p.n;
  soilP[k]=preserve?clamp(soilP[k]*.35+p.p*.65,0,1.2):p.p;
  soilK[k]=preserve?clamp(soilK[k]*.35+p.k*.65,0,1.2):p.k;
  soilCa[k]=p.ca;soilPH[k]=p.ph;soilSalinity[k]=p.salt;
  soilBiota[k]=clamp(soilOrganic[k]*(1-p.salt)*.85,.02,1);
  soilPlant[k]=preserve?clamp(soilPlant[k],.08,1):clamp(.38+.30*cover[k],.1,1);
  const c=new T.Color(p.col),shade=.91+.09*Math.sin(x*.82+z*1.14);
  // Solo visível continua distinguindo os perfis, mas recebe musgo suave nas
  // áreas com cobertura vegetal e não nas margens de solo saturado.
  const mossFactor=clamp((cover[k]-.28)*.58,0,.34)*
   clamp((soil[k]+.2)*2.0,0,1);
  c.lerp(new T.Color('#77966c'),mossFactor);
  for(let m=0;m<3;m++)dry[k*3+m]=c.toArray()[m]*shade;
 }
 land.material.color.set('#ffffff');
 landG.attributes.color.needsUpdate=true;
}
function minNutrientAt(k){
 const p=SOIL_PROFILES[SOIL_KEYS[soilKeyIndex[k]]];
 const saturation=soilMoisture[k]/Math.max(.001,soilCapacity[k]);
 const waterFactor=clamp((saturation-.09)/.42,0,1);
 const oxygen=clamp((1.07-saturation)/.40,0,1);
 const n=clamp(soilN[k]/plantNeeds.n,0,1),phos=clamp(soilP[k]/plantNeeds.p,0,1),
  pot=clamp(soilK[k]/plantNeeds.k,0,1);
 const acidity=clamp(1-Math.abs(soilPH[k]-6.5)/2.5,0,1);
 const salinity=clamp(1-soilSalinity[k]*1.20,0,1);
 const calcium=clamp(soilCa[k]/plantNeeds.ca,0,1);
 const factors=[waterFactor,n,phos,pot,calcium,acidity,salinity,oxygen];
 let minimum=factors[0],limiter=0;
 for(let m=1;m<factors.length;m++)if(factors[m]<minimum){minimum=factors[m];limiter=m;}
 soilLimiting[k]=limiter;
 return clamp(minimum,0,1);
}
// Ciclo biológico em tempo REAL de dia do jogo: 1440 s = 1 dia; ao contrário
// da física de chuva, o time-lapse não acelera arbitrariamente a idade das plantas.
function ecologyStep(dt){
 const days=Math.min(dt,10)/DAY_SECONDS;
 const lightFactor=clamp(Math.max(0,solarAt(dayClock))*.90+.20,.10,1);
 for(let k=0;k<size;k++){
  const p=SOIL_PROFILES[SOIL_KEYS[soilKeyIndex[k]]],sat=clamp(soilMoisture[k]/Math.max(.001,soilCapacity[k]),0,1.3);
  const flooded=sat>.94||depth[k]>.035;
  const oxygen=clamp(1-Math.max(0,sat-.80)*2.1,0,1);
  // Solos de várzea sem oxigênio decompõem MUITO mais devagar.
  const decayRate=(flooded?.025:.27)*(p===SOIL_PROFILES.humoso?.68:1)*
    (.40+.60*lightFactor)*(.35+.65*oxygen);
  const decomposed=Math.min(soilLitter[k],soilLitter[k]*decayRate*days);
  soilLitter[k]-=decomposed;soilOrganic[k]=clamp(soilOrganic[k]+decomposed*.72,0,1.3);
  // Inundação deposita uma pequena fração dos resíduos orgânicos transportados.
  // Redução da decomposição anaeróbia + deposição evita que a várzea perca MO depressa.
  if(p===SOIL_PROFILES.aluvial&&depth[k]>.018){
   soilLitter[k]=clamp(soilLitter[k]+days*(.010+.028*turbidity[k]),0,1.3);
  }
  const mineralized=Math.min(soilOrganic[k],soilOrganic[k]*(flooded?.003:.014)*
       (.3+.7*soilBiota[k])*days);
  soilOrganic[k]-=mineralized;
  soilN[k]=clamp(soilN[k]+mineralized*.37,0,1.2);
  soilP[k]=clamp(soilP[k]+mineralized*.19*(1-p.fix),0,1.2);
  soilK[k]=clamp(soilK[k]+mineralized*.22,0,1.2);
  // Solo arenoso perde N/K mais depressa ao drenar; P fixa-se mais na canga.
  const drain=Math.max(0,(sat-.32))*p.drain;
  const leach=days*.024*drain;
  soilN[k]=Math.max(0,soilN[k]*(1-leach*.9));
  soilK[k]=Math.max(0,soilK[k]*(1-leach*.6));
  const phAdsorb=days*.013*p.fix;
  soilP[k]=Math.max(0,soilP[k]*(1-phAdsorb));
  const limit=minNutrientAt(k);
  const growth=limit*lightFactor*(1-.4*(depth[k]>.04?1:0));
  soilHealth[k]=limit;
  const uptake=days*growth*.055*soilPlant[k];
  soilPlant[k]=clamp(soilPlant[k]+days*(growth*.23-.045*(1-growth)),.04,1.25);
  soilN[k]=Math.max(0,soilN[k]-uptake*.75);
  soilP[k]=Math.max(0,soilP[k]-uptake*.42);
  soilK[k]=Math.max(0,soilK[k]-uptake*.57);
  soilCa[k]=Math.max(0,soilCa[k]-uptake*.23);
  // A serrapilheira nunca desaparece sem reposição nas áreas vegetadas.
  soilLitter[k]=clamp(soilLitter[k]+days*soilPlant[k]*.024,0,1.3);
  // Biota como índice funcional, não minhocas 3D (fase futura).
  soilBiota[k]=clamp(soilBiota[k]+days*(soilOrganic[k]*oxygen*.06-.025*soilBiota[k]),.01,1);
 }
 soilUpdates++;
}

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
const ambientSky=new T.HemisphereLight('#fff5e4','#6c8378',2.2);scene.add(ambientSky);
const light=new T.DirectionalLight('#fff0c8',2.35);light.position.set(-8,13,7);
light.castShadow=true;light.shadow.mapSize.set(mobile?512:1024,mobile?512:1024);
Object.assign(light.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:.5,far:38});
light.shadow.bias=-.00035;scene.add(light);
// Atmosfera 3D: céu físico estilizado, disco solar e nuvens procedurais animadas.
// O mesmo céu é visível à câmera do jogador e capturado pelos cubemaps da água.
const skySunDir=light.position.clone().normalize();
const skyM=new T.ShaderMaterial({
 side:T.BackSide,depthWrite:false,depthTest:true,fog:false,toneMapped:false,
 uniforms:{
  uTime:{value:0},uCoverage:{value:.43},uWind:{value:.30},uNight:{value:0},
  uSunDir:{value:skySunDir},
  uTop:{value:new T.Color('#7baec6')},
  uHorizon:{value:new T.Color('#cededb')},
  uCloud:{value:new T.Color('#e1e5df')},
  uSunColor:{value:new T.Color('#fff0c9')},
  uSunVisible:{value:.8}
 },
 vertexShader:[
  'precision highp float;',
  'varying vec3 vSkyDir;',
  'void main(){vSkyDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'
 ].join('\n'),
 fragmentShader:"precision highp float;\nvarying vec3 vSkyDir;\nuniform float uTime,uCoverage,uWind,uSunVisible,uNight;\nuniform vec3 uTop,uHorizon,uCloud,uSunColor,uSunDir;\n// Camadas de estratocúmulos e cumulonimbus: sem sementes de círculos/bolinhas.\n// Ruído coerente com deformação, faixas frontais e erosão da silhueta.\nfloat hash21(vec2 p){\n vec3 q=fract(vec3(p.xyx)*.1031);\n q+=dot(q,q.yzx+33.33);\n return fract((q.x+q.y)*q.z);\n}\nfloat noise2(vec2 p){\n vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);\n float a=hash21(i),b=hash21(i+vec2(1.,0.));\n float c=hash21(i+vec2(0.,1.)),d=hash21(i+vec2(1.,1.));\n return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);\n}\nfloat fbm3(vec2 p){\n float v=0.;\n v+=.54*noise2(p);\n p=mat2(1.81,-.43,.43,1.81)*p+vec2(4.7,1.3);\n v+=.29*noise2(p);\n p=mat2(1.85,.38,-.38,1.85)*p+vec2(2.1,8.3);\n v+=.17*noise2(p);\n return v;\n}\nvoid main(){\n vec3 d=normalize(vSkyDir);\n float y=d.y;\n vec3 sky=mix(uHorizon,uTop,smoothstep(-.06,.82,y));\n sky=mix(sky,vec3(.008,.017,.041),uNight*.92);\n float horizonMist=1.-smoothstep(.01,.28,abs(y));\n sky=mix(sky,mix(uHorizon,vec3(.050,.075,.11),uNight),horizonMist*.22);\n float cover=clamp(uCoverage,0.,1.);\n float storm=smoothstep(.62,.97,cover);\n float t=uTime*(.016+.055*uWind);\n // Nuvens são largas no horizonte e mais altas no zênite.\n vec2 uv=d.xz*1.47/max(.19,y+.28);\n vec2 wind=vec2(t,-t*.32);\n // Ondas de turbulência quebram bordas e conectam volumes sem simetria circular.\n vec2 distortion=vec2(\n  fbm3(uv*.51+wind*.31),\n  fbm3(uv*.51+vec2(6.2,4.1)-wind*.24)\n );\n vec2 p=uv+wind*.38+(distortion-.5)*1.28;\n // Corpos largos e irregulares; cisalhamento horizontal aumenta no temporal.\n vec2 shear=vec2(p.x*.62+p.y*(.18+.34*storm),p.y*(.93-.34*storm));\n float macro=fbm3(shear*.64);\n float mid=fbm3(p*1.41+wind*.18);\n float erosion=noise2(p*4.1-wind*.62);\n float body=macro*.71+mid*.25+erosion*.04;\n float threshold=mix(.66,.35,cover);\n float bank=smoothstep(threshold-.065,threshold+.105,body);\n // Bordas quebradas por erosão fina, conservando miolo denso e sombreado.\n float edge=fbm3(p*3.7+wind*.13);\n bank*=mix(.76,1.,edge);\n // Nuvens altas, alongadas pelo vento e distribuídas em faixas largas.\n float bands=fbm3(vec2(p.x*.37+p.y*.25,p.y*1.09)+wind*.31);\n float shelf=smoothstep(.42,.67,bands+.14*(mid-.5));\n float frontal=storm*(.44+.46*shelf);\n // Cúmulos crescem e fundem-se nas formações da frente.\n float cloud=1.-(1.-bank)*(1.-frontal);\n float far=fbm3(uv*.86-wind*.22+vec2(12.4,-5.2));\n float distant=smoothstep(.48,.76,far)*(.07+.11*cover);\n float alpha=1.-(1.-cloud)*(1.-distant);\n alpha*=smoothstep(-.075,.15,y);\n alpha=clamp(alpha,0.,.995);\n // Base da frente fria mais pesada e escura; topo iluminado com gradiente\n // vertical, sem círculo branco de \"silver lining\" em todas as bordas.\n vec3 sunDir=normalize(uSunDir);\n float lightFacing=clamp(dot(d,sunDir)*.5+.5,0.,1.);\n float roof=smoothstep(.05,.65,y);\n float core=smoothstep(.42,.96,cloud);\n float shade=.73+.16*roof+.14*lightFacing+.10*(edge-.5)\n            -.15*core-.26*storm*(1.-roof);\n vec3 cloudColor=uCloud*clamp(shade,.35,1.05);\n cloudColor=mix(cloudColor,vec3(.029,.043,.074),uNight*.92);\n float contour=clamp((1.-cloud)*cloud*3.0,0.,1.);\n float sunRim=pow(max(dot(d,sunDir),0.),4.)*contour*uSunVisible;\n cloudColor+=uSunColor*sunRim*.23*(1.-storm*.83);\n sky=mix(sky,cloudColor,alpha);\n // A tempestade esconde o sol, mas deixa alguns volumes legíveis.\n float sunDot=max(dot(d,sunDir),0.);\n float sunDisc=smoothstep(.9987,.99985,sunDot);\n float glow=pow(sunDot,140.)*.23;\n sky+=uSunColor*(sunDisc*.90+glow)*uSunVisible*(1.-alpha*.97);\n float moonDot=max(dot(d,-sunDir),0.);\n float moonDisc=smoothstep(.9987,.99967,moonDot);\n float stars=step(.9945,hash21(floor(d.xz*314.0+d.y*219.0)))*\n             smoothstep(.5,.95,y);\n sky+=vec3(.47,.56,.70)*moonDisc*uNight*(1.-alpha*.92);\n sky+=vec3(.37,.48,.64)*stars*uNight*(1.-alpha*.94)*.32;\n gl_FragColor=vec4(clamp(sky,0.,1.),1.);\n}"
});
const skyDome=new T.Mesh(new T.SphereGeometry(40,mobile?36:56,mobile?24:36),skyM);
skyDome.name='Céu 3D V12.20 com estratocúmulos irregulares, frentes densas e bases sombreadas';
skyDome.frustumCulled=false;skyDome.renderOrder=-10;scene.add(skyDome);
let climate='partlyCloudy',climateChoice='auto',weatherCfg=null,weatherTime=0;
const CLIMATE={
 sunny:{name:'Ensolarado',top:'#70b9eb',horizon:'#d6edf4',cloud:'#fcffff',
  bg:'#b2d7e6',sun:'#fff0c5',ambient:'#fff8e8',ground:'#819084',
  coverage:.13,wind:.12,sunPower:2.8,ambientPower:2.35,sunVisible:1.0,reflection:1.0,waterTint:'#c0edee'},
 partlyCloudy:{name:'Parcialmente nublado',top:'#83b9d3',horizon:'#d7e4df',cloud:'#dfe9eb',
  bg:'#bbd0c9',sun:'#fff0ca',ambient:'#fff5e9',ground:'#718679',
  coverage:.43,wind:.35,sunPower:2.2,ambientPower:2.15,sunVisible:.81,reflection:.92,waterTint:'#a1c7d0'},
 overcast:{name:'Nublado',top:'#8d9fab',horizon:'#c2ccd0',cloud:'#b3bec7',
  bg:'#aebcbf',sun:'#ecf1f3',ambient:'#d9e4ed',ground:'#727d7a',
  coverage:.82,wind:.48,sunPower:1.05,ambientPower:1.8,sunVisible:.15,reflection:.72,waterTint:'#849aa9'},
 storm:{name:'Tempestade',top:'#394e60',horizon:'#7d8895',cloud:'#87909b',
  bg:'#778590',sun:'#c6d6e0',ambient:'#a6bbcb',ground:'#586568',
  coverage:.99,wind:1.25,sunPower:.30,ambientPower:1.08,sunVisible:.005,reflection:.51,waterTint:'#617280'}
};
// O nível escolhido controla o temporal mesmo depois de entrar no modo Temporal.
function stormActive(){return level===5;}
function automaticClimate(level){
 if(level===0)return 'sunny';
 if(level>=5)return 'storm';
 if(level>=4)return 'overcast';
 return 'partlyCloudy';
}
function applyClimate(next){
 climate=CLIMATE[next]?next:'partlyCloudy';weatherCfg=CLIMATE[climate];
 const c=weatherCfg;
 skyM.uniforms.uTop.value.set(c.top);
 skyM.uniforms.uHorizon.value.set(c.horizon);
 skyM.uniforms.uCloud.value.set(c.cloud);
 skyM.uniforms.uSunColor.value.set(c.sun);
 skyM.uniforms.uCoverage.value=c.coverage;
 skyM.uniforms.uWind.value=c.wind;
 skyM.uniforms.uSunVisible.value=c.sunVisible;
 scene.background.set(c.bg);scene.fog.color.set(c.bg);
 // Escurecimento vem da iluminação/nuvens, não de uma neblina artificial.
 // A visibilidade meteorológica é gerida por updateGroundFog() separadamente.
 scene.fog.near=36;scene.fog.far=74;
 ambientSky.color.set(c.ambient);ambientSky.groundColor.set(c.ground);
 ambientSky.intensity=c.ambientPower;
 light.color.set(c.sun);light.intensity=c.sunPower;
 if(typeof waterM!=='undefined'){
  waterM.uniforms.uCloudiness.value=c.coverage;
  waterM.uniforms.uWind.value=c.wind;
  waterM.uniforms.uSunPower.value=c.sunVisible;
  waterM.uniforms.uWeatherTint.value.set(c.waterTint);
  waterM.uniforms.uWeatherReflect.value=c.reflection;
 }
 // Nuvens e iluminação mudaram: a próxima captura precisa refletir o clima novo.
 if(typeof reflectionAge!=='undefined')reflectionAge=999;
 // Ao mudar o céu, descarte a segunda captura antiga antes de atualizá-la novamente.
 if(typeof reflection2Ready!=='undefined'){
  reflection2Ready=false;reflectionTurn=0;
  if(typeof waterM!=='undefined')waterM.uniforms.uDualProbes.value=0;
 }
 if($('climateStats'))$('climateStats').textContent=
  'Céu: '+c.name+' · '+Math.round(c.coverage*100)+'% de nuvens · reflexos ajustados ao clima';
}
function animateClimate(dt){
 if(!weatherCfg)return;
 weatherTime+=dt;
 skyM.uniforms.uTime.value=weatherTime;
 // O fotoperíodo e o sol são controlados pelo relógio de 24 minutos.
 // Esta função só anima as nuvens e evita sobrescrever a escuridão da noite.
}
// V12.18 — Atmosfera acoplada: UM dia = 24 minutos REAIS (1440 segundos).
// Inspirada no vídeo analisado: calor solar -> transpiração/evaporação -> umidade,
// vento e relevo -> condensação -> nuvens -> precipitação -> infiltração.
// Grade meteorológica separada e barata; escalas ilustrativas, não previsão real.
const DAY_SECONDS=1440,ATM_NX=mobile?7:9,ATM_NZ=mobile?6:8,ATM_N=ATM_NX*ATM_NZ;
const atmTemp=new Float32Array(ATM_N),atmHumidity=new Float32Array(ATM_N),
 atmPressure=new Float32Array(ATM_N),atmCloud=new Float32Array(ATM_N),
 atmRain=new Float32Array(ATM_N),atmWindX=new Float32Array(ATM_N),
 atmWindZ=new Float32Array(ATM_N),atmNextHum=new Float32Array(ATM_N),
 atmNextCloud=new Float32Array(ATM_N),rainField=new Float32Array(size);
let physicalWeather=true,dayClock=390,atmosAccumulator=0,lastAtmosEvap=0,lastAtmosRain=0;
let atmRainMean=0,atmRainPeak=0,atmCloudMean=.42,atmHumMean=.70,atmTempMean=23,
 atmPressureMean=1011,atmWindMean=.4,atmWindHeading=0,atmosDayIndex=0;
const atmId=(i,j)=>j*ATM_NX+i,atmX=i=>-W*.5+i*W/(ATM_NX-1),
 atmZ=j=>-L*.5+j*L/(ATM_NZ-1);
const SEASON_DAYS=24;
const seasonShift=()=>Math.cos(2*Math.PI*(atmosDayIndex%SEASON_DAYS)/SEASON_DAYS);
// Inverno: nascer mais tarde e sol mais baixo; verão: dias um pouco mais longos.
const solarAt=seconds=>
 Math.sin(2*Math.PI*(seconds/DAY_SECONDS-.25))*(.87+.09*seasonShift())+
 .16*seasonShift();
function fieldAt(field,x,z){
 const fx=clamp((x/W+.5)*(ATM_NX-1),0,ATM_NX-1-.000001);
 const fz=clamp((z/L+.5)*(ATM_NZ-1),0,ATM_NZ-1-.000001);
 const i=Math.floor(fx),j=Math.floor(fz),u=fx-i,v=fz-j;
 const a=atmId(i,j),b=a+1,c=a+ATM_NX,d=c+1;
 return ((field[a]*(1-u)+field[b]*u)*(1-v)+
         (field[c]*(1-u)+field[d]*u)*v);
}
function initAtmosphere(){
 dayClock=390;atmosDayIndex=0;atmosAccumulator=0;
 lastAtmosEvap=stats.evaporated+stats.transpired;
 lastAtmosRain=stats.rain;
 for(let j=0;j<ATM_NZ;j++)for(let i=0;i<ATM_NX;i++){
  const k=atmId(i,j),x=atmX(i),z=atmZ(j);
  const wave=Math.sin(x*.48-z*.31),other=Math.cos(x*.32+z*.57);
  atmTemp[k]=21.6+2.6*wave+1.2*other;
  atmHumidity[k]=clamp(.76+.10*wave+.08*other,.44,.94);
  atmPressure[k]=1012.5+3.1*Math.sin(x*.28+z*.35);
  atmCloud[k]=clamp(.40+.19*Math.sin(x*.56+z*.41)+.16*Math.cos(z*.65-x*.19),.02,.83);
  if(stormActive()){
   // Frente úmida e nuvens profundas no início da tempestade.
   atmHumidity[k]=Math.max(.96,atmHumidity[k]);
   atmCloud[k]=Math.max(.89,atmCloud[k]);
   atmPressure[k]-=4.5;
  }
  atmRain[k]=0;atmWindX[k]=.32;atmWindZ[k]=.15;
 }
 rainField.fill(0);atmRainMean=atmRainPeak=0;
 appliedRainMean=appliedRainPeak=activeRainRegions=0;
 atmCloudMean=.48;atmHumMean=.74;atmTempMean=23;atmPressureMean=1012;
 if(physicalWeather&&climateChoice==='auto')applyClimate('partlyCloudy');
}
function atmCloudPreset(){
 if(stormActive()&&(atmCloudMean>.52||atmRainMean>.0003))return 'storm';
 if(atmRainPeak>.006||atmRainMean>.0021)return 'storm';
 if(atmCloudMean>.69)return 'overcast';
 if(atmCloudMean<.29)return 'sunny';
 return 'partlyCloudy';
}
function atmosphereStep(dt){
 const daySun=Math.max(0,solarAt(dayClock)),night=1-daySun;
 const clock=dayClock/DAY_SECONDS;
 // Passageira frente fria móvel atravessa a paisagem a cada dois dias.
 const frontX=-W*.60+((clock+atmosDayIndex*.53)%1)*W*1.35;
 const evaporation=Math.max(0,stats.evaporated+stats.transpired-lastAtmosEvap);
 const rainfall=Math.max(0,stats.rain-lastAtmosRain);
 lastAtmosEvap=stats.evaporated+stats.transpired;lastAtmosRain=stats.rain;
 const recycled=clamp(evaporation/(W*L)*1.4,0,.025);
 const rainSink=clamp(rainfall/(W*L)*.24,0,.014);
 let tSum=0,hSum=0,cSum=0,pSum=0,windSum=0,rainSum=0,peak=0,wxSum=0,wzSum=0;
 // 1. Advecção do vapor e das nuvens pelo vento (amostragem a montante).
 for(let j=0;j<ATM_NZ;j++)for(let i=0;i<ATM_NX;i++){
  const k=atmId(i,j),x=atmX(i),z=atmZ(j);
  const backX=x-atmWindX[k]*dt*.16,backZ=z-atmWindZ[k]*dt*.16;
  atmNextHum[k]=fieldAt(atmHumidity,backX,backZ);
  atmNextCloud[k]=fieldAt(atmCloud,backX,backZ);
 }
 // 2. Energia solar, pressão, frente fria, evapotranspiração e condensação.
 for(let j=0;j<ATM_NZ;j++)for(let i=0;i<ATM_NX;i++){
  const k=atmId(i,j),x=atmX(i),z=atmZ(j),terrain=elevation(x,z);
  const front=Math.exp(-Math.pow((x-frontX)/2.0,2));
  const terrainI=clamp(Math.round((x+W*.5)/dx),0,NX-1);
  const terrainJ=clamp(Math.round((z+L*.5)/dz),0,NZ-1);
  const forest=cover[idx(terrainI,terrainJ)];
  const airTempTarget=15.7+15.2*daySun+3.5*seasonShift()-2.4*forest-1.8*terrain-7.4*front;
  atmTemp[k]+= (airTempTarget-atmTemp[k])*clamp(dt*.0075,0,.15);
  const pressureTarget=1013.8+2.1*Math.cos(2*Math.PI*clock)
        -7.4*front+2.0*Math.sin(z*.39+clock*5.1);
  atmPressure[k]+=(pressureTarget-atmPressure[k])*clamp(dt*.009,0,.15);
  const left=atmPressure[atmId(Math.max(0,i-1),j)],
   right=atmPressure[atmId(Math.min(ATM_NX-1,i+1),j)],
   up=atmPressure[atmId(i,Math.max(0,j-1))],
   down=atmPressure[atmId(i,Math.min(ATM_NZ-1,j+1))];
  // Ar acelera dos centros de maior pressão em direção aos de menor pressão.
  atmWindX[k]=clamp(.29+(left-right)*.12+front*.35+(stormActive()?.75:0),-2.3,2.3);
  atmWindZ[k]=clamp(.13+(up-down)*.12+(stormActive()?.48:.22)*Math.sin(clock*6.28+z*.19),-2.0,2.0);
  const slopeX=(elevation(x+.32,z)-elevation(x-.32,z))/.64;
  const slopeZ=(elevation(x,z+.32)-elevation(x,z-.32))/.64;
  const uplift=Math.max(0,atmWindX[k]*slopeX+atmWindZ[k]*slopeZ);
  // Umidade disponível cai ao aquecer e sobe com o resfriamento/evaporação.
  const cooling=Math.max(0,21-atmTemp[k])*.00016;
  let hum=atmNextHum[k]+(forest*.00024+recycled/ATM_N+cooling-
                          daySun*.000085-rainSink/ATM_N+
                          (stormActive()?.0042:0))*dt;
  hum=clamp(hum,.22,.985);
  const severe=stormActive();
  const saturated=clamp((hum-.70)*3.15+(23-atmTemp[k])*.018+
      uplift*.24+front*.22+(severe?.41:0),0,1);
  let cloud=clamp(atmNextCloud[k]+(saturated*.032-
                  (1-saturated)*(.007+.009*daySun))*dt,0,1);
  const precipitation=clamp((cloud-.47)*2.7,0,1)*
             clamp((hum-.59)*3.4,0,1)*
             (.72+.45*uplift+.30*front);
  // Condensado reduz nuvem e umidade quando precipita; recarga por evaporação.
  const rainRate=level===0?0:clamp(precipitation*(severe?.0085:.0036),0,severe?.016:.0082);
  cloud=clamp(cloud-rainRate*dt*(severe?1.25:4.5),0,1);
  hum=clamp(hum-rainRate*dt*(severe?.28:.75),0,1);
  atmHumidity[k]=hum;atmCloud[k]=cloud;atmRain[k]=rainRate;
  tSum+=atmTemp[k];hSum+=hum;cSum+=cloud;pSum+=atmPressure[k];
  windSum+=Math.hypot(atmWindX[k],atmWindZ[k]);
  wxSum+=atmWindX[k];wzSum+=atmWindZ[k];rainSum+=rainRate;peak=Math.max(peak,rainRate);
 }
 atmTempMean=tSum/ATM_N;atmHumMean=hSum/ATM_N;atmCloudMean=cSum/ATM_N;
 atmPressureMean=pSum/ATM_N;atmWindMean=windSum/ATM_N;
 atmWindHeading=Math.atan2(wzSum,wxSum);
 atmRainMean=rainSum/ATM_N;atmRainPeak=peak;
 // Chuva regional em grade física; cada célula recebe a precipitação da sua zona.
 refreshRainDiagnostics();
 for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
  const k=idx(i,j);rainField[k]=fieldAt(atmRain,nx(i),nz(j));
 }
 if(physicalWeather&&climateChoice==='auto'){
  const next=atmCloudPreset();
  if(next!==climate)applyClimate(next);
 }
}
function updateAtmosphere(dt){
 // O relógio solar corre em tempo real: 1440 s = 24 h do jogo.
 const wasDay=dayClock;
 dayClock=(dayClock+dt)%DAY_SECONDS;
 if(dayClock<wasDay)atmosDayIndex++;
 atmosAccumulator+=dt;
 if(atmosAccumulator>=.55){
  const amount=Math.min(2.0,atmosAccumulator);
  atmosAccumulator=0;atmosphereStep(amount);
 }
 // Trajetória contínua do sol: leste ao amanhecer, alto no meio-dia, oeste ao entardecer.
 const phase=dayClock/DAY_SECONDS,angle=2*Math.PI*(phase-.25);
 const solar=solarAt(dayClock),dayLight=clamp((solar+.06)*2.7,0,1);
 const sunX=Math.cos(angle)*.87,sunY=solar,sunZ=.45*Math.sin(angle+.33);
 const r=Math.hypot(sunX,sunY,sunZ)||1;
 skySunDir.set(sunX/r,sunY/r,sunZ/r);
 skyM.uniforms.uNight.value=1-dayLight;
 skyM.uniforms.uSunDir.value.copy(skySunDir);
 skyM.uniforms.uSunVisible.value=weatherCfg?weatherCfg.sunVisible*dayLight:dayLight;
 light.position.set(sunX*22,Math.max(.08,sunY)*22,sunZ*22);
 const shade=Math.max(.72,1-atmCloudMean*.12*(.5+.5*Math.sin(weatherTime*.16+
    Math.sin(weatherTime*.065)*1.4)));
 light.intensity=(weatherCfg?weatherCfg.sunPower:2.0)*dayLight*shade;
 ambientSky.intensity=(weatherCfg?weatherCfg.ambientPower:2.1)*(.17+.83*dayLight);
 if(typeof waterM!=='undefined'){
  waterM.uniforms.uSun.value.copy(skySunDir);
  waterM.uniforms.uSunPower.value=(weatherCfg?weatherCfg.sunVisible:1)*dayLight;
 }
 if(climateChoice==='auto'&&physicalWeather){
  skyM.uniforms.uCoverage.value=stormActive()?Math.max(atmCloudMean,.92):atmCloudMean;
  skyM.uniforms.uWind.value=clamp(atmWindMean*.8,0,1.2);
  if(typeof waterM!=='undefined'){
   waterM.uniforms.uCloudiness.value=stormActive()?Math.max(atmCloudMean,.92):atmCloudMean;
   waterM.uniforms.uWind.value=clamp(atmWindMean*.8,0,1.2);
  }
 }
}
// V12.24 — Neblina de radiação pós-chuva: solo molhado + orvalho + vento
// fraco + resfriamento noturno/amanhecer. TEMPORAL NUNCA DISPARA NEBLINA.
// A chuva frontal pode gerar neblina na natureza, mas foi excluída por direção de arte.
let fogEnabled=true,fogStrength=0,fogTarget=0,fogRainMemory=0,fogRainAge=1e6;
let fogLastRain=0,fogClock=0,fogWetness=0,fogDewGap=10,fogCause='solo seco';
const mistGroup=new T.Group();mistGroup.name='Névoa baixa física de vale pós-chuva';
scene.add(mistGroup);
const mistTexture=(()=>{
 const c=document.createElement('canvas');c.width=128;c.height=128;
 const g=c.getContext('2d'),grad=g.createRadialGradient(64,68,4,64,64,62);
 grad.addColorStop(0,'rgba(233,244,238,.40)');
 grad.addColorStop(.40,'rgba(223,240,235,.24)');
 grad.addColorStop(.76,'rgba(207,232,230,.095)');
 grad.addColorStop(1,'rgba(207,232,230,0)');
 g.fillStyle=grad;g.fillRect(0,0,128,128);
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;
 return t;
})();
const fogPatches=[];
for(const [i,b] of basins.entries()){
 for(let n=0;n<(mobile?2:3);n++){
  const mat=new T.SpriteMaterial({map:mistTexture,color:'#e0ebe6',
   transparent:true,opacity:0,depthWrite:false,depthTest:true,fog:false});
  const mesh=new T.Sprite(mat);mesh.name='Neblina baixa '+i+'/'+n;
  const px=clamp(b.x+(n-1)*1.7,-W*.44,W*.44),
        pz=clamp(b.z+((i+n)%2?1:-1)*.8,-L*.44,L*.44);
  mesh.position.set(px,elevation(px,pz)+.30,pz);
  mesh.scale.set(5.0+n*1.3,1.3+.25*n,1);
  mesh.visible=false;mistGroup.add(mesh);
  fogPatches.push({mesh,x:px,z:pz,phase:i*2+n});
 }
}
function dewPointCelsius(temp,rh){
 const a=17.62,b=243.12;
 const relative=clamp(rh,.01,.999);
 const gamma=Math.log(relative)+(a*temp)/(b+temp);
 return b*gamma/(a-gamma);
}
function updateGroundFog(dt){
 const rainIncrease=Math.max(0,stats.rain-fogLastRain);
 fogLastRain=stats.rain;
 // A memória de chuva guarda até cinco minutos REAIS, não do time-lapse.
 const rainNow=level>0&&(physicalWeather?appliedRainMean>.000015:true);
 if(rainIncrease>.00003){
  fogRainMemory=clamp(fogRainMemory+rainIncrease/(W*L)*1.1,0,1);
  fogRainAge=0;
 }else{
  fogRainAge+=dt;
 }
 fogRainMemory=Math.max(0,fogRainMemory-dt/380);
 fogClock+=dt;
 if(fogClock>=.55){
  fogClock=0;
  let wet=0,samples=0;
  for(let j=4;j<NZ-4;j+=6)for(let i=4;i<NX-4;i+=6){
   const k=idx(i,j);
   wet+=clamp(soilMoisture[k]/Math.max(.001,soilCapacity[k]),0,1);
   wet+=Math.min(1,depth[k]/.09)*.28;
   samples++;
  }
  fogWetness=wet/Math.max(1,samples);
  const daySun=Math.max(0,solarAt(dayClock));
  const nightCooling=clamp((.35-solarAt(dayClock))*2.0,0,1);
  const cloudCover=climateChoice==='auto'?atmCloudMean:
    (weatherCfg?weatherCfg.coverage:atmCloudMean);
  const clearing=clamp((.90-cloudCover)/.55,0,1);
  const nearGroundRH=clamp(atmHumMean+fogWetness*.14+fogRainMemory*.08,.10,.998);
  const surfaceTemperature=atmTempMean-(nightCooling*3.4*clearing)-
    (fogWetness>.6?.30:0);
  fogDewGap=Math.max(0,surfaceTemperature-dewPointCelsius(atmTempMean,nearGroundRH));
  const saturation=clamp((2.5-fogDewGap)/2.5,0,1);
  const recentWet=clamp(fogRainMemory*.85+Math.max(0,fogWetness-.45)*1.3,0,1);
  const postRain=clamp(fogRainMemory/.16,0,1);
  const humidityReady=clamp((nearGroundRH-.86)/.11,0,1);
  const windCalm=clamp((1.18-atmWindMean)/.80,0,1);
  const nearDawn=clamp(nightCooling*.83+(1-daySun)*.17,0,1);
  // Nuvens devem ter aberto parcialmente para permitir resfriamento radiativo.
  const conditions=saturation*recentWet*postRain*humidityReady*windCalm*clearing*nearDawn;
  fogTarget=clamp(conditions*1.65,0,.88);
  if(!fogEnabled)fogCause='desligada';
  else if(stormActive()||climate==='storm')fogCause='temporal: sem neblina';
  else if(rainNow)fogCause='chovendo: sem neblina';
  else if(fogRainMemory<.06)fogCause='aguardando chuva anterior';
  else if(nearGroundRH<.86)fogCause='umidade perto do chão insuficiente';
  else if(atmWindMean>1.05)fogCause='vento dispersou a neblina';
  else if(fogDewGap>2.5)fogCause='ar acima do ponto de orvalho';
  else if(daySun>.45)fogCause='sol aquece o solo';
  else if(clearing<.2)fogCause='céu fechado reduz resfriamento';
  else fogCause='condensação baixa nos vales';
  if(!fogEnabled||stormActive()||climate==='storm'||rainNow)fogTarget=0;
 }
 // Temporal elimina imediatamente a névoa anterior em vez de escurecer com fog.
 if(stormActive()||climate==='storm'||rainNow||!fogEnabled)fogStrength=0;
 else fogStrength+=(fogTarget-fogStrength)*clamp(dt*(fogTarget>fogStrength?.55:.78),0,1);
 const strength=clamp(fogStrength,0,1);
 scene.fog.near=36-27*strength;
 scene.fog.far=74-51*strength;
 const base=weatherCfg?weatherCfg.bg:'#b6c6bc';
 scene.fog.color.set(base).lerp(new T.Color('#d9e7df'),strength*.65);
 for(const patch of fogPatches){
  patch.mesh.visible=strength>.04;
  patch.mesh.material.opacity=strength*(.18+.07*Math.sin(visualTime*.30+patch.phase));
  patch.mesh.position.x=patch.x+Math.cos(atmWindHeading)*.08*Math.sin(visualTime*.19+patch.phase);
  patch.mesh.position.z=patch.z+Math.sin(atmWindHeading)*.08*Math.sin(visualTime*.19+patch.phase);
 }
}
function resetGroundFog(){
 fogStrength=fogTarget=fogRainMemory=0;
 fogRainAge=1e6;fogLastRain=stats.rain;fogClock=0;fogCause='aguardando chuva';
 updateGroundFog(0);
}

function atmosphereRainAt(x,z){
 return fieldAt(atmRain,x,z);
}

function grid(){
 const g=new T.BufferGeometry(),p=new Float32Array(size*3),uv=new Float32Array(size*2),tri=[];
 for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
  const k=idx(i,j);p[k*3]=nx(i);p[k*3+2]=nz(j);uv[k*2]=i/(NX-1);uv[k*2+1]=j/(NZ-1);
  if(j<NZ-1&&i<NX-1){const a=k,b=k+1,c=k+NX,d=c+1;tri.push(a,c,b,b,c,d);}
 }
 g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(tri);return g;
}
// Pintura procedural original: pinceladas translúcidas e variação macro orgânica.
// Inspirada em aquarela artesanal. NÃO usa o pack externo de Voxel Core Lab.
function groundTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const ctx=canvas.getContext('2d'),r=rand(2233);
 ctx.fillStyle='#e8dfcb';ctx.fillRect(0,0,512,512);
 // Camadas de lavagem aquarelada (wash) e bordas com textura orgânica.
 for(let layer=0;layer<5;layer++){
  for(let i=0;i<75;i++){
   const x=r()*512,y=r()*512,rx=12+r()*45,ry=7+r()*21;
   ctx.fillStyle=['#8b9d73','#a6a77f','#c9aa87','#e1cba5','#a3bba0'][Math.floor(r()*5)];
   ctx.globalAlpha=.022+.019*r();ctx.beginPath();
   ctx.ellipse(x,y,rx,ry,r()*6.283,0,6.283);ctx.fill();
  }
 }
 // Pigmentos finos: manchas conectadas em vez de quadriculação ou ruído por pixel.
 for(let i=0;i<900;i++){
  const x=r()*512,y=r()*512;
  ctx.globalAlpha=.035+.065*r();
  ctx.strokeStyle=['#7b895f','#bcab82','#a9b883','#8b765f','#e6d7b4'][Math.floor(r()*5)];
  ctx.lineWidth=.65+r()*2.5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x,y);
  ctx.quadraticCurveTo(x+2+r()*4,y-3-r()*3,x+5+r()*13,y+1+r()*4);
  ctx.stroke();
 }
 ctx.globalAlpha=1;
 const t=new T.CanvasTexture(canvas);t.wrapS=t.wrapT=T.RepeatWrapping;
 t.repeat.set(4.2,3.35);t.colorSpace=T.SRGBColorSpace;t.anisotropy=mobile?2:6;return t;
}
const landG=grid(),landP=landG.attributes.position.array,colors=new Float32Array(size*3),dry=new Float32Array(size*3);
for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
 const k=idx(i,j),x=nx(i),z=nz(j),h=elevation(x,z);soil[k]=h;landP[k*3+1]=h;
 blocked[k]=rockAt(x,z)?1:0;
 const moss=.5+.5*Math.sin(x*1.4-z*.88),v=clamp(.48+.29*Math.sin(x*.43+z*.3)+.15*moss,.14,.9);
 cover[k]=clamp(.05+.60*moss+.24*Math.sin(z*.55+x*1.33),0,.82);
 soilCapacity[k]=.060+.085*cover[k]+.023*(.5+.5*Math.cos(x*1.7-z*.8));
 permeability[k]=.003+.002*cover[k]+.0007*(.5+.5*Math.sin(x*.9+z*1.4));
  let basinFactor=0;
  for(const b of basins){
    const q=((x-b.x)/b.sx)**2+((z-b.z)/b.sz)**2;
    basinFactor=Math.max(basinFactor,Math.exp(-2.1*q));
  }
  // Parte baixa de textura mais fina; encostas preservam alta permeabilidade.
  basinHold[k]=clamp(basinFactor*(.90-.18*cover[k]),0,.87);
 const a=new T.Color(h<-.10?'#a47e62':'#b99b7d'),b=new T.Color((h>.52&&moss>.78)?'#777960':'#8d6952');
 a.lerp(b,clamp(.32+v*.45,0,1));for(let m=0;m<3;m++)dry[k*3+m]=colors[k*3+m]=a.toArray()[m];
}
baseCapacity.set(soilCapacity);basePermeability.set(permeability);
for(let k=0;k<size;k++)permeability[k]=basePermeability[k]*1.45;
// A paleta inicial é substituída pelo mosaico de solos depois que o terreno existe.
landG.setAttribute('color',new T.BufferAttribute(colors,3));landG.computeVertexNormals();
const land=new T.Mesh(landG,new T.MeshStandardMaterial({map:groundTexture(),vertexColors:true,roughness:1,side:T.DoubleSide}));
land.receiveShadow=true;land.name='Terra absorvente e barro V12.12';scene.add(land);
const slab=new T.Mesh(new T.BoxGeometry(W,.52,L),new T.MeshStandardMaterial({color:'#614832',roughness:1}));
slab.position.y=Math.min(...soil)-.55;slab.receiveShadow=true;scene.add(slab);
// Rochas anime: silhuetas orgânicas sem faces quadradas, paleta envelhecida e musgo discreto.
// Modelos procedurais locais: sem download externo, acessíveis também em Android/offline.
const stones=new T.Group();stones.name='Rochas anime, seixos e musgo';scene.add(stones);
const stonePalette=['#858a86','#8f877d','#757e7b','#998f80','#737b74','#877c6f','#919087'];
const mossTone=new T.Color('#5d6d55');
const stoneMaterial=new T.MeshToonMaterial({color:'#ffffff',vertexColors:true});
const stoneOutlineMaterial=new T.MeshBasicMaterial({
 color:'#49504b',side:T.BackSide,transparent:true,opacity:.75,depthWrite:false
});
// Deformações contínuas: vértices que dividem posições recebem o MESMO deslocamento.
// Mantém a malha fechada, ao contrário de deslocar vértices de forma aleatória.
function makeAnimeStone(seed,detail,paletteIndex){
 const geo=new T.IcosahedronGeometry(1,detail);
 const position=geo.attributes.position,cols=new Float32Array(position.count*3);
 const baseColor=new T.Color(stonePalette[paletteIndex%stonePalette.length]);
 let minY=Infinity,maxY=-Infinity;
 const rx=.90+.09*Math.sin(seed*.67),rz=.91+.09*Math.cos(seed*.93);
 const offset=seed*.173;
 for(let k=0;k<position.count;k++){
  const vx=position.getX(k),vy=position.getY(k),vz=position.getZ(k);
  const broad=.105*Math.sin(vx*3.7+vz*2.1+offset)*Math.cos(vy*2.6-offset*.8);
  const detailNoise=.050*Math.sin(vz*6.9-vy*4.0+offset)*Math.cos(vx*5.1+offset*.4);
  const asym=.037*Math.sin(vx*8.0+vy*3.5+vz*5.2+offset);
  const shape=1+broad+detailNoise+asym;
  let x=vx*rx*shape, y=vy*(.70+.045*Math.sin(seed))*shape,z=vz*rz*shape;
  // Base de rocha assente no solo e topo irregular sem virar bloco cúbico.
  if(y<-.20)y=-.20+(y+.20)*.43;
  if(y>.14)y*=1.02;
  minY=Math.min(minY,y);maxY=Math.max(maxY,y);
  position.setXYZ(k,x,y,z);
  const facet=.78+.09*Math.sin(vx*3.1+vz*2.7+offset)+.06*vy;
  const shadow=clamp(facet,.61,.97);
  const c=baseColor.clone().multiplyScalar(shadow);
  // Manchas de musgo concentradas no topo e em concavidades, não uma cobertura verde geral.
  const mossSeed=Math.sin(x*8.4+offset)*Math.cos(z*10.1-offset*.4)+
                 .34*Math.sin(x*14.2+z*4.6+offset*2);
  const mossPatch=vy>.18&&mossSeed>.34&&paletteIndex%4!==2
   ?clamp((mossSeed-.34)*.34,0,.30):0;
  if(mossPatch>0)c.lerp(mossTone,mossPatch);
  cols[k*3]=c.r;cols[k*3+1]=c.g;cols[k*3+2]=c.b;
 }
 position.needsUpdate=true;
 geo.setAttribute('color',new T.BufferAttribute(cols,3));
 geo.computeVertexNormals();geo.computeBoundingSphere();
 geo.userData.lowest=minY;geo.userData.highest=maxY;
 return geo;
}
// Formas reutilizáveis, cada uma com um perfil diferente: baixos, altos e assimétricos.
const stoneModels=[
 makeAnimeStone(11,2,0),makeAnimeStone(23,1,1),
 makeAnimeStone(37,2,2),makeAnimeStone(49,1,3),
 makeAnimeStone(63,2,4),makeAnimeStone(81,1,5),
 makeAnimeStone(107,1,6)
];
// Perfil físico aproximado das rochas: gotas atingem a parte exposta, não a submersa.
const rockSolids=[];
let visibleRocks=0;
for(let i=0;i<rocks.length;i++){
 const [x,z,r]=rocks[i];
 const pieces=1+(random()<.38?1:0);
 const cluster=new T.Group();cluster.name='Rochas orgânicas '+(i+1);
 for(let p=0;p<pieces;p++){
  const geo=stoneModels[(i*3+p*2)%stoneModels.length];
  const rock=new T.Mesh(geo,stoneMaterial);
  const side=p===0?1:(.38+random()*.22);
  const sx=r*side*(.96+random()*.20),sy=r*side*(.78+random()*.27),
        sz=r*side*(.95+random()*.19);
  const px=x+(p?(random()-.5)*r*1.0:0);
  const pz=z+(p?(random()-.5)*r*1.0:0);
  rock.position.set(px,elevation(px,pz)-geo.userData.lowest*sy-.045*r,pz);
  rock.scale.set(sx,sy,sz);
  rock.rotation.set((random()-.5)*.15,random()*Math.PI*2,(random()-.5)*.11);
  rock.castShadow=true;rock.receiveShadow=true;
  rockSolids.push({x:px,z:pz,rx:sx*1.04,rz:sz*1.04,
    bottom:rock.position.y+geo.userData.lowest*sy,
    top:rock.position.y+geo.userData.highest*sy});
  // Outline discreto de anime, aplicado à silhueta, não uma borda preta larga.
  const outline=new T.Mesh(geo,stoneOutlineMaterial);
  outline.scale.set(1.025,1.034,1.025);outline.renderOrder=1;
  outline.castShadow=false;outline.receiveShadow=false;
  rock.add(outline);
  cluster.add(rock);visibleRocks++;
 }
 stones.add(cluster);
}
// Seixos baixos ao redor das rochas grandes: 1 InstancedMesh em vez de muitas draw calls.
const pebbleMax=mobile?70:115;
const pebbleGeometry=makeAnimeStone(131,1,1);
const pebbles=new T.InstancedMesh(pebbleGeometry,stoneMaterial,pebbleMax);
pebbles.name='Seixos irregulares do terreno';pebbles.frustumCulled=false;
pebbles.castShadow=false;pebbles.receiveShadow=true;
const pebbleTransform=new T.Object3D();let pebbleCount=0;
for(let i=0;i<rocks.length&&pebbleCount<pebbleMax;i++){
 const [x,z,r]=rocks[i];
 const amount=2+Math.floor(random()*4);
 for(let p=0;p<amount&&pebbleCount<pebbleMax;p++){
  const angle=random()*Math.PI*2,dist=r*(1.35+random()*1.50);
  const px=x+Math.cos(angle)*dist,pz=z+Math.sin(angle)*dist;
  if(px<-W*.5+.4||px>W*.5-.4||pz<-L*.5+.4||pz>L*.5-.4)continue;
  if(rockAt(px,pz))continue;
  const a=.075+random()*.083,b=a*(.48+random()*.30),c=a*(.85+random()*.5);
  pebbleTransform.position.set(px,elevation(px,pz)-pebbleGeometry.userData.lowest*b-.016,pz);
  pebbleTransform.scale.set(a,b,c);
  pebbleTransform.rotation.set((random()-.5)*.18,random()*Math.PI*2,(random()-.5)*.16);
  pebbleTransform.updateMatrix();pebbles.setMatrixAt(pebbleCount++,pebbleTransform.matrix);
 }
}
pebbles.count=pebbleCount;pebbles.instanceMatrix.needsUpdate=true;
stones.add(pebbles);

// Plantas 3D estilizadas: cada muda tem âncora no solo, biomassa e cor próprias.
// A mesma malha instanciada responde à fertilidade local (água, N/P/K, pH, sais e oxigênio).
const grass=new T.InstancedMesh(
 new T.ConeGeometry(.085,.36,4),
 new T.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true}),
 mobile?160:330);
const ob=new T.Object3D(),grassAnchors=[];
let gcount=0;
for(let k=0;k<grass.count*3&&gcount<grass.count;k++){
 const x=(random()-.5)*W,z=(random()-.5)*L,y=elevation(x,z);
 if(rockAt(x,z)||y<-.15)continue;
 const scale=.60+random()*.95,angle=random()*6.28;
 grassAnchors.push({x,z,y,scale,angle});
 ob.position.set(x,y+.09*scale,z);ob.scale.set(scale,scale,scale);ob.rotation.y=angle;ob.updateMatrix();
 grass.setMatrixAt(gcount++,ob.matrix);
 grass.setColorAt(gcount-1,new T.Color('#6b9465'));
}
grass.count=gcount;
grass.castShadow=true;grass.frustumCulled=false;scene.add(grass);
const plantBaseGreen=new T.Color('#668f5e'),plantHealthyGreen=new T.Color('#90ae71'),plantDry=new T.Color('#a19463');
function updatePlantVisuals(){
 for(let i=0;i<grass.count;i++){
  const a=grassAnchors[i],cell=idx(clamp(Math.round((a.x+W*.5)/dx),0,NX-1),
                                   clamp(Math.round((a.z+L*.5)/dz),0,NZ-1));
  const growth=clamp(soilPlant[cell],.05,1.2),health=clamp(soilHealth[cell],0,1);
  const visibleHeight=clamp(.24+growth*.85,.22,1.30)*a.scale;
  ob.position.set(a.x,a.y+.18*visibleHeight,a.z);
  ob.scale.set(a.scale*(.72+.27*growth),visibleHeight,a.scale*(.72+.27*growth));
  ob.rotation.set(0,a.angle,0);ob.updateMatrix();
  grass.setMatrixAt(i,ob.matrix);
  const c=plantBaseGreen.clone().lerp(plantHealthyGreen,health);
  c.lerp(plantDry,(1-health)*.55);
  grass.setColorAt(i,c);
 }
 grass.instanceMatrix.needsUpdate=true;
 if(grass.instanceColor)grass.instanceColor.needsUpdate=true;
}
configureSoilCells(false);
for(let k=0;k<size;k++)minNutrientAt(k);
updatePlantVisuals();
// Mudas com dois lóbulos/folhas, sem efeitos mágicos: arte original low-poly.
const sproutGroup=new T.Group();sproutGroup.name='Mudas anime alimentadas pelo solo';scene.add(sproutGroup);
const sproutHeads=[],sproutColors=['#83a775','#6f9666','#98ae7e'];
const sproutMaterial=new T.MeshToonMaterial({color:'#ffffff',vertexColors:false});
for(let i=0;i<(mobile?24:48);i++){
 const x=(random()-.5)*(W-1),z=(random()-.5)*(L-1),y=elevation(x,z);
 if(y<-.16||rockAt(x,z))continue;
 const g=new T.Group(),stem=new T.Mesh(new T.CylinderGeometry(.015,.020,.26,5),
  new T.MeshToonMaterial({color:'#6c8054'}));
 stem.position.y=.13;g.add(stem);
 for(const sign of [-1,1]){
  const leaf=new T.Mesh(new T.SphereGeometry(.115,5,4),
   new T.MeshToonMaterial({color:sproutColors[i%3]}));
  leaf.position.set(sign*.10,.24,0);
  leaf.scale.set(.90,.42,.56);
  leaf.rotation.z=sign*.35;g.add(leaf);
 }
 g.position.set(x,y+.012,z);sproutGroup.add(g);sproutHeads.push({group:g,x,z});
}
function updateSprouts(){
 for(const item of sproutHeads){
  const k=idx(clamp(Math.round((item.x+W*.5)/dx),0,NX-1),
              clamp(Math.round((item.z+L*.5)/dz),0,NZ-1));
  const biomass=clamp(soilPlant[k],.05,1.25),health=clamp(soilHealth[k],0,1);
  const scale=.47+biomass*.77;
  item.group.scale.set(scale,scale,scale);
  for(let i=1;i<item.group.children.length;i++){
   const leaf=item.group.children[i],shade=new T.Color('#b09e69').lerp(
    new T.Color('#789e70'),health);
   leaf.material.color.copy(shade);
  }
 }
}
updateSprouts();

// Floresta V12.23: oito malhas REAIS do Stylized Nature MegaKit Standard (CC0)
// copiadas e hospedadas no próprio repositório. A textura de chão é original.
// Falhas de GPU, WebGL, rede ou GLTFLoader mantêm as mudas antigas como fallback.
const forestGroup=new T.Group();forestGroup.name='Floresta Quaternius CC0 — painterly';scene.add(forestGroup);
const forestInstances=[],forestModels={};let floraWanted=true,floraLoaded=0,floraState='Preparando';
const FOREST_MODELS=[
 {name:'CommonTree_1',type:'tree',mobile:5,desktop:9,height:4.4},
 {name:'CommonTree_2',type:'tree',mobile:3,desktop:7,height:4.0},
 {name:'Pine_2',type:'pine',mobile:2,desktop:4,height:4.7},
 {name:'Bush_Common_Flowers',type:'bush',mobile:8,desktop:17,height:.95},
 {name:'Flower_3_Group',type:'flower',mobile:13,desktop:33,height:.47},
 {name:'Grass_Common_Short',type:'grass',mobile:14,desktop:35,height:.29},
 {name:'Fern_1',type:'fern',mobile:5,desktop:12,height:.61},
 {name:'Rock_Medium_2',type:'rock',mobile:5,desktop:8,height:.70}
];
// Gramado fino instanciado: 2 lâminas cruzadas por tufo, com degradê de cor.
function makeMeadowBlade(){
 const points=[],indices=[],shades=[];
 for(const a of [0,Math.PI*.53]){
  const c=Math.cos(a),sn=Math.sin(a),offset=points.length/3;
  const verts=[[-.071,0,0],[.071,0,0],[-.041,.13,0],[.036,.15,0],
               [.018,.31,.01]];
  for(const [x,y,z] of verts){
   points.push(x*c+z*sn,y,-x*sn+z*c);
   const t=y/.31;shades.push(.40+.25*t,.55+.27*t,.31+.14*t);
  }
  indices.push(offset,offset+1,offset+2,offset+1,offset+3,offset+2,
   offset+2,offset+3,offset+4);
 }
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute(points,3));
 g.setAttribute('color',new T.Float32BufferAttribute(shades,3));
 g.setIndex(indices);g.computeVertexNormals();return g;
}
const meadowCount=mobile?390:920,meadowObj=new T.Object3D(),meadowAnchors=[];
const meadowMesh=new T.InstancedMesh(makeMeadowBlade(),
 new T.MeshLambertMaterial({color:'#ffffff',vertexColors:true,side:T.DoubleSide}),
 meadowCount);
const meadowRng=rand(93012);
meadowMesh.count=0;meadowMesh.name='Gramado painterly denso — instâncias';
for(let n=0;n<meadowCount*3&&meadowMesh.count<meadowCount;n++){
 const x=(meadowRng()-.5)*(W-1.0),z=(meadowRng()-.5)*(L-1.0);
 const y=elevation(x,z);
 if(y<-.21||rockAt(x,z))continue;
 const cell=idx(clamp(Math.round((x+W*.5)/dx),0,NX-1),
  clamp(Math.round((z+L*.5)/dz),0,NZ-1));
 const density=clamp(.25+cover[cell]*.75,0,1);
 if(meadowRng()>density)continue;
 const size=.42+meadowRng()*1.55,rot=meadowRng()*6.283;
 meadowAnchors.push({x,z,size,rot,k:cell});
 meadowObj.position.set(x,y+.008,z);
 meadowObj.scale.set(size,size,size);meadowObj.rotation.set(0,rot,0);
 meadowObj.updateMatrix();
 meadowMesh.setMatrixAt(meadowMesh.count,meadowObj.matrix);
 const color=new T.Color(['#84a762','#6f9c57','#a2b575','#689866'][Math.floor(meadowRng()*4)]);
 meadowMesh.setColorAt(meadowMesh.count,color);
 meadowMesh.count++;
}
meadowMesh.instanceMatrix.needsUpdate=true;
if(meadowMesh.instanceColor)meadowMesh.instanceColor.needsUpdate=true;
meadowMesh.frustumCulled=false;forestGroup.add(meadowMesh);
function updateMeadowHealth(){
 const green=new T.Color('#85ab69'),dryColor=new T.Color('#a8a076');
 for(let i=0;i<meadowAnchors.length;i++){
  const a=meadowAnchors[i],health=clamp(soilHealth[a.k],0,1);
  const c=dryColor.clone().lerp(green,health);
  meadowMesh.setColorAt(i,c);
 }
 if(meadowMesh.instanceColor)meadowMesh.instanceColor.needsUpdate=true;
}

function forestStatus(state){
 floraState=state;
 if($('floraStatus'))$('floraStatus').textContent=
  '🌳 Modelos Quaternius: '+floraLoaded+'/8 · '+state+
  ' · solo aquarelado procedural';
}
function setFloraVisible(v){
 floraWanted=!!v;forestGroup.visible=floraWanted&&floraLoaded>0;
 grass.visible=!forestGroup.visible;sproutGroup.visible=!forestGroup.visible;
 if($('floraToggle'))$('floraToggle').checked=floraWanted;
 forestStatus(floraWanted?(floraLoaded?'ativos':'carregando'):'vegetação clássica');
}
// V12.24 — Folhas e ramos finos animados pelo vento no shader GLSL.
// A intensidade vem do vento da atmosfera, direção e rajadas ao longo do tempo.
const leafWindUniforms={
 time:{value:0},power:{value:.03},gust:{value:0},direction:{value:new T.Vector3(1,0,.2)}
};
const leafWindMaterials=new Set();let leafWindMeshes=0;
function addLeafWind(mesh){
 if(!mesh.isMesh)return;
 const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
 for(const mat of materials){
  if(!mat||!/(leaf|leaves|grass|flower|fern|plant)/i.test(mat.name||''))continue;
  if(mat.userData.arcanoWindReady)continue;
  const geo=mesh.geometry;
  if(!geo.boundingBox)geo.computeBoundingBox();
  const box=geo.boundingBox;
  const uBottom={value:box?.min?.y??0};
  const uTall={value:Math.max(.20,(box?.max?.y??1)-uBottom.value)};
  mat.userData.arcanoWindReady=true;
  mat.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,{
    uArcWindTime:leafWindUniforms.time,
    uArcWindPower:leafWindUniforms.power,
    uArcWindGust:leafWindUniforms.gust,
    uArcWindDirection:leafWindUniforms.direction,
    uArcWindBottom:uBottom,uArcWindTall:uTall
   });
   shader.vertexShader=[
    'uniform float uArcWindTime;',
    'uniform float uArcWindPower;',
    'uniform float uArcWindGust;',
    'uniform float uArcWindBottom;',
    'uniform float uArcWindTall;',
    'uniform vec3 uArcWindDirection;'
   ].join('\n')+'\n'+shader.vertexShader;
   const snippet=[
    '#include <begin_vertex>',
    'vec3 arcWorld=(modelMatrix*vec4(position,1.0)).xyz;',
    'float arcHeight=clamp((position.y-uArcWindBottom)/uArcWindTall,.23,1.0);',
    'vec3 arcForward=normalize(modelMatrix[0].xyz);',
    'vec3 arcSide=normalize(modelMatrix[2].xyz);',
    'vec2 arcWindLocal=vec2(dot(arcForward,uArcWindDirection),dot(arcSide,uArcWindDirection));',
    'float arcWave=sin(uArcWindTime*1.55+dot(arcWorld.xz,vec2(.54,.91))+position.y*.32);',
    'float arcFlutter=sin(uArcWindTime*6.7+arcWorld.x*2.41+arcWorld.z*1.82+position.y*3.26);',
    'float arcAmount=uArcWindPower*(.60+.40*arcWave+uArcWindGust*.45);',
    'transformed.xz+=arcWindLocal*arcAmount*arcHeight;',
    'transformed.y+=arcFlutter*uArcWindPower*.13*arcHeight;'
   ].join('\n');
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',snippet);
  };
  mat.customProgramCacheKey=()=> 'arcano-leaves-wind-v1224';
  mat.needsUpdate=true;leafWindMaterials.add(mat);leafWindMeshes++;
 }
}

function placeForestModel(item,root){
 const randomForest=rand(9157+item.name.split('').reduce((a,c)=>a+c.charCodeAt(0),0));
 root.updateMatrixWorld(true);
 root.traverse(mesh=>addLeafWind(mesh));
 const bbox=new T.Box3().setFromObject(root);
 const h=Math.max(.001,bbox.max.y-bbox.min.y);
 const count=mobile?item.mobile:item.desktop;
 let created=0;
 for(let attempt=0;attempt<count*26&&created<count;attempt++){
  const x=(randomForest()-.5)*(W-1.3),z=(randomForest()-.5)*(L-1.3);
  const edge=Math.max(Math.abs(x)/(W*.5),Math.abs(z)/(L*.5));
  if(item.type==='tree'||item.type==='pine'){
   if(edge<.48&&randomForest()<.85)continue;
  }
  if(rockAt(x,z))continue;
  let basinBlocked=false;
  for(const b of basins){
   const q=Math.pow((x-b.x)/(b.sx+.2),2)+Math.pow((z-b.z)/(b.sz+.2),2);
   if(q<(item.type==='tree'||item.type==='pine'?.94:.58)){
    basinBlocked=true;break;
   }
  }
  if(basinBlocked)continue;
  const y=elevation(x,z);
  if(y<-.13)continue;
  const obj=root.clone(true),factor=.78+randomForest()*.52;
  const desired=item.height*factor;
  const scale=desired/h;
  obj.scale.setScalar(scale);obj.position.set(x,y-bbox.min.y*scale-.015,z);
  const rot=randomForest()*Math.PI*2;obj.rotation.y=rot;
  obj.traverse(o=>{
   if(!o.isMesh)return;
   o.castShadow=!mobile&&(item.type==='tree'||item.type==='pine')&&created<4;
   o.receiveShadow=false;
   const mat=o.material;
   if(mat){mat.side=T.DoubleSide;mat.roughness=.92;mat.metalness=0;}
  });
  forestGroup.add(obj);
  forestInstances.push({obj,x,z,y,rotation:rot,baseScale:scale,type:item.type,
   phase:randomForest()*Math.PI*2});
  created++;
 }
}
async function loadPainterlyForest(){
 if($('floraToggle'))$('floraToggle').checked=true;
 try{
  const api=await import('https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/GLTFLoader.js');
  const loader=new api.GLTFLoader();
  let ok=0;
  for(const item of FOREST_MODELS){
   try{
    const doc=await loader.loadAsync('./assets/quaternius/'+item.name+'.gltf');
    forestModels[item.name]=doc.scene;
    placeForestModel(item,doc.scene);ok++;floraLoaded=ok;
    forestStatus('carregando flora '+ok+'/8');
   }catch(err){console.warn('[Arcano] Modelo não carregado',item.name,err);}
  }
  if(ok===0)throw new Error('Nenhum modelo glTF carregou');
  setFloraVisible(floraWanted);
  updateForestHealth();
  forestStatus('floresta 3D carregada');
 }catch(err){
  console.warn('[Arcano] Mantendo vegetação original; importação glTF indisponível:',err);
  forestGroup.visible=false;grass.visible=true;sproutGroup.visible=true;
  floraWanted=false;forestStatus('fallback: vegetação original');
 }
}
function updateForestHealth(){
 updateMeadowHealth();
 for(const a of forestInstances){
  if(a.type==='rock'||a.type==='tree'||a.type==='pine')continue;
  const i=clamp(Math.round((a.x+W*.5)/dx),0,NX-1);
  const j=clamp(Math.round((a.z+L*.5)/dz),0,NZ-1),k=idx(i,j);
  const biomass=clamp(soilPlant[k],.12,1.2),health=clamp(soilHealth[k],0,1);
  const factor=.69+biomass*.30;
  a.obj.scale.setScalar(a.baseScale*factor);
  a.obj.visible=health>.10;
 }
}
function animateForest(dt){
 const t=visualTime;
 const gust=(Math.sin(t*.83+Math.sin(t*.21)*1.7)+
             .45*Math.sin(t*2.11+.75))*.5;
 const weatherMin=climate==='storm'?1.55:climate==='overcast'?.53:.05;
 const actualWind=Math.max(atmWindMean,weatherMin);
 const strength=clamp(actualWind/2.4,0,1);
 leafWindUniforms.time.value=t;
 leafWindUniforms.power.value=.018+strength*.145;
 leafWindUniforms.gust.value=gust*strength;
 leafWindUniforms.direction.value.set(Math.cos(atmWindHeading),0,
  Math.sin(atmWindHeading)).normalize();
 // Copas e folhas são deformadas no shader; troncos pouco se deslocam.
 if(!forestGroup.visible)return;
 const trunkSway=(.002+.014*strength)*(.65+.35*gust);
 for(const a of forestInstances){
  if(a.type==='rock')continue;
  const amount=trunkSway*(a.type==='tree'||a.type==='pine'?1:.80);
  a.obj.rotation.z=amount*Math.sin(t*(.57+actualWind*.12)+a.phase);
  a.obj.rotation.x=amount*.51*Math.cos(t*(.72+actualWind*.10)+a.phase*1.36);
 }
}
loadPainterlyForest();

// A física permanece na malha original, o material 3D usa amostras mais densas.
const SURFACE_VISIBLE=.006,SURFACE_RIPPLE=.012,SURFACE_POND=.018;
const wet=new Float32Array(size),flow=new Float32Array(size*2);
const flowXField=new Float32Array(size),flowZField=new Float32Array(size);
const VIS_NX=mobile?118:166,VIS_NZ=mobile?96:134,VIS_SIZE=VIS_NX*VIS_NZ;
const waterPositions=new Float32Array(VIS_SIZE*3),waterDepths=new Float32Array(VIS_SIZE);
const waterMud=new Float32Array(VIS_SIZE),waterFlow=new Float32Array(VIS_SIZE*2);
const waterG=new T.BufferGeometry(),triangles=[];
const wx=i=>-W*.5+i*W/(VIS_NX-1),wz=j=>-L*.5+j*L/(VIS_NZ-1);
for(let j=0;j<VIS_NZ;j++)for(let i=0;i<VIS_NX;i++){
 const k=j*VIS_NX+i;waterPositions[k*3]=wx(i);waterPositions[k*3+2]=wz(j);
 if(j<VIS_NZ-1&&i<VIS_NX-1){const a=k,b=k+1,c=k+VIS_NX,d=c+1;triangles.push(a,c,b,b,c,d);}
}
waterG.setAttribute('position',new T.BufferAttribute(waterPositions,3).setUsage(T.DynamicDrawUsage));
waterG.setAttribute('waterDepth',new T.BufferAttribute(waterDepths,1).setUsage(T.DynamicDrawUsage));
waterG.setAttribute('mudAmount',new T.BufferAttribute(waterMud,1).setUsage(T.DynamicDrawUsage));
waterG.setAttribute('waterFlow',new T.BufferAttribute(waterFlow,2).setUsage(T.DynamicDrawUsage));
waterG.setIndex(triangles);waterG.boundingSphere=new T.Sphere(new T.Vector3(),Math.hypot(W,L)+5);
// Reflexões reais capturadas da cena: céu, nuvens, sol, pedras, capim e relevo.
// Desktop: dois pontos de captura para refletir melhor áreas diferentes do terreno.
// Mobile: uma sonda, resolução menor e captura menos frequente.
const reflectionRT=new T.WebGLCubeRenderTarget(mobile?128:192,{
 generateMipmaps:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter,format:T.RGBAFormat
});
const reflectionCamera=new T.CubeCamera(.15,85,reflectionRT);
reflectionCamera.position.set(basins[1].x,.65,basins[1].z);scene.add(reflectionCamera);
const reflectionRT2=mobile?null:new T.WebGLCubeRenderTarget(192,{
 generateMipmaps:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter,format:T.RGBAFormat
});
const reflectionCamera2=reflectionRT2?new T.CubeCamera(.15,85,reflectionRT2):null;
if(reflectionCamera2){reflectionCamera2.position.set(basins[0].x,.65,basins[0].z);scene.add(reflectionCamera2);}
const waterM=new T.ShaderMaterial({
 transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,
 uniforms:{
  uTime:{value:0},uEnv:{value:reflectionRT.texture},
  uEnv2:{value:reflectionRT2?reflectionRT2.texture:reflectionRT.texture},
  uReflect:{value:0},uDualProbes:{value:0},
  uProbeA:{value:new T.Vector2(basins[1].x,basins[1].z)},
  uProbeB:{value:new T.Vector2(basins[0].x,basins[0].z)},
  uSun:{value:skySunDir},
  uSunPower:{value:.8},uCloudiness:{value:.43},uWind:{value:.35},
  uWeatherReflect:{value:.92},uWeatherTint:{value:new T.Color('#a1c7d0')}
 },
 vertexShader:"precision highp float;\nattribute float waterDepth;attribute float mudAmount;attribute vec2 waterFlow;uniform float uTime,uWind;\nvarying vec3 vWorld;varying float vDepth;varying float vMud;varying vec2 vSlope;varying float vMovement;\nvoid main(){\n vec3 p=position;vDepth=waterDepth;vMud=mudAmount;\n float motion=clamp(length(waterFlow)*3.0+uWind*.38,0.0,1.0);vMovement=motion;\n float amp=(.0018+.018*motion)*smoothstep(.006,.065,waterDepth);\n float a=p.x*3.5+p.z*1.4-uTime*(1.2+1.9*motion);\n float b=p.z*5.1-p.x*1.7+uTime*(1.5+1.6*motion);\n p.y+=(sin(a)*.64+cos(b)*.36)*amp;\n vSlope=vec2((cos(a)*3.5*.64+sin(b)*1.7*.36)*amp,(cos(a)*1.4*.64-sin(b)*5.1*.36)*amp);\n vec4 w=modelMatrix*vec4(p,1.0);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;\n}",fragmentShader:"precision highp float;\nuniform float uTime;uniform samplerCube uEnv;uniform samplerCube uEnv2;\nuniform float uReflect,uDualProbes,uSunPower,uCloudiness,uWind,uWeatherReflect;\nuniform vec2 uProbeA,uProbeB;\nuniform vec3 uSun,uWeatherTint;\nvarying vec3 vWorld;varying float vDepth;varying float vMud;varying vec2 vSlope;varying float vMovement;\nvoid main(){\n float irregular=.0018*sin(vWorld.x*4.2+vWorld.z*3.7)+.0011*sin(vWorld.x*10.3-vWorld.z*7.4);\n float alpha=smoothstep(.002,.017,vDepth-.0045+irregular);if(alpha<.025)discard;\n float shallow=clamp((vDepth-.006)/.054,0.,1.),deep=clamp((vDepth-.055)/.175,0.,1.);\n float abyss=clamp((vDepth-.21)/.28,0.,1.);\n vec3 color=mix(vec3(.40,.89,.85),vec3(.12,.73,.80),shallow);\n color=mix(color,vec3(.025,.40,.62),deep);\n color=mix(color,vec3(.012,.17,.35),abyss*.85);\n float dirty=clamp(vMud*.86,0.,.90);\n color=mix(color,vec3(.48,.29,.14),dirty);\n float rim=(1.-smoothstep(.004,.027,vDepth))*(1.-dirty*.85);\n color=mix(color,vec3(.71,.96,.91),rim*.28);\n vec2 tiny=vec2(sin(vWorld.x*6.1+vWorld.z*3.8-uTime*(1.3+uWind))+\n cos(vWorld.z*11.2-uTime*(1.6+uWind)),\n cos(vWorld.z*6.8-vWorld.x*3.4+uTime*(1.+uWind))+\n sin(vWorld.x*10.5+uTime*(1.4+uWind)));\n float breeze=.020+.055*vMovement+.026*uWind;\n vec3 n=normalize(vec3(-vSlope.x-tiny.x*breeze,1.,-vSlope.y-tiny.y*breeze));\n vec3 viewDir=normalize(cameraPosition-vWorld);\n float fresnel=pow(1.-clamp(dot(n,viewDir),0.,1.),2.1);\n vec3 ray=reflect(-viewDir,n);\n vec3 reflected=textureCube(uEnv,ray).rgb;\n // Segunda sonda posicionada numa depressão diferente: melhora a parallax aproximada.\n vec3 second=textureCube(uEnv2,ray).rgb;\n float d1=length(vWorld.xz-uProbeA),d2=length(vWorld.xz-uProbeB);\n float blend=uDualProbes*smoothstep(-1.4,1.4,d1-d2);\n reflected=mix(reflected,second,blend);\n reflected=mix(reflected,uWeatherTint,.045+.065*uCloudiness);\n float roughness=clamp(vMovement*.75+uWind*.16,0.,1.);\n float reflectMix=uReflect*uWeatherReflect*(.14+.53*fresnel)*\n                  (1.-dirty*.72)*(1.-roughness*.22);\n color=mix(color,reflected,clamp(reflectMix,0.,.63));\n float sun=pow(max(dot(reflect(-normalize(uSun),n),viewDir),0.),52.);\n float waveA=sin(vWorld.x*13.7+vWorld.z*9.2-uTime*2.6);\n float waveB=sin(vWorld.z*17.3-vWorld.x*6.9+uTime*2.2);\n float crest=pow(max(0.,waveA*.60+waveB*.40),9.);\n float sparkle=(.11*crest+.86*sun*uSunPower*(1.-uCloudiness*.60))*\n               (.75+.25*shallow)*(1.-dirty*.70);\n color=mix(color,vec3(.81,1.,.97),clamp(sparkle,0.,.69));\n gl_FragColor=vec4(color,alpha*(.83+.14*deep));\n}"
});
const water=new T.Mesh(waterG,waterM);water.frustumCulled=false;water.renderOrder=3;
water.name='Água V12.15, ondulações e reflexos dos objetos';scene.add(water);
const foamLimit=mobile?120:220,foamObj=new T.Object3D();
const foamMesh=new T.InstancedMesh(new T.PlaneGeometry(.060,.027),
 new T.MeshBasicMaterial({color:'#e2d5bb',transparent:true,opacity:.60,side:T.DoubleSide,depthWrite:false}),foamLimit);
foamMesh.count=0;foamMesh.frustumCulled=false;foamMesh.renderOrder=5;scene.add(foamMesh);
const foamClean=new T.Color('#c6f3e9'),foamDirty=new T.Color('#a48a69');
let reflectionAge=999,reflectionFrames=0,reflectionsOn=true,reflectionReady=false,reflection2Ready=false;
let reflectionTurn=0;
function updateReflections(dt){
 if(!reflectionsOn){waterM.uniforms.uReflect.value=0;return;}
 reflectionAge+=dt;
 if(reflectionAge<(mobile?3.2:1.6))return;
 reflectionAge=0;
 const previous=[water.visible,foamMesh.visible,splashMesh.visible,halo.visible,streak.visible];
 const ringVisibility=ripplePool.map(mesh=>mesh.visible);
 water.visible=false;foamMesh.visible=false;splashMesh.visible=false;halo.visible=false;streak.visible=false;
 ripplePool.forEach(mesh=>mesh.visible=false);
 const second=!!(reflectionCamera2&&reflectionReady&&reflectionTurn%2===1);
 const probe=second?reflectionCamera2:reflectionCamera;
 const basin=second?basins[0]:basins[1];
 probe.position.set(basin.x,sample(soil,basin.x,basin.z)+.65,basin.z);
 try{
  probe.update(renderer,scene);
  if(second)reflection2Ready=true;else reflectionReady=true;
  reflectionFrames++;reflectionTurn++;
 }catch(error){
  console.warn('[Arcano V12.17] captura ambiental indisponível:',error);
 }
 finally{
  [water.visible,foamMesh.visible,splashMesh.visible,halo.visible,streak.visible]=previous;
  ripplePool.forEach((mesh,i)=>mesh.visible=ringVisibility[i]);
 }
 waterM.uniforms.uDualProbes.value=reflection2Ready?1:0;
 waterM.uniforms.uReflect.value=reflectionReady?.92:0;
}
function rockHeightAt(x,z){
 let top=-Infinity;
 for(const r of rockSolids){
  const a=(x-r.x)/r.rx,b=(z-r.z)/r.rz,q=a*a+b*b;
  if(q>=1)continue;
  top=Math.max(top,r.bottom+(r.top-r.bottom)*Math.sqrt(1-q));
 }
 return top;
}
function impactHeightAt(x,z){
 const h=sample(soil,x,z),d=sample(depth,x,z);
 const liquid=d>=SURFACE_RIPPLE?h+d:h;
 return Math.max(liquid,rockHeightAt(x,z));
}
function displayWaterHeightAt(x,z){
 const h=sample(soil,x,z),d=sample(depth,x,z);
 return h+(d>=SURFACE_VISIBLE?d+.015:.010);
}
// Gotas físicas visuais: cilindro alongado, brilho em pixels e halos suaves.
const MAX_DROPS=mobile?490:950,MAX_SPLASH=mobile?205:340,MAX_RIPPLES=mobile?38:64;
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
 soilType=next==='mosaico'||SOIL_PROFILES[next]?next:'mosaico';
 configureSoilCells(true);
 for(let k=0;k<size;k++)soilHealth[k]=minNutrientAt(k);
 updatePlantVisuals();updateSprouts();updateForestHealth();
 rebuild();updateInfo(true);
}
function addSoilOrganic(){
 for(let k=0;k<size;k++){
  soilLitter[k]=clamp(soilLitter[k]+.22,0,1.5);
  soilOrganic[k]=clamp(soilOrganic[k]+.08,0,1.5);
 }
 updateInfo(true);
}
function addSoilNutrients(){
 for(let k=0;k<size;k++){
  soilN[k]=clamp(soilN[k]+.17,0,1.3);
  soilP[k]=clamp(soilP[k]+.17,0,1.3);
  soilK[k]=clamp(soilK[k]+.17,0,1.3);
  soilHealth[k]=minNutrientAt(k);
 }
 updatePlantVisuals();updateSprouts();updateInfo(true);
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
     const allowed=!edge&&(!liquid||waterHere>=SURFACE_RIPPLE)&&!(!liquid&&waterHere>=SURFACE_RIPPLE)&&y+.005>=rockHeightAt(x,z);
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
let mode='rain',process='combined',level=3,lastRainLevel=3,timeScale=4,paused=false,showWet=true,showFoam=true,enableInfiltration=true;
let rainStyle='enhanced',time=0,visualTime=0,acc=0,spawnAcc=0,lastUI=0,wetted=0,frame=0;
// Escala V12.21: fonte única para deposição, visual, vento e movimento superficial.
// Valores em unidades internas por segundo SIMULADO; não equivalem a mm/h calibrados.
const rainNames=['Sem chuva','Garoa','Chuva fraca','Chuva moderada','Chuva forte','Temporal intenso'];
const RAIN_SCALE=[
 {rate:0,       dropsM:0,   dropsD:0,   speed:0,   speedVar:0, length:0,    thick:0},
 {rate:.00013,  dropsM:27,  dropsD:42,  speed:3.2, speedVar:1.4,length:.37,  thick:.58},
 {rate:.00042,  dropsM:64,  dropsD:100, speed:4.2, speedVar:2.0,length:.53,  thick:.68},
 {rate:.00140,  dropsM:130, dropsD:210, speed:5.5, speedVar:2.5,length:.75,  thick:.82},
 {rate:.00330,  dropsM:235, dropsD:380, speed:7.5, speedVar:3.3,length:1.05, thick:.91},
 {rate:.00610,  dropsM:440, dropsD:690, speed:9.5, speedVar:4.6,length:1.75, thick:.94}
];
const rainLevels=[0,.18,.38,.66,.87,1];
const rainMeters=RAIN_SCALE.map(p=>p.rate);
// A atmosfera decide ONDE chove; a escala decide QUANTO cai naquele local.
function rainRateFromAtmos(source,selected=level){
 if(selected===0||source<=.0000001)return 0;
 const available=clamp(source/.00050,0,1);
 return RAIN_SCALE[selected].rate*Math.pow(available,.72);
}
let appliedRainMean=0,appliedRainPeak=0,activeRainRegions=0;
function refreshRainDiagnostics(){
 let total=0,peak=0,regions=0;
 for(let k=0;k<ATM_N;k++){
  const rate=rainRateFromAtmos(atmRain[k]);
  total+=rate;peak=Math.max(peak,rate);
  if(rate>.000003)regions++;
 }
 appliedRainMean=total/ATM_N;
 appliedRainPeak=peak;
 activeRainRegions=regions;
}
function add(x,z,vol){
 const i=Math.round((x+W/2)/dx),j=Math.round((z+L/2)/dz);
 if(i<1||j<1||i>=NX-1||j>=NZ-1)return;
 const k=idx(i,j);depth[k]=Math.min(1.65,depth[k]+vol);
}
function seed(m){
 depth.fill(0);delta.fill(0);soilMoisture.fill(0);deepWater.fill(0);canopy.fill(0);turbidity.fill(0);
 ripples.forEach(r=>r.mesh.visible=false);ripples.length=0;totalImpacts=0;
 drops.length=0;splashes.length=0;dropG.setDrawRange(0,0);streak.count=splashMesh.count=0;
 stats.rain=stats.infiltrated=stats.evaporated=stats.transpired=stats.outflow=0;
 time=0;visualTime=0;acc=0;spawnAcc=0;lastUI=0;
 // Reiniciar no seco, sem poças pré-fabricadas: observar as poças se formando.
 configureSoilCells(false);
 for(let k=0;k<size;k++){soilMoisture[k]=soilCapacity[k]*.22;soilHealth[k]=minNutrientAt(k);}
 updatePlantVisuals();updateSprouts();updateForestHealth();soilEcologySeconds=0;plantVisualSeconds=0;
 initAtmosphere();updateAtmosphere(0);resetGroundFog();
 rebuild();updateInfo(true);
}
// A chuva é alimentada por um campo uniforme; gotas animadas representam a mesma chuva,
// sem depositar um segundo volume ao colidir (evita contagem dupla).
function hydrologyStep(dt){
 const manualRain=rainMeters[level]*dt;
 const interp=process==='retention'?1.75:process==='infiltration'?.95:1;
 const infiltrate=process==='runoff'?.11:process==='infiltration'?3.0:process==='retention'?.8:1;
 const sunIntensity=Math.max(0,solarAt(dayClock));
 const climateEvap=physicalWeather?clamp(.29+sunIntensity*.82+(1-atmHumMean)*.18,.26,1.28):1;
 const evaporate=(process==='retention'?3.1:process==='runoff'?.65:1)*climateEvap;
 const speed=process==='runoff'?1.65:1;
 for(let k=0;k<size;k++){
  // Precipitação regional derivada de nuvens, umidade e transporte pelo vento.
  const rain=physicalWeather?rainRateFromAtmos(rainField[k])*dt:manualRain;
  if(rain>0){
   const canopyCap=.007+cover[k]*.037;
   const retained=Math.min(rain*cover[k]*.55*interp,Math.max(0,canopyCap-canopy[k]));
   canopy[k]+=retained;depth[k]+=rain-retained;stats.rain+=rain*area;
  }
  const sat=clamp(soilMoisture[k]/soilCapacity[k],0,1);
  if(enableInfiltration&&depth[k]>.000001){
   const remaining=soilCapacity[k]-soilMoisture[k];
   const intake=Math.min(depth[k],Math.max(0,remaining),
     permeability[k]*infiltrate*(.13+1.37*(1-sat)**1.4)*Math.max(.19,1.65-1.80*basinHold[k])*dt);
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
  const roots=Math.min(soilMoisture[k],cover[k]*(.58+.67*soilPlant[k])*.00013*evaporate*dt);
  soilMoisture[k]-=roots;stats.transpired+=roots*area;
  // Formação progressiva de lama: partículas soltas sob chuva/turbulência.
  const profile=SOIL_PROFILES[SOIL_KEYS[soilKeyIndex[k]]];
  const erosion=profile.erosion*(.85+.15*(1-soilPlant[k]));
  const stirred=depth[k]>.002 ? rain*erosion*(7.0-4.5*cover[k]) : 0;
  const runoffStir=depth[k]>.002 ? erosion*depth[k]*.006*dt : 0;
  const settle=.0026*dt*(1.0+Math.max(0,1.0-erosion));
  turbidity[k]=clamp(turbidity[k]+stirred+runoffStir-settle,0,clamp(profile.erosion*.90+.12,.16,1));
 }
 flowStep(dt,speed);
}
function flowStep(dt,multiplier){
 delta.fill(0);const speed=(.62+rainLevels[level]*.07)*dt*2.0*multiplier;
 for(let j=1;j<NZ-1;j++)for(let i=1;i<NX-1;i++){
  const k=idx(i,j),v=depth[k];if(v<.000008)continue;
  const head=soil[k]+v,neigh=[k-1,k+1,k-NX,k+NX],transfer=[0,0,0,0];let sum=0;
  for(let n=0;n<4;n++){const q=neigh[n];
   const diff=head-soil[q]-depth[q];if(diff<=0)continue;
   const resistance=(blocked[k]||blocked[q])?
       .54+.46*clamp(Math.max(v,depth[q])/.30,0,1):1;
    const amount=diff*speed*(n<2?dz/dx:dx/dz)*.38*resistance;
    transfer[n]=amount;sum+=amount;
  }
  const fraction=sum>v?v/sum:1;
  for(let n=0;n<4;n++)if(transfer[n]){const a=transfer[n]*fraction;delta[k]-=a;delta[neigh[n]]+=a;}
 }
 for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
  const k=idx(i,j);
  // A profundidade junto às pedras não é zerada: a malha 3D as oculta parcialmente.
  depth[k]=Math.max(0,depth[k]+delta[k]);
  if(i===0||j===0||i===NX-1||j===NZ-1){
   const escape=depth[k]*Math.min(.25,dt*.35);
   depth[k]-=escape;stats.outflow+=escape*area;
  }
 }
}
function rebuild(){
 let count=0;foamCount=0;
 // A grade física só controla profundidade, escoamento e infiltração.
 for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
  const k=idx(i,j),d=depth[k],x=nx(i),z=nz(j);
  shoreField[k]=d-SURFACE_VISIBLE-
    .0017*Math.sin(x*3.9+z*4.2)-.0011*Math.sin(x*8.7-z*5.1);
  wet[k]=clamp((d-.002)/.014,0,1);
  if(d>=SURFACE_VISIBLE)count++;
  const left=idx(Math.max(0,i-1),j),right=idx(Math.min(NX-1,i+1),j);
  const up=idx(i,Math.max(0,j-1)),down=idx(i,Math.min(NZ-1,j+1));
  flow[k*2]=flowXField[k]=(soil[left]+depth[left]-soil[right]-depth[right])*.6;
  flow[k*2+1]=flowZField[k]=(soil[up]+depth[up]-soil[down]-depth[down])*.6;
 }
 // Faixa de margem encharcada, sem adicionar volume de água ao modelo.
 for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
  const k=idx(i,j);
  const sat=clamp(soilMoisture[k]/Math.max(.001,soilCapacity[k]),0,1);
  const damp=showWet?clamp(sat*.84+wet[k]*.16,0,.95):0;
  let shoreDamp=0;
  if(showWet&&depth[k]<SURFACE_VISIBLE){
   for(let oy=-2;oy<=2;oy++)for(let ox=-2;ox<=2;ox++){
    const ix=i+ox,iz=j+oy;if(ix<0||iz<0||ix>=NX||iz>=NZ)continue;
    const other=idx(ix,iz),h=depth[other];
    if(h<SURFACE_VISIBLE)continue;
    const dist=Math.hypot(ox*dx,oy*dz);
    shoreDamp=Math.max(shoreDamp,clamp(1-dist/.82,0,1)*clamp(h/.030,0,1));
   }
  }
  const dark=clamp(shoreDamp*(.53+.25*sat),0,.72);
  for(let m=0;m<3;m++){
   const base=dry[k*3+m]*(1-damp)+mudRGB[m]*damp;
   colors[k*3+m]=base*(1-dark)+[.22,.11,.07][m]*dark;
  }
 }
 landG.attributes.color.needsUpdate=true;
 wetted=count*area;
 // A malha visual 2-3× mais densa interpola os dados; não gera quadrados da grade antiga.
 for(let j=0;j<VIS_NZ;j++)for(let i=0;i<VIS_NX;i++){
  const k=j*VIS_NX+i,x=wx(i),z=wz(j),d=sample(depth,x,z);
  waterPositions[k*3+1]=sample(soil,x,z)+d+.010;
  waterDepths[k]=d;
  waterMud[k]=sample(turbidity,x,z);
  waterFlow[k*2]=sample(flowXField,x,z);
  waterFlow[k*2+1]=sample(flowZField,x,z);
 }
 waterG.attributes.position.needsUpdate=true;
 waterG.attributes.waterDepth.needsUpdate=true;
 waterG.attributes.mudAmount.needsUpdate=true;
 waterG.attributes.waterFlow.needsUpdate=true;
 // Espuma localizada apenas em alguns trechos calmos da margem.
 if(showFoam)for(let j=1;j<NZ-1&&foamCount<foamLimit;j++)
 for(let i=1;i<NX-1&&foamCount<foamLimit;i++){
  const k=idx(i,j),v=depth[k];if(v<SURFACE_VISIBLE+.002||v>.071)continue;
  const edge=Math.min(shoreField[k-1],shoreField[k+1],shoreField[k-NX],shoreField[k+NX]);
  if(edge>.003)continue;
  const x=nx(i),z=nz(j),variation=.5+.5*Math.sin(x*8.13+z*6.7);
  if(variation<.66||Math.hypot(flow[k*2],flow[k*2+1])>.38)continue;
  if(turbidity[k]<.09&&cover[k]<.42)continue;
  foamObj.position.set(x,soil[k]+v+.025,z);
  foamObj.rotation.set(-Math.PI/2,0,.8*Math.sin(x*5.5-z*3.1));
  const scale=.48+.6*variation;foamObj.scale.set(scale,scale*.75,1);
  foamObj.updateMatrix();foamMesh.setMatrixAt(foamCount,foamObj.matrix);
  foamMesh.setColorAt(foamCount,foamClean.clone().lerp(foamDirty,clamp(turbidity[k]*1.35,0,1)));
  foamCount++;
 }
 foamMesh.count=foamCount;foamMesh.instanceMatrix.needsUpdate=true;
 if(foamMesh.instanceColor)foamMesh.instanceColor.needsUpdate=true;
}
// O solo define a cor, a altura e o número das partículas expelidas.
function spawnSplash(x,z,h){
 const i=Math.round((x+W*.5)/dx),j=Math.round((z+L*.5)/dz);
 if(i<0||j<0||i>=NX||j>=NZ)return;
 const k=idx(i,j);
 if(rockHeightAt(x,z)>sample(soil,x,z)+sample(depth,x,z)+.007)return;
 totalImpacts++;
 const saturation=clamp(soilMoisture[k]/Math.max(.001,soilCapacity[k]),0,1);
 const inWater=sample(depth,x,z)>=SURFACE_RIPPLE;
 const muddy=turbidity[k];
 // Um impacto em poça mobiliza pequenas partículas; água barrenta expele gotículas castanhas.
 if(inWater)turbidity[k]=clamp(turbidity[k]+.0018*SOIL_PROFILES[SOIL_KEYS[soilKeyIndex[k]]].erosion,0,1);
 const waterTint=new T.Color('#a8c8d6').lerp(new T.Color('#907058'),muddy*.91);
 const dirtTint=new T.Color(SOIL_PROFILES[SOIL_KEYS[soilKeyIndex[k]]].col);
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
 // A densidade visual segue o MESMO nível aplicado à física.
 // O clima só modula o número de gotas e a distribuição entre as regiões.
 const severe=stormActive(),profile=RAIN_SCALE[level];
 const availability=physicalWeather?(level===0||appliedRainPeak<.0000001?0:
   clamp(Math.pow(appliedRainMean/Math.max(.0000001,profile.rate),.48),0,1)):1;
 const dropsPerSecond=(mobile?profile.dropsM:profile.dropsD)*availability;
 if(dropsPerSecond===0)spawnAcc=0;
 else spawnAcc=Math.min(MAX_DROPS,spawnAcc+dropsPerSecond*dt);
 const toSpawn=Math.min(severe?(mobile?95:145):65,Math.floor(spawnAcc));
 spawnAcc-=toSpawn;
 for(let k=0;k<toSpawn&&drops.length<MAX_DROPS;k++){
  let x=0,z=0,accepted=!physicalWeather;
  // Amostragem espacial favorece regiões de precipitação sem fabricar gotas onde está seco.
  for(let attempt=0;attempt<(physicalWeather?4:1);attempt++){
   x=(random()-.5)*(W-.8);z=(random()-.5)*(L-.8);
   if(!physicalWeather){accepted=true;break;}
   const local=atmosphereRainAt(x,z);
   if(local>0&&random()<clamp(local/Math.max(.0000001,atmRainPeak),0,1)){
    accepted=true;break;
   }
  }
  if(!accepted)continue;
  drops.push({x,z,y:2.5+random()*4.8,
   speed:profile.speed+random()*profile.speedVar,
   stretch:profile.length*(.79+random()*.44)});
 }
 const factor=1+Math.log2(timeScale)*.12;
 let displayedImpacts=0;
 for(let i=drops.length-1;i>=0;i--){
  const d=drops[i];d.y-=d.speed*dt*factor;
  if(physicalWeather){
   const gust=severe?(.58+.22*Math.sin(weatherTime*2.1+d.z*.7)):.25;
   d.x+=Math.cos(atmWindHeading)*atmWindMean*dt*gust;
   d.z+=Math.sin(atmWindHeading)*atmWindMean*dt*gust;
  }
  const gh=impactHeightAt(d.x,d.z);
  if(d.y<=gh){
   if(displayedImpacts<([0,1,2,4,7,13][level])){spawnSplash(d.x,d.z,gh);displayedImpacts++;}
   drops[i]=drops[drops.length-1];drops.pop();
  }
 }
 const enhanced=rainStyle==='enhanced';
 streak.material.opacity=(enhanced?1:.75)*[0,.31,.43,.56,.67,.73][level];
 halo.material.size=(mobile?8.0:7.3)*Math.max(.56,profile.thick);
 halo.material.opacity=[0,.19,.25,.32,.35,.39][level];
 for(let i=0;i<drops.length;i++){
  const d=drops[i],o=i*3;dropPos[o]=d.x;dropPos[o+1]=d.y-.1;dropPos[o+2]=d.z;
  dropObj.position.set(d.x,d.y,d.z);const windSlant=physicalWeather?clamp(atmWindMean*(severe?.15:.055),0,severe?.42:.20):.07;
  dropObj.rotation.set(severe?windSlant*Math.sin(atmWindHeading):0,0,
    -windSlant*Math.cos(atmWindHeading));
  const thickness=profile.thick*(enhanced?1:.79);
  dropObj.scale.set(thickness,d.stretch*(severe?1.15:enhanced?.91:.78),thickness);
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
 level=clamp(Math.round(value),0,5);
 if(level>0)lastRainLevel=level;
 refreshRainDiagnostics();
 $('intensity').value=String(level);
 if(climateChoice==='auto')applyClimate(physicalWeather?atmCloudPreset():automaticClimate(level));
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
$('foamToggle').addEventListener('change',e=>{showFoam=e.target.checked;rebuild();updateInfo(true);});
$('climate').addEventListener('change',e=>{
 climateChoice=e.target.value;
 applyClimate(climateChoice==='auto'?(physicalWeather?atmCloudPreset():automaticClimate(level)):climateChoice);
 updateInfo(true);
});
$('reflectionToggle').addEventListener('change',e=>{
 reflectionsOn=e.target.checked;
 reflectionAge=999;
 waterM.uniforms.uReflect.value=(reflectionsOn&&reflectionReady)?.78:0;
 updateInfo(true);
});
$('physicalWeather').addEventListener('change',e=>{
 physicalWeather=e.target.checked;
 if(physicalWeather)initAtmosphere();
 if(climateChoice==='auto')applyClimate(physicalWeather?atmCloudPreset():automaticClimate(level));
 updateInfo(true);
});
$('rainStyle').addEventListener('change',e=>{rainStyle=e.target.value;updateInfo(true);});
$('floraToggle').addEventListener('change',e=>setFloraVisible(e.target.checked));
$('fogToggle').addEventListener('change',e=>{
 fogEnabled=e.target.checked;
 if(!fogEnabled)fogStrength=fogTarget=0;
 updateGroundFog(0);updateInfo(true);
});
$('soilType').addEventListener('change',e=>setSoilType(e.target.value));
$('addOrganic').addEventListener('click',addSoilOrganic);
$('addNutrients').addEventListener('click',addSoilNutrients);
for(const btn of document.querySelectorAll('[data-mode]'))btn.addEventListener('click',()=>setMode(btn.dataset.mode));
function setMode(next){
 mode=next;level=next==='storm'?5:next==='lagoon'?3:next==='puddle'?3:3;
 setRainLevel(level);seed(mode);
 document.querySelectorAll('[data-mode]').forEach(el=>el.classList.toggle('active',el.dataset.mode===mode));
 $('hint').textContent={rain:'Chuva cai sobre a terra e se divide em infiltração, escoamento e evapotranspiração.',
 puddle:'A terra absorve a maior parte da chuva; pequenas poças surgem lentamente nas depressões.',
 lagoon:'A lagoa cresce aos poucos nas bacias; as partes mais altas permanecem apenas úmidas.',
 storm:'Temporal intenso: chuva muito forte e inclinada, vento, nuvens escuras e escoamento nas rochas 3D.'}[mode];
}
$('replay').addEventListener('click',()=>seed(mode));
$('pause').addEventListener('click',()=>{paused=!paused;$('pause').textContent=paused?'▶ Continuar':'⏸ Pausar';updateInfo(true);});
$('cam').addEventListener('click',()=>{yaw=.83;pitch=.79;radius=24;});
function updateInfo(force){
 const now=performance.now();if(!force&&now-lastUI<420)return;lastUI=now;
 // A régua visual é não linear, acompanhando a força crescente da precipitação.
 const pct=Math.round(Math.pow(rainMeters[level]/rainMeters[5],.62)*100),name=rainNames[level];
 $('intensityName').textContent=name;$('rainMeter').style.setProperty('--rain-fill',pct+'%');
 let surface=0,stored=0,ground=0,leaf=0,saturated=0,participating=0;
 let lagoonWet=0,lagoonCells=0,lagoonMax=0,otherPuddles=0,mudTotal=0,mudWeight=0,wetSoilOnly=0;
 for(let k=0;k<size;k++){
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
 $('rainDetail').textContent=(physicalWeather
  ?'Escala '+level+'/5 · chuva regional '+Math.round(clamp(appliedRainMean/.0061,0,1)*100)+
    '% · '+activeRainRegions+'/'+ATM_N+' zonas com chuva'
  :'Escala '+level+'/5 · chuva manual '+name)+
   ' • '+timeScale+'× • '+drops.length+' gotas 3D';
 $('soilStats').textContent='Terra: '+Math.round(saturated/Math.max(1,participating)*100)+'% saturada · '+stored.toFixed(1)+' m³ retidos no solo';
 let nAvg=0,pAvg=0,kAvg=0,caAvg=0,phAvg=0,biotaAvg=0,salAvg=0,omAvg=0,growthAvg=0,healthAvg=0;
 const limited=new Array(SOIL_LIMITS.length).fill(0);
 for(let k=0;k<size;k++){
  nAvg+=soilN[k];pAvg+=soilP[k];kAvg+=soilK[k];caAvg+=soilCa[k];phAvg+=soilPH[k];
  biotaAvg+=soilBiota[k];salAvg+=soilSalinity[k];omAvg+=soilOrganic[k];
  growthAvg+=soilPlant[k];healthAvg+=soilHealth[k];limited[soilLimiting[k]]++;
 }
 const asPct=x=>Math.round(clamp(x/size,0,1)*100);
 const mainLimit=limited.indexOf(Math.max(...limited));
 $('fertilityStats').textContent=(soilType==='mosaico'?'Mosaico ecológico ('+SOIL_KEYS.length+' perfis disponíveis)':SOIL_PROFILES[soilType].name)+
  ' · N '+asPct(nAvg)+'% · P '+asPct(pAvg)+'% · K '+asPct(kAvg)+'% · Ca '+asPct(caAvg)+'% · húmus '+asPct(omAvg)+'%';
 $('plantStats').textContent='🌱 Biomassa '+asPct(growthAvg)+'% · condição de crescimento '+asPct(healthAvg)+
  '% · principal limitante: '+SOIL_LIMITS[mainLimit]+' · pH '+(phAvg/size).toFixed(1)+' · salinidade '+asPct(salAvg)+'% · biota '+asPct(biotaAvg)+'%';
 $('windStatus').textContent='🍃 Vento '+atmWindMean.toFixed(2)+
  ' (índice de jogo) · folhas '+(forestGroup.visible?'animadas na GPU':'floresta anterior')+
  ' · direção '+Math.round((atmWindHeading*180/Math.PI+360)%360)+'°'+
  ' · '+(climate==='storm'||stormActive()?'rajadas fortes':'rajadas variáveis');
 $('fogStatus').textContent='🌫 Neblina '+Math.round(fogStrength*100)+
  '% · '+fogCause+' · solo '+Math.round(fogWetness*100)+
  '% úmido · ar-superfície/orvalho '+fogDewGap.toFixed(1)+' °C';
 $('waterStats').textContent='Poças '+wetted.toFixed(1)+' m² ('+Math.round(wetted/(participating*area)*100)+'% do terreno) · água superficial '+surface.toFixed(1)+' m³';
 $('wetGroundStats').textContent='Terra úmida sem poça: '+(wetSoilOnly*area).toFixed(1)+' m² · infiltração acumulada '+stats.infiltrated.toFixed(1)+' m³ · subterrâneo '+ground.toFixed(1)+' m³';
 $('splashStats').textContent='Impactos '+totalImpacts+' · '+splashes.length+' partículas · '+ripples.length+' ondas · '+foamCount+' manchas de espuma/sujeira';
  $('reflectionStats').textContent='Superfície '+VIS_NX+'×'+VIS_NZ+
  ' · reflexos '+(reflectionsOn?(reflectionReady?'ativos':'preparando'):'desligados')+
  ' · '+(mobile?'1 captura':'2 regiões')+' · '+reflectionFrames+' atualizações';
 $('climateStats').textContent='Céu: '+(weatherCfg?weatherCfg.name:'preparando')+
  (climateChoice==='auto'?' (automático)':'')+
  ' · '+Math.round((weatherCfg?weatherCfg.coverage:0)*100)+'% nuvens · sol e reflexos climáticos';
  $('mudStats').textContent='Sedimentos suspensos: '+Math.round(mudTotal/Math.max(.0001,mudWeight)*100)+'% · '+(soilType==='mosaico'?'mosaico de solos':SOIL_PROFILES[soilType].name);
 // Conta apenas rochas que realmente encontram a lâmina, não rochas sobre terra seca.
 let touchedRocks=0,coveredRocks=0;
 for(const rock of rockSolids){
  const d=sample(depth,rock.x,rock.z);if(d<SURFACE_VISIBLE)continue;
  const waterline=sample(soil,rock.x,rock.z)+d;
  if(waterline>=rock.bottom+.015)touchedRocks++;
  if(waterline>=rock.top-.012)coveredRocks++;
 }
 $('lakeStats').textContent='Lagoa: '+Math.round(lagoonWet/Math.max(1,lagoonCells)*100)+'% da bacia coberta · profundidade '+lagoonMax.toFixed(2)+' m · '+touchedRocks+' rochas molhadas · '+coveredRocks+' encobertas';
 $('cycleStats').textContent='Infiltrou '+stats.infiltrated.toFixed(1)+' m³ · folhas '+leaf.toFixed(1)+' m³ · evapotranspiração '+(stats.evaporated+stats.transpired).toFixed(1)+' m³ · drenou '+stats.outflow.toFixed(1)+' m³';
 const hour=Math.floor(dayClock/60),minute=Math.floor(dayClock%60);
 const hh=String(hour).padStart(2,'0'),mm=String(minute).padStart(2,'0');
 const seasonName=(['Verão','Outono','Inverno','Primavera'])[Math.floor((atmosDayIndex%SEASON_DAYS)/(SEASON_DAYS/4))];
 const sunAltitude=solarAt(dayClock);
 const phaseName=sunAltitude<-.035?'Noite':sunAltitude<.10?'Crepúsculo':
  dayClock<DAY_SECONDS*.50?'Manhã':'Tarde';
 $('dayCycleStats').textContent=(sunAltitude<-.035?'☾ ':'☀ ')+
  'Dia '+(atmosDayIndex+1)+' · '+hh+':'+mm+' · '+phaseName+' · '+seasonName+' · 1 dia = 24 min reais';
 $('dayCycleBar').style.width=(dayClock/DAY_SECONDS*100).toFixed(2)+'%';
 $('atmosStats').textContent=(physicalWeather?'Atmosfera física':'Clima manual')+
  ' · '+atmTempMean.toFixed(1)+' °C · umidade '+Math.round(atmHumMean*100)+
  '% · '+atmPressureMean.toFixed(0)+' hPa · vento '+atmWindMean.toFixed(1)+
  ' · nuvens '+Math.round(atmCloudMean*100)+'% · chuva efetiva '+Math.round(clamp(appliedRainMean/.0061,0,1)*100)+'%';
 $('simClock').textContent='Tempo simulado: '+(time<60?time.toFixed(0)+' s':(time/60).toFixed(1)+' min')+(paused?' · PAUSADO':'');
 $('info').textContent=level===0
 ?'Chuva suspensa: poças infiltram e evaporam; o ciclo solar continua'
 :physicalWeather
 ?'A chuva depende das nuvens, vento e umidade locais • toque para adicionar água'
 :'Chuva manual: as depressões concentram poças • arraste para girar';
}

let last=performance.now();function loop(now){
 requestAnimationFrame(loop);const dt=Math.min((now-last)/1000,.065);last=now;
 if(!paused&&!document.hidden){
  time+=dt*timeScale;visualTime+=dt*(1+.16*Math.log2(timeScale));
  updateAtmosphere(dt);
  dropStep(dt);
  acc+=dt*timeScale;
  const step=timeScale>=64?.22:timeScale>=16?.14:timeScale>=4?.09:.06;
  let steps=0;while(acc>=step&&steps<12){hydrologyStep(step);acc-=step;steps++;}
  soilEcologySeconds+=dt;plantVisualSeconds+=dt;
  if(soilEcologySeconds>=.85){
   ecologyStep(soilEcologySeconds);soilEcologySeconds=0;
  }
  if(plantVisualSeconds>=2.8){
   updatePlantVisuals();updateSprouts();updateForestHealth();plantVisualSeconds=0;
  }
  if(acc>step*14)acc=step*14;
  updateGroundFog(dt);
  if(++frame%2===0)rebuild();
  waterM.uniforms.uTime.value=visualTime;
  animateClimate(dt);
  updateReflections(dt);
  animateForest(dt);
  updateInfo(false);
 }
 setView();renderer.render(scene,camera);
}

window.addEventListener('resize',resize);
window.addEventListener('error',e=>{if((e.filename||'').includes('agua-v1224'))fail(e.error||e.message);});
window.arcanoWaterV1224={scene,renderer,leafWindUniforms,leafWindMaterials,getFog:()=>({strength:fogStrength,target:fogTarget,rainMemory:fogRainMemory,age:fogRainAge,dewGap:fogDewGap,wind:atmWindMean,reason:fogCause}),forestGroup,forestModels,forestInstances,setFloraVisible,seed,setMode,add,setSoilType,addSoilOrganic,addSoilNutrients,terrain:land,water,stones,grass,sprouts:sproutGroup,soilProfiles:SOIL_PROFILES,soilKeyIndex,soilOrganic,soilLitter,soilN,soilP,soilK,soilCa,soilPH,soilSalinity,soilPlant,soilHealth,soilLimiting,soilCapacity,permeability,ecologyStep,soilMoisture,deepWater,canopy,depth,soil,turbidity,stats,impactHeightAt,rockHeightAt,rockSolids,setRainLevel,applyClimate,skyDome,atmosphere:{temp:atmTemp,humidity:atmHumidity,pressure:atmPressure,cloud:atmCloud,rain:atmRain,rainField,getDayClock:()=>dayClock,getMetrics:()=>({temperature:atmTempMean,humidity:atmHumMean,pressure:atmPressureMean,wind:atmWindMean,clouds:atmCloudMean,rain:atmRainMean,daySeconds:dayClock})},reflectionCamera,reflectionCamera2,getMode:()=>mode,getWetArea:()=>wetted,getImpacts:()=>totalImpacts};
try{resize();setMode('puddle');requestAnimationFrame(loop);}catch(e){fail(e);}
})();