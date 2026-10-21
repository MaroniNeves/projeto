import{Br as e,Fn as t,G as n,Gr as r,K as i,L as a,V as o,Y as s,di as c,fi as l,q as u,ui as d,xt as f,yn as p}from"./settings-DdywqLlV.js";var m=Object.freeze({POOL:0,WAVE:1}),h=8,g=`
  #define TAU 6.283185307179586

  uniform float uTime;
  /** Seconds since the ability's cast began — the ripple clock. */
  uniform float uNow;
  /** Half-extents of the sheet in metres. Ripple fractions resolve against it. */
  uniform vec2  uHalf;
  uniform float uSeed;
  uniform int   uMode;

  /* --- the swell: four independent directional waves --- */
  uniform vec4  uWaveAmp;      // metres, one component per wave
  uniform vec4  uWaveLength;   // metres, crest to crest
  uniform vec4  uWaveSpeed;    // metres/second
  uniform vec4  uWaveAngle;    // radians, bearing in the surface plane
  uniform float uSteepness;    // 0 = sine, 1 = Gerstner cusps

  /* --- chop --- */
  uniform float uChop;         // metres
  uniform float uChopScale;    // cycles per metre
  uniform float uChopSpeed;    // metres/second the chop drifts
  uniform float uDetail;       // metres — fragment-only, lives in the normal
  uniform float uDetailScale;  // cycles per metre
  uniform float uDetailSpeed;  // metres/second

  /* --- ripples: (u, v, born, strength). Unitless + a timestamp. I1. --- */
  uniform vec4  uRipples[${h}];
  uniform float uRippleAmp;     // metres at strength 1
  uniform float uRippleSpeed;   // metres/second the front travels
  uniform float uRippleLength;  // metres, crest to crest inside the packet
  uniform float uRippleWidth;   // metres, the packet's gaussian envelope
  uniform float uRippleDecay;   // seconds to 1/e
  uniform float uRippleSpread;  // metres over which it also thins with radius

  /* --- the travelling wave (WAVE mode) --- */
  uniform float uWaveFront;     // 0..1 along +X. The ability drives this.
  uniform float uCrestHeight;   // metres
  uniform float uCrestBack;     // metres — the long back slope's 1/e length
  uniform float uCrestFace;     // metres — the short front face's 1/e length
  uniform float uCrestCurl;     // metres of forward throw per metre of height
  uniform float uCrestWidth;    // 0..1 of the half-extent across the wave
  uniform float uCrestFeather;  // 0..1 of that, over which the ends die
  uniform float uCrestBreak;    // 0..1 how ragged the lip is
  uniform float uCrestBreakScale; // cycles per metre along the lip

  /** 0 at the trailing edge of the sheet, 2*uHalf.x at the leading edge. */
  float crestFrontX() { return (uWaveFront - 0.5) * uHalf.x * 2.0; }

  /** How much of the crest survives this far off the wave's centreline. */
  float crestLateral(float z) {
    float a = abs(z) / max(uHalf.y, 1e-3);
    float w = clamp(uCrestWidth, 0.0, 1.0);
    return 1.0 - smoothstep(max(w - max(uCrestFeather, 1e-3), 0.0), w, a);
  }

  /**
   * The crest's height in metres.
   *
   * Two exponentials meeting at 1 where they join, so the profile is continuous
   * at the front and the *asymmetry* is entirely 'uCrestBack' against
   * 'uCrestFace'. A symmetric bump is a swell; a bump with a face an eighth as
   * long as its back is a wave about to break, and that ratio does more for the
   * silhouette than any amount of noise on top of it.
   */
  float crestHeightAt(vec2 xz) {
    if (uMode == 0) return 0.0;
    float s = xz.x - crestFrontX();
    float prof = s < 0.0
      ? exp(s / max(uCrestBack, 0.02))
      : exp(-s / max(uCrestFace, 0.01));
    // The lip breaks unevenly along its length. Sampled on z alone, so a gap is
    // a gap for the whole depth of the wave rather than a dent in its middle.
    float rag = fbm3(vec3(xz.y * uCrestBreakScale, uSeed, uNow * 0.6)) * 0.5 + 0.5;
    prof *= mix(1.0, rag, clamp(uCrestBreak, 0.0, 1.0));
    return uCrestHeight * prof * crestLateral(xz.y);
  }

  /**
   * 0..1: how much this point is on the *front face* of the crest.
   *
   * 'ahead' climbs with distance past the front while the profile falls, so the
   * product peaks in the thin overhanging lip and is zero both on the back slope
   * and out in the flat water. It is the mask for every translucency term.
   */
  float crestFaceAt(vec2 xz) {
    if (uMode == 0) return 0.0;
    float s = xz.x - crestFrontX();
    float ahead = smoothstep(0.0, max(uCrestFace, 0.01) * 1.5, s);
    float h = crestHeightAt(xz) / max(uCrestHeight, 1e-3);
    return clamp(ahead * h * 2.2, 0.0, 1.0);
  }

  /**
   * One directional wave, accumulated in place.
   *
   * The horizontal term is Gerstner's: pulling material *toward* the crest
   * sharpens it and flattens the trough, which is what an ocean does and what a
   * plain sine cannot do at any amplitude. It is also why 'uSteepness' above ~1
   * folds the mesh through itself — capped in 'update()', not here, so the
   * shader stays a shader.
   */
  void addWave(inout vec3 acc, vec2 xz, float amp, float len, float spd, float ang) {
    if (amp <= 0.0) return;
    vec2 d = vec2(cos(ang), sin(ang));
    float k = TAU / max(len, 0.05);
    float phase = dot(d, xz) * k - uTime * spd * k;
    acc.y += amp * sin(phase);
    acc.xz -= d * (amp * uSteepness * cos(phase));
  }

  /**
   * Every live ripple, summed.
   *
   * Analytic, not integrated: a packet's whole history is a closed-form function
   * of 'uNow - born', so the surface can be re-rung from a slider with the clock
   * stopped. The '1/(1 + r/spread)' term is the geometric thinning of a circular
   * wave (energy over a growing circumference); the exponential is the viscous
   * loss. Both are needed — with only the exponential a small pool's ripples die
   * in the middle, with only the spread they never die at all.
   */
  float ripplesAt(vec2 xz) {
    float sum = 0.0;
    for (int i = 0; i < ${h}; i++) {
      vec4 r = uRipples[i];
      if (r.w <= 0.0) continue;
      float age = uNow - r.z;
      if (age < 0.0) continue;
      // The fraction becomes metres HERE, against this frame's half-extents.
      vec2 c = r.xy * uHalf;
      float d = length(xz - c);
      float x = d - age * uRippleSpeed;
      float env = exp(-(x * x) / max(uRippleWidth * uRippleWidth, 1e-4));
      float decay = exp(-age / max(uRippleDecay, 0.02)) / (1.0 + d / max(uRippleSpread, 0.05));
      sum += r.w * uRippleAmp * env * decay * cos(x * TAU / max(uRippleLength, 0.05));
    }
    return sum;
  }

  /**
   * The surface's displacement from the flat plane, in surface-local metres.
   *
   * @param xz     parametric position on the sheet, metres from its centre
   * @param detail 0 in the vertex stage, 1 in the fragment stage
   * @returns (dx, dy, dz) — dy is height, dx/dz are the Gerstner and curl throws
   */
  vec3 liquidOffset(vec2 xz, float detail) {
    vec3 acc = vec3(0.0);

    addWave(acc, xz, uWaveAmp.x, uWaveLength.x, uWaveSpeed.x, uWaveAngle.x);
    addWave(acc, xz, uWaveAmp.y, uWaveLength.y, uWaveSpeed.y, uWaveAngle.y);
    addWave(acc, xz, uWaveAmp.z, uWaveLength.z, uWaveSpeed.z, uWaveAngle.z);
    addWave(acc, xz, uWaveAmp.w, uWaveLength.w, uWaveSpeed.w, uWaveAngle.w);

    if (uChop > 0.0) {
      acc.y += uChop * fbm3(vec3(xz * uChopScale, uTime * uChopSpeed + uSeed));
    }
    if (detail > 0.0 && uDetail > 0.0) {
      acc.y += uDetail * detail *
               snoise(vec3(xz * uDetailScale, uTime * uDetailSpeed + uSeed * 3.1));
    }

    acc.y += ripplesAt(xz);

    // The curl. Horizontal throw proportional to height is what turns a bump
    // into an overhang: the crest's own material outruns its foot.
    float ch = crestHeightAt(xz);
    acc.y += ch;
    acc.x += ch * uCrestCurl;

    return acc;
  }

  /** The surface point in local space — parametric position plus its offset. */
  vec3 liquidPoint(vec2 xz, float detail) {
    vec3 d = liquidOffset(xz, detail);
    return vec3(xz.x + d.x, d.y, xz.y + d.z);
  }
`,_=`
  uniform vec3 uAnchor;   // world centre of the sheet
  uniform vec3 uAxisX;    // the sheet's local +X, unit — the "along" of a WAVE
  uniform vec3 uAxisY;    // the sheet's up, unit
  uniform vec3 uAxisZ;    // the sheet's local +Z, unit

  varying vec2  vParam;   // parametric metres from the centre, pre-displacement
  varying vec3  vWorld;
  varying float vHeight;  // metres above the mean plane
  varying float vFace;    // 0..1 on the crest's front face
  varying float vViewZ;

  ${s}
  ${g}

  void main() {
    // The plane geometry is a unit square; every metre comes from uHalf, which
    // is rewritten every frame. Resizing the pool never touches a buffer.
    vec2 xz = (uv - 0.5) * (uHalf * 2.0);
    vParam = xz;

    vec3 local = liquidPoint(xz, 0.0);
    vHeight = local.y;
    vFace = crestFaceAt(xz);

    vec3 world = uAnchor + uAxisX * local.x + uAxisY * local.y + uAxisZ * local.z;
    vWorld = world;

    vec4 mv = viewMatrix * vec4(world, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,v=`
  uniform vec3      uAxisX;
  uniform vec3      uAxisY;
  uniform vec3      uAxisZ;
  uniform sampler2D uEnvMap;
  uniform vec3      uLightDir;      // world direction TOWARD the key light
  uniform float     uGlobalGlow;
  uniform float     uShaderIntensity;
  uniform vec2      uResolution;
  uniform sampler2D uSceneDepth;
  uniform float     uCameraNear;
  uniform float     uCameraFar;

  /* --- the edge of the pool --- */
  uniform float uFill;        // 0..1 of the half-extent the liquid reaches
  uniform float uRound;       // 0 rectangular footprint, 1 elliptical
  uniform float uEdgeSoft;    // 0..1 of the field over which it fades out
  uniform float uEdgeNoise;   // 0..1 how ragged the waterline is
  uniform float uEdgeScale;   // cycles per metre of that raggedness

  /* --- the flow field, metres/second --- */
  uniform float uFlowAngle;      // radians, the bulk drift's bearing
  uniform float uFlowSpeed;      // m/s
  uniform float uFlowRadial;     // m/s outward at the centre
  uniform float uFlowRadialFall; // metres to 1/e
  uniform float uFlowEddy;       // m/s of curl-noise swirl
  uniform float uFlowEddyScale;  // cycles per metre
  uniform float uFlowEddySpeed;  // Hz the eddies churn
  uniform float uFlowGravity;    // m/s per unit of surface slope

  /* --- the crust --- */
  uniform float uCrust;        // 0..1 master. 0 skips the whole block.
  uniform float uCrustForm;    // m/s below which skin is unbroken
  uniform float uCrustBreak;   // m/s above which there is none
  uniform float uCrustFormTime;// seconds for the first skin to appear
  uniform float uCrackScale;   // cycles per metre across the flow
  uniform float uCrackStretch; // how many times longer features are along it
  uniform float uCrackWidth;   // 0..1 of the field — the seam's width
  uniform float uCrustAdvect;  // 0..1 how strongly the pattern is carried
  uniform float uCrustPeriod;  // seconds before the flow map resets
  uniform float uCrustBump;    // 0..1 how much the skin roughens the normal
  uniform float uSeamGlow;
  uniform float uMeltGlow;     // glow of the bare melt between the plates

  /* --- foam --- */
  uniform float uFoam;         // 0..1 master
  uniform float uFoamScale;    // cycles per metre of the speckle
  uniform float uFoamSharp;
  uniform float uFoamCrest;    // how much a rising crest seeds it
  uniform float uFoamSpeed;    // how much surface speed seeds it

  /* --- shading --- */
  uniform vec3  uColorDeep;
  uniform vec3  uColorShallow;
  uniform vec3  uColorCrust;
  uniform vec3  uColorSeam;
  uniform vec3  uColorHot;
  uniform vec3  uColorFoam;
  uniform vec3  uColorSpec;
  uniform vec3  uColorSky;
  uniform float uPoolDepth;    // metres of liquid under the mean plane
  uniform float uDepthTint;    // Beer-Lambert density, per metre
  uniform float uTranslucency; // backlight through the thin lip
  uniform float uAmbient;
  uniform float uSpecular;
  uniform float uShininess;
  uniform float uFresnel;
  uniform float uEnvIntensity;
  uniform float uSkyIntensity;
  uniform float uEmissive;     // self-lit body — lava reads at night, water does not
  uniform float uGlow;
  uniform float uOpacity;
  uniform float uNormalEps;    // metres — the finite-difference step
  uniform float uContactFade;  // metres of soft fade against opaque geometry

  varying vec2  vParam;
  varying vec3  vWorld;
  varying float vHeight;
  varying float vFace;
  varying float vViewZ;

  ${s}
  ${u}
  ${g}

  // equirectUv comes from commonGLSL above. (No backticks in here: the file is
  // one template literal and a stray one ends it mid-shader.)

  /**
   * Floor under the reflected probe — lifted wholesale from the archived ocean
   * material, for the same reason it existed there: on a night stage most of the
   * probe is genuinely black, a straight lookup returns nothing, and the surface
   * collapses into flat holes of body colour. Something must always be
   * reflected, or there is no shape.
   */
  vec3 skyFloor(vec3 dir) {
    float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
    return mix(uColorSky * 0.25, uColorSky, pow(h, 0.65)) * uSkyIntensity;
  }

  /** The 2-D flow of the skin at this point, metres per second. */
  vec2 flowAt(vec2 xz, vec3 nLocal) {
    vec2 f = vec2(cos(uFlowAngle), sin(uFlowAngle)) * uFlowSpeed;

    float d = length(xz) + 1e-4;
    f += (xz / d) * uFlowRadial * exp(-d / max(uFlowRadialFall, 0.05));

    if (uFlowEddy > 0.0) {
      // Curl of one scalar field: divergence-free by construction. Three taps
      // with a forward difference — the eddies are low frequency, so the extra
      // accuracy of a central difference buys nothing at twice the cost.
      float sc = max(uFlowEddyScale, 0.02);
      float e = 0.5 / sc;
      float t = uTime * uFlowEddySpeed;
      float n0 = snoise(vec3(xz * sc, t));
      float nx = snoise(vec3((xz + vec2(e, 0.0)) * sc, t));
      float nz = snoise(vec3((xz + vec2(0.0, e)) * sc, t));
      vec2 grad = vec2(nx - n0, nz - n0) / e;
      f += vec2(grad.y, -grad.x) * uFlowEddy;
    }

    // Downhill. For y = h(x,z) the normal is proportional to (-dh/dx, 1, -dh/dz),
    // so the downhill direction is n.xz / n.y and needs no extra taps at all.
    f += (nLocal.xz / max(nLocal.y, 0.15)) * uFlowGravity;

    return f;
  }

  /**
   * The crack field: 0 deep inside a plate of skin, 1 on a seam.
   *
   * Seams are the *zero crossing* of a signed fbm rather than a ridge or a
   * voronoi edge. Zero crossings of a smooth field are naturally continuous,
   * they branch and rejoin, and their width is set by one number — three
   * properties a threshold on |noise| does not have. The domain is squashed
   * along the flow by 'uCrackStretch', which is the whole reason the seams run
   * *with* the pour instead of looking like crazed pottery.
   */
  float crackField(vec2 q) {
    float n = fbm3(vec3(q, uSeed * 7.3));
    return 1.0 - smoothstep(0.0, max(uCrackWidth, 1e-3), abs(n));
  }

  void main() {
    /* ---------------- normal, by finite difference ---------------- */
    // Four evaluations of the *whole* field, including the fragment-only octave.
    // Differencing the point rather than the height is what makes this correct
    // in the presence of the Gerstner and curl throws: the tangents pick up the
    // horizontal displacement too, so an overhanging crest is lit as an overhang.
    float e = max(uNormalEps, 1e-3);
    vec3 px = liquidPoint(vParam + vec2(e, 0.0), 1.0) - liquidPoint(vParam - vec2(e, 0.0), 1.0);
    vec3 pz = liquidPoint(vParam + vec2(0.0, e), 1.0) - liquidPoint(vParam - vec2(0.0, e), 1.0);
    vec3 nLocal = normalize(cross(pz, px) + vec3(0.0, 1e-6, 0.0));
    vec3 N = normalize(uAxisX * nLocal.x + uAxisY * nLocal.y + uAxisZ * nLocal.z);

    vec3 V = normalize(cameraPosition - vWorld);
    if (dot(N, V) < 0.0) N = -N;   // the curl folds the sheet; light both faces

    /* ---------------- the flow, and therefore the speed ---------------- */
    float speed = 0.0;
    vec2 flow = vec2(0.0);
    bool needFlow = uCrust > 0.001 || uFoamSpeed > 0.001;
    if (needFlow) {
      flow = flowAt(vParam, nLocal);
      speed = length(flow);
    }

    /* ---------------- the crust ---------------- */
    float skin = 0.0;      // 0..1 — how much black plate covers this fragment
    float seam = 0.0;      // 0..1 — how much glowing crack
    if (uCrust > 0.001) {
      // Coverage: unbroken where the surface is slow, gone where it is fast.
      float cover = 1.0 - smoothstep(uCrustForm, max(uCrustBreak, uCrustForm + 1e-3), speed);
      // The first skin takes a moment to chill. This is the only memory the
      // module has, and it is global rather than per-fragment — see the header.
      cover *= smoothstep(0.0, max(uCrustFormTime, 1e-3), uNow);
      cover *= clamp(uCrust, 0.0, 1.0);

      // A frame built from the flow. Squashing the along-flow axis stretches the
      // features along it; the perpendicular axis keeps its scale, so the seams
      // come out long and parallel rather than isotropic.
      vec2 fdir = speed > 1e-4 ? flow / speed : vec2(1.0, 0.0);
      vec2 fperp = vec2(-fdir.y, fdir.x);
      vec2 q = vec2(dot(vParam, fdir) / max(uCrackStretch, 0.05),
                    dot(vParam, fperp)) * uCrackScale;

      // Two-phase advection. One layer advected forever smears without bound;
      // two layers half a period out of step, cross-faded on |1 - 2·frac|, reset
      // one at a time and the smear never gets past half a period's worth.
      float period = max(uCrustPeriod, 0.05);
      float ph = uTime / period;
      float p0 = fract(ph);
      float p1 = fract(ph + 0.5);
      // The flow expressed in the crack frame, so the pattern rides the same
      // field the coverage was computed from.
      vec2 fq = vec2(speed / max(uCrackStretch, 0.05), 0.0) * uCrackScale * uCrustAdvect;
      float w = abs(1.0 - 2.0 * p0);
      float ca = crackField(q - fq * (p0 * period));
      float cb = crackField(q - fq * (p1 * period));
      float crack = mix(cb, ca, w);

      seam = crack * cover;
      skin = cover * (1.0 - crack);

      if (uCrustBump > 0.001) {
        // One extra pair of taps, offset across the flow. The seams are grooves,
        // so the skin's normal tilts across them and not along them — a 1-D
        // gradient is the whole of the effect and a 2-D one is twice the price
        // for nothing. Differenced against the *unweighted* crack field, or the
        // coverage term would leak a phantom bump into the melt.
        float bump = mix(crackField(q + vec2(0.0, 0.35) - fq * (p1 * period)),
                         crackField(q + vec2(0.0, 0.35) - fq * (p0 * period)), w);
        vec3 perpW = normalize(uAxisX * fperp.x + uAxisZ * fperp.y);
        N = normalize(N + perpW * (bump - crack) * cover * uCrustBump * 2.0);
      }
    }

    /* ---------------- lighting ---------------- */
    vec3 L = normalize(uLightDir);
    float ndl = dot(N, L);
    float ndv = clamp(dot(N, V), 0.0, 1.0);

    // Wrapped diffuse: a liquid scatters, so the terminator is soft and the
    // shaded side never reaches zero. A hard lambert on a heightfield draws the
    // wave troughs as black bands.
    float lam = clamp(ndl * 0.5 + 0.5, 0.0, 1.0);
    float lit = uAmbient + (1.0 - uAmbient) * lam;

    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), max(uShininess, 1.0)) * uSpecular;
    // Skin is matte and melt is glass: the crust has to kill the highlight or
    // the black plates read as wet paint.
    spec *= mix(1.0, 0.12, skin);

    float fres = clamp((0.02 + 0.98 * pow(1.0 - ndv, 5.0)) * uFresnel, 0.0, 1.0);
    fres *= mix(1.0, 0.15, skin);

    vec3 refl = reflect(-V, N);
    vec3 env = texture2D(uEnvMap, equirectUv(refl)).rgb * uEnvIntensity;
    env = max(env, skyFloor(refl));

    /* ---------------- the body ---------------- */
    // Thickness is the liquid standing above the floor, so a crest is *deeper*
    // than a trough and the depth tint tracks the swell instead of fighting it.
    float thick = clamp((vHeight + uPoolDepth) * uDepthTint, 0.0, 1.0);
    thick = 1.0 - exp(-thick * 2.0);
    vec3 body = mix(uColorShallow, uColorDeep, thick) * lit;

    // The thin front face of a breaking wave is lit from behind. Only ever
    // applied where the sheet has actually folded, which is what vFace is for.
    float through = pow(clamp(dot(V, -L), 0.0, 1.0), 2.0);
    vec3 sss = uColorShallow * (vFace * uTranslucency * (0.35 + 0.65 * through));

    /* ---------------- foam ---------------- */
    float foam = 0.0;
    if (uFoam > 0.001) {
      // Density varies smoothly, the speckle itself does not. Shading foam as a
      // smooth function of the wave paints that field's iso-contours onto the
      // surface and the pool comes out looking like a contour map.
      float sp = fbm3(vec3(vParam * uFoamScale, uTime * 0.7 + uSeed)) * 0.5 + 0.5;
      float bias = clamp(vFace * uFoamCrest
                       + smoothstep(uCrustForm, max(uCrustBreak, uCrustForm + 1e-3), speed) * uFoamSpeed
                       + clamp(vHeight * 2.0, 0.0, 1.0) * 0.25, 0.0, 1.4);
      float threshold = mix(0.95, 0.34, clamp(bias, 0.0, 1.0));
      foam = smoothstep(threshold, threshold + 0.14, sp);
      foam = pow(foam, max(uFoamSharp, 0.2)) * clamp(bias * 1.4, 0.0, 1.0) * uFoam;
    }

    /* ---------------- composite ---------------- */
    vec3 color = mix(body, env + uColorSpec * spec, fres);
    color += uColorSpec * spec * (1.0 - fres);
    color += sss;

    // The crust goes over the top of everything the melt was doing: it is opaque
    // rock, not a tint on the liquid.
    color = mix(color, uColorCrust * (uAmbient + (1.0 - uAmbient) * lam), skin);

    vec3 emissive =
        uColorHot * (1.0 - skin) * uEmissive
      + uColorSeam * seam * uSeamGlow
      + uColorHot * clamp(speed / max(uCrustBreak, 0.01), 0.0, 1.0) * (1.0 - skin) * uMeltGlow;
    color += emissive;

    color = mix(color, uColorFoam * (0.5 + 0.5 * lit), foam);
    color *= uGlow * uGlobalGlow * mix(0.7, 1.0, uShaderIntensity);

    /* ---------------- the waterline ---------------- */
    vec2 nq = vParam / max(uHalf, vec2(1e-3));
    float r = mix(max(abs(nq.x), abs(nq.y)), length(nq), clamp(uRound, 0.0, 1.0));
    // Sampled in metres so the raggedness is a fixed physical size: a small pool
    // and a large one break up with the same size of tongue.
    float jag = fbm3(vec3(vParam * uEdgeScale, uSeed * 5.7)) * 0.5 + 0.5;
    r *= mix(1.0, 0.7 + 0.6 * jag, clamp(uEdgeNoise, 0.0, 1.0));
    float mask = 1.0 - smoothstep(max(uFill - uEdgeSoft, 0.0), uFill, r);

    float alpha = mask * uOpacity;
    // The folded lip is a sheet a few millimetres thick — you can see through it.
    alpha *= 1.0 - vFace * clamp(uTranslucency * 0.4, 0.0, 0.85);
    alpha = clamp(alpha + foam * 0.5, 0.0, 1.0);

    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, max(uContactFade, 1e-3));
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(color, alpha);
  }
`,y={sizeX:8,sizeZ:8,fill:1,round:1,edgeSoft:.14,edgeNoise:.35,edgeScale:.9,seed:0,opacity:1,contactFade:.25,waveAmpA:.09,waveAmpB:.05,waveAmpC:.03,waveAmpD:.02,waveLengthA:5.5,waveLengthB:3.1,waveLengthC:1.7,waveLengthD:.9,waveSpeedA:1.1,waveSpeedB:.8,waveSpeedC:.55,waveSpeedD:.4,waveAngleA:0,waveAngleB:1.05,waveAngleC:2.4,waveAngleD:3.9,steepness:.45,chop:.035,chopScale:1.6,chopSpeed:.35,detail:.012,detailScale:7.5,detailSpeed:.9,rippleAmp:.18,rippleSpeed:3.2,rippleLength:1,rippleWidth:.75,rippleDecay:1.3,rippleSpread:2.6,flowAngle:0,flowSpeed:.25,flowRadial:.6,flowRadialFall:3.2,flowEddy:.5,flowEddyScale:.28,flowEddySpeed:.12,flowGravity:2.2,crust:0,crustForm:.35,crustBreak:1.5,crustFormTime:.7,crackScale:1.15,crackStretch:4.5,crackWidth:.18,crustAdvect:1,crustPeriod:2.4,crustBump:.4,seamGlow:2.6,meltGlow:1.2,foam:0,foamScale:5.5,foamSharp:1.4,foamCrest:1.1,foamSpeed:.5,waveFront:.5,crestHeight:1.1,crestBack:2.2,crestFace:.3,crestCurl:.55,crestWidth:.8,crestFeather:.3,crestBreak:.35,crestBreakScale:1.3,poolDepth:.4,depthTint:1.5,translucency:1,ambient:.28,specular:1.3,shininess:64,fresnel:1.1,envIntensity:.7,skyIntensity:.45,emissive:0,glow:1,normalEps:.045,colorDeep:`#0a2230`,colorShallow:`#2c7f92`,colorCrust:`#120806`,colorSeam:`#ff5a12`,colorHot:`#ffe08a`,colorFoam:`#eef6f8`,colorSpec:`#ffffff`,colorSky:`#3a5570`};function b(){return{...y}}var x=(e,t)=>e??t,S=new c,C=new c,w=new c,T=new c,E=class{constructor({segments:a=96,mode:s=m.POOL,depthWrite:u=!0,doubleSide:g=!0,renderOrder:b=3,name:x=`LiquidSurface`}={}){let S=Math.max(2,Math.round(a));this.geometry=new t(1,1,S,S),this.geometry.boundingSphere=new r(new c,1e4),this._ripples=[];for(let e=0;e<h;e++)this._ripples.push(new l(0,0,0,0));this._nextSlot=0,this.material=new e({name:`${x}:surface`,transparent:!0,depthWrite:u,depthTest:!0,side:g?2:0,toneMapped:!1,uniforms:i({uEnvMap:n.uEnvMap,uAnchor:{value:new c},uAxisX:{value:new c(1,0,0)},uAxisY:{value:new c(0,1,0)},uAxisZ:{value:new c(0,0,1)},uHalf:{value:new d(y.sizeX*.5,y.sizeZ*.5)},uNow:{value:0},uSeed:{value:y.seed},uMode:{value:s},uWaveAmp:{value:new l},uWaveLength:{value:new l(1,1,1,1)},uWaveSpeed:{value:new l},uWaveAngle:{value:new l},uSteepness:{value:y.steepness},uChop:{value:y.chop},uChopScale:{value:y.chopScale},uChopSpeed:{value:y.chopSpeed},uDetail:{value:y.detail},uDetailScale:{value:y.detailScale},uDetailSpeed:{value:y.detailSpeed},uRipples:{value:this._ripples},uRippleAmp:{value:y.rippleAmp},uRippleSpeed:{value:y.rippleSpeed},uRippleLength:{value:y.rippleLength},uRippleWidth:{value:y.rippleWidth},uRippleDecay:{value:y.rippleDecay},uRippleSpread:{value:y.rippleSpread},uWaveFront:{value:y.waveFront},uCrestHeight:{value:y.crestHeight},uCrestBack:{value:y.crestBack},uCrestFace:{value:y.crestFace},uCrestCurl:{value:y.crestCurl},uCrestWidth:{value:y.crestWidth},uCrestFeather:{value:y.crestFeather},uCrestBreak:{value:y.crestBreak},uCrestBreakScale:{value:y.crestBreakScale},uFill:{value:y.fill},uRound:{value:y.round},uEdgeSoft:{value:y.edgeSoft},uEdgeNoise:{value:y.edgeNoise},uEdgeScale:{value:y.edgeScale},uFlowAngle:{value:y.flowAngle},uFlowSpeed:{value:y.flowSpeed},uFlowRadial:{value:y.flowRadial},uFlowRadialFall:{value:y.flowRadialFall},uFlowEddy:{value:y.flowEddy},uFlowEddyScale:{value:y.flowEddyScale},uFlowEddySpeed:{value:y.flowEddySpeed},uFlowGravity:{value:y.flowGravity},uCrust:{value:y.crust},uCrustForm:{value:y.crustForm},uCrustBreak:{value:y.crustBreak},uCrustFormTime:{value:y.crustFormTime},uCrackScale:{value:y.crackScale},uCrackStretch:{value:y.crackStretch},uCrackWidth:{value:y.crackWidth},uCrustAdvect:{value:y.crustAdvect},uCrustPeriod:{value:y.crustPeriod},uCrustBump:{value:y.crustBump},uSeamGlow:{value:y.seamGlow},uMeltGlow:{value:y.meltGlow},uFoam:{value:y.foam},uFoamScale:{value:y.foamScale},uFoamSharp:{value:y.foamSharp},uFoamCrest:{value:y.foamCrest},uFoamSpeed:{value:y.foamSpeed},uColorDeep:{value:new f(y.colorDeep)},uColorShallow:{value:new f(y.colorShallow)},uColorCrust:{value:new f(y.colorCrust)},uColorSeam:{value:new f(y.colorSeam)},uColorHot:{value:new f(y.colorHot)},uColorFoam:{value:new f(y.colorFoam)},uColorSpec:{value:new f(y.colorSpec)},uColorSky:{value:new f(y.colorSky)},uPoolDepth:{value:y.poolDepth},uDepthTint:{value:y.depthTint},uTranslucency:{value:y.translucency},uAmbient:{value:y.ambient},uSpecular:{value:y.specular},uShininess:{value:y.shininess},uFresnel:{value:y.fresnel},uEnvIntensity:{value:y.envIntensity},uSkyIntensity:{value:y.skyIntensity},uEmissive:{value:y.emissive},uGlow:{value:y.glow},uOpacity:{value:y.opacity},uNormalEps:{value:y.normalEps},uContactFade:{value:y.contactFade}}),vertexShader:_,fragmentShader:v}),this.mesh=new p(this.geometry,this.material),this.mesh.name=x,this.mesh.layers.set(o.VFX),this.mesh.renderOrder=b,this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=!1,this.mesh.visible=!1,this._now=0,this._halfX=y.sizeX*.5,this._halfZ=y.sizeZ*.5}get object3D(){return this.mesh}get uniforms(){return this.material.uniforms}get drawCalls(){return 1}get visible(){return this.mesh.visible}set visible(e){this.mesh.visible=!!e}get mode(){return this.material.uniforms.uMode.value}set mode(e){this.material.uniforms.uMode.value=e|0}setPlacement(e,t,n){let r=this.material.uniforms;return r.uAnchor.value.copy(e),S.copy(t).normalize(),w.crossVectors(n,S).normalize(),C.crossVectors(S,w).normalize(),r.uAxisX.value.copy(S),r.uAxisY.value.copy(C),r.uAxisZ.value.copy(w),this}ripple(e,t,n=1,r=this._now){let i=this._oldestSlot(r);return this._ripples[i].set(e,t,r,Math.max(0,n)),i}rippleAtWorld(e,t=1,n=this._now){let r=this.material.uniforms;T.copy(e).sub(r.uAnchor.value);let i=T.dot(r.uAxisX.value)/Math.max(this._halfX,1e-4),a=T.dot(r.uAxisZ.value)/Math.max(this._halfZ,1e-4);return this.ripple(i,a,t,n)}_oldestSlot(e){let t=0,n=-1;for(let r=0;r<h;r++){let i=this._ripples[r];if(i.w<=0)return r;let a=e-i.z;a>n&&(n=a,t=r)}let r=this._nextSlot;return this._nextSlot=(this._nextSlot+1)%h,n>0?t:r}clearRipples(){for(let e=0;e<h;e++)this._ripples[e].set(0,0,0,0);return this._nextSlot=0,this}reset(){return this.clearRipples(),this._now=0,this.material.uniforms.uNow.value=0,this.mesh.visible=!1,this}update(e,t){let n=this.material.uniforms;return this._now=e,n.uNow.value=e,this._halfX=Math.max(x(t.sizeX,y.sizeX),.01)*.5,this._halfZ=Math.max(x(t.sizeZ,y.sizeZ),.01)*.5,n.uHalf.value.set(this._halfX,this._halfZ),n.uSeed.value=x(t.seed,y.seed),n.uWaveAmp.value.set(x(t.waveAmpA,y.waveAmpA),x(t.waveAmpB,y.waveAmpB),x(t.waveAmpC,y.waveAmpC),x(t.waveAmpD,y.waveAmpD)),n.uWaveLength.value.set(x(t.waveLengthA,y.waveLengthA),x(t.waveLengthB,y.waveLengthB),x(t.waveLengthC,y.waveLengthC),x(t.waveLengthD,y.waveLengthD)),n.uWaveSpeed.value.set(x(t.waveSpeedA,y.waveSpeedA),x(t.waveSpeedB,y.waveSpeedB),x(t.waveSpeedC,y.waveSpeedC),x(t.waveSpeedD,y.waveSpeedD)),n.uWaveAngle.value.set(x(t.waveAngleA,y.waveAngleA),x(t.waveAngleB,y.waveAngleB),x(t.waveAngleC,y.waveAngleC),x(t.waveAngleD,y.waveAngleD)),n.uSteepness.value=Math.min(x(t.steepness,y.steepness),1.2),n.uChop.value=x(t.chop,y.chop),n.uChopScale.value=x(t.chopScale,y.chopScale),n.uChopSpeed.value=x(t.chopSpeed,y.chopSpeed),n.uDetail.value=x(t.detail,y.detail),n.uDetailScale.value=x(t.detailScale,y.detailScale),n.uDetailSpeed.value=x(t.detailSpeed,y.detailSpeed),n.uRippleAmp.value=x(t.rippleAmp,y.rippleAmp),n.uRippleSpeed.value=x(t.rippleSpeed,y.rippleSpeed),n.uRippleLength.value=x(t.rippleLength,y.rippleLength),n.uRippleWidth.value=x(t.rippleWidth,y.rippleWidth),n.uRippleDecay.value=x(t.rippleDecay,y.rippleDecay),n.uRippleSpread.value=x(t.rippleSpread,y.rippleSpread),n.uWaveFront.value=x(t.waveFront,y.waveFront),n.uCrestHeight.value=x(t.crestHeight,y.crestHeight),n.uCrestBack.value=x(t.crestBack,y.crestBack),n.uCrestFace.value=x(t.crestFace,y.crestFace),n.uCrestCurl.value=x(t.crestCurl,y.crestCurl),n.uCrestWidth.value=x(t.crestWidth,y.crestWidth),n.uCrestFeather.value=x(t.crestFeather,y.crestFeather),n.uCrestBreak.value=x(t.crestBreak,y.crestBreak),n.uCrestBreakScale.value=x(t.crestBreakScale,y.crestBreakScale),n.uFill.value=x(t.fill,y.fill),n.uRound.value=x(t.round,y.round),n.uEdgeSoft.value=x(t.edgeSoft,y.edgeSoft),n.uEdgeNoise.value=x(t.edgeNoise,y.edgeNoise),n.uEdgeScale.value=x(t.edgeScale,y.edgeScale),n.uFlowAngle.value=x(t.flowAngle,y.flowAngle),n.uFlowSpeed.value=x(t.flowSpeed,y.flowSpeed),n.uFlowRadial.value=x(t.flowRadial,y.flowRadial),n.uFlowRadialFall.value=x(t.flowRadialFall,y.flowRadialFall),n.uFlowEddy.value=x(t.flowEddy,y.flowEddy),n.uFlowEddyScale.value=x(t.flowEddyScale,y.flowEddyScale),n.uFlowEddySpeed.value=x(t.flowEddySpeed,y.flowEddySpeed),n.uFlowGravity.value=x(t.flowGravity,y.flowGravity),n.uCrust.value=x(t.crust,y.crust),n.uCrustForm.value=x(t.crustForm,y.crustForm),n.uCrustBreak.value=x(t.crustBreak,y.crustBreak),n.uCrustFormTime.value=x(t.crustFormTime,y.crustFormTime),n.uCrackScale.value=x(t.crackScale,y.crackScale),n.uCrackStretch.value=x(t.crackStretch,y.crackStretch),n.uCrackWidth.value=x(t.crackWidth,y.crackWidth),n.uCrustAdvect.value=x(t.crustAdvect,y.crustAdvect),n.uCrustPeriod.value=x(t.crustPeriod,y.crustPeriod),n.uCrustBump.value=x(t.crustBump,y.crustBump),n.uSeamGlow.value=x(t.seamGlow,y.seamGlow),n.uMeltGlow.value=x(t.meltGlow,y.meltGlow),n.uFoam.value=x(t.foam,y.foam),n.uFoamScale.value=x(t.foamScale,y.foamScale),n.uFoamSharp.value=x(t.foamSharp,y.foamSharp),n.uFoamCrest.value=x(t.foamCrest,y.foamCrest),n.uFoamSpeed.value=x(t.foamSpeed,y.foamSpeed),n.uPoolDepth.value=x(t.poolDepth,y.poolDepth),n.uDepthTint.value=x(t.depthTint,y.depthTint),n.uTranslucency.value=x(t.translucency,y.translucency),n.uAmbient.value=x(t.ambient,y.ambient),n.uSpecular.value=x(t.specular,y.specular),n.uShininess.value=x(t.shininess,y.shininess),n.uFresnel.value=x(t.fresnel,y.fresnel),n.uEnvIntensity.value=x(t.envIntensity,y.envIntensity),n.uSkyIntensity.value=x(t.skyIntensity,y.skyIntensity),n.uEmissive.value=x(t.emissive,y.emissive),n.uGlow.value=x(t.glow,y.glow),n.uOpacity.value=x(t.opacity,y.opacity),n.uNormalEps.value=x(t.normalEps,y.normalEps),n.uContactFade.value=x(t.contactFade,y.contactFade),a(n.uColorDeep.value,t.colorDeep||y.colorDeep),a(n.uColorShallow.value,t.colorShallow||y.colorShallow),a(n.uColorCrust.value,t.colorCrust||y.colorCrust),a(n.uColorSeam.value,t.colorSeam||y.colorSeam),a(n.uColorHot.value,t.colorHot||y.colorHot),a(n.uColorFoam.value,t.colorFoam||y.colorFoam),a(n.uColorSpec.value,t.colorSpec||y.colorSpec),a(n.uColorSky.value,t.colorSky||y.colorSky),this}lipPosition(e,t,n=0){let r=this.material.uniforms,i=Math.max(x(e.sizeX,y.sizeX),.01)*.5,a=Math.max(x(e.sizeZ,y.sizeZ),.01)*.5,o=this.lipHeight(e,n),s=(x(e.waveFront,y.waveFront)-.5)*i*2+o*x(e.crestCurl,y.crestCurl),c=n*x(e.crestWidth,y.crestWidth)*a;return t.copy(r.uAnchor.value).addScaledVector(r.uAxisX.value,s).addScaledVector(r.uAxisY.value,o).addScaledVector(r.uAxisZ.value,c),t}lipHeight(e,t=0){if(this.mode===m.POOL)return 0;let n=Math.min(Math.max(x(e.crestWidth,y.crestWidth),0),1),r=Math.max(x(e.crestFeather,y.crestFeather),.001),i=Math.abs(t)*n,a=Math.max(n-r,0),o=Math.max(n-a,1e-4),s=Math.min(Math.max((i-a)/o,0),1),c=1-s*s*(3-2*s);return x(e.crestHeight,y.crestHeight)*c}dispose(){this.mesh.visible=!1,this.geometry.dispose(),this.material.dispose(),this.mesh.parent?.remove(this.mesh)}};export{E as n,b as r,m as t};
//# sourceMappingURL=LiquidSurface-BxPCnXEP.js.map