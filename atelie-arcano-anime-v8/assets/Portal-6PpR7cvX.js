import{Br as e,K as t,L as n,V as r,Y as i,di as a,q as o,ui as s,xt as c,yn as l}from"./settings-DdywqLlV.js";import{r as u}from"./quads-DpYMEt67.js";var d=`
  uniform vec3 uAnchor;  // world centre of the aperture
  uniform vec2 uSize;    // quad extent, metres — aperture plus the crack margin
  uniform vec3 uAxisX;   // the plane's local +X, unit
  uniform vec3 uAxisY;   // the plane's local +Y, unit

  varying vec2 vUv;
  varying vec2 vLocal;   // metres from the centre, in the portal plane
  varying vec3 vWorld;
  varying vec3 vT;
  varying vec3 vB;
  varying vec3 vN;

  void main() {
    vUv = uv;

    vec3 ax;
    vec3 ay;
    #ifdef PORTAL_BILLBOARD
      ax = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
      ay = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    #else
      ax = uAxisX;
      ay = uAxisY;
    #endif

    vec2 ext = (uv - 0.5) * uSize;
    vec3 world = uAnchor + ax * ext.x + ay * ext.y;

    vLocal = ext;
    vWorld = world;
    vT = ax;
    vB = ay;
    vN = normalize(cross(ax, ay));

    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`,f=`
  uniform float uTime;
  uniform float uGlobalGlow;
  uniform float uShaderIntensity;

  uniform vec3  uAnchor;
  uniform vec2  uRadii;        // aperture half-extents, metres. Equal = a disc.
  uniform float uOpen;         // 0..1 tear progress
  uniform float uSeam;         // 0 opens from the centre, 1 from the long centreline
  uniform float uTearJag;      // 0..1 how uneven the front is
  uniform float uTearScale;    // cycles per metre of the crack grain
  uniform float uTearCrawl;    // Hz — the grain creeping while the tear is held
  uniform float uEdgeSoft;     // 0..1 of the field — how hard the aperture cuts
  uniform float uSeed;

  uniform float uRim;          // 0..1 of the field — the fracture band's width
  uniform float uRimGlow;
  uniform float uCore;         // 0..1 — the white-hot line inside the band
  uniform float uCoreGlow;
  uniform float uThroat;       // 0..1 — the soft inner glow past the rim
  uniform float uThroatGlow;

  uniform float uCrackCount;   // radial fractures around the rim
  uniform float uCrackWidth;   // 0..1 of one angular cell
  uniform float uCrackLength;  // 0..1 of the field they reach out to
  uniform float uCrackGlow;

  uniform float uParallax;     // 1 = geometrically honest. Do not ship 1.
  uniform float uSwirl;        // rad/s — the whole interior turning
  uniform float uInteriorFade; // 0..1 — how much the void darkens toward the rim

  uniform float uStarSize;
  uniform float uStarTwinkle;
  uniform float uStarGain;
  uniform vec3  uStarScale;    // stars per metre, per shell
  uniform vec3  uStarDepth;    // metres behind the plane, per shell
  uniform vec3  uStarDrift;    // rad/s, per shell

  uniform float uNebulaScale;  // cycles per metre
  uniform float uNebulaSpeed;
  uniform float uNebulaGain;
  uniform float uNebulaDepth;  // metres behind the plane

  uniform vec3  uColorVoid;
  uniform vec3  uColorRim;
  uniform vec3  uColorCore;
  uniform vec3  uColorCrack;
  uniform vec3  uColorThroat;
  uniform vec3  uColorStarA;
  uniform vec3  uColorStarB;
  uniform vec3  uColorStarC;
  uniform vec3  uColorNebulaA;
  uniform vec3  uColorNebulaB;

  uniform float uOpacity;

  varying vec2 vUv;
  varying vec2 vLocal;
  varying vec3 vWorld;
  varying vec3 vT;
  varying vec3 vB;
  varying vec3 vN;

  ${i}
  ${o}

  #define TAU 6.28318530718

  vec2 rot2(vec2 p, float a) {
    float c = cos(a);
    float s = sin(a);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
  }

  /**
   * Where the view ray lands on a plane depth metres behind the portal.
   *
   * base is where we already are on the portal plane; the difference between
   * the two is the honest parallax shift, and uParallax scales *that* rather
   * than the depth — scaling the depth would also change how big the stars are,
   * which is a different lie and a worse one.
   */
  vec2 shellCoord(vec3 V, vec3 N, vec2 base, float depth) {
    float vn = max(abs(dot(V, N)), 0.18);   // clamp: a grazing view shoots to infinity
    vec3 hit = vWorld + V * (depth / vn);
    vec3 rel = hit - uAnchor;
    vec2 there = vec2(dot(rel, vT), dot(rel, vB));
    return base + (there - base) * uParallax;
  }

  /**
   * A hashed lattice of points. Not a texture, not a sprite — one cell per star,
   * jittered inside its cell, with exp(-d/size) for the falloff because a
   * gaussian core with an exponential skirt is what a small bright thing does to
   * a lens and a smoothstep disc is what a UI element does.
   */
  float starLayer(vec2 s, float scale, float seed) {
    vec2 g = s * scale;
    vec2 id = floor(g);
    vec2 fr = fract(g) - 0.5;
    float h = hash13(vec3(id, seed));
    vec2 off = (hash21(h * 91.7 + seed) - 0.5) * 0.72;
    float d = length(fr - off);
    float lit = smoothstep(0.52, 0.98, h);
    float tw = 1.0 + uStarTwinkle * sin(uTime * (1.7 + h * 6.1) + h * 37.0);
    return lit * max(tw, 0.0) * exp(-d / max(uStarSize, 1e-3));
  }

  void main() {
    /* ---------------- the aperture ---------------- */
    vec2 p = vLocal;
    vec2 q = p / max(uRadii, vec2(1e-3));
    float rn = length(q);

    // Which bearings open first. A disc unzips from the middle; a slit unzips
    // from its long centreline, which is what makes it read as a wound rather
    // than as an iris.
    float seamField = mix(rn, abs(q.y), clamp(uSeam, 0.0, 1.0));

    // Sampled in **metres**, so the crack grain is a fixed physical size — a
    // two-metre rift and a six-metre rift tear with the same size of shard.
    float jag = fbm3(vec3(p * uTearScale, uSeed + uTime * uTearCrawl)) * 0.5 + 0.5;
    float factor = mix(1.0, 0.72 + 0.56 * jag, clamp(uTearJag, 0.0, 1.0));
    float f = seamField * factor;

    // Signed distance to whichever boundary is nearer: the travelling tear front
    // or the aperture's own ellipse. Positive inside the hole.
    float edge = min(uOpen - f, 1.0 - rn);
    float born = smoothstep(0.0, 0.02, uOpen);

    float aperture = smoothstep(0.0, max(uEdgeSoft, 1e-3), edge) * born;

    /* ---------------- the interior ---------------- */
    vec3 V = normalize(vWorld - cameraPosition);
    vec3 N = gl_FrontFacing ? vN : -vN;
    vec3 rel0 = vWorld - uAnchor;
    vec2 base = vec2(dot(rel0, vT), dot(rel0, vB));

    float spin = uTime * uSwirl;

    vec2 sA = rot2(shellCoord(V, N, base, uStarDepth.x), spin + uTime * uStarDrift.x);
    vec2 sB = rot2(shellCoord(V, N, base, uStarDepth.y), spin + uTime * uStarDrift.y);
    vec2 sC = rot2(shellCoord(V, N, base, uStarDepth.z), spin + uTime * uStarDrift.z);

    vec3 stars =
        uColorStarA * starLayer(sA, uStarScale.x, uSeed + 1.0)
      + uColorStarB * starLayer(sB, uStarScale.y, uSeed + 2.0)
      + uColorStarC * starLayer(sC, uStarScale.z, uSeed + 3.0);
    stars *= uStarGain;

    vec2 sN = rot2(shellCoord(V, N, base, uNebulaDepth), spin * 0.4);
    float neb = fbm4(vec3(sN * uNebulaScale, uTime * uNebulaSpeed + uSeed)) * 0.5 + 0.5;
    neb = pow(clamp(neb, 0.0, 1.0), 2.0) * uNebulaGain;
    vec3 nebula = mix(uColorNebulaA, uColorNebulaB, clamp(neb, 0.0, 1.0)) * neb;

    vec3 interior = uColorVoid + stars + nebula;
    // Fall off toward the rim: the hole is deepest in the middle, and without
    // this the starfield runs flat into the fracture and the whole thing reads
    // as a painted disc again.
    interior *= mix(1.0, smoothstep(0.0, 0.5, edge), clamp(uInteriorFade, 0.0, 1.0));

    /* ---------------- the fracture ---------------- */
    float rim = exp(-abs(edge) / max(uRim, 1e-4));
    float core = exp(-abs(edge) / max(uCore, 1e-4));
    float throat = exp(-max(edge, 0.0) / max(uThroat, 1e-4)) * aperture;

    // Radial fractures licking out past the boundary. One per angular cell, at a
    // hashed bearing inside it, with a hashed reach — so the crown of cracks is
    // irregular without a single loop.
    //
    // Two details that are not optional. The angular distance wraps, because a
    // crack whose bearing lands near a cell boundary is otherwise sliced in half
    // and the crown develops a seam you cannot unsee. And the whole term is
    // gated to *strictly outside* the boundary: the first build multiplied by
    // step(0.0, outside), which is 1 at outside == 0 and therefore 1 across the
    // entire interior, so every crack ran unbroken to the centre of the hole.
    // Dead-straight spokes out of a middle — a firework, not a fracture.
    float cells = max(uCrackCount, 1.0);
    float ang = atan(q.y, q.x) / TAU + 0.5;
    float cell = floor(ang * cells);
    float within = fract(ang * cells);
    float bearing = hash11(cell + uSeed * 13.0);
    float reach = uCrackLength * (0.35 + 0.9 * hash11(cell + uSeed * 13.0 + 7.7));
    float sweep = abs(within - bearing);
    sweep = min(sweep, 1.0 - sweep);
    float spike = 1.0 - smoothstep(0.0, max(uCrackWidth, 1e-3), sweep);
    float outside = max(-edge, 0.0);
    float crack =
      spike * exp(-outside / max(reach, 1e-3)) * smoothstep(0.0, max(uRim, 1e-4), outside) * born;

    vec3 emissive =
        uColorRim * rim * uRimGlow
      + uColorCore * core * uCoreGlow
      + uColorThroat * throat * uThroatGlow
      + uColorCrack * crack * uCrackGlow;
    emissive *= born * uGlobalGlow * uShaderIntensity;

    /* ---------------- premultiplied output ---------------- */
    float a = clamp(aperture * uOpacity, 0.0, 1.0);
    vec3 rgb = interior * a + emissive;

    if (a < 0.001 && max(rgb.r, max(rgb.g, rgb.b)) < 0.002) discard;

    #ifdef PORTAL_WRITE_DEPTH
      // Only the solid part of the hole is allowed to own depth; the additive
      // crown must not, or every crack punches a rectangle out of the queue.
      if (a < 0.5) discard;
    #endif

    gl_FragColor = vec4(rgb, a);
  }
`,p={radiusX:1.6,radiusY:1.6,margin:.45,open:1,seam:0,tearJag:.65,tearScale:1.8,tearCrawl:.12,edgeSoft:.045,seed:0,opacity:1,rim:.035,rimGlow:2.4,core:.01,coreGlow:5,throat:.16,throatGlow:.6,crackCount:14,crackWidth:.09,crackLength:.22,crackGlow:1.8,parallax:1.6,swirl:.05,interiorFade:.35,starSize:.045,starTwinkle:.35,starGain:1,starScaleA:2.6,starScaleB:5.2,starScaleC:9.5,starDepthA:2.5,starDepthB:7,starDepthC:18,starDriftA:.03,starDriftB:.017,starDriftC:.008,nebulaScale:.22,nebulaSpeed:.05,nebulaGain:.55,nebulaDepth:11,colorVoid:`#000000`,colorRim:`#b07aff`,colorCore:`#ffffff`,colorCrack:`#8a5fd0`,colorThroat:`#3a1a6a`,colorStarA:`#ffffff`,colorStarB:`#c0d0ff`,colorStarC:`#8a7aff`,colorNebulaA:`#12061f`,colorNebulaB:`#5a2ea0`},m=(e,t)=>e??t,h=new a,g=new a,_=new a,v=class{constructor({billboard:n=!1,writeDepth:i=!1,renderOrder:o=6,name:m=`Portal`}={}){this.material=new e({name:`${m}:surface`,transparent:!0,depthWrite:i,depthTest:!0,side:2,toneMapped:!1,blending:5,blendEquation:100,blendSrc:201,blendDst:205,blendEquationAlpha:100,blendSrcAlpha:201,blendDstAlpha:205,defines:{...n?{PORTAL_BILLBOARD:``}:{},...i?{PORTAL_WRITE_DEPTH:``}:{}},uniforms:t({uAnchor:{value:new a},uSize:{value:new s(1,1)},uAxisX:{value:new a(1,0,0)},uAxisY:{value:new a(0,1,0)},uRadii:{value:new s(p.radiusX,p.radiusY)},uOpen:{value:p.open},uSeam:{value:p.seam},uTearJag:{value:p.tearJag},uTearScale:{value:p.tearScale},uTearCrawl:{value:p.tearCrawl},uEdgeSoft:{value:p.edgeSoft},uSeed:{value:p.seed},uOpacity:{value:p.opacity},uRim:{value:p.rim},uRimGlow:{value:p.rimGlow},uCore:{value:p.core},uCoreGlow:{value:p.coreGlow},uThroat:{value:p.throat},uThroatGlow:{value:p.throatGlow},uCrackCount:{value:p.crackCount},uCrackWidth:{value:p.crackWidth},uCrackLength:{value:p.crackLength},uCrackGlow:{value:p.crackGlow},uParallax:{value:p.parallax},uSwirl:{value:p.swirl},uInteriorFade:{value:p.interiorFade},uStarSize:{value:p.starSize},uStarTwinkle:{value:p.starTwinkle},uStarGain:{value:p.starGain},uStarScale:{value:new a(p.starScaleA,p.starScaleB,p.starScaleC)},uStarDepth:{value:new a(p.starDepthA,p.starDepthB,p.starDepthC)},uStarDrift:{value:new a(p.starDriftA,p.starDriftB,p.starDriftC)},uNebulaScale:{value:p.nebulaScale},uNebulaSpeed:{value:p.nebulaSpeed},uNebulaGain:{value:p.nebulaGain},uNebulaDepth:{value:p.nebulaDepth},uColorVoid:{value:new c(p.colorVoid)},uColorRim:{value:new c(p.colorRim)},uColorCore:{value:new c(p.colorCore)},uColorCrack:{value:new c(p.colorCrack)},uColorThroat:{value:new c(p.colorThroat)},uColorStarA:{value:new c(p.colorStarA)},uColorStarB:{value:new c(p.colorStarB)},uColorStarC:{value:new c(p.colorStarC)},uColorNebulaA:{value:new c(p.colorNebulaA)},uColorNebulaB:{value:new c(p.colorNebulaB)}}),vertexShader:d,fragmentShader:f}),this.mesh=new l(u(),this.material),this.mesh.name=m,this.mesh.layers.set(r.VFX),this.mesh.renderOrder=o,this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=!1,this.mesh.visible=!1}get object3D(){return this.mesh}get visible(){return this.mesh.visible}set visible(e){this.mesh.visible=!!e}setPlacement(e,t,n){let r=this.material.uniforms;return r.uAnchor.value.copy(e),h.copy(t).normalize(),_.crossVectors(h,n).normalize(),g.crossVectors(_,h).normalize(),r.uAxisX.value.copy(h),r.uAxisY.value.copy(g),this}update(e){let t=this.material.uniforms,r=m(e.radiusX,p.radiusX),i=m(e.radiusY,p.radiusY),a=m(e.margin,p.margin);return t.uRadii.value.set(r,i),t.uSize.value.set(r*2*(1+a),i*2*(1+a)),t.uOpen.value=m(e.open,p.open),t.uSeam.value=m(e.seam,p.seam),t.uTearJag.value=m(e.tearJag,p.tearJag),t.uTearScale.value=m(e.tearScale,p.tearScale),t.uTearCrawl.value=m(e.tearCrawl,p.tearCrawl),t.uEdgeSoft.value=m(e.edgeSoft,p.edgeSoft),t.uSeed.value=m(e.seed,p.seed),t.uOpacity.value=m(e.opacity,p.opacity),t.uRim.value=m(e.rim,p.rim),t.uRimGlow.value=m(e.rimGlow,p.rimGlow),t.uCore.value=m(e.core,p.core),t.uCoreGlow.value=m(e.coreGlow,p.coreGlow),t.uThroat.value=m(e.throat,p.throat),t.uThroatGlow.value=m(e.throatGlow,p.throatGlow),t.uCrackCount.value=m(e.crackCount,p.crackCount),t.uCrackWidth.value=m(e.crackWidth,p.crackWidth),t.uCrackLength.value=m(e.crackLength,p.crackLength),t.uCrackGlow.value=m(e.crackGlow,p.crackGlow),t.uParallax.value=m(e.parallax,p.parallax),t.uSwirl.value=m(e.swirl,p.swirl),t.uInteriorFade.value=m(e.interiorFade,p.interiorFade),t.uStarSize.value=m(e.starSize,p.starSize),t.uStarTwinkle.value=m(e.starTwinkle,p.starTwinkle),t.uStarGain.value=m(e.starGain,p.starGain),t.uStarScale.value.set(m(e.starScaleA,p.starScaleA),m(e.starScaleB,p.starScaleB),m(e.starScaleC,p.starScaleC)),t.uStarDepth.value.set(m(e.starDepthA,p.starDepthA),m(e.starDepthB,p.starDepthB),m(e.starDepthC,p.starDepthC)),t.uStarDrift.value.set(m(e.starDriftA,p.starDriftA),m(e.starDriftB,p.starDriftB),m(e.starDriftC,p.starDriftC)),t.uNebulaScale.value=m(e.nebulaScale,p.nebulaScale),t.uNebulaSpeed.value=m(e.nebulaSpeed,p.nebulaSpeed),t.uNebulaGain.value=m(e.nebulaGain,p.nebulaGain),t.uNebulaDepth.value=m(e.nebulaDepth,p.nebulaDepth),n(t.uColorVoid.value,e.colorVoid||p.colorVoid),n(t.uColorRim.value,e.colorRim||p.colorRim),n(t.uColorCore.value,e.colorCore||p.colorCore),n(t.uColorCrack.value,e.colorCrack||p.colorCrack),n(t.uColorThroat.value,e.colorThroat||p.colorThroat),n(t.uColorStarA.value,e.colorStarA||p.colorStarA),n(t.uColorStarB.value,e.colorStarB||p.colorStarB),n(t.uColorStarC.value,e.colorStarC||p.colorStarC),n(t.uColorNebulaA.value,e.colorNebulaA||p.colorNebulaA),n(t.uColorNebulaB.value,e.colorNebulaB||p.colorNebulaB),this}dispose(){this.mesh.visible=!1,this.material.dispose(),this.mesh.parent?.remove(this.mesh)}};export{v as t};
//# sourceMappingURL=Portal-6PpR7cvX.js.map