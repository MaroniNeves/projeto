import{$t as e,Br as t,G as n,K as r,Kr as i,Qt as a,R as o,V as s,Y as c,_t as l,di as u,g as d,h as f,o as p,ot as m,q as h,st as g,xt as _,y as v,yn as y}from"./settings-DdywqLlV.js";import{t as b}from"./ParticleSystem-BZTczMT8.js";import{n as x}from"./ParticleEngine-DLxipNH0.js";import{n as S}from"./GroundDecals-kYmr8HKl.js";import{n as C,t as w}from"./Ability-CYesB5Ur.js";import{n as T,r as E,t as D}from"./GroundField-aLIZg3d3.js";var O=`
  #define FILM_SAMPLES 14
  #define FILM_LAMBDA_MIN 400.0
  #define FILM_LAMBDA_SPAN 300.0

  /* A Gaussian with a different width either side of its peak. */
  float lobe(float w, float mu, float sLow, float sHigh) {
    float s = w < mu ? sLow : sHigh;
    float t = (w - mu) / max(s, 1e-3);
    return exp(-0.5 * t * t);
  }

  /*
   * Multi-lobe piecewise-Gaussian fit of the CIE 1931 2-degree observer.
   * Three lobes for x-bar (one of them negative, which is real — x-bar dips
   * below zero around 500 nm and dropping that lobe warms every cyan band by a
   * visible amount), two each for y-bar and z-bar.
   */
  vec3 cieFit(float w) {
    float cx = 1.056 * lobe(w, 599.8, 37.9, 31.0)
             + 0.362 * lobe(w, 442.0, 16.0, 26.7)
             - 0.065 * lobe(w, 501.1, 20.4, 26.2);
    float cy = 0.821 * lobe(w, 568.8, 46.9, 40.5)
             + 0.286 * lobe(w, 530.9, 16.3, 31.1);
    float cz = 1.217 * lobe(w, 437.0, 11.8, 36.0)
             + 0.681 * lobe(w, 459.0, 26.0, 13.8);
    return vec3(cx, cy, cz);
  }

  /* CIE XYZ (D65) to linear sRGB. Clamped by the caller, not here. */
  vec3 xyzToLinear(vec3 c) {
    return vec3(
       3.2406 * c.x - 1.5372 * c.y - 0.4986 * c.z,
      -0.9689 * c.x + 1.8758 * c.y + 0.0415 * c.z,
       0.0557 * c.x - 0.2040 * c.y + 1.0570 * c.z
    );
  }

  /*
   * The interference colour of a film d nanometres thick, seen at cosI against
   * its normal, with refractive index ior.
   *
   * Returns linear sRGB normalised so a perfectly reflecting film integrates to
   * roughly unit luminance — i.e. the *hue and saturation* of the reflection.
   * How much light there is at all is the caller's fresnel term, deliberately
   * kept separate so nobody can quietly turn this back into a fresnel ramp.
   */
  vec3 filmColour(float d, float cosI, float ior) {
    float n = max(ior, 1.001);
    float sin2 = max(0.0, 1.0 - cosI * cosI);
    /* Snell, inside the film. Grazing rays travel further through it, which is
       why the bands crowd toward the silhouette of a sphere. */
    float cosT = sqrt(max(0.0, 1.0 - sin2 / (n * n)));
    float opd = 2.0 * n * d * cosT;          //  nanometres

    vec3 xyz = vec3(0.0);
    float weight = 0.0;
    for (int i = 0; i < FILM_SAMPLES; i++) {
      float lambda = FILM_LAMBDA_MIN + FILM_LAMBDA_SPAN * (float(i) + 0.5) / float(FILM_SAMPLES);
      /* The half-wave from the hard front reflection is folded into the sign:
         I = 0.5*(1 + cos(2*pi*opd/lambda + pi)). */
      float intensity = 0.5 - 0.5 * cos(6.283185307179586 * opd / lambda);
      vec3 bar = cieFit(lambda);
      xyz += bar * intensity;
      weight += bar.y;
    }
    xyz /= max(weight, 1e-4);
    return max(xyzToLinear(xyz), vec3(0.0));
  }
`,k=`
  #define PI 3.141592653589793
  #define TAU 6.283185307179586

  uniform float uAge;            // seconds since the cage was raised
  uniform vec3  uCentre;         // cage centre, world metres
  uniform float uSeed;           // per-cast dice roll, unitless

  /* --- the cage --- */
  uniform float uCageRadius;     // metres from the centre to a bubble's centre
  uniform float uCageSquash;     // vertical scale on the cage sphere, unitless
  uniform float uBreathe;        // radial pulse, fraction of uCageRadius
  uniform float uBreatheSpeed;   // Hz
  uniform float uJostle;         // tangential slop, metres
  uniform float uJostleSpeed;    // Hz

  /* --- one bubble --- */
  uniform float uBubbleRadius;   // metres, before aScale
  uniform float uStagger;        // seconds between the first bubble and the last
  uniform float uInflate;        // seconds one bubble takes to reach full size
  uniform float uOvershoot;      // how far past full size it goes on the way
  uniform float uSwell;          // extra radius as the film gives out, fraction

  /* --- the rupture --- */
  uniform float uPopAt;          // seconds after birth the film gives way
  uniform float uPopSpread;      // seconds of scatter on that, × aPop
  uniform float uBurstTime;      // seconds the hole takes to eat the bubble
  uniform float uRuptureJitter;  // radians the rupture wanders off the crown

  attribute vec3  aDir;          // unit direction on the cage — a dice roll
  attribute float aSeed;         // 0..1 decorrelation
  attribute float aScale;        // 0..2 size fraction
  attribute float aPop;          // 0..1 where in uPopSpread this one sits

  varying vec3  vNormalW;
  varying vec3  vViewW;
  varying vec3  vLocalN;         // the point on the film, in the bubble's frame
  varying vec3  vRupture;        // unit direction of the rupture, same frame
  varying float vSeed;
  varying float vLife;           // 0 at birth, 1 at the pop
  varying float vBurst;          // 0 before the pop, then 0..1 through it
  varying float vBorn;           // 0..1 inflation
  varying float vViewZ;

  ${c}

  void main() {
    vec3 dir = normalize(aDir);

    /* --- this bubble's own clock --- */
    float local = uAge - aSeed * max(uStagger, 0.0);
    float born  = clamp(local / max(uInflate, 0.02), 0.0, 1.0);
    float popAt = max(uPopAt + aPop * uPopSpread, 0.05);
    vLife  = clamp(local / popAt, 0.0, 1.0);
    vBurst = clamp((local - popAt) / max(uBurstTime, 0.01), 0.0, 1.0);
    vBorn  = born;

    /* Inflation with a real overshoot: a bubble blown off a wand snaps past its
       resting size and settles back. Easing straight in reads as a balloon on a
       pump, which is the wrong kind of slow. */
    float grow = smoothstep(0.0, 1.0, born);
    grow *= 1.0 + uOvershoot * sin(born * PI) * (1.0 - born);
    grow *= 1.0 + uSwell * smoothstep(0.62, 1.0, vLife);

    /* --- where the bubble sits on the cage --- */
    float breathe = 1.0 + uBreathe * sin(uAge * TAU * uBreatheSpeed + aSeed * TAU + uSeed);
    vec3 wob = vec3(
      snoise(dir * 1.7 + vec3(uAge * uJostleSpeed, aSeed * 9.1, uSeed)),
      snoise(dir * 1.7 + vec3(aSeed * 9.1, uAge * uJostleSpeed + 4.0, uSeed)),
      snoise(dir * 1.7 + vec3(uSeed, aSeed * 9.1, uAge * uJostleSpeed + 8.0))
    );
    /* Tangential only. A radial component would make the cage boil in and out
       and fight the breathe term, which is the one that is supposed to do that. */
    wob -= dir * dot(wob, dir);

    /* The squash is applied to the *offset*, not to the bubble, so the cage
       flattens into a dome while every bubble on it stays round. Scaling the
       geometry instead gives you a cage of eggs. */
    vec3 offset = vec3(dir.x, dir.y * uCageSquash, dir.z) * (uCageRadius * breathe);
    vec3 centre = uCentre + offset + wob * uJostle;
    float radius = max(uBubbleRadius, 0.0) * aScale * grow;

    vec3 nLocal = normalize(normal);
    vec3 world = centre + nLocal * radius;

    /* --- where the film will give way --- */
    /* The crown, jittered. Drainage makes the top the thinnest part of any
       bubble, so that is where it goes; the jitter is what stops thirty bubbles
       all bursting from the same pixel of their own north pole. */
    float ja = hash11(aSeed * 31.7 + uSeed) * TAU;
    float jb = hash11(aSeed * 13.1 + 5.0) * uRuptureJitter;
    vRupture = normalize(vec3(sin(jb) * cos(ja), cos(jb), sin(jb) * sin(ja)));

    vLocalN  = nLocal;
    vNormalW = nLocal;
    vViewW = cameraPosition - world;
    vSeed = aSeed;

    vec4 mv = viewMatrix * vec4(world, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,A=`
  #define PI 3.141592653589793

  uniform float uAge;
  uniform vec2  uResolution;
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;
  uniform vec3  uLightDir;
  uniform float uGlobalGlow;

  /* --- the film --- */
  uniform float uThickness;      // nanometres at the foot of the bubble
  uniform float uIor;            // refractive index of the film
  uniform float uDrain;          // 0..1 how much thinner the crown is
  uniform float uDrainSeed;      // 0..1 of that drainage present at birth
  uniform float uMarble;         // 0..1 thickness variation from convection
  uniform float uMarbleScale;    // marbling features per bubble
  uniform float uFlow;           // Hz the marbling creeps
  uniform float uThinRate;       // fraction of thickness lost by the pop

  /* --- how much light comes back --- */
  uniform float uReflect;        // normal-incidence reflectance
  uniform float uFresnel;        // Schlick exponent
  uniform float uFilmGain;       // master on the interference term
  uniform float uFilmSat;        // 0 = the film in grey, 1 = as computed
  uniform float uRim;            // wash on the silhouette
  uniform float uRimPower;
  uniform float uSheen;          // the specular glint
  uniform float uSheenSharp;
  uniform float uBurstFlash;     // brightness of the retracting rim
  uniform float uBurstWidth;     // radians of that rim

  uniform float uOpacity;
  uniform float uGlow;
  uniform float uSoftFade;
  uniform float uFade;

  uniform vec3  uColorBody;      // the water's own tint, under the interference
  uniform vec3  uColorBlack;     // what a film thinner than a quarter-wave is
  uniform vec3  uColorSheen;     // the glint
  uniform vec3  uColorRim;       // the silhouette wash

  varying vec3  vNormalW;
  varying vec3  vViewW;
  varying vec3  vLocalN;
  varying vec3  vRupture;
  varying float vSeed;
  varying float vLife;
  varying float vBurst;
  varying float vBorn;
  varying float vViewZ;

  ${h}
  ${c}
  ${O}

  /*
   * Film thickness at this point, nanometres.
   *
   * Gravity drains a real film downward, so the crown is thin and the foot is
   * thick, and the gradient steepens as the bubble ages. uThinRate is the whole
   * film losing water at once, which is what actually kills it.
   */
  float thicknessAt(vec3 nl, float seed, float life) {
    float crown = 0.5 + 0.5 * nl.y;
    float drain = clamp(uDrain, 0.0, 1.0) * (uDrainSeed + (1.0 - uDrainSeed) * life);
    float d = uThickness * (1.0 - drain * crown);
    d *= 1.0 - clamp(uThinRate, 0.0, 1.0) * life;
    /* Marbling. Sampled on the surface direction, not on world space: the
       swirls belong to this bubble and have to ride it, and a world-space field
       makes every bubble look cut out of one block of marble. */
    float swirl = fbm3(nl * uMarbleScale + vec3(0.0, -uFlow * uAge, seed * 27.0));
    d *= 1.0 + uMarble * swirl;
    return max(d, 0.0);
  }

  void main() {
    /* --- the hole, cut before anything is shaded --- */
    float away = acos(clamp(dot(vLocalN, vRupture), -1.0, 1.0));
    float hole = PI * pow(clamp(vBurst, 0.0, 1.0), 0.65);
    if (away < hole) discard;
    float retract = smoothstep(hole + max(uBurstWidth, 1e-3), hole, away) * step(0.001, vBurst);

    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vViewW);
    /* abs(), because the material is double sided and the far wall of the
       bubble is seen from behind. That second wall is not a cheat — it is why a
       bubble reads as hollow, and its interference is genuinely a different
       colour because the view angle across it is different. */
    float cosI = abs(dot(N, V));

    float d = thicknessAt(vLocalN, vSeed, vLife);
    vec3 hue = filmColour(d, cosI, uIor);
    hue = mix(vec3(dot(hue, vec3(0.2126, 0.7152, 0.0722))), hue, clamp(uFilmSat, 0.0, 2.0));

    /* As the film goes below a quarter-wave the interference term goes to zero
       on its own — the black film is not painted on. uColorBlack only decides
       what little is left, so the crown can be given a hint of the room instead
       of a hard hole. */
    float lum = dot(hue, vec3(0.2126, 0.7152, 0.0722));
    vec3 colour = mix(uColorBlack, hue * uColorBody, clamp(lum * 3.0, 0.0, 1.0));

    /* Amplitude, and only amplitude. */
    float schlick = uReflect + (1.0 - uReflect) * pow(1.0 - cosI, max(uFresnel, 0.1));
    colour *= schlick * uFilmGain;

    /* The wash that keeps the silhouette legible at twenty metres. */
    float rim = pow(1.0 - cosI, max(uRimPower, 0.1));
    colour += uColorRim * rim * uRim;

    /* One glint. A soap bubble has exactly one bright highlight and a broad
       specular lobe turns it into a plastic marble. */
    vec3 H = normalize(normalize(uLightDir) + V);
    colour += uColorSheen * pow(max(dot(N, H), 0.0), max(uSheenSharp, 1.0)) * uSheen * schlick;

    /* The retracting rim carries the film it has swallowed. */
    colour += uColorSheen * retract * uBurstFlash;

    float alpha = clamp(schlick * (0.22 + 0.78 * lum) + rim * uRim * 0.4 + retract, 0.0, 1.0);
    alpha *= uOpacity * uFade * smoothstep(0.0, 0.35, vBorn);
    if (alpha < 0.004) discard;

    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.004) discard;

    colour *= uGlow * uGlobalGlow;
    gl_FragColor = vec4(clamp(colour, 0.0, 48.0), alpha);
  }
`;function j(t=64,n=26,r=18){let o=new i(1,n,r),s=new e;s.setIndex(new l(Uint16Array.from(o.getIndex().array),1));for(let e of[`position`,`normal`,`uv`]){let t=o.getAttribute(e);s.setAttribute(e,new l(Float32Array.from(t.array),t.itemSize))}return o.dispose(),s.setAttribute(`aDir`,new a(new Float32Array(t*3),3)),s.setAttribute(`aSeed`,new a(new Float32Array(t),1)),s.setAttribute(`aScale`,new a(new Float32Array(t),1)),s.setAttribute(`aPop`,new a(new Float32Array(t),1)),s.instanceCount=0,s.boundingSphere=null,s}function M(){let e=new t({transparent:!0,depthWrite:!1,depthTest:!0,blending:2,side:2,toneMapped:!1,uniforms:r({uAge:{value:0},uCentre:{value:new u},uSeed:{value:0},uFade:{value:1},uCageRadius:{value:3.2},uCageSquash:{value:.72},uBreathe:{value:.05},uBreatheSpeed:{value:.35},uJostle:{value:.16},uJostleSpeed:{value:.4},uBubbleRadius:{value:.9},uStagger:{value:.5},uInflate:{value:.35},uOvershoot:{value:.22},uSwell:{value:.1},uPopAt:{value:2.1},uPopSpread:{value:1.7},uBurstTime:{value:.16},uRuptureJitter:{value:.7},uThickness:{value:420},uIor:{value:1.34},uDrain:{value:.55},uDrainSeed:{value:.3},uMarble:{value:.3},uMarbleScale:{value:2.1},uFlow:{value:.25},uThinRate:{value:.72},uReflect:{value:.06},uFresnel:{value:3.4},uFilmGain:{value:9},uFilmSat:{value:1},uRim:{value:.35},uRimPower:{value:3},uSheen:{value:1.4},uSheenSharp:{value:90},uBurstFlash:{value:1.6},uBurstWidth:{value:.12},uOpacity:{value:1},uGlow:{value:1.5},uSoftFade:{value:.35},uColorBody:{value:new _(`#bfe8ff`)},uColorBlack:{value:new _(`#0a1420`)},uColorSheen:{value:new _(`#ffffff`)},uColorRim:{value:new _(`#4fd8d0`)}}),vertexShader:k,fragmentShader:A});return e.userData.sync=t=>{let n=p.bubblecage,r=p.global,i=e.uniforms;i.uCentre.value.copy(t.centre),i.uAge.value=t.age,i.uSeed.value=t.seed,i.uFade.value=t.fade,i.uCageRadius.value=n.zoneRadius*n.cageRadius,i.uCageSquash.value=n.cageSquash,i.uBreathe.value=n.cageBreathe,i.uBreatheSpeed.value=n.cageBreatheSpeed*r.noiseSpeed,i.uJostle.value=n.cageJostle*r.randomness,i.uJostleSpeed.value=n.cageJostleSpeed*r.noiseSpeed,i.uBubbleRadius.value=n.zoneRadius*n.bubbleRadius,i.uStagger.value=n.bubbleStagger,i.uInflate.value=n.bubbleInflate,i.uOvershoot.value=n.bubbleOvershoot,i.uSwell.value=n.bubbleSwell,i.uPopAt.value=Math.max(.05,n.popTime*(1-n.popCollapse*t.collapse)),i.uPopSpread.value=n.popSpread*(1-t.collapse),i.uBurstTime.value=n.popBurstTime,i.uRuptureJitter.value=n.popJitter,i.uThickness.value=n.filmThickness,i.uIor.value=n.filmIor,i.uDrain.value=n.filmDrain,i.uDrainSeed.value=n.filmDrainSeed,i.uMarble.value=n.filmMarble*r.noiseStrength,i.uMarbleScale.value=n.filmMarbleScale*r.noiseFrequency,i.uFlow.value=n.filmFlow*r.noiseSpeed,i.uThinRate.value=n.filmThinRate,i.uReflect.value=n.filmReflect,i.uFresnel.value=n.filmFresnel*r.fresnel,i.uFilmGain.value=n.filmGain*r.shaderIntensity,i.uFilmSat.value=n.filmSaturation,i.uRim.value=n.filmRim,i.uRimPower.value=n.filmRimPower,i.uSheen.value=n.filmSheen,i.uSheenSharp.value=n.filmSheenSharp,i.uBurstFlash.value=n.popFlash,i.uBurstWidth.value=n.popRimWidth,i.uOpacity.value=n.filmOpacity*r.opacity,i.uGlow.value=n.filmGlow*r.glow,i.uSoftFade.value=n.filmSoftFade,i.uColorBody.value.copy(o(n.colorFilmBody)),i.uColorBlack.value.copy(o(n.colorFilmBlack)),i.uColorSheen.value.copy(o(n.colorFilmSheen)),i.uColorRim.value.copy(o(n.colorFilmRim))},e}var N=Math.PI*2,P=Math.PI*(3-Math.sqrt(5)),F=64,I={},L=new u,R=new u,z=new u,B=E(),V=class extends w{constructor(e){super(`bubblecage`,e)}createShaders(){this.bell=new f({mode:d.DOME,prefix:`bell`,nodes:40,sides:52}),this.group.add(this.bell.group),this.filmGeometry=j(F,26,18),this.filmMaterial=M(),this.filmMesh=new y(this.filmGeometry,this.filmMaterial),this.filmMesh.frustumCulled=!1,this.filmMesh.matrixAutoUpdate=!1,this.filmMesh.layers.set(s.VFX),this.filmMesh.renderOrder=13,this.group.add(this.filmMesh),this.pool=new D(this.group,{mode:T.POOL,depthTest:!0,name:`bubblecage.pool`}),this._seed=0,this._count=0,this._dirs=new Float32Array(F*3),this._seeds=new Float32Array(F),this._scales=new Float32Array(F),this._pops=new Float32Array(F),this._burst=new Uint8Array(F),this._state={origin:new u,axis:new u(0,1,0),side:new u(1,0,0),span:0,t:0,fade:1,seed:0},this._film={centre:new u,age:0,seed:0,fade:1,collapse:0}}createParticles(){let e=this.ctx.particles;this.drops=e.get(`bubblecage.drops`,{capacity:2400,shape:b.SOFT,additive:!1,lit:!0,softFade:.2}),this.drops.uniforms.uDrag.value=.9,this.drops.uniforms.uEndSize.value=.5,this.drops.uniforms.uSizeIn.value=.04,this.drops.uniforms.uFadeIn.value=.05,this.drops.uniforms.uFadeOut.value=.5,this.mist=e.get(`bubblecage.mist`,{capacity:1800,shape:b.SMOKE,additive:!1,curl:!0,softFade:1}),this.mist.uniforms.uDrag.value=2.4,this.mist.uniforms.uEndSize.value=2.6,this.mist.uniforms.uSizeIn.value=.12,this.mist.uniforms.uFadeIn.value=.18,this.mist.uniforms.uFadeOut.value=.35,this.fizz=e.get(`bubblecage.fizz`,{capacity:1600,shape:b.SOFT,additive:!0,curl:!0,softFade:.3}),this.fizz.uniforms.uDrag.value=1.1,this.fizz.uniforms.uEndSize.value=1.4,this.fizz.uniforms.uSizeIn.value=.1,this.fizz.uniforms.uFadeIn.value=.1,this.fizz.uniforms.uFadeOut.value=.45,this.dropEmitter=new x,this.mistEmitter=new x,this.fizzEmitter=new x}_bellSpan(){return Math.max(.02,p.bubblecage.bellTime*p.global.lifetime)}_holdSpan(){return Math.max(.05,p.bubblecage.holdTime*p.global.lifetime)}get impactDuration(){return this._bellSpan()+this._holdSpan()}get fadeDuration(){return Math.max(.05,p.bubblecage.fadeTime)}get instanceCount(){let e=0;for(let t=0;t<this._count;t++)this._burst[t]||e++;return e}_clock(){return this.phase===C.FADE?this.impactDuration+this.fadeTime:this.phase===C.TRAVEL?0:this.impactTime}_collapse(){return this.phase===C.FADE?g(this.fadeTime/this.fadeDuration):0}lightShimmer(){let e=p.bubblecage;return 1-g(e.cageBreathe*4)*(.5-.5*Math.cos(this.age*N*e.cageBreatheSpeed))}_cageCentre(e){let t=p.bubblecage;return this.pointAt(1,e),e.y=t.zoneRadius*t.cageRadius*t.cageSquash+t.cageLift,e}_bubblePoint(e,t){let n=p.bubblecage,r=n.zoneRadius*n.cageRadius,i=this._seeds[e],a=1+n.cageBreathe*Math.sin(this._clock()*N*n.cageBreatheSpeed+i*N+this._seed);this._cageCentre(t);let o=r*a;return t.x+=this._dirs[e*3]*o,t.y+=this._dirs[e*3+1]*o*n.cageSquash,t.z+=this._dirs[e*3+2]*o,t}_popDeadline(e){let t=p.bubblecage,n=this._seeds[e]*Math.max(0,t.bubbleStagger),r=this._collapse();return n+Math.max(.05,t.popTime*(1-t.popCollapse*r))+this._pops[e]*t.popSpread*(1-r)}_plant(){let e=p.bubblecage,t=Math.max(1,Math.min(F,Math.round(e.bubbles))),n=g(e.bubbleScatter)*p.global.randomness,r=Math.random()*N;for(let e=0;e<t;e++){let i=1-(e+.5)*2/t,a=Math.sqrt(Math.max(0,1-i*i)),o=e*P+r;this._dirs[e*3]=Math.cos(o)*a,this._dirs[e*3+1]=i,this._dirs[e*3+2]=Math.sin(o)*a,this._seeds[e]=Math.random(),this._scales[e]=1+m(-n,n),this._pops[e]=Math.random(),this._burst[e]=0}let i=this.filmGeometry.attributes;i.aDir.array.set(this._dirs.subarray(0,t*3)),i.aSeed.array.set(this._seeds.subarray(0,t)),i.aScale.array.set(this._scales.subarray(0,t)),i.aPop.array.set(this._pops.subarray(0,t)),i.aDir.needsUpdate=!0,i.aSeed.needsUpdate=!0,i.aScale.needsUpdate=!0,i.aPop.needsUpdate=!0,this._count=t,this.filmGeometry.instanceCount=0}onSpawn(){this.dropEmitter.reset(),this.mistEmitter.reset(),this.fizzEmitter.reset(),this._seed=Math.random()*100,this._plant(),this.bell.visible=!0,this.pool.setVisible(!1),this._sync(0)}_sync(e){let t=p.bubblecage,n=p.global;this._cageCentre(this._film.centre),this._film.age=this._clock(),this._film.seed=this._seed,this._film.fade=e,this._film.collapse=this._collapse(),this.filmMaterial.userData.sync(this._film);let r=this._clock();B.centre=this.pointAt(1,L),B.yaw=Math.atan2(this.direction.x,this.direction.z),B.height=t.poolHeight,B.radius=Math.max(.05,t.zoneRadius*t.poolRadius),B.grow=g(r/Math.max(.02,t.poolGrow)),B.recede=this._collapse()*g(t.poolDry),B.fade=e,B.seed=this._seed,B.edge=t.poolEdge,B.ragged=t.poolRagged,B.raggedScale=t.poolRaggedScale*n.noiseFrequency,B.warp=t.poolWarp*n.noiseStrength,B.relief=t.poolRelief,B.normalStep=t.poolNormalStep,B.ambient=t.poolAmbient,B.wrap=t.poolWrap,B.specular=t.poolSpecular,B.gloss=t.poolGloss,B.cell=t.poolCell*n.noiseFrequency,B.depth=t.poolDepth,B.lift=t.poolLift,B.thickness=t.poolThickness,B.detail=t.poolDetail,B.flow=t.poolFlow,B.speed=t.poolSpeed*n.noiseSpeed,B.windAngle=t.poolWind,B.emissive=t.poolEmissive,B.opacity=t.poolOpacity,B.opacityScale=n.opacity,B.noiseStrength=n.noiseStrength,B.noiseFrequency=n.noiseFrequency,B.noiseSpeed=n.noiseSpeed,B.colorBase=t.colorPoolBase,B.colorEdge=t.colorPoolEdge,B.colorGlow=t.colorPoolGlow,B.colorDeep=t.colorPoolDeep,this.pool.update(B),this.drops.setGradient(o(t.colorDropA),o(t.colorDropB),o(t.colorDropC),o(t.colorDropD)),this.drops.uniforms.uGravity.value.set(0,t.dropGravity,0),this.drops.uniforms.uSizeScale.value=t.dropSize*n.particleSize*7,this.drops.uniforms.uLifeScale.value=t.dropLifetime*.5*n.particleLifetime,this.drops.uniforms.uSpeedScale.value=n.particleSpeed,this.drops.uniforms.uOpacity.value=n.opacity,this.mist.setGradient(o(t.colorMistA),o(t.colorMistB),o(t.colorMistC),o(t.colorMistD)),this.mist.uniforms.uGravity.value.set(0,t.mistRise,0),this.mist.uniforms.uSizeScale.value=t.mistSize*n.particleSize,this.mist.uniforms.uLifeScale.value=t.mistLifetime*.5*n.particleLifetime,this.mist.uniforms.uSpeedScale.value=t.mistSpeed*n.particleSpeed,this.mist.uniforms.uOpacity.value=t.mistOpacity*n.opacity,this.mist.uniforms.uTurbulence.value=.3*n.turbulence,this.fizz.setGradient(o(t.colorFizzA),o(t.colorFizzB),o(t.colorFizzC),o(t.colorFizzD)),this.fizz.uniforms.uGravity.value.set(0,t.fizzRise,0),this.fizz.uniforms.uSizeScale.value=t.fizzSize*n.particleSize*7,this.fizz.uniforms.uLifeScale.value=t.fizzLifetime*.5*n.particleLifetime,this.fizz.uniforms.uSpeedScale.value=n.particleSpeed,this.fizz.uniforms.uOpacity.value=n.opacity,this.fizz.uniforms.uGlow.value=1.1*n.glow,this.fizz.uniforms.uTurbulence.value=t.fizzTurbulence*n.turbulence}_syncBell(e,t,n){let r=this._state;r.origin.copy(e),r.origin.y=0,r.axis.set(0,1,0),r.side.copy(this.side),r.t=g(t),r.fade=g(n),r.seed=this._seed,this.bell.sync(p.bubblecage,r,p.global)}_rupture(){for(let e=0;e<this._count;e++){let t=this._clock()>=this._popDeadline(e);if(t!==!!this._burst[e]){if(!t){this._burst[e]=0;continue}this._burst[e]=1,this._burstFx(e)}}}_burstFx(e){let t=p.bubblecage,r=p.global,i=n.uTime.value,a=t.zoneRadius*t.bubbleRadius*this._scales[e];this._bubblePoint(e,L),I.position=L,I.radius=a*.85,I.direction=R.copy(L).sub(this._cageCentre(z)).normalize(),I.speed=t.dropSpeed,I.speedVariance=.8,I.spread=.95,I.inherit=null,I.anchor=null,I.size=.12,I.sizeVariance=.7,I.life=t.dropLifetime,I.lifeVariance=.5,I.spin=0,I.tint=null,I.time=i,this.drops.emit(Math.round(t.popDroplets*r.particleCount),I),I.speed=t.mistSpeed*1.6,I.spread=1,I.size=.5,I.life=t.mistLifetime,I.spin=.3,this.mist.emit(Math.round(t.popMist*r.particleCount),I),L.y=0,this.ctx.decals.spawn(S.FOAM,L,{radius:t.popFoamRadius*m(.75,1.3),life:t.popFoamLife,intensity:t.popFoamIntensity,colorA:o(t.colorFoamA),colorB:o(t.colorFoamB)})}_cageFx(e,t){let r=p.bubblecage,i=p.global,a=n.uTime.value;if(this._count===0)return;this._cageCentre(z);let o=r.zoneRadius*r.cageRadius,s=Math.round(this.dropEmitter.tick(e,r.dropRate*t)*i.particleCount);s>0&&(this._bubblePoint(Math.floor(Math.random()*this._count),L),I.position=L,I.radius=r.zoneRadius*r.bubbleRadius,I.direction=R.set(0,-1,0),I.speed=r.dropSpeed*.35,I.speedVariance=.6,I.spread=.5,I.inherit=null,I.anchor=null,I.size=.1,I.sizeVariance=.7,I.life=r.dropLifetime,I.lifeVariance=.5,I.spin=0,I.tint=null,I.time=a,this.drops.emit(s,I));let c=Math.round(this.mistEmitter.tick(e,r.mistRate*t)*i.particleCount);c>0&&(I.position=z,I.radius=o*.8,I.direction=R.set(0,1,0),I.speed=r.mistSpeed,I.speedVariance=.7,I.spread=1,I.size=.7,I.sizeVariance=.5,I.life=r.mistLifetime,I.lifeVariance=.4,I.spin=.25,I.time=a,this.mist.emit(c,I));let l=Math.round(this.fizzEmitter.tick(e,r.fizzRate*t)*i.particleCount);l>0&&(this.pointAt(1,L),L.y=.05,I.position=L,I.radius=r.zoneRadius*r.poolRadius*.7,I.direction=R.set(0,1,0),I.speed=r.fizzSpeed,I.speedVariance=.8,I.spread=.35,I.size=.09,I.sizeVariance=.7,I.life=r.fizzLifetime,I.lifeVariance=.5,I.spin=0,I.time=a,this.fizz.emit(l,I))}onTravel(e){let t=p.bubblecage;this.bell.visible=!0,this._syncBell(this.position,0,g(t.bellOpacity)*.5),this.filmGeometry.instanceCount=0,this.pool.setVisible(!1),this._sync(1)}onImpact(){let e=p.bubblecage,t=p.global,r=n.uTime.value;for(let e=0;e<this._count;e++)this._burst[e]=0;this.filmGeometry.instanceCount=this._count,this.pool.setVisible(!0),this.pointAt(1,L),this.ctx.bursts.spawn(v.WATER,L,{radius:e.burstSize*.25,endRadius:e.burstSize*t.explosionIntensity,life:.65,intensity:e.burstIntensity,opacity:.9,fresnel:2,displace:.55,squash:.75,colorA:o(e.colorBurstA),colorB:o(e.colorBurstB),colorC:o(e.colorBurstC)}),this.ctx.decals.spawn(S.RIPPLE,L,{radius:e.rippleRadius*t.explosionIntensity,life:e.rippleLife,intensity:e.rippleIntensity,colorA:o(e.colorRippleA),colorB:o(e.colorRippleB)}),I.position=L,I.radius=e.zoneRadius*.3,I.direction=R.set(0,1,0),I.speed=e.dropSpeed*2.4,I.speedVariance=.85,I.spread=.8,I.inherit=null,I.anchor=null,I.size=.16,I.sizeVariance=.8,I.life=e.dropLifetime*1.4,I.lifeVariance=.6,I.spin=0,I.tint=null,I.time=r,this.drops.emit(Math.round(e.popDroplets*3*t.particleCount),I),I.speed=e.mistSpeed*3,I.spread=1,I.size=1.2,I.life=e.mistLifetime*1.2,I.spin=.4,this.mist.emit(Math.round(e.mistRate*.8*t.particleCount),I),this.ctx.shake.add(e.impactShake*t.explosionIntensity,1/Math.max(.05,e.shakeDuration),20),this.ctx.flash.trigger(o(e.colorFlash),e.impactFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*1.2*t.explosionIntensity}onFade(e,t){let n=p.bubblecage,r=this._clock(),i=this._bellSpan(),a=this._collapse();this._cageCentre(this.position);let o=r<=i;this.bell.visible=o;let s=g(r/i);this._syncBell(L.copy(this.position).setY(0),s,o?1-s*s*s:0),this.filmGeometry.instanceCount=this._count,this._sync(1-a*.35),this._rupture(),this._cageFx(e,(1-a)*(o?.5:1)),this.ctx.shake.rumble(n.impactShake*.06*(1-a)*p.global.cameraShake,e)}onDestroy(){this.filmGeometry.instanceCount=0,this.bell.visible=!1,this.pool.setVisible(!1),this._count=0,this._burst.fill(0)}dispose(){this.bell.dispose(),this.pool.dispose(),this.filmGeometry.dispose(),this.filmMaterial.dispose(),super.dispose()}};export{V as BubblecageAbility};
//# sourceMappingURL=BubblecageAbility-D6G9d_H7.js.map