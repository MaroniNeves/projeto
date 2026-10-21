import{$ as e,Br as t,G as n,K as r,Qt as i,R as a,V as o,Y as s,at as c,di as l,o as u,ot as d,q as f,st as p,tt as m,xt as h,y as g,yn as _}from"./settings-DdywqLlV.js";import{t as v}from"./ParticleSystem-BZTczMT8.js";import{n as y}from"./ParticleEngine-DLxipNH0.js";import{n as b}from"./GroundDecals-kYmr8HKl.js";import{n as x,t as S}from"./Ability-CYesB5Ur.js";import{i as C,n as w,r as T,t as E}from"./Swarm-WksC-UkD.js";var D=`
  #define PI  3.141592653589793
  #define TAU 6.283185307179586

  uniform float uTime;

  ${s}
  
  uniform float uSeed;

  uniform int   uLeadMode;
  uniform vec3  uLeadA;
  uniform vec3  uLeadB;
  uniform vec3  uForward;
  uniform vec3  uSideAxis;
  uniform float uLeadRise;
  uniform float uLeadS;
  uniform float uLeadRate;
  uniform float uOrbitRadius;
  uniform float uOrbitHeight;
  uniform float uOrbitTurns;

  uniform vec3  uLattice;
  uniform float uSpacingSide;
  uniform float uSpacingUp;
  uniform float uLag;
  uniform float uJitter;
  uniform float uChurn;
  uniform float uBreathe;
  uniform float uBreatheRate;
  uniform float uWander;
  uniform float uWanderScale;
  uniform float uWanderSpeed;
  uniform float uGather;

  /** Normalise, or fall back — a zero-length basis vector is a NaN ribbon. */
  vec3 safeNormalize(vec3 v, vec3 fallback) {
    float l2 = dot(v, v);
    return l2 > 1e-8 ? v * inversesqrt(l2) : fallback;
  }

  vec3 leadAt(float s) {
    if (uLeadMode == 2) {
      float a = s * TAU * uOrbitTurns;
      return uLeadB + vec3(cos(a), 0.0, sin(a)) * uOrbitRadius + vec3(0.0, uOrbitHeight, 0.0);
    }
    if (uLeadMode == 1) {
      float t = clamp(s, -0.5, 1.0);
      vec3 p = mix(uLeadA, uLeadB, t);
      p.y += uLeadRise * sin(PI * clamp(t, 0.0, 1.0));
      return p;
    }
    return uLeadB;
  }

  vec3 cellOf(float idx, vec3 L) {
    vec3 cell = vec3(
      mod(idx, L.x),
      mod(floor(idx / L.x), L.y),
      mod(floor(idx / (L.x * L.y)), L.z)
    );
    vec3 shift = floor(hash31(uSeed * 13.0 + 0.7) * L);
    return mod(cell + shift, L);
  }

  vec3 agentAt(vec3 dice, float idx, float dt) {
    vec3 L = max(vec3(1.0), floor(uLattice));
    vec3 cell = cellOf(idx, L);
    vec3 centred = cell - (L - 1.0) * 0.5;

    float lagN = L.z > 1.0 ? cell.z / (L.z - 1.0) : 0.0;
    float lag = uLag * lagN;

    float t = uTime + dt;
    vec3 home = leadAt(uLeadS + (dt - lag) * uLeadRate);

    vec2 plane = vec2(centred.x * uSpacingSide, centred.y * uSpacingUp);
    plane += (dice.xy - 0.5) * (2.0 * uJitter);
    plane = rot2(t * uChurn + dice.z * TAU * 0.15 + uSeed) * plane;
    plane *= 1.0 + uBreathe * sin(t * uBreatheRate + dice.y * TAU);

    vec3 pos = home + uSideAxis * plane.x + vec3(0.0, plane.y, 0.0);
    pos += curlNoise(pos * uWanderScale + vec3(0.0, t * uWanderSpeed, 0.0) + dice.z * 17.0) * uWander;

    return mix(home, pos, clamp(uGather, 0.0, 1.0));
  }


  uniform float uSpan;          // seconds of flight the tail reaches back over
  uniform float uWidth;         // metres, half-width at the head
  uniform float uWidthTaper;    // >1 sharpens the tail to a point
  uniform float uLift;          // metres the tail floats above the flown path
  uniform float uSag;           // metres the tail drops per second of age
  uniform float uWobble;        // metres of curl drift on the tail
  uniform float uWobbleScale;   // features per metre
  uniform float uWobbleSpeed;
  uniform float uReveal;        // 0..1 — a bird's trail appears with the bird
  uniform float uRevealSpread;  // 0..1 width of that wave
  uniform float uFade;          // the whole ribbon's master fade

  attribute float aStrand;      // which bird this instance belongs to
  attribute float aSeed;        // that bird's seed — mirrors the flock's

  varying float vAlong;         // 0 tail, 1 head
  varying float vAcross;        // -1..1 across the ribbon
  varying float vSeed;
  varying float vViewZ;
  varying float vAlpha;

  void main() {
    float v = clamp(position.x, 0.0, 1.0);
    float side = position.y;

    // Same hash the flock's vertex shader takes, off the same seed, so this
    // ribbon is threaded through that bird and not a bird beside it.
    vec3 dice = hash31(aSeed * 91.7 + 3.1);

    float back = -(1.0 - v) * max(uSpan, 0.0);
    vec3 p = agentAt(dice, aStrand, back);

    // The tangent comes from a second evaluation a fixed step earlier rather
    // than from the neighbouring strip node: the node spacing changes with
    // uSpan, and a tangent that changes width when you drag the span is the
    // sort of coupling that takes an afternoon to find.
    const float H = 0.03;
    vec3 behind = agentAt(dice, aStrand, back - H);
    vec3 tangent = safeNormalize(p - behind, uForward);

    vec3 viewDir = safeNormalize(cameraPosition - p, vec3(0.0, 0.0, 1.0));
    vec3 across = safeNormalize(cross(tangent, viewDir), uSideAxis);

    float age = (1.0 - v) * max(uSpan, 0.0);
    // Embers slump and drift apart behind the bird. Both terms are keyed off
    // the age of the sample rather than off v, so they do not change shape when
    // the span is dragged.
    p.y += uLift * age - uSag * age * age;
    p += curlNoise(p * uWobbleScale + vec3(0.0, uTime * uWobbleSpeed, 0.0) + dice.z * 29.0) * (uWobble * age);

    float w = uWidth * pow(v, max(uWidthTaper, 0.01));
    vec3 world = p + across * (side * w);

    float threshold = dice.z * (1.0 - clamp(uRevealSpread, 0.0, 1.0));
    vAlpha = smoothstep(threshold, threshold + max(uRevealSpread, 1e-3), clamp(uReveal, 0.0, 1.0)) * uFade;

    vAlong = v;
    vAcross = side;
    vSeed = aSeed;

    vec4 mv = modelViewMatrix * vec4(world, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,O=`
  uniform vec2  uResolution;
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;
  uniform float uGlobalGlow;

  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  uniform vec3  uColorD;
  uniform float uTint;          // where in the gradient the head sits
  uniform float uTintAlong;     // how far down the gradient the tail walks
  uniform float uTintJitter;    // ±per-bird walk along it
  uniform float uCore;          // how tightly light crowds the centre line
  uniform float uHeadBias;      // >0 keeps the brightness near the bird
  uniform float uOpacity;
  uniform float uGlow;
  uniform float uSoftFade;      // metres of depth feather against solid geometry

  varying float vAlong;
  varying float vAcross;
  varying float vSeed;
  varying float vViewZ;
  varying float vAlpha;

  ${s}
  ${f}

  void main() {
    if (vAlpha < 0.004) discard;

    // Triangular across the ribbon, raised to a power: the strip has two
    // vertices per node, so anything smoother than this has to come out of the
    // exponent rather than out of more geometry.
    float body = pow(max(0.0, 1.0 - abs(vAcross)), max(uCore, 0.05));
    float along = mix(1.0, vAlong, clamp(uHeadBias, 0.0, 1.0));

    float alpha = body * along * vAlpha * uOpacity;
    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.004) discard;

    float t = clamp(
      uTint + (1.0 - vAlong) * uTintAlong + uTintJitter * (hash11(vSeed * 51.3) - 0.5) * 2.0,
      0.0,
      1.0
    );
    vec3 colour = gradient4(uColorA, uColorB, uColorC, uColorD, t);
    colour *= uGlow * uGlobalGlow;

    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 1.0));
  }
`,k=[`uSeed`,`uLeadMode`,`uLeadA`,`uLeadB`,`uForward`,`uSideAxis`,`uLeadRise`,`uLeadS`,`uLeadRate`,`uOrbitRadius`,`uOrbitHeight`,`uOrbitTurns`,`uLattice`,`uSpacingSide`,`uSpacingUp`,`uLag`,`uJitter`,`uChurn`,`uBreathe`,`uBreatheRate`,`uWander`,`uWanderScale`,`uWanderSpeed`,`uGather`];function A(e){let n={};for(let t of k)n[t]=e[t];return new t({name:`EmberTrail`,vertexShader:D,fragmentShader:O,transparent:!0,depthWrite:!1,depthTest:!0,blending:2,toneMapped:!1,uniforms:r({...n,uSpan:{value:.34},uWidth:{value:.09},uWidthTaper:{value:1.5},uLift:{value:.35},uSag:{value:.4},uWobble:{value:.5},uWobbleScale:{value:.7},uWobbleSpeed:{value:.6},uReveal:{value:1},uRevealSpread:{value:.35},uFade:{value:1},uColorA:{value:new h(1,1,1)},uColorB:{value:new h(1,1,1)},uColorC:{value:new h(1,1,1)},uColorD:{value:new h(1,1,1)},uTint:{value:.1},uTintAlong:{value:.7},uTintJitter:{value:.15},uCore:{value:1.6},uHeadBias:{value:.45},uOpacity:{value:1},uGlow:{value:1.6},uSoftFade:{value:.4}})})}function j(e,t,n,r,i){let o=e.uniforms;return o.uColorA.value.copy(a(t)),o.uColorB.value.copy(a(n)),o.uColorC.value.copy(a(r)),o.uColorD.value.copy(a(i)),e}var M=48,N=32,P=C(),F={},I=new l,L=new l,R=new l,z=new l,B=class extends S{constructor(e){super(`emberflock`,e)}createShaders(){this.flock=new T(this.group,{capacity:M,silhouette:w.BIRD,additive:!0,renderOrder:13}),this.trailGeometry=e(N,M),this.trailSeeds=new i(new Float32Array(M),1),this.trailGeometry.setAttribute(`aSeed`,this.trailSeeds),this.trailMaterial=A(this.flock.uniforms),this.trailMesh=new _(this.trailGeometry,this.trailMaterial),this.trailMesh.frustumCulled=!1,this.trailMesh.matrixAutoUpdate=!1,this.trailMesh.layers.set(o.VFX),this.trailMesh.renderOrder=11,this.group.add(this.trailMesh),this._seed=0,this._live=0,this._charDistance=0,this._beat=0}createParticles(){let e=this.ctx.particles;this.embers=e.get(`emberflock.embers`,{capacity:3200,shape:v.SOFT,additive:!0,curl:!0,softFade:.4}),this.embers.uniforms.uDrag.value=1.5,this.embers.uniforms.uEndSize.value=.2,this.embers.uniforms.uSizeIn.value=.08,this.embers.uniforms.uFadeIn.value=.1,this.embers.uniforms.uFadeOut.value=.45,this.sparks=e.get(`emberflock.sparks`,{capacity:2400,shape:v.STREAK,additive:!0,stretch:!0,softFade:.25}),this.sparks.uniforms.uDrag.value=1.1,this.sparks.uniforms.uEndSize.value=.2,this.sparks.uniforms.uSizeIn.value=.02,this.sparks.uniforms.uFadeIn.value=.03,this.sparks.uniforms.uFadeOut.value=.5,this.smoke=e.get(`emberflock.smoke`,{capacity:1600,shape:v.SMOKE,additive:!1,curl:!0,softFade:1}),this.smoke.uniforms.uDrag.value=1.9,this.smoke.uniforms.uEndSize.value=2.6,this.smoke.uniforms.uSizeIn.value=.14,this.smoke.uniforms.uFadeIn.value=.2,this.smoke.uniforms.uFadeOut.value=.32,this.emberEmitter=new y,this.sparkEmitter=new y,this.smokeEmitter=new y,this.columnEmitter=new y}get instanceCount(){return this._live*2}get impactDuration(){return Math.max(.05,u.emberflock.lifetime*u.global.lifetime)}get fadeDuration(){return Math.max(.05,u.emberflock.fadeTime)}lightShimmer(){let e=u.emberflock,t=Math.floor(this.age*Math.max(1,e.lightFlickerSpeed)),n=Math.abs(Math.sin(t*127.1)*43758.5453)%1;return 1-p(e.lightFlicker)*n}_sinceArrival(){return this.phase===x.TRAVEL?0:this.impactTime+this.fadeTime}_collapse(){let e=u.emberflock;return m.outCubic(p(this._sinceArrival()/Math.max(.02,e.collapseTime)))}_rise(){let e=u.emberflock,t=this._sinceArrival()-e.collapseTime;return m.outCubic(p(t/Math.max(.02,e.columnTime)))}_birdReveal(){let e=u.emberflock,t=p(this.age/Math.max(.02,e.revealTime)),n=1-p((this._sinceArrival()-e.collapseTime-e.columnTime)/Math.max(.02,e.birdFade));return Math.min(t,n)}_trailReveal(){let e=u.emberflock,t=p(this.age/Math.max(.02,e.revealTime)),n=1-p((this._sinceArrival()-e.collapseTime-e.columnTime-e.birdFade-e.trailPersist)/Math.max(.02,e.trailFadeTime));return Math.min(t,n)}_flockRadius(e){let t=u.emberflock,n=c(t.spacingSide,t.columnRadius,e);return(Math.max(1,Math.round(t.latticeX))-1)*n*.5+t.jitter+t.wander+t.size}onSpawn(){this.emberEmitter.reset(),this.sparkEmitter.reset(),this.smokeEmitter.reset(),this.columnEmitter.reset(),this._charDistance=0,this._beat=0,this._seed=Math.random()*100,this.flock.roll(this._seed);let e=this.flock.seeds.array;for(let t=0;t<M;t++)this.trailSeeds.array[t]=e[t];this.trailSeeds.needsUpdate=!0,this._sync(),this._releaseFx()}_sync(){let e=u.emberflock,t=u.global,n=P,r=this.phase===x.TRAVEL,i=this._collapse(),o=this._rise(),s=this._beat<=1?1:1-m.inCubic(p(this._beat-1)),l=1-i*p(e.collapseTighten);this._live=Math.max(0,Math.min(M,Math.round(e.birds))),n.count=this._live,n.leadMode=E.LINE,n.leadS=r?this.u:1,n.leadRate=r?e.speed*t.speed/Math.max(.1,this.length):0,n.leadRise=e.leadRise*(1-i),n.handForward=e.handForward,n.handSide=e.handSide,n.handHeight=e.handHeight,n.endHeight=e.endHeight+e.columnHeight*o,n.latticeX=e.latticeX,n.latticeY=e.latticeY,n.latticeZ=e.latticeZ,n.spacingSide=c(e.spacingSide,e.columnRadius,i),n.spacingUp=c(e.spacingUp,e.columnSpacing,i),n.lag=c(e.lag,e.columnLag,i),n.jitter=e.jitter*l,n.churn=c(e.churn,e.columnChurn,i),n.breathe=e.breathe*l,n.breatheRate=e.breatheRate,n.wander=e.wander*l*t.turbulence,n.wanderScale=e.wanderScale*t.noiseFrequency,n.wanderSpeed=e.wanderSpeed*t.noiseSpeed,n.gather=e.gather,n.size=e.size,n.aspect=e.aspect,n.sizeJitter=e.sizeJitter*t.randomness,n.billboard=e.billboard,n.bank=e.bank,n.bankMax=e.bankMax,n.dihedral=e.dihedral,n.flapRate=e.flapRate,n.curl=e.wingCurl,n.edgeStretch=e.edgeStretch,n.reveal=this._birdReveal(),n.revealSpread=e.revealSpread,n.silhouette=w.BIRD,n.sweep=e.sweep,n.edgeGain=e.edgeGain,n.lit=e.lit,n.tint=e.tint,n.tintJitter=e.tintJitter,n.tintAlong=e.tintAlong,n.opacity=e.opacity*t.opacity*s,n.glow=e.glow*t.glow,n.softFade=e.softFade,this.flock.setBasis(this.origin,this.direction,this.side,this.length),this.flock.setColors(e.colorBirdA,e.colorBirdB,e.colorBirdC,e.colorBirdD),this.flock.update(this.age,n);let d=this.trailMaterial.uniforms;d.uSpan.value=c(e.trailSpan,e.columnTrailSpan,i),d.uWidth.value=e.trailWidth,d.uWidthTaper.value=e.trailTaper,d.uLift.value=e.trailLift,d.uSag.value=e.trailSag,d.uWobble.value=e.trailWobble*l*t.turbulence,d.uWobbleScale.value=e.trailWobbleScale*t.noiseFrequency,d.uWobbleSpeed.value=e.trailWobbleSpeed*t.noiseSpeed,d.uReveal.value=this._trailReveal(),d.uRevealSpread.value=e.revealSpread,d.uFade.value=s,d.uTint.value=e.trailTint,d.uTintAlong.value=e.trailTintAlong,d.uTintJitter.value=e.trailTintJitter,d.uCore.value=e.trailCore,d.uHeadBias.value=e.trailHeadBias,d.uOpacity.value=e.trailOpacity*t.opacity,d.uGlow.value=e.trailGlow*t.glow,d.uSoftFade.value=e.trailSoftFade,j(this.trailMaterial,e.colorTrailA,e.colorTrailB,e.colorTrailC,e.colorTrailD),this.trailGeometry.instanceCount=this._live,this.trailMesh.visible=this._live>0&&d.uReveal.value>.001,this.embers.setGradient(a(e.colorEmberA),a(e.colorEmberB),a(e.colorEmberC),a(e.colorEmberD)),this.embers.uniforms.uGravity.value.set(0,e.emberRise,0),this.embers.uniforms.uSizeScale.value=e.emberSize*t.particleSize*7,this.embers.uniforms.uLifeScale.value=e.emberLifetime*.5*t.particleLifetime,this.embers.uniforms.uSpeedScale.value=t.particleSpeed,this.embers.uniforms.uOpacity.value=t.opacity,this.embers.uniforms.uGlow.value=e.glow*.7*t.glow,this.embers.uniforms.uTurbulence.value=e.emberTurbulence*t.turbulence,this.sparks.setGradient(a(e.colorSparkA),a(e.colorSparkB),a(e.colorSparkC),a(e.colorSparkD)),this.sparks.uniforms.uGravity.value.set(0,e.sparkGravity,0),this.sparks.uniforms.uSizeScale.value=e.sparkSize*t.particleSize*7,this.sparks.uniforms.uLifeScale.value=e.sparkLifetime*.5*t.particleLifetime,this.sparks.uniforms.uSpeedScale.value=t.particleSpeed,this.sparks.uniforms.uOpacity.value=t.opacity,this.sparks.uniforms.uGlow.value=e.glow*.9*t.glow,this.sparks.uniforms.uStretch.value=e.sparkStretch,this.sparks.uniforms.uTurbulence.value=.2*t.turbulence,this.smoke.setGradient(a(e.colorSmokeA),a(e.colorSmokeB),a(e.colorSmokeC),a(e.colorSmokeD)),this.smoke.uniforms.uGravity.value.set(0,e.smokeRise,0),this.smoke.uniforms.uSizeScale.value=e.smokeSize*t.particleSize,this.smoke.uniforms.uLifeScale.value=e.smokeLifetime*.5*t.particleLifetime,this.smoke.uniforms.uSpeedScale.value=e.smokeSpeed*t.particleSpeed,this.smoke.uniforms.uOpacity.value=e.smokeOpacity*t.opacity,this.smoke.uniforms.uTurbulence.value=.4*t.turbulence}_releaseFx(){let e=u.emberflock,t=u.global;this.flock.leadPoint(I),F.position=I,F.radius=this._flockRadius(0)*.6,F.direction=L.copy(this.direction).multiplyScalar(.6).setY(.5).normalize(),F.speed=e.sparkSpeed*1.3,F.speedVariance=.8,F.spread=.9,F.inherit=null,F.anchor=null,F.size=.16,F.sizeVariance=.7,F.life=e.sparkLifetime,F.lifeVariance=.5,F.spin=0,F.tint=null,F.time=n.uTime.value,this.sparks.emit(Math.round(e.gatherSparks*t.particleCount),F),this.ctx.flash.trigger(a(e.colorCastFlash),e.castFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.5*t.explosionIntensity}_flockFx(e,t,r){let i=u.emberflock,a=u.global,o=n.uTime.value,s=this._flockRadius(r);this.flock.leadPoint(R);let c=Math.round(this.emberEmitter.tick(e,i.emberRate*t)*a.particleCount);c>0&&(I.copy(R).addScaledVector(this.direction,-d(0,s)),F.position=I,F.radius=s,F.direction=L.set(0,1,0),F.speed=i.emberSpeed,F.speedVariance=.85,F.spread=1,F.inherit=null,F.anchor=null,F.size=.1,F.sizeVariance=.7,F.life=i.emberLifetime,F.lifeVariance=.55,F.spin=0,F.tint=null,F.time=o,this.embers.emit(c,F));let l=Math.round(this.sparkEmitter.tick(e,i.sparkRate*t)*a.particleCount);l>0&&(F.position=R,F.radius=s*.9,F.direction=L.copy(this.direction).multiplyScalar(-.4).setY(.35).normalize(),F.speed=i.sparkSpeed,F.speedVariance=.9,F.spread=1,F.size=.12,F.sizeVariance=.7,F.life=i.sparkLifetime,F.lifeVariance=.6,F.spin=0,F.time=o,this.sparks.emit(l,F));let f=Math.round(this.smokeEmitter.tick(e,i.smokeRate*t)*a.particleCount);f>0&&(I.copy(R).addScaledVector(this.direction,-d(0,s*2)),F.position=I,F.radius=s*1.2,F.direction=L.set(0,1,0),F.speed=i.smokeSpeed,F.speedVariance=.7,F.spread=.95,F.size=.8,F.sizeVariance=.5,F.life=i.smokeLifetime,F.lifeVariance=.4,F.spin=.35,F.time=o,this.smoke.emit(f,F))}_groundFx(){let e=u.emberflock,t=1/Math.max(.02,e.scorchRate);for(;this.front-this._charDistance>=t;){this._charDistance+=t;let n=p(this._charDistance/this.length);this.pointAt(n,z);let r=this._flockRadius(0)*.7;z.x+=this.side.x*d(-r,r),z.z+=this.side.z*d(-r,r),this.ctx.decals.spawn(b.SCORCH,z,{radius:e.scorchRadius*d(.6,1.3),life:e.scorchLife,intensity:e.scorchIntensity,colorA:a(e.colorScorch),colorB:a(e.colorCharEmber),height:.012})}}_columnFx(e,t){let r=u.emberflock,i=u.global,a=t>0?1-t*t:0,o=Math.round(this.columnEmitter.tick(e,r.columnEmbers*a)*i.particleCount);o<=0||(this.pointAt(1,I),I.y=r.endHeight,F.position=I,F.radius=this._flockRadius(1)*1.4,F.direction=L.set(0,1,0),F.speed=r.columnSpeed,F.speedVariance=.5,F.spread=.16,F.inherit=null,F.anchor=null,F.size=.13,F.sizeVariance=.8,F.life=r.emberLifetime*1.4,F.lifeVariance=.5,F.spin=0,F.tint=null,F.time=n.uTime.value,this.embers.emit(o,F))}onTravel(e){this._beat=0,this._sync(),this.flock.leadPoint(this.position),this._flockFx(e,1,0),this._groundFx(),this.ctx.shake.rumble(u.emberflock.rumble*u.global.cameraShake,e)}onImpact(){let e=u.emberflock,t=u.global,r=n.uTime.value;this.pointAt(1,I),I.y=e.endHeight,this.ctx.bursts.spawn(g.FIRE,I,{radius:e.burstSize*.25,endRadius:e.burstSize*t.explosionIntensity,life:.65,intensity:e.burstIntensity,opacity:.9,fresnel:1.4,displace:.75,colorA:a(e.colorBurstA),colorB:a(e.colorBurstB),colorC:a(e.colorBurstC)}),this.pointAt(1,z),this.ctx.decals.spawn(b.SHOCKWAVE,z,{radius:e.shockRadius*t.explosionIntensity,life:.55,width:.06,intensity:1,colorA:a(e.colorShockA),colorB:a(e.colorShockB)}),this.ctx.decals.spawn(b.SCORCH,z,{radius:e.scorchRadius*3.2,life:e.scorchLife*1.4,intensity:e.scorchIntensity*1.4,colorA:a(e.colorScorch),colorB:a(e.colorCharEmber),height:.012}),F.position=I,F.radius=this._flockRadius(0)*.5,F.direction=L.set(0,1,0),F.speed=e.sparkSpeed*2,F.speedVariance=.85,F.spread=1,F.inherit=null,F.anchor=null,F.size=.16,F.sizeVariance=.8,F.life=e.sparkLifetime*1.4,F.lifeVariance=.6,F.spin=0,F.tint=null,F.time=r,this.sparks.emit(Math.round(e.burstSparks*t.particleCount),F),F.speed=e.emberSpeed*2.4,F.spread=.85,F.size=.12,F.life=e.emberLifetime,this.embers.emit(Math.round(e.burstEmbers*t.particleCount),F),this.ctx.shake.add(e.impactShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),22),this.ctx.flash.trigger(a(e.colorFlash),e.impactFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*1.2*t.explosionIntensity}onFade(e,t){this._beat=t,this._sync();let n=this._rise();this.flock.leadPoint(this.position);let r=t<=1?1:1-m.inCubic(p(t-1));this._flockFx(e,r*(t<=1?.7:.35),this._collapse()),this._columnFx(e,n)}onDestroy(){this._live=0,this._beat=0,this.flock.reset(),this.trailGeometry.instanceCount=0,this.trailMesh.visible=!1,this.trailMaterial.uniforms.uFade.value=0}dispose(){this.flock.dispose(),this.trailGeometry.dispose(),this.trailMaterial.dispose(),super.dispose()}};export{B as EmberflockAbility};
//# sourceMappingURL=EmberflockAbility-B60eERM_.js.map