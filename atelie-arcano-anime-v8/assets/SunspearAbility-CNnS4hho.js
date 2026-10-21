import{Br as e,G as t,K as n,R as r,V as i,Y as a,at as o,di as s,et as c,g as l,h as u,nt as d,o as f,ot as p,q as m,st as h,tt as g,xt as _,y as v}from"./settings-DdywqLlV.js";import{t as y}from"./ParticleSystem-BZTczMT8.js";import{n as b}from"./ParticleEngine-DLxipNH0.js";import{n as x,t as S}from"./Ability-CYesB5Ur.js";import{t as C}from"./FilamentPaths-DR_e1O0e.js";import{n as w,r as T,t as E}from"./Distortion-CclodxJd.js";import{n as D,r as O,t as k}from"./Projectile-DQ3a3PJ-.js";var A=`
  attribute float aSeed;
  attribute float aFlight;
  attribute float aFlash;

  varying vec3  vLocal;
  varying vec3  vNormalW;
  varying vec3  vViewDir;
  varying float vViewZ;
  varying float vSeed;
  varying float vFlight;
  varying float vFlash;

  void main() {
    vLocal = position;
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
`,j=`
  uniform vec3  uColorCore;
  uniform vec3  uColorFire;
  uniform vec3  uColorEdge;
  uniform float uCore;
  uniform float uFalloff;
  uniform float uHead;
  uniform float uHeadGain;
  uniform float uFresnel;
  uniform float uFresnelPower;
  uniform float uNoise;
  uniform float uNoiseScale;
  uniform float uNoiseSpeed;
  uniform float uGlow;
  uniform float uOpacity;
  uniform float uSoft;
  uniform float uFade;

  uniform float     uTime;
  uniform vec2      uResolution;
  uniform sampler2D uSceneDepth;
  uniform float     uCameraNear;
  uniform float     uCameraFar;
  uniform float     uGlobalGlow;

  varying vec3  vLocal;
  varying vec3  vNormalW;
  varying vec3  vViewDir;
  varying float vViewZ;
  varying float vSeed;
  varying float vFlight;
  varying float vFlash;

  ${a}
  ${m}

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vViewDir);

    // Local frame. The spindle spans y in -1..1 with the point at +1 and its
    // half-width at 0.5, so "across" is 0 on the axis and 1 at the surface.
    float along  = clamp(vLocal.y * 0.5 + 0.5, 0.0, 1.0);
    float across = clamp(length(vLocal.xz) * 2.0, 0.0, 1.0);

    // The shaft, hottest on the axis.
    float body = pow(1.0 - across, max(uFalloff, 0.05));
    float core = smoothstep(uCore, uCore * 0.35, across);

    // The head. Everything past uHead runs hotter, on a curve rather than a
    // step, or the join reads as a collar.
    float head = smoothstep(uHead, 1.0, along);

    // One octave, advected down the shaft. The seed decorrelates two casts.
    float crawl = snoise(vec3(vLocal.xz * uNoiseScale, along * uNoiseScale - uTime * uNoiseSpeed) + vSeed * 13.0);
    float fire = body * (1.0 + uNoise * crawl * 0.5);

    float fres = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), max(uFresnelPower, 0.05));

    vec3 color = uColorFire * fire;
    color += uColorCore * (core + head * uHeadGain * 0.35 + vFlash);
    color += uColorEdge * fres * uFresnel;

    // The soft ceiling every emissive surface in this project carries: these
    // terms are independent and stack, and a fresnel edge crossing the white
    // core sums past 10 and the bloom pass eats the silhouette.
    color *= uGlow * uGlobalGlow;
    color /= 1.0 + color * 0.14;

    float alpha = clamp(fire + core * 0.8 + fres * 0.6, 0.0, 1.0) * uOpacity * uFade;

    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoft);
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(color, alpha);
  }
`;function M(){let t=new e({transparent:!0,depthWrite:!1,depthTest:!0,side:2,blending:2,toneMapped:!1,uniforms:n({uColorCore:{value:new _(`#ffffff`)},uColorFire:{value:new _(`#ffe07a`)},uColorEdge:{value:new _(`#ff9a1f`)},uCore:{value:.34},uFalloff:{value:2.2},uHead:{value:.62},uHeadGain:{value:2.4},uFresnel:{value:1.5},uFresnelPower:{value:2},uNoise:{value:.55},uNoiseScale:{value:4.5},uNoiseSpeed:{value:2.6},uGlow:{value:3.2},uOpacity:{value:1},uSoft:{value:.4},uFade:{value:1}}),vertexShader:A,fragmentShader:j});return t.userData.sync=(e=1)=>{let n=f.sunspear,i=f.global,a=t.uniforms;a.uColorCore.value.copy(r(n.colorSpearCore)),a.uColorFire.value.copy(r(n.colorSpearFire)),a.uColorEdge.value.copy(r(n.colorSpearEdge)),a.uCore.value=Math.max(.01,n.spearCore),a.uFalloff.value=n.spearFalloff,a.uHead.value=n.spearHead,a.uHeadGain.value=n.spearHeadGain,a.uFresnel.value=n.spearFresnel*i.fresnel,a.uFresnelPower.value=n.spearFresnelPower,a.uNoise.value=n.spearNoise*i.noiseStrength,a.uNoiseScale.value=n.spearNoiseScale*i.noiseFrequency,a.uNoiseSpeed.value=n.spearNoiseSpeed*i.noiseSpeed,a.uGlow.value=n.spearGlow*i.glow,a.uOpacity.value=n.spearOpacity*i.opacity,a.uSoft.value=n.spearSoftFade,a.uFade.value=e},t}var N=48,P=48,F=Object.freeze({FLARE:0,LICK:1}),I={},L=new s,R=new s,z=new s,B=new s(0,1,0),V={},H={},U={},W={origin:new s,axis:new s(0,1,0),side:new s(1,0,0),span:1,t:0,fade:1,seed:0},G=class extends S{constructor(e){super(`sunspear`,e)}createShaders(){this.material=M(),this.spear=new D(this.group,{geometry:()=>this._buildSpear(),shapeKey:()=>this._shapeKey(),material:this.material,capacity:1,trail:!0,trailNodes:32,trailAdditive:!0,layer:i.VFX,renderOrder:12,castShadow:!1}),this.wake=new w({mode:T.HEAT,facing:E.UPRIGHT,name:`sunspear.wake`}),this.group.add(this.wake.object3D),this.disc=new u({mode:l.SUNDISC,prefix:`disc`,segments:128,renderOrder:14}),this.disc.visible=!1,this.group.add(this.disc.group),this.corona=new C(this.group,{samples:N,capacity:P,renderOrder:13,layer:i.VFX}),this.corona.visible=!1,this._seed=0,this._impactAt=0,this._shapeHash=``}createParticles(){let e=this.ctx.particles;this.embers=e.get(`sunspear.embers`,{capacity:4e3,shape:y.STREAK,additive:!0,stretch:!0,softFade:.25}),this.embers.uniforms.uDrag.value=1.5,this.embers.uniforms.uEndSize.value=.2,this.embers.uniforms.uSizeIn.value=.02,this.embers.uniforms.uFadeIn.value=.03,this.embers.uniforms.uFadeOut.value=.4,this.smoke=e.get(`sunspear.smoke`,{capacity:1600,shape:y.SMOKE,additive:!1,curl:!0,softFade:1.1}),this.smoke.uniforms.uDrag.value=1.7,this.smoke.uniforms.uEndSize.value=3.2,this.smoke.uniforms.uSizeIn.value=.12,this.smoke.uniforms.uFadeIn.value=.18,this.smoke.uniforms.uFadeOut.value=.32,this.motes=e.get(`sunspear.motes`,{capacity:1800,shape:y.SOFT,additive:!0,curl:!0,softFade:.4}),this.motes.uniforms.uDrag.value=1.5,this.motes.uniforms.uEndSize.value=.18,this.motes.uniforms.uSizeIn.value=.06,this.motes.uniforms.uFadeIn.value=.09,this.motes.uniforms.uFadeOut.value=.42,this.emberEmitter=new b,this.smokeEmitter=new b,this.moteEmitter=new b}_buildSpear(){let e=f.sunspear,t=c({seed:3.1,sides:d(Math.round(e.spearSides),3,9),taper:e.spearTaper,roughness:e.spearRough,bend:e.spearBend});return t.translate(0,-.5,0),t.scale(1,2,1),t}_shapeKey(){let e=f.sunspear;return`${Math.round(e.spearSides)}|${e.spearTaper}|${e.spearRough}|${e.spearBend}`}get instanceCount(){return this.spear.count+this.corona.liveCount}get impactDuration(){return Math.max(.1,f.sunspear.discHold*f.global.lifetime)}get fadeDuration(){return Math.max(.1,f.sunspear.discFade)}_spearClock(){let e=f.sunspear;if(this.phase===x.TRAVEL)return this.u*Math.max(.05,e.spearFlight);let t=this.age-this._impactAt;return Math.max(.05,e.spearFlight)*(1+t/Math.max(.05,e.wakeBurn))}_discLife(){if(this.phase===x.TRAVEL)return 0;let e=this.impactDuration+this.fadeDuration;return h((this.age-this._impactAt)/Math.max(.05,e))}_impactPoint(e){return this.pointAt(1,e).setY(0)}onSpawn(){this.emberEmitter.reset(),this.smokeEmitter.reset(),this.moteEmitter.reset(),this.spear.reset(),this.corona.clear(),this._seed=Math.random()*100,this._impactAt=0,this.spear.roll(this._seed),this.disc.visible=!1,this.corona.visible=!1,this.wake.visible=!0,this._syncSpear(),this._syncWake(0),this._syncParticles(),this._muzzleFx()}_syncSpear(){let e=f.sunspear,t=f.global,n=V;n.mode=k.ARC,n.stagger=O.NONE,n.count=1,n.radius=e.spearRadius,n.sizeJitter=0,n.stretch=e.spearStretch,n.align=e.spearAlign,n.spin=e.spearSpin*t.randomness,n.flash=e.spearFlash,n.handForward=e.handForward,n.handSide=e.handSide,n.handHeight=e.handHeight,n.landHeight=e.landHeight,n.landInZone=!1,n.spreadSide=0,n.spreadForward=0,n.pathCurve=e.arcCurve,n.apex=e.arcApex,n.apexCurve=e.arcApexCurve,n.weaveSide=0,n.weaveUp=0,n.flightTime=Math.max(.05,e.spearFlight),n.speedJitter=0,n.lead=0,n.window=0,n.linger=0,n.sink=0,n.trailSpan=e.wakeSpan*Math.max(.05,e.spearFlight),n.trailBurn=Math.max(.05,e.spearFlight),n.trailWidth=e.wakeTrailWidth,n.trailTaper=e.wakeTrailTaper,n.trailLift=e.wakeTrailLift,n.trailOpacity=e.wakeTrailOpacity*t.opacity,n.trailGlow=e.wakeTrailGlow*t.glow,n.trailCore=e.wakeTrailCore,n.trailHeadBias=e.wakeTrailHeadBias,n.trailNoise=e.wakeTrailNoise*t.noiseStrength,n.trailNoiseScale=e.wakeTrailNoiseScale*t.noiseFrequency,n.trailNoiseSpeed=e.wakeTrailNoiseSpeed*t.noiseSpeed,n.trailSoftFade=e.wakeTrailSoftFade,this.spear.setBasis(this.origin,this.direction,this.side,this.length),this.spear.setTrailColors(e.colorWakeA,e.colorWakeB,e.colorWakeC,e.colorWakeD),this.spear.update(this._spearClock(),n),this.material.userData.sync(+(this.phase===x.TRAVEL))}_syncWake(e){let t=f.sunspear,n=H,r=h(e);r<1?this.spear.slotPosition(0,L):this._impactPoint(L),r>0&&(this._impactPoint(z),L.lerp(z,r)),this.wake.setAnchorXYZ(L.x,Math.max(0,L.y-t.wakeHeight*.5),L.z),n.width=o(t.wakeWidth,t.discWakeWidth,r),n.height=o(t.wakeHeight,t.discWakeHeight,r);let i=1-t.wakeFall*(this.phase===x.TRAVEL?this.u:1);n.strength=o(t.wakeStrength*i,t.discWakeStrength,r),n.opacity=t.wakeOpacity,n.seed=this._seed,n.frequency=t.wakeFrequency*f.global.noiseFrequency,n.speed=t.wakeSpeed*f.global.noiseSpeed,n.sourceBias=t.wakeSourceBias,n.spread=t.wakeSpread,n.vertical=t.wakeVertical,n.flicker=t.wakeFlicker,n.depthReject=t.wakeDepthReject,n.depthFade=t.wakeDepthFade,n.perspective=t.wakePerspective,n.perspectiveRef=t.wakePerspectiveRef,this.wake.update(n)}_syncDisc(e){let t=f.sunspear;this._impactPoint(z),W.origin.copy(z),W.axis.set(0,1,0),W.side.copy(this.side),W.span=this.length,W.t=this._discLife(),W.fade=e,W.seed=this._seed,this.disc.sync(t,W,f.global);let n=Math.max(.05,this.disc.radius);z.y=t.discLift;let r=this.corona.role(F.FLARE);r.count=Math.round(t.flareCount)*+(e>.001),r.rim(z,B,n*t.flareRadius,t.flareSpan,t.flareSpeed,t.flareLift,t.flareJitter,t.flareHug,0).style(1,1,1,.3).ends(1,1,1,1).draw(2,.12,0,.6);let i=this.corona.role(F.LICK);i.count=Math.round(t.lickCount)*+(e>.001),i.rim(z,B,n*t.lickRadius,t.lickSpan,t.lickSpeed,t.lickLift,t.lickJitter,t.lickHug,t.lickPhase).style(1.4,1.5,.85,.45).ends(1,1,1,1).draw(2,.2,0,1.1),this._syncCoronaLook(e)}_syncCoronaLook(e){let t=f.sunspear,n=f.global,r=U;r.width=t.flareWidth,r.glowWidth=t.flareGlowWidth,r.glowOpacity=t.flareGlowOpacity,r.jitter=t.flareKink,r.jitterScale=t.flareKinkScale,r.octaves=t.flareOctaves,r.jitterFalloff=t.flareKinkFalloff,r.crawl=t.flareCrawl,r.pinch=t.flarePinch,r.restrike=t.flareRestrike,r.flicker=t.flareFlicker,r.flickerSpeed=t.flareFlickerSpeed,r.strandFlash=t.flareStrandFlash,r.coreSharp=t.flareCoreSharp,r.glowFalloff=t.flareFalloff,r.softFade=t.flareSoftFade,r.opacity=t.flareOpacity,r.glow=t.flareGlow,r.colorCore=t.colorFlareCore,r.colorInner=t.colorFlareInner,r.colorOuter=t.colorFlareOuter,r.colorHalo=t.colorFlareHalo,r.randomness=n.randomness,r.noiseStrength=n.noiseStrength,r.noiseFrequency=n.noiseFrequency,r.noiseSpeed=n.noiseSpeed,r.opacityScale=n.opacity,r.glowScale=n.glow,this.corona.sync(r,e,this._seed)}_syncParticles(){let e=f.sunspear,t=f.global;this.embers.setGradient(r(e.colorEmberA),r(e.colorEmberB),r(e.colorEmberC),r(e.colorEmberD)),this.embers.uniforms.uGravity.value.set(0,e.emberGravity,0),this.embers.uniforms.uSizeScale.value=e.emberSize*t.particleSize*7,this.embers.uniforms.uLifeScale.value=e.emberLifetime*.5*t.particleLifetime,this.embers.uniforms.uSpeedScale.value=t.particleSpeed,this.embers.uniforms.uOpacity.value=t.opacity,this.embers.uniforms.uGlow.value=e.spearGlow*.4*t.glow,this.embers.uniforms.uStretch.value=e.emberStretch,this.smoke.setGradient(r(e.colorSmokeA),r(e.colorSmokeB),r(e.colorSmokeC),r(e.colorSmokeD)),this.smoke.uniforms.uGravity.value.set(0,e.smokeRise,0),this.smoke.uniforms.uSizeScale.value=e.smokeSize*t.particleSize,this.smoke.uniforms.uLifeScale.value=e.smokeLifetime*.5*t.particleLifetime,this.smoke.uniforms.uSpeedScale.value=e.smokeSpeed*t.particleSpeed,this.smoke.uniforms.uOpacity.value=e.smokeOpacity*t.opacity,this.smoke.uniforms.uTurbulence.value=.4*t.turbulence,this.motes.setGradient(r(e.colorMoteA),r(e.colorMoteB),r(e.colorMoteC),r(e.colorMoteD)),this.motes.uniforms.uGravity.value.set(0,e.moteRise,0),this.motes.uniforms.uSizeScale.value=e.moteSize*t.particleSize*7,this.motes.uniforms.uLifeScale.value=e.moteLifetime*.5*t.particleLifetime,this.motes.uniforms.uSpeedScale.value=e.moteSpeed*t.particleSpeed,this.motes.uniforms.uOpacity.value=t.opacity,this.motes.uniforms.uGlow.value=1.2*t.glow,this.motes.uniforms.uTurbulence.value=e.moteTurbulence*t.turbulence}_muzzleFx(){let e=f.sunspear,n=f.global;L.copy(this.origin).addScaledVector(this.direction,e.handForward).addScaledVector(this.side,e.handSide),L.y=e.handHeight,I.position=L,I.radius=.2,I.direction=R.copy(this.direction),I.speed=e.emberSpeed*1.4,I.speedVariance=.8,I.spread=.7,I.inherit=null,I.anchor=null,I.size=e.emberSize*1.2,I.sizeVariance=.7,I.life=e.emberLifetime,I.lifeVariance=.5,I.spin=0,I.tint=null,I.time=t.uTime.value,this.embers.emit(Math.round(50*n.particleCount),I),this.ctx.flash.trigger(r(e.colorCastFlash),e.castFlash*n.explosionIntensity)}_flightFx(e){let n=f.sunspear,r=f.global,i=Math.round(this.emberEmitter.tick(e,n.emberRate)*r.particleCount);i<=0||(this.spear.slotPosition(0,L),I.position=L,I.radius=n.spearRadius*n.spearStretch*.6,I.direction=R.copy(this.direction).multiplyScalar(-.6).setY(.5).normalize(),I.speed=n.emberSpeed,I.speedVariance=.85,I.spread=.9,I.inherit=null,I.anchor=null,I.size=n.emberSize,I.sizeVariance=.7,I.life=n.emberLifetime,I.lifeVariance=.6,I.spin=0,I.tint=null,I.time=t.uTime.value,this.embers.emit(i,I))}_discFx(e,n){let r=f.sunspear,i=f.global,a=t.uTime.value,o=Math.max(.05,this.disc.radius),s=Math.round(this.smokeEmitter.tick(e,r.smokeRate*n)*i.particleCount);s>0&&(this._impactPoint(L),L.y=.2,I.position=L,I.radius=o*.9,I.direction=R.set(0,1,0),I.speed=r.smokeSpeed,I.speedVariance=.7,I.spread=.9,I.inherit=null,I.anchor=null,I.size=1,I.sizeVariance=.5,I.life=r.smokeLifetime,I.lifeVariance=.4,I.spin=.35,I.tint=null,I.time=a,this.smoke.emit(s,I));let c=Math.round(this.moteEmitter.tick(e,r.moteRate*n)*i.particleCount);c>0&&(this._impactPoint(L),L.y=.12,I.position=L,I.radius=o*.95,I.direction=R.set(0,1,0),I.speed=r.moteSpeed,I.speedVariance=.8,I.spread=.85,I.size=r.moteSize,I.sizeVariance=.6,I.life=r.moteLifetime,I.lifeVariance=.5,I.spin=0,I.time=a,this.motes.emit(c,I))}onTravel(e){this._syncParticles(),this._syncSpear(),this._syncWake(0),this._flightFx(e),this.spear.slotPosition(0,this.position),this.ctx.shake.rumble(f.sunspear.rumble*f.global.cameraShake,e)}onImpact(){let e=f.sunspear,n=f.global,i=t.uTime.value;this._impactAt=this.age,this.disc.visible=!0,this.corona.visible=!0,this._impactPoint(L),L.y=.45,this.ctx.bursts.spawn(v.FIRE,L,{radius:e.burstSize*.2,endRadius:e.burstSize*n.explosionIntensity,life:.8,intensity:e.burstIntensity,opacity:.9,fresnel:1.6,displace:.55,squash:.7,colorA:r(e.colorBurstA),colorB:r(e.colorBurstB),colorC:r(e.colorBurstC)}),I.position=L,I.radius=.4,I.direction=R.set(p(-.3,.3),1,p(-.3,.3)).normalize(),I.speed=e.emberSpeed*2.4,I.speedVariance=.9,I.spread=1,I.inherit=null,I.anchor=null,I.size=e.emberSize*1.4,I.sizeVariance=.8,I.life=e.emberLifetime*1.6,I.lifeVariance=.6,I.spin=0,I.tint=null,I.time=i,this.embers.emit(Math.round(e.emberBurst*n.particleCount),I),this.ctx.shake.add(e.impactShake*n.explosionIntensity*n.cameraShake,1/Math.max(.1,e.shakeDuration),28),this.ctx.flash.trigger(r(e.colorFlash),e.impactFlash*n.explosionIntensity),this.lightBoost=e.lightIntensity*1.6*n.explosionIntensity}onFade(e,t){let n=f.sunspear,r=t<=1?1:1-g.outQuint(h(t-1));this._syncParticles(),this._syncSpear(),this._syncDisc(r);let i=h((this.age-this._impactAt)/Math.max(.02,n.discWakeSettle));this._syncWake(i),this._discFx(e,r),this._impactPoint(this.position),this.position.y=.5}onDestroy(){this.spear.reset(),this.corona.clear(),this.corona.visible=!1,this.disc.visible=!1,this.wake.visible=!1}dispose(){this.spear.dispose(),this.corona.dispose(),this.disc.dispose(),this.wake.dispose(),this.material.dispose(),super.dispose()}};export{G as SunspearAbility};
//# sourceMappingURL=SunspearAbility-CNnS4hho.js.map