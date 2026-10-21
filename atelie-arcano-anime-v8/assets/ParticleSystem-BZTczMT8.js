import{$t as e,Br as t,Gr as n,K as r,Qt as i,Rt as a,V as o,Y as s,_t as c,di as l,q as u,xt as d,yn as f}from"./settings-DdywqLlV.js";var p=`
#ifndef TIMEWARP_LIB_INCLUDED
#define TIMEWARP_LIB_INCLUDED

#define MAX_TIME_REGIONS 4

uniform float uTimeRegionCount;
uniform vec4  uTimeRegion[MAX_TIME_REGIONS];      // xyz centre (m), w outer radius (m)
uniform vec4  uTimeRegionWarp[MAX_TIME_REGIONS];  // x strength, y inner/outer, z hold (s), w rate

/*
 * How strongly one region holds a point. 0 outside, strength at the core.
 *
 * Both vec4s arrive as parameters rather than being fetched in here, because a
 * function cannot index a uniform array by its own argument in ESSL 1.00 — the
 * caller has to be a loop, and the loop has to do the fetch.
 *
 * The inner radius is pushed a millimetre below the outer one before the
 * smoothstep sees it. smoothstep(a, a, x) divides by zero, and a feather of
 * exactly 1 with a small radius lands there.
 */
float timeRegionFalloff(vec3 worldPos, vec4 region, vec4 warp) {
  float outer = max(region.w, 1e-4);
  float inner = min(clamp(warp.y, 0.0, 1.0) * outer, outer - 1e-3);
  float d = distance(worldPos, region.xyz);
  return clamp(warp.x, 0.0, 1.0) * (1.0 - smoothstep(inner, outer, d));
}

/*
 * Bend one clock by one region. Identity at weight 0 and at rate 1.
 * warp.z is the hold instant, warp.w the rate.
 */
float timeRegionClock(float clock, vec4 warp, float weight) {
  return mix(clock, warp.z + (clock - warp.z) * warp.w, weight);
}

/*
 * The clock a point at worldPos lives on. Only valid where the position does
 * not itself depend on the answer — see the header.
 */
float warpedTime(float clock, vec3 worldPos) {
  if (uTimeRegionCount < 0.5) return clock;
  float bent = clock;
  for (int i = 0; i < MAX_TIME_REGIONS; i++) {
    if (float(i) >= uTimeRegionCount) break;
    vec4 region = uTimeRegion[i];
    vec4 warp = uTimeRegionWarp[i];
    bent = timeRegionClock(bent, warp, timeRegionFalloff(worldPos, region, warp));
  }
  return bent;
}

/*
 * How held a point is, 0..1, strongest region wins.
 *
 * This is what lets a stasis field be seen at all. The ability draws almost
 * nothing; every other shader in the frame can desaturate, add a pale rim, or
 * kill its own flicker by this number, and the bubble appears as an absence of
 * motion with an edge you can find.
 */
float timeRegionWeight(vec3 worldPos) {
  if (uTimeRegionCount < 0.5) return 0.0;
  float held = 0.0;
  for (int i = 0; i < MAX_TIME_REGIONS; i++) {
    if (float(i) >= uTimeRegionCount) break;
    held = max(held, timeRegionFalloff(worldPos, uTimeRegion[i], uTimeRegionWarp[i]));
  }
  return held;
}

#endif
`,m=Object.freeze({SOFT:0,SMOKE:1,STREAK:2,LEAF:3,CHIP:4,RING:5}),h={start:3,origin:3,velocity:3,color:3,spawn:1,life:1,size:1,seed:1,spin:1};new d;var g=new l,_=class{constructor({name:s,capacity:u=2e3,shape:p=m.SOFT,additive:g=!0,curl:_=!1,stretch:b=!1,swirl:x=!1,lit:S=!1,softFade:C=.6}){this.name=s,this.capacity=u,this.cursor=0;let w=new e;w.setAttribute(`position`,new c(new Float32Array([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0]),3)),w.setAttribute(`uv`,new c(new Float32Array([0,0,1,0,1,1,0,1]),2)),w.setIndex(new c(new Uint16Array([0,1,2,0,2,3]),1)),this.data={},this.attributes={};for(let[e,t]of Object.entries(h)){let n=new Float32Array(u*t),r=new i(n,t).setUsage(a);this.data[e]=n,this.attributes[e]=r,w.setAttribute(`a${e[0].toUpperCase()}${e.slice(1)}`,r)}this.data.life.fill(0),w.instanceCount=u,w.boundingSphere=new n(new l,1e4),this.geometry=w;let T={SHAPE:p};_&&(T.USE_CURL=``),b&&(T.USE_STRETCH=``),x&&(T.USE_SWIRL=``),S&&(T.USE_LIT=``),this.material=new t({defines:T,transparent:!0,depthWrite:!1,depthTest:!0,blending:g?2:1,side:2,toneMapped:!1,uniforms:r({uGravity:{value:new l(0,-4.5,0)},uDrag:{value:.9},uTurbulence:{value:.6},uTurbFrequency:{value:.45},uTurbSpeed:{value:.35},uSwirl:{value:0},uSwirlExpand:{value:.4},uSpeedScale:{value:1},uSizeScale:{value:1},uLifeScale:{value:1},uEndSize:{value:.4},uSizeIn:{value:.08},uFadeIn:{value:.08},uFadeOut:{value:.55},uOpacity:{value:1},uGlow:{value:1},uStretch:{value:.15},uSoftFade:{value:C},uColor0:{value:new d(1,1,1)},uColor1:{value:new d(1,.7,.3)},uColor2:{value:new d(.6,.15,.05)},uColor3:{value:new d(.08,.06,.06)},uLightDir:{value:new l(.4,.8,.35).normalize()},uSoftness:{value:1}}),vertexShader:v,fragmentShader:y}),this.mesh=new f(w,this.material),this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=!1,this.mesh.layers.set(o.VFX),this.mesh.renderOrder=g?12:10,this.mesh.name=`Particles:${s}`,this._ranges=[],this._dirty=!1}get object3D(){return this.mesh}get uniforms(){return this.material.uniforms}emit(e,t){if(e<=0)return;e=Math.min(e,this.capacity);let{position:n,radius:r=0,direction:i=null,speed:a=1,speedVariance:o=.35,spread:s=.5,inherit:c=null,anchor:l=null,size:u=.2,sizeVariance:d=.4,life:f=1,lifeVariance:p=.3,spin:m=0,tint:h=null,time:_=0}=t,v=this.data;for(let t=0;t<e;t++){let e=this.cursor;this.cursor=(this.cursor+1)%this.capacity,this._markDirty(e);let t=e*3,y=0,b=0,x=0;if(r>0){let e=r*Math.cbrt(Math.random()),t=Math.random()*Math.PI*2,n=Math.acos(2*Math.random()-1),i=Math.sin(n);y=e*i*Math.cos(t),b=e*Math.cos(n),x=e*i*Math.sin(t)}v.start[t+0]=n.x+y,v.start[t+1]=n.y+b,v.start[t+2]=n.z+x;let S=l??n;v.origin[t+0]=S.x,v.origin[t+1]=S.y,v.origin[t+2]=S.z,i?g.copy(i):g.set(0,1,0),s>0&&(g.x+=(Math.random()-.5)*2*s,g.y+=(Math.random()-.5)*2*s,g.z+=(Math.random()-.5)*2*s),g.normalize().multiplyScalar(a*(1+(Math.random()-.5)*2*o)),c&&g.add(c),v.velocity[t+0]=g.x,v.velocity[t+1]=g.y,v.velocity[t+2]=g.z,v.spawn[e]=_,v.life[e]=Math.max(.05,f*(1+(Math.random()-.5)*2*p)),v.size[e]=Math.max(.001,u*(1+(Math.random()-.5)*2*d)),v.seed[e]=Math.random(),v.spin[e]=(Math.random()-.5)*2*m,h?(v.color[t+0]=h.r,v.color[t+1]=h.g,v.color[t+2]=h.b):(v.color[t+0]=1,v.color[t+1]=1,v.color[t+2]=1)}}countLive(e){let{spawn:t,life:n}=this.data,r=this.uniforms.uLifeScale.value,i=0;for(let a=0;a<this.capacity;a++){let o=e-t[a];o>=0&&o<=n[a]*r&&i++}return i}_markDirty(e){this._dirty=!0;let t=this._ranges,n=t[t.length-1];n&&e===n[0]+n[1]?n[1]++:t.push([e,1])}flush(){if(this._dirty){for(let[e,t]of Object.entries(h)){let n=this.attributes[e];n.needsUpdate=!0,n.clearUpdateRanges?.();for(let[e,r]of this._ranges)n.addUpdateRange?.(e*t,r*t)}this._ranges.length=0,this._dirty=!1}}setGradient(e,t,n,r){let i=this.uniforms;i.uColor0.value.copy(e),i.uColor1.value.copy(t),i.uColor2.value.copy(n),i.uColor3.value.copy(r??n)}reset(){this.data.life.fill(0),this.data.spawn.fill(-1e4);for(let e of Object.keys(h))this.attributes[e].needsUpdate=!0;this._ranges.length=0,this._dirty=!1,this.cursor=0}dispose(){this.geometry.dispose(),this.material.dispose()}},v=`
  uniform float uTime;
  uniform vec3  uGravity;
  uniform float uDrag;
  uniform float uTurbulence;
  uniform float uTurbFrequency;
  uniform float uTurbSpeed;
  uniform float uSwirl;
  uniform float uSwirlExpand;
  uniform float uSpeedScale;
  uniform float uSizeScale;
  uniform float uLifeScale;
  uniform float uEndSize;
  uniform float uSizeIn;
  uniform float uStretch;

  attribute vec3  aStart;
  attribute vec3  aOrigin;
  attribute vec3  aVelocity;
  attribute vec3  aColor;
  attribute float aSpawn;
  attribute float aLife;
  attribute float aSize;
  attribute float aSeed;
  attribute float aSpin;

  varying vec2  vUv;
  varying float vT;
  varying float vSeed;
  varying vec3  vTint;
  varying float vViewZ;
  varying vec3  vNormalish;
  /**
   * The clock this particle is actually living on — uTime for all but the
   * handful held inside a time region. The fragment stage needs it because the
   * SMOKE silhouette erodes on a clock of its own, and a puff frozen in mid-air
   * that is still churning internally is very obviously not frozen.
   */
  varying float vClock;

  ${s}
  ${p}

  /**
   * The whole trajectory, as a closed-form function of age.
   *
   * This used to be inline in main. It is a function now for one reason: a
   * particle sitting inside a stasis region has to be asked *where it was when
   * the region locked*, which means evaluating the same path at a second age in
   * the same invocation. Nothing about the arithmetic changed when it moved —
   * with no region live the function is called exactly once and the compiler
   * inlines it, so the shader that ships is the shader that shipped before.
   *
   * clock is passed rather than read from uTime so the curl advection also
   * freezes: the noise field this samples drifts on the clock, and a frozen
   * ember riding a field that is still flowing crawls sideways for as long as
   * you hold it.
   */
  vec3 particlePath(float age, float t, float clock) {
    vec3 vel = aVelocity * uSpeedScale;

    // Analytic exponential drag — exact, and independent of frame rate.
    float k = max(uDrag, 1e-3);
    float travel = (1.0 - exp(-k * age)) / k;
    vec3 pos = aStart + vel * travel + 0.5 * uGravity * age * age;

    #ifdef USE_SWIRL
      // Orbit a travelling anchor: the anchor drifts with the emitter velocity
      // while the particle's offset rotates and expands around it.
      vec3 anchor = aOrigin + vel * travel;
      vec3 rel = aStart - aOrigin;
      float ang = uSwirl * age + aSeed * 6.2831;
      float c = cos(ang), s = sin(ang);
      vec3 rotated = vec3(rel.x * c - rel.z * s, rel.y, rel.x * s + rel.z * c);
      rotated *= 1.0 + uSwirlExpand * t;
      pos = anchor + rotated + vec3(0.0, 0.5 * uGravity.y * age * age, 0.0);
    #endif

    // Turbulence: a cheap deterministic wobble, optionally upgraded to real
    // curl noise for the heavier smoke/flame systems.
    #ifdef USE_CURL
      pos += curlNoise(aStart * uTurbFrequency + vec3(0.0, clock * uTurbSpeed, 0.0) + aSeed * 4.0)
             * uTurbulence * age;
    #else
      vec3 wobble = vec3(
        sin(age * 3.1 + aSeed * 41.0),
        cos(age * 2.3 + aSeed * 17.0),
        sin(age * 2.7 + aSeed * 73.0)
      );
      pos += wobble * uTurbulence * age * 0.55;
    #endif

    return pos;
  }

  void main() {
    vUv = uv;
    vSeed = aSeed;
    vTint = aColor;

    float life = aLife * uLifeScale;
    float rawAge = uTime - aSpawn;

    /* ---- which clock is this particle on? ------------------------------
     *
     * Nothing below this comment costs anything while uTimeRegionCount is 0,
     * which is every frame in which no chrono ability is standing: one uniform
     * compare, taken the same way by every vertex in the draw.
     *
     * When a region *is* live, each slot is probed at the position this
     * particle had **on the frame that slot locked** — not at its current
     * position. The obvious version probes the current position and it thaws
     * its own freeze one frame later: the particle stops, the world clock runs
     * on, and the probe is now asking about a place the particle only occupies
     * because it is held. Probing the lock instant is a fixed point instead,
     * and it is also the right fiction — a bubble of stopped time holds
     * whatever was inside it when it snapped shut.
     *
     * The probe age is clamped into [0, min(rawAge, life)], which handles
     * three cases without a branch: a particle born after the lock probes its
     * own spawn point (so an emitter firing into a standing field has its
     * output frozen on arrival), a particle that died before the lock probes
     * its last position and is then killed by the t > 1.0 test below, and a
     * dead slot in the ring buffer — spawn time -1e4, life 0 — probes age 0
     * rather than evaluating curl noise ten thousand seconds out.
     */
    float clock = uTime;
    if (uTimeRegionCount > 0.5 && rawAge > 0.0) {
      for (int i = 0; i < MAX_TIME_REGIONS; i++) {
        if (float(i) >= uTimeRegionCount) break;
        vec4 region = uTimeRegion[i];
        vec4 warp = uTimeRegionWarp[i];
        float probeAge = clamp(warp.z - aSpawn, 0.0, min(rawAge, life));
        vec3 probe = particlePath(probeAge, probeAge / max(life, 1e-4), warp.z);
        clock = timeRegionClock(clock, warp, timeRegionFalloff(probe, region, warp));
      }
    }
    vClock = clock;

    float age = clock - aSpawn;
    float t = age / max(life, 1e-4);
    vT = t;

    // Dead particles are pushed outside the clip volume; the GPU discards the
    // whole triangle before rasterisation. This runs on the *bent* age, which
    // is what makes a region with a negative rate un-spawn its particles: they
    // fly backwards into the emitter, reach age 0, and stop existing there.
    if (age < 0.0 || t > 1.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }

    vec3 vel = aVelocity * uSpeedScale;
    vec3 pos = particlePath(age, t, clock);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vViewZ = mvPosition.z;

    // Size over lifetime.
    float grow = smoothstep(0.0, max(uSizeIn, 1e-3), t);
    float size = aSize * uSizeScale * mix(1.0, uEndSize, t) * grow;

    vec2 corner = position.xy * size;

    #ifdef USE_STRETCH
      vec3 velView = (modelViewMatrix * vec4(vel, 0.0)).xyz;
      vec2 dir = normalize(velView.xy + vec2(1e-5));
      vec2 perp = vec2(-dir.y, dir.x);
      float stretch = 1.0 + uStretch * length(vel);
      corner = dir * (position.y * size * stretch) + perp * (position.x * size);
      vNormalish = vec3(dir, 0.0);
    #else
      float rot = aSpin * age + aSeed * 6.2831;
      corner = rot2(rot) * corner;
      vNormalish = normalize(vec3(position.xy, 0.75));
    #endif

    mvPosition.xy += corner;
    gl_Position = projectionMatrix * mvPosition;
  }
`,y=`
  uniform float uTime;
  uniform float uOpacity;
  uniform float uGlow;
  uniform float uFadeIn;
  uniform float uFadeOut;
  uniform float uSoftFade;
  uniform float uSoftness;
  uniform vec3  uColor0;
  uniform vec3  uColor1;
  uniform vec3  uColor2;
  uniform vec3  uColor3;
  uniform vec3  uLightDir;
  uniform vec2  uResolution;
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;
  uniform float uGlobalGlow;

  varying vec2  vUv;
  varying float vT;
  varying float vSeed;
  varying vec3  vTint;
  varying float vViewZ;
  varying vec3  vNormalish;
  varying float vClock;   // the vertex stage's bent clock — see the vertex shader

  ${s}
  ${u}

  float shapeMask(vec2 uv) {
    vec2 c = (uv - 0.5) * 2.0;
    float d = length(c);

    #if SHAPE == 0                       // SOFT
      return smoothstep(1.0, 0.0, d);

    #elif SHAPE == 1                     // SMOKE
      // vClock, not uTime: the erosion is the one part of a puff that is
      // animated rather than parametric, so a held puff has to hold this too.
      float n = fbm3(vec3(c * 1.6, vSeed * 21.0 + vClock * 0.25));
      return smoothstep(1.0, 0.05, d + n * 0.42) * 0.9;

    #elif SHAPE == 2                     // STREAK
      float core = smoothstep(1.0, 0.0, abs(c.x) * 3.4);
      float len = smoothstep(1.0, 0.0, abs(c.y));
      return core * len;

    #elif SHAPE == 3                     // LEAF
      float w = max(0.0, 1.0 - c.y * c.y);
      float body = smoothstep(w * 0.62, w * 0.30, abs(c.x));
      float vein = smoothstep(0.06, 0.0, abs(c.x)) * 0.35;
      return clamp(body - vein * 0.4, 0.0, 1.0);

    #elif SHAPE == 4                     // CHIP
      float ang = atan(c.y, c.x);
      float r = 0.62 + 0.24 * sin(ang * 5.0 + vSeed * 30.0) + 0.1 * sin(ang * 9.0 - vSeed * 11.0);
      return smoothstep(r, r - 0.14, d);

    #else                                // RING
      return smoothstep(0.14, 0.0, abs(d - 0.82));
    #endif
  }

  void main() {
    if (vT < 0.0 || vT > 1.0) discard;

    float mask = shapeMask(vUv);
    if (mask <= 0.004) discard;

    // Alpha over lifetime.
    float fade = smoothstep(0.0, max(uFadeIn, 1e-3), vT) *
                 (1.0 - smoothstep(clamp(uFadeOut, 0.0, 0.999), 1.0, vT));

    float alpha = mask * fade * uOpacity;

    // Soft particles: fade out where the quad intersects opaque geometry.
    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.004) discard;

    vec3 color = gradient4(uColor0, uColor1, uColor2, uColor3, vT) * vTint;

    #ifdef USE_LIT
      // Cheap wrapped diffuse so opaque debris does not read as flat silhouettes.
      float ndl = dot(normalize(vNormalish), uLightDir) * 0.5 + 0.5;
      color *= mix(0.45, 1.25, ndl);
    #endif

    color *= uGlow * uGlobalGlow;

    // Non-premultiplied: three's Additive/Normal blend modes both multiply by
    // the source alpha themselves.
    gl_FragColor = vec4(color, alpha);
  }
`;export{_ as n,m as t};
//# sourceMappingURL=ParticleSystem-BZTczMT8.js.map