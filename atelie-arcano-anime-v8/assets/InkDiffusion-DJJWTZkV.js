import{Br as e,K as t,R as n,V as r,Y as i,di as a,fi as o,q as s,ui as c,xt as l,yn as u}from"./settings-DdywqLlV.js";import{n as d,t as f}from"./quads-DpYMEt67.js";var p=Object.freeze({BLOOM:0,SPLATTER:1,WASH:2}),m=[`BLOOM`,`SPLATTER`,`WASH`],h=`
  uniform vec2 uQuadSize;      // metres, the full width and depth of the quad

  varying vec2  vMetres;       // metres from the anchor, in the field's own frame
  varying vec3  vWorld;
  varying float vViewZ;

  void main() {
    // The unit quad is +/-0.5 in x and z after its rotateX, so this is metres
    // from the anchor with the field's local +z pointing down the travel
    // vector. Everything in the fragment shader is in metres; nothing is in UV.
    vMetres = position.xz * uQuadSize;

    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mv = viewMatrix * world;
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;function g(e,t,n){return`
  #define INK_MODE ${e}
  #define INK_SOURCES ${t}
  #define INK_SATELLITES ${n}
  #define TAU 6.283185307179586

  uniform vec2  uResolution;
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;
  uniform vec3  uLightDir;

  uniform float uAge;           // seconds since the cast began
  uniform float uSeed;
  uniform float uRadius;        // metres, the authored extent of the field
  uniform vec3  uAxisAlong;     // world unit vector the field's local +z maps to
  uniform vec3  uAxisAcross;    // world unit vector its local +x maps to

  /* --- the spread --- */
  uniform float uSpread;        // metres of front radius at t = 1 s
  uniform float uSpreadPower;   // r ~ t^power; 0.5 is Fickian
  uniform float uEdge;          // metres, the width of the interface
  uniform float uClipSoft;      // metres the mass fades out over at uRadius
  uniform float uSources;       // live nuclei
  uniform float uSourceScatter; // fraction of the radius the extra nuclei scatter over
  uniform float uSourceDelay;   // seconds each later nucleus starts behind the first
  uniform vec4  uSourceDice[INK_SOURCES];   // x,y scatter in -1..1 · z noise phase · w crown phase

  /* --- the instability --- */
  uniform float uFinger;        // overall amplitude, 0 gives a disc
  uniform float uFingerMax;     // cap, as a fraction of the front radius
  uniform float uCoarse;        // metres, the coarsest (last-admitted) wavelength
  uniform float uOnset;         // front radii per wavelength before a mode is admitted
  uniform float uGrowth;        // e-folds per wavelength of front travel
  uniform float uGrowthMax;     // saturation of that growth

  /* --- the film --- */
  uniform float uCore;          // density floor inside the blob
  uniform float uFalloff;       // metres of e-folding out from a nucleus
  uniform float uFilm;          // alpha floor inside the coverage
  uniform float uGranulation;   // pigment mottle
  uniform float uGranScale;     // features per metre
  uniform float uRing;          // strength of the deposition line at the interface
  uniform float uRingWidth;     // metres

  /* --- wet and dry --- */
  uniform float uDryTime;       // seconds for the gloss to fall to 1/e
  uniform float uWetDarken;     // how far the wet film pulls toward colorWet
  uniform float uGloss;         // specular strength on the wet film
  uniform float uGlossPower;    // its tightness
  uniform float uMeniscus;      // how far the film's normal tips at the interface

  /* --- splatter --- */
  uniform float uMassAlong;     // metric stretch down the travel vector
  uniform float uMassAcross;    // and across it
  uniform float uMassLead;      // fraction of the front the mass sits forward by
  uniform float uMassRear;      // >1 blunts the trailing edge
  uniform float uCrown;         // fraction of the front the teeth add
  uniform float uCrownSpacing;  // metres of rim per tooth
  uniform float uCrownSharp;    // tooth narrowness
  uniform float uCrownGate;     // how tightly the crown is held to the leading arc
  uniform float uSatellites;    // live droplets
  uniform float uSatMin;        // metres, smallest droplet radius
  uniform float uSatMax;        // metres, largest
  uniform float uSatAlpha;      // exponent of the size power law
  uniform float uThrowNear;     // metres, nearest droplet
  uniform float uThrowFar;      // metres, furthest
  uniform float uThrowCurve;    // bias of the distance draw
  uniform float uThrowSpread;   // lateral cone, as a fraction of the distance
  uniform float uSatTail;       // tail length, in droplet radii
  uniform float uSatDelay;      // seconds the furthest droplet lands behind the mass
  uniform float uSatJitter;     // seconds of per-droplet slop on that
  uniform float uSatPop;        // seconds a droplet takes to appear
  uniform vec4  uSatDice[INK_SATELLITES];   // x size draw · y lateral draw · z delay dice · w spare

  /* --- the mark --- */
  uniform float uOpacity;
  uniform float uFade;
  uniform float uCeiling;       // max linear luminance — the anti-bloom clamp
  uniform float uSoftFade;      // metres of depth feather
  uniform float uTint;
  uniform float uTintDensity;
  uniform vec3  uColorWash;
  uniform vec3  uColorBody;
  uniform vec3  uColorDeep;
  uniform vec3  uColorPool;
  uniform vec3  uColorRing;
  uniform vec3  uColorWet;
  uniform vec3  uColorGloss;

  varying vec2  vMetres;
  varying vec3  vWorld;
  varying float vViewZ;

  ${i}
  ${s}

  /** The unperturbed front radius at time t. Fickian by default. */
  float frontAt(float t) {
    return uSpread * pow(max(t, 0.0), max(uSpreadPower, 0.05));
  }

  /** Its exact inverse: when the front reached distance d. */
  float arrivalOf(float d) {
    return pow(max(d, 0.0) / max(uSpread, 1e-4), 1.0 / max(uSpreadPower, 0.05));
  }

  /**
   * The perturbation of the interface, in metres. See the header.
   *
   * Positive pushes the front outward. Sampled on q in metres, never on the
   * bearing.
   */
  float fingers(vec2 q, float rf, float phase) {
    float sum = 0.0;
    float L = max(uCoarse, 0.05);
    for (int i = 0; i < 5; i++) {
      // A lobe of wavelength L is inadmissible until the front has grown into
      // it, so the coarse octaves are the last to arrive, not the first.
      float onset = uOnset * L;                       // metres of front radius
      float e = min(uGrowth * max(rf - onset, 0.0) / L, 8.0);
      float g = min(exp(e) - 1.0, uGrowthMax);
      sum += L * g * snoise(vec3(q / L, phase + float(i) * 37.0));
      L *= 0.5;
    }
    return sum;
  }

  void main() {
    vec2 q0 = vMetres;

    float covBest = 0.0;      // how much ink is here at all
    float densBest = 0.0;     // how thick it is
    float ringBest = 0.0;     // the deposition line
    float wetBest = 0.0;      // 1 just laid, 0 dry
    float dBest = 1e4;        // signed distance to the nearest interface
    vec2  gradBest = vec2(0.0, 1.0);

    /* --- the nuclei --------------------------------------------------- */
    for (int i = 0; i < INK_SOURCES; i++) {
      // Masked, not broken out of: a break on a uniform compiles on the driver
      // you have and fails on the one the player has.
      float live = step(float(i) + 0.5, uSources);
      vec4 dice = uSourceDice[i];

      // Nucleus 0 is the anchor itself; the rest scatter. A zone cast that
      // dropped every nucleus in the same place is one blob, and ink in water
      // is never one blob.
      float extra = step(0.5, float(i));
      vec2 nuc = dice.xy * uSourceScatter * uRadius * extra;
      float age = uAge - uSourceDelay * float(i);
      float rf = frontAt(age);

      vec2 q = q0 - nuc;
      vec2 core = q;
      float d;

      #if INK_MODE == 1
        // Directional. The anisotropy lives in the *metric*, not in a
        // bearing-indexed radius: measuring the front as f(bearing) gives every
        // point along a bearing the same answer and the mass grows flat facets
        // down its flanks.
        core = q - vec2(0.0, uMassLead * rf);
        vec2 s = vec2(core.x / max(uMassAcross, 0.05), core.y / max(uMassAlong, 0.05));
        // The trailing edge is where the sheet tore away, not where it spread
        // to, so it is blunter than the leading edge.
        s.y *= mix(1.0, max(uMassRear, 0.05), step(core.y, 0.0));
        d = length(s);
      #else
        d = length(core);
      #endif

      float cl = length(core);
      vec2 radial = cl > 1e-4 ? core / cl : vec2(0.0, 1.0);

      #if INK_MODE != 2
        float cap = uFingerMax * rf;
        d -= clamp(uFinger * fingers(q, rf, dice.z), -cap, cap);
      #endif

      /*
       * The crown is allowed to move the *silhouette* and nothing else, which
       * is why it gets its own distance rather than being folded into d.
       *
       * The first version subtracted it from d outright. The teeth came out
       * right and the inside of the mass grew a fan of radial spokes reaching
       * all the way to the impact point, because the film's thickness term
       * reads the same d and the crown is periodic in bearing at every radius.
       * A rim instability is a property of the rim. dShade never sees it.
       */
      float dShade = d;
      #if INK_MODE == 1
        // Bearing-indexed and radial because a rim instability really is both
        // — see the header. The tooth count rises with the rim's own radius.
        float bearing = atan(core.x, core.y);
        float gate = pow(max(radial.y, 0.0), max(uCrownGate, 0.01));
        float teeth = max(3.0, floor(TAU * max(rf, 0.05) / max(uCrownSpacing, 0.05)));
        float tooth = pow(max(cos(teeth * bearing + dice.w * TAU), 0.0), max(uCrownSharp, 1.0));
        d -= uCrown * rf * tooth * gate;
      #endif

      float w = max(uEdge, 1e-3);
      float cov = smoothstep(rf + w, rf - w, d) * live;

      /*
       * The zone boundary. Measured from the anchor rather than the nucleus,
       * because a zone is the ability's, not the blob's — and soft, over
       * uClipSoft metres, because a front that has outgrown its quad is the one
       * failure that reads instantly: the ink ends in a straight line with a
       * corner on it. Satellites are exempt; they are thrown out of the zone on
       * purpose.
       */
      cov *= smoothstep(uRadius, uRadius - max(uClipSoft, 1e-3), length(q0));

      float wetAge = max(age - arrivalOf(d), 0.0);
      float wet = exp(-wetAge / max(uDryTime, 1e-3));
      float dens = cov * (uCore + (1.0 - uCore) * exp(-max(dShade, 0.0) / max(uFalloff, 0.05)));

      float rz = (dShade - rf) / max(uRingWidth, 1e-3);
      float ring = exp(-rz * rz) * cov;

      float take = step(densBest, dens);
      densBest = max(densBest, dens);
      covBest = max(covBest, cov);
      ringBest = max(ringBest, ring);
      wetBest = mix(wetBest, wet * cov, take);
      gradBest = mix(gradBest, radial, take);
      dBest = mix(dBest, d - rf, take);
    }

    /* --- the satellites ------------------------------------------------ */
    #if INK_MODE == 1
    for (int i = 0; i < INK_SATELLITES; i++) {
      float live = step(float(i) + 0.5, uSatellites);
      vec4 dice = uSatDice[i];

      // Bounded-Pareto inverse CDF on the droplet radius. A fragmenting sheet
      // really does produce a power law, and it is the *only* thing that makes
      // a splatter read as a splatter: a uniform draw gives a dozen same-sized
      // dots and the eye files it as a stencil.
      float a = max(uSatAlpha, 1.05);
      float lo = max(uSatMin, 1e-3);
      float hi = max(uSatMax, lo * 1.001);
      float loA = pow(lo, -a);
      float hiA = pow(hi, -a);
      float size = pow(dice.x * (hiA - loA) + loA, -1.0 / a);

      // Small droplets fly furthest — they detach last, from the fastest part
      // of the sheet, and carry the least drag per unit mass. Driving distance
      // off the *same* draw is what makes the far field fine and the near field
      // coarse, which is the readable half of the effect.
      float reach = mix(uThrowNear, uThrowFar, pow(1.0 - dice.x, max(uThrowCurve, 0.05)));
      vec2 bead = vec2((dice.y - 0.5) * 2.0 * uThrowSpread * reach, reach);

      // A teardrop: a disc at the bead tapering to nothing down a tail pointing
      // back toward the throw. A droplet that lands moving forward does not
      // make a circle, and the tails are the direction cue that turns twelve
      // scattered dots into one thrown handful.
      vec2 tail = -vec2(0.0, uSatTail * size);
      float h = clamp(dot(q0 - bead, tail) / max(dot(tail, tail), 1e-6), 0.0, 1.0);
      float sd = length(q0 - (bead + tail * h)) - size * (1.0 - h);

      float w = max(uEdge, 1e-3) * 0.6;
      float sAge = uAge - uSatDelay * (reach / max(uThrowFar, 1e-3)) - dice.z * uSatJitter;
      float cov = smoothstep(w, -w, sd) * live * smoothstep(0.0, max(uSatPop, 1e-3), sAge);
      float wet = exp(-max(sAge, 0.0) / max(uDryTime, 1e-3));

      vec2 gv = q0 - bead;
      float gl2 = dot(gv, gv);
      vec2 radial = gl2 > 1e-8 ? gv * inversesqrt(gl2) : vec2(0.0, 1.0);

      float rz = sd / max(uRingWidth, 1e-3);
      float take = step(densBest, cov);
      densBest = max(densBest, cov);
      covBest = max(covBest, cov);
      ringBest = max(ringBest, exp(-rz * rz) * cov);
      wetBest = mix(wetBest, wet * cov, take);
      gradBest = mix(gradBest, radial, take);
      dBest = mix(dBest, sd, take);
    }
    #endif

    /* --- the paper ----------------------------------------------------- */
    // Granulation is pigment settling into the tooth of the paper, so it shows
    // where the film has dried and is invisible while it is still wet.
    float grain = snoise(vec3(q0 * uGranScale, uSeed * 0.37)) * 0.5 + 0.5;
    float granAmt = uGranulation * (1.0 - 0.6 * wetBest);
    float mottle = 1.0 - granAmt * grain;

    float density = clamp(densBest * mottle, 0.0, 1.0);
    float alpha = clamp(covBest * (uFilm + (1.0 - uFilm) * density) * uOpacity, 0.0, 1.0);
    alpha *= clamp(uFade, 0.0, 1.0);
    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.004) discard;

    float g = clamp(uTint + density * uTintDensity, 0.0, 1.0);
    vec3 colour = gradient4(uColorWash, uColorBody, uColorDeep, uColorPool, g);
    colour = mix(colour, uColorWet, clamp(wetBest * uWetDarken, 0.0, 1.0));
    colour = mix(colour, uColorRing, clamp(ringBest * uRing, 0.0, 1.0));

    /* --- the wet gloss --------------------------------------------------
     * The film is a lens: flat in the middle, tipped outward at the meniscus,
     * which is exactly where the interface is. dBest is the signed distance to
     * that interface, so a Gaussian on it is the lip, and the tilt is the
     * radial direction rotated into world space by the field's own axes.
     */
    float lz = dBest / max(uRingWidth, 1e-3);
    float lip = exp(-lz * lz);
    vec3 tilt = uAxisAcross * gradBest.x + uAxisAlong * gradBest.y;
    vec3 nrm = normalize(vec3(0.0, 1.0, 0.0) - tilt * (uMeniscus * lip));
    vec3 viewDir = normalize(cameraPosition - vWorld);
    vec3 halfway = normalize(viewDir + normalize(uLightDir));
    float spec = pow(max(dot(nrm, halfway), 0.0), max(uGlossPower, 1.0));
    colour += uColorGloss * (spec * uGloss * wetBest);

    // The clamp that keeps this school out of the bloom pass. Never multiplied
    // by uGlobalGlow — ink is not emissive and the global glow slider must not
    // be able to light it.
    float lum = dot(colour, vec3(0.2126, 0.7152, 0.0722));
    colour *= lum > uCeiling ? uCeiling / max(lum, 1e-4) : 1.0;

    gl_FragColor = vec4(colour, alpha);
  }
`}var _=new a,v=e=>typeof e==`string`?n(e):e,y=class{constructor(n,{mode:i=p.BLOOM,sources:s=4,satellites:d=16,layer:_=r.VFX,renderOrder:v=6,name:y=null}={}){this.mode=i,this.sources=Math.max(1,Math.round(s)),this.satellites=Math.max(1,Math.round(d)),this.geometry=f();let x=[];for(let e=0;e<this.sources;e++)x.push(new o);let S=[];for(let e=0;e<this.satellites;e++)S.push(new o);this.material=new e({transparent:!0,depthWrite:!1,depthTest:!0,blending:1,side:2,toneMapped:!0,uniforms:t({uQuadSize:{value:new c(1,1)},uAge:{value:0},uSeed:{value:0},uRadius:{value:6},uAxisAlong:{value:new a(0,0,1)},uAxisAcross:{value:new a(1,0,0)},uSpread:{value:2.6},uSpreadPower:{value:.5},uEdge:{value:.09},uClipSoft:{value:.8},uSources:{value:1},uSourceScatter:{value:.35},uSourceDelay:{value:.18},uSourceDice:{value:x},uFinger:{value:.5},uFingerMax:{value:.75},uCoarse:{value:2.4},uOnset:{value:.55},uGrowth:{value:.9},uGrowthMax:{value:1.5},uCore:{value:.5},uFalloff:{value:5.5},uFilm:{value:.6},uGranulation:{value:.22},uGranScale:{value:1.6},uRing:{value:.55},uRingWidth:{value:.12},uDryTime:{value:1.6},uWetDarken:{value:.35},uGloss:{value:.22},uGlossPower:{value:44},uMeniscus:{value:.55},uMassAlong:{value:1.35},uMassAcross:{value:.8},uMassLead:{value:.22},uMassRear:{value:1.45},uCrown:{value:.35},uCrownSpacing:{value:.55},uCrownSharp:{value:7},uCrownGate:{value:2.2},uSatellites:{value:12},uSatMin:{value:.055},uSatMax:{value:.42},uSatAlpha:{value:2.3},uThrowNear:{value:1.6},uThrowFar:{value:9},uThrowCurve:{value:1.7},uThrowSpread:{value:.22},uSatTail:{value:2.4},uSatDelay:{value:.42},uSatJitter:{value:.12},uSatPop:{value:.06},uSatDice:{value:S},uOpacity:{value:1},uFade:{value:1},uCeiling:{value:.62},uSoftFade:{value:.25},uTint:{value:.05},uTintDensity:{value:1.05},uColorWash:{value:new l(`#a89a88`)},uColorBody:{value:new l(`#4c433b`)},uColorDeep:{value:new l(`#1a1613`)},uColorPool:{value:new l(`#080706`)},uColorRing:{value:new l(`#2e2019`)},uColorWet:{value:new l(`#100c09`)},uColorGloss:{value:new l(`#c8ced2`)}}),vertexShader:h,fragmentShader:g(i,this.sources,this.satellites)}),this.mesh=new u(this.geometry,this.material),this.mesh.name=y??`InkDiffusion:${m[i]??i}`,this.mesh.layers.set(_),this.mesh.renderOrder=v,this.mesh.frustumCulled=!1,this.mesh.visible=!1,n?.add(this.mesh),this._anchor=new a,this._along=new a(0,0,1),this._yaw=0,this._age=0,this.seed=0,this._p=b(),this.roll(0)}get object3D(){return this.mesh}get uniforms(){return this.material.uniforms}get drawCalls(){return 1}get age(){return this._age}setVisible(e){return this.mesh.visible=e,this}setPlacement(e,t){return this._anchor.copy(e),_.copy(t),_.y=0,_.lengthSq()<1e-8&&_.set(0,0,1),_.normalize(),this._along.copy(_),this._yaw=Math.atan2(_.x,_.z),this}roll(e=Math.random()*100){this.seed=e,this.material.uniforms.uSeed.value=e;let t=this.material.uniforms.uSourceDice.value;for(let e=0;e<t.length;e++)t[e].set(Math.random()*2-1,Math.random()*2-1,Math.random()*100,Math.random());let n=this.material.uniforms.uSatDice.value;for(let e=0;e<n.length;e++)n[e].set(Math.random(),Math.random(),Math.random(),Math.random());return this}reset(){return this._age=0,this.material.uniforms.uAge.value=0,this.mesh.visible=!1,this}_resolve(e){let t=this._p;for(let n in x){let r=e[n];t[n]=r===void 0?x[n]:r}return t}update(e,t){let n=this._resolve(t??x),r=this.material.uniforms;this._age=Math.max(0,e),r.uAge.value=this._age,r.uRadius.value=n.radius,r.uSpread.value=n.spread,r.uSpreadPower.value=n.spreadPower,r.uEdge.value=n.edge,r.uClipSoft.value=n.clipSoft,r.uSources.value=Math.max(0,Math.min(this.sources,Math.round(n.sources))),r.uSourceScatter.value=n.sourceScatter,r.uSourceDelay.value=n.sourceDelay,r.uFinger.value=n.finger,r.uFingerMax.value=n.fingerMax,r.uCoarse.value=n.coarse,r.uOnset.value=n.onset,r.uGrowth.value=n.growth,r.uGrowthMax.value=n.growthMax,r.uCore.value=n.core,r.uFalloff.value=n.falloff,r.uFilm.value=n.film,r.uGranulation.value=n.granulation,r.uGranScale.value=n.granScale,r.uRing.value=n.ring,r.uRingWidth.value=n.ringWidth,r.uDryTime.value=n.dryTime,r.uWetDarken.value=n.wetDarken,r.uGloss.value=n.gloss,r.uGlossPower.value=n.glossPower,r.uMeniscus.value=n.meniscus,r.uMassAlong.value=n.massAlong,r.uMassAcross.value=n.massAcross,r.uMassLead.value=n.massLead,r.uMassRear.value=n.massRear,r.uCrown.value=n.crown,r.uCrownSpacing.value=n.crownSpacing,r.uCrownSharp.value=n.crownSharp,r.uCrownGate.value=n.crownGate,r.uSatellites.value=Math.max(0,Math.min(this.satellites,Math.round(n.satellites))),r.uSatMin.value=n.satMin,r.uSatMax.value=n.satMax,r.uSatAlpha.value=n.satAlpha,r.uThrowNear.value=n.throwNear,r.uThrowFar.value=n.throwFar,r.uThrowCurve.value=n.throwCurve,r.uThrowSpread.value=n.throwSpread,r.uSatTail.value=n.satTail,r.uSatDelay.value=n.satDelay,r.uSatJitter.value=n.satJitter,r.uSatPop.value=n.satPop,r.uOpacity.value=n.opacity,r.uFade.value=n.fade,r.uCeiling.value=n.ceiling,r.uSoftFade.value=n.softFade,r.uTint.value=n.tint,r.uTintDensity.value=n.tintDensity,r.uColorWash.value.copy(v(n.colorWash)),r.uColorBody.value.copy(v(n.colorBody)),r.uColorDeep.value.copy(v(n.colorDeep)),r.uColorPool.value.copy(v(n.colorPool)),r.uColorRing.value.copy(v(n.colorRing)),r.uColorWet.value.copy(v(n.colorWet)),r.uColorGloss.value.copy(v(n.colorGloss));let i=Math.max(n.radius,.1);this.mode===p.SPLATTER&&(i=Math.max(i,n.throwFar+n.satMax*(1+n.satTail)+n.edge*2)),i+=n.edge*2+n.clipSoft;let a=i*2;this.mesh.scale.set(a,1,a),r.uQuadSize.value.set(a,a),this.mesh.position.set(this._anchor.x,n.height,this._anchor.z),this.mesh.rotation.set(0,this._yaw,0),r.uAxisAlong.value.set(Math.sin(this._yaw),0,Math.cos(this._yaw)),r.uAxisAcross.value.set(Math.cos(this._yaw),0,-Math.sin(this._yaw)),this.mesh.visible=n.opacity>0&&n.fade>0}frontRadius(e=0){let t=this._p,n=Math.max(0,this._age-t.sourceDelay*e);return t.spread*n**+Math.max(t.spreadPower,.05)}sourcePoint(e,t){let n=this._p;if(t.copy(this._anchor),e<=0)return t;let r=this.material.uniforms.uSourceDice.value[Math.min(e,this.sources-1)],i=r.x*n.sourceScatter*n.radius,a=r.y*n.sourceScatter*n.radius;return this._toWorld(i,a,t)}satelliteSize(e){let t=this._p,n=this.material.uniforms.uSatDice.value[Math.min(Math.max(e,0),this.satellites-1)],r=Math.max(t.satAlpha,1.05),i=Math.max(t.satMin,.001),a=Math.max(t.satMax,i*1.001),o=i**+-r,s=a**+-r;return(n.x*(s-o)+o)**(-1/r)}satelliteReach(e){let t=this._p,n=(1-this.material.uniforms.uSatDice.value[Math.min(Math.max(e,0),this.satellites-1)].x)**Math.max(t.throwCurve,.05);return t.throwNear+(t.throwFar-t.throwNear)*n}satellitePoint(e,t){let n=this._p,r=this.material.uniforms.uSatDice.value[Math.min(Math.max(e,0),this.satellites-1)],i=this.satelliteReach(e),a=(r.y-.5)*2*n.throwSpread*i;return t.copy(this._anchor),t.y=n.height,this._toWorld(a,i,t)}satelliteAge(e){let t=this._p,n=this.material.uniforms.uSatDice.value[Math.min(Math.max(e,0),this.satellites-1)];return this._age-t.satDelay*(this.satelliteReach(e)/Math.max(t.throwFar,.001))-n.z*t.satJitter}_toWorld(e,t,n){let r=Math.sin(this._yaw),i=Math.cos(this._yaw);return n.x=this._anchor.x+e*i+t*r,n.z=this._anchor.z-e*r+t*i,n.y=this._p.height,n}dispose(){this.mesh.parent?.remove(this.mesh),this.material.dispose(),d()}};function b(){return{radius:6,height:.02,spread:2.6,spreadPower:.5,edge:.09,clipSoft:.8,sources:1,sourceScatter:.35,sourceDelay:.18,finger:.5,fingerMax:.75,coarse:2.4,onset:.55,growth:.9,growthMax:1.5,core:.5,falloff:5.5,film:.6,granulation:.22,granScale:1.6,ring:.55,ringWidth:.12,dryTime:1.6,wetDarken:.35,gloss:.22,glossPower:44,meniscus:.55,massAlong:1.35,massAcross:.8,massLead:.22,massRear:1.45,crown:.35,crownSpacing:.55,crownSharp:7,crownGate:2.2,satellites:12,satMin:.055,satMax:.42,satAlpha:2.3,throwNear:1.6,throwFar:9,throwCurve:1.7,throwSpread:.22,satTail:2.4,satDelay:.42,satJitter:.12,satPop:.06,opacity:1,fade:1,ceiling:.62,softFade:.25,tint:.05,tintDensity:1.05,colorWash:`#a89a88`,colorBody:`#4c433b`,colorDeep:`#1a1613`,colorPool:`#080706`,colorRing:`#2e2019`,colorWet:`#100c09`,colorGloss:`#c8ced2`}}var x=b();export{p as n,b as r,y as t};
//# sourceMappingURL=InkDiffusion-DJJWTZkV.js.map