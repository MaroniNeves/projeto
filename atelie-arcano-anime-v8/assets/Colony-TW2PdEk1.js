import{$t as e,Br as t,Gr as n,Jt as r,K as i,Qt as a,R as o,V as s,Y as c,_t as l,di as u,it as d,nt as f,q as p,st as m,vt as h,xt as g,yn as _}from"./settings-DdywqLlV.js";import{i as v,r as y}from"./Swarm-WksC-UkD.js";var b=new u,x=new u,S=new u,C=new u,w=Math.PI*2,T=Math.PI*(3-Math.sqrt(5)),E=`
  /**
   * n  surface normal (unit, world)
   * v  direction to the eye (unit, world)
   * l  direction to the key light (unit, world)
   * wrap   0 hard terminator, 1 fully wrapped
   * rimPow fresnel exponent
   */
  vec3 chitin(vec3 n, vec3 v, vec3 l, vec3 body, vec3 rimColour, vec3 sheenColour,
              float wrap, float rimPow, float rimGain, float sheenPow, float sheenGain) {
    float ndl = dot(n, l);
    float diffuse = mix(max(ndl, 0.0), ndl * 0.5 + 0.5, clamp(wrap, 0.0, 1.0));
    float ndv = clamp(abs(dot(n, v)), 0.0, 1.0);
    float rim = pow(1.0 - ndv, max(rimPow, 0.1));
    vec3 h = normalize(l + v);
    float sheen = pow(clamp(dot(n, h), 0.0, 1.0), max(sheenPow, 1.0));
    return body * (0.18 + 0.82 * diffuse)
         + rimColour * (rim * rimGain)
         + sheenColour * (sheen * sheenGain);
  }
`,D=Object.freeze({BALL:0,WALL:1,SPEAR:2,FIST:3,RING:4,COLUMN:5});Object.freeze([`ball`,`wall`,`spear`,`fist`,`ring`,`column`]);var O=`
  /* --- the target shape ------------------------------------------- */
  uniform int   uShapeA;        // ColonyShape.*
  uniform int   uShapeB;        // the shape being morphed toward
  uniform float uShapeBlend;    // 0 all A, 1 all B — blends the FIELDS
  uniform float uCondense;      // 0 pure flock, 1 pure shape
  uniform vec3  uShapeSize;     // metres: half-width, half-height, half-depth
  uniform vec3  uShapeOffset;   // metres from the lead: forward, side, up
  uniform float uShapeSpin;     // radians/second about the world up axis
  uniform float uShapeFill;     // 0 a shell of agents, 1 a solid body
  uniform float uShapeSteps;    // descent steps, 1..4
  uniform float uShapeSlack;    // fraction of each step taken (under-relaxation)
  uniform float uShapeRough;    // unitless slop on the landed target

  /* --- the density wave ------------------------------------------- */
  uniform float uWaveAmp;       // metres of longitudinal bunching
  uniform float uWaveLength;    // metres between crests
  uniform float uWaveSpeed;     // metres/second the crests travel
  uniform vec3  uWaveAxis;      // unit, world space — normalised on the CPU

  /* --- crawling ----------------------------------------------------- */
  uniform float uCling;         // 0 flying, 1 pinned to the floor
  uniform float uFloorY;        // metres
  uniform float uCrawlHeight;   // metres above the floor a crawler rides

  /* --- primitives, all in unit space -------------------------------- */

  /** Polynomial smooth minimum. A hard union creases; a hive does not. */
  float colonySmin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / max(k, 1e-4), 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  float colonyBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return min(max(q.x, max(q.y, q.z)), 0.0) + length(max(q, 0.0));
  }

  float colonyCapsule(vec3 p, vec3 a, vec3 b, float r) {
    vec3 pa = p - a;
    vec3 ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
    return length(pa - ba * h) - r;
  }

  /** Torus about +z, so the hoop faces downrange. */
  float colonyTorus(vec3 p, float bigR, float smallR) {
    vec2 q = vec2(length(p.xy) - bigR, p.z);
    return length(q) - smallR;
  }

  float colonyCylinderY(vec3 p, float r, float h) {
    vec2 d = vec2(length(p.xz) - r, abs(p.y) - h);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
  }

  /**
   * The fist.
   *
   * Palm, four knuckles and a thumb, smooth-unioned. The knuckles are the whole
   * read: a rounded box alone is a brick, and it is the four bumps along its
   * top-front edge that the eye resolves as a hand at fifteen metres. They are
   * placed on a loop rather than unrolled because four hand-written spheres is
   * four places to get the spacing wrong.
   */
  float colonyFist(vec3 p) {
    float d = colonyBox(p, vec3(0.52, 0.44, 0.34)) - 0.20;
    for (int i = 0; i < 4; i++) {
      float u = (float(i) - 1.5) / 1.5;                 // -1..1 across the hand
      vec3 knuckle = vec3(u * 0.46, 0.40, 0.34 - abs(u) * 0.08);
      d = colonySmin(d, length(p - knuckle) - 0.23, 0.14);
    }
    // The thumb rides across the front, low and to one side. Without it the
    // silhouette is symmetric, and a symmetric hand reads as a rock.
    d = colonySmin(d, colonyCapsule(p, vec3(-0.44, -0.22, 0.10), vec3(0.06, -0.08, 0.46), 0.19), 0.12);
    return d;
  }

  /**
   * The spear.
   *
   * A thin shaft smooth-unioned with a fatter, shorter capsule at the front,
   * which gives a spindle head rather than a cone. A true round cone is about
   * thirty lines of iq arithmetic and buys a sharper point that no agent is
   * small enough to resolve; the spindle costs two capsules and reads the same.
   */
  float colonySpear(vec3 p) {
    float shaft = colonyCapsule(p, vec3(0.0, 0.0, -0.95), vec3(0.0, 0.0, 0.42), 0.085);
    float head = colonyCapsule(p, vec3(0.0, 0.0, 0.40), vec3(0.0, 0.0, 0.86), 0.21);
    return colonySmin(shaft, head, 0.16);
  }

  float colonyShapeField(int which, vec3 p) {
    if (which == 1) return colonyBox(p, vec3(0.92, 0.90, 0.10)) - 0.06;
    if (which == 2) return colonySpear(p);
    if (which == 3) return colonyFist(p);
    if (which == 4) return colonyTorus(p, 0.70, 0.22);
    if (which == 5) return colonyCylinderY(p, 0.40, 0.90) - 0.06;
    return length(p) - 0.90;
  }

  /** The blended field. This, not the projected point, is what morphs. */
  float colonyField(vec3 p) {
    float k = clamp(uShapeBlend, 0.0, 1.0);
    return mix(colonyShapeField(uShapeA, p), colonyShapeField(uShapeB, p), k);
  }

  /**
   * Gradient by the tetrahedron trick — four taps rather than the six a
   * central difference wants, for the same accuracy at this step size.
   */
  vec3 colonyGrad(vec3 p) {
    const vec2 e = vec2(1.0, -1.0);
    const float h = 0.055;
    vec3 g = e.xyy * colonyField(p + e.xyy * h)
           + e.yyx * colonyField(p + e.yyx * h)
           + e.yxy * colonyField(p + e.yxy * h)
           + e.xxx * colonyField(p + e.xxx * h);
    return g * inversesqrt(max(dot(g, g), 1e-8));
  }

  /**
   * Where this agent belongs in the shape, in world metres.
   *
   * The agent's dice and its index are its entire identity and neither
   * changes, so this is a pure function of the shape uniforms — which is
   * exactly why a paused slider re-forms the whole silhouette.
   */
  vec3 colonyTarget(vec3 dice, float idx) {
    // One draw from the unit cube. Not the surface, not a sphere — the descent
    // does the shaping, and starting from a cube is what lets a concave shape
    // (a ring, the gap under a thumb) get agents into its hollows at all.
    vec3 q = (hash31(dot(dice, vec3(11.3, 27.7, 53.1)) + idx * 0.0137 + 4.19) - 0.5) * 2.0;

    float iso = -max(uShapeFill, 0.0) * hash11(idx * 0.771 + 3.31);
    float steps = clamp(uShapeSteps, 1.0, 4.0);
    float relax = clamp(uShapeSlack, 0.05, 1.0);
    // Masked rather than broken out of: a break on a uniform is the kind of
    // thing that compiles on the desktop driver and fails on the one the player
    // has, which is the same reason Swarm's glyph walk masks its strokes.
    for (int i = 0; i < 4; i++) {
      float on = step(float(i), steps - 1.0);
      float d = colonyField(q) - iso;
      vec3 g = colonyGrad(q);
      q -= g * (d * relax * on);
    }

    // A perfectly converged surface is a shrink-wrap, and a swarm is not a
    // membrane. A little unitless slop off the isosurface is what keeps it a
    // crowd of insects that happens to be fist-shaped.
    q += (hash31(idx * 1.913 + 17.7) - 0.5) * (2.0 * uShapeRough);

    // Rigid spin about the shape's own up axis. Applied after the descent so
    // every agent turns with the shape instead of sliding around inside it.
    q.xz = rot2(uShapeSpin * uTime) * q.xz;

    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 centre = leadAt(uLeadS)
                + uForward * uShapeOffset.x
                + uSideAxis * uShapeOffset.y
                + up * uShapeOffset.z;
    vec3 local = q * uShapeSize;
    return centre + uSideAxis * local.x + up * local.y + uForward * local.z;
  }

  /**
   * The density wave, and the floor.
   *
   * A LONGITUDINAL compression along the wave axis: agents are displaced
   * along the axis by a sine of their own position on it, which crowds them at
   * the zero crossings and thins them at the extremes. That is a real surge —
   * a band of high density travelling up a funnel — and it costs one sine.
   *
   * The first version modulated per-agent *opacity* by the same sine. It looked
   * like a strobing gradient painted over a static swarm, because nothing
   * moved: density you can see is agents arriving, not agents brightening.
   */
  vec3 colonySurge(vec3 p, float t) {
    float len = max(uWaveLength, 0.05);
    float phase = TAU * (dot(p, uWaveAxis) - uWaveSpeed * t) / len;
    p += uWaveAxis * (uWaveAmp * sin(phase));
    p.y = mix(p.y, uFloorY + uCrawlHeight, clamp(uCling, 0.0, 1.0));
    return p;
  }
`,k=`void main() {`,A=`vec3 vel = (p0 - p1) / H;`,j=`
    float cnd = clamp(uCondense, 0.0, 1.0);
    if (cnd > 0.002) {
      vec3 tgt = colonyTarget(dice, idx);
      p0 = mix(p0, tgt, cnd);
      p1 = mix(p1, tgt, cnd);
      p2 = mix(p2, tgt, cnd);
    }
    p0 = colonySurge(p0, uTime);
    p1 = colonySurge(p1, uTime - H);
    p2 = colonySurge(p2, uTime - 2.0 * H);

    vec3 vel = (p0 - p1) / H;`,ee=class extends y{constructor(e,t={}){super(e,t);let n=this.material.vertexShader;if(n.indexOf(k)<0||n.indexOf(A)<0)throw Error(`ColonySwarm: the splice anchors are gone from Swarm.js. Expected to find "${k}" and "${A}" in its vertex shader. Re-point COLONY_ANCHOR_DECL / COLONY_ANCHOR_BODY in vfx/Colony.js at whatever replaced them — do not paper over it by copying the flock.`);this.material.vertexShader=n.replace(k,`${O}\n\n${k}`).replace(A,j),this.material.needsUpdate=!0;let r=this.material.uniforms;r.uShapeA={value:D.BALL},r.uShapeB={value:D.BALL},r.uShapeBlend={value:0},r.uCondense={value:0},r.uShapeSize={value:new u(1.4,1.4,1.4)},r.uShapeOffset={value:new u(0,0,0)},r.uShapeSpin={value:0},r.uShapeFill={value:.6},r.uShapeSteps={value:3},r.uShapeSlack={value:.85},r.uShapeRough={value:.06},r.uWaveAmp={value:0},r.uWaveLength={value:2.5},r.uWaveSpeed={value:3},r.uWaveAxis={value:new u(0,1,0)},r.uCling={value:0},r.uFloorY={value:0},r.uCrawlHeight={value:.12},this._cp=M()}update(e,t){super.update(e,t);let n=t??N,r=this._cp;for(let e in N){let t=n[e];r[e]=t===void 0?N[e]:t}let i=this.material.uniforms;i.uShapeA.value=f(Math.round(r.shapeA),0,5),i.uShapeB.value=f(Math.round(r.shapeB),0,5),i.uShapeBlend.value=r.shapeBlend,i.uCondense.value=r.condense,i.uShapeSize.value.set(r.shapeWidth,r.shapeHeight,r.shapeDepth),i.uShapeOffset.value.set(r.shapeForward,r.shapeSide,r.shapeUp),i.uShapeSpin.value=r.shapeSpin,i.uShapeFill.value=r.shapeFill,i.uShapeSteps.value=r.shapeSteps,i.uShapeSlack.value=r.shapeSlack,i.uShapeRough.value=r.shapeRough,i.uWaveAmp.value=r.waveAmp,i.uWaveLength.value=r.waveLength,i.uWaveSpeed.value=r.waveSpeed,b.set(0,1,0).lerp(x.copy(this._direction).setY(1e-4),m(r.waveAlong)),b.lengthSq()<1e-8&&b.set(0,1,0),i.uWaveAxis.value.copy(b.normalize()),i.uCling.value=r.cling,i.uFloorY.value=r.floorY,i.uCrawlHeight.value=r.crawlHeight}shapeCentre(e){this.leadPoint(e);let t=this._cp;return e.addScaledVector(this._direction,t.shapeForward).addScaledVector(this._side,t.shapeSide),e.y+=t.shapeUp,e}};function M(){return{shapeA:D.BALL,shapeB:D.BALL,shapeBlend:0,condense:0,shapeWidth:1.4,shapeHeight:1.4,shapeDepth:1.4,shapeForward:0,shapeSide:0,shapeUp:0,shapeSpin:.35,shapeFill:.6,shapeSteps:3,shapeSlack:.85,shapeRough:.06,waveAmp:0,waveLength:2.5,waveSpeed:3,waveAlong:0,cling:0,floorY:0,crawlHeight:.12}}var N=M();function P(){return{...v(),...M()}}var F=`
  uniform vec3  uAnchor;        // metres, the hub
  uniform vec3  uAxisX;         // unit, the web's own right
  uniform vec3  uAxisY;         // unit, the web's own up
  uniform vec3  uNormalAxis;    // unit, out of the web's plane

  uniform float uRings;         // whole number
  uniform float uSpokes;        // whole number
  uniform float uRadius;        // metres to the outer ring
  uniform float uSquash;        // 1 circular, < 1 an ellipse lying down
  uniform float uRingCurve;     // > 1 crowds the rings toward the rim
  uniform float uRingJitter;    // unitless, fraction of a ring's radius
  uniform float uSpokeJitter;   // unitless, fraction of a spoke's spacing
  uniform float uTwist;         // radians of shear per unit radius fraction
  uniform float uDroop;         // metres the whole disc sags at the rim
  uniform float uDepth;         // metres of out-of-plane node scatter
  uniform float uSlack;         // sag as a FRACTION of a strand's own span
  uniform float uSway;          // metres of breeze, out of plane
  uniform float uSwayRate;      // radians/second
  uniform float uSeed;

  /**
   * The dice for the strand between two nodes.
   *
   * Argument order matters and must match the CPU's: the film's four boundary
   * curves are the same four strands the strand mesh draws, and they only agree
   * if they roll the same number.
   */
  float webEdgeDice(vec2 a, vec2 b) {
    return hash11(dot(a, vec2(17.31, 5.77)) + dot(b, vec2(3.13, 29.71)) + uSeed * 1.7);
  }

  /** Node (ring, spoke) in world metres. Ring -1 is the hub. */
  vec3 webNode(vec2 rs) {
    float rings = max(uRings, 1.0);
    float spokes = max(uSpokes, 1.0);
    vec3 dice = hash31(uSeed * 3.11 + rs.x * 37.13 + rs.y * 7.31 + 5.77);

    float rho = clamp((rs.x + 1.0) / rings, 0.0, 1.0);
    rho = pow(rho, max(uRingCurve, 0.05));
    rho *= 1.0 + (dice.x - 0.5) * 2.0 * uRingJitter;

    float turn = rs.y / spokes + (dice.y - 0.5) * 2.0 * uSpokeJitter / spokes;
    float a = turn * TAU + uTwist * rho;

    vec2 pl = vec2(cos(a), sin(a)) * (rho * uRadius);
    pl.y *= uSquash;
    pl.y -= uDroop * rho * rho;
    float off = (dice.z - 0.5) * 2.0 * uDepth * rho;

    return uAnchor + uAxisX * pl.x + uAxisY * pl.y + uNormalAxis * (off * rho);
  }

  /**
   * A point at fraction u along the strand between two nodes.
   *
   * The sag is a fraction of the strand's OWN span, not a fixed drop. That is
   * the difference between a web and a net: a short chord near the hub hangs
   * almost straight while a two-metre outer chord bellies, which is what the
   * eye reads as tension. The first version used an absolute sag in metres and
   * every strand hung by the same amount, so the inner rings looked slack and
   * the whole thing read as knitting.
   */
  vec3 webEdge(vec3 a, vec3 b, float u, float dice) {
    vec3 p = mix(a, b, u);
    float span = length(b - a);
    float bow = 4.0 * u * (1.0 - u);
    p.y -= uSlack * span * bow * (0.55 + 0.9 * dice);
    p += uNormalAxis * (uSway * bow * sin(uTime * uSwayRate + dice * TAU + span * 1.7));
    return p;
  }

  vec3 webSafeNormalize(vec3 v, vec3 fallback) {
    float l2 = dot(v, v);
    return l2 > 1e-10 ? v * inversesqrt(l2) : fallback;
  }
`,I=`
  #define TAU 6.283185307179586

  uniform float uTime;
  uniform float uStrandWidth;   // metres
  uniform float uWidthJitter;   // +/- fraction
  uniform float uChordWidth;    // multiplier on chords, so radials read heavier
  uniform float uGrow;          // 0..1 of the web that has been spun
  uniform float uGrowFeather;   // 0..1 width of the spinning front

  attribute vec2 aFrom;         // (ring, spoke)
  attribute vec2 aTo;
  attribute vec2 aStrand;       // x order 0..1, y kind: 0 radial, 1 chord

  varying vec2  vUv;
  varying vec3  vTangent;
  varying vec3  vWorld;
  varying float vAlpha;
  varying float vDice;

  ${c}
  ${F}

  void main() {
    float drawn = smoothstep(aStrand.x, aStrand.x + max(uGrowFeather, 1e-3), clamp(uGrow, 0.0, 1.0));
    float u = min(position.x, drawn);

    vec3 a = webNode(aFrom);
    vec3 b = webNode(aTo);
    float dice = webEdgeDice(aFrom, aTo);

    vec3 p = webEdge(a, b, u, dice);
    // Central difference for the tangent rather than (b - a): the strand sags,
    // and a ribbon oriented off the chord twists visibly at the belly.
    const float du = 0.03;
    vec3 ahead = webEdge(a, b, min(u + du, 1.0), dice);
    vec3 behind = webEdge(a, b, max(u - du, 0.0), dice);
    vec3 tangent = webSafeNormalize(ahead - behind, vec3(0.0, 1.0, 0.0));

    vec3 view = webSafeNormalize(cameraPosition - p, vec3(0.0, 0.0, 1.0));
    vec3 across = webSafeNormalize(cross(tangent, view), vec3(1.0, 0.0, 0.0));

    float w = uStrandWidth
            * (1.0 + uWidthJitter * (dice - 0.5) * 2.0)
            * mix(1.0, uChordWidth, aStrand.y);
    vec3 world = p + across * (position.y * w * 0.5);

    vUv = uv;
    vTangent = tangent;
    vWorld = world;
    vDice = dice;
    vAlpha = step(0.002, drawn);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
  }
`,L=`
  uniform vec3  uLightDir;
  uniform float uGlobalGlow;
  uniform vec3  uStrandColor;
  uniform vec3  uSilkColor;
  uniform float uSilkPower;     // fibre highlight exponent
  uniform float uSilkGain;
  uniform float uStrandOpacity;
  uniform float uStrandGlow;
  uniform float uCoreBias;      // how much brighter the thread's spine is

  varying vec2  vUv;
  varying vec3  vTangent;
  varying vec3  vWorld;
  varying float vAlpha;
  varying float vDice;

  void main() {
    if (vAlpha < 0.004) discard;

    // The ribbon is flat; treating its across-coordinate as a cylinder's
    // cross-section is what stops it reading as tape.
    float across = vUv.y * 2.0 - 1.0;
    float round = sqrt(max(1.0 - across * across, 0.0));
    float alpha = vAlpha * uStrandOpacity * round;
    if (alpha < 0.004) discard;

    vec3 v = normalize(cameraPosition - vWorld);
    vec3 l = normalize(uLightDir);
    vec3 t = normalize(vTangent);

    float tl = dot(t, l);
    float tv = dot(t, v);
    float sinTL = sqrt(max(1.0 - tl * tl, 0.0));
    float sinTV = sqrt(max(1.0 - tv * tv, 0.0));
    float spec = pow(max(sinTL * sinTV - tl * tv, 0.0), max(uSilkPower, 1.0));

    vec3 colour = uStrandColor * (0.35 + 0.65 * sinTL);
    colour += uSilkColor * (spec * uSilkGain * (0.7 + 0.6 * vDice));
    colour *= mix(1.0, 1.0 + uCoreBias, round);
    colour *= uStrandGlow * uGlobalGlow;

    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 1.0));
  }
`,R=`
  #define TAU 6.283185307179586

  uniform float uTime;
  uniform float uDish;          // metres the film bellies between its threads
  uniform float uGrow;
  uniform float uGrowFeather;
  uniform float uOrderScatter;  // 0 the film fills ring by ring, 1 at random

  attribute vec2 aC0;           // inner ring, spoke j
  attribute vec2 aC1;           // inner ring, spoke j+1
  attribute vec2 aC2;           // outer ring, spoke j+1
  attribute vec2 aC3;           // outer ring, spoke j

  varying vec3  vNormal;
  varying vec3  vWorld;
  varying vec3  vDice;
  varying float vRho;
  varying float vAlpha;

  ${c}
  ${F}

  /**
   * A Coons patch over the face's four strands.
   *
   * Bilinear interpolation of the four *nodes* would give a flat quad whose
   * edges cut straight across the sag of the threads that bound it — the film
   * would visibly float off its own frame at every belly. A Coons patch is the
   * surface that interpolates four given boundary *curves* exactly, so the film
   * meets each of its four strands along its whole length, by construction. The
   * subtracted bilinear term is the correction that keeps the corners from
   * being counted twice; drop it and the patch bulges by exactly one corner.
   */
  vec3 filmPoint(vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec4 d, vec2 st, float dish) {
    float s = clamp(st.x, 0.0, 1.0);
    float t = clamp(st.y, 0.0, 1.0);
    vec3 inner = webEdge(c0, c1, s, d.x);
    vec3 outer = webEdge(c3, c2, s, d.y);
    vec3 left = webEdge(c0, c3, t, d.z);
    vec3 right = webEdge(c1, c2, t, d.w);
    vec3 corners = mix(mix(c0, c1, s), mix(c3, c2, s), t);
    vec3 p = mix(inner, outer, t) + mix(left, right, s) - corners;
    // Zero on all four edges, so dishing the film cannot break the seal.
    float bump = 16.0 * s * (1.0 - s) * t * (1.0 - t);
    return p + uNormalAxis * (dish * bump);
  }

  void main() {
    vec3 c0 = webNode(aC0);
    vec3 c1 = webNode(aC1);
    vec3 c2 = webNode(aC2);
    vec3 c3 = webNode(aC3);
    // The same four rolls the strand mesh makes for these same four edges.
    vec4 d = vec4(
      webEdgeDice(aC0, aC1),
      webEdgeDice(aC3, aC2),
      webEdgeDice(aC0, aC3),
      webEdgeDice(aC1, aC2)
    );

    vec3 dice = hash31(uSeed * 5.13 + aC0.x * 31.7 + aC0.y * 11.3 + 91.1);
    float dish = uDish * ((dice.x - 0.5) * 2.0);

    vec2 st = position.xy;
    vec3 world = filmPoint(c0, c1, c2, c3, d, st, dish);

    // Derivatives of the patch itself, so the normal knows about the sag and
    // the dish. Four extra evaluations; the alternative was a per-face constant
    // normal, and a flat normal on a bellied film kills the grazing term
    // exactly where the film is most visible.
    const float h = 0.09;
    vec3 ds = filmPoint(c0, c1, c2, c3, d, st + vec2(h, 0.0), dish)
            - filmPoint(c0, c1, c2, c3, d, st - vec2(h, 0.0), dish);
    vec3 dt = filmPoint(c0, c1, c2, c3, d, st + vec2(0.0, h), dish)
            - filmPoint(c0, c1, c2, c3, d, st - vec2(0.0, h), dish);
    vNormal = webSafeNormalize(cross(ds, dt), uNormalAxis);

    float rho = clamp((aC3.x + 1.0) / max(uRings, 1.0), 0.0, 1.0);
    float order = mix(rho, dice.y, clamp(uOrderScatter, 0.0, 1.0));
    vAlpha = smoothstep(order, order + max(uGrowFeather, 1e-3), clamp(uGrow, 0.0, 1.0));

    vWorld = world;
    vDice = dice;
    vRho = rho;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
  }
`,z=`
  uniform vec3  uLightDir;
  uniform float uGlobalGlow;

  uniform vec3  uFilmA;
  uniform vec3  uFilmB;
  uniform vec3  uFilmC;
  uniform vec3  uFilmD;
  uniform vec3  uFilmSheenColor;
  uniform float uGrazePower;    // higher is a thinner rim of visibility
  uniform float uFilmOpacity;
  uniform float uFilmBands;     // times round the gradient, head-on to edge-on
  uniform float uFilmShift;     // per-face offset along it
  uniform float uFilmSheen;
  uniform float uFilmSheenPower;
  uniform float uFilmFill;      // 0..1 of the faces that carry any film at all
  uniform float uTearBias;      // 1 tears the rim first, 0 tears evenly
  uniform float uFilmGlow;

  varying vec3  vNormal;
  varying vec3  vWorld;
  varying vec3  vDice;
  varying float vRho;
  varying float vAlpha;

  ${p}

  void main() {
    if (vAlpha < 0.004) discard;

    // Torn panels. A web with every face filled is a lampshade; the holes are
    // what say it was built by something and then walked through.
    float keep = uFilmFill * mix(1.0, 1.0 - vRho, clamp(uTearBias, 0.0, 1.0));
    if (vDice.z > keep) discard;

    vec3 n = normalize(vNormal);
    vec3 v = normalize(cameraPosition - vWorld);
    float graze = 1.0 - clamp(abs(dot(n, v)), 0.0, 1.0);

    float alpha = vAlpha * uFilmOpacity * pow(graze, max(uGrazePower, 0.1));
    if (alpha < 0.003) discard;

    float band = fract(graze * uFilmBands + vDice.y * uFilmShift);
    vec3 colour = gradient4(uFilmA, uFilmB, uFilmC, uFilmD, band);

    vec3 l = normalize(uLightDir);
    float sheen = pow(clamp(dot(reflect(-l, n), v), 0.0, 1.0), max(uFilmSheenPower, 1.0));
    colour += uFilmSheenColor * (sheen * uFilmSheen);
    colour *= uFilmGlow * uGlobalGlow;

    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 1.0));
  }
`;function B(){return{rings:5,spokes:12,radius:3.2,squash:.82,ringCurve:1.35,ringJitter:.12,spokeJitter:.22,twist:.25,droop:.35,depth:.28,slack:.09,sway:.05,swayRate:1.7,strandWidth:.02,widthJitter:.35,chordWidth:.75,strandOpacity:1,strandGlow:1.1,silkPower:22,silkGain:1.6,coreBias:.5,dish:.07,grazePower:2.6,filmOpacity:.55,filmBands:2.2,filmShift:.7,filmSheen:.8,filmSheenPower:34,filmFill:.8,tearBias:.65,filmGlow:1,grow:1,growFeather:.18,orderScatter:.25,strandColor:`#efe7d2`,silkColor:`#ffffff`,filmA:`#9fe8d8`,filmB:`#cfd2ff`,filmC:`#ffd9b0`,filmD:`#8fa8c8`,filmSheenColor:`#ffffff`}}var V=B(),H=class{constructor(o,c={}){let d=Math.max(1,Math.round(c.maxRings??8)),f=Math.max(3,Math.round(c.maxSpokes??16)),p=Math.max(2,Math.round(c.samples??10)),m=Math.max(1,Math.round(c.filmSubdiv??2));this.maxRings=d,this.maxSpokes=f,this.subdivision=m,this.group=new r,this.group.name=`WebGraph`,this.group.matrixAutoUpdate=!1,o?.add(this.group);let v={uAnchor:{value:new u},uAxisX:{value:new u(1,0,0)},uAxisY:{value:new u(0,1,0)},uNormalAxis:{value:new u(0,0,1)},uRings:{value:5},uSpokes:{value:12},uRadius:{value:3.2},uSquash:{value:.82},uRingCurve:{value:1.35},uRingJitter:{value:.12},uSpokeJitter:{value:.22},uTwist:{value:.25},uDroop:{value:.35},uDepth:{value:.28},uSlack:{value:.09},uSway:{value:.05},uSwayRate:{value:1.7},uSeed:{value:0},uGrow:{value:1},uGrowFeather:{value:.18}};this._shared=v;let y=d*f*2;this.maxStrands=y;let b=p+1,x=new Float32Array(b*2*3),S=new Float32Array(b*2*2);for(let e=0;e<b;e++){let t=e/p;for(let n=0;n<2;n++){let r=(e*2+n)*3,i=(e*2+n)*2;x[r+0]=t,x[r+1]=n===0?-1:1,x[r+2]=0,S[i+0]=t,S[i+1]=n}}let C=new Uint16Array(p*6);for(let e=0;e<p;e++){let t=e*2,n=e*6;C[n+0]=t,C[n+1]=t+2,C[n+2]=t+1,C[n+3]=t+1,C[n+4]=t+2,C[n+5]=t+3}this._aFrom=new a(new Float32Array(y*2),2),this._aTo=new a(new Float32Array(y*2),2),this._aStrand=new a(new Float32Array(y*2),2);let w=new e;w.setAttribute(`position`,new l(x,3)),w.setAttribute(`uv`,new l(S,2)),w.setAttribute(`aFrom`,this._aFrom),w.setAttribute(`aTo`,this._aTo),w.setAttribute(`aStrand`,this._aStrand),w.setIndex(new l(C,1)),w.instanceCount=0,w.boundingSphere=new n(new u,1e4),this.strandGeometry=w,this.strandMaterial=new t({transparent:!0,depthWrite:!1,depthTest:!0,blending:c.additive?2:1,side:2,toneMapped:!1,uniforms:i({...v,uStrandWidth:{value:.02},uWidthJitter:{value:.35},uChordWidth:{value:.75},uStrandColor:{value:new g(`#efe7d2`)},uSilkColor:{value:new g(`#ffffff`)},uSilkPower:{value:22},uSilkGain:{value:1.6},uStrandOpacity:{value:1},uStrandGlow:{value:1.1},uCoreBias:{value:.5}}),vertexShader:I,fragmentShader:L}),this.strandMesh=new _(w,this.strandMaterial),this.strandMesh.frustumCulled=!1,this.strandMesh.matrixAutoUpdate=!1,this.strandMesh.layers.set(s.VFX),this.strandMesh.renderOrder=(c.renderOrder??11)+1,this.group.add(this.strandMesh);let T=d*f;this.maxFaces=T;let E=(m+1)*(m+1);this._vertsPerFace=E,this._indexPerFace=m*m*6;let D=new Float32Array(T*E*3),O=[0,1,2,3].map(()=>new Float32Array(T*E*2)),k=new Uint16Array(T*this._indexPerFace);for(let e=0;e<T;e++){let t=e*E,n=e*this._indexPerFace;for(let e=0;e<m;e++)for(let r=0;r<m;r++){let i=t+e*(m+1)+r,a=t+(e+1)*(m+1)+r,o=t+(e+1)*(m+1)+r+1,s=t+e*(m+1)+r+1;k[n++]=i,k[n++]=a,k[n++]=o,k[n++]=i,k[n++]=o,k[n++]=s}}let A=new h;A.setAttribute(`position`,new l(D,3)),A.setAttribute(`aC0`,new l(O[0],2)),A.setAttribute(`aC1`,new l(O[1],2)),A.setAttribute(`aC2`,new l(O[2],2)),A.setAttribute(`aC3`,new l(O[3],2)),A.setIndex(new l(k,1)),A.setDrawRange(0,0),A.boundingSphere=new n(new u,1e4),this.filmGeometry=A,this._filmCorners=O,this.filmMaterial=new t({transparent:!0,depthWrite:!1,depthTest:!0,blending:c.additive?2:1,side:2,toneMapped:!1,uniforms:i({...v,uDish:{value:.07},uOrderScatter:{value:.25},uFilmA:{value:new g(`#9fe8d8`)},uFilmB:{value:new g(`#cfd2ff`)},uFilmC:{value:new g(`#ffd9b0`)},uFilmD:{value:new g(`#8fa8c8`)},uFilmSheenColor:{value:new g(`#ffffff`)},uGrazePower:{value:2.6},uFilmOpacity:{value:.55},uFilmBands:{value:2.2},uFilmShift:{value:.7},uFilmSheen:{value:.8},uFilmSheenPower:{value:34},uFilmFill:{value:.8},uTearBias:{value:.65},uFilmGlow:{value:1}}),vertexShader:R,fragmentShader:z}),this.filmMesh=new _(A,this.filmMaterial),this.filmMesh.frustumCulled=!1,this.filmMesh.matrixAutoUpdate=!1,this.filmMesh.layers.set(s.VFX),this.filmMesh.renderOrder=c.renderOrder??11,this.group.add(this.filmMesh),this._topology=-1,this.strands=0,this.faces=0,this.seed=0,this._p=B(),this._rebuild(5,12)}get drawCalls(){return 2}get count(){return this.strands}roll(e=Math.random()*100){return this.seed=e,this._shared.uSeed.value=e,this}reset(){this.strandGeometry.instanceCount=0,this.filmGeometry.setDrawRange(0,0),this.strandMesh.visible=!1,this.filmMesh.visible=!1}setPlacement(e,t,n){let r=this._shared;return r.uAnchor.value.copy(e),b.copy(t),b.lengthSq()<1e-8&&b.set(0,0,1),b.normalize(),x.copy(n??S.set(0,1,0)),x.lengthSq()<1e-8&&x.set(0,1,0),x.addScaledVector(b,-x.dot(b)),x.lengthSq()<1e-8&&x.set(0,1,0).addScaledVector(b,-b.y),x.normalize(),C.crossVectors(x,b).normalize(),r.uNormalAxis.value.copy(b),r.uAxisY.value.copy(x),r.uAxisX.value.copy(C),this}_rebuild(e,t){let n=this._aFrom.array,r=this._aTo.array,i=this._aStrand.array,a=0;for(let o=0;o<e;o++){let s=.45*((o+1)/e);for(let e=0;e<t;e++)n[a*2]=o-1,n[a*2+1]=e,r[a*2]=o,r[a*2+1]=e,i[a*2]=s,i[a*2+1]=0,a++}for(let o=0;o<e;o++){let s=.5+.5*(1-(o+1)/e);for(let e=0;e<t;e++)n[a*2]=o,n[a*2+1]=e,r[a*2]=o,r[a*2+1]=(e+1)%t,i[a*2]=s,i[a*2+1]=1,a++}this.strands=a,this._aFrom.needsUpdate=!0,this._aTo.needsUpdate=!0,this._aStrand.needsUpdate=!0,this.strandGeometry.instanceCount=a;let o=this.subdivision,s=this._vertsPerFace,c=this.filmGeometry.attributes.position.array,[l,u,d,f]=this._filmCorners,p=0;for(let n=0;n<e;n++)for(let e=0;e<t;e++){let r=(e+1)%t,i=p*s;for(let t=0;t<=o;t++)for(let a=0;a<=o;a++){let s=i+t*(o+1)+a;c[s*3+0]=t/o,c[s*3+1]=a/o,c[s*3+2]=0,l[s*2]=n-1,l[s*2+1]=e,u[s*2]=n-1,u[s*2+1]=r,d[s*2]=n,d[s*2+1]=r,f[s*2]=n,f[s*2+1]=e}p++}this.faces=p,this.filmGeometry.attributes.position.needsUpdate=!0;for(let e of[`aC0`,`aC1`,`aC2`,`aC3`])this.filmGeometry.attributes[e].needsUpdate=!0;this.filmGeometry.setDrawRange(0,p*this._indexPerFace)}update(e,t){let n=this._p,r=t??V;for(let e in V){let t=r[e];n[e]=t===void 0?V[e]:t}let i=f(Math.round(n.rings),1,this.maxRings),a=f(Math.round(n.spokes),3,this.maxSpokes),o=i*1024+a;o!==this._topology&&(this._topology=o,this._rebuild(i,a));let s=this._shared;s.uRings.value=i,s.uSpokes.value=a,s.uRadius.value=n.radius,s.uSquash.value=n.squash,s.uRingCurve.value=n.ringCurve,s.uRingJitter.value=n.ringJitter,s.uSpokeJitter.value=n.spokeJitter,s.uTwist.value=n.twist,s.uDroop.value=n.droop,s.uDepth.value=n.depth,s.uSlack.value=n.slack,s.uSway.value=n.sway,s.uSwayRate.value=n.swayRate,s.uGrow.value=n.grow,s.uGrowFeather.value=n.growFeather;let c=this.strandMaterial.uniforms;c.uStrandWidth.value=n.strandWidth,c.uWidthJitter.value=n.widthJitter,c.uChordWidth.value=n.chordWidth,c.uSilkPower.value=n.silkPower,c.uSilkGain.value=n.silkGain,c.uStrandOpacity.value=n.strandOpacity,c.uStrandGlow.value=n.strandGlow,c.uCoreBias.value=n.coreBias,U(c.uStrandColor.value,n.strandColor),U(c.uSilkColor.value,n.silkColor);let l=this.filmMaterial.uniforms;l.uDish.value=n.dish,l.uOrderScatter.value=n.orderScatter,l.uGrazePower.value=n.grazePower,l.uFilmOpacity.value=n.filmOpacity,l.uFilmBands.value=n.filmBands,l.uFilmShift.value=n.filmShift,l.uFilmSheen.value=n.filmSheen,l.uFilmSheenPower.value=n.filmSheenPower,l.uFilmFill.value=n.filmFill,l.uTearBias.value=n.tearBias,l.uFilmGlow.value=n.filmGlow,U(l.uFilmA.value,n.filmA),U(l.uFilmB.value,n.filmB),U(l.uFilmC.value,n.filmC),U(l.uFilmD.value,n.filmD),U(l.uFilmSheenColor.value,n.filmSheenColor);let u=n.grow>.001&&n.radius>0;this.strandMesh.visible=u&&n.strandOpacity>0&&n.strandWidth>0,this.filmMesh.visible=u&&n.filmOpacity>0&&n.filmFill>0}nodePoint(e,t,n,r){let i=Math.max(1,Math.round(n.rings??V.rings)),a=Math.max(3,Math.round(n.spokes??V.spokes)),o=n.radius??V.radius,s=Math.max(n.ringCurve??V.ringCurve,.05),c=m((e+1)/i)**+s,l=t/a*w+(n.twist??V.twist)*c,u=this._shared,d=Math.cos(l)*c*o,f=Math.sin(l)*c*o*(n.squash??V.squash)-(n.droop??V.droop)*c*c;return r.copy(u.uAnchor.value).addScaledVector(u.uAxisX.value,d).addScaledVector(u.uAxisY.value,f)}dispose(){this.strandGeometry.dispose(),this.strandMaterial.dispose(),this.filmGeometry.dispose(),this.filmMaterial.dispose(),this.group.parent?.remove(this.group)}};function U(e,t){e.copy(typeof t==`string`?o(t):t)}function W(e,t,n){let r=Math.max(3,Math.round(e)),i=f(1-t,.05,.98),a=f(1-n,.02,.98),o=r*18,s=new Float32Array(o*3),c=new Float32Array(o*3),l=new Float32Array(o),u=new Uint16Array(r*24),d=0,p=0,m=(e,t,n,r,i,a,o)=>(s[d*3]=e,s[d*3+1]=t,s[d*3+2]=n,c[d*3]=r,c[d*3+1]=i,c[d*3+2]=a,l[d]=o,d++),h=(e,t,n,r)=>{u[p++]=e,u[p++]=t,u[p++]=n,u[p++]=e,u[p++]=n,u[p++]=r},g=(e,t,n)=>{u[p++]=e,u[p++]=t,u[p++]=n};for(let e=0;e<r;e++){let t=(e+.5)/r*w,n=(e+1.5)/r*w,o=Math.cos(t),s=Math.sin(t),c=Math.cos(n),l=Math.sin(n),u=o+c,d=s+l,f=Math.hypot(u,d)||1,p=u/f,_=d/f;h(m(o,0,s,p,0,_,0),m(c,0,l,p,0,_,0),m(c,1,l,p,0,_,0),m(o,1,s,p,0,_,0)),h(m(o,1,s,0,1,0,1),m(c,1,l,0,1,0,1),m(c*i,1,l*i,0,1,0,1),m(o*i,1,s*i,0,1,0,1)),h(m(o*i,1,s*i,-p,0,-_,2),m(c*i,1,l*i,-p,0,-_,2),m(c*i,a,l*i,-p,0,-_,2),m(o*i,a,s*i,-p,0,-_,2)),g(m(0,a,0,0,1,0,3),m(o*i,a,s*i,0,1,0,3),m(c*i,a,l*i,0,1,0,3)),g(m(0,0,0,0,-1,0,4),m(c,0,l,0,-1,0,4),m(o,0,s,0,-1,0,4))}return{position:s,normal:c,kind:l,index:u,vertexCount:d,indexCount:p}}var te=`
  #define PI  3.141592653589793
  #define TAU 6.283185307179586

  uniform vec3  uAnchor;        // metres
  uniform vec3  uAxisX;         // unit
  uniform vec3  uAxisZ;         // unit
  uniform float uNow;           // seconds since the cast began

  uniform float uCellPitch;     // metres between adjacent cell centres
  uniform float uCellRadius;    // metres, circumradius of one cell
  uniform float uSizeJitter;    // +/- fraction
  uniform float uHeightBase;    // metres, a cell far from the seed
  uniform float uHeightPeak;    // metres, a cell at the seed
  uniform float uHeightFalloff; // LATTICE UNITS over which peak decays to base
  uniform float uLayerHeight;   // metres between stacked layers
  uniform float uBaseY;         // metres, the floor the comb sits on
  uniform float uRise;          // metres a cell climbs out of the floor as it lands

  uniform float uStagger;       // seconds between one cell and the next
  uniform float uGrowTime;      // seconds one cell takes to land
  uniform float uOvershoot;     // fraction it overshoots by on the way
  uniform float uRetract;       // 1 fully built, 0 fully withdrawn

  attribute vec3 aCell;         // x, y in LATTICE UNITS; z the layer index
  attribute vec4 aCellInfo;     // turn fraction, order index, dice, lattice radius

  varying vec3  vNormal;
  varying vec3  vWorld;
  varying float vKind;
  varying float vDice;
  varying float vRadius;
  varying float vFlash;
  varying float vEmerge;

  attribute float aKind;

  ${c}

  void main() {
    float dice = aCellInfo.z;
    float birth = aCellInfo.y * uStagger;
    float e = clamp((uNow - birth) / max(uGrowTime, 1e-3), 0.0, 1.0);
    // Cubic ease out, then an overshoot that is zero at both ends — so the cell
    // punches past its height and settles onto it exactly, rather than settling
    // onto whatever the overshoot happened to leave behind.
    float ease = 1.0 - pow(1.0 - e, 3.0);
    float grow = ease * (1.0 + uOvershoot * sin(PI * e) * (1.0 - e));
    grow *= clamp(uRetract, 0.0, 1.0);

    float far = clamp(aCellInfo.w / max(uHeightFalloff, 0.01), 0.0, 1.0);
    float h = mix(uHeightPeak, uHeightBase, far) * (1.0 + uSizeJitter * (dice - 0.5) * 2.0);
    float radius = uCellRadius * (1.0 + uSizeJitter * (hash11(dice * 31.7) - 0.5) * 2.0);

    float turn = aCellInfo.x * TAU;
    mat2 spin = rot2(turn);
    vec2 local = spin * position.xz * radius;
    // Swizzling a constructor is legal and compiles here and fails somewhere
    // else; two statements cost nothing and cannot be got wrong.
    vec2 nrmXZ = spin * normal.xz;
    vec3 nrm = vec3(nrmXZ.x, normal.y, nrmXZ.y);

    vec2 centre = aCell.xy * uCellPitch;
    float y = uBaseY + aCell.z * uLayerHeight + position.y * h * grow - (1.0 - ease) * uRise;

    vec3 world = uAnchor
               + uAxisX * (centre.x + local.x)
               + uAxisZ * (centre.y + local.y);
    world.y = y;

    vNormal = normalize(uAxisX * nrm.x + vec3(0.0, 1.0, 0.0) * nrm.y + uAxisZ * nrm.z);
    vWorld = world;
    vKind = aKind;
    vDice = dice;
    vRadius = aCellInfo.w;
    vEmerge = e;
    // The flash is the moment of landing, and it is a function of e rather than
    // of the clock: a cell that has not been reached yet has never flashed, and
    // one whose stagger was dragged forward under a paused frame flashes now.
    vFlash = pow(1.0 - e, 3.0) * step(0.001, e);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
  }
`,ne=`
  uniform vec3  uLightDir;
  uniform float uGlobalGlow;

  uniform vec3  uCombA;
  uniform vec3  uCombB;
  uniform vec3  uCombC;
  uniform vec3  uCombD;
  uniform vec3  uCoreColor;
  uniform vec3  uRimColor;
  uniform vec3  uSheenColor;
  uniform vec3  uFlashColor;

  uniform float uTintRadius;    // LATTICE UNITS over which the gradient is walked
  uniform float uTintJitter;
  uniform float uWrap;
  uniform float uRimPow;
  uniform float uRimGain;
  uniform float uSheenPow;
  uniform float uSheenGain;
  uniform float uCoreGlow;      // how hot the recess is
  uniform float uFlashGain;
  uniform float uGlow;

  varying vec3  vNormal;
  varying vec3  vWorld;
  varying float vKind;
  varying float vDice;
  varying float vRadius;
  varying float vFlash;
  varying float vEmerge;

  ${p}
  ${E}

  void main() {
    if (vEmerge < 0.001) discard;

    vec3 n = normalize(vNormal);
    vec3 v = normalize(cameraPosition - vWorld);
    vec3 l = normalize(uLightDir);

    float t = clamp(vRadius / max(uTintRadius, 0.01) + (vDice - 0.5) * 2.0 * uTintJitter, 0.0, 1.0);
    vec3 body = gradient4(uCombA, uCombB, uCombC, uCombD, t);

    vec3 colour = chitin(n, v, l, body, uRimColor, uSheenColor,
                         uWrap, uRimPow, uRimGain, uSheenPow, uSheenGain);

    // Only the recess glows. A cell lit all over is a lantern; a cell with a
    // hot hole in it is a hive, and the read comes entirely from the rim being
    // dark against it.
    float core = step(1.5, vKind);
    colour += uCoreColor * (core * uCoreGlow * (0.55 + 0.45 * vDice));
    colour += uFlashColor * (vFlash * uFlashGain);
    colour *= uGlow * uGlobalGlow;

    gl_FragColor = vec4(colour, 1.0);
  }
`,G=2048;function K(){return{cells:120,seed:0,drift:.16,refuse:.94,climb:.15,outward:.55,layers:4,pitch:.34,cellRadius:.2,sizeJitter:.12,heightBase:.22,heightPeak:1.1,heightFalloff:5,layerHeight:.26,baseY:0,rise:.35,stagger:.012,growTime:.22,overshoot:.28,retract:1,tintRadius:7,tintJitter:.14,wrap:.45,rimPow:3.2,rimGain:.5,sheenPow:42,sheenGain:.6,coreGlow:.7,flashGain:1.4,glow:1,combA:`#e8d27a`,combB:`#c8a03c`,combC:`#8a6218`,combD:`#3a2a10`,coreColor:`#ffd24a`,rimColor:`#fff0b0`,sheenColor:`#fffbe8`,flashColor:`#fff6c8`}}var q=K(),re=class{constructor(o,c={}){this.capacity=Math.max(1,Math.round(c.capacity??192)),this.group=new r,this.group.name=`LatticeGrowth`,this.group.matrixAutoUpdate=!1,o?.add(this.group);let d=W(c.sides??6,c.wall??.24,c.recess??.62),f=new e;f.setAttribute(`position`,new l(d.position,3)),f.setAttribute(`normal`,new l(d.normal,3)),f.setAttribute(`aKind`,new l(d.kind,1)),f.setIndex(new l(d.index,1)),this._aCell=new a(new Float32Array(this.capacity*3),3),this._aInfo=new a(new Float32Array(this.capacity*4),4),f.setAttribute(`aCell`,this._aCell),f.setAttribute(`aCellInfo`,this._aInfo),f.instanceCount=0,f.boundingSphere=new n(new u,1e4),this.geometry=f,this.material=new t({transparent:!1,depthWrite:!0,depthTest:!0,side:2,toneMapped:!1,uniforms:i({uAnchor:{value:new u},uAxisX:{value:new u(1,0,0)},uAxisZ:{value:new u(0,0,1)},uNow:{value:0},uCellPitch:{value:.34},uCellRadius:{value:.2},uSizeJitter:{value:.12},uHeightBase:{value:.22},uHeightPeak:{value:1.1},uHeightFalloff:{value:5},uLayerHeight:{value:.26},uBaseY:{value:0},uRise:{value:.35},uStagger:{value:.012},uGrowTime:{value:.22},uOvershoot:{value:.28},uRetract:{value:1},uCombA:{value:new g(`#e8d27a`)},uCombB:{value:new g(`#c8a03c`)},uCombC:{value:new g(`#8a6218`)},uCombD:{value:new g(`#3a2a10`)},uCoreColor:{value:new g(`#ffd24a`)},uRimColor:{value:new g(`#fff0b0`)},uSheenColor:{value:new g(`#fffbe8`)},uFlashColor:{value:new g(`#fff6c8`)},uTintRadius:{value:7},uTintJitter:{value:.14},uWrap:{value:.45},uRimPow:{value:3.2},uRimGain:{value:.5},uSheenPow:{value:42},uSheenGain:{value:.6},uCoreGlow:{value:.7},uFlashGain:{value:1.4},uGlow:{value:1}}),vertexShader:te,fragmentShader:ne}),this.mesh=new _(f,this.material),this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=!1,this.mesh.layers.set(s.WORLD),this.mesh.renderOrder=c.renderOrder??2,this.mesh.castShadow=c.castShadow??!0,this.mesh.receiveShadow=c.receiveShadow??!0,this.group.add(this.mesh),this._x=new Float32Array(this.capacity),this._z=new Float32Array(this.capacity),this._layer=new Int32Array(this.capacity),this._turn=new Float32Array(this.capacity),this._rad=new Float32Array(this.capacity),this._head=new Int32Array(G),this._next=new Int32Array(this.capacity),this.cells=0,this._structure={cells:-1,seed:0,drift:-1,refuse:-1,climb:-1,outward:-1,layers:-1},this._p=K()}get drawCalls(){return 1}get count(){return this.cells}reset(){this.geometry.instanceCount=0,this.mesh.visible=!1}setPlacement(e,t){let n=this.material.uniforms;return n.uAnchor.value.copy(e),b.copy(t??x.set(0,0,1)),b.y=0,b.lengthSq()<1e-8&&b.set(0,0,1),b.normalize(),n.uAxisZ.value.copy(b),n.uAxisX.value.set(b.z,0,-b.x),this}_bucket(e,t,n){return(e*73856093^t*19349663^n*83492791)>>>0&G-1}_refused(e,t,n,r){let i=r*r,a=Math.floor(e),o=Math.floor(t);for(let r=-1;r<=1;r++)for(let s=-1;s<=1;s++){let c=this._head[this._bucket(a+r,o+s,n)];for(;c>=0;){if(this._layer[c]===n){let n=this._x[c]-e,r=this._z[c]-t;if(n*n+r*r<i)return!0}c=this._next[c]}}return!1}_grow(e,t,n,r,i,a,o){this._head.fill(-1);let s=(e,t,n,r,i)=>{this._x[i]=e,this._z[i]=t,this._layer[i]=n,this._turn[i]=r,this._rad[i]=Math.hypot(e,t);let a=this._bucket(Math.floor(e),Math.floor(t),n);this._next[i]=this._head[a],this._head[a]=i};s(0,0,0,d(t*3.7)*n,0);let c=1,l=0,u=0,f=e*16;for(let p=0;p<f&&c<e;p++){l>=c&&(l=0,u=0);let e=l,f=this._x[e],p=this._z[e],m=this._layer[e],h=this._turn[e],g=Math.hypot(f,p),_=-1e9,v=0,y=0,b=0,x=0,S=!1;for(let s=0;s<7;s++){let l,u,C,T,E;if(s===6){if(i<=0||m+1>=o)continue;l=f,u=p,C=m+1,T=h,E=d(t+e*5.13+77.1)*.5+i*2-1}else{let r=h+(d(t+c*7.13+s*2.71)-.5)*n,i=(s/6+h)*w;l=f+Math.cos(i),u=p+Math.sin(i),C=m,T=r;let o=Math.hypot(l,u)-g;E=d(t+e*13.77+s*4.31)+a*o}E<=_||this._refused(l,u,C,r)||(_=E,v=l,y=u,b=C,x=T,S=!0)}if(!S){l++,u=0;continue}s(v,y,b,x,c),c++,u++,u>=3&&(l++,u=0)}this.cells=c;let p=this._aCell.array,m=this._aInfo.array;for(let e=0;e<c;e++)p[e*3]=this._x[e],p[e*3+1]=this._z[e],p[e*3+2]=this._layer[e],m[e*4]=this._turn[e],m[e*4+1]=e,m[e*4+2]=d(t+e*1.913+.37),m[e*4+3]=this._rad[e];this._aCell.needsUpdate=!0,this._aInfo.needsUpdate=!0,this.geometry.instanceCount=c}update(e,t){let n=this._p,r=t??q;for(let e in q){let t=r[e];n[e]=t===void 0?q[e]:t}let i=f(Math.round(n.cells),1,this.capacity),a=Math.max(1,Math.round(n.layers)),o=this._structure;(o.cells!==i||o.seed!==n.seed||o.drift!==n.drift||o.refuse!==n.refuse||o.climb!==n.climb||o.outward!==n.outward||o.layers!==a)&&(o.cells=i,o.seed=n.seed,o.drift=n.drift,o.refuse=n.refuse,o.climb=n.climb,o.outward=n.outward,o.layers=a,this._grow(i,n.seed,Math.max(n.drift,0),Math.max(n.refuse,.01),m(n.climb),n.outward,a));let s=this.material.uniforms;s.uNow.value=e,s.uCellPitch.value=n.pitch,s.uCellRadius.value=n.cellRadius,s.uSizeJitter.value=n.sizeJitter,s.uHeightBase.value=n.heightBase,s.uHeightPeak.value=n.heightPeak,s.uHeightFalloff.value=n.heightFalloff,s.uLayerHeight.value=n.layerHeight,s.uBaseY.value=n.baseY,s.uRise.value=n.rise,s.uStagger.value=n.stagger,s.uGrowTime.value=n.growTime,s.uOvershoot.value=n.overshoot,s.uRetract.value=n.retract,s.uTintRadius.value=n.tintRadius,s.uTintJitter.value=n.tintJitter,s.uWrap.value=n.wrap,s.uRimPow.value=n.rimPow,s.uRimGain.value=n.rimGain,s.uSheenPow.value=n.sheenPow,s.uSheenGain.value=n.sheenGain,s.uCoreGlow.value=n.coreGlow,s.uFlashGain.value=n.flashGain,s.uGlow.value=n.glow,U(s.uCombA.value,n.combA),U(s.uCombB.value,n.combB),U(s.uCombC.value,n.combC),U(s.uCombD.value,n.combD),U(s.uCoreColor.value,n.coreColor),U(s.uRimColor.value,n.rimColor),U(s.uSheenColor.value,n.sheenColor),U(s.uFlashColor.value,n.flashColor),this.mesh.visible=this.cells>0&&n.retract>0&&n.cellRadius>0}cellPoint(e,t,n,r=1){let i=f(Math.round(e),0,Math.max(0,this.cells-1)),a=this.material.uniforms,o=t.pitch??q.pitch,s=m(this._rad[i]/Math.max(t.heightFalloff??q.heightFalloff,.01)),c=(t.heightPeak??q.heightPeak)*(1-s)+(t.heightBase??q.heightBase)*s;return n.copy(a.uAnchor.value).addScaledVector(a.uAxisX.value,this._x[i]*o).addScaledVector(a.uAxisZ.value,this._z[i]*o),n.y=(t.baseY??q.baseY)+this._layer[i]*(t.layerHeight??q.layerHeight)+c*r,n}dispose(){this.geometry.dispose(),this.material.dispose(),this.group.parent?.remove(this.group)}},J=12,Y=74,X=12*J,Z=2.2,ie=`
  #define PI 3.141592653589793

  uniform vec3  uAnchor;        // metres
  uniform vec3  uAxisX;         // unit
  uniform vec3  uAxisZ;         // unit
  uniform float uNow;           // seconds since the cast began

  uniform vec3  uRadius;        // metres — three, so the dome can be an ellipsoid
  uniform float uThickness;     // metres a plate is extruded inward
  uniform float uSeam;          // 0..1 the rim is drawn in toward the plate centre
  uniform float uFlyOut;        // metres a plate starts out from its locked place
  uniform float uTumbleSpin;    // radians it starts rotated about its own axis
  uniform float uTumbleSwing;   // radians it starts tipped off the dome
  uniform float uStagger;       // seconds between one plate locking and the next
  uniform float uLockTime;      // seconds one plate takes to arrive
  uniform float uOrderScatter;  // 0 they lock from the ground up, 1 at random
  uniform float uRetract;       // 1 the dome is closed, 0 it is gone

  attribute vec3 aDir;          // unit: this vertex on the sphere
  attribute vec3 aCentre;       // unit: the plate's own centre
  attribute vec3 aNrm;          // unit: the face normal, in the sphere's frame
  attribute vec3 aFace;         // x side 0 outer / 1 inner, y rim, z side wall
  attribute vec3 aPlate;        // orderY, orderHash, dice

  varying vec3  vNormal;
  varying vec3  vWorld;
  varying float vWall;
  varying float vDice;
  varying float vHeight;
  varying float vLock;

  ${c}

  /** Rotate v about a unit axis. Rodrigues, three terms, no matrix. */
  vec3 shellRotate(vec3 v, vec3 axis, float a) {
    float c = cos(a);
    float s = sin(a);
    return v * c + cross(axis, v) * s + axis * (dot(axis, v) * (1.0 - c));
  }

  void main() {
    float dice = aPlate.z;
    float order = mix(aPlate.x, aPlate.y, clamp(uOrderScatter, 0.0, 1.0));
    float e = clamp((uNow - order * uStagger) / max(uLockTime, 1e-3), 0.0, 1.0);
    float ease = 1.0 - pow(1.0 - e, 3.0);
    // Everything the fly-in does is multiplied by k, and k is exactly zero when
    // the plate has landed. That is the guarantee the whole module exists for:
    // no easing curve, no overshoot and no tumble can leave a plate a
    // millimetre off the tessellation, because at e = 1 none of them apply.
    float k = 1.0 - ease;

    // The seam is drawn on the UNIT sphere before any of the metres arrive, so
    // two neighbours inset by the same fraction of their own cell and the gap
    // between them stays even all the way round.
    vec3 dir = normalize(mix(aDir, aCentre, clamp(uSeam, 0.0, 1.0)));
    vec3 nrm = aNrm;
    vec3 centre = aCentre;

    vec3 tangent = normalize(cross(aCentre, vec3(0.0, 1.0, 0.0)) + vec3(1e-4, 0.0, 1e-4));
    float spin = uTumbleSpin * k * ((hash11(dice * 17.3) - 0.5) * 2.0);
    float swing = uTumbleSwing * k * ((dice - 0.5) * 2.0);

    dir = shellRotate(dir, aCentre, spin);
    nrm = shellRotate(nrm, aCentre, spin);
    dir = shellRotate(dir, tangent, swing);
    nrm = shellRotate(nrm, tangent, swing);
    centre = shellRotate(centre, tangent, swing);

    vec3 rad = max(uRadius - aFace.x * uThickness, vec3(0.01));
    vec3 local = dir * rad + centre * (uFlyOut * k);
    local *= clamp(uRetract, 0.0, 1.0);

    // An ellipsoid's normal is not its radial direction. One divide fixes it,
    // and without it a squashed dome lights as though it were a sphere.
    vec3 fixedNrm = normalize(nrm / rad);

    vec3 world = uAnchor
               + uAxisX * local.x
               + vec3(0.0, 1.0, 0.0) * local.y
               + uAxisZ * local.z;

    vNormal = normalize(uAxisX * fixedNrm.x + vec3(0.0, 1.0, 0.0) * fixedNrm.y + uAxisZ * fixedNrm.z);
    vWorld = world;
    vWall = aFace.z;
    vDice = dice;
    vHeight = clamp(aCentre.y, 0.0, 1.0);
    vLock = ease;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
  }
`,ae=`
  uniform vec3  uLightDir;
  uniform float uGlobalGlow;

  uniform vec3  uPlateA;
  uniform vec3  uPlateB;
  uniform vec3  uPlateC;
  uniform vec3  uPlateD;
  uniform vec3  uRimColor;
  uniform vec3  uSheenColor;
  uniform vec3  uSeamColor;
  uniform vec3  uArriveColor;

  uniform float uTintHeight;    // how much of the gradient the dome's height walks
  uniform float uTintJitter;
  uniform float uWrap;
  uniform float uRimPow;
  uniform float uRimGain;
  uniform float uSheenPow;
  uniform float uSheenGain;
  uniform float uSeamGlow;      // how hot the side walls are
  uniform float uArriveGain;    // flash as a plate locks
  uniform float uGlow;

  varying vec3  vNormal;
  varying vec3  vWorld;
  varying float vWall;
  varying float vDice;
  varying float vHeight;
  varying float vLock;

  ${p}
  ${E}

  void main() {
    if (vLock < 0.001) discard;

    vec3 n = normalize(vNormal);
    vec3 v = normalize(cameraPosition - vWorld);
    vec3 l = normalize(uLightDir);

    float t = clamp(vHeight * uTintHeight + (vDice - 0.5) * 2.0 * uTintJitter, 0.0, 1.0);
    vec3 body = gradient4(uPlateA, uPlateB, uPlateC, uPlateD, t);

    vec3 colour = chitin(n, v, l, body, uRimColor, uSheenColor,
                         uWrap, uRimPow, uRimGain, uSheenPow, uSheenGain);

    // The side walls are the seams, and the seams are the point: they are the
    // only evidence that the dome is made of separate plates at all once it has
    // closed. Lighting them from inside is cheaper and reads better than trying
    // to find the seam in screen space.
    colour += uSeamColor * (vWall * uSeamGlow);
    colour += uArriveColor * (pow(1.0 - vLock, 3.0) * uArriveGain);
    colour *= uGlow * uGlobalGlow;

    gl_FragColor = vec4(colour, 1.0);
  }
`;function Q(){return{sites:46,seed:0,jitter:.35,radiusX:3.2,radiusY:2.4,radiusZ:3.2,thickness:.12,seam:.045,flyOut:2.6,tumbleSpin:1.9,tumbleSwing:1.1,stagger:.013,lockTime:.34,orderScatter:.3,retract:1,tintHeight:.85,tintJitter:.16,wrap:.35,rimPow:3,rimGain:.65,sheenPow:56,sheenGain:.9,seamGlow:.35,arriveGain:1.6,glow:1,plateA:`#5a4a22`,plateB:`#8a7028`,plateC:`#c8a83c`,plateD:`#e8d888`,rimColor:`#fff2c0`,sheenColor:`#ffffff`,seamColor:`#ffb43a`,arriveColor:`#fff0b8`}}var $=Q(),oe=class{constructor(e,a={}){this.capacity=f(Math.round(a.capacity??64),12,400),this.group=new r,this.group.name=`PlateShell`,this.group.matrixAutoUpdate=!1,e?.add(this.group);let o=this.capacity*Y;this._aDir=new l(new Float32Array(o*3),3),this._aCentre=new l(new Float32Array(o*3),3),this._aNrm=new l(new Float32Array(o*3),3),this._aFaceAttr=new l(new Float32Array(o*3),3),this._aPlate=new l(new Float32Array(o*3),3);let c=new h;c.setAttribute(`position`,new l(new Float32Array(o*3),3)),c.setAttribute(`aDir`,this._aDir),c.setAttribute(`aCentre`,this._aCentre),c.setAttribute(`aNrm`,this._aNrm),c.setAttribute(`aFace`,this._aFaceAttr),c.setAttribute(`aPlate`,this._aPlate);let d=new Uint16Array(this.capacity*X),p=J;for(let e=0;e<this.capacity;e++){let t=e*Y,n=t,r=t+1,i=t+1+p,a=t+2+p,o=t+2+2*p,s=e*X;for(let e=0;e<p;e++){let t=(e+1)%p;d[s++]=n,d[s++]=r+e,d[s++]=r+t,d[s++]=i,d[s++]=a+t,d[s++]=a+e;let c=o+e*4;d[s++]=c,d[s++]=c+1,d[s++]=c+2,d[s++]=c,d[s++]=c+2,d[s++]=c+3}}c.setIndex(new l(d,1)),c.setDrawRange(0,0),c.boundingSphere=new n(new u,1e4),this.geometry=c,this.material=new t({transparent:!1,depthWrite:!0,depthTest:!0,side:0,toneMapped:!1,uniforms:i({uAnchor:{value:new u},uAxisX:{value:new u(1,0,0)},uAxisZ:{value:new u(0,0,1)},uNow:{value:0},uRadius:{value:new u(3.2,2.4,3.2)},uThickness:{value:.12},uSeam:{value:.045},uFlyOut:{value:2.6},uTumbleSpin:{value:1.9},uTumbleSwing:{value:1.1},uStagger:{value:.013},uLockTime:{value:.34},uOrderScatter:{value:.3},uRetract:{value:1},uPlateA:{value:new g(`#5a4a22`)},uPlateB:{value:new g(`#8a7028`)},uPlateC:{value:new g(`#c8a83c`)},uPlateD:{value:new g(`#e8d888`)},uRimColor:{value:new g(`#fff2c0`)},uSheenColor:{value:new g(`#ffffff`)},uSeamColor:{value:new g(`#ffb43a`)},uArriveColor:{value:new g(`#fff0b8`)},uTintHeight:{value:.85},uTintJitter:{value:.16},uWrap:{value:.35},uRimPow:{value:3},uRimGain:{value:.65},uSheenPow:{value:56},uSheenGain:{value:.9},uSeamGlow:{value:.35},uArriveGain:{value:1.6},uGlow:{value:1}}),vertexShader:ie,fragmentShader:ae}),this.mesh=new _(c,this.material),this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=!1,this.mesh.layers.set(s.WORLD),this.mesh.renderOrder=a.renderOrder??2,this.mesh.castShadow=a.castShadow??!0,this.mesh.receiveShadow=a.receiveShadow??!1,this.group.add(this.mesh);let m=J*4;this._sites=new Float32Array(this.capacity*3),this._centres=new Float32Array(this.capacity*3),this._poly=new Float32Array(this.capacity*J*3),this._polyCount=new Int32Array(this.capacity),this._clipA=new Float32Array(m*3),this._clipB=new Float32Array(m*3),this._slots=m,this.plates=0,this._structure={sites:-1,seed:0,jitter:-1},this._p=Q()}get drawCalls(){return 1}get count(){return this.plates}reset(){this.geometry.setDrawRange(0,0),this.mesh.visible=!1}setPlacement(e,t){let n=this.material.uniforms;return n.uAnchor.value.copy(e),b.copy(t??x.set(0,0,1)),b.y=0,b.lengthSq()<1e-8&&b.set(0,0,1),b.normalize(),n.uAxisZ.value.copy(b),n.uAxisX.value.set(b.z,0,-b.x),this}_clip(e,t,n,r,i,a){let o=0;for(let s=0;s<t;s++){let c=(s+1)%t,l=e[s*3],u=e[s*3+1],d=e[s*3+2],f=e[c*3],p=e[c*3+1],m=e[c*3+2],h=l*r+u*i+d*a,g=f*r+p*i+m*a,_=h<=0;if(_&&o<this._slots&&(n[o*3]=l,n[o*3+1]=u,n[o*3+2]=d,o++),_!==g<=0&&o<this._slots){let e=h/(h-g);n[o*3]=l+(f-l)*e,n[o*3+1]=u+(p-u)*e,n[o*3+2]=d+(m-d)*e,o++}}return o}tessellate(e,t,n){let r=f(Math.round(e),12,this.capacity),i=this._sites;for(let e=0;e<r;e++){let a=(e+.5)/r,o=Math.sqrt(Math.max(1-a*a,0)),s=e*T+t,c=Math.cos(s)*o,l=Math.sin(s)*o,u=a;if(n>0){let i=n/Math.sqrt(r);c+=(d(t+e*3.71)-.5)*2*i,u+=(d(t+e*7.13+5.1)-.5)*2*i,l+=(d(t+e*11.9+9.7)-.5)*2*i,u=Math.abs(u)}let f=Math.hypot(c,u,l)||1;i[e*3]=c/f,i[e*3+1]=u/f,i[e*3+2]=l/f}let a=0;for(let e=0;e<r;e++){let t=i[e*3],n=i[e*3+1],o=i[e*3+2];b.set(t,n,o),x.set(0,1,0),Math.abs(n)>.9&&x.set(1,0,0),S.crossVectors(x,b).normalize(),C.crossVectors(b,S).normalize();let s=this._clipA,c=this._clipB,l=8;for(let e=0;e<8;e++){let r=e/8*w,i=t+(S.x*Math.cos(r)+C.x*Math.sin(r))*Z,a=n+(S.y*Math.cos(r)+C.y*Math.sin(r))*Z,c=o+(S.z*Math.cos(r)+C.z*Math.sin(r))*Z;s[e*3]=i,s[e*3+1]=a,s[e*3+2]=c}for(let a=0;a<r&&l>=3;a++){if(a===e)continue;l=this._clip(s,l,c,i[a*3]-t,i[a*3+1]-n,i[a*3+2]-o);let r=s;s=c,c=r}if(l>=3){l=this._clip(s,l,c,0,-1,0);let e=s;s=c,c=e}if(l<3){this._polyCount[a]=0;continue}let u=Math.min(l,J),d=0,f=0,p=0;for(let e=0;e<u;e++){let t=s[e*3],n=s[e*3+1],r=s[e*3+2],i=Math.hypot(t,n,r)||1,o=(a*J+e)*3;this._poly[o]=t/i,this._poly[o+1]=n/i,this._poly[o+2]=r/i,d+=t/i,f+=n/i,p+=r/i}let m=Math.hypot(d,f,p)||1;this._centres[a*3]=d/m,this._centres[a*3+1]=f/m,this._centres[a*3+2]=p/m,this._polyCount[a]=u,a++}return this.plates=a,this._writeVertices(t),this.geometry.setDrawRange(0,a*X),a}_writeVertices(e){let t=J,n=this._aDir.array,r=this._aCentre.array,i=this._aNrm.array,a=this._aFaceAttr.array,o=this._aPlate.array;for(let s=0;s<this.plates;s++){let c=this._polyCount[s],l=s*Y,u=this._centres[s*3],p=this._centres[s*3+1],m=this._centres[s*3+2],h=d(e+s*2.713+.91),g=1-f(p,0,1),_=d(e+s*5.317+13.3),v=(e,t,s,c,d,f,v,y,b,x)=>{let S=(l+e)*3;n[S]=t,n[S+1]=s,n[S+2]=c,r[S]=u,r[S+1]=p,r[S+2]=m,i[S]=d,i[S+1]=f,i[S+2]=v,a[S]=y,a[S+1]=b,a[S+2]=x,o[S]=g,o[S+1]=_,o[S+2]=h};v(0,u,p,m,u,p,m,0,0,0),v(13,u,p,m,-u,-p,-m,1,0,0);for(let e=0;e<t;e++){let n=Math.min(e,c-1),r=this._poly[(s*t+n)*3],i=this._poly[(s*t+n)*3+1],a=this._poly[(s*t+n)*3+2];v(1+e,r,i,a,u,p,m,0,1,0),v(14+e,r,i,a,-u,-p,-m,1,1,0)}for(let e=0;e<t;e++){let n=Math.min(e,c-1),r=e+1<c?e+1:e+1===c?0:n,i=this._poly[(s*t+n)*3],a=this._poly[(s*t+n)*3+1],o=this._poly[(s*t+n)*3+2],l=this._poly[(s*t+r)*3],d=this._poly[(s*t+r)*3+1],f=this._poly[(s*t+r)*3+2];b.set(l-i,d-a,f-o),x.set(u,p,m),S.crossVectors(b,x),S.lengthSq()<1e-12&&S.set(i-u,a-p,o-m),S.normalize(),C.set((i+l)*.5-u,(a+d)*.5-p,(o+f)*.5-m),S.dot(C)<0&&S.multiplyScalar(-1);let h=26+e*4;v(h,i,a,o,S.x,S.y,S.z,0,1,1),v(h+1,l,d,f,S.x,S.y,S.z,0,1,1),v(h+2,l,d,f,S.x,S.y,S.z,1,1,1),v(h+3,i,a,o,S.x,S.y,S.z,1,1,1)}}this._aDir.needsUpdate=!0,this._aCentre.needsUpdate=!0,this._aNrm.needsUpdate=!0,this._aFaceAttr.needsUpdate=!0,this._aPlate.needsUpdate=!0}update(e,t){let n=this._p,r=t??$;for(let e in $){let t=r[e];n[e]=t===void 0?$[e]:t}let i=f(Math.round(n.sites),12,this.capacity),a=this._structure;(a.sites!==i||a.seed!==n.seed||a.jitter!==n.jitter)&&(a.sites=i,a.seed=n.seed,a.jitter=n.jitter,this.tessellate(i,n.seed,Math.max(n.jitter,0)));let o=this.material.uniforms;o.uNow.value=e,o.uRadius.value.set(n.radiusX,n.radiusY,n.radiusZ),o.uThickness.value=n.thickness,o.uSeam.value=n.seam,o.uFlyOut.value=n.flyOut,o.uTumbleSpin.value=n.tumbleSpin,o.uTumbleSwing.value=n.tumbleSwing,o.uStagger.value=n.stagger,o.uLockTime.value=n.lockTime,o.uOrderScatter.value=n.orderScatter,o.uRetract.value=n.retract,o.uTintHeight.value=n.tintHeight,o.uTintJitter.value=n.tintJitter,o.uWrap.value=n.wrap,o.uRimPow.value=n.rimPow,o.uRimGain.value=n.rimGain,o.uSheenPow.value=n.sheenPow,o.uSheenGain.value=n.sheenGain,o.uSeamGlow.value=n.seamGlow,o.uArriveGain.value=n.arriveGain,o.uGlow.value=n.glow,U(o.uPlateA.value,n.plateA),U(o.uPlateB.value,n.plateB),U(o.uPlateC.value,n.plateC),U(o.uPlateD.value,n.plateD),U(o.uRimColor.value,n.rimColor),U(o.uSheenColor.value,n.sheenColor),U(o.uSeamColor.value,n.seamColor),U(o.uArriveColor.value,n.arriveColor),this.mesh.visible=this.plates>0&&n.retract>0}progress(e,t){let n=t.stagger??$.stagger,r=Math.max(t.lockTime??$.lockTime,.001);return m(e/(Math.max(this.plates-1,1)*n+r))}plateCentre(e,t,n){let r=f(Math.round(e),0,Math.max(0,this.plates-1)),i=this.material.uniforms,a=this._centres[r*3],o=this._centres[r*3+1],s=this._centres[r*3+2],c=(t.radiusX??$.radiusX)*a,l=(t.radiusY??$.radiusY)*o,u=(t.radiusZ??$.radiusZ)*s;return n.copy(i.uAnchor.value).addScaledVector(i.uAxisX.value,c).addScaledVector(i.uAxisZ.value,u),n.y+=l,n}dispose(){this.geometry.dispose(),this.material.dispose(),this.group.parent?.remove(this.group)}};export{H as a,Q as c,oe as i,B as l,ee as n,P as o,re as r,K as s,D as t};
//# sourceMappingURL=Colony-TW2PdEk1.js.map