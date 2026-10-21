import{$t as e,Br as t,D as n,E as r,G as i,Gr as a,K as o,O as s,Qt as c,R as l,V as u,Zt as d,_t as f,at as p,di as m,o as h,st as g,tt as _,xt as v,y,yn as b}from"./settings-DdywqLlV.js";import{t as x}from"./ParticleSystem-BZTczMT8.js";import{n as S}from"./ParticleEngine-DLxipNH0.js";import{n as C}from"./GroundDecals-kYmr8HKl.js";import{n as w,t as T}from"./Ability-CYesB5Ur.js";import{n as E,t as D}from"./FilamentPaths-DR_e1O0e.js";import{n as O,r as k,t as A}from"./GroundField-aLIZg3d3.js";var j=`
  #define TAU 6.283185307179586
  /** The golden angle in radians — 2*PI*(1 - 1/phi). */
  #define GOLDEN 2.399963229728653

  uniform float uAge;          // seconds since the cast began — the orbital clock
  uniform vec3  uCentre;       // the pool's centre, world metres
  uniform float uSeed;         // per-cast dice roll

  /* ---- the orbits ---- */
  uniform float uCount;        // live beads; the slot spacing is derived from it
  uniform float uRadius;       // mean semi-major axis, metres
  uniform float uRadiusJitter; // +/- fraction of it, per bead
  uniform float uEccentric;    // 0 circle .. 0.9 a long ellipse
  uniform float uTilt;         // radians the mean plane is tipped off horizontal
  uniform float uTiltSpread;   // radians of per-bead variation on that
  uniform float uNodeJitter;   // 0..1 slop on the golden-angle node spacing
  uniform float uSpin;         // turns per second
  uniform float uSpinJitter;   // +/- fraction of it, per bead

  /* ---- the climb ---- */
  uniform float uClimbBase;    // metres above the pool the lowest orbit sits
  uniform float uClimbTop;     // metres the highest orbit reaches
  uniform float uClimb;        // 0..1 the beat
  uniform float uWobble;       // metres of vertical breathing
  uniform float uWobbleRate;   // radians/second of it

  /* ---- the seal ---- */
  uniform float uSeal;         // 0..1 flattens the orbits into the ring plane
  uniform float uRimRadius;    // metres the sealed ring stands at
  uniform float uRimHeight;    // metres above the floor it stands at
  uniform float uMerge;        // 0..1 how far the beads run together
  uniform float uMergeStretch; // how many times longer a fully merged bead is

  /* ---- the body ---- */
  uniform float uBeadSize;     // metres, radius of one bead
  uniform float uSizeJitter;   // +/- fraction of it, per bead
  uniform float uReveal;       // 0..1 the beads appear as this passes their dice
  uniform float uRevealSpread; // width of that wave

  attribute float aSeed;
  attribute float aIndex;

  varying vec3  vNormalW;
  varying vec3  vViewW;
  varying float vClimb;    // 0..1 how far up the column this bead is
  varying float vAlive;    // 0..1 revealed
  varying float vDice;     // the bead's own dice roll, for the tint walk

  /** One cheap hash. Three decorrelated draws per bead is all this needs. */
  float beadHash(float n) {
    return fract(sin(n * 127.1) * 43758.5453123);
  }

  void main() {
    float s0 = aSeed;
    float s1 = beadHash(aIndex * 3.17 + uSeed);
    float s2 = beadHash(aIndex * 7.31 + uSeed + 11.0);
    float s3 = beadHash(aIndex * 11.71 + uSeed + 23.0);

    /* ---- has this bead climbed out of the pool yet ---- */
    float spread = max(uRevealSpread, 1e-3);
    float appear = clamp((uReveal - s0 * (1.0 - spread)) / spread, 0.0, 1.0);

    /* ---- the plane ---- */
    // Golden angle, jittered. Evenly spaced nodes put two orbital planes on top
    // of one another every few beads and the eye finds the pattern instantly.
    float node = aIndex * GOLDEN + s1 * TAU * uNodeJitter + uSeed;
    float tilt = (uTilt + (s2 - 0.5) * 2.0 * uTiltSpread) * (1.0 - uSeal);

    vec3 nAxis = vec3(cos(node), 0.0, sin(node));
    vec3 mAxis = vec3(sin(node), 0.0, -cos(node));   // cross(up, nAxis)
    vec3 tAxis = mAxis * cos(tilt) + vec3(0.0, 1.0, 0.0) * sin(tilt);

    /* ---- the ellipse ---- */
    float a = mix(uRadius * (1.0 + (s3 - 0.5) * 2.0 * uRadiusJitter), uRimRadius, uSeal);
    float ecc = clamp(uEccentric, 0.0, 0.95) * (1.0 - uSeal);
    float b = a * sqrt(max(1.0 - ecc * ecc, 0.02));

    /* ---- where on it ---- */
    // The differential rate is faded out by the seal, and because the clock is
    // the cast's own age the resulting slew is bounded — see the header.
    float rate = uSpin + uSpin * (s2 - 0.5) * 2.0 * uSpinJitter * (1.0 - uSeal);
    float slot = aIndex / max(uCount, 1.0) * TAU;
    float theta = uAge * rate * TAU + mix(s0 * TAU, slot, uSeal);

    /* ---- how high ---- */
    float lane = s1;
    float y = mix(uClimbBase, uClimbBase + uClimbTop * lane, clamp(uClimb, 0.0, 1.0));
    y += uWobble * sin(uAge * uWobbleRate + s2 * TAU);
    y = mix(y, uRimHeight, uSeal);

    vec3 centre = uCentre + vec3(0.0, y, 0.0);
    float ct = cos(theta);
    float st = sin(theta);
    vec3 orbit = centre + nAxis * (a * ct) + tAxis * (b * st);

    /* ---- the body ---- */
    // Stretched along the orbital tangent as the rim closes. A single-axis
    // scale, so the correct normal is the analytic ellipsoid one: divide the
    // tangential component of the unit normal by the square of the scale.
    vec3 tangent = normalize(nAxis * (-a * st) + tAxis * (b * ct) + vec3(1e-5));
    float stretch = 1.0 + uMerge * uSeal * uMergeStretch;
    float size = uBeadSize * (1.0 + (s3 - 0.5) * 2.0 * uSizeJitter) * appear;

    float along = dot(position, tangent);
    vec3 local = position + tangent * (along * (stretch - 1.0));
    vec3 world = orbit + local * size;

    vec3 nrm = normalize(normal - tangent * (dot(normal, tangent) * (1.0 - 1.0 / (stretch * stretch))));

    vNormalW = nrm;
    vViewW = cameraPosition - world;
    vClimb = clamp((y - uClimbBase) / max(uClimbTop, 0.01), 0.0, 1.0);
    vAlive = appear;
    vDice = s0;

    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`,M=`
  uniform vec3  uLightDir;
  uniform float uAmbient;      // 0..1 floor on the wrapped diffuse
  uniform float uWrap;         // 0..1 how far the terminator wraps round the back
  uniform float uSpecular;
  uniform float uGloss;        // Blinn exponent
  uniform float uFresnel;
  uniform float uGlow;
  uniform float uOpacity;
  uniform float uFade;
  uniform float uTintAlong;    // how far up the column the gradient walks
  uniform float uTintJitter;   // per-bead walk on top of that
  uniform vec3  uColorBody;
  uniform vec3  uColorDeep;    // the shadow side — almost black
  uniform vec3  uColorRim;     // the fresnel edge
  uniform vec3  uColorSheen;   // the highlight
  uniform float uGlobalGlow;

  varying vec3  vNormalW;
  varying vec3  vViewW;
  varying float vClimb;
  varying float vAlive;
  varying float vDice;

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vViewW);
    vec3 L = normalize(uLightDir);

    // Wrapped diffuse. A hard lambert on a 4 mm sphere gives a hemisphere of
    // pure black, and forty of those read as holes punched in the mist.
    float ndl = dot(N, L);
    float lam = clamp((ndl + uWrap) / (1.0 + uWrap), 0.0, 1.0);
    float lit = uAmbient + (1.0 - uAmbient) * lam;

    // The tint walk: higher beads are thinner, and every bead is a little
    // different from its neighbour. Both are walks toward the deep colour, so
    // no colour here is derived from another — I5.
    float walk = clamp(vClimb * uTintAlong + (vDice - 0.5) * 2.0 * uTintJitter, 0.0, 1.0);
    vec3 body = mix(uColorBody, uColorDeep, walk) * lit;

    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), max(uGloss, 1.0)) * uSpecular;
    float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0) * uFresnel;

    vec3 color = body + uColorSheen * spec + uColorRim * fres;
    color *= uGlow * uGlobalGlow;

    float alpha = uOpacity * uFade * vAlive;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;function N(t,n=1){let r=new d(1,n),i=new e;i.setAttribute(`position`,new f(r.attributes.position.array.slice(),3)),i.setAttribute(`normal`,new f(r.attributes.normal.array.slice(),3)),r.index&&i.setIndex(new f(r.index.array.slice(),1)),r.dispose();let o=new Float32Array(t),s=new Float32Array(t);for(let e=0;e<t;e++)o[e]=Math.random(),s[e]=e;return i.setAttribute(`aSeed`,new c(o,1)),i.setAttribute(`aIndex`,new c(s,1)),i.instanceCount=t,i.boundingSphere=new a(new m,1e4),i}function P(){let e=new t({name:`BeadOrbit`,transparent:!0,depthWrite:!0,depthTest:!0,blending:1,toneMapped:!1,uniforms:o({uAge:{value:0},uCentre:{value:new m},uSeed:{value:0},uCount:{value:48},uRadius:{value:3},uRadiusJitter:{value:.2},uEccentric:{value:.45},uTilt:{value:.9},uTiltSpread:{value:.6},uNodeJitter:{value:.15},uSpin:{value:.24},uSpinJitter:{value:.3},uClimbBase:{value:.1},uClimbTop:{value:3.4},uClimb:{value:0},uWobble:{value:.1},uWobbleRate:{value:1.6},uSeal:{value:0},uRimRadius:{value:3.6},uRimHeight:{value:.5},uMerge:{value:1},uMergeStretch:{value:2.4},uBeadSize:{value:.12},uSizeJitter:{value:.35},uReveal:{value:1},uRevealSpread:{value:.35},uAmbient:{value:.14},uWrap:{value:.6},uSpecular:{value:1.6},uGloss:{value:42},uFresnel:{value:1.1},uGlow:{value:1},uOpacity:{value:1},uFade:{value:1},uTintAlong:{value:.5},uTintJitter:{value:.25},uColorBody:{value:new v(`#c81a28`)},uColorDeep:{value:new v(`#2a0207`)},uColorRim:{value:new v(`#7a0a14`)},uColorSheen:{value:new v(`#ff9aa0`)}}),vertexShader:j,fragmentShader:M});return e.userData.sync=t=>{let n=h.sanguinepact,r=h.global,i=e.uniforms;i.uAge.value=t.age,i.uCentre.value.copy(t.centre),i.uSeed.value=t.seed,i.uCount.value=t.count,i.uClimb.value=t.climb,i.uSeal.value=t.seal,i.uReveal.value=t.reveal,i.uFade.value=t.fade;let a=Math.max(.05,n.zoneRadius);i.uRadius.value=a*n.orbitScale,i.uRadiusJitter.value=n.orbitRadiusJitter*r.randomness,i.uEccentric.value=n.orbitEccentric,i.uTilt.value=n.orbitTilt,i.uTiltSpread.value=n.orbitTiltSpread*r.randomness,i.uNodeJitter.value=n.orbitNodeJitter*r.randomness,i.uSpin.value=n.orbitSpin,i.uSpinJitter.value=n.orbitSpinJitter*r.randomness,i.uClimbBase.value=n.beadClimbBase,i.uClimbTop.value=n.beadClimbTop,i.uWobble.value=n.beadWobble,i.uWobbleRate.value=n.beadWobbleRate,i.uRimRadius.value=a*n.rimScale,i.uRimHeight.value=n.rimHeight,i.uMerge.value=n.rimMerge,i.uMergeStretch.value=n.rimMergeStretch,i.uBeadSize.value=n.beadSize,i.uSizeJitter.value=n.beadSizeJitter*r.randomness,i.uRevealSpread.value=n.beadRevealSpread,i.uAmbient.value=n.beadAmbient,i.uWrap.value=n.beadWrap,i.uSpecular.value=n.beadSpecular,i.uGloss.value=n.beadGloss,i.uFresnel.value=n.beadFresnel*r.fresnel,i.uGlow.value=n.beadGlow*r.glow,i.uOpacity.value=n.beadOpacity*r.opacity,i.uTintAlong.value=n.beadTintAlong,i.uTintJitter.value=n.beadTintJitter,i.uColorBody.value.copy(l(n.colorBeadBody)),i.uColorDeep.value.copy(l(n.colorBeadDeep)),i.uColorRim.value.copy(l(n.colorBeadRim)),i.uColorSheen.value.copy(l(n.colorBeadSheen))},e}var F=64,I=44,L=0,R=1,z=2,B=Math.PI*2,V={},H=new m,U=new m,W=new m,G=new m,K=new m,q=new m,J=k(),Y=E(),X={centre:new m,age:0,seed:0,count:0,climb:0,seal:0,reveal:0,fade:1};J.centre=W;var Z=class extends T{constructor(e){super(`sanguinepact`,e)}createShaders(){this.pool=new A(this.group,{mode:O.POOL,additive:!1,depthTest:!0,renderOrder:5,name:`SanguinePact:pool`}),this.column=new s({hull:r.CYLINDER,medium:n.MIST,prefix:`mist`,maxSteps:40,renderOrder:12,seed:Math.random()*97}),this.group.add(this.column.mesh),this.beadGeometry=N(96,1),this.beadMaterial=P(),this.beads=new b(this.beadGeometry,this.beadMaterial),this.beads.name=`SanguinePact:beads`,this.beads.frustumCulled=!1,this.beads.matrixAutoUpdate=!1,this.beads.layers.set(u.VFX),this.beads.renderOrder=10,this.group.add(this.beads),this.paths=new D(this.group,{samples:F,capacity:I,renderOrder:11}),this._seed=0,this._live=0,this._stained=!1}createParticles(){let e=this.ctx.particles;this.motes=e.get(`sanguinepact.motes`,{capacity:2e3,shape:x.SOFT,additive:!1,curl:!0,lit:!0,softFade:.4}),this.motes.uniforms.uDrag.value=1.1,this.motes.uniforms.uEndSize.value=.3,this.motes.uniforms.uSizeIn.value=.08,this.motes.uniforms.uFadeIn.value=.12,this.motes.uniforms.uFadeOut.value=.4,this.drips=e.get(`sanguinepact.drips`,{capacity:1200,shape:x.SOFT,additive:!1,lit:!0,softFade:.25}),this.drips.uniforms.uDrag.value=.5,this.drips.uniforms.uEndSize.value=.5,this.drips.uniforms.uSizeIn.value=.03,this.drips.uniforms.uFadeIn.value=.05,this.drips.uniforms.uFadeOut.value=.45,this.moteEmitter=new S,this.dripEmitter=new S}get instanceCount(){return this._live}get impactDuration(){return Math.max(.05,h.sanguinepact.holdTime*h.global.lifetime)}get fadeDuration(){return Math.max(.05,h.sanguinepact.sealTime)}lightShimmer(){return .85+.15*Math.sin(this.age*1.9)*Math.sin(this.age*.7)}_draw(){return this.phase===w.TRAVEL?this.u:1}_hold(){return this.phase===w.TRAVEL?0:this.phase===w.IMPACT?g(this.impactTime/this.impactDuration):1}_sealPhase(){return this.phase===w.FADE?g(this.fadeTime/this.fadeDuration):0}_seal(){let e=h.sanguinepact;return _.outCubic(g(this._sealPhase()/Math.max(.02,e.sealSnap)))}_climb(){let e=h.sanguinepact;return this.phase===w.TRAVEL?0:this.phase===w.IMPACT?_.outCubic(g(this._hold()/Math.max(.02,e.climbTime))):1}_rise(){let e=h.sanguinepact;return this.phase===w.TRAVEL?0:this.phase===w.IMPACT?_.outQuad(g(this._hold()/Math.max(.02,e.columnTime))):1}get radius(){return Math.max(.05,h.sanguinepact.zoneRadius)}_centrePoint(e){return this.pointAt(1,e).setY(0)}_handPoint(e){let t=h.sanguinepact;return e.copy(this.origin).addScaledVector(this.direction,t.handForward).addScaledVector(this.side,t.handSide),e.y=t.handHeight,e}onSpawn(){this.moteEmitter.reset(),this.dripEmitter.reset(),this._stained=!1,this._seed=Math.random()*100,this._sync(1)}_sync(e){let t=h.sanguinepact,n=h.global,r=this.radius,i=this._draw(),a=this._climb(),o=this._rise(),s=this._seal();this._centrePoint(W),J.yaw=Math.atan2(this.direction.x,this.direction.z),J.height=t.poolHeight,J.radius=r*t.poolScale,J.grow=i,J.recede=_.inQuad(g((this._sealPhase()-t.sealHold)/Math.max(.02,1-t.sealHold))),J.fade=e,J.seed=this._seed,J.edge=t.poolEdge,J.ragged=t.poolRagged,J.raggedScale=t.poolRaggedScale,J.warp=t.poolWarp,J.relief=t.poolRelief,J.normalStep=t.poolNormalStep,J.ambient=t.poolAmbient,J.wrap=t.poolWrap,J.specular=t.poolSpecular,J.gloss=t.poolGloss,J.parallax=t.poolParallax,J.cell=t.poolCell,J.lift=t.poolLift,J.depth=t.poolDepth,J.thickness=t.poolThickness,J.detail=t.poolDetail,J.speed=t.poolSpeed,J.flow=t.poolFlow,J.windAngle=t.poolWindAngle,J.additive=!1,J.emissive=t.poolEmissive,J.opacity=t.poolOpacity,J.depthFade=t.poolDepthFade,J.colorBase=t.colorPoolBase,J.colorEdge=t.colorPoolEdge,J.colorGlow=t.colorPoolGlow,J.colorDeep=t.colorPoolDeep,J.noiseStrength=n.noiseStrength,J.noiseFrequency=n.noiseFrequency,J.noiseSpeed=n.noiseSpeed,J.opacityScale=n.opacity,this.pool.setVisible(e>.002&&J.grow>.002),this.pool.update(J);let c=Math.max(.05,r*t.mistScale);this.column.place(W,this.direction).setSize(c,Math.max(.05,t.mistHeight*o),c).setFade(e*o).sync(t,n),X.centre.copy(W),X.age=this.age,X.seed=this._seed,X.count=Math.max(0,Math.min(96,Math.round(t.beadCount*n.particleCount))),X.climb=a,X.seal=s,X.reveal=Math.min(i,e),X.fade=e,this.beadMaterial.userData.sync(X),this.beadGeometry.instanceCount=X.count,this.beads.visible=X.count>0&&e>.002;let u=this.paths.role(L),d=this.paths.role(R),f=this.paths.role(z);u.count=Math.round(t.threadCount*(1-s)),K.copy(W).setY(t.beadClimbBase),q.copy(K).setY(K.y+t.threadPoleHeight),u.orbit(K,q,r*t.threadRadiusScale,t.threadArc,t.threadSpin,t.threadWobble,t.threadTilt,t.threadTiltSpread,t.threadRadiusJitter).style(t.threadKink,t.threadWidthScale,t.threadDim*a,1).ends(1,1,1,1).draw(2,.1,-1e4,0),d.count=Math.round(t.rimArcs*s),K.copy(W).setY(t.rimHeight),q.copy(K).setY(K.y+1),d.rim(K,q,r*t.rimScale,t.rimSpan,t.rimSpeed,t.rimArcLift,t.rimArcJitter,t.rimArcHug,this._seed).style(t.rimKink,t.rimWidthScale,t.rimDim,.3).ends(1,1,1,1).draw(2,.08,t.rimHeight*.25,.6);let p=+(this.phase===w.TRAVEL);f.count=Math.round(t.leashCount*p),this._handPoint(G),K.copy(W).setY(t.poolHeight),f.line(G,K,t.leashSag,t.leashSpreadNear,t.leashSpread,t.leashSpreadCurve,t.leashTwist,t.leashTwistSpeed,t.leashConverge).style(t.leashKink,t.leashWidthScale,t.leashDim,.6).ends(0,1,0,1).draw(i,.12,0,1.2),Y.width=t.threadWidth,Y.glowWidth=t.threadGlowWidth,Y.glowOpacity=t.threadGlowOpacity,Y.jitter=t.threadJitter,Y.jitterScale=t.threadJitterScale,Y.octaves=t.threadOctaves,Y.jitterFalloff=t.threadJitterFalloff,Y.crawl=t.threadCrawl,Y.pinch=t.threadPinch,Y.restrike=t.threadRestrike,Y.flicker=t.threadFlicker,Y.flickerSpeed=t.threadFlickerSpeed,Y.strandFlash=t.threadStrandFlash,Y.coreSharp=t.threadCoreSharp,Y.glowFalloff=t.threadGlowFalloff,Y.softFade=t.threadSoftFade,Y.opacity=t.threadOpacity,Y.glow=t.threadGlow,Y.colorCore=t.colorThreadCore,Y.colorInner=t.colorThreadInner,Y.colorOuter=t.colorThreadOuter,Y.colorHalo=t.colorThreadHalo,Y.randomness=n.randomness,Y.noiseStrength=n.noiseStrength,Y.noiseFrequency=n.noiseFrequency,Y.noiseSpeed=n.noiseSpeed,Y.opacityScale=n.opacity,Y.glowScale=n.glow,this.paths.sync(Y,e,this._seed),this._live=X.count+this.paths.liveCount,this.motes.setGradient(l(t.colorMoteA),l(t.colorMoteB),l(t.colorMoteC),l(t.colorMoteD)),this.motes.uniforms.uGravity.value.set(0,t.moteRise,0),this.motes.uniforms.uSizeScale.value=t.moteSize*n.particleSize*7,this.motes.uniforms.uLifeScale.value=t.moteLifetime*.5*n.particleLifetime,this.motes.uniforms.uSpeedScale.value=n.particleSpeed,this.motes.uniforms.uOpacity.value=n.opacity,this.motes.uniforms.uTurbulence.value=t.moteTurbulence*n.turbulence,this.drips.setGradient(l(t.colorDripA),l(t.colorDripB),l(t.colorDripC),l(t.colorDripD)),this.drips.uniforms.uGravity.value.set(0,t.dripGravity,0),this.drips.uniforms.uSizeScale.value=t.dripSize*n.particleSize*7,this.drips.uniforms.uLifeScale.value=t.dripLifetime*.5*n.particleLifetime,this.drips.uniforms.uSpeedScale.value=n.particleSpeed,this.drips.uniforms.uOpacity.value=n.opacity,this.position.copy(W).setY(t.mistHeight*o*.34+t.poolHeight)}_pactFx(e,t){let n=h.sanguinepact,r=h.global,a=i.uTime.value,o=this.radius,s=Math.round(this.moteEmitter.tick(e,n.moteRate*t)*r.particleCount);s>0&&(H.copy(W).setY(n.poolHeight+.05),V.position=H,V.radius=o*n.poolScale*.85,V.direction=U.set(0,1,0),V.speed=n.moteSpeed,V.speedVariance=.7,V.spread=.35,V.inherit=null,V.anchor=null,V.size=.07,V.sizeVariance=.7,V.life=n.moteLifetime,V.lifeVariance=.45,V.spin=0,V.tint=null,V.time=a,this.motes.emit(s,V));let c=Math.round(this.dripEmitter.tick(e,n.dripRate*t)*r.particleCount);if(c>0){let e=Math.random()*B,t=o*n.orbitScale;H.copy(W),H.x+=Math.cos(e)*t,H.z+=Math.sin(e)*t,H.y=n.beadClimbBase+n.beadClimbTop*Math.random()*this._climb(),V.position=H,V.radius=n.beadSize*3,V.direction=U.set(0,-1,0),V.speed=n.dripSpeed,V.speedVariance=.6,V.spread=.5,V.size=.09,V.sizeVariance=.6,V.life=n.dripLifetime,V.lifeVariance=.4,V.spin=0,V.time=a,this.drips.emit(c,V)}}onTravel(e){this._sync(1),this._pactFx(e,this._draw()*.5)}onImpact(){let e=h.sanguinepact,t=h.global;this._centrePoint(H),this.ctx.decals.spawn(C.RIPPLE,H,{radius:this.radius*e.poolScale*1.1,life:.9,width:.08,intensity:.55,colorA:l(e.colorPoolEdge),colorB:l(e.colorPoolBase)}),this.lightBoost=e.lightIntensity*.35*t.explosionIntensity}onFade(e,t){let n=h.sanguinepact,r=g(((t<=1?0:g(t-1))-n.sealHold)/Math.max(.02,1-n.sealHold)),i=1-_.inQuad(r);this._sync(i),!this._stained&&this._seal()>.85&&(this._stained=!0,this._sealFx()),this._pactFx(e,t<=1?p(.5,1,this._climb()):i*.3),this.ctx.shake.rumble(n.rumble*h.global.cameraShake,e)}_sealFx(){let e=h.sanguinepact,t=h.global,n=i.uTime.value;this._centrePoint(H),H.y=e.rimHeight,this.ctx.bursts.spawn(y.WATER,H,{radius:e.sealBurstSize*.25,endRadius:e.sealBurstSize*t.explosionIntensity,life:.55,intensity:e.sealBurstIntensity,opacity:.8,fresnel:1.5,displace:.4,squash:.3,colorA:l(e.colorSealA),colorB:l(e.colorSealB),colorC:l(e.colorSealC)}),this._centrePoint(H),this.ctx.decals.spawn(C.SHOCKWAVE,H,{radius:e.sealShockRadius*t.explosionIntensity,life:.5,width:.06,intensity:.9,colorA:l(e.colorSealShockA),colorB:l(e.colorSealShockB)}),this.ctx.decals.spawn(C.FOAM,H,{radius:e.stainRadius,life:e.stainLife,intensity:e.stainIntensity,colorA:l(e.colorStainA),colorB:l(e.colorStainB),height:.013}),H.y=e.rimHeight,V.position=H,V.radius=this.radius*e.rimScale,V.direction=U.set(0,1,0),V.speed=e.dripSpeed*3.2,V.speedVariance=.85,V.spread=1,V.inherit=null,V.anchor=null,V.size=.11,V.sizeVariance=.7,V.life=e.dripLifetime*1.4,V.lifeVariance=.5,V.spin=0,V.tint=null,V.time=n,this.drips.emit(Math.round(e.sealDrips*t.particleCount),V),V.speed=e.moteSpeed*3.5,V.size=.08,V.life=e.moteLifetime,this.motes.emit(Math.round(e.sealMotes*t.particleCount),V),this.ctx.shake.add(e.sealShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.sealShakeDuration),22),this.ctx.flash.trigger(l(e.colorFlash),e.sealFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*1.2*t.explosionIntensity}onDestroy(){this._live=0,this._stained=!1,this.pool.setVisible(!1),this.pool.clearMarks(),this.column.setFade(0),this.paths.clear(),this.beads.visible=!1,this.beadGeometry.instanceCount=0}dispose(){this.pool.dispose(),this.column.dispose(),this.paths.dispose(),this.beadGeometry.dispose(),this.beadMaterial.dispose(),super.dispose()}};export{Z as SanguinePactAbility};
//# sourceMappingURL=SanguinePactAbility-DeoCN1pL.js.map