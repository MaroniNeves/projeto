import{$t as e,Br as t,G as n,J as r,K as i,Qt as a,R as o,Ut as s,V as c,Y as l,at as u,di as d,nt as f,o as p,q as m,st as h,tt as g,vt as _,xt as v,y,yn as b}from"./settings-DdywqLlV.js";import{t as x}from"./ParticleSystem-BZTczMT8.js";import{n as S}from"./ParticleEngine-DLxipNH0.js";import{n as C}from"./GroundDecals-kYmr8HKl.js";import{t as w}from"./Ability-CYesB5Ur.js";import{d as T,u as E}from"./TimeControl-iyWeiQb0.js";var D=16,O=10;function k(e=.62){let t=[],n=[],r=[];for(let r=0;r<=D;r++){let i=r/D,a=Math.sin(Math.PI*i)**+e,o=e*Math.max(Math.sin(Math.PI*i),1e-4)**(e-1)*Math.cos(Math.PI*i)*Math.PI;for(let e=0;e<=O;e++){let r=e/O*Math.PI*2,s=Math.cos(r),c=Math.sin(r);t.push(a*s,i,a*c);let l=Math.sqrt(1+o*o);n.push(s/l,-o/l,c/l)}}for(let e=0;e<D;e++)for(let t=0;t<O;t++){let n=e*11+t,i=n+O+1;r.push(n,i,n+1,i,i+1,n+1)}let i=new _;return i.setAttribute(`position`,new s(t,3)),i.setAttribute(`normal`,new s(n,3)),i.setIndex(r),i}function A(){let t=k(),n=new e;n.index=t.index,n.setAttribute(`position`,t.getAttribute(`position`)),n.setAttribute(`normal`,t.getAttribute(`normal`));let r=new Float32Array(36),i=new Float32Array(36),o=new Float32Array(36);for(let e=0;e<=8;e++)for(let t=0;t<4;t++){let n=e*4+t;r[n]=e,i[n]=t,o[n]=n*.6180339887%1}return n.setAttribute(`aCopy`,new a(r,1)),n.setAttribute(`aFin`,new a(i,1)),n.setAttribute(`aSeed`,new a(o,1)),n.instanceCount=4,n}var j=`
  #define AI_PI  3.141592653589793
  #define AI_TAU 6.283185307185

  attribute float aCopy;
  attribute float aFin;
  attribute float aSeed;

  uniform float uAge;          // the ability's own clock, seconds
  uniform float uSnapGap;      // seconds of cast age between one copy and the next
  uniform float uSpeed;        // metres/second the body flies at
  uniform float uLength;       // metres to the far end
  uniform float uFlightCurve;  // >1 starts slow and arrives fast

  uniform vec3  uOrigin;
  uniform vec3  uDir;
  uniform vec3  uSide;

  uniform float uLiftNear;     // metres above the floor at the muzzle
  uniform float uLift;         // ... and at the far end
  uniform float uArc;          // metres the flight bows upward at mid-span
  uniform float uSway;         // metres of lateral wander
  uniform float uSwayWaves;    // wavelengths of it over the whole line
  uniform float uSeed;

  uniform float uFins;
  uniform float uSplay;        // radians a blade tilts off the axis, fully open
  uniform float uFinGap;       // metres a blade steps off the axis, fully open
  uniform float uRoll;         // radians the fan is rolled at birth
  uniform float uRollSpeed;    // radians/second it keeps rolling as it flies
  uniform float uHoldSpin;     // radians/second a *frozen* copy keeps turning

  uniform float uLenNear;      // metres — the bud at the muzzle
  uniform float uLen;          // metres — the blade, fully open
  uniform float uRadNear;      // metres
  uniform float uRad;          // metres
  uniform float uFlatten;      // 0..1 squashes the sliver into a blade
  uniform float uOpenCurve;    // >1 keeps it shut and then opens it late

  uniform float uHoldLife;     // seconds a frozen copy takes to give up
  uniform float uHoldShrink;   // × per second a frozen copy contracts
  uniform float uHoldSink;     // metres/second it settles

  varying vec3  vWorld;
  varying vec3  vNormalW;
  varying float vAlong;        // 0..1 base → tip of this blade
  varying float vHeld;         // 0..1 how far through its hold this copy is
  varying float vOpen;         // 0..1 how far the fan had opened
  varying float vSeed;
  varying float vViewZ;

  ${r}

  void main() {
    /* --- which instant is this copy showing --- */
    // 'target' is derived from a live slider, never from a stored timestamp:
    // that is the difference between six frozen moments and six dead ones.
    float target = aCopy < 0.5 ? uAge : aCopy * uSnapGap;
    float shown = min(uAge, target);
    float held = max(uAge - target, 0.0);
    vHeld = clamp(held / max(uHoldLife, 1e-3), 0.0, 1.0);
    vSeed = aSeed;

    /* --- where the body was at that instant --- */
    float travel = uLength / max(uSpeed, 0.01);
    float s = pow(clamp(shown / max(travel, 1e-4), 0.0, 1.0), max(uFlightCurve, 0.05));
    float open = pow(s, max(uOpenCurve, 0.05));
    vOpen = open;

    vec3 centre = uOrigin + uDir * (s * uLength);
    centre += uSide * (sin((s * uSwayWaves + uSeed) * AI_TAU) * uSway);
    centre.y += mix(uLiftNear, uLift, s) + uArc * sin(s * AI_PI) - held * uHoldSink;

    /* --- the blade itself --- */
    // A fin past the live count collapses to a point. Branch-free, because the
    // alternative is a per-instance early-out and the degenerate triangles it
    // produces never reach a fragment anyway.
    float finOn = step(aFin + 0.5, uFins);
    float shrink = max(1.0 - held * uHoldShrink, 0.0) * finOn;
    float len = mix(uLenNear, uLen, open) * shrink;
    float rad = mix(uRadNear, uRad, open) * shrink;
    float radZ = rad * max(uFlatten, 0.02);

    vAlong = position.y;

    vec3 q = vec3(position.x * rad, (position.y - 0.5) * len, position.z * radZ);
    vec3 n = normal * vec3(1.0 / max(rad, 1e-4), 1.0 / max(len, 1e-4), 1.0 / max(radZ, 1e-4));

    // Splay: tilt the blade off the travel axis, then step it outward, then
    // roll the whole fan about that axis. Doing the tilt first is what makes
    // the fan a *cone* — tilting after the roll gives every blade the same
    // lean in world space and the thing reads as a bent bundle.
    float sp = uSplay * open;
    float cs = cos(sp);
    float sn = sin(sp);
    q = vec3(q.x * cs - q.y * sn, q.x * sn + q.y * cs, q.z);
    n = vec3(n.x * cs - n.y * sn, n.x * sn + n.y * cs, n.z);
    q.x += uFinGap * open;

    float phi = (aFin + 0.5) / max(uFins, 1.0) * AI_TAU
              + uRoll + uRollSpeed * shown + uHoldSpin * held;
    float cp = cos(phi);
    float sq = sin(phi);
    q = vec3(q.x * cp + q.z * sq, q.y, -q.x * sq + q.z * cp);
    n = vec3(n.x * cp + n.z * sq, n.y, -n.x * sq + n.z * cp);

    // The cast's own frame: local x is lateral, local y is downrange, local z
    // is up. uSide and uDir arrive orthonormal from Ability.
    vec3 up = cross(uSide, uDir);
    mat3 basis = mat3(uSide, uDir, up);

    vec3 world = centre + basis * q;
    vWorld = world;
    vNormalW = normalize(basis * n);

    vec4 view = viewMatrix * vec4(world, 1.0);
    vViewZ = -view.z;
    gl_Position = projectionMatrix * view;
  }
`,M=`
  #define AI_TAU 6.283185307185

  uniform vec3  uColorLive;
  uniform vec3  uColorHeld;
  uniform vec3  uColorRim;
  uniform vec3  uColorCore;
  uniform float uRim;
  uniform float uRimPower;
  uniform float uCore;
  uniform float uBandScale;
  uniform float uBandSpeed;
  uniform float uBandGlow;
  uniform float uErode;
  uniform float uErodeScale;
  uniform float uEdge;
  uniform float uEdgeGlow;
  uniform float uHoldDim;
  uniform float uGlow;
  uniform float uOpacity;
  uniform float uFade;
  uniform float uSoftFade;

  uniform float uTime;
  uniform float uGlobalGlow;
  uniform vec2  uResolution;
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;

  varying vec3  vWorld;
  varying vec3  vNormalW;
  varying float vAlong;
  varying float vHeld;
  varying float vOpen;
  varying float vSeed;
  varying float vViewZ;

  ${l}
  ${m}

  void main() {
    vec3 view = normalize(cameraPosition - vWorld);
    float ndv = clamp(dot(normalize(vNormalW), view), 0.0, 1.0);
    float rim = pow(1.0 - ndv, max(uRimPower, 0.05));

    // Both tips are points, so anything drawn evenly along the blade piles up
    // there and the sliver reads as two bright dots on a wire. The core is
    // weighted to the middle instead.
    float spine = pow(max(sin(vAlong * 3.14159265), 0.0), 1.4);

    // Bands measured in **world metres**, not along the blade: they stay put in
    // the room, so a copy that froze between two of them sits between them
    // forever. Keyed to the blade's own length instead, every copy would carry
    // an identical stripe and the row would look printed.
    float band = 0.5 + 0.5 * sin((vWorld.y * uBandScale - uTime * uBandSpeed) * AI_TAU);

    /* --- ageing --- */
    float aged = clamp(vHeld, 0.0, 1.0);
    vec3 body = mix(uColorLive, uColorHeld, aged);

    // A held copy comes apart from the inside. dissolveMask returns the keep
    // mask and the burning edge in one call — the same pair GhostRig uses,
    // so the two chrono slots dissolve with the same vocabulary.
    float grain = clamp(fbm3(vWorld * max(uErodeScale, 1e-3) + vSeed * 37.0) * 0.5 + 0.5, 0.0, 1.0);
    vec2 cut = dissolveMask(grain, aged * uErode * 1.2 - 0.1, max(uEdge, 1e-3));

    float shade = uCore * spine * (0.35 + 0.65 * vOpen) + uRim * rim + uBandGlow * band * spine;
    vec3 color = body * shade + uColorRim * rim * uRim * 0.6 + uColorCore * uCore * spine * 0.5;
    color += uColorRim * cut.y * uEdgeGlow;
    // Reinhard ceiling: rim, core and burn all peak on the silhouette of a
    // dissolving copy at once, and bloom turns the sum into a white blob.
    color /= 1.0 + color * 0.22;
    color *= uGlow * uGlobalGlow * mix(1.0, 1.0 - uHoldDim, aged);

    float alpha = (rim * 0.75 + spine * 0.55 + band * 0.15)
                * uOpacity * uFade * cut.x * (1.0 - aged * uHoldDim);

    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.003) discard;

    gl_FragColor = vec4(color, alpha);
  }
`;function N(){let e=new t({name:`Afterimage`,vertexShader:j,fragmentShader:M,transparent:!0,depthWrite:!1,depthTest:!0,blending:2,side:2,toneMapped:!1,uniforms:i({uAge:{value:0},uSnapGap:{value:.12},uSpeed:{value:18},uLength:{value:18},uFlightCurve:{value:1},uOrigin:{value:new d},uDir:{value:new d(0,0,1)},uSide:{value:new d(1,0,0)},uLiftNear:{value:1.2},uLift:{value:1},uArc:{value:.35},uSway:{value:.2},uSwayWaves:{value:1.2},uSeed:{value:0},uFins:{value:3},uSplay:{value:.4},uFinGap:{value:.08},uRoll:{value:0},uRollSpeed:{value:1.4},uHoldSpin:{value:.15},uLenNear:{value:.5},uLen:{value:1.9},uRadNear:{value:.1},uRad:{value:.16},uFlatten:{value:.45},uOpenCurve:{value:.8},uHoldLife:{value:2.4},uHoldShrink:{value:.05},uHoldSink:{value:.05},uColorLive:{value:new v(`#f6e3b4`)},uColorHeld:{value:new v(`#8d8570`)},uColorRim:{value:new v(`#ffeec8`)},uColorCore:{value:new v(`#ffffff`)},uRim:{value:1.1},uRimPower:{value:2.4},uCore:{value:.9},uBandScale:{value:3},uBandSpeed:{value:.6},uBandGlow:{value:.35},uErode:{value:.85},uErodeScale:{value:2.6},uEdge:{value:.16},uEdgeGlow:{value:1.6},uHoldDim:{value:.55},uGlow:{value:1.5},uOpacity:{value:1},uFade:{value:1},uSoftFade:{value:.5}})});return e.userData.sync=t=>{let n=p.afterimage,r=p.global,i=e.uniforms;i.uAge.value=t.age,i.uSeed.value=t.seed,i.uFade.value=t.fade,i.uOrigin.value.copy(t.origin),i.uDir.value.copy(t.dir),i.uSide.value.copy(t.side),i.uLength.value=t.length,i.uSnapGap.value=n.snapGap,i.uSpeed.value=n.speed*r.speed,i.uFlightCurve.value=n.flightCurve,i.uLiftNear.value=n.liftNear,i.uLift.value=n.lift,i.uArc.value=n.arc,i.uSway.value=n.sway,i.uSwayWaves.value=n.swayWaves,i.uFins.value=n.fins,i.uSplay.value=n.splay,i.uFinGap.value=n.finGap,i.uRoll.value=n.roll,i.uRollSpeed.value=n.rollSpeed,i.uHoldSpin.value=n.holdSpin,i.uLenNear.value=n.lengthNear,i.uLen.value=n.bladeLength,i.uRadNear.value=n.radiusNear,i.uRad.value=n.bladeRadius,i.uFlatten.value=n.flatten,i.uOpenCurve.value=n.openCurve,i.uHoldLife.value=n.holdLife,i.uHoldShrink.value=n.holdShrink,i.uHoldSink.value=n.holdSink,i.uColorLive.value.copy(o(n.colorLive)),i.uColorHeld.value.copy(o(n.colorHeld)),i.uColorRim.value.copy(o(n.colorRim)),i.uColorCore.value.copy(o(n.colorCore)),i.uRim.value=n.rim,i.uRimPower.value=n.rimPower,i.uCore.value=n.core,i.uBandScale.value=n.bandScale,i.uBandSpeed.value=n.bandSpeed,i.uBandGlow.value=n.bandGlow,i.uErode.value=n.erode,i.uErodeScale.value=n.erodeScale,i.uEdge.value=n.erodeEdge,i.uEdgeGlow.value=n.edgeGlow,i.uHoldDim.value=n.holdDim,i.uGlow.value=n.glow*r.glow,i.uOpacity.value=n.opacity*r.opacity,i.uSoftFade.value=n.softFade},e}var P=new d,F=new d,I=new d,L={},R=class extends w{constructor(e){super(`afterimage`,e)}createShaders(){this.geometry=A(),this.material=N(),this.mesh=new b(this.geometry,this.material),this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=!1,this.mesh.layers.set(c.VFX),this.mesh.renderOrder=12,this.group.add(this.mesh),this._state={origin:new d,dir:new d(0,0,1),side:new d(1,0,0),length:1,age:0,seed:0,fade:1},this._region=null,this._regionParams=T(),this._frozen=0,this._live=1,this._seed=0}createParticles(){let e=this.ctx.particles;this.motes=e.get(`afterimage.motes`,{capacity:1800,shape:x.SOFT,additive:!0,curl:!0,softFade:.45}),this.motes.uniforms.uDrag.value=1.5,this.motes.uniforms.uEndSize.value=.2,this.motes.uniforms.uSizeIn.value=.08,this.motes.uniforms.uFadeIn.value=.1,this.motes.uniforms.uFadeOut.value=.5,this.shear=e.get(`afterimage.shear`,{capacity:1400,shape:x.STREAK,additive:!0,stretch:!0,softFade:.3}),this.shear.uniforms.uDrag.value=2.6,this.shear.uniforms.uEndSize.value=.15,this.shear.uniforms.uSizeIn.value=.02,this.shear.uniforms.uFadeIn.value=.02,this.shear.uniforms.uFadeOut.value=.5,this.moteEmitter=new S}get instanceCount(){return this._live}get impactDuration(){return Math.max(.05,p.afterimage.lifetime*p.global.lifetime)}get fadeDuration(){return Math.max(.05,p.afterimage.fadeTime)}lightShimmer(){let e=p.afterimage,t=this._frozen%Math.max(1,Math.round(e.lightSteps));return 1-e.lightStagger*(t/Math.max(1,Math.round(e.lightSteps)))}_progressAt(e){let t=p.afterimage,n=Math.max(.01,t.speed*p.global.speed);return h(e/Math.max(this.length/n,1e-4))**+Math.max(.05,t.flightCurve)}_shownAgeOf(e){let t=p.afterimage;return e<=0?this.age:Math.min(this.age,e*t.snapGap)}_bodyPoint(e,t){let n=p.afterimage,r=this._shownAgeOf(e),i=Math.max(this.age-r,0),a=this._progressAt(r);return this.pointAt(a,t),t.addScaledVector(this.side,Math.sin((a*n.swayWaves+this._seed)*Math.PI*2)*n.sway),t.y+=u(n.liftNear,n.lift,a)+n.arc*Math.sin(a*Math.PI)-i*n.holdSink,a}_snapCount(){return f(Math.round(p.afterimage.snaps),0,8)}_syncBody(e){let t=this._state;t.origin.copy(this.origin),t.dir.copy(this.direction),t.side.copy(this.side),t.length=this.length,t.age=this.age,t.seed=this._seed,t.fade=e,this.material.userData.sync(t);let n=this._snapCount();this._live=n+1,this.geometry.instanceCount=this._live*4}_syncRegion(){let e=this._region;if(!e)return;let t=p.afterimage,n=this._regionParams;this._bodyPoint(Math.min(this._frozen,this._snapCount()),I),e.place(I),n.radius=t.holdRadius,n.core=t.holdCore,n.strength=t.holdStrength,n.rate=t.holdRate,e.sync(n)}_syncParticles(e,t){let r=p.afterimage,i=p.global;if(this.motes.setGradient(o(r.colorMoteA),o(r.colorMoteB),o(r.colorMoteC),o(r.colorMoteD)),this.motes.uniforms.uGravity.value.set(0,r.moteRise,0),this.motes.uniforms.uSizeScale.value=r.moteSize*i.particleSize*7,this.motes.uniforms.uLifeScale.value=r.moteLifetime*.5*i.particleLifetime,this.motes.uniforms.uSpeedScale.value=i.particleSpeed,this.motes.uniforms.uOpacity.value=r.moteOpacity*i.opacity,this.motes.uniforms.uGlow.value=r.moteGlow*i.glow,this.motes.uniforms.uTurbulence.value=r.moteTurbulence*i.turbulence,this.shear.setGradient(o(r.colorShearA),o(r.colorShearB),o(r.colorShearC),o(r.colorShearD)),this.shear.uniforms.uGravity.value.set(0,r.shearGravity,0),this.shear.uniforms.uSizeScale.value=r.shearSize*i.particleSize*7,this.shear.uniforms.uLifeScale.value=r.shearLifetime*.5*i.particleLifetime,this.shear.uniforms.uSpeedScale.value=i.particleSpeed,this.shear.uniforms.uOpacity.value=i.opacity,this.shear.uniforms.uGlow.value=r.shearGlow*i.glow,this.shear.uniforms.uStretch.value=r.shearStretch,e<=0)return;let a=Math.round(this.moteEmitter.tick(e,r.moteRate*t)*i.particleCount);a<=0||(this._bodyPoint(0,P),L.position=P,L.radius=r.moteSpread,L.direction=F.copy(this.direction).multiplyScalar(-.4).setY(.35).normalize(),L.speed=r.moteSpeed,L.speedVariance=.8,L.spread=1,L.inherit=null,L.anchor=null,L.size=.11,L.sizeVariance=.7,L.life=r.moteLifetime,L.lifeVariance=.5,L.spin=0,L.tint=null,L.time=n.uTime.value,this.motes.emit(a,L))}_pollFreezes(e){if(e<=0)return;let t=p.afterimage,n=Math.max(.001,t.snapGap),r=Math.min(this._snapCount(),Math.floor(this.age/n));for(;this._frozen<r;)this._frozen++,this._freezeFx(this._frozen)}_freezeFx(e){let t=p.afterimage,r=p.global,i=n.uTime.value;this._bodyPoint(e,P),L.position=P,L.radius=t.shearSpread,L.direction=F.copy(this.side),L.speed=t.shearSpeed,L.speedVariance=.9,L.spread=1,L.inherit=null,L.anchor=null,L.size=.17,L.sizeVariance=.8,L.life=t.shearLifetime,L.lifeVariance=.55,L.spin=0,L.tint=null,L.time=i,this.shear.emit(Math.round(t.shearPerSnap*r.particleCount),L),P.y=0,this.ctx.decals.spawn(C.SHOCKWAVE,P,{radius:t.snapRingRadius,life:t.snapRingLife,width:t.snapRingWidth,intensity:t.snapRingIntensity,colorA:o(t.colorSnapRingA),colorB:o(t.colorSnapRingB)}),this._region?.lock(i),this.lightBoost=t.lightIntensity*t.snapPunch*r.explosionIntensity}onSpawn(){this.moteEmitter.reset(),this._frozen=0,this._live=1,this._seed=Math.random()*10,this._region=this.borrow(E.acquire()),this._region?.lock(n.uTime.value),this._syncBody(1),this._syncRegion(),this._syncParticles(0,1)}onTravel(e){this._pollFreezes(e),this._syncBody(1),this._syncRegion(),this._syncParticles(e,1),this._bodyPoint(0,this.position),this.ctx.shake.rumble(p.afterimage.rumble*p.global.cameraShake,e)}onImpact(){let e=p.afterimage,t=p.global;this._bodyPoint(0,P),this.ctx.bursts.spawn(y.AIR,P,{radius:e.arrivalSize*.25,endRadius:e.arrivalSize*t.explosionIntensity,life:.8,intensity:e.arrivalIntensity,opacity:.6,fresnel:2,displace:.3,squash:.9,colorA:o(e.colorArrivalA),colorB:o(e.colorArrivalB),colorC:o(e.colorArrivalC)}),L.position=P,L.radius=e.shearSpread*1.6,L.direction=F.copy(this.direction).multiplyScalar(.3).setY(.5).normalize(),L.speed=e.shearSpeed*1.7,L.speedVariance=.9,L.spread=1,L.inherit=null,L.anchor=null,L.size=.2,L.sizeVariance=.8,L.life=e.shearLifetime*1.4,L.lifeVariance=.6,L.spin=0,L.tint=null,L.time=n.uTime.value,this.shear.emit(Math.round(e.arrivalShear*t.particleCount),L),this.ctx.shake.add(e.arrivalShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),22),this.ctx.flash.trigger(o(e.colorFlash),e.arrivalFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*1.2*t.explosionIntensity}onFade(e,t){let n=t<=1?1:1-g.inCubic(h(t-1));this._pollFreezes(e),this._syncBody(n),this._syncRegion(),this._syncParticles(e,n*.35),this._bodyPoint(0,this.position)}onDestroy(){this._region?.release(),this._region=null,this._frozen=0,this._live=1,this.geometry.instanceCount=4,this.material.uniforms.uFade.value=0}dispose(){this.geometry.dispose(),this.material.dispose(),super.dispose()}};export{R as AfterimageAbility};
//# sourceMappingURL=AfterimageAbility-5a4BkjR1.js.map