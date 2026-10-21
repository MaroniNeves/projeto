import{$ as e,Br as t,Jt as n,K as r,M as i,N as a,R as o,V as s,Y as c,di as l,fi as u,q as d,xt as f,yn as p}from"./settings-DdywqLlV.js";import"./SceneHooks-DvEWF-72.js";var m=Object.freeze({LINE:0,HELIX:1,ORBIT:2,MEANDER:3,RIM:4,CHAIN:5,LINK:6,SPIRAL_IN:7,CRACK:8}),h=Object.freeze({CORE:0,GLOW:1}),g=new l,_=new l,v=new l(0,1,0),y=new l;function b(){return{width:.032,glowWidth:6.2,glowOpacity:.44,jitter:1,jitterScale:1.4,octaves:4,jitterFalloff:.55,crawl:2.4,pinch:.16,restrike:21,flicker:.26,flickerSpeed:30,strandFlash:.45,coreSharp:4.4,glowFalloff:2.3,softFade:.7,opacity:1,glow:2.2,colorCore:`#ffffff`,colorInner:`#dcd2ff`,colorOuter:`#8f6bff`,colorHalo:`#290d8c`,randomness:1,noiseStrength:1,noiseFrequency:1,noiseSpeed:1,opacityScale:1,glowScale:1}}var x=`
  ${i}
  varying float vDisrupt;   // spellbreak's field, sampled per vertex — see SceneHooks

  #define PI  3.141592653589793
  #define TAU 6.283185307179586
  #define ROLES 4
  #define NODES 12

  uniform float uTime;
  uniform float uSeed;
  uniform float uRestrike;
  uniform float uFade;

  /* --- per-role blocks. See the JSDoc on each FilamentRole method. --- */
  uniform float uMode[ROLES];   // PathMode
  uniform float uCount[ROLES];  // live filaments in this role
  uniform vec3  uFrom[ROLES];   // anchor A — start, or centre, metres
  uniform vec3  uTo[ROLES];     // anchor B — end, or axis reference, metres
  uniform vec4  uShape[ROLES];  // mode-specific
  uniform vec4  uShape2[ROLES]; // mode-specific, continued
  uniform vec4  uStyle[ROLES];  // kink amp, width multiplier, dim, ground damp
  uniform vec4  uEnds[ROLES];   // fade start, fade end, taper start, taper end
  uniform vec4  uDraw[ROLES];   // progress, tip length, floor y (m), tip glow

  /* --- the chain's scatter, unitless fractions only --- */
  uniform vec4  uNodes[NODES];  // along 0..1, lateral -1..1, lift 0..1, spare
  uniform float uNodeCount;

  /* --- shared look --- */
  uniform float uJitter;
  uniform float uJitterScale;
  uniform float uOctaves;
  uniform float uJitterFalloff;
  uniform float uCrawl;
  uniform float uPinch;
  uniform float uWidth;
  uniform float uWidthScale;
  uniform float uStrandFlash;
  uniform float uFlickerSpeed;

  attribute float aStrand;

  varying float vSide;
  varying float vDim;
  varying float vFlash;
  varying float vLit;
  varying float vDrawn;
  varying float vTip;
  varying float vEndFade;
  varying float vViewZ;

  ${c}

  /* --- the role, hoisted out of main so pathAt can see it --- */
  float gMode;
  vec3  gFrom;
  vec3  gTo;
  vec4  gShape;
  vec4  gShape2;
  vec4  gStyle;
  vec4  gEnds;
  vec4  gDraw;
  float gF;    // this filament's place in its role, 0..1, half-open
  float gSeed; // per-filament, re-rolled on every strike

  /** Value noise with a *linear* ramp — piecewise-linear output, sharp corners. */
  float vnoise(float x, float seed) {
    float i = floor(x);
    float f = x - i;
    return mix(hash11(i + seed), hash11(i + 1.0 + seed), f) * 2.0 - 1.0;
  }

  /** ESSL 1.00 has no hyperbolics. The catenary needs one. */
  float coshf(float x) { return 0.5 * (exp(x) + exp(-x)); }

  /**
   * Offset of one filament from its path, in the perpendicular plane.
   * 'span' is the length of that path, so 'uJitterScale' stays kinks per
   * *metre* whether the filament is a 20 m whip or a 1 m hop around a rim.
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

  /** Unit tangent plus two normals for the segment A→B. */
  void axisFrame(vec3 a, vec3 b, out vec3 dir, out vec3 n1, out vec3 n2) {
    vec3 d = b - a;
    float len = length(d);
    dir = len > 1e-4 ? d / len : vec3(0.0, 1.0, 0.0);
    // The usual world-up reference degenerates on exactly the paths that run
    // vertically — the column, the spiral — which are the ones that need a
    // frame most.
    vec3 up = abs(dir.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    n1 = normalize(cross(dir, up));
    n2 = normalize(cross(dir, n1));
  }

  /** The chain's lateral and vertical, taken flat so 'lift' is genuinely up. */
  void chainBasis(out vec3 lat, out vec3 up) {
    vec3 d = gTo - gFrom;
    // 'flat' would be the obvious name and is a reserved word in GLSL ES.
    vec3 ground = vec3(d.x, 0.0, d.z);
    up = vec3(0.0, 1.0, 0.0);
    lat = length(ground) > 1e-4 ? normalize(cross(up, normalize(ground))) : vec3(1.0, 0.0, 0.0);
  }

  /** One chain node, resolved from its unitless fractions. Mirrored on the CPU. */
  vec3 nodeWorld(vec4 f, vec3 lat, vec3 up) {
    return mix(gFrom, gTo, f.x) + lat * (f.y * gShape.x) + up * (f.z * gShape.y);
  }

  /**
   * The role's centreline at 't', before any kink is added.
   *
   * Every branch reads only from the 'g*' globals and 'uTime', which is what
   * makes the whole thing re-resolve for free on a paused frame.
   */
  vec3 pathAt(float t) {
    vec3 dir, n1, n2;

    if (gMode < 0.5) {
      /* ---- LINE: the bolt ---- */
      // shape  = (sag m, spreadNear m, spread m, spreadCurve)
      // shape2 = (twist turns, twistSpeed turns/s, converge, —)
      axisFrame(gFrom, gTo, dir, n1, n2);
      vec3 p = mix(gFrom, gTo, t);
      p.y += gShape.x * sin(t * PI);
      // A constant per-filament offset in the perpendicular plane, opening from
      // spreadNear at the start to spread at the end and rolling with twist.
      // This, not the noise, is what separates one filament from the next.
      float a = gSeed * TAU + (t * gShape2.x + uTime * gShape2.y) * TAU;
      float reach = mix(gShape.y, gShape.z, pow(clamp(t, 0.0, 1.0), max(gShape.w, 0.01)));
      return p + (n1 * cos(a) + n2 * sin(a)) * reach * gF;
    }

    if (gMode < 1.5) {
      /* ---- HELIX: a coil around the axis ---- */
      // shape  = (radius m, radiusEnd m, turns, spin turns/s)
      // shape2 = (sag m, phaseSpread, taperCurve, —)
      axisFrame(gFrom, gTo, dir, n1, n2);
      vec3 p = mix(gFrom, gTo, t);
      p.y += gShape2.x * sin(t * PI);
      float a = (gF * gShape2.y + t * gShape.z + uTime * gShape.w) * TAU;
      float r = mix(gShape.x, gShape.y, pow(clamp(t, 0.0, 1.0), max(gShape2.z, 0.01)));
      return p + (n1 * cos(a) + n2 * sin(a)) * r;
    }

    if (gMode < 2.5) {
      /* ---- ORBIT: great slow loops around a point ---- */
      // shape  = (radius m, arc turns, spin turns/s, wobble)
      // shape2 = (tilt rad, tiltSpread rad, radiusJitter, —)
      // A caged orb's filaments do not radiate, they *circle*. The loops need
      // to sit on different planes or the cage reads as one flat ring, so each
      // filament tips its plane by 'tilt' and rotates its ascending node by a
      // per-filament hash. Wobble then stops any of them being a clean circle.
      axisFrame(gFrom, gTo, dir, n1, n2);
      float tilt = gShape2.x + (hash11(gSeed + 2.7) - 0.5) * gShape2.y;
      vec3 u = n1;
      vec3 v = n2 * cos(tilt) + dir * sin(tilt);
      float node = hash11(gSeed + 8.3) * TAU;
      vec3 uu =  u * cos(node) + v * sin(node);
      vec3 vv = -u * sin(node) + v * cos(node);

      float theta = (gF + t * gShape.y + uTime * gShape.z) * TAU;
      float r = gShape.x * (1.0 + (hash11(gSeed + 5.1) - 0.5) * gShape2.z);
      r *= 1.0 + gShape.w * sin(theta * 3.0 + gSeed);
      return gFrom + (uu * cos(theta) + vv * sin(theta)) * r;
    }

    if (gMode < 3.5) {
      /* ---- MEANDER: a committed veer running outward ---- */
      // shape  = (inner m, reach m, curve, wander rad)
      // shape2 = (arch m, hug m, spin turns/s, —)
      // The veer is a per-filament constant rather than noise so the tendril
      // curves *consistently*, the way a discharge that has committed to a
      // direction does; the kinks on top of it supply the rest.
      axisFrame(gFrom, gTo, dir, n1, n2);
      float veer = (hash11(gSeed + 5.0) - 0.5) * 2.0 * gShape.w;
      float a = gF * TAU + uTime * gShape2.z * TAU + hash11(gSeed) * 0.4 + veer * pow(t, 1.4);
      float r = mix(gShape.x, gShape.y, pow(clamp(t, 0.0, 1.0), max(gShape.z, 0.01)));
      return gFrom + (n1 * cos(a) + n2 * sin(a)) * r
                   + dir * (gShape2.y + gShape2.x * sin(t * PI));
    }

    if (gMode < 4.5) {
      /* ---- RIM: an arc travelling around a boundary ---- */
      // shape  = (radius m, span turns, speed turns/s, lift m)
      // shape2 = (jitter, hug m, phase turns, —)
      axisFrame(gFrom, gTo, dir, n1, n2);
      float a = (gF + uTime * gShape.z + gShape2.z) * TAU + hash11(gSeed) * 0.3 + t * gShape.y * TAU;
      float r = gShape.x * (1.0 + gShape2.x * 0.25 * sin(t * 6.0 + gSeed));
      return gFrom + (n1 * cos(a) + n2 * sin(a)) * r
                   + dir * (gShape2.y + gShape.w * sin(t * PI));
    }

    if (gMode < 5.5) {
      /* ---- CHAIN: a polyline through the scattered nodes ---- */
      // shape  = (scatter m, lift m, sag m, bow m)
      // shape2 = (lit cursor in hops, hold hops, overlap hops, tip hops)
      vec3 lat, up;
      chainBasis(lat, up);

      float segs = max(uNodeCount - 1.0, 1.0);
      float x = clamp(t, 0.0, 1.0) * segs;
      float s = min(floor(x), segs - 1.0);
      float u = x - s;

      // Constant-index-expression lookup: see the header. 'n + 1' is still one.
      vec4 fa = uNodes[0];
      vec4 fb = uNodes[1];
      for (int n = 0; n < NODES - 1; n++) {
        if (float(n) == s) { fa = uNodes[n]; fb = uNodes[n + 1]; }
      }

      // Linear between nodes, deliberately: a spline through the scatter would
      // round off the corners, and the corners are what say "this jumped".
      vec3 p = mix(nodeWorld(fa, lat, up), nodeWorld(fb, lat, up), u);
      float bowSign = mod(s, 2.0) < 0.5 ? 1.0 : -1.0;
      p += lat * (gShape.w * bowSign * sin(u * PI));
      p.y += gShape.z * sin(u * PI);
      return p;
    }

    if (gMode < 6.5) {
      /* ---- LINK: a sagging catenary ---- */
      // shape  = (slack m, curve, swing m, swingSpeed rad/s)
      // shape2 = (taut 0..1, spread m, —, —)
      // A real catenary, not a parabola: the difference is all at the ends,
      // where a hanging chain leaves its anchor much steeper than a parabola
      // does, and that steepness is most of what says "heavy".
      axisFrame(gFrom, gTo, dir, n1, n2);
      vec3 p = mix(gFrom, gTo, t);
      float k = max(gShape.y, 0.01);
      float bow = (coshf(k) - coshf(k * (2.0 * t - 1.0))) / max(coshf(k) - 1.0, 1e-4);
      p.y -= gShape.x * (1.0 - clamp(gShape2.x, 0.0, 1.0)) * bow;
      float swing = sin(uTime * gShape.w + gSeed) * gShape.z * sin(t * PI);
      return p + n1 * (swing + (gF - 0.5) * 2.0 * gShape2.y);
    }

    if (gMode < 7.5) {
      /* ---- SPIRAL_IN: a spiral collapsing as it travels ---- */
      // shape  = (radius m, radiusEnd m, turns, spin turns/s)
      // shape2 = (curve, phaseSpread, wobble, —)
      axisFrame(gFrom, gTo, dir, n1, n2);
      float e = pow(clamp(t, 0.0, 1.0), max(gShape2.x, 0.01));
      vec3 p = mix(gFrom, gTo, e);
      float theta = (gF * gShape2.y + t * gShape.z + uTime * gShape.w) * TAU;
      float r = mix(gShape.x, gShape.y, e) * (1.0 + gShape2.z * sin(theta * 2.0 + gSeed));
      return p + (n1 * cos(theta) + n2 * sin(theta)) * r;
    }

    /* ---- CRACK: a branching fracture ---- */
    // shape  = (angle rad, lengthFrac, depthFalloff, spread)
    // shape2 = (start 0..1, sag m, forkBias 0..1, —)
    // Three generations, walked forward rather than recursed: a twig has to
    // know where its branch went, and its branch has to know where the trunk
    // went, so each pass re-anchors A→B onto the child before the next one
    // reads it. Filament 0 is always the trunk, which is why a crack still
    // reads with the count wound down to one.
    vec3 a = gFrom;
    vec3 b = gTo;
    float depth = gF > 0.0001 ? 1.0 + step(mix(0.75, 0.35, clamp(gShape2.z, 0.0, 1.0)), gF) : 0.0;

    for (int gen = 0; gen < 2; gen++) {
      if (float(gen) < depth) {
        vec3 d = b - a;
        float len = length(d);
        vec3 fd = len > 1e-4 ? d / len : vec3(0.0, -1.0, 0.0);
        vec3 up = abs(fd.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
        vec3 m1 = normalize(cross(fd, up));
        vec3 m2 = normalize(cross(fd, m1));

        float at = mix(clamp(gShape2.x, 0.0, 1.0), 1.0, hash11(gSeed + float(gen) * 17.0));
        float roll = hash11(gSeed + float(gen) * 7.3 + 3.1) * TAU;
        float sgn = hash11(gSeed + float(gen) * 5.5) < 0.5 ? -1.0 : 1.0;
        float ang = gShape.x * (1.0 + (hash11(gSeed + float(gen) * 2.9) - 0.5) * gShape.w);

        vec3 off = m1 * cos(roll) + m2 * sin(roll);
        vec3 nd = normalize(fd * cos(ang) + off * sin(ang) * sgn);

        vec3 root = mix(a, b, at);
        a = root;
        b = root + nd * len * gShape.y * pow(max(gShape.z, 0.01), float(gen));
      }
    }

    vec3 p = mix(a, b, t);
    p.y += gShape2.y * sin(t * PI);
    return p;
  }

  /** Metres of path, so the kink frequency means the same thing in every mode. */
  float pathSpan() {
    float len = length(gTo - gFrom);
    if (gMode < 1.5) return max(len, 0.01);                        // LINE, HELIX
    if (gMode < 2.5) return max(gShape.x * gShape.y * TAU, 0.01);  // ORBIT
    if (gMode < 3.5) return max(abs(gShape.y - gShape.x), 0.05);   // MEANDER
    if (gMode < 4.5) return max(gShape.x * gShape.y * TAU, 0.01);  // RIM
    return max(len, 0.01);                                         // CHAIN, LINK, SPIRAL, CRACK
  }

  /**
   * How lit this point of a chain is.
   *
   * The clock is a cursor in *hops*, not seconds — 'ArcNetwork' integrates
   * 'dt / hopTime' so that dragging the hop time never rewrites the past. A hop
   * is dark until the cursor reaches it, holds for 'hold' hops, then decays over
   * 'overlap' hops, which is the knob that decides whether the discharge is a
   * single travelling spark or a whole lit chain.
   */
  float chainLit(float t) {
    float segs = max(uNodeCount - 1.0, 1.0);
    float x = clamp(t, 0.0, 1.0) * segs;
    float s = min(floor(x), segs - 1.0);
    float u = x - s;

    float d = gShape2.x - s;
    float hold = max(gShape2.y, 0.0);
    float over = max(gShape2.z, 1e-3);
    float tip = max(gShape2.w, 1e-3);

    float lum = step(0.0, d) * (1.0 - smoothstep(hold, hold + over, d));
    // Inside the hop the front is crossing, only the part behind it exists.
    float drawn = mix(smoothstep(d, d - tip, u), 1.0, step(1.0, d));
    return lum * drawn;
  }

  void main() {
    float t = position.x;
    float side = position.y;
    vSide = side;

    /* ---- which role is this filament wearing ---- */
    // The instance index is tested against the live counts, so a role retires
    // the instant its count hits zero and the rest close up behind it.
    gMode = uMode[0]; gFrom = uFrom[0]; gTo = uTo[0];
    gShape = uShape[0]; gShape2 = uShape2[0]; gStyle = uStyle[0];
    gEnds = uEnds[0]; gDraw = uDraw[0];

    float local = aStrand;
    float count = 1.0;
    float acc = 0.0;
    for (int i = 0; i < ROLES; i++) {
      float n = max(uCount[i], 0.0);
      if (aStrand >= acc && aStrand < acc + n) {
        local = aStrand - acc;
        count = max(n, 1.0);
        gMode = uMode[i]; gFrom = uFrom[i]; gTo = uTo[i];
        gShape = uShape[i]; gShape2 = uShape2[i]; gStyle = uStyle[i];
        gEnds = uEnds[i]; gDraw = uDraw[i];
      }
      acc += n;
    }
    // Half-open on purpose: 0 and 1 would put two filaments on the same bearing
    // for every mode that fans around a circle.
    gF = local / count;

    // The strike index snaps every filament onto a new shape uRestrike times a
    // second; the crawl inside kink() slides it continuously in between. Both
    // together are what stops a held filament looking like a static ribbon.
    float strike = floor(uTime * max(uRestrike, 0.01));
    gSeed = hash11(aStrand * 7.13 + uSeed + strike * 3.77) * 97.0;

    vDim = gStyle.z;
    vLit = gMode > 4.5 && gMode < 5.5 ? chainLit(t) : 1.0;

    /* ---- the frame the offsets live in ---- */
    float step_ = 0.02;
    vec3 here = pathAt(t);
    vec3 behind = pathAt(max(t - step_, 0.0));
    vec3 ahead = pathAt(min(t + step_, 1.0));

    vec3 tangent = ahead - behind;
    tangent = length(tangent) > 1e-5 ? normalize(tangent) : vec3(0.0, 1.0, 0.0);
    vec3 upRef = abs(tangent.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 n1 = normalize(cross(tangent, upRef));
    vec3 n2 = normalize(cross(tangent, n1));

    /* ---- the kinks ---- */
    float pinch = max(uPinch, 1e-3);
    // Only LINE has an end it may leave loose: a bolt that lands somewhere other
    // than where it was aimed reads as a bug, but converge < 1 lets a fracture
    // fray. Every other mode is pinched at both ends.
    float converge = gMode < 0.5 ? clamp(gShape2.z, 0.0, 1.0) : 1.0;
    float ends = smoothstep(0.0, pinch, t) * mix(1.0, smoothstep(0.0, pinch, 1.0 - t), converge);

    vec2 k = kink(t, gSeed, pathSpan()) * gStyle.x * uJitter * ends;
    vec3 offset = n1 * k.x + n2 * k.y;
    // Ground roles keep their kinks in the floor plane. A free y here buries
    // half of every tendril and the effect reads as a broken dotted line.
    offset.y *= gStyle.w;

    vec3 world = here + offset;
    vec3 nextWorld = ahead + offset;
    world.y = max(world.y, gDraw.z);
    nextWorld.y = max(nextWorld.y, gDraw.z);

    /* ---- how much of it exists yet ---- */
    // The ribbon is drawn whole and clipped in the fragment rather than scaled,
    // so the *shape* never changes as the front travels — only how much of it
    // is there. Roles that never travel sit at progress 2 and skip all of this.
    float tipLen = max(gDraw.y, 1e-3);
    vDrawn = smoothstep(gDraw.x, gDraw.x - tipLen, t);
    vTip = smoothstep(gDraw.x - tipLen * 2.0, gDraw.x, t) * gDraw.w;

    /* ---- turn the ribbon to face the camera ---- */
    vec3 tan2 = nextWorld - world;
    tan2 = length(tan2) > 1e-5 ? normalize(tan2) : tangent;
    vec3 toCamera = normalize(cameraPosition - world);
    vec3 binormal = cross(tan2, toCamera);
    float bl = length(binormal);
    binormal = bl > 1e-4 ? binormal / bl : n1;

    /* ---- width ---- */
    // A stuttering per-filament blink, quantised to uFlickerSpeed so the whole
    // bundle strobes on one clock instead of shimmering independently.
    float flash = mix(1.0, hash11(floor(uTime * uFlickerSpeed) + aStrand * 3.7 + uSeed), uStrandFlash);
    vFlash = flash;

    // One-sided tapers, so a filament pinned at the hand can keep its full
    // width there while the loose end still comes to a point.
    float taperS = pow(max(sin(min(t, 0.5) * PI), 0.0), 0.35);
    float taperE = pow(max(sin(max(t, 0.5) * PI), 0.0), 0.35);
    vEndFade = mix(1.0, taperS, gEnds.x) * mix(1.0, taperE, gEnds.y);

    float halfWidth = uWidth * uWidthScale * gStyle.y;
    halfWidth *= mix(1.0, taperS, gEnds.z) * mix(1.0, taperE, gEnds.w);
    halfWidth *= flash * uFade;

    // World space throughout: the ability's group is an identity transform, and
    // going through modelMatrix would only invite it to drift.
    // Opt-in to the disruption field (vfx/SceneHooks.js). One compare against a
    // uniform when nothing is disrupting, and the field is smooth over metres,
    // so sampling it here and interpolating costs one varying instead of a
    // world position and a distance in every fragment of the strip.
    vDisrupt = disruptAt(world);

    vec4 mv = viewMatrix * vec4(world + binormal * side * halfWidth, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,S=`
  ${i}
  varying float vDisrupt;

  uniform float uTime;
  uniform float uSeed;
  uniform float uCoreSharp;
  uniform float uGlowFalloff;
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

  varying float vSide;
  varying float vDim;
  varying float vFlash;
  varying float vLit;
  varying float vDrawn;
  varying float vTip;
  varying float vEndFade;
  varying float vViewZ;

  ${c}
  ${d}

  void main() {
    // Ahead of the front, and behind a hop that has not lit yet, there is no
    // filament at all.
    float presence = vDrawn * vLit;
    if (presence <= 0.002) discard;

    float v = clamp(abs(vSide), 0.0, 1.0);

    #ifdef FILAMENT_GLOW
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
    color += uColorCore * vTip;

    // Quantised, not sinusoidal: real lightning stutters between brightnesses,
    // it does not breathe.
    float flicker = 1.0 - uFlicker * hash11(floor(uTime * uFlickerSpeed) + uSeed);

    // A loose end has to fade as well as thin. A ribbon that only narrows
    // leaves a hard dot at its tip.
    alpha *= vEndFade * presence * flicker * vFlash * vDim * uFade * uPassOpacity * uOpacity;

    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.003) discard;

    color *= uGlow * uGlobalGlow;
    disruptShade(color, alpha, vDisrupt, gl_FragCoord.xy);
    gl_FragColor = vec4(color, alpha);
  }
`,C=class{constructor(e,t){this._u=e,this.index=t,this._u.uMode.value[t]=m.LINE,this._u.uCount.value[t]=0,this.style(1,1,1,1),this.ends(1,1,1,1),this.draw(2,.08,-1e4,0)}get count(){return this._u.uCount.value[this.index]}set count(e){this._u.uCount.value[this.index]=Math.max(0,Math.round(e))}retire(){this._u.uCount.value[this.index]=0}style(e,t,n,r){return this._u.uStyle.value[this.index].set(e,t,n,r),this}ends(e,t,n,r){return this._u.uEnds.value[this.index].set(e,t,n,r),this}draw(e,t,n,r){return this._u.uDraw.value[this.index].set(e,t,n,r),this}line(e,t,n,r,i,a,o,s,c){return this._set(m.LINE,e,t,n,r,i,a,o,s,c,0)}helix(e,t,n,r,i,a,o,s,c){return this._set(m.HELIX,e,t,n,r,i,a,o,s,c,0)}orbit(e,t,n,r,i,a,o,s,c){return this._set(m.ORBIT,e,t,n,r,i,a,o,s,c,0)}meander(e,t,n,r,i,a,o,s,c){return this._set(m.MEANDER,e,t,n,r,i,a,o,s,c,0)}rim(e,t,n,r,i,a,o,s,c){return this._set(m.RIM,e,t,n,r,i,a,o,s,c,0)}chain(e,t,n,r,i,a,o,s,c,l){return this._set(m.CHAIN,e,t,n,r,i,a,o,s,c,l)}link(e,t,n,r,i,a,o,s){return this._set(m.LINK,e,t,n,r,i,a,o,s,0,0)}spiralIn(e,t,n,r,i,a,o,s,c){return this._set(m.SPIRAL_IN,e,t,n,r,i,a,o,s,c,0)}crack(e,t,n,r,i,a,o,s,c){return this._set(m.CRACK,e,t,n,r,i,a,o,s,c,0)}_set(e,t,n,r,i,a,o,s,c,l,u){let d=this.index,f=this._u;return f.uMode.value[d]=e,f.uFrom.value[d].copy(t),f.uTo.value[d].copy(n),f.uShape.value[d].set(r,i,a,o),f.uShape2.value[d].set(s,c,l,u),this}};function w(e,t){let n=Array(e);for(let r=0;r<e;r++)n[r]=t();return n}var T=class{constructor(i,o={}){let c=Math.max(2,Math.round(o.samples??72));this.capacity=Math.max(1,Math.round(o.capacity??48)),this.geometry=e(c,this.capacity),this.geometry.instanceCount=0;let d={uSeed:{value:0},uRestrike:{value:21},uFade:{value:1},uMode:{value:new Float32Array(4)},uCount:{value:new Float32Array(4)},uFrom:{value:w(4,()=>new l)},uTo:{value:w(4,()=>new l(0,1,0))},uShape:{value:w(4,()=>new u)},uShape2:{value:w(4,()=>new u)},uStyle:{value:w(4,()=>new u(1,1,1,1))},uEnds:{value:w(4,()=>new u(1,1,1,1))},uDraw:{value:w(4,()=>new u(2,.08,-1e4,0))},uNodes:{value:w(12,()=>new u)},uNodeCount:{value:2},uJitter:{value:1},uJitterScale:{value:1.4},uOctaves:{value:4},uJitterFalloff:{value:.55},uCrawl:{value:2.4},uPinch:{value:.16},uWidth:{value:.032},uStrandFlash:{value:.45},uFlickerSpeed:{value:30},uFlicker:{value:.26},uCoreSharp:{value:4.4},uGlowFalloff:{value:2.3},uSoftFade:{value:.7},uOpacity:{value:1},uGlow:{value:2.2},uColorCore:{value:new f(1,1,1)},uColorInner:{value:new f(.86,.82,1)},uColorOuter:{value:new f(.56,.42,1)},uColorHalo:{value:new f(.16,.05,.55)}};this.uniforms=d,this.group=new n,this.group.name=`FilamentPaths`,this.group.matrixAutoUpdate=!1,this.group.layers.set(o.layer??s.VFX),this.materials=[],this.meshes=[];for(let e of[h.GLOW,h.CORE]){let n=e===h.GLOW,i=new t({defines:n?{FILAMENT_GLOW:``}:{},transparent:!0,depthWrite:!1,depthTest:!0,blending:2,side:2,toneMapped:!1,uniforms:r({...d,...a(),uWidthScale:{value:n?6.2:1},uPassOpacity:{value:n?.44:1}}),vertexShader:x,fragmentShader:S}),c=new p(this.geometry,i);c.frustumCulled=!1,c.matrixAutoUpdate=!1,c.layers.set(o.layer??s.VFX),c.renderOrder=(o.renderOrder??11)+(n?0:2),this.group.add(c),this.materials.push(i),this.meshes.push(c),n?this.glowMaterial=i:this.coreMaterial=i}this.roles=w(4,()=>null);for(let e=0;e<4;e++)this.roles[e]=new C(d,e);this.setNode(0,0,0,0),this.setNode(1,1,0,0),i&&i.add(this.group)}get object3D(){return this.group}get drawCalls(){return this.meshes.length}get liveCount(){return this.geometry.instanceCount}set visible(e){this.group.visible=e}get visible(){return this.group.visible}role(e){return this.roles[e]}setNodeCount(e){return this.uniforms.uNodeCount.value=Math.max(2,Math.min(12,Math.round(e))),this.uniforms.uNodeCount.value}get nodeCount(){return this.uniforms.uNodeCount.value}setNode(e,t,n,r){e<0||e>=12||this.uniforms.uNodes.value[e].set(t,n,r,0)}nodePoint(e,t,n){let r=this.uniforms,i=r.uFrom.value[e],a=r.uTo.value[e],o=r.uShape.value[e],s=r.uNodes.value[Math.max(0,Math.min(11,t))];return y.set(a.x-i.x,0,a.z-i.z),y.lengthSq()>1e-8?(g.copy(y).normalize(),_.crossVectors(v,g).normalize()):_.set(1,0,0),n.copy(i).lerp(a,s.x),n.addScaledVector(_,s.y*o.x),n.y+=s.z*o.y,n}sync(e,t=1,n=0){let r=this.uniforms;r.uFade.value=t,r.uSeed.value=n,r.uRestrike.value=e.restrike??21;let i=0;for(let e=0;e<4;e++){let t=r.uCount.value[e],n=Math.max(0,this.capacity-i),a=Math.min(t,n);r.uCount.value[e]=a,i+=a}this.geometry.instanceCount=i;let a=e.randomness??1;r.uJitter.value=(e.jitter??1)*a*(e.noiseStrength??1),r.uJitterScale.value=(e.jitterScale??1.4)*(e.noiseFrequency??1),r.uOctaves.value=Math.round(e.octaves??4),r.uJitterFalloff.value=e.jitterFalloff??.55,r.uCrawl.value=(e.crawl??2.4)*(e.noiseSpeed??1),r.uPinch.value=e.pinch??.16,r.uWidth.value=e.width??.032,this.glowMaterial.uniforms.uWidthScale.value=e.glowWidth??6.2,this.glowMaterial.uniforms.uPassOpacity.value=e.glowOpacity??.44,r.uStrandFlash.value=e.strandFlash??.45,r.uFlickerSpeed.value=e.flickerSpeed??30,r.uFlicker.value=e.flicker??.26,r.uCoreSharp.value=e.coreSharp??4.4,r.uGlowFalloff.value=e.glowFalloff??2.3,r.uSoftFade.value=e.softFade??.7,r.uOpacity.value=(e.opacity??1)*(e.opacityScale??1),r.uGlow.value=(e.glow??2.2)*(e.glowScale??1),r.uColorCore.value.copy(o(e.colorCore??`#ffffff`)),r.uColorInner.value.copy(o(e.colorInner??`#dcd2ff`)),r.uColorOuter.value.copy(o(e.colorOuter??`#8f6bff`)),r.uColorHalo.value.copy(o(e.colorHalo??`#290d8c`))}clear(){for(let e=0;e<4;e++)this.uniforms.uCount.value[e]=0;this.geometry.instanceCount=0,this.uniforms.uFade.value=0}dispose(){this.geometry.dispose();for(let e of this.materials)e.dispose();this.group.parent?.remove(this.group)}};export{b as n,T as t};
//# sourceMappingURL=FilamentPaths-DR_e1O0e.js.map