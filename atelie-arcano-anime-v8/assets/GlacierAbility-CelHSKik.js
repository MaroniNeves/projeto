import{Br as e,Fn as t,G as n,K as r,Ot as i,Qt as a,R as o,V as s,Y as c,at as l,di as u,en as d,et as f,jn as p,o as m,ot as h,q as g,st as _,tt as v,xt as y,y as b,yn as x,zn as S}from"./settings-DdywqLlV.js";import{t as C}from"./ParticleSystem-BZTczMT8.js";import{n as w}from"./ParticleEngine-DLxipNH0.js";import{n as T}from"./GroundDecals-kYmr8HKl.js";import{n as E,t as D}from"./Ability-CYesB5Ur.js";var O=`
  attribute float aSeed;
  attribute float aBirth;
  attribute float aGrow;
  attribute float aShatter;

  varying vec3  vLocal;
  varying vec3  vWorld;
  varying vec3  vNormalW;
  varying vec3  vView;
  varying vec3  vAxis;
  varying float vSeed;
  varying float vBirth;
  varying float vGrow;
  varying float vShatter;

  void main() {
    vLocal = position;
    vSeed = aSeed;
    vBirth = aBirth;
    vGrow = aGrow;
    vShatter = aShatter;

    vec3 objectNormal = normal;
    vec3 objectAxis = vec3(0.0, 1.0, 0.0);
    vec4 world;

    #ifdef USE_INSTANCING
      // A blade is scaled (radius, height, radius), which is anisotropic — the
      // instance matrix would tip every normal toward the long axis. Dividing by
      // the squared column lengths is the inverse-transpose three itself uses.
      mat3 im = mat3(instanceMatrix);
      vec3 invScale = vec3(dot(im[0], im[0]), dot(im[1], im[1]), dot(im[2], im[2]));
      objectNormal = im * (objectNormal / invScale);
      objectAxis = im * (objectAxis / invScale);
      world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    #else
      world = modelMatrix * vec4(position, 1.0);
    #endif

    vWorld = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * objectNormal);
    vAxis = normalize(mat3(modelMatrix) * objectAxis);
    vView = cameraPosition - world.xyz;

    gl_Position = projectionMatrix * viewMatrix * world;
  }
`,k=`
  uniform float uTime;
  uniform sampler2D uEnvMap;
  uniform vec3  uSunDir;

  uniform vec3  uColorGlass;
  uniform vec3  uColorEdge;
  uniform vec3  uColorPrismA;
  uniform vec3  uColorPrismB;
  uniform vec3  uColorCore;
  uniform vec3  uColorTip;

  uniform float uBody;
  uniform float uEdgePower;
  uniform float uEdgeGain;
  uniform float uDispersion;
  uniform float uPipe;
  uniform float uTipBias;
  uniform float uBands;
  uniform float uPulseSpeed;
  uniform float uTipStart;
  uniform float uTipGlow;
  uniform float uStria;
  uniform float uStriaScale;
  uniform float uEnvIntensity;
  uniform float uSpecular;
  uniform float uBirthGlow;

  uniform float uFrontRough;
  uniform float uFrontWidth;
  uniform float uFrontGlow;
  uniform float uShatterScale;
  uniform float uShatterEdge;
  uniform float uShatterGlow;

  uniform float uGlow;
  uniform float uOpacity;
  uniform float uGlobalGlow;

  varying vec3  vLocal;
  varying vec3  vWorld;
  varying vec3  vNormalW;
  varying vec3  vView;
  varying vec3  vAxis;
  varying float vSeed;
  varying float vBirth;
  varying float vGrow;
  varying float vShatter;

  ${c}

  #define TAU 6.28318530718

  vec2 equirectUv(vec3 dir) {
    return vec2(atan(dir.z, dir.x) * 0.15915494 + 0.5,
                asin(clamp(dir.y, -1.0, 1.0)) * 0.31830989 + 0.5);
  }

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vView);
    // Double-sided: the far wall of a blade is half of what you see through the
    // near one, and its normal has to be flipped or it shades inside out.
    if (dot(N, V) < 0.0) N = -N;

    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float h = clamp(vLocal.y, 0.0, 1.0);

    /* ---- the freeze front: everything above it does not exist yet ---- */
    // The roughness is added back on before the noise is taken off again, so a
    // fully grown blade (aGrow = 1) can never cut into itself.
    float ragged = snoise01(vLocal * 5.0 + vSeed * 7.0) * uFrontRough;
    float front  = vGrow * (1.0 + uFrontRough) - ragged;
    if (h > front) discard;
    float freezing = smoothstep(front - uFrontWidth, front, h) *
                     (1.0 - smoothstep(0.985, 1.0, vGrow));

    /* ---- the shatter: plates and wedges leaving one at a time ---- */
    // Two structures averaged. The voronoi half breaks the body into chunks that
    // ignore the geometry; the facet half takes whole flat faces away, which is
    // what actually happens to a crystal.
    float breaking = 0.0;
    if (vShatter > 0.001) {
      vec2 cell = voronoi2(vLocal.xz * uShatterScale + vLocal.y * 4.0 + vSeed * 13.0);
      float facet = hash13(floor(N * 6.0) + vSeed * 3.0);
      float chunk = 0.55 * cell.y + 0.45 * facet;
      if (chunk < vShatter) discard;
      breaking = smoothstep(vShatter + uShatterEdge, vShatter, chunk);
    }

    /* ---- the dispersive edge ---- */
    vec3 fres = pow(
      vec3(1.0 - ndv),
      vec3(uEdgePower * (1.0 - uDispersion * 0.4), uEdgePower, uEdgePower * (1.0 + uDispersion * 0.55))
    );
    // Each facet takes its own place in the split, so neighbouring faces on one
    // blade do not all fringe the same colour.
    vec3 prism = mix(uColorPrismA, uColorPrismB, hash13(floor(N * 7.0) + vSeed * 5.0));

    /* ---- light piped up the blade to the point ---- */
    float along = 1.0 - abs(dot(N, vAxis)); // the long faces, not the caps
    float pipe = along * pow(h, uTipBias);
    float band = 0.5 + 0.5 * sin((h * uBands - uTime * uPulseSpeed) * TAU + vSeed * 5.0);
    pipe *= mix(0.6, 1.0, band * band);
    float tip = smoothstep(uTipStart, 1.0, h);

    /* ---- flow lines running its length ---- */
    float stria = ridged(vec3(vLocal.xz * uStriaScale, vLocal.y * uStriaScale * 0.3 + vSeed * 9.0), 4);
    stria = smoothstep(0.7, 0.97, stria) * along;

    /* ---- the room it is standing in ---- */
    vec3 refl = reflect(-V, N);
    vec3 env = texture2D(uEnvMap, equirectUv(refl)).rgb * uEnvIntensity;
    float sun = pow(max(dot(refl, -uSunDir), 0.0), 90.0) * uSpecular;

    vec3 color = uColorGlass * uBody * (0.25 + 0.75 * ndv);
    color += prism * fres * uEdgeGain;
    color += uColorEdge * fres.g * fres.g * uEdgeGain * 0.5;
    color += uColorCore * pipe * uPipe;
    color += uColorEdge * stria * uStria;
    color += uColorTip * tip * uTipGlow;
    color += env * (0.35 + 0.65 * fres.g) + uColorEdge * sun;
    color += uColorEdge * freezing * uFrontGlow;
    color += uColorCore * breaking * uShatterGlow;
    color += uColorCore * vBirth * uBirthGlow;
    color *= uGlow;

    // Soft ceiling. Every term peaks at a grazing angle and they stack; a
    // Reinhard rolloff leaves anything under ~1 alone and asymptotes at 1/0.16 ≈
    // 6, so the sliders keep biting at the top of their range without flattening
    // the blade into a white cutout.
    color /= 1.0 + color * 0.16;

    // Glass: thin and clear through the body, solid at the silhouette, the tip
    // and any edge that is currently freezing or breaking.
    float alpha = uBody * 0.4 + fres.g * 1.25 + pipe * 0.45 + stria * 0.3 +
                  tip * 0.55 + freezing + breaking;
    alpha = clamp(alpha, 0.0, 1.0) * uOpacity;
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(color * uGlobalGlow, alpha);
  }
`;function A(){let t=new e({transparent:!0,depthWrite:!0,depthTest:!0,blending:1,side:2,toneMapped:!1,uniforms:{uTime:n.uTime,uEnvMap:n.uEnvMap,uGlobalGlow:n.uGlobalGlow,uSunDir:{value:new u(0,-1,0)},uColorGlass:{value:new y},uColorEdge:{value:new y},uColorPrismA:{value:new y},uColorPrismB:{value:new y},uColorCore:{value:new y},uColorTip:{value:new y},uBody:{value:.55},uEdgePower:{value:2.2},uEdgeGain:{value:1.6},uDispersion:{value:.6},uPipe:{value:1.5},uTipBias:{value:1.6},uBands:{value:1.4},uPulseSpeed:{value:.6},uTipStart:{value:.62},uTipGlow:{value:1.4},uStria:{value:.7},uStriaScale:{value:6},uEnvIntensity:{value:.6},uSpecular:{value:2},uBirthGlow:{value:2.2},uFrontRough:{value:.35},uFrontWidth:{value:.12},uFrontGlow:{value:2.6},uShatterScale:{value:7},uShatterEdge:{value:.08},uShatterGlow:{value:3},uGlow:{value:1},uOpacity:{value:1}},vertexShader:O,fragmentShader:k}),r=t.uniforms;return t.userData.sync=()=>{let e=m.glacier,t=m.global,n=m.environment;r.uColorGlass.value.copy(o(e.colorGlass)),r.uColorEdge.value.copy(o(e.colorEdge)),r.uColorPrismA.value.copy(o(e.colorPrismA)),r.uColorPrismB.value.copy(o(e.colorPrismB)),r.uColorCore.value.copy(o(e.colorCore)),r.uColorTip.value.copy(o(e.colorTip)),r.uBody.value=e.body,r.uEdgePower.value=e.edgePower,r.uEdgeGain.value=e.edgeGain*t.fresnel,r.uDispersion.value=e.dispersion,r.uPipe.value=e.pipe*t.shaderIntensity,r.uTipBias.value=e.tipBias,r.uBands.value=e.bands,r.uPulseSpeed.value=e.pulseSpeed*t.noiseSpeed,r.uTipStart.value=e.tipStart,r.uTipGlow.value=e.tipGlow,r.uStria.value=e.stria*t.shaderIntensity,r.uStriaScale.value=e.striaScale*t.noiseFrequency,r.uEnvIntensity.value=e.envIntensity,r.uSpecular.value=e.specular,r.uBirthGlow.value=e.birthGlow,r.uFrontRough.value=e.frontRough*t.noiseStrength,r.uFrontWidth.value=e.frontWidth,r.uFrontGlow.value=e.frontGlow,r.uShatterScale.value=e.shatterScale*t.noiseFrequency,r.uShatterEdge.value=e.shatterEdge,r.uShatterGlow.value=e.shatterGlow,r.uGlow.value=e.glow*t.glow,r.uOpacity.value=e.opacity*t.opacity;let i=Math.cos(n.sunElevation);r.uSunDir.value.set(-Math.cos(n.sunAzimuth)*i,-Math.sin(n.sunElevation),-Math.sin(n.sunAzimuth)*i).normalize()},t.userData.sync(),t}var j=`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,M=`
  uniform float uTime;
  uniform float uQuadSize;    // metres the quad covers, edge to edge
  uniform float uRadius;      // footprint radius, metres
  uniform float uBoundary;    // thickness of the band that is the edge
  uniform float uBoundaryGlow;
  uniform float uFill;
  uniform float uFalloff;
  uniform float uPlates;
  uniform float uPlateScale;
  uniform float uSeam;
  uniform float uFingers;
  uniform float uFingerScale;
  uniform float uWarp;
  uniform float uCrawl;
  uniform float uRings;
  uniform float uRingSpeed;
  uniform float uSweep;
  uniform float uSweepSpeed;
  uniform float uCore;
  uniform float uCoreSize;
  uniform float uPulse;
  uniform float uPulseSpeed;
  uniform float uFreeze;      // 0..1 — how far the sheet has spread
  uniform float uSeed;
  uniform float uFade;
  uniform float uOpacity;
  uniform vec3  uColorField;
  uniform vec3  uColorEdge;
  uniform float uGlobalGlow;

  varying vec2 vUv;

  ${c}
  ${g}

  #define TAU 6.28318530718

  void main() {
    /* ---- uv → metres, measured from the centre of the footprint ---- */
    vec2 p = vec2(vUv.x - 0.5, 0.5 - vUv.y) * uQuadSize;
    float d = length(p);

    float outer = uRadius + uBoundary * 0.4;
    float inner = max(0.01, uRadius - uBoundary * 0.6);

    float aa = fwidth(d) + 0.02;
    if (d > outer + aa * 4.0) discard;

    /* ---- how far the ice has actually got ---- */
    // The front is dragged out of round by an angular lookup — the one place an
    // angular function is the right tool, because this *is* a boundary.
    vec2  bearing = d > 1e-4 ? p / d : vec2(1.0, 0.0);
    float fingers = 0.78 + 0.3 * snoise(vec3(bearing * 3.1, uSeed * 6.0));
    float reach   = uFreeze * outer * fingers;
    float frozen  = smoothstep(reach, reach - uBoundary * 1.6, d);
    if (frozen < 0.004) discard;

    float band = smoothstep(outer + aa, outer - aa, d) * smoothstep(inner - aa, inner + aa, d);
    float interior = smoothstep(inner + aa, inner - aa, d);
    float radial = clamp(d / inner, 0.0, 1.0);

    /* ---- the sheet: plates, and the rime piled in their seams ---- */
    vec2  cell  = voronoi2(p * uPlateScale + uSeed * 20.0);
    float seams = smoothstep(0.28, 0.02, cell.x) * uSeam;
    float plate = mix(0.55, 1.0, cell.y) * uPlates;

    /* ---- frost fingers crawling over it ---- */
    float warp = fbm3(vec3(p * 0.5, uTime * 0.12 + uSeed)) * uWarp;
    float fil  = ridged(vec3(p * uFingerScale + warp, uSeed * 11.0 + uTime * uCrawl), 4);
    float frost = smoothstep(0.66, 0.95, fil) * uFingers * (0.35 + 0.65 * radial);

    /* ---- pressure rings, travelling inward toward the spire ---- */
    float ring = 0.5 + 0.5 * cos((radial * uRings + uTime * uRingSpeed) * TAU);
    ring = pow(ring, 8.0) * interior;

    /* ---- a slow cold sweep, so a standing field is never quite still ---- */
    float ang = atan(p.y, p.x) / TAU + 0.5;
    float sweepPhase = fract(ang - uTime * uSweepSpeed);
    float sweep = pow(1.0 - sweepPhase, 6.0) * smoothstep(0.0, 0.05, sweepPhase) * uSweep * interior;

    /* ---- the pool the spire stands in ---- */
    float core = smoothstep(uCoreSize * uRadius, 0.0, d) * uCore;

    float breathe = 1.0 + uPulse * sin(uTime * uPulseSpeed * TAU);
    float wash  = interior * pow(radial, uFalloff) * uFill * plate;
    float body  = (wash + frost * 0.8) * breathe;
    float lines = (band * uBoundaryGlow + seams * interior * 0.9 + ring * 0.4 + sweep + core) * breathe;

    float alpha = clamp(body + lines, 0.0, 1.0) * frozen * uFade * uOpacity;
    if (alpha < 0.004) discard;

    vec3 color = uColorField * body + uColorEdge * lines;
    // The advancing lip is still freezing, so it stays lit while it travels.
    color += uColorEdge * smoothstep(uBoundary * 1.2, 0.0, abs(d - reach)) * 0.9 *
             step(0.02, uFreeze) * step(uFreeze, 0.985);

    gl_FragColor = vec4(color * uGlobalGlow, alpha);
  }
`;function N(){let t=new e({transparent:!0,depthWrite:!1,depthTest:!0,blending:2,side:2,toneMapped:!1,uniforms:r({uQuadSize:{value:12},uRadius:{value:4.6},uBoundary:{value:.4},uBoundaryGlow:{value:2.4},uFill:{value:.26},uFalloff:{value:1.4},uPlates:{value:1},uPlateScale:{value:2.2},uSeam:{value:.8},uFingers:{value:.9},uFingerScale:{value:1.6},uWarp:{value:.5},uCrawl:{value:.12},uRings:{value:2.6},uRingSpeed:{value:-.5},uSweep:{value:.4},uSweepSpeed:{value:.12},uCore:{value:1},uCoreSize:{value:.2},uPulse:{value:.18},uPulseSpeed:{value:1.6},uFreeze:{value:0},uSeed:{value:0},uFade:{value:1},uOpacity:{value:1},uColorField:{value:new y(.66,.9,1)},uColorEdge:{value:new y(1,1,1)}}),vertexShader:j,fragmentShader:M});return t.userData.sync=e=>{let n=m.glacier,r=m.global,i=t.uniforms;i.uQuadSize.value=e.quadSize,i.uRadius.value=e.radius,i.uFreeze.value=e.freeze,i.uFade.value=e.fade,i.uSeed.value=e.seed,i.uBoundary.value=n.fieldBoundary,i.uBoundaryGlow.value=n.fieldBoundaryGlow,i.uFill.value=n.fieldFill,i.uFalloff.value=n.fieldFalloff,i.uPlates.value=n.fieldPlates,i.uPlateScale.value=n.fieldPlateScale*r.noiseFrequency,i.uSeam.value=n.fieldSeam*r.shaderIntensity,i.uFingers.value=n.fieldFingers*r.shaderIntensity,i.uFingerScale.value=n.fieldFingerScale*r.noiseFrequency,i.uWarp.value=n.fieldWarp*r.noiseStrength,i.uCrawl.value=n.fieldCrawl*r.noiseSpeed,i.uRings.value=n.fieldRings,i.uRingSpeed.value=n.fieldRingSpeed,i.uSweep.value=n.fieldSweep,i.uSweepSpeed.value=n.fieldSweepSpeed,i.uCore.value=n.fieldCore,i.uCoreSize.value=n.fieldCoreSize,i.uPulse.value=n.fieldPulse,i.uPulseSpeed.value=n.fieldPulseSpeed,i.uOpacity.value=n.fieldOpacity*r.opacity,i.uColorField.value.copy(o(n.colorField)),i.uColorEdge.value.copy(o(n.colorFieldEdge))},t}var P=`
  uniform float uTime;
  uniform float uFlare;
  uniform float uBillow;
  uniform float uScale;
  uniform float uFlow;
  uniform float uSeed;

  varying vec2  vUv;
  varying vec3  vWorld;
  varying float vViewZ;

  ${c}

  void main() {
    vUv = uv;

    vec3 pos = position;
    vec2 outward = normalize(pos.xz + vec2(1e-5));

    // Cold air spills *outward* as it falls off the rim, so the curtain leans
    // out with height rather than standing straight up.
    pos.xz *= 1.0 + uFlare * pow(clamp(uv.y, 0.0, 1.0), 1.6);

    // Metre-scale lobes, so the silhouette bulges and pinches around the ring.
    float lobe = snoise(vec3(outward * uScale * 1.4, uTime * uFlow * 0.35 + uSeed));
    pos.xz += outward * lobe * uBillow * (0.25 + 0.75 * uv.y);

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorld = world.xyz;

    vec4 mv = viewMatrix * world;
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,F=`
  uniform float uTime;
  uniform float uScale;
  uniform float uStretch;
  uniform float uFlow;
  uniform float uErode;
  uniform float uFalloff;
  uniform float uSoftFade;
  uniform float uSeed;
  uniform float uFade;
  uniform float uOpacity;
  uniform vec3  uColorVeil;
  uniform vec3  uColorCrest;
  uniform float uGlobalGlow;

  uniform vec2  uResolution;
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;

  varying vec2  vUv;
  varying vec3  vWorld;
  varying float vViewZ;

  ${c}
  ${g}

  void main() {
    float up = clamp(vUv.y, 0.0, 1.0);

    // Sampled in world space so the curtain does not swim when the ring is
    // re-scaled, and squashed on Y so the structures are falls rather than
    // clouds.
    vec3 sp = vec3(vWorld.xz * uScale, vWorld.y * uScale * uStretch + uTime * uFlow + uSeed * 7.0);
    float fil = ridged(sp, 4);

    // Erode harder with height: the top of the curtain is mostly gaps.
    float threshold = mix(0.52, 0.95, up * uErode);
    float veil = smoothstep(threshold, threshold + 0.22, fil);

    // Weighted to the floor, and pinched off right at it so the curtain does not
    // end in a hard line where it meets the ground.
    float profile = pow(1.0 - up, uFalloff) * smoothstep(0.0, 0.08, up);

    float alpha = veil * profile * uFade * uOpacity;
    if (alpha < 0.004) discard;

    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.004) discard;

    vec3 color = mix(uColorVeil, uColorCrest, clamp(veil * 1.3 * (1.0 - up), 0.0, 1.0));
    gl_FragColor = vec4(color * uGlobalGlow, clamp(alpha, 0.0, 1.0));
  }
`;function I(){let t=new e({transparent:!0,depthWrite:!1,depthTest:!0,blending:2,side:2,toneMapped:!1,uniforms:r({uFlare:{value:.35},uBillow:{value:.22},uScale:{value:1.4},uStretch:{value:.55},uFlow:{value:.35},uErode:{value:.55},uFalloff:{value:1.8},uSoftFade:{value:.8},uSeed:{value:0},uFade:{value:1},uOpacity:{value:.55},uColorVeil:{value:new y(.55,.82,1)},uColorCrest:{value:new y(1,1,1)}}),vertexShader:P,fragmentShader:F});return t.userData.sync=e=>{let n=m.glacier,r=m.global,i=t.uniforms;i.uFade.value=e.fade,i.uSeed.value=e.seed,i.uFlare.value=n.veilFlare,i.uBillow.value=n.veilBillow*r.noiseStrength,i.uScale.value=n.veilScale*r.noiseFrequency,i.uStretch.value=n.veilStretch,i.uFlow.value=n.veilFlow*r.noiseSpeed,i.uErode.value=n.veilErode,i.uFalloff.value=n.veilFalloff,i.uSoftFade.value=n.veilSoftFade,i.uOpacity.value=n.veil*r.opacity,i.uColorVeil.value.copy(o(n.colorVeil)),i.uColorCrest.value.copy(o(n.colorVeilCrest))},t}var L=320,R=3,z=Math.ceil(L/R),B=Math.PI*2,V=Object.freeze({RING:0,SKIRT:1,CORE:2}),H={},U=new u,W=new u,G=new u,K=new u,q=new u(0,1,0),J=new p,Y=new S,X=new S;function Z(e,t){let n=e-t;return Math.atan2(Math.sin(n),Math.cos(n))}var Q=class extends D{constructor(e){super(`glacier`,e)}createShaders(){let e=this.ctx.environment;this.material=A(e),this._shapeKey=``,this.meshes=[],this.seedAttributes=[],this.birthAttributes=[],this.growAttributes=[],this.shatterAttributes=[];for(let e=0;e<R;e++){let t=this._buildGeometry(e),n=new a(new Float32Array(z),1),r=new a(new Float32Array(z),1),i=new a(new Float32Array(z),1),o=new a(new Float32Array(z),1);for(let e=0;e<z;e++)n.array[e]=Math.random()*10;t.setAttribute(`aSeed`,n),t.setAttribute(`aBirth`,r),t.setAttribute(`aGrow`,i),t.setAttribute(`aShatter`,o);let c=new d(t,this.material,z);c.castShadow=!0,c.receiveShadow=!0,c.frustumCulled=!1,c.count=0,c.layers.set(s.WORLD),c.renderOrder=2,this.group.add(c),this.meshes.push(c),this.seedAttributes.push(n),this.birthAttributes.push(r),this.growAttributes.push(i),this.shatterAttributes.push(o)}this.fieldGeometry=new t(1,1,1,1).rotateX(-Math.PI/2),this.fieldMaterial=N(),this.field=new x(this.fieldGeometry,this.fieldMaterial),this.field.name=`FrostField`,this.field.layers.set(s.VFX),this.field.renderOrder=7,this.field.frustumCulled=!1,this.field.visible=!1,this.group.add(this.field),this.veilGeometry=new i(1,1,1,72,12,!0),this.veilMaterial=I(),this.veil=new x(this.veilGeometry,this.veilMaterial),this.veil.name=`FrostVeil`,this.veil.layers.set(s.VFX),this.veil.renderOrder=9,this.veil.frustumCulled=!1,this.veil.visible=!1,this.group.add(this.veil),this.records=[];for(let e=0;e<L;e++)this.records.push({role:V.SKIRT,angle:0,radial:0,late:!1,rubble:!1,heightJitter:0,radiusJitter:0,leanJitter:0,fanJitter:0,yaw:0,stagger:0,eruptTime:-1,breached:!1,crumbled:!1});this._activeCount=0,this._drawn=0,this._seed=0,this._openTime=0,this._entryAngle=0,this._frostDistance=0,this._state={centre:new u},this._fieldState={radius:1,quadSize:1,freeze:0,fade:1,seed:0},this._veilState={fade:1,seed:0}}_buildGeometry(e){let t=m.glacier;return f({seed:3.9+e*17.3,sides:t.facets,taper:t.taper,roughness:t.roughness,bend:t.bend})}_syncGeometry(){let e=m.glacier,t=`${Math.round(e.facets)}|${e.taper.toFixed(3)}|${e.roughness.toFixed(3)}|${e.bend.toFixed(3)}`;if(t!==this._shapeKey){this._shapeKey=t;for(let e=0;e<R;e++){let t=this.meshes[e],n=t.geometry,r=this._buildGeometry(e);r.setAttribute(`aSeed`,this.seedAttributes[e]),r.setAttribute(`aBirth`,this.birthAttributes[e]),r.setAttribute(`aGrow`,this.growAttributes[e]),r.setAttribute(`aShatter`,this.shatterAttributes[e]),t.geometry=r,n.dispose()}}}createParticles(){let e=this.ctx.particles;this.mist=e.get(`glacier.mist`,{capacity:3600,shape:C.SMOKE,additive:!1,curl:!0,softFade:1.2}),this.mist.uniforms.uDrag.value=2.1,this.mist.uniforms.uEndSize.value=3.6,this.mist.uniforms.uSizeIn.value=.1,this.mist.uniforms.uFadeIn.value=.14,this.mist.uniforms.uFadeOut.value=.28,this.shards=e.get(`glacier.shards`,{capacity:3e3,shape:C.CHIP,additive:!1,lit:!0,softFade:.25}),this.shards.uniforms.uDrag.value=.2,this.shards.uniforms.uEndSize.value=.8,this.shards.uniforms.uFadeOut.value=.74,this.glitter=e.get(`glacier.glitter`,{capacity:3e3,shape:C.SOFT,additive:!0,curl:!0,softFade:.4}),this.glitter.uniforms.uDrag.value=1.1,this.glitter.uniforms.uEndSize.value=.18,this.glitter.uniforms.uSizeIn.value=.05,this.glitter.uniforms.uFadeIn.value=.06,this.glitter.uniforms.uFadeOut.value=.35,this.snow=e.get(`glacier.snow`,{capacity:2600,shape:C.SOFT,additive:!0,curl:!0,softFade:.5}),this.snow.uniforms.uDrag.value=1.6,this.snow.uniforms.uEndSize.value=.5,this.snow.uniforms.uSizeIn.value=.08,this.snow.uniforms.uFadeIn.value=.12,this.snow.uniforms.uFadeOut.value=.5,this.mistEmitter=new w,this.glitterEmitter=new w,this.snowEmitter=new w,this.rimeEmitter=new w,this.vapourEmitter=new w,this.ringEmitter=new w}get instanceCount(){return this._drawn}get impactDuration(){return Math.max(.2,m.glacier.lifetime*m.global.lifetime)}get fadeDuration(){let e=m.glacier;return Math.max(.2,e.shatterDelay+e.shatterStagger+e.sinkTime)}get radius(){return Math.max(.05,m.glacier.zoneRadius)}_centrePoint(e){return this.pointAt(1,e).setY(0)}_handPoint(e){let t=m.glacier;return e.copy(this.origin).addScaledVector(this.direction,t.handForward).addScaledVector(this.side,t.handSide),e.y=t.handHeight,e}_openAmount(){let e=Math.max(.02,m.glacier.snapTime);return v.outCubic(_(this._openTime/e))}_thawAmount(){if(this.phase!==E.FADE)return 0;let e=m.glacier.shatterDelay*.35;return _((this.fadeTime-e)/Math.max(.05,this.fadeDuration-e))}_spikePosition(e,t,n){let r=this._state.centre,i=this.radius,a;return a=e.role===V.RING?i*(t.ringSeat+e.radial*t.ringScatter):e.role===V.CORE?i*t.coreSpread*e.radial:i*(t.skirtSeat+e.radial**+t.skirtBias*t.skirtBand),n.set(r.x+Math.cos(e.angle)*a,0,r.z+Math.sin(e.angle)*a)}_spikeHeight(e,t,n){let r;if(e.role===V.RING){let n=Math.sin(e.angle*3+this._seed)*.62+Math.sin(e.angle*5-this._seed*2.1)*.38;r=t.ringHeight*(1+t.ringWave*n)}else r=e.role===V.CORE?t.coreHeight*l(1,.55,e.radial):t.skirtHeight*l(.55,1.2,1-Math.abs(e.radial-.5)*2);return r*=1+e.heightJitter*t.heightJitter*n.randomness,e.rubble&&(r*=t.rubbleScale),Math.max(.02,r)}_spikeRadius(e,t,n){let r=e.role===V.RING?1:e.role===V.CORE?1.35:.85,i=1+e.radiusJitter*t.radiusJitter*n.randomness;return Math.max(.01,t.radius*r*i*(e.rubble?1.3:1))}_spikeLean(e,t,n){return(e.role===V.RING?t.ringLean:e.role===V.CORE?t.coreLean:t.skirtLean)*(1+e.leanJitter*t.leanJitter*n.randomness)}onSpawn(){let e=m.glacier;this.mistEmitter.reset(),this.glitterEmitter.reset(),this.snowEmitter.reset(),this.rimeEmitter.reset(),this.vapourEmitter.reset(),this.ringEmitter.reset(),this._frostDistance=0,this._openTime=0,this._seed=Math.random()*100,this._entryAngle=Math.atan2(-this.direction.z,-this.direction.x);let t=Math.min(L,Math.max(1,Math.round(e.spikeCount*e.density))),n=Math.round(t*_(e.ringShare)),r=Math.round(t*_(e.coreShare)),i=Math.round(t*_(e.lateShare));this._activeCount=t;for(let a=0;a<t;a++){let o=this.records[a];o.eruptTime=-1,o.breached=!1,o.crumbled=!1,o.yaw=Math.random()*B,o.stagger=Math.random(),o.heightJitter=h(-1,1),o.radiusJitter=h(-1,1),o.leanJitter=h(-1,1),o.fanJitter=h(-1,1),a<n?(o.role=V.RING,o.angle=(a+h(-.4,.4))/Math.max(1,n)*B,o.radial=h(-1,1),o.rubble=Math.random()<e.rubble*.35):a<n+r?(o.role=V.CORE,o.angle=Math.random()*B,o.radial=Math.sqrt(Math.random()),o.rubble=!1):(o.role=V.SKIRT,o.angle=Math.random()*B,o.radial=Math.random(),o.rubble=Math.random()<e.rubble),o.late=o.role===V.SKIRT&&a>=t-i}for(let e=t;e<L;e++)this.records[e].eruptTime=-1;for(let e=0;e<R;e++)this.meshes[e].count=0;this._drawn=0,this.field.visible=!1,this.veil.visible=!1,this._sync(1),this._muzzleFx()}_scheduleEruption(){let e=m.glacier,t=Math.max(.2,e.lifetime*m.global.lifetime);for(let n=0;n<this._activeCount;n++){let r=this.records[n],i;i=r.late?t*(.12+r.stagger*_(e.bloomSpread)):r.role===V.RING?Math.abs(Z(r.angle,this._entryAngle))/Math.PI*e.sweepTime+r.stagger*e.stagger:r.role===V.CORE?e.coreDelay+r.stagger*e.stagger:e.skirtDelay+r.radial*e.skirtWave+r.stagger*e.stagger,r.eruptTime=this.age+i}}_emergence(e,t){if(e.eruptTime<0)return-1;let n=this.age-e.eruptTime;if(n<0)return-1;let r=Math.max(.02,t.riseTime),i=v.outQuint(_(n/r));if(n<=r)return i;let a=n-r,o=Math.sin(a*14)*Math.exp(-a/Math.max(.05,t.settle));return 1+t.riseOvershoot*o}_growth(e,t){return e.eruptTime<0?0:_((this.age-e.eruptTime)/Math.max(.02,t.riseTime*.85))}_shatterAmount(e,t){if(this.phase!==E.FADE)return 0;let n=t.shatterDelay+e.stagger*t.shatterStagger;return _((this.fadeTime-n)/Math.max(.05,t.sinkTime))}_updateSpikes(){let e=m.glacier,t=m.global,n=Math.max(.02,e.birthFade),r=[0,0,0];for(let i=0;i<this._activeCount;i++){let a=this.records[i],o=i%R,s=i/R|0,c=this._emergence(a,e);if(c<0){J.position.set(0,-999,0),J.quaternion.identity(),J.scale.setScalar(1e-4),J.updateMatrix(),this.meshes[o].setMatrixAt(s,J.matrix),this.birthAttributes[o].array[s]=0,this.growAttributes[o].array[s]=0,this.shatterAttributes[o].array[s]=0,r[o]=Math.max(r[o],s+1);continue}let u=this._spikeHeight(a,e,t),d=this._spikeRadius(a,e,t),f=this._shatterAmount(a,e);!a.breached&&c>.22&&(a.breached=!0,this._breachFx(a,e,t,d)),!a.crumbled&&f>.12&&(a.crumbled=!0,this._crumbleFx(a,e,t,d,u));let p=a.angle+a.fanJitter*e.fan;G.set(Math.cos(p),0,Math.sin(p)),G.lengthSq()<1e-6&&G.copy(this.direction),G.normalize(),K.crossVectors(q,G).normalize(),X.setFromAxisAngle(K,this._spikeLean(a,e,t)),Y.setFromAxisAngle(q,a.yaw*e.twist),X.multiply(Y);let m=Math.min(1,c);this._spikePosition(a,e,J.position),J.position.y=(c-1)*u*.9,f>0&&(J.position.y-=v.inCubic(f)*(u*.45+d+.3)),J.quaternion.copy(X),J.scale.set(d,u,d).multiplyScalar(l(.86,1,m)),J.updateMatrix(),this.meshes[o].setMatrixAt(s,J.matrix),this.birthAttributes[o].array[s]=_(1-(this.age-a.eruptTime)/n),this.growAttributes[o].array[s]=this._growth(a,e),this.shatterAttributes[o].array[s]=f,r[o]=Math.max(r[o],s+1)}this._drawn=0;for(let e=0;e<R;e++)this.meshes[e].count=r[e],this.meshes[e].instanceMatrix.needsUpdate=!0,this.birthAttributes[e].needsUpdate=!0,this.growAttributes[e].needsUpdate=!0,this.shatterAttributes[e].needsUpdate=!0,this._drawn+=r[e]}_sync(e){let t=m.glacier,n=m.global,r=this.phase===E.TRAVEL;this._centrePoint(this._state.centre),this._syncGeometry(),this.material.userData.sync();let i=this._state.centre,a=this.radius,s=r?0:this._openAmount(),c=this._thawAmount(),l=s*(1-c),u=this._fieldState;u.radius=a,u.quadSize=(a+t.fieldBoundary+.8)*2,u.freeze=l,u.fade=e,u.seed=this._seed,this.fieldMaterial.userData.sync(u),this.field.visible=!r&&l>.002&&e>.002,this.field.position.set(i.x,t.fieldHeight,i.z),this.field.scale.set(u.quadSize,1,u.quadSize);let d=Math.max(.05,t.veilHeight*v.outCubic(s)),f=this._veilState;f.fade=e*(1-c),f.seed=this._seed,this.veilMaterial.userData.sync(f),this.veil.visible=!r&&t.veil>.001&&s>.02&&f.fade>.004,this.veil.position.set(i.x,d*.5,i.z),this.veil.scale.set(a*t.veilRadius,d,a*t.veilRadius),this.veil.rotation.y=this._seed+this.age*t.veilSpin*B,this.mist.setGradient(o(t.colorMistA),o(t.colorMistB),o(t.colorMistC),o(t.colorMistD)),this.mist.uniforms.uGravity.value.set(0,t.mistRise,0),this.mist.uniforms.uSizeScale.value=t.mistSize*n.particleSize,this.mist.uniforms.uLifeScale.value=t.mistLifetime*.5*n.particleLifetime,this.mist.uniforms.uSpeedScale.value=t.mistSpeed*n.particleSpeed,this.mist.uniforms.uOpacity.value=t.mistOpacity*n.opacity,this.mist.uniforms.uTurbulence.value=t.mistTurbulence*n.turbulence,this.shards.setGradient(o(t.colorShardA),o(t.colorShardB),o(t.colorShardC),o(t.colorShardD)),this.shards.uniforms.uGravity.value.set(0,t.shardGravity,0),this.shards.uniforms.uSizeScale.value=t.shardSize*n.particleSize*7,this.shards.uniforms.uLifeScale.value=n.particleLifetime,this.shards.uniforms.uSpeedScale.value=n.particleSpeed,this.shards.uniforms.uOpacity.value=n.opacity,this.glitter.setGradient(o(t.colorGlitterA),o(t.colorGlitterB),o(t.colorGlitterC),o(t.colorGlitterD)),this.glitter.uniforms.uGravity.value.set(0,t.glitterRise,0),this.glitter.uniforms.uSizeScale.value=t.glitterSize*n.particleSize*7,this.glitter.uniforms.uLifeScale.value=t.glitterLifetime*.5*n.particleLifetime,this.glitter.uniforms.uSpeedScale.value=n.particleSpeed,this.glitter.uniforms.uOpacity.value=n.opacity,this.glitter.uniforms.uGlow.value=t.glitterGlow*n.glow,this.glitter.uniforms.uTurbulence.value=t.glitterTurbulence*n.turbulence,this.snow.setGradient(o(t.colorSnowA),o(t.colorSnowB),o(t.colorSnowC),o(t.colorSnowD)),this.snow.uniforms.uGravity.value.set(0,t.snowFall,0),this.snow.uniforms.uSizeScale.value=t.snowSize*n.particleSize*7,this.snow.uniforms.uLifeScale.value=t.snowLifetime*.5*n.particleLifetime,this.snow.uniforms.uSpeedScale.value=n.particleSpeed,this.snow.uniforms.uOpacity.value=n.opacity,this.snow.uniforms.uGlow.value=t.snowGlow*n.glow,this.snow.uniforms.uTurbulence.value=t.snowTurbulence*n.turbulence}_muzzleFx(){let e=m.glacier,t=m.global;this._handPoint(U),this.ctx.bursts.spawn(b.FROST,U,{radius:e.muzzleSize*.25,endRadius:e.muzzleSize*t.explosionIntensity,life:.45,intensity:e.muzzleIntensity,opacity:.75,fresnel:1.4,displace:.5,colorA:o(e.colorBurstA),colorB:o(e.colorBurstB),colorC:o(e.colorBurstC)}),H.position=U,H.radius=.18,H.direction=W.copy(this.direction).multiplyScalar(.6).setY(.4).normalize(),H.speed=e.shardSpeed*.9,H.speedVariance=.8,H.spread=.85,H.inherit=null,H.anchor=null,H.size=.12,H.sizeVariance=.7,H.life=e.shardLifetime*.8,H.lifeVariance=.5,H.spin=7,H.tint=null,H.time=n.uTime.value,this.shards.emit(Math.round(20*t.particleCount),H),H.speed=e.glitterSpeed*.8,H.spread=.9,H.size=.09,H.life=e.glitterLifetime*.7,H.spin=0,this.glitter.emit(Math.round(30*t.particleCount),H),this.ctx.flash.trigger(o(e.colorCastFlash),e.castFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.5*t.explosionIntensity}_frontFx(e){let t=m.glacier,r=m.global,i=n.uTime.value,a=Math.round(this.mistEmitter.tick(e,t.mistRate*.5)*r.particleCount);a>0&&(H.position=U.copy(this.position).setY(.12),H.radius=.5,H.direction=W.set(0,1,0),H.speed=t.mistSpeed,H.speedVariance=.7,H.spread=1,H.inherit=null,H.anchor=null,H.size=.7,H.sizeVariance=.5,H.life=t.mistLifetime*.8,H.lifeVariance=.4,H.spin=.5,H.tint=null,H.time=i,this.mist.emit(a,H));let s=Math.round(this.glitterEmitter.tick(e,t.glitterRate*.4)*r.particleCount);s>0&&(H.position=U.copy(this.position).setY(.3),H.radius=.4,H.direction=W.set(0,1,0),H.speed=t.glitterSpeed,H.speedVariance=.8,H.spread=.85,H.size=.08,H.sizeVariance=.6,H.life=t.glitterLifetime*.8,H.lifeVariance=.5,H.spin=0,H.time=i,this.glitter.emit(s,H));let c=1/Math.max(.05,t.trailFrostRate);for(;this.front-this._frostDistance>=c;){this._frostDistance+=c;let e=_(this._frostDistance/this.length);this.pointAt(e,U),U.x+=this.side.x*h(-.9,.9),U.z+=this.side.z*h(-.9,.9),this.ctx.decals.spawn(T.FROST,U,{radius:t.trailFrostRadius*h(.55,1.1),life:t.frostLife*.8,width:t.frostCrystals,intensity:t.frostIntensity,colorA:o(t.colorFrost),colorB:o(t.colorFrostEdge)})}}_breachFx(e,t,r,i){let a=n.uTime.value;this._spikePosition(e,t,U).setY(.08),H.position=U,H.radius=i*.9,H.direction=W.set(Math.cos(e.angle)*.55,1,Math.sin(e.angle)*.55).normalize(),H.speed=t.shardSpeed,H.speedVariance=.7,H.spread=.7,H.inherit=null,H.anchor=null,H.size=.1,H.sizeVariance=.7,H.life=t.shardLifetime,H.lifeVariance=.45,H.spin=7,H.tint=null,H.time=a,this.shards.emit(Math.round(t.breachShards*r.particleCount),H),Math.random()<.35&&(H.speed=t.mistSpeed*.8,H.spread=1,H.size=.55,H.sizeVariance=.5,H.life=t.mistLifetime*.7,H.spin=.5,this.mist.emit(Math.round(2*r.particleCount),H)),e.role===V.RING&&Math.random()<.5&&(this._spikePosition(e,t,U),this.ctx.decals.spawn(T.FROST,U,{radius:i*t.frostCollar*h(.7,1.3),life:t.frostLife,width:t.frostCrystals,intensity:t.frostIntensity*.9,colorA:o(t.colorFrost),colorB:o(t.colorFrostEdge)}))}_crumbleFx(e,t,r,i,a){let o=n.uTime.value;this._spikePosition(e,t,U).setY(a*.45),H.position=U,H.radius=i*1.1,H.direction=W.set(Math.cos(e.angle)*.7,.7,Math.sin(e.angle)*.7).normalize(),H.speed=t.shardSpeed*.75,H.speedVariance=.85,H.spread=.9,H.inherit=null,H.anchor=null,H.size=.13,H.sizeVariance=.8,H.life=t.shardLifetime*1.2,H.lifeVariance=.5,H.spin=9,H.tint=null,H.time=o,this.shards.emit(Math.round(t.shatterShards*r.particleCount),H),Math.random()<.5&&(H.speed=t.glitterSpeed*.6,H.spread=1,H.size=.07,H.life=t.glitterLifetime,H.spin=0,this.glitter.emit(Math.round(6*r.particleCount),H))}_fieldFx(e,t){let r=m.glacier,i=m.global,a=n.uTime.value,s=this._state.centre,c=this.radius,l=this._openAmount(),u=Math.round(this.mistEmitter.tick(e,r.mistRate*t)*i.particleCount);if(u>0){let e=Math.random()*B,t=c*h(.75,1.05);U.set(s.x+Math.cos(e)*t,h(.05,.5),s.z+Math.sin(e)*t),H.position=U,H.radius=c*.18,H.direction=W.set(Math.cos(e),.18,Math.sin(e)).normalize(),H.speed=r.mistSpeed,H.speedVariance=.7,H.spread=.6,H.inherit=null,H.anchor=null,H.size=.85,H.sizeVariance=.5,H.life=r.mistLifetime,H.lifeVariance=.4,H.spin=.4,H.tint=null,H.time=a,this.mist.emit(u,H)}let d=Math.round(this.glitterEmitter.tick(e,r.glitterRate*t)*i.particleCount);if(d>0){let e=Math.random()*B,t=c*Math.sqrt(Math.random());U.set(s.x+Math.cos(e)*t,h(.05,.6),s.z+Math.sin(e)*t),H.position=U,H.radius=c*.15,H.direction=W.set(0,1,0),H.speed=r.glitterSpeed,H.speedVariance=.8,H.spread=.8,H.inherit=null,H.anchor=null,H.size=.08,H.sizeVariance=.6,H.life=r.glitterLifetime,H.lifeVariance=.5,H.spin=0,H.tint=null,H.time=a,this.glitter.emit(d,H)}let f=Math.round(this.snowEmitter.tick(e,r.snowRate*t)*i.particleCount);if(f>0){let e=Math.random()*B,t=c*r.snowInset*Math.sqrt(Math.random());U.set(s.x+Math.cos(e)*t,r.ringHeight*r.snowHeight*l,s.z+Math.sin(e)*t),H.position=U,H.radius=c*.25,H.direction=W.set(0,-1,0),H.speed=r.snowSpeed,H.speedVariance=.6,H.spread=.5,H.inherit=null,H.anchor=null,H.size=.07,H.sizeVariance=.7,H.life=r.snowLifetime,H.lifeVariance=.45,H.spin=0,H.tint=null,H.time=a,this.snow.emit(f,H)}let p=this.rimeEmitter.tick(e,r.rimeRate*t);for(let e=0;e<p;e++){let e=Math.random()*B,t=c*h(.7,1.05);U.set(s.x+Math.cos(e)*t,0,s.z+Math.sin(e)*t),this.ctx.decals.spawn(T.FROST,U,{radius:r.rimeRadius*h(.7,1.3),life:r.frostLife,width:r.frostCrystals,intensity:r.frostIntensity,colorA:o(r.colorFrost),colorB:o(r.colorFrostEdge)})}let g=this.vapourEmitter.tick(e,r.vapourRate*t);for(let e=0;e<g;e++){let e=Math.random()*B;U.set(s.x+Math.cos(e)*c*h(.5,.95),r.ringHeight*h(.05,.3)*l,s.z+Math.sin(e)*c*h(.5,.95)),this.ctx.bursts.spawn(b.FROST,U,{radius:r.vapourSize*.3,endRadius:r.vapourSize*i.explosionIntensity,life:.75,intensity:r.vapourIntensity,opacity:.28,fresnel:1.8,displace:.55,squash:.5,colorA:o(r.colorBurstA),colorB:o(r.colorBurstB),colorC:o(r.colorBurstC)})}let _=this.ringEmitter.tick(e,r.ringRate*t);for(let e=0;e<_;e++)this.ctx.decals.spawn(T.SHOCKWAVE,s,{radius:c*1.08,life:.8,width:.05,intensity:.55,colorA:o(r.colorShockA),colorB:o(r.colorShockB)})}onTravel(e){this._sync(1),this._updateSpikes(),this.position.y=.35,this._frontFx(e),this.ctx.shake.rumble(m.glacier.rumble*m.global.cameraShake,e)}onImpact(){let e=m.glacier,t=m.global,r=n.uTime.value;this._openTime=0,this._scheduleEruption(),this._centrePoint(U),U.y=.5,this.ctx.bursts.spawn(b.FROST,U,{radius:e.burstSize*.25,endRadius:e.burstSize*t.explosionIntensity,life:.9,intensity:e.burstIntensity,opacity:.8,fresnel:1.4,displace:.6,squash:.6,colorA:o(e.colorBurstA),colorB:o(e.colorBurstB),colorC:o(e.colorBurstC)}),this._centrePoint(U),this.ctx.decals.spawn(T.SHOCKWAVE,U,{radius:e.shockRadius*t.explosionIntensity,life:.8,width:.05,intensity:1,colorA:o(e.colorShockA),colorB:o(e.colorShockB)}),this.ctx.decals.spawn(T.FROST,U,{radius:this.radius*e.frostSpread,life:e.frostLife*1.4,width:e.frostCrystals,intensity:e.frostIntensity,colorA:o(e.colorFrost),colorB:o(e.colorFrostEdge)}),this._centrePoint(U).setY(.4),H.position=U,H.radius=this.radius*.5,H.direction=W.set(0,1,0),H.speed=e.shardSpeed*1.7,H.speedVariance=.8,H.spread=1,H.inherit=null,H.anchor=null,H.size=.15,H.sizeVariance=.8,H.life=e.shardLifetime*1.3,H.lifeVariance=.5,H.spin=9,H.tint=null,H.time=r,this.shards.emit(Math.round(e.burstShards*t.particleCount),H),H.radius=this.radius*.8,H.speed=e.mistSpeed*2.2,H.spread=1,H.size=1.3,H.life=e.mistLifetime*1.3,H.spin=.6,this.mist.emit(Math.round(e.burstMist*t.particleCount),H),H.radius=this.radius*.6,H.speed=e.glitterSpeed*1.5,H.spread=.9,H.size=.1,H.life=e.glitterLifetime*1.2,H.spin=0,this.glitter.emit(Math.round(e.burstGlitter*t.particleCount),H),this.ctx.shake.add(e.impactShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),21),this.ctx.flash.trigger(o(e.colorFlash),e.impactFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*1.5*t.explosionIntensity}onFade(e,t){let n=m.glacier;this._openTime+=e;let r=t<=1?1:1-v.inQuad(_(t-1));this._sync(r),this._updateSpikes(),this._centrePoint(this.position),this.position.y=n.ringHeight*_(n.lightHeight)*this._openAmount(),this._fieldFx(e,r*(t<=1?1:.35)),this.ctx.shake.rumble(n.holdShake*r*m.global.cameraShake,e)}onDestroy(){this._activeCount=0,this._drawn=0;for(let e=0;e<R;e++)this.meshes[e].count=0;this.field.visible=!1,this.veil.visible=!1}dispose(){for(let e of this.meshes)e.geometry.dispose(),e.dispose();this.material.dispose(),this.fieldGeometry.dispose(),this.fieldMaterial.dispose(),this.veilGeometry.dispose(),this.veilMaterial.dispose(),super.dispose()}};export{Q as GlacierAbility};
//# sourceMappingURL=GlacierAbility-CelHSKik.js.map