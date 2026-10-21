import{$t as e,Br as t,Gr as n,Jt as r,K as i,M as a,N as o,Qt as s,R as c,V as l,Y as u,_t as d,di as f,q as p,xt as m,yn as h}from"./settings-DdywqLlV.js";import"./SceneHooks-DvEWF-72.js";var g=Object.freeze({BIRD:0,LEAF:1,CARD:2,DROPLET:3,MOTE:4}),_=Object.freeze({POINT:0,LINE:1,ORBIT:2}),v=`
  #define PI  3.141592653589793
  #define TAU 6.283185307179586

  uniform float uTime;
  uniform float uSeed;

  /* --- the lead --- */
  uniform int   uLeadMode;
  uniform vec3  uLeadA;         // where the flock comes from
  uniform vec3  uLeadB;         // where it is going (or the orbit's centre)
  uniform vec3  uForward;       // unit heading of the cast
  uniform vec3  uSideAxis;      // unit lateral
  uniform float uLeadRise;      // metres the lead lofts at mid-span
  uniform float uLeadS;         // where the lead is now, 0..1 along its path
  uniform float uLeadRate;      // d(s)/dt, so the shader can rewind the lead
  uniform float uOrbitRadius;   // metres
  uniform float uOrbitHeight;   // metres
  uniform float uOrbitTurns;    // turns per unit of s

  /* --- the formation --- */
  uniform vec3  uLattice;       // cells across, up and back (whole numbers)
  uniform float uSpacingSide;   // metres between lateral cells
  uniform float uSpacingUp;     // metres between vertical cells
  uniform float uLag;           // seconds the back rank trails the lead by
  uniform float uJitter;        // metres of per-agent slop off its cell
  uniform float uChurn;         // radians/second the formation rolls
  uniform float uBreathe;       // fraction the formation swells by
  uniform float uBreatheRate;   // radians/second
  uniform float uWander;        // metres of curl-noise drift
  uniform float uWanderScale;   // features per metre
  uniform float uWanderSpeed;
  uniform float uGather;        // 0 collapses every agent onto the lead's path

  /* --- the body --- */
  uniform float uSize;          // metres, nose to tail
  uniform float uAspect;        // span / length
  uniform float uSizeJitter;    // ±fraction
  uniform float uBillboard;     // 0 agent frame, 1 camera facing
  uniform float uBank;          // radians of roll per m/s² of lateral accel
  uniform float uBankMax;       // radians
  uniform float uDihedral;      // wing fold, fraction of size
  uniform float uFlapRate;      // beats/second
  uniform float uCurl;          // leaf curl across the chord, fraction of size
  uniform float uEdgeStretch;   // how much an edge-on card is grown, ≥1
  uniform float uReveal;        // 0..1, agents appear as this passes their dice
  uniform float uRevealSpread;  // 0..1 width of that wave
  uniform vec3  uLightDir;      // world-space direction toward the key light

  attribute float aSeed;        // 0..1, the only thing an agent carries
  attribute float aIndex;       // its slot, used to claim a lattice cell

  ${a}

  varying float vDisrupt;       // spellbreak's field — see vfx/SceneHooks.js
  varying vec2  vUv;
  varying float vSeed;
  varying float vFacing;        // |n · v| — 0 when the card is edge-on
  varying float vNdl;
  varying float vAlpha;
  varying float vViewZ;

  ${u}

  /** Normalise, or fall back — a zero-length basis vector is a NaN silhouette. */
  vec3 safeNormalize(vec3 v, vec3 fallback) {
    float l2 = dot(v, v);
    return l2 > 1e-8 ? v * inversesqrt(l2) : fallback;
  }

  /** The lead point at path parameter s. */
  vec3 leadAt(float s) {
    if (uLeadMode == 2) {
      float a = s * TAU * uOrbitTurns;
      return uLeadB + vec3(cos(a), 0.0, sin(a)) * uOrbitRadius + vec3(0.0, uOrbitHeight, 0.0);
    }
    if (uLeadMode == 1) {
      // Allowed to run behind the start so the tail of the flock is still
      // leaving the hand while the head is downrange; never past the target,
      // because the target is where the ability's impact is.
      float t = clamp(s, -0.5, 1.0);
      vec3 p = mix(uLeadA, uLeadB, t);
      p.y += uLeadRise * sin(PI * clamp(t, 0.0, 1.0));
      return p;
    }
    return uLeadB;
  }

  /**
   * Which cell of the lattice this agent owns.
   *
   * Decoded from the instance index so it is unique by construction, then
   * shifted per cast by a wrap-around offset — still a bijection, so two casts
   * lay the same formation out differently without ever doubling up.
   */
  vec3 cellOf(float idx, vec3 L) {
    vec3 cell = vec3(
      mod(idx, L.x),
      mod(floor(idx / L.x), L.y),
      mod(floor(idx / (L.x * L.y)), L.z)
    );
    vec3 shift = floor(hash31(uSeed * 13.0 + 0.7) * L);
    return mod(cell + shift, L);
  }

  /**
   * Where an agent is, dt seconds from now (dt ≤ 0 for the finite difference).
   */
  vec3 agentAt(vec3 dice, float idx, float dt) {
    vec3 L = max(vec3(1.0), floor(uLattice));
    vec3 cell = cellOf(idx, L);
    vec3 centred = cell - (L - 1.0) * 0.5;

    // The third lattice axis is time, not distance: rank 0 rides the lead, the
    // back rank is uLag seconds behind it.
    float lagN = L.z > 1.0 ? cell.z / (L.z - 1.0) : 0.0;
    float lag = uLag * lagN;

    float t = uTime + dt;
    vec3 home = leadAt(uLeadS + (dt - lag) * uLeadRate);

    vec2 plane = vec2(centred.x * uSpacingSide, centred.y * uSpacingUp);
    plane += (dice.xy - 0.5) * (2.0 * uJitter);
    // The formation rolls as a whole, so the silhouette of the flock keeps
    // changing without any agent leaving its cell.
    plane = rot2(t * uChurn + dice.z * TAU * 0.15 + uSeed) * plane;
    plane *= 1.0 + uBreathe * sin(t * uBreatheRate + dice.y * TAU);

    vec3 pos = home + uSideAxis * plane.x + vec3(0.0, plane.y, 0.0);
    // Keep uWander under half the cell spacing or the lattice's separation
    // guarantee stops being a guarantee.
    pos += curlNoise(pos * uWanderScale + vec3(0.0, t * uWanderSpeed, 0.0) + dice.z * 17.0) * uWander;

    return mix(home, pos, clamp(uGather, 0.0, 1.0));
  }

  void main() {
    vec3 dice = hash31(aSeed * 91.7 + 3.1);
    float idx = aIndex;

    // Three samples: position, velocity, acceleration. The step is a fraction
    // of a second rather than the frame delta on purpose — the bank must not
    // change when the frame rate does.
    const float H = 0.06;
    vec3 p0 = agentAt(dice, idx, 0.0);
    vec3 p1 = agentAt(dice, idx, -H);
    vec3 p2 = agentAt(dice, idx, -2.0 * H);

    vec3 vel = (p0 - p1) / H;
    vec3 acc = (p0 - 2.0 * p1 + p2) / (H * H);

    vec3 forward = safeNormalize(vel, uForward);
    vec3 right = safeNormalize(cross(forward, vec3(0.0, 1.0, 0.0)), uSideAxis);
    vec3 lift0 = cross(right, forward);

    // Bank into the turn. Negative because a bird turning to its right drops
    // its right wing — get the sign backwards and the whole flock reads as
    // sliding rather than turning.
    float bank = clamp(-atan(dot(acc, right) * uBank), -uBankMax, uBankMax);
    // Only the wing axis is rolled; the normal follows from the cross product
    // below, so the card tips as one piece without a second basis to keep in
    // step with the first.
    vec3 wing = right * cos(bank) + lift0 * sin(bank);

    // Camera basis straight off the view matrix's rows.
    vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);

    float bb = clamp(uBillboard, 0.0, 1.0);
    vec3 axisX = safeNormalize(mix(wing, camRight, bb), camRight);
    vec3 axisY = mix(forward, camUp, bb);
    axisY = safeNormalize(axisY - axisX * dot(axisX, axisY), camUp);
    vec3 normal = safeNormalize(cross(axisX, axisY), vec3(0.0, 1.0, 0.0));

    vec3 viewDir = safeNormalize(cameraPosition - p0, vec3(0.0, 0.0, 1.0));
    float facing = abs(dot(normal, viewDir));

    float size = uSize * (1.0 + uSizeJitter * (dice.x - 0.5) * 2.0);
    // An edge-on card is thinner than a pixel and simply disappears; growing it
    // as it turns is what turns the vanishing act into a bright line.
    size *= mix(max(uEdgeStretch, 1.0), 1.0, facing);

    vec2 corner = position.xy;
    vec3 world = p0 + axisX * (corner.x * size * uAspect * 0.5) + axisY * (corner.y * size * 0.5);

    // A real fold, not a painted one: the middle column stays on the plane and
    // the wing columns swing out of it, so the bird genuinely goes edge-on at
    // the top of its stroke.
    float flap = sin(TAU * (uFlapRate * uTime + dice.y));
    world += normal * (uDihedral * abs(corner.x) * flap * size);
    world += normal * (uCurl * corner.x * corner.x * size);

    float threshold = dice.z * (1.0 - clamp(uRevealSpread, 0.0, 1.0));
    vAlpha = smoothstep(threshold, threshold + max(uRevealSpread, 1e-3), clamp(uReveal, 0.0, 1.0));

    vUv = uv;
    vSeed = aSeed;
    vFacing = facing;
    vNdl = abs(dot(normal, normalize(uLightDir)));

    // Opt-in to the disruption field. The mesh matrix is identity and the
    // vertex shader has already placed the card in world space, so this
    // position IS the world point and needs no further transform.
    vDisrupt = disruptAt(world);

    vec4 mv = modelViewMatrix * vec4(world, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,y=`
  uniform float uTime;
  uniform vec2  uResolution;
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;
  uniform float uGlobalGlow;
  uniform vec3  uLightDir;

  uniform int   uShape;
  uniform float uSweep;         // BIRD: how far the wings rake back
  uniform float uGlyphWeight;   // CARD: stroke half-width, card units
  uniform float uGlyphStrokes;  // CARD: strokes in the walk
  uniform float uCardFrame;     // CARD: brightness of the plate's border
  uniform float uEdgeGain;      // emission multiplier when edge-on
  uniform float uLit;           // 0 emissive, 1 wrapped diffuse

  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  uniform vec3  uColorD;
  uniform float uTint;          // where in the gradient the flock sits
  uniform float uTintJitter;    // ±per-agent walk along it
  uniform float uTintAlong;     // extra walk from head to tail
  uniform float uOpacity;
  uniform float uGlow;
  uniform float uSoftFade;      // metres of depth feather

  ${a}

  varying float vDisrupt;
  varying vec2  vUv;
  varying float vSeed;
  varying float vFacing;
  varying float vNdl;
  varying float vAlpha;
  varying float vViewZ;

  ${u}
  ${p}

  float segDist(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
    return length(pa - ba * h);
  }

  /* --- BIRD ---------------------------------------------------------- */
  float birdMask(vec2 c) {
    float x = abs(c.x);
    float y = c.y;
    // Leading and trailing edges both rake back with the span, which is what
    // makes a two-triangle card read as a wing rather than as a lozenge.
    float lead = 0.62 - uSweep * x + 0.22 * x * x;
    float trail = -0.10 - (uSweep + 0.35) * x;
    float wing = smoothstep(0.0, 0.07, y - trail) * smoothstep(0.0, 0.07, lead - y);
    float body = smoothstep(0.34, 0.14, length(vec2(c.x * 3.4, (y - 0.08) * 0.8)));
    return clamp(max(wing, body), 0.0, 1.0);
  }

  /* --- LEAF ---------------------------------------------------------- */
  float leafMask(vec2 c) {
    float w = max(0.0, 1.0 - c.y * c.y);
    float body = smoothstep(w * 0.66, w * 0.30, abs(c.x));
    float rib = smoothstep(0.05, 0.0, abs(c.x)) * 0.5;
    return clamp(body - rib * 0.35, 0.0, 1.0);
  }

  /* --- CARD ---------------------------------------------------------- */
  /**
   * One lattice point of a 3 × 5 grid inside the card.
   *
   * The grid is what makes the marks read as *writing*. An unconstrained random
   * walk gives scribble; snapping the endpoints to a coarse lattice gives
   * strokes that share terminals and angles across every card in the storm, and
   * a few hundred of those look like an alphabet nobody has taught you.
   */
  vec2 glyphNode(float h) {
    float ix = floor(hash11(h) * 3.0);
    float iy = floor(hash11(h + 11.7) * 5.0);
    return vec2((ix - 1.0) * 0.40, (iy - 2.0) * 0.27);
  }

  float glyphMask(vec2 p, float seed) {
    float d = 1e3;
    vec2 prev = glyphNode(seed);
    float strokes = clamp(uGlyphStrokes, 1.0, 6.0);
    // Masked rather than broken out of: GLSL ES 1.00 wants a constant loop
    // bound, and a break on a uniform is the kind of thing that compiles on
    // the desktop driver and fails on the one the player has.
    for (int i = 1; i <= 6; i++) {
      vec2 next = glyphNode(seed + float(i) * 3.77);
      // A zero-length stroke is a blot; nudge the degenerate case sideways.
      if (dot(next - prev, next - prev) < 1e-4) next += vec2(0.40, 0.0);
      float on = step(float(i), strokes);
      d = min(d, mix(1e3, segDist(p, prev, next), on));
      prev = mix(prev, next, on);
    }
    d = min(d, length(p - prev) - 0.03);
    float weight = max(uGlyphWeight, 1e-3);
    return smoothstep(weight, weight * 0.35, d);
  }

  float cardMask(vec2 c, float seed) {
    vec2 q = abs(c) - vec2(0.74, 0.92);
    float plate = min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - 0.08;
    float frame = smoothstep(0.035, 0.0, abs(plate) - 0.014) * uCardFrame;
    float mark = glyphMask(c * vec2(1.0, 0.86), seed * 37.0 + 1.3);
    return clamp(max(frame, mark), 0.0, 1.0);
  }

  /* --- DROPLET ------------------------------------------------------- */
  float dropletMask(vec2 c) {
    float bulb = length(c - vec2(0.0, -0.34)) - 0.54;
    float t = clamp((c.y + 0.34) / 1.34, 0.0, 1.0);
    float taper = abs(c.x) - 0.54 * pow(1.0 - t, 1.5);
    float d = min(bulb, max(taper, -(c.y + 0.34)));
    return smoothstep(0.07, -0.02, d);
  }

  void main() {
    if (vAlpha < 0.004) discard;

    vec2 c = (vUv - 0.5) * 2.0;

    float mask;
    if (uShape == 0)      mask = birdMask(c);
    else if (uShape == 1) mask = leafMask(c);
    else if (uShape == 2) mask = cardMask(c, vSeed);
    else if (uShape == 3) mask = dropletMask(c);
    else                  mask = smoothstep(1.0, 0.0, length(c));

    if (mask <= 0.004) discard;

    float alpha = mask * vAlpha * uOpacity;
    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.004) discard;

    float t = clamp(uTint + uTintJitter * (vSeed - 0.5) * 2.0 + (1.0 - vUv.y) * uTintAlong, 0.0, 1.0);
    vec3 colour = gradient4(uColorA, uColorB, uColorC, uColorD, t);

    // Wrapped, two-sided diffuse: a leaf lit from behind is still a leaf, so the
    // term uses |n·l| rather than a clamped dot.
    colour *= mix(1.0, mix(0.42, 1.3, vNdl), clamp(uLit, 0.0, 1.0));
    // Edge-on is where the storm flickers: the card collapses to a line and the
    // line has to be *brighter* than the plate was, or it just reads as a gap.
    colour *= mix(max(uEdgeGain, 0.0), 1.0, vFacing);
    colour *= uGlow * uGlobalGlow;
    disruptShade(colour, alpha, vDisrupt, gl_FragCoord.xy);

    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 1.0));
  }
`,b=new f,x=new f,S=class{constructor(a,{capacity:c=256,silhouette:u=g.BIRD,additive:p=!0,renderOrder:b=12}={}){this.capacity=Math.max(1,Math.round(c)),this.group=new r,this.group.name=`Swarm`,this.group.matrixAutoUpdate=!1,a?.add(this.group);let x=[-1,0,1],S=new Float32Array(18),w=new Float32Array(12);for(let e=0;e<3;e++)for(let t=0;t<2;t++){let n=(e*2+t)*3,r=(e*2+t)*2;S[n+0]=x[e],S[n+1]=t===0?-1:1,S[n+2]=0,w[r+0]=(x[e]+1)*.5,w[r+1]=t}let T=new Uint16Array(12);for(let e=0;e<2;e++){let t=e*2,n=e*6;T[n+0]=t,T[n+1]=t+2,T[n+2]=t+1,T[n+3]=t+1,T[n+4]=t+2,T[n+5]=t+3}this.seeds=new s(new Float32Array(this.capacity),1);let E=new Float32Array(this.capacity);for(let e=0;e<this.capacity;e++)this.seeds.array[e]=Math.random(),E[e]=e;let D=new e;D.setAttribute(`position`,new d(S,3)),D.setAttribute(`uv`,new d(w,2)),D.setAttribute(`aSeed`,this.seeds),D.setAttribute(`aIndex`,new s(E,1)),D.setIndex(new d(T,1)),D.instanceCount=0,D.boundingSphere=new n(new f,1e4),this.geometry=D,this.material=new t({transparent:!0,depthWrite:!1,depthTest:!0,blending:p?2:1,side:2,toneMapped:!1,uniforms:i({...o(),uSeed:{value:0},uLeadMode:{value:_.LINE},uLeadA:{value:new f},uLeadB:{value:new f(0,0,1)},uForward:{value:new f(0,0,1)},uSideAxis:{value:new f(1,0,0)},uLeadRise:{value:0},uLeadS:{value:0},uLeadRate:{value:1},uOrbitRadius:{value:3},uOrbitHeight:{value:1.5},uOrbitTurns:{value:1},uLattice:{value:new f(6,3,8)},uSpacingSide:{value:.5},uSpacingUp:{value:.35},uLag:{value:.5},uJitter:{value:.12},uChurn:{value:.7},uBreathe:{value:.18},uBreatheRate:{value:1.6},uWander:{value:.14},uWanderScale:{value:.5},uWanderSpeed:{value:.5},uGather:{value:1},uSize:{value:.32},uAspect:{value:1.5},uSizeJitter:{value:.3},uBillboard:{value:0},uBank:{value:.06},uBankMax:{value:1.2},uDihedral:{value:.3},uFlapRate:{value:5},uCurl:{value:0},uEdgeStretch:{value:1.6},uReveal:{value:1},uRevealSpread:{value:.35},uShape:{value:u},uSweep:{value:.85},uGlyphWeight:{value:.07},uGlyphStrokes:{value:4},uCardFrame:{value:.35},uEdgeGain:{value:2.4},uLit:{value:0},uColorA:{value:new m(`#ffe6b0`)},uColorB:{value:new m(`#ff8a3c`)},uColorC:{value:new m(`#8a2a0c`)},uColorD:{value:new m(`#1a0a06`)},uTint:{value:.2},uTintJitter:{value:.25},uTintAlong:{value:.35},uOpacity:{value:1},uGlow:{value:1.3},uSoftFade:{value:.35}}),vertexShader:v,fragmentShader:y}),this.mesh=new h(D,this.material),this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=!1,this.mesh.layers.set(l.VFX),this.mesh.renderOrder=b,this.group.add(this.mesh),this._origin=new f,this._direction=new f(0,0,1),this._side=new f(1,0,0),this._length=1,this._p=C(),this._p.silhouette=u,this.seed=0,this.liveAgents=0}get uniforms(){return this.material.uniforms}get count(){return this.liveAgents}get drawCalls(){return 1}setColors(e,t,n,r){let i=this.material.uniforms;i.uColorA.value.copy(typeof e==`string`?c(e):e),i.uColorB.value.copy(typeof t==`string`?c(t):t),i.uColorC.value.copy(typeof n==`string`?c(n):n);let a=r??n;return i.uColorD.value.copy(typeof a==`string`?c(a):a),this}setBasis(e,t,n,r){return this._origin.copy(e),this._direction.copy(t),this._side.copy(n),this._length=Math.max(.01,r),this}roll(e=Math.random()*100){this.seed=e,this.material.uniforms.uSeed.value=e;for(let e=0;e<this.capacity;e++)this.seeds.array[e]=Math.random();return this.seeds.needsUpdate=!0,this}reset(){this.liveAgents=0,this.geometry.instanceCount=0,this.mesh.visible=!1}_resolve(e){let t=this._p;for(let n in w){let r=e[n];t[n]=r===void 0?w[n]:r}return t}update(e,t){let n=this._resolve(t??w),r=this.material.uniforms,i=Math.max(0,Math.min(this.capacity,Math.round(n.count)));this.liveAgents=i,this.geometry.instanceCount=i,this.mesh.visible=i>0&&n.opacity>0&&n.size>0,b.copy(this._origin).addScaledVector(this._direction,n.handForward).addScaledVector(this._side,n.handSide),b.y=n.handHeight,x.copy(this._origin).addScaledVector(this._direction,this._length),x.y=n.endHeight,r.uLeadMode.value=n.leadMode,r.uLeadA.value.copy(b),r.uLeadB.value.copy(x),r.uForward.value.copy(this._direction),r.uSideAxis.value.copy(this._side),r.uLeadRise.value=n.leadRise,r.uLeadS.value=n.leadS,r.uLeadRate.value=n.leadRate,r.uOrbitRadius.value=n.orbitRadius,r.uOrbitHeight.value=n.orbitHeight,r.uOrbitTurns.value=n.orbitTurns,r.uLattice.value.set(Math.max(1,Math.round(n.latticeX)),Math.max(1,Math.round(n.latticeY)),Math.max(1,Math.round(n.latticeZ))),r.uSpacingSide.value=n.spacingSide,r.uSpacingUp.value=n.spacingUp,r.uLag.value=n.lag,r.uJitter.value=n.jitter,r.uChurn.value=n.churn,r.uBreathe.value=n.breathe,r.uBreatheRate.value=n.breatheRate,r.uWander.value=n.wander,r.uWanderScale.value=n.wanderScale,r.uWanderSpeed.value=n.wanderSpeed,r.uGather.value=n.gather,r.uSize.value=n.size,r.uAspect.value=n.aspect,r.uSizeJitter.value=n.sizeJitter,r.uBillboard.value=n.billboard,r.uBank.value=n.bank,r.uBankMax.value=n.bankMax,r.uDihedral.value=n.dihedral,r.uFlapRate.value=n.flapRate,r.uCurl.value=n.curl,r.uEdgeStretch.value=n.edgeStretch,r.uReveal.value=n.reveal,r.uRevealSpread.value=n.revealSpread,r.uShape.value=n.silhouette,r.uSweep.value=n.sweep,r.uGlyphWeight.value=n.glyphWeight,r.uGlyphStrokes.value=n.glyphStrokes,r.uCardFrame.value=n.cardFrame,r.uEdgeGain.value=n.edgeGain,r.uLit.value=n.lit,r.uTint.value=n.tint,r.uTintJitter.value=n.tintJitter,r.uTintAlong.value=n.tintAlong,r.uOpacity.value=n.opacity,r.uGlow.value=n.glow,r.uSoftFade.value=n.softFade}leadPoint(e){let t=this._p;if(t.leadMode===_.ORBIT){let n=t.leadS*Math.PI*2*t.orbitTurns;return e.copy(this._origin).addScaledVector(this._direction,this._length),e.x+=Math.cos(n)*t.orbitRadius,e.z+=Math.sin(n)*t.orbitRadius,e.y=t.endHeight+t.orbitHeight,e}if(t.leadMode===_.LINE){let n=Math.max(-.5,Math.min(1,t.leadS));return b.copy(this._origin).addScaledVector(this._direction,t.handForward).addScaledVector(this._side,t.handSide),b.y=t.handHeight,x.copy(this._origin).addScaledVector(this._direction,this._length),x.y=t.endHeight,e.copy(b).lerp(x,n),e.y+=t.leadRise*Math.sin(Math.PI*Math.max(0,Math.min(1,n))),e}return e.copy(this._origin).addScaledVector(this._direction,this._length),e.y=t.endHeight,e}dispose(){this.geometry.dispose(),this.material.dispose(),this.group.parent?.remove(this.group)}};function C(){return{count:96,leadMode:_.LINE,leadS:0,leadRate:1,leadRise:1.2,handForward:.6,handSide:.35,handHeight:1.4,endHeight:.9,orbitRadius:3,orbitHeight:1.5,orbitTurns:1,latticeX:6,latticeY:3,latticeZ:8,spacingSide:.5,spacingUp:.35,lag:.5,jitter:.12,churn:.7,breathe:.18,breatheRate:1.6,wander:.14,wanderScale:.5,wanderSpeed:.5,gather:1,size:.32,aspect:1.5,sizeJitter:.3,billboard:0,bank:.06,bankMax:1.2,dihedral:.3,flapRate:5,curl:0,edgeStretch:1.6,reveal:1,revealSpread:.35,silhouette:g.BIRD,sweep:.85,glyphWeight:.07,glyphStrokes:4,cardFrame:.35,edgeGain:2.4,lit:0,tint:.2,tintJitter:.25,tintAlong:.35,opacity:1,glow:1.3,softFade:.35}}var w=C();export{C as i,g as n,S as r,_ as t};
//# sourceMappingURL=Swarm-WksC-UkD.js.map