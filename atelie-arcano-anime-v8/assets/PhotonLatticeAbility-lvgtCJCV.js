import{$t as e,Br as t,G as n,Gr as r,K as i,Ot as a,Qt as o,R as s,V as c,Y as l,at as u,di as d,o as f,q as p,st as m,tt as h,xt as g,yn as _}from"./settings-DdywqLlV.js";import{t as v}from"./ParticleSystem-BZTczMT8.js";import{n as y}from"./ParticleEngine-DLxipNH0.js";import{n as b}from"./GroundDecals-kYmr8HKl.js";import{t as x}from"./Ability-CYesB5Ur.js";var S=`
  #define TAU 6.283185307179586

  uniform float uTime;      // seconds — the only clock this stage reads

  uniform vec3  uAnchor;    // world, on the floor, centre of the footprint
  uniform vec3  uAlong;     // unit, the cast's heading
  uniform vec3  uSide;      // unit, across it
  uniform vec3  uUp;        // unit, normally +Y

  uniform vec3  uGrid;      // node counts per axis (x across, y up, z downrange)
  uniform vec3  uSpan;      // HALF-extents of the lattice, metres
  uniform float uLift;      // metres the lattice centre floats above the floor
  uniform float uOverhang;  // metres a beam runs past the outermost node
  uniform float uSpin;      // radians the lattice is yawed about its own up
  uniform float uSeed;

  uniform float uRadius;    // metres — the core gaussian's sigma
  uniform float uHaloScale; // halo sigma as a multiple of the core's
  uniform float uHullPad;   // sigmas of tail the bounding hull has to cover

  uniform float uAssemble;  // 0..1 — how much of the lattice has been drawn in
  uniform float uStagger;   // 0..1 — how far apart the beams switch on
  uniform float uFlicker;   // 0..1 depth of the per-beam breath
  uniform float uFlickerSpeed; // breaths per second
  uniform float uFade;      // 0..1 master

  attribute float aIndex;

  varying vec3  vWorld;
  varying vec3  vOrigin;    // the beam's start, world metres
  varying vec3  vDir;       // unit, along the beam
  varying vec2  vSpan;      // metres along the beam that are drawn: (from, to)
  varying vec2  vBeam;      // x = amplitude 0..1, y = the beam's full length

  ${l}

  /**
   * Node i of n, as -1..1 across the lattice.
   *
   * A single node on an axis sits in the middle rather than at -1, because a
   * 1 x 4 x 4 lattice should be one plane of crossings and not one face of a
   * box that is not there.
   */
  float latCoord(float i, float n) {
    return n > 1.5 ? (i / (n - 1.0)) * 2.0 - 1.0 : 0.0;
  }

  void main() {
    float gx = max(floor(uGrid.x + 0.5), 1.0);
    float gy = max(floor(uGrid.y + 0.5), 1.0);
    float gz = max(floor(uGrid.z + 0.5), 1.0);
    float nAcross = gy * gz;
    float nUp = gx * gz;
    float nDown = gx * gy;

    if (aIndex > nAcross + nUp + nDown - 0.5) {
      // Collapsed off-screen rather than scaled to zero: a degenerate triangle
      // still rasterises a sliver on some drivers and this shader's fragment is
      // the expensive one.
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }

    /* ---- the lattice's own frame ---- */
    float cs = cos(uSpin);
    float sn = sin(uSpin);
    vec3 ex = normalize(uSide * cs + uAlong * sn);
    vec3 ez = normalize(uAlong * cs - uSide * sn);
    vec3 ey = uUp;
    vec3 mid = uAnchor + ey * uLift;

    /* ---- which beam is this ---- */
    vec3 dirV;
    vec3 off;
    float reach;
    if (aIndex < nAcross - 0.5) {
      float j = floor(aIndex / gz);
      float k = aIndex - j * gz;
      dirV = ex;
      reach = uSpan.x + uOverhang;
      off = ey * (latCoord(j, gy) * uSpan.y) + ez * (latCoord(k, gz) * uSpan.z);
    } else if (aIndex < nAcross + nUp - 0.5) {
      float slot = aIndex - nAcross;
      float i = floor(slot / gz);
      float k = slot - i * gz;
      dirV = ey;
      reach = uSpan.y + uOverhang;
      off = ex * (latCoord(i, gx) * uSpan.x) + ez * (latCoord(k, gz) * uSpan.z);
    } else {
      float slot = aIndex - nAcross - nUp;
      float i = floor(slot / gy);
      float j = slot - i * gy;
      dirV = ez;
      reach = uSpan.z + uOverhang;
      off = ex * (latCoord(i, gx) * uSpan.x) + ey * (latCoord(j, gy) * uSpan.y);
    }

    float len = max(2.0 * reach, 0.02);
    vec3 origin = mid + off - dirV * reach;

    /* ---- how much of it is drawn, and how bright ---- */
    float dice = hash11(aIndex * 1.7 + uSeed);
    float threshold = dice * uStagger;
    float grow = clamp((uAssemble - threshold) / max(1.0 - uStagger, 1e-3), 0.0, 1.0);

    // Drawn from the middle out. A beam that grows from one end has a *tip*,
    // and a tip travelling along a lattice edge reads as a projectile being
    // fired down a wire; growing symmetrically reads as the beam coming into
    // existence, which is what light does.
    float from = (0.5 - 0.5 * grow) * len;
    float to = (0.5 + 0.5 * grow) * len;

    float breath = 1.0 - uFlicker * 0.5 * (1.0 - cos(uTime * uFlickerSpeed * TAU + dice * TAU));
    float amp = uFade * breath * grow;

    if (amp <= 0.002 || to - from < 1e-4) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }

    vOrigin = origin;
    vDir = dirV;
    vSpan = vec2(from, to);
    vBeam = vec2(amp, len);

    /* ---- the bound ----
     * A gaussian is never zero, so the hull has to cover enough of the tail
     * that clipping it is invisible: uHullPad is in sigmas, and three is about
     * exp(-9) = 1e-4 of the peak. */
    float rad = uRadius * max(uHaloScale, 1.0) * uHullPad;
    float k = position.y + 0.5;
    float a = mix(from, to, k);
    vec3 ref = abs(dot(dirV, vec3(0.0, 1.0, 0.0))) > 0.95 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 perpA = normalize(cross(ref, dirV));
    vec3 perpB = cross(dirV, perpA);
    vec3 world = origin + dirV * a + (perpA * position.x + perpB * position.z) * rad;

    vWorld = world;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`,C=`
  uniform float uRadius;
  uniform float uHaloScale;
  uniform float uDensity;     // per metre — turns the integral into brightness
  uniform float uCoreGain;
  uniform float uHaloGain;
  uniform float uEndTaper;    // 0..1 of the beam over which the ends fade in
  uniform float uEndTint;     // 0..1 how far the ends take uColorEnd
  uniform float uPulse;       // extra brightness in the travelling band
  uniform float uPulseAt;     // 0..1 along the beam
  uniform float uPulseWidth;  // 0..1 of the beam
  uniform float uIntensity;

  uniform vec3  uColorCore;
  uniform vec3  uColorHalo;
  uniform vec3  uColorEnd;

  uniform sampler2D uSceneDepth;
  uniform vec2      uResolution;
  uniform float     uCameraNear;
  uniform float     uCameraFar;
  uniform float     uGlobalGlow;
  uniform float     uShaderIntensity;

  varying vec3  vWorld;
  varying vec3  vOrigin;
  varying vec3  vDir;
  varying vec2  vSpan;
  varying vec2  vBeam;

  ${p}

  /**
   * Winitzki's approximation to erf. Maximum absolute error about 2e-4, which
   * is four orders of magnitude better than the marched version this replaced
   * and costs one exp and one sqrt.
   */
  float erfApprox(float x) {
    float ax = abs(x);
    float x2 = ax * ax;
    float t = (1.2732395447 + 0.147 * x2) / (1.0 + 0.147 * x2);
    return sign(x) * sqrt(1.0 - exp(-x2 * t));
  }

  /**
   * The whole trick, in eight lines.
   *
   * The squared distance from the view ray to the beam's axis is exactly
   * A s^2 + 2B s + C, so completing the square gives a gaussian in (s - sm)
   * whose integral between two limits is a difference of error functions.
   * 0.8862269255 is sqrt(pi)/2.
   *
   * The A -> 0 branch is not a numerical guard bolted on afterwards: it is the
   * case where the eye is looking straight down the beam, the distance to the
   * axis is constant along the whole ray, and the answer is genuinely the
   * segment length times a constant. It is also the case that produces the
   * brightest pixel in the ability, so getting it wrong is not subtle.
   */
  float gaussLine(float qa, float qb, float qc, float s0, float s1, float sigma) {
    float inv = 1.0 / max(sigma, 1e-4);
    if (qa < 1e-8) return (s1 - s0) * exp(-qc * inv * inv);
    float rootA = sqrt(qa);
    float sm = -qb / qa;
    float floorSq = max(qc - qb * qb / qa, 0.0);
    float scale = sigma * 0.8862269255 / rootA;
    float hi = erfApprox(rootA * (s1 - sm) * inv);
    float lo = erfApprox(rootA * (s0 - sm) * inv);
    return exp(-floorSq * inv * inv) * scale * (hi - lo);
  }

  void main() {
    float amp = vBeam.x;
    float len = vBeam.y;
    if (amp <= 0.002) discard;

    vec3 ro = cameraPosition;
    vec3 rd = normalize(vWorld - ro);

    vec3 axis = vDir;
    vec3 rel = ro - vOrigin;
    float a0 = dot(rel, axis);
    float ad = dot(rd, axis);

    /* ---- the drawn part of the beam, as a range of s ---- */
    float sNear = 0.0;
    float sFar = 1e6;
    if (abs(ad) > 1e-5) {
      float s1 = (vSpan.x - a0) / ad;
      float s2 = (vSpan.y - a0) / ad;
      sNear = min(s1, s2);
      sFar = max(s1, s2);
    } else if (a0 < vSpan.x || a0 > vSpan.y) {
      discard;
    }

    /* ---- and how far the ray may go before something opaque stops it ---- */
    vec2 screenUV = gl_FragCoord.xy / uResolution;
    float depthBits = unpackRGBAToDepth(texture2D(uSceneDepth, screenUV));
    float sceneViewZ = perspectiveDepthToViewZ(depthBits, uCameraNear, uCameraFar);
    // The third row of the view matrix is the camera's own -Z in world space,
    // which converts a view-space depth into a distance along OUR ray with no
    // inverse projection.
    vec3 row2 = vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]);
    float axialCos = dot(row2, rd);
    float sScene = abs(axialCos) > 1e-4 ? sceneViewZ / axialCos : 1e6;
    if (sScene < 0.0) sScene = 1e6;

    sNear = max(sNear, 0.0);
    sFar = min(sFar, sScene);
    if (sFar <= sNear) discard;

    /* ---- the quadratic ---- */
    vec3 perpRel = rel - axis * a0;
    vec3 perpRay = rd - axis * ad;
    float qa = dot(perpRay, perpRay);
    float qb = dot(perpRay, perpRel);
    float qc = dot(perpRel, perpRel);

    float sigmaCore = max(uRadius, 1e-3);
    float sigmaHalo = sigmaCore * max(uHaloScale, 1.0);
    float core = gaussLine(qa, qb, qc, sNear, sFar, sigmaCore);
    float halo = gaussLine(qa, qb, qc, sNear, sFar, sigmaHalo);
    if (core + halo < 1e-5) discard;

    /* ---- where along the beam this pixel is looking ----
     * The closest approach, clamped into the drawn range. The axial profile is
     * evaluated once there rather than under the integral, which is the one
     * approximation in this file: it is exact for a ray crossing the beam and
     * wrong by half a taper width for a ray running along it, where the taper
     * is the least visible thing on screen anyway. */
    float sMid = qa > 1e-8 ? clamp(-qb / qa, sNear, sFar) : (sNear + sFar) * 0.5;
    float an = clamp((a0 + sMid * ad) / max(len, 1e-4), 0.0, 1.0);

    float taper = smoothstep(0.0, max(uEndTaper, 1e-3), an) *
                  smoothstep(0.0, max(uEndTaper, 1e-3), 1.0 - an);
    float dp = (an - uPulseAt) / max(uPulseWidth, 1e-3);
    float pulse = 1.0 + uPulse * exp(-dp * dp);

    float endMix = clamp(abs(an - 0.5) * 2.0, 0.0, 1.0) * clamp(uEndTint, 0.0, 1.0);
    vec3 tint = mix(uColorCore, uColorEnd, endMix);

    vec3 rgb = tint * (core * uCoreGain) + uColorHalo * (halo * uHaloGain);
    rgb *= uDensity * taper * pulse * amp * uIntensity * uShaderIntensity;

    if (max(max(rgb.r, rgb.g), rgb.b) < 0.003) discard;

    // Alpha 1 with AdditiveBlending (SrcAlpha, One): the destination gets rgb,
    // once, and two beams crossing get exactly the sum of two beams. Writing a
    // luminance into alpha instead — the obvious thing — makes the blend square
    // it, and a node would then be four times a beam rather than twice, which
    // sounds better and is a lie.
    gl_FragColor = vec4(rgb * uGlobalGlow, 1.0);
  }
`;function w(t=96,n=6){let i=Math.max(1,Math.round(t)),s=new Float32Array(i);for(let e=0;e<i;e++)s[e]=e;let c=new a(1,1,1,Math.max(3,Math.round(n)),1,!1),l=new e;return l.setAttribute(`position`,c.getAttribute(`position`)),l.setIndex(c.getIndex()),l.setAttribute(`aIndex`,new o(s,1)),l.instanceCount=0,l.boundingSphere=new r(new d,1e4),l}function T(){return new t({transparent:!0,depthWrite:!1,depthTest:!1,blending:2,side:1,toneMapped:!1,uniforms:i({uAnchor:{value:new d},uAlong:{value:new d(0,0,1)},uSide:{value:new d(1,0,0)},uUp:{value:new d(0,1,0)},uGrid:{value:new d(4,4,4)},uSpan:{value:new d(3,2,3)},uLift:{value:2.4},uOverhang:{value:.5},uSpin:{value:0},uSeed:{value:0},uRadius:{value:.05},uHaloScale:{value:4},uHullPad:{value:3.2},uAssemble:{value:0},uStagger:{value:.55},uFlicker:{value:.16},uFlickerSpeed:{value:1.4},uFade:{value:1},uDensity:{value:2.4},uCoreGain:{value:1},uHaloGain:{value:.35},uEndTaper:{value:.14},uEndTint:{value:.6},uPulse:{value:0},uPulseAt:{value:.5},uPulseWidth:{value:.16},uIntensity:{value:1},uColorCore:{value:new g(1,.98,.9)},uColorHalo:{value:new g(.62,.85,1)},uColorEnd:{value:new g(1,.78,.45)}}),vertexShader:S,fragmentShader:C})}function E(e,t,n){let r=Math.max(1,Math.round(e)),i=Math.max(1,Math.round(t)),a=Math.max(1,Math.round(n));return Math.min(96,i*a+r*a+r*i)}var D=5,O=Math.PI*2,k={},A=new d,j=new d,M=new d,N=new d(0,1,0),P=class extends x{constructor(e){super(`photonlattice`,e)}createShaders(){this.geometry=w(96,6),this.material=T(),this.mesh=new _(this.geometry,this.material),this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=!1,this.mesh.layers.set(c.VFX),this.mesh.renderOrder=12,this.mesh.visible=!1,this.group.add(this.mesh),this._seed=0,this._live=0}createParticles(){this.motes=this.ctx.particles.get(`photonlattice.mote`,{capacity:640,shape:v.SOFT,additive:!0,curl:!0,softFade:.4}),this.motes.uniforms.uDrag.value=1.5,this.motes.uniforms.uEndSize.value=.3,this.motes.uniforms.uSizeIn.value=.14,this.motes.uniforms.uFadeIn.value=.2,this.motes.uniforms.uFadeOut.value=.4,this.moteEmitter=new y}get instanceCount(){return this._live}get impactDuration(){return Math.max(.05,f.photonlattice.lifetime*f.global.lifetime)}get fadeDuration(){return Math.max(.05,f.photonlattice.fadeTime)}lightShimmer(){let e=f.photonlattice;return 1+e.lightSway*Math.sin(this.age*e.lightSwaySpeed*O)}_centrePoint(e){return this.pointAt(1,e).setY(0)}_sync(e,t,n){let r=f.photonlattice,i=f.global,a=this.material.uniforms;this._centrePoint(M),a.uAnchor.value.copy(M),a.uAlong.value.copy(this.direction),a.uSide.value.copy(this.side),a.uUp.value.copy(N);let o=Math.max(1,Math.min(D,Math.round(r.gridX))),c=Math.max(1,Math.min(D,Math.round(r.gridY))),l=Math.max(1,Math.min(D,Math.round(r.gridZ)));a.uGrid.value.set(o,c,l);let d=Math.max(.05,r.zoneRadius*r.latticeSpread);a.uSpan.value.set(d,Math.max(.05,r.latticeHeight),d),a.uLift.value=r.latticeLift,a.uOverhang.value=Math.max(0,r.latticeOverhang),a.uSpin.value=r.latticeSpin+this.age*r.latticeSpinSpeed,a.uSeed.value=this._seed,a.uRadius.value=Math.max(.001,r.beamRadius),a.uHaloScale.value=Math.max(1,r.haloScale),a.uHullPad.value=Math.max(1.2,r.hullPad),a.uDensity.value=Math.max(0,r.density)*i.glow,a.uCoreGain.value=Math.max(0,r.coreGain),a.uHaloGain.value=Math.max(0,r.haloGain),a.uEndTaper.value=Math.max(.001,r.endTaper),a.uEndTint.value=m(r.endTint),a.uIntensity.value=Math.max(0,r.intensity),a.uColorCore.value.copy(s(r.colorCore)),a.uColorHalo.value.copy(s(r.colorHalo)),a.uColorEnd.value.copy(s(r.colorEnd)),a.uAssemble.value=m(t),a.uStagger.value=Math.max(0,Math.min(.95,r.stagger)),a.uFlicker.value=m(r.flicker)*i.turbulence,a.uFlickerSpeed.value=r.flickerSpeed*i.noiseSpeed,a.uFade.value=m(e)*i.opacity,a.uPulse.value=Math.max(0,r.pulse)*u(.33,1,m(n)),a.uPulseWidth.value=Math.max(.005,r.pulseWidth);let p=this.age*r.pulseSpeed;a.uPulseAt.value=p-Math.floor(p),this._live=Math.min(96,E(o,c,l)),this.geometry.instanceCount=this._live,this.mesh.visible=this._live>0&&a.uFade.value>5e-4,this.motes.setGradient(s(r.colorMoteA),s(r.colorMoteB),s(r.colorMoteC),s(r.colorMoteD)),this.motes.uniforms.uGravity.value.set(0,r.moteRise,0),this.motes.uniforms.uSizeScale.value=r.moteSize*i.particleSize*7,this.motes.uniforms.uLifeScale.value=r.moteLifetime*.5*i.particleLifetime,this.motes.uniforms.uSpeedScale.value=r.moteSpeed*i.particleSpeed,this.motes.uniforms.uOpacity.value=i.opacity*e,this.motes.uniforms.uGlow.value=r.intensity*1.1*i.glow,this.motes.uniforms.uTurbulence.value=r.moteTurbulence*i.turbulence}_moteFx(e,t){let r=f.photonlattice,i=f.global,a=Math.round(this.moteEmitter.tick(e,r.moteRate*t)*i.particleCount);a<=0||(this._centrePoint(A),A.y=r.latticeLift,k.position=A,k.radius=Math.max(r.zoneRadius*r.latticeSpread,r.latticeHeight)*r.moteSpread,k.direction=j.set(0,1,0),k.speed=1,k.speedVariance=.9,k.spread=1,k.inherit=null,k.anchor=null,k.size=.1,k.sizeVariance=.7,k.life=r.moteLifetime,k.lifeVariance=.5,k.spin=0,k.tint=null,k.time=n.uTime.value,this.motes.emit(a,k))}_placeLight(){this._centrePoint(this.position),this.position.y=f.photonlattice.latticeLift}onSpawn(){let e=f.photonlattice,t=f.global;this.moteEmitter.reset(),this._seed=Math.random()*100,this._sync(1,0,0),this.ctx.flash.trigger(s(e.colorCastFlash),e.castFlash*t.explosionIntensity),this._placeLight()}onTravel(e){let t=h.outQuad(m(this.u));this._sync(1,t,0),this._moteFx(e,t*.5),this._placeLight()}onImpact(){let e=f.photonlattice,t=f.global;this._centrePoint(A),this.ctx.decals.spawn(b.SHOCKWAVE,A,{radius:e.shockRadius*t.explosionIntensity,life:e.shockLife,width:.04,intensity:1,colorA:s(e.colorShockA),colorB:s(e.colorShockB)}),this.ctx.shake.add(e.lockShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),24),this.ctx.flash.trigger(s(e.colorFlash),e.lockFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.5*t.explosionIntensity}onFade(e,t){let n=f.photonlattice,r=t<=1,i,a;if(r)i=1,a=1;else{let e=m(t-1);i=u(1,1-m(n.retract),h.inOutQuad(e)),a=1-h.inCubic(e)}this._sync(a,i,1),this._moteFx(e,a*(r?1:.35)),this._placeLight()}onDestroy(){this._live=0,this.geometry.instanceCount=0,this.material.uniforms.uFade.value=0,this.material.uniforms.uAssemble.value=0,this.mesh.visible=!1}dispose(){this.geometry.dispose(),this.material.dispose(),super.dispose()}};export{P as PhotonLatticeAbility};
//# sourceMappingURL=PhotonLatticeAbility-lvgtCJCV.js.map