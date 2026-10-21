import{Br as e,K as t,L as n,U as r,V as i,W as a,Y as o,di as s,o as c,q as l,ui as u,xt as d,yn as f}from"./settings-DdywqLlV.js";import{r as p}from"./quads-DpYMEt67.js";var m=Object.freeze({HEAT:0,LENS:1,SHOCK:2,BLADE:3,REFRACT:4}),h=Object.freeze({BILLBOARD:`billboard`,UPRIGHT:`upright`,GROUND:`ground`,WORLD:`world`}),g={[h.BILLBOARD]:`DISTORT_FACE_BILLBOARD`,[h.UPRIGHT]:`DISTORT_FACE_UPRIGHT`,[h.GROUND]:`DISTORT_FACE_GROUND`,[h.WORLD]:`DISTORT_FACE_WORLD`},_=`
  uniform vec3 uAnchor;   // world position the emitter is pinned to
  uniform vec2 uSize;     // quad extent, metres (x across, y along local +Y)
  uniform vec2 uPivot;    // 0.5,0.5 centres the quad; 0.5,0.0 sits it on the anchor
  uniform vec3 uAxisX;    // WORLD facing only — unit, in the plane
  uniform vec3 uAxisY;    // WORLD facing only — unit, in the plane

  varying vec2  vUv;
  varying vec2  vLocal;    // metres from the anchor, in the emitter plane
  varying vec4  vClip;
  varying vec2  vCentre;   // the anchor in NDC — constant across the quad
  varying vec2  vAxX;      // screen-UV image of one metre along local +X
  varying vec2  vAxY;
  varying float vMetreUV;  // |vAxX| — screen UV per metre at the anchor's depth
  varying float vViewZ;    // negative, view space
  varying vec3  vWorld;
  varying vec3  vNormalV;  // view-space surface normal
  varying float vOnScreen; // 0 when the anchor is behind the eye

  void main() {
    vUv = uv;

    vec3 ax;
    vec3 ay;
    vec3 world;

    #ifdef DISTORT_HULL
      /* A real mesh with real normals: use its matrix as authored. */
      world = (modelMatrix * vec4(position, 1.0)).xyz;
      ax = normalize(mat3(modelMatrix) * vec3(1.0, 0.0, 0.0));
      ay = normalize(mat3(modelMatrix) * vec3(0.0, 1.0, 0.0));
      vLocal = position.xy;
      vNormalV = normalize(mat3(viewMatrix) * mat3(modelMatrix) * normal);
    #else
      #if defined(DISTORT_FACE_BILLBOARD)
        // viewMatrix's rows are the camera's basis expressed in world space.
        ax = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        ay = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
      #elif defined(DISTORT_FACE_UPRIGHT)
        // Heat rises along world up whatever the camera is doing; only the
        // *roll* of the column follows the eye. A full billboard here makes a
        // plume lean over when you orbit, which reads as wind, not heat.
        vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        ay = vec3(0.0, 1.0, 0.0);
        vec3 planar = camRight - ay * dot(camRight, ay);
        ax = length(planar) > 1e-4 ? normalize(planar) : vec3(1.0, 0.0, 0.0);
      #elif defined(DISTORT_FACE_GROUND)
        ax = vec3(1.0, 0.0, 0.0);
        ay = vec3(0.0, 0.0, 1.0);
      #else
        ax = uAxisX;
        ay = uAxisY;
      #endif

      vec2 ext = (uv - uPivot) * uSize;
      world = uAnchor + ax * ext.x + ay * ext.y;
      vLocal = ext;
      vNormalV = normalize(mat3(viewMatrix) * normalize(cross(ax, ay)));
    #endif

    vWorld = world;
    vec4 mv = viewMatrix * vec4(world, 1.0);
    vViewZ = mv.z;
    vClip = projectionMatrix * mv;
    gl_Position = vClip;

    /* ---- the constant varyings: the anchor and its two unit axes, in NDC ---- */
    vec4 c0 = projectionMatrix * viewMatrix * vec4(uAnchor, 1.0);
    vec4 cx = projectionMatrix * viewMatrix * vec4(uAnchor + ax, 1.0);
    vec4 cy = projectionMatrix * viewMatrix * vec4(uAnchor + ay, 1.0);
    vOnScreen = step(0.001, c0.w);
    vCentre = c0.xy / max(c0.w, 0.001);
    vAxX = (cx.xy / max(cx.w, 0.001) - vCentre) * 0.5;
    vAxY = (cy.xy / max(cy.w, 0.001) - vCentre) * 0.5;
    vMetreUV = length(vAxX);
  }
`,v=`
  uniform float uTime;
  uniform float uShaderIntensity;
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;

  /* --- shared --- */
  uniform float uStrength;      // screen widths at post.distortion = 1
  uniform float uOpacity;       // master coverage / fade-out, 0..1
  uniform float uSeed;          // per-cast dice roll, unitless
  uniform float uDepthReject;   // 0..1 — how hard opaque geometry in front cuts it
  uniform float uDepthFade;     // metres over which that rejection feathers
  uniform float uPerspective;   // 0 = screen fraction, 1 = shrink with distance
  uniform float uPerspectiveRef;// metres at which perspective = 1
  uniform float uPostScale;     // mirror of post.distortion × global.distortion

  /* --- radial (LENS, SHOCK) --- */
  uniform float uRadius;        // metres — the falloff edge
  uniform float uWindow;        // 0..1 of uRadius where the falloff starts
  uniform float uCore;          // 0..1 of uRadius — the 1/r² clamp
  uniform float uMaxOffset;     // hard ceiling on the magnitude
  uniform float uInvert;        // 0 = sample outward (safe), 1 = sample inward
  uniform float uFold;          // 0 = never let the image cross the centre
  uniform float uSwirl;         // tangential fraction — frame dragging

  /* --- SHOCK --- */
  uniform float uWave;          // wavefront radius, metres
  uniform float uThickness;     // metres from the front to the lobe peak
  uniform float uCompression;   // amplitude of the inner (negative) lobe
  uniform float uRarefaction;   // amplitude of the outer (positive) lobe
  uniform float uRings;         // 1..4 concentric fronts
  uniform float uRingGap;       // metres between them
  uniform float uRingDecay;     // per-ring amplitude falloff

  /* --- HEAT --- */
  uniform float uFrequency;     // cycles per metre
  uniform float uSpeed;         // metres per second the shimmer climbs
  uniform float uSourceBias;    // exponent — how hard it favours the base
  uniform float uSpread;        // how much the column opens out over its height
  uniform float uVertical;      // 0..1 how much of the wobble is up/down
  uniform float uFlicker;       // 0..1 amplitude of the second, slower clock

  /* --- BLADE --- */
  uniform float uCut;           // 0..1 how far along its length the blade has cut
  uniform float uGrazing;       // exponent on the edge-on path length
  uniform float uEdge;          // 0..1 of the height — the hairline's width
  uniform float uEdgeGain;      // how much harder the hairline warps than the body
  uniform float uWake;          // 0..1 of the height the wake survives to

  /* --- BLADE + REFRACT --- */
  uniform float uRipple;        // amplitude of the normal perturbation
  uniform float uRippleScale;   // cycles per metre
  uniform float uRippleSpeed;   // metres per second

  /* --- REFRACT --- */
  uniform float uPower;         // rim exponent; 0 = flat across the hull

  varying vec2  vUv;
  varying vec2  vLocal;
  varying vec4  vClip;
  varying vec2  vCentre;
  varying vec2  vAxX;
  varying vec2  vAxY;
  varying float vMetreUV;
  varying float vViewZ;
  varying vec3  vWorld;
  varying vec3  vNormalV;
  varying float vOnScreen;

  ${o}
  ${l}

  void main() {
    vec2 ndc = vClip.xy / vClip.w;
    vec2 screenUV = ndc * 0.5 + 0.5;

    /* Offset from the anchor in screen UV. Exact, see the vertex shader. */
    vec2 fromCentre = (ndc - vCentre) * 0.5;
    float screenR = length(fromCentre);
    vec2 radial = screenR > 1e-5 ? fromCentre / screenR : vec2(1.0, 0.0);

    vec2 dir = vec2(0.0);
    float mag = 0.0;
    float mask = 1.0;

  #if DISTORT_MODE == 0
    /* ---------------------------------------------------------------- */
    /* HEAT — shimmer rising off something hot                           */
    /* ---------------------------------------------------------------- */
    /* The noise is sampled in **world** space and scrolled downward in it, so
     * the shimmer is advected up through a column that stands still: orbiting
     * the camera does not drag the pattern along, which is the tell that gives
     * a screen-space heat haze away instantly.
     *
     * The column widens with height rather than being a rectangle of wobble,
     * because hot air entrains cold air and the plume opens out. And it is
     * biased hard toward the base — uSourceBias — because the whole read is
     * "this is coming off *that*". A plume of even strength top to bottom looks
     * like fog. */
    float h = vUv.y;
    float halfW = 0.5 * (1.0 + uSpread * h);
    float lateral = (vUv.x - 0.5) / max(halfW, 1e-3);
    mask = (1.0 - smoothstep(0.5, 1.0, abs(lateral))) * (1.0 - smoothstep(0.35, 1.0, h));

    vec3 np = vec3(
      vWorld.xz * uFrequency,
      vWorld.y * uFrequency * 0.55 - uTime * uSpeed * uFrequency + uSeed
    );
    vec2 wob = vec2(fbm3(np), fbm3(np + vec3(31.7, 11.3, 5.9)) * uVertical);

    /* Orientation from the plane's screen image, magnitude from the slider —
     * mixing the two would make the warp weaker as the camera pulls back, which
     * is what uPerspective is for and should not be automatic. */
    vec2 screenOff = wob.x * vAxX + wob.y * vAxY;
    float sl = length(screenOff);
    dir = sl > 1e-7 ? screenOff / sl : vec2(0.0);
    mag = uStrength * min(length(wob), 1.5);
    mag *= pow(max(1.0 - h, 1e-4), uSourceBias);
    mag *= 1.0 + uFlicker * sin(uTime * 7.3 + vWorld.y * 2.1 + uSeed * 6.0);
  #endif

  #if DISTORT_MODE == 1
    /* ---------------------------------------------------------------- */
    /* LENS — a gravity well                                             */
    /* ---------------------------------------------------------------- */
    /* Magnitude goes as 1/r² in the emitter's own plane, measured in metres, so
     * the well keeps its physical size when the camera moves. Two things stop
     * it being a divide-by-zero with a hole in the middle:
     *
     *  - uCore clamps the denominator, so the centre is a finite, very strong
     *    smear rather than NaN. Below about 0.08 the core samples so far out
     *    that it reads as a mirror; that is a look, and it is a slider.
     *  - uFold guards the *inverted* case. Sampling outward (the default) can
     *    only ever run off the edge of the frame. Sampling inward runs the
     *    sample point through the centre and out the other side, which flips the
     *    image — real, and occasionally wanted, but never by accident. With
     *    uFold at 0 the magnitude is clamped to exactly the screen distance
     *    back to the centre, using the post pass's own gain, so the core packs
     *    down to a point and stops.
     */
    float rm = length(vLocal);
    float rn = rm / max(uRadius, 1e-3);
    mask = 1.0 - smoothstep(uWindow, 1.0, rn);

    float denom = max(rn * rn, uCore * uCore);
    mag = min(uStrength / denom, uMaxOffset);

    vec2 tangent = vec2(-radial.y, radial.x);
    dir = normalize(radial + tangent * uSwirl);
    dir *= uInvert > 0.5 ? -1.0 : 1.0;

    float inward = max(-dot(dir, radial), 1e-3);
    float foldLimit = screenR * 0.98 / max(uPostScale * inward, 1e-4);
    mag = mix(min(mag, foldLimit), mag, clamp(uFold, 0.0, 1.0));
  #endif

  #if DISTORT_MODE == 2
    /* ---------------------------------------------------------------- */
    /* SHOCK — a travelling pressure front                               */
    /* ---------------------------------------------------------------- */
    /* The profile is the derivative of a Gaussian, d·exp(0.5 − d²), which is
     * ±1 at d = ∓1/√2 and crosses zero exactly on the wavefront. That single
     * expression gives compression just inside the front and rarefaction just
     * outside it with no seam between them — the first version used two
     * smoothsteps back to back and the join was visible as a stationary ring
     * inside a moving one.
     *
     * uWave is a metre, so the ability resolves it from settings every frame:
     * dragging the ring's speed while paused moves a front that is standing. */
    float rm2 = length(vLocal);
    float rn2 = rm2 / max(uRadius, 1e-3);
    mask = 1.0 - smoothstep(uWindow, 1.0, rn2);

    float acc = 0.0;
    for (int i = 0; i < 4; i++) {
      if (float(i) >= uRings) break;
      float r0 = uWave - float(i) * uRingGap;
      if (r0 <= 0.0) continue;
      float d = (rm2 - r0) / max(uThickness, 1e-3);
      float g = d * exp(0.5 - d * d);
      acc += g * (g < 0.0 ? uCompression : uRarefaction) / (1.0 + float(i) * uRingDecay);
    }

    mag = min(abs(uStrength * acc), uMaxOffset);
    dir = radial * (acc < 0.0 ? -1.0 : 1.0);
  #endif

  #if DISTORT_MODE == 3
    /* ---------------------------------------------------------------- */
    /* BLADE — a plane of vacuum                                         */
    /* ---------------------------------------------------------------- */
    /* A razor-thin slab shifts what is behind it along its own surface normal,
     * and the shift goes up as the view runs along the slab because that is
     * where the path through it is longest. So the whole effect is
     * normal projected to screen × (1 − |N·V|)^grazing, and the reason you see
     * a vacuum blade at all is that you are almost never looking squarely at it.
     *
     * uCut extends it along its own length: the blade is not scaled, it is
     * *drawn further*, so the wake it has already opened stays where it was. */
    float along = vUv.x;
    float across = 1.0 - vUv.y;   // 0 at the cutting edge, 1 at the trailing edge

    mask = smoothstep(0.0, 0.05, along) * (1.0 - smoothstep(uCut - 0.06, uCut + 0.01, along));
    mask *= 1.0 - smoothstep(uWake * 0.55, uWake, across);

    vec3 nv = vNormalV;
    vec2 nScreen = nv.xy;

    vec3 rp = vec3(vWorld.xz * uRippleScale, vWorld.y * uRippleScale - uTime * uRippleSpeed);
    nScreen += vec2(fbm3(rp), fbm3(rp + vec3(7.3, 19.7, 2.9))) * uRipple;

    float nl = length(nScreen);
    dir = nl > 1e-6 ? nScreen / nl : vec2(0.0);

    float graze = pow(clamp(1.0 - abs(nv.z), 0.0, 1.0), uGrazing);
    float hairline = exp(-across / max(uEdge, 1e-3));
    mag = uStrength * graze * (1.0 + uEdgeGain * hairline);
  #endif

  #if DISTORT_MODE == 4
    /* ---------------------------------------------------------------- */
    /* REFRACT — a hull that bends what is behind it                     */
    /* ---------------------------------------------------------------- */
    /* The generic one: water, glass, a prism, a pane of frozen time. The offset
     * is the surface normal in **view** space, whose xy *is* the screen-space
     * direction the refracted ray leaves in, weighted by a rim term so the
     * silhouette bends hardest — which is what a solid of any real index of
     * refraction actually does.
     *
     * uPower = 0 flattens the rim term to 1 and the hull becomes a uniform
     * offset, which is the pane-of-glass look. */
    vec3 hn = gl_FrontFacing ? vNormalV : -vNormalV;

    vec3 wp = vec3(vWorld.xz * uRippleScale, vWorld.y * uRippleScale - uTime * uRippleSpeed);
    vec2 raw = hn.xy + vec2(fbm3(wp), fbm3(wp + vec3(23.1, 4.7, 17.5))) * uRipple;

    float rl = length(raw);
    dir = rl > 1e-6 ? raw / rl : vec2(0.0);

    float rim = pow(clamp(1.0 - abs(hn.z), 0.0, 1.0), uPower);
    mag = uStrength * rim * min(rl, 2.0);
  #endif

    /* ---------------------------------------------------------------- */
    /* Shared tail                                                       */
    /* ---------------------------------------------------------------- */

    /* The distortion buffer has no depth of its own — nothing else renders into
     * it — so an emitter behind a pillar would happily warp the pillar. The
     * opaque depth prepass is already sitting in uSceneDepth for the soft
     * particles, and it costs one sample to use it here too. This is the only
     * occlusion the pass gets, and it is why the character stops shimmering the
     * moment they walk in front of the flame. */
    float occluded = softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uDepthFade);
    mask *= mix(1.0, occluded, clamp(uDepthReject, 0.0, 1.0));

    mag *= mix(1.0, clamp(uPerspectiveRef / max(-vViewZ, 0.05), 0.0, 4.0), uPerspective);
    mag = clamp(mag * uShaderIntensity, 0.0, 8.0);

    float alpha = clamp(mask * uOpacity, 0.0, 1.0) * vOnScreen;

    /* Blending costs more than the fragment does at this point. */
    if (alpha * mag < 0.0004) discard;

    gl_FragColor = vec4(clamp(dir, -1.0, 1.0) * 0.5 + 0.5, mag, alpha);
  }
`,y=`
  uniform vec3  uColorEdge;
  uniform float uEdgeGlow;
  uniform float uEdge;
  uniform float uCut;
  uniform float uOpacity;
  uniform float uGlobalGlow;

  varying vec2 vUv;

  void main() {
    float along = vUv.x;
    float across = 1.0 - vUv.y;
    float line = exp(-across / max(uEdge * 0.35, 1e-4));
    float ends = smoothstep(0.0, 0.03, along) * (1.0 - smoothstep(uCut - 0.05, uCut, along));
    float a = line * ends * uOpacity;
    if (a < 0.002) discard;
    gl_FragColor = vec4(uColorEdge * uEdgeGlow * uGlobalGlow * a, a);
  }
`,b={strength:.35,opacity:1,seed:0,depthReject:1,depthFade:.35,perspective:0,perspectiveRef:12,radius:3,window:.55,core:.16,maxOffset:1.6,invert:0,fold:0,swirl:0,wave:1,thickness:.45,compression:1,rarefaction:.7,rings:1,ringGap:.9,ringDecay:.8,frequency:1.1,speed:1.4,sourceBias:1.4,spread:.8,vertical:.35,flicker:.25,cut:1,grazing:1.5,edge:.06,edgeGain:2.2,wake:1,edgeGlow:3,edgeColor:`#ffffff`,ripple:0,rippleScale:1.6,rippleSpeed:1.2,power:1.6},x={[m.HEAT]:[.5,0],[m.LENS]:[.5,.5],[m.SHOCK]:[.5,.5],[m.BLADE]:[0,.5],[m.REFRACT]:[.5,.5]},S=(e,t)=>e??t,C=new s,w=new s,T=new s,E=class{constructor({mode:n=m.HEAT,facing:r,geometry:a=null,edge:o=!1,renderOrder:c=0,name:l}={}){this.mode=n,this.isHull=a!==null,this.facing=r||(this.isHull?h.WORLD:n===m.HEAT?h.UPRIGHT:n===m.BLADE?h.WORLD:h.BILLBOARD);let S=x[n]||[.5,.5];this._shared={uAnchor:{value:new s},uSize:{value:new u(1,1)},uPivot:{value:new u(S[0],S[1])},uAxisX:{value:new s(1,0,0)},uAxisY:{value:new s(0,1,0)},uCut:{value:b.cut},uEdge:{value:b.edge},uOpacity:{value:b.opacity}},this.material=new e({name:l?`${l}:distortion`:`DistortionField`,transparent:!0,depthWrite:!1,depthTest:!1,blending:1,side:this.isHull?0:2,toneMapped:!1,defines:{DISTORT_MODE:String(n),[g[this.facing]]:``,...this.isHull?{DISTORT_HULL:``}:{}},uniforms:t({...this._shared,uStrength:{value:b.strength},uSeed:{value:b.seed},uDepthReject:{value:b.depthReject},uDepthFade:{value:b.depthFade},uPerspective:{value:b.perspective},uPerspectiveRef:{value:b.perspectiveRef},uPostScale:{value:.045},uRadius:{value:b.radius},uWindow:{value:b.window},uCore:{value:b.core},uMaxOffset:{value:b.maxOffset},uInvert:{value:b.invert},uFold:{value:b.fold},uSwirl:{value:b.swirl},uWave:{value:b.wave},uThickness:{value:b.thickness},uCompression:{value:b.compression},uRarefaction:{value:b.rarefaction},uRings:{value:b.rings},uRingGap:{value:b.ringGap},uRingDecay:{value:b.ringDecay},uFrequency:{value:b.frequency},uSpeed:{value:b.speed},uSourceBias:{value:b.sourceBias},uSpread:{value:b.spread},uVertical:{value:b.vertical},uFlicker:{value:b.flicker},uGrazing:{value:b.grazing},uEdgeGain:{value:b.edgeGain},uWake:{value:b.wake},uRipple:{value:b.ripple},uRippleScale:{value:b.rippleScale},uRippleSpeed:{value:b.rippleSpeed},uPower:{value:b.power}}),vertexShader:_,fragmentShader:v}),this.mesh=new f(a||p(),this.material),this.mesh.name=l||`DistortionField`,this.mesh.layers.set(i.DISTORTION),this.mesh.renderOrder=c,this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=this.isHull,this.mesh.visible=!1,this.edgeMaterial=null,this.edgeMesh=null,o&&n===m.BLADE&&(this.edgeMaterial=new e({name:l?`${l}:edge`:`DistortionBladeEdge`,transparent:!0,depthWrite:!1,depthTest:!0,blending:2,side:2,toneMapped:!1,defines:{DISTORT_MODE:String(n),[g[this.facing]]:``},uniforms:t({...this._shared,uColorEdge:{value:new d(b.edgeColor)},uEdgeGlow:{value:b.edgeGlow}}),vertexShader:_,fragmentShader:y}),this.edgeMesh=new f(p(),this.edgeMaterial),this.edgeMesh.name=`${l||`DistortionField`}:edge`,this.edgeMesh.layers.set(i.VFX),this.edgeMesh.renderOrder=14,this.edgeMesh.frustumCulled=!1,this.edgeMesh.matrixAutoUpdate=!1,this.edgeMesh.visible=!1,this.mesh.add(this.edgeMesh)),this._visible=!1}get object3D(){return this.mesh}get visible(){return this._visible}set visible(e){let t=!!e;t!==this._visible&&(this._visible=t,this.mesh.visible=t,this.edgeMesh&&(this.edgeMesh.visible=t),t?a():r())}setAnchor(e){return this._shared.uAnchor.value.copy(e),this}setAnchorXYZ(e,t,n){return this._shared.uAnchor.value.set(e,t,n),this}setBasis(e,t){return C.copy(e).normalize(),T.crossVectors(C,t).normalize(),w.crossVectors(T,C).normalize(),this._shared.uAxisX.value.copy(C),this._shared.uAxisY.value.copy(w),this}update(e){let t=this.material.uniforms,r=this._shared;if(this.isHull||r.uSize.value.set(S(e.width,1),S(e.height,1)),r.uOpacity.value=S(e.opacity,b.opacity),r.uCut.value=S(e.cut,b.cut),r.uEdge.value=S(e.edge,b.edge),t.uStrength.value=S(e.strength,b.strength),t.uSeed.value=S(e.seed,b.seed),t.uDepthReject.value=S(e.depthReject,b.depthReject),t.uDepthFade.value=S(e.depthFade,b.depthFade),t.uPerspective.value=S(e.perspective,b.perspective),t.uPerspectiveRef.value=S(e.perspectiveRef,b.perspectiveRef),t.uPostScale.value=c.post.distortion*c.global.distortion,t.uRadius.value=S(e.radius,b.radius),t.uWindow.value=S(e.window,b.window),t.uCore.value=S(e.core,b.core),t.uMaxOffset.value=S(e.maxOffset,b.maxOffset),t.uInvert.value=S(e.invert,b.invert),t.uFold.value=S(e.fold,b.fold),t.uSwirl.value=S(e.swirl,b.swirl),t.uWave.value=S(e.wave,b.wave),t.uThickness.value=S(e.thickness,b.thickness),t.uCompression.value=S(e.compression,b.compression),t.uRarefaction.value=S(e.rarefaction,b.rarefaction),t.uRings.value=S(e.rings,b.rings),t.uRingGap.value=S(e.ringGap,b.ringGap),t.uRingDecay.value=S(e.ringDecay,b.ringDecay),t.uFrequency.value=S(e.frequency,b.frequency),t.uSpeed.value=S(e.speed,b.speed),t.uSourceBias.value=S(e.sourceBias,b.sourceBias),t.uSpread.value=S(e.spread,b.spread),t.uVertical.value=S(e.vertical,b.vertical),t.uFlicker.value=S(e.flicker,b.flicker),t.uGrazing.value=S(e.grazing,b.grazing),t.uEdgeGain.value=S(e.edgeGain,b.edgeGain),t.uWake.value=S(e.wake,b.wake),t.uRipple.value=S(e.ripple,b.ripple),t.uRippleScale.value=S(e.rippleScale,b.rippleScale),t.uRippleSpeed.value=S(e.rippleSpeed,b.rippleSpeed),t.uPower.value=S(e.power,b.power),this.edgeMaterial){let t=this.edgeMaterial.uniforms;n(t.uColorEdge.value,e.edgeColor||b.edgeColor),t.uEdgeGlow.value=S(e.edgeGlow,b.edgeGlow)}return this}dispose(){this.visible=!1,this.material.dispose(),this.edgeMaterial?.dispose(),this.mesh.parent?.remove(this.mesh)}};export{E as n,m as r,h as t};
//# sourceMappingURL=Distortion-CclodxJd.js.map