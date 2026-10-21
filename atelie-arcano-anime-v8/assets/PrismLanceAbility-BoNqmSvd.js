import{$ as e,A as t,Br as n,G as r,K as i,R as a,Ut as o,V as s,Y as c,at as l,di as u,it as d,k as f,nt as p,o as m,ot as h,q as g,st as _,tt as v,vt as y,xt as b,y as x,yn as S,z as C}from"./settings-DdywqLlV.js";import{t as w}from"./ParticleSystem-BZTczMT8.js";import{n as T}from"./ParticleEngine-DLxipNH0.js";import{n as E}from"./GroundDecals-kYmr8HKl.js";import{n as D,t as O}from"./Ability-CYesB5Ur.js";import{r as k}from"./GrowthField-BxvnSH9l.js";import{n as A,t as j}from"./ShatterField-Ky_Am4am.js";var M=`
  uniform vec3 uNormalFix;

  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec3 vLocal;

  void main() {
    vLocal = position;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * (normal * uNormalFix));
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`,N=`
  uniform float uTime;
  uniform sampler2D uEnvMap;
  uniform float uEnvIntensity;
  uniform float uEnvMix;

  uniform float uIor;
  uniform float uDispersion;
  uniform float uFresnelPower;
  uniform float uFresnelScale;

  uniform float uFacet;
  uniform float uFacetScale;
  uniform float uGlow;
  uniform float uOpacity;
  uniform float uFade;
  uniform float uLoad;
  uniform float uLoadGlow;

  uniform float uCrack;
  uniform float uCrackScale;
  uniform float uCrackEdge;
  uniform float uCrackGlow;
  uniform float uSeed;

  uniform vec3 uColorBody;
  uniform vec3 uColorRim;
  uniform vec3 uColorFire;
  uniform vec3 uColorSkyUp;
  uniform vec3 uColorSkyDown;

  uniform float uGlobalGlow;

  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec3 vLocal;

  ${c}
  ${g}

  /** The two-picker fallback room, for when there is no equirect bound. */
  vec3 sky(vec3 d) {
    return mix(uColorSkyDown, uColorSkyUp, clamp(d.y * 0.5 + 0.5, 0.0, 1.0));
  }

  /** What the prism sees down a ray. */
  vec3 probe(vec3 d) {
    vec3 lit = texture2D(uEnvMap, equirectUv(d)).rgb * uEnvIntensity;
    return mix(sky(d), lit, clamp(uEnvMix, 0.0, 1.0));
  }

  void main() {
    vec3 N = normalize(vNormalW);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(vWorld - cameraPosition);

    /* ---- the crack, which happens before anything is shaded ---- */
    // A fracture is a *hole*, so it is a discard and not a darkening. The field
    // is world-space fbm at a metre scale, so the cracks keep their size when
    // the solid is scaled and do not swim when it spins.
    float grain = fbm3(vWorld * max(uCrackScale, 0.01) + uSeed);
    vec2 broken = dissolveMask(grain, uCrack, max(uCrackEdge, 1e-3));
    if (uCrack > 0.001 && broken.x < 0.5) discard;

    /* ---- three rays, three indices ---- */
    float eta = 1.0 / max(uIor, 1.0001);
    vec3 mirror = reflect(V, N);
    vec3 rr = refract(V, N, eta * (1.0 + uDispersion));
    vec3 rg = refract(V, N, eta);
    vec3 rb = refract(V, N, eta * (1.0 - uDispersion));
    // Total internal reflection: refract() hands back the zero vector.
    if (dot(rr, rr) < 0.25) rr = mirror;
    if (dot(rg, rg) < 0.25) rg = mirror;
    if (dot(rb, rb) < 0.25) rb = mirror;

    vec3 through = vec3(probe(rr).r, probe(rg).g, probe(rb).b);
    vec3 reflected = probe(mirror);

    /* ---- the interior ---- */
    // Facets inside the body, in the solid's *own* space so they tumble with
    // it. Without this the prism is an empty shell: the refraction alone has no
    // internal structure and the thing reads as a soap bubble.
    float veins = fbm3(vLocal * max(uFacetScale, 0.01) + vec3(0.0, uTime * 0.15, uSeed));
    float fres = fresnelTerm(V, N, uFresnelPower, uFresnelScale);

    vec3 color = through * uColorBody;
    color += reflected * fres;
    color += uColorRim * fres * fres;
    color += uColorFire * veins * uFacet;
    // While the lance is actually in it, the solid blazes from the inside.
    color += uColorFire * uLoad * uLoadGlow;
    color += uColorFire * broken.y * uCrackGlow;
    color *= uGlow * uGlobalGlow;

    // Same Reinhard ceiling GlacierMaterial uses: every term above peaks at a
    // grazing angle and they stack, and a slider pinned against a white cutout
    // is a slider nobody can hear.
    color /= 1.0 + color * 0.16;

    float alpha = mix(uOpacity, 1.0, clamp(fres, 0.0, 1.0)) * uFade;
    alpha = max(alpha, broken.y * uFade);
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;function P(){let e=new n({transparent:!0,depthWrite:!1,depthTest:!0,blending:1,side:2,toneMapped:!1,uniforms:i({uEnvMap:r.uEnvMap,uNormalFix:{value:new u(1,1,1)},uEnvIntensity:{value:1},uEnvMix:{value:.6},uIor:{value:1.62},uDispersion:{value:.06},uFresnelPower:{value:2.6},uFresnelScale:{value:1.1},uFacet:{value:.6},uFacetScale:{value:5.5},uGlow:{value:1.4},uOpacity:{value:.35},uFade:{value:0},uLoad:{value:0},uLoadGlow:{value:1.6},uCrack:{value:0},uCrackScale:{value:6},uCrackEdge:{value:.12},uCrackGlow:{value:2.4},uSeed:{value:0},uColorBody:{value:new b(.85,.9,1)},uColorRim:{value:new b(1,1,1)},uColorFire:{value:new b(1,.85,1)},uColorSkyUp:{value:new b(.35,.42,.6)},uColorSkyDown:{value:new b(.05,.05,.08)}}),vertexShader:M,fragmentShader:N});return e.userData.sync=t=>{let n=m.prismlance,r=m.global,i=e.uniforms;i.uNormalFix.value.copy(t.normalFix),i.uFade.value=t.fade,i.uLoad.value=t.load,i.uCrack.value=t.crack,i.uSeed.value=t.seed,i.uEnvIntensity.value=n.prismEnvIntensity,i.uEnvMix.value=n.prismEnvMix,i.uIor.value=n.prismIor,i.uDispersion.value=n.prismDispersion,i.uFresnelPower.value=n.prismFresnelPower,i.uFresnelScale.value=n.prismFresnelScale*r.fresnel,i.uFacet.value=n.prismFacet*r.noiseStrength,i.uFacetScale.value=n.prismFacetScale*r.noiseFrequency,i.uGlow.value=n.prismGlow*r.glow,i.uOpacity.value=n.prismOpacity*r.opacity,i.uLoadGlow.value=n.prismLoadGlow,i.uCrackScale.value=n.prismCrackScale*r.noiseFrequency,i.uCrackEdge.value=n.prismCrackEdge,i.uCrackGlow.value=n.prismCrackGlow,i.uColorBody.value.copy(a(n.colorPrismBody)),i.uColorRim.value.copy(a(n.colorPrismRim)),i.uColorFire.value.copy(a(n.colorPrismFire)),i.uColorSkyUp.value.copy(a(n.colorPrismSkyUp)),i.uColorSkyDown.value.copy(a(n.colorPrismSkyDown))},e}var F=`
  #define PI  3.141592653589793
  #define TAU 6.283185307179586
  #define MAX_CHILDREN 8

  uniform float uTime;
  uniform vec3  uPrism;
  uniform vec3  uTarget;
  uniform vec3  uSide;
  uniform float uSeed;
  uniform float uCount;
  uniform float uFade;

  uniform float uSpread;
  uniform float uDispersion;
  uniform float uBowBias;
  uniform float uBowCurve;
  uniform float uSpin;
  uniform float uWave;
  uniform float uWaveScale;
  uniform float uWaveSpeed;

  uniform float uWidth;
  uniform float uWidthTip;
  uniform float uFlicker;
  uniform float uFlickerSpeed;
  uniform float uWhite;

  uniform vec3  uChildColor[MAX_CHILDREN];
  uniform vec3  uColorCollapse;

  attribute float aStrand;

  varying float vT;
  varying float vSide;
  varying float vFlash;
  varying float vViewZ;
  varying vec3  vTint;

  ${c}

  /**
   * One child's axis point at t, 0 at the prism and 1 at the target.
   *
   * The 'order' argument is the child's place in the spectrum, 0..1, and it is the only
   * thing that separates one child from another: it picks the bearing, it
   * scales the throw, and up in main() it picks the colour.
   */
  vec3 childPoint(float t, float order, float bearing, vec3 n1, vec3 n2) {
    vec3 axis = mix(uPrism, uTarget, t);

    float bow = pow(max(sin(PI * pow(clamp(t, 0.0, 1.0), max(uBowBias, 0.05))), 0.0), max(uBowCurve, 0.05));
    float amp = uSpread * mix(1.0, uDispersion, order);
    // A slow travelling ripple down the beam. Small: a child beam is coherent
    // light, and anything that kinks it reads as the Storm Lance by mistake.
    amp *= 1.0 + uWave * sin(TAU * (t * uWaveScale - uTime * uWaveSpeed) + order * 4.0);

    float angle = bearing + uTime * uSpin * TAU;
    vec2 offset = vec2(cos(angle), sin(angle)) * amp * bow;
    return axis + n1 * offset.x + n2 * offset.y;
  }

  void main() {
    float t = position.x;
    vT = t;
    vSide = position.y;

    /* ---- the frame the fan opens in ---- */
    vec3 delta = uTarget - uPrism;
    float span = max(length(delta), 0.01);
    vec3 dir = delta / span;
    vec3 n1 = uSide - dir * dot(uSide, dir);
    n1 = length(n1) > 1e-4 ? normalize(n1) : normalize(cross(dir, vec3(0.0, 1.0, 0.0)));
    vec3 n2 = normalize(cross(dir, n1));

    /* ---- which child is this ---- */
    float count = max(uCount, 1.0);
    float order = count > 1.0 ? aStrand / (count - 1.0) : 0.0;
    float bearing = (aStrand / count) * TAU + uSeed;

    vec3 tint = uChildColor[0];
    // Indexed by the loop counter and compared against the instance id: a
    // uniform array indexed by a varying does not compile on ANGLE, and this is
    // the same dance FilamentPaths does for its roles.
    for (int i = 0; i < MAX_CHILDREN; i++) {
      if (float(i) == aStrand) tint = uChildColor[i];
    }
    vTint = mix(tint, uColorCollapse, clamp(uWhite, 0.0, 1.0));

    vec3 here = childPoint(t, order, bearing, n1, n2);

    /* ---- camera-facing ribbon ---- */
    float step_ = 0.02;
    float ahead = t + step_;
    float flip = 1.0;
    if (ahead > 1.0) { ahead = t - step_; flip = -1.0; }
    vec3 next = childPoint(ahead, order, bearing, n1, n2);
    vec3 tangent = (next - here) * flip;
    tangent = length(tangent) > 1e-5 ? normalize(tangent) : dir;

    vec3 toCamera = normalize(cameraPosition - here);
    vec3 binormal = cross(tangent, toCamera);
    float bl = length(binormal);
    binormal = bl > 1e-4 ? binormal / bl : n1;

    /* ---- width ---- */
    float flash = mix(1.0, hash11(floor(uTime * uFlickerSpeed) + aStrand * 3.7 + uSeed), uFlicker);
    vFlash = flash;

    float halfWidth = uWidth * mix(1.0, uWidthTip, t) * flash * uFade;

    vec4 mv = viewMatrix * vec4(here + binormal * vSide * halfWidth, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,I=`
  uniform float uProgress;
  uniform float uTipGlow;
  uniform float uTipLength;
  uniform float uCoreSharp;
  uniform float uCoreWidth;
  uniform float uHaloFalloff;
  uniform float uHaloOpacity;
  uniform float uOpacity;
  uniform float uGlow;
  uniform float uFade;
  uniform float uSoftFade;
  uniform vec3  uColorCore;

  uniform float uGlobalGlow;
  uniform vec2  uResolution;
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;

  varying float vT;
  varying float vSide;
  varying float vFlash;
  varying float vViewZ;
  varying vec3  vTint;

  ${c}
  ${g}

  void main() {
    // Ahead of the split front there is no child beam yet. Clipped, never
    // scaled: the *shape* must not change as the fan reaches the target.
    float tip = max(uTipLength, 1e-3);
    float drawn = smoothstep(uProgress, uProgress - tip, vT);
    if (drawn <= 0.002) discard;

    float v = clamp(abs(vSide), 0.0, 1.0);

    // Two profiles summed in one fragment — see the header. The core lives
    // inside the first uCoreWidth of the ribbon; the halo spans all of it.
    float core = pow(clamp(1.0 - v / max(uCoreWidth, 1e-3), 0.0, 1.0), max(uCoreSharp, 0.05));
    float halo = pow(1.0 - v, max(uHaloFalloff, 0.05)) * uHaloOpacity;

    vec3 color = vTint * (core * 0.35 + halo);
    color += uColorCore * core * core;
    color += uColorCore * smoothstep(uProgress - tip * 2.0, uProgress, vT) * uTipGlow;

    float alpha = (core + halo) * drawn * vFlash * uFade * uOpacity;

    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.003) discard;

    color *= uGlow * uGlobalGlow;
    gl_FragColor = vec4(color, alpha);
  }
`;function L(){let e=[];for(let t=0;t<8;t++)e.push(new b(1,1,1));let t=new n({transparent:!0,depthWrite:!1,depthTest:!0,blending:2,side:2,toneMapped:!1,uniforms:i({uPrism:{value:new u},uTarget:{value:new u(0,0,1)},uSide:{value:new u(1,0,0)},uSeed:{value:0},uCount:{value:6},uFade:{value:1},uProgress:{value:0},uSpread:{value:.9},uDispersion:{value:2.2},uBowBias:{value:1},uBowCurve:{value:1},uSpin:{value:.12},uWave:{value:.12},uWaveScale:{value:2.4},uWaveSpeed:{value:1.1},uWidth:{value:.16},uWidthTip:{value:.6},uFlicker:{value:.12},uFlickerSpeed:{value:24},uWhite:{value:0},uCoreSharp:{value:2.6},uCoreWidth:{value:.34},uHaloFalloff:{value:2.6},uHaloOpacity:{value:.5},uTipGlow:{value:1.4},uTipLength:{value:.07},uOpacity:{value:1},uGlow:{value:2.1},uSoftFade:{value:.5},uChildColor:{value:e},uColorCore:{value:new b(1,1,1)},uColorCollapse:{value:new b(1,1,1)}}),vertexShader:F,fragmentShader:I});return t.userData.sync=e=>{let n=m.prismlance,r=m.global,i=t.uniforms;i.uPrism.value.copy(e.prism),i.uTarget.value.copy(e.target),i.uSide.value.copy(e.side),i.uSeed.value=e.seed,i.uCount.value=e.count,i.uFade.value=e.fade,i.uProgress.value=e.progress,i.uWhite.value=e.white,i.uSpread.value=n.fanSpread,i.uDispersion.value=n.fanDispersion,i.uBowBias.value=n.fanBow,i.uBowCurve.value=n.fanBowCurve,i.uSpin.value=n.fanSpin*r.animationSpeed,i.uWave.value=n.fanWave*r.noiseStrength,i.uWaveScale.value=n.fanWaveScale*r.noiseFrequency,i.uWaveSpeed.value=n.fanWaveSpeed*r.noiseSpeed,i.uWidth.value=n.fanWidth,i.uWidthTip.value=n.fanWidthTip,i.uFlicker.value=n.fanFlicker,i.uFlickerSpeed.value=n.fanFlickerSpeed,i.uCoreSharp.value=n.fanCoreSharp,i.uCoreWidth.value=n.fanCoreWidth,i.uHaloFalloff.value=n.fanHaloFalloff,i.uHaloOpacity.value=n.fanHaloOpacity,i.uTipGlow.value=n.fanTipGlow,i.uTipLength.value=n.fanTipLength,i.uOpacity.value=n.fanOpacity*r.opacity,i.uGlow.value=n.fanGlow*r.glow,i.uSoftFade.value=n.fanSoftFade;let o=i.uChildColor.value;o[0].copy(a(n.colorChild1)),o[1].copy(a(n.colorChild2)),o[2].copy(a(n.colorChild3)),o[3].copy(a(n.colorChild4)),o[4].copy(a(n.colorChild5)),o[5].copy(a(n.colorChild6)),o[6].copy(a(n.colorChild7)),o[7].copy(a(n.colorChild8)),i.uColorCore.value.copy(a(n.colorFanCore)),i.uColorCollapse.value.copy(a(n.colorCollapse))},t}var R=56,z=2,B=192,V=4,H=Math.PI*2,U={},W=new u,G=new u,K=new u,q=new u,J=new u;function Y(){let e=[],t=[];for(let e=0;e<3;e++){let n=e/3*H+Math.PI*.5;t.push([Math.cos(n),0,Math.sin(n)])}let n=t=>e.push(t[0],t[1],t[2]),r=[0,1,0],i=[0,-1,0];for(let e=0;e<3;e++){let a=t[e],o=t[(e+1)%3];n(r),n(o),n(a),n(i),n(a),n(o)}let a=new y;return a.setAttribute(`position`,new o(e,3)),a.computeVertexNormals(),a.computeBoundingSphere(),a}function X(e){let t=e*13.7+3.1,n=[];for(let e=0;e<3;e++){let r=e/3*H+d(t+e)*1.1,i=.55+d(t+e*3.3)*.45;n.push([Math.cos(r)*i,Math.sin(r)*i])}let r=.07+d(t+9.4)*.1,i=[],a=(e,t)=>i.push(n[e][0],n[e][1],t*r);a(0,1),a(1,1),a(2,1),a(2,-1),a(1,-1),a(0,-1);for(let e=0;e<3;e++){let t=(e+1)%3;a(e,1),a(t,-1),a(t,1),a(e,1),a(e,-1),a(t,-1)}let s=new y;return s.setAttribute(`position`,new o(i,3)),s.computeVertexNormals(),s.computeBoundingSphere(),s}var Z=class extends O{constructor(e){super(`prismlance`,e)}createShaders(){this.lance=new f({path:t.STRAIGHT,prefix:`lance`,nodes:72,sides:22,renderOrder:11}),this.group.add(this.lance.group),this.prismGeometry=Y(),this.prismMaterial=P(),this.prismMesh=new S(this.prismGeometry,this.prismMaterial),this.prismMesh.layers.set(s.VFX),this.prismMesh.renderOrder=14,this.prismMesh.frustumCulled=!1,this.group.add(this.prismMesh),this.fanGeometry=e(R,8),this.fanMaterial=L(),this.fanMesh=new S(this.fanGeometry,this.fanMaterial),this.fanMesh.frustumCulled=!1,this.fanMesh.matrixAutoUpdate=!1,this.fanMesh.layers.set(s.VFX),this.fanMesh.renderOrder=12,this.group.add(this.fanMesh),this.chips=new j(this.group,{geometry:X,variants:z,capacity:B,additive:!1,depthWrite:!1,renderOrder:8}),this._seed=0,this._childCount=1,this._splitAt=-1,this._crackAt=-1,this._lanceState={origin:new u,target:new u,side:new u,progress:0,fade:1,widthFade:1,seed:0,time:0},this._fanState={prism:new u,target:new u,side:new u,progress:0,fade:1,seed:0,count:6,white:0},this._prismState={fade:0,load:0,crack:0,seed:0,normalFix:new u(1,1,1)},this._chipParams=A(),this._chipParams.layout=k.LINE,this._chipLook={colorA:C(`#ffffff`),colorB:C(`#ffffff`),colorEdge:C(`#ffffff`),colorScene:C(`#ffffff`),opacity:1,glow:1,rim:1,rimPower:2,shade:1,ambient:.4,fadeStart:.6,soft:0,sceneMix:.75,refract:.05,saturation:.3}}createParticles(){let e=this.ctx.particles;this.motes=e.get(`prismlance.motes`,{capacity:2e3,shape:w.SOFT,additive:!0,curl:!0,softFade:.4}),this.motes.uniforms.uDrag.value=1.5,this.motes.uniforms.uEndSize.value=.2,this.motes.uniforms.uSizeIn.value=.06,this.motes.uniforms.uFadeIn.value=.1,this.motes.uniforms.uFadeOut.value=.45,this.sparks=e.get(`prismlance.sparks`,{capacity:2400,shape:w.STREAK,additive:!0,stretch:!0,softFade:.25}),this.sparks.uniforms.uDrag.value=1.5,this.sparks.uniforms.uEndSize.value=.25,this.sparks.uniforms.uSizeIn.value=.02,this.sparks.uniforms.uFadeIn.value=.03,this.sparks.uniforms.uFadeOut.value=.45,this.dust=e.get(`prismlance.dust`,{capacity:1200,shape:w.SMOKE,additive:!1,curl:!0,softFade:1.1}),this.dust.uniforms.uDrag.value=1.8,this.dust.uniforms.uEndSize.value=2.6,this.dust.uniforms.uSizeIn.value=.12,this.dust.uniforms.uFadeIn.value=.16,this.dust.uniforms.uFadeOut.value=.32,this.moteEmitter=new T}get instanceCount(){return this._childCount+this.chips.count}get impactDuration(){return Math.max(.05,m.prismlance.lifetime*m.global.lifetime)}get fadeDuration(){return Math.max(.05,m.prismlance.fadeTime)}get charge(){return _(this.age/Math.max(.01,m.prismlance.charge))}lightShimmer(){let e=m.prismlance;return 1-e.lightPulse*(.5-.5*Math.cos(this.age*e.lightPulseSpeed*H))}advance(e){let t=this.config,n=Math.max(0,t.charge);if(this.age<n)return!1;let r=t.speed*m.global.speed,i=this.age-n;this.front+=r*v.outQuad(_(i/.06))*e;let a=this.u;return this.u=_(this.front/this.length),this.pointAt(this.u,this.position),this.u>=1&&a<1}get _prismFraction(){return p(m.prismlance.prismAt,.02,.98)}_handPoint(e){let t=m.prismlance;return e.copy(this.origin).addScaledVector(this.direction,t.handForward).addScaledVector(this.side,t.handSide),e.y=t.handHeight,e}_prismPoint(e){let t=m.prismlance;return this.pointAt(this._prismFraction,e),e.y=t.prismHeight+t.prismBob*Math.sin(this.age*t.prismBobSpeed*H),e}_impactPoint(e){return this.pointAt(1,e),e.y=m.prismlance.endHeight,e}_pathPoint(e,t){let n=this._prismFraction,r=_(e);return r<=n?(this._handPoint(K),this._prismPoint(q),t.copy(K).lerp(q,n<=1e-4?1:r/n)):(this._prismPoint(q),this._impactPoint(J),t.copy(q).lerp(J,(r-n)/Math.max(1e-4,1-n)))}_fanRadius(e){let t=m.prismlance,n=_(e),r=Math.sin(Math.PI*n**+Math.max(.05,t.fanBow))**+Math.max(.05,t.fanBowCurve);return t.fanSpread*Math.max(1,t.fanDispersion)*r}onSpawn(){this.moteEmitter.reset(),this.chips.clear(),this._splitAt=-1,this._crackAt=-1,this._seed=Math.random()*100,this._syncUniforms(1),this._muzzleFx()}_syncUniforms(e){let t=m.prismlance,n=m.global,r=this._prismFraction,i=this.charge;this._handPoint(K),this._prismPoint(q),this._impactPoint(J);let o=this.phase===D.TRAVEL,s=o?this.u<=0?v.outQuad(i)*t.chargeStub:_(this.u/r):1,c=o?_((this.u-r)/Math.max(1e-4,1-r)):1,u=this._lanceState;u.origin.copy(K),u.target.copy(q),u.side.copy(this.side),u.progress=s,u.fade=e,u.widthFade=o&&this.u<=0?l(t.chargeSwell,1,v.inQuad(i)):1,u.seed=this._seed,u.time=this.age,this.lance.sync(t,u,n);let d=this._fanState;d.prism.copy(q),d.target.copy(J),d.side.copy(this.side),d.progress=c,d.fade=e,d.seed=this._seed,this._childCount=Math.max(1,Math.min(8,Math.round(t.children))),d.count=this._childCount,this.fanGeometry.instanceCount=this._childCount,d.white=this._crackAt<0?0:_((this.age-this._crackAt)/Math.max(.05,t.prismCrackTime))**+Math.max(.05,t.fanCollapse),this.fanMaterial.userData.sync(d);let f=this._prismState,p=this._crackAt<0?0:_((this.age-this._crackAt)/Math.max(.05,t.prismCrackTime));f.fade=v.outCubic(i)*e*(1-p),f.load=this._splitAt<0?i*.35:1-p,f.crack=p,f.seed=this._seed;let h=l(1,t.prismSwell,f.load),g=Math.max(.01,t.prismRadius*h),y=Math.max(.01,t.prismLength*h);this.prismMesh.position.copy(q),this.prismMesh.scale.set(g,y,g),this.prismMesh.rotation.set(t.prismTilt,this.age*t.prismSpin*H+this._seed,0),f.normalFix.set(1/(g*g),1/(y*y),1/(g*g)),this.prismMaterial.userData.sync(f);let b=this._chipParams;b.origin=this.origin,b.direction=this.direction,b.side=this.side,b.length=this.length,b.width=t.fanSpread,b.spawnRadius=t.chipScatter,b.spawnHeight=t.prismHeight,b.speed=t.chipSpeed,b.speedJitter=t.chipSpeedJitter,b.spread=t.chipSpread,b.upBias=t.chipUpBias,b.gravity=t.chipGravity,b.drag=t.chipDrag,b.size=t.chipSize,b.sizeJitter=t.chipSizeJitter,b.shrink=t.chipShrink,b.shrinkPower=t.chipShrinkPower,b.spin=t.chipSpin*n.animationSpeed,b.spinJitter=t.chipSpinJitter,b.lifetime=t.chipLifetime*n.lifetime,b.floorSpin=t.chipFloorSpin,b.randomness=n.randomness;let x=this._chipLook;x.colorA.copy(a(t.colorChipA)),x.colorB.copy(a(t.colorChipB)),x.colorEdge.copy(a(t.colorChipEdge)),x.colorScene.copy(a(t.colorChipScene)),x.opacity=t.chipOpacity*n.opacity*e,x.glow=t.chipGlow*n.glow,x.rim=t.chipRim,x.rimPower=t.chipRimPower,x.shade=t.chipShade,x.ambient=t.chipAmbient,x.fadeStart=t.chipFadeStart,this.chips.sync(x),this.chips.update(this.age,b),this.motes.setGradient(a(t.colorMoteA),a(t.colorMoteB),a(t.colorMoteC),a(t.colorMoteD)),this.motes.uniforms.uGravity.value.set(0,t.moteRise,0),this.motes.uniforms.uSizeScale.value=t.moteSize*n.particleSize*7,this.motes.uniforms.uLifeScale.value=t.moteLifetime*.5*n.particleLifetime,this.motes.uniforms.uSpeedScale.value=n.particleSpeed,this.motes.uniforms.uOpacity.value=n.opacity,this.motes.uniforms.uGlow.value=1.1*n.glow,this.motes.uniforms.uTurbulence.value=t.moteTurbulence*n.turbulence,this.sparks.setGradient(a(t.colorSparkA),a(t.colorSparkB),a(t.colorSparkC),a(t.colorSparkD)),this.sparks.uniforms.uGravity.value.set(0,t.sparkGravity,0),this.sparks.uniforms.uSizeScale.value=t.sparkSize*n.particleSize*7,this.sparks.uniforms.uLifeScale.value=t.sparkLifetime*.5*n.particleLifetime,this.sparks.uniforms.uSpeedScale.value=n.particleSpeed,this.sparks.uniforms.uOpacity.value=n.opacity,this.sparks.uniforms.uGlow.value=t.fanGlow*.5*n.glow,this.sparks.uniforms.uStretch.value=t.sparkStretch,this.sparks.uniforms.uTurbulence.value=.25*n.turbulence,this.dust.setGradient(a(t.colorDustA),a(t.colorDustB),a(t.colorDustC),a(t.colorDustD)),this.dust.uniforms.uGravity.value.set(0,t.dustRise,0),this.dust.uniforms.uSizeScale.value=t.dustSize*n.particleSize,this.dust.uniforms.uLifeScale.value=t.dustLifetime*.5*n.particleLifetime,this.dust.uniforms.uSpeedScale.value=t.dustSpeed*n.particleSpeed,this.dust.uniforms.uOpacity.value=t.dustOpacity*n.opacity,this.dust.uniforms.uTurbulence.value=.3*n.turbulence}_muzzleFx(){let e=m.prismlance,t=m.global;this._handPoint(W),this.ctx.bursts.spawn(x.AIR,W,{radius:e.muzzleSize*.2,endRadius:e.muzzleSize*t.explosionIntensity,life:.32,intensity:e.muzzleIntensity,opacity:.85,fresnel:1.6,displace:.4,colorA:a(e.colorMuzzleA),colorB:a(e.colorMuzzleB),colorC:a(e.colorMuzzleC)}),this.ctx.flash.trigger(a(e.colorCastFlash),e.castFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.5*t.explosionIntensity}_splitFx(){let e=m.prismlance,t=m.global;this._prismPoint(W),this.ctx.bursts.spawn(x.AIR,W,{radius:e.splitSize*.15,endRadius:e.splitSize*t.explosionIntensity,life:.45,intensity:e.splitIntensity,opacity:.8,fresnel:2,displace:.35,squash:.7,colorA:a(e.colorSplitA),colorB:a(e.colorSplitB),colorC:a(e.colorSplitC)}),U.position=W,U.radius=.16,U.direction=G.copy(this.direction),U.speed=e.sparkSpeed*1.4,U.speedVariance=.85,U.spread=.95,U.inherit=null,U.anchor=null,U.size=.18,U.sizeVariance=.7,U.life=e.sparkLifetime,U.lifeVariance=.5,U.spin=0,U.tint=null,U.time=r.uTime.value,this.sparks.emit(Math.round(e.splitSparks*t.particleCount),U),this.ctx.flash.trigger(a(e.colorSplitC),e.splitFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.8*t.explosionIntensity}_crackFx(){let e=m.prismlance,t=m.global;this.chips.burst(this.age,Math.round(e.chipCount*t.particleCount),this._prismFraction,0),this._prismPoint(W),U.position=W,U.radius=e.chipScatter,U.direction=G.copy(this.direction).multiplyScalar(.4).setY(.6).normalize(),U.speed=e.sparkSpeed,U.speedVariance=.9,U.spread=1,U.inherit=null,U.anchor=null,U.size=.16,U.sizeVariance=.75,U.life=e.sparkLifetime*1.2,U.lifeVariance=.55,U.spin=0,U.tint=null,U.time=r.uTime.value,this.sparks.emit(Math.round(e.crackSparks*t.particleCount),U)}_shedFx(e,t){let n=m.prismlance,i=m.global,a=Math.round(this.moteEmitter.tick(e,n.moteRate*t)*i.particleCount);if(a<=0)return;let o=this.phase===D.TRAVEL?Math.max(.02,this.u):1,s=Math.ceil(a/Math.min(a,V)),c=a;for(;c>0;){let e=h(.02,1)*o;this._pathPoint(e,W),U.position=W,U.radius=.1+this._fanRadius(_((e-this._prismFraction)/Math.max(1e-4,1-this._prismFraction)))*.6,U.direction=G.set(0,1,0),U.speed=n.moteSpeed,U.speedVariance=.8,U.spread=1,U.inherit=null,U.anchor=null,U.size=.09,U.sizeVariance=.6,U.life=n.moteLifetime,U.lifeVariance=.5,U.spin=0,U.tint=null,U.time=r.uTime.value,this.motes.emit(Math.min(s,c),U),c-=s}}onTravel(e){let t=m.prismlance,n=m.global;this._splitAt<0&&this.u>=this._prismFraction&&this.u>0&&(this._splitAt=this.age,this._splitFx()),this._syncUniforms(1),this.u<=0?this._handPoint(this.position):this._pathPoint(this.u,this.position),this._shedFx(e,this.u<=0?.5:1);let r=this.u<=0?t.chargeShake*this.charge:t.rumble;this.ctx.shake.rumble(r*n.cameraShake,e)}onImpact(){let e=m.prismlance,t=m.global,n=r.uTime.value;this._impactPoint(W),this.pointAt(1,J),this.ctx.bursts.spawn(x.AIR,W,{radius:e.burstSize*.2,endRadius:e.burstSize*t.explosionIntensity,life:.65,intensity:e.burstIntensity,opacity:.9,fresnel:1.7,displace:.5,squash:.85,colorA:a(e.colorBurstA),colorB:a(e.colorBurstB),colorC:a(e.colorBurstC)}),this.ctx.decals.spawn(E.SHOCKWAVE,J,{radius:e.shockRadius*t.explosionIntensity,life:.55,width:.045,intensity:1,colorA:a(e.colorShockA),colorB:a(e.colorShockB)}),this.ctx.decals.spawn(E.SCORCH,J,{radius:e.scorchRadius*h(1.6,2.4),life:e.scorchLife,intensity:e.scorchIntensity,colorA:a(e.colorScorch),colorB:a(e.colorEmber),height:.015}),U.position=W,U.radius=.28,U.direction=G.copy(this.direction).multiplyScalar(.45).setY(.7).normalize(),U.speed=e.sparkSpeed*2,U.speedVariance=.85,U.spread=1,U.inherit=null,U.anchor=null,U.size=.2,U.sizeVariance=.8,U.life=e.sparkLifetime*1.4,U.lifeVariance=.6,U.spin=0,U.tint=null,U.time=n,this.sparks.emit(Math.round(e.burstSparks*t.particleCount),U),U.position=J,U.radius=e.scorchRadius*2,U.direction=G.set(0,1,0),U.speed=e.dustSpeed*2,U.spread=1,U.size=1.3,U.life=e.dustLifetime*1.2,U.spin=.4,this.dust.emit(Math.round(e.burstDust*t.particleCount),U),this.ctx.shake.add(e.impactShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),24),this.ctx.flash.trigger(a(e.colorFlash),e.impactFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*1.2*t.explosionIntensity}onFade(e,t){t>=1&&this._crackAt<0&&(this._crackAt=this.age,this._crackFx());let n=t<=1?1:1-v.inCubic(_(t-1));this._syncUniforms(n),this._pathPoint(1,this.position),this._shedFx(e,n*(t<=1?.7:.25))}onDestroy(){this._childCount=1,this.fanGeometry.instanceCount=1,this.chips.clear(),this.lance.materials.core.uniforms.uFade.value=0,this.lance.materials.sheath.uniforms.uFade.value=0,this.lance.materials.halo.uniforms.uFade.value=0,this.fanMaterial.uniforms.uFade.value=0,this.prismMaterial.uniforms.uFade.value=0}dispose(){this.lance.dispose(),this.chips.dispose(),this.prismGeometry.dispose(),this.prismMaterial.dispose(),this.fanGeometry.dispose(),this.fanMaterial.dispose(),super.dispose()}};export{Z as PrismLanceAbility};
//# sourceMappingURL=PrismLanceAbility-BoNqmSvd.js.map