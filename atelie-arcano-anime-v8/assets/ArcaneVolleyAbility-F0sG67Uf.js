import{$ as e,$t as t,Br as n,G as r,Gr as i,K as a,Qt as o,R as s,V as c,Y as l,_t as u,di as d,nt as f,o as p,q as m,st as h,tt as g,ui as _,xt as v,y,yn as b}from"./settings-DdywqLlV.js";import{t as x}from"./ParticleSystem-BZTczMT8.js";import{n as S}from"./ParticleEngine-DLxipNH0.js";import{n as C}from"./GroundDecals-kYmr8HKl.js";import{n as w,t as T}from"./Ability-CYesB5Ur.js";var E=[[1,2],[2,3],[3,2],[2,1],[3,4],[1,3],[4,3],[5,3]],D=`
  #define PI  3.141592653589793
  #define TAU 6.283185307179586
  #define MAX_BOLTS 8

  uniform vec3  uHand;
  uniform vec3  uTarget;
  uniform vec3  uSide;
  uniform float uSeed;
  uniform float uCount;

  uniform float uWeaveSide;
  uniform float uWeaveUp;
  uniform float uWeaveTurns;
  uniform float uWeavePhase;
  uniform float uWeaveDecay;
  uniform float uPathCurve;
  uniform float uOrbitTurns;
  uniform float uOrbitStart;
  uniform float uChargeCurve;
  uniform vec2  uRatio[MAX_BOLTS];

  /** The perpendicular frame the weave lives in. Gram-Schmidt, as the bolt does. */
  void volleyFrame(out vec3 dir, out vec3 n1, out vec3 n2) {
    vec3 delta = uTarget - uHand;
    float span = max(length(delta), 0.01);
    dir = delta / span;
    n1 = uSide - dir * dot(uSide, dir);
    n1 = length(n1) > 1e-4 ? normalize(n1) : normalize(cross(dir, vec3(0.0, 1.0, 0.0)));
    n2 = normalize(cross(dir, n1));
  }

  /** This bolt's frequency pair, fetched the only way ANGLE allows. */
  vec2 boltRatio(float bolt) {
    vec2 r = uRatio[0];
    for (int i = 0; i < MAX_BOLTS; i++) {
      if (float(i) == bolt) r = uRatio[i];
    }
    return r;
  }

  /** Where bolt number 'bolt' is at 'q'. See the header for what q means. */
  vec3 boltPoint(float bolt, float q, vec3 n1, vec3 n2) {
    float tau = clamp(q, 0.0, 1.0);
    float wind = clamp(q, -1.0, 0.0);

    vec2 ratio = boltRatio(bolt);
    float phase = (bolt / max(uCount, 1.0)) * TAU + uSeed;
    // Rotating while it is held, frozen the moment it leaves.
    phase += wind * uOrbitTurns * TAU;

    // The ring opens from uOrbitStart to full amplitude over the wind-up, and
    // is exactly 1 at release, so the flight inherits the offset it had.
    float grow = pow(clamp(1.0 + wind, 0.0, 1.0), max(uChargeCurve, 0.05));
    float gate = mix(uOrbitStart, 1.0, grow);
    float decay = pow(1.0 - tau, max(uWeaveDecay, 0.01)) * gate;

    vec3 base = mix(uHand, uTarget, pow(tau, max(uPathCurve, 0.05)));
    base += n1 * (uWeaveSide * decay * sin(TAU * ratio.x * uWeaveTurns * tau + phase));
    base += n2 * (uWeaveUp * decay * sin(TAU * ratio.y * uWeaveTurns * tau + phase + uWeavePhase));
    return base;
  }
`,O=`
  ${D}

  uniform float uTime;
  uniform float uQHead;
  uniform float uQTail;
  uniform float uWidth;
  uniform float uTaper;
  uniform float uFade;
  uniform float uFlicker;
  uniform float uFlickerSpeed;

  attribute float aStrand;

  varying float vV;
  varying float vSide;
  varying float vFlash;
  varying float vViewZ;

  ${l}

  void main() {
    float v = position.x;
    vV = v;
    vSide = position.y;

    vec3 dir, n1, n2;
    volleyFrame(dir, n1, n2);

    float q = mix(uQTail, uQHead, v);
    vec3 here = boltPoint(aStrand, q, n1, n2);

    // The tangent is taken along the *flight*, not along the ribbon's own
    // parameter, so a ribbon whose ends coincide (a bolt that has stopped)
    // still has a direction to face the camera with.
    float dq = max(abs(uQHead - uQTail), 1e-3) * 0.05;
    float flip = 1.0;
    float other = q + dq;
    if (other > 1.0) { other = q - dq; flip = -1.0; }
    vec3 next = boltPoint(aStrand, other, n1, n2);
    vec3 tangent = (next - here) * flip;
    tangent = length(tangent) > 1e-5 ? normalize(tangent) : dir;

    vec3 toCamera = normalize(cameraPosition - here);
    vec3 binormal = cross(tangent, toCamera);
    float bl = length(binormal);
    binormal = bl > 1e-4 ? binormal / bl : n1;

    float flash = mix(1.0, hash11(floor(uTime * uFlickerSpeed) + aStrand * 5.1 + uSeed), uFlicker);
    vFlash = flash;

    // Tapered to a point at the tail. The head keeps its width so the ribbon
    // reads as *emitted* rather than as a spindle.
    float halfWidth = uWidth * pow(clamp(v, 0.0, 1.0), max(uTaper, 0.05)) * flash * uFade;

    vec4 mv = viewMatrix * vec4(here + binormal * vSide * halfWidth, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,k=`
  uniform float uCoreSharp;
  uniform float uCoreWidth;
  uniform float uHaloFalloff;
  uniform float uHaloOpacity;
  uniform float uOpacity;
  uniform float uGlow;
  uniform float uFade;
  uniform float uSoftFade;
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  uniform vec3  uColorD;

  uniform float uGlobalGlow;
  uniform vec2  uResolution;
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;

  varying float vV;
  varying float vSide;
  varying float vFlash;
  varying float vViewZ;

  ${l}
  ${m}

  void main() {
    float v = clamp(abs(vSide), 0.0, 1.0);

    // One pass carrying both profiles: additive blending is a sum, so a halo
    // pass and a core pass over the same ribbon are the same image as adding
    // them here — for one draw call instead of two.
    float core = pow(clamp(1.0 - v / max(uCoreWidth, 1e-3), 0.0, 1.0), max(uCoreSharp, 0.05));
    float halo = pow(1.0 - v, max(uHaloFalloff, 0.05)) * uHaloOpacity;

    // Four stops from the tail to the head. Sampled along the ribbon rather
    // than over a particle's life, because the ribbon *is* the history.
    vec3 tint = gradient4(uColorA, uColorB, uColorC, uColorD, clamp(vV, 0.0, 1.0));

    float ends = smoothstep(0.0, 0.12, vV);
    float alpha = (core + halo) * ends * vFlash * uFade * uOpacity;

    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.003) discard;

    vec3 color = tint * (core + halo) * uGlow * uGlobalGlow;
    gl_FragColor = vec4(color, alpha);
  }
`;function A(){let e=[];for(let t=0;t<8;t++)e.push(new _(E[t][0],E[t][1]));let t=new n({transparent:!0,depthWrite:!1,depthTest:!0,blending:2,side:2,toneMapped:!1,uniforms:a({uHand:{value:new d},uTarget:{value:new d(0,0,1)},uSide:{value:new d(1,0,0)},uSeed:{value:0},uCount:{value:7},uRatio:{value:e},uWeaveSide:{value:1.9},uWeaveUp:{value:1.2},uWeaveTurns:{value:1},uWeavePhase:{value:Math.PI*.5},uWeaveDecay:{value:1.5},uPathCurve:{value:1},uOrbitTurns:{value:1.2},uOrbitStart:{value:.25},uChargeCurve:{value:.8},uQHead:{value:0},uQTail:{value:0},uWidth:{value:.13},uTaper:{value:1.5},uFade:{value:1},uFlicker:{value:.1},uFlickerSpeed:{value:20},uCoreSharp:{value:2.4},uCoreWidth:{value:.36},uHaloFalloff:{value:2.4},uHaloOpacity:{value:.6},uOpacity:{value:1},uGlow:{value:2},uSoftFade:{value:.5},uColorA:{value:new v(.16,.1,.29)},uColorB:{value:new v(.54,.37,.82)},uColorC:{value:new v(.88,.75,1)},uColorD:{value:new v(1,1,1)}}),vertexShader:O,fragmentShader:k});return t.userData.sync=e=>{let n=p.arcanevolley,r=p.global,i=t.uniforms;i.uHand.value.copy(e.hand),i.uTarget.value.copy(e.target),i.uSide.value.copy(e.side),i.uSeed.value=e.seed,i.uCount.value=e.count,i.uQHead.value=e.qHead,i.uQTail.value=e.qTail,i.uFade.value=e.fade,i.uWeaveSide.value=n.weaveSide,i.uWeaveUp.value=n.weaveUp,i.uWeaveTurns.value=n.weaveTurns,i.uWeavePhase.value=n.weavePhase,i.uWeaveDecay.value=n.weaveDecay,i.uPathCurve.value=n.pathCurve,i.uOrbitTurns.value=n.orbitTurns,i.uOrbitStart.value=n.orbitStart,i.uChargeCurve.value=n.chargeCurve,i.uWidth.value=n.trailWidth,i.uTaper.value=n.trailTaper,i.uFlicker.value=n.trailFlicker,i.uFlickerSpeed.value=n.trailFlickerSpeed,i.uCoreSharp.value=n.trailCoreSharp,i.uCoreWidth.value=n.trailCoreWidth,i.uHaloFalloff.value=n.trailHaloFalloff,i.uHaloOpacity.value=n.trailHaloOpacity,i.uOpacity.value=n.trailOpacity*r.opacity,i.uGlow.value=n.trailGlow*r.glow,i.uSoftFade.value=n.trailSoftFade,i.uColorA.value.copy(s(n.colorTrailA)),i.uColorB.value.copy(s(n.colorTrailB)),i.uColorC.value.copy(s(n.colorTrailC)),i.uColorD.value.copy(s(n.colorTrailD))},t}var j=`
  ${D}

  uniform float uTime;
  uniform float uQHead;
  uniform float uSize;
  uniform float uFade;

  attribute float aStrand;

  varying vec2  vQuad;
  varying float vViewZ;

  ${l}

  void main() {
    vQuad = position.xy;

    vec3 dir, n1, n2;
    volleyFrame(dir, n1, n2);
    vec3 here = boltPoint(aStrand, uQHead, n1, n2);

    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    float size = uSize * uFade;

    vec4 mv = viewMatrix * vec4(here + (right * position.x + up * position.y) * size, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,M=`
  uniform float uCoreSharp;
  uniform float uSoft;
  uniform float uGlow;
  uniform float uOpacity;
  uniform float uFade;
  uniform float uSoftFade;
  uniform vec3  uColorCore;
  uniform vec3  uColorRim;

  uniform float uGlobalGlow;
  uniform vec2  uResolution;
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;

  varying vec2  vQuad;
  varying float vViewZ;

  ${m}

  void main() {
    float r = length(vQuad);
    if (r > 1.0) discard;

    float core = pow(clamp(1.0 - r, 0.0, 1.0), max(uCoreSharp, 0.05));
    float bloom = pow(clamp(1.0 - r, 0.0, 1.0), max(uSoft, 0.05));

    vec3 color = (uColorCore * core + uColorRim * bloom) * uGlow * uGlobalGlow;
    float alpha = clamp(core + bloom * 0.6, 0.0, 1.0) * uOpacity * uFade;

    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;function N(){let e=[];for(let t=0;t<8;t++)e.push(new _(E[t][0],E[t][1]));let t=new n({transparent:!0,depthWrite:!1,depthTest:!0,blending:2,side:2,toneMapped:!1,uniforms:a({uHand:{value:new d},uTarget:{value:new d(0,0,1)},uSide:{value:new d(1,0,0)},uSeed:{value:0},uCount:{value:7},uRatio:{value:e},uWeaveSide:{value:1.9},uWeaveUp:{value:1.2},uWeaveTurns:{value:1},uWeavePhase:{value:Math.PI*.5},uWeaveDecay:{value:1.5},uPathCurve:{value:1},uOrbitTurns:{value:1.2},uOrbitStart:{value:.25},uChargeCurve:{value:.8},uQHead:{value:0},uSize:{value:.11},uFade:{value:1},uCoreSharp:{value:3.4},uSoft:{value:1.1},uGlow:{value:2.4},uOpacity:{value:1},uSoftFade:{value:.35},uColorCore:{value:new v(1,1,1)},uColorRim:{value:new v(.6,.4,.9)}}),vertexShader:j,fragmentShader:M});return t.userData.sync=e=>{let n=p.arcanevolley,r=p.global,i=t.uniforms;i.uHand.value.copy(e.hand),i.uTarget.value.copy(e.target),i.uSide.value.copy(e.side),i.uSeed.value=e.seed,i.uCount.value=e.count,i.uQHead.value=e.qHead,i.uFade.value=e.fade,i.uWeaveSide.value=n.weaveSide,i.uWeaveUp.value=n.weaveUp,i.uWeaveTurns.value=n.weaveTurns,i.uWeavePhase.value=n.weavePhase,i.uWeaveDecay.value=n.weaveDecay,i.uPathCurve.value=n.pathCurve,i.uOrbitTurns.value=n.orbitTurns,i.uOrbitStart.value=n.orbitStart,i.uChargeCurve.value=n.chargeCurve,i.uSize.value=n.headSize,i.uCoreSharp.value=n.headCoreSharp,i.uSoft.value=n.headSoft,i.uGlow.value=n.headGlow*r.glow,i.uOpacity.value=n.headOpacity*r.opacity,i.uSoftFade.value=n.headSoftFade,i.uColorCore.value.copy(s(n.colorHeadCore)),i.uColorRim.value.copy(s(n.colorHeadRim))},t}function P(e,t,n,r,i,a,o,s,c,l){let u=Math.PI*2,d=i<0?0:i>1?1:i,f=i<-1?-1:i>0?0:i,p=E[Math.max(0,Math.min(7,n))],m=n/Math.max(1,r)*u+t;m+=f*e.orbitTurns*u;let h=Math.max(0,1+f)**+Math.max(.05,e.chargeCurve),g=e.orbitStart+(1-e.orbitStart)*h,_=(1-d)**Math.max(.01,e.weaveDecay)*g;return l.copy(a).lerp(o,d**+Math.max(.05,e.pathCurve)),l.addScaledVector(s,e.weaveSide*_*Math.sin(u*p[0]*e.weaveTurns*d+m)),l.addScaledVector(c,e.weaveUp*_*Math.sin(u*p[1]*e.weaveTurns*d+m+e.weavePhase)),l}var F=48,I=Math.PI*2,L={},R=new d,z=new d,B=new d,V=new d,H=new d,U=new d,W=new d(0,1,0);function G(e){let n=Math.max(1,Math.round(e)),r=new Float32Array([-1,-1,0,1,-1,0,1,1,0,-1,1,0]),a=new Uint16Array([0,1,2,0,2,3]),s=new Float32Array(n);for(let e=0;e<n;e++)s[e]=e;let c=new t;return c.setAttribute(`position`,new u(r,3)),c.setAttribute(`aStrand`,new o(s,1)),c.setIndex(new u(a,1)),c.instanceCount=n,c.boundingSphere=new i(new d,1e4),c}var K=class extends T{constructor(e){super(`arcanevolley`,e)}createShaders(){this.trailGeometry=e(F,8),this.trailMaterial=A(),this.trailMesh=new b(this.trailGeometry,this.trailMaterial),this.trailMesh.frustumCulled=!1,this.trailMesh.matrixAutoUpdate=!1,this.trailMesh.layers.set(c.VFX),this.trailMesh.renderOrder=11,this.group.add(this.trailMesh),this.headGeometry=G(8),this.headMaterial=N(),this.headMesh=new b(this.headGeometry,this.headMaterial),this.headMesh.frustumCulled=!1,this.headMesh.matrixAutoUpdate=!1,this.headMesh.layers.set(c.VFX),this.headMesh.renderOrder=13,this.group.add(this.headMesh),this._seed=0,this._boltCount=1,this._landedAt=-1,this._state={hand:new d,target:new d,side:new d,seed:0,count:7,qHead:0,qTail:0,fade:1}}createParticles(){let e=this.ctx.particles;this.motes=e.get(`arcanevolley.motes`,{capacity:2400,shape:x.SOFT,additive:!0,swirl:!0,softFade:.35}),this.motes.uniforms.uDrag.value=1.4,this.motes.uniforms.uEndSize.value=.1,this.motes.uniforms.uSizeIn.value=.05,this.motes.uniforms.uFadeIn.value=.08,this.motes.uniforms.uFadeOut.value=.5,this.sparks=e.get(`arcanevolley.sparks`,{capacity:2400,shape:x.STREAK,additive:!0,stretch:!0,softFade:.25}),this.sparks.uniforms.uDrag.value=1.5,this.sparks.uniforms.uEndSize.value=.25,this.sparks.uniforms.uSizeIn.value=.02,this.sparks.uniforms.uFadeIn.value=.03,this.sparks.uniforms.uFadeOut.value=.45,this.dust=e.get(`arcanevolley.dust`,{capacity:1200,shape:x.SMOKE,additive:!1,curl:!0,softFade:1.1}),this.dust.uniforms.uDrag.value=1.8,this.dust.uniforms.uEndSize.value=2.4,this.dust.uniforms.uSizeIn.value=.12,this.dust.uniforms.uFadeIn.value=.16,this.dust.uniforms.uFadeOut.value=.32,this.intakeEmitter=new S,this.shedEmitter=new S}get instanceCount(){return this._boltCount*2}get impactDuration(){return Math.max(.05,p.arcanevolley.lifetime*p.global.lifetime)}get fadeDuration(){return Math.max(.05,p.arcanevolley.fadeTime)}get charge(){return h(this.age/Math.max(.01,p.arcanevolley.charge))}get flightTime(){let e=p.arcanevolley;return this.length/Math.max(.01,e.speed*p.global.speed)}lightShimmer(){let e=p.arcanevolley;return 1-e.lightPulse*(.5-.5*Math.cos(this.age*e.lightPulseSpeed*I))}advance(e){let t=this.config,n=Math.max(0,t.charge);if(this.age<n)return!1;let r=t.speed*p.global.speed,i=this.age-n;this.front+=r*g.outQuad(h(i/.05))*e;let a=this.u;return this.u=h(this.front/this.length),this.pointAt(this.u,this.position),this.u>=1&&a<1}_handPoint(e){let t=p.arcanevolley;return e.copy(this.origin).addScaledVector(this.direction,t.handForward).addScaledVector(this.side,t.handSide),e.y=t.handHeight,e}_impactPoint(e){return this.pointAt(1,e),e.y=p.arcanevolley.endHeight,e}_frame(e,t){z.copy(t).sub(e);let n=Math.max(z.length(),.01);z.multiplyScalar(1/n),H.copy(this.side).addScaledVector(z,-this.side.dot(z)),H.lengthSq()>1e-8?H.normalize():H.crossVectors(z,W).normalize(),U.crossVectors(z,H).normalize()}get _q(){return this.phase===w.TRAVEL?this.u>0?this.u:-(1-this.charge):1}_boltPoint(e,t,n){let r=p.arcanevolley;return this._handPoint(B),this._impactPoint(V),this._frame(B,V),P(r,this._seed,e,this._boltCount,t,B,V,H,U,n)}onSpawn(){this.intakeEmitter.reset(),this.shedEmitter.reset(),this._landedAt=-1,this._seed=Math.random()*100,this._syncUniforms(1),this._muzzleFx()}_syncUniforms(e){let t=p.arcanevolley,n=p.global;this._handPoint(B),this._impactPoint(V);let r=this._state;r.hand.copy(B),r.target.copy(V),r.side.copy(this.side),r.seed=this._seed,this._boltCount=Math.max(1,Math.min(8,Math.round(t.bolts))),r.count=this._boltCount,r.fade=e;let i=this._q;r.qHead=i;let a=i<=0?Math.max(.01,t.charge):Math.max(.01,this.flightTime),o=t.trailSpan/a;if(this._landedAt>=0){let e=h((this.age-this._landedAt)/Math.max(.02,t.trailBurn));o*=1-g.outQuad(e)}r.qTail=f(i-o,-1,1),this.trailGeometry.instanceCount=this._boltCount,this.headGeometry.instanceCount=this._boltCount,this.trailMaterial.userData.sync(r),this.headMaterial.userData.sync(r),this.motes.setGradient(s(t.colorMoteA),s(t.colorMoteB),s(t.colorMoteC),s(t.colorMoteD)),this.motes.uniforms.uGravity.value.set(0,t.moteRise,0),this.motes.uniforms.uSizeScale.value=t.moteSize*n.particleSize*7,this.motes.uniforms.uLifeScale.value=t.moteLifetime*.5*n.particleLifetime,this.motes.uniforms.uSpeedScale.value=n.particleSpeed,this.motes.uniforms.uOpacity.value=n.opacity,this.motes.uniforms.uGlow.value=t.trailGlow*.5*n.glow,this.motes.uniforms.uSwirl.value=t.moteSwirl*n.animationSpeed,this.motes.uniforms.uSwirlExpand.value=t.moteSwirlExpand,this.motes.uniforms.uTurbulence.value=t.moteTurbulence*n.turbulence,this.sparks.setGradient(s(t.colorSparkA),s(t.colorSparkB),s(t.colorSparkC),s(t.colorSparkD)),this.sparks.uniforms.uGravity.value.set(0,t.sparkGravity,0),this.sparks.uniforms.uSizeScale.value=t.sparkSize*n.particleSize*7,this.sparks.uniforms.uLifeScale.value=t.sparkLifetime*.5*n.particleLifetime,this.sparks.uniforms.uSpeedScale.value=n.particleSpeed,this.sparks.uniforms.uOpacity.value=n.opacity,this.sparks.uniforms.uGlow.value=t.headGlow*.5*n.glow,this.sparks.uniforms.uStretch.value=t.sparkStretch,this.sparks.uniforms.uTurbulence.value=.25*n.turbulence,this.dust.setGradient(s(t.colorDustA),s(t.colorDustB),s(t.colorDustC),s(t.colorDustD)),this.dust.uniforms.uGravity.value.set(0,t.dustRise,0),this.dust.uniforms.uSizeScale.value=t.dustSize*n.particleSize,this.dust.uniforms.uLifeScale.value=t.dustLifetime*.5*n.particleLifetime,this.dust.uniforms.uSpeedScale.value=t.dustSpeed*n.particleSpeed,this.dust.uniforms.uOpacity.value=t.dustOpacity*n.opacity,this.dust.uniforms.uTurbulence.value=.3*n.turbulence}_muzzleFx(){let e=p.arcanevolley,t=p.global;this._handPoint(R),this.ctx.bursts.spawn(y.AIR,R,{radius:e.muzzleSize*.2,endRadius:e.muzzleSize*t.explosionIntensity,life:.34,intensity:e.muzzleIntensity,opacity:.85,fresnel:1.7,displace:.4,colorA:s(e.colorMuzzleA),colorB:s(e.colorMuzzleB),colorC:s(e.colorMuzzleC)}),this.ctx.flash.trigger(s(e.colorCastFlash),e.castFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.5*t.explosionIntensity}_intakeFx(e){let t=p.arcanevolley,n=p.global,i=Math.round(this.intakeEmitter.tick(e,t.intakeRate*this.charge)*n.particleCount);i<=0||(this._handPoint(R),L.position=R,L.radius=t.moteShell,L.direction=z.set(0,1,0),L.speed=t.moteSpeed*.3,L.speedVariance=.7,L.spread=.6,L.inherit=null,L.anchor=null,L.size=.09,L.sizeVariance=.6,L.life=t.moteLifetime,L.lifeVariance=.4,L.spin=0,L.tint=null,L.time=r.uTime.value,this.motes.emit(i,L))}_shedFx(e,t){let n=p.arcanevolley,i=p.global,a=Math.round(this.shedEmitter.tick(e,n.moteRate*t)*i.particleCount);if(a<=0)return;let o=this._q,s=Math.max(1,Math.ceil(a/this._boltCount));for(let e=0;e<this._boltCount;e++)this._boltPoint(e,o,R),L.position=R,L.radius=.06,L.direction=z.set(0,1,0),L.speed=n.moteSpeed,L.speedVariance=.8,L.spread=1,L.inherit=null,L.anchor=R,L.size=.07,L.sizeVariance=.5,L.life=n.moteLifetime*.7,L.lifeVariance=.5,L.spin=0,L.tint=null,L.time=r.uTime.value,this.motes.emit(s,L)}onTravel(e){let t=p.arcanevolley,n=p.global;this._syncUniforms(1),this._boltPoint(0,this._q,R),this.position.copy(R),this.u<=0?(this._intakeFx(e),this.ctx.shake.rumble(t.chargeShake*this.charge*n.cameraShake,e)):(this._shedFx(e,1),this.ctx.shake.rumble(t.rumble*n.cameraShake,e))}onImpact(){let e=p.arcanevolley,t=p.global,n=r.uTime.value;this._landedAt=this.age,this._impactPoint(R),this.pointAt(1,V),this.ctx.bursts.spawn(y.AIR,R,{radius:e.burstSize*.18,endRadius:e.burstSize*t.explosionIntensity,life:.6,intensity:e.burstIntensity,opacity:.9,fresnel:1.6,displace:.55,squash:.9,colorA:s(e.colorBurstA),colorB:s(e.colorBurstB),colorC:s(e.colorBurstC)}),this.ctx.decals.spawn(C.SHOCKWAVE,V,{radius:e.shockRadius*t.explosionIntensity,life:.5,width:.05,intensity:1,colorA:s(e.colorShockA),colorB:s(e.colorShockB)}),this.ctx.decals.spawn(C.SCORCH,V,{radius:e.scorchRadius*2.2,life:e.scorchLife,intensity:e.scorchIntensity,colorA:s(e.colorScorch),colorB:s(e.colorEmber),height:.015}),L.position=R,L.radius=.25,L.direction=z.copy(this.direction).multiplyScalar(.4).setY(.75).normalize(),L.speed=e.sparkSpeed*2.1,L.speedVariance=.85,L.spread=1,L.inherit=null,L.anchor=null,L.size=.2,L.sizeVariance=.8,L.life=e.sparkLifetime*1.4,L.lifeVariance=.6,L.spin=0,L.tint=null,L.time=n,this.sparks.emit(Math.round(e.burstSparks*t.particleCount),L),L.position=V,L.radius=e.scorchRadius*2,L.direction=z.set(0,1,0),L.speed=e.dustSpeed*2,L.spread=1,L.size=1.3,L.life=e.dustLifetime*1.2,L.spin=.4,this.dust.emit(Math.round(e.burstDust*t.particleCount),L),this.ctx.shake.add(e.impactShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),26),this.ctx.flash.trigger(s(e.colorFlash),e.impactFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*1.3*t.explosionIntensity}onFade(e,t){let n=t<=1?1:1-g.inCubic(h(t-1));this._syncUniforms(n),this._impactPoint(this.position),this._shedFx(e,n*.25)}onDestroy(){this._boltCount=1,this._landedAt=-1,this.trailGeometry.instanceCount=1,this.headGeometry.instanceCount=1,this.trailMaterial.uniforms.uFade.value=0,this.headMaterial.uniforms.uFade.value=0}dispose(){this.trailGeometry.dispose(),this.trailMaterial.dispose(),this.headGeometry.dispose(),this.headMaterial.dispose(),super.dispose()}};export{K as ArcaneVolleyAbility};
//# sourceMappingURL=ArcaneVolleyAbility-F0sG67Uf.js.map