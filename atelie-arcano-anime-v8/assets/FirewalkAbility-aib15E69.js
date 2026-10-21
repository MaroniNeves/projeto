import{$t as e,Br as t,D as n,E as r,G as i,Gr as a,K as o,O as s,Qt as c,R as l,V as u,Y as d,_t as f,di as p,nt as m,o as h,q as g,st as _,tt as v,xt as y,y as b,yn as x}from"./settings-DdywqLlV.js";import{t as S}from"./ParticleSystem-BZTczMT8.js";import{n as C}from"./ParticleEngine-DLxipNH0.js";import{n as w,t as T}from"./Ability-CYesB5Ur.js";import{n as E,r as D,t as O}from"./GroundField-aLIZg3d3.js";var k=`
  uniform vec3  uOrigin;      // world, on the floor, where the walk starts
  uniform vec3  uForward;     // unit, downrange
  uniform vec3  uSide;        // unit, lateral
  uniform float uStart;       // metres before the first print
  uniform float uStep;        // metres between successive footfalls
  uniform float uStride;      // metres from the centre line to a print
  uniform float uWander;      // metres of per-print lateral slop
  uniform float uNow;         // the ability's age, seconds

  attribute float aIndex;     // footfall number; its parity is the foot
  attribute float aSeed;      // dice roll
  attribute float aWander;    // dice roll, -1..1, in units of uWander
  attribute float aBirth;     // seconds; negative until the front crosses it

  /** -1 for a left print, +1 for a right one. */
  float printSide(float index) {
    return mod(index, 2.0) < 0.5 ? -1.0 : 1.0;
  }

  vec3 printCentre(float index, float wander) {
    float lateral = printSide(index) * uStride + wander * uWander;
    return uOrigin + uForward * (uStart + index * uStep) + uSide * lateral;
  }
`,A=`
  ${k}

  uniform float uFootLength;  // metres, heel to the end of the toes
  uniform float uFootWidth;   // metres, across the ball
  uniform float uPad;         // metres of quad outside the sole, for the scorch halo
  uniform float uToeOut;      // radians each print splays away from the line of travel
  uniform float uLift;        // metres above the floor

  varying vec2  vSole;        // metres in the print's own frame, right-footed
  varying vec3  vWorld;
  varying float vAge;         // seconds since this print was stepped on
  varying float vSeed;
  varying float vViewZ;

  void main() {
    // Not stepped on yet. Push the whole quad outside the frustum rather than
    // collapsing it: a zero-area quad still lights a seam of fragments.
    if (aBirth < 0.0) {
      vSole = vec2(0.0);
      vWorld = vec3(0.0);
      vAge = -1.0;
      vSeed = 0.0;
      vViewZ = -1.0;
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }

    float side = printSide(aIndex);
    vec2 local = vec2(position.x * (uFootWidth + 2.0 * uPad), position.z * (uFootLength + 2.0 * uPad));

    // Toe-out. Negated against the side so both feet splay *away* from the line
    // of travel; without the sign the left foot toes in and the walker limps.
    float a = -uToeOut * side;
    float ca = cos(a);
    float sa = sin(a);
    vec2 turned = vec2(local.x * ca - local.y * sa, local.x * sa + local.y * ca);

    vec3 world = printCentre(aIndex, aWander) + uSide * turned.x + uForward * turned.y;
    world.y = uLift;

    // Mirror into the right-footed frame the SDF is authored in.
    vSole = vec2(local.x * side, local.y);
    vWorld = world;
    vAge = uNow - aBirth;
    vSeed = aSeed;

    vec4 mv = modelViewMatrix * vec4(world, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,j=`
  uniform vec2      uResolution;
  uniform sampler2D uSceneDepth;
  uniform float     uCameraNear;
  uniform float     uCameraFar;
  uniform float     uGlobalGlow;

  uniform float uFootLength;
  uniform float uFootWidth;
  uniform float uHeelWidth;   // heel as a fraction of the ball
  uniform float uBallWidth;   // ball as a fraction of the nominal width
  uniform float uArchCut;     // 0..1 how far the medial arch is eaten in
  uniform float uSoleRound;   // metres of smooth union between heel, waist and ball
  uniform float uToeSize;     // metres, the big toe
  uniform float uToeSpread;   // how far the toe row fans across the width
  uniform float uToeGap;      // metres the toe row sits ahead of the ball

  uniform float uRim;         // metres of ember rim inside the outline
  uniform float uHalo;        // metres of scorch outside it
  uniform float uEdge;        // metres of feather on the outline
  uniform float uRollTime;    // seconds the ignition takes to run heel to toe
  uniform float uFlashTime;   // seconds a freshly lit point stays white
  uniform float uCoolTime;    // seconds it takes that point to go dark
  uniform float uCharTime;    // seconds the char takes to blacken
  uniform float uGrain;       // ember-vein features per metre
  uniform float uVein;        // 0..1 how much of the sole is vein rather than char
  uniform float uRagged;      // metres the halo wanders
  uniform float uOpacity;
  uniform float uGlow;
  uniform float uFade;        // master fade
  uniform float uSoftFade;    // metres of depth feather

  uniform vec3 uColorFlash;
  uniform vec3 uColorEmber;
  uniform vec3 uColorChar;
  uniform vec3 uColorAsh;
  uniform vec3 uColorHalo;

  varying vec2  vSole;
  varying vec3  vWorld;
  varying float vAge;
  varying float vSeed;
  varying float vViewZ;

  ${d}
  ${g}

  float sdEllipse(vec2 p, vec2 r) {
    vec2 rr = max(r, vec2(1e-4));
    return (length(p / rr) - 1.0) * min(rr.x, rr.y);
  }

  float smoothUnion(float a, float b, float k) {
    float kk = max(k, 1e-4);
    float h = clamp(0.5 + 0.5 * (b - a) / kk, 0.0, 1.0);
    return mix(b, a, h) - kk * h * (1.0 - h);
  }

  /** Heel, waist and ball. Metres in, metres out. +x is lateral, +y is the toe. */
  float soleSD(vec2 p) {
    float L = max(uFootLength, 0.02);
    float W = max(uFootWidth, 0.01);
    float heel = sdEllipse(p - vec2(0.0, -0.30 * L), vec2(0.5 * W * uHeelWidth, 0.21 * L));
    float ball = sdEllipse(p - vec2(0.0, 0.17 * L), vec2(0.5 * W * uBallWidth, 0.23 * L));
    // The waist is narrowed *and* shifted outward, so what is removed is the
    // medial arch and not a symmetric pinch. A symmetric pinch reads as a
    // dumbbell; this reads as a foot.
    float waist = sdEllipse(
      p - vec2(0.25 * W * uArchCut, -0.05 * L),
      vec2(0.5 * W * max(1.0 - uArchCut, 0.12), 0.22 * L)
    );
    return smoothUnion(smoothUnion(heel, waist, uSoleRound), ball, uSoleRound);
  }

  /** Five toes, biggest on the medial side, the row raked back to the outside. */
  float toesSD(vec2 p) {
    float L = max(uFootLength, 0.02);
    float W = max(uFootWidth, 0.01);
    float d = 1e3;
    for (int i = 0; i < 5; i++) {
      float t = float(i) * 0.25;
      float x = mix(-0.34, 0.34, t) * W * uToeSpread;
      float y = L * (0.41 - 0.10 * t * t) + uToeGap;
      float r = uToeSize * (1.0 - 0.38 * t);
      d = min(d, sdEllipse(p - vec2(x, y), vec2(r, r * 1.15)));
    }
    return d;
  }

  void main() {
    if (vAge < 0.0 || uFade < 0.004) discard;

    float L = max(uFootLength, 0.02);
    float sd = min(soleSD(vSole), toesSD(vSole));

    // Taken here, before the ignition discard below: a derivative evaluated in
    // divergent control flow is undefined, and the 2x2 quad along the ignition
    // line is exactly where half the fragments have gone. GroundField learnt the
    // same lesson on its stroke antialiasing.
    float px = fwidth(sd) + 1e-5;

    // The ignition runs heel to toe on the print's own clock — a footfall is a
    // roll, not a stamp, and this is the one detail that makes a still frame of
    // the trail look like somebody walked it rather than like somebody stencilled
    // it. The parameter below is 0 at the heel and 1 at the toe.
    float u = clamp(vSole.y / L + 0.5, 0.0, 1.0);
    float local = vAge - u * uRollTime;
    if (local < 0.0) discard;

    float flash = smoothstep(0.0, max(uFlashTime, 1e-3), local);
    float heat = flash * exp(-local / max(uCoolTime, 0.05));
    float soot = 1.0 - exp(-local / max(uCharTime, 0.05));

    // Ember veins: the char cracks, and the cracks are what stay hot. Sampled in
    // world metres so the grain belongs to the floor and two prints that overlap
    // share it, instead of each carrying its own copy of the same pattern.
    float grain = snoise(vec3(vWorld.xz * max(uGrain, 0.01), vSeed * 3.7)) * 0.5 + 0.5;
    float vein = smoothstep(0.52 - uVein * 0.4, 0.78, grain);

    float inside = 1.0 - smoothstep(-uEdge, max(uEdge, px), sd);
    float rimBand = exp(-pow(max(sd + uRim * 0.5, -uHalo) / max(uRim, 1e-3), 2.0));

    // The halo is the scorch that gets out past the sole. Ragged, warped in the
    // plane — never sampled on a bearing, which draws spokes.
    float wobble = snoise(vec3(vWorld.xz * 2.6, vSeed * 11.0)) * uRagged;
    float halo = exp(-max(sd + wobble, 0.0) / max(uHalo, 1e-3));

    float alpha = max(inside, halo * 0.55) * uOpacity * uFade;
    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.004) discard;

    // Cold first, then everything hot added on top: an ember has to be able to
    // sit on a black scar, and mixing toward the ember colour instead washes the
    // scar out to grey the moment the glow is turned up.
    vec3 colour = mix(uColorAsh, uColorChar, soot);
    colour = mix(colour, uColorHalo, clamp(halo * (1.0 - inside), 0.0, 1.0));

    float ember = heat * mix(0.25, 1.0, vein) * inside;
    float front = exp(-pow(local / max(uFlashTime * 1.6, 1e-3), 2.0)) * inside;
    colour += uColorEmber * ember * uGlow * uGlobalGlow;
    colour += uColorFlash * (front * 0.9 + rimBand * heat * 0.7) * uGlow * uGlobalGlow;

    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 1.0));
  }
`,M=`
  ${k}

  uniform float uHeight;      // metres, a pillar at full stretch
  uniform float uWidth;       // metres, its half-width at the base
  uniform float uRiseTime;    // seconds to full height
  uniform float uFallTime;    // seconds to gutter out
  uniform float uLean;        // metres the crown leans downrange
  uniform float uWaver;       // metres of sideways sway at the crown
  uniform float uWaverRate;   // sways per second
  uniform float uLift;        // metres above the floor the base sits

  varying vec2  vQuad;        // x: -1..1 across, y: 0..1 up
  varying vec3  vWorld;
  varying float vHeat;        // 0..1 how hard this pillar is burning
  varying float vSeed;
  varying float vViewZ;

  void main() {
    if (aBirth < 0.0) {
      vQuad = vec2(0.0);
      vWorld = vec3(0.0);
      vHeat = 0.0;
      vSeed = 0.0;
      vViewZ = -1.0;
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }

    float age = uNow - aBirth;
    // Rise then gutter. Both times are live, so a paused trail re-times when
    // either slider moves.
    float rise = smoothstep(0.0, max(uRiseTime, 1e-3), age);
    float fall = exp(-max(age - uRiseTime, 0.0) / max(uFallTime, 0.05));
    float heat = rise * fall;

    vec3 base = printCentre(aIndex, aWander);
    base.y = uLift;

    // Cylindrical billboard: the camera's right, flattened into the floor plane.
    vec3 camRight = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]) + vec3(1e-5, 0.0, 0.0));

    float h = position.y + 0.5;            // 0 at the foot, 1 at the crown
    float across = position.x * 2.0;       // -1..1

    float wave = sin(uNow * uWaverRate + aSeed * 6.2831) * uWaver * h * h;
    vec3 world = base
      + camRight * (across * uWidth * heat)
      + vec3(0.0, h * uHeight * heat, 0.0)
      + uForward * (uLean * h * h * heat)
      + uSide * wave;

    vQuad = vec2(across, h);
    vWorld = world;
    vHeat = heat;
    vSeed = aSeed;

    vec4 mv = modelViewMatrix * vec4(world, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,N=`
  uniform vec2      uResolution;
  uniform sampler2D uSceneDepth;
  uniform float     uCameraNear;
  uniform float     uCameraFar;
  uniform float     uGlobalGlow;
  uniform float     uTime;

  uniform float uTaper;       // >1 pulls the flame to a point
  uniform float uBulge;       // 0..1 how much it swells above the base
  uniform float uNoiseScale;  // features per metre
  uniform float uNoiseSpeed;  // metres/second the field climbs
  uniform float uErosion;     // how hard the noise eats the silhouette
  uniform float uOpacity;
  uniform float uGlow;
  uniform float uFade;
  uniform float uSoftFade;

  uniform vec3 uColorA;       // the base
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform vec3 uColorD;       // the smoke at the crown

  varying vec2  vQuad;
  varying vec3  vWorld;
  varying float vHeat;
  varying float vSeed;
  varying float vViewZ;

  ${d}
  ${g}

  void main() {
    if (vHeat < 0.01 || uFade < 0.004) discard;

    float h = clamp(vQuad.y, 0.0, 1.0);
    // Width profile: swells just off the floor, then tapers to nothing. A flame
    // that is widest at the ground looks like a puddle of light.
    float profile = pow(1.0 - h, max(uTaper, 0.05)) * (1.0 + uBulge * sin(h * 3.14159265));
    float body = 1.0 - abs(vQuad.x) / max(profile, 1e-3);
    if (body <= 0.0) discard;

    // The field climbs in world metres, so two pillars side by side do not
    // flicker in step — the thing that gives away a billboard fire instantly.
    float n = fbm3(vec3(vWorld.xz * uNoiseScale, vWorld.y * uNoiseScale - uTime * uNoiseSpeed) + vSeed * 13.0);
    float shape = body - uErosion * (0.5 + 0.5 * n) * h;

    float alpha = smoothstep(0.0, 0.35, shape) * vHeat * uOpacity * uFade;
    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.004) discard;

    float t = clamp(h * 0.85 + (1.0 - shape) * 0.3, 0.0, 1.0);
    vec3 colour = gradient4(uColorA, uColorB, uColorC, uColorD, t);
    colour *= uGlow * uGlobalGlow * mix(0.6, 1.0, vHeat);

    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 1.0));
  }
`;function P(){return{uOrigin:{value:new p},uForward:{value:new p(0,0,1)},uSide:{value:new p(1,0,0)},uStart:{value:.9},uStep:{value:1.15},uStride:{value:.32},uWander:{value:.05},uNow:{value:0},uLift:{value:.015}}}function F(e){let t=new Float32Array(e),n=new Float32Array(e),r=new Float32Array(e),i=new Float32Array(e);for(let a=0;a<e;a++)t[a]=a,n[a]=Math.random()*100,r[a]=Math.random()*2-1,i[a]=-1;return{aIndex:new c(t,1),aSeed:new c(n,1),aWander:new c(r,1),aBirth:new c(i,1)}}function I(t,n){let r=new e,i=n?new Float32Array([-.5,0,-.5,.5,0,-.5,.5,0,.5,-.5,0,.5]):new Float32Array([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0]);r.setAttribute(`position`,new f(i,3)),r.setIndex(new f(new Uint16Array([0,1,2,0,2,3]),1));for(let[e,n]of Object.entries(t))r.setAttribute(e,n);return r.instanceCount=0,r.boundingSphere=new a(new p,1e4),r}function L(e){return I(e,!0)}function R(e){return I(e,!1)}function z(e){return new t({name:`Firewalk:sole`,vertexShader:A,fragmentShader:j,transparent:!0,depthWrite:!1,depthTest:!0,blending:1,toneMapped:!1,uniforms:o({...e,uFootLength:{value:.3},uFootWidth:{value:.115},uPad:{value:.12},uToeOut:{value:.13},uHeelWidth:{value:.78},uBallWidth:{value:1},uArchCut:{value:.42},uSoleRound:{value:.02},uToeSize:{value:.03},uToeSpread:{value:.92},uToeGap:{value:.016},uRim:{value:.016},uHalo:{value:.1},uEdge:{value:.006},uRollTime:{value:.16},uFlashTime:{value:.09},uCoolTime:{value:1.6},uCharTime:{value:.5},uGrain:{value:5.5},uVein:{value:.6},uRagged:{value:.03},uOpacity:{value:1},uGlow:{value:2.2},uFade:{value:1},uSoftFade:{value:.3},uColorFlash:{value:new y(1,1,1)},uColorEmber:{value:new y(1,.45,.12)},uColorChar:{value:new y(.06,.05,.05)},uColorAsh:{value:new y(.3,.27,.26)},uColorHalo:{value:new y(.12,.09,.08)}})})}function B(e){return new t({name:`Firewalk:pillar`,vertexShader:M,fragmentShader:N,transparent:!0,depthWrite:!1,depthTest:!0,blending:2,toneMapped:!1,uniforms:o({...e,uHeight:{value:1.3},uWidth:{value:.22},uRiseTime:{value:.2},uFallTime:{value:.9},uLean:{value:.18},uWaver:{value:.06},uWaverRate:{value:3.1},uTaper:{value:1.35},uBulge:{value:.55},uNoiseScale:{value:1.6},uNoiseSpeed:{value:2.4},uErosion:{value:.9},uOpacity:{value:1},uGlow:{value:1.7},uFade:{value:1},uSoftFade:{value:.4},uColorA:{value:new y(1,1,1)},uColorB:{value:new y(1,.6,.15)},uColorC:{value:new y(.8,.2,.05)},uColorD:{value:new y(.1,.08,.09)}})})}function V(e,t,n,r,i){let a=e.uniforms;return a.uColorA.value.copy(l(t)),a.uColorB.value.copy(l(n)),a.uColorC.value.copy(l(r)),a.uColorD.value.copy(l(i)),e}var H=26,U={},W=new p,G=new p,K=new p,q=D(),J=class extends T{constructor(e){super(`firewalk`,e)}createShaders(){this.placement=P(),this.attributes=F(H),this.soleGeometry=L(this.attributes),this.soleMaterial=z(this.placement),this.soleMesh=new x(this.soleGeometry,this.soleMaterial),this.soleMesh.frustumCulled=!1,this.soleMesh.matrixAutoUpdate=!1,this.soleMesh.layers.set(u.VFX),this.soleMesh.renderOrder=7,this.group.add(this.soleMesh),this.pillarGeometry=R(this.attributes),this.pillarMaterial=B(this.placement),this.pillarMesh=new x(this.pillarGeometry,this.pillarMaterial),this.pillarMesh.frustumCulled=!1,this.pillarMesh.matrixAutoUpdate=!1,this.pillarMesh.layers.set(u.VFX),this.pillarMesh.renderOrder=12,this.group.add(this.pillarMesh),this.pyre=new s({hull:r.CYLINDER,medium:n.FLAME,prefix:`pyre`,maxSteps:40,renderOrder:13}),this.group.add(this.pyre.mesh),this.lane=new O(this.group,{mode:E.RUT,marks:H,additive:!1,name:`Firewalk:lane`}),this.lane.setVisible(!1),this._live=0,this._newest=-1,this._seed=0}createParticles(){let e=this.ctx.particles;this.motes=e.get(`firewalk.motes`,{capacity:2200,shape:S.SOFT,additive:!0,curl:!0,softFade:.35}),this.motes.uniforms.uDrag.value=1.3,this.motes.uniforms.uEndSize.value=.18,this.motes.uniforms.uSizeIn.value=.05,this.motes.uniforms.uFadeIn.value=.07,this.motes.uniforms.uFadeOut.value=.4,this.smoke=e.get(`firewalk.smoke`,{capacity:1600,shape:S.SMOKE,additive:!1,curl:!0,softFade:1.1}),this.smoke.uniforms.uDrag.value=1.8,this.smoke.uniforms.uEndSize.value=3,this.smoke.uniforms.uSizeIn.value=.12,this.smoke.uniforms.uFadeIn.value=.18,this.smoke.uniforms.uFadeOut.value=.32,this.sparks=e.get(`firewalk.sparks`,{capacity:2e3,shape:S.STREAK,additive:!0,stretch:!0,softFade:.25}),this.sparks.uniforms.uDrag.value=1.5,this.sparks.uniforms.uEndSize.value=.25,this.sparks.uniforms.uSizeIn.value=.02,this.sparks.uniforms.uFadeIn.value=.03,this.sparks.uniforms.uFadeOut.value=.45,this.moteEmitter=new C,this.smokeEmitter=new C}get instanceCount(){return this._live*2}get impactDuration(){return Math.max(.05,h.firewalk.lifetime*h.global.lifetime)}get fadeDuration(){return Math.max(.05,h.firewalk.fadeTime)}lightShimmer(){let e=h.firewalk,t=Math.floor(this.age*Math.max(1,e.lightFlickerSpeed)),n=Math.abs(Math.sin(t*91.7)*43758.5453)%1;return 1-_(e.lightFlicker)*n}_stepLength(){return Math.max(.05,h.firewalk.stepLength)}_printCount(){let e=h.firewalk,t=this.length-e.startOffset;return t<0?0:m(Math.floor(t/this._stepLength())+1,0,H)}_printDistance(e){return h.firewalk.startOffset+e*this._stepLength()}_printPoint(e,t){let n=h.firewalk,r=e%2==0?-1:1,i=this.attributes.aWander.array[e]??0;return t.copy(this.origin).addScaledVector(this.direction,this._printDistance(e)).addScaledVector(this.side,r*n.stride+i*n.wander),t.y=n.printLift,t}_yaw(){return Math.atan2(this.direction.x,this.direction.z)}onSpawn(){this.moteEmitter.reset(),this.smokeEmitter.reset(),this.lane.clearMarks(),this._newest=-1,this._seed=Math.random()*100;let e=this.attributes.aSeed.array,t=this.attributes.aWander.array,n=this.attributes.aBirth.array;for(let r=0;r<H;r++)e[r]=Math.random()*100,t[r]=Math.random()*2-1,n[r]=-1;this.attributes.aSeed.needsUpdate=!0,this.attributes.aWander.needsUpdate=!0,this.attributes.aBirth.needsUpdate=!0,this._sync(1),this._castFx()}_sync(e){this._live=this._printCount(),this.soleGeometry.instanceCount=this._live,this.pillarGeometry.instanceCount=this._live,this._syncPlacement(),this._syncSole(e),this._syncPillars(e),this._syncPyre(e),this._syncLane(e),this._syncParticles()}_syncPlacement(){let e=h.firewalk,t=this.placement;t.uOrigin.value.copy(this.origin),t.uForward.value.copy(this.direction),t.uSide.value.copy(this.side),t.uStart.value=e.startOffset,t.uStep.value=this._stepLength(),t.uStride.value=e.stride,t.uWander.value=e.wander,t.uLift.value=e.printLift,t.uNow.value=this.age}_syncSole(e){let t=h.firewalk,n=h.global,r=this.soleMaterial.uniforms;r.uFootLength.value=t.footLength,r.uFootWidth.value=t.footWidth,r.uPad.value=t.solePad,r.uToeOut.value=t.toeOut,r.uHeelWidth.value=t.heelWidth,r.uBallWidth.value=t.ballWidth,r.uArchCut.value=_(t.archCut),r.uSoleRound.value=t.soleRound,r.uToeSize.value=t.toeSize,r.uToeSpread.value=t.toeSpread,r.uToeGap.value=t.toeGap,r.uRim.value=t.soleRim,r.uHalo.value=t.soleHalo,r.uEdge.value=t.soleEdge,r.uRollTime.value=t.rollTime,r.uFlashTime.value=t.flashTime,r.uCoolTime.value=t.coolTime*n.particleLifetime,r.uCharTime.value=t.charTime,r.uGrain.value=t.soleGrain*n.noiseFrequency,r.uVein.value=t.soleVein,r.uRagged.value=t.soleRagged*n.noiseStrength,r.uOpacity.value=t.soleOpacity*n.opacity,r.uGlow.value=t.soleGlow*n.glow,r.uFade.value=e,r.uSoftFade.value=t.soleSoftFade,r.uColorFlash.value.copy(l(t.colorFlash)),r.uColorEmber.value.copy(l(t.colorEmber)),r.uColorChar.value.copy(l(t.colorChar)),r.uColorAsh.value.copy(l(t.colorAsh)),r.uColorHalo.value.copy(l(t.colorHalo))}_syncPillars(e){let t=h.firewalk,n=h.global,r=this.pillarMaterial.uniforms;r.uHeight.value=t.pillarHeight,r.uWidth.value=t.pillarWidth,r.uRiseTime.value=t.pillarRise,r.uFallTime.value=t.pillarFall*n.lifetime,r.uLean.value=t.pillarLean,r.uWaver.value=t.pillarWaver,r.uWaverRate.value=t.pillarWaverRate,r.uTaper.value=t.pillarTaper,r.uBulge.value=t.pillarBulge,r.uNoiseScale.value=t.pillarNoiseScale*n.noiseFrequency,r.uNoiseSpeed.value=t.pillarNoiseSpeed*n.noiseSpeed,r.uErosion.value=t.pillarErosion*n.noiseStrength,r.uOpacity.value=t.pillarOpacity*n.opacity,r.uGlow.value=t.pillarGlow*n.glow,r.uFade.value=e,r.uSoftFade.value=t.pillarSoftFade,V(this.pillarMaterial,t.colorPillarA,t.colorPillarB,t.colorPillarC,t.colorPillarD)}_syncPyre(e){let t=h.firewalk,n=h.global;if(this._newest<0){this.pyre.setFade(0).sync(t,n);return}this._printPoint(this._newest,K);let r=this.age-this.attributes.aBirth.array[this._newest],i=Math.exp(-Math.max(r,0)/Math.max(.05,t.pyreLinger)),a=Math.max(1,t.pyreSlack)/Math.max(.2,1-t.pyreMargin);this.pyre.place(K).setSize(t.pyreWidth*a,t.pyreHeight*a,t.pyreWidth*a).setFade(i*e).sync(t,n)}_syncLane(e){let t=h.firewalk,n=h.global;q.centre=this.origin,q.yaw=this._yaw(),q.height=t.laneHeight,q.radius=t.laneReach,q.length=this.length,q.grow=1,q.recede=0,q.progress=this.phase===w.TRAVEL?_(this.u):1,q.fade=e,q.seed=this._seed,q.edge=t.laneEdge,q.ragged=t.laneRagged,q.raggedScale=t.laneRaggedScale,q.warp=t.laneWarp,q.relief=t.laneRelief,q.normalStep=t.laneNormalStep,q.ambient=t.laneAmbient,q.wrap=t.laneWrap,q.specular=t.laneSpecular,q.gloss=t.laneGloss,q.parallax=t.laneParallax,q.cell=t.laneCell,q.seam=t.laneSeam,q.thickness=t.laneThickness,q.width=t.laneWidth,q.depth=t.laneDepth,q.lift=t.laneLift,q.sharp=t.laneSharp,q.detail=t.laneDetail,q.swirl=t.laneSwirl,q.markLife=t.laneMarkLife,q.markRadius=t.laneMarkRadius,q.additive=!1,q.emissive=t.laneEmissive,q.opacity=t.laneOpacity,q.depthFade=t.laneDepthFade,q.colorBase=t.colorLaneBase,q.colorEdge=t.colorLaneEdge,q.colorGlow=t.colorLaneGlow,q.colorDeep=t.colorLaneDeep,q.noiseStrength=n.noiseStrength,q.noiseFrequency=n.noiseFrequency,q.noiseSpeed=n.noiseSpeed,q.opacityScale=n.opacity,this.lane.update(q),this.lane.setVisible(e>.004)}_syncParticles(){let e=h.firewalk,t=h.global;this.motes.setGradient(l(e.colorMoteA),l(e.colorMoteB),l(e.colorMoteC),l(e.colorMoteD)),this.motes.uniforms.uGravity.value.set(0,e.moteRise,0),this.motes.uniforms.uSizeScale.value=e.moteSize*t.particleSize*7,this.motes.uniforms.uLifeScale.value=e.moteLifetime*.5*t.particleLifetime,this.motes.uniforms.uSpeedScale.value=t.particleSpeed,this.motes.uniforms.uOpacity.value=t.opacity,this.motes.uniforms.uGlow.value=e.moteGlow*t.glow,this.motes.uniforms.uTurbulence.value=e.moteTurbulence*t.turbulence,this.smoke.setGradient(l(e.colorSmokeA),l(e.colorSmokeB),l(e.colorSmokeC),l(e.colorSmokeD)),this.smoke.uniforms.uGravity.value.set(0,e.smokeRise,0),this.smoke.uniforms.uSizeScale.value=e.smokeSize*t.particleSize,this.smoke.uniforms.uLifeScale.value=e.smokeLifetime*.5*t.particleLifetime,this.smoke.uniforms.uSpeedScale.value=e.smokeSpeed*t.particleSpeed,this.smoke.uniforms.uOpacity.value=e.smokeOpacity*t.opacity,this.smoke.uniforms.uTurbulence.value=.3*t.turbulence,this.sparks.setGradient(l(e.colorSparkA),l(e.colorSparkB),l(e.colorSparkC),l(e.colorSparkD)),this.sparks.uniforms.uGravity.value.set(0,e.sparkGravity,0),this.sparks.uniforms.uSizeScale.value=e.sparkSize*t.particleSize*7,this.sparks.uniforms.uLifeScale.value=e.sparkLifetime*.5*t.particleLifetime,this.sparks.uniforms.uSpeedScale.value=t.particleSpeed,this.sparks.uniforms.uOpacity.value=t.opacity,this.sparks.uniforms.uGlow.value=e.soleGlow*.5*t.glow,this.sparks.uniforms.uStretch.value=e.sparkStretch}_igniteReached(){let e=this._printCount(),t=this.attributes.aBirth.array;for(let n=0;n<e;n++)if(!(t[n]>=0)){if(this._printDistance(n)>this.front)break;t[n]=this.age,this.attributes.aBirth.needsUpdate=!0,this._newest=n,this._footfall(n)}}_footfall(e){let t=h.firewalk,n=h.global;this._printPoint(e,K);let r=(e%2==0?-1:1)*t.stride/Math.max(.05,t.laneReach);this.lane.mark(m(r,-1,1),_(this._printDistance(e)/this.length),i.uTime.value,1);let a=Math.round(t.sparkStamp*n.particleCount);a>0&&(U.position=W.copy(K).setY(t.printLift+.02),U.radius=t.footWidth*.5,U.direction=G.copy(this.direction).multiplyScalar(.55).setY(.8).normalize(),U.speed=t.sparkSpeed,U.speedVariance=.85,U.spread=.95,U.inherit=null,U.anchor=null,U.size=.12,U.sizeVariance=.7,U.life=t.sparkLifetime,U.lifeVariance=.5,U.spin=0,U.tint=null,U.time=i.uTime.value,this.sparks.emit(a,U)),this.ctx.shake.add(t.stampShake*n.explosionIntensity*n.cameraShake,1/Math.max(.1,t.shakeDuration),20),this.lightBoost=t.lightIntensity*.35*n.explosionIntensity}_castFx(){let e=h.firewalk,t=h.global;this._printPoint(0,W),this.ctx.bursts.spawn(b.FIRE,W,{radius:e.footLength*.4,endRadius:e.footLength*2.2*t.explosionIntensity,life:.45,intensity:1.4,opacity:.7,fresnel:1.5,displace:.6,squash:.55,colorA:l(e.colorPillarC),colorB:l(e.colorPillarB),colorC:l(e.colorFlash)}),this.ctx.flash.trigger(l(e.colorCastFlash),e.castFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.5*t.explosionIntensity}_trailFx(e,t){let n=h.firewalk,r=h.global,a=i.uTime.value,o=this._newest+1;if(o<=0)return;let s=Math.round(this.moteEmitter.tick(e,n.moteRate*t)*r.particleCount);if(s>0){let e=Math.min(o-1,Math.floor((1-Math.random()*Math.random())*o));this._printPoint(e,W),U.position=W,U.radius=n.footLength*.45,U.direction=G.set(0,1,0),U.speed=n.moteSpeed,U.speedVariance=.8,U.spread=.85,U.inherit=null,U.anchor=null,U.size=.07,U.sizeVariance=.7,U.life=n.moteLifetime,U.lifeVariance=.5,U.spin=0,U.tint=null,U.time=a,this.motes.emit(s,U)}let c=Math.round(this.smokeEmitter.tick(e,n.smokeRate*t)*r.particleCount);if(c>0){let e=Math.min(o-1,Math.floor(Math.random()*o));this._printPoint(e,W).setY(.12),U.position=W,U.radius=n.laneWidth*1.4,U.direction=G.set(0,1,0),U.speed=n.smokeSpeed,U.speedVariance=.7,U.spread=.9,U.inherit=null,U.anchor=null,U.size=.7,U.sizeVariance=.5,U.life=n.smokeLifetime,U.lifeVariance=.4,U.spin=.35,U.tint=null,U.time=a,this.smoke.emit(c,U)}}_placeLight(){let e=h.firewalk;if(this._newest<0){this.position.copy(this.origin),this.position.y=e.lightHeight;return}this._printPoint(this._newest,this.position),this.position.y=e.printLift+e.lightHeight}onTravel(e){this._igniteReached(),this._sync(1),this._placeLight(),this._trailFx(e,1),this.ctx.shake.rumble(h.firewalk.rumble*h.global.cameraShake,e)}onImpact(){let e=this._printCount(),t=this.attributes.aBirth.array;for(let n=0;n<e;n++)t[n]>=0||(t[n]=this.age,this.attributes.aBirth.needsUpdate=!0,this._newest=n,this._footfall(n))}onFade(e,t){let n=t<=1?1:1-v.inCubic(_(t-1));this._sync(n),this._placeLight(),this._trailFx(e,n*(t<=1?.7:.3)),this.ctx.shake.rumble(h.firewalk.rumble*.4*n*h.global.cameraShake,e)}onDestroy(){this._newest=-1,this._live=0,this.soleGeometry.instanceCount=0,this.pillarGeometry.instanceCount=0,this.soleMaterial.uniforms.uFade.value=0,this.pillarMaterial.uniforms.uFade.value=0,this.pyre.setFade(0),this.lane.setVisible(!1),this.lane.clearMarks()}dispose(){this.soleGeometry.dispose(),this.pillarGeometry.dispose(),this.soleMaterial.dispose(),this.pillarMaterial.dispose(),this.pyre.dispose(),this.lane.dispose(),super.dispose()}};export{J as FirewalkAbility};
//# sourceMappingURL=FirewalkAbility-aib15E69.js.map