import{A as e,Br as t,G as n,K as r,R as i,Ut as a,V as o,at as s,di as c,k as l,nt as u,o as d,ot as f,q as p,st as m,tt as h,vt as g,xt as _,y as v}from"./settings-DdywqLlV.js";import{t as y}from"./ParticleSystem-BZTczMT8.js";import{n as b}from"./ParticleEngine-DLxipNH0.js";import{n as x}from"./GroundDecals-kYmr8HKl.js";import{n as S,t as C}from"./Ability-CYesB5Ur.js";import{i as w,n as T,r as E,t as D}from"./Projectile-DQ3a3PJ-.js";import{n as O,r as k,t as A}from"./LiquidSurface-BxPCnXEP.js";var j=`
  attribute float aSeed;
  attribute float aFlight;
  attribute float aFlash;

  varying float vSeed;
  varying float vFlight;
  varying float vFlash;
  varying vec3  vNormalW;
  varying vec3  vViewDir;
  varying float vViewZ;

  void main() {
    vSeed = aSeed;
    vFlight = aFlight;
    vFlash = aFlash;

    mat4 im = mat4(1.0);
    #ifdef USE_INSTANCING
      im = instanceMatrix;
    #endif

    vec4 world = modelMatrix * im * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * mat3(im) * normal);
    vViewDir = cameraPosition - world.xyz;

    vec4 mv = viewMatrix * world;
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,M=`
  uniform vec3  uColorClear;    // the body once the air has come out of it
  uniform vec3  uColorFroth;    // the same water, white with entrained air
  uniform vec3  uColorSpot;     // the refracted hot spot
  uniform vec3  uColorRim;      // the silhouette

  uniform float uIor;           // refractive index. Water is 1.333.
  uniform float uSpot;          // how bright the refracted point is
  uniform float uSpotPower;     // how tight it is
  uniform float uRim;
  uniform float uRimPower;
  uniform float uFroth;         // 0..1 aeration at tau = 0
  uniform float uFrothFade;     // exponent on tau — >1 clears late
  uniform float uAmbient;
  uniform float uShade;         // key-light term on the body
  uniform float uFlashGain;     // extra light on a drop that has just torn off
  uniform float uGlow;
  uniform float uOpacity;
  uniform float uSoftFade;      // metres of depth feather against geometry

  uniform vec3      uLightDir;
  uniform vec2      uResolution;
  uniform sampler2D uSceneDepth;
  uniform float     uCameraNear;
  uniform float     uCameraFar;
  uniform float     uGlobalGlow;

  varying float vSeed;
  varying float vFlight;
  varying float vFlash;
  varying vec3  vNormalW;
  varying vec3  vViewDir;
  varying float vViewZ;

  ${p}

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vViewDir);
    vec3 L = normalize(uLightDir);
    float facing = clamp(dot(N, V), 0.0, 1.0);

    /* --- the lens ----------------------------------------------------- */
    // The view ray, bent on the way in. Where it comes out pointing at the key
    // light is where the drop concentrates it: the far side, not the near one.
    vec3 bent = refract(-V, N, 1.0 / max(uIor, 1.001));
    // Total internal reflection returns a zero vector; guard rather than
    // normalising a zero and handing NaN to the pow below.
    float spot = 0.0;
    if (dot(bent, bent) > 1e-6) {
      spot = pow(clamp(dot(normalize(bent), L), 0.0, 1.0), max(uSpotPower, 1.0)) * uSpot;
    }

    float rim = pow(1.0 - facing, max(uRimPower, 0.1));

    /* --- the body ------------------------------------------------------ */
    // Air comes out of it as it falls. See the module header.
    float froth = uFroth * (1.0 - pow(clamp(vFlight, 0.0, 1.0), max(uFrothFade, 0.05)));
    float ndl = clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0);

    vec3 body = mix(uColorClear, uColorFroth, clamp(froth, 0.0, 1.0));
    body *= uAmbient + uShade * ndl;

    vec3 colour = body;
    colour += uColorSpot * spot;
    colour += uColorRim * rim * uRim;
    colour += uColorFroth * (vFlash * uFlashGain);
    colour *= uGlow * uGlobalGlow;

    // Clear water hides almost nothing face-on; the froth and the silhouette
    // are what you actually see, which is why a drop reads as a drop and a
    // sphere of flat alpha reads as a bead.
    float alpha = uOpacity * clamp(0.2 + 0.55 * froth + 0.8 * rim + spot * 0.4, 0.0, 1.0);
    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, max(uSoftFade, 1e-3));
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 1.0));
  }
`;function N(){return new t({name:`GeyserDrop`,vertexShader:j,fragmentShader:M,transparent:!0,depthWrite:!1,depthTest:!0,side:2,toneMapped:!1,uniforms:r({uColorClear:{value:new _(`#bfeef6`)},uColorFroth:{value:new _(`#ffffff`)},uColorSpot:{value:new _(`#eafcff`)},uColorRim:{value:new _(`#67d4e6`)},uIor:{value:1.333},uSpot:{value:2.2},uSpotPower:{value:14},uRim:{value:.9},uRimPower:{value:2.2},uFroth:{value:.85},uFrothFade:{value:1.3},uAmbient:{value:.35},uShade:{value:.7},uFlashGain:{value:1.8},uGlow:{value:1.2},uOpacity:{value:1},uSoftFade:{value:.18}})})}function P(e,t,n,r,a){let o=e.uniforms;return o.uColorClear.value.copy(i(t)),o.uColorFroth.value.copy(i(n)),o.uColorSpot.value.copy(i(r)),o.uColorRim.value.copy(i(a)),e}var F=Math.PI*2,I=128,L=80,R=26,z=96,B=k();B.crust=0,B.emissive=0,B.seamGlow=0,B.meltGlow=0;var V=w(),H={},U=new c,W=new c,G=new c,K=new c,q=new c(0,1,0);function J(e){let t=u(Math.round(e.facets),4,24),n=u(Math.round(e.rings),3,24),r=Math.max(0,e.taper),i=u(e.pinch,0,.9),o=n+1,s=new Float32Array(o),c=1e-4;for(let e=0;e<o;e++){let t=e/n,a=-1+2*t,o=Math.sqrt(Math.max(0,1-a*a));o*=t**+r,o*=1-i*Math.exp(-(((t-.34)/.22)**2)),s[e]=Math.max(o,.004),s[e]>c&&(c=s[e])}let l=1/c,d=new Float32Array(o*t*3),f=[],p=0;for(let e=0;e<o;e++){let r=-1+2*e/n,i=s[e]*l;for(let e=0;e<t;e++){let n=e/t*F;d[p++]=Math.cos(n)*i,d[p++]=r,d[p++]=Math.sin(n)*i}}for(let e=0;e<n;e++)for(let n=0;n<t;n++){let r=(n+1)%t,i=e*t+n,a=e*t+r,o=(e+1)*t+n,s=(e+1)*t+r;f.push(i,o,a,a,o,s)}let m=new g;return m.setAttribute(`position`,new a(d,3)),m.setIndex(f),m.computeVertexNormals(),m}var Y=class extends C{constructor(e){super(`geyser`,e)}createShaders(){this.pool=new O({segments:z,mode:A.POOL,depthWrite:!0,doubleSide:!0,renderOrder:3,name:`geyser.pool`}),this.pool.object3D.layers.set(o.VFX),this.group.add(this.pool.object3D),this.column=new l({path:e.FUNNEL,prefix:`jet`,nodes:L,sides:R,renderOrder:11}),this.group.add(this.column.group),this._shape={facets:9,rings:7,taper:.55,pinch:.28},this.dropMaterial=N(),this.drops=new T(this.group,{capacity:I,geometry:()=>J(this._shape),shapeKey:()=>{let e=d.geyser;return`${Math.round(e.dropFacets)}|${Math.round(e.dropRings)}|${e.dropTaper}|${e.dropPinch}`},material:this.dropMaterial,trail:!0,trailNodes:22,trailAdditive:!0,layer:o.VFX,renderOrder:6,castShadow:!1}),this._state={origin:new c,target:new c,side:new c,progress:0,fade:0,widthFade:1,seed:0,time:0},this._seed=0,this._ventAt=-1,this._blowAt=-1,this._blown=!1,this._live=0,this._gate=0}createParticles(){let e=this.ctx.particles;this.spray=e.get(`geyser.spray`,{capacity:3200,shape:y.SOFT,additive:!0,curl:!0,softFade:.3}),this.spray.uniforms.uDrag.value=1.4,this.spray.uniforms.uEndSize.value=.28,this.spray.uniforms.uSizeIn.value=.05,this.spray.uniforms.uFadeIn.value=.05,this.spray.uniforms.uFadeOut.value=.45,this.steam=e.get(`geyser.steam`,{capacity:1800,shape:y.SMOKE,additive:!1,curl:!0,softFade:1.1}),this.steam.uniforms.uDrag.value=1.9,this.steam.uniforms.uEndSize.value=3,this.steam.uniforms.uSizeIn.value=.14,this.steam.uniforms.uFadeIn.value=.2,this.steam.uniforms.uFadeOut.value=.32,this.grit=e.get(`geyser.grit`,{capacity:1200,shape:y.CHIP,additive:!1,lit:!0,softFade:.25}),this.grit.uniforms.uDrag.value=.35,this.grit.uniforms.uEndSize.value=.6,this.grit.uniforms.uFadeOut.value=.65,this.sprayEmitter=new b,this.steamEmitter=new b,this.gritEmitter=new b}get instanceCount(){return this._live}get impactDuration(){return Math.max(.1,d.geyser.lifetime*d.global.lifetime)}get fadeDuration(){return Math.max(.1,d.geyser.fadeTime)}_ventPoint(e){return this.pointAt(1,e).setY(0)}_runElapsed(){return this._ventAt<0?-1:this.age-this._ventAt}_rise(){let e=d.geyser,t=this._runElapsed();return t<0?0:h.outCubic(m(t/Math.max(.02,e.chargeTime)))}_collapse(){if(!this._blown)return 0;let e=d.geyser;return m((this.age-this._blowAt)/Math.max(.05,e.collapseTime))}_pressure(){let e=d.geyser,t=this._runElapsed();if(t<0)return 0;let n=1+e.surge*Math.sin(t*F*e.surgeRate);return m(this._rise()*(1-h.inCubic(this._collapse()))*n)}_blowPressure(){if(!this._blown)return 0;let e=d.geyser,t=Math.max(0,this._blowAt-this._ventAt);return h.outCubic(m(t/Math.max(.02,e.chargeTime)))}_fill(){let e=d.geyser;if(this.phase===S.TRAVEL)return m(e.preFill)*this.u;let t=h.outCubic(m(this._runElapsed()/Math.max(.02,e.ventRise)));return s(m(e.preFill),1,t)}onSpawn(){this.sprayEmitter.reset(),this.steamEmitter.reset(),this.gritEmitter.reset(),this._seed=Math.random()*100,this._ventAt=-1,this._blowAt=-1,this._blown=!1,this._live=0,this._gate=0,this.pool.reset(),this.pool.visible=!0,this.drops.reset(),this.drops.roll(this._seed),this.column.visible=!1,this._sync()}_sync(){let e=d.geyser,t=d.global,n=this._pressure();this._gate=n,this._ventPoint(G);let r=this._state;r.origin.copy(G),r.origin.y=e.poolHeight+e.jetBase,r.target.copy(r.origin),r.target.y=r.origin.y+Math.max(.1,e.jetHeight),r.side.copy(this.side),r.progress=this._rise()*(1-h.inCubic(this._collapse())),r.fade=this.phase===S.TRAVEL?0:m(n*1.4),r.widthFade=s(1,Math.max(.01,e.jetTaper),this._collapse()),r.seed=this._seed,r.time=Math.max(0,this._runElapsed()),this.column.sync(e,r,t),this.column.visible=r.fade>.002&&r.progress>.002,U.copy(G),U.y=e.poolHeight,this.pool.setPlacement(U,this.direction,q),B.sizeX=e.zoneRadius*2,B.sizeZ=e.zoneRadius*2,B.fill=this._fill(),B.round=e.round,B.edgeSoft=e.edgeSoft,B.edgeNoise=e.edgeNoise,B.edgeScale=e.edgeScale,B.seed=this._seed,B.opacity=e.poolOpacity*t.opacity,B.contactFade=e.contactFade,B.waveAmpA=e.waveAmpA,B.waveAmpB=e.waveAmpB,B.waveAmpC=e.waveAmpC,B.waveAmpD=e.waveAmpD,B.waveLengthA=e.waveLengthA,B.waveLengthB=e.waveLengthB,B.waveLengthC=e.waveLengthC,B.waveLengthD=e.waveLengthD,B.waveSpeedA=e.waveSpeedA,B.waveSpeedB=e.waveSpeedB,B.waveSpeedC=e.waveSpeedC,B.waveSpeedD=e.waveSpeedD,B.waveAngleA=e.waveAngleA,B.waveAngleB=e.waveAngleB,B.waveAngleC=e.waveAngleC,B.waveAngleD=e.waveAngleD,B.steepness=e.steepness,B.chop=e.chop,B.chopScale=e.chopScale*t.noiseFrequency,B.chopSpeed=e.chopSpeed*t.noiseSpeed,B.detail=e.detail,B.detailScale=e.detailScale*t.noiseFrequency,B.detailSpeed=e.detailSpeed*t.noiseSpeed,B.rippleAmp=e.rippleAmp,B.rippleSpeed=e.rippleSpeed,B.rippleLength=e.rippleLength,B.rippleWidth=e.rippleWidth,B.rippleDecay=e.rippleDecay,B.rippleSpread=e.rippleSpread,B.flowAngle=e.flowAngle,B.flowSpeed=e.flowSpeed,B.flowRadial=e.flowRadial*(.25+.75*n),B.flowRadialFall=e.flowRadialFall,B.flowEddy=e.flowEddy,B.flowEddyScale=e.flowEddyScale*t.noiseFrequency,B.flowEddySpeed=e.flowEddySpeed*t.noiseSpeed,B.flowGravity=e.flowGravity,B.foam=e.foam,B.foamScale=e.foamScale*t.noiseFrequency,B.foamSharp=e.foamSharp,B.foamCrest=e.foamCrest,B.foamSpeed=e.foamSpeed,B.poolDepth=e.poolDepth,B.depthTint=e.depthTint,B.translucency=e.translucency,B.ambient=e.ambient,B.specular=e.specular,B.shininess=e.shininess,B.fresnel=e.fresnel*t.fresnel,B.envIntensity=e.envIntensity,B.skyIntensity=e.skyIntensity,B.glow=e.poolGlow*t.glow,B.normalEps=e.normalEps,B.colorDeep=e.colorDeep,B.colorShallow=e.colorShallow,B.colorFoam=e.colorFoam,B.colorSpec=e.colorSpec,B.colorSky=e.colorSky,this.pool.update(this.age,B),this.pool.visible=B.fill>.001&&B.opacity>.001,this._syncRain(),this.spray.setGradient(i(e.colorSprayA),i(e.colorSprayB),i(e.colorSprayC),i(e.colorSprayD)),this.spray.uniforms.uGravity.value.set(0,e.sprayGravity,0),this.spray.uniforms.uSizeScale.value=e.spraySize*t.particleSize*7,this.spray.uniforms.uLifeScale.value=e.sprayLifetime*.5*t.particleLifetime,this.spray.uniforms.uSpeedScale.value=t.particleSpeed,this.spray.uniforms.uOpacity.value=t.opacity,this.spray.uniforms.uGlow.value=e.poolGlow*.7*t.glow,this.spray.uniforms.uTurbulence.value=e.sprayTurbulence*t.turbulence,this.steam.setGradient(i(e.colorSteamA),i(e.colorSteamB),i(e.colorSteamC),i(e.colorSteamD)),this.steam.uniforms.uGravity.value.set(0,e.steamRise,0),this.steam.uniforms.uSizeScale.value=e.steamSize*t.particleSize,this.steam.uniforms.uLifeScale.value=e.steamLifetime*.5*t.particleLifetime,this.steam.uniforms.uSpeedScale.value=e.steamSpeed*t.particleSpeed,this.steam.uniforms.uOpacity.value=e.steamOpacity*t.opacity,this.steam.uniforms.uTurbulence.value=.4*t.turbulence,this.grit.setGradient(i(e.colorGritA),i(e.colorGritB),i(e.colorGritC),i(e.colorGritD)),this.grit.uniforms.uGravity.value.set(0,e.gritGravity,0),this.grit.uniforms.uSizeScale.value=e.gritSize*t.particleSize*7,this.grit.uniforms.uLifeScale.value=e.gritLifetime*.5*t.particleLifetime,this.grit.uniforms.uSpeedScale.value=t.particleSpeed,this.grit.uniforms.uOpacity.value=t.opacity,this.phase===S.TRAVEL?(this.pointAt(this.u,this.position),this.position.y=e.poolHeight):(this.column.pointAt(m(e.lightRide),this.position),this.position.y+=e.lightHeight)}_syncRain(){let e=d.geyser,t=d.global,n=Math.max(.05,e.gravity),r=m(e.seedAt);this.column.pointAt(r,U);let a=U.y,o=this.column.radiusAt(r)/Math.max(this._state.widthFade,.001),s=Math.max(0,e.columnSpeed*this._blowPressure()),c=s*s/(2*n),l=Math.max(.05,a-e.poolHeight+c),u=Math.max(.05,s/n+Math.sqrt(2*l/n)),f=F*Math.abs(e.jetSpin)*o*e.swirlCarry;V.mode=D.FALL,V.stagger=E.HASH,V.count=this._blown?Math.min(I,Math.round(e.droplets)):0,V.radius=e.dropRadius,V.sizeJitter=e.dropSizeJitter*t.randomness,V.stretch=e.dropStretch,V.align=e.dropAlign,V.spin=e.dropSpin,V.flash=e.dropFlash,V.skyBack=0,V.skyHeight=a,V.skyScatter=o,V.landHeight=e.poolHeight,V.landInZone=!0,V.zoneRadius=o+(f+e.spreadSpeed)*u,V.zoneBias=Math.max(.05,e.dropRingBias),V.pathCurve=e.dropPathCurve,V.apex=c,V.apexCurve=e.dropApexCurve,V.weaveSide=0,V.weaveUp=0,V.flightTime=u,V.speedJitter=e.dropSpeedJitter,V.lead=e.dropLead,V.window=e.dropWindow,V.fillBias=e.dropFillBias,V.fillScatter=e.dropFillScatter,V.hashCell=e.dropHashCell,V.linger=e.dropLinger,V.sink=e.dropSink,V.trailSpan=e.trailSpan,V.trailBurn=e.trailBurn,V.trailWidth=e.trailWidth,V.trailTaper=e.trailTaper,V.trailLift=e.trailLift,V.trailOpacity=e.trailOpacity*t.opacity,V.trailGlow=e.trailGlow*t.glow,V.trailCore=e.trailCore,V.trailHeadBias=e.trailHeadBias,V.trailNoise=e.trailNoise*t.turbulence,V.trailNoiseScale=e.trailNoiseScale*t.noiseFrequency,V.trailNoiseSpeed=e.trailNoiseSpeed*t.noiseSpeed,V.trailSoftFade=e.trailSoftFade,P(this.dropMaterial,e.colorDropClear,e.colorDropFroth,e.colorDropSpot,e.colorDropRim);let p=this.dropMaterial.uniforms;p.uIor.value=Math.max(1.001,e.dropIor),p.uSpot.value=e.dropSpot,p.uSpotPower.value=e.dropSpotPower,p.uRim.value=e.dropRim*t.fresnel,p.uRimPower.value=e.dropRimPower,p.uFroth.value=e.dropFroth,p.uFrothFade.value=e.dropFrothFade,p.uAmbient.value=e.dropAmbient,p.uShade.value=e.dropShade,p.uFlashGain.value=e.dropFlashGain,p.uGlow.value=e.dropGlow*t.glow,p.uOpacity.value=e.dropOpacity*t.opacity,p.uSoftFade.value=e.dropSoftFade,this.drops.setTrailColors(i(e.colorTrailA),i(e.colorTrailB),i(e.colorTrailC),i(e.colorTrailD)),this._shape.facets=e.dropFacets,this._shape.rings=e.dropRings,this._shape.taper=e.dropTaper,this._shape.pinch=e.dropPinch,this.drops.syncGeometry(),U.copy(G),U.y=e.poolHeight,this.drops.setBasis(U,this.direction,this.side,.01),this.drops.update(this._blown?Math.max(0,this.age-this._blowAt):0,V),this._live=this.drops.count;for(let t=0;t<this.drops.arrivalCount;t++){let n=this.drops.arrivals[t];this.drops.landPoint(n,K),this.pool.rippleAtWorld(K,e.rippleStrength,this.age),this._splashFx(K)}}_columnPoint(e,t){let n=this.column.radiusAt(e),r=Math.random()*F;return this.column.pointAt(e,t),t.x+=Math.cos(r)*n,t.z+=Math.sin(r)*n,t}_ventFx(e){let t=d.geyser,r=d.global,i=n.uTime.value,a=this._gate,o=Math.round(this.sprayEmitter.tick(e,t.sprayRate*a)*r.particleCount);if(o>0){let e=Math.sqrt(Math.random());this._columnPoint(e,U),H.position=U,H.radius=this.column.radiusAt(e)*.35,H.direction=W.set(0,1,0),H.speed=t.spraySpeed*s(1.2,.45,e),H.speedVariance=.8,H.spread=s(.25,.9,e),H.inherit=null,H.anchor=null,H.size=t.spraySize,H.sizeVariance=.7,H.life=t.sprayLifetime,H.lifeVariance=.5,H.spin=0,H.tint=null,H.time=i,this.spray.emit(o,H)}let c=this._fill(),l=Math.round(this.steamEmitter.tick(e,t.steamRate*c)*r.particleCount);if(l>0){let e=Math.random()*F,n=t.zoneRadius*c*Math.sqrt(Math.random());U.set(G.x+Math.cos(e)*n,t.poolHeight,G.z+Math.sin(e)*n),H.position=U,H.radius=t.zoneRadius*.3,H.direction=W.set(0,1,0),H.speed=t.steamSpeed,H.speedVariance=.7,H.spread=.95,H.inherit=null,H.anchor=null,H.size=t.steamSize,H.sizeVariance=.5,H.life=t.steamLifetime,H.lifeVariance=.4,H.spin=.3,H.tint=null,H.time=i,this.steam.emit(l,H)}let u=Math.round(this.gritEmitter.tick(e,t.gritRate*a)*r.particleCount);u>0&&(this._columnPoint(.04,U),H.position=U,H.radius=this.column.skirtRadius*.6,H.direction=W.set(0,1,0),H.speed=t.gritSpeed,H.speedVariance=.85,H.spread=.35,H.inherit=null,H.anchor=null,H.size=t.gritSize,H.sizeVariance=.7,H.life=t.gritLifetime,H.lifeVariance=.5,H.spin=9,H.tint=null,H.time=i,this.grit.emit(u,H))}_splashFx(e){let t=d.geyser,r=d.global,i=Math.round(t.splashPerDrop*r.particleCount);i<=0||(H.position=e,H.radius=t.dropRadius*1.6,H.direction=W.set(0,1,0),H.speed=t.spraySpeed*.5,H.speedVariance=.9,H.spread=1,H.inherit=null,H.anchor=null,H.size=t.spraySize*.7,H.sizeVariance=.8,H.life=t.sprayLifetime*.6,H.lifeVariance=.5,H.spin=0,H.tint=null,H.time=n.uTime.value,this.spray.emit(i,H))}onTravel(e){this._sync(),this._ventFx(e)}onImpact(){let e=d.geyser,t=d.global,r=n.uTime.value;this._ventAt=this.age,this._ventPoint(G),U.copy(G),U.y=e.poolHeight,this.ctx.bursts.spawn(v.WATER,U,{radius:e.burstSize*.2,endRadius:e.burstSize*t.explosionIntensity,life:.7,intensity:e.burstIntensity,opacity:.85,fresnel:1.7,displace:.6,squash:.6,colorA:i(e.colorBurstA),colorB:i(e.colorBurstB),colorC:i(e.colorBurstC)}),this.ctx.decals.spawn(x.SHOCKWAVE,G,{radius:e.shockRadius*t.explosionIntensity,life:.6,width:.06,intensity:1,colorA:i(e.colorShockA),colorB:i(e.colorShockB)});let a=Math.max(0,Math.round(e.wetMarks));for(let t=0;t<a;t++){let n=(t+f(-.35,.35))/a*F,r=e.zoneRadius*f(.9,1.3);U.set(G.x+Math.cos(n)*r,0,G.z+Math.sin(n)*r),this.ctx.decals.spawn(x.FOAM,U,{radius:e.wetRadius*f(.7,1.3),life:e.wetLife,intensity:e.wetIntensity,colorA:i(e.colorWet),colorB:i(e.colorWetEdge),height:.012})}U.copy(G),U.y=e.poolHeight,H.position=U,H.radius=e.zoneRadius*.18,H.direction=W.set(0,1,0),H.speed=e.spraySpeed*2.2,H.speedVariance=.9,H.spread=.5,H.inherit=null,H.anchor=null,H.size=e.spraySize*1.2,H.sizeVariance=.8,H.life=e.sprayLifetime*1.3,H.lifeVariance=.6,H.spin=0,H.tint=null,H.time=r,this.spray.emit(Math.round(70*t.particleCount),H),H.speed=e.gritSpeed*1.5,H.spread=.6,H.size=e.gritSize*1.3,H.life=e.gritLifetime,H.spin=11,this.grit.emit(Math.round(40*t.particleCount),H),this.ctx.shake.add(e.ventShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),20),this.ctx.flash.trigger(i(e.colorFlash),e.ventFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.9*t.explosionIntensity}_blow(){let e=d.geyser,t=d.global;this._blown=!0,this._blowAt=this.age,this.column.pointAt(m(e.seedAt),U),this.ctx.bursts.spawn(v.WATER,U,{radius:this.column.radiusAt(m(e.seedAt)),endRadius:e.burstSize*1.3*t.explosionIntensity,life:.65,intensity:e.burstIntensity*.8,opacity:.75,fresnel:1.9,displace:.7,squash:.75,colorA:i(e.colorBurstA),colorB:i(e.colorBurstB),colorC:i(e.colorBurstC)}),H.position=U,H.radius=this.column.radiusAt(m(e.seedAt)),H.direction=W.set(0,1,0),H.speed=e.spraySpeed*1.4,H.speedVariance=.9,H.spread=1,H.inherit=null,H.anchor=null,H.size=e.spraySize,H.sizeVariance=.8,H.life=e.sprayLifetime*1.2,H.lifeVariance=.6,H.spin=0,H.tint=null,H.time=n.uTime.value,this.spray.emit(Math.round(60*t.particleCount),H)}onFade(e){let t=d.geyser;!this._blown&&this._runElapsed()>=t.chargeTime+t.holdTime&&this._blow(),this._sync(),this._ventFx(e),this.ctx.shake.rumble(t.rumble*this._gate*d.global.cameraShake,e)}onDestroy(){this._live=0,this._gate=0,this._blown=!1,this._ventAt=-1,this._blowAt=-1,this.drops.reset(),this.pool.reset(),this.pool.visible=!1,this.column.visible=!1}dispose(){this.pool.dispose(),this.column.dispose(),this.drops.dispose(),this.dropMaterial.dispose(),super.dispose()}};export{Y as GeyserAbility};
//# sourceMappingURL=GeyserAbility-D50_oP4r.js.map