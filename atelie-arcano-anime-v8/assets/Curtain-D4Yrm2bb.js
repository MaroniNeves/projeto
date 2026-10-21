import{$t as e,Br as t,Fn as n,G as r,Gr as i,Jt as a,K as o,L as s,Qt as c,V as l,Y as u,di as d,fi as f,q as p,xt as m,yn as h}from"./settings-DdywqLlV.js";var g=Object.freeze({RAIN:0,AURORA:1,SHAFT:2}),_=Object.freeze({LINE:0,RING:1,SCATTER:2}),v=32,y=`
  #define TAU 6.283185307179586

  uniform vec3  uAnchor;    // world foot of the curtain
  uniform vec3  uAxisX;     // the layout's +X, unit
  uniform vec3  uAxisY;     // the sheets' up, unit. Tilt it for slanted shafts.
  uniform vec3  uAxisZ;     // the layout's +Z, unit
  uniform int   uLayout;
  uniform float uCount;     // sheets drawn this frame
  uniform float uSpacing;   // metres between sheets (LINE)
  uniform float uRadius;    // metres (RING, SCATTER)
  uniform float uScatter;   // metres of hashed slop off the nominal place
  uniform float uSeed;

  /**
   * Where sheet 'slot' stands and which way it runs. Metres.
   *
   * @param dice (discRadius, discAngle, bearing, jitterAlong) — unitless rolls
   * @param jitterAcross a fifth roll, kept separate so SCATTER can spend four
   */
  void sheetFrame(float slot, vec4 dice, float jitterAcross,
                  out vec3 centre, out vec3 along, out vec3 norm) {
    float n = max(uCount, 1.0);

    if (uLayout == 1) {
      float a = (slot + 0.5) / n * TAU;
      vec3 dir = uAxisX * cos(a) + uAxisZ * sin(a);
      centre = uAnchor + dir * uRadius;
      along = -uAxisX * sin(a) + uAxisZ * cos(a);
      norm = dir;
    } else if (uLayout == 2) {
      // sqrt on the radial die, or every shaft crowds into the middle: the
      // area of an annulus grows with r, so a uniform die must be warped to
      // scatter uniformly over the disc.
      float rr = uRadius * sqrt(clamp(dice.x, 0.0, 1.0));
      float aa = dice.y * TAU;
      centre = uAnchor + (uAxisX * cos(aa) + uAxisZ * sin(aa)) * rr;
      float b = dice.z * TAU;
      along = uAxisX * cos(b) + uAxisZ * sin(b);
      norm = normalize(cross(along, uAxisY) + vec3(1e-5));
    } else {
      centre = uAnchor + uAxisX * ((slot - (n - 1.0) * 0.5) * uSpacing);
      along = uAxisX;
      norm = uAxisZ;
    }

    // A rank of identical sheets on an even pitch reads as a fence at any
    // distance. Two hashed metres of slop is all it takes to stop that, and it
    // is a *die* times a live metre — never a captured offset.
    centre += (along * (dice.w - 0.5) + norm * (jitterAcross - 0.5)) * uScatter * 2.0;
  }
`,b=`
  uniform float uTime;

  /* --- the body of a sheet --- */
  uniform float uWidth;        // metres
  uniform float uWidthJitter;  // ±fraction
  uniform float uHeight;       // metres
  uniform float uHeightJitter; // ±fraction
  uniform float uBase;         // metres the foot sits above the anchor plane
  uniform float uTaper;        // width multiplier at the top. <1 for a shaft.
  uniform float uLean;         // metres the top is pushed along the sheet normal
  uniform float uLeanJitter;   // ±fraction
  uniform float uRise;         // 0..1 how far the curtain has risen
  uniform float uRiseSpread;   // 0..1 stagger of that wave across the sheets

  /* --- the travelling ripple --- */
  uniform float uRippleAmp;        // metres
  uniform float uRippleLength;     // metres along the sheet, crest to crest
  uniform float uRippleSpeed;      // metres/second
  uniform float uRippleCurve;      // exponent on height: 0 rigid, >0 pinned foot
  uniform float uFoldAmp;          // metres — the second, longer fold
  uniform float uFoldLength;       // metres
  uniform float uFoldSpeed;        // metres/second
  uniform float uRippleNoise;      // metres of fbm slop on top
  uniform float uRippleNoiseScale; // cycles per metre
  uniform float uRippleNoiseSpeed; // Hz
  uniform float uPhaseSpread;      // turns of per-sheet phase offset

  attribute vec4  aDiceA;  // (discRadius, discAngle, bearing, jitterAlong)
  attribute vec4  aDiceB;  // (jitterAcross, width, height, lean)
  attribute float aSeed;   // phase / hue / reveal
  /** The instance's slot. Carried explicitly rather than read from
      gl_InstanceID, which does not exist in GLSL ES 1.00 and this project's
      raw materials are all compiled as ES 1.00. */
  attribute float aIndex;

  varying float vH;        // 0 at the foot, 1 at the head
  varying float vS;        // metres along the sheet from its centre
  varying float vHalf;     // metres — this sheet's half-width at this height
  varying float vSeed;
  varying float vGrow;     // 0..1 this sheet's own reveal
  varying vec3  vNormalW;
  varying vec3  vWorld;
  varying float vViewZ;

  ${u}
  ${y}

  /**
   * Lateral displacement of the sheet at 's' metres along it.
   *
   * The ripple travels along the sheet's *length*, not up it — that is what
   * makes a curtain fold rather than flap. A sine plus a longer, slower fold
   * plus a little fbm: the sine alone is a corrugated iron sheet, and the fbm
   * alone is a rag. The height curve pins the foot, because a curtain that
   * swings from the bottom reads as hanging cloth.
   */
  float sheetRipple(float s, float h, float phase) {
    float amp = pow(clamp(h, 0.0, 1.0), max(uRippleCurve, 0.0));
    float k1 = TAU / max(uRippleLength, 0.05);
    float k2 = TAU / max(uFoldLength, 0.05);
    float r = sin(s * k1 - uTime * uRippleSpeed * k1 + phase) * uRippleAmp;
    r += sin(s * k2 - uTime * uFoldSpeed * k2 + phase * 1.7) * uFoldAmp;
    if (uRippleNoise > 0.0) {
      r += fbm3(vec3(s * uRippleNoiseScale, h * 0.6,
                     uTime * uRippleNoiseSpeed + phase * 3.0)) * uRippleNoise;
    }
    return r * amp;
  }

  void main() {
    float slot = aIndex;
    vSeed = aSeed;

    vec3 centre;
    vec3 along;
    vec3 norm;
    sheetFrame(slot, aDiceA, aDiceB.x, centre, along, norm);

    // Staggered reveal. A curtain that appears all at once is a decal; one that
    // walks up the rank is a thing arriving.
    float g = clamp((uRise - aSeed * uRiseSpread) / max(1.0 - uRiseSpread, 1e-3), 0.0, 1.0);
    g = g * g * (3.0 - 2.0 * g);
    vGrow = g;

    float h = uv.y;
    float hh = h * g;
    vH = h;

    float w = uWidth * (1.0 + (aDiceB.y - 0.5) * 2.0 * uWidthJitter);
    w *= mix(1.0, uTaper, hh);
    vHalf = w * 0.5;

    float s = (uv.x - 0.5) * w;
    vS = s;

    float phase = aSeed * uPhaseSpread * TAU;
    float r = sheetRipple(s, hh, phase);

    vec3 pos = centre
             + along * s
             + uAxisY * (uBase + hh * uHeight * (1.0 + (aDiceB.z - 0.5) * 2.0 * uHeightJitter))
             + norm * (r + uLean * hh * (1.0 + (aDiceB.w - 0.5) * 2.0 * uLeanJitter));

    // The mesh normal is meaningless once the sheet has been rebuilt here, and
    // the grazing term is the whole reason the curtain reads as a volume — so
    // difference the ripple for a real one. dP/ds = along + norm·(dr/ds), and
    // the surface normal is that turned a quarter into the sheet.
    const float ds = 0.05;
    float dr = (sheetRipple(s + ds, hh, phase) - r) / ds;
    vNormalW = normalize(norm - along * dr);

    vWorld = pos;
    vec4 mv = viewMatrix * vec4(pos, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,x=`
  uniform float uTime;
  uniform int   uMode;
  uniform float uGlobalGlow;
  uniform float uShaderIntensity;
  uniform vec2  uResolution;
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;

  /* --- the two curves. See the header; they are meant to disagree. --- */
  uniform float uAlphaBase;     // coverage at the foot
  uniform float uAlphaTop;      // coverage at the head
  uniform float uAlphaCurve;    // exponent between them
  uniform float uEmissionBase;  // radiance at the foot
  uniform float uEmissionTop;   // radiance at the head
  uniform float uEmissionCurve; // exponent between them

  uniform float uBody;      // 0..1 how much α the sheet is allowed at all
  uniform float uFootFade;  // 0..1 of the height, feathering the bottom edge
  uniform float uHeadFade;  // 0..1 of the height, feathering the top edge
  uniform float uEdgeFade;  // 0..1 across the sheet, feathering the sides
  uniform float uGraze;     // 0..1 how much the 1/|N·V| term is applied
  uniform float uGrazeFloor;// clamp on |N·V| — 0.1 gives a 10× ceiling
  uniform float uSoftFade;  // metres of depth fade against opaque geometry

  /* --- RAIN --- */
  uniform float uStreakDensity;    // lanes per metre across the face
  uniform float uStreakRepeat;     // streaks per sheet height
  uniform float uStreakSpeed;      // sheet heights per second
  uniform float uStreakSpeedJitter;// ±fraction, per lane
  uniform float uStreakWidth;      // 0..1 of a lane
  uniform float uStreakTail;       // 0..1 of a repeat — the trailing smear
  uniform float uStreakDuty;       // 0..1 of lanes that carry a streak
  uniform float uHaze;             // the veil between the streaks

  /* --- AURORA --- */
  uniform float uRayScale;   // cycles per metre of the vertical striations
  uniform float uRaySpeed;   // Hz
  uniform float uRaySharp;
  uniform float uBandScale;  // cycles per metre of the hue banding
  uniform float uBandSpeed;  // Hz
  uniform float uHem;        // 0..1 of the height — the coloured bottom band

  /* --- SHAFT --- */
  uniform float uCoreWidth;   // 0..1 of the half-width — the gaussian core
  uniform float uCanopy;      // 0..1 threshold — how much light gets through
  uniform float uCanopySoft;  // 0..1 of the field
  uniform float uCanopyScale; // cycles per metre along the sheet
  uniform float uMote;        // dust motes
  uniform float uMoteScale;   // motes per metre
  uniform float uMoteSize;
  uniform float uMoteDrift;   // metres/second the motes settle

  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  uniform vec3  uColorHem;
  uniform vec3  uColorCore;
  uniform vec3  uColorMote;
  uniform vec3  uColorBody;   // what the sheet OCCLUDES with, independent of its light
  uniform float uTintSpread;  // 0..1 how far apart neighbouring sheets are tinted
  uniform float uGlow;
  uniform float uOpacity;

  varying float vH;
  varying float vS;
  varying float vHalf;
  varying float vSeed;
  varying float vGrow;
  varying vec3  vNormalW;
  varying vec3  vWorld;
  varying float vViewZ;

  ${u}
  ${p}

  void main() {
    float h = clamp(vH, 0.0, 1.0);
    float across = clamp(abs(vS) / max(vHalf, 1e-4), 0.0, 1.0);

    /* ---------------- the two curves ---------------- */
    float aFall = mix(uAlphaTop, uAlphaBase, pow(1.0 - h, max(uAlphaCurve, 0.01)));
    float eFall = mix(uEmissionTop, uEmissionBase, pow(1.0 - h, max(uEmissionCurve, 0.01)));

    /* ---------------- the envelope ---------------- */
    float env = smoothstep(0.0, max(uFootFade, 1e-3), h)
              * (1.0 - smoothstep(1.0 - max(uHeadFade, 1e-3), 1.0, h))
              * (1.0 - smoothstep(1.0 - max(uEdgeFade, 1e-3), 1.0, across))
              * vGrow;

    /* ---------------- the grazing term ---------------- */
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vWorld);
    float path = 1.0 / max(abs(dot(N, V)), max(uGrazeFloor, 0.02));
    path = mix(1.0, path, clamp(uGraze, 0.0, 1.0));

    /* ---------------- the mode ---------------- */
    float cov = 0.0;     // what covers  (feeds α)
    float emit = 0.0;    // what shines  (feeds the emissive)
    vec3  tint = uColorA;

    if (uMode == 0) {
      /* ---- RAIN ---- */
      float lane = vS * max(uStreakDensity, 0.1);
      float id = floor(lane);
      float r1 = hash11(id * 1.37 + vSeed * 91.0);
      float r2 = hash11(id * 4.11 + vSeed * 17.0);
      float spd = mix(1.0 - uStreakSpeedJitter, 1.0 + uStreakSpeedJitter, r2);

      // The pattern scrolls toward the foot, so the bright q ≈ 0 end is the
      // head of the drop and the exponential trails up behind it.
      float q = fract(h * max(uStreakRepeat, 0.1) + uTime * uStreakSpeed * spd + r1);
      float head = exp(-q / max(uStreakTail, 1e-3));

      // Antialias floor, straight out of the archived wind material: widen the
      // lane to at least a pixel, then fade what is left into the lane's own
      // average once the pitch stops resolving. Without the second half a
      // distant curtain is a stipple of beating dots rather than a haze.
      float d = abs(fract(lane) - 0.5) * 2.0;
      float aa = fwidth(lane);
      float w0 = max(uStreakWidth, 0.02);
      float w = max(w0, aa * 2.0);
      float core = 1.0 - smoothstep(0.0, w, d);
      float resolve = 1.0 - smoothstep(w0 * 0.35, w0 * 1.5, aa);
      core = mix(clamp(w, 0.0, 1.0) * 0.5, core, resolve);

      float lit = step(1.0 - clamp(uStreakDuty, 0.0, 1.0), hash11(id * 7.71 + vSeed * 5.0));
      lit = mix(clamp(uStreakDuty, 0.0, 1.0), lit, resolve);

      float streak = core * head * lit;
      cov = streak + uHaze * 0.35;
      emit = streak * 0.6 + uHaze * 0.1;
      tint = mix(uColorA, uColorB, clamp(head, 0.0, 1.0));
    } else if (uMode == 1) {
      /* ---- AURORA ---- */
      // Rays sampled on the sheet's length ALONE. Feed the height in as well —
      // the obvious thing — and the striations break into blotches, because a
      // ray is by definition a field that does not vary along a field line.
      float ray = fbm3(vec3(vS * uRayScale, uTime * uRaySpeed + vSeed * 13.0, 0.0));
      ray = smoothstep(-0.15, max(uRaySharp, 0.05), ray);
      float fine = fbm3(vec3(vS * uRayScale * 3.7, uTime * uRaySpeed * 1.6 + vSeed * 3.0, 9.0));
      ray *= 0.6 + 0.6 * (fine * 0.5 + 0.5);

      float band = fbm3(vec3(vS * uBandScale, uTime * uBandSpeed + vSeed * 7.0, 5.0)) * 0.5 + 0.5;
      band = clamp(band + (vSeed - 0.5) * uTintSpread, 0.0, 1.0);
      tint = band < 0.5 ? mix(uColorA, uColorB, band * 2.0)
                        : mix(uColorB, uColorC, (band - 0.5) * 2.0);

      // The hem. Real aurora carries a band of a different gas along its bottom
      // edge; without it the curtain is a green rag with a straight cut.
      float hem = 1.0 - smoothstep(0.0, max(uHem, 1e-3), h);
      tint = mix(tint, uColorHem, hem);

      cov = ray * 0.5;
      emit = ray + hem * 0.35;
    } else {
      /* ---- SHAFT ---- */
      // A gaussian across the sheet, not a smoothstep: a shaft has no edge, it
      // has a falloff, and a smoothstep draws the plane it is standing in.
      float core = exp(-(across * across) / max(uCoreWidth * uCoreWidth, 1e-4));

      // The canopy. A fixed field along the sheet, seeded per shaft, so each one
      // has its own silhouette of leaf gaps and they do not all flicker together.
      float leaf = fbm3(vec3(vS * uCanopyScale, vSeed * 23.0, 0.0)) * 0.5 + 0.5;
      float gate = smoothstep(uCanopy, uCanopy + max(uCanopySoft, 1e-3), leaf);

      float motes = 0.0;
      if (uMote > 0.0) {
        vec3 mp = vWorld * max(uMoteScale, 0.05) + vec3(0.0, uTime * uMoteDrift, 0.0);
        vec3 cell = floor(mp);
        vec3 fr = fract(mp) - 0.5;
        float hh = hash13(cell);
        vec3 off = (hash31(hh * 37.1) - 0.5) * 0.6;
        float dd = length(fr - off);
        motes = smoothstep(0.62, 0.97, hh) * exp(-dd / max(uMoteSize, 1e-3)) * uMote;
      }

      tint = mix(uColorCore, uColorA, clamp(across, 0.0, 1.0));
      cov = core * gate * 0.4;
      emit = core * gate + motes;
      tint = mix(tint, uColorMote, clamp(motes, 0.0, 1.0));
    }

    /* ---------------- composite, premultiplied ---------------- */
    float alpha = clamp(cov * aFall * env * path * uBody * uOpacity, 0.0, 1.0);
    vec3 emissive = tint * (emit * eFall * env * path * uGlow * uOpacity)
                  * uGlobalGlow * mix(0.7, 1.0, uShaderIntensity);

    vec2 screenUV = gl_FragCoord.xy / uResolution;
    float soft = softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, max(uSoftFade, 1e-3));
    alpha *= soft;
    emissive *= soft;

    if (alpha < 0.002 && max(emissive.r, max(emissive.g, emissive.b)) < 0.002) discard;

    gl_FragColor = vec4(uColorBody * alpha + emissive, alpha);
  }
`,S=`
  uniform float uFloorSize;   // metres, the quad's full extent

  varying vec2  vLocal;       // metres from the anchor, in the floor plane
  varying vec3  vWorld;
  varying float vViewZ;

  ${y}

  void main() {
    vec2 ext = (uv - 0.5) * uFloorSize;
    vLocal = ext;
    // Lifted a hair off the ground so it never z-fights the stage floor.
    vec3 world = uAnchor + uAxisX * ext.x + uAxisZ * ext.y + uAxisY * 0.012;
    vWorld = world;
    vec4 mv = viewMatrix * vec4(world, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,C=`
  uniform float     uTime;
  uniform sampler2D uEnvMap;
  uniform vec3      uLightDir;
  uniform float     uGlobalGlow;
  uniform float     uShaderIntensity;
  uniform vec2      uResolution;
  uniform sampler2D uSceneDepth;
  uniform float     uCameraNear;
  uniform float     uCameraFar;

  uniform float uFloorSize;
  uniform float uFloorFade;     // 0..1 of the half-extent where the quad dies
  uniform float uWet;           // 0..1 how wet the stone is
  uniform float uWetDark;       // 0..1 how much wet stone darkens
  uniform float uSheen;         // env reflection gain
  uniform float uSheenRough;    // cycles per metre of the surface ripple
  uniform float uSheenSpeed;    // Hz
  uniform float uFresnel;

  uniform float uPool;          // 0..1 master on the per-sheet footprints
  uniform float uPoolWidth;     // metres either side of a sheet
  uniform float uPoolLength;    // 0..1 of the sheet's own half-width
  uniform float uPoolSoft;      // metres of feather

  uniform float uRings;         // 0..1 master
  uniform float uRingScale;     // cells per metre
  uniform float uRingPeriod;    // seconds per ring
  uniform float uRingRadius;    // metres a ring reaches
  uniform float uRingWidth;     // metres

  uniform vec3  uColorWet;
  uniform vec3  uColorPool;
  uniform vec3  uColorRing;
  uniform float uFloorOpacity;

  /* --- the sheets' dice, mirrored so the pools land under them --- */
  uniform vec4  uSheetDice[${v}];   // (discR, discA, bearing, jitterAlong)
  uniform float uSheetJitter[${v}]; // the fifth roll, jitterAcross
  uniform float uSheetHalf;     // metres — half of the sheets' nominal width

  varying vec2  vLocal;
  varying vec3  vWorld;
  varying float vViewZ;

  ${u}
  ${p}
  ${y}

  // equirectUv comes from commonGLSL above. (No backticks in here: the file is
  // one template literal and a stray one ends it mid-shader.)

  void main() {
    /* ---------------- the sheen ---------------- */
    float sc = max(uSheenRough, 0.02);
    float e = 0.4 / sc;
    float t = uTime * uSheenSpeed;
    float n0 = fbm3(vec3(vLocal * sc, t));
    float nx = fbm3(vec3((vLocal + vec2(e, 0.0)) * sc, t));
    float nz = fbm3(vec3((vLocal + vec2(0.0, e)) * sc, t));
    vec3 nLocal = normalize(vec3(-(nx - n0) / e, 1.0, -(nz - n0) / e) * vec3(uWet, 1.0, uWet));
    vec3 N = normalize(uAxisX * nLocal.x + uAxisY * nLocal.y + uAxisZ * nLocal.z);

    vec3 V = normalize(cameraPosition - vWorld);
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float fres = clamp((0.02 + 0.98 * pow(1.0 - ndv, 5.0)) * uFresnel, 0.0, 1.0);

    vec3 refl = reflect(-V, N);
    vec3 env = texture2D(uEnvMap, equirectUv(refl)).rgb;
    float glint = pow(max(dot(refl, normalize(uLightDir)), 0.0), 90.0);

    /* ---------------- the pools ---------------- */
    float pool = 0.0;
    if (uPool > 0.001) {
      for (int i = 0; i < ${v}; i++) {
        if (float(i) >= uCount) break;
        vec3 centre;
        vec3 along;
        vec3 norm;
        sheetFrame(float(i), uSheetDice[i], uSheetJitter[i], centre, along, norm);

        // Distance to the sheet's footprint, treated as a segment: the puddle
        // under a two-metre sheet is a two-metre puddle, not a circle.
        vec3 rel = vWorld - centre;
        float a = dot(rel, along);
        float half_ = uSheetHalf * clamp(uPoolLength, 0.0, 2.0);
        a -= clamp(a, -half_, half_);
        float b = dot(rel, norm);
        float d = length(vec2(a, b));
        pool = max(pool, 1.0 - smoothstep(max(uPoolWidth - uPoolSoft, 0.0), uPoolWidth, d));
      }
      pool *= clamp(uPool, 0.0, 1.0);
    }

    /* ---------------- the rings ---------------- */
    float ring = 0.0;
    if (uRings > 0.001) {
      vec2 g = vLocal * max(uRingScale, 0.05);
      vec2 id = floor(g);
      vec2 fr = fract(g) - 0.5;
      float cellSize = 1.0 / max(uRingScale, 0.05);
      float hcell = hash13(vec3(id, 3.7));
      vec2 off = (hash21(hcell * 71.3) - 0.5) * 0.7;
      float d = length(fr - off) * cellSize;
      float age = fract(uTime / max(uRingPeriod, 0.05) + hcell);
      float r = age * uRingRadius;
      ring = exp(-abs(d - r) / max(uRingWidth, 1e-3)) * (1.0 - age) * uRings;
    }

    /* ---------------- composite ---------------- */
    float edge = 1.0 - smoothstep(1.0 - max(uFloorFade, 1e-3), 1.0,
                                  length(vLocal) / max(uFloorSize * 0.5, 1e-3));

    // Wetness *darkens*, which premultiplied alpha can express and additive
    // cannot: a low-luminance rgb with a real α subtracts from what is behind.
    float wet = clamp(uWet * (0.35 + 0.65 * pool), 0.0, 1.0) * edge;
    float alpha = clamp(wet * uWetDark, 0.0, 1.0) * uFloorOpacity;

    vec3 emissive = (env * uSheen + uColorWet * glint * uSheen) * fres * wet;
    emissive += uColorPool * pool * edge * uFloorOpacity;
    emissive += uColorRing * ring * edge * uFloorOpacity;
    emissive *= uGlobalGlow * mix(0.7, 1.0, uShaderIntensity);

    vec2 screenUV = gl_FragCoord.xy / uResolution;
    float soft = softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, 0.25);
    alpha *= soft;
    emissive *= soft;

    if (alpha < 0.002 && max(emissive.r, max(emissive.g, emissive.b)) < 0.002) discard;

    gl_FragColor = vec4(uColorWet * alpha + emissive, alpha);
  }
`,w={count:7,spacing:1.4,radius:5,scatter:.35,seed:0,width:4,widthJitter:.25,height:5,heightJitter:.2,base:0,taper:1,lean:.6,leanJitter:.5,rise:1,riseSpread:.45,rippleAmp:.5,rippleLength:3.2,rippleSpeed:1.1,rippleCurve:1.2,foldAmp:.9,foldLength:9,foldSpeed:.45,rippleNoise:.18,rippleNoiseScale:.35,rippleNoiseSpeed:.15,phaseSpread:1,alphaBase:1,alphaTop:0,alphaCurve:2.4,emissionBase:1,emissionTop:.35,emissionCurve:.7,body:.25,footFade:.03,headFade:.25,edgeFade:.3,graze:1,grazeFloor:.12,softFade:.5,opacity:1,glow:1.2,tintSpread:.4,streakDensity:9,streakRepeat:2.4,streakSpeed:1.6,streakSpeedJitter:.35,streakWidth:.14,streakTail:.09,streakDuty:.55,haze:.35,rayScale:.9,raySpeed:.07,raySharp:.45,bandScale:.12,bandSpeed:.04,hem:.12,coreWidth:.45,canopy:.4,canopySoft:.25,canopyScale:.6,mote:.7,moteScale:2.2,moteSize:.06,moteDrift:.06,colorA:`#5fffc0`,colorB:`#3a9aff`,colorC:`#c05fff`,colorHem:`#ff5f9a`,colorCore:`#e8f0c0`,colorMote:`#ffffff`,colorBody:`#101c2a`,floorSize:18,floorFade:.35,wet:.7,wetDark:.55,sheen:.8,sheenRough:1.1,sheenSpeed:.5,floorFresnel:1.4,pool:1,poolWidth:1.6,poolLength:1,poolSoft:1.1,rings:.8,ringScale:.55,ringPeriod:.9,ringRadius:.5,ringWidth:.035,floorOpacity:1,colorWet:`#101c2a`,colorPool:`#2a4258`,colorRing:`#c8dcea`};function T(){return{...w}}var E=(e,t)=>e??t,D=new d,O=new d,k=new d,A=new d,j=new d,M=new d,N=class{constructor({capacity:r=16,segmentsX:s=32,segmentsY:u=16,mode:f=g.AURORA,layout:p=_.LINE,floor:v=!1,renderOrder:y=8,name:S=`Curtain`}={}){this.capacity=Math.max(1,Math.round(r)),this.group=new a,this.group.name=S,this.group.matrixAutoUpdate=!1;let C=new n(1,1,Math.max(1,s|0),Math.max(1,u|0));this._diceA=new Float32Array(this.capacity*4),this._diceB=new Float32Array(this.capacity*4),this._seeds=new Float32Array(this.capacity);let T=new Float32Array(this.capacity);for(let e=0;e<this.capacity;e++)T[e]=e;let E=new e;E.setAttribute(`position`,C.getAttribute(`position`)),E.setAttribute(`uv`,C.getAttribute(`uv`)),E.setIndex(C.getIndex()),E.setAttribute(`aDiceA`,new c(this._diceA,4)),E.setAttribute(`aDiceB`,new c(this._diceB,4)),E.setAttribute(`aSeed`,new c(this._seeds,1)),E.setAttribute(`aIndex`,new c(T,1)),E.instanceCount=0,E.boundingSphere=new i(new d,1e4),this.geometry=E;let D={uAnchor:{value:new d},uAxisX:{value:new d(1,0,0)},uAxisY:{value:new d(0,1,0)},uAxisZ:{value:new d(0,0,1)},uLayout:{value:p},uCount:{value:w.count},uSpacing:{value:w.spacing},uRadius:{value:w.radius},uScatter:{value:w.scatter},uSeed:{value:w.seed}};this._layoutUniforms=D,this.material=new t({name:`${S}:sheets`,transparent:!0,depthWrite:!1,depthTest:!0,side:2,toneMapped:!1,blending:5,blendEquation:100,blendSrc:201,blendDst:205,blendEquationAlpha:100,blendSrcAlpha:201,blendDstAlpha:205,uniforms:o({...D,uMode:{value:f},uWidth:{value:w.width},uWidthJitter:{value:w.widthJitter},uHeight:{value:w.height},uHeightJitter:{value:w.heightJitter},uBase:{value:w.base},uTaper:{value:w.taper},uLean:{value:w.lean},uLeanJitter:{value:w.leanJitter},uRise:{value:w.rise},uRiseSpread:{value:w.riseSpread},uRippleAmp:{value:w.rippleAmp},uRippleLength:{value:w.rippleLength},uRippleSpeed:{value:w.rippleSpeed},uRippleCurve:{value:w.rippleCurve},uFoldAmp:{value:w.foldAmp},uFoldLength:{value:w.foldLength},uFoldSpeed:{value:w.foldSpeed},uRippleNoise:{value:w.rippleNoise},uRippleNoiseScale:{value:w.rippleNoiseScale},uRippleNoiseSpeed:{value:w.rippleNoiseSpeed},uPhaseSpread:{value:w.phaseSpread},uAlphaBase:{value:w.alphaBase},uAlphaTop:{value:w.alphaTop},uAlphaCurve:{value:w.alphaCurve},uEmissionBase:{value:w.emissionBase},uEmissionTop:{value:w.emissionTop},uEmissionCurve:{value:w.emissionCurve},uBody:{value:w.body},uFootFade:{value:w.footFade},uHeadFade:{value:w.headFade},uEdgeFade:{value:w.edgeFade},uGraze:{value:w.graze},uGrazeFloor:{value:w.grazeFloor},uSoftFade:{value:w.softFade},uStreakDensity:{value:w.streakDensity},uStreakRepeat:{value:w.streakRepeat},uStreakSpeed:{value:w.streakSpeed},uStreakSpeedJitter:{value:w.streakSpeedJitter},uStreakWidth:{value:w.streakWidth},uStreakTail:{value:w.streakTail},uStreakDuty:{value:w.streakDuty},uHaze:{value:w.haze},uRayScale:{value:w.rayScale},uRaySpeed:{value:w.raySpeed},uRaySharp:{value:w.raySharp},uBandScale:{value:w.bandScale},uBandSpeed:{value:w.bandSpeed},uHem:{value:w.hem},uCoreWidth:{value:w.coreWidth},uCanopy:{value:w.canopy},uCanopySoft:{value:w.canopySoft},uCanopyScale:{value:w.canopyScale},uMote:{value:w.mote},uMoteScale:{value:w.moteScale},uMoteSize:{value:w.moteSize},uMoteDrift:{value:w.moteDrift},uColorA:{value:new m(w.colorA)},uColorB:{value:new m(w.colorB)},uColorC:{value:new m(w.colorC)},uColorHem:{value:new m(w.colorHem)},uColorCore:{value:new m(w.colorCore)},uColorMote:{value:new m(w.colorMote)},uColorBody:{value:new m(w.colorBody)},uTintSpread:{value:w.tintSpread},uGlow:{value:w.glow},uOpacity:{value:w.opacity}}),vertexShader:b,fragmentShader:x}),this.mesh=new h(E,this.material),this.mesh.name=`${S}:sheets`,this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=!1,this.mesh.layers.set(l.VFX),this.mesh.renderOrder=y,this.group.add(this.mesh),this.floorMesh=null,this.floorMaterial=null,this._sheetDice=null,this._sheetJitter=null,v&&this._buildFloor(S,y,D),this.roll()}_buildFloor(e,i,a){this._sheetDice=[];for(let e=0;e<v;e++)this._sheetDice.push(new f(0,0,0,0));this._sheetJitter=new Float32Array(v),this.floorMaterial=new t({name:`${e}:floor`,transparent:!0,depthWrite:!1,depthTest:!0,side:2,toneMapped:!1,blending:5,blendEquation:100,blendSrc:201,blendDst:205,blendEquationAlpha:100,blendSrcAlpha:201,blendDstAlpha:205,uniforms:o({...a,uEnvMap:r.uEnvMap,uFloorSize:{value:w.floorSize},uFloorFade:{value:w.floorFade},uWet:{value:w.wet},uWetDark:{value:w.wetDark},uSheen:{value:w.sheen},uSheenRough:{value:w.sheenRough},uSheenSpeed:{value:w.sheenSpeed},uFresnel:{value:w.floorFresnel},uPool:{value:w.pool},uPoolWidth:{value:w.poolWidth},uPoolLength:{value:w.poolLength},uPoolSoft:{value:w.poolSoft},uRings:{value:w.rings},uRingScale:{value:w.ringScale},uRingPeriod:{value:w.ringPeriod},uRingRadius:{value:w.ringRadius},uRingWidth:{value:w.ringWidth},uColorWet:{value:new m(w.colorWet)},uColorPool:{value:new m(w.colorPool)},uColorRing:{value:new m(w.colorRing)},uFloorOpacity:{value:w.floorOpacity},uSheetDice:{value:this._sheetDice},uSheetJitter:{value:this._sheetJitter},uSheetHalf:{value:w.width*.5}}),vertexShader:S,fragmentShader:C}),this.floorMesh=new h(new n(1,1,1,1),this.floorMaterial),this.floorMesh.name=`${e}:floor`,this.floorMesh.frustumCulled=!1,this.floorMesh.matrixAutoUpdate=!1,this.floorMesh.layers.set(l.VFX),this.floorMesh.renderOrder=i-1,this.group.add(this.floorMesh)}get object3D(){return this.group}get uniforms(){return this.material.uniforms}get drawCalls(){return this.floorMesh?2:1}get instanceCount(){return this.geometry.instanceCount}get visible(){return this.group.visible}set visible(e){this.group.visible=!!e}get mode(){return this.material.uniforms.uMode.value}set mode(e){this.material.uniforms.uMode.value=e|0}get layout(){return this._layoutUniforms.uLayout.value}set layout(e){this._layoutUniforms.uLayout.value=e|0}setPlacement(e,t,n){let r=this._layoutUniforms;return r.uAnchor.value.copy(e),D.copy(t).normalize(),k.crossVectors(n,D).normalize(),O.crossVectors(D,k).normalize(),r.uAxisX.value.copy(D),r.uAxisY.value.copy(O),r.uAxisZ.value.copy(k),this}roll(e=Math.random()*100){this._layoutUniforms.uSeed.value=e;for(let e=0;e<this.capacity;e++){let t=e*4;this._diceA[t+0]=Math.random(),this._diceA[t+1]=Math.random(),this._diceA[t+2]=Math.random(),this._diceA[t+3]=Math.random(),this._diceB[t+0]=Math.random(),this._diceB[t+1]=Math.random(),this._diceB[t+2]=Math.random(),this._diceB[t+3]=Math.random(),this._seeds[e]=Math.random()}if(this.geometry.getAttribute(`aDiceA`).needsUpdate=!0,this.geometry.getAttribute(`aDiceB`).needsUpdate=!0,this.geometry.getAttribute(`aSeed`).needsUpdate=!0,this._sheetDice)for(let e=0;e<v;e++){let t=(e<this.capacity?e:0)*4;this._sheetDice[e].set(this._diceA[t+0],this._diceA[t+1],this._diceA[t+2],this._diceA[t+3]),this._sheetJitter[e]=this._diceB[t+0]}return this}reset(){return this.geometry.instanceCount=0,this.group.visible=!1,this}update(e,t){let n=this.material.uniforms,r=this._layoutUniforms,i=Math.max(0,Math.min(this.capacity,Math.round(E(t.count,w.count))));if(this.geometry.instanceCount=i,r.uCount.value=i,r.uSpacing.value=E(t.spacing,w.spacing),r.uRadius.value=E(t.radius,w.radius),r.uScatter.value=E(t.scatter,w.scatter),t.seed!==void 0&&t.seed!==null&&(r.uSeed.value=t.seed),n.uWidth.value=E(t.width,w.width),n.uWidthJitter.value=E(t.widthJitter,w.widthJitter),n.uHeight.value=E(t.height,w.height),n.uHeightJitter.value=E(t.heightJitter,w.heightJitter),n.uBase.value=E(t.base,w.base),n.uTaper.value=E(t.taper,w.taper),n.uLean.value=E(t.lean,w.lean),n.uLeanJitter.value=E(t.leanJitter,w.leanJitter),n.uRise.value=E(t.rise,w.rise),n.uRiseSpread.value=Math.min(E(t.riseSpread,w.riseSpread),.95),n.uRippleAmp.value=E(t.rippleAmp,w.rippleAmp),n.uRippleLength.value=E(t.rippleLength,w.rippleLength),n.uRippleSpeed.value=E(t.rippleSpeed,w.rippleSpeed),n.uRippleCurve.value=E(t.rippleCurve,w.rippleCurve),n.uFoldAmp.value=E(t.foldAmp,w.foldAmp),n.uFoldLength.value=E(t.foldLength,w.foldLength),n.uFoldSpeed.value=E(t.foldSpeed,w.foldSpeed),n.uRippleNoise.value=E(t.rippleNoise,w.rippleNoise),n.uRippleNoiseScale.value=E(t.rippleNoiseScale,w.rippleNoiseScale),n.uRippleNoiseSpeed.value=E(t.rippleNoiseSpeed,w.rippleNoiseSpeed),n.uPhaseSpread.value=E(t.phaseSpread,w.phaseSpread),n.uAlphaBase.value=E(t.alphaBase,w.alphaBase),n.uAlphaTop.value=E(t.alphaTop,w.alphaTop),n.uAlphaCurve.value=E(t.alphaCurve,w.alphaCurve),n.uEmissionBase.value=E(t.emissionBase,w.emissionBase),n.uEmissionTop.value=E(t.emissionTop,w.emissionTop),n.uEmissionCurve.value=E(t.emissionCurve,w.emissionCurve),n.uBody.value=E(t.body,w.body),n.uFootFade.value=E(t.footFade,w.footFade),n.uHeadFade.value=E(t.headFade,w.headFade),n.uEdgeFade.value=E(t.edgeFade,w.edgeFade),n.uGraze.value=E(t.graze,w.graze),n.uGrazeFloor.value=E(t.grazeFloor,w.grazeFloor),n.uSoftFade.value=E(t.softFade,w.softFade),n.uStreakDensity.value=E(t.streakDensity,w.streakDensity),n.uStreakRepeat.value=E(t.streakRepeat,w.streakRepeat),n.uStreakSpeed.value=E(t.streakSpeed,w.streakSpeed),n.uStreakSpeedJitter.value=E(t.streakSpeedJitter,w.streakSpeedJitter),n.uStreakWidth.value=E(t.streakWidth,w.streakWidth),n.uStreakTail.value=E(t.streakTail,w.streakTail),n.uStreakDuty.value=E(t.streakDuty,w.streakDuty),n.uHaze.value=E(t.haze,w.haze),n.uRayScale.value=E(t.rayScale,w.rayScale),n.uRaySpeed.value=E(t.raySpeed,w.raySpeed),n.uRaySharp.value=E(t.raySharp,w.raySharp),n.uBandScale.value=E(t.bandScale,w.bandScale),n.uBandSpeed.value=E(t.bandSpeed,w.bandSpeed),n.uHem.value=E(t.hem,w.hem),n.uCoreWidth.value=E(t.coreWidth,w.coreWidth),n.uCanopy.value=E(t.canopy,w.canopy),n.uCanopySoft.value=E(t.canopySoft,w.canopySoft),n.uCanopyScale.value=E(t.canopyScale,w.canopyScale),n.uMote.value=E(t.mote,w.mote),n.uMoteScale.value=E(t.moteScale,w.moteScale),n.uMoteSize.value=E(t.moteSize,w.moteSize),n.uMoteDrift.value=E(t.moteDrift,w.moteDrift),n.uTintSpread.value=E(t.tintSpread,w.tintSpread),n.uGlow.value=E(t.glow,w.glow),n.uOpacity.value=E(t.opacity,w.opacity),s(n.uColorA.value,t.colorA||w.colorA),s(n.uColorB.value,t.colorB||w.colorB),s(n.uColorC.value,t.colorC||w.colorC),s(n.uColorHem.value,t.colorHem||w.colorHem),s(n.uColorCore.value,t.colorCore||w.colorCore),s(n.uColorMote.value,t.colorMote||w.colorMote),s(n.uColorBody.value,t.colorBody||w.colorBody),this.floorMaterial){let e=this.floorMaterial.uniforms;e.uFloorSize.value=E(t.floorSize,w.floorSize),e.uFloorFade.value=E(t.floorFade,w.floorFade),e.uWet.value=E(t.wet,w.wet),e.uWetDark.value=E(t.wetDark,w.wetDark),e.uSheen.value=E(t.sheen,w.sheen),e.uSheenRough.value=E(t.sheenRough,w.sheenRough),e.uSheenSpeed.value=E(t.sheenSpeed,w.sheenSpeed),e.uFresnel.value=E(t.floorFresnel,w.floorFresnel),e.uPool.value=E(t.pool,w.pool),e.uPoolWidth.value=E(t.poolWidth,w.poolWidth),e.uPoolLength.value=E(t.poolLength,w.poolLength),e.uPoolSoft.value=E(t.poolSoft,w.poolSoft),e.uRings.value=E(t.rings,w.rings),e.uRingScale.value=E(t.ringScale,w.ringScale),e.uRingPeriod.value=E(t.ringPeriod,w.ringPeriod),e.uRingRadius.value=E(t.ringRadius,w.ringRadius),e.uRingWidth.value=E(t.ringWidth,w.ringWidth),e.uFloorOpacity.value=E(t.floorOpacity,w.floorOpacity),e.uSheetHalf.value=E(t.width,w.width)*.5,s(e.uColorWet.value,t.colorWet||w.colorWet),s(e.uColorPool.value,t.colorPool||w.colorPool),s(e.uColorRing.value,t.colorRing||w.colorRing)}return this}sheetPoint(e,t,n,r=0,i=0){let a=this._layoutUniforms,o=Math.max(1,Math.min(this.capacity,Math.round(E(t.count,w.count)))),s=Math.max(0,Math.min(o-1,e|0)),c=s*4,l=this._diceA[c+0],u=this._diceA[c+1],d=this._diceA[c+2],f=this._diceA[c+3],p=this._diceB[c+0],m=a.uAxisX.value,h=a.uAxisY.value,g=a.uAxisZ.value,v=E(t.radius,w.radius),y=E(t.spacing,w.spacing);if(a.uLayout.value===_.RING){let e=(s+.5)/o*Math.PI*2,t=Math.cos(e),n=Math.sin(e);M.copy(m).multiplyScalar(t).addScaledVector(g,n),j.copy(m).multiplyScalar(-n).addScaledVector(g,t),A.copy(a.uAnchor.value).addScaledVector(M,v)}else if(a.uLayout.value===_.SCATTER){let e=v*Math.sqrt(Math.min(Math.max(l,0),1)),t=u*Math.PI*2;A.copy(a.uAnchor.value).addScaledVector(m,Math.cos(t)*e).addScaledVector(g,Math.sin(t)*e);let n=d*Math.PI*2;j.copy(m).multiplyScalar(Math.cos(n)).addScaledVector(g,Math.sin(n)),M.crossVectors(j,h).normalize()}else A.copy(a.uAnchor.value).addScaledVector(m,(s-(o-1)*.5)*y),j.copy(m),M.copy(g);let b=E(t.scatter,w.scatter);A.addScaledVector(j,(f-.5)*b*2).addScaledVector(M,(p-.5)*b*2);let x=Math.min(Math.max(i,0),1),S=E(t.width,w.width)*(1+(this._diceB[c+1]-.5)*2*E(t.widthJitter,w.widthJitter))*(1+(E(t.taper,w.taper)-1)*x),C=E(t.height,w.height)*(1+(this._diceB[c+2]-.5)*2*E(t.heightJitter,w.heightJitter)),T=E(t.lean,w.lean)*(1+(this._diceB[c+3]-.5)*2*E(t.leanJitter,w.leanJitter));return n.copy(A).addScaledVector(j,r*S*.5).addScaledVector(h,E(t.base,w.base)+x*C).addScaledVector(M,T*x),n}dispose(){this.group.visible=!1,this.geometry.dispose(),this.material.dispose(),this.floorMesh&&(this.floorMesh.geometry.dispose(),this.floorMaterial.dispose()),this.group.parent?.remove(this.group)}};export{T as i,_ as n,g as r,N as t};
//# sourceMappingURL=Curtain-D4Yrm2bb.js.map