import{$ as e,Br as t,Fn as n,G as r,K as i,R as a,V as o,Y as s,at as c,di as l,o as u,ot as d,q as f,st as p,tt as m,xt as h,y as g,yn as _}from"./settings-DdywqLlV.js";import{t as v}from"./ParticleSystem-BZTczMT8.js";import{n as y}from"./ParticleEngine-DLxipNH0.js";import{n as b}from"./GroundDecals-kYmr8HKl.js";import{n as x,t as S}from"./Ability-CYesB5Ur.js";import{i as C,n as w,r as T,t as E}from"./Swarm-WksC-UkD.js";import{n as D,r as O,t as k}from"./GroundField-aLIZg3d3.js";import{n as A,r as j,t as M}from"./Distortion-CclodxJd.js";var N=`
  #define TAU 6.283185307179586

  uniform float uAge;          // seconds since the cast began
  uniform vec3  uCentre;       // the well, world metres
  uniform float uSeed;         // per-cast dice roll, unitless

  /* --- the orbit --- */
  uniform float uFallTime;     // seconds one stream takes to reach the horizon
  uniform float uRadiusInner;  // metres — the tightest starting orbit
  uniform float uRadiusOuter;  // metres — the widest
  uniform float uHorizon;      // metres — where a stream is swallowed
  uniform float uOrbitRate;    // radians/second at the widest orbit
  uniform float uInclination;  // radians the orbits tilt out of the disc plane
  uniform float uFlatten;      // 0 a flat disc, 1 a sphere of orbits
  uniform float uEject;        // metres of outward blow-out (the collapse)
  uniform float uTrailTime;    // seconds of history in a stream's tail
  uniform float uWobble;       // metres of lateral slop on a stream
  uniform float uWobbleTurns;  // wobbles per turn of the orbit

  /* --- the ribbon --- */
  uniform float uWidth;        // half-width at the head, metres
  uniform float uWidthTail;    // that width at the tail, as a fraction
  uniform float uWidthCurve;   // how early the taper happens
  uniform float uWidthNear;    // extra width at the horizon, × uWidth
  uniform float uEnter;        // fraction of the fall spent fading in
  uniform float uExit;         // ... and fading out
  uniform float uOpen;         // 0..1 how much of the disc exists yet
  uniform float uFade;         // master fade

  attribute float aStrand;

  varying float vT;
  varying float vSide;
  varying float vTau;
  varying float vAlpha;
  varying float vViewZ;

  ${s}

  /**
   * Where one stream is at fall parameter tau. Tau may run negative — that is
   * the tail, still out where the stream has not been yet.
   */
  vec3 orbitAt(float tau, float bearing, float rDice, float tilt) {
    float r0 = mix(uRadiusInner, uRadiusOuter, rDice);
    float rh = max(min(uHorizon, r0), 0.02);
    float r = mix(r0, rh, tau);
    // r is linear in tau and never reaches zero, so the closed form below has
    // no singularity in it — the *hole* has one, the maths does not.
    float theta = bearing + uOrbitRate * uFallTime * tau * (r0 / max(r, 1e-3));

    float span = max(r + uEject, 0.0);
    float c = cos(tilt);
    float s = sin(tilt);

    vec3 p = uCentre;
    p.x += cos(theta) * span * c;
    p.z += sin(theta) * span * c;
    p.y += s * span * uFlatten;

    // Phase-locked to the orbit rather than to the clock: a wobble keyed off
    // time slides along a stream and reads as a wet noodle, while one keyed off
    // theta is a fixed corrugation the stream travels through.
    float w = theta * uWobbleTurns;
    p += vec3(sin(w + uSeed), cos(w * 1.31 + bearing * 7.0), sin(w * 0.87 + rDice * 13.0)) * uWobble;
    return p;
  }

  void main() {
    float t = position.x;      // 0 at the tail, 1 at the head
    float side = position.y;

    vec3 dice = hash31(aStrand * 3.77 + uSeed * 1.31 + 0.5);
    float bearing = dice.x * TAU;
    float rDice = dice.y;
    float tilt = (dice.z - 0.5) * 2.0 * uInclination;
    float phase = hash11(aStrand * 9.13 + uSeed + 4.7);

    float fall = max(uFallTime, 0.05);
    // Each stream runs its own loop of the fall, offset by its dice. The cast's
    // own age drives it, not the shared clock, so a fresh cast starts with the
    // disc already populated instead of with everything on the rim at once.
    float head = fract(uAge / fall + phase);
    float tau = head - (1.0 - t) * (uTrailTime / fall);

    vec3 here = orbitAt(tau, bearing, rDice, tilt);
    vec3 back = orbitAt(tau - 0.015, bearing, rDice, tilt);
    vec3 tangent = here - back;
    tangent = length(tangent) > 1e-6 ? normalize(tangent) : vec3(0.0, 1.0, 0.0);

    /* Turn the ribbon edge-on to the eye, the way the bolt does. */
    vec3 toCamera = normalize(cameraPosition - here);
    vec3 binormal = cross(tangent, toCamera);
    float bl = length(binormal);
    binormal = bl > 1e-4 ? binormal / bl : vec3(1.0, 0.0, 0.0);

    float taper = pow(clamp(t, 0.0, 1.0), max(uWidthCurve, 0.01));
    float halfWidth = uWidth * mix(uWidthTail, 1.0, taper);
    halfWidth *= mix(1.0, uWidthNear, clamp(head, 0.0, 1.0));

    float appear = smoothstep(0.0, max(uEnter, 1e-3), head);
    float vanish = 1.0 - smoothstep(1.0 - max(uExit, 1e-3), 1.0, head);
    vAlpha = appear * vanish * uFade * clamp(uOpen, 0.0, 1.0);

    vT = t;
    vSide = side;
    vTau = head;

    // World space throughout: the ability's group is an identity transform.
    vec4 mv = viewMatrix * vec4(here + binormal * side * halfWidth, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,P=`
  uniform float uCoreSharp;    // how hard the hot core falls off across the ribbon
  uniform float uHeat;         // how much of the colour walk the fall owns
  uniform float uGlow;
  uniform float uOpacity;
  uniform float uSoftFade;
  uniform vec3  uColorTail;
  uniform vec3  uColorHead;
  uniform vec3  uColorCore;
  uniform vec3  uColorHalo;

  uniform float uGlobalGlow;
  uniform vec2  uResolution;
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;

  varying float vT;
  varying float vSide;
  varying float vTau;
  varying float vAlpha;
  varying float vViewZ;

  ${f}

  void main() {
    if (vAlpha < 0.003) discard;

    float v = clamp(abs(vSide), 0.0, 1.0);
    float profile = pow(1.0 - v, max(uCoreSharp, 0.05));

    // Two walks along one gradient, weighted by uHeat: how far down the well
    // the stream is, and how near the head of its own tail this fragment is.
    // At uHeat = 1 the whole disc reddens together as it collapses; at 0 each
    // stream is cold at the tail and hot at the nose whatever its radius.
    float heat = clamp(mix(vT, vTau, clamp(uHeat, 0.0, 1.0)), 0.0, 1.0);
    vec3 body = mix(uColorTail, uColorHead, heat);

    vec3 colour = mix(uColorHalo, body, profile);
    colour = mix(colour, uColorCore, smoothstep(0.55, 1.0, profile) * heat);

    float alpha = profile * vAlpha * uOpacity;
    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.003) discard;

    colour *= uGlow * uGlobalGlow;
    gl_FragColor = vec4(colour, alpha);
  }
`;function F(){let e=new t({transparent:!0,depthWrite:!1,depthTest:!0,blending:2,side:2,toneMapped:!1,uniforms:i({uAge:{value:0},uCentre:{value:new l},uSeed:{value:0},uFallTime:{value:2.4},uRadiusInner:{value:1.8},uRadiusOuter:{value:4.8},uHorizon:{value:.6},uOrbitRate:{value:1.05},uInclination:{value:.42},uFlatten:{value:.55},uEject:{value:0},uTrailTime:{value:.55},uWobble:{value:.1},uWobbleTurns:{value:3},uWidth:{value:.07},uWidthTail:{value:.15},uWidthCurve:{value:1.5},uWidthNear:{value:1.8},uEnter:{value:.12},uExit:{value:.06},uOpen:{value:0},uFade:{value:1},uCoreSharp:{value:2.6},uHeat:{value:.72},uGlow:{value:2.2},uOpacity:{value:1},uSoftFade:{value:.4},uColorTail:{value:new h(`#3a1f7a`)},uColorHead:{value:new h(`#b58cff`)},uColorCore:{value:new h(`#ffffff`)},uColorHalo:{value:new h(`#160a2e`)}}),vertexShader:N,fragmentShader:P});return e.userData.sync=t=>{let n=u.singularity,r=u.global,i=e.uniforms;i.uCentre.value.copy(t.centre),i.uAge.value=t.age,i.uSeed.value=t.seed,i.uOpen.value=t.open,i.uFade.value=t.fade;let o=n.discOuter*n.zoneRadius,s=n.discInner*n.zoneRadius,c=1-n.discDraw*t.pull;i.uRadiusOuter.value=o*(n.discSeed+(1-n.discSeed)*t.open)*c,i.uRadiusInner.value=s*(n.discSeed+(1-n.discSeed)*t.open)*c,i.uHorizon.value=n.horizonRadius*n.discSwallow,i.uFallTime.value=Math.max(.05,n.fallTime*(1-n.fallSpeedUp*t.pull)),i.uOrbitRate.value=n.orbitRate*(1+n.orbitPull*t.pull),i.uInclination.value=n.inclination,i.uFlatten.value=n.flatten,i.uEject.value=n.ejectDistance*t.blow*r.explosionIntensity,i.uTrailTime.value=n.trailTime,i.uWobble.value=n.streamWobble*r.randomness*r.noiseStrength,i.uWobbleTurns.value=n.streamWobbleTurns*r.noiseFrequency,i.uWidth.value=n.streamWidth,i.uWidthTail.value=n.streamWidthTail,i.uWidthCurve.value=n.streamWidthCurve,i.uWidthNear.value=n.streamWidthNear,i.uEnter.value=n.streamEnter,i.uExit.value=n.streamExit,i.uCoreSharp.value=n.streamCoreSharp,i.uHeat.value=n.streamHeat,i.uGlow.value=n.streamGlow*r.glow,i.uOpacity.value=n.streamOpacity*r.opacity,i.uSoftFade.value=n.streamSoftFade,i.uColorTail.value.copy(a(n.colorStreamTail)),i.uColorHead.value.copy(a(n.colorStreamHead)),i.uColorCore.value.copy(a(n.colorStreamCore)),i.uColorHalo.value.copy(a(n.colorStreamHalo))},e}var I=`
  uniform vec3  uCentre;
  uniform float uSize;      // half-extent of the quad, metres

  varying vec2  vLocal;     // metres from the centre, in the billboard plane
  varying float vViewZ;

  void main() {
    // viewMatrix's rows are the camera's basis in world space.
    vec3 ax = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 ay = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);

    vec2 ext = (uv - 0.5) * 2.0 * uSize;
    vec3 world = uCentre + ax * ext.x + ay * ext.y;
    vLocal = ext;

    vec4 mv = viewMatrix * vec4(world, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,L=`
  uniform float uTime;
  uniform float uRadius;      // the horizon, metres
  uniform float uEdge;        // metres of feather on it
  uniform float uRing;        // photon-ring radius, × uRadius
  uniform float uRingWidth;   // metres
  uniform float uRingGlow;
  uniform float uDoppler;     // 0..1 brightness asymmetry across the disc
  uniform float uHalo;        // metres the outer bloom reaches
  uniform float uHaloGlow;
  uniform float uRim;         // brightness of the sheen inside the ring
  uniform float uShimmer;     // 0..1 wobble on the ring's radius
  uniform float uShimmerRate; // cycles/second
  uniform float uOpacity;
  uniform float uFade;
  uniform float uSoftFade;
  uniform vec3  uColorVoid;
  uniform vec3  uColorRim;
  uniform vec3  uColorRing;
  uniform vec3  uColorHalo;

  uniform float uGlobalGlow;
  uniform vec2  uResolution;
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;

  varying vec2  vLocal;
  varying float vViewZ;

  ${s}
  ${f}

  void main() {
    float d = length(vLocal);
    float rr = max(uRadius, 1e-3);

    // Sampled in the plane, never on atan(y, x): an angular lookup gives every
    // radius along a bearing the same value and the ring breaks into spokes.
    float wobble = snoise(vec3(vLocal * 2.7, uTime * uShimmerRate));
    float ringR = rr * uRing * (1.0 + uShimmer * wobble);

    float inside = 1.0 - smoothstep(rr - uEdge, rr + uEdge, d);
    float ring = exp(-abs(d - ringR) / max(uRingWidth, 1e-3));
    float halo = exp(-max(d - ringR, 0.0) / max(uHalo, 1e-3)) * (1.0 - inside);

    float side = d > 1e-4 ? vLocal.x / d : 0.0;
    ring *= clamp(1.0 + uDoppler * side, 0.0, 2.0);

    vec3 colour = uColorVoid * inside;
    colour += uColorRim * inside * smoothstep(rr * 0.3, rr, d) * uRim;
    colour += uColorRing * ring * uRingGlow;
    colour += uColorHalo * halo * uHaloGlow;

    float alpha = clamp(max(inside, max(ring, halo * 0.8)), 0.0, 1.0) * uOpacity * uFade;
    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.003) discard;

    // The interior is deliberately left out of the glow multiplier: multiplying
    // a near-black by the bloom gain is how a black hole ends up grey.
    colour = uColorVoid * inside + (colour - uColorVoid * inside) * uGlobalGlow;
    gl_FragColor = vec4(colour, alpha);
  }
`;function R(){let e=new t({transparent:!0,depthWrite:!1,depthTest:!0,blending:1,side:2,toneMapped:!1,uniforms:i({uCentre:{value:new l},uSize:{value:1},uRadius:{value:.62},uEdge:{value:.05},uRing:{value:1.16},uRingWidth:{value:.05},uRingGlow:{value:3.4},uDoppler:{value:.55},uHalo:{value:.42},uHaloGlow:{value:1.4},uRim:{value:.5},uShimmer:{value:.12},uShimmerRate:{value:.7},uOpacity:{value:1},uFade:{value:1},uSoftFade:{value:.3},uColorVoid:{value:new h(`#0a0612`)},uColorRim:{value:new h(`#6a3fd0`)},uColorRing:{value:new h(`#ffffff`)},uColorHalo:{value:new h(`#8a5cf0`)}}),vertexShader:I,fragmentShader:L});return e.userData.sync=t=>{let n=u.singularity,r=u.global,i=e.uniforms;i.uCentre.value.copy(t.centre);let o=n.horizonRadius*(n.horizonSeed+(1-n.horizonSeed)*t.open)*(1+n.horizonBurst*t.blow);i.uRadius.value=o,i.uEdge.value=n.horizonEdge,i.uRing.value=n.horizonRing,i.uRingWidth.value=n.horizonRingWidth,i.uRingGlow.value=n.horizonRingGlow*r.glow,i.uDoppler.value=n.horizonDoppler,i.uHalo.value=n.horizonHalo,i.uHaloGlow.value=n.horizonHaloGlow*r.glow,i.uRim.value=n.horizonRim,i.uShimmer.value=n.horizonShimmer*r.noiseStrength,i.uShimmerRate.value=n.horizonShimmerRate*r.noiseSpeed,i.uOpacity.value=n.horizonOpacity*r.opacity,i.uFade.value=t.fade,i.uSoftFade.value=n.horizonSoftFade,i.uSize.value=o*n.horizonRing+n.horizonHalo*4+n.horizonRingWidth*3,i.uColorVoid.value.copy(a(n.colorVoid)),i.uColorRim.value.copy(a(n.colorRim)),i.uColorRing.value.copy(a(n.colorRing)),i.uColorHalo.value.copy(a(n.colorHorizonHalo))},e}var z=160,B=22,V=288,H=Math.PI*2,U={},W=new l,G=new l,K=new l,q={},J=O(),Y=C(),X=class extends S{constructor(e){super(`singularity`,e)}createShaders(){this.streamGeometry=e(B,z),this.streamMaterial=F(),this.streamMesh=new _(this.streamGeometry,this.streamMaterial),this.streamMesh.frustumCulled=!1,this.streamMesh.matrixAutoUpdate=!1,this.streamMesh.layers.set(o.VFX),this.streamMesh.renderOrder=11,this.group.add(this.streamMesh),this.horizonGeometry=new n(1,1,1,1),this.horizonMaterial=R(),this.horizonMesh=new _(this.horizonGeometry,this.horizonMaterial),this.horizonMesh.frustumCulled=!1,this.horizonMesh.matrixAutoUpdate=!1,this.horizonMesh.layers.set(o.VFX),this.horizonMesh.renderOrder=13,this.group.add(this.horizonMesh),this.lens=new A({mode:j.LENS,facing:M.BILLBOARD,name:`Singularity:lens`}),this.group.add(this.lens.object3D),this.funnel=new k(this.group,{mode:D.FUNNEL,additive:!1,name:`Singularity:funnel`}),this.funnel.setVisible(!1),this.motes=new T(this.group,{capacity:V,silhouette:w.MOTE,additive:!0,renderOrder:12}),this._seed=0,this._inverted=!1,this._streamCount=1,this._b={open:0,pull:0,flip:0,blow:0,fade:1},this._state={centre:new l,age:0,seed:0,open:0,pull:0,blow:0,fade:1}}createParticles(){let e=this.ctx.particles;this.dust=e.get(`singularity.dust`,{capacity:2400,shape:v.SOFT,additive:!0,swirl:!0,softFade:.4}),this.dust.uniforms.uDrag.value=1.2,this.dust.uniforms.uEndSize.value=.35,this.dust.uniforms.uSizeIn.value=.1,this.dust.uniforms.uFadeIn.value=.12,this.dust.uniforms.uFadeOut.value=.45,this.shards=e.get(`singularity.shards`,{capacity:1200,shape:v.CHIP,additive:!1,lit:!0,softFade:.25}),this.shards.uniforms.uDrag.value=.4,this.shards.uniforms.uEndSize.value=.7,this.shards.uniforms.uFadeOut.value=.6,this.sparks=e.get(`singularity.sparks`,{capacity:1600,shape:v.STREAK,additive:!0,stretch:!0,softFade:.25}),this.sparks.uniforms.uDrag.value=1.1,this.sparks.uniforms.uEndSize.value=.2,this.sparks.uniforms.uSizeIn.value=.02,this.sparks.uniforms.uFadeIn.value=.03,this.sparks.uniforms.uFadeOut.value=.4,this.dustEmitter=new y,this.shardEmitter=new y}get instanceCount(){return this._streamCount+this.motes.count}get impactDuration(){let e=u.singularity;return Math.max(.05,(e.formTime+e.pullTime)*u.global.lifetime)}get fadeDuration(){let e=u.singularity;return Math.max(.05,e.invertTime+e.throwTime)}lightShimmer(){let e=u.singularity;return 1-e.lightBreathe*(.5-.5*Math.cos(this.age*e.lightBreatheRate))}_wellPoint(e){let t=u.singularity,n=this.phase===x.TRAVEL?this.u:1;return this.pointAt(n,e),e.y=c(t.launchHeight,t.wellHeight,m.outQuad(n)),e}_floorPoint(e){let t=this.phase===x.TRAVEL?this.u:1;return this.pointAt(t,e)}_resolveBeats(e){let t=u.singularity,n=this._b;if(this.phase===x.TRAVEL){n.open=t.seedOpen*m.outQuad(this.u),n.pull=0,n.flip=0,n.blow=0,n.fade=1;return}if(e<=1){let r=p(t.formTime/Math.max(t.formTime+t.pullTime,.001)),i=p(e/Math.max(r,.001));n.open=c(t.seedOpen,1,m.outCubic(i)),n.pull=p((e-r)/Math.max(1-r,.001)),n.flip=0,n.blow=0,n.fade=1;return}let r=p(t.invertTime/Math.max(t.invertTime+t.throwTime,.001)),i=p(e-1);n.flip=1-p(i/Math.max(r,.001)),n.blow=m.outCubic(i),n.open=1,n.pull=1,n.fade=1-m.inCubic(p((i-r)/Math.max(1-r,.001)))}onSpawn(){this.dustEmitter.reset(),this.shardEmitter.reset(),this._inverted=!1,this._seed=Math.random()*100,this.motes.roll(this._seed),this.lens.visible=!0,this.funnel.setVisible(!0),this.funnel.clearMarks(),this._resolveBeats(0),this._sync(),this._castFx()}_sync(){let e=u.singularity,t=this._b,n=this._state;this._wellPoint(n.centre),n.age=this.age,n.seed=this._seed,n.open=t.open,n.pull=t.pull,n.blow=t.blow,n.fade=t.fade,this._streamCount=Math.max(1,Math.min(z,Math.round(e.streams))),this.streamGeometry.instanceCount=this._streamCount,this.streamMaterial.userData.sync(n),this.horizonMaterial.userData.sync(n),this._syncLens(),this._syncFunnel(),this._syncMotes(),this._syncParticles(),this.position.copy(n.centre)}_syncLens(){let e=u.singularity,t=this._b,n=e.lensRadius*e.zoneRadius*c(e.lensSeed,1,t.open);q.width=n*2,q.height=n*2,q.radius=n,q.window=e.lensWindow,q.core=e.lensCore,q.maxOffset=e.lensMax;let r=p(t.open)**+Math.max(.05,e.lensCurve);q.strength=e.lensStrength*r*(1+e.lensPull*t.pull)*(1+e.lensBurst*t.flip)*t.fade,q.swirl=e.lensSwirl*(1+e.lensSwirlPull*t.pull),q.invert=e.lensFlips&&t.flip>.001||e.lensInverted?1:0,q.fold=e.lensFold,q.depthReject=e.lensDepthReject,q.depthFade=e.lensDepthFade,q.perspective=e.lensPerspective,q.perspectiveRef=e.lensPerspectiveRef,q.opacity=e.lensOpacity*t.fade,q.seed=this._seed,this.lens.setAnchor(this._state.centre),this.lens.update(q)}_syncFunnel(){let e=u.singularity,t=this._b;J.centre=this._floorPoint(K),J.yaw=0,J.height=e.funnelHeight,J.radius=e.funnelRadius*e.zoneRadius*c(e.funnelSeed,1,t.open),J.grow=m.outCubic(p(t.open)),J.recede=m.inQuad(p(1-t.fade)),J.fade=t.fade,J.seed=this._seed,J.edge=e.funnelEdge,J.ragged=e.funnelRagged,J.raggedScale=e.funnelRaggedScale,J.warp=e.funnelWarp,J.relief=e.funnelRelief,J.parallax=e.funnelParallax,J.cell=e.funnelCell,J.cellJitter=e.funnelCellJitter,J.seam=e.funnelSeam,J.thickness=e.funnelThickness,J.lift=e.funnelLift,J.depth=e.funnelDepth*c(1,e.funnelDeepen,t.pull),J.sharp=e.funnelSharp,J.detail=e.funnelDetail,J.additive=!1,J.emissive=e.funnelEmissive,J.opacity=e.funnelOpacity,J.depthFade=e.funnelDepthFade,J.colorBase=e.colorFunnelBase,J.colorEdge=e.colorFunnelEdge,J.colorGlow=e.colorFunnelGlow,J.colorDeep=e.colorFunnelDeep;let n=u.global;J.noiseStrength=n.noiseStrength,J.noiseFrequency=n.noiseFrequency,J.noiseSpeed=n.noiseSpeed,J.opacityScale=n.opacity,this.funnel.update(J)}_syncMotes(){let e=u.singularity,t=u.global,n=this._b,r=Y;r.count=Math.round(e.moteCount*t.particleCount),r.leadMode=E.POINT,r.endHeight=e.wellHeight,r.latticeX=e.moteLatticeX,r.latticeY=e.moteLatticeY,r.latticeZ=e.moteLatticeZ;let i=c(1,e.moteCollapse,m.inOutCubic(n.pull)),a=1+e.moteEject*n.blow;r.spacingSide=e.moteSpacing*i*a,r.spacingUp=e.moteSpacingUp*i*a,r.jitter=e.moteJitter*i*t.randomness,r.lag=e.moteLag,r.churn=e.moteChurn,r.breathe=e.moteBreathe,r.breatheRate=e.moteBreatheRate,r.wander=e.moteWander*t.turbulence,r.wanderScale=e.moteWanderScale*t.noiseFrequency,r.wanderSpeed=e.moteWanderSpeed*t.noiseSpeed,r.gather=e.moteGather,r.size=e.moteSize*t.particleSize,r.aspect=e.moteAspect,r.sizeJitter=e.moteSizeJitter*t.randomness,r.billboard=1,r.bank=0,r.bankMax=0,r.dihedral=0,r.flapRate=0,r.curl=0,r.edgeStretch=e.moteEdgeStretch,r.reveal=p(n.open),r.revealSpread=e.moteRevealSpread,r.silhouette=w.MOTE,r.edgeGain=1,r.lit=0,r.tint=e.moteTint,r.tintJitter=e.moteTintJitter,r.tintAlong=e.moteTintAlong,r.opacity=e.moteOpacity*t.opacity*n.fade,r.glow=e.moteGlow*t.glow,r.softFade=e.moteSoftFade,this.motes.setColors(e.colorMoteA,e.colorMoteB,e.colorMoteC,e.colorMoteD),this.motes.setBasis(this.origin,this.direction,this.side,this.length),this.motes.update(this.age,r)}_syncParticles(){let e=u.singularity,t=u.global;this.dust.setGradient(a(e.colorDustA),a(e.colorDustB),a(e.colorDustC),a(e.colorDustD)),this.dust.uniforms.uGravity.value.set(0,e.dustRise,0),this.dust.uniforms.uSizeScale.value=e.dustSize*t.particleSize*7,this.dust.uniforms.uLifeScale.value=e.dustLifetime*.5*t.particleLifetime,this.dust.uniforms.uSpeedScale.value=t.particleSpeed,this.dust.uniforms.uOpacity.value=e.dustOpacity*t.opacity,this.dust.uniforms.uGlow.value=e.dustGlow*t.glow,this.dust.uniforms.uTurbulence.value=e.dustTurbulence*t.turbulence,this.dust.uniforms.uSwirl.value=e.dustSwirl*(1+e.dustSwirlPull*this._b.pull),this.dust.uniforms.uSwirlExpand.value=e.dustContract,this.shards.setGradient(a(e.colorShardA),a(e.colorShardB),a(e.colorShardC),a(e.colorShardD)),this.shards.uniforms.uGravity.value.set(0,e.shardGravity,0),this.shards.uniforms.uSizeScale.value=e.shardSize*t.particleSize*7,this.shards.uniforms.uLifeScale.value=e.shardLifetime*.5*t.particleLifetime,this.shards.uniforms.uSpeedScale.value=t.particleSpeed,this.shards.uniforms.uOpacity.value=t.opacity,this.sparks.setGradient(a(e.colorSparkA),a(e.colorSparkB),a(e.colorSparkC),a(e.colorSparkD)),this.sparks.uniforms.uGravity.value.set(0,e.sparkGravity,0),this.sparks.uniforms.uSizeScale.value=e.sparkSize*t.particleSize*7,this.sparks.uniforms.uLifeScale.value=e.sparkLifetime*.5*t.particleLifetime,this.sparks.uniforms.uSpeedScale.value=t.particleSpeed,this.sparks.uniforms.uOpacity.value=t.opacity,this.sparks.uniforms.uGlow.value=e.sparkGlow*t.glow,this.sparks.uniforms.uStretch.value=e.sparkStretch}_castFx(){let e=u.singularity,t=u.global;this._wellPoint(W),this.ctx.bursts.spawn(g.AIR,W,{radius:e.castBurstSize*.9,endRadius:e.castBurstSize*.15,life:.35,intensity:e.castBurstIntensity,opacity:.85,fresnel:2.2,displace:.35,colorA:a(e.colorCastA),colorB:a(e.colorCastB),colorC:a(e.colorCastC)}),this.ctx.flash.trigger(a(e.colorCastFlash),e.castFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.4*t.explosionIntensity}_wellFx(e,t){let n=u.singularity,i=u.global,a=r.uTime.value,o=this._b,s=n.discOuter*n.zoneRadius*c(n.discSeed,1,o.open),l=Math.round(this.dustEmitter.tick(e,n.dustRate*t)*i.particleCount);if(l>0){let e=Math.random()*H,t=s*d(n.dustRing,1.15);W.copy(this._state.centre),W.x+=Math.cos(e)*t,W.z+=Math.sin(e)*t,W.y+=d(-1,1)*n.dustSpread,U.position=W,U.radius=n.dustSpread,U.anchor=this._state.centre,U.direction=G.set(0,1,0),U.speed=0,U.speedVariance=0,U.spread=1,U.inherit=null,U.size=.1,U.sizeVariance=.7,U.life=n.dustLifetime,U.lifeVariance=.35,U.spin=0,U.tint=null,U.time=a,this.dust.emit(l,U)}let f=Math.round(this.shardEmitter.tick(e,n.shardRate*t)*i.particleCount);if(f>0){let e=Math.random()*H,t=s*d(.5,1.3);this._floorPoint(W),W.x+=Math.cos(e)*t,W.z+=Math.sin(e)*t,W.y+=.08,G.copy(this._state.centre).sub(W).normalize(),U.position=W,U.radius=n.shardSpread,U.anchor=null,U.direction=G,U.speed=n.shardSpeed,U.speedVariance=.5,U.spread=.35,U.inherit=null,U.size=.12,U.sizeVariance=.65,U.life=n.shardLifetime,U.lifeVariance=.4,U.spin=9,U.tint=null,U.time=a,this.shards.emit(f,U)}}onTravel(e){this._resolveBeats(0),this._sync(),this._wellFx(e,u.singularity.travelEmission),this.ctx.shake.rumble(u.singularity.rumble*u.global.cameraShake,e)}onImpact(){let e=u.singularity,t=u.global;this._resolveBeats(0),this._wellPoint(W),this.ctx.bursts.spawn(g.AIR,W,{radius:e.formBurstSize*t.explosionIntensity,endRadius:e.formBurstSize*.12,life:.55,intensity:e.formBurstIntensity,opacity:.9,fresnel:2.4,displace:.4,squash:.85,colorA:a(e.colorFormA),colorB:a(e.colorFormB),colorC:a(e.colorFormC)}),this._floorPoint(W),this.ctx.decals.spawn(b.SHOCKWAVE,W,{radius:e.formRingRadius*t.explosionIntensity,life:.55,width:.07,intensity:e.formRingIntensity,colorA:a(e.colorRingA),colorB:a(e.colorRingB)}),this.ctx.shake.add(e.formShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),22),this.ctx.flash.trigger(a(e.colorFormFlash),e.formFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.7*t.explosionIntensity}onFade(e,t){t>1&&!this._inverted&&(this._inverted=!0,this._invertFx()),this._resolveBeats(t),this._sync();let n=this._b;this._wellFx(e,t<=1?c(1,u.singularity.holdEmission,n.pull):0),t<=1&&this.ctx.shake.rumble(u.singularity.rumble*(1+n.pull*u.singularity.rumblePull)*u.global.cameraShake,e)}_invertFx(){let e=u.singularity,t=u.global,n=r.uTime.value;this._wellPoint(W),this.ctx.bursts.spawn(g.STORM,W,{radius:e.collapseSize*.15,endRadius:e.collapseSize*t.explosionIntensity,life:.8,intensity:e.collapseIntensity,opacity:.95,fresnel:1.5,displace:.7,colorA:a(e.colorCollapseA),colorB:a(e.colorCollapseB),colorC:a(e.colorCollapseC)}),U.position=W,U.radius=e.horizonRadius*1.5,U.anchor=null,U.direction=G.set(0,.25,0),U.speed=e.sparkSpeed,U.speedVariance=.8,U.spread=1,U.inherit=null,U.size=.2,U.sizeVariance=.75,U.life=e.sparkLifetime,U.lifeVariance=.5,U.spin=0,U.tint=null,U.time=n,this.sparks.emit(Math.round(e.collapseSparks*t.particleCount),U),this._floorPoint(W),U.position=W,U.radius=e.discOuter*e.zoneRadius*.7,U.direction=G.set(0,1,0),U.speed=e.shardSpeed*e.collapseThrow,U.speedVariance=.7,U.spread=.9,U.size=.15,U.life=e.shardLifetime*1.4,U.spin=12,this.shards.emit(Math.round(e.collapseShards*t.particleCount),U),this.ctx.decals.spawn(b.SHOCKWAVE,W,{radius:e.collapseRingRadius*t.explosionIntensity,life:.7,width:.05,intensity:e.collapseRingIntensity,colorA:a(e.colorRingA),colorB:a(e.colorRingB)}),this.ctx.decals.spawn(b.CRACK,W,{radius:e.crackRadius,life:e.crackLife,width:e.crackBranches,intensity:e.crackIntensity,colorA:a(e.colorCrackA),colorB:a(e.colorCrackB)}),this.ctx.shake.add(e.collapseShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),30),this.ctx.flash.trigger(a(e.colorCollapseFlash),e.collapseFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*2*t.explosionIntensity}onDestroy(){this.lens.visible=!1,this.funnel.setVisible(!1),this.funnel.clearMarks(),this.motes.reset(),this._inverted=!1,this._streamCount=1,this.streamGeometry.instanceCount=1,this.streamMaterial.uniforms.uFade.value=0,this.streamMaterial.uniforms.uOpen.value=0,this.horizonMaterial.uniforms.uFade.value=0}dispose(){this.streamGeometry.dispose(),this.streamMaterial.dispose(),this.horizonGeometry.dispose(),this.horizonMaterial.dispose(),this.lens.dispose(),this.funnel.dispose(),this.motes.dispose(),super.dispose()}};export{X as SingularityAbility};
//# sourceMappingURL=SingularityAbility-Dp4v2QDh.js.map