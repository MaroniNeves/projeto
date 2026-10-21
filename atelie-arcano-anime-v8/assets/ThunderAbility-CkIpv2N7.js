import{$ as e,Br as t,G as n,K as r,R as i,V as a,Y as o,at as s,di as c,o as l,ot as u,q as d,st as f,tt as p,xt as m,y as h,yn as g}from"./settings-DdywqLlV.js";import{t as _}from"./ParticleSystem-BZTczMT8.js";import{n as v}from"./ParticleEngine-DLxipNH0.js";import{n as y}from"./GroundDecals-kYmr8HKl.js";import{n as b,t as x}from"./Ability-CYesB5Ur.js";var S=Object.freeze({CORE:0,GLOW:1}),C=`
  #define PI  3.141592653589793
  #define TAU 6.283185307179586

  uniform float uTime;
  uniform vec3  uOrigin;
  uniform vec3  uTarget;
  uniform vec3  uSide;
  uniform float uSag;
  uniform float uSeed;
  uniform float uRestrike;

  uniform float uStrands;
  uniform float uSpread;
  uniform float uSpreadNear;
  uniform float uSpreadCurve;
  uniform float uTwist;
  uniform float uTwistSpeed;

  uniform float uJitter;
  uniform float uJitterScale;
  uniform float uOctaves;
  uniform float uJitterFalloff;
  uniform float uCrawl;
  uniform float uPinch;
  uniform float uConverge;

  uniform float uWidth;
  uniform float uWidthTip;
  uniform float uWidthCurve;
  uniform float uCoreWidth;
  uniform float uWidthScale;
  uniform float uStrandFlash;
  uniform float uFlickerSpeed;
  uniform float uFade;

  attribute float aStrand;

  varying float vT;
  varying float vSide;
  varying float vStrand;
  varying float vFlash;
  varying float vViewZ;

  ${o}

  /** Value noise with a *linear* ramp — piecewise-linear output, sharp corners. */
  float vnoise(float x, float seed) {
    float i = floor(x);
    float f = x - i;
    return mix(hash11(i + seed), hash11(i + 1.0 + seed), f) * 2.0 - 1.0;
  }

  /**
   * Offset of one filament from the axis, in the perpendicular plane.
   * span is the length of the cast, so uJitterScale stays kinks per *metre*
   * however far the bolt reaches.
   */
  vec2 kink(float t, float seed, float span) {
    vec2 o = vec2(0.0);
    float amp = 1.0;
    float freq = max(uJitterScale, 0.01) * span;
    float scroll = uTime * uCrawl;

    // Fixed trip count with a per-octave gate: a dynamic bound is not portable,
    // and five multiply-adds are cheaper than the branch would be anyway.
    for (int i = 0; i < 5; i++) {
      float on = step(float(i), uOctaves - 1.0);
      o.x += on * amp * vnoise(t * freq + scroll, seed + 13.0 * float(i));
      o.y += on * amp * vnoise(t * freq + scroll * 1.17, seed + 71.3 + 13.0 * float(i));
      amp *= uJitterFalloff;
      freq *= 2.0;
      scroll *= 1.63;
    }
    return o;
  }

  vec3 boltPoint(float t, float seed, float radial, vec3 n1, vec3 n2, float span) {
    vec3 axis = mix(uOrigin, uTarget, t);
    axis.y += uSag * sin(t * PI);

    // Pinned at the hand always, and at the target as hard as uConverge asks —
    // a bolt that lands somewhere other than where it was aimed reads as a bug.
    float pinch = max(uPinch, 1e-3);
    float ends = smoothstep(0.0, pinch, t) *
                 mix(1.0, smoothstep(0.0, pinch, 1.0 - t), clamp(uConverge, 0.0, 1.0));

    vec2 offset = kink(t, seed, span) * uJitter * ends;

    float angle = seed * TAU + (t * uTwist + uTime * uTwistSpeed) * TAU;
    float reach = mix(uSpreadNear, uSpread, pow(clamp(t, 0.0, 1.0), max(uSpreadCurve, 0.01)));
    offset += vec2(cos(angle), sin(angle)) * reach * radial;

    return axis + n1 * offset.x + n2 * offset.y;
  }

  void main() {
    float t = position.x;
    float side = position.y;
    vT = t;
    vSide = side;

    /* ---- the frame the offsets live in ---- */
    vec3 delta = uTarget - uOrigin;
    float span = max(length(delta), 0.01);
    vec3 dir = delta / span;
    // Gram-Schmidt rather than the raw lateral: the axis tilts downward from the
    // hand, so uSide is only approximately perpendicular to it.
    vec3 n1 = uSide - dir * dot(uSide, dir);
    n1 = length(n1) > 1e-4 ? normalize(n1) : normalize(cross(dir, vec3(0.0, 1.0, 0.0)));
    vec3 n2 = normalize(cross(dir, n1));

    /* ---- which filament is this, and what shape is it wearing ---- */
    // The strike index snaps every filament onto a new shape uRestrike times a
    // second; the crawl inside kink() slides it continuously in between. Both
    // together are what stops a held bolt looking like a static ribbon.
    float strike = floor(uTime * max(uRestrike, 0.01));
    float seed = hash11(aStrand * 7.13 + uSeed + strike * 3.77) * 97.0;
    float radial = uStrands <= 1.0 ? 0.0 : aStrand / (uStrands - 1.0);
    vStrand = radial;

    vec3 here = boltPoint(t, seed, radial, n1, n2, span);

    // Tangent by finite difference, mirrored at the far end so the last node
    // still has a neighbour to look at.
    float step_ = 0.02;
    float ahead = t + step_;
    float flip = 1.0;
    if (ahead > 1.0) { ahead = t - step_; flip = -1.0; }
    vec3 next = boltPoint(ahead, seed, radial, n1, n2, span);
    vec3 tangent = (next - here) * flip;
    tangent = length(tangent) > 1e-5 ? normalize(tangent) : dir;

    /* ---- turn the ribbon to face the camera ---- */
    vec3 toCamera = normalize(cameraPosition - here);
    vec3 binormal = cross(tangent, toCamera);
    float bl = length(binormal);
    binormal = bl > 1e-4 ? binormal / bl : n1;

    /* ---- width ---- */
    // A stuttering per-filament blink, quantised to uFlickerSpeed so the whole
    // bundle strobes on the same clock instead of shimmering independently.
    float flash = mix(1.0, hash11(floor(uTime * uFlickerSpeed) + aStrand * 3.7 + uSeed), uStrandFlash);
    vFlash = flash;

    float halfWidth = uWidth * uWidthScale;
    halfWidth *= mix(1.0, uWidthTip, pow(clamp(t, 0.0, 1.0), max(uWidthCurve, 0.01)));
    halfWidth *= mix(uCoreWidth, 1.0, radial);
    halfWidth *= flash * uFade;

    // World space throughout: the ability's group is an identity transform, and
    // going through modelMatrix would only invite it to drift.
    vec4 mv = viewMatrix * vec4(here + binormal * side * halfWidth, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,w=`
  uniform float uTime;
  uniform float uSeed;
  uniform float uProgress;
  uniform float uTipGlow;
  uniform float uTipLength;
  uniform float uCoreSharp;
  uniform float uGlowFalloff;
  uniform float uBranchDim;
  uniform float uFlicker;
  uniform float uFlickerSpeed;
  uniform float uPassOpacity;
  uniform float uOpacity;
  uniform float uGlow;
  uniform float uFade;
  uniform float uSoftFade;
  uniform vec3  uColorCore;
  uniform vec3  uColorInner;
  uniform vec3  uColorOuter;
  uniform vec3  uColorHalo;

  uniform float uGlobalGlow;
  uniform vec2  uResolution;
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;

  varying float vT;
  varying float vSide;
  varying float vStrand;
  varying float vFlash;
  varying float vViewZ;

  ${o}
  ${d}

  void main() {
    // Ahead of the strike front there is no bolt yet. The ribbon is drawn whole
    // and clipped here rather than scaled, so the *shape* never changes as the
    // front travels — only how much of it exists.
    float tip = max(uTipLength, 1e-3);
    float drawn = smoothstep(uProgress, uProgress - tip, vT);
    if (drawn <= 0.002) discard;

    float v = clamp(abs(vSide), 0.0, 1.0);

    #ifdef BOLT_GLOW
      float profile = pow(1.0 - v, max(uGlowFalloff, 0.05));
      vec3 color = mix(uColorHalo, uColorOuter, profile);
      float alpha = profile;
    #else
      float profile = pow(1.0 - v, max(uCoreSharp, 0.05));
      vec3 color = mix(uColorOuter, uColorInner, smoothstep(0.0, 0.5, profile));
      color = mix(color, uColorCore, smoothstep(0.45, 1.0, profile));
      float alpha = profile;
    #endif

    // The leading edge is where the air is actually breaking down.
    color += uColorCore * smoothstep(uProgress - tip * 2.0, uProgress, vT) * uTipGlow;

    // Quantised, not sinusoidal: real lightning stutters between brightnesses,
    // it does not breathe.
    float flicker = 1.0 - uFlicker * hash11(floor(uTime * uFlickerSpeed) + uSeed);

    alpha *= drawn * flicker * vFlash * uFade * uPassOpacity * uOpacity;
    alpha *= mix(1.0, clamp(uBranchDim, 0.0, 1.0), vStrand);

    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.003) discard;

    color *= uGlow * uGlobalGlow;
    gl_FragColor = vec4(color, alpha);
  }
`;function T(e=S.CORE){let n=e===S.GLOW,a=new t({defines:n?{BOLT_GLOW:``}:{},transparent:!0,depthWrite:!1,depthTest:!0,blending:2,side:2,toneMapped:!1,uniforms:r({uOrigin:{value:new c},uTarget:{value:new c(0,0,1)},uSide:{value:new c(1,0,0)},uSag:{value:.2},uSeed:{value:0},uRestrike:{value:24},uProgress:{value:0},uFade:{value:1},uStrands:{value:9},uSpread:{value:.75},uSpreadNear:{value:.05},uSpreadCurve:{value:1.6},uTwist:{value:.45},uTwistSpeed:{value:.8},uBranchDim:{value:.72},uJitter:{value:.34},uJitterScale:{value:.85},uOctaves:{value:4},uJitterFalloff:{value:.55},uCrawl:{value:3.2},uPinch:{value:.14},uConverge:{value:.8},uWidth:{value:.085},uWidthTip:{value:.5},uWidthCurve:{value:1},uCoreWidth:{value:2.1},uCoreSharp:{value:3.4},uGlowFalloff:{value:2.4},uWidthScale:{value:n?8:1},uPassOpacity:{value:n?.32:1},uSoftFade:{value:.5},uFlicker:{value:.3},uFlickerSpeed:{value:34},uStrandFlash:{value:.5},uTipGlow:{value:2},uTipLength:{value:.08},uOpacity:{value:1},uGlow:{value:2.3},uColorCore:{value:new m(1,1,1)},uColorInner:{value:new m(.78,.92,1)},uColorOuter:{value:new m(.22,.62,1)},uColorHalo:{value:new m(.04,.24,.78)}}),vertexShader:C,fragmentShader:w});return a.userData.sync=e=>{let t=l.thunder,r=l.global,o=a.uniforms;o.uOrigin.value.copy(e.origin),o.uTarget.value.copy(e.target),o.uSide.value.copy(e.side),o.uSeed.value=e.seed,o.uProgress.value=e.progress,o.uFade.value=e.fade,o.uStrands.value=e.strands,o.uSag.value=t.sag,o.uRestrike.value=t.restrike,o.uSpread.value=t.spread,o.uSpreadNear.value=t.spreadNear,o.uSpreadCurve.value=t.spreadCurve,o.uTwist.value=t.twist,o.uTwistSpeed.value=t.twistSpeed,o.uBranchDim.value=t.branchDim,o.uJitter.value=t.jitter*r.randomness*r.noiseStrength,o.uJitterScale.value=t.jitterScale*r.noiseFrequency,o.uOctaves.value=Math.round(t.octaves),o.uJitterFalloff.value=t.jitterFalloff,o.uCrawl.value=t.crawl*r.noiseSpeed,o.uPinch.value=t.pinch,o.uConverge.value=t.converge,o.uWidth.value=t.width,o.uWidthTip.value=t.widthTip,o.uWidthCurve.value=t.widthCurve,o.uCoreWidth.value=t.coreWidth,o.uCoreSharp.value=t.coreSharp,o.uGlowFalloff.value=t.glowFalloff,o.uWidthScale.value=n?t.glowWidth:1,o.uPassOpacity.value=n?t.glowOpacity:1,o.uSoftFade.value=t.softFade,o.uFlicker.value=t.flicker,o.uFlickerSpeed.value=t.flickerSpeed,o.uStrandFlash.value=t.strandFlash,o.uTipGlow.value=t.tipGlow,o.uTipLength.value=t.tipLength,o.uOpacity.value=t.opacity*r.opacity,o.uGlow.value=t.glow,o.uColorCore.value.copy(i(t.colorCore)),o.uColorInner.value.copy(i(t.colorInner)),o.uColorOuter.value.copy(i(t.colorOuter)),o.uColorHalo.value.copy(i(t.colorHalo))},a}var E=24,D=72,O=6,k={},A=new c,j=new c;new c;var M=new c,N=class extends x{constructor(e){super(`thunder`,e)}createShaders(){this.geometry=e(D,E),this.glowMaterial=T(S.GLOW),this.coreMaterial=T(S.CORE),this.boltMaterials=[this.glowMaterial,this.coreMaterial],this.meshes=[];for(let[e,t]of this.boltMaterials.entries()){let n=new g(this.geometry,t);n.frustumCulled=!1,n.matrixAutoUpdate=!1,n.layers.set(a.VFX),n.renderOrder=11+e*2,this.group.add(n),this.meshes.push(n)}this._seed=0,this._strandCount=1,this._burnDistance=0,this._state={origin:new c,target:new c,side:new c,progress:0,fade:1,seed:0,strands:1}}createParticles(){let e=this.ctx.particles;this.sparks=e.get(`thunder.sparks`,{capacity:4e3,shape:_.STREAK,additive:!0,stretch:!0,softFade:.25}),this.sparks.uniforms.uDrag.value=1.4,this.sparks.uniforms.uEndSize.value=.25,this.sparks.uniforms.uSizeIn.value=.02,this.sparks.uniforms.uFadeIn.value=.03,this.sparks.uniforms.uFadeOut.value=.45,this.motes=e.get(`thunder.motes`,{capacity:2400,shape:_.SOFT,additive:!0,curl:!0,softFade:.4}),this.motes.uniforms.uDrag.value=1.6,this.motes.uniforms.uEndSize.value=.15,this.motes.uniforms.uSizeIn.value=.06,this.motes.uniforms.uFadeIn.value=.08,this.motes.uniforms.uFadeOut.value=.4,this.smoke=e.get(`thunder.smoke`,{capacity:2e3,shape:_.SMOKE,additive:!1,curl:!0,softFade:1.1}),this.smoke.uniforms.uDrag.value=1.8,this.smoke.uniforms.uEndSize.value=3,this.smoke.uniforms.uSizeIn.value=.12,this.smoke.uniforms.uFadeIn.value=.16,this.smoke.uniforms.uFadeOut.value=.3,this.debris=e.get(`thunder.debris`,{capacity:1600,shape:_.CHIP,additive:!1,lit:!0,softFade:.25}),this.debris.uniforms.uDrag.value=.25,this.debris.uniforms.uEndSize.value=.8,this.debris.uniforms.uFadeOut.value=.7,this.sparkEmitter=new v,this.moteEmitter=new v,this.smokeEmitter=new v,this.debrisEmitter=new v}get instanceCount(){return this._strandCount*this.meshes.length}get impactDuration(){return Math.max(.05,l.thunder.lifetime*l.global.lifetime)}get fadeDuration(){return Math.max(.05,l.thunder.fadeTime)}lightShimmer(){let e=l.thunder,t=Math.floor(this.age*Math.max(1,e.lightFlickerSpeed)),n=Math.abs(Math.sin(t*127.1)*43758.5453)%1;return 1-f(e.lightFlicker)*n}_handPoint(e){let t=l.thunder;return e.copy(this.origin).addScaledVector(this.direction,t.handForward).addScaledVector(this.side,t.handSide),e.y=t.handHeight,e}_impactPoint(e){return this.pointAt(1,e),e.y=l.thunder.endHeight,e}_axisPoint(e,t){let n=l.thunder,r=f(e);return t.copy(this.origin).addScaledVector(this.direction,s(n.handForward,this.length,r)).addScaledVector(this.side,n.handSide*(1-r)),t.y=s(n.handHeight,n.endHeight,r)+n.sag*Math.sin(r*Math.PI),t}_bundleRadius(e){let t=l.thunder;return s(t.spreadNear,t.spread,f(e)**+Math.max(.01,t.spreadCurve))}onSpawn(){this.sparkEmitter.reset(),this.moteEmitter.reset(),this.smokeEmitter.reset(),this.debrisEmitter.reset(),this._burnDistance=0,this._seed=Math.random()*100,this._syncUniforms(1),this._muzzleFx()}_syncUniforms(e){let t=l.thunder,n=l.global,r=this._state;this._handPoint(r.origin),this._impactPoint(r.target),r.side.copy(this.side),r.progress=this.phase===b.TRAVEL?this.u:1,r.fade=e,r.seed=this._seed,this._strandCount=Math.max(1,Math.min(E,Math.round(t.strands))),r.strands=this._strandCount,this.geometry.instanceCount=this._strandCount;for(let e of this.boltMaterials)e.userData.sync(r);this.sparks.setGradient(i(t.colorSparkA),i(t.colorSparkB),i(t.colorSparkC),i(t.colorSparkD)),this.sparks.uniforms.uGravity.value.set(0,t.sparkGravity,0),this.sparks.uniforms.uSizeScale.value=t.sparkSize*n.particleSize*7,this.sparks.uniforms.uLifeScale.value=t.sparkLifetime*.5*n.particleLifetime,this.sparks.uniforms.uSpeedScale.value=n.particleSpeed,this.sparks.uniforms.uOpacity.value=n.opacity,this.sparks.uniforms.uGlow.value=t.glow*.6*n.glow,this.sparks.uniforms.uStretch.value=t.sparkStretch,this.sparks.uniforms.uTurbulence.value=.25*n.turbulence,this.motes.setGradient(i(t.colorMoteA),i(t.colorMoteB),i(t.colorMoteC),i(t.colorMoteD)),this.motes.uniforms.uGravity.value.set(0,t.moteRise,0),this.motes.uniforms.uSizeScale.value=t.moteSize*n.particleSize*7,this.motes.uniforms.uLifeScale.value=t.moteLifetime*.5*n.particleLifetime,this.motes.uniforms.uSpeedScale.value=n.particleSpeed,this.motes.uniforms.uOpacity.value=n.opacity,this.motes.uniforms.uGlow.value=.9*n.glow,this.motes.uniforms.uTurbulence.value=t.moteTurbulence*n.turbulence,this.smoke.setGradient(i(t.colorSmokeA),i(t.colorSmokeB),i(t.colorSmokeC),i(t.colorSmokeD)),this.smoke.uniforms.uGravity.value.set(0,t.smokeRise,0),this.smoke.uniforms.uSizeScale.value=t.smokeSize*n.particleSize,this.smoke.uniforms.uLifeScale.value=t.smokeLifetime*.5*n.particleLifetime,this.smoke.uniforms.uSpeedScale.value=t.smokeSpeed*n.particleSpeed,this.smoke.uniforms.uOpacity.value=t.smokeOpacity*n.opacity,this.smoke.uniforms.uTurbulence.value=.35*n.turbulence,this.debris.setGradient(i(t.colorDebrisA),i(t.colorDebrisB),i(t.colorDebrisC),i(t.colorDebrisD)),this.debris.uniforms.uGravity.value.set(0,t.debrisGravity,0),this.debris.uniforms.uSizeScale.value=t.debrisSize*n.particleSize*7,this.debris.uniforms.uLifeScale.value=n.particleLifetime,this.debris.uniforms.uSpeedScale.value=n.particleSpeed,this.debris.uniforms.uOpacity.value=n.opacity}_muzzleFx(){let e=l.thunder,t=l.global;this._handPoint(A),this.ctx.bursts.spawn(h.STORM,A,{radius:e.muzzleSize*.2,endRadius:e.muzzleSize*t.explosionIntensity,life:.3,intensity:e.muzzleIntensity,opacity:.9,fresnel:1.5,displace:.5,colorA:i(e.colorMuzzleA),colorB:i(e.colorMuzzleB),colorC:i(e.colorMuzzleC)}),k.position=A,k.radius=.18,k.direction=j.copy(this.direction),k.speed=e.sparkSpeed*1.5,k.speedVariance=.8,k.spread=.85,k.inherit=null,k.anchor=null,k.size=.2,k.sizeVariance=.7,k.life=e.sparkLifetime,k.lifeVariance=.5,k.spin=0,k.tint=null,k.time=n.uTime.value,this.sparks.emit(Math.round(40*t.particleCount),k),this.ctx.flash.trigger(i(e.colorCastFlash),e.castFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.8*t.explosionIntensity}_boltFx(e,t){let r=l.thunder,i=l.global,a=n.uTime.value,o=this.phase===b.TRAVEL?Math.max(.02,this.u):1,s=Math.round(this.sparkEmitter.tick(e,r.sparkRate*t)*i.particleCount);if(s>0){k.direction=j.copy(this.direction).multiplyScalar(.45).setY(.55).normalize(),k.speed=r.sparkSpeed,k.speedVariance=.85,k.spread=1,k.inherit=null,k.anchor=null,k.size=.16,k.sizeVariance=.7,k.life=r.sparkLifetime,k.lifeVariance=.55,k.spin=0,k.tint=null,k.time=a;let e=Math.ceil(s/Math.min(s,O));for(;s>0;){let t=u(.05,1)*o;this._axisPoint(t,A),k.position=A,k.radius=this._bundleRadius(t)*1.1+.05,this.sparks.emit(Math.min(e,s),k),s-=e}}let c=Math.round(this.moteEmitter.tick(e,r.moteRate*t)*i.particleCount);if(c>0){let e=Math.random()*o;this._axisPoint(e,A),k.position=A,k.radius=this._bundleRadius(e)*1.6+.2,k.direction=j.set(0,1,0),k.speed=r.moteSpeed,k.speedVariance=.8,k.spread=1,k.size=.08,k.sizeVariance=.6,k.life=r.moteLifetime,k.lifeVariance=.5,k.spin=0,k.time=a,this.motes.emit(c,k)}let d=Math.round(this.smokeEmitter.tick(e,r.smokeRate*t)*i.particleCount);d>0&&(this.pointAt(Math.random()*o,A).setY(.15),k.position=A,k.radius=r.scorchRadius*2.5,k.direction=j.set(0,1,0),k.speed=r.smokeSpeed,k.speedVariance=.7,k.spread=.9,k.size=.8,k.sizeVariance=.5,k.life=r.smokeLifetime,k.lifeVariance=.4,k.spin=.4,k.time=a,this.smoke.emit(d,k));let f=Math.round(this.debrisEmitter.tick(e,r.debrisRate*t)*i.particleCount);f>0&&(this.pointAt(Math.random()*o,A).setY(.06),k.position=A,k.radius=r.scorchRadius*1.8,k.direction=j.copy(this.direction).multiplyScalar(.3).setY(1).normalize(),k.speed=r.debrisSpeed,k.speedVariance=.75,k.spread=.8,k.size=.1,k.sizeVariance=.7,k.life=r.debrisLifetime,k.lifeVariance=.5,k.spin=8,k.time=a,this.debris.emit(f,k))}_groundFx(){let e=l.thunder,t=1/Math.max(.05,e.arcRate);for(;this.front-this._burnDistance>=t;){this._burnDistance+=t;let n=f(this._burnDistance/this.length);this.pointAt(n,A);let r=this._bundleRadius(n)*.8;A.x+=this.side.x*u(-r,r),A.z+=this.side.z*u(-r,r),this.ctx.decals.spawn(y.ARC,A,{radius:e.arcRadius*u(.7,1.2),life:e.arcLife,width:e.arcBranches,intensity:e.arcIntensity,colorA:i(e.colorEmber),colorB:i(e.colorArc)}),this.ctx.decals.spawn(y.SCORCH,A,{radius:e.scorchRadius*u(.7,1.3),life:e.scorchLife,intensity:e.scorchIntensity,colorA:i(e.colorScorch),colorB:i(e.colorEmber),height:.015})}}onTravel(e){this._syncUniforms(1),this._axisPoint(this.u,this.position),this._boltFx(e,1),this._groundFx(),this.ctx.shake.rumble(l.thunder.rumble*l.global.cameraShake,e)}onImpact(){let e=l.thunder,t=l.global,r=n.uTime.value;this._impactPoint(A),this.ctx.bursts.spawn(h.STORM,A,{radius:e.burstSize*.2,endRadius:e.burstSize*t.explosionIntensity,life:.7,intensity:e.burstIntensity,opacity:.9,fresnel:1.6,displace:.6,squash:.8,colorA:i(e.colorBurstA),colorB:i(e.colorBurstB),colorC:i(e.colorBurstC)}),this.pointAt(1,M),this.ctx.decals.spawn(y.SHOCKWAVE,M,{radius:e.shockRadius*t.explosionIntensity,life:.6,width:.05,intensity:1,colorA:i(e.colorShockA),colorB:i(e.colorShockB)}),this.ctx.decals.spawn(y.ARC,M,{radius:e.arcRadius*2.4,life:e.arcLife*1.6,width:e.arcBranches,intensity:e.arcIntensity,colorA:i(e.colorEmber),colorB:i(e.colorArc)}),this.ctx.decals.spawn(y.SCORCH,M,{radius:e.scorchRadius*2.6,life:e.scorchLife*1.4,intensity:e.scorchIntensity*1.3,colorA:i(e.colorScorch),colorB:i(e.colorEmber),height:.015}),k.position=A,k.radius=.3,k.direction=j.copy(this.direction).multiplyScalar(.5).setY(.7).normalize(),k.speed=e.sparkSpeed*2.2,k.speedVariance=.85,k.spread=1,k.inherit=null,k.anchor=null,k.size=.22,k.sizeVariance=.8,k.life=e.sparkLifetime*1.5,k.lifeVariance=.6,k.spin=0,k.tint=null,k.time=r,this.sparks.emit(Math.round(e.burstSparks*t.particleCount),k),k.position=M,k.radius=e.scorchRadius*2,k.direction=j.set(0,1,0),k.speed=e.debrisSpeed*1.8,k.spread=.85,k.size=.14,k.life=e.debrisLifetime*1.3,k.spin=10,this.debris.emit(Math.round(e.burstDebris*t.particleCount),k),k.speed=e.smokeSpeed*2.2,k.spread=1,k.size=1.5,k.life=e.smokeLifetime*1.3,k.spin=.5,this.smoke.emit(Math.round(45*t.particleCount),k),this.ctx.shake.add(e.impactShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),26),this.ctx.flash.trigger(i(e.colorFlash),e.impactFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*1.5*t.explosionIntensity}onFade(e,t){let n=t<=1?1:1-p.inCubic(f(t-1));this._syncUniforms(n),this._axisPoint(1,this.position),this._boltFx(e,n*(t<=1?.6:.35))}onDestroy(){this._strandCount=1,this.geometry.instanceCount=1;for(let e of this.boltMaterials)e.uniforms.uFade.value=0}dispose(){this.geometry.dispose();for(let e of this.boltMaterials)e.dispose();super.dispose()}};export{N as ThunderAbility};
//# sourceMappingURL=ThunderAbility-CkIpv2N7.js.map