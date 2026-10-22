/* Ateliê Arcano V12.18 — poças, lagoas e respingos conformes ao relevo (modelo ilustrativo, não calibrado).
   Chuva, interceptação vegetal, infiltração, percolação, escoamento e evapotranspiração.
   Simulação conservativa na malha, com multiplicador de tempo e gotas 3D visíveis. */
(function(){
'use strict';
const T=window.THREE, $=id=>document.getElementById(id), clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const diag=$('diag'),stage=$('stage');
function fail(error){if(diag)diag.textContent='Não foi possível iniciar a água 3D: '+(error&&error.message||error);console.error('[Arcano V12.18]',error);}
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
 fragmentShader:"precision highp float;\nvarying vec3 vSkyDir;\nuniform float uTime,uCoverage,uWind,uSunVisible,uNight;\nuniform vec3 uTop,uHorizon,uCloud,uSunColor,uSunDir;\nfloat hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}\nfloat noise2(vec2 p){\n vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);\n return mix(mix(hash2(i),hash2(i+vec2(1.,0.)),f.x),\n            mix(hash2(i+vec2(0.,1.)),hash2(i+vec2(1.,1.)),f.x),f.y);\n}\nfloat clouds(vec2 p){\n float v=0.;\n v+=noise2(p)*.53;\n v+=noise2(p*2.13+vec2(5.1,2.7))*.27;\n v+=noise2(p*4.26+vec2(1.3,8.4))*.14;\n v+=noise2(p*8.58)*.06;\n return v;\n}\nvoid main(){\n vec3 d=normalize(vSkyDir);\n vec3 sky=mix(uHorizon,uTop,smoothstep(-.05,.77,d.y));\n sky=mix(sky,vec3(.008,.017,.041),uNight*.92);\n float haze=1.-smoothstep(.02,.28,abs(d.y));\n sky=mix(sky,uHorizon,haze*.26);\n vec2 uv=d.xz*2.6/max(.18,d.y+.22);\n float t=uTime*uWind;\n float c1=clouds(uv+vec2(t*.025,t*.011));\n float c2=clouds(uv*1.86+vec2(-t*.012,t*.017));\n float field=mix(c1,c2,.30);\n float coverage=smoothstep(.76-.42*uCoverage,.86-.49*uCoverage,field);\n coverage*=smoothstep(-.085,.10,d.y);\n float lightFacing=clamp(dot(d,normalize(uSunDir))*.5+.5,0.,1.);\n vec3 cloudColor=uCloud*(.79+.22*lightFacing);\n cloudColor=mix(cloudColor,vec3(.032,.045,.077),uNight*.91);\n sky=mix(sky,cloudColor,coverage*(.73+.27*uCoverage));\n float sunDot=max(dot(d,normalize(uSunDir)),0.);\n float disc=smoothstep(.9987,.99985,sunDot);\n float glow=pow(sunDot,140.)*.23;\n sky+=uSunColor*(disc*.90+glow)*uSunVisible*(1.-coverage*.91);\n // Lua e pontos estelares discretos, visíveis só à noite e fora das nuvens.\n float moon=max(dot(d,-normalize(uSunDir)),0.);\n float moonDisc=smoothstep(.9987,.99967,moon);\n float starHash=hash2(floor(d.xz*314.0+d.y*219.0));\n float stars=step(.9945,starHash)*smoothstep(.5,.95,d.y);\n sky+=vec3(.47,.56,.70)*moonDisc*uNight*(1.-coverage*.87);\n sky+=vec3(.37,.48,.64)*stars*uNight*(1.-coverage*.89)*.36;\n gl_FragColor=vec4(clamp(sky,0.,1.),1.);\n}"
});
const skyDome=new T.Mesh(new T.SphereGeometry(40,mobile?36:56,mobile?24:36),skyM);
skyDome.name='Céu 3D com sol, nuvens volumétricas estilizadas e movimento';
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
 storm:{name:'Tempestade',top:'#576c7b',horizon:'#98a4ae',cloud:'#728490',
  bg:'#8797a0',sun:'#d2dce6',ambient:'#b2c3d3',ground:'#596a69',
  coverage:.98,wind:.94,sunPower:.46,ambientPower:1.32,sunVisible:.01,reflection:.58,waterTint:'#697b86'}
};
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
  if(mode==='storm'){
   atmHumidity[k]=Math.max(.87,atmHumidity[k]);
   atmCloud[k]=Math.max(.66,atmCloud[k]);
  }
  atmRain[k]=0;atmWindX[k]=.32;atmWindZ[k]=.15;
 }
 rainField.fill(0);atmRainMean=atmRainPeak=0;
 atmCloudMean=.48;atmHumMean=.74;atmTempMean=23;atmPressureMean=1012;
 if(physicalWeather&&climateChoice==='auto')applyClimate('partlyCloudy');
}
function atmCloudPreset(){
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
  atmWindX[k]=clamp(.29+(left-right)*.12+front*.35,-1.5,1.5);
  atmWindZ[k]=clamp(.13+(up-down)*.12+.22*Math.sin(clock*6.28+z*.19),-1.5,1.5);
  const slopeX=(elevation(x+.32,z)-elevation(x-.32,z))/.64;
  const slopeZ=(elevation(x,z+.32)-elevation(x,z-.32))/.64;
  const uplift=Math.max(0,atmWindX[k]*slopeX+atmWindZ[k]*slopeZ);
  // Umidade disponível cai ao aquecer e sobe com o resfriamento/evaporação.
  const cooling=Math.max(0,21-atmTemp[k])*.00016;
  let hum=atmNextHum[k]+(forest*.00024+recycled/ATM_N+cooling-
                          daySun*.000085-rainSink/ATM_N)*dt;
  hum=clamp(hum,.22,.985);
  const saturated=clamp((hum-.70)*3.15+(23-atmTemp[k])*.018+
      uplift*.24+front*.22+(mode==='storm'?.22:0),0,1);
  let cloud=clamp(atmNextCloud[k]+(saturated*.032-
                  (1-saturated)*(.007+.009*daySun))*dt,0,1);
  const precipitation=clamp((cloud-.47)*2.7,0,1)*
             clamp((hum-.59)*3.4,0,1)*
             (.72+.45*uplift+.30*front);
  // Condensado reduz nuvem e umidade quando precipita; recarga por evaporação.
  const rainRate=clamp(precipitation*.0036,0,.0082);
  cloud=clamp(cloud-rainRate*dt*4.5,0,1);
  hum=clamp(hum-rainRate*dt*.75,0,1);
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
  skyM.uniforms.uCoverage.value=atmCloudMean;
  skyM.uniforms.uWind.value=clamp(atmWindMean*.8,0,1.2);
  if(typeof waterM!=='undefined'){
   waterM.uniforms.uCloudiness.value=atmCloudMean;
   waterM.uniforms.uWind.value=clamp(atmWindMean*.8,0,1.2);
  }
 }
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

const grass=new T.InstancedMesh(new T.ConeGeometry(.092,.42,3),new T.MeshStandardMaterial({color:'#849878',roughness:1,flatShading:true}),mobile?62:138);
const ob=new T.Object3D();let gcount=0;
for(let k=0;k<grass.count;k++){
 const x=(random()-.5)*W,z=(random()-.5)*L,y=elevation(x,z);
 if(rockAt(x,z)||y<-.15)continue;const s=.45+random()*1.2;
 ob.position.set(x,y+.09,z);ob.scale.set(s,s,s);ob.rotation.y=random()*6.28;ob.updateMatrix();grass.setMatrixAt(gcount++,ob.matrix);
}grass.count=gcount;grass.castShadow=true;scene.add(grass);
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
 const cfg={loam:[1,1.45],loose:[1.12,2.30],clay:[1.24,.34],compacted:[.64,.16]}[next]||[1,1.45];
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
const rainLevels=[0,.32,.63,1,1.57,2.4],rainNames=['Sem chuva','Garoa','Chuva fraca','Chuva moderada','Chuva forte','Temporal intenso'];
// Chuva ampliada para visualizar a formação no time-lapse, sem criar lagos artificialmente.
// Chuva moderada: parte infiltra, parte escoa às depressões; temporal ainda pode inundar.
// Chuva normal menor, poças crescem em depressões e não sobre todo o solo.
const rainMeters=[0,.00018,.00055,.0028,.0040,.0088];
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
 for(let k=0;k<size;k++)soilMoisture[k]=soilCapacity[k]*.025;
 initAtmosphere();updateAtmosphere(0);
 rebuild();updateInfo(true);
}
// A chuva é alimentada por um campo uniforme; gotas animadas representam a mesma chuva,
// sem depositar um segundo volume ao colidir (evita contagem dupla).
function hydrologyStep(dt){
 const manualRain=rainMeters[level]*dt*(mode==='storm'?1.28:mode==='lagoon'?1.36:1);
 const interp=process==='retention'?1.75:process==='infiltration'?.95:1;
 const infiltrate=process==='runoff'?.11:process==='infiltration'?3.0:process==='retention'?.8:1;
 const sunIntensity=Math.max(0,solarAt(dayClock));
 const climateEvap=physicalWeather?clamp(.29+sunIntensity*.82+(1-atmHumMean)*.18,.26,1.28):1;
 const evaporate=(process==='retention'?3.1:process==='runoff'?.65:1)*climateEvap;
 const speed=process==='runoff'?1.65:1;
 for(let k=0;k<size;k++){
  // Precipitação regional derivada de nuvens, umidade e transporte pelo vento.
  const rain=physicalWeather
    ?(level===0?0:Math.min(rainField[k],rainMeters[level]*1.50)*
      (mode==='storm'?1.24:mode==='lagoon'?1.10:1))*dt
    :manualRain;
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
 const rainfall=physicalWeather
  ?(level===0?0:clamp(atmRainMean/.0028,0,2.5)*1.45)
  :rainLevels[level]*(mode==='storm'?1.4:1);
 spawnAcc+=rainfall*(mobile?155:230)*dt;
 const toSpawn=Math.min(55,Math.floor(spawnAcc));spawnAcc-=toSpawn;
 for(let k=0;k<toSpawn&&drops.length<MAX_DROPS;k++){
  const x=(random()-.5)*(W-.8),z=(random()-.5)*(L-.8);
  if(physicalWeather&&random()>clamp(atmosphereRainAt(x,z)/Math.max(.00005,atmRainPeak),0,1))continue;
  drops.push({x,z,y:2.2+random()*4.3,speed:4.4+random()*3.2,stretch:.70+random()*.75});
 }
 const factor=1+Math.log2(timeScale)*.12;
 let displayedImpacts=0;
 for(let i=drops.length-1;i>=0;i--){
  const d=drops[i];d.y-=d.speed*dt*factor;
  if(physicalWeather){
   d.x+=Math.cos(atmWindHeading)*atmWindMean*dt*.25;
   d.z+=Math.sin(atmWindHeading)*atmWindMean*dt*.25;
  }
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
$('soilType').addEventListener('change',e=>setSoilType(e.target.value));
for(const btn of document.querySelectorAll('[data-mode]'))btn.addEventListener('click',()=>setMode(btn.dataset.mode));
function setMode(next){
 mode=next;level=next==='storm'?5:next==='lagoon'?3:next==='puddle'?3:3;
 setRainLevel(level);seed(mode);
 document.querySelectorAll('[data-mode]').forEach(el=>el.classList.toggle('active',el.dataset.mode===mode));
 $('hint').textContent={rain:'Chuva cai sobre a terra e se divide em infiltração, escoamento e evapotranspiração.',
 puddle:'A terra absorve a maior parte da chuva; pequenas poças surgem lentamente nas depressões.',
 lagoon:'A lagoa cresce aos poucos nas bacias; as partes mais altas permanecem apenas úmidas.',
 storm:'Temporal: a terra satura e aumenta o escoamento entre as pedras 3D.'}[mode];
}
$('replay').addEventListener('click',()=>seed(mode));
$('pause').addEventListener('click',()=>{paused=!paused;$('pause').textContent=paused?'▶ Continuar':'⏸ Pausar';updateInfo(true);});
$('cam').addEventListener('click',()=>{yaw=.83;pitch=.79;radius=24;});
function updateInfo(force){
 const now=performance.now();if(!force&&now-lastUI<420)return;lastUI=now;
 const pct=Math.round(level/5*100),name=rainNames[level];
 $('intensityName').textContent=physicalWeather?'Limite: '+name:name;$('rainMeter').style.setProperty('--rain-fill',pct+'%');
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
  ?'Chuva por regiões · média '+Math.round(clamp(atmRainMean/.0036,0,1)*100)+'% · pico '+Math.round(clamp(atmRainPeak/.0036,0,1)*100)+'%'
  :'Chuva manual · '+name)+' • '+timeScale+'× • '+drops.length+' gotas 3D';
 $('soilStats').textContent='Terra: '+Math.round(saturated/Math.max(1,participating)*100)+'% saturada · '+stored.toFixed(1)+' m³ retidos no solo';
 $('waterStats').textContent='Poças '+wetted.toFixed(1)+' m² ('+Math.round(wetted/(participating*area)*100)+'% do terreno) · água superficial '+surface.toFixed(1)+' m³';
 $('wetGroundStats').textContent='Terra úmida sem poça: '+(wetSoilOnly*area).toFixed(1)+' m² · infiltração acumulada '+stats.infiltrated.toFixed(1)+' m³ · subterrâneo '+ground.toFixed(1)+' m³';
 $('splashStats').textContent='Impactos '+totalImpacts+' · '+splashes.length+' partículas · '+ripples.length+' ondas · '+foamCount+' manchas de espuma/sujeira';
  $('reflectionStats').textContent='Superfície '+VIS_NX+'×'+VIS_NZ+
  ' · reflexos '+(reflectionsOn?(reflectionReady?'ativos':'preparando'):'desligados')+
  ' · '+(mobile?'1 captura':'2 regiões')+' · '+reflectionFrames+' atualizações';
 $('climateStats').textContent='Céu: '+(weatherCfg?weatherCfg.name:'preparando')+
  (climateChoice==='auto'?' (automático)':'')+
  ' · '+Math.round((weatherCfg?weatherCfg.coverage:0)*100)+'% nuvens · sol e reflexos climáticos';
  $('mudStats').textContent='Sedimentos suspensos: '+Math.round(mudTotal/Math.max(.0001,mudWeight)*100)+'% · '+({loam:'terra comum',loose:'terra solta',clay:'barro argiloso',compacted:'terra compactada'}[soilType]||soilType);
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
  ' · nuvens '+Math.round(atmCloudMean*100)+'% · intensidade de chuva '+Math.round(clamp(atmRainMean/.0036,0,1)*100)+'%';
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
  if(acc>step*14)acc=step*14;
  if(++frame%2===0)rebuild();
  waterM.uniforms.uTime.value=visualTime;
  animateClimate(dt);
  updateReflections(dt);
  updateInfo(false);
 }
 setView();renderer.render(scene,camera);
}

window.addEventListener('resize',resize);
window.addEventListener('error',e=>{if((e.filename||'').includes('agua-v1218'))fail(e.error||e.message);});
window.arcanoWaterV1218={scene,renderer,seed,setMode,add,setSoilType,terrain:land,water,stones,soilMoisture,deepWater,canopy,depth,soil,turbidity,stats,impactHeightAt,rockHeightAt,rockSolids,setRainLevel,applyClimate,skyDome,atmosphere:{temp:atmTemp,humidity:atmHumidity,pressure:atmPressure,cloud:atmCloud,rain:atmRain,rainField,getDayClock:()=>dayClock,getMetrics:()=>({temperature:atmTempMean,humidity:atmHumMean,pressure:atmPressureMean,wind:atmWindMean,clouds:atmCloudMean,rain:atmRainMean,daySeconds:dayClock})},reflectionCamera,reflectionCamera2,getMode:()=>mode,getWetArea:()=>wetted,getImpacts:()=>totalImpacts};
try{resize();setMode('puddle');requestAnimationFrame(loop);}catch(e){fail(e);}
})();