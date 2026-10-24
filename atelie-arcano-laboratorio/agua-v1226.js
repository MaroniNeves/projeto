/* Ateliê Arcano V12.26 — poças, lagoas e respingos conformes ao relevo (modelo ilustrativo, não calibrado).
   Chuva, interceptação vegetal, infiltração, percolação, escoamento e evapotranspiração.
   Simulação conservativa na malha, com multiplicador de tempo e gotas 3D visíveis. */
(function(){
'use strict';
const T=window.THREE, $=id=>document.getElementById(id), clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const diag=$('diag'),stage=$('stage');
function fail(error){if(diag)diag.textContent='Não foi possível iniciar a água 3D: '+(error&&error.message||error);console.error('[Arcano V12.26]',error);}
if(!T){fail('Three.js não carregou. Verifique a conexão.');return;}
// V12.39: 2x largura e 2x profundidade = quatro vezes a superfície.
// Densidade de células comparável ao mapa anterior, com LOD em aparelhos móveis.
// Área total 10x em relação a 40 × 32: 128 × 100 = 12.800 unidades².
// A física mantém resolução adaptativa para Android e desktop.
const mobile=innerWidth<680, NX=mobile?174:286,NZ=mobile?138:228,W=128,L=100;
const dx=W/(NX-1), dz=L/(NZ-1),size=NX*NZ;
const soil=new Float32Array(size),depth=new Float32Array(size),delta=new Float32Array(size),blocked=new Uint8Array(size);
const soilMoisture=new Float32Array(size),soilCapacity=new Float32Array(size),deepWater=new Float32Array(size);
// Vazão lateral em aquífero raso — transferência conservativa em células vizinhas.
const aquiferFlux=new Float32Array(size);
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
// Espaço temporário reutilizado: não criar 8 números em novo Array
// a cada célula examinada pela ecologia.
const nutrientFactors=new Float64Array(8);
const soilColorScratch=new T.Color(),soilMossColor=new T.Color('#77966c');
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
  const c=soilColorScratch.set(p.col),shade=.91+.09*Math.sin(x*.82+z*1.14);
  // Solo visível continua distinguindo os perfis, mas recebe musgo suave nas
  // áreas com cobertura vegetal e não nas margens de solo saturado.
  const mossFactor=clamp((cover[k]-.28)*.58,0,.34)*
   clamp((soil[k]+.2)*2.0,0,1);
  c.lerp(soilMossColor,mossFactor);
  dry[k*3]=c.r*shade;dry[k*3+1]=c.g*shade;dry[k*3+2]=c.b*shade;
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
 nutrientFactors[0]=waterFactor;nutrientFactors[1]=n;
 nutrientFactors[2]=phos;nutrientFactors[3]=pot;
 nutrientFactors[4]=calcium;nutrientFactors[5]=acidity;
 nutrientFactors[6]=salinity;nutrientFactors[7]=oxygen;
 let minimum=nutrientFactors[0],limiter=0;
 for(let m=1;m<8;m++)if(nutrientFactors[m]<minimum){minimum=nutrientFactors[m];limiter=m;}
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
// V12.55: vizinhos calculados UMA vez. Mantém exatamente a ordem
// esquerda, direita, cima e baixo das transferências de água/solo.
const gridNeighbors=new Int32Array(size*4);
const gridX=new Float64Array(size),gridZ=new Float64Array(size);
for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
 const k=idx(i,j),o=k*4;
 gridX[k]=nx(i);gridZ[k]=nz(j);
 gridNeighbors[o]=idx(Math.max(0,i-1),j);
 gridNeighbors[o+1]=idx(Math.min(NX-1,i+1),j);
 gridNeighbors[o+2]=idx(i,Math.max(0,j-1));
 gridNeighbors[o+3]=idx(i,Math.min(NZ-1,j+1));
}
const smooth=(t)=>t*t*(3-2*t);
function rand(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
const random=rand(22026),basins=[
 {x:-2.65,z:-2.15,sx:2.15,sz:1.63,deep:1.08},
 {x:3.05,z:.58,sx:2.25,sz:2.55,deep:1.46},
 {x:-.8,z:3.8,sx:2.3,sz:1.7,deep:1.11},
 {x:3.0,z:5.63,sx:1.40,sz:1.05,deep:.65}];
const rocksRaw=[[-1.75,-4.7,.55],[.4,-3.3,.56],[.68,-1.8,.56],[-.65,-.5,.46],[.88,.65,.5],[-.9,1.65,.51],[.64,2.85,.51],[-1.35,4.75,.56],[2.2,4.65,.46],[2.5,-3.7,.44],[-3.95,2.5,.58],[4.6,.2,.47],[-3.5,-.1,.37],[5.3,4.5,.45],[-5.6,-4.8,.43],[5.8,-2.7,.47],[-5.7,4.7,.42]];
// Sólidos do laboratório não podem bloquear o caminho central histórico.
// Pedras grandes são reposicionadas fora da faixa da trilha, sem desaparecer.
const rocks=rocksRaw.map(([x,z,r])=>{
 const trail=.92-.70*Math.sin(x*.47+.6)+.17*Math.sin(x*1.34);
 if(Math.abs(z-trail)<r+1.18)z=trail+(z>trail?1:-1)*(r+1.50);
 return [x,z,r];
});
const center=z=>-.72+.63*Math.sin(z*.75)+.20*Math.sin(z*1.52);
function elevation(x,z){
 let y=.32-.073*z+.16*Math.sin(x*.83+z*.26)+.115*Math.cos(z*1.22-x*.34)+.055*Math.sin(x*2.25+z*1.92);
 y-=.36*Math.exp(-.5*((x-center(z))/.87)**2);
 for(const b of basins){const d=((x-b.x)/b.sx)**2+((z-b.z)/b.sz)**2;y-=b.deep*Math.exp(-1.5*d);}
 return y;
}
function rockAt(x,z){return rocks.some(([rx,rz,r])=>((x-rx)**2+(z-rz)**2)<(r*.86)**2);}
const scene=new T.Scene();scene.background=new T.Color('#b6c6bc');scene.fog=new T.Fog('#b6c6bc',45,120);
const camera=new T.PerspectiveCamera(46,1,.1,260);
let renderer;
try{renderer=new T.WebGLRenderer({canvas:stage,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.26:1.65));renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;renderer.shadowMap.enabled=true;
renderer.shadowMap.type=T.PCFSoftShadowMap;}catch(e){fail(e);return;}
const ambientSky=new T.HemisphereLight('#fff5e4','#6c8378',1.45);scene.add(ambientSky);
const light=new T.DirectionalLight('#fff0c8',1.60);light.position.set(-8,13,7);
light.castShadow=true;light.shadow.mapSize.set(mobile?512:1024,mobile?512:1024);
Object.assign(light.shadow.camera,{left:-69,right:69,top:69,bottom:-69,near:.5,far:155});
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
const skyDome=new T.Mesh(new T.SphereGeometry(155,mobile?36:56,mobile?24:36),skyM);
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
// Intensidade de 0 a 100%, preservando o cálculo atmosférico regional.
let windUserPower=70;
// O campo atmosférico é atualizado de maneira discreta (~550 ms).
// As amostras locais dos troncos só precisam ser refeitas quando muda.
let atmWindRevision=0;
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
 atmWindRevision++;
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
  // Água esquenta mais lentamente, solo seco aquece o ar e induz ascensão.
  const kTerrain=idx(terrainI,terrainJ);
  const wetCell=clamp(depth[kTerrain]/.12+
    soilMoisture[kTerrain]/Math.max(.001,soilCapacity[kTerrain])*.42,0,1);
  const heating=Math.max(0,daySun)*Math.max(0,1-forest*.5)*
    (1-.76*wetCell)*4.8;
  const airTempTarget=15.7+15.2*daySun+3.5*seasonShift()
    -2.4*forest-1.8*terrain-7.4*front+heating;
  atmTemp[k]+=(airTempTarget-atmTemp[k])*clamp(dt*.018,0,.17);
  const thermalLift=clamp(Math.max(0,airTempTarget-atmTemp[k])*.10,0,1.4);
  const pressureTarget=1013.8+2.1*Math.cos(2*Math.PI*clock)
        -7.4*front+2.0*Math.sin(z*.39+clock*5.1)-thermalLift*2.2;
  atmPressure[k]+=(pressureTarget-atmPressure[k])*clamp(dt*.009,0,.15);
  const left=atmPressure[atmId(Math.max(0,i-1),j)],
   right=atmPressure[atmId(Math.min(ATM_NX-1,i+1),j)],
   up=atmPressure[atmId(i,Math.max(0,j-1))],
   down=atmPressure[atmId(i,Math.min(ATM_NZ-1,j+1))];
  // Pressão alta -> baixa; contraste térmico aumenta a brisa local.
  const iL=atmId(Math.max(0,i-1),j),iR=atmId(Math.min(ATM_NX-1,i+1),j);
  const iU=atmId(i,Math.max(0,j-1)),iD=atmId(i,Math.min(ATM_NZ-1,j+1));
  const baseX=.18+(left-right)*.14+(atmTemp[iR]-atmTemp[iL])*.11+front*.20;
  const baseZ=.11+(up-down)*.14+(atmTemp[iD]-atmTemp[iU])*.11+
    (stormActive()?.33:.09)*Math.sin(clock*6.28+z*.19);
  // Hemisfério sul: aproximação pedagógica do desvio de Coriolis à esquerda.
  const coriolis=.085;
  let advX=baseX-coriolis*baseZ,advZ=baseZ+coriolis*baseX;
  const slopeX=(elevation(x+.32,z)-elevation(x-.32,z))/.64;
  const slopeZ=(elevation(x,z+.32)-elevation(x,z-.32))/.64;
  const againstSlope=Math.max(0,advX*slopeX+advZ*slopeZ);
  const shelter=clamp(1-forest*.31-againstSlope*.19,.36,1);
  const valley=Math.exp(-Math.pow((x-center(z))/2.6,2));
  advZ+=valley*.08*Math.sign(advZ||1);
  const gust=clamp(.92+.14*Math.sin(dayClock*.09+x*.30-z*.24)+
    .11*Math.sin(dayClock*.23+x*.57+z*.31),.65,1.22);
  const gain=windUserPower/70;
  atmWindX[k]=clamp(advX*shelter*gust*gain,-2.7,2.7);
  atmWindZ[k]=clamp(advZ*shelter*gust*gain,-2.7,2.7);
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
 atmWindRevision++;
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
 light.intensity=Math.min(1.70,(weatherCfg?weatherCfg.sunPower:2.0)*.67)*dayLight*shade;
 ambientSky.intensity=Math.min(1.45,(weatherCfg?weatherCfg.ambientPower:2.1)*.68)*(.30+.70*dayLight);
 renderer.toneMappingExposure=.86+.05*dayLight;
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
const fogDewTint=new T.Color('#d9e7df');
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
 scene.fog.color.set(base).lerp(fogDewTint,strength*.65);
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
// Agregados minerais por classe de solo: detalhes em alta e textura antiga na baixa.
const soilImageCache=new Map();
function soilGranularTexture(profile,quality){
 const key=profile+'/'+quality;
 if(soilImageCache.has(key))return soilImageCache.get(key);
 if(quality==='low'){
  const basic=groundTexture();soilImageCache.set(key,basic);return basic;
 }
 const n=quality==='high'?768:384,canvas=document.createElement('canvas');
 canvas.width=canvas.height=n;
 const ctx=canvas.getContext('2d'),r=rand(19841+profile.length*131);
 const sand=['arenoso','aluvial','pedregoso'].includes(profile);
 const dark=['humoso','aluvial'].includes(profile);
 const clay=['argiloso','lateritico','compactado'].includes(profile);
 const palette=sand?['#bdb69b','#e5d4ae','#827e6f','#ede2c5']:
  clay?['#a47d68','#d1a185','#885f4e','#b58b70']:
  dark?['#615d51','#9b8b76','#433e37','#b0a28a']:
  ['#a79b86','#d1bf9e','#806d57','#ece1c9'];
 ctx.fillStyle=palette[0];ctx.fillRect(0,0,n,n);
 for(let i=0;i<(quality==='high'?11500:3900);i++){
  const x=r()*n,y=r()*n;
  const dot=sand?.7+r()*2.2:clay?.3+r()*1.6:.5+r()*2.5;
  ctx.globalAlpha=.13+r()*.40;ctx.fillStyle=palette[Math.floor(r()*palette.length)];
  ctx.beginPath();ctx.ellipse(x,y,dot*2,dot*(sand?.67:.38),r()*6.283,0,6.283);ctx.fill();
 }
 for(let i=0;i<(quality==='high'?850:280);i++){
  const x=r()*n,y=r()*n,length=2+r()*(dark?21:10);
  ctx.strokeStyle=palette[Math.floor(r()*palette.length)];
  ctx.globalAlpha=.18+r()*.20;ctx.lineWidth=.3+r()*1.15;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+length,y+(r()-.5)*4);ctx.stroke();
 }
 ctx.globalAlpha=1;
 const tex=new T.CanvasTexture(canvas);
 tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(5.2,4.1);
 tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=quality==='high'?8:4;
 soilImageCache.set(key,tex);return tex;
}
// Poly Haven CC0 (1K albedo). Apenas o modo Alta solicita esses PNGs;
// a textura granular offline permanece como fallback para rede lenta/Android.
const soilRemoteTextures=new Map();
const soilRemoteAsset={
 arenoso:'dirt_aerial_02',argiloso:'dirt_floor',siltoso:'dirt_floor',
 humoso:'dirt_aerial_02',aluvial:'dirt_aerial_02',pedregoso:'gravel_ground_01',
 compactado:'dirt_floor',lateritico:'dirt_floor',calcario:'gravel_ground_01',
 salino:'dirt_floor',franco:'dirt_floor'
};
function applySoilTexture(){
 if(!land?.material)return;
 const key=soilType==='mosaico'?'franco':soilType;
 const local=soilGranularTexture(key,graphicsQuality);
 const asset=soilRemoteAsset[key]||soilRemoteAsset.franco;
 const remote=graphicsQuality==='high'?soilRemoteTextures.get(asset):null;
 const mapped=remote?.isTexture?remote:local;
 if(land.material.map!==mapped){land.material.map=mapped;land.material.needsUpdate=true;}
 if(graphicsQuality!=='high'||soilRemoteTextures.has(asset))return;
 soilRemoteTextures.set(asset,null); // download apenas uma vez por material
 const url='https://dl.polyhaven.org/file/ph-assets/Textures/png/1k/'+
  asset+'/'+asset+'_diff_1k.png';
 new T.TextureLoader().load(url,tex=>{
  tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;
  tex.repeat.set(5.2,4.1);tex.anisotropy=8;
  soilRemoteTextures.set(asset,tex);
  if(graphicsQuality==='high'&&(soilRemoteAsset[soilType]||soilRemoteAsset.franco)===asset){
   land.material.map=tex;land.material.needsUpdate=true;
  }
 },undefined,error=>{
  console.info('[Arcano] Solo CC0 remoto indisponível, usando textura local',asset,error);
 });
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
// O mapa de terra original é multiplicativo e deixa o gramado marrom.
// Nos pixels vivos, preservar a cor verde da superfície e apenas parte
// da textura de solo. Estrada, barro, margens e solo morto mantêm a terra.
land.material.onBeforeCompile=shader=>{
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
  `#include <map_fragment>
  #ifdef USE_COLOR
   float lushGrass=smoothstep(0.045,0.22,vColor.g-max(vColor.r,vColor.b));
   vec3 grassDapple=vColor.rgb*vec3(.83,1.00,.80);
   diffuseColor.rgb=mix(diffuseColor.rgb,grassDapple,lushGrass*.82);
  #endif
  `);
};
land.material.customProgramCacheKey=()=> 'arcano-green-soil-v1238';
land.receiveShadow=true;land.name='Terra absorvente e barro V12.12';scene.add(land);
// Estratos demonstrativos sob o relevo; sem malhas caras ou superfícies expostas.
// V12.30 — HORIZONTES CONFORMES: nenhuma caixa/plataforma plana.
// Apenas cortes laterais ao longo do perímetro da malha real do solo.
// Sem superfícies horizontais interceptando árvores ou projetando sombras.
const soilStrata=new T.Group();
soilStrata.name='Horizontes O/A/B/C, aquífero e rocha matriz conformes ao terreno';
scene.add(soilStrata);
const strata=[
 ['O · matéria orgânica',.12,'#4d3827'],
 ['A · solo superficial',.21,'#836047'],
 ['B · argila acumulada',.25,'#ad7053'],
 ['C · material de origem',.29,'#c0a183'],
 ['Aquífero poroso',.26,'#657a7f'],
 ['Rocha matriz',.30,'#736b62']
];
// Contorno em coordenadas da mesma grid da superfície: sem lacuna vertical.
const rim=[];
for(let i=0;i<NX;i++)rim.push([i,0]);
for(let j=1;j<NZ;j++)rim.push([NX-1,j]);
for(let i=NX-2;i>=0;i--)rim.push([i,NZ-1]);
for(let j=NZ-2;j>0;j--)rim.push([0,j]);
function makeConformingStratum(upper,lower,color,name){
 const positions=[],triangles=[],uvs=[];
 for(let k=0;k<rim.length;k++){
  const [i,j]=rim[k],x=nx(i),z=nz(j),y=soil[idx(i,j)]-.002;
  positions.push(x,y-upper,z,x,y-lower,z);
  uvs.push(k/Math.max(1,rim.length-1)*5,0,
           k/Math.max(1,rim.length-1)*5,1);
 }
 for(let k=0;k<rim.length;k++){
  const a=k*2,b=((k+1)%rim.length)*2;
  triangles.push(a,a+1,b,b,a+1,b+1);
 }
 const geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
 geo.setIndex(triangles);geo.computeVertexNormals();
 const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({
  color,roughness:1,metalness:0,side:T.DoubleSide
 }));
 mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=false;
 mesh.renderOrder=0;return mesh;
}
let layerOffset=0;
for(const [name,height,color] of strata){
 soilStrata.add(makeConformingStratum(layerOffset,layerOffset+height,color,name));
 layerOffset+=height;
}
// Tampa inferior acompanha o mesmo relevo; não existe laje plana visível.
const under=grid(),underP=under.attributes.position.array;
for(let k=0;k<size;k++)underP[k*3+1]=soil[k]-.002-layerOffset;
under.computeVertexNormals();
const underFace=new T.Mesh(under,new T.MeshStandardMaterial({
 color:'#635e58',roughness:1,metalness:0,side:T.BackSide
}));
underFace.name='Base inferior conforme ao terreno';
underFace.castShadow=false;underFace.receiveShadow=false;soilStrata.add(underFace);
const slab=soilStrata;
// Rochas anime: silhuetas orgânicas sem faces quadradas, paleta envelhecida e musgo discreto.
// Modelos procedurais locais: sem download externo, acessíveis também em Android/offline.
const stones=new T.Group();stones.name='Rochas dos pacotes Quaternius';scene.add(stones);
// Manter os volumes físicos de colisão e chuva, substituindo SÓ o visual.
// Pedras procedurais aparecem apenas até chegarem as malhas originais.
const proceduralStoneVisuals=new T.Group();
proceduralStoneVisuals.name='Volumes procedurais invisíveis (somente física)';
proceduralStoneVisuals.visible=false;
stones.add(proceduralStoneVisuals);
const importedStoneVisuals=new T.Group();
importedStoneVisuals.name='Rochas originais MegaKit + Ultimate';
stones.add(importedStoneVisuals);
const importedRockModels=[];
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
 proceduralStoneVisuals.add(cluster);
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
proceduralStoneVisuals.add(pebbles);

// Plantas 3D estilizadas: cada muda tem âncora no solo, biomassa e cor próprias.
// A mesma malha instanciada responde à fertilidade local (água, N/P/K, pH, sais e oxigênio).
const grass=new T.InstancedMesh(
 new T.ConeGeometry(.085,.36,4),
 new T.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true}),
 mobile?160:330);
const ob=new T.Object3D(),grassAnchors=[];
let gcount=0;
for(let k=0;k<grass.count*3&&gcount<grass.count;k++){
 const x=(random()-.5)*W,z=(random()-.5)*L,y=terrainContact(x,z);
 if(rockAt(x,z)||y<-.15)continue;
 const scale=.60+random()*.95,angle=random()*6.28;
 grassAnchors.push({x,z,y,scale,angle});
 ob.position.set(x,y+.09*scale,z);ob.scale.set(scale,scale,scale);ob.rotation.y=angle;ob.updateMatrix();
 grass.setMatrixAt(gcount++,ob.matrix);
 grass.setColorAt(gcount-1,new T.Color('#6b9465'));
}
grass.count=gcount;
// V12.51: grama cônica antiga é apenas um artefato histórico.
// NÃO anexar à cena: nenhuma ordem de carregamento pode fazê-la reaparecer.
grass.castShadow=false;grass.frustumCulled=false;grass.visible=false;
grass.count=0;
const plantBaseGreen=new T.Color('#668f5e'),plantHealthyGreen=new T.Color('#90ae71'),plantDry=new T.Color('#a19463');
function updatePlantVisuals(){
 // Grama cônica aposentada; não atualiza matrizes antigas.
 if(!grass.parent)return;
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
 const x=(random()-.5)*(W-1),z=(random()-.5)*(L-1),y=terrainContact(x,z);
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
const forestInstances=[],forestModels={};let floraWanted=true,floraLoaded=0,floraState='Preparando',forestCollection='mixed';
let ultimateModelsLoaded=0,megaModelsLoaded=0;
// Região oeste / central: mata fechada. Leste: transição gradual para
// campo aberto com gramíneas e poucas árvores isoladas, sem borda abrupta.
function biomeField(x,z){
 const edge=(x-W*.10-Math.sin(z*.065)*W*.035)/(W*.29);
 const u=clamp(edge,0,1);return u*u*(3-2*u);
}
const FOREST_MODELS=[
 // Árvores carregadas em ordem intercalada: espécies diferentes aparecem
 // desde o início, mesmo em aparelhos onde os modelos demoram a carregar.
 {name:'CommonTree_1',type:'tree',pack:'mega',mobile:33,desktop:60,height:4.4},
 {name:'BirchTree_1',type:'tree',pack:'ultimate',mobile:29,desktop:53,height:4.9},
 {name:'CommonTree_3',type:'tree',pack:'mega',mobile:29,desktop:50,height:4.3},
 {name:'MapleTree_3',type:'tree',pack:'ultimate',mobile:30,desktop:54,height:4.4},
 {name:'Pine_2',type:'pine',pack:'mega',mobile:20,desktop:34,height:4.7},
 {name:'CommonTree_2',type:'tree',pack:'mega',mobile:30,desktop:54,height:4.0},
 {name:'NormalTree_2',type:'tree',pack:'ultimate',mobile:29,desktop:54,height:4.8},
 {name:'CommonTree_4',type:'tree',pack:'mega',mobile:26,desktop:47,height:4.6},
 {name:'BirchTree_3',type:'tree',pack:'ultimate',mobile:27,desktop:49,height:4.5},
 {name:'Pine_4',type:'pine',pack:'mega',mobile:19,desktop:33,height:5.0},
 {name:'CommonTree_5',type:'tree',pack:'mega',mobile:26,desktop:45,height:4.6},
 {name:'PineTree_2',type:'pine',pack:'ultimate',mobile:24,desktop:43,height:5.0},
 // Sub-bosque, flores e rochas dos mesmos pacotes existentes.
 {name:'Bush_Common_Flowers',type:'bush',pack:'mega',mobile:76,desktop:212,height:.95},
 {name:'Flower_3_Group',type:'flower',pack:'mega',mobile:83,desktop:200,height:.47},
 {name:'Fern_1',type:'fern',pack:'mega',mobile:13,desktop:28,height:.61},
 {name:'Rock_Medium_2',type:'rock',pack:'mega',mobile:5,desktop:8,height:.70},
 {name:'Bush_Large_Flowers',type:'bush',pack:'ultimate',mobile:76,desktop:188,height:1.10},
 {name:'Flower_1_Clump',type:'flower',pack:'ultimate',mobile:83,desktop:180,height:.46},
 {name:'Plant_Flowers',type:'flower',pack:'ultimate',mobile:62,desktop:140,height:.51},
 {name:'Rock_3',type:'rock',pack:'ultimate',mobile:3,desktop:7,height:.83},
 {name:'Rock_5',type:'rock',pack:'ultimate',mobile:3,desktop:6,height:.62}
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
 const y=terrainContact(x,z);
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
// V12.51: lâminas triangulares do gramado procedural aposentadas.
// Não entram na hierarquia da cena nem quando o pacote ecológico demora.
meadowMesh.count=0;meadowMesh.visible=false;meadowMesh.frustumCulled=false;
function updateMeadowHealth(){
 // Gramado legado não participa da cena; dispensa atualizações de cor.
 if(!meadowMesh.parent)return;
 const green=new T.Color('#85ab69'),dryColor=new T.Color('#a8a076');
 for(let i=0;i<meadowAnchors.length;i++){
  const a=meadowAnchors[i],health=clamp(soilHealth[a.k],0,1);
  const c=dryColor.clone().lerp(green,health);
  meadowMesh.setColorAt(i,c);
 }
 if(meadowMesh.instanceColor)meadowMesh.instanceColor.needsUpdate=true;
}

// Qualidade V12.26: jamais reduz vértices das malhas originais. As diferenças são
// resolução, filtragem, sombras, frequência dos reflexos e densidade na cena.
const QUALITY_PRESETS={
 high:{label:'Alta · fidelidade máxima',mobilePixel:1.9,desktopPixel:2.35,
  shadowsMobile:1024,shadowsDesktop:2048,tree:1,small:1,meadow:1,anisotropy:8,
  reflectMobile:2.5,reflectDesktop:1.35},
 balanced:{label:'Equilibrada',mobilePixel:1.26,desktopPixel:1.65,
  shadowsMobile:512,shadowsDesktop:1024,tree:.88,small:.73,meadow:.69,anisotropy:4,
  reflectMobile:3.5,reflectDesktop:2.15},
 low:{label:'Econômica',mobilePixel:.87,desktopPixel:1.05,
  shadowsMobile:256,shadowsDesktop:512,tree:.65,small:.36,meadow:.29,anisotropy:1,
  reflectMobile:6.0,reflectDesktop:4.0}
};
let graphicsQuality=mobile?'balanced':'high';
let viewFov=mobile?52:58,viewDistance=mobile?98:170;
try{
 const fov=Number(localStorage.getItem('arcano.viewFov'));
 const distance=Number(localStorage.getItem('arcano.viewDistance'));
 if(fov>=35&&fov<=75)viewFov=fov;
 if(distance>=55&&distance<=240)viewDistance=distance;
}catch(_){} 
try{const saved=localStorage.getItem('arcano.graphicsQuality');if(QUALITY_PRESETS[saved])graphicsQuality=saved;}catch(_){}
const fullMeadowCount=0; // Só a grama 3D Quaternius tem permissão para aparecer.
const originalDetailMaps=new Map(),originalDetailLoading=new Set(),qualityMaterials=new Set();
const originalDetailFailures=new Set(),originalDetailQueue=[];
let originalDetailBusy=false;
const arcanoBarkResolution=()=>graphicsQuality==='high'?2048:
 graphicsQuality==='balanced'?1024:0;
const arcanoBarkKey=(name,res)=>name+'@'+res;

// Fallback mineral granulado somente quando o PNG da rocha não está hospedado.
// Conserva sempre a malha original do Quaternius.
const arcanoRockFallback=(()=>{
 const canvas=document.createElement('canvas');canvas.width=canvas.height=384;
 const ctx=canvas.getContext('2d'),r=rand(39512);
 ctx.fillStyle='#838278';ctx.fillRect(0,0,384,384);
 for(let i=0;i<4300;i++){
  const v=Math.floor(55+r()*105);
  ctx.fillStyle='rgba('+v+','+(v+3)+','+(v-5)+','+(.09+r()*.24)+')';
  const x=r()*384,y=r()*384,rad=.8+r()*8.3;
  ctx.beginPath();ctx.ellipse(x,y,rad*(.6+r()),rad*(.4+r()),r()*6.28,0,6.28);ctx.fill();
 }
 const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;
 t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;
})();
const originalTextureFiles={
 BirchTree_1:'BirchTree_Bark.png',BirchTree_3:'BirchTree_Bark.png',
 MapleTree_3:'MapleTree_Bark.png',NormalTree_2:'NormalTree_Bark.png',
 PineTree_2:'PineTree_Bark.png',Rock_3:'Rocks.png',Rock_5:'Rocks.png',Rock_Medium_2:'Rocks.png'
};
const originalTextureBase='https://raw.githubusercontent.com/walterpalladino/godot-quaternius-ultimate-stylized-nature/main/ultimate-stylized-nature/sources/Textures/';
let originalsReady=0,originalsUnavailable=0;
function visibleByQuality(a){
 const q=QUALITY_PRESETS[graphicsQuality];
 const density=(a.type==='tree'||a.type==='pine'||a.type==='rock')?q.tree:q.small;
 return (forestCollection==='mixed'||forestCollection===a.pack)&&
  a.qualityRank<=density&&a.obj.position.distanceToSquared(camera.position)<Math.pow(viewDistance+8,2)&&(a.type==='tree'||a.type==='pine'||a.type==='rock'||
  soilHealth[idx(clamp(Math.round((a.x+W*.5)/dx),0,NX-1),
                 clamp(Math.round((a.z+L*.5)/dz),0,NZ-1))]>.10);
}
function applyForestVisibility(){
 for(const a of forestInstances){
  // Jamais renderizar Grass_Common_Short / Grass_Large_Extruded
  // da floresta legada. A grama correta vive no módulo Quaternius.
  a.obj.visible=a.type!=='grass'&&visibleByQuality(a);
 }
 // Proteção incondicional, antes e depois da inicialização ecológica,
 // durante troca de qualidade, fallback e recarregamento de assets.
 grass.visible=false;grass.count=0;
 meadowMesh.visible=false;meadowMesh.count=0;

}

// V12.26 / reparo de folhagens: vincula o PNG correto e conserva recortes alpha.
const arcanoLeafFiles={
 BirchTree_1:'BirchTree_Leaves.png',BirchTree_3:'BirchTree_Leaves.png',
 MapleTree_3:'MapleTree_Leaves.png',NormalTree_2:'NormalTree_Leaves.png',
 PineTree_2:'PineTree_Leaves.png',Bush_Large_Flowers:'Bush_Leaves.png',
 Plant_Flowers:'Bush_Leaves.png',Flower_1_Clump:'Flowers.png',
 Grass_Large_Extruded:'Grass.png'
};
const arcanoFoliageTextureCache=new Map();
async function arcanoFoliageTexture(filename){
 if(!arcanoFoliageTextureCache.has(filename)){
  const url=new URL('./assets/ultimate/'+filename,document.baseURI).href;
  const task=new T.TextureLoader().loadAsync(url).then(texture=>{
   texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=QUALITY_PRESETS[graphicsQuality].anisotropy;
   texture.wrapS=texture.wrapT=T.ClampToEdgeWrapping;texture.needsUpdate=true;
   return texture;
  }).catch(err=>{console.warn('[Arcano] PNG local de folhas indisponível',filename,err);return null;});
  arcanoFoliageTextureCache.set(filename,task);
 }
 return arcanoFoliageTextureCache.get(filename);
}
// Cascas do mesmo pacote Quaternius já usado pelo laboratório, hospedadas localmente.
// Compartilhar por arquivo e convenção UV: glTF não inverte Y; FBX inverte.
const arcanoLocalBarkFiles={
 CommonTree_1:'NormalTree_Bark.jpg',CommonTree_2:'NormalTree_Bark.jpg',
 CommonTree_3:'NormalTree_Bark.jpg',CommonTree_4:'NormalTree_Bark.jpg',
 CommonTree_5:'NormalTree_Bark.jpg',Pine_2:'PineTree_Bark.jpg',Pine_4:'PineTree_Bark.jpg',
 BirchTree_1:'BirchTree_Bark.jpg',BirchTree_3:'BirchTree_Bark.jpg',
 MapleTree_3:'MapleTree_Bark.jpg',NormalTree_2:'NormalTree_Bark.jpg',PineTree_2:'PineTree_Bark.jpg'
};
const arcanoLocalBarkCache=new Map();
async function arcanoLocalBarkTexture(item){
 const filename=arcanoLocalBarkFiles[item.name];
 if(!filename)return null;
 const flipY=item.pack==='ultimate',key=filename+'@'+flipY;
 if(!arcanoLocalBarkCache.has(key)){
  const task=new T.TextureLoader().loadAsync(new URL('./assets/ultimate/'+filename,document.baseURI).href)
   .then(texture=>{
    texture.name=filename;texture.colorSpace=T.SRGBColorSpace;texture.flipY=flipY;
    texture.wrapS=texture.wrapT=T.RepeatWrapping;
    texture.anisotropy=QUALITY_PRESETS[graphicsQuality].anisotropy;
    texture.needsUpdate=true;return texture;
   }).catch(error=>{
    console.warn('[Arcano] Casca local indisponível:',filename,error);return null;
   });
  arcanoLocalBarkCache.set(key,task);
 }
 return arcanoLocalBarkCache.get(key);
}
// V12.27.3: o FBX pode usar Phong com brilho especular.
 // Converter para Standard preserva a imagem mas remove o aspecto metálico.
async function arcanoRepairForestMaterials(item,root){
 const leafFile=item.pack==='ultimate'?arcanoLeafFiles[item.name]:null;
 const leafMap=leafFile?await arcanoFoliageTexture(leafFile):null;
 // Arbustos claros misturam folhagem e pétalas em cartões diferentes:
 // não substituir todas as submalhas por Bush_Leaves.png.
 const flowersMap=item.pack==='ultimate'&&
   (item.type==='bush'||item.type==='flower')?
   await arcanoFoliageTexture('Flowers.png'):null;
 // Cascas locais por espécie; a textura painterly existente fica como reserva.
 const isTree=item.type==='tree'||item.type==='pine';
 const barkMap=isTree?(await arcanoLocalBarkTexture(item)||arcanoTreeBarkTexture(item.name)):null;
 root.traverse(obj=>{
  if(!obj.isMesh)return;
  const source=Array.isArray(obj.material)?obj.material:[obj.material];
  const fixed=source.map(old=>{
   if(!old)return old;
   const name=(old.name||'').toLowerCase();
   const visualName=name+' '+(obj.name||'').toLowerCase();
   const foliage=/(leaves|leaf|foliage|canopy|flower|petal|grass|fern|plant|bush)/.test(visualName)
     && !/(bark|trunk|wood|stem|rock|stone)/.test(name);
   const explicitWood=/(bark|trunk|wood|stem|branch)/.test(name);
   // Materiais FBX com nome genérico podem conter apenas tronco opaco.
   // Folhas, pétalas e mapas alpha sempre ficam fora desta correção.
   const wood=isTree&&(explicitWood||
    (!foliage&&!old.map&&!old.alphaMap&&!old.transparent));
   const rock=/(rock|stone)/.test(name);
   const petal=/(flower|petal|blossom)/.test(name)||
     (!name&&/(flower|petal|blossom)/.test(obj.name||'')&&item.type==='flower');
   let map=old.map||null;
   if(foliage&&item.pack==='ultimate'){
    // Árvores usam suas folhas oficiais. Em arbustos não se pode aplicar a
    // textura das folhas às pétalas claras, nem descartar materiais importados.
    if(item.type==='tree'||item.type==='pine'){
     if(leafMap)map=leafMap;
    }else if(!map)map=petal?(flowersMap||leafMap):leafMap;
   }
   if(wood&&barkMap)map=barkMap;
   if(item.type==='rock')map=arcanoRockFallback;
   const tint=wood&&barkMap?new T.Color('#ffffff'):
     item.type==='rock'?new T.Color('#d6d3ca'):
     map&&item.pack==='ultimate'?
      new T.Color(item.type==='bush'&&!petal?'#d7e3d0':'#ffffff'):
      (old.color?.clone?.()||new T.Color('#ffffff'));
   const material=new T.MeshStandardMaterial({
    name:old.name||'',color:tint,map:map,
    roughness:1,metalness:0,
    transparent:false,opacity:1,depthWrite:true,
    // Arbustos/florais têm muitos cartões alpha finos: o recorte forte
    // removia quase toda a copa em Android, parecendo faltar pedaços.
    alphaTest:foliage?((item.type==='bush'||item.type==='flower'||item.type==='fern')?.035:.23):0,
    // AlphaMap antigo pode existir separado do atlas RGB; não descartá-lo.
    alphaMap:foliage?(old.alphaMap||null):null,
    side:foliage?T.DoubleSide:T.FrontSide,
    fog:true,toneMapped:true,
    vertexColors:!!old.vertexColors,flatShading:!!old.flatShading
   });
   material.userData={...old.userData,arcanoNaturalMaterial:true,
    arcanoMaterialType:foliage?'leaf':wood?'wood':rock?'stone':'other',
    arcanoTreeBarkTexture:!!(wood&&barkMap)};
   material.emissive.set('#000000');material.emissiveIntensity=0;
   if(map){
    map.colorSpace=T.SRGBColorSpace;
    map.anisotropy=QUALITY_PRESETS[graphicsQuality].anisotropy;
   }
   return material;
  });
  obj.material=Array.isArray(obj.material)?fixed:fixed[0];
 });
}

function registerForestMaterial(item,root){
 if(item.pack!=='ultimate'&&item.type!=='rock')return;
 root.traverse(o=>{
  if(!o.isMesh)return;
  const materials=Array.isArray(o.material)?o.material:[o.material];
  for(const mat of materials){
   if(!mat||qualityMaterials.has(mat))continue;
   // Cascas locais conservam resolução e orientação UV em todos os presets.
   if(mat.userData.arcanoMaterialType==='wood')continue;
   // Cor e transparência da folhagem permanecem no PNG original local.
   // Apenas materiais de casca/rocha que tinham substituto 128px recebem
   // opcionalmente a imagem original do próprio pacote, em qualidade Alta.
   const original=originalTextureFiles[item.name];
   const source=mat.map?.image?.currentSrc||mat.map?.image?.src||'';
   // Classificação criada pelo reparo: funciona mesmo quando o FBX usa
   // nomes de materiais genéricos, sem confundir a copa com o tronco.
   if(!original||!(item.type==='rock'||mat.userData.arcanoMaterialType==='wood'))continue;
   mat.userData.arcanoFallbackMap=mat.map||null;
   mat.userData.arcanoOriginalTextureFile=original;
   qualityMaterials.add(mat);
  }
 });
}
// Os mapas de casca oficiais são grandes. Download serializado para Android,
// depois reduzidos no canvas: Equilibrada=1024, Alta=2048, Econômica=reserva leve.
function arcanoNextBark(){
 if(originalDetailBusy||!originalDetailQueue.length)return;
 const job=originalDetailQueue.shift();
 const filename=job.filename,key=job.key,res=job.res;
 if(originalDetailMaps.has(key)||originalDetailFailures.has(key)){
  originalDetailLoading.delete(key);arcanoNextBark();return;
 }
 originalDetailBusy=true;
 const image=new Image();
 image.crossOrigin='anonymous';image.decoding='async';
 function finished(error){
  originalDetailBusy=false;originalDetailLoading.delete(key);
  if(error){
   originalDetailFailures.add(key);originalsUnavailable++;
   console.warn('[Arcano] Textura oficial indisponível:',filename,error);
  }
  updateGraphicsStatus();arcanoNextBark();
 }
 image.onload=()=>{
  try{
   const iw=image.naturalWidth,ih=image.naturalHeight;
   if(!iw||!ih)throw new Error('Imagem original inválida');
   const factor=Math.min(1,res/Math.max(iw,ih));
   const w=Math.max(1,Math.round(iw*factor)),
         h=Math.max(1,Math.round(ih*factor));
   const canvas=document.createElement('canvas');
   canvas.width=w;canvas.height=h;
   const ctx=canvas.getContext('2d');
   if(!ctx)throw new Error('Canvas indisponível');
   ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   ctx.drawImage(image,0,0,w,h);
   const texture=new T.CanvasTexture(canvas);
   texture.colorSpace=T.SRGBColorSpace;
   texture.wrapS=texture.wrapT=T.RepeatWrapping;
   texture.minFilter=T.LinearMipmapLinearFilter;
   texture.magFilter=T.LinearFilter;
   texture.anisotropy=QUALITY_PRESETS[graphicsQuality].anisotropy;
   texture.generateMipmaps=true;texture.needsUpdate=true;
   originalDetailMaps.set(key,texture);originalsReady++;
   applyQualityMaterials();finished(null);
  }catch(error){finished(error);}
 };
 image.onerror=()=>finished(new Error('Falha de rede ou bloqueio da imagem'));
 image.src=originalTextureBase+encodeURIComponent(filename);
}
function useOriginalTexture(filename){
 const res=arcanoBarkResolution();
 if(!res)return;
 const key=arcanoBarkKey(filename,res);
 if(originalDetailMaps.has(key)||originalDetailLoading.has(key)||
    originalDetailFailures.has(key))return;
 originalDetailLoading.add(key);
 originalDetailQueue.push({filename,key,res});
 arcanoNextBark();
}
function applyQualityMaterials(){
 const res=arcanoBarkResolution();
 for(const material of qualityMaterials){
  const original=material.userData.arcanoOriginalTextureFile;
  const fallback=material.userData.arcanoFallbackMap;
  const key=arcanoBarkKey(original,res);
  const texture=res&&originalDetailMaps.has(key)?
    originalDetailMaps.get(key):fallback;
  if(material.map!==texture){material.map=texture;material.needsUpdate=true;}
  if(res&&original&&!originalDetailMaps.has(key))useOriginalTexture(original);
 }
 // As folhas ficam com os mapas de cor originais, sem reduzir a resolução.
 const seenTextures=new Set();
 for(const model of Object.values(forestModels))model.traverse(obj=>{
  if(!obj.isMesh)return;
  const mats=Array.isArray(obj.material)?obj.material:[obj.material];
  for(const mat of mats)if(mat?.map&&!seenTextures.has(mat.map)){
   seenTextures.add(mat.map);
   mat.map.anisotropy=QUALITY_PRESETS[graphicsQuality].anisotropy;
   mat.map.needsUpdate=true;
  }
 });
}
function updateGraphicsStatus(){
 if(!$('qualityStats'))return;
 const q=QUALITY_PRESETS[graphicsQuality],resolution=arcanoBarkResolution();
 $('qualityStats').textContent='🎨 '+q.label+
  ' · tela '+Math.min(devicePixelRatio||1,mobile?q.mobilePixel:q.desktopPixel).toFixed(2)+'×'+
  ' · folhagem '+Math.round(q.small*100)+'%'+
  ' · sombras '+(mobile?q.shadowsMobile:q.shadowsDesktop)+'px'+
  ' · cascas locais 1024px · detalhes minerais '+originalsReady+
  (resolution?' ('+resolution+'px)': ' (reserva leve)')+
  (originalDetailLoading.size?' · baixando':'')+
  (originalsUnavailable?' · algumas indisponíveis':'')+
  ' · madeira fosca, metalness 0';
}
function setViewSettings(fov=viewFov,distance=viewDistance){
 viewFov=clamp(Number(fov)||52,35,75);
 viewDistance=clamp(Number(distance)||98,55,240);
 camera.fov=viewFov;camera.far=viewDistance;
 camera.updateProjectionMatrix();
 if($('ecoFov'))$('ecoFov').value=String(viewFov);
 if($('ecoFovVal'))$('ecoFovVal').textContent=viewFov+'°';
 if($('ecoViewDistance'))$('ecoViewDistance').value=String(viewDistance);
 if($('ecoViewDistanceVal'))$('ecoViewDistanceVal').textContent=viewDistance+' u';
 try{
  localStorage.setItem('arcano.viewFov',String(viewFov));
  localStorage.setItem('arcano.viewDistance',String(viewDistance));
 }catch(_){}
 applyForestVisibility();
 if(typeof reflectionAge!=='undefined')reflectionAge=999;
}
function setGraphicsQuality(next){
 graphicsQuality=QUALITY_PRESETS[next]?next:'balanced';
 const q=QUALITY_PRESETS[graphicsQuality];
 try{localStorage.setItem('arcano.graphicsQuality',graphicsQuality);}catch(_){}
 if($('graphicsQuality'))$('graphicsQuality').value=graphicsQuality;
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?q.mobilePixel:q.desktopPixel));
 resize();
 const shadowSize=mobile?q.shadowsMobile:q.shadowsDesktop;
 if(light.shadow.mapSize.x!==shadowSize){
  light.shadow.mapSize.set(shadowSize,shadowSize);
  if(light.shadow.map){light.shadow.map.dispose();light.shadow.map=null;}
 }
 renderer.shadowMap.enabled=true;
 light.castShadow=graphicsQuality!=='low';
 renderer.shadowMap.needsUpdate=true;
 for(const a of forestInstances)a.obj.traverse(obj=>{
  if(obj.isMesh)obj.castShadow=graphicsQuality==='high'&&
   (a.type==='tree'||a.type==='pine');
 });
 applyForestVisibility();
 applyQualityMaterials();
 applySoilTexture();
 updateGraphicsStatus();
 if(typeof reflectionAge!=='undefined')reflectionAge=999;
}

function forestStatus(state){
 floraState=state;
 const treeModels=FOREST_MODELS.filter(a=>a.type==='tree'||a.type==='pine');
 const loadedSpecies=treeModels.filter(a=>!!forestModels[a.name]).length;
 const nearRoadSpecies=new Set(forestInstances.filter(a=>
  (a.type==='tree'||a.type==='pine')&&
  Math.abs(a.z-(.92-.70*Math.sin(a.x*.47+.6)+.17*Math.sin(a.x*1.34)))<5.4
 ).map(a=>a.modelName)).size;
 if($('floraStatus'))$('floraStatus').textContent=
  '🌳 '+loadedSpecies+'/'+treeModels.length+' espécies de árvores carregadas · '+
  nearRoadSpecies+' espécies perto da estrada · Mega '+megaModelsLoaded+'/11 · Ultimate '+
  ultimateModelsLoaded+'/10 · '+state;
}
function setFloraVisible(v){
 floraWanted=!!v;forestGroup.visible=floraWanted&&floraLoaded>0&&
  !(assetTestActor&&$('assetTestIsolate')?.checked);
 applyForestVisibility();
 grass.visible=false;meadowMesh.visible=false;
 grass.count=0;meadowMesh.count=0;
 sproutGroup.visible=!forestGroup.visible;
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
  if(!mat)continue;
  const materialName=(mat.name||'')+' '+(mesh.name||'')+' '+(mat.map?.name||'');
  if(!/(leaf|leaves|grass|flower|fern|plant|bush|foliage|canopy)/i.test(materialName)||
      /(bark|trunk|rock|stone|stem)/i.test(materialName))continue;
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

// Ancoragem V12.26: o ponto de apoio é a MALHA do terreno, não só a fórmula
// contínua de elevação. O pivô FBX/glTF pode ficar muito acima da raiz.
function terrainContact(x,z){return sample(soil,clamp(x,-W*.49,W*.49),
 clamp(z,-L*.49,L*.49));}
function supportHeight(type,x,z,extent){
 const centerY=terrainContact(x,z);
 if(type!=='rock')return centerY;
 // Pedras têm contato numa área, e entram levemente no solo da encosta.
 // Usar altura mínima permite apoiar a pedra pelo volume, sem base suspensa.
 const rr=clamp(extent*.26,.16,.60);
 let low=centerY;
 for(const [u,v] of [[rr,0],[-rr,0],[0,rr],[0,-rr],[rr*.65,rr*.65],[-rr*.65,-rr*.65]])
  low=Math.min(low,terrainContact(x+u,z+v));
 return low;
}
// V12.27: troncos sustentam o modelo, não a extremidade de uma folha ou cartão alpha.
// Calcula o ponto mais baixo de tronco/galho após TODAS as rotações herdadas do FBX.
// V12.27.1 — Corrige a origem dos assets sem afetar vento/água/reflexos.
// Vários glTFs contêm bark e leaves na MESMA malha com grupos de material.
// A base do tronco exige medir só os triângulos do material de madeira.
const arcanoPartCache=new WeakMap();
const arcanoBarkRE=/(bark|trunk|wood|stem|branch|log|treebase)/i;
const arcanoLeafRE=/(leaf|leaves|foliage|canopy|pine.?needles)/i;
function arcanoLocalPartBox(mesh,kind){
 const geo=mesh.geometry,pos=geo?.getAttribute('position');
 if(!pos)return null;
 const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
 const signature=kind+'|'+materials.map(m=>m?.name||'').join('|')+'|'+mesh.name;
 let perGeo=arcanoPartCache.get(geo);
 if(!perGeo){perGeo=new Map();arcanoPartCache.set(geo,perGeo);}
 if(perGeo.has(signature))return perGeo.get(signature);
 const box=new T.Box3().makeEmpty(),point=new T.Vector3();
 const index=geo.getIndex(),groups=geo.groups.length?
  geo.groups:[{start:0,count:index?index.count:pos.count,materialIndex:0}];
 let matched=false;
 for(const part of groups){
  const matName=(materials[part.materialIndex]?.name||'');
  const name=matName||mesh.name||'';
  const good=kind==='wood'?
   (arcanoBarkRE.test(name)&&!arcanoLeafRE.test(name)):
   arcanoLeafRE.test(name);
  if(!good)continue;
  matched=true;
  const end=Math.min(part.start+part.count,index?index.count:pos.count);
  for(let i=part.start;i<end;i++){
   const p=index?index.getX(i):i;
   point.fromBufferAttribute(pos,p);
   box.expandByPoint(point);
  }
 }
 const result=matched&&!box.isEmpty()?box:null;
 perGeo.set(signature,result);
 return result;
}
function arcanoWorldPartBox(root,kind){
 root.updateMatrixWorld(true);
 const result=new T.Box3().makeEmpty(),tmp=new T.Box3();
 root.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.visible)return;
  const local=arcanoLocalPartBox(mesh,kind);
  if(!local)return;
  tmp.copy(local).applyMatrix4(mesh.matrixWorld);
  result.union(tmp);
 });
 return result.isEmpty()?null:result;
}
// V12.27.2: extremos de galhos não podem definir a altura do pé do tronco.
// A malha pode ter madeira e folhas no mesmo BufferGeometry: amostramos apenas
// vértices das faces com material de madeira, já transformados para o mundo.
// Para árvores, preferimos os vértices junto ao eixo do pivô da raiz.
const arcanoTrunkWorldPoint=new T.Vector3();
function arcanoCentralTrunkFootY(obj,wood){
 const span=new T.Vector3();wood.getSize(span);
 const radius=clamp(Math.min(span.x,span.z)*.22,.18,.85);
 const radius2=radius*radius;
 let nearbyMin=Infinity,samples=0;
 obj.updateMatrixWorld(true);
 obj.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.visible)return;
  const geometry=mesh.geometry,position=geometry?.getAttribute('position');
  if(!position)return;
  const index=geometry.getIndex(),mats=Array.isArray(mesh.material)?
    mesh.material:[mesh.material];
  const groups=geometry.groups.length?geometry.groups:
    [{start:0,count:index?index.count:position.count,materialIndex:0}];
  for(const g of groups){
   const name=mats[g.materialIndex]?.name||mesh.name||'';
   if(!arcanoBarkRE.test(name)||arcanoLeafRE.test(name))continue;
   const end=Math.min(g.start+g.count,index?index.count:position.count);
   // O mesmo vértice pode ocorrer várias vezes em polígonos diferentes;
   // o menor Y observado é suficiente e não exige ordenar arrays.
   for(let k=g.start;k<end;k++){
    const vertex=index?index.getX(k):k;
    arcanoTrunkWorldPoint.fromBufferAttribute(position,vertex).
      applyMatrix4(mesh.matrixWorld);
    const dx=arcanoTrunkWorldPoint.x-obj.position.x,
          dz=arcanoTrunkWorldPoint.z-obj.position.z;
    if(dx*dx+dz*dz>radius2)continue;
    nearbyMin=Math.min(nearbyMin,arcanoTrunkWorldPoint.y);
    samples++;
   }
  }
 });
 if(samples>=3&&Number.isFinite(nearbyMin)){
  // Só elevar o ponto de ancoragem, nunca substituí-lo pela ponta
  // de um galho distante que mergulha abaixo do tronco.
  return Math.max(wood.min.y,nearbyMin);
 }
 return wood.min.y;
}
function solidForestFootY(obj,anchor){
 const wood=arcanoWorldPartBox(obj,'wood');
 if(wood){
  const isTree=anchor&&(anchor.type==='tree'||anchor.type==='pine');
  return isTree?arcanoCentralTrunkFootY(obj,wood):wood.min.y;
 }
 obj.updateMatrixWorld(true);
 const whole=new T.Box3().setFromObject(obj);
 return whole.min.y;
}
// Escolha por espécie, computada uma única vez antes da distribuição.
// A rotação corretiva fica em um nó separado: não modifica as transformações
// internas do FBX nem os movimentos de troncos e copas já implementados.
const arcanoOrientationCache=new Map();
// V12.31: MapleTree_3 já foi exportada com conversão Z-up → Y-up no FBX.
// O fuste original cresce no eixo Z do Blender e o FBX aplica -90° em X.
// A copa adulta é mais larga do que alta; isso NÃO a torna uma árvore caída.
// Não aplicar outra rotação corretiva na malha importada para essa espécie.
const arcanoTrustedSourceOrientation=new Set(['MapleTree_3']);
const arcanoOrientationCandidates=[
 [0,0,0],[Math.PI*.5,0,0],[-Math.PI*.5,0,0],
 [0,0,Math.PI*.5],[0,0,-Math.PI*.5],
 [Math.PI,0,0],[0,0,Math.PI]
];
// V12.28 — inspeciona cada espécie carregada, não só árvores grandes.
// Uma copa larga é normal em arbustos; a rotação só muda quando a postura
// original é anormal e há evidência de tronco/caule acima do solo.
const arcanoModelAudit=[];
function arcanoBestOrientation(item,root){
 const key=item.pack+'/'+item.name;
 if(arcanoOrientationCache.has(key))return arcanoOrientationCache.get(key);
 // Confirmação na fonte Ultimate Stylized Nature Pack/MapleTrees.fbx:
 // MapleTree_3: eixo longitudinal do tronco em Z; rotação FBX -90° X.
 // O FBXLoader já incorpora essa conversão à raiz carregada.
 if(item.pack==='ultimate'&&arcanoTrustedSourceOrientation.has(item.name)){
  root.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(root),span=new T.Vector3();
  bounds.getSize(span);
  if(bounds.isEmpty()||!Number.isFinite(span.y)||span.y<.00001){
   arcanoOrientationCache.set(key,null);return null;
  }
  const fixed={quaternion:new T.Quaternion(),height:span.y,
   woodRatio:0,overallRatio:span.y/Math.max(.0001,span.x,span.z),
   selected:0,sourcePreserved:true};
  arcanoOrientationCache.set(key,fixed);
  arcanoModelAudit.push({model:item.name,kind:item.type,status:'eixo original preservado',orientation:0});
  console.info('[Arcano V12.31] Preservada orientação nativa do FBX:',item.name);
  return fixed;
 }
 if(item.type==='rock')return {quaternion:new T.Quaternion(),height:1};
 // FBX e glTF da coleção já são Y-up depois do carregador. Arbustos,
 // flores e samambaias possuem copas MAIS LARGAS que altas naturalmente;
 // girá-los para maximizar altura deixava ramos/folhas deitados ou vazados.
 if(item.type==='bush'||item.type==='flower'||item.type==='fern'){
  root.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(root),span=new T.Vector3();
  box.getSize(span);
  if(!box.isEmpty()&&span.y>.00001){
   const fixed={quaternion:new T.Quaternion(),height:span.y,
    woodRatio:0,overallRatio:span.y/Math.max(.0001,span.x,span.z),
    selected:0,sourcePreserved:true};
   arcanoOrientationCache.set(key,fixed);
   arcanoModelAudit.push({model:item.name,kind:item.type,
    status:'arbusto/flor com eixo original conservado',orientation:0});
   return fixed;
  }
 }
 const probe=new T.Group();probe.add(root.clone(true));
 const results=[];
 for(let n=0;n<arcanoOrientationCandidates.length;n++){
  const xyz=arcanoOrientationCandidates[n];
  probe.quaternion.setFromEuler(new T.Euler(xyz[0],xyz[1],xyz[2]));
  probe.updateMatrixWorld(true);
  const full=new T.Box3().setFromObject(probe);
  if(full.isEmpty())continue;
  const size=new T.Vector3();full.getSize(size);
  if(!Number.isFinite(size.y)||size.y<.000001)continue;
  const wood=arcanoWorldPartBox(probe,'wood');
  const leaves=arcanoWorldPartBox(probe,'leaf');
  const woodSize=new T.Vector3(),woodCenter=new T.Vector3(),leafCenter=new T.Vector3();
  const stemRatio=wood?(
    wood.getSize(woodSize),
    woodSize.y/Math.max(.0001,woodSize.x,woodSize.z)
  ):0;
  const overall=size.y/Math.max(.0001,size.x,size.z);
  let canopyRise=0;
  if(wood&&leaves){
   wood.getCenter(woodCenter);leaves.getCenter(leafCenter);
   canopyRise=(leafCenter.y-woodCenter.y)/Math.max(.0001,size.y);
  }else if(leaves){
   leaves.getCenter(leafCenter);
   canopyRise=(leafCenter.y-full.min.y)/Math.max(.0001,size.y)-.48;
  }
  const upright=stemRatio>0?stemRatio:overall;
  const tree=item.type==='tree'||item.type==='pine';
  const grounded=clamp(canopyRise,-.7,.7);
  const score=(tree?1.6:1.25)*Math.min(upright,3.4)+
   overall*(tree?.32:.36)+grounded*(wood?1.15:.25);
  results.push({quaternion:probe.quaternion.clone(),height:size.y,
   woodRatio:stemRatio,overallRatio:overall,hasWood:!!wood,
   canopyRise,score,index:n});
 }
 if(!results.length){
  console.warn('[Arcano] Modelo sem geometria válida:',item.name);
  arcanoOrientationCache.set(key,null);return null;
 }
 const normal=results[0];
 const best=results.reduce((a,b)=>b.score>a.score?b:a,normal);
 const isTree=item.type==='tree'||item.type==='pine';
 const isGrass=item.type==='grass';
 const isBroad=item.type==='bush'||item.type==='fern';
 const normalRatio=normal.hasWood?normal.woodRatio:normal.overallRatio;
 const bestRatio=best.hasWood?best.woodRatio:best.overallRatio;
 // Arbustos/ramalhetes são naturalmente largos: nunca girar apenas porque
 // a copa é maior que a altura, ao contrário de uma árvore com tronco.
 const needsCorrection=isTree
  ? normalRatio<.9 || normal.canopyRise<-.1
  : isGrass ? normalRatio<.32
  : isBroad ? normalRatio<.23
  : normalRatio<.38;
 const materiallyBetter=best.index!==0 && best.score>normal.score+
  (isTree?.26:.36) && bestRatio>normalRatio*(isTree?1.27:1.55);
 const visiblyFallen=isTree&&(normal.hasWood?normal.woodRatio<1.22:
  normal.overallRatio<.84);
 const convincingUpright=best.index!==0 && best.score>normal.score+.18 &&
  (best.hasWood?best.woodRatio>.94:best.overallRatio>.95) &&
  best.canopyRise>=normal.canopyRise-.12;
 const chosen=(needsCorrection&&materiallyBetter)||(visiblyFallen&&convincingUpright)?best:normal;
 const invalid=isTree?
  (chosen.hasWood&&chosen.woodRatio<.38&&chosen.overallRatio<.53):
  (chosen.overallRatio<.105);
 if(invalid){
  console.warn('[Arcano] Espécie ignorada: orientação não confiável',item.name);
  arcanoOrientationCache.set(key,null);
  arcanoModelAudit.push({model:item.name,status:'ignorado',kind:item.type});
  return null;
 }
 const result={quaternion:chosen.quaternion,height:chosen.height,
   woodRatio:chosen.woodRatio,overallRatio:chosen.overallRatio,
   selected:chosen.index};
 arcanoModelAudit.push({model:item.name,kind:item.type,
   orientation:chosen.index,status:chosen.index?'corrigido':'mantido'});
 if(chosen.index)console.info('[Arcano] Corrigido eixo original:',item.name,
  'variante',chosen.index,'tipo',item.type);
 arcanoOrientationCache.set(key,result);
 return result;
}
// Preferência pelo caule central para flores e arbustos, nunca pela
// pétala/ramo com menor Y em uma malha inclinada.
const arcanoPlantPoint=new T.Vector3();
function arcanoPlantBaseY(obj,anchor){
 obj.updateMatrixWorld(true);
 const wood=arcanoWorldPartBox(obj,'wood');
 const bounds=new T.Box3().setFromObject(obj);
 const basis=wood||bounds;
 if(basis.isEmpty())return Infinity;
 const c=new T.Vector3(),d=new T.Vector3();
 basis.getCenter(c);bounds.getSize(d);
 const radius=clamp(Math.min(d.x,d.z)*.28,.11,.80);
 const radius2=radius*radius;
 const candidates=[];
 const seekWood=!!wood;
 obj.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.visible)return;
  const geo=mesh.geometry,p=geo?.getAttribute('position');
  if(!p)return;
  const index=geo.getIndex();
  const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  const groups=geo.groups.length?geo.groups:
   [{start:0,count:index?index.count:p.count,materialIndex:0}];
  for(const g of groups){
   const name=(mats[g.materialIndex]?.name||mesh.name||'');
   if(seekWood&&(!arcanoBarkRE.test(name)||arcanoLeafRE.test(name)))continue;
   const end=Math.min(g.start+g.count,index?index.count:p.count);
   const step=Math.max(1,Math.floor((end-g.start)/600));
   for(let k=g.start;k<end;k+=step){
    arcanoPlantPoint.fromBufferAttribute(p,index?index.getX(k):k)
     .applyMatrix4(mesh.matrixWorld);
    const dx=arcanoPlantPoint.x-c.x,dz=arcanoPlantPoint.z-c.z;
    if(dx*dx+dz*dz<radius2)candidates.push(arcanoPlantPoint.y);
   }
  }
 });
 if(candidates.length>=5){
  candidates.sort((a,b)=>a-b);
  // Quantil inferior suprime uma pétala/folha isolada apontando para baixo.
  return candidates[Math.min(candidates.length-1,
   Math.floor(candidates.length*.06))];
 }
 return seekWood?wood.min.y:bounds.min.y;
}
// V12.30: identifica o pé físico da árvore pelos vértices mais BAIXOS de
// madeira e não pelas folhas, galhos pendentes ou origem arbitrária do FBX.
const arcanoFootPoint=new T.Vector3();
function arcanoTrunkRootPoint(obj){
 obj.updateMatrixWorld(true);
 const box=arcanoWorldPartBox(obj,'wood');
 if(!box)return null;
 const h=Math.max(.001,box.max.y-box.min.y);
 const limit=box.min.y+Math.min(h*.16,.62);
 const samples=[],cluster=new Map();
 obj.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.visible)return;
  const geo=mesh.geometry,pos=geo?.getAttribute('position');if(!pos)return;
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  const indices=geo.getIndex(),groups=geo.groups.length?geo.groups:
   [{start:0,count:indices?indices.count:pos.count,materialIndex:0}];
  for(const g of groups){
   const name=materials[g.materialIndex]?.name||mesh.name||'';
   if(!arcanoBarkRE.test(name)||arcanoLeafRE.test(name))continue;
   const end=Math.min(g.start+g.count,indices?indices.count:pos.count);
   const step=Math.max(1,Math.floor((end-g.start)/3000));
   for(let i=g.start;i<end;i+=step){
    arcanoFootPoint.fromBufferAttribute(pos,indices?indices.getX(i):i)
     .applyMatrix4(mesh.matrixWorld);
    if(arcanoFootPoint.y>limit)continue;
    samples.push([arcanoFootPoint.x,arcanoFootPoint.y,arcanoFootPoint.z]);
   }
  }
 });
 if(!samples.length)return {x:box.getCenter(new T.Vector3()).x,
  y:box.min.y,z:box.getCenter(new T.Vector3()).z};
 // Agrupar vértices baixos: o pé do tronco é a REGIÃO conectada mais densa,
 // não uma ponta de galho que aponta para o chão.
 const cell=clamp(h*.09,.10,.32);
 for(const p of samples){
  const key=Math.floor(p[0]/cell)+','+Math.floor(p[2]/cell);
  let arr=cluster.get(key);if(!arr){arr=[];cluster.set(key,arr);}arr.push(p);
 }
 let best=[];
 for(const arr of cluster.values())if(arr.length>best.length)best=arr;
 if(best.length<4)best=samples;
 let x=0,z=0;const yy=[];
 for(const p of best){x+=p[0];z+=p[2];yy.push(p[1]);}
 yy.sort((a,b)=>a-b);
 return {x:x/best.length,y:yy[Math.min(yy.length-1,Math.floor(yy.length*.06))],
  z:z/best.length};
}
// Autoaprumo limitado à espécie (não altera o vento que age no pai).
// Calcula vetor do pé central à seção intermediária da madeira e reduz
// inclinações excessivas sem retificar árvores tortuosas deliberadamente.
const arcanoStraightenCache=new WeakMap();
function arcanoStraightenSpecies(item,root,rotation){
 if(arcanoStraightenCache.has(root))return arcanoStraightenCache.get(root).clone();
 function retain(q){arcanoStraightenCache.set(root,q.clone());return q;}
 // Não endireitar artificialmente uma árvore cuja pose FBX já é correta.
 if(item.pack==='ultimate'&&arcanoTrustedSourceOrientation.has(item.name))
  return retain(rotation.clone());

 if(item.type!=='tree'&&item.type!=='pine')return retain(rotation);
 const probe=new T.Group();probe.quaternion.copy(rotation);
 probe.add(root.clone(true));probe.updateMatrixWorld(true);
 const box=arcanoWorldPartBox(probe,'wood');
 if(!box)return retain(rotation);
 const h=Math.max(.001,box.max.y-box.min.y);
 const low=[],middle=[],v=new T.Vector3();
 probe.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.visible)return;
  const geo=mesh.geometry,p=geo?.getAttribute('position');if(!p)return;
  const ms=Array.isArray(mesh.material)?mesh.material:[mesh.material],idxs=geo.getIndex();
  const groups=geo.groups.length?geo.groups:[{start:0,count:idxs?idxs.count:p.count,materialIndex:0}];
  for(const g of groups){
   const name=ms[g.materialIndex]?.name||mesh.name||'';
   if(!arcanoBarkRE.test(name)||arcanoLeafRE.test(name))continue;
   const end=Math.min(g.start+g.count,idxs?idxs.count:p.count);
   const step=Math.max(1,Math.floor((end-g.start)/1800));
   for(let k=g.start;k<end;k+=step){
    v.fromBufferAttribute(p,idxs?idxs.getX(k):k).applyMatrix4(mesh.matrixWorld);
    const t=(v.y-box.min.y)/h;
    if(t<.12)low.push([v.x,v.y,v.z]);
    else if(t>.27&&t<.47)middle.push([v.x,v.y,v.z]);
   }
  }
 });
 if(low.length<6||middle.length<6)return retain(rotation);
 const center=pts=>{const sum=new T.Vector3();for(const p of pts)sum.add(new T.Vector3(...p));return sum.divideScalar(pts.length);};
 const a=center(low),b=center(middle),dir=b.sub(a);
 if(dir.length()<.15)return retain(rotation);
 const tilt=Math.atan2(Math.hypot(dir.x,dir.z),Math.max(.01,dir.y));
 // Mantém o caráter natural das copas: corrigir só troncos claramente caídos.
 if(tilt<.31)return retain(rotation);
 const corrected=dir.clone().normalize(),upright=new T.Vector3(0,1,0);
 const full=new T.Quaternion().setFromUnitVectors(corrected,upright);
 const amt=clamp((tilt-.18)/Math.max(.01,tilt),0,.75);
 const tweak=new T.Quaternion().slerp(full,amt);
 return retain(tweak.multiply(rotation.clone()).normalize());
}
function snapForestToGround(anchor){
 const a=anchor,obj=a.obj;
 let foot=solidForestFootY(obj,a);
 if(a.type==='tree'||a.type==='pine'){
  const root=arcanoTrunkRootPoint(obj);
  if(root){
   // Compensar o desvio da base do tronco no eixo XZ: modelos inclinados
   // não devem ter seu ponto de contato em uma encosta diferente.
   const diff=new T.Vector3(a.x-root.x,0,a.z-root.z);
   if(diff.length()<a.crownWidth*.8){
    const inv=new T.Quaternion().copy(obj.quaternion).invert();
    diff.applyQuaternion(inv).divideScalar(Math.max(.0001,Math.abs(obj.scale.x)));
    a.orientationNode.position.x+=diff.x;
    a.orientationNode.position.z+=diff.z;
    obj.updateMatrixWorld(true);
   }
   const aligned=arcanoTrunkRootPoint(obj);
   if(aligned)foot=aligned.y;
  }
 }else if(a.type==='flower'||a.type==='bush'||a.type==='fern'||a.type==='grass'){
  foot=arcanoPlantBaseY(obj,a);
 }
 if(!Number.isFinite(foot))return;
 // O pivô PAI permanece no solo; inclinar pelo vento não desloca o pé.
 // Ajustar a posição LOCAL da correção, sem alterar o eixo original do asset.
 const desiredY=a.contactY-a.embed;
 if(a.orientationNode){
  // O deslocamento compensa a altura da base em relação ao pivô atual,
  // ANTES de mover o pai para o nível do chão (evita somar duas alturas).
  a.orientationNode.position.y+=(obj.position.y-foot)/
   Math.max(.000001,Math.abs(obj.scale.y));
  obj.position.y=desiredY;
 }else obj.position.y+=desiredY-foot;
 obj.updateMatrixWorld(true);
}
// Alternância espacial evita monoculturas nas duas margens. Todos estes
// modelos 3D foram conferidos no diretório assets/ do próprio repositório.
const roadsideTreeSpecies=[
 'CommonTree_1','BirchTree_1','CommonTree_3','MapleTree_3',
 'Pine_2','CommonTree_2','NormalTree_2','CommonTree_4',
 'BirchTree_3','Pine_4','CommonTree_5','PineTree_2'
];
const treeRoadSeed=3;
function placeForestModel(item,root){
 // Grama de cena desativada: usa-se somente os modelos Quaternius do ecossistema.
 if(item.type==='grass')return;
 if(item.type==='rock'){
  registerImportedRock(item,root);
  return;
 }
 const randomForest=rand(9157+item.name.split('').reduce((a,c)=>a+c.charCodeAt(0),0));
 root.updateMatrixWorld(true);
 root.traverse(mesh=>addLeafWind(mesh));
 const orientation=arcanoBestOrientation(item,root);
 if(!orientation)return;
 const h=Math.max(.001,orientation.height);
 // Florestas em manchas densas, mas com seleção de qualidade no render.
 // Crescimento do número de árvores fica separado de pedras e flores.
 const count=(item.type==='tree'||item.type==='pine')?
  Math.ceil((mobile?item.mobile:item.desktop)*2.18):
  (mobile?item.mobile:item.desktop);
 let created=0;
 for(let attempt=0;attempt<count*26&&created<count;attempt++){
  // Concentra árvores por manchas de floresta (núcleos verdejantes),
  // em vez de poucos indivíduos espalhados por toda a região.
  let x=(randomForest()-.5)*(W-1.3),z=(randomForest()-.5)*(L-1.3);
  if(item.type==='tree'||item.type==='pine'){
   const patchSeed=attempt%9;
   const ax=Math.sin((patchSeed+2.3)*2.31)*W*.38;
   const az=Math.cos((patchSeed+4.1)*1.77)*L*.36;
   if(randomForest()<.74){
    x=clamp(ax+(randomForest()+randomForest()-1)*W*.115,-W*.48,W*.48);
    z=clamp(az+(randomForest()+randomForest()-1)*L*.125,-L*.48,L*.48);
   }
   // Grupos ciliares e bordas do caminho. Troncos crescem FORA da terra
   // batida; as copas e ramos tornam o corredor visualmente fechado.
   if(randomForest()<.54){
    x=(randomForest()-.5)*W*.93;
    const center=.92-.70*Math.sin(x*.47+.6)+.17*Math.sin(x*1.34);
    z=center+(randomForest()<.5?-1:1)*(1.22+Math.pow(randomForest(),1.12)*3.75);
   }
  }
  const edge=Math.max(Math.abs(x)/(W*.5),Math.abs(z)/(L*.5));
  if(item.type==='tree'||item.type==='pine'){
   // Ecótono: menos indivíduos à medida que o terreno vira campo aberto.
   // Pinheiros e bétulas podem sobreviver como árvores esparsas.
   const transition=biomeField(x,z);
   const edgeTolerance=/Pine|Birch/.test(item.name)?.83:.965;
   if(randomForest()<transition*edgeTolerance)continue;
   if(edge>.985&&randomForest()<.35)continue;
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
  const groundY=terrainContact(x,z);
  if(groundY<-.13)continue;
  // Estrada no solo com clareira contínua. Deve permanecer visível mesmo
  // após carregar todos os FBX, sem árvores/arbustos crescendo no traçado.
  const roadCenter=.92-.70*Math.sin(x*.47+.6)+.17*Math.sin(x*1.34);
  const pathDistance=Math.abs(z-roadCenter);
  if((item.type==='tree'||item.type==='pine')&&pathDistance<1.16)continue;
  // Cada trecho de 4-5 m recebe DUAS espécies características distintas,
  // com alguns indivíduos misturados. Não bloquear espécies por um slot rígido:
  // caso um FBX demore ou falhe, as árvores MegaKit ainda cobrem a margem.
  if((item.type==='tree'||item.type==='pine')&&pathDistance<5.4){
   const seg=Math.floor((x+W*.49)/4.8),side=z>roadCenter?1:0;
   const choice=(seg*7+side*5+treeRoadSeed)%roadsideTreeSpecies.length;
   const first=roadsideTreeSpecies[choice];
   const second=roadsideTreeSpecies[(choice+5)%roadsideTreeSpecies.length];
   if(item.name!==first&&item.name!==second&&randomForest()<.82)continue;
  }
  if((item.type==='bush'||item.type==='flower'||item.type==='fern'||item.type==='grass')&&
     pathDistance<(item.type==='bush'?1.70:item.type==='grass'?1.28:1.06))continue;
  if(item.type==='bush'||item.type==='flower'||item.type==='fern'){
   // Evitar que a base da planta afunde em barrancos de grande inclinação.
   const rr=item.type==='bush'?.24:.12;
   const slopes=[[rr,0],[-rr,0],[0,rr],[0,-rr]]
    .map(([u,v])=>terrainContact(x+u,z+v));
   if(Math.max(...slopes)-Math.min(...slopes)>.31)continue;
   const tooClose=forestInstances.some(a=>{
    const distance=Math.hypot(a.x-x,a.z-z);
    if(a.type==='tree'||a.type==='pine')return distance<
     (item.type==='bush'?.72:.39)+(a.crownWidth||2.8)*.19;
    return (a.type==='bush'||a.type==='flower'||a.type==='fern')&&
     distance<(item.type==='bush'?.75:.29);
   });
   if(tooClose)continue;
  }
  const factor=.78+randomForest()*.52;
  const desired=item.height*factor;
  const scaleMultiplier=desired/h,rot=randomForest()*Math.PI*2;
  // O FBX já inclui sua conversão de eixo e sua escala no nó original.
  // Inserir a raiz sob um pivô de chão impede que a rotação de vento
  // transforme uma origem deslocada em uma árvore flutuando.
  const obj=new T.Group(),correction=new T.Group(),visualRoot=root.clone(true);
  obj.name='Raiz no chão '+item.name;
  correction.name='Correção de orientação '+item.name;
  correction.quaternion.copy(arcanoStraightenSpecies(item,root,orientation.quaternion));
  correction.add(visualRoot);
  if(item.type==='grass'){
   // Cada instância é uma moita de quatro peças GLTF/FBX originais.
   for(let stem=0;stem<3;stem++){
    const tuft=root.clone(true),a=stem*2.39996;
    tuft.position.x+=Math.cos(a)*.16;
    tuft.position.z+=Math.sin(a)*.16;
    tuft.rotation.y+=a;
    tuft.scale.multiplyScalar(.72+randomForest()*.24);
    correction.add(tuft);
   }
  }
  obj.add(correction);
  obj.position.set(x,0,z);
  obj.rotation.y=rot;
  obj.scale.setScalar(scaleMultiplier);
  obj.updateMatrixWorld(true);
  const worldBox=new T.Box3().setFromObject(obj);
  if(!Number.isFinite(worldBox.min.y)||!Number.isFinite(worldBox.max.y))continue;
  // O fuste da árvore com copa vermelha/laranja fica perpendicular ao solo.
  // Rotação de vento é aplicada SOMENTE ao pivô de chão, não à pose FBX.
  const projected=Math.max(worldBox.max.x-worldBox.min.x,worldBox.max.z-worldBox.min.z);
  // A exclusão pelo centro não bastava: arbustos largos e moitas
  // invadiam a pista. Verificar o raio REAL da geometria já dimensionada
  // e deixar espaço para a curva e para as bordas da estrada fixa.
  if(item.type==='bush'||item.type==='flower'||item.type==='fern'||item.type==='grass'){
   const radius=projected*.55+(item.type==='bush'?.48:.22);
   const margin=item.type==='bush'?1.22:1.10;
   if(pathDistance<margin+radius)continue;
   // Verifica a curvatura do centro do caminho sob as extremidades da copa.
   const rx=Math.min(radius,2.4);
   const leftX=x-rx,rightX=x+rx;
   const leftCenter=.92-.70*Math.sin(leftX*.47+.6)+.17*Math.sin(leftX*1.34);
   const rightCenter=.92-.70*Math.sin(rightX*.47+.6)+.17*Math.sin(rightX*1.34);
   if(Math.abs(z-leftCenter)<margin+radius*.72||
      Math.abs(z-rightCenter)<margin+radius*.72)continue;
  }
  // Importações com conversão de eixo inadequada geram toras horizontais
  // gigantes no lugar de árvores: não as espalhar pela cena.
  if((item.type==='tree'||item.type==='pine')&&projected>desired*2.35)continue;
  // Evita que troncos, galhos compridos e árvores de espécies distintas sejam
  // distribuídos no mesmo ponto, parecendo madeira suspensa/desconectada.
  // Só afeta a escolha do local das árvores: nenhum modelo é modificado.
  if(item.type==='tree'||item.type==='pine'){
   const radius=clamp(projected*.32,.90,1.70);
   const collision=forestInstances.some(a=>{
    if(a.type!=='tree'&&a.type!=='pine')return false;
    const otherRadius=clamp((a.crownWidth||2.8)*.32,.90,1.70);
    const gap=(a.x-x)*(a.x-x)+(a.z-z)*(a.z-z);
    // Somar os raios das duas copas impede interpenetração visual.
    // Copas podem tocar as bordas, mas não ocupar o mesmo tronco.
    return gap<Math.pow(radius+otherRadius,2);
   });
   if(collision)continue;
  }
  const contactY=supportHeight(item.type,x,z,projected);
  const embed=item.type==='rock'?
   clamp(desired*.14,.045,.17):
   item.type==='tree'||item.type==='pine'?.065:.023;
  const anchor={obj,x,z,y:contactY,contactY,localBottom:0,embed,orientationNode:correction,
   rotation:rot,baseScale:obj.scale.y,fullScale:obj.scale.clone(),baseRx:0,baseRz:0,
   pack:item.pack||'mega',type:item.type,phase:randomForest()*Math.PI*2,
   qualityRank:randomForest(),modelName:item.name,crownWidth:projected};
  snapForestToGround(anchor);
  if(item.type==='tree'||item.type==='pine'||item.type==='bush'){
   obj.updateMatrixWorld(true);
   const crown=new T.Box3().setFromObject(obj);
   anchor.dropY=crown.max.y;
  }
  obj.traverse(o=>{
   if(!o.isMesh)return;
   o.castShadow=!mobile&&(item.type==='tree'||item.type==='pine')&&created<4;
   o.receiveShadow=false;
   const materials=Array.isArray(o.material)?o.material:[o.material];
   for(const mat of materials)if(mat){
    const isLeaf=mat.userData?.arcanoMaterialType==='leaf';
    mat.side=isLeaf?T.DoubleSide:T.FrontSide;
    mat.roughness=1;mat.metalness=0;
   }
  });
  forestGroup.add(obj);
  forestInstances.push(anchor);
  created++;
 }
}
// Texturas de troncos, cascas e rochas são pintadas procedurais compactas.
// O Ultimate original usa mapas de casca muito pesados (até ~23MB cada),
// evitados aqui para manter o navegador Android responsivo.
// Substitutos painterly de 512px (antes 128px). Alta pode usar os mapas
// oficiais do Ultimate; Equilibrada conserva um material bem definido offline.
function materialCanvas(base,accent,asCanvas=false){
 const c=document.createElement('canvas');c.width=c.height=512;
 const ctx=c.getContext('2d'),rng=rand(base==='#898e83'?4721:3916);
 const bark=base!=='#898e83';
 ctx.fillStyle=base;ctx.fillRect(0,0,512,512);
 for(let i=0;i<(bark?1700:1150);i++){
  const x=rng()*512,y=rng()*512;
  const stroke=bark?(4+rng()*83):(2+rng()*23);
  ctx.globalAlpha=.048+rng()*.19;
  ctx.strokeStyle=i%4===0?'#394b3f':accent;
  ctx.lineWidth=.65+rng()*(bark?3.2:5.0);
  ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x,y);
  if(bark){
   const drift=(rng()-.5)*9;
   ctx.bezierCurveTo(x+drift,y+stroke*.25,x-drift,y+stroke*.74,
                     x+(rng()-.5)*11,y+stroke);
  }else ctx.quadraticCurveTo(x+(rng()-.5)*14,y+stroke*.38,x+stroke*.63,y+stroke*.52);
  ctx.stroke();
 }
 // Grão fino e microfissuras dão leitura aos troncos de perto sem ruído agressivo.
 for(let i=0;i<2100;i++){
  const x=rng()*512,y=rng()*512,rad=.2+rng()*1.2;
  ctx.globalAlpha=.065+rng()*.12;ctx.fillStyle=rng()>.5?accent:'#564e44';
  ctx.fillRect(x,y,rad,bark?rad*(1+rng()*3.5):rad);
 }
 ctx.globalAlpha=1;return asCanvas?c:c.toDataURL('image/png');
}
// Mesma textura painterly 512px já usada pelo fallback FBX no projeto.
// Três tonalidades naturais, com UV e mipmaps do modelo original intactos.
const arcanoTreeBarkCache=new Map();
function arcanoTreeBarkTexture(name){
 const key=/birch/i.test(name)?'birch':/pine/i.test(name)?'pine':'brown';
 if(arcanoTreeBarkCache.has(key))return arcanoTreeBarkCache.get(key);
 const palette=key==='birch'?['#b1a594','#564f47']:
  key==='pine'?['#634c38','#ae8b69']:['#79624b','#b19a78'];
 const tex=new T.CanvasTexture(materialCanvas(palette[0],palette[1],true));
 tex.name='Atelie Arcano · casca '+key+' · 512px';
 tex.colorSpace=T.SRGBColorSpace;
 tex.wrapS=tex.wrapT=T.RepeatWrapping;
 tex.magFilter=T.LinearFilter;
 tex.minFilter=T.LinearMipmapLinearFilter;
 tex.anisotropy=QUALITY_PRESETS[graphicsQuality].anisotropy;
 tex.generateMipmaps=true;
 arcanoTreeBarkCache.set(key,tex);return tex;
}
function modelTextureManager(Module){
 const manager=new Module.LoadingManager();
 const bark=materialCanvas('#79624b','#b19a78');
 const stone=materialCanvas('#898e83','#bdc4b5');
 const textures={
  birchtree_leaves:'BirchTree_Leaves.png',
  mapletree_leaves:'MapleTree_Leaves.png',
  normaltree_leaves:'NormalTree_Leaves.png',
  pinetree_leaves:'PineTree_Leaves.png',
  bush_leaves:'Bush_Leaves.png',
  flowers:'Flowers.png',grass:'Grass.png'
 };
 manager.setURLModifier(url=>{
  const file=decodeURIComponent(url.split('?')[0]).replace(/\\/g,'/').split('/').pop()||'';
  const key=file.replace(/\.(png|jpg|jpeg|tga|bmp)$/i,'').toLowerCase();
  if(/(bark|trunk|wood|rock|stone)/.test(key))return /(rock|stone)/.test(key)?stone:bark;
  const filename=textures[key];
  if(filename)return new URL('./assets/ultimate/'+filename,document.baseURI).href;
  return url;
 });
 return manager;
}
// V12.28: usa as geometrias de pedras fornecidas, preservando os volumes
// rockSolids já empregados por chuva, impacto, solo e escoamento.
function registerImportedRock(item,root){
 if(item.type!=='rock')return;
 importedRockModels.push({item,root});
 rebuildImportedRocks();
}
// Variação de pigmentos minerais — materiais leves e reutilizáveis.
const rockVariantMaps=[];
function rockSurfaceVariant(id){
 if(rockVariantMaps[id])return rockVariantMaps[id];
 const colors=[
  ['#767a71','#91988d','#4a554e','#ada99b'],
  ['#847b70','#a89c89','#58514a','#c1b49d'],
  ['#5e6663','#838a83','#414e4a','#adb3aa'],
  ['#777361','#a39b80','#575443','#c4b9a4'],
  ['#69675f','#8e897c','#464943','#b9b4a2'],
  ['#727d75','#8a9992','#455a53','#c0c1ae']
 ][id%6];
 const c=document.createElement('canvas');c.width=c.height=384;
 const ctx=c.getContext('2d'),r=rand(4153+id*1013);
 ctx.fillStyle=colors[0];ctx.fillRect(0,0,384,384);
 for(let i=0;i<4900;i++){
  const x=r()*384,y=r()*384,d=.5+r()*6.5;
  ctx.fillStyle=colors[Math.floor(r()*colors.length)];
  ctx.globalAlpha=.12+r()*.36;
  ctx.beginPath();ctx.ellipse(x,y,d*(.4+r()),d*(.3+r()),r()*6.28,0,6.28);ctx.fill();
 }
 ctx.globalAlpha=1;
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
 map.wrapS=map.wrapT=T.RepeatWrapping;
 map.repeat.set(1.0+(id%3)*.31,1.08+(id%2)*.44);
 map.anisotropy=mobile?2:4;rockVariantMaps[id]=map;return map;
}
function rebuildImportedRocks(){
 if(!importedRockModels.length)return;
 importedStoneVisuals.traverse(o=>{
  if(!o.isMesh)return;
  const mats=Array.isArray(o.material)?o.material:[o.material];
  for(const mat of mats)if(mat?.userData?.arcanoRockInstance)mat.dispose();
 });
 importedStoneVisuals.clear();
 const safe=new T.Box3(),size=new T.Vector3();
 const placed=[];
 for(let i=0;i<rocks.length;i++){
  const [x,z,r]=rocks[i],seeded=rand(5839+i*7603);
  // Rochas volumosas jamais ocupam a faixa pisoteada já existente.
  // Não mover as rochas físicas (que afetam água/erosão) sem recalcular
  // hidrologia; omitir somente a geometria que conflita com o caminho.
  const roadZ=.92-.70*Math.sin(x*.47+.6)+.17*Math.sin(x*1.34);
  if(Math.abs(z-roadZ)<Math.max(.86,r*.92+.30))continue;
  const selected=importedRockModels[(i*7+Math.floor(seeded()*11))%importedRockModels.length];
  const visual=selected.root.clone(true);
  visual.name='Pedra original '+selected.item.name+' / variação '+(i+1);
  visual.position.set(0,0,0);
  visual.rotation.set((seeded()-.5)*.33,seeded()*6.283,(seeded()-.5)*.31);
  visual.scale.setScalar(1);visual.updateMatrixWorld(true);
  safe.setFromObject(visual);safe.getSize(size);
  const scalar=clamp((r*1.9)/Math.max(.0001,size.x,size.z),.03,12)*
    (.66+seeded()*.79);
  visual.scale.set(
   scalar*(.79+seeded()*.65),
   scalar*(.45+seeded()*.74),
   scalar*(.75+seeded()*.74)
  );
  visual.updateMatrixWorld(true);safe.setFromObject(visual);
  if(!Number.isFinite(safe.min.y))continue;
  visual.position.set(x,terrainContact(x,z)-safe.min.y-.05*r,z);
  const variant=i%6;
  visual.traverse(obj=>{
   if(!obj.isMesh)return;
   obj.castShadow=!mobile;obj.receiveShadow=true;
   const original=Array.isArray(obj.material)?obj.material:[obj.material];
   const mats=original.map(mat=>{
    if(!mat)return mat;
    const m=mat.clone();
    m.userData={...mat.userData,arcanoRockInstance:true};
    m.map=rockSurfaceVariant(variant);
    m.color.set('#dfded7');
    m.metalness=0;m.roughness=1;m.side=T.FrontSide;m.needsUpdate=true;
    return m;
   });
   obj.material=Array.isArray(obj.material)?mats:mats[0];
  });
  importedStoneVisuals.add(visual);placed.push(visual);
 }
 if(placed.length){
  proceduralStoneVisuals.visible=false;importedStoneVisuals.visible=true;
  if(typeof reflectionAge!=='undefined')reflectionAge=999;
  console.info('[Arcano V12.30] Rochas originais variadas:',
   placed.length,importedRockModels.map(x=>x.item.name).join(', '));
 }
}
// V12.30 — Bancada de revisão in situ para TODAS as espécies não minerais.
// É uma cópia temporária fora da distribuição, não altera a floresta original.
let assetTestPlacementMode=false;
const assetTestGroup=new T.Group();
assetTestGroup.name='Bancada temporária de revisão de modelos';
scene.add(assetTestGroup);
let assetTestActor=null,assetTestAnchor=null,assetTestMarker=null;
function assetTestMessage(message){
 if($('assetTestStatus'))$('assetTestStatus').textContent=message;
}
function setupAssetTest(){
 const select=$('assetTestSelect');if(!select)return;
 select.textContent='';
 for(const item of FOREST_MODELS){
  if(item.type==='rock')continue;
  const option=document.createElement('option');
  option.value=item.name;
  const labels={tree:'Árvore',pine:'Pinheiro',bush:'Arbusto',
   flower:'Flores',fern:'Samambaia',grass:'Grama'};
  option.textContent=(labels[item.type]||item.type)+' · '+item.name+
   ' ('+(item.pack==='mega'?'MegaKit':'Ultimate')+')';
  select.appendChild(option);
 }
 select.value='MapleTree_3';
 select.addEventListener('change',()=>{
  const available=!!forestModels[select.value];
  assetTestMessage(available?'Pronto para testar: '+select.value:
   'Aguardando carregamento do modelo '+select.value);
 });
 $('assetTestPlace')?.addEventListener('click',()=>placeAssetTest(select.value));
 $('assetTestChoosePosition')?.addEventListener('click',()=>{
  assetTestPlacementMode=true;
  assetTestMessage('Toque no terreno para posicionar a amostra: '+select.value);
  $('collapseControls')?.click();
 });
 $('assetTestNext')?.addEventListener('click',()=>{
  if(!select.options.length)return;
  select.selectedIndex=(select.selectedIndex+1)%select.options.length;
  placeAssetTest(select.value);
 });
 $('assetTestRemove')?.addEventListener('click',removeAssetTest);
 $('assetTestIsolate')?.addEventListener('change',()=>applyAssetTestIsolation());
}
function applyAssetTestIsolation(){
 if(!assetTestActor)return;
 forestGroup.visible=!!floraWanted&&!$('assetTestIsolate')?.checked;
}
function removeAssetTest(){
 assetTestPlacementMode=false;
 if(assetTestMarker){assetTestMarker.geometry.dispose();assetTestMarker.material.dispose();}
 assetTestGroup.clear();
 assetTestActor=null;assetTestAnchor=null;assetTestMarker=null;
 forestGroup.visible=!!floraWanted;
 assetTestMessage('Amostra removida. Floresta original restaurada.');
 if(typeof reflectionAge!=='undefined')reflectionAge=999;
}
function placeAssetTest(name,at=null){
 assetTestPlacementMode=false;
 const item=FOREST_MODELS.find(x=>x.name===name);
 const root=forestModels[name];
 if(!item||item.type==='rock'){assetTestMessage('Espécie não encontrada.');return;}
 if(!root){
  assetTestMessage('Modelo '+name+' ainda não carregado. Confira a conexão e tente novamente.');
  return;
 }
 if(assetTestMarker){assetTestMarker.geometry.dispose();assetTestMarker.material.dispose();}
 assetTestGroup.clear();assetTestActor=null;assetTestMarker=null;
 const orientation=arcanoBestOrientation(item,root);
 const diagnostic=!orientation;
 const orient=orientation||{
  quaternion:new T.Quaternion(),
  height:new T.Box3().setFromObject(root).getSize(new T.Vector3()).y||1
 };
 const placed=new T.Group(),correction=new T.Group(),clone=root.clone(true);
 const x=clamp(at?.x??5.15,-W*.5+.55,W*.5-.55);
 const z=clamp(at?.z??-5.4,-L*.5+.55,L*.5-.55);
 const groundY=terrainContact(x,z);
 placed.name='Amostra temporária '+name;
 correction.quaternion.copy(arcanoStraightenSpecies(item,root,orient.quaternion));
 correction.add(clone);placed.add(correction);
 const scale=item.height/Math.max(.01,orient.height);
 placed.scale.setScalar(scale);placed.position.set(x,0,z);
 assetTestGroup.add(placed);
 const anchor={obj:placed,orientationNode:correction,x,z,contactY:groundY,
  crownWidth:item.height,embed:item.type==='tree'||item.type==='pine'?.025:.008,
  type:item.type,pack:item.pack,modelName:name};
 snapForestToGround(anchor);
 placed.traverse(obj=>{
  if(obj.isMesh){obj.castShadow=true;obj.receiveShadow=false;}
 });
 // O círculo marca a posição correta do solo e permanece fixo.
 const marker=new T.Mesh(new T.RingGeometry(.36,.43,44),
  new T.MeshBasicMaterial({color:'#6ccfa7',transparent:true,
   opacity:.92,side:T.DoubleSide,depthWrite:false}));
 marker.rotation.x=-Math.PI/2;marker.position.set(x,groundY+.025,z);
 marker.renderOrder=8;assetTestGroup.add(marker);
 placed.updateMatrixWorld(true);
 const foot=item.type==='tree'||item.type==='pine'?
  arcanoTrunkRootPoint(placed):null;
 const baseY=foot?.y??arcanoPlantBaseY(placed,anchor);
 const error=Number.isFinite(baseY)?baseY-groundY:NaN;
 if(!Number.isFinite(error)||Math.abs(error)>.17)marker.material.color.set('#f0ac67');
 const bounds=new T.Box3().setFromObject(placed),dimensions=new T.Vector3();
 bounds.getSize(dimensions);
 assetTestActor=placed;assetTestAnchor=anchor;assetTestMarker=marker;
 applyAssetTestIsolation();
 // Direcionar a câmera para a amostra: fácil comparar arbustos pequenos.
 target.set(x,groundY+Math.min(2.0,dimensions.y*.43),z);
 radius=clamp(item.height*2.8+4.5,6.7,15.0);pitch=.68;yaw=.83;
 setView();reflectionAge=999;
 const result=!Number.isFinite(error)?'base não identificada':
  'diferença base/solo '+(error>=0?'+':'')+error.toFixed(3)+' m';
 assetTestMessage((diagnostic?'⚠ Orientação rejeitada na floresta · ':'')+
  name+' · '+result+' · marcador '+((Math.abs(error)<=.17)?'verde':'laranja')+
  ' · use Próximo modelo para revisar todas as espécies.');
}
setupAssetTest();
function setForestCollection(value){
 forestCollection=['mixed','mega','ultimate'].includes(value)?value:'mixed';
 applyForestVisibility();
 if($('forestPack'))$('forestPack').value=forestCollection;
 if(typeof reflectionAge!=='undefined')reflectionAge=999;
 forestStatus('visual '+(forestCollection==='mixed'?'combinado':forestCollection));
}
async function loadPainterlyForest(){
 if($('floraToggle'))$('floraToggle').checked=true;
 try{
  const Module=await import('https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js');
  const api=await import('https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/GLTFLoader.js');
  const loader=new api.GLTFLoader();
  let fbxLoader=null;
  try{
   const fb=await import('https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/FBXLoader.js');
   fbxLoader=new fb.FBXLoader(modelTextureManager(Module));
  }catch(err){
   console.warn('[Arcano] FBXLoader indisponível. MegaKit continua ativo:',err);
  }
  let ok=0;
  for(const item of FOREST_MODELS){
   if(!floraWanted&&mobile)break; // usuário pode desistir no celular
   try{
    let model;
    if(item.pack==='ultimate'){
     if(!fbxLoader)continue;
     model=await fbxLoader.loadAsync('./assets/ultimate/'+item.name+'.fbx');
    }else{
     const doc=await loader.loadAsync('./assets/quaternius/'+item.name+'.gltf');
     model=doc.scene;
    }
    await arcanoRepairForestMaterials(item,model);
    forestModels[item.name]=model;
    if(item.type!=='rock')registerWetForestMaterials(model);
    registerForestMaterial(item,model);
    placeForestModel(item,model);
    ok++;floraLoaded=ok;
    if(item.pack==='ultimate')ultimateModelsLoaded++;else megaModelsLoaded++;
    forestStatus('carregando '+ok+'/'+FOREST_MODELS.length);
   }catch(err){console.warn('[Arcano] Modelo indisponível:',item.name,err);}
   // Cede processamento ao navegador para a interface continuar acessível.
   if(ok%3===0)await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  if(ok===0)throw new Error('Nenhum modelo de vegetação foi carregado');
  setFloraVisible(floraWanted);
  setForestCollection(forestCollection);
  updateForestHealth();
  setGraphicsQuality(graphicsQuality);
  if(typeof reflectionAge!=='undefined')reflectionAge=999;
  forestStatus('floresta carregada ('+forestInstances.length+' objetos)');
 }catch(err){
  console.warn('[Arcano] Usando a vegetação original:',err);
  forestGroup.visible=false;grass.visible=false;meadowMesh.visible=false;
  grass.count=0;meadowMesh.count=0;sproutGroup.visible=true;
  floraWanted=false;forestStatus('fallback: vegetação clássica');
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
  // Sem alterações de biomassa ou escala, não reconstruir matrizes nem
  // posicionamento de milhares de plantas; nenhuma mudança visual.
  if(a.lastHealthFactor===factor)continue;
  a.obj.scale.copy(a.fullScale).multiplyScalar(factor);
  snapForestToGround(a);
  a.lastHealthFactor=factor;
 }
 applyForestVisibility();
}
function animateForest(dt){
 const t=visualTime;
 const gust=(Math.sin(t*.83+Math.sin(t*.21)*1.7)+
             .45*Math.sin(t*2.11+.75))*.5;
 const weatherMin=climate==='storm'?.7:climate==='overcast'?.25:0;
 const actualWind=Math.max(atmWindMean,weatherMin*windUserPower/70);
 const strength=clamp(actualWind/2.4,0,1.2);
 leafWindUniforms.time.value=t;
 leafWindUniforms.power.value=.006+strength*.13;
 leafWindUniforms.gust.value=gust*strength;
 leafWindUniforms.direction.value.set(Math.cos(atmWindHeading),0,
   Math.sin(atmWindHeading)).normalize();
 waterM.uniforms.uWind.value=clamp(strength,0,1.2);
 skyM.uniforms.uWind.value=clamp(strength,0,1.2);
 if(!forestGroup.visible)return;
 for(const a of forestInstances){
  // Árvores fora do alcance ou de qualidade escolhida continuam presentes
  // no mapa, mas não precisam atualizar os pivôs de vento a cada quadro.
  if(a.type==='rock'||!a.obj.visible)continue;
  if(a.windRevision!==atmWindRevision){
   const wx=fieldAt(atmWindX,a.x,a.z),wz=fieldAt(atmWindZ,a.x,a.z);
   const magnitude=Math.hypot(wx,wz);
   a.windX=wx;a.windZ=wz;
   a.windLocalStrength=clamp(magnitude/2.4,0,1.2);
   a.windInverse=1/Math.max(.015,magnitude);
   a.windRevision=atmWindRevision;
  }
  // A onda continua animada em TODOS os quadros, sem perda de movimento.
  const wave=.72+.28*Math.sin(t*(.84+a.windLocalStrength)+a.phase);
  const sway=(.002+.024*a.windLocalStrength)*(.8+.2*gust)*wave;
  a.obj.rotation.z=a.baseRz+sway*a.windX*a.windInverse;
  a.obj.rotation.x=a.baseRx-sway*a.windZ*a.windInverse;
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
  uPlanar:{value:null},uPlanarMatrix:{value:new T.Matrix4()},uPlanarReady:{value:0},uMirrorY:{value:0},
  uReflect:{value:0},uDualProbes:{value:0},
  uProbeA:{value:new T.Vector2(basins[1].x,basins[1].z)},
  uProbeB:{value:new T.Vector2(basins[0].x,basins[0].z)},
  uSun:{value:skySunDir},
  uSunPower:{value:.8},uCloudiness:{value:.43},uWind:{value:.35},
  uWeatherReflect:{value:.92},uWeatherTint:{value:new T.Color('#a1c7d0')}
 },
 vertexShader:"precision highp float;\nattribute float waterDepth;attribute float mudAmount;attribute vec2 waterFlow;uniform float uTime,uWind;\nvarying vec3 vWorld;varying float vDepth;varying float vMud;varying vec2 vSlope;varying float vMovement;\nvoid main(){\n vec3 p=position;vDepth=waterDepth;vMud=mudAmount;\n float motion=clamp(length(waterFlow)*3.0+uWind*.38,0.0,1.0);vMovement=motion;\n float amp=(.0018+.018*motion)*smoothstep(.006,.065,waterDepth);\n float a=p.x*3.5+p.z*1.4-uTime*(1.2+1.9*motion);\n float b=p.z*5.1-p.x*1.7+uTime*(1.5+1.6*motion);\n p.y+=(sin(a)*.64+cos(b)*.36)*amp;\n vSlope=vec2((cos(a)*3.5*.64+sin(b)*1.7*.36)*amp,(cos(a)*1.4*.64-sin(b)*5.1*.36)*amp);\n vec4 w=modelMatrix*vec4(p,1.0);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;\n}",fragmentShader:"precision highp float;\nuniform float uTime;uniform samplerCube uEnv;uniform samplerCube uEnv2;\nuniform sampler2D uPlanar;\nuniform mat4 uPlanarMatrix;\nuniform float uPlanarReady,uMirrorY;\nuniform float uReflect,uDualProbes,uSunPower,uCloudiness,uWind,uWeatherReflect;\nuniform vec2 uProbeA,uProbeB;\nuniform vec3 uSun,uWeatherTint;\nvarying vec3 vWorld;varying float vDepth;varying float vMud;varying vec2 vSlope;varying float vMovement;\nvoid main(){\n float irregular=.0018*sin(vWorld.x*4.2+vWorld.z*3.7)+.0011*sin(vWorld.x*10.3-vWorld.z*7.4);\n float alpha=smoothstep(.002,.017,vDepth-.0045+irregular);if(alpha<.025)discard;\n float shallow=clamp((vDepth-.006)/.054,0.,1.),deep=clamp((vDepth-.055)/.175,0.,1.);\n float abyss=clamp((vDepth-.21)/.28,0.,1.);\n vec3 color=mix(vec3(.40,.89,.85),vec3(.12,.73,.80),shallow);\n color=mix(color,vec3(.025,.40,.62),deep);\n color=mix(color,vec3(.012,.17,.35),abyss*.85);\n float dirty=clamp(vMud*.86,0.,.90);\n color=mix(color,vec3(.48,.29,.14),dirty);\n float rim=(1.-smoothstep(.004,.027,vDepth))*(1.-dirty*.85);\n color=mix(color,vec3(.71,.96,.91),rim*.28);\n vec2 tiny=vec2(sin(vWorld.x*6.1+vWorld.z*3.8-uTime*(1.3+uWind))+\n cos(vWorld.z*11.2-uTime*(1.6+uWind)),\n cos(vWorld.z*6.8-vWorld.x*3.4+uTime*(1.+uWind))+\n sin(vWorld.x*10.5+uTime*(1.4+uWind)));\n float breeze=.020+.055*vMovement+.026*uWind;\n vec3 n=normalize(vec3(-vSlope.x-tiny.x*breeze,1.,-vSlope.y-tiny.y*breeze));\n vec3 viewDir=normalize(cameraPosition-vWorld);\n float fresnel=pow(1.-clamp(dot(n,viewDir),0.,1.),2.1);\n vec3 ray=reflect(-viewDir,n);\n vec3 reflected=textureCube(uEnv,ray).rgb;\n // Segunda sonda posicionada numa depressão diferente: melhora a parallax aproximada.\n vec3 second=textureCube(uEnv2,ray).rgb;\n float d1=length(vWorld.xz-uProbeA),d2=length(vWorld.xz-uProbeB);\n float blend=uDualProbes*smoothstep(-1.4,1.4,d1-d2);\n reflected=mix(reflected,second,blend);\n // Espelho planar projetado do ponto de vista real.\n vec4 projected=uPlanarMatrix*vec4(vWorld,1.0);\n vec2 projUV=projected.xy/max(projected.w,.0001)*.5+.5;\n projUV+=tiny*(.00065+.0016*uWind);\n float valid=step(.005,projUV.x)*step(projUV.x,.995)*step(.005,projUV.y)*step(projUV.y,.995)*step(.01,projected.w);\n float heightMatch=exp(-abs(vWorld.y-uMirrorY)*.38);\n vec3 mirrored=texture2D(uPlanar,clamp(projUV,vec2(.005),vec2(.995))).rgb;\n reflected=mix(reflected,mirrored,clamp(uPlanarReady*valid*heightMatch,0.,1.));\n reflected=mix(reflected,uWeatherTint,.045+.065*uCloudiness);\n float roughness=clamp(vMovement*.75+uWind*.16,0.,1.);\n float reflectMix=uReflect*uWeatherReflect*(.14+.53*fresnel)*\n                  (1.-dirty*.72)*(1.-roughness*.22);\n color=mix(color,reflected,clamp(reflectMix,0.,.63));\n float sun=pow(max(dot(reflect(-normalize(uSun),n),viewDir),0.),52.);\n float waveA=sin(vWorld.x*13.7+vWorld.z*9.2-uTime*2.6);\n float waveB=sin(vWorld.z*17.3-vWorld.x*6.9+uTime*2.2);\n float crest=smoothstep(.24,.78,waveA*.60+waveB*.40);\n float sparkle=(.035*crest+.36*sun*uSunPower*(1.-uCloudiness*.60))*\n               (.75+.25*shallow)*(1.-dirty*.70);\n float travel=sin(dot(vWorld.xz,normalize(vec2(.81,.59)+vSlope*.20))*4.4-uTime*(.65+uWind*1.6));\n float broad=(.5+.5*travel)*(.07+.12*vMovement);\n color=mix(color,vec3(.36,.72,.76),clamp(broad,0.,.19));\n color=mix(color,vec3(.81,1.,.97),clamp(sparkle,0.,.30));\n gl_FragColor=vec4(color,alpha*(.83+.14*deep));\n}"
});
const water=new T.Mesh(waterG,waterM);water.frustumCulled=false;water.renderOrder=3;
water.name='Água V12.27 · reflexos alinhados ao cenário';scene.add(water);
// Render target da câmera espelhada; preserva os cubemaps existentes como fallback.
const planarRT=new T.WebGLRenderTarget(mobile?640:1024,mobile?512:768,{
 generateMipmaps:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter,
 format:T.RGBAFormat,depthBuffer:true
});
const mirrorCamera=new T.PerspectiveCamera(camera.fov,camera.aspect,camera.near,camera.far);
const mirrorLook=new T.Vector3(),mirrorDirection=new T.Vector3();
const mirrorPlane=new T.Plane(new T.Vector3(0,1,0),0);
waterM.uniforms.uPlanar.value=planarRT.texture;
const foamLimit=mobile?120:220,foamObj=new T.Object3D();
const foamMesh=new T.InstancedMesh(new T.PlaneGeometry(.060,.027),
 new T.MeshBasicMaterial({color:'#e2d5bb',transparent:true,opacity:.60,side:T.DoubleSide,depthWrite:false}),foamLimit);
foamMesh.count=0;foamMesh.frustumCulled=false;foamMesh.renderOrder=5;scene.add(foamMesh);
const foamClean=new T.Color('#c6f3e9'),foamDirty=new T.Color('#a48a69'),foamTintScratch=new T.Color();
let reflectionAge=999,reflectionFrames=0,reflectionsOn=true,reflectionReady=false,reflection2Ready=false;
let reflectionTurn=0;
// V12.53: consultar apenas os blocos onde a água realmente existe.
// AABB propositalmente folgada evita descartar um reflexo visível.
const REFLECT_CELL_BLOCK=10;
const reflectCols=Math.ceil(NX/REFLECT_CELL_BLOCK);
const reflectRows=Math.ceil(NZ/REFLECT_CELL_BLOCK);
const reflectWetBlocks=new Uint8Array(reflectCols*reflectRows);
const reflectFrustum=new T.Frustum(),reflectMatrix=new T.Matrix4();
const reflectBox=new T.Box3();
function anyVisibleReflectiveWater(){
 if(!water.visible)return false;
 camera.updateMatrixWorld(true);
 reflectFrustum.setFromProjectionMatrix(
  reflectMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
 for(let bz=0;bz<reflectRows;bz++)for(let bx=0;bx<reflectCols;bx++){
  if(!reflectWetBlocks[bz*reflectCols+bx])continue;
  const minX=-W*.5+bx*REFLECT_CELL_BLOCK*dx-.7;
  const maxX=-W*.5+Math.min(NX-1,(bx+1)*REFLECT_CELL_BLOCK)*dx+.7;
  const minZ=-L*.5+bz*REFLECT_CELL_BLOCK*dz-.7;
  const maxZ=-L*.5+Math.min(NZ-1,(bz+1)*REFLECT_CELL_BLOCK)*dz+.7;
  reflectBox.min.set(minX,-12,minZ);
  reflectBox.max.set(maxX,15,maxZ);
  if(reflectFrustum.intersectsBox(reflectBox))return true;
 }
 return false;
}
function updateReflections(dt){
 if(!reflectionsOn){waterM.uniforms.uReflect.value=0;return;}
 reflectionAge+=dt;
 const interval=mobile?(graphicsQuality==='low'?.42:.22):(graphicsQuality==='high'?.095:.18);
 if(reflectionAge<interval&&reflectionReady)return;
 // Reflexo planar custa mais uma renderização completa da cena.
 // Se nenhum pixel com água pode estar na vista atual, manter o último
 // mapa até a próxima vez que uma superfície refletora voltar ao quadro.
 if(!anyVisibleReflectiveWater())return;
 reflectionAge=0;
 camera.updateMatrixWorld(true);
 const basin=basins[1];
 const mirrorY=sample(soil,basin.x,basin.z)+
               Math.max(.025,sample(depth,basin.x,basin.z))+.018;
 const forward=camera.getWorldDirection(mirrorDirection).normalize();
 mirrorLook.copy(camera.position).addScaledVector(forward,6);
 mirrorLook.y=2*mirrorY-mirrorLook.y;
 mirrorCamera.position.copy(camera.position);
 mirrorCamera.position.y=2*mirrorY-camera.position.y;
 mirrorCamera.up.set(camera.up.x,-camera.up.y,camera.up.z);
 mirrorCamera.lookAt(mirrorLook);
 mirrorCamera.fov=camera.fov;mirrorCamera.aspect=camera.aspect;
 mirrorCamera.near=camera.near;mirrorCamera.far=camera.far;
 mirrorCamera.updateProjectionMatrix();mirrorCamera.updateMatrixWorld(true);
 waterM.uniforms.uPlanarMatrix.value.multiplyMatrices(
   mirrorCamera.projectionMatrix,mirrorCamera.matrixWorldInverse);
 waterM.uniforms.uMirrorY.value=mirrorY;
 const previous=[water.visible,foamMesh.visible,splashMesh.visible,
   halo.visible,streak.visible];
 const ringVisibility=ripplePool.map(mesh=>mesh.visible);
 const oldClipping=renderer.clippingPlanes;
 const oldTarget=renderer.getRenderTarget();
 const oldClipEnabled=renderer.localClippingEnabled;
 water.visible=false;foamMesh.visible=false;splashMesh.visible=false;
 halo.visible=false;streak.visible=false;
 ripplePool.forEach(mesh=>mesh.visible=false);
 mirrorPlane.constant=-mirrorY+.02;
 try{
  renderer.clippingPlanes=[mirrorPlane];renderer.localClippingEnabled=true;
  const targetW=Math.min(mobile?640:1024,
    Math.max(256,Math.ceil(innerWidth*(graphicsQuality==='high'?1.1:.75))));
  const targetH=Math.min(mobile?640:768,
    Math.max(256,Math.ceil(targetW*innerHeight/Math.max(innerWidth,1))));
  if(planarRT.width!==targetW||planarRT.height!==targetH)
   planarRT.setSize(targetW,targetH);
  renderer.setRenderTarget(planarRT);renderer.clear(true,true,true);
  renderer.render(scene,mirrorCamera);
  reflectionFrames++;reflectionReady=true;
  waterM.uniforms.uPlanarReady.value=1;waterM.uniforms.uReflect.value=.94;
 }catch(error){
  console.warn('[Arcano V12.27] espelho planar indisponível:',error);
  waterM.uniforms.uPlanarReady.value=0;waterM.uniforms.uReflect.value=0;
 }finally{
  renderer.setRenderTarget(oldTarget);
  renderer.clippingPlanes=oldClipping;
  renderer.localClippingEnabled=oldClipEnabled;
  [water.visible,foamMesh.visible,splashMesh.visible,
   halo.visible,streak.visible]=previous;
  ripplePool.forEach((mesh,i)=>mesh.visible=ringVisibility[i]);
 }
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
 applySoilTexture();rebuild();updateInfo(true);
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
  const outer=liquid?(.045+phase*1.24):(.005+phase*.06);
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
// Água retida nos galhos é uma reserva finita; sem chuva, pingos isolados
// voltam ao solo até que a interceptação das folhas tenha secado.
let leafDripAccumulator=0,wetBarkLeaves=0,wetMaterialTick=0,leafDripTotal=0;
const wetForestMaterials=new Set();
function registerWetForestMaterials(root){
 root.traverse(obj=>{
  if(!obj.isMesh)return;
  const materials=Array.isArray(obj.material)?obj.material:[obj.material];
  for(const mat of materials){
   if(!mat?.color)continue;
   if(!mat.userData.arcanoDryColor)mat.userData.arcanoDryColor=mat.color.clone();
   wetForestMaterials.add(mat);
  }
 });
}
function updateWetForest(dt){
 const selectedRain=level>0?Math.min(.75,rainMeters[level]*120):0;
 wetBarkLeaves=clamp(wetBarkLeaves+
  (selectedRain>0?dt*(.02+selectedRain*.11):-dt*.009),0,1);
 wetMaterialTick+=dt;
 if(wetMaterialTick<.45)return;
 wetMaterialTick=0;
 for(const mat of wetForestMaterials){
  mat.color.copy(mat.userData.arcanoDryColor).multiplyScalar(1-wetBarkLeaves*.19);
  mat.roughness=1-wetBarkLeaves*.17;
  mat.metalness=0;
 }
}
function spawnLeafDrips(dt){
 if(level!==0||wetBarkLeaves<.08)return;
 leafDripAccumulator+=dt*clamp(wetBarkLeaves*3.0,.12,3.0);
 const active=forestInstances.filter(a=>
  (a.type==='tree'||a.type==='pine'||a.type==='bush')&&a.obj.visible);
 if(!active.length)return;
 while(leafDripAccumulator>=1&&drops.length<MAX_DROPS){
  leafDripAccumulator-=1;
  let spawned=false;
  for(let tries=0;tries<9&&!spawned;tries++){
   const a=active[Math.floor(random()*active.length)];
   const i=clamp(Math.round((a.x+W*.5)/dx),0,NX-1);
   const j=clamp(Math.round((a.z+L*.5)/dz),0,NZ-1),k=idx(i,j);
   const amount=Math.min(canopy[k],.00014+.00015*random());
   if(amount<.000025)continue;
   canopy[k]-=amount;
   const pos=a.obj.position;
   const top=a.dropY||pos.y+Math.min(5,a.type==='bush'?1.1:4.0);
   drops.push({x:a.x+(random()-.5)*.43,z:a.z+(random()-.5)*.43,
    y:Math.max(terrainContact(a.x,a.z)+.45,top-.20-random()*.5),
    speed:2.1+random()*1.5,stretch:.19,fromLeaf:true,volume:amount});
   leafDripTotal++;spawned=true;
  }
  if(!spawned){leafDripAccumulator=0;break;}
 }
}
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
const MIN_RAIN_VISUAL=[0,.26,.32,.14,.08,.05];
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
 leafDripAccumulator=0;leafDripTotal=0;wetBarkLeaves=0;
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
  // Mesmo com céu parcialmente limpo, a seleção manual de garoa/fraca
 // garante precipitação real mínima; temporais continuam regionais.
 const atmospheric=physicalWeather?rainRateFromAtmos(rainField[k]):rainMeters[level];
 const weakFloor=physicalWeather&&level>0&&level<=2?rainMeters[level]*.24:0;
 const rain=Math.max(atmospheric,weakFloor)*dt;
  if(rain>0){
   const canopyCap=.007+cover[k]*.037;
   const retained=Math.min(rain*cover[k]*.55*interp,Math.max(0,canopyCap-canopy[k]));
   canopy[k]+=retained;depth[k]+=rain-retained;stats.rain+=rain*area;
  }
  const sat=clamp(soilMoisture[k]/soilCapacity[k],0,1);
  if(enableInfiltration&&depth[k]>.000001){
   const remaining=soilCapacity[k]-soilMoisture[k];
   const intake=Math.min(depth[k],Math.max(0,remaining),
     // Chuva intensa recarrega poros abertos mais depressa enquanto o solo
     // ainda tem capacidade disponível; solo encharcado continua limitado.
     permeability[k]*infiltrate*(.13+1.37*(1-sat)**1.4)*
     (1+Math.min(1.15,rainMeters[level]*125))*Math.max(.19,1.65-1.80*basinHold[k])*dt);
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
 aquiferStep(dt);
}
// Aquífero pedagógico: a percolação existente chega ao lençol, que escoa
// lentamente de cotas altas para baixas e pode alimentar nascentes em vales.
function aquiferStep(dt){
 aquiferFlux.fill(0);
 const speed=.036*dt;
 for(let j=1;j<NZ-1;j++)for(let i=1;i<NX-1;i++){
  const k=idx(i,j),store=deepWater[k];
  if(store<.000001)continue;
  const base=k*4;
  const head=soil[k]-1.15+store*1.6;
  let available=Math.min(store,.0045*dt);
  for(let n=0;n<4;n++){
   if(available<=0)break;
   const q=gridNeighbors[base+n];
   const nextHead=soil[q]-1.15+deepWater[q]*1.6;
   const transfer=Math.min(available,Math.max(0,head-nextHead)*speed*.25);
   aquiferFlux[k]-=transfer;aquiferFlux[q]+=transfer;
   available-=transfer;
  }
  // Exsudação pontual SOMENTE em solos baixos + lençol elevado + saturados.
  const lowland=soil[k]<-.23&&basinHold[k]>.38;
  const excess=deepWater[k]-.23;
  if(lowland&&excess>0&&soilMoisture[k]>.73*soilCapacity[k]){
   const spring=Math.min(Math.max(0,excess)*.005*dt,.0022*dt);
   aquiferFlux[k]-=spring;depth[k]+=spring;
  }
 }
 for(let k=0;k<size;k++)deepWater[k]=Math.max(0,deepWater[k]+aquiferFlux[k]);
}
// Reutilizar as quatro parcelas de vazão em vez de alocar um Array
// por célula molhada. Os valores são zerados antes de cada uso.
const flowTransfers=new Float64Array(4);
function flowStep(dt,multiplier){
 delta.fill(0);const speed=(.62+rainLevels[level]*.07)*dt*2.0*multiplier;
 for(let j=1;j<NZ-1;j++)for(let i=1;i<NX-1;i++){
  const k=idx(i,j),v=depth[k];if(v<.000008)continue;
  const head=soil[k]+v,base=k*4;let sum=0;
  flowTransfers[0]=flowTransfers[1]=flowTransfers[2]=flowTransfers[3]=0;
  for(let n=0;n<4;n++){const q=gridNeighbors[base+n];
   const diff=head-soil[q]-depth[q];if(diff<=0)continue;
   const resistance=(blocked[k]||blocked[q])?
       .54+.46*clamp(Math.max(v,depth[q])/.30,0,1):1;
    const amount=diff*speed*(n<2?dz/dx:dx/dz)*.38*resistance;
    flowTransfers[n]=amount;sum+=amount;
  }
  const fraction=sum>v?v/sum:1;
  for(let n=0;n<4;n++)if(flowTransfers[n]){const a=flowTransfers[n]*fraction;delta[k]-=a;delta[gridNeighbors[base+n]]+=a;}
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
// V12.53: máscaras estáticas e cor do campo calculadas uma única vez.
// Todos os valores de luz e pigmentação são os mesmos da V12.52.
const staticRoadBlend=new Float64Array(size),staticGrassRGB=new Float64Array(size*3);
for(let k=0;k<size;k++){
 const x=nx(k%NX),z=nz(Math.floor(k/NX));
 const roadZ=.92-.70*Math.sin(x*.47+.6)+.17*Math.sin(x*1.34);
 const fade=clamp(1-Math.abs(z-roadZ)/1.10,0,1);
 staticRoadBlend[k]=fade*fade*(3-2*fade);
 const meadow=biomeField(x,z);
 staticGrassRGB[k*3]=.30+meadow*.18;
 staticGrassRGB[k*3+1]=.76-meadow*.16;
 staticGrassRGB[k*3+2]=.19+meadow*.065;
}
const terrainShoreDamp=new Float64Array(size),terrainDirtyRows=new Uint8Array(NZ);
const terrainPrevDepth=new Float32Array(size),terrainPrevMoisture=new Float32Array(size);
const terrainPrevCapacity=new Float32Array(size),terrainPrevPlant=new Float32Array(size);
const terrainPrevCover=new Float32Array(size),terrainPrevRoad=new Float32Array(size);
const terrainPrevAbrasion=new Float32Array(size),terrainPrevEcoCover=new Float32Array(size);
const terrainPrevNest=new Uint8Array(size),terrainPrevDry=new Float32Array(size*3);
let terrainCacheReady=false,terrainPrevShowWet=false,terrainPrevEcoActive=false;
const terrainWetBrown=[.22,.11,.07],terrainDryPath=[.66,.49,.31],terrainMudPath=[.27,.18,.12];
function rebuild(){
 let count=0;foamCount=0;
 const eco=window.arcanoEcoV1232,ecoActive=!!eco?.active;
 const forceAll=!terrainCacheReady||terrainPrevShowWet!==showWet||
  terrainPrevEcoActive!==ecoActive;
 terrainDirtyRows.fill(forceAll?1:0);
 terrainShoreDamp.fill(0);
 reflectWetBlocks.fill(0);
 // Ler a grade física uma única vez, mantendo fluxos/águas exatos;
 // identificar linhas cujo solo mudou enquanto os dados já estão no cache.
 for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
  const k=idx(i,j),d=depth[k],x=gridX[k],z=gridZ[k],o=k*3;
  shoreField[k]=d-SURFACE_VISIBLE-
    .0017*Math.sin(x*3.9+z*4.2)-.0011*Math.sin(x*8.7-z*5.1);
  wet[k]=clamp((d-.002)/.014,0,1);
  if(d>=SURFACE_VISIBLE)count++;
  if(d>.0035)
   reflectWetBlocks[Math.floor(j/REFLECT_CELL_BLOCK)*reflectCols+
    Math.floor(i/REFLECT_CELL_BLOCK)]=1;
  const base=k*4,left=gridNeighbors[base],right=gridNeighbors[base+1];
  const up=gridNeighbors[base+2],down=gridNeighbors[base+3];
  flow[k*2]=flowXField[k]=(soil[left]+depth[left]-soil[right]-depth[right])*.6;
  flow[k*2+1]=flowZField[k]=(soil[up]+depth[up]-soil[down]-depth[down])*.6;
  const road=ecoActive?(eco.roadMask[k]||0):0;
  const abrasion=ecoActive?(eco.traffic[k]||0):0;
  const ec=ecoActive?eco.cover[k]:0;
  const nest=ecoActive?(eco.nestBareMask?.[k]||0):0;
  const depthChanged=d!==terrainPrevDepth[k];
  if(forceAll||depthChanged||
     soilMoisture[k]!==terrainPrevMoisture[k]||
     soilCapacity[k]!==terrainPrevCapacity[k]||
     soilPlant[k]!==terrainPrevPlant[k]||cover[k]!==terrainPrevCover[k]||
     road!==terrainPrevRoad[k]||abrasion!==terrainPrevAbrasion[k]||
     ec!==terrainPrevEcoCover[k]||nest!==terrainPrevNest[k]||
     dry[o]!==terrainPrevDry[o]||
     dry[o+1]!==terrainPrevDry[o+1]||
     dry[o+2]!==terrainPrevDry[o+2])terrainDirtyRows[j]=1;
  // As margens encharcadas dependem de até 2 linhas adjacentes.
  if(showWet&&depthChanged&&(d>=SURFACE_VISIBLE||
     terrainPrevDepth[k]>=SURFACE_VISIBLE))
   for(let oz=-2;oz<=2;oz++)if(j+oz>=0&&j+oz<NZ)
    terrainDirtyRows[j+oz]=1;
  terrainPrevDepth[k]=d;terrainPrevMoisture[k]=soilMoisture[k];
  terrainPrevCapacity[k]=soilCapacity[k];terrainPrevPlant[k]=soilPlant[k];
  terrainPrevCover[k]=cover[k];terrainPrevRoad[k]=road;
  terrainPrevAbrasion[k]=abrasion;terrainPrevEcoCover[k]=ec;
  terrainPrevNest[k]=nest;
  terrainPrevDry[o]=dry[o];terrainPrevDry[o+1]=dry[o+1];
  terrainPrevDry[o+2]=dry[o+2];
 }
 terrainCacheReady=true;terrainPrevShowWet=showWet;terrainPrevEcoActive=ecoActive;
 // Buscar bordas SOMENTE ao redor de células com água. Na V12.52,
 // milhares de células secas examinavam 25 vizinhos sem necessidade.
 // O máximo comutativo produz exatamente a mesma umidade de borda.
 if(showWet){
  for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
   const k=idx(i,j),h=depth[k];
   if(h<SURFACE_VISIBLE)continue;
   const intensity=clamp(h/.030,0,1);
   for(let oz=-2;oz<=2;oz++)for(let ox=-2;ox<=2;ox++){
    const tx=i+ox,tz=j+oz;
    if(tx<0||tz<0||tx>=NX||tz>=NZ)continue;
    const neighbor=idx(tx,tz);
    if(depth[neighbor]>=SURFACE_VISIBLE)continue;
    const dist=Math.hypot(ox*dx,oz*dz);
    const damp=clamp(1-dist/.82,0,1)*intensity;
    if(damp>terrainShoreDamp[neighbor])terrainShoreDamp[neighbor]=damp;
   }
  }
 }
 // Atualização LOCALIZADA das cores de terreno. Nenhuma interpolação ou
 // cor foi alterada: linhas intactas mantêm seus buffers anteriores.
 let terrainColorsChanged=false,firstDirtyRow=NZ,lastDirtyRow=-1;
 for(let j=0;j<NZ;j++){
  if(!terrainDirtyRows[j])continue;
  terrainColorsChanged=true;firstDirtyRow=Math.min(firstDirtyRow,j);lastDirtyRow=j;
  for(let i=0;i<NX;i++){
   const k=idx(i,j),o=k*3;
   const sat=clamp(soilMoisture[k]/Math.max(.001,soilCapacity[k]),0,1);
   const damp=showWet?clamp(sat*.84+wet[k]*.16,0,.95):0;
   const dark=clamp(terrainShoreDamp[k]*(.53+.25*sat),0,.72);
   const road=ecoActive?clamp(eco.roadMask[k]||0,0,1):staticRoadBlend[k];
   const abrasion=ecoActive?clamp(eco.traffic[k]||0,0,1):0;
   const effectiveCover=ecoActive?eco.cover[k]:cover[k];
   const vegetated=clamp(soilPlant[k]*.55+effectiveCover*.45,0,1.2);
   const health=clamp(vegetated*(1-abrasion)*
     (1-clamp(depth[k]/.065,0,.85)),0,1);
   const greenAmount=clamp(.36+health*.59,0,.96);
   const saturated=clamp(soilMoisture[k]/Math.max(.001,soilCapacity[k]),0,1.4);
   const mud=clamp((saturated-.20)*.90+depth[k]*6.5,0,1);
   const nestDirt=ecoActive?(eco.nestBareMask?.[k]||0)/255:0;
   const dirtAmount=clamp(Math.max(road*(.99+.08*abrasion),nestDirt*.995),0,.995);
   for(let c=0;c<3;c++){
    const ix=o+c;
    const base=dry[ix]*(1-damp)+mudRGB[c]*damp;
    // O código original grava esta camada num Float32Array ANTES da mistura verde.
    // Preservar esse arredondamento mantém exatamente os mesmos pixels.
    const soilLayer=Math.fround(base*(1-dark)+terrainWetBrown[c]*dark);
    const green=soilLayer*(1-greenAmount)+staticGrassRGB[ix]*greenAmount;
    const soilTone=terrainDryPath[c]*(1-mud)+terrainMudPath[c]*mud;
    colors[ix]=green*(1-dirtAmount)+soilTone*dirtAmount;
   }
  }
 }
 if(terrainColorsChanged){
  // A WebGLBuffer subdata cobre apenas o intervalo de linhas que mudou.
  // Quando muitas linhas mudam, o intervalo naturalmente vira a grade inteira.
  const attr=landG.attributes.color;
  attr.updateRange.offset=firstDirtyRow*NX*3;
  attr.updateRange.count=(lastDirtyRow-firstDirtyRow+1)*NX*3;
  attr.needsUpdate=true;
 }
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
  foamMesh.setColorAt(foamCount,foamTintScratch.copy(foamClean).lerp(foamDirty,clamp(turbidity[k]*1.35,0,1)));
  foamCount++;
 }
 foamMesh.count=foamCount;foamMesh.instanceMatrix.needsUpdate=true;
 if(foamMesh.instanceColor)foamMesh.instanceColor.needsUpdate=true;
}
// O solo define a cor, a altura e o número das partículas expelidas.
// Cores auxiliares reutilizadas entre impactos: cada partícula ainda recebe
// sua própria cópia e conserva exatamente a cor no restante da animação.
const waterTintBase=new T.Color('#a8c8d6'),waterTintMud=new T.Color('#907058');
const dirtTintDark=new T.Color('#584436');
const waterTintScratch=new T.Color(),dirtTintScratch=new T.Color();
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
 const waterTint=waterTintScratch.copy(waterTintBase).lerp(waterTintMud,muddy*.91);
 const dirtTint=dirtTintScratch.set(SOIL_PROFILES[SOIL_KEYS[soilKeyIndex[k]]].col);
 dirtTint.lerp(dirtTintDark,saturation*.45);
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
 updateWetForest(dt);spawnLeafDrips(dt);
 const availability=level===0?0:!physicalWeather?1:
   Math.max(MIN_RAIN_VISUAL[level],
    clamp(Math.pow(appliedRainMean/Math.max(.0000001,profile.rate),.48),0,1));
 const dropsPerSecond=(mobile?profile.dropsM:profile.dropsD)*availability;
 if(dropsPerSecond===0)spawnAcc=0;
 else spawnAcc=Math.min(MAX_DROPS,spawnAcc+Math.max(level>0?8:0,dropsPerSecond)*dt);
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
  // Partículas esparsas representam garoa; a chuva física continua
  // controlada pelo campo de precipitação da atmosfera.
  if(!accepted&&level<=2)accepted=true;
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
   if(d.fromLeaf){
    // A gota saiu da copa, não foi contabilizada como chuva nova.
    add(d.x,d.z,d.volume);
    if(displayedImpacts<3){spawnSplash(d.x,d.z,gh);displayedImpacts++;}
   }else if(displayedImpacts<([0,1,2,4,7,13][level])){
    spawnSplash(d.x,d.z,gh);displayedImpacts++;
   }
   drops[i]=drops[drops.length-1];drops.pop();
  }
 }
 const enhanced=rainStyle==='enhanced';
 streak.material.opacity=Math.max((enhanced?1:.75)*[0,.31,.43,.56,.67,.73][level],drops.some(d=>d.fromLeaf)?.42:0);
 halo.material.size=(mobile?8.0:7.3)*Math.max(.56,profile.thick);
 halo.material.opacity=Math.max([0,.19,.25,.32,.35,.39][level],drops.some(d=>d.fromLeaf)?.18:0);
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

/* V12.56: download do MESMO personagem jogável com seu esqueleto
   e animações originais embutidas no GLB (idle/walk/run). */
const GAME_CHARACTER_GLB_URL=
 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Xbot.glb';
const GAME_CHARACTER_DOWNLOAD_NAME='Atelie_Arcano_Xbot_Animado.glb';
const game={
 active:false,root:null,character:null,mixer:null,actions:{},animation:'',
 heading:Math.PI,position:new T.Vector3(),camHeading:Math.PI,camPitch:.35,camDistance:4.8,orbitPointer:null,orbitX:0,orbitY:0,
 input:{x:0,y:0,run:false},keys:new Set(),touch:false,
 elapsed:0,steps:0,loading:false,hasModel:false,openedFullscreen:false,fpsElapsed:0,fpsFrames:0
};
function gameStatus(message){
 if($('gameStatus'))$('gameStatus').textContent=message;
}
// O link aponta para o mesmo GLB carregado no jogo. O navegador recebe um
// arquivo único com malha, rig, textura e clips (não uma pose congelada).
// Se downloads via Blob forem bloqueados, o segundo toque abre o link RAW.
let gameDownloadBusy=false,gameDownloadDirectLink=false;
async function downloadAnimatedCharacter(event){
 if(gameDownloadDirectLink)return;
 event.preventDefault();
 if(gameDownloadBusy)return;
 gameDownloadBusy=true;
 const links=[$('gameDownload'),$('gameDownloadHUD')].filter(Boolean);
 const updateLabels=label=>links.forEach(link=>{
  link.textContent=label;
  link.setAttribute('aria-label',label);
 });
 updateLabels('⬇ Preparando GLB animado…');
 try{
  const response=await fetch(GAME_CHARACTER_GLB_URL,{mode:'cors'});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const buffer=await response.arrayBuffer(),view=new DataView(buffer);
  // GLB v2: cabeçalho + JSON contendo animações e esqueleto.
  if(buffer.byteLength<24||view.getUint32(0,true)!==0x46546c67||
     view.getUint32(4,true)!==2||
     view.getUint32(8,true)!==buffer.byteLength||
     view.getUint32(16,true)!==0x4e4f534a)
   throw new Error('Arquivo não é um GLB válido');
  const jsonLength=view.getUint32(12,true);
  if(jsonLength>buffer.byteLength-20)throw new Error('GLB incompleto');
  const gltf=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonLength)));
  const clips=(gltf.animations||[]).map(a=>(a.name||'').toLowerCase());
  if(!['idle','walk','run'].every(name=>clips.some(clip=>clip.includes(name))))
   throw new Error('Arquivo sem os movimentos necessários');
  const blob=new Blob([buffer],{type:'model/gltf-binary'});
  const objectURL=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=objectURL;anchor.download=GAME_CHARACTER_DOWNLOAD_NAME;
  anchor.style.display='none';document.body.appendChild(anchor);
  anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(objectURL),60000);
  updateLabels('✓ Baixar boneco 3D + animações');
 }catch(error){
  console.warn('[Arcano V12.56] Download do personagem:',error);
  gameDownloadDirectLink=true;
  // A origem raw permanece acessível no próprio href de cada link.
  updateLabels('⬇ Baixar GLB pela fonte');
  if(game.active)gameStatus('Download alternativo: toque em Baixar GLB pela fonte.');
 }finally{gameDownloadBusy=false;}
}
function gameFallback(){
 const g=new T.Group(),cloth=new T.MeshStandardMaterial({color:'#4b4e3c',roughness:1,metalness:0});
 const skin=new T.MeshStandardMaterial({color:'#ac8d71',roughness:1,metalness:0});
 const pants=new T.MeshStandardMaterial({color:'#39372f',roughness:1,metalness:0});
 function part(name,material,w,h,d,x,y,z){
  const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);
  mesh.name=name;mesh.position.set(x,y,z);g.add(mesh);return mesh;
 }
 part('corpo',cloth,.53,.66,.29,0,1.05,0);
 part('cabeça',skin,.29,.32,.29,0,1.59,0);
 const leftArm=part('braço esquerdo',cloth,.17,.63,.19,-.38,1.02,0);
 const rightArm=part('braço direito',cloth,.17,.63,.19,.38,1.02,0);
 const leftLeg=part('perna esquerda',pants,.20,.73,.24,-.14,.36,0);
 const rightLeg=part('perna direita',pants,.20,.73,.24,.14,.36,0);
 g.userData.limbs={leftArm,rightArm,leftLeg,rightLeg};
 return g;
}
async function loadGameCharacter(){
 if(game.loading||game.hasModel)return;
 game.loading=true;
 gameStatus('Carregando personagem 3D…');
 try{
  const {GLTFLoader}=await import('https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/GLTFLoader.js');
  const gltf=await new GLTFLoader().loadAsync(GAME_CHARACTER_GLB_URL);
  const model=gltf.scene;
  model.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(model),sz=box.getSize(new T.Vector3());
  const length=Math.max(.001,sz.y),center=box.getCenter(new T.Vector3());
  model.scale.multiplyScalar(1.73/length);
  model.position.set(-center.x*model.scale.x,-box.min.y*model.scale.y,-center.z*model.scale.z);
  model.traverse(o=>{
   if(o.isMesh||o.isSkinnedMesh){o.castShadow=false;o.receiveShadow=false;}
  });
  const old=game.character;
  game.root.add(model);if(old)game.root.remove(old);
  game.character=model;
  game.mixer=new T.AnimationMixer(model);
  game.actions={};
  for(const clip of gltf.animations){
   const label=clip.name.toLowerCase();
   if(/walk/.test(label))game.actions.walk=game.mixer.clipAction(clip);
   if(/run/.test(label))game.actions.run=game.mixer.clipAction(clip);
   if(/idle/.test(label))game.actions.idle=game.mixer.clipAction(clip);
  }
  game.animation='';game.hasModel=true;
  chooseGameAnimation('idle');
  gameStatus('Personagem carregado · WASD ou direcional');
 }catch(error){
  console.warn('[Arcano] Manequim de reserva no modo Jogar:',error);
  gameStatus('Manequim simples · modo offline');
 }finally{game.loading=false;}
}
function chooseGameAnimation(name){
 if(!game.mixer||game.animation===name)return;
 const next=game.actions[name]||game.actions.walk||game.actions.idle;
 if(!next)return;
 const prev=game.actions[game.animation];
 if(prev&&prev!==next)prev.fadeOut(.20);
 next.reset().fadeIn(.20).play();game.animation=name;
}
function gameInput(){
 let x=game.input.x,y=game.input.y;
 if(game.keys.has('a')||game.keys.has('arrowleft'))x-=1;
 if(game.keys.has('d')||game.keys.has('arrowright'))x+=1;
 if(game.keys.has('w')||game.keys.has('arrowup'))y-=1;
 if(game.keys.has('s')||game.keys.has('arrowdown'))y+=1;
 const norm=Math.max(1,Math.hypot(x,y));
 return {x:x/norm,y:y/norm,run:game.input.run||game.keys.has('shift')};
}
// Árvore espacial por blocos de 3 unidades; evita percorrer milhares
// de modelos a cada passo do jogador.
const gameTreeGrid=new Map();let gameTreeCount=-1;
function treesNearGame(x,z){
 if(gameTreeCount!==forestInstances.length){
  gameTreeGrid.clear();gameTreeCount=forestInstances.length;
  for(const a of forestInstances){
   if(a.type!=='tree'&&a.type!=='pine')continue;
   const key=Math.floor(a.x/3)+','+Math.floor(a.z/3);
   if(!gameTreeGrid.has(key))gameTreeGrid.set(key,[]);
   gameTreeGrid.get(key).push(a);
  }
 }
 const ix=Math.floor(x/3),iz=Math.floor(z/3);
 for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
  const trees=gameTreeGrid.get((ix+dx)+','+(iz+dz));
  if(!trees)continue;
  for(const a of trees){
   if((a.x-x)*(a.x-x)+(a.z-z)*(a.z-z)<.19)return true;
  }
 }
 return false;
}
function updateGame(dt){
 if(!game.active||!game.root)return;
 const control=gameInput(),length=Math.hypot(control.x,control.y);
 if(length>.08){
  // Movimento RELATIVO à direção da câmera: a seta para cima sempre
  // avança na direção em que o jogador está olhando.
  const forward=-control.y,strafe=control.x;
  // Vetor direito é (-cos, sin) na câmera que olha para (sin, cos).
  // O sinal antigo fazia joystick D/direita mover o jogador para esquerda.
  const dirX=Math.sin(game.camHeading)*forward-
   Math.cos(game.camHeading)*strafe;
  const dirZ=Math.cos(game.camHeading)*forward+
   Math.sin(game.camHeading)*strafe;
  const speed=control.run?3.25:1.65;
  const nx=clamp(game.position.x+dirX*dt*speed*length,-W*.48,W*.48);
  const nz=clamp(game.position.z+dirZ*dt*speed*length,-L*.48,L*.48);
  const y=terrainContact(nx,nz),oldY=terrainContact(game.position.x,game.position.z);
  if(Math.abs(y-oldY)<.43&&!rockAt(nx,nz)&&sample(depth,nx,nz)<.18&&
     !treesNearGame(nx,nz)){
    game.position.x=nx;game.position.z=nz;
  }
  const newHeading=Math.atan2(dirX,dirZ);
  game.heading+=Math.atan2(Math.sin(newHeading-game.heading),
   Math.cos(newHeading-game.heading))*Math.min(1,dt*8);
  game.elapsed+=dt*speed*length;
  if(game.elapsed>1.1){
   game.elapsed=0;game.steps++;
   window.arcanoEcoV1232?.trample?.(game.position.x,game.position.z,.10);
  }
 }
 game.position.y=terrainContact(game.position.x,game.position.z);
 game.root.position.copy(game.position);
 game.root.rotation.y=game.heading;
 const anim=length>.1?(control.run?'run':'walk'):'idle';
 chooseGameAnimation(anim);
 if(game.mixer)game.mixer.update(Math.min(dt,.065));
 else if(game.character?.userData.limbs){
  const parts=game.character.userData.limbs,t=performance.now()*.008;
  const gait=length?Math.sin(t*(control.run?2.2:1.4))*.48*length:0;
  parts.leftLeg.rotation.x=gait;
  parts.rightLeg.rotation.x=-gait;
  parts.leftArm.rotation.x=-gait*.65;
  parts.rightArm.rotation.x=gait*.65;
 }
}
const gameCameraGoal=new T.Vector3();
function applyGameCamera(){
 const goal=game.position;
 // Órbita livre: o ângulo persiste após soltar o dedo, sem forçar a
 // câmera automaticamente de volta para trás do personagem.
 const reach=Math.cos(game.camPitch)*game.camDistance;
 const bx=-Math.sin(game.camHeading)*reach,bz=-Math.cos(game.camHeading)*reach;
 gameCameraGoal.set(goal.x+bx,
  Math.max(terrainContact(goal.x+bx,goal.z+bz)+.65,
   goal.y+1.15+Math.sin(game.camPitch)*game.camDistance),
  goal.z+bz);
 camera.position.lerp(gameCameraGoal,.22);
 camera.lookAt(goal.x,goal.y+1.22,goal.z);
}
async function setPlayActive(active){
 if(game.active===active)return;
 game.active=active;
 document.body.classList.toggle('play-active',active);
 if($('gameHUD'))$('gameHUD').setAttribute('aria-hidden',String(!active));
 game.keys.clear();game.input.x=0;game.input.y=0;game.input.run=false;game.orbitPointer=null;
 if(active){
  if(!game.root){
   game.root=new T.Group();game.root.name='Personagem jogável';
   game.character=gameFallback();game.root.add(game.character);scene.add(game.root);
   game.position.set(0,terrainContact(0,.92),.92);
   game.heading=Math.PI;game.camHeading=Math.PI;game.camPitch=.35;
  }
  game.root.visible=true;
  // Fullscreen e rotação são tentativas; o navegador pode negar.
  try{
   if(!document.fullscreenElement&&document.documentElement.requestFullscreen){
    await document.documentElement.requestFullscreen();
    game.openedFullscreen=true;
   }
  }catch(error){console.info('[Arcano] Tela cheia não autorizada:',error);}
  try{await screen.orientation?.lock?.('landscape');}
  catch(error){console.info('[Arcano] Gire o celular manualmente:',error);}
  loadGameCharacter();
 }else{
  if(game.root)game.root.visible=false;
  if(game.openedFullscreen&&document.fullscreenElement){
   try{await document.exitFullscreen();}catch(_){}
  }
  game.openedFullscreen=false;
  try{screen.orientation?.unlock?.();}catch(_){}
  if($('gameStick'))$('gameStick').style.transform='translate(0,0)';
 }
}
for(const link of [$('gameDownload'),$('gameDownloadHUD')])
 if(link)link.addEventListener('click',downloadAnimatedCharacter);
if($('playEntry'))$('playEntry').addEventListener('click',()=>setPlayActive(true));
if($('gameExit'))$('gameExit').addEventListener('click',()=>setPlayActive(false));
window.addEventListener('keydown',ev=>{
 if(!game.active)return;
 const key=ev.key.toLowerCase();
 if(key==='escape'){setPlayActive(false);ev.preventDefault();return;}
 if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift',' '].includes(key)){
  game.keys.add(key);ev.preventDefault();
 }
});
window.addEventListener('keyup',ev=>game.keys.delete(ev.key.toLowerCase()));
window.addEventListener('blur',()=>{game.keys.clear();game.input.x=game.input.y=0;game.input.run=false;});
if($('gameJoystick')){
 const pad=$('gameJoystick'),nub=$('gameStick');
 const touchMove=ev=>{
  const r=pad.getBoundingClientRect();
  const x=ev.clientX-(r.left+r.width/2),y=ev.clientY-(r.top+r.height/2);
  const limit=r.width*.31,dist=Math.max(1,Math.hypot(x,y));
  const amount=Math.min(1,dist/limit);
  game.input.x=x/dist*amount;game.input.y=y/dist*amount;
  nub.style.transform='translate('+Math.round(game.input.x*limit)+'px,'+
   Math.round(game.input.y*limit)+'px)';
 };
 pad.addEventListener('pointerdown',ev=>{if(!game.active)return;game.touch=true;pad.setPointerCapture(ev.pointerId);touchMove(ev);});
 pad.addEventListener('pointermove',ev=>{if(game.touch)touchMove(ev);});
 const end=()=>{game.touch=false;game.input.x=game.input.y=0;nub.style.transform='translate(0,0)';};
 pad.addEventListener('pointerup',end);pad.addEventListener('pointercancel',end);
}
if($('gameRun')){
 const b=$('gameRun');
 b.addEventListener('pointerdown',ev=>{b.setPointerCapture(ev.pointerId);game.input.run=true;});
 b.addEventListener('pointerup',()=>game.input.run=false);
 b.addEventListener('pointercancel',()=>game.input.run=false);
}

let yaw=.83,pitch=.79,radius=39,drag=false,moved=false,prevX=0,prevY=0,pinch=0;
let pinchX=0,pinchY=0;
const target=new T.Vector3(0,-.12,0);
let lastViewVisibilityUpdate=0;
function setView(){
 if(game.active)applyGameCamera();
 else{
  camera.position.set(target.x+radius*Math.cos(pitch)*Math.sin(yaw),target.y+radius*Math.sin(pitch),target.z+radius*Math.cos(pitch)*Math.cos(yaw));
  camera.lookAt(target);
 }
 // Atualizar a distância de visibilidade tanto no laboratório quanto
 // durante a caminhada: o mundo não fica congelado no ponto inicial.
 // Árvores fora do alcance deixam de gerar draw calls; atualizar devagar
 // para não reconstruir o inventário de objetos a cada quadro.
 const now=performance.now();
 if(now-lastViewVisibilityUpdate>1400&&forestInstances.length){
  lastViewVisibilityUpdate=now;applyForestVisibility();
 }
}
function tapAdd(event){
 if(game.active)return;
 const rect=stage.getBoundingClientRect(),mouse=new T.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
 const ray=new T.Raycaster();ray.setFromCamera(mouse,camera);const found=ray.intersectObject(land);
 if(found.length){
  const p=found[0].point;
  if(assetTestPlacementMode){
   placeAssetTest($('assetTestSelect')?.value,{x:p.x,z:p.z});
   return;
  }
  if($('ecoWalkMode')?.checked&&window.arcanoEcoV1232?.active){
   window.arcanoEcoV1232.trample(p.x,p.z,.32);
   return;
  }
  for(let i=0;i<25;i++){const a=random()*Math.PI*2,r=random()*.6;add(p.x+Math.cos(a)*r,p.z+Math.sin(a)*r,.105);}
 rebuild();updateInfo(true);}
}
// Modo caminhada: com o dedo pressionado, cada passo afeta a vegetação,
// compacta o solo e deixa marcas SOMENTE quando a lama pode retê-las.
// Em modo normal, o mesmo gesto continua rotacionando a câmera.
const pressedPointers=new Set(),ecoWalkRay=new T.Raycaster(),ecoWalkPos=new T.Vector2();
let lastEcoWalkStamp=0,lastEcoWalkX=NaN,lastEcoWalkZ=NaN;
function paintWalkingStep(e){
 if(!$('ecoWalkMode')?.checked||!window.arcanoEcoV1232?.active)return false;
 if(pressedPointers.size>1)return true;
 const rect=stage.getBoundingClientRect();
 ecoWalkPos.set((e.clientX-rect.left)/Math.max(1,rect.width)*2-1,
  -(e.clientY-rect.top)/Math.max(1,rect.height)*2+1);
 ecoWalkRay.setFromCamera(ecoWalkPos,camera);
 const hit=ecoWalkRay.intersectObject(land,false)[0];
 if(!hit)return true;
 const p=hit.point,now=performance.now();
 const distance=Math.hypot(p.x-lastEcoWalkX,p.z-lastEcoWalkZ);
 if(now-lastEcoWalkStamp>145&&(!Number.isFinite(distance)||distance>.12)){
  window.arcanoEcoV1232.trample(p.x,p.z,.19);
  lastEcoWalkX=p.x;lastEcoWalkZ=p.z;lastEcoWalkStamp=now;
 }
 return true;
}
// Área livre da cena: arrastar o dedo gira a câmera do modo Jogar.
// Joystick e botão Correr têm eventos próprios sobrepostos ao canvas.
stage.addEventListener('pointerdown',e=>{
 if(game.active){
  if(game.orbitPointer===null){
   game.orbitPointer=e.pointerId;
   game.orbitX=e.clientX;game.orbitY=e.clientY;
   try{stage.setPointerCapture(e.pointerId);}catch(_){}
  }
  return;
 }
 pressedPointers.add(e.pointerId);drag=true;moved=false;
 prevX=e.clientX;prevY=e.clientY;
 lastEcoWalkX=NaN;lastEcoWalkZ=NaN;
 if(paintWalkingStep(e))moved=true;
 try{stage.setPointerCapture(e.pointerId);}catch(_){}
});
stage.addEventListener('pointermove',e=>{
 if(game.active){
  if(e.pointerId!==game.orbitPointer)return;
  const dx=e.clientX-game.orbitX,dy=e.clientY-game.orbitY;
  game.camHeading-=dx*.006;
  game.camPitch=clamp(game.camPitch+dy*.0045,-.06,1.10);
  game.orbitX=e.clientX;game.orbitY=e.clientY;
  return;
 }
 if(!drag)return;
 if(pressedPointers.size>1){moved=true;return;} // multitoque: panorâmica e zoom
 if(paintWalkingStep(e)){moved=true;prevX=e.clientX;prevY=e.clientY;return;}
 const a=e.clientX-prevX,b=e.clientY-prevY;
 if(Math.abs(a)+Math.abs(b)>3)moved=true;
 yaw-=a*.006;pitch=clamp(pitch+b*.004,.22,1.46);
 prevX=e.clientX;prevY=e.clientY;
});
stage.addEventListener('pointerup',e=>{
 if(game.active){
  if(e.pointerId===game.orbitPointer)game.orbitPointer=null;
  return;
 }
 pressedPointers.delete(e.pointerId);
 if(drag&&!moved)tapAdd(e);
 drag=false;
});
stage.addEventListener('pointercancel',e=>{if(e.pointerId===game.orbitPointer)game.orbitPointer=null;pressedPointers.delete(e.pointerId);drag=false;});
stage.addEventListener('wheel',e=>{
 if(game.active){
  e.preventDefault();
  game.camDistance=clamp(game.camDistance+Math.sign(e.deltaY)*.40,2.7,9);
  return;
 }
 e.preventDefault();
 // Roda: zoom. Shift+roda: desloca pelo mapa grande.
 if(e.shiftKey)target.z=clamp(target.z+Math.sign(e.deltaY)*radius*.07,-L*.42,L*.42);
 else radius=clamp(radius+Math.sign(e.deltaY)*Math.max(1.2,radius*.095),9,135);
},{passive:false});
stage.addEventListener('touchmove',e=>{
 if(game.active)return;
 if(e.touches.length!==2){pinch=0;return;}
 e.preventDefault();
 const a=e.touches[0],b=e.touches[1];
 const dist=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
 const cx=(a.clientX+b.clientX)*.5,cy=(a.clientY+b.clientY)*.5;
 if(pinch){
  radius=clamp(radius+(pinch-dist)*Math.max(.05,radius*.0018),9,135);
  const dx=(cx-pinchX)/Math.max(1,innerWidth)*radius*.9;
  const dz=(cy-pinchY)/Math.max(1,innerHeight)*radius*.9;
  target.x=clamp(target.x-dx*Math.cos(yaw)-dz*Math.sin(yaw),-W*.43,W*.43);
  target.z=clamp(target.z+dx*Math.sin(yaw)-dz*Math.cos(yaw),-L*.43,L*.43);
 }
 pinch=dist;pinchX=cx;pinchY=cy;
},{passive:false});
stage.addEventListener('touchend',e=>{if(e.touches.length<2)pinch=0;},{passive:true});
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
 waterM.uniforms.uReflect.value=(reflectionsOn&&reflectionReady)?.94:0;
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
$('forestPack').addEventListener('change',e=>setForestCollection(e.target.value));
$('graphicsQuality').addEventListener('change',e=>setGraphicsQuality(e.target.value));
if($('ecoFov'))$('ecoFov').addEventListener('input',e=>
 setViewSettings(e.target.value,viewDistance));
if($('ecoViewDistance'))$('ecoViewDistance').addEventListener('input',e=>
 setViewSettings(viewFov,e.target.value));
if($('windIntensity')){
 $('windIntensity').value=String(windUserPower);
 $('windIntensity').addEventListener('input',e=>{
  windUserPower=clamp(Number(e.target.value)||0,0,100);
  if($('windValue'))$('windValue').textContent=windUserPower+'%';
  // Recalcula a direção, o efeito térmico e o movimento da vegetação.
  atmosphereStep(.1);reflectionAge=999;updateInfo(true);
 });
}
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
// V12.55: distâncias estáticas dos indicadores só precisam ser calculadas uma vez.
const uiBasinDistances=new Float64Array(size);
for(let k=0;k<size;k++){
 const i=k%NX,j=Math.floor(k/NX),x=nx(i),z=nz(j),b=basins[1];
 uiBasinDistances[k]=((x-b.x)/b.sx)**2+((z-b.z)/b.sz)**2;
}
const hudNodes=Object.create(null);
function hudText(id,value){
 const node=hudNodes[id]||(hudNodes[id]=$(id));
 if(node&&node.textContent!==value)node.textContent=value;
}
function updateInfo(force){
 const now=performance.now();if(!force&&now-lastUI<420)return;lastUI=now;
 // A régua visual é não linear, acompanhando a força crescente da precipitação.
 const pct=Math.round(Math.pow(rainMeters[level]/rainMeters[5],.62)*100),name=rainNames[level];
 hudText('intensityName',name);const rainMeter=$('rainMeter'),rainFill=pct+'%';
 if(rainMeter&&rainMeter.style.getPropertyValue('--rain-fill')!==rainFill)
  rainMeter.style.setProperty('--rain-fill',rainFill);
 let surface=0,stored=0,ground=0,leaf=0,saturated=0,participating=0;
 let lagoonWet=0,lagoonCells=0,lagoonMax=0,otherPuddles=0,mudTotal=0,mudWeight=0,wetSoilOnly=0;
 let nAvg=0,pAvg=0,kAvg=0,caAvg=0,phAvg=0,biotaAvg=0,salAvg=0,omAvg=0,growthAvg=0,healthAvg=0;
 const limited=new Uint32Array(SOIL_LIMITS.length);
 for(let k=0;k<size;k++){
  surface+=depth[k];stored+=soilMoisture[k];ground+=deepWater[k];leaf+=canopy[k];
   if(depth[k]>.010){mudTotal+=turbidity[k]*depth[k];mudWeight+=depth[k];}
  const soilSat=clamp(soilMoisture[k]/soilCapacity[k],0,1);
  saturated+=soilSat;participating++;
  if(soilSat>.18&&depth[k]<SURFACE_VISIBLE)wetSoilOnly++;
  const q=uiBasinDistances[k];
  if(q<.72){lagoonCells++;if(depth[k]>=SURFACE_VISIBLE)lagoonWet++;lagoonMax=Math.max(lagoonMax,depth[k]);}
  if(depth[k]>=SURFACE_VISIBLE&&q>.72)otherPuddles++;
  // Agregar nutrientes junto das águas: duas leituras da grade -> uma,
  // mantendo a mesma ordem de somas de cada indicador.
  nAvg+=soilN[k];pAvg+=soilP[k];kAvg+=soilK[k];caAvg+=soilCa[k];phAvg+=soilPH[k];
  biotaAvg+=soilBiota[k];salAvg+=soilSalinity[k];omAvg+=soilOrganic[k];
  growthAvg+=soilPlant[k];healthAvg+=soilHealth[k];limited[soilLimiting[k]]++;
 }
 surface*=area;stored*=area;ground*=area;leaf*=area;
 hudText('rainDetail',(physicalWeather
  ?'Escala '+level+'/5 · chuva regional '+Math.round(clamp(appliedRainMean/.0061,0,1)*100)+
    '% · '+activeRainRegions+'/'+ATM_N+' zonas com chuva'
  :'Escala '+level+'/5 · chuva manual '+name)+
   ' • '+timeScale+'× • '+drops.length+' gotas 3D');
 hudText('soilStats','Terra: '+Math.round(saturated/Math.max(1,participating)*100)+'% saturada · '+stored.toFixed(1)+' m³ retidos no solo');
 const asPct=x=>Math.round(clamp(x/size,0,1)*100);
 const mainLimit=limited.indexOf(Math.max(...limited));
 hudText('fertilityStats',(soilType==='mosaico'?'Mosaico ecológico ('+SOIL_KEYS.length+' perfis disponíveis)':SOIL_PROFILES[soilType].name)+
  ' · N '+asPct(nAvg)+'% · P '+asPct(pAvg)+'% · K '+asPct(kAvg)+'% · Ca '+asPct(caAvg)+'% · húmus '+asPct(omAvg)+'%');
 hudText('plantStats','🌱 Biomassa '+asPct(growthAvg)+'% · condição de crescimento '+asPct(healthAvg)+
  '% · principal limitante: '+SOIL_LIMITS[mainLimit]+' · pH '+(phAvg/size).toFixed(1)+' · salinidade '+asPct(salAvg)+'% · biota '+asPct(biotaAvg)+'%');
 hudText('windStatus','🍃 Vento '+atmWindMean.toFixed(2)+
  ' (índice de jogo) · potência '+windUserPower+'% · '+
  (atmWindMean<.16?'aragem':atmWindMean<.46?'brisa':atmWindMean<.95?'moderado':atmWindMean<1.55?'forte':'rajadas intensas')+
  ' · folhas '+(forestGroup.visible?'animadas na GPU':'floresta anterior')+
  ' · direção '+Math.round((atmWindHeading*180/Math.PI+360)%360)+'°'+
  ' · '+(climate==='storm'||stormActive()?'rajadas fortes':'rajadas variáveis'));
 hudText('fogStatus','🌫 Neblina '+Math.round(fogStrength*100)+
  '% · '+fogCause+' · solo '+Math.round(fogWetness*100)+
  '% úmido · ar-superfície/orvalho '+fogDewGap.toFixed(1)+' °C');
 hudText('waterStats','Poças '+wetted.toFixed(1)+' m² ('+Math.round(wetted/(participating*area)*100)+'% do terreno) · água superficial '+surface.toFixed(1)+' m³');
 hudText('wetGroundStats','Terra úmida sem poça: '+(wetSoilOnly*area).toFixed(1)+
  ' m² · infiltração '+stats.infiltrated.toFixed(1)+' m³ · aquífero '+ground.toFixed(1)+' m³');
 hudText('splashStats','Impactos '+totalImpacts+' · '+splashes.length+
  ' partículas · '+ripples.length+' ondas · '+leafDripTotal+
  ' gotas pós-chuva · '+foamCount+' manchas de espuma');
  hudText('reflectionStats','Superfície '+VIS_NX+'×'+VIS_NZ+
  ' · espelho da câmera '+(reflectionsOn?(reflectionReady?'ativo':'preparando'):'desligado')+
  ' · '+planarRT.width+'×'+planarRT.height+' · '+reflectionFrames+' capturas');
 hudText('climateStats','Céu: '+(weatherCfg?weatherCfg.name:'preparando')+
  (climateChoice==='auto'?' (automático)':'')+
  ' · '+Math.round((weatherCfg?weatherCfg.coverage:0)*100)+'% nuvens · sol e reflexos climáticos');
  hudText('mudStats','Sedimentos suspensos: '+Math.round(mudTotal/Math.max(.0001,mudWeight)*100)+'% · '+(soilType==='mosaico'?'mosaico de solos':SOIL_PROFILES[soilType].name));
 // Conta apenas rochas que realmente encontram a lâmina, não rochas sobre terra seca.
 let touchedRocks=0,coveredRocks=0;
 for(const rock of rockSolids){
  const d=sample(depth,rock.x,rock.z);if(d<SURFACE_VISIBLE)continue;
  const waterline=sample(soil,rock.x,rock.z)+d;
  if(waterline>=rock.bottom+.015)touchedRocks++;
  if(waterline>=rock.top-.012)coveredRocks++;
 }
 hudText('lakeStats','Lagoa: '+Math.round(lagoonWet/Math.max(1,lagoonCells)*100)+'% da bacia coberta · profundidade '+lagoonMax.toFixed(2)+' m · '+touchedRocks+' rochas molhadas · '+coveredRocks+' encobertas');
 hudText('cycleStats','Infiltrou '+stats.infiltrated.toFixed(1)+' m³ · folhas '+leaf.toFixed(1)+' m³ · evapotranspiração '+(stats.evaporated+stats.transpired).toFixed(1)+' m³ · drenou '+stats.outflow.toFixed(1)+' m³');
 const hour=Math.floor(dayClock/60),minute=Math.floor(dayClock%60);
 const hh=String(hour).padStart(2,'0'),mm=String(minute).padStart(2,'0');
 const seasonName=(['Verão','Outono','Inverno','Primavera'])[Math.floor((atmosDayIndex%SEASON_DAYS)/(SEASON_DAYS/4))];
 const sunAltitude=solarAt(dayClock);
 const phaseName=sunAltitude<-.035?'Noite':sunAltitude<.10?'Crepúsculo':
  dayClock<DAY_SECONDS*.50?'Manhã':'Tarde';
 hudText('dayCycleStats',(sunAltitude<-.035?'☾ ':'☀ ')+
  'Dia '+(atmosDayIndex+1)+' · '+hh+':'+mm+' · '+phaseName+' · '+seasonName+' · 1 dia = 24 min reais');
 const dayBar=$('dayCycleBar'),dayWidth=(dayClock/DAY_SECONDS*100).toFixed(2)+'%';
 if(dayBar&&dayBar.style.width!==dayWidth)dayBar.style.width=dayWidth;
 hudText('atmosStats',(physicalWeather?'Atmosfera física':'Clima manual')+
  ' · '+atmTempMean.toFixed(1)+' °C · umidade '+Math.round(atmHumMean*100)+
  '% · '+atmPressureMean.toFixed(0)+' hPa · vento '+atmWindMean.toFixed(1)+
  ' · nuvens '+Math.round(atmCloudMean*100)+'% · chuva efetiva '+Math.round(clamp(appliedRainMean/.0061,0,1)*100)+'%');
 hudText('simClock','Tempo simulado: '+(time<60?time.toFixed(0)+' s':(time/60).toFixed(1)+' min')+(paused?' · PAUSADO':''));
 hudText('info',level===0
 ?'Chuva suspensa: poças infiltram e evaporam; o ciclo solar continua'
 :physicalWeather
 ?'A chuva depende das nuvens, vento e umidade locais • toque para adicionar água'
 :'Chuva manual: as depressões concentram poças • arraste para girar');
}

let last=performance.now();const gamePerf={elapsed:0,frames:0,lastFps:0};
function loop(now){
 requestAnimationFrame(loop);const rawDt=Math.max(0,(now-last)/1000),dt=Math.min(rawDt,.065);last=now;
 updateGame(dt);
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
  animateForest(dt);
  setView();
  updateReflections(dt);
  updateInfo(false);
 }
 // A câmera já foi atualizada antes dos reflexos. Evitar a segunda
 // aplicação da mesma matriz a cada quadro; manter o caso pausado.
 if(paused||document.hidden)setView();
 renderer.render(scene,camera);
 gamePerf.elapsed+=rawDt;gamePerf.frames++;
 if(gamePerf.elapsed>=1.25){
  gamePerf.lastFps=Math.round(gamePerf.frames/gamePerf.elapsed);
  const info=renderer.info.render;
  if($('gameFPS'))$('gameFPS').textContent=
   gamePerf.lastFps+' FPS · '+info.calls+' chamadas de desenho';
  if($('viewFpsStats'))$('viewFpsStats').textContent=
   'FPS '+gamePerf.lastFps+' · '+info.calls+' chamadas · '+
   (info.triangles||0).toLocaleString('pt-BR')+' triângulos';
  gamePerf.elapsed=0;gamePerf.frames=0;
 }
}

window.addEventListener('resize',resize);
window.addEventListener('error',e=>{if((e.filename||'').includes('agua-v1226'))fail(e.error||e.message);});
window.arcanoWaterV1226={scene,renderer,setGraphicsQuality,getGraphicsQuality:()=>graphicsQuality,getViewDistance:()=>viewDistance,getViewFov:()=>viewFov,setViewSettings,biomeField,QUALITY_PRESETS,snapForestToGround,setForestCollection,leafWindUniforms,leafWindMaterials,getFog:()=>({strength:fogStrength,target:fogTarget,rainMemory:fogRainMemory,age:fogRainAge,dewGap:fogDewGap,wind:atmWindMean,reason:fogCause}),forestGroup,forestModels,forestInstances,setFloraVisible,seed,setMode,add,setSoilType,addSoilOrganic,addSoilNutrients,terrain:land,water,stones,grass,sprouts:sproutGroup,soilProfiles:SOIL_PROFILES,soilKeyIndex,soilOrganic,soilLitter,soilN,soilP,soilK,soilCa,soilPH,soilSalinity,soilBiota,soilPlant,soilHealth,soilLimiting,soilCapacity,permeability,ecologyStep,soilMoisture,deepWater,canopy,depth,soil,turbidity,stats,impactHeightAt,rockHeightAt,rockSolids,setRainLevel,getRainLevel:()=>level,applyClimate,skyDome,atmosphere:{temp:atmTemp,humidity:atmHumidity,pressure:atmPressure,cloud:atmCloud,rain:atmRain,rainField,getDayClock:()=>dayClock,getMetrics:()=>({temperature:atmTempMean,humidity:atmHumMean,pressure:atmPressureMean,wind:atmWindMean,clouds:atmCloudMean,rain:atmRainMean,daySeconds:dayClock})},reflectionCamera,reflectionCamera2,getMode:()=>mode,getWetArea:()=>wetted,getImpacts:()=>totalImpacts};
try{resize();setMode('puddle');setGraphicsQuality(graphicsQuality);setViewSettings(viewFov,viewDistance);requestAnimationFrame(loop);}catch(e){fail(e);}
})();
