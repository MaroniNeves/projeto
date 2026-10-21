import{Br as e,G as t,K as n,M as r,N as i,R as a,V as o,Y as s,at as c,di as l,o as u,ot as d,q as f,st as p,tt as m,ui as h,xt as g,y as _,yn as v}from"./settings-DdywqLlV.js";import{t as y}from"./ParticleSystem-BZTczMT8.js";import{n as b}from"./ParticleEngine-DLxipNH0.js";import"./SceneHooks-DvEWF-72.js";import{n as x,t as S}from"./Ability-CYesB5Ur.js";import{n as C,t as w}from"./quads-DpYMEt67.js";import{n as T,r as E,t as D}from"./GroundField-aLIZg3d3.js";var O=`
  uniform vec3 uLightDir;      // world space, toward the key

  ${r}

  varying float vDisrupt;
  varying vec2  vUv2;
  varying vec2  vWorldXZ;      // world metres — the stone fields are sampled here
  varying vec3  vLight;        // key direction, in the quad's frame
  varying vec3  vView;         // fragment -> camera, in the quad's frame
  varying vec3  vViewWorld;    // the same thing in world space, for the crevice term
  varying float vViewZ;

  void main() {
    vUv2 = uv;

    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldXZ = world.xz;

    vec3 ax = normalize(modelMatrix[0].xyz);
    vec3 ay = normalize(modelMatrix[1].xyz);
    vec3 az = normalize(modelMatrix[2].xyz);

    vLight = normalize(vec3(dot(uLightDir, ax), dot(uLightDir, ay), dot(uLightDir, az)));

    vec3 toCamera = cameraPosition - world.xyz;
    vViewWorld = normalize(toCamera);
    vView = normalize(vec3(dot(toCamera, ax), dot(toCamera, ay), dot(toCamera, az)));

    vDisrupt = disruptAt(world.xyz);

    vec4 mv = viewMatrix * world;
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,k=`
  ${r}
  varying float vDisrupt;

  uniform float uTime;

  /* ---- the lane, all metres ---- */
  uniform vec2  uQuadSize;     // metres the quad covers: x across, y downrange
  uniform float uLength;       // the cast length; dz = 0 is the caster
  uniform float uHalfWidth;    // half-width of the band the network spreads in
  uniform float uTaper;        // 0..1 how much narrower the far end is
  uniform float uBack;         // metres the network reaches back behind the caster
  uniform float uEdge;         // metres of feather on every boundary
  uniform float uRagged;       // metres the boundaries wander by
  uniform float uRaggedScale;  // lobes per metre
  uniform float uWarp;         // metres of domain warp on those lobes
  uniform float uGrow;         // 0..1 the advancing front
  uniform float uRetreat;      // 0..1 the network dying back from the caster
  uniform float uSeed;

  /* ---- the buried web ---- */
  uniform float uCell;         // metres between hyphae
  uniform float uStretch;      // >1 draws the strands out along the lane
  uniform float uJitter;       // 0..1 lattice disorder
  uniform float uCore;         // metres — half-width of a hypha at zero depth
  uniform float uSpread;       // extra metres of half-width per metre of depth
  uniform float uDepthMin;     // metres
  uniform float uDepthMax;     // metres
  uniform float uDepthPitch;   // cycles per metre in the burial-depth field
  uniform float uAbsorb;       // 1/metre — Beer-Lambert through the flags
  uniform float uParallax;     // 0..1 of the true depth offset
  uniform float uBranch;       // 0..1 weight of the finer secondary web
  uniform float uBranchScale;  // >1 how much finer that web is

  /* ---- the nutrient pulses ---- */
  uniform float uPulseSpacing; // metres between pulse crests
  uniform float uPulseSpeed;   // metres per second they run downrange at
  uniform float uPulseSharp;   // crest exponent
  uniform float uPulseGain;

  /* ---- the escape mask: the floor's own detail ---- */
  uniform float uStoneStep;    // metres between the macro-gradient taps
  uniform float uSeamLevel;    // which contour of the floor's macro field is mortar
  uniform float uSeamWidth;    // metres — the mortar course, a real measurement
  uniform float uSeamWeight;   // 0..1 how much light the seams pass
  uniform float uSeamRelief;   // 0..1 how much a seam behaves like a slot
  uniform float uSeamGlow;     // extra light on the lip of a lit seam
  uniform float uPorePitch;    // cycles per metre in the re-synthesised pore field
  uniform float uPoreCut;      // 0..1 how sparse the open pores are
  uniform float uPoreWeight;   // 0..1 how much light the pores pass
  uniform float uPolishSeal;   // 0..1 how completely the floor's sheen patches close
  uniform float uBleed;        // 0..1 floor on the mask — thin flags are never opaque

  /* ---- output ---- */
  uniform float uFade;
  uniform float uOpacity;
  uniform float uEmissive;
  uniform float uDepthFade;    // metres
  uniform vec3  uColorDeep;    // the far-buried glow
  uniform vec3  uColorShallow; // a hypha just under the surface
  uniform vec3  uColorPulse;   // a nutrient surge running the web
  uniform vec3  uColorSeam;    // the lip of a crack catching the light

  uniform float uGlobalGlow;
  uniform vec2  uResolution;
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;

  varying vec2  vUv2;
  varying vec2  vWorldXZ;
  varying vec3  vLight;
  varying vec3  vView;
  varying vec3  vViewWorld;
  varying float vViewZ;

  ${s}
  ${f}

  /**
   * Voronoi that reports the distance to the cell **wall** rather than to the
   * site, because a mycelial network is a partition of its substrate and the
   * hyphae are the walls of that partition, not its centres.
   *
   * noise.glsl.js#voronoi2 hands back F1, which draws blobs. Half the F1/F2 gap
   * is the standard cheap estimate of the distance to the equidistant set — not
   * exact near a triple point, and nobody has ever seen the error on something
   * this diffuse.
   */
  float mycWall(vec2 pt, float jitter, out float id) {
    vec2 n = floor(pt);
    vec2 f = fract(pt);
    float d1 = 8.0;
    float d2 = 8.0;
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
          id = hash11(dot(n + g, vec2(31.7, 57.1)));
        } else if (d < d2) {
          d2 = d;
        }
      }
    }
    return 0.5 * (sqrt(d2) - sqrt(d1));
  }

  void main() {
    /* ---- uv -> metres in the lane's frame; +y runs downrange ---- */
    vec2 p = vec2(vUv2.x - 0.5, 0.5 - vUv2.y) * uQuadSize;

    // Metres per pixel, taken before the first discard: a derivative evaluated
    // in divergent control flow is undefined, and the symptom is a sparkling
    // fringe on exactly one vendor's driver.
    vec2 pd = fwidth(p);
    float px = max(max(pd.x, pd.y), 1e-5);

    // The quad is centred on the middle of the cast, so this is metres
    // downrange of the caster and metres sideways off the spine.
    float dz = p.y + uLength * 0.5;
    float dx = p.x;

    /* ---- the footprint, warped in the plane and never on atan(y, x) ---- */
    // An angular sample hands every radius along a bearing the same value and
    // draws dead-straight spokes; a fungus does not grow in spokes.
    vec2 warped = p + vec2(
      fbm3(vec3(p * uRaggedScale, uSeed)),
      fbm3(vec3(p.yx * uRaggedScale, uSeed + 5.0))
    ) * uWarp;
    float lobe = fbm3(vec3(warped * uRaggedScale, uSeed + 11.0));

    float along = clamp(dz / max(uLength, 0.01), 0.0, 1.0);
    float halfW = max(uHalfWidth * (1.0 - clamp(uTaper, 0.0, 1.0) * along), 0.02);
    float rim = halfW + lobe * uRagged;
    float band = smoothstep(rim, rim - max(uEdge, 1e-3), abs(dx));

    float front = uGrow * (uLength + uEdge) + lobe * uRagged;
    float head = smoothstep(front, front - max(uEdge, 1e-3), dz);
    // The die-back runs the other way: the network is abandoned from the
    // caster outward, so the near end goes first and the far end lingers.
    float heel = -uBack + uRetreat * (uLength + uBack) + lobe * uRagged;
    float tail = smoothstep(heel - max(uEdge, 1e-3), heel, dz);

    float cover = band * head * tail;
    if (cover < 0.002) discard;

    /* ------------------------------------------------------------------ */
    /* The floor's own detail — see the doc comment. These four lines are   */
    /* world/Ground.js's, at its frequencies and its phase offsets.         */
    /* ------------------------------------------------------------------ */
    vec3 wp = vec3(vWorldXZ.x, 0.0, vWorldXZ.y);

    float macro = fbm3(wp * 0.018);
    float step2 = max(uStoneStep, 0.01);
    float macroX = fbm3((wp + vec3(step2, 0.0, 0.0)) * 0.018);
    float macroZ = fbm3((wp + vec3(0.0, 0.0, step2)) * 0.018);

    // Field units per metre. Dividing the contour distance by it is what makes
    // seamWidth a measurement rather than a number.
    vec2 grad = vec2(macroX - macro, macroZ - macro) / step2;
    float slope = max(length(grad), 1e-4);
    float seamMetres = abs(macro - uSeamLevel) / slope;
    float seam = 1.0 - smoothstep(uSeamWidth * 0.5, uSeamWidth * 0.5 + px * 1.5, seamMetres);

    // The floor's sheen patches. Polished stone is closed stone.
    float polish = smoothstep(0.3, 0.85, fbm3(wp * 0.06 + 3.0) * 0.5 + 0.5);

    // The pores. Re-synthesised rather than shared, because the floor's own
    // pore detail is in its normal map and I2 does not let an ability read it.
    // The grain the floor *does* compute procedurally biases where they sit.
    float grain = snoise01(wp * 0.7);
    float pore = smoothstep(uPoreCut, 1.0, snoise01(wp * uPorePitch) * (0.65 + 0.35 * grain));

    float openness = seam * uSeamWeight + pore * uPoreWeight;
    openness *= 1.0 - clamp(uPolishSeal, 0.0, 1.0) * polish;
    openness = clamp(max(openness, uBleed), 0.0, 1.0);

    /* ------------------------------------------------------------------ */
    /* The buried network                                                   */
    /* ------------------------------------------------------------------ */
    float burial = mix(
      uDepthMin,
      uDepthMax,
      snoise01(vec3(vWorldXZ.x, uSeed, vWorldXZ.y) * uDepthPitch)
    );

    vec3 V = normalize(vView);
    // The thing you are looking at is not under the pixel it appears in: it is
    // burial metres down, so it sits burial * tan(theta) away from the crack it
    // is seen through. Clamping the elevation stops the offset exploding at the
    // horizon, where the quad is a pixel tall anyway.
    vec2 lane = vec2(dx, dz) - vec2(V.x, V.z) * (burial * uParallax / max(V.y, 0.2));

    float cellSize = max(uCell, 0.03);
    vec2 web = vec2(lane.x / max(uStretch, 0.05), lane.y) / cellSize + uSeed;

    float id = 0.0;
    float wall = mycWall(web, clamp(uJitter, 0.0, 1.0), id);
    // Approximate: the x axis was divided by uStretch, so a metre across the
    // lane is not a metre along it. The error is a widening of the strands seen
    // end-on, which is what a stretched network does anyway.
    float strand = wall * cellSize;

    float id2 = 0.0;
    float fine = max(uBranchScale, 1.0);
    float wall2 = mycWall(web * fine + 7.31, clamp(uJitter, 0.0, 1.0), id2);
    float strand2 = wall2 * cellSize / fine;

    // Depth blurs. A shallow run is a tight bright thread; a deep one is a
    // broad dim smudge, because the stone above it scatters. One Gaussian,
    // whose width is a linear function of the burial depth.
    float sigma = max(uCore + burial * uSpread, 0.002);
    float inv2 = 1.0 / (2.0 * sigma * sigma);
    float lit = exp(-strand * strand * inv2);
    lit = max(lit, exp(-strand2 * strand2 * inv2) * clamp(uBranch, 0.0, 1.0));
    lit *= exp(-burial * max(uAbsorb, 0.0));

    /* ---- nutrient pulses, running outward from the caster ---- */
    float phase = fract((dz - uTime * uPulseSpeed) / max(uPulseSpacing, 0.05) + id);
    float pulse = pow(1.0 - phase, max(uPulseSharp, 1.0));

    /* ---- a crack is a slot, and you cannot see all the way into it ---- */
    // Two terms, both real. Looking down a crack you see its glowing floor;
    // looking along it you see the near wall instead — that is the elevation
    // term. And the two walls are not symmetric about the viewer, so the crack
    // brightens on one side as the camera orbits — that is the facing term,
    // taken in world space because the stone gradient is a world quantity.
    vec2 seamAcross = grad / slope;
    vec2 viewFlat = normalize(vec2(vViewWorld.x, vViewWorld.z) + 1e-5);
    float facing = dot(seamAcross, viewFlat);
    float elevation = clamp(vViewWorld.y, 0.0, 1.0);
    float slotted = mix(1.0, elevation * (0.55 + 0.45 * facing), clamp(uSeamRelief, 0.0, 1.0));

    /* ---- assemble ---- */
    float deepness = clamp(
      (burial - uDepthMin) / max(uDepthMax - uDepthMin, 1e-3),
      0.0,
      1.0
    );
    vec3 color = mix(uColorShallow, uColorDeep, deepness);
    color += uColorPulse * (pulse * uPulseGain);
    color += uColorSeam * (seam * uSeamGlow);
    color *= uEmissive;

    // The key light does nothing to this — it is light *leaving* the floor —
    // but a fragment facing away from the key sits in the floor's own shadow
    // and reads brighter, which is the one place the sun is allowed in.
    color *= 1.0 + 0.12 * (1.0 - max(vLight.y, 0.0));

    float alpha = cover * openness * lit * slotted * uFade * uOpacity;

    vec2 screenUV = gl_FragCoord.xy / uResolution;
    float depthBits = unpackRGBAToDepth(texture2D(uSceneDepth, screenUV));
    float sceneViewZ = perspectiveDepthToViewZ(depthBits, uCameraNear, uCameraFar);
    alpha *= smoothstep(-max(uDepthFade, 1e-3), 0.0, vViewZ - sceneViewZ);

    if (alpha < 0.004) discard;
    color *= uGlobalGlow;
    disruptShade(color, alpha, vDisrupt, gl_FragCoord.xy);
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`;function A(){let t=new e({transparent:!0,depthWrite:!1,depthTest:!0,blending:2,side:2,toneMapped:!1,uniforms:n({uQuadSize:{value:new h(12,20)},uLength:{value:16},uHalfWidth:{value:2.4},uTaper:{value:.25},uBack:{value:.8},uEdge:{value:.5},uRagged:{value:.7},uRaggedScale:{value:.5},uWarp:{value:.8},uGrow:{value:0},uRetreat:{value:0},uSeed:{value:0},uCell:{value:.42},uStretch:{value:2.2},uJitter:{value:.9},uCore:{value:.012},uSpread:{value:.55},uDepthMin:{value:.02},uDepthMax:{value:.22},uDepthPitch:{value:.35},uAbsorb:{value:4.5},uParallax:{value:1},uBranch:{value:.5},uBranchScale:{value:2.7},uPulseSpacing:{value:3.2},uPulseSpeed:{value:2.4},uPulseSharp:{value:7},uPulseGain:{value:.8},uStoneStep:{value:.35},uSeamLevel:{value:.05},uSeamWidth:{value:.07},uSeamWeight:{value:1},uSeamRelief:{value:.55},uSeamGlow:{value:.35},uPorePitch:{value:9},uPoreCut:{value:.68},uPoreWeight:{value:.45},uPolishSeal:{value:.85},uBleed:{value:.06},uFade:{value:1},uOpacity:{value:1},uEmissive:{value:1},uDepthFade:{value:.5},uColorDeep:{value:new g(.09,.28,.3)},uColorShallow:{value:new g(.45,.95,.72)},uColorPulse:{value:new g(.75,1,.68)},uColorSeam:{value:new g(.16,.42,.38)},...i()}),vertexShader:O,fragmentShader:k});return t.userData.sync=e=>{let n=u.mycelium,r=u.global,i=t.uniforms,o=Math.max(.4,e.length);i.uLength.value=o,i.uGrow.value=e.grow,i.uRetreat.value=e.retreat,i.uFade.value=e.fade,i.uSeed.value=e.seed,i.uHalfWidth.value=Math.max(.05,n.laneHalfWidth),i.uTaper.value=n.laneTaper,i.uBack.value=Math.max(0,n.laneBack),i.uEdge.value=Math.max(.01,n.laneEdge),i.uRagged.value=n.laneRagged*r.noiseStrength,i.uRaggedScale.value=Math.max(.02,n.laneRaggedScale*r.noiseFrequency),i.uWarp.value=n.laneWarp*r.noiseStrength,i.uCell.value=Math.max(.03,n.webCell),i.uStretch.value=Math.max(.05,n.webStretch),i.uJitter.value=n.webJitter,i.uCore.value=Math.max(.001,n.webCore),i.uSpread.value=Math.max(0,n.webSpread),i.uDepthMin.value=Math.max(0,n.webDepthMin),i.uDepthMax.value=Math.max(n.webDepthMin+.005,n.webDepthMax),i.uDepthPitch.value=Math.max(.01,n.webDepthPitch*r.noiseFrequency),i.uAbsorb.value=Math.max(0,n.webAbsorb),i.uParallax.value=n.webParallax,i.uBranch.value=n.webBranch,i.uBranchScale.value=Math.max(1,n.webBranchScale),i.uPulseSpacing.value=Math.max(.05,n.pulseSpacing),i.uPulseSpeed.value=n.pulseSpeed*r.noiseSpeed,i.uPulseSharp.value=Math.max(1,n.pulseSharp),i.uPulseGain.value=n.pulseGain*r.shaderIntensity,i.uStoneStep.value=Math.max(.02,n.stoneStep),i.uSeamLevel.value=n.seamLevel,i.uSeamWidth.value=Math.max(.002,n.seamWidth),i.uSeamWeight.value=n.seamWeight,i.uSeamRelief.value=n.seamRelief,i.uSeamGlow.value=n.seamGlow*r.glow,i.uPorePitch.value=Math.max(.1,n.porePitch*r.noiseFrequency),i.uPoreCut.value=n.poreCut,i.uPoreWeight.value=n.poreWeight,i.uPolishSeal.value=n.polishSeal,i.uBleed.value=n.stoneBleed,i.uEmissive.value=n.seepEmissive*r.glow,i.uOpacity.value=n.seepOpacity*r.opacity,i.uDepthFade.value=Math.max(.01,n.seepDepthFade),i.uColorDeep.value.copy(a(n.colorSeepDeep)),i.uColorShallow.value.copy(a(n.colorSeepShallow)),i.uColorPulse.value.copy(a(n.colorSeepPulse)),i.uColorSeam.value.copy(a(n.colorSeepSeam));let s=Math.max(.01,n.laneEdge)+Math.abs(n.laneRagged)+.4,c=(Math.max(.05,n.laneHalfWidth)+s)*2,l=o+Math.max(0,n.laneBack)*2+s*2;return i.uQuadSize.value.set(c,l),i.uQuadSize.value},t}var j={},M=new l,N=new l,P=new l,F=new l,I=new l,L=class extends S{constructor(e){super(`mycelium`,e)}createShaders(){this.seepGeometry=w(),this.seepMaterial=A(),this.seep=new v(this.seepGeometry,this.seepMaterial),this.seep.name=`MyceliumSeep`,this.seep.layers.set(o.VFX),this.seep.renderOrder=8,this.seep.frustumCulled=!1,this.group.add(this.seep),this.damp=new D(this.group,{mode:T.WET,additive:!1,depthTest:!0,layer:o.VFX,renderOrder:6,name:`MyceliumDamp`}),this.dampParams=E(),this.dampParams.centre=new l,this._state={length:1,grow:0,retreat:0,fade:1,seed:0},this._seed=0,this._knotTime=0,this._puffDistance=0}createParticles(){let e=this.ctx.particles;this.spores=e.get(`mycelium.spores`,{capacity:1400,shape:y.SOFT,additive:!0,curl:!0,softFade:.35}),this.spores.uniforms.uEndSize.value=.4,this.spores.uniforms.uSizeIn.value=.18,this.spores.uniforms.uFadeIn.value=.22,this.spores.uniforms.uFadeOut.value=.5,this.vapour=e.get(`mycelium.vapour`,{capacity:900,shape:y.SMOKE,additive:!1,curl:!0,softFade:1.2}),this.vapour.uniforms.uDrag.value=2.6,this.vapour.uniforms.uEndSize.value=2.8,this.vapour.uniforms.uSizeIn.value=.2,this.vapour.uniforms.uFadeIn.value=.25,this.vapour.uniforms.uFadeOut.value=.35,this.sporeEmitter=new b,this.vapourEmitter=new b}get instanceCount(){return 2}get impactDuration(){let e=u.mycelium;return Math.max(.2,(e.creepTime+e.holdTime)*u.global.lifetime)}get fadeDuration(){return Math.max(.2,u.mycelium.rotTime)}lightShimmer(){let e=u.mycelium;return 1-p(e.lightBreathe)*.5*(1-Math.cos(this.age*e.lightBreatheRate*Math.PI*2))}_handPoint(e){let t=u.mycelium;return e.copy(this.origin).addScaledVector(this.direction,t.handForward).addScaledVector(this.side,t.handSide),e.y=t.handHeight,e}_creep(){let e=u.mycelium;return this.phase===x.TRAVEL?0:m.outCubic(p(this._knotTime/Math.max(.05,e.creepTime)))}_reach(){let e=u.mycelium;return this.length*(1+Math.max(0,e.creepReach)*this._creep())}_laneHalf(e){let t=u.mycelium;return Math.max(.02,t.laneHalfWidth*(1-p(t.laneTaper)*p(e)))}onSpawn(){this.sporeEmitter.reset(),this.vapourEmitter.reset(),this._knotTime=0,this._puffDistance=0,this._seed=Math.random()*100,this.damp.clearMarks(),this.damp.setVisible(!1),this.seep.visible=!0,this._sync(0,1),this._muzzleFx()}_sync(e,t){let n=u.mycelium,r=u.global,i=this._creep(),o=this._reach(),s=this._state;s.length=o,s.grow=this.phase===x.TRAVEL?p(this.u*this.length/Math.max(o,.01)):1,s.retreat=e,s.fade=t,s.seed=this._seed;let c=this.seepMaterial.userData.sync(s);this.pointAt(.5*(o/Math.max(this.length,.01)),P),this.seep.position.set(P.x,n.seepHeight,P.z),this.seep.rotation.set(0,Math.atan2(this.direction.x,this.direction.z),0),this.seep.scale.set(c.x,1,c.y),this.seep.visible=t>.004,this.pointAt(1,F);let l=this.dampParams;l.centre.copy(F),l.yaw=0,l.height=n.dampHeight,l.radius=Math.max(.1,n.dampRadius),l.grow=i,l.recede=e,l.fade=t,l.seed=this._seed,l.edge=n.dampEdge,l.ragged=n.dampRagged,l.raggedScale=n.dampRaggedScale,l.warp=n.dampWarp,l.relief=n.dampRelief,l.ambient=n.dampAmbient,l.specular=n.dampSpecular,l.gloss=n.dampGloss,l.cell=n.dampCell,l.lift=n.dampLift,l.depth=n.dampDepth,l.flow=n.dampFlow,l.detail=n.dampDetail,l.speed=n.dampSpeed,l.windAngle=n.dampWindAngle,l.emissive=n.dampEmissive*r.glow,l.opacity=n.dampOpacity,l.depthFade=n.dampDepthFade,l.colorBase=n.colorDampBase,l.colorEdge=n.colorDampEdge,l.colorGlow=n.colorDampGlow,l.colorDeep=n.colorDampDeep,l.noiseStrength=r.noiseStrength,l.noiseFrequency=r.noiseFrequency,l.noiseSpeed=r.noiseSpeed,l.opacityScale=r.opacity,this.damp.setVisible(i>.001&&t>.004),this.damp.update(l),this.spores.setGradient(a(n.colorSporeA),a(n.colorSporeB),a(n.colorSporeC),a(n.colorSporeD)),this.spores.uniforms.uGravity.value.set(0,n.sporeSag,0),this.spores.uniforms.uDrag.value=Math.max(.05,n.sporeDrag),this.spores.uniforms.uSizeScale.value=n.sporeSize*r.particleSize*7,this.spores.uniforms.uLifeScale.value=n.sporeLifetime*.5*r.particleLifetime,this.spores.uniforms.uSpeedScale.value=n.sporeRise*r.particleSpeed,this.spores.uniforms.uOpacity.value=r.opacity,this.spores.uniforms.uGlow.value=n.sporeGlow*r.glow,this.spores.uniforms.uTurbulence.value=n.sporeTurbulence*r.turbulence,this.vapour.setGradient(a(n.colorVapourA),a(n.colorVapourB),a(n.colorVapourC),a(n.colorVapourD)),this.vapour.uniforms.uGravity.value.set(0,n.vapourRise,0),this.vapour.uniforms.uSizeScale.value=n.vapourSize*r.particleSize,this.vapour.uniforms.uLifeScale.value=n.vapourLifetime*.5*r.particleLifetime,this.vapour.uniforms.uSpeedScale.value=n.vapourSpeed*r.particleSpeed,this.vapour.uniforms.uOpacity.value=n.vapourOpacity*r.opacity,this.vapour.uniforms.uTurbulence.value=.25*r.turbulence}_muzzleFx(){let e=u.mycelium,t=u.global;this._handPoint(I),this.ctx.bursts.spawn(_.EARTH,I,{radius:e.muzzleSize*.3,endRadius:e.muzzleSize*t.explosionIntensity,life:.55,intensity:e.muzzleIntensity,opacity:.35,fresnel:1.2,displace:.4,squash:.7,colorA:a(e.colorBurstA),colorB:a(e.colorBurstB),colorC:a(e.colorBurstC)}),this._emitSpores(Math.round(14*t.particleCount),I,.2),this.ctx.flash.trigger(a(e.colorCastFlash),e.castFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.35*t.explosionIntensity}_emitSpores(e,n,r){if(e<=0)return;let i=u.mycelium;j.position=n,j.radius=r,j.direction=N.set(0,1,0),j.speed=1,j.speedVariance=i.sporeSpeedVariance,j.spread=i.sporeSpread,j.inherit=null,j.anchor=null,j.size=.07,j.sizeVariance=.65,j.life=1,j.lifeVariance=.45,j.spin=0,j.tint=null,j.time=t.uTime.value,this.spores.emit(e,j)}_laneFx(e,n){let r=u.mycelium,i=u.global,a=this.phase===x.TRAVEL?Math.max(.02,this.u):1,o=Math.round(this.sporeEmitter.tick(e,r.sporeRate*n)*i.particleCount);if(o>0){let e=Math.random()*a;this.pointAt(e,M);let t=this._laneHalf(e);M.addScaledVector(this.side,d(-t,t)),M.y=r.sporeBirthHeight,this._emitSpores(o,M,t*.25+.05)}let s=Math.round(this.vapourEmitter.tick(e,r.vapourRate*n)*i.particleCount);if(s>0){let e=this.phase===x.TRAVEL?this.u:1;this.pointAt(e,M);let n=Math.random()*Math.PI*2,i=Math.max(.1,r.dampRadius)*.75*Math.sqrt(Math.random());M.x+=Math.cos(n)*i,M.z+=Math.sin(n)*i,M.y=r.vapourBirthHeight,j.position=M,j.radius=Math.max(.1,r.dampRadius)*.2,j.direction=N.set(Math.cos(n)*.4,1,Math.sin(n)*.4).normalize(),j.speed=1,j.speedVariance=.55,j.spread=.5,j.inherit=null,j.anchor=null,j.size=.7,j.sizeVariance=.5,j.life=1,j.lifeVariance=.4,j.spin=.2,j.tint=null,j.time=t.uTime.value,this.vapour.emit(s,j)}}_frontFx(){let e=u.mycelium,t=u.global,n=1/Math.max(.05,e.puffRate);for(;this.front-this._puffDistance>=n;){this._puffDistance+=n;let r=p(this._puffDistance/this.length);this.pointAt(r,M);let i=this._laneHalf(r);M.addScaledVector(this.side,d(-i,i)),M.y=e.sporeBirthHeight,this._emitSpores(Math.round(e.puffSpores*t.particleCount),M,i*.3+.06)}}onTravel(e){let t=u.mycelium;this._sync(0,1),this.position.y=t.lightHeight,this._frontFx(),this._laneFx(e,1),this.ctx.shake.rumble(t.rumble*u.global.cameraShake,e)}onImpact(){let e=u.mycelium,t=u.global;this._knotTime=0,this.pointAt(1,F),M.copy(F).setY(e.dampHeight+.05),this.ctx.bursts.spawn(_.EARTH,M,{radius:e.burstSize*.25,endRadius:e.burstSize*t.explosionIntensity,life:1,intensity:e.burstIntensity,opacity:.3,fresnel:1.3,displace:.45,squash:.22,colorA:a(e.colorBurstA),colorB:a(e.colorBurstB),colorC:a(e.colorBurstC)}),M.copy(F).setY(e.sporeBirthHeight),this._emitSpores(Math.round(e.burstSpores*t.particleCount),M,Math.max(.1,e.dampRadius)*.6),this.ctx.shake.add(e.impactShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),9),this.ctx.flash.trigger(a(e.colorFlash),e.impactFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.5*t.explosionIntensity}onFade(e,t){let n=u.mycelium;t<=1&&(this._knotTime+=e);let r=t<=1?0:p(t-1),i=m.outQuad(r)*p(n.dieBack),a=1-m.inQuad(r);this._sync(i,a),this.pointAt(c(1,1+Math.max(0,n.creepReach)*.5,this._creep()),this.position),this.position.y=n.lightHeight*(1-.5*r),this._laneFx(e,a*(t<=1?.7:.3))}onDestroy(){this._knotTime=0,this._puffDistance=0,this.seep.visible=!1,this.seepMaterial.uniforms.uFade.value=0,this.damp.setVisible(!1),this.damp.clearMarks()}dispose(){this.seepMaterial.dispose(),C(),this.seepGeometry=null,this.damp.dispose(),super.dispose()}};export{L as MyceliumAbility};
//# sourceMappingURL=MyceliumAbility-C3ZmKuob.js.map