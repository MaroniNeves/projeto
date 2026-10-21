import{B as e,Br as t,G as n,Gr as r,Jt as i,K as a,V as o,Y as s,_t as c,di as l,vt as u,xt as d,yn as f}from"./settings-DdywqLlV.js";import{n as p,t as m}from"./shaderPatch-DNdzBjlE.js";var h=Math.PI,g=Object.freeze({VOXEL:0,GRANULAR:1,EROSION:2}),_=Object.freeze({LOCAL:0,WORLD:1}),v=`
#ifndef DISSOLVE_UNIFORMS_INCLUDED
#define DISSOLVE_UNIFORMS_INCLUDED
  #define DISSOLVE_RUNGS 6

  uniform float uDisProgress;   // 0 intact, 1 gone. The one slider.
  uniform float uDisSeed;
  uniform float uDisSpace;      // 0 local, 1 world

  uniform float uDisVoxel;      // 0..1 — how much of the cube behaviour is on
  uniform float uDisCell;       // metres — the FINEST rung
  uniform float uDisRungs;      // doublings the ladder walks, 1..DISSOLVE_RUNGS
  uniform float uDisTake;       // fraction of cells a rung claims
  uniform float uDisSpan;       // progress units one cell takes to let go
  uniform float uDisBlock;      // 0..1 — how far a chunk snaps to the lattice
  uniform float uDisFacet;      // sub-lattice size, fraction of the cell
  uniform float uDisHold;       // 0..1 of a cell's life before it starts shrinking
  uniform float uDisDrift;      // metres a chunk travels
  uniform vec3  uDisDriftBias;  // unitless direction preference
  uniform float uDisLift;       // metres up
  uniform float uDisGravity;    // metres of fall, on k squared
  uniform float uDisTumble;     // radians a chunk turns
  uniform float uDisWobble;     // metres of hashed wander
  uniform float uDisWobbleRate; // radians/second

  uniform float uDisErode;      // 0..1 — how much of the threshold behaviour is on
  uniform float uDisNoiseScale; // features per metre
  uniform float uDisWarp;       // metres the field is domain-warped by
  uniform float uDisEdge;       // width of the burning band, noise units
  uniform vec3  uDisBiasDir;    // unit-ish; turns the rash into a front
  uniform float uDisBiasAmount; // threshold shift per metre along it

  uniform vec3  uDisColorEdge;  // the burning edge
  uniform vec3  uDisColorEmber; // a chunk lighting up as it lets go
  uniform float uDisGlow;
#endif
`,y=`
#ifndef DISSOLVE_VERTEX_INCLUDED
#define DISSOLVE_VERTEX_INCLUDED
  varying float vDisK;        // 0..1 — how far through letting go this chunk is
  varying float vDisRung;     // which rung claimed it
  varying float vDisRand;     // its own die
  varying vec3  vDisLocal;    // rest position, object space
  varying vec3  vDisWorld;    // rest position, world space

  /* Filled by dissolveResolve(), read by the two appliers. Globals rather than
     out-params so the two injection sites can share one evaluation. */
  vec3  gDisCentre;
  vec3  gDisAxis;
  float gDisAngle;
  float gDisK;
  float gDisCell;

  vec3 disSpin(vec3 v, vec3 axis, float a) {
    float c = cos(a);
    float s = sin(a);
    return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
  }

  /**
   * Walk the ladder and find the cell that owns this vertex.
   *
   * Runs once per vertex. The claim depends on nothing but the rest position and
   * the hashes, so it is stable for the whole cast — which is the property the
   * sliding-cell-size version did not have and the reason it reshuffled.
   */
  void dissolveResolve(vec3 rest) {
    gDisK = 0.0;
    gDisCell = uDisCell;
    gDisCentre = rest;
    gDisAxis = vec3(0.0, 1.0, 0.0);
    gDisAngle = 0.0;
    vDisRung = 0.0;
    vDisRand = 0.0;
    if (uDisVoxel <= 0.001) return;

    float rungs = max(uDisRungs, 1.0);
    float cell = max(uDisCell, 1e-4);

    for (int r = 0; r < DISSOLVE_RUNGS; r++) {
      float rf = float(r);
      if (rf >= rungs) break;
      float s = cell * exp2(rf);
      vec3 id = floor(rest / s);
      float pick = hash13(id * 0.731 + vec3(rf * 19.7 + uDisSeed));
      // The last rung claims whatever is left, or material with an unlucky hash
      // would survive the dissolve entirely and hang in the air for ever.
      float last = step(rungs - 1.5, rf);
      if (pick < uDisTake || last > 0.5) {
        float when = (rf + hash13(id * 1.317 + vec3(rf * 7.3 + uDisSeed + 31.0))) / rungs;
        gDisK = clamp((uDisProgress - when) / max(uDisSpan, 1e-3), 0.0, 1.0);
        gDisCell = s;
        gDisCentre = (id + 0.5) * s;
        float a0 = hash13(id + vec3(uDisSeed + 3.1));
        float a1 = hash13(id + vec3(uDisSeed + 8.9));
        gDisAxis = normalize(vec3(a0 - 0.5, a1 - 0.5, hash13(id + vec3(uDisSeed + 15.7)) - 0.5) +
                             vec3(1e-4, 1.0, 1e-4) * 0.001);
        gDisAngle = uDisTumble * gDisK * gDisK;
        vDisRung = rf;
        vDisRand = a0;
        break;
      }
    }
    vDisK = gDisK;
  }

  /** The normal turns with the chunk. Called from beginnormal_vertex. */
  vec3 dissolveNormal(vec3 n) {
    if (gDisAngle == 0.0) return n;
    return disSpin(n, gDisAxis, gDisAngle);
  }

  /** The position. Called from begin_vertex, after dissolveResolve(). */
  vec3 dissolveVertex(vec3 p, float time) {
    if (gDisK <= 0.0) return p;
    float k = gDisK;

    // Cube it. Snapping to a sub-lattice is what turns a detached chunk into a
    // *cube*: coplanar faces become axis-aligned steps and the silhouette goes
    // blocky. The mix ramps in over the first sliver of the chunk's life so the
    // surface does not visibly crystallise before it has started to move.
    float grid = max(gDisCell * uDisFacet, 1e-5);
    vec3 snapped = floor(p / grid + 0.5) * grid;
    p = mix(p, snapped, clamp(uDisBlock, 0.0, 1.0) * smoothstep(0.0, 0.18, k));

    // Turn about its own centre.
    p = gDisCentre + disSpin(p - gDisCentre, gDisAxis, gDisAngle);

    // Then let it go. Drift on k, the fall on k squared — one is a push and the
    // other is gravity, and giving them the same curve is why an early version
    // looked like the cubes were on strings.
    vec3 jitter = vec3(hash13(gDisCentre * 3.7 + uDisSeed) - 0.5,
                       hash13(gDisCentre * 5.1 + uDisSeed + 4.0) - 0.5,
                       hash13(gDisCentre * 7.3 + uDisSeed + 9.0) - 0.5);
    vec3 dir = normalize(jitter + uDisDriftBias + vec3(1e-5, 1e-5, 1e-5));
    p += dir * (uDisDrift * k);
    p += vec3(0.0, uDisLift * k - uDisGravity * k * k, 0.0);
    p += jitter * (uDisWobble * k * sin(time * uDisWobbleRate + jitter.x * 20.0));

    // Wink out: scale to nothing about the cell centre so the chunk vanishes
    // whole. Collapsing it toward the object's origin instead leaves a spray of
    // stretched triangles crossing the model, which is what the first one did.
    float shrink = 1.0 - smoothstep(clamp(uDisHold, 0.0, 0.98), 1.0, k);
    p = gDisCentre + (p - gDisCentre) * shrink;
    return p;
  }
#endif
`,b=`
#ifndef DISSOLVE_FRAGMENT_INCLUDED
#define DISSOLVE_FRAGMENT_INCLUDED
  varying float vDisK;
  varying float vDisRung;
  varying float vDisRand;
  varying vec3  vDisLocal;
  varying vec3  vDisWorld;

  /**
   * The erosion field.
   *
   * Sampled in local or world space by a mix, not a branch: both are already
   * varyings, the compiler folds one away when the uniform is constant, and a
   * branch here costs more than the lerp does.
   */
  float dissolveField(out float threshold) {
    vec3 sp = mix(vDisLocal, vDisWorld, clamp(uDisSpace, 0.0, 1.0));
    vec3 q = sp * max(uDisNoiseScale, 1e-3);
    // One warp octave: an unwarped fbm threshold gives round holes, and round
    // holes read as a texture. Warped, the holes get the ragged re-entrant edge
    // that says something is eating this.
    q += uDisWarp * uDisNoiseScale * vec3(snoise(q * 0.7 + 11.0), snoise(q * 0.7 + 27.0), 0.0);
    float n = fbm3(q) * 0.5 + 0.5;
    // The threshold sweeps past 1 + edge so the last of the surface goes too,
    // and the directional bias turns a rash into a front.
    float sweep = uDisProgress * (1.0 + uDisEdge * 2.0) - uDisEdge;
    threshold = sweep + dot(sp, uDisBiasDir) * uDisBiasAmount;
    return n;
  }
#endif
`;Object.freeze({uniforms:v,vertex:y,fragment:b});function x(e={}){let t={...T,...e};return{uDisProgress:{value:t.progress},uDisSeed:{value:t.seed},uDisSpace:{value:t.space},uDisVoxel:{value:t.voxel},uDisCell:{value:t.cell},uDisRungs:{value:t.rungs},uDisTake:{value:t.take},uDisSpan:{value:t.span},uDisBlock:{value:t.block},uDisFacet:{value:t.facet},uDisHold:{value:t.hold},uDisDrift:{value:t.drift},uDisDriftBias:{value:new l(t.driftBiasX,t.driftBiasY,t.driftBiasZ)},uDisLift:{value:t.lift},uDisGravity:{value:t.gravity},uDisTumble:{value:t.tumble},uDisWobble:{value:t.wobble},uDisWobbleRate:{value:t.wobbleRate},uDisErode:{value:t.erode},uDisNoiseScale:{value:t.noiseScale},uDisWarp:{value:t.warp},uDisEdge:{value:t.edge},uDisBiasDir:{value:new l(t.biasX,t.biasY,t.biasZ)},uDisBiasAmount:{value:t.biasAmount},uDisColorEdge:{value:new d(t.colorEdge)},uDisColorEmber:{value:new d(t.colorEmber)},uDisGlow:{value:t.glow}}}function S(t,n){let r=t?.userData?.uniforms??t;if(!r||!r.uDisProgress)return t;let i=n??T,a=e=>i[e]===void 0?T[e]:i[e];return r.uDisProgress.value=a(`progress`),r.uDisSeed.value=a(`seed`),r.uDisSpace.value=a(`space`),r.uDisVoxel.value=a(`voxel`),r.uDisCell.value=a(`cell`),r.uDisRungs.value=Math.max(1,Math.min(6,Math.round(a(`rungs`)))),r.uDisTake.value=a(`take`),r.uDisSpan.value=a(`span`),r.uDisBlock.value=a(`block`),r.uDisFacet.value=a(`facet`),r.uDisHold.value=a(`hold`),r.uDisDrift.value=a(`drift`),r.uDisDriftBias.value.set(a(`driftBiasX`),a(`driftBiasY`),a(`driftBiasZ`)),r.uDisLift.value=a(`lift`),r.uDisGravity.value=a(`gravity`),r.uDisTumble.value=a(`tumble`),r.uDisWobble.value=a(`wobble`),r.uDisWobbleRate.value=a(`wobbleRate`),r.uDisErode.value=a(`erode`),r.uDisNoiseScale.value=a(`noiseScale`),r.uDisWarp.value=a(`warp`),r.uDisEdge.value=a(`edge`),r.uDisBiasDir.value.set(a(`biasX`),a(`biasY`),a(`biasZ`)),r.uDisBiasAmount.value=a(`biasAmount`),e(r.uDisColorEdge.value,i.colorEdge,T.colorEdge),e(r.uDisColorEmber.value,i.colorEmber,T.colorEmber),r.uDisGlow.value=a(`glow`),t}function C(e,t={}){let{mode:r=g.VOXEL,space:i=_.LOCAL,uniforms:a=null,environment:o=null,vertex:c=``,fragment:l=``}=t,u=a??x({space:i,voxel:r===g.EROSION?0:1,erode:r===g.VOXEL?0:1}),d=e=>{Object.assign(e.uniforms,u),e.vertexShader=p(e.vertexShader,`#include <common>`,`#include <common>
       ${s}
       ${v}
       ${y}`);let t=e.vertexShader.includes(`#include <beginnormal_vertex>`);t&&(e.vertexShader=p(e.vertexShader,`#include <beginnormal_vertex>`,`#include <beginnormal_vertex>
         dissolveResolve(position);
         objectNormal = dissolveNormal(objectNormal);`)),e.vertexShader=p(e.vertexShader,`#include <begin_vertex>`,`#include <begin_vertex>
       ${t?``:`dissolveResolve(position);`}
       vDisLocal = position;
       #ifdef USE_INSTANCING
         vDisWorld = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
       #else
         vDisWorld = (modelMatrix * vec4(position, 1.0)).xyz;
       #endif
       transformed = dissolveVertex(transformed, uTimeDis);
       ${c}`),e.vertexShader=`uniform float uTimeDis;\n${e.vertexShader}`,e.uniforms.uTimeDis=n.uTime,e.fragmentShader=p(e.fragmentShader,`#include <common>`,`#include <common>
       ${s}
       ${v}
       ${b}`),e.fragmentShader=p(e.fragmentShader,`#include <clipping_planes_fragment>`,`#include <clipping_planes_fragment>
       float disThreshold;
       float disNoise = dissolveField(disThreshold);
       float disCut = mix(1.0, step(disThreshold, disNoise), clamp(uDisErode, 0.0, 1.0));
       float disEdge = clamp(uDisErode, 0.0, 1.0) *
                       (1.0 - smoothstep(disThreshold, disThreshold + max(uDisEdge, 1e-4), disNoise)) *
                       disCut;
       if (disCut < 0.5) discard;
       if (vDisK >= 0.999) discard;`),e.fragmentShader.includes(`#include <emissivemap_fragment>`)&&(e.fragmentShader=p(e.fragmentShader,`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>
         {
           // A chunk lights up as it lets go — the ember peaks in the middle of
           // its fall and is gone by the time it has shrunk away, so the eye
           // gets told which pieces are leaving.
           float ember = uDisVoxel * sin(clamp(vDisK, 0.0, 1.0) * ${h.toFixed(7)}) ;
           totalEmissiveRadiance += uDisColorEmber * ember * uDisGlow;
           totalEmissiveRadiance += uDisColorEdge * disEdge * uDisGlow;
           ${l}
         }`))};return o&&typeof o.registerShadowCasterWithPatch==`function`?o.registerShadowCasterWithPatch(e,d):m(e,d),e.userData.uniforms={...e.userData.uniforms??{},...u},e.userData.dissolve=u,e}function w(){return{progress:0,seed:0,space:_.LOCAL,voxel:1,cell:.12,rungs:4,take:.55,span:.22,block:.7,facet:.5,hold:.45,drift:.9,driftBiasX:0,driftBiasY:.35,driftBiasZ:0,lift:.35,gravity:.8,tumble:1.6,wobble:.06,wobbleRate:5.5,erode:0,noiseScale:2.4,warp:.35,edge:.12,biasX:0,biasY:0,biasZ:0,biasAmount:0,colorEdge:`#ff9a3c`,colorEmber:`#a06bff`,glow:1.2}}var T=w(),E=`
  #define PI 3.141592653589793

  uniform vec3  uOrigin;
  uniform vec3  uForward;
  uniform vec3  uSide;
  uniform float uLength;      // metres of cast the sheet covers
  uniform float uHalfWidth;   // metres either side of the line
  uniform float uFloor;       // metres — the y the heap sits on
  uniform float uHeightGain;  // multiplier on the whole heap

  ${s}
  
  #define MAX_LOBES 24

  uniform float uNow;          // the ability's age, seconds
  uniform float uSeed;
  uniform float uLobes;        // lobes alive at once, 1..MAX_LOBES
  uniform float uRate;         // lobes released per second
  uniform float uFrontSpeed;   // m/s the release point advances
  uniform float uVolume;       // cubic metres per lobe
  uniform float uVolumeJitter; // ±fraction
  uniform float uRepose;       // radians — the angle it refuses to exceed
  uniform float uExcess;       // radians above repose at release
  uniform float uSlump;        // 1/s the excess decays at
  uniform float uCreep;        // m/s the lobe's centroid crawls forward
  uniform float uScatter;      // metres of lateral scatter on release
  uniform float uWiden;        // >1 stretches a lobe across the line
  uniform float uBed;          // metres — the settled deposit left behind
  uniform float uBedRamp;      // metres the bed takes to reach full depth
  uniform float uBedWidth;     // metres, half-width of the bed
  uniform float uBedCurve;     // how sharply the bed thins toward its edges

  /**
   * Height of the heap at q = (metres along the cast, metres across it).
   *
   * The upper envelope of a train of collapsing cones. See the module header for
   * why it is a max and not a sum, and why a lobe is identified by its release
   * ordinal rather than by its slot in this loop.
   */
  float heapAt(vec2 q, out float age, out float slope, out vec2 towards) {
    float best = 0.0;
    age = 0.0;
    slope = uRepose;
    towards = vec2(0.0, 1.0);

    float ordNow = uNow * max(uRate, 1e-3);
    for (int k = 0; k < MAX_LOBES; k++) {
      float kf = float(k);
      if (kf >= uLobes) break;
      float m = floor(ordNow) - kf;      // release ordinal: this lobe's identity
      if (m < 0.0) continue;

      float birth = m / max(uRate, 1e-3);
      float a = uNow - birth;
      if (a < 0.0) continue;

      float d1 = hash11(m * 1.71 + uSeed);
      float d2 = hash11(m * 3.19 + uSeed + 11.0);

      // Over-steep at release, relaxing back toward repose. With the volume
      // held, that alone makes the lobe get shorter and wider — the collapse is
      // not animated, it is what conservation does to a decaying slope.
      float s = clamp(uRepose + uExcess * exp(-uSlump * a), 0.06, 1.45);
      float tn = tan(s);
      float vol = max(uVolume * (1.0 + (d1 - 0.5) * 2.0 * uVolumeJitter), 1e-5);
      float H = pow(3.0 * vol * tn * tn / PI, 1.0 / 3.0);

      vec2 centre = vec2(birth * uFrontSpeed + uCreep * a,
                         (d2 - 0.5) * 2.0 * uScatter);
      vec2 off = (q - centre) * vec2(1.0, 1.0 / max(uWiden, 0.05));
      float dist = length(off);
      float h = max(0.0, H - tn * dist);
      if (h > best) {
        best = h;
        age = a;
        slope = s;
        towards = dist > 1e-4 ? off / dist : vec2(0.0, 1.0);
      }
    }

    // The settled deposit the train leaves behind it. Without it the tail
    // vanishes as lobes age out of the window and the avalanche is a comet.
    float front = uNow * uFrontSpeed;
    float behind = smoothstep(0.0, max(uBedRamp, 1e-3), front - q.x);
    float across = 1.0 - clamp(abs(q.y) / max(uBedWidth, 1e-3), 0.0, 1.0);
    float bed = uBed * behind * pow(across, max(uBedCurve, 0.05));
    return max(best, bed);
  }


  attribute vec2 aGrid;       // (along 0..1, across -0.5..0.5)

  varying vec3  vWorld;
  varying vec3  vNormal;
  varying vec2  vLocal;       // metres (along, across)
  varying float vHeight;      // metres
  varying float vAge;         // seconds since the winning lobe was released
  varying float vSlope;       // radians of the winning lobe's face
  varying float vFlow;        // 0..1 — how far above repose that face is

  void main() {
    vec2 q = vec2(aGrid.x * uLength, aGrid.y * 2.0 * uHalfWidth);

    float age;
    float slope;
    vec2 towards;
    float h = heapAt(q, age, slope, towards) * uHeightGain;

    // The envelope is not differentiable at its ridges, and that is not an
    // artefact — a heap has ridges. So the normal is a forward difference at the
    // grid's own scale, which shades a ridge as the crease it actually is
    // instead of rounding it away.
    float eps = max(uLength / 96.0, 0.02);
    float a2;
    float s2;
    vec2 t2;
    float hx = heapAt(q + vec2(eps, 0.0), a2, s2, t2) * uHeightGain;
    float hz = heapAt(q + vec2(0.0, eps), a2, s2, t2) * uHeightGain;
    vec3 nLocal = normalize(vec3(-(hx - h) / eps, 1.0, -(hz - h) / eps));

    vec3 world = uOrigin + uForward * q.x + uSide * q.y;
    world.y = uFloor + h;

    vWorld = world;
    vNormal = normalize(uForward * nLocal.x + vec3(0.0, nLocal.y, 0.0) + uSide * nLocal.z);
    vLocal = q;
    vHeight = h;
    vAge = age;
    vSlope = slope;
    vFlow = clamp((slope - uRepose) / max(uExcess, 1e-3), 0.0, 1.0);

    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`,D=`
  #define PI 3.141592653589793

  uniform vec3  uLightDir;
  uniform float uShaderIntensity;

  uniform vec3  uColorFresh;    // just-collapsed material at the front
  uniform vec3  uColorSettled;  // the tail, hours old in avalanche seconds
  uniform vec3  uColorFace;     // the slip face, actively moving
  uniform vec3  uColorDeep;     // shadow inside the heap
  uniform float uAmbient;
  uniform float uWrap;          // how far light bends round a translucent grain
  uniform float uFresh;         // seconds a lobe counts as fresh for
  uniform float uGrain;
  uniform float uGrainScale;    // grains per metre
  uniform float uGlint;         // pinpoint sparkle — snow, not sand
  uniform float uGlintScale;
  uniform float uToe;           // metres of height the heap fades out over
  uniform float uOpacity;

  ${s}

  varying vec3  vWorld;
  varying vec3  vNormal;
  varying vec2  vLocal;
  varying float vHeight;
  varying float vAge;
  varying float vSlope;
  varying float vFlow;

  void main() {
    if (vHeight <= 0.0005) discard;

    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDir);
    vec3 V = normalize(cameraPosition - vWorld);

    float ndl = dot(N, L);
    float diffuse = clamp((ndl + uWrap) / (1.0 + uWrap), 0.0, 1.0);

    // Grains on a hashed lattice, not a noise threshold: value noise piles up
    // at its midpoint, so thresholding it gives either nothing or a rash.
    vec3 cell = floor(vWorld * max(uGrainScale, 1.0));
    float grain = hash13(cell);
    // The glint sits on its own, finer lattice: tie it to the grain and every
    // sparkle lands in the middle of a speckle and the snow reads as glitter
    // paper. They are different physical scales and they need different cells.
    vec3 glintCell = floor(vWorld * max(uGlintScale, 1.0));
    float glint = step(0.9955, hash13(glintCell * 1.37 + 3.0)) *
                  step(0.55, pow(clamp(dot(N, normalize(L + V)), 0.0, 1.0), 40.0)) * uGlint;

    float fresh = 1.0 - clamp(vAge / max(uFresh, 1e-3), 0.0, 1.0);
    vec3 body = mix(uColorSettled, uColorFresh, fresh);
    // The slip face is the part still above repose: it is the moving surface and
    // it is the only part of an avalanche that looks like it is going anywhere.
    body = mix(body, uColorFace, vFlow);
    body = mix(uColorDeep, body, diffuse);
    body *= 1.0 + (grain - 0.5) * 2.0 * uGrain;
    body += vec3(glint);
    body *= uAmbient + (1.0 - uAmbient) * uShaderIntensity;

    // The toe: a heap does not end at a hard line on the floor, it thins out.
    float alpha = uOpacity * smoothstep(0.0, max(uToe, 1e-4), vHeight);

    gl_FragColor = vec4(max(body, vec3(0.0)), clamp(alpha, 0.0, 1.0));
  }
`,O=class{constructor(e,n={}){let{along:s=72,across:p=40,renderOrder:m=3,layer:h=o.WORLD,name:g=`DissolveField`}=n;this.group=new i,this.group.name=g,this.group.matrixAutoUpdate=!1,e.add(this.group);let _=Math.max(2,s|0),v=Math.max(2,p|0),y=(_+1)*(v+1),b=new Float32Array(y*2);for(let e=0;e<=v;e++)for(let t=0;t<=_;t++){let n=(e*(_+1)+t)*2;b[n]=t/_,b[n+1]=e/v-.5}let x=new Uint32Array(_*v*6),S=0;for(let e=0;e<v;e++)for(let t=0;t<_;t++){let n=e*(_+1)+t,r=n+1,i=n+_+1,a=i+1;x[S++]=n,x[S++]=i,x[S++]=r,x[S++]=r,x[S++]=i,x[S++]=a}let C=new u;C.setAttribute(`position`,new c(new Float32Array(y*3),3)),C.setAttribute(`aGrid`,new c(b,2)),C.setIndex(new c(x,1)),C.boundingSphere=new r(new l,1e4),this.geometry=C,this.material=new t({name:g,transparent:!0,depthWrite:!0,depthTest:!0,side:2,toneMapped:!0,uniforms:a({uNow:{value:0},uSeed:{value:0},uOrigin:{value:new l},uForward:{value:new l(0,0,1)},uSide:{value:new l(1,0,0)},uLength:{value:12},uHalfWidth:{value:A.halfWidth},uFloor:{value:A.floor},uHeightGain:{value:A.heightGain},uLobes:{value:A.lobes},uRate:{value:A.rate},uFrontSpeed:{value:A.frontSpeed},uVolume:{value:A.volume},uVolumeJitter:{value:A.volumeJitter},uRepose:{value:A.repose},uExcess:{value:A.excess},uSlump:{value:A.slump},uCreep:{value:A.creep},uScatter:{value:A.scatter},uWiden:{value:A.widen},uBed:{value:A.bed},uBedRamp:{value:A.bedRamp},uBedWidth:{value:A.bedWidth},uBedCurve:{value:A.bedCurve},uColorFresh:{value:new d(A.colorFresh)},uColorSettled:{value:new d(A.colorSettled)},uColorFace:{value:new d(A.colorFace)},uColorDeep:{value:new d(A.colorDeep)},uAmbient:{value:A.ambient},uWrap:{value:A.wrap},uFresh:{value:A.fresh},uGrain:{value:A.grain},uGrainScale:{value:A.grainScale},uGlint:{value:A.glint},uGlintScale:{value:A.glintScale},uToe:{value:A.toe},uOpacity:{value:A.opacity}}),vertexShader:E,fragmentShader:D}),this.mesh=new f(C,this.material),this.mesh.name=g,this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=!1,this.mesh.layers.set(h),this.mesh.renderOrder=m,this.group.add(this.mesh),this._origin=new l,this._direction=new l(0,0,1),this._side=new l(1,0,0),this._length=1,this._p=k(),this.seed=0}get uniforms(){return this.material.uniforms}get drawCalls(){return 1}get visible(){return this.group.visible}set visible(e){this.group.visible=!!e}setBasis(e,t,n,r){return this._origin.copy(e),this._direction.copy(t),this._side.copy(n),this._length=Math.max(.01,r),this}roll(e=Math.random()*100){return this.seed=e,this.material.uniforms.uSeed.value=e,this}reset(){return this.mesh.visible=!1,this.material.uniforms.uNow.value=0,this}setColors(t,n,r,i){let a=this.material.uniforms;return e(a.uColorFresh.value,t,A.colorFresh),e(a.uColorSettled.value,n,A.colorSettled),e(a.uColorFace.value,r,A.colorFace),e(a.uColorDeep.value,i,A.colorDeep),this}_resolve(e){let t=this._p;for(let n in A){let r=e[n];t[n]=r===void 0?A[n]:r}return t}update(e,t){let n=this._resolve(t??A),r=this.material.uniforms;return r.uNow.value=e,r.uOrigin.value.copy(this._origin),r.uForward.value.copy(this._direction),r.uSide.value.copy(this._side),r.uLength.value=this._length,r.uHalfWidth.value=n.halfWidth,r.uFloor.value=n.floor,r.uHeightGain.value=n.heightGain,r.uLobes.value=Math.max(1,Math.min(24,Math.round(n.lobes))),r.uRate.value=n.rate,r.uFrontSpeed.value=n.frontSpeed,r.uVolume.value=n.volume,r.uVolumeJitter.value=n.volumeJitter,r.uRepose.value=n.repose,r.uExcess.value=n.excess,r.uSlump.value=n.slump,r.uCreep.value=n.creep,r.uScatter.value=n.scatter,r.uWiden.value=n.widen,r.uBed.value=n.bed,r.uBedRamp.value=n.bedRamp,r.uBedWidth.value=n.bedWidth,r.uBedCurve.value=n.bedCurve,r.uAmbient.value=n.ambient,r.uWrap.value=n.wrap,r.uFresh.value=n.fresh,r.uGrain.value=n.grain,r.uGrainScale.value=n.grainScale,r.uGlint.value=n.glint,r.uGlintScale.value=n.glintScale,r.uToe.value=n.toe,r.uOpacity.value=n.opacity,this.mesh.visible=n.opacity>0&&n.heightGain>0,this}frontPoint(e,t,n){let r=t?.frontSpeed??A.frontSpeed,i=Math.min(e*r,this._length);return n.copy(this._origin).addScaledVector(this._direction,i).setY((t?.floor??A.floor)+(t?.bed??A.bed))}crestHeight(e,t){let n=t??A,r=Math.max(n.rate??A.rate,.001),i=(e*r-Math.floor(e*r))/r,a=Math.max(.06,Math.min(1.45,(n.repose??.6)+(n.excess??.2)*Math.exp(-(n.slump??2)*i))),o=Math.tan(a),s=Math.max(n.volume??A.volume,1e-5);return Math.cbrt(3*s*o*o/h)*(n.heightGain??1)}dispose(){this.geometry.dispose(),this.material.dispose(),this.group.parent?.remove(this.group)}};function k(){return{halfWidth:3.2,floor:.005,heightGain:1,lobes:16,rate:5,frontSpeed:7,volume:1.4,volumeJitter:.45,repose:.58,excess:.21,slump:2.4,creep:1.6,scatter:.9,widen:1.4,bed:.22,bedRamp:2.5,bedWidth:2.6,bedCurve:.6,ambient:.5,wrap:.5,fresh:.7,grain:.12,grainScale:70,glint:.5,glintScale:120,toe:.06,opacity:1,colorFresh:`#f2f6fb`,colorSettled:`#cfd8e4`,colorFace:`#ffffff`,colorDeep:`#6d7f96`}}var A=k();export{x as a,w as i,g as n,C as o,_ as r,S as s,O as t};
//# sourceMappingURL=Dissolve-DOkbDg8t.js.map