import{Br as e,G as t,K as n,R as r,V as i,X as a,Y as o,at as s,di as c,o as l,ot as u,q as d,st as f,tt as p,xt as m,y as h}from"./settings-DdywqLlV.js";import{t as g}from"./ParticleSystem-BZTczMT8.js";import{n as _}from"./ParticleEngine-DLxipNH0.js";import{n as v}from"./GroundDecals-kYmr8HKl.js";import{n as y,t as b}from"./Ability-CYesB5Ur.js";import{n as x,r as S}from"./Distortion-CclodxJd.js";import{i as C,n as w,r as T,t as E}from"./Projectile-DQ3a3PJ-.js";import{n as D,r as O,t as k}from"./LiquidSurface-BxPCnXEP.js";var A=`
  attribute float aSeed;
  attribute float aFlight;
  attribute float aFlash;

  varying float vSeed;
  varying float vFlight;
  varying float vFlash;
  varying vec3  vLocal;
  varying vec3  vNormalW;
  varying vec3  vViewDir;
  varying float vViewZ;

  void main() {
    vSeed = aSeed;
    vFlight = aFlight;
    vFlash = aFlash;
    vLocal = position;

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
`,j=`
  uniform vec3  uColorHot;      // the melt underneath the skin
  uniform vec3  uColorMelt;     // the melt at glancing angles
  uniform vec3  uColorCrust;    // the chilled skin
  uniform vec3  uColorSeam;     // the crack between two plates of it

  uniform float uCrust;         // 0..1 skin coverage once fully chilled
  uniform float uCrustGrow;     // exponent on tau — >1 chills late
  uniform float uCrackScale;    // cycles per unit of blob radius
  uniform float uCrackWidth;    // 0..1 of the field — the seam's width
  uniform float uSeamGlow;
  uniform float uRim;           // how hot the silhouette's edge runs
  uniform float uRimPower;
  uniform float uShade;         // key-light term on the crust, 0..1
  uniform float uAmbient;
  uniform float uFlashGain;     // extra heat on a blob that has just left
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
  varying vec3  vLocal;
  varying vec3  vNormalW;
  varying vec3  vViewDir;
  varying float vViewZ;

  ${o}
  ${d}

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vViewDir);
    float facing = clamp(dot(N, V), 0.0, 1.0);

    /* --- the skin ---------------------------------------------------- */
    // Signed field, so the seam is its zero crossing rather than a threshold on
    // an absolute value: continuous, branching, and one number wide anywhere on
    // the blob. A threshold on abs(noise) gives crazing, which is pottery.
    float field = snoise(vLocal * max(uCrackScale, 0.01) + vSeed * 37.0);
    float seam = 1.0 - smoothstep(0.0, max(uCrackWidth, 1e-3), abs(field));

    // Coverage closes over the flight. The blob leaves the fount as raw melt
    // and is a cracked black lump by the time it comes down.
    float chill = clamp(uCrust * pow(clamp(vFlight, 0.0, 1.0), max(uCrustGrow, 0.01)), 0.0, 1.0);
    float plate = chill * (1.0 - seam);

    /* --- the melt ----------------------------------------------------- */
    float rim = pow(1.0 - facing, max(uRimPower, 0.1));
    vec3 melt = mix(uColorHot, uColorMelt, rim);
    melt = mix(melt, uColorSeam, seam * uSeamGlow * chill);

    // The crust is the only part that takes the key light. Lighting the melt
    // as well flattens the blob into a lit sphere and the heat stops reading.
    float ndl = clamp(dot(N, normalize(uLightDir)), 0.0, 1.0);
    vec3 crust = uColorCrust * (uAmbient + uShade * ndl);

    vec3 colour = mix(melt, crust, plate);
    colour += uColorMelt * (rim * uRim * (1.0 - plate));
    colour += uColorHot * (vFlash * uFlashGain);
    colour *= uGlow * uGlobalGlow;

    float alpha = uOpacity;
    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 1.0));
  }
`;function M(){return new e({name:`MagmaBlob`,vertexShader:A,fragmentShader:j,transparent:!0,depthWrite:!0,depthTest:!0,side:2,toneMapped:!1,uniforms:n({uColorHot:{value:new m(`#ffe08a`)},uColorMelt:{value:new m(`#ff5a12`)},uColorCrust:{value:new m(`#120806`)},uColorSeam:{value:new m(`#ff8a2a`)},uCrust:{value:.85},uCrustGrow:{value:1.4},uCrackScale:{value:2.6},uCrackWidth:{value:.22},uSeamGlow:{value:1.2},uRim:{value:.8},uRimPower:{value:2},uShade:{value:.55},uAmbient:{value:.22},uFlashGain:{value:2.4},uGlow:{value:1.6},uOpacity:{value:1},uSoftFade:{value:.2}})})}function N(e,t,n,i,a){let o=e.uniforms;return o.uColorHot.value.copy(r(t)),o.uColorMelt.value.copy(r(n)),o.uColorCrust.value.copy(r(i)),o.uColorSeam.value.copy(r(a)),e}var P=48,F=108,I=O(),L=C(),R={},z={},B=new c,V=new c,H=new c,U=new c,W=new c(0,1,0),G=class extends b{constructor(e){super(`magma`,e)}createShaders(){this.pool=new D({segments:F,mode:k.POOL,depthWrite:!0,doubleSide:!0,renderOrder:3,name:`magma.pool`}),this.pool.object3D.layers.set(i.VFX),this.group.add(this.pool.object3D),this.blobMaterial=M(),this.blobs=new w(this.group,{capacity:P,geometry:()=>{let e=l.magma;return a({seed:7,detail:e.blobDetail,lumpiness:e.blobLumpiness,noiseScale:e.blobNoiseScale,roughness:e.blobRoughness,cuts:0,craters:0})},shapeKey:()=>{let e=l.magma;return`${Math.round(e.blobDetail)}|${e.blobLumpiness}|${e.blobNoiseScale}|${e.blobRoughness}`},material:this.blobMaterial,trail:!0,trailNodes:26,trailAdditive:!0,layer:i.VFX,renderOrder:6,castShadow:!1}),this.haze=new x({mode:S.HEAT,name:`magma.haze`}),this.group.add(this.haze.object3D),this._seed=0,this._foundAt=0,this._live=0,this._beat=0,this._fountGate=0}createParticles(){let e=this.ctx.particles;this.spatter=e.get(`magma.spatter`,{capacity:3e3,shape:g.SOFT,additive:!0,curl:!0,softFade:.35}),this.spatter.uniforms.uDrag.value=1.2,this.spatter.uniforms.uEndSize.value=.25,this.spatter.uniforms.uSizeIn.value=.05,this.spatter.uniforms.uFadeIn.value=.05,this.spatter.uniforms.uFadeOut.value=.5,this.cinders=e.get(`magma.cinders`,{capacity:1400,shape:g.CHIP,additive:!1,lit:!0,softFade:.25}),this.cinders.uniforms.uDrag.value=.35,this.cinders.uniforms.uEndSize.value=.7,this.cinders.uniforms.uFadeOut.value=.65,this.smoke=e.get(`magma.smoke`,{capacity:1800,shape:g.SMOKE,additive:!1,curl:!0,softFade:1.2}),this.smoke.uniforms.uDrag.value=2,this.smoke.uniforms.uEndSize.value=3.4,this.smoke.uniforms.uSizeIn.value=.16,this.smoke.uniforms.uFadeIn.value=.22,this.smoke.uniforms.uFadeOut.value=.3,this.spatterEmitter=new _,this.cinderEmitter=new _,this.smokeEmitter=new _}get instanceCount(){return this._live}get impactDuration(){return Math.max(.1,l.magma.lifetime*l.global.lifetime)}get fadeDuration(){return Math.max(.1,l.magma.fadeTime)}lightShimmer(){let e=l.magma,t=Math.floor(this.age*Math.max(1,e.lightFlickerSpeed)),n=Math.abs(Math.sin(t*127.1)*43758.5453)%1;return 1-f(e.lightFlicker)*n}_centrePoint(e){return this.pointAt(1,e).setY(0)}_fill(){let e=l.magma;if(this.phase===y.TRAVEL)return f(e.preFill)*this.u;let t=p.outCubic(f(this.impactTime/Math.max(.02,e.swellTime)));return s(f(e.preFill),1,t)}_cool(){let e=l.magma;return p.inOutCubic(f(this.fadeTime/Math.max(.05,e.coolTime)))}_fount(){let e=l.magma;return this.phase===y.TRAVEL?0:f((this.age-this._foundAt)/Math.max(.02,e.fountRamp))*(1-this._cool())}onSpawn(){this.spatterEmitter.reset(),this.cinderEmitter.reset(),this.smokeEmitter.reset(),this._foundAt=0,this._beat=0,this._live=0,this._seed=Math.random()*100,this.blobs.reset(),this.blobs.roll(this._seed),this.pool.reset(),this.pool.visible=!0,this.haze.visible=!0,this._sync()}_sync(){let e=l.magma,t=l.global,n=this._cool(),i=this._fount(),a=1-n;this._centrePoint(H),H.y=e.poolHeight,this.pool.setPlacement(H,this.direction,W),H.y=0,I.sizeX=e.zoneRadius*2,I.sizeZ=e.zoneRadius*2,I.fill=this._fill(),I.round=e.round,I.edgeSoft=e.edgeSoft,I.edgeNoise=e.edgeNoise,I.edgeScale=e.edgeScale,I.seed=this._seed,I.opacity=e.poolOpacity*t.opacity,I.contactFade=e.contactFade;let o=s(1,.35,n);I.waveAmpA=e.waveAmpA*o,I.waveAmpB=e.waveAmpB*o,I.waveAmpC=e.waveAmpC*o,I.waveAmpD=e.waveAmpD*o,I.waveLengthA=e.waveLengthA,I.waveLengthB=e.waveLengthB,I.waveLengthC=e.waveLengthC,I.waveLengthD=e.waveLengthD,I.waveSpeedA=e.waveSpeedA*a,I.waveSpeedB=e.waveSpeedB*a,I.waveSpeedC=e.waveSpeedC*a,I.waveSpeedD=e.waveSpeedD*a,I.waveAngleA=e.waveAngleA,I.waveAngleB=e.waveAngleB,I.waveAngleC=e.waveAngleC,I.waveAngleD=e.waveAngleD,I.steepness=e.steepness,I.chop=e.chop*o,I.chopScale=e.chopScale*t.noiseFrequency,I.chopSpeed=e.chopSpeed*t.noiseSpeed*a,I.detail=e.detail,I.detailScale=e.detailScale*t.noiseFrequency,I.detailSpeed=e.detailSpeed*t.noiseSpeed,I.rippleAmp=e.rippleAmp,I.rippleSpeed=e.rippleSpeed,I.rippleLength=e.rippleLength,I.rippleWidth=e.rippleWidth,I.rippleDecay=e.rippleDecay,I.rippleSpread=e.rippleSpread,I.flowAngle=e.flowAngle,I.flowSpeed=e.flowSpeed*a,I.flowRadial=e.flowRadial*a,I.flowRadialFall=e.flowRadialFall,I.flowEddy=e.flowEddy*a,I.flowEddyScale=e.flowEddyScale*t.noiseFrequency,I.flowEddySpeed=e.flowEddySpeed*t.noiseSpeed,I.flowGravity=e.flowGravity,I.crust=e.crust,I.crustForm=e.crustForm,I.crustBreak=e.crustBreak,I.crustFormTime=e.crustFormTime,I.crackScale=e.crackScale*t.noiseFrequency,I.crackStretch=e.crackStretch,I.crackWidth=e.crackWidth,I.crustAdvect=e.crustAdvect,I.crustPeriod=e.crustPeriod,I.crustBump=e.crustBump,I.seamGlow=e.seamGlow*a*t.glow,I.meltGlow=e.meltGlow*a*t.glow,I.poolDepth=e.poolDepth,I.depthTint=e.depthTint,I.translucency=e.translucency,I.ambient=e.ambient,I.specular=e.specular,I.shininess=e.shininess,I.fresnel=e.fresnel*t.fresnel,I.envIntensity=e.envIntensity,I.skyIntensity=e.skyIntensity,I.emissive=e.emissive*a,I.glow=e.poolGlow*t.glow,I.normalEps=e.normalEps,I.colorDeep=e.colorDeep,I.colorShallow=e.colorShallow,I.colorCrust=e.colorCrust,I.colorSeam=e.colorSeam,I.colorHot=e.colorHot,I.colorSpec=e.colorSpec,I.colorSky=e.colorSky,this.pool.update(this.age,I),this.blobs.setBasis(H,this.direction,this.side,.01),L.mode=E.ARC,L.stagger=T.HASH,L.count=this.phase===y.TRAVEL?0:Math.min(P,Math.round(e.blobs)),L.radius=e.blobRadius,L.sizeJitter=e.blobSizeJitter*t.randomness,L.stretch=e.blobStretch,L.align=e.blobAlign,L.spin=e.blobSpin,L.flash=e.blobFlash,L.handForward=e.fountForward,L.handSide=e.fountSide,L.handHeight=e.fountHeight,L.landHeight=e.poolHeight,L.landInZone=!0,L.zoneRadius=e.zoneRadius*e.blobReach,L.zoneBias=e.blobBias,L.pathCurve=e.blobPathCurve,L.apex=e.blobApex,L.apexCurve=e.blobApexCurve,L.weaveSide=e.blobWeaveSide,L.weaveUp=e.blobWeaveUp,L.weaveTurns=e.blobWeaveTurns,L.weaveTurnsUp=e.blobWeaveTurns,L.weaveDecay=e.blobWeaveDecay,L.flightTime=e.blobFlight,L.speedJitter=e.blobSpeedJitter,L.lead=e.blobLead,L.window=e.blobWindow,L.fillBias=e.blobFillBias,L.fillScatter=e.blobFillScatter,L.hashCell=e.blobHashCell,L.linger=e.blobLinger,L.sink=e.blobSink,L.trailSpan=e.blobTrailSpan,L.trailBurn=e.blobTrailBurn,L.trailWidth=e.blobTrailWidth,L.trailTaper=e.blobTrailTaper,L.trailLift=e.blobTrailLift,L.trailOpacity=e.blobTrailOpacity*t.opacity*a,L.trailGlow=e.blobTrailGlow*t.glow,L.trailCore=e.blobTrailCore,L.trailHeadBias=e.blobTrailHeadBias,L.trailNoise=e.blobTrailNoise*t.turbulence,L.trailNoiseScale=e.blobTrailNoiseScale*t.noiseFrequency,L.trailNoiseSpeed=e.blobTrailNoiseSpeed*t.noiseSpeed,L.trailSoftFade=e.blobTrailSoftFade,N(this.blobMaterial,e.colorBlobHot,e.colorBlobMelt,e.colorBlobCrust,e.colorBlobSeam);let c=this.blobMaterial.uniforms;c.uCrust.value=e.blobCrust,c.uCrustGrow.value=e.blobCrustGrow,c.uCrackScale.value=e.blobCrackScale*t.noiseFrequency,c.uCrackWidth.value=e.blobCrackWidth,c.uSeamGlow.value=e.blobSeamGlow,c.uRim.value=e.blobRim,c.uRimPower.value=e.blobRimPower,c.uShade.value=e.blobShade,c.uAmbient.value=e.blobAmbient,c.uFlashGain.value=e.blobFlashGain,c.uGlow.value=e.blobGlow*t.glow,c.uOpacity.value=e.blobOpacity*t.opacity,c.uSoftFade.value=e.blobSoftFade,this.blobs.setTrailColors(r(e.colorBlobTrailA),r(e.colorBlobTrailB),r(e.colorBlobTrailC),r(e.colorBlobTrailD)),this.blobs.syncGeometry(),this.blobs.update(Math.max(0,this.age-this._foundAt),L),this._live=this.blobs.count;for(let t=0;t<this.blobs.arrivalCount;t++){let n=this.blobs.arrivals[t];this.blobs.landPoint(n,U),this.pool.rippleAtWorld(U,e.rippleStrength,this.age),this._splashFx(U)}B.copy(H),B.y=e.poolHeight,this.haze.setAnchor(B);let u=f((this.fadeTime-e.hazeHold)/Math.max(.02,e.hazeFade));R.width=e.zoneRadius*2*e.hazeWidth,R.height=e.hazeHeight,R.strength=e.hazeStrength*(1-u)*this._fill(),R.opacity=e.hazeOpacity,R.frequency=e.hazeFrequency*t.noiseFrequency,R.speed=e.hazeSpeed*t.noiseSpeed,R.sourceBias=e.hazeSourceBias,R.spread=e.hazeSpread,R.vertical=e.hazeVertical,R.flicker=e.hazeFlicker,R.depthReject=e.hazeDepthReject,R.depthFade=e.hazeDepthFade,R.perspective=e.hazePerspective,R.perspectiveRef=e.hazePerspectiveRef,R.seed=this._seed,this.haze.update(R),this.spatter.setGradient(r(e.colorSpatterA),r(e.colorSpatterB),r(e.colorSpatterC),r(e.colorSpatterD)),this.spatter.uniforms.uGravity.value.set(0,e.spatterGravity,0),this.spatter.uniforms.uSizeScale.value=e.spatterSize*t.particleSize*7,this.spatter.uniforms.uLifeScale.value=e.spatterLifetime*.5*t.particleLifetime,this.spatter.uniforms.uSpeedScale.value=t.particleSpeed,this.spatter.uniforms.uOpacity.value=t.opacity,this.spatter.uniforms.uGlow.value=e.meltGlow*.8*t.glow,this.spatter.uniforms.uTurbulence.value=e.spatterTurbulence*t.turbulence,this.cinders.setGradient(r(e.colorCinderA),r(e.colorCinderB),r(e.colorCinderC),r(e.colorCinderD)),this.cinders.uniforms.uGravity.value.set(0,e.cinderGravity,0),this.cinders.uniforms.uSizeScale.value=e.cinderSize*t.particleSize*7,this.cinders.uniforms.uLifeScale.value=e.cinderLifetime*.5*t.particleLifetime,this.cinders.uniforms.uSpeedScale.value=t.particleSpeed,this.cinders.uniforms.uOpacity.value=t.opacity,this.smoke.setGradient(r(e.colorSmokeA),r(e.colorSmokeB),r(e.colorSmokeC),r(e.colorSmokeD)),this.smoke.uniforms.uGravity.value.set(0,e.smokeRise,0),this.smoke.uniforms.uSizeScale.value=e.smokeSize*t.particleSize,this.smoke.uniforms.uLifeScale.value=e.smokeLifetime*.5*t.particleLifetime,this.smoke.uniforms.uSpeedScale.value=e.smokeSpeed*t.particleSpeed,this.smoke.uniforms.uOpacity.value=e.smokeOpacity*t.opacity,this.smoke.uniforms.uTurbulence.value=.45*t.turbulence,this.position.copy(H),this.position.y=e.poolHeight+e.lightHeight,this.pool.visible=I.fill>.001&&I.opacity>.001,this._fountGate=i}_surfacePoint(e,t){let n=l.magma,r=Math.random()*Math.PI*2,i=n.zoneRadius*this._fill()*e;return t.set(H.x+Math.cos(r)*i,n.poolHeight,H.z+Math.sin(r)*i),t}_surfaceFx(e){let n=l.magma,r=l.global,i=t.uTime.value,a=this._fountGate,o=Math.round(this.spatterEmitter.tick(e,n.spatterRate*a)*r.particleCount);o>0&&(this._surfacePoint(Math.random()*Math.random(),B),z.position=B,z.radius=n.zoneRadius*.12,z.direction=V.set(0,1,0),z.speed=n.spatterSpeed,z.speedVariance=.85,z.spread=.6,z.inherit=null,z.anchor=null,z.size=.14,z.sizeVariance=.7,z.life=n.spatterLifetime,z.lifeVariance=.55,z.spin=0,z.tint=null,z.time=i,this.spatter.emit(o,z));let s=Math.round(this.cinderEmitter.tick(e,n.cinderRate*a)*r.particleCount);s>0&&(this._surfacePoint(u(.4,1),B),z.position=B,z.radius=n.zoneRadius*.2,z.direction=V.set(0,1,0),z.speed=n.cinderSpeed,z.speedVariance=.8,z.spread=.85,z.size=.1,z.sizeVariance=.7,z.life=n.cinderLifetime,z.lifeVariance=.5,z.spin=9,z.time=i,this.cinders.emit(s,z));let c=this._fill(),d=Math.round(this.smokeEmitter.tick(e,n.smokeRate*c)*r.particleCount);d>0&&(this._surfacePoint(Math.sqrt(Math.random()),B),z.position=B,z.radius=n.zoneRadius*.35,z.direction=V.set(0,1,0),z.speed=n.smokeSpeed,z.speedVariance=.7,z.spread=.95,z.size=1,z.sizeVariance=.5,z.life=n.smokeLifetime,z.lifeVariance=.4,z.spin=.3,z.time=i,this.smoke.emit(d,z))}_splashFx(e){let n=l.magma,r=l.global,i=Math.round(n.spatterOnLanding*r.particleCount);i<=0||(z.position=e,z.radius=n.blobRadius*1.4,z.direction=V.set(0,1,0),z.speed=n.spatterSpeed*.85,z.speedVariance=.9,z.spread=1,z.inherit=null,z.anchor=null,z.size=.1,z.sizeVariance=.8,z.life=n.spatterLifetime*.7,z.lifeVariance=.5,z.spin=0,z.tint=null,z.time=t.uTime.value,this.spatter.emit(i,z))}onTravel(e){this._beat=0,this._sync(),this._surfaceFx(e)}onImpact(){let e=l.magma,n=l.global,i=t.uTime.value;this._foundAt=this.age,this._centrePoint(H),B.copy(H),B.y=e.poolHeight,this.ctx.bursts.spawn(h.FIRE,B,{radius:e.burstSize*.2,endRadius:e.burstSize*n.explosionIntensity,life:.8,intensity:e.burstIntensity,opacity:.9,fresnel:1.3,displace:.85,squash:.65,colorA:r(e.colorBurstA),colorB:r(e.colorBurstB),colorC:r(e.colorBurstC)}),this.ctx.decals.spawn(v.SHOCKWAVE,H,{radius:e.shockRadius*n.explosionIntensity,life:.7,width:.07,intensity:1,colorA:r(e.colorShockA),colorB:r(e.colorShockB)});let a=Math.max(0,Math.round(e.scorchMarks));for(let t=0;t<a;t++){let n=(t+u(-.35,.35))/a*Math.PI*2,i=e.zoneRadius*u(.85,1.25);B.set(H.x+Math.cos(n)*i,0,H.z+Math.sin(n)*i),this.ctx.decals.spawn(v.SCORCH,B,{radius:e.scorchRadius*u(.7,1.3),life:e.scorchLife,intensity:e.scorchIntensity,colorA:r(e.colorScorch),colorB:r(e.colorScorchEmber),height:.014})}B.copy(H),B.y=e.poolHeight+e.fountHeight,z.position=B,z.radius=e.zoneRadius*.2,z.direction=V.set(0,1,0),z.speed=e.spatterSpeed*1.8,z.speedVariance=.9,z.spread=.7,z.inherit=null,z.anchor=null,z.size=.16,z.sizeVariance=.8,z.life=e.spatterLifetime*1.3,z.lifeVariance=.6,z.spin=0,z.tint=null,z.time=i,this.spatter.emit(Math.round(e.burstSpatter*n.particleCount),z),z.speed=e.cinderSpeed*1.6,z.spread=.95,z.size=.12,z.life=e.cinderLifetime,z.spin=11,this.cinders.emit(Math.round(e.burstCinders*n.particleCount),z),this.ctx.shake.add(e.impactShake*n.explosionIntensity*n.cameraShake,1/Math.max(.1,e.shakeDuration),18),this.ctx.flash.trigger(r(e.colorFlash),e.impactFlash*n.explosionIntensity),this.lightBoost=e.lightIntensity*1.1*n.explosionIntensity}onFade(e,t){this._beat=t,this._sync(),this._surfaceFx(e),this.ctx.shake.rumble(l.magma.rumble*this._fountGate*l.global.cameraShake,e)}onDestroy(){this._live=0,this._beat=0,this._fountGate=0,this.blobs.reset(),this.pool.reset(),this.pool.visible=!1,this.haze.visible=!1}dispose(){this.pool.dispose(),this.blobs.dispose(),this.blobMaterial.dispose(),this.haze.dispose(),super.dispose()}};export{G as MagmaAbility};
//# sourceMappingURL=MagmaAbility-BdfHk3-2.js.map