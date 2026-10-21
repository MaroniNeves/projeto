import{Br as e,K as t,M as n,N as r,R as i,V as a,Y as o,fi as s,q as c,ui as l,xt as u,yn as d}from"./settings-DdywqLlV.js";import"./SceneHooks-DvEWF-72.js";import{n as f,t as p}from"./quads-DpYMEt67.js";var m=Object.freeze({PLATE:0,RUNE:1,POCK:2,RUT:3,WET:4,PUSTULE:5,FUNNEL:6,SCOUR:7,LATTICE:8,POOL:9}),h=Object.freeze([`PLATE`,`RUNE`,`POCK`,`RUT`,`WET`,`PUSTULE`,`FUNNEL`,`SCOUR`,`LATTICE`,`POOL`]),g=4,_=-.34,v=0,y=.34,b=.55,x=0,S=-.55,C=Math.PI,w=[[`seg`,_,x,_,b],[`seg`,_,S,_,x],[`seg`,y,x,y,b],[`seg`,y,S,y,x],[`seg`,_,b,y,b],[`seg`,_,x,y,x],[`seg`,_,S,y,S],[`seg`,v,x,v,b],[`seg`,v,S,v,x],[`seg`,_,b,v,x],[`seg`,y,b,v,x],[`seg`,v,x,_,S],[`seg`,v,x,y,S],[`arc`,v,.24,.3,0,C],[`arc`,v,-.24,.3,C,C],[`arc`,v,x,.36,-C*.5,C],[`arc`,v,x,.36,C*.5,C],[`arc`,v,x,.15,0,C*2],[`seg`,_,b,-.1,.28],[`seg`,y,S,.1,-.28],[`seg`,v,x,y,x],[`seg`,_,b,v,b],[`arc`,v,.3,.12,0,C*2],[`arc`,v,-.3,.12,0,C*2]],T=[[0,1,4,5],[0,1,15],[7,8,4,11,12],[5,17],[13,14,17],[5,9,12],[0,1,2,3,4],[9,10,11,12,17],[6,7,16],[4,9,12],[5,15,16],[2,3,16],[0,1,4,6],[6,8,13],[7,8,9,10],[4,5,11,12],[0,1,20,22],[7,8,21,19],[2,3,4,18],[5,22,23],[13,14,8],[0,1,12,23],[4,6,7,8],[16,20,6]],E=T.length,D=T.map(e=>e.reduce((e,t)=>e+2**t,0)),O=e=>Number.isInteger(e)?`${e}.0`:`${e}`,k=D.map((e,t)=>`    code += ${O(e)} * step(abs(index - ${O(t)}), 0.5);`).join(`
`),A=w.map((e,t)=>`    count += gfBit(code, ${O(t)});`).join(`
`),j=w.map((e,t)=>`${`    on = gfBit(code, ${O(t)});
    if (on > 0.5) {
      part = clamp(draw * count - order, 0.0, 1.0);
      order += 1.0;`}\n${e[0]===`seg`?`      if (part > 0.002) gfSeg(g, vec2(${O(e[1])}, ${O(e[2])}),
          mix(vec2(${O(e[1])}, ${O(e[2])}), vec2(${O(e[3])}, ${O(e[4])}), part), w, sd, grad);`:`      if (part > 0.002) gfArc(g, vec2(${O(e[1])}, ${O(e[2])}), ${O(e[3])},
          ${O(e[4])}, ${O(e[5])} * part, w, sd, grad);`}\n    }`).join(`
`),M=`
  uniform vec3 uLightDir;      // world space, toward the sun

  ${n}

  varying float vDisrupt;      // spellbreak's field — see vfx/SceneHooks.js
  varying vec2  vUv;
  varying vec3  vLight;        // key direction, in the quad's frame
  varying vec3  vView;         // fragment → camera, in the quad's frame
  varying float vViewZ;

  void main() {
    vUv = uv;

    vec4 world = modelMatrix * vec4(position, 1.0);

    vec3 ax = normalize(modelMatrix[0].xyz);
    vec3 ay = normalize(modelMatrix[1].xyz);
    vec3 az = normalize(modelMatrix[2].xyz);

    vLight = normalize(vec3(dot(uLightDir, ax), dot(uLightDir, ay), dot(uLightDir, az)));

    vec3 toCamera = cameraPosition - world.xyz;
    vView = normalize(vec3(dot(toCamera, ax), dot(toCamera, ay), dot(toCamera, az)));

    // Opt-in to the disruption field. Four vertices per quad, so this is the
    // cheapest opt-in in the library: one distance, four times, per mark.
    vDisrupt = disruptAt(world.xyz);

    vec4 mv = viewMatrix * world;
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,N=`
  ${n}
  varying float vDisrupt;

  #define PI  3.141592653589793
  #define TAU 6.283185307179586

  #define GF_PLATE   0
  #define GF_RUNE    1
  #define GF_POCK    2
  #define GF_RUT     3
  #define GF_WET     4
  #define GF_PUSTULE 5
  #define GF_FUNNEL  6
  #define GF_SCOUR   7
  #define GF_LATTICE 8
  #define GF_POOL    9

  uniform float uTime;

  /* ---- the anchor and its footprint ---- */
  uniform vec2  uQuadSize;     // metres the quad covers: x across, y downrange
  uniform float uRadius;       // the mark's radius, metres — live, never captured
  uniform float uLength;       // RUT: length of the track, metres
  uniform float uSeed;

  /* ---- the growth front ---- */
  uniform float uGrow;         // 0..1 how far the front has reached
  uniform float uRecede;       // 0..1 how far the *outside* has been eaten back
  uniform float uEdge;         // metres of feather on that front
  uniform float uRagged;       // fraction of the radius the front wanders by
  uniform float uRaggedScale;  // lobes per metre
  uniform float uWarp;         // metres of domain warp on the lobes

  /* ---- how the fake relief is lit ---- */
  uniform float uRelief;       // how hard the height field tilts the normal
  uniform float uNormalStep;   // metres between the height taps
  uniform float uAmbient;      // 0..1 floor on the diffuse term
  uniform float uWrap;         // 0..1 wraps the terminator round the back
  uniform float uSpecular;
  uniform float uGloss;        // Blinn exponent
  uniform float uParallax;     // metres of view-driven offset on interior detail

  /* ---- the shared shape vocabulary (per-mode meaning in GroundField.js) ---- */
  uniform float uCell;         // metres — plate / blister / hex / groove pitch
  uniform float uCellJitter;   // 0..1 lattice disorder
  uniform float uSeam;         // metres — gap or blend width between cells
  uniform float uThickness;    // metres — sheet, trace, rim, meniscus
  uniform float uLift;         // metres — how far the substance stands proud
  uniform float uDepth;        // metres — how far it goes down
  uniform float uWidth;        // metres — track / groove half-width
  uniform float uSharp;        // 0..1 profile hardness
  uniform float uDetail;       // 0..1 fine grain
  uniform float uSwirl;        // rotational shear / lateral wander
  uniform float uArms;         // count — scour arms
  uniform float uSpeed;        // events or radians per second
  uniform float uFlow;         // metres per second of surface drift
  uniform vec2  uWind;         // unit, in the quad's frame: downwind / flow

  /* ---- output ---- */
  uniform float uFade;
  uniform float uOpacity;
  uniform float uEmissive;
  uniform float uDepthFade;    // metres
  uniform vec3  uColorBase;
  uniform vec3  uColorEdge;
  uniform vec3  uColorGlow;
  uniform vec3  uColorDeep;

  uniform float uGlobalGlow;
  uniform vec2  uResolution;
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;

  #if GF_MODE == GF_RUNE
    uniform float uRings;        // how many nested rings, 1..4
    uniform float uRingInner;    // innermost ring, as a fraction of the radius
    uniform float uGlyphSize;    // metres, em box height — a real measurement
    uniform float uGlyphStroke;  // metres, half-width of a stroke
    uniform float uGlyphGap;     // slot pitch, in glyph widths
    uniform float uSpin;         // radians/second, ring 0
    uniform float uSpinFalloff;  // how much slower each ring out turns
    uniform float uRule;         // metres, half-width of the compass circles
    uniform float uInscribe;     // 0..1 how much of the seal has been inked
    uniform float uIgnite;       // 0..1 ignition front, inner ring first
    uniform float uScorch;       // 0..1 how far the seal has burnt down to a scar

    /* ---- the armature: chords struck across the seal, and a tick collar ---- */
    uniform float uArmStart;     // 0..1 point in the inscription the armature begins
    uniform float uArmRadius;    // armature circle, as a fraction of uRadius
    uniform float uArmSides;     // how many chords are struck around it
    uniform float uArmTangent;   // apothem as a fraction of the armature radius
    uniform float uArmStroke;    // metres, half-width of an armature line
    uniform float uArmPhase;     // radians, where the first chord starts
    uniform float uArmSpin;      // radians/second the armature turns
    uniform float uTickCount;    // ticks in the collar
    uniform float uTickRadius;   // collar radius, as a fraction of uRadius
    uniform float uTickLength;   // metres, a minor tick
    uniform float uTickStroke;   // metres, half-width of a tick
    uniform float uTickMajor;    // every Nth tick is a long one
    uniform float uTickMajorLen; // metres of extra length on a major tick

    /* ---- the central sigil: larger than anything else, and drawn last ---- */
    uniform float uSigilStart;   // 0..1 point in the inscription the sigil begins
    uniform float uSigilRadius;  // metres, how far the rosette glyph sits out
    uniform float uSigilSize;    // metres, its em box — deliberately not uGlyphSize
    uniform float uSigilArms;    // rotational symmetry of the rosette
    uniform float uSigilStroke;  // metres, half-width of a sigil stroke
    uniform float uSigilRing;    // metres, the circle enclosing the sigil
    uniform float uSigilSpin;    // radians/second the sigil turns
  #endif

  #if GF_MODE == GF_POCK || GF_MODE == GF_RUT
    /**
     * Up to GF_MARKS events: xy is a **unitless** position (fractions of the
     * radius, in the anchor's frame), z is the timestamp it fired at and w
     * is its strength. Nothing here carries a metre, so the marks re-place
     * themselves when the radius slider moves — which is the point.
     */
    uniform vec4  uMarks[GF_MARKS];
    uniform float uMarkCount;
    uniform float uMarkLife;     // seconds a mark takes to weather away
    uniform float uMarkRadius;   // metres, radius of a full-strength mark
  #endif

  #if GF_MODE == GF_RUT
    uniform float uProgress;     // 0..1 how far the body has rolled
  #endif

  varying vec2  vUv;
  varying vec3  vLight;
  varying vec3  vView;
  varying float vViewZ;

  ${o}
  ${c}

  /* ------------------------------------------------------------------ */
  /* Shared field helpers                                                */
  /* ------------------------------------------------------------------ */

  /**
   * Voronoi that also reports how far it is to the *wall* of the cell.
   *
   * noise.glsl.js#voronoi2 returns F1 and an id, which is enough to stipple
   * with and not enough to build plates out of: a plate needs its own outline,
   * and the outline is where two sites are equidistant. Half the F1/F2 gap is
   * the standard cheap estimate of that — not exact near a corner, and nobody
   * has ever noticed on a sheet of ice.
   */
  float gfCells(vec2 p, float jitter, out float wall, out vec2 site, out float id) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    float d1 = 8.0;
    float d2 = 8.0;
    site = n;
    id = 0.0;

    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = mix(vec2(0.5), hash21(dot(n + g, vec2(7.13, 113.17))), jitter);
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          site = n + g + o;
          id = hash11(dot(n + g, vec2(31.7, 57.1)));
        } else if (d < d2) {
          d2 = d;
        }
      }
    }

    d1 = sqrt(d1);
    wall = (sqrt(d2) - d1) * 0.5;
    return d1;
  }

  /**
   * Hex lattice. xy is the offset from the nearest cell centre, zw is that
   * centre, both in cell units (circumradius 1). Two interleaved rectangular
   * lattices, nearest wins — the honeycomb falls out of the pair.
   */
  vec4 gfHex(vec2 p) {
    const vec2 s = vec2(1.7320508, 3.0);
    const vec2 h = vec2(0.8660254, 1.5);
    vec2 ca = (floor(p / s) + 0.5) * s;
    vec2 cb = (floor((p - h) / s) + 0.5) * s + h;
    vec2 a = p - ca;
    vec2 b = p - cb;
    return dot(a, a) < dot(b, b) ? vec4(a, ca) : vec4(b, cb);
  }

  /** Hex radial distance: 0 at the centre, 0.8660254 on every one of the six flats. */
  float gfHexRadius(vec2 p) {
    p = abs(p);
    return max(p.x, dot(p, vec2(0.5, 0.8660254)));
  }

  /**
   * The growth front, folded into the distance so every mode compares one
   * number against one front.
   *
   * The wander is sampled **in the plane** and domain warped. Sampled on
   * atan(y, x) it would hand every radius along a bearing the same value and
   * the front would open as a star with dead-straight arms — a firework, not a
   * spreading substance. The bolt's ground burn made that mistake, the snare's
   * field inherited the fix, and it is written down here so the next forty
   * abilities inherit it too.
   *
   * The wander scales with uRadius, so a 2 m mark and an 8 m mark are ragged
   * by the same *proportion* and both stay recognisable when the slider moves.
   */
  float gfReach(vec2 q, float d) {
    vec2 w = vec2(
      fbm3(vec3(q * uRaggedScale * 0.5, uSeed)),
      fbm3(vec3(q * uRaggedScale * 0.5, uSeed + 5.7))
    ) * uWarp;
    float lobes = fbm3(vec3((q + w) * uRaggedScale, uSeed + 13.0));
    return d - lobes * uRagged * uRadius;
  }

  /* ------------------------------------------------------------------ */
  /* PLATE — sheet ice                                                   */
  /* ------------------------------------------------------------------ */
  #if GF_MODE == GF_PLATE

  /**
   * Metres of relief for a raft of interlocking plates.
   *
   * The plate is a *sheet*: a couple of centimetres of body everywhere, cut
   * along the cell walls, plus a curl that rises toward whichever wall is
   * downwind. Hinging the lift on the wind rather than on the cell id is what
   * makes a field of these read as one event — paper curling off a hot pan,
   * all of it peeling the same way — instead of as scattered debris.
   */
  float gfHeight(vec2 q) {
    float wall;
    vec2 site;
    float id;
    gfCells(q / max(uCell, 0.02), uCellJitter, wall, site, id);

    float wallM = wall * uCell;                       // metres to the plate edge
    float along = dot(q - site * uCell, uWind);       // metres downwind of the centre

    float body = uThickness * smoothstep(0.0, max(uSeam, 0.001), wallM);
    float downwind = smoothstep(-uCell * 0.15, uCell * 0.75, along);
    float lipness = 1.0 - smoothstep(0.0, max(uCell * 0.45, 0.01), wallM);
    float curl = uLift * downwind * lipness * lipness * (0.55 + 0.9 * id);

    // Frozen spray settles in the seams and roughens the top face.
    float grain = snoise(vec3(q * 6.0, uSeed)) * uDetail * uThickness * 0.6;
    return body + curl * smoothstep(0.0, max(uSeam * 0.4, 0.001), wallM) + grain;
  }

  #endif

  /* ------------------------------------------------------------------ */
  /* RUNE — the alphabet                                                 */
  /* ------------------------------------------------------------------ */
  #if GF_MODE == GF_RUNE

  /**
   * Bit i of a stroke set. Codes run to 2^18, which a highp float holds
   * exactly (integers are exact to 2^24); three compiles fragment shaders at
   * highp by default and this is the one thing in the file that depends on it.
   */
  float gfBit(float code, float i) {
    return mod(floor(code / exp2(i)), 2.0);
  }

  /**
   * One stroke of the nib, accumulated into sd — and into grad, the unit
   * direction *away* from the nearest point on the winning stroke.
   *
   * That gradient is the trick that makes the seal cheap. Every other mode
   * pays three evaluations of its height field for a normal; a signed distance
   * field already knows which way is out, so the incision can be bevelled and
   * lit off one evaluation. Three taps through eighteen strokes and four rings
   * would have been the most expensive fragment in the project.
   *
   * The width swells toward the middle of the stroke and tapers into its ends,
   * which is what gives the letterforms terminals instead of sawn-off tubes.
   */
  void gfSeg(vec2 p, vec2 a, vec2 b, float w, inout float sd, inout vec2 grad) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-7), 0.0, 1.0);
    vec2 r = pa - ba * h;
    float len = length(r);
    float d = len - w * (0.62 + 0.38 * sqrt(max(sin(h * PI), 0.0)));
    if (d < sd) {
      sd = d;
      grad = len > 1e-5 ? r / len : vec2(0.0, 1.0);
    }
  }

  /** The same, on an arc — bowls and counters. span is already scaled by the ink. */
  void gfArc(vec2 p, vec2 c, float r, float a0, float span, float w, inout float sd, inout vec2 grad) {
    vec2 q = p - c;
    float a = atan(q.y, q.x);
    float rel = mod(a - a0 + TAU * 2.0, TAU);
    float len = length(q);

    float d;
    vec2 dir;
    if (rel <= span) {
      dir = len > 1e-5 ? q / len : vec2(1.0, 0.0);
      float side = len - r;
      d = abs(side) - w;
      dir *= sign(side + 1e-6);
    } else {
      // Outside the wedge the nearest point is a terminal, so the arc gets the
      // same round cap a segment does and the two kinds of stroke join cleanly.
      vec2 e0 = c + vec2(cos(a0), sin(a0)) * r;
      vec2 e1 = c + vec2(cos(a0 + span), sin(a0 + span)) * r;
      vec2 r0 = p - e0;
      vec2 r1 = p - e1;
      vec2 rn = dot(r0, r0) < dot(r1, r1) ? r0 : r1;
      float ln = length(rn);
      d = ln - w;
      dir = ln > 1e-5 ? rn / ln : vec2(0.0, 1.0);
    }

    if (d < sd) {
      sd = d;
      grad = dir;
    }
  }

  /**
   * One glyph, in its own em box, inked to draw.
   *
   * code selects the stroke set; the strokes are unrolled from
   * GLYPH_STROKES at module load — see the note there for why the obvious
   * table lookup is not portable.
   */
  float gfGlyph(vec2 g, float index, float draw, float w, out vec2 grad) {
    float code = 0.0;
${k}

    float count = 0.0;
${A}
    count = max(count, 1.0);

    float sd = 1e4;
    float order = 0.0;
    float on = 0.0;
    float part = 0.0;
    grad = vec2(0.0, 1.0);

${j}

    return sd;
  }

  #endif

  /* ------------------------------------------------------------------ */
  /* POCK — craters                                                      */
  /* ------------------------------------------------------------------ */
  #if GF_MODE == GF_POCK

  /**
   * Craters, accumulated.
   *
   * Depth combines with min and rims with +: two hits landing on the same
   * spot dig one hole and pile two lips, which is what happens. Summing the
   * bowls instead would punch a well twice as deep as the ordnance.
   *
   * The gate is the snare's octave trick — a step per slot rather than a
   * break, because a fixed trip count is what every compiler agrees on and
   * an unused slot costs one multiply.
   */
  float gfHeight(vec2 q) {
    float h = 0.0;
    float rims = 0.0;

    for (int i = 0; i < GF_MARKS; i++) {
      float on = step(float(i), uMarkCount - 1.0);
      vec4 m = uMarks[i];

      vec2 c = m.xy * uRadius;                        // unitless → metres, live
      float age = max(uTime - m.z, 0.0);
      float dig = 1.0 - exp(-age * max(uSpeed, 0.1)); // the crater digs itself in
      float weather = 1.0 - smoothstep(uMarkLife * 0.4, uMarkLife, age);

      float rad = max(uMarkRadius * (0.35 + 0.65 * m.w) * dig, 0.02);
      float r = length(q - c) / rad;

      float bowl = -uDepth * m.w * max(0.0, 1.0 - r * r) * weather;
      float lip = (r - 1.0) / max(uThickness / rad, 1e-3);
      float rim = uLift * m.w * exp(-lip * lip) * weather;

      h = mix(h, min(h, bowl), on);
      rims += on * rim;
    }

    float grain = snoise(vec3(q * (2.0 + uDetail * 8.0), uSeed)) * uDetail * uThickness * 0.5;
    return h + rims + grain;
  }

  /** Union coverage of every crater, 0..1 — the mask the colour rides on. */
  float gfPockCover(vec2 q) {
    float cover = 0.0;
    for (int i = 0; i < GF_MARKS; i++) {
      float on = step(float(i), uMarkCount - 1.0);
      vec4 m = uMarks[i];
      float age = max(uTime - m.z, 0.0);
      float dig = 1.0 - exp(-age * max(uSpeed, 0.1));
      float rad = max(uMarkRadius * (0.35 + 0.65 * m.w) * dig, 0.02);
      float r = length(q - m.xy * uRadius) / rad;
      float weather = 1.0 - smoothstep(uMarkLife * 0.5, uMarkLife, age);
      cover = max(cover, on * smoothstep(1.25, 0.85, r) * weather);
    }
    return cover;
  }

  /** How hot the freshest crater under this fragment still is, 0..1. */
  float gfPockHeat(vec2 q) {
    float heat = 0.0;
    for (int i = 0; i < GF_MARKS; i++) {
      float on = step(float(i), uMarkCount - 1.0);
      vec4 m = uMarks[i];
      float age = max(uTime - m.z, 0.0);
      float rad = max(uMarkRadius * (0.35 + 0.65 * m.w), 0.02);
      float r = length(q - m.xy * uRadius) / rad;
      heat = max(heat, on * smoothstep(1.0, 0.2, r) * exp(-age * max(uSpeed, 0.1) * 0.6));
    }
    return heat;
  }

  #endif

  /* ------------------------------------------------------------------ */
  /* RUT — the gouged track                                              */
  /* ------------------------------------------------------------------ */
  #if GF_MODE == GF_RUT

  /**
   * Where the track is, laterally, s fractions down it.
   *
   * A sine would be a slalom. This is one axis of a noise field sampled along
   * the track in metres, so the body drifts the way a heavy thing rolling over
   * uneven ground drifts — and it stays put when the length slider moves,
   * because the lookup is in metres rather than in fractions.
   */
  float gfTrack(float s) {
    return fbm3(vec3(17.0, s * uLength * max(uRaggedScale, 0.01) * 0.35, uSeed)) * uSwirl;
  }

  /**
   * Contact force at s, interpolated from the samples the ability posted.
   *
   * With no samples at all it returns 1 — a rut of constant depth — so an
   * ability can use this mode without bothering to weigh its own boulder.
   */
  float gfForce(float s) {
    float acc = 0.0;
    float wsum = 0.0;
    for (int i = 0; i < GF_MARKS; i++) {
      float on = step(float(i), uMarkCount - 1.0);
      vec4 m = uMarks[i];
      float dz = (s - m.y) * uLength / max(uSeam, 0.05);
      float k = on * exp(-dz * dz);
      acc += k * m.w;
      wsum += k;
    }
    return wsum > 1e-4 ? acc / wsum : 1.0;
  }

  /** Metres of relief: a gouge, two spoil ridges, and the body's own chatter. */
  float gfHeight(vec2 q) {
    float s = clamp((q.y + uLength * 0.5) / max(uLength, 0.01), 0.0, 1.0);
    float off = abs(q.x - gfTrack(s));
    float force = gfForce(s);

    float floorProfile = smoothstep(uWidth, uWidth * mix(0.9, 0.1, uSharp), off);
    float gouge = -uDepth * force * floorProfile;

    // The body is round, so it prints its own circumference into the soft floor.
    float chatter = 0.5 + 0.5 * sin(s * uLength / max(uCell, 0.05) * TAU);
    gouge *= 1.0 - uDetail * 0.35 * chatter;

    float sp = (off - uWidth) / max(uThickness, 0.02);
    float spoil = uLift * force * exp(-sp * sp) * (0.7 + 0.6 * snoise01(vec3(q * 3.0, uSeed)));

    float behind = smoothstep(uProgress + 0.01, uProgress - 0.01, s);
    return (gouge + spoil) * behind;
  }

  #endif

  /* ------------------------------------------------------------------ */
  /* WET — soaked stone                                                  */
  /* ------------------------------------------------------------------ */
  #if GF_MODE == GF_WET

  /**
   * Almost flat. What relief there is exists to bend the specular: standing
   * water fills the low spots, so the puddles are where the sheen is, and a
   * millimetre of height difference is enough to sell it.
   */
  float gfHeight(vec2 q) {
    float pool = fbm3(vec3(q * max(uCell, 0.05), uSeed)) * 0.5 + 0.5;
    float ripple = snoise(vec3((q - uWind * uFlow * uTime) * 9.0, uTime * uSpeed * 0.2));
    return -uDepth * pool + uLift * ripple * uDetail;
  }

  #endif

  /* ------------------------------------------------------------------ */
  /* PUSTULE — blisters                                                  */
  /* ------------------------------------------------------------------ */
  #if GF_MODE == GF_PUSTULE

  /** Where a cell is in its own cycle: 0 flat, ~0.8 taut, then it goes. */
  float gfPhase(float id) {
    return fract(uTime * uSpeed * (0.55 + 0.9 * id) + id * 7.13 + uSeed);
  }

  /**
   * A dome that inflates and a crater that replaces it.
   *
   * Each cell runs its own clock off its own id hash, which is the entire
   * effect: a field on one clock pulses like a heartbeat and reads as a
   * material property, a field on N clocks has *events* in it and reads as
   * something alive. The collapse is four times faster than the swell, because
   * a blister does not deflate, it bursts.
   */
  float gfHeight(vec2 q) {
    float wall;
    vec2 site;
    float id;
    float f1 = gfCells(q / max(uCell, 0.02), uCellJitter, wall, site, id);

    float phase = gfPhase(id);
    float inflate = smoothstep(0.0, 0.72, phase);
    float burst = smoothstep(0.76, 0.84, phase);

    float profile = max(0.0, 1.0 - f1 * f1 / 0.36);
    float dome = uLift * (0.35 + 0.75 * id) * inflate * (1.0 - burst) * sqrt(profile);
    float crater = uDepth * burst * (1.0 - smoothstep(0.0, 0.5, f1)) * (1.0 - smoothstep(0.9, 1.0, phase));

    float skin = snoise(vec3(q * 5.0, uSeed)) * uDetail * uLift * 0.25;
    return dome - crater + skin * smoothstep(0.0, max(uSeam, 0.001), wall * uCell);
  }

  #endif

  /* ------------------------------------------------------------------ */
  /* FUNNEL — the sinkhole                                               */
  /* ------------------------------------------------------------------ */
  #if GF_MODE == GF_FUNNEL

  /**
   * An inverted cone, with the lip calved into blocks.
   *
   * There is no hole in the floor and there never will be — the floor is one
   * opaque plane. What sells the depth is that the wall normal swings a long
   * way between the near and far rims, so one side of the pit is lit and the
   * other is in shadow, and the eye reads a shaded interior as a volume. The
   * parallax offset in main does the rest: the wall detail slides against the
   * lip as the camera orbits, which is the only cue a flat quad cannot fake by
   * shading alone.
   */
  float gfHeight(vec2 q) {
    float d = length(q);
    float t = clamp(d / max(uRadius, 0.05), 0.0, 1.0);

    float wall = pow(1.0 - t, mix(0.7, 3.5, uSharp));
    float h = -uDepth * wall;

    // The lip does not break on a circle: it calves into blocks that tilt in.
    float cellWall;
    vec2 site;
    float id;
    gfCells(q / max(uCell, 0.02), uCellJitter, cellWall, site, id);
    float lipBand = smoothstep(uRadius * 1.15, uRadius * 0.82, d) * smoothstep(uRadius * 0.55, uRadius * 0.9, d);
    h -= uThickness * lipBand * id * smoothstep(0.0, max(uSeam, 0.001), cellWall * uCell);

    // Spoil slumped over the rim, and a scree grain on the walls.
    float outside = smoothstep(uRadius, uRadius * 1.25, d) * (1.0 - smoothstep(uRadius * 1.3, uRadius * 1.7, d));
    h += uLift * outside * (0.5 + 0.9 * id);
    h += snoise(vec3(q * 3.5, uSeed)) * uDetail * uDepth * 0.06 * (1.0 - t);
    return h;
  }

  #endif

  /* ------------------------------------------------------------------ */
  /* SCOUR — what a vortex leaves                                        */
  /* ------------------------------------------------------------------ */
  #if GF_MODE == GF_SCOUR

  /**
   * Log-spiral grooves.
   *
   * This is the one place in the file where sampling on atan(y, x) is right:
   * the marks *are* rotational, a vortex cuts them by turning, and a spiral is
   * an angular function of the radius by definition. It is still domain warped
   * in the plane, because a mathematically exact spiral reads as a logo. The
   * growth front above stays plane-sampled regardless — the front is not
   * rotational and never was.
   *
   * uArms must be a whole number or the phase tears along the ±π seam; the
   * CPU side rounds it.
   */
  float gfHeight(vec2 q) {
    float d = max(length(q), 1e-3);
    vec2 w = vec2(fbm3(vec3(q * 0.6, uSeed)), fbm3(vec3(q * 0.6, uSeed + 3.3))) * uWarp;
    vec2 qw = q + w;

    float a = atan(qw.y, qw.x);
    // fract() before the cosine, and it is not tidiness — it is the fix for a
    // bug that blacked out the entire frame. uTime is the app's elapsed seconds
    // and grows without bound, so after a few minutes this phase was in the
    // thousands and cos(phase * TAU) was being asked for the cosine of ~10^4
    // radians. A float32 cosine that far out has lost most of its mantissa to
    // argument reduction and can return fractionally *outside* [-1, 1] — at
    // which point 0.5 + 0.5 * cos() goes microscopically negative, pow() of a
    // negative base is NaN by definition, the NaN lands in the HDR buffer, and
    // the very next bloom blur smears it across every pixel on screen. One
    // fragment, one whole black frame.
    //
    // cos(phase * TAU) has period 1 in phase, so folding it is *exact* rather
    // than an approximation, and it keeps the argument inside a couple of
    // radians for as long as the app is open.
    float phase = a / TAU * max(uArms, 1.0)
                + log(max(length(qw), 1e-3) / max(uRadius, 0.05)) * uSwirl
                + uTime * uSpeed;
    phase = fract(phase);

    // The max() is the second half of the same fix, and it stays even with the
    // fold above: any base reaching pow() here must be provably non-negative,
    // because a driver computes pow as exp2(y * log2(x)) and therefore returns
    // NaN for a negative base at *every* exponent — including 1.0, which is
    // why turning the sharpness slider to zero did not mask the fault.
    float groove = 0.5 + 0.5 * cos(phase * TAU);
    groove = pow(max(groove, 0.0), mix(1.0, 9.0, uSharp));

    // Deepest where the throat sat, feathering out to nothing at the skirt.
    float bite = smoothstep(uRadius, uRadius * 0.1, d);
    float h = -uDepth * groove * bite;

    // Between the grooves the scoured dust piles into low ridges.
    h += uLift * (1.0 - groove) * bite * 0.6;
    h += snoise(vec3(q * 7.0, uSeed)) * uDetail * uDepth * 0.08;
    return h;
  }

  #endif

  /* ------------------------------------------------------------------ */
  /* LATTICE — a circuit that grows                                      */
  /* ------------------------------------------------------------------ */
  #if GF_MODE == GF_LATTICE

  /** Distance from the anchor to this cell's centre, jittered per cell. */
  float gfCellFront(vec2 centre, float id) {
    return length(centre) + (id - 0.5) * uCellJitter * uCell * 2.0;
  }

  /** Traces standing proud of the substrate, plus a node at each corner. */
  float gfHeight(vec2 q) {
    vec4 hx = gfHex(q / max(uCell, 0.05));
    float edge = 0.8660254 - gfHexRadius(hx.xy);            // 0 on the wall
    float trace = smoothstep(uThickness / max(uCell, 0.05), 0.0, edge);
    float node = smoothstep(uSeam / max(uCell, 0.05), 0.0, abs(length(hx.xy) - 1.0));
    return uLift * (trace * 0.7 + node * 0.9) - uDepth * (1.0 - trace) * 0.15;
  }

  #endif

  /* ------------------------------------------------------------------ */
  /* POOL — standing liquid                                              */
  /* ------------------------------------------------------------------ */
  #if GF_MODE == GF_POOL

  /**
   * A flat surface with a raised rim.
   *
   * The meniscus is the read. Surface tension pulls the liquid *up* the last
   * few centimetres before the edge, and that lip is where the whole rim of
   * specular comes from; without it a pool is a coloured disc lying on a floor.
   * Everything else is two crossed layers of flow-warped noise, slow enough to
   * be a liquid rather than a shader.
   */
  float gfHeight(vec2 q) {
    float d = length(q);
    vec2 drift = uWind * uFlow * uTime;

    float w1 = snoise(vec3((q - drift) * max(uCell, 0.05), uTime * uSpeed * 0.2));
    float w2 = snoise(vec3((q - drift * 0.6) * max(uCell, 0.05) * 2.3 + 11.0, uTime * uSpeed * 0.31));
    float surface = (w1 * 0.65 + w2 * 0.35) * uLift * uDetail;

    float men = uThickness > 1e-4
      ? smoothstep(uRadius - uThickness, uRadius - uThickness * 0.15, d) * (1.0 - smoothstep(uRadius, uRadius + uEdge, d))
      : 0.0;

    return -uDepth * smoothstep(uRadius, 0.0, d) + surface + uLift * men * 2.0;
  }

  #endif

  /* ------------------------------------------------------------------ */
  /* The frame                                                           */
  /* ------------------------------------------------------------------ */

  void main() {
    /* ---- uv → metres, measured from the anchor; +y runs downrange ---- */
    vec2 p = vec2(vUv.x - 0.5, 0.5 - vUv.y) * uQuadSize;
    float d = length(p);

    // Metres per pixel, near enough. Every antialiasing width below is derived
    // from this one number, and it is taken *before* the first discard: a
    // derivative in divergent control flow is undefined, and the symptom is a
    // sparkling fringe on exactly one GPU vendor.
    float px = fwidth(d) + 1e-4;

    // ...and the same thing measured **in the plane** rather than along the
    // radius. The two are the same number only where the fragment happens to
    // move radially. A glyph stroke runs in any direction it likes, and a
    // stroke that happens to point at the anchor sits where d barely changes
    // at all: antialiasing it on px gave every such stroke a hard, crawling
    // edge while its neighbour two slots round the ring was clean. Taken here,
    // with the same discipline — before the first discard, because a
    // derivative in divergent control flow is undefined.
    vec2 pd = fwidth(p);
    float pxp = max(max(pd.x, pd.y), 1e-5);

    /* ---- the growth front ---- */
    float reach = gfReach(p, d);
    float front = uGrow * (uRadius + uEdge) * (1.0 - uRecede);
    float cover = smoothstep(front, front - max(uEdge, 1e-3), reach);
    float lip = smoothstep(max(uEdge, 1e-3), 0.0, abs(reach - front)) * step(0.002, uGrow);

    #if GF_MODE == GF_RUT
      // The rut's front runs down the track, not out from a centre.
      float sRaw = (p.y + uLength * 0.5) / max(uLength, 0.01);
      float s01 = clamp(sRaw, 0.0, 1.0);
      float lateral = abs(p.x - gfTrack(s01));
      // The quad is longer than the track — it has to hold the spoil and the
      // feather — so the *unclamped* parameter caps both ends. Without this the
      // clamp holds the last value all the way to the quad's edge and the rut
      // ends on a dead-straight line at right angles to itself.
      float cap = uEdge / max(uLength, 0.01);
      float ends = smoothstep(-cap, 0.0, sRaw) * smoothstep(1.0 + cap, 1.0, sRaw);
      cover = ends
            * smoothstep(uProgress + 0.006, uProgress - 0.006, s01)
            * smoothstep(uWidth + uThickness * 2.5, uWidth + uThickness * 0.5, lateral);
      lip = smoothstep(0.05, 0.0, abs(s01 - uProgress)) * step(0.002, uProgress);
    #endif

    if (cover < 0.002 && lip < 0.002) discard;

    /* ---- relief, and the fake normal that makes it a substance ---- */
    float h = 0.0;
    vec3 nrm = vec3(0.0, 1.0, 0.0);

    #if GF_MODE == GF_RUNE
      /* ---- the seal: rings of glyphs, an armature, a tick collar, a sigil ---- */
      float sd = 1e4;                 // metres to the nearest stroke
      vec2 grad = vec2(0.0, 1.0);     // that stroke's own outward gradient
      float rule = 0.0;               // the compass circles
      float ringT = 1.0;              // 0 innermost, 1 outermost
      float inked = 0.0;              // how far through its own inking this stroke is

      float rings = clamp(uRings, 1.0, float(GF_RINGS));
      float band = max(uRadius * (1.0 - uRingInner), 0.001);

      /**
       * The inscription has three movements, and uInscribe is the one clock
       * they share. The rings of glyphs take the first slice, the armature and
       * its collar of ticks the second, the central sigil the last — so the
       * thing you are still watching when the seal finishes is the biggest mark
       * on it. A single clock rather than three is what keeps a slider drag
       * coherent: shortening the inscription shortens all three movements in
       * proportion instead of desynchronising them.
       *
       * A slice of zero length is the off switch, and both starts default to 1.
       * A caller that asks for RUNE and says nothing else therefore gets
       * exactly what this mode drew before the armature and the sigil existed:
       * rings of glyphs, over the whole clock. Growing a shared mode must not
       * redecorate somebody else's floor.
       */
      float armStart = clamp(uArmStart, 0.02, 1.0);
      float sigStart = clamp(uSigilStart, armStart, 1.0);
      float armSpan = sigStart - armStart;
      float sigSpan = 1.0 - sigStart;
      float inkRun = clamp(uInscribe / armStart, 0.0, 1.0);
      float armRun = armSpan > 1e-3 ? clamp((uInscribe - armStart) / armSpan, 0.0, 1.0) : 0.0;
      float sigRun = sigSpan > 1e-3 ? clamp((uInscribe - sigStart) / sigSpan, 0.0, 1.0) : 0.0;

      for (int r = 0; r < GF_RINGS; r++) {
        if (float(r) >= rings) continue;

        float rt = (float(r) + 0.5) / rings;
        float rr = uRadius * uRingInner + band * rt;
        if (abs(d - rr) > uGlyphSize * 0.9 + uRule * 4.0) continue;

        // Counter-rotation: even rings run with the clock, odd against it, and
        // each ring out turns slower. Two rings turning the same way read as
        // one wheel; turning against each other they read as machinery.
        float dir = mod(float(r), 2.0) < 0.5 ? 1.0 : -1.0;
        float spin = uTime * uSpin * dir / (1.0 + float(r) * uSpinFalloff);
        float a = atan(p.y, p.x) - spin;

        // The glyph keeps its size in *metres*, so a bigger seal carries more
        // runes rather than bigger ones — the single most convincing thing
        // about working in metres instead of in UV.
        float n = max(floor(TAU * rr / max(uGlyphSize * uGlyphGap, 0.02)), 3.0);
        float slot = floor(a / TAU * n + 0.5);
        float centre = slot / n * TAU;

        float off = a - centre;
        off -= TAU * floor(off / TAU + 0.5);

        // Glyph frame: x is arc length along the ring, y is radially outward.
        vec2 g = vec2(off * rr, d - rr) / max(uGlyphSize, 0.02);

        float index = floor(hash11(slot * 3.71 + float(r) * 17.31 + uSeed * 41.0) * float(GF_GLYPHS));
        index = clamp(index, 0.0, float(GF_GLYPHS) - 1.0);

        // Inking order: ring by ring outward, glyph by glyph round each ring.
        float k = mod(slot, n);
        float start = (float(r) + k / n) / rings;
        float width = 1.0 / (rings * n);
        float draw = clamp((inkRun - start) / width, 0.0, 1.0);

        vec2 g2;
        float dsd = gfGlyph(g, index, draw, uGlyphStroke / max(uGlyphSize, 0.02), g2) * uGlyphSize;
        if (dsd < sd) {
          sd = dsd;
          // The glyph's gradient comes back in its own em box, where x runs
          // along the ring and y runs outward. Handing that straight to the
          // normal — which the first version did — lights every glyph as if it
          // were sitting at bearing zero, so the incisions on the far side of
          // the seal are shaded from the wrong edge and the ring looks
          // embossed on one side and engraved on the other.
          vec2 rdir = d > 1e-4 ? p / d : vec2(1.0, 0.0);
          grad = vec2(-rdir.y, rdir.x) * g2.x + rdir * g2.y;
          inked = draw;
          ringT = rt;
        }

        // The compass circles bracketing the band, swept round on the same
        // clock. An angular sweep is exactly right here: a compass *is* an
        // angular instrument, and this is the only furniture that draws itself
        // by turning rather than by spreading.
        float progress = clamp((inkRun - float(r) / rings) * rings, 0.0, 1.0);
        float bearing = fract(a / TAU + 0.5);
        float sweep = smoothstep(progress + 0.015, progress - 0.015, bearing);
        float r0 = rr - uGlyphSize * 0.62;
        float r1 = rr + uGlyphSize * 0.62;
        float circles = (1.0 - smoothstep(uRule, uRule + px, abs(d - r0)))
                      + (1.0 - smoothstep(uRule, uRule + px, abs(d - r1)));
        rule = max(rule, min(circles, 1.0) * sweep);
      }

      /* ------------------------------------------------------------------ */
      /* The armature — what a seal has that a wheel of letters does not     */
      /* ------------------------------------------------------------------ */
      /**
       * Chords struck between the rings, each one a straight line whose ends
       * land on the armature circle and which passes at distance apothem from
       * the anchor. That single parameterisation covers both things the eye
       * wants here: at uArmTangent = cos(PI / sides) the chords close into an
       * inscribed polygon, and below that they cross into a star — and at any
       * value they are simultaneously *tangent lines* to the inner circle of
       * that radius, which is the other half of the figure.
       *
       * The obvious cheap implementation folds the bearing into one sector and
       * measures the distance to a single line. That draws the polygon fine and
       * silently truncates the star: a chord that spans three sectors is only
       * the nearest line inside one of them, so a pentagram came out as five
       * disconnected stubs. Hence the fixed seven-candidate sweep, three
       * sectors either side of the nearest.
       *
       * Walking the centre line of every chord and asking whether the field is
       * still negative says where that runs out: at up to twelve chords the
       * seven candidates hold the figure whole down to uArmTangent = 0, and at
       * sixteen they need about 0.2. Above sixteen chords with a low tangency
       * the ends will start to break off — widen the loop, do not widen the
       * stroke.
       */
      float asd = 1e4;
      vec2 agrad = vec2(0.0, 1.0);
      float armR = uRadius * clamp(uArmRadius, 0.02, 1.0);
      float armPhase = uArmPhase + uTime * uArmSpin;

      if (armRun > 0.001 && d < armR + uArmStroke * 6.0) {
        float sides = max(floor(uArmSides + 0.5), 3.0);
        float sector = TAU / sides;
        float apo = armR * clamp(uArmTangent, 0.0, 0.985);
        float halfChord = sqrt(max(armR * armR - apo * apo, 1e-4));
        float aa = atan(p.y, p.x) - armPhase;
        float base = floor(aa / sector + 0.5);

        for (int j = -3; j <= 3; j++) {
          float idx = base + float(j);
          float th = armPhase + idx * sector;
          vec2 nl = vec2(cos(th), sin(th));      // the chord's own normal
          vec2 tl = vec2(-nl.y, nl.x);           // ...and its direction
          vec2 ea = nl * apo - tl * halfChord;
          vec2 eb = nl * apo + tl * halfChord;
          // Struck one at a time, in order round the figure, so the armature
          // is drawn rather than switched on.
          float slotA = mod(idx, sides);
          float partA = clamp(armRun * sides - slotA, 0.0, 1.0);
          if (partA > 0.002) gfSeg(p, ea, mix(ea, eb, partA), uArmStroke, asd, agrad);
        }
      }

      /**
       * The tick collar. Sixty short radial marks with every sixth one long is
       * the difference between "a magic circle" and "an instrument": it says
       * the seal is *divided*, and division is what makes a drawing look like
       * it was measured out rather than decorated.
       *
       * One segment per fragment, because ticks are radial and short enough
       * that the nearest bearing is always the nearest tick — the only place in
       * this branch where the angular fold is exact rather than a compromise.
       */
      float tickR = uRadius * clamp(uTickRadius, 0.02, 1.2);
      float tickOut = uTickLength + uTickMajorLen + uTickStroke * 3.0;
      if (armRun > 0.001 && d > tickR - uTickStroke * 3.0 && d < tickR + tickOut) {
        float ticks = max(floor(uTickCount + 0.5), 4.0);
        float ts = TAU / ticks;
        float ta = atan(p.y, p.x) - armPhase;
        float ti = floor(ta / ts + 0.5);
        float th = armPhase + ti * ts;
        vec2 rdir = vec2(cos(th), sin(th));
        float every = max(floor(uTickMajor + 0.5), 1.0);
        float major = 1.0 - step(0.5, mod(ti, every));
        float len = uTickLength + uTickMajorLen * major;
        float partT = clamp(armRun * ticks - mod(ti, ticks), 0.0, 1.0);
        if (partT > 0.002) {
          gfSeg(p, rdir * tickR, rdir * (tickR + len * partT), uTickStroke, asd, agrad);
        }
      }

      if (asd < sd) {
        sd = asd;
        grad = agrad;
        inked = armRun;
        // The armature is one continuous figure rather than a ring of separate
        // marks, so it takes the ignition front where the fragment actually
        // stands. A chord that ran from an inner ring to an outer one and lit
        // all at once looked like a switch closing, not like fire spreading.
        ringT = clamp(d / max(uRadius, 0.05), 0.0, 1.0);
      }

      /* ------------------------------------------------------------------ */
      /* The central sigil — larger than anything else, and drawn last       */
      /* ------------------------------------------------------------------ */
      /**
       * A rosette: one glyph from the same alphabet, at its own em box, copied
       * uSigilArms times about the anchor and closed inside a ruled circle.
       *
       * The copies are free. Folding the bearing into one sector and evaluating
       * the alphabet **once** gives exact N-fold rotational symmetry; the first
       * version looped the arms and paid for the most expensive function in the
       * file five times over for a picture the fold hands you for nothing.
       */
      float ssd = 1e4;
      vec2 sgrad = vec2(0.0, 1.0);
      float sigReach = uSigilRing + uSigilRadius + uSigilSize * 1.4;

      if (sigRun > 0.001 && d < sigReach) {
        // The frame before the writing, as a scribe would: the enclosing circle
        // is ruled in over the first part of the sigil's slice.
        gfArc(p, vec2(0.0, 0.0), uSigilRing, -PI * 0.5,
              TAU * clamp(sigRun * 2.2, 0.0, 1.0), uSigilStroke, ssd, sgrad);

        float arms = max(floor(uSigilArms + 0.5), 1.0);
        float ss = TAU / arms;
        float sa = atan(p.y, p.x) - uTime * uSigilSpin;
        float mfold = sa - ss * floor(sa / ss + 0.5);
        vec2 q = vec2(cos(mfold), sin(mfold)) * d;

        // Same convention as the rings: x tangential, y radially outward, waist
        // on uSigilRadius — so the rosette reads as the alphabet at a larger
        // size rather than as a different kind of mark.
        vec2 gg = vec2(q.y, q.x - uSigilRadius) / max(uSigilSize, 0.02);
        float sIndex = floor(hash11(uSeed * 41.0 + 7.13) * float(GF_GLYPHS));
        sIndex = clamp(sIndex, 0.0, float(GF_GLYPHS) - 1.0);

        vec2 sg;
        float sDraw = clamp(sigRun * 1.7 - 0.35, 0.0, 1.0);
        float sGlyph = gfGlyph(gg, sIndex, sDraw, uSigilStroke / max(uSigilSize, 0.02), sg)
                     * uSigilSize;
        if (sGlyph < ssd) {
          // Out of the em box, out of the sector, into the plane. Two rotations,
          // and skipping the second is the bug that lights one arm of the
          // rosette correctly and the other four from the wrong side.
          float rot = atan(p.y, p.x) - mfold;
          vec2 gp = vec2(sg.y, sg.x);
          ssd = sGlyph;
          sgrad = vec2(gp.x * cos(rot) - gp.y * sin(rot), gp.x * sin(rot) + gp.y * cos(rot));
        }
      }

      if (ssd < sd) {
        sd = ssd;
        grad = sgrad;
        inked = sigRun;
        // The middle of the seal: whatever else it is, it is the first thing
        // the ignition front reaches.
        ringT = 0.0;
      }

      // The incision, and its normal straight off the SDF's gradient.
      float cut = smoothstep(0.0, -max(uThickness, 0.002), sd);
      h = -uDepth * cut;
      float slope = uDepth / max(uThickness, 0.002) * (1.0 - abs(2.0 * cut - 1.0));
      nrm = normalize(vec3(-grad.x * slope * uRelief, 1.0, -grad.y * slope * uRelief));
    #else
      // Two forward differences. Cheap, one-sided and slightly biased, which
      // costs a fraction of a degree of tilt and saves two evaluations of a
      // field that can be nine voronoi cells deep.
      float e = max(uNormalStep, 0.005);
      h = gfHeight(p);
      float hdx = gfHeight(p + vec2(e, 0.0));
      float hdy = gfHeight(p + vec2(0.0, e));
      nrm = normalize(vec3((h - hdx) / e * uRelief, 1.0, (h - hdy) / e * uRelief));
    #endif

    /* ---- one lighting model for every mode ---- */
    vec3 L = normalize(vLight);
    vec3 V = normalize(vView);
    float lambert = dot(nrm, L);
    // Wrapped, because none of these substances is a Lambertian brick: snow,
    // liquid and churned earth all carry light round the terminator, and a hard
    // cosine on a fake normal reads as embossed metal.
    float diffuse = mix(max(lambert, 0.0), lambert * 0.5 + 0.5, uWrap);
    float shade = uAmbient + (1.0 - uAmbient) * diffuse;
    float spec = pow(max(dot(nrm, normalize(L + V)), 0.0), max(uGloss, 1.0)) * uSpecular;
    float fresnel = pow(1.0 - clamp(dot(nrm, V), 0.0, 1.0), 4.0);

    // View-driven offset for interior detail, in metres. vView is already in
    // the quad's frame, so its horizontal part is (x across, y downrange) —
    // the same axes p uses.
    vec2 parallax = vec2(V.x, V.z) * -h * uParallax;

    vec3 body = uColorBase;
    vec3 emit = vec3(0.0);
    float alpha = 0.0;

    /* ------------------------------------------------------------------ */
    #if GF_MODE == GF_PLATE

      float wall;
      vec2 site;
      float id;
      gfCells(p / max(uCell, 0.02), uCellJitter, wall, site, id);
      float wallM = wall * uCell;
      float along = dot(p - site * uCell, uWind);

      float plate = smoothstep(0.0, max(uSeam, 0.001) + px, wallM);
      float curled = smoothstep(0.0, max(uCell * 0.45, 0.01), wallM);
      float lifted = (1.0 - curled) * smoothstep(-uCell * 0.15, uCell * 0.75, along);

      // Sheet ice is thin enough to see the next plate through, so the body
      // colour is graded by how much ice the ray had to cross rather than by a
      // flat tint: the middle of a plate is deep, the fractured seams are pale.
      float thick = mix(0.25, 1.0, id) * plate;
      body = mix(uColorEdge, uColorDeep, thick * 0.85);
      body = mix(body, uColorBase, shade * 0.7);
      // The lip is the only part that catches the key properly.
      body = mix(body, uColorEdge, lifted * 0.65);
      emit = uColorGlow * (spec * (0.4 + lifted) + lip * 0.6);

      alpha = cover * clamp(plate * (0.55 + 0.45 * thick) + lifted * 0.5, 0.0, 1.0);
      alpha = mix(alpha, alpha * 0.25, smoothstep(0.0, 1.0, uRecede));

    /* ------------------------------------------------------------------ */
    #elif GF_MODE == GF_RUNE

      /**
       * The crisp edge. This is the whole reason the mode exists, so it is
       * worth being exact about how it is got.
       *
       * aastep is the house analytic step: smoothstep across
       * fwidth(value), which resolves an edge in about one pixel *at any
       * zoom*. Feeding it the distance normalised to pixels rather than the
       * distance in metres is what makes that true — a seal that fills the
       * screen and a seal seen from the far corner of the stage then get the
       * same edge, and a paused camera can be walked right up to it.
       *
       * The clamp is not cosmetic and it is not paranoia. The ring loop above
       * skips bands with continue, so two fragments of one 2×2 quad can leave
       * it holding 1e4 and 0.01; fwidth of that is astronomical, aastep
       * spreads its transition over the whole range, and the result is a row of
       * bright grey pixels tracing every band boundary — which is exactly the
       * kind of fault that only shows up when somebody pauses and stares.
       * Bounding the normalised distance to six pixels either side kills it and
       * cannot touch the edge itself, where the distance is by definition
       * within a pixel of zero.
       */
      float sdn = clamp(sd / pxp, -6.0, 6.0);
      float ink = aastep(0.0, -sdn);
      float halo = 1.0 - smoothstep(0.0, max(uThickness, 0.002) * 3.0, sd);

      // Ignition runs outward from the middle: a mark lights when the front
      // passes its own normalised radius. The sigil sits at ringT = 0, so the
      // seal always catches at the centre and the rings go up in order.
      float lit = smoothstep(ringT + 0.18, ringT - 0.18, uIgnite);
      float burning = smoothstep(0.14, 0.0, abs(ringT - uIgnite)) * step(0.002, uIgnite);
      // The stroke currently under the nib burns brightest — a stroke being cut
      // is hot, a stroke already cut is only warm.
      float nib = inked * (1.0 - inked) * 4.0;
      // ...and what is left when the fire has gone through it. The seal does
      // not fade out, it burns down: the ink chars to uColorDeep and stops
      // emitting, and what remains on the floor is a scar in the shape of the
      // writing rather than a rune that got quieter.
      float scar = clamp(uScorch, 0.0, 1.0);

      float wash = cover * smoothstep(uRadius, uRadius * 0.2, d);
      body = mix(uColorDeep, uColorBase, ink * (0.45 + 0.55 * shade));
      body = mix(body, uColorDeep, scar * 0.85 * ink);
      emit = (uColorGlow * (ink * (0.35 + lit * 1.6 + burning * 2.2 + nib * 1.4) + halo * lit * 0.25)
           + uColorEdge * (rule * 1.2 + spec * ink)) * (1.0 - scar);

      alpha = clamp(ink * 0.95 + halo * 0.18 * lit * (1.0 - scar) + rule * 0.9
                  + wash * 0.14 * (1.0 - scar), 0.0, 1.0) * cover;

    /* ------------------------------------------------------------------ */
    #elif GF_MODE == GF_POCK

      float pit = gfPockCover(p + parallax);
      float heat = gfPockHeat(p);
      float rimness = smoothstep(0.0, uLift + 1e-4, h);
      float depthness = smoothstep(0.0, -uDepth * 0.6 - 1e-4, h);

      body = mix(uColorBase, uColorDeep, depthness);
      body = mix(body, uColorEdge, rimness * 0.8);
      body *= shade;
      emit = uColorGlow * heat * (0.6 + depthness) + uColorEdge * spec * 0.4;

      alpha = clamp(pit * (0.7 + 0.3 * rimness), 0.0, 1.0) * cover;

    /* ------------------------------------------------------------------ */
    #elif GF_MODE == GF_RUT

      float force = gfForce(s01);
      float inRut = smoothstep(uWidth, uWidth * 0.35, lateral);
      float ridge = smoothstep(0.0, uLift + 1e-4, h);

      body = mix(uColorBase, uColorDeep, inRut * (0.55 + 0.45 * force));
      body = mix(body, uColorEdge, ridge * 0.7);
      body *= shade;
      // The churn right under the body is still moving, so it is the only part
      // that is lit rather than shaded.
      emit = uColorGlow * lip * (0.5 + force) + uColorEdge * spec * 0.3;

      alpha = clamp(cover * (inRut * (0.55 + 0.45 * force) + ridge * 0.6), 0.0, 1.0);

    /* ------------------------------------------------------------------ */
    #elif GF_MODE == GF_WET

      // Soaked stone is *darker* than dry stone and shinier — which is only
      // expressible with a non-additive blend. This mode is the argument for
      // the option existing.
      float damp = cover;
      float sheen = spec * (0.5 + 0.5 * fresnel);

      body = mix(uColorBase, uColorDeep, damp * (0.7 + 0.3 * shade));
      emit = uColorEdge * sheen + uColorGlow * lip * 0.4;

      // Drying leaves a pale tide mark where the last of it stood.
      float tide = smoothstep(0.0, max(uEdge, 1e-3), abs(reach - front)) ;
      body = mix(uColorGlow, body, clamp(tide + 1.0 - step(0.002, uRecede), 0.0, 1.0));

      alpha = clamp(damp * (0.55 + 0.45 * (1.0 - shade)) + sheen * 0.5, 0.0, 1.0);

    /* ------------------------------------------------------------------ */
    #elif GF_MODE == GF_PUSTULE

      float wall;
      vec2 site;
      float id;
      float f1 = gfCells(p / max(uCell, 0.02), uCellJitter, wall, site, id);
      float phase = gfPhase(id);
      float burst = smoothstep(0.76, 0.84, phase);

      // The splatter thrown out at the moment it goes, travelling in metres.
      float since = max(phase - 0.8, 0.0) / max(uSpeed, 0.01);
      float ringR = since * uFlow;
      float splat = smoothstep(uSeam, 0.0, abs(f1 * uCell - ringR)) * (1.0 - smoothstep(0.0, uCell * 0.9, ringR));

      float taut = smoothstep(0.35, 0.95, phase) * (1.0 - burst);
      body = mix(uColorBase, uColorEdge, taut * smoothstep(0.5, 0.0, f1));
      body = mix(body, uColorDeep, burst * smoothstep(0.55, 0.0, f1));
      body *= shade;
      emit = uColorGlow * (splat * 1.4 + spec * taut) ;

      alpha = clamp(cover * (smoothstep(0.95, 0.25, f1) * (0.6 + 0.4 * taut) + splat), 0.0, 1.0);

    /* ------------------------------------------------------------------ */
    #elif GF_MODE == GF_FUNNEL

      float t = clamp(d / max(uRadius, 0.05), 0.0, 1.0);
      // Detail on the walls is offset by the view, which is the only cue a flat
      // quad has that says "this is below the floor" while the camera orbits.
      float grit = snoise01(vec3((p + parallax) * 4.0, uSeed)) ;
      float depthness = 1.0 - t;

      body = mix(uColorBase, uColorDeep, depthness * depthness);
      body = mix(body, uColorEdge, smoothstep(0.85, 1.0, t) * 0.6);   // the calved lip
      body *= shade * (0.65 + 0.5 * grit * uDetail);
      // The throat is never drawn. It is drawn as *nothing*, at full alpha.
      body = mix(body, uColorDeep * 0.2, smoothstep(0.28, 0.0, t));
      emit = uColorGlow * smoothstep(0.2, 0.0, t) + uColorEdge * spec * 0.5;

      alpha = clamp(cover * smoothstep(1.35, 0.95, t) * (0.75 + 0.25 * depthness), 0.0, 1.0);

    /* ------------------------------------------------------------------ */
    #elif GF_MODE == GF_SCOUR

      float groove = smoothstep(0.0, -uDepth * 0.5 - 1e-4, h);
      float ridge = smoothstep(0.0, uLift * 0.6 + 1e-4, h);
      float bite = smoothstep(uRadius, uRadius * 0.1, d);

      body = mix(uColorBase, uColorDeep, groove);
      body = mix(body, uColorEdge, ridge * 0.7);
      body *= shade;
      emit = uColorGlow * groove * bite * 0.5 + uColorEdge * spec * 0.4;

      alpha = clamp(cover * bite * (0.45 + 0.55 * max(groove, ridge)), 0.0, 1.0);

    /* ------------------------------------------------------------------ */
    #elif GF_MODE == GF_LATTICE

      vec4 hx = gfHex(p / max(uCell, 0.05));
      vec2 centre = hx.zw * max(uCell, 0.05);
      float id = hash11(dot(floor(centre / max(uCell, 0.05) + 0.5), vec2(31.7, 57.1)));
      float edge = 0.8660254 - gfHexRadius(hx.xy);
      float trace = smoothstep((uThickness + px) / max(uCell, 0.05), uThickness / max(uCell, 0.05) * 0.4, edge);
      float node = smoothstep((uSeam + px) / max(uCell, 0.05), 0.0, abs(length(hx.xy) - 1.0)) * trace;

      // The front does not cross the field, it crosses the *lattice*: a cell
      // lights when the front reaches that cell's own centre, so the growth
      // steps from cell to cell along the edges instead of sliding over them.
      float cellFront = gfCellFront(centre, id);
      float lit = smoothstep(cellFront + uCell * 0.9, cellFront - uCell * 0.2, front);
      // Inside a lit cell the trace still fills from the side the charge came
      // in on, which is what stops the whole hex flashing on at once.
      float entry = dot(normalize(hx.xy + 1e-5), normalize(centre + 1e-5));
      lit *= smoothstep(-1.0, 0.4, entry + (front - cellFront) / max(uCell, 0.05));

      // Charge running along the traces, phase keyed to the cell so two
      // neighbours are never in step.
      float run = fract((edge * max(uCell, 0.05) + length(centre)) * 0.5 - uTime * uSpeed + id);
      float pulse = pow(1.0 - run, 6.0);

      body = mix(uColorDeep, uColorBase, trace) * shade;
      emit = uColorGlow * (trace * lit * (0.5 + pulse * 1.5)) + uColorEdge * node * lit * 1.6;

      alpha = clamp(cover * (trace * (0.35 + 0.65 * lit) + node * lit), 0.0, 1.0);

    /* ------------------------------------------------------------------ */
    #else /* GF_POOL */

      float deepness = smoothstep(uRadius, uRadius * 0.15, d);
      float men = smoothstep(uRadius - uThickness, uRadius, d) * step(d, uRadius + uEdge);

      // A liquid is mostly what it reflects at grazing angles and mostly what
      // it absorbs looking straight down, which is one Fresnel term and two
      // colour pickers.
      body = mix(uColorBase, uColorDeep, deepness);
      body = mix(body, uColorEdge, clamp(fresnel * 0.8 + men * 0.5, 0.0, 1.0));
      body *= 0.4 + 0.6 * shade;
      emit = uColorEdge * spec + uColorGlow * deepness * 0.25;

      alpha = clamp(cover * (0.35 + 0.65 * deepness + men * 0.4), 0.0, 1.0);

    #endif

    /* ---- assemble ---- */
    vec3 color = body + emit * uEmissive;
    alpha *= uFade * uOpacity;

    // Soft against anything standing in the mark. The depth prepass is half
    // resolution, so its silhouettes are a pixel or two soft — which is exactly
    // the band worth feathering, and why this is worth doing even with the
    // depth test on. Turn the test off and this term does all the work.
    vec2 screenUV = gl_FragCoord.xy / uResolution;
    // Not 'packed', which is the obvious name and a future-reserved word in
    // GLSL ES: ANGLE rejects it outright, so every mode of this shader would
    // have failed to compile on macOS Chrome. commonGLSL#softFade made the same
    // mistake and renamed to depthBits; VolumeHull.js has the note. This one
    // survived because the reserved-word scanner in scripts/ only audits
    // Distortion and Portal, and nothing had compiled a GroundField in a
    // browser yet.
    float depthBits = unpackRGBAToDepth(texture2D(uSceneDepth, screenUV));
    float sceneViewZ = perspectiveDepthToViewZ(depthBits, uCameraNear, uCameraFar);
    alpha *= smoothstep(-max(uDepthFade, 1e-3), 0.0, vViewZ - sceneViewZ);

    if (alpha < 0.004) discard;
    color *= uGlobalGlow;
    disruptShade(color, alpha, vDisrupt, gl_FragCoord.xy);
    gl_FragColor = vec4(color, alpha);
  }
`;function P(){return{centre:null,yaw:0,height:.02,radius:4,length:10,grow:1,recede:0,progress:1,inscribe:1,ignite:0,fade:1,seed:0,edge:.35,ragged:.28,raggedScale:.7,warp:.5,relief:.6,normalStep:.06,ambient:.32,wrap:.45,specular:.5,gloss:24,parallax:.35,cell:.55,cellJitter:.85,seam:.05,thickness:.05,lift:.12,depth:.25,width:.5,sharp:.5,detail:.6,swirl:.3,arms:5,speed:1.2,flow:.35,windAngle:.6,rings:3,ringInner:.35,glyphSize:.55,glyphStroke:.045,glyphGap:1.35,spin:.12,spinFalloff:.6,rule:.012,scorch:0,armStart:1,armRadius:.66,armSides:7,armTangent:.4,armStroke:.02,armPhase:.35,armSpin:-.05,tickCount:60,tickRadius:.95,tickLength:.13,tickStroke:.011,tickMajor:6,tickMajorLen:.15,sigilStart:1,sigilRadius:.36,sigilSize:.72,sigilArms:5,sigilStroke:.032,sigilRing:.92,sigilSpin:.06,markLife:6,markRadius:.7,additive:!1,emissive:1,opacity:1,depthFade:.5,colorBase:`#8a8f96`,colorEdge:`#dfe8f0`,colorGlow:`#ffd27a`,colorDeep:`#161a1e`,noiseStrength:1,noiseFrequency:1,noiseSpeed:1,opacityScale:1}}var F=class{constructor(n,i={}){let{mode:o=m.PLATE,marks:c=12,additive:f=!1,depthTest:_=!0,layer:v=a.VFX,renderOrder:y=null,name:b=null}=i;this.parent=n,this.mode=o,this.marks=Math.max(1,Math.round(c)),this.geometry=p(),this._marks=[];for(let e=0;e<this.marks;e++)this._marks.push(new s(0,0,-1e4,1));this._markCount=0,this._markNext=0,this.material=new e({defines:{GF_MODE:o,GF_MARKS:this.marks,GF_RINGS:g,GF_GLYPHS:E},transparent:!0,depthWrite:!1,depthTest:_,blending:f?2:1,side:2,toneMapped:!1,uniforms:t({uQuadSize:{value:new l(12,12)},uRadius:{value:4},uLength:{value:10},uSeed:{value:0},uGrow:{value:1},uRecede:{value:0},uEdge:{value:.35},uRagged:{value:.28},uRaggedScale:{value:.7},uWarp:{value:.5},uRelief:{value:.6},uNormalStep:{value:.06},uAmbient:{value:.32},uWrap:{value:.45},uSpecular:{value:.5},uGloss:{value:24},uParallax:{value:.35},uCell:{value:.55},uCellJitter:{value:.85},uSeam:{value:.05},uThickness:{value:.05},uLift:{value:.12},uDepth:{value:.25},uWidth:{value:.5},uSharp:{value:.5},uDetail:{value:.6},uSwirl:{value:.3},uArms:{value:5},uSpeed:{value:1.2},uFlow:{value:.35},uWind:{value:new l(.56,.83)},uRings:{value:3},uRingInner:{value:.35},uGlyphSize:{value:.55},uGlyphStroke:{value:.045},uGlyphGap:{value:1.35},uSpin:{value:.12},uSpinFalloff:{value:.6},uRule:{value:.012},uInscribe:{value:1},uIgnite:{value:0},uScorch:{value:0},uArmStart:{value:1},uArmRadius:{value:.66},uArmSides:{value:7},uArmTangent:{value:.4},uArmStroke:{value:.02},uArmPhase:{value:.35},uArmSpin:{value:-.05},uTickCount:{value:60},uTickRadius:{value:.95},uTickLength:{value:.13},uTickStroke:{value:.011},uTickMajor:{value:6},uTickMajorLen:{value:.15},uSigilStart:{value:1},uSigilRadius:{value:.36},uSigilSize:{value:.72},uSigilArms:{value:5},uSigilStroke:{value:.032},uSigilRing:{value:.92},uSigilSpin:{value:.06},uMarks:{value:this._marks},uMarkCount:{value:0},uMarkLife:{value:6},uMarkRadius:{value:.7},uProgress:{value:1},uFade:{value:1},uOpacity:{value:1},uEmissive:{value:1},uDepthFade:{value:.5},uColorBase:{value:new u(.54,.56,.59)},uColorEdge:{value:new u(.87,.91,.94)},uColorGlow:{value:new u(1,.82,.48)},uColorDeep:{value:new u(.09,.1,.12)},...r()}),vertexShader:M,fragmentShader:N}),this.mesh=new d(this.geometry,this.material),this.mesh.name=b??`GroundField:${h[o]??o}`,this.mesh.layers.set(v),this.mesh.renderOrder=y??(f?8:6),this.mesh.frustumCulled=!1,this._additive=f,this._renderOrder=y,n?.add(this.mesh)}get object3D(){return this.mesh}get drawCalls(){return 1}get markCount(){return this._markCount}setVisible(e){this.mesh.visible=e}mark(e,t,n,r=1){let i=this._marks[this._markNext];return i.set(e,t,n,r),this._markNext=(this._markNext+1)%this.marks,this._markCount=Math.min(this._markCount+1,this.marks),this.material.uniforms.uMarkCount.value=this._markCount,i}clearMarks(){this._markCount=0,this._markNext=0,this.material.uniforms.uMarkCount.value=0;for(let e=0;e<this.marks;e++)this._marks[e].set(0,0,-1e4,1)}update(e){let t=this.material.uniforms,n=e.noiseFrequency??1,r=e.noiseStrength??1,a=e.noiseSpeed??1,o=Math.max(.05,e.radius??4),s=Math.max(.2,e.length??10),c=Math.max(.001,e.edge??.35);t.uRadius.value=o,t.uLength.value=s,t.uSeed.value=e.seed??0,t.uGrow.value=e.grow??1,t.uRecede.value=e.recede??0,t.uEdge.value=c,t.uRagged.value=(e.ragged??.28)*r,t.uRaggedScale.value=(e.raggedScale??.7)*n,t.uWarp.value=(e.warp??.5)*r,t.uRelief.value=e.relief??.6,t.uNormalStep.value=Math.max(.005,e.normalStep??.06),t.uAmbient.value=e.ambient??.32,t.uWrap.value=e.wrap??.45,t.uSpecular.value=e.specular??.5,t.uGloss.value=Math.max(1,e.gloss??24),t.uParallax.value=e.parallax??.35,t.uCell.value=Math.max(.02,e.cell??.55),t.uCellJitter.value=e.cellJitter??.85,t.uSeam.value=Math.max(.001,e.seam??.05),t.uThickness.value=Math.max(.001,e.thickness??.05),t.uLift.value=e.lift??.12,t.uDepth.value=e.depth??.25,t.uWidth.value=Math.max(.01,e.width??.5),t.uSharp.value=e.sharp??.5,t.uDetail.value=e.detail??.6,t.uSwirl.value=e.swirl??.3,t.uArms.value=Math.max(1,Math.round(e.arms??5)),t.uSpeed.value=(e.speed??1.2)*a,t.uFlow.value=(e.flow??.35)*a;let l=e.windAngle??.6;t.uWind.value.set(Math.sin(l),Math.cos(l)),t.uRings.value=Math.min(g,Math.max(1,Math.round(e.rings??3))),t.uRingInner.value=Math.min(.95,Math.max(.02,e.ringInner??.35)),t.uGlyphSize.value=Math.max(.02,e.glyphSize??.55),t.uGlyphStroke.value=Math.max(.002,e.glyphStroke??.045),t.uGlyphGap.value=Math.max(.5,e.glyphGap??1.35),t.uSpin.value=e.spin??.12,t.uSpinFalloff.value=e.spinFalloff??.6,t.uRule.value=Math.max(.001,e.rule??.012),t.uInscribe.value=e.inscribe??1,t.uIgnite.value=e.ignite??0,t.uScorch.value=e.scorch??0,t.uArmStart.value=Math.min(1,Math.max(.02,e.armStart??1)),t.uArmRadius.value=e.armRadius??.66,t.uArmSides.value=Math.max(3,Math.round(e.armSides??7)),t.uArmTangent.value=e.armTangent??.4,t.uArmStroke.value=Math.max(.001,e.armStroke??.02),t.uArmPhase.value=e.armPhase??.35,t.uArmSpin.value=e.armSpin??-.05,t.uTickCount.value=Math.max(4,Math.round(e.tickCount??60)),t.uTickRadius.value=e.tickRadius??.95,t.uTickLength.value=Math.max(.001,e.tickLength??.13),t.uTickStroke.value=Math.max(.001,e.tickStroke??.011),t.uTickMajor.value=Math.max(1,Math.round(e.tickMajor??6)),t.uTickMajorLen.value=Math.max(0,e.tickMajorLen??.15),t.uSigilStart.value=Math.min(1,Math.max(.03,e.sigilStart??1)),t.uSigilRadius.value=Math.max(0,e.sigilRadius??.36),t.uSigilSize.value=Math.max(.02,e.sigilSize??.72),t.uSigilArms.value=Math.max(1,Math.round(e.sigilArms??5)),t.uSigilStroke.value=Math.max(.002,e.sigilStroke??.032),t.uSigilRing.value=Math.max(.01,e.sigilRing??.92),t.uSigilSpin.value=e.sigilSpin??.06,t.uMarkLife.value=Math.max(.05,e.markLife??6),t.uMarkRadius.value=Math.max(.02,e.markRadius??.7),t.uProgress.value=e.progress??1,t.uFade.value=e.fade??1,t.uOpacity.value=(e.opacity??1)*(e.opacityScale??1),t.uEmissive.value=e.emissive??1,t.uDepthFade.value=Math.max(.001,e.depthFade??.5),t.uColorBase.value.copy(i(e.colorBase??`#8a8f96`)),t.uColorEdge.value.copy(i(e.colorEdge??`#dfe8f0`)),t.uColorGlow.value.copy(i(e.colorGlow??`#ffd27a`)),t.uColorDeep.value.copy(i(e.colorDeep??`#161a1e`)),this.setAdditive(e.additive??!1);let u=c+o*(e.ragged??.28)+Math.max(e.lift??0,e.thickness??0)*4+.6,d=(o+u)*2,f=this.mode===m.RUT?s+u*2:d;t.uQuadSize.value.set(d,f),this.mesh.scale.set(d,1,f);let p=e.yaw??0,h=e.centre,_=e.height??.02;if(h){let e=this.mode===m.RUT?s*.5:0;this.mesh.position.set(h.x+Math.sin(p)*e,_,h.z+Math.cos(p)*e)}else this.mesh.position.y=_;this.mesh.rotation.set(0,p,0)}setAdditive(e){e!==this._additive&&(this._additive=e,this.material.blending=e?2:1,this.mesh.renderOrder=this._renderOrder??(e?8:6))}dispose(){this.mesh.parent?.remove(this.mesh),this.material.dispose(),f(),this.geometry=null}};export{m as n,P as r,F as t};
//# sourceMappingURL=GroundField-aLIZg3d3.js.map