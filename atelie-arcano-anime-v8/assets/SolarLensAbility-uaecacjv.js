import{$t as e,Br as t,Fn as n,G as r,J as i,K as a,L as o,Qt as s,R as c,V as l,Y as u,at as d,di as f,g as p,h as m,nt as h,o as g,st as _,tt as v,xt as y,y as b,yn as x}from"./settings-DdywqLlV.js";import{t as S}from"./ParticleSystem-BZTczMT8.js";import{n as C}from"./ParticleEngine-DLxipNH0.js";import{n as w,t as T}from"./Ability-CYesB5Ur.js";import{n as E,r as D,t as ee}from"./GroundField-aLIZg3d3.js";import{i as O,n as k,r as A,t as j}from"./Caustics-A8hOM6Db.js";var M=Object.freeze({CORE:0,STREAK:1,RING:2,GHOST:3}),N=3,P=9,F=`
  attribute float aRole;      // 0 core · 1 streak · 2 ring · 3+ ghost
  attribute float aSlot;      // ghost ordinal, 0-based; 0 for the fixed three

  uniform vec3  uAnchor;      // world point the flare hangs off
  uniform vec2  uResolution;  // device pixels — the only reason aspect is right
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;

  /* --- occlusion --- */
  uniform float uOcclusion;   // 0..1 master; 0 also means "no depth buffer bound"
  uniform float uOccRadius;   // screen fraction — the source's apparent half-size
  uniform float uOccTaps;     // 1..9
  uniform float uOccFade;     // metres over which the depth compare feathers
  uniform float uOccSpin;     // radians — rotates the kernel off the pixel grid

  /* --- framing --- */
  uniform float uEdgeStart;   // |ndc| where the flare starts fading out
  uniform float uEdgeEnd;     // |ndc| where it is gone
  uniform float uIntensity;
  uniform float uOpacity;
  uniform float uSeed;

  /* --- core --- */
  uniform float uCoreSize;    // fraction of frame HEIGHT
  uniform float uCoreGlow;
  uniform float uBurstLength; // fraction of frame height, spike reach
  uniform float uBurstSpin;   // radians
  uniform float uHaloSize;
  uniform float uHaloWidth;

  /* --- streak --- */
  uniform float uStreakLength;    // fraction of frame WIDTH, per side
  uniform float uStreakThickness; // fraction of frame height
  uniform float uStreakTilt;      // radians off horizontal
  uniform float uStreakGlow;

  /* --- ring --- */
  uniform float uRing;        // 0 hides it
  uniform float uRingSpacing; // fraction of the source→centre vector
  uniform float uRingSize;    // fraction of frame height
  uniform float uRingWidth;
  uniform float uRingGlow;

  /* --- ghosts --- */
  uniform float uGhostCount;
  uniform float uGhostSpacing;    // first ghost, as a fraction of source→centre
  uniform float uGhostStride;     // added per ghost — negative walks back out
  uniform float uGhostScatter;    // hashed jitter on the spacing
  uniform float uGhostSize;       // fraction of frame height
  uniform float uGhostSizeStep;   // multiplied per ghost
  uniform float uGhostSizeScatter;
  uniform float uGhostSpin;       // radians added per ghost
  uniform float uGhostRound;      // 0 polygon, 1 disc — the first ghost
  uniform float uGhostRoundStep;  // added per ghost; the far ones defocus
  uniform float uGhostGlow;
  uniform float uGhostChroma;

  /* --- colours --- */
  uniform vec3 uColorCore;
  uniform vec3 uColorStreak;
  uniform vec3 uColorRing;
  uniform vec3 uColorGhostA;
  uniform vec3 uColorGhostB;
  uniform vec3 uColorGhostC;
  uniform vec3 uColorGhostD;

  varying float vRole;
  varying vec2  vLocal;   // un-rotated quad coords, -1..1
  varying vec3  vTint;
  varying float vAmp;     // intensity x glow x occlusion x edge fade x opacity
  varying vec4  vShape;   // x extent (height fractions) · y roundness · z chroma · w polarity

  ${u}

  /* commonGLSL is deliberately NOT injected here, and this is a trap worth
   * knowing about: it carries aastep, which calls fwidth, and derivative
   * functions do not exist in a vertex shader. Injecting the *fragment* chunk
   * into a vertex stage fails to compile the whole program with an error that
   * points at a helper you are not using. commonVertexGLSL is that chunk minus
   * the two functions that cannot live here, and injecting it is the answer —
   * this shader used to carry a hand-copied gradient4 instead, which is exactly
   * how a four-stop ramp ends up meaning something slightly different on one
   * mesh than on the next. */
  ${i}
  #include <packing>

  /**
   * softFade of common.glsl.js, restated — and this one genuinely cannot be
   * shared. It samples a texture, and a sampler read in a vertex shader is a
   * different capability from a sampler read in a fragment shader (vertex
   * texture units, no implicit LOD); the shared vertex chunk deliberately
   * contains nothing that touches a sampler, so that injecting it can never be
   * the reason a program fails to link on a weak driver.
   */
  float flareFade(sampler2D sceneDepth, vec2 screenUV, float viewZ, float near, float far, float fade) {
    /* screenUV, not uv: three declares the mesh's own uv attribute in the
     * prefix, and a parameter that shadows it is legal and unreadable. */
    float bits = unpackRGBAToDepth(texture2D(sceneDepth, screenUV));
    float sceneViewZ = perspectiveDepthToViewZ(bits, near, far);
    return clamp((viewZ - sceneViewZ) / max(fade, 1e-4), 0.0, 1.0);
  }

  void main() {
    float aspect = max(uResolution.x, 1.0) / max(uResolution.y, 1.0);

    /* ---- the source, in NDC ---- */
    vec4 clip = projectionMatrix * viewMatrix * vec4(uAnchor, 1.0);
    float behind = step(clip.w, 0.0001);          // 1 when the source is behind the eye
    vec2 src = clip.xy / max(clip.w, 0.0001);
    vec2 srcUV = src * 0.5 + 0.5;
    float srcViewZ = (viewMatrix * vec4(uAnchor, 1.0)).z;

    /* ---- occlusion: an area-uniform disc over the prepass ---- */
    /* Area-uniform, not Gaussian. A Gaussian weighting puts most of the answer
     * back on the centre tap and brings the popping straight back; the whole
     * point is an unweighted estimate of the *fraction* of the source's disc
     * that is showing. sqrt() on the radius is what makes the golden-angle
     * spiral cover area evenly instead of piling up in the middle. */
    float taps = clamp(uOccTaps, 1.0, ${P}.0);
    float vis = 0.0;
    for (int i = 0; i < ${P}; i++) {
      float fi = float(i);
      if (fi >= taps) break;
      float ang = fi * 2.39996323 + uOccSpin;
      float rad = sqrt((fi + 0.5) / taps) * uOccRadius;
      vec2 off = vec2(cos(ang) / aspect, sin(ang)) * rad;
      vis += flareFade(uSceneDepth, srcUV + off, srcViewZ, uCameraNear, uCameraFar, uOccFade);
    }
    vis /= taps;
    float dim = mix(1.0, vis, clamp(uOcclusion, 0.0, 1.0));

    /* A flare does not stop existing when its source leaves the frame — the
     * glass is still lit — but it must not snap off at the border either. */
    float outside = max(abs(src.x), abs(src.y));
    dim *= 1.0 - smoothstep(uEdgeStart, max(uEdgeEnd, uEdgeStart + 0.001), outside);
    dim *= 1.0 - behind;
    dim *= clamp(uOpacity, 0.0, 1.0) * max(uIntensity, 0.0);

    /* ---- place this instance ---- */
    vec2 centre = src;      // NDC position of the element's own centre
    vec2 half2 = vec2(0.0); // NDC half-extent (x, y)
    float spin = 0.0;
    float extent = 0.0;     // isotropic half-extent, in height fractions
    float glow = 1.0;
    vec3 tint = uColorCore;
    float roundness = 0.0;
    float chroma = 0.0;
    float polarity = 0.0;

    if (aRole < 0.5) {
      /* CORE — the quad has to cover the longest spike and the halo. */
      extent = max(uCoreSize * 3.0, max(uBurstLength * 1.7, uHaloSize * (1.0 + uHaloWidth * 2.5)));
      half2 = vec2(extent * 2.0 / aspect, extent * 2.0);
      spin = uBurstSpin;
      glow = uCoreGlow;
      tint = uColorCore;
    } else if (aRole < 1.5) {
      /* STREAK — length in frame widths, thickness in frame heights. Those are
       * different units on purpose: a streak is authored by how far across the
       * frame it reaches, and a thickness of "0.012 of the width" would get
       * thicker every time somebody widened the window. */
      half2 = vec2(uStreakLength * 2.0, uStreakThickness * 2.0);
      spin = uStreakTilt;
      glow = uStreakGlow;
      tint = uColorStreak;
      extent = 1.0;
    } else if (aRole < 2.5) {
      /* RING — the wide dim halo the iris throws across the frame. */
      centre = src * (1.0 - uRingSpacing);
      extent = uRingSize * (1.0 + uRingWidth * 2.0) + 0.01;
      half2 = vec2(extent * 2.0 / aspect, extent * 2.0);
      glow = uRingGlow * step(0.5, uRing);
      tint = uColorRing;
    } else {
      /* GHOST — bounce n along the line from the source through the centre.
       * A spacing over 1 puts the ghost on the far side of the frame, which is
       * where half of a real train ends up; nothing here clamps it. */
      float n = aSlot;
      float h = hash11(n * 13.31 + uSeed * 7.77);
      float h2 = hash11(n * 5.17 + uSeed * 3.11 + 41.0);
      float t = uGhostSpacing + uGhostStride * n + (h - 0.5) * 2.0 * uGhostScatter;
      centre = src * (1.0 - t);

      float size = uGhostSize * pow(max(uGhostSizeStep, 0.01), n);
      size *= 1.0 + (h2 - 0.5) * 2.0 * uGhostSizeScatter;
      extent = max(size, 0.0005);
      half2 = vec2(extent * 2.0 / aspect, extent * 2.0);

      spin = uGhostSpin * n;
      glow = uGhostGlow;
      roundness = clamp(uGhostRound + uGhostRoundStep * n, 0.0, 1.0);
      chroma = uGhostChroma;
      /* Alternate ghosts come off the far surface of the doublet and arrive
       * with the polygon inverted — bright rim, hollow middle, then the other
       * way about. Turning that off makes the train read as one sprite scaled. */
      polarity = mod(n, 2.0);

      float span = max(uGhostCount - 1.0, 1.0);
      tint = gradient4(uColorGhostA, uColorGhostB, uColorGhostC, uColorGhostD, n / span);
      dim *= step(n, uGhostCount - 0.5);
    }

    /* ---- the quad, in NDC ---- */
    vec2 local = position.xy;                  // -1..1
    float cs = cos(spin);
    float sn = sin(spin);
    /* Rotate in *pixel* space or a spun hexagon comes out sheared on a wide
     * window: undo the aspect, rotate, redo it. */
    vec2 pix = vec2(local.x * half2.x * aspect, local.y * half2.y);
    vec2 rot = vec2(pix.x * cs - pix.y * sn, pix.x * sn + pix.y * cs);
    vec2 ndc = centre + vec2(rot.x / aspect, rot.y);

    vLocal = local;
    vRole = aRole;
    vTint = tint;
    vAmp = dim * glow;
    vShape = vec4(extent, roundness, chroma, polarity);

    /* Collapsing to a point is cheaper than a discard: an element that is off
     * or behind the camera never reaches the rasteriser at all. */
    gl_Position = vec4(vAmp > 0.0001 ? ndc : centre, 0.0, 1.0);
  }
`,I=`
  uniform float uGlobalGlow;
  uniform float uShaderIntensity;
  uniform float uSeed;
  uniform float uHeadroom;

  /* --- core --- */
  uniform float uCoreSize;
  uniform float uBurstBlades;
  uniform float uBurstLength;
  uniform float uBurstSharp;
  uniform float uBurstJitter;
  uniform float uHaloSize;
  uniform float uHaloWidth;
  uniform float uHaloGlow;
  uniform vec3  uColorHalo;

  /* --- streak --- */
  uniform float uStreakFalloff;
  uniform float uStreakTight;
  uniform float uStreakGrain;
  uniform float uStreakChroma;
  uniform vec3  uColorStreakEdge;

  /* --- ring --- */
  uniform float uRingSize;
  uniform float uRingWidth;
  uniform float uRingChroma;
  uniform float uRingBlades;

  /* --- ghosts --- */
  uniform float uGhostBlades;
  uniform float uGhostFill;
  uniform float uGhostRim;
  uniform float uGhostRimWidth;
  uniform float uGhostSoft;

  varying float vRole;
  varying vec2  vLocal;
  varying vec3  vTint;
  varying float vAmp;
  varying vec4  vShape;

  ${u}

  const float TAU = 6.28318530718;

  /**
   * Distance to a regular polygon of apothem 1, blended toward a circle.
   * The blend is what "the far ghosts defocus into discs" is made of.
   */
  float irisDistance(vec2 p, float blades, float roundness) {
    float r = length(p);
    if (r < 1e-6) return 0.0;
    float a = atan(p.y, p.x);
    float seg = TAU / max(blades, 3.0);
    float poly = cos(floor(0.5 + a / seg) * seg - a) * r;
    return mix(poly, r, clamp(roundness, 0.0, 1.0));
  }

  /** Filled iris with a bright rim. scale is the dispersion knob. */
  float iris(vec2 p, float blades, float roundness, float scale, float fill, float rim) {
    float d = irisDistance(p * scale, blades, roundness);
    float body = 1.0 - smoothstep(1.0 - clamp(uGhostSoft, 0.001, 0.999), 1.0, d);
    float edge = exp(-abs(d - 1.0) / max(uGhostRimWidth, 0.001));
    return body * fill + edge * rim;
  }

  /** Annulus of unit radius, width w, in the same units as iris. */
  float band(vec2 p, float blades, float scale, float w) {
    float d = irisDistance(p * scale, blades, 0.85);
    return exp(-abs(d - 1.0) * abs(d - 1.0) / max(w * w, 1e-6));
  }

  /**
   * Hue-preserving shoulder — see the module comment. Reinhard on the largest
   * channel, all three scaled by the same ratio, so a deep blue streak stays
   * deep blue however hard it is driven.
   */
  vec3 shoulder(vec3 c, float headroom) {
    float m = max(max(c.r, c.g), c.b);
    if (m <= 1e-5) return c;
    float h = max(headroom, 0.05);
    float s = (m / (1.0 + m / h));
    return c * (s / m);
  }

  void main() {
    vec3 rgb = vec3(0.0);

    if (vRole < 0.5) {
      /* ---------------------------------------------------------------- */
      /* CORE — hot point, iris starburst, halo                            */
      /* ---------------------------------------------------------------- */
      /* rf is in fractions of the frame height, so every size slider in this
       * block is in the same unit and comparable by eye in the editor. */
      float rf = length(vLocal) * vShape.x;

      /* An even-bladed iris throws as many spikes as it has blades; an odd one
       * throws twice as many, because opposite edges are no longer parallel.
       * A five-bladed lens with five spikes is one of those details that is
       * wrong in most CG flares and instantly right in the ones that work. */
      float blades = max(uBurstBlades, 3.0);
      float spikes = mod(blades, 2.0) < 0.5 ? blades : blades * 2.0;

      float ang = atan(vLocal.y, vLocal.x);
      float lobe = abs(cos(ang * spikes * 0.5));
      float index = floor((ang + 3.14159265) / (TAU / spikes));
      float jitter = 1.0 + (hash11(index * 3.77 + uSeed * 9.13) - 0.5) * 2.0 * uBurstJitter;

      float reach = max(uBurstLength * jitter, 1e-4);
      float spike = pow(lobe, max(uBurstSharp, 1.0)) * exp(-rf / reach);

      float core = exp(-(rf * rf) / max(uCoreSize * uCoreSize, 1e-8));
      float halo = exp(-pow(abs(rf - uHaloSize) / max(uHaloWidth * uHaloSize, 1e-5), 2.0));

      rgb = vTint * (core + spike) + uColorHalo * halo * uHaloGlow;
    } else if (vRole < 1.5) {
      /* ---------------------------------------------------------------- */
      /* STREAK — the cylindrical element's smear                          */
      /* ---------------------------------------------------------------- */
      float x = vLocal.x;
      float y = vLocal.y;

      float body = pow(max(1.0 - abs(x), 0.0), max(uStreakFalloff, 0.01));
      float thin = exp(-y * y * max(uStreakTight, 0.1));
      float hot = exp(-abs(y) * 26.0);

      /* Real anamorphic streaks are not a clean gradient — the element is a
       * lens, not a light bar, and the smear is grainy along its length. A
       * static hash on x is enough; anything animated boils. */
      float grain = 1.0 + (hash11(floor(x * 220.0) + uSeed * 17.0) - 0.5) * uStreakGrain;

      /* The ends of a streak run blue because the coating's transmission falls
       * off first at the short end of the spectrum. Two pickers, mixed on the
       * distance out, not a hue shift. */
      vec3 tint = mix(vTint, uColorStreakEdge, pow(abs(x), 0.7) * uStreakChroma);
      rgb = tint * body * (thin + hot * 0.6) * grain;
    } else if (vRole < 2.5) {
      /* ---------------------------------------------------------------- */
      /* RING — the wide chromatic iris halo                               */
      /* ---------------------------------------------------------------- */
      float ext = max(vShape.x, 1e-5);
      vec2 p = vLocal * (ext / max(uRingSize, 1e-5));
      float w = max(uRingWidth, 0.002) / max(uRingSize, 1e-5) * ext;
      float c = uRingChroma * 0.06;
      rgb = vTint * vec3(
        band(p, uRingBlades, 1.0 - c, w),
        band(p, uRingBlades, 1.0, w),
        band(p, uRingBlades, 1.0 + c, w)
      );
    } else {
      /* ---------------------------------------------------------------- */
      /* GHOST — an image of the iris                                      */
      /* ---------------------------------------------------------------- */
      float roundness = vShape.y;
      float c = vShape.z * 0.06;
      float fill = mix(uGhostFill, uGhostFill * 0.25, vShape.w);
      float rim = mix(uGhostRim, uGhostRim * 1.6, vShape.w);
      rgb = vTint * vec3(
        iris(vLocal, uGhostBlades, roundness, 1.0 - c, fill, rim),
        iris(vLocal, uGhostBlades, roundness, 1.0, fill, rim),
        iris(vLocal, uGhostBlades, roundness, 1.0 + c, fill, rim)
      );
    }

    rgb *= vAmp * uGlobalGlow * uShaderIntensity;
    rgb = shoulder(rgb, uHeadroom);

    /* Additive with alpha 1: three's AdditiveBlending is (SRC_ALPHA, ONE), so
     * writing the coverage into alpha as well would square it and quietly
     * darken every soft edge in the flare. */
    if (max(max(rgb.r, rgb.g), rgb.b) < 0.0008) discard;
    gl_FragColor = vec4(rgb, 1.0);
  }
`,L={intensity:1,opacity:1,seed:0,headroom:6,occlusion:1,occRadius:.02,occTaps:7,occFade:.6,occSpin:0,edgeStart:.8,edgeEnd:1.35,coreSize:.02,coreGlow:2.4,burstBlades:6,burstLength:.12,burstSharp:26,burstJitter:.35,burstSpin:.35,haloSize:.05,haloWidth:.35,haloGlow:.7,streakLength:.3,streakThickness:.014,streakFalloff:2.2,streakTight:9,streakGlow:1.3,streakTilt:0,streakGrain:.35,streakChroma:.7,ghosts:5,ghostSpacing:.34,ghostStride:.3,ghostScatter:.1,ghostSize:.045,ghostSizeStep:.88,ghostSizeScatter:.25,ghostBlades:6,ghostRound:.1,ghostRoundStep:.14,ghostSpin:.5,ghostFill:.3,ghostRim:.9,ghostRimWidth:.14,ghostSoft:.22,ghostChroma:.5,ghostGlow:1,ring:1,ringSpacing:1.15,ringSize:.26,ringWidth:.03,ringBlades:6,ringChroma:1,ringGlow:.45,colorCore:`#fff4dc`,colorHalo:`#ffd7a0`,colorStreak:`#bfe4ff`,colorStreakEdge:`#2f5cff`,colorGhostA:`#ffd9a0`,colorGhostB:`#ff7fae`,colorGhostC:`#7fe0d0`,colorGhostD:`#8fa8ff`,colorRing:`#9fd8ff`};function R(){return{...L}}var z=(e,t)=>e??t,B=new f,V=class{constructor({ghosts:r=8,renderOrder:i=3e3,layer:o=l.VFX,name:c}={}){this.capacity=Math.max(0,Math.min(8,Math.round(r)));let u=N+this.capacity,d=new n(2,2,1,1),p=new e;p.index=d.index,p.setAttribute(`position`,d.attributes.position),p.setAttribute(`uv`,d.attributes.uv);let m=new Float32Array(u),h=new Float32Array(u);for(let e=0;e<u;e++)m[e]=e<N?e:M.GHOST,h[e]=e<N?0:e-N;p.setAttribute(`aRole`,new s(m,1)),p.setAttribute(`aSlot`,new s(h,1)),p.instanceCount=u,this.geometry=p,this.material=new t({name:c?`${c}:flare`:`LensFlare`,transparent:!0,depthTest:!1,depthWrite:!1,blending:2,side:2,toneMapped:!1,uniforms:a({uAnchor:{value:new f},uOcclusion:{value:L.occlusion},uOccRadius:{value:L.occRadius},uOccTaps:{value:L.occTaps},uOccFade:{value:L.occFade},uOccSpin:{value:L.occSpin},uEdgeStart:{value:L.edgeStart},uEdgeEnd:{value:L.edgeEnd},uIntensity:{value:L.intensity},uOpacity:{value:L.opacity},uSeed:{value:L.seed},uHeadroom:{value:L.headroom},uCoreSize:{value:L.coreSize},uCoreGlow:{value:L.coreGlow},uBurstBlades:{value:L.burstBlades},uBurstLength:{value:L.burstLength},uBurstSharp:{value:L.burstSharp},uBurstJitter:{value:L.burstJitter},uBurstSpin:{value:L.burstSpin},uHaloSize:{value:L.haloSize},uHaloWidth:{value:L.haloWidth},uHaloGlow:{value:L.haloGlow},uStreakLength:{value:L.streakLength},uStreakThickness:{value:L.streakThickness},uStreakFalloff:{value:L.streakFalloff},uStreakTight:{value:L.streakTight},uStreakGlow:{value:L.streakGlow},uStreakTilt:{value:L.streakTilt},uStreakGrain:{value:L.streakGrain},uStreakChroma:{value:L.streakChroma},uGhostCount:{value:L.ghosts},uGhostSpacing:{value:L.ghostSpacing},uGhostStride:{value:L.ghostStride},uGhostScatter:{value:L.ghostScatter},uGhostSize:{value:L.ghostSize},uGhostSizeStep:{value:L.ghostSizeStep},uGhostSizeScatter:{value:L.ghostSizeScatter},uGhostBlades:{value:L.ghostBlades},uGhostRound:{value:L.ghostRound},uGhostRoundStep:{value:L.ghostRoundStep},uGhostSpin:{value:L.ghostSpin},uGhostFill:{value:L.ghostFill},uGhostRim:{value:L.ghostRim},uGhostRimWidth:{value:L.ghostRimWidth},uGhostSoft:{value:L.ghostSoft},uGhostChroma:{value:L.ghostChroma},uGhostGlow:{value:L.ghostGlow},uRing:{value:L.ring},uRingSpacing:{value:L.ringSpacing},uRingSize:{value:L.ringSize},uRingWidth:{value:L.ringWidth},uRingBlades:{value:L.ringBlades},uRingChroma:{value:L.ringChroma},uRingGlow:{value:L.ringGlow},uColorCore:{value:new y(L.colorCore)},uColorHalo:{value:new y(L.colorHalo)},uColorStreak:{value:new y(L.colorStreak)},uColorStreakEdge:{value:new y(L.colorStreakEdge)},uColorGhostA:{value:new y(L.colorGhostA)},uColorGhostB:{value:new y(L.colorGhostB)},uColorGhostC:{value:new y(L.colorGhostC)},uColorGhostD:{value:new y(L.colorGhostD)},uColorRing:{value:new y(L.colorRing)}}),vertexShader:F,fragmentShader:I}),this.mesh=new x(p,this.material),this.mesh.name=c||`LensFlare`,this.mesh.layers.set(o),this.mesh.renderOrder=i,this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=!1,this.mesh.visible=!1,this._visible=!1}get object3D(){return this.mesh}get drawCalls(){return 1}get visible(){return this._visible}set visible(e){this._visible=!!e,this.mesh.visible=this._visible}setAnchor(e){return this.material.uniforms.uAnchor.value.copy(e),this}setAnchorXYZ(e,t,n){return this.material.uniforms.uAnchor.value.set(e,t,n),this}anchor(e=B){return e.copy(this.material.uniforms.uAnchor.value)}update(e){let t=this.material.uniforms;t.uIntensity.value=z(e.intensity,L.intensity),t.uOpacity.value=z(e.opacity,L.opacity),t.uSeed.value=z(e.seed,L.seed),t.uHeadroom.value=z(e.headroom,L.headroom);let n=r.uSceneDepth.value!==null&&r.uSceneDepth.value!==void 0;t.uOcclusion.value=n?z(e.occlusion,L.occlusion):0,t.uOccRadius.value=z(e.occRadius,L.occRadius),t.uOccTaps.value=Math.max(1,Math.min(P,z(e.occTaps,L.occTaps))),t.uOccFade.value=z(e.occFade,L.occFade),t.uOccSpin.value=z(e.occSpin,L.occSpin),t.uEdgeStart.value=z(e.edgeStart,L.edgeStart),t.uEdgeEnd.value=z(e.edgeEnd,L.edgeEnd),t.uCoreSize.value=z(e.coreSize,L.coreSize),t.uCoreGlow.value=z(e.coreGlow,L.coreGlow),t.uBurstBlades.value=z(e.burstBlades,L.burstBlades),t.uBurstLength.value=z(e.burstLength,L.burstLength),t.uBurstSharp.value=z(e.burstSharp,L.burstSharp),t.uBurstJitter.value=z(e.burstJitter,L.burstJitter),t.uBurstSpin.value=z(e.burstSpin,L.burstSpin),t.uHaloSize.value=z(e.haloSize,L.haloSize),t.uHaloWidth.value=z(e.haloWidth,L.haloWidth),t.uHaloGlow.value=z(e.haloGlow,L.haloGlow),t.uStreakLength.value=z(e.streakLength,L.streakLength),t.uStreakThickness.value=z(e.streakThickness,L.streakThickness),t.uStreakFalloff.value=z(e.streakFalloff,L.streakFalloff),t.uStreakTight.value=z(e.streakTight,L.streakTight),t.uStreakGlow.value=z(e.streakGlow,L.streakGlow),t.uStreakTilt.value=z(e.streakTilt,L.streakTilt),t.uStreakGrain.value=z(e.streakGrain,L.streakGrain),t.uStreakChroma.value=z(e.streakChroma,L.streakChroma);let i=Math.max(0,Math.min(this.capacity,Math.round(z(e.ghosts,L.ghosts))));return t.uGhostCount.value=i,t.uGhostSpacing.value=z(e.ghostSpacing,L.ghostSpacing),t.uGhostStride.value=z(e.ghostStride,L.ghostStride),t.uGhostScatter.value=z(e.ghostScatter,L.ghostScatter),t.uGhostSize.value=z(e.ghostSize,L.ghostSize),t.uGhostSizeStep.value=z(e.ghostSizeStep,L.ghostSizeStep),t.uGhostSizeScatter.value=z(e.ghostSizeScatter,L.ghostSizeScatter),t.uGhostBlades.value=z(e.ghostBlades,L.ghostBlades),t.uGhostRound.value=z(e.ghostRound,L.ghostRound),t.uGhostRoundStep.value=z(e.ghostRoundStep,L.ghostRoundStep),t.uGhostSpin.value=z(e.ghostSpin,L.ghostSpin),t.uGhostFill.value=z(e.ghostFill,L.ghostFill),t.uGhostRim.value=z(e.ghostRim,L.ghostRim),t.uGhostRimWidth.value=z(e.ghostRimWidth,L.ghostRimWidth),t.uGhostSoft.value=z(e.ghostSoft,L.ghostSoft),t.uGhostChroma.value=z(e.ghostChroma,L.ghostChroma),t.uGhostGlow.value=z(e.ghostGlow,L.ghostGlow),t.uRing.value=z(e.ring,L.ring),t.uRingSpacing.value=z(e.ringSpacing,L.ringSpacing),t.uRingSize.value=z(e.ringSize,L.ringSize),t.uRingWidth.value=z(e.ringWidth,L.ringWidth),t.uRingBlades.value=z(e.ringBlades,L.ringBlades),t.uRingChroma.value=z(e.ringChroma,L.ringChroma),t.uRingGlow.value=z(e.ringGlow,L.ringGlow),o(t.uColorCore.value,e.colorCore||L.colorCore),o(t.uColorHalo.value,e.colorHalo||L.colorHalo),o(t.uColorStreak.value,e.colorStreak||L.colorStreak),o(t.uColorStreakEdge.value,e.colorStreakEdge||L.colorStreakEdge),o(t.uColorGhostA.value,e.colorGhostA||L.colorGhostA),o(t.uColorGhostB.value,e.colorGhostB||L.colorGhostB),o(t.uColorGhostC.value,e.colorGhostC||L.colorGhostC),o(t.uColorGhostD.value,e.colorGhostD||L.colorGhostD),o(t.uColorRing.value,e.colorRing||L.colorRing),this.geometry.instanceCount=N+i,this}dispose(){this.visible=!1,this.geometry.dispose(),this.material.dispose(),this.mesh.parent?.remove(this.mesh)}},H=Math.PI*2,U=64,W=8,G=6,K={},q=new f,J=new f,Y=new f,X=new f,Z=new f,Q=new f,$=new f,te={origin:new f,axis:new f(0,-1,0),side:new f(1,0,0),span:1,t:0,fade:1,seed:0},ne=O(),re=R(),ie=D(),ae=class extends T{constructor(e){super(`solarlens`,e)}createShaders(){this.disc=new m({mode:p.SUNDISC,prefix:`disc`,segments:96,renderOrder:12}),this.group.add(this.disc.group),this.net=new A(this.group,{source:k.SCROLL,shape:j.CONE,additive:!0,renderOrder:7,name:`SolarLens:net`}),this.char=new ee(this.group,{mode:E.POCK,marks:U,additive:!1,renderOrder:3,name:`SolarLens:char`}),this.flare=new V({ghosts:W,name:`SolarLens:flare`}),this.group.add(this.flare.object3D),this._seed=0,this._igniteAt=-1,this._marksLaid=0}createParticles(){let e=this.ctx.particles;this.embers=e.get(`solarlens.embers`,{capacity:1600,shape:S.STREAK,additive:!0,stretch:!0,softFade:.25}),this.embers.uniforms.uDrag.value=1.9,this.embers.uniforms.uEndSize.value=.2,this.embers.uniforms.uSizeIn.value=.03,this.embers.uniforms.uFadeIn.value=.05,this.embers.uniforms.uFadeOut.value=.5,this.smoke=e.get(`solarlens.smoke`,{capacity:1400,shape:S.SMOKE,additive:!1,curl:!0,softFade:1.1}),this.smoke.uniforms.uDrag.value=1.7,this.smoke.uniforms.uEndSize.value=3.2,this.smoke.uniforms.uSizeIn.value=.14,this.smoke.uniforms.uFadeIn.value=.2,this.smoke.uniforms.uFadeOut.value=.32,this.motes=e.get(`solarlens.motes`,{capacity:1200,shape:S.SOFT,additive:!0,curl:!0,softFade:.4}),this.motes.uniforms.uDrag.value=1.5,this.motes.uniforms.uEndSize.value=.3,this.motes.uniforms.uSizeIn.value=.08,this.motes.uniforms.uFadeIn.value=.12,this.motes.uniforms.uFadeOut.value=.42,this.emberEmitter=new C,this.smokeEmitter=new C,this.moteEmitter=new C}get instanceCount(){return this.char.markCount+this.disc.instanceCount}get impactDuration(){return Math.max(.05,g.solarlens.lifetime*g.global.lifetime)}get fadeDuration(){return Math.max(.05,g.solarlens.fadeTime)}lightShimmer(){let e=g.solarlens;return 1-e.lightPulse*(.5-.5*Math.cos(this.age*e.lightPulseSpeed*H))}get focus(){let e=g.solarlens;return this._igniteAt<0?0:_((this.age-this._igniteAt)/Math.max(.01,e.focusTime))**+Math.max(.05,e.focusCurve)}get walkPhase(){let e=g.solarlens;return this._igniteAt<0?0:Math.max(0,this.age-this._igniteAt)*e.walkSpeed}_walkOffset(e,t){let n=g.solarlens,r=e*H+n.walkPhase,i=.5-.5*Math.cos(n.walkPetals*r),a=d(n.walkInner,n.walkOuter,i);return a+=n.walkWobble*Math.sin(r*n.walkWobbleRate+this._seed),t.x=Math.cos(r)*a,t.y=Math.sin(r)*a,t}_zoneCentre(e){return this.pointAt(1,e)}_focusPoint(e){let t=g.solarlens;if(this._zoneCentre(e),this._igniteAt<0)return e.addScaledVector(this.direction,t.lensLead),e.y=0,e;this._walkOffset(this.walkPhase,Z);let n=t.zoneRadius;return e.addScaledVector(this.side,Z.x*n).addScaledVector(this.direction,Z.y*n),e.y=0,e}_lensPoint(e){let t=g.solarlens,n=this.phase===w.TRAVEL?this.u:1,r=n**+Math.max(.05,t.lensClimb);return this.pointAt(n,e),e.addScaledVector(this.direction,t.lensLead*n),e.addScaledVector(this.side,t.lensSway*Math.sin(this.age*t.lensSwaySpeed*H+this._seed)*n),e.y=t.lensAltitude*r+t.lensBob*Math.sin(this.age*t.lensBobSpeed*H+this._seed*.7)*n,e}_spotRadius(){let e=g.solarlens;return this._lensPoint(Y),this._focusPoint(X),Math.max(.2,Y.distanceTo(X))*Math.tan(d(e.focusWide,e.focusTight,this.focus))}onSpawn(){this.emberEmitter.reset(),this.smokeEmitter.reset(),this.moteEmitter.reset(),this.char.clearMarks(),this.net.reset(),this._igniteAt=-1,this._marksLaid=0,this._seed=Math.random()*100,this.disc.visible=!0,this.net.setVisible(!0),this.char.setVisible(!0),this.flare.visible=!1,this._syncUniforms(1);let e=g.solarlens,t=g.global;this.ctx.flash.trigger(c(e.colorCastFlash),e.castFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.3*t.explosionIntensity}_syncUniforms(e){let t=g.solarlens,n=g.global,r=this.focus;this._lensPoint(Y),this._focusPoint(X),this._zoneCentre($),Q.subVectors(X,Y);let i=Math.max(.2,Q.length());Q.multiplyScalar(1/i);let a=te;a.origin.copy(Y),a.axis.copy(Q),a.side.copy(this.side),a.span=Math.max(.05,i),a.t=r,a.fade=e,a.seed=this._seed,this.disc.sync(t,a,n);let o=ne;o.centre=X,o.lightAxis=Q,o.yaw=0,o.height=.016,o.radius=Math.max(.1,t.netRadius),o.length=Math.max(.2,t.netRadius*2),o.fade=e*d(.35,1,r),o.front=.5,o.now=this._igniteAt<0?0:this._igniteAt,o.seed=this._seed,o.depth=t.netDepth,o.ior=t.netIor,o.dispersion=t.netDispersion,o.sampleStep=t.netSampleStep,o.absorb=t.netAbsorb,o.foldFloor=t.netFoldFloor,o.threshold=t.netThreshold,o.gain=t.netGain,o.sharpness=t.netSharpness,o.rolloff=t.netRolloff,o.sourceAmp=t.netAmp,o.cellScale=t.netCellScale,o.cellRatio=t.netCellRatio,o.cellJitter=t.netCellJitter,o.driftAngle=t.netDriftAngle,o.driftSpeed=t.netDriftSpeed,o.boil=t.netBoil,o.ridgeMix=t.netRidgeMix,o.ridgeScale=t.netRidgeScale,o.ridgePower=t.netRidgePower,o.penumbra=t.netPenumbra,o.coneAngle=h(d(t.focusWide,t.focusTight,r),.01,1.5),o.projectorHeight=i,o.additive=!0,o.emissive=t.netEmissive*n.glow,o.opacity=t.netOpacity*n.opacity,o.wash=t.netWash,o.fringeAt=t.netFringeAt,o.depthFade=t.netDepthFade,o.colorNet=t.colorNet,o.colorFringe=t.colorFringe,o.colorWash=t.colorWash,o.noiseStrength=n.noiseStrength,o.noiseFrequency=n.noiseFrequency,o.noiseSpeed=n.noiseSpeed,o.opacityScale=1,this.net.update(o);let s=ie;s.centre=$,s.yaw=0,s.height=.012,s.radius=Math.max(.2,t.zoneRadius),s.length=Math.max(.2,t.zoneRadius*2),s.grow=1,s.recede=0,s.fade=e,s.seed=this._seed,s.edge=t.charEdge,s.ragged=t.charRagged,s.raggedScale=t.charRaggedScale,s.warp=t.charWarp,s.relief=t.charRelief,s.normalStep=t.charNormalStep,s.ambient=t.charAmbient,s.wrap=t.charWrap,s.specular=t.charSpecular,s.gloss=t.charGloss,s.parallax=t.charParallax,s.depth=t.charDepth,s.lift=t.charLift,s.sharp=t.charSharp,s.detail=t.charDetail,s.markLife=t.charMarkLife,s.markRadius=t.charMarkRadius,s.additive=!1,s.emissive=t.charEmissive*n.glow,s.opacity=t.charOpacity*n.opacity,s.depthFade=t.charDepthFade,s.colorBase=t.colorCharBase,s.colorEdge=t.colorCharEdge,s.colorGlow=t.colorCharGlow,s.colorDeep=t.colorCharDeep,s.noiseStrength=n.noiseStrength,s.noiseFrequency=n.noiseFrequency,s.noiseSpeed=n.noiseSpeed,s.opacityScale=1,this.char.update(s),this.flare.setAnchorXYZ(X.x,X.y+t.focusLift,X.z);let l=re;l.intensity=t.flareIntensity*r*e*n.glow,l.opacity=t.flareOpacity*n.opacity,l.seed=this._seed,l.headroom=t.flareHeadroom,l.occlusion=t.flareOcclusion,l.occRadius=t.flareOccRadius,l.occTaps=t.flareOccTaps,l.occFade=t.flareOccFade,l.occSpin=t.flareOccSpin,l.edgeStart=t.flareEdgeStart,l.edgeEnd=t.flareEdgeEnd,l.coreSize=t.flareCoreSize,l.coreGlow=t.flareCoreGlow,l.burstBlades=t.flareBurstBlades,l.burstLength=t.flareBurstLength,l.burstSharp=t.flareBurstSharp,l.burstJitter=t.flareBurstJitter,l.burstSpin=t.flareBurstSpin,l.haloSize=t.flareHaloSize,l.haloWidth=t.flareHaloWidth,l.haloGlow=t.flareHaloGlow,l.streakLength=t.flareStreakLength,l.streakThickness=t.flareStreakThickness,l.streakFalloff=t.flareStreakFalloff,l.streakTight=t.flareStreakTight,l.streakGlow=t.flareStreakGlow,l.streakTilt=t.flareStreakTilt,l.streakGrain=t.flareStreakGrain,l.streakChroma=t.flareStreakChroma,l.ghosts=t.flareGhosts,l.ghostSpacing=t.flareGhostSpacing,l.ghostStride=t.flareGhostStride,l.ghostScatter=t.flareGhostScatter,l.ghostSize=t.flareGhostSize,l.ghostSizeStep=t.flareGhostSizeStep,l.ghostSizeScatter=t.flareGhostSizeScatter,l.ghostBlades=t.flareGhostBlades,l.ghostRound=t.flareGhostRound,l.ghostRoundStep=t.flareGhostRoundStep,l.ghostSpin=t.flareGhostSpin,l.ghostFill=t.flareGhostFill,l.ghostRim=t.flareGhostRim,l.ghostRimWidth=t.flareGhostRimWidth,l.ghostSoft=t.flareGhostSoft,l.ghostChroma=t.flareGhostChroma,l.ghostGlow=t.flareGhostGlow,l.ring=t.flareRing,l.ringSpacing=t.flareRingSpacing,l.ringSize=t.flareRingSize,l.ringWidth=t.flareRingWidth,l.ringBlades=t.flareRingBlades,l.ringChroma=t.flareRingChroma,l.ringGlow=t.flareRingGlow,l.colorCore=t.colorFlareCore,l.colorHalo=t.colorFlareHalo,l.colorStreak=t.colorFlareStreak,l.colorStreakEdge=t.colorFlareStreakEdge,l.colorGhostA=t.colorFlareGhostA,l.colorGhostB=t.colorFlareGhostB,l.colorGhostC=t.colorFlareGhostC,l.colorGhostD=t.colorFlareGhostD,l.colorRing=t.colorFlareRing,this.flare.update(l),this.flare.visible=l.intensity>.005,this.embers.setGradient(c(t.colorEmberA),c(t.colorEmberB),c(t.colorEmberC),c(t.colorEmberD)),this.embers.uniforms.uGravity.value.set(0,t.emberGravity,0),this.embers.uniforms.uSizeScale.value=t.emberSize*n.particleSize*7,this.embers.uniforms.uLifeScale.value=t.emberLifetime*.5*n.particleLifetime,this.embers.uniforms.uSpeedScale.value=n.particleSpeed,this.embers.uniforms.uOpacity.value=n.opacity,this.embers.uniforms.uGlow.value=1.2*n.glow,this.embers.uniforms.uStretch.value=t.emberStretch,this.embers.uniforms.uTurbulence.value=.3*n.turbulence,this.smoke.setGradient(c(t.colorSmokeA),c(t.colorSmokeB),c(t.colorSmokeC),c(t.colorSmokeD)),this.smoke.uniforms.uGravity.value.set(0,t.smokeRise,0),this.smoke.uniforms.uSizeScale.value=t.smokeSize*n.particleSize,this.smoke.uniforms.uLifeScale.value=t.smokeLifetime*.5*n.particleLifetime,this.smoke.uniforms.uSpeedScale.value=t.smokeSpeed*n.particleSpeed,this.smoke.uniforms.uOpacity.value=t.smokeOpacity*n.opacity,this.smoke.uniforms.uTurbulence.value=.4*n.turbulence,this.motes.setGradient(c(t.colorMoteA),c(t.colorMoteB),c(t.colorMoteC),c(t.colorMoteD)),this.motes.uniforms.uGravity.value.set(0,t.moteRise,0),this.motes.uniforms.uSizeScale.value=t.moteSize*n.particleSize*7,this.motes.uniforms.uLifeScale.value=t.moteLifetime*.5*n.particleLifetime,this.motes.uniforms.uSpeedScale.value=n.particleSpeed,this.motes.uniforms.uOpacity.value=n.opacity,this.motes.uniforms.uGlow.value=.9*n.glow,this.motes.uniforms.uTurbulence.value=t.moteTurbulence*n.turbulence,this.position.copy(X).setY(.25)}_burnFloor(){let e=g.solarlens;if(this._igniteAt<0)return;let t=Math.max(.1,e.charMarksPerTurn),n=Math.floor(Math.max(0,this.walkPhase)*t);if(n<this._marksLaid){this._marksLaid=n;return}let i=r.uTime.value,a=0;for(;this._marksLaid<n&&a<G;)this._marksLaid++,a++,this._walkOffset(this._marksLaid/t,q),this.char.mark(q.x,q.y,i,_(this.focus))}_burnFx(e,t){let n=g.solarlens,i=g.global,a=r.uTime.value,o=this.focus,s=this._spotRadius();this._focusPoint(X);let c=Math.round(this.emberEmitter.tick(e,n.emberRate*o*t)*i.particleCount);c>0&&(K.position=X,K.radius=Math.max(.02,s*.8+n.emberScatter*n.zoneRadius),K.direction=J.set(0,1,0),K.speed=n.emberSpeed,K.speedVariance=.8,K.spread=.55,K.inherit=null,K.anchor=null,K.size=.12,K.sizeVariance=.7,K.life=n.emberLifetime,K.lifeVariance=.55,K.spin=0,K.tint=null,K.time=a,this.embers.emit(c,K));let l=Math.round(this.smokeEmitter.tick(e,n.smokeRate*o*t)*i.particleCount);l>0&&(q.copy(X).setY(.1),K.position=q,K.radius=Math.max(.05,s*1.2),K.direction=J.set(0,1,0),K.speed=n.smokeSpeed,K.speedVariance=.7,K.spread=.5,K.inherit=null,K.anchor=null,K.size=.7,K.sizeVariance=.5,K.life=n.smokeLifetime,K.lifeVariance=.45,K.spin=.35,K.tint=null,K.time=a,this.smoke.emit(l,K));let u=Math.round(this.moteEmitter.tick(e,n.moteRate*t)*i.particleCount);if(u>0){this._lensPoint(Y);let e=Math.random();q.copy(X).lerp(Y,e),K.position=q,K.radius=Math.max(.05,d(s,s*6,e)*n.moteSpread),K.direction=J.set(0,1,0),K.speed=n.moteSpeed,K.speedVariance=.85,K.spread=1,K.inherit=null,K.anchor=null,K.size=.07,K.sizeVariance=.6,K.life=n.moteLifetime,K.lifeVariance=.5,K.spin=0,K.tint=null,K.time=a,this.motes.emit(u,K)}}onTravel(e){let t=g.solarlens;this._syncUniforms(1),this._lensPoint(this.position),this._burnFx(e,.35),this.ctx.shake.rumble(t.rumble*.4*g.global.cameraShake,e)}onImpact(){let e=g.solarlens,t=g.global;this._igniteAt=this.age,this._marksLaid=0,this._focusPoint(q),q.y=.2,this.ctx.bursts.spawn(b.FIRE,q,{radius:e.igniteSize*.2,endRadius:e.igniteSize*t.explosionIntensity,life:.5,intensity:e.igniteIntensity,opacity:.75,fresnel:1.4,displace:.45,squash:.6,colorA:c(e.colorIgniteA),colorB:c(e.colorIgniteB),colorC:c(e.colorIgniteC)}),K.position=q,K.radius=.18,K.direction=J.set(0,1,0),K.speed=e.emberSpeed*2.2,K.speedVariance=.85,K.spread=.8,K.inherit=null,K.anchor=null,K.size=.16,K.sizeVariance=.8,K.life=e.emberLifetime*1.4,K.lifeVariance=.6,K.spin=0,K.tint=null,K.time=r.uTime.value,this.embers.emit(Math.round(e.igniteEmbers*t.particleCount),K),this.ctx.shake.add(e.impactShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),18),this.ctx.flash.trigger(c(e.colorFlash),e.igniteFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.7*t.explosionIntensity}onFade(e,t){let n=t<=1?1:1-v.inCubic(_(t-1));this._syncUniforms(n),this._burnFloor(),this._burnFx(e,n),this.ctx.shake.rumble(g.solarlens.rumble*n*g.global.cameraShake,e)}onDestroy(){this.flare.visible=!1,this.disc.visible=!1,this.net.setVisible(!1),this.char.setVisible(!1),this.char.clearMarks(),this._igniteAt=-1,this._marksLaid=0}dispose(){this.disc.dispose(),this.net.dispose(),this.char.dispose(),this.flare.dispose(),super.dispose()}};export{ae as SolarLensAbility};
//# sourceMappingURL=SolarLensAbility-uaecacjv.js.map