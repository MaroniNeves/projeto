import{$ as e,Br as t,Fn as n,G as r,K as i,R as a,V as o,Y as s,di as c,o as l,ot as u,q as d,st as f,tt as p,xt as m,y as h,yn as g}from"./settings-DdywqLlV.js";import{t as _}from"./ParticleSystem-BZTczMT8.js";import{n as v}from"./ParticleEngine-DLxipNH0.js";import{n as y}from"./GroundDecals-kYmr8HKl.js";import{n as b,t as x}from"./Ability-CYesB5Ur.js";var S=Object.freeze({CORE:0,GLOW:1});Object.freeze({LEASH:0,COLUMN:1,TENDRIL:2,RIM:3});var C=`
  #define PI  3.141592653589793
  #define TAU 6.283185307179586

  uniform float uTime;
  uniform vec3  uCentre;      // the trap's point on the floor
  uniform vec3  uHand;        // where the leash leaves the caster
  uniform vec3  uFront;       // the leash's travelling tip
  uniform float uRadius;      // footprint, metres — already eased by the snap
  uniform float uHeight;      // column height, metres
  uniform float uSeed;
  uniform float uRestrike;
  uniform float uFade;

  uniform float uCountLeash;
  uniform float uCountColumn;
  uniform float uCountTendril;
  uniform float uCountRim;

  uniform float uLeashSag;
  uniform float uLeashSpread;
  uniform float uLeashCling;
  uniform float uLeashKink;
  uniform float uLeashWidth;

  uniform float uHeightCurve;
  uniform float uThroat;
  uniform float uColumnSpread;
  uniform float uColumnCurve;
  uniform float uColumnFlare;
  uniform float uColumnTwist;
  uniform float uColumnSpin;
  uniform float uColumnKink;
  uniform float uColumnWidth;
  uniform float uColumnTaper;

  uniform float uTendrilInner;
  uniform float uTendrilReach;
  uniform float uTendrilCurve;
  uniform float uTendrilWander;
  uniform float uTendrilArch;
  uniform float uTendrilHug;
  uniform float uTendrilSpin;
  uniform float uTendrilKink;
  uniform float uTendrilWidth;
  uniform float uTendrilDim;

  uniform float uRimSpan;
  uniform float uRimSpeed;
  uniform float uRimHeight;
  uniform float uRimJitter;
  uniform float uRimKink;
  uniform float uRimWidth;
  uniform float uRimDim;

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

  varying float vT;
  varying float vSide;
  varying float vDim;
  varying float vFlash;
  varying float vViewZ;

  ${s}

  /** Value noise with a *linear* ramp — piecewise-linear output, sharp corners. */
  float vnoise(float x, float seed) {
    float i = floor(x);
    float f = x - i;
    return mix(hash11(i + seed), hash11(i + 1.0 + seed), f) * 2.0 - 1.0;
  }

  /**
   * Offset of one filament from its path, in the perpendicular plane.
   * span is the length of that path, so uJitterScale stays kinks per *metre*
   * whether the filament is a 20 m whip or a 1 m hop around the rim.
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

  /** The role's centreline at t, before any kink is added. */
  vec3 pathAt(float role, float f, float seed, float t) {
    if (role < 0.5) {
      /* ---- the leash: a line from the hand to the travelling tip ---- */
      vec3 p = mix(uHand, uFront, t);
      p.y += uLeashSag * sin(t * PI);
      // Negative sag drops the whip onto the floor, which is where a whip
      // thrown at the ground belongs — but not through it.
      p.y = max(p.y, uLeashCling);
      return p;
    }

    if (role < 1.5) {
      /* ---- the column: a twisting climb out of the middle ---- */
      float a = f * TAU + (t * uColumnTwist + uTime * uColumnSpin) * TAU;
      float r = uRadius * (mix(uThroat, uColumnSpread, pow(t, max(uColumnCurve, 0.01)))
                           + uColumnFlare * smoothstep(0.72, 1.0, t));
      vec3 p = uCentre + vec3(cos(a), 0.0, sin(a)) * r;
      p.y = pow(t, max(uHeightCurve, 0.01)) * uHeight;
      return p;
    }

    if (role < 2.5) {
      /* ---- a tendril: a meander running out to the boundary ---- */
      // The veer is a per-filament constant rather than noise so the tendril
      // curves *consistently*, the way a discharge that has committed to a
      // direction does; the kinks on top of it supply the rest.
      float veer = (hash11(seed + 5.0) - 0.5) * 2.0 * uTendrilWander;
      float a = f * TAU + uTime * uTendrilSpin * TAU + hash11(seed) * 0.4 + veer * pow(t, 1.4);
      float r = uRadius * mix(uTendrilInner, uTendrilReach, pow(t, max(uTendrilCurve, 0.01)));
      vec3 p = uCentre + vec3(cos(a), 0.0, sin(a)) * r;
      p.y = uTendrilHug + uTendrilArch * sin(t * PI);
      return p;
    }

    /* ---- a rim arc: current hopping around the boundary ---- */
    float a = (f + uTime * uRimSpeed) * TAU + hash11(seed) * 0.3 + t * uRimSpan * TAU;
    float r = uRadius * (1.0 + uRimJitter * 0.25 * sin(t * 6.0 + seed));
    vec3 p = uCentre + vec3(cos(a), 0.0, sin(a)) * r;
    p.y = uTendrilHug + uRimHeight * sin(t * PI);
    return p;
  }

  void main() {
    float t = position.x;
    float side = position.y;
    vT = t;
    vSide = side;

    /* ---- which role is this filament wearing ---- */
    float b1 = uCountLeash;
    float b2 = b1 + uCountColumn;
    float b3 = b2 + uCountTendril;

    float role = 0.0;
    float local = aStrand;
    float count = max(uCountLeash, 1.0);
    if (aStrand >= b3) {
      role = 3.0; local = aStrand - b3; count = max(uCountRim, 1.0);
    } else if (aStrand >= b2) {
      role = 2.0; local = aStrand - b2; count = max(uCountTendril, 1.0);
    } else if (aStrand >= b1) {
      role = 1.0; local = aStrand - b1; count = max(uCountColumn, 1.0);
    }
    // Open interval on purpose: 0 and 1 would put two filaments on the same
    // bearing for the roles that fan around a circle.
    float f = local / count;

    // The strike index snaps every filament onto a new shape uRestrike times a
    // second; the crawl inside kink() slides it continuously in between.
    float strike = floor(uTime * max(uRestrike, 0.01));
    float seed = hash11(aStrand * 7.13 + uSeed + strike * 3.77) * 97.0;

    /* ---- per-role constants ---- */
    float amp = uLeashKink;
    float widthMul = uLeashWidth;
    float span = max(length(uFront - uHand), 0.01);
    float dim = 1.0;
    if (role > 2.5) {
      amp = uRimKink; widthMul = uRimWidth; dim = uRimDim;
      span = max(uRadius * uRimSpan * TAU, 0.01);
    } else if (role > 1.5) {
      amp = uTendrilKink; widthMul = uTendrilWidth; dim = uTendrilDim;
      span = max(uRadius * max(uTendrilReach - uTendrilInner, 0.05), 0.01);
    } else if (role > 0.5) {
      amp = uColumnKink; widthMul = uColumnWidth;
      span = max(uHeight, 0.01);
    }
    vDim = dim;

    /* ---- the frame the offsets live in ---- */
    float step_ = 0.02;
    vec3 here = pathAt(role, f, seed, t);
    vec3 behind = pathAt(role, f, seed, max(t - step_, 0.0));
    vec3 ahead = pathAt(role, f, seed, min(t + step_, 1.0));

    vec3 tangent = ahead - behind;
    tangent = length(tangent) > 1e-5 ? normalize(tangent) : vec3(0.0, 1.0, 0.0);
    // The column runs vertically, so the usual world-up reference degenerates
    // on exactly the role that needs the frame most.
    vec3 upRef = abs(tangent.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 n1 = normalize(cross(tangent, upRef));
    vec3 n2 = normalize(cross(tangent, n1));

    /* ---- the kinks, and the fan that separates the whip's filaments ---- */
    float pinch = max(uPinch, 1e-3);
    float ends = smoothstep(0.0, pinch, t) * smoothstep(0.0, pinch, 1.0 - t);

    vec2 k = kink(t, seed, span) * amp * uJitter * ends;
    if (role < 0.5) {
      float fan = (f - 0.5) * 2.0 * uLeashSpread;
      k += vec2(cos(seed), sin(seed)) * fan * ends;
    }

    vec3 offset = n1 * k.x + n2 * k.y;
    // Ground roles keep their kinks in the floor plane. A free y here buries
    // half of every tendril and the effect reads as a broken dotted line.
    if (role > 1.5) offset.y *= 0.3;

    vec3 world = here + offset;
    vec3 nextWorld = ahead + offset;
    if (role > 1.5) {
      world.y = max(world.y, uTendrilHug * 0.4);
      nextWorld.y = max(nextWorld.y, uTendrilHug * 0.4);
    }

    /* ---- turn the ribbon to face the camera ---- */
    vec3 tan2 = nextWorld - world;
    tan2 = length(tan2) > 1e-5 ? normalize(tan2) : tangent;
    vec3 toCamera = normalize(cameraPosition - world);
    vec3 binormal = cross(tan2, toCamera);
    float bl = length(binormal);
    binormal = bl > 1e-4 ? binormal / bl : n1;

    /* ---- width ---- */
    // A stuttering per-filament blink, quantised to uFlickerSpeed so the whole
    // cage strobes on one clock instead of shimmering independently.
    float flash = mix(1.0, hash11(floor(uTime * uFlickerSpeed) + aStrand * 3.7 + uSeed), uStrandFlash);
    vFlash = flash;

    float halfWidth = uWidth * uWidthScale * widthMul;
    // Every filament is an arc with two loose ends, so it tapers at both.
    halfWidth *= mix(1.0, pow(max(sin(clamp(t, 0.0, 1.0) * PI), 0.0), 0.35), 0.85);
    if (role > 0.5 && role < 1.5) halfWidth *= mix(1.0, uColumnTaper, t);
    halfWidth *= flash * uFade;

    // World space throughout: the ability's group is an identity transform, and
    // going through modelMatrix would only invite it to drift.
    vec4 mv = viewMatrix * vec4(world + binormal * side * halfWidth, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,w=`
  #define PI 3.141592653589793

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

  varying float vT;
  varying float vSide;
  varying float vDim;
  varying float vFlash;
  varying float vViewZ;

  ${s}
  ${d}

  void main() {
    float v = clamp(abs(vSide), 0.0, 1.0);

    #ifdef CAGE_GLOW
      float profile = pow(1.0 - v, max(uGlowFalloff, 0.05));
      vec3 color = mix(uColorHalo, uColorOuter, profile);
      float alpha = profile;
    #else
      float profile = pow(1.0 - v, max(uCoreSharp, 0.05));
      vec3 color = mix(uColorOuter, uColorInner, smoothstep(0.0, 0.5, profile));
      color = mix(color, uColorCore, smoothstep(0.45, 1.0, profile));
      float alpha = profile;
    #endif

    // Quantised, not sinusoidal: real lightning stutters between brightnesses,
    // it does not breathe.
    float flicker = 1.0 - uFlicker * hash11(floor(uTime * uFlickerSpeed) + uSeed);

    // The loose ends fade as well as thin. A ribbon that only narrows leaves a
    // hard dot at each tip, and every filament here has two of them.
    alpha *= pow(max(sin(clamp(vT, 0.0, 1.0) * PI), 0.0), 0.35);
    alpha *= flicker * vFlash * vDim * uFade * uPassOpacity * uOpacity;

    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.003) discard;

    color *= uGlow * uGlobalGlow;
    gl_FragColor = vec4(color, alpha);
  }
`;function T(e=S.CORE){let n=e===S.GLOW,r=new t({defines:n?{CAGE_GLOW:``}:{},transparent:!0,depthWrite:!1,depthTest:!0,blending:2,side:2,toneMapped:!1,uniforms:i({uCentre:{value:new c},uHand:{value:new c},uFront:{value:new c(0,0,1)},uRadius:{value:4.4},uHeight:{value:6.2},uSeed:{value:0},uRestrike:{value:21},uFade:{value:1},uCountLeash:{value:3},uCountColumn:{value:8},uCountTendril:{value:12},uCountRim:{value:7},uLeashSag:{value:-.35},uLeashSpread:{value:.22},uLeashCling:{value:.12},uLeashKink:{value:.3},uLeashWidth:{value:1},uHeightCurve:{value:.85},uThroat:{value:.07},uColumnSpread:{value:.17},uColumnCurve:{value:1.35},uColumnFlare:{value:.12},uColumnTwist:{value:.55},uColumnSpin:{value:.4},uColumnKink:{value:.24},uColumnWidth:{value:1.6},uColumnTaper:{value:.55},uTendrilInner:{value:.06},uTendrilReach:{value:1},uTendrilCurve:{value:.8},uTendrilWander:{value:.9},uTendrilArch:{value:.22},uTendrilHug:{value:.05},uTendrilSpin:{value:.05},uTendrilKink:{value:.18},uTendrilWidth:{value:.75},uTendrilDim:{value:.8},uRimSpan:{value:.19},uRimSpeed:{value:.28},uRimHeight:{value:.35},uRimJitter:{value:.16},uRimKink:{value:.12},uRimWidth:{value:.7},uRimDim:{value:.9},uJitter:{value:1},uJitterScale:{value:1.4},uOctaves:{value:4},uJitterFalloff:{value:.55},uCrawl:{value:2.4},uPinch:{value:.16},uWidth:{value:.032},uWidthScale:{value:n?6.2:1},uPassOpacity:{value:n?.44:1},uStrandFlash:{value:.45},uFlickerSpeed:{value:30},uFlicker:{value:.26},uCoreSharp:{value:4.4},uGlowFalloff:{value:2.3},uSoftFade:{value:.7},uOpacity:{value:1},uGlow:{value:2.2},uColorCore:{value:new m(1,1,1)},uColorInner:{value:new m(.86,.82,1)},uColorOuter:{value:new m(.56,.42,1)},uColorHalo:{value:new m(.16,.05,.55)}}),vertexShader:C,fragmentShader:w});return r.userData.sync=e=>{let t=l.snare,i=l.global,o=r.uniforms;o.uCentre.value.copy(e.centre),o.uHand.value.copy(e.hand),o.uFront.value.copy(e.front),o.uRadius.value=e.radius,o.uHeight.value=e.height,o.uSeed.value=e.seed,o.uFade.value=e.fade,o.uCountLeash.value=e.counts.leash,o.uCountColumn.value=e.counts.column,o.uCountTendril.value=e.counts.tendril,o.uCountRim.value=e.counts.rim,o.uRestrike.value=t.restrike,o.uLeashSag.value=t.leashSag,o.uLeashSpread.value=t.leashSpread,o.uLeashCling.value=t.leashCling,o.uLeashKink.value=t.leashKink,o.uLeashWidth.value=t.leashWidth,o.uHeightCurve.value=t.heightCurve,o.uThroat.value=t.throat,o.uColumnSpread.value=t.columnSpread,o.uColumnCurve.value=t.columnCurve,o.uColumnFlare.value=t.columnFlare,o.uColumnTwist.value=t.columnTwist,o.uColumnSpin.value=t.columnSpin,o.uColumnKink.value=t.columnKink,o.uColumnWidth.value=t.columnWidth,o.uColumnTaper.value=t.columnTaper,o.uTendrilInner.value=t.tendrilInner,o.uTendrilReach.value=t.tendrilReach,o.uTendrilCurve.value=t.tendrilCurve,o.uTendrilWander.value=t.tendrilWander,o.uTendrilArch.value=t.tendrilArch,o.uTendrilHug.value=t.tendrilHug,o.uTendrilSpin.value=t.tendrilSpin,o.uTendrilKink.value=t.tendrilKink,o.uTendrilWidth.value=t.tendrilWidth,o.uTendrilDim.value=t.tendrilDim,o.uRimSpan.value=t.rimSpan,o.uRimSpeed.value=t.rimSpeed,o.uRimHeight.value=t.rimHeight,o.uRimJitter.value=t.rimJitter,o.uRimKink.value=t.rimKink,o.uRimWidth.value=t.rimWidth,o.uRimDim.value=t.rimDim,o.uJitter.value=t.jitter*i.randomness*i.noiseStrength,o.uJitterScale.value=t.jitterScale*i.noiseFrequency,o.uOctaves.value=Math.round(t.octaves),o.uJitterFalloff.value=t.jitterFalloff,o.uCrawl.value=t.crawl*i.noiseSpeed,o.uPinch.value=t.pinch,o.uWidth.value=t.width,o.uWidthScale.value=n?t.glowWidth:1,o.uPassOpacity.value=n?t.glowOpacity:1,o.uStrandFlash.value=t.strandFlash,o.uFlickerSpeed.value=t.flickerSpeed,o.uFlicker.value=t.flicker,o.uCoreSharp.value=t.coreSharp,o.uGlowFalloff.value=t.glowFalloff,o.uSoftFade.value=t.softFade,o.uOpacity.value=t.opacity*i.opacity,o.uGlow.value=t.glow,o.uColorCore.value.copy(a(t.colorCore)),o.uColorInner.value.copy(a(t.colorInner)),o.uColorOuter.value.copy(a(t.colorOuter)),o.uColorHalo.value.copy(a(t.colorHalo))},r}var E=`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,D=`
  uniform float uTime;
  uniform float uQuadSize;
  uniform float uRadius;
  uniform float uBoundary;
  uniform float uBoundaryGlow;
  uniform float uFill;
  uniform float uFalloff;
  uniform float uVeins;
  uniform float uVeinScale;
  uniform float uVeinSharp;
  uniform float uWarp;
  uniform float uCrawl;
  uniform float uRings;
  uniform float uRingSpeed;
  uniform float uSpokes;
  uniform float uSpokeLength;
  uniform float uSpin;
  uniform float uCore;
  uniform float uCoreSize;
  uniform float uPulse;
  uniform float uPulseSpeed;
  uniform float uSeed;
  uniform float uFade;
  uniform float uOpacity;
  uniform vec3  uColorField;
  uniform vec3  uColorEdge;
  uniform float uGlobalGlow;

  varying vec2 vUv;

  ${s}
  ${d}

  #define TAU 6.28318530718

  void main() {
    vec2 p = vec2(vUv.x - 0.5, 0.5 - vUv.y) * uQuadSize;
    float d = length(p);

    float outer = uRadius + uBoundary * 0.4;
    float inner = max(0.01, uRadius - uBoundary * 0.6);

    float aa = fwidth(d) + 0.02;
    if (d > outer + aa * 4.0) discard;

    float band = smoothstep(outer + aa, outer - aa, d) * smoothstep(inner - aa, inner + aa, d);
    float interior = smoothstep(inner + aa, inner - aa, d);
    float radial = clamp(d / inner, 0.0, 1.0);

    /* ---- the veins burnt across the disc ---- */
    // Sampled in the *plane* and domain warped, never on atan(): an angular
    // lookup hands every radius along a bearing the same value and draws
    // dead-straight spokes out of the centre — a firework, not a burn.
    float warp = fbm3(vec3(p * 0.5, uTime * 0.2 + uSeed)) * uWarp;
    float fil = ridged(vec3(p * uVeinScale + warp, uSeed * 11.0 + uTime * uCrawl), 4);
    float veins = smoothstep(mix(0.55, 0.86, uVeinSharp), 0.98, fil) * interior * uVeins;

    /* ---- pressure rings running out of the middle ---- */
    float ring = 0.5 + 0.5 * cos((radial * uRings - uTime * uRingSpeed) * TAU);
    ring = pow(ring, 8.0) * interior;

    /* ---- ticks stepping around the boundary ---- */
    float ang = atan(p.y, p.x) / TAU + 0.5;
    float spokePhase = fract(ang * uSpokes + uTime * uSpin * uSpokes);
    float spoke = 1.0 - smoothstep(0.22, 0.3, spokePhase);
    spoke *= smoothstep(inner - uSpokeLength, inner, d) * smoothstep(outer, inner, d);

    /* ---- the pool the column stands in ---- */
    float core = smoothstep(uCoreSize * uRadius, 0.0, d) * uCore;

    float breathe = 1.0 + uPulse * sin(uTime * uPulseSpeed * TAU);
    float wash = interior * pow(radial, uFalloff) * uFill;
    float lines = (band * uBoundaryGlow + spoke + core + ring * 0.35) * breathe;
    float body = (wash + veins * 0.9) * breathe;

    float alpha = clamp(body + lines, 0.0, 1.0) * uFade * uOpacity;
    if (alpha < 0.004) discard;

    vec3 color = uColorField * body + uColorEdge * lines;
    gl_FragColor = vec4(color * uGlobalGlow, alpha);
  }
`;function O(){let e=new t({transparent:!0,depthWrite:!1,depthTest:!0,blending:2,side:2,toneMapped:!1,uniforms:i({uQuadSize:{value:12},uRadius:{value:4.4},uBoundary:{value:.4},uBoundaryGlow:{value:2.6},uFill:{value:.3},uFalloff:{value:1.7},uVeins:{value:1},uVeinScale:{value:1.5},uVeinSharp:{value:.72},uWarp:{value:.55},uCrawl:{value:.5},uRings:{value:2.4},uRingSpeed:{value:.8},uSpokes:{value:20},uSpokeLength:{value:.5},uSpin:{value:.05},uCore:{value:1.3},uCoreSize:{value:.22},uPulse:{value:.3},uPulseSpeed:{value:3.4},uSeed:{value:0},uFade:{value:1},uOpacity:{value:1},uColorField:{value:new m(.56,.42,1)},uColorEdge:{value:new m(1,1,1)}}),vertexShader:E,fragmentShader:D});return e.userData.sync=t=>{let n=l.snare,r=l.global,i=e.uniforms;i.uQuadSize.value=t.quadSize,i.uRadius.value=t.radius,i.uFade.value=t.fade,i.uSeed.value=t.seed,i.uBoundary.value=n.fieldBoundary,i.uBoundaryGlow.value=n.fieldBoundaryGlow,i.uFill.value=n.fieldFill,i.uFalloff.value=n.fieldFalloff,i.uVeins.value=n.fieldVeins*r.shaderIntensity,i.uVeinScale.value=n.fieldVeinScale*r.noiseFrequency,i.uVeinSharp.value=n.fieldVeinSharp,i.uWarp.value=n.fieldWarp*r.noiseStrength,i.uCrawl.value=n.fieldCrawl*r.noiseSpeed,i.uRings.value=n.fieldRings,i.uRingSpeed.value=n.fieldRingSpeed,i.uSpokes.value=Math.max(0,Math.round(n.fieldSpokes)),i.uSpokeLength.value=n.fieldSpokeLength,i.uSpin.value=n.fieldSpin,i.uCore.value=n.fieldCore,i.uCoreSize.value=n.fieldCoreSize,i.uPulse.value=n.fieldPulse,i.uPulseSpeed.value=n.fieldPulseSpeed,i.uOpacity.value=n.fieldOpacity*r.opacity,i.uColorField.value.copy(a(n.colorField)),i.uColorEdge.value.copy(a(n.colorFieldEdge))},e}var k=6,A=16,j=20,M=14,N=56,P=64,F=5,I=4,L=Math.PI*2,R={},z=new c,B=new c,V=class extends x{constructor(e){super(`snare`,e)}createShaders(){this.geometry=e(P,N),this.glowMaterial=T(S.GLOW),this.coreMaterial=T(S.CORE),this.cageMaterials=[this.glowMaterial,this.coreMaterial],this.meshes=[];for(let[e,t]of this.cageMaterials.entries()){let n=new g(this.geometry,t);n.frustumCulled=!1,n.matrixAutoUpdate=!1,n.layers.set(o.VFX),n.renderOrder=11+e*2,this.group.add(n),this.meshes.push(n)}this.fieldGeometry=new n(1,1,1,1).rotateX(-Math.PI/2),this.fieldMaterial=O(),this.field=new g(this.fieldGeometry,this.fieldMaterial),this.field.name=`SnareField`,this.field.layers.set(o.VFX),this.field.renderOrder=7,this.field.frustumCulled=!1,this.group.add(this.field),this._seed=0,this._openTime=0,this._burnDistance=0,this._filamentCount=1,this._state={centre:new c,hand:new c,front:new c,radius:1,height:1,fade:1,seed:0,counts:{leash:0,column:0,tendril:0,rim:0}},this._fieldState={radius:1,quadSize:1,fade:1,seed:0}}createParticles(){let e=this.ctx.particles;this.sparks=e.get(`snare.sparks`,{capacity:4e3,shape:_.STREAK,additive:!0,stretch:!0,softFade:.25}),this.sparks.uniforms.uDrag.value=1.4,this.sparks.uniforms.uEndSize.value=.25,this.sparks.uniforms.uSizeIn.value=.02,this.sparks.uniforms.uFadeIn.value=.03,this.sparks.uniforms.uFadeOut.value=.45,this.updraft=e.get(`snare.updraft`,{capacity:3e3,shape:_.SOFT,additive:!0,curl:!0,softFade:.4}),this.updraft.uniforms.uDrag.value=.9,this.updraft.uniforms.uEndSize.value=.2,this.updraft.uniforms.uSizeIn.value=.05,this.updraft.uniforms.uFadeIn.value=.1,this.updraft.uniforms.uFadeOut.value=.45,this.smoke=e.get(`snare.smoke`,{capacity:2e3,shape:_.SMOKE,additive:!1,curl:!0,softFade:1.1}),this.smoke.uniforms.uDrag.value=1.8,this.smoke.uniforms.uEndSize.value=3,this.smoke.uniforms.uSizeIn.value=.12,this.smoke.uniforms.uFadeIn.value=.16,this.smoke.uniforms.uFadeOut.value=.3,this.debris=e.get(`snare.debris`,{capacity:1600,shape:_.CHIP,additive:!1,lit:!0,softFade:.25}),this.debris.uniforms.uDrag.value=.25,this.debris.uniforms.uEndSize.value=.8,this.debris.uniforms.uFadeOut.value=.7,this.sparkEmitter=new v,this.updraftEmitter=new v,this.smokeEmitter=new v,this.debrisEmitter=new v,this.arcEmitter=new v,this.pulseEmitter=new v,this.ringEmitter=new v}get instanceCount(){return this._filamentCount*this.meshes.length}get impactDuration(){return Math.max(.05,l.snare.lifetime*l.global.lifetime)}get fadeDuration(){return Math.max(.05,l.snare.fadeTime)}lightShimmer(){let e=l.snare,t=Math.floor(this.age*Math.max(1,e.lightFlickerSpeed)),n=Math.abs(Math.sin(t*127.1)*43758.5453)%1;return 1-f(e.lightFlicker)*n}_handPoint(e){let t=l.snare;return e.copy(this.origin).addScaledVector(this.direction,t.handForward).addScaledVector(this.side,t.handSide),e.y=t.handHeight,e}_centrePoint(e){return this.pointAt(1,e).setY(0)}_frontPoint(e){let t=l.snare,n=this.phase===b.TRAVEL?this.u:1;return this.pointAt(n,e).setY(t.leashCling)}_openAmount(){let e=Math.max(.01,l.snare.snapTime),t=f(this._openTime/e),n=Math.sin(Math.PI*t**1.7);return p.outCubic(t)*(1+.16*n)}_climbAmount(){let e=Math.max(.01,l.snare.snapTime)*1.7;return p.outCubic(f(this._openTime/e))}get radius(){return Math.max(.05,l.snare.zoneRadius)}onSpawn(){this.sparkEmitter.reset(),this.updraftEmitter.reset(),this.smokeEmitter.reset(),this.debrisEmitter.reset(),this.arcEmitter.reset(),this.pulseEmitter.reset(),this.ringEmitter.reset(),this._burnDistance=0,this._openTime=0,this._seed=Math.random()*100,this.field.rotation.y=Math.random()*L,this._sync(1),this._muzzleFx()}_sync(e){let t=l.snare,n=l.global,r=this._state,i=this.phase===b.TRAVEL;this._centrePoint(r.centre),this._handPoint(r.hand),this._frontPoint(r.front);let o=i?0:this._openAmount();r.radius=Math.max(.05,this.radius*o),r.height=Math.max(.05,t.height*(i?0:this._climbAmount())),r.fade=e,r.seed=this._seed;let s=r.counts;s.leash=i?H(t.leashStrands,k):0,s.column=i?0:H(t.strands,A),s.tendril=i?0:H(t.tendrils,j),s.rim=i?0:H(t.rimArcs,M),this._filamentCount=s.leash+s.column+s.tendril+s.rim,this.geometry.instanceCount=Math.max(1,this._filamentCount);for(let e of this.cageMaterials)e.userData.sync(r);let c=this._fieldState;c.radius=r.radius,c.quadSize=(this.radius+t.fieldBoundary+.6)*2,c.fade=i?0:e,c.seed=this._seed,this.fieldMaterial.userData.sync(c),this.field.visible=!i,this.field.position.set(r.centre.x,t.fieldHeight,r.centre.z),this.field.scale.set(c.quadSize,1,c.quadSize),this.sparks.setGradient(a(t.colorSparkA),a(t.colorSparkB),a(t.colorSparkC),a(t.colorSparkD)),this.sparks.uniforms.uGravity.value.set(0,t.sparkGravity,0),this.sparks.uniforms.uSizeScale.value=t.sparkSize*n.particleSize*7,this.sparks.uniforms.uLifeScale.value=t.sparkLifetime*.5*n.particleLifetime,this.sparks.uniforms.uSpeedScale.value=n.particleSpeed,this.sparks.uniforms.uOpacity.value=n.opacity,this.sparks.uniforms.uGlow.value=t.glow*.6*n.glow,this.sparks.uniforms.uStretch.value=t.sparkStretch,this.sparks.uniforms.uTurbulence.value=.25*n.turbulence,this.updraft.setGradient(a(t.colorUpdraftA),a(t.colorUpdraftB),a(t.colorUpdraftC),a(t.colorUpdraftD)),this.updraft.uniforms.uGravity.value.set(0,t.updraftRise,0),this.updraft.uniforms.uSizeScale.value=t.updraftSize*n.particleSize*7,this.updraft.uniforms.uLifeScale.value=t.updraftLifetime*.5*n.particleLifetime,this.updraft.uniforms.uSpeedScale.value=n.particleSpeed,this.updraft.uniforms.uOpacity.value=n.opacity,this.updraft.uniforms.uGlow.value=1.1*n.glow,this.updraft.uniforms.uTurbulence.value=t.updraftTurbulence*n.turbulence,this.smoke.setGradient(a(t.colorSmokeA),a(t.colorSmokeB),a(t.colorSmokeC),a(t.colorSmokeD)),this.smoke.uniforms.uGravity.value.set(0,t.smokeRise,0),this.smoke.uniforms.uSizeScale.value=t.smokeSize*n.particleSize,this.smoke.uniforms.uLifeScale.value=t.smokeLifetime*.5*n.particleLifetime,this.smoke.uniforms.uSpeedScale.value=t.smokeSpeed*n.particleSpeed,this.smoke.uniforms.uOpacity.value=t.smokeOpacity*n.opacity,this.smoke.uniforms.uTurbulence.value=.35*n.turbulence,this.debris.setGradient(a(t.colorDebrisA),a(t.colorDebrisB),a(t.colorDebrisC),a(t.colorDebrisD)),this.debris.uniforms.uGravity.value.set(0,t.debrisGravity,0),this.debris.uniforms.uSizeScale.value=t.debrisSize*n.particleSize*7,this.debris.uniforms.uLifeScale.value=n.particleLifetime,this.debris.uniforms.uSpeedScale.value=n.particleSpeed,this.debris.uniforms.uOpacity.value=n.opacity}_muzzleFx(){let e=l.snare,t=l.global;this._handPoint(z),this.ctx.bursts.spawn(h.STORM,z,{radius:e.muzzleSize*.2,endRadius:e.muzzleSize*t.explosionIntensity,life:.3,intensity:e.muzzleIntensity,opacity:.9,fresnel:1.5,displace:.5,colorA:a(e.colorBurstA),colorB:a(e.colorBurstB),colorC:a(e.colorBurstC)}),R.position=z,R.radius=.16,R.direction=B.copy(this.direction),R.speed=e.sparkSpeed*1.4,R.speedVariance=.8,R.spread=.8,R.inherit=null,R.anchor=null,R.size=.18,R.sizeVariance=.7,R.life=e.sparkLifetime,R.lifeVariance=.5,R.spin=0,R.tint=null,R.time=r.uTime.value,this.sparks.emit(Math.round(34*t.particleCount),R),this.ctx.flash.trigger(a(e.colorCastFlash),e.castFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.7*t.explosionIntensity}_leashFx(e){let t=l.snare,n=l.global,i=r.uTime.value,o=Math.round(this.sparkEmitter.tick(e,t.sparkRate*.5)*n.particleCount);if(o>0){R.direction=B.copy(this.direction).multiplyScalar(.4).setY(.6).normalize(),R.speed=t.sparkSpeed*.8,R.speedVariance=.85,R.spread=1,R.inherit=null,R.anchor=null,R.size=.14,R.sizeVariance=.7,R.life=t.sparkLifetime*.8,R.lifeVariance=.55,R.spin=0,R.tint=null,R.time=i;let e=o,n=Math.ceil(o/Math.min(o,F));for(;e>0;)this.pointAt(u(.1,1)*this.u,z).setY(t.leashCling+.05),R.position=z,R.radius=.22,this.sparks.emit(Math.min(n,e),R),e-=n}let s=1/Math.max(.05,t.trailRate);for(;this.front-this._burnDistance>=s;){this._burnDistance+=s;let e=f(this._burnDistance/this.length);this.pointAt(e,z),z.x+=this.side.x*u(-.4,.4),z.z+=this.side.z*u(-.4,.4),this.ctx.decals.spawn(y.ARC,z,{radius:t.arcRadius*u(.5,.85),life:t.arcLife*.7,width:t.arcBranches,intensity:t.arcIntensity*.8,colorA:a(t.colorEmber),colorB:a(t.colorArc)})}}_fieldFx(e,t){let n=l.snare,i=l.global,o=r.uTime.value,s=this._state.centre,c=this._state.radius,d=this._state.height,f=Math.round(this.sparkEmitter.tick(e,n.sparkRate*t)*i.particleCount);if(f>0){R.speed=n.sparkSpeed,R.speedVariance=.85,R.spread=1,R.inherit=null,R.anchor=null,R.size=.16,R.sizeVariance=.7,R.life=n.sparkLifetime,R.lifeVariance=.55,R.spin=0,R.tint=null,R.time=o;let e=Math.ceil(f/Math.min(f,F));for(;f>0;){if(Math.random()<.66)z.copy(s).setY(u(.1,1)*d),R.radius=c*n.columnSpread*1.4+.1,R.direction=B.set(0,1,0);else{let e=Math.random()*L;z.set(s.x+Math.cos(e)*c,.08,s.z+Math.sin(e)*c),R.radius=.25,R.direction=B.set(Math.cos(e)*.4,1,Math.sin(e)*.4).normalize()}R.position=z,this.sparks.emit(Math.min(e,f),R),f-=e}}let p=Math.round(this.updraftEmitter.tick(e,n.updraftRate*t)*i.particleCount);if(p>0){R.speed=n.updraftSpeed,R.speedVariance=.5,R.spread=.25,R.inherit=null,R.anchor=null,R.size=.09,R.sizeVariance=.6,R.life=n.updraftLifetime,R.lifeVariance=.45,R.spin=0,R.tint=null,R.time=o;let e=Math.ceil(p/Math.min(p,I));for(;p>0;){let t=Math.random()*L,r=c*(1-n.updraftInset)*Math.sqrt(Math.random());z.set(s.x+Math.cos(t)*r,u(.05,.5),s.z+Math.sin(t)*r),R.position=z,R.radius=.2,R.direction=B.set(s.x-z.x,0,s.z-z.z).normalize().multiplyScalar(.8).setY(1).normalize(),this.updraft.emit(Math.min(e,p),R),p-=e}}let m=Math.round(this.smokeEmitter.tick(e,n.smokeRate*t)*i.particleCount);if(m>0){let e=Math.random()*L,t=c*Math.sqrt(Math.random());z.set(s.x+Math.cos(e)*t,.15,s.z+Math.sin(e)*t),R.position=z,R.radius=c*.25,R.direction=B.set(0,1,0),R.speed=n.smokeSpeed,R.speedVariance=.7,R.spread=.9,R.size=.8,R.sizeVariance=.5,R.life=n.smokeLifetime,R.lifeVariance=.4,R.spin=.4,R.time=o,this.smoke.emit(m,R)}let g=Math.round(this.debrisEmitter.tick(e,n.debrisRate*t)*i.particleCount);if(g>0){let e=Math.random()*L,t=c*Math.sqrt(Math.random());z.set(s.x+Math.cos(e)*t,.06,s.z+Math.sin(e)*t),R.position=z,R.radius=.3,R.direction=B.set(0,1,0),R.speed=n.debrisSpeed,R.speedVariance=.75,R.spread=.7,R.size=.1,R.sizeVariance=.7,R.life=n.debrisLifetime,R.lifeVariance=.5,R.spin=8,R.time=o,this.debris.emit(g,R)}let _=this.arcEmitter.tick(e,n.arcRate*t);for(let e=0;e<_;e++){let e=Math.random()*L,t=c*u(.72,1.02);z.set(s.x+Math.cos(e)*t,0,s.z+Math.sin(e)*t),this.ctx.decals.spawn(y.ARC,z,{radius:n.arcRadius*u(.7,1.25),life:n.arcLife,width:n.arcBranches,intensity:n.arcIntensity,colorA:a(n.colorEmber),colorB:a(n.colorArc)})}let v=this.pulseEmitter.tick(e,n.pulseRate*t);for(let e=0;e<v;e++)z.copy(s).setY(d*u(.02,.14)),this.ctx.bursts.spawn(h.STORM,z,{radius:n.pulseSize*.25,endRadius:n.pulseSize*i.explosionIntensity,life:.42,intensity:n.pulseIntensity,opacity:.3,fresnel:2.2,displace:.5,squash:.45,colorA:a(n.colorBurstA),colorB:a(n.colorBurstB),colorC:a(n.colorBurstC)});let b=this.ringEmitter.tick(e,n.ringRate*t);for(let e=0;e<b;e++)this.ctx.decals.spawn(y.SHOCKWAVE,s,{radius:c*1.05,life:.7,width:.06,intensity:.6,colorA:a(n.colorShockA),colorB:a(n.colorShockB)})}onTravel(e){this._sync(1),this._frontPoint(this.position),this.position.y+=.3,this._leashFx(e),this.ctx.shake.rumble(l.snare.rumble*l.global.cameraShake,e)}onImpact(){let e=l.snare,t=l.global,n=r.uTime.value;this._openTime=0,this._centrePoint(z),this.ctx.bursts.spawn(h.STORM,z,{radius:e.burstSize*.2,endRadius:e.burstSize*t.explosionIntensity,life:.45,intensity:e.burstIntensity,opacity:.6,fresnel:1.6,displace:.6,squash:.55,colorA:a(e.colorBurstA),colorB:a(e.colorBurstB),colorC:a(e.colorBurstC)}),this.ctx.decals.spawn(y.SHOCKWAVE,z,{radius:e.shockRadius*t.explosionIntensity,life:.65,width:.05,intensity:1,colorA:a(e.colorShockA),colorB:a(e.colorShockB)}),this.ctx.decals.spawn(y.SCORCH,z,{radius:e.scorchRadius,life:e.scorchLife,intensity:e.scorchIntensity,colorA:a(e.colorScorch),colorB:a(e.colorEmber),height:.012});for(let t=0;t<6;t++){let n=(t/6+Math.random()*.1)*L,r=this.radius*u(.85,1);this._centrePoint(z),z.x+=Math.cos(n)*r,z.z+=Math.sin(n)*r,this.ctx.decals.spawn(y.ARC,z,{radius:e.arcRadius*u(1.1,1.7),life:e.arcLife*1.5,width:e.arcBranches,intensity:e.arcIntensity,colorA:a(e.colorEmber),colorB:a(e.colorArc)})}this._centrePoint(z),R.position=z,R.radius=this.radius*.35,R.direction=B.set(0,1,0),R.speed=e.sparkSpeed*1.9,R.speedVariance=.85,R.spread=1,R.inherit=null,R.anchor=null,R.size=.2,R.sizeVariance=.8,R.life=e.sparkLifetime*1.4,R.lifeVariance=.6,R.spin=0,R.tint=null,R.time=n,this.sparks.emit(Math.round(e.burstSparks*t.particleCount),R),R.radius=this.radius*.6,R.speed=e.debrisSpeed*1.7,R.spread=.8,R.size=.13,R.life=e.debrisLifetime*1.3,R.spin=10,this.debris.emit(Math.round(e.burstDebris*t.particleCount),R),R.speed=e.smokeSpeed*2,R.spread=1,R.size=1.4,R.life=e.smokeLifetime*1.2,R.spin=.5,this.smoke.emit(Math.round(40*t.particleCount),R),this.ctx.shake.add(e.impactShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),24),this.ctx.flash.trigger(a(e.colorFlash),e.impactFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*1.4*t.explosionIntensity}onFade(e,t){let n=l.snare;this._openTime+=e;let r=t<=1?1:1-p.inCubic(f(t-1));this._sync(r),this._centrePoint(this.position),this.position.y=this._state.height*f(n.lightHeight),this._fieldFx(e,r*(t<=1?1:.4)),this.ctx.shake.rumble(n.holdShake*r*l.global.cameraShake,e)}onDestroy(){this._filamentCount=1,this.geometry.instanceCount=1,this.field.visible=!1;for(let e of this.cageMaterials)e.uniforms.uFade.value=0;this.fieldMaterial.uniforms.uFade.value=0}dispose(){this.geometry.dispose(),this.fieldGeometry.dispose();for(let e of this.cageMaterials)e.dispose();this.fieldMaterial.dispose(),super.dispose()}};function H(e,t){return Math.max(0,Math.min(t,Math.round(e)))}export{V as SnareAbility};
//# sourceMappingURL=SnareAbility-BbilGL20.js.map