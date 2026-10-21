import{Br as e,K as t,R as n,V as r,Y as i,di as a,fi as o,q as s,ui as c,xt as l,yn as u}from"./settings-DdywqLlV.js";import{n as d,t as f}from"./quads-DpYMEt67.js";var p=Object.freeze({SCROLL:0,WAVE:1,CUSTOM:2}),m=Object.freeze({DISC:0,CONE:1,LANE:2}),h=Object.freeze([`SCROLL`,`WAVE`,`CUSTOM`]),g=Object.freeze([`DISC`,`CONE`,`LANE`]),_=Object.freeze([`uHalf`,`uSeed`,`uNow`,`uWaveAmp`,`uWaveLength`,`uWaveSpeed`,`uWaveAngle`,`uChop`,`uChopScale`,`uChopSpeed`,`uWaveFront`,`uCrestHeight`,`uCrestBack`,`uCrestFace`,`uCrestWidth`,`uCrestFeather`,`uCrestBreak`,`uCrestBreakScale`,`uRipples`,`uRippleAmp`,`uRippleSpeed`,`uRippleLength`,`uRippleWidth`,`uRippleDecay`,`uRippleSpread`]),v=`
  uniform float uSourceAmp;    // metres of relief in the fake surface
  uniform float uCellScale;    // cells per metre, lattice A
  uniform float uCellRatio;    // lattice B's scale, as a multiple of A
  uniform float uCellJitter;   // 0..1 how far a feature point wanders in its cell
  uniform vec2  uDrift;        // cells per second, lattice A (B goes the other way)
  uniform float uBoil;         // radians per second the feature points orbit
  uniform float uRidgeMix;     // 0..1 blend of the *direct* worley-difference net
  uniform float uRidgeScale;   // how wide a direct vein is, in field units
  uniform float uRidgePower;   // the exponent the received recipe asks for

  /** F1 distance to an animated feature-point lattice. */
  float causticCell(vec2 p, float phase, float jitter) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    float best = 8.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = hash21(dot(n + g, vec2(7.13, 113.17)));
        o = 0.5 + jitter * 0.5 * sin(phase + 6.283185307 * o);
        vec2 r = g + o - f;
        best = min(best, dot(r, r));
      }
    }
    return sqrt(best);
  }

  float causticHeight(vec2 xz) {
    vec2 p = xz * uCellScale;
    vec2 drift = uDrift * uTime;
    float a = causticCell(p + drift, uTime * uBoil + uSeed, uCellJitter);
    float b = causticCell(p * uCellRatio - drift * 0.6, -uTime * uBoil * 0.83 + uSeed * 1.7, uCellJitter);
    return uSourceAmp * (a - b);
  }

  /**
   * The received recipe, kept so the fold term has something to sit on when
   * there is barely any water to fold light through. Zero at defaults + a bit.
   */
  float causticRidge(vec2 xz) {
    if (uRidgeMix <= 0.0) return 0.0;
    vec2 p = xz * uCellScale;
    vec2 drift = uDrift * uTime;
    float a = causticCell(p + drift, uTime * uBoil + uSeed, uCellJitter);
    float b = causticCell(p * uCellRatio - drift * 0.6, -uTime * uBoil * 0.83 + uSeed * 1.7, uCellJitter);
    float vein = clamp(1.0 - abs(a - b) * max(uRidgeScale, 0.01), 0.0, 1.0);
    return pow(vein, max(uRidgePower, 0.1)) * uRidgeMix;
  }
`,y=`
  #define TAU 6.283185307179586

  uniform vec2  uHalf;          // half-extents of the surface, metres
  uniform float uNow;           // seconds since the cast began — the ripple clock

  uniform vec4  uWaveAmp;       // metres, one component per directional wave
  uniform vec4  uWaveLength;    // metres, crest to crest
  uniform vec4  uWaveSpeed;     // metres/second
  uniform vec4  uWaveAngle;     // radians, bearing in the surface plane

  uniform float uChop;          // metres
  uniform float uChopScale;     // cycles per metre
  uniform float uChopSpeed;     // metres/second the chop drifts

  uniform float uWaveFront;        // 0..1 along +X
  uniform float uCrestHeight;      // metres
  uniform float uCrestBack;        // metres — the long back slope's 1/e length
  uniform float uCrestFace;        // metres — the short front face's 1/e length
  uniform float uCrestWidth;       // 0..1 of the half-extent across the wave
  uniform float uCrestFeather;     // 0..1 of that, over which the ends die
  uniform float uCrestBreak;       // 0..1 how ragged the lip is
  uniform float uCrestBreakScale;  // cycles per metre along the lip

  uniform vec4  uRipples[8];  // (u, v, born, strength)
  uniform float uRippleAmp;
  uniform float uRippleSpeed;
  uniform float uRippleLength;
  uniform float uRippleWidth;
  uniform float uRippleDecay;
  uniform float uRippleSpread;

  float causticWave(vec2 xz, float amp, float len, float spd, float ang) {
    if (amp <= 0.0) return 0.0;
    vec2 d = vec2(cos(ang), sin(ang));
    float k = TAU / max(len, 0.05);
    return amp * sin(dot(d, xz) * k - uTime * spd * k);
  }

  float causticCrest(vec2 xz) {
    if (uCrestHeight <= 0.0) return 0.0;
    float front = (uWaveFront - 0.5) * uHalf.x * 2.0;
    float s = xz.x - front;
    float prof = s < 0.0
      ? exp(s / max(uCrestBack, 0.02))
      : exp(-s / max(uCrestFace, 0.01));
    float rag = fbm3(vec3(xz.y * uCrestBreakScale, uSeed, uNow * 0.6)) * 0.5 + 0.5;
    prof *= mix(1.0, rag, clamp(uCrestBreak, 0.0, 1.0));
    float a = abs(xz.y) / max(uHalf.y, 1e-3);
    float w = clamp(uCrestWidth, 0.0, 1.0);
    float lateral = 1.0 - smoothstep(max(w - max(uCrestFeather, 1e-3), 0.0), w, a);
    return uCrestHeight * prof * lateral;
  }

  float causticRipples(vec2 xz) {
    float sum = 0.0;
    for (int i = 0; i < 8; i++) {
      vec4 r = uRipples[i];
      if (r.w <= 0.0) continue;
      float age = uNow - r.z;
      if (age < 0.0) continue;
      vec2 c = r.xy * uHalf;
      float d = length(xz - c);
      float x = d - age * uRippleSpeed;
      float env = exp(-(x * x) / max(uRippleWidth * uRippleWidth, 1e-4));
      float decay = exp(-age / max(uRippleDecay, 0.02)) / (1.0 + d / max(uRippleSpread, 0.05));
      sum += r.w * uRippleAmp * env * decay * cos(x * TAU / max(uRippleLength, 0.05));
    }
    return sum;
  }

  float causticHeight(vec2 xz) {
    float h = 0.0;
    h += causticWave(xz, uWaveAmp.x, uWaveLength.x, uWaveSpeed.x, uWaveAngle.x);
    h += causticWave(xz, uWaveAmp.y, uWaveLength.y, uWaveSpeed.y, uWaveAngle.y);
    h += causticWave(xz, uWaveAmp.z, uWaveLength.z, uWaveSpeed.z, uWaveAngle.z);
    h += causticWave(xz, uWaveAmp.w, uWaveLength.w, uWaveSpeed.w, uWaveAngle.w);
    if (uChop > 0.0) h += uChop * fbm3(vec3(xz * uChopScale, uTime * uChopSpeed + uSeed));
    h += causticRipples(xz);
    h += causticCrest(xz);
    return h;
  }

  float causticRidge(vec2 xz) { return 0.0; }
`,b=`
  varying vec2  vUv;
  varying vec3  vWorld;
  varying float vViewZ;

  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mv = viewMatrix * world;
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;function x(e,t){return`
  #define CS_DISC 0
  #define CS_CONE 1
  #define CS_LANE 2

  uniform float uTime;
  uniform float uSeed;

  /* ---- placement, in metres ---- */
  uniform vec2  uQuadSize;     // metres the quad covers: x across, y downrange
  uniform vec3  uAnchor;       // world position of the quad's centre
  uniform vec3  uLightAxis;    // unit, the direction the light TRAVELS (downward)
  uniform float uRadius;       // metres — the projector's own reach
  uniform float uLength;       // metres — LANE only

  /* ---- refraction ---- */
  uniform float uDepth;        // metres of water between the surface and the floor
  uniform float uBend;         // 1 - 1/ior, resolved on the CPU from the ior slider
  uniform float uDispersion;   // 0..1 fractional spread of uBend across R and B
  uniform float uStep;         // metres between the Hessian taps
  uniform float uAbsorb;       // 1/metres — Beer extinction through the water column

  /* ---- the fold, and how hard it is squeezed ---- */
  uniform float uFoldFloor;    // keeps 1/|det| finite; also the widest a filament gets
  uniform float uThreshold;    // compression below this is flat water, and black
  uniform float uGain;
  uniform float uSharpness;    // exponent on the surviving compression
  uniform float uRolloff;      // soft clip, so a fold does not detonate the bloom

  /* ---- the projector ---- */
  uniform float uPenumbra;     // 0..1 of the reach, over which the edge dies
  uniform float uConeAngle;    // radians, half-angle (CONE)
  uniform float uProjHeight;   // metres up the axis to the apex (CONE)
  uniform float uLaneWidth;    // metres, half-width (LANE)
  uniform float uLaneFeather;  // metres (LANE)
  uniform float uFront;        // 0..1 down the lane, the wave's own front
  uniform float uSpanBack;     // metres behind the front the net survives
  uniform float uSpanFront;    // metres ahead of it

  /* ---- output ---- */
  uniform float uFade;
  uniform float uOpacity;
  uniform float uEmissive;
  uniform float uWash;         // the lit-pool light BETWEEN the filaments
  uniform float uFringeAt;     // where on the fold the colour hands over
  uniform vec3  uColorNet;
  uniform vec3  uColorFringe;
  uniform vec3  uColorWash;

  /* ---- depth ---- */
  uniform sampler2D uSceneDepth;
  uniform vec2      uResolution;
  uniform float     uCameraNear;
  uniform float     uCameraFar;
  uniform float     uDepthFade;   // metres
  uniform float     uGlobalGlow;
  uniform float     uShaderIntensity;

  varying vec2  vUv;
  varying vec3  vWorld;
  varying float vViewZ;

  ${i}
  ${s}

  /* ---- the pluggable height field ---- */
  ${e===p.WAVE?y:e===p.CUSTOM?t:v}

  /**
   * How much the refraction map compresses area here, per channel.
   *
   * 'a' is the only thing that differs between the three: red bends least, blue
   * most, so each channel folds along its own curve and the fringes are three
   * filaments a few centimetres apart rather than one filament with a gradient
   * painted along it.
   */
  float causticDet(float a, float hxx, float hzz, float hxz) {
    float jxx = 1.0 - a * hxx;
    float jzz = 1.0 - a * hzz;
    float jxz = a * hxz;
    return jxx * jzz - jxz * jxz;
  }

  /** Compression to light. Everything under the threshold is water, and black. */
  float causticFold(float det) {
    float comp = 1.0 / (abs(det) + max(uFoldFloor, 1e-3));
    float lit = max(comp - uThreshold, 0.0) * uGain;
    lit = pow(lit, max(uSharpness, 0.05));
    return lit / (1.0 + lit * max(uRolloff, 0.0));
  }

  /** The projector's own falloff. Never derived from the pattern. */
  float causticEnvelope(vec2 lp) {
    float pen = clamp(uPenumbra, 0.02, 1.0);

    #if CS_SHAPE == CS_CONE
      // The apex sits up the light's own axis, so a low sun gives an ellipse on
      // the floor for free — which is the entire reason the axis is a parameter
      // and not hard-wired to +Y.
      vec3 apex = uAnchor - uLightAxis * uProjHeight;
      vec3 d = vWorld - apex;
      float len = max(length(d), 1e-4);
      float c = dot(d / len, uLightAxis);
      float ci = cos(clamp(uConeAngle, 0.0, 1.5));
      float co = cos(clamp(uConeAngle, 0.0, 1.5) * (1.0 + pen));
      return smoothstep(co, ci, c);
    #elif CS_SHAPE == CS_LANE
      float across = 1.0 - smoothstep(max(uLaneWidth - uLaneFeather, 0.0),
                                      uLaneWidth + uLaneFeather, abs(lp.x));
      float front = uFront * uLength;
      float feather = max(uLaneFeather, 0.02);
      float behind = smoothstep(front - uSpanBack - feather, front - uSpanBack, lp.y);
      float ahead = 1.0 - smoothstep(front + uSpanFront, front + uSpanFront + feather, lp.y);
      return across * behind * ahead;
    #else
      float r = length(lp) / max(uRadius, 1e-3);
      return 1.0 - smoothstep(1.0 - pen, 1.0, r);
    #endif
  }

  void main() {
    vec2 lp = vec2(vUv.x - 0.5, 0.5 - vUv.y) * uQuadSize;

    float env = causticEnvelope(lp);
    if (env <= 0.0015) discard;

    /* ---- six taps, one Hessian ---- */
    float s = max(uStep, 0.005);
    float inv = 1.0 / (s * s);
    float h0 = causticHeight(lp);
    float hpx = causticHeight(lp + vec2(s, 0.0));
    float hmx = causticHeight(lp - vec2(s, 0.0));
    float hpz = causticHeight(lp + vec2(0.0, s));
    float hmz = causticHeight(lp - vec2(0.0, s));
    float hd = causticHeight(lp + vec2(s, s));

    float hxx = (hpx - 2.0 * h0 + hmx) * inv;
    float hzz = (hpz - 2.0 * h0 + hmz) * inv;
    // The mixed partial needs the diagonal tap. Drop it and every fold that is
    // not aligned with the quad's own axes disappears, which shows up as a net
    // made of plus signs.
    float hxz = (hd - hpx - hpz + h0) * inv;

    float a = uBend * uDepth;
    float spread = clamp(uDispersion, 0.0, 1.0);
    vec3 lit = vec3(
      causticFold(causticDet(a * (1.0 - spread), hxx, hzz, hxz)),
      causticFold(causticDet(a, hxx, hzz, hxz)),
      causticFold(causticDet(a * (1.0 + spread), hxx, hzz, hxz))
    );

    lit += vec3(causticRidge(lp));

    /* ---- the water above is not clear ----
     * Thicker column, dimmer floor. This is the term that lets you read the
     * wave's body off the ground: the net dims under the crest and flares in
     * the thin water on its face, with no extra input beyond the height field
     * that is already here. */
    float column = max(uDepth + h0, 0.0);
    lit *= exp(-max(uAbsorb, 0.0) * column);

    float strength = uFade * uOpacity * uEmissive * uShaderIntensity;
    float peak = max(max(lit.r, lit.g), lit.b);
    vec3 tint = mix(uColorNet, uColorFringe, clamp(peak * uFringeAt, 0.0, 1.0));
    vec3 rgb = tint * lit + uColorWash * (uWash * env);

    rgb *= env * strength;

    /* ---- do not paint the character ----
     * The depth test already loses the argument on the millimetre between this
     * quad and the floor it is lying on, so the fade does the last of it: the
     * net dies over uDepthFade metres as anything standing on the floor comes
     * between it and the camera. */
    vec2 screenUV = gl_FragCoord.xy / uResolution;
    float depthBits = unpackRGBAToDepth(texture2D(uSceneDepth, screenUV));
    float sceneViewZ = perspectiveDepthToViewZ(depthBits, uCameraNear, uCameraFar);
    rgb *= smoothstep(-max(uDepthFade, 1e-3), 0.0, vViewZ - sceneViewZ);

    float alpha = clamp(max(max(rgb.r, rgb.g), rgb.b), 0.0, 1.0);
    if (alpha < 0.003) discard;

    gl_FragColor = vec4(rgb * uGlobalGlow, alpha);
  }
`}function S(){return{centre:null,lightAxis:null,yaw:0,height:.015,radius:6,length:18,fade:1,front:.5,now:0,seed:0,depth:1.4,ior:1.333,dispersion:.06,sampleStep:.09,absorb:.18,foldFloor:.22,threshold:1.15,gain:.55,sharpness:1.35,rolloff:.22,sourceAmp:.16,cellScale:.55,cellRatio:1.63,cellJitter:.85,driftAngle:.7,driftSpeed:.12,boil:.9,ridgeMix:.12,ridgeScale:2.2,ridgePower:6,half:8,waveAmp:.16,waveLength:5.5,waveSpeed:1.6,waveAngle:.4,chop:.05,chopScale:.55,chopSpeed:.3,waveFront:.5,crestHeight:1.1,crestBack:3.2,crestFace:.5,crestWidth:.8,crestFeather:.25,crestBreak:.35,crestBreakScale:.6,rippleAmp:.12,rippleSpeed:3.2,rippleLength:1.1,rippleWidth:.7,rippleDecay:1.4,rippleSpread:3,penumbra:.35,coneAngle:.45,projectorHeight:5,laneWidth:2.6,laneFeather:.9,spanBack:2,spanFront:7,additive:!0,emissive:1,opacity:1,wash:.18,fringeAt:1.6,depthFade:.45,colorNet:`#9fe6ff`,colorFringe:`#ffffff`,colorWash:`#2a6d86`,noiseStrength:1,noiseFrequency:1,noiseSpeed:1,opacityScale:1}}var C=new a(0,-1,0),w=class{constructor(n,i={}){let{source:s=p.SCROLL,shape:d=m.DISC,custom:_=``,uniforms:v=null,additive:y=!0,depthTest:S=!0,layer:C=r.VFX,renderOrder:w=7,name:T=null}=i;if(s===p.CUSTOM&&!_)throw Error(`Caustics: CausticSource.CUSTOM needs options.custom — a GLSL chunk defining float causticHeight(vec2 xz) and float causticRidge(vec2 xz)`);this.parent=n,this.source=s,this.shape=d,this.geometry=f(),this._bound=new Set,this._ripples=[];for(let e=0;e<8;e++)this._ripples.push(new o(0,0,-1e4,0));this._rippleNext=0,this.material=new e({defines:{CS_SOURCE:s,CS_SHAPE:d},transparent:!0,depthWrite:!1,depthTest:S,blending:5,blendEquation:100,blendSrc:201,blendDst:y?201:205,side:2,toneMapped:!1,uniforms:t({uQuadSize:{value:new c(12,12)},uAnchor:{value:new a},uLightAxis:{value:new a(0,-1,0)},uRadius:{value:6},uLength:{value:18},uSeed:{value:0},uNow:{value:0},uDepth:{value:1.4},uBend:{value:1-1/1.333},uDispersion:{value:.06},uStep:{value:.09},uAbsorb:{value:.18},uFoldFloor:{value:.22},uThreshold:{value:1.15},uGain:{value:.55},uSharpness:{value:1.35},uRolloff:{value:.22},uSourceAmp:{value:.16},uCellScale:{value:.55},uCellRatio:{value:1.63},uCellJitter:{value:.85},uDrift:{value:new c(.08,.09)},uBoil:{value:.9},uRidgeMix:{value:.12},uRidgeScale:{value:2.2},uRidgePower:{value:6},uHalf:{value:new c(8,8)},uWaveAmp:{value:new o(.16,.11,.07,.04)},uWaveLength:{value:new o(5.5,3.1,1.9,1.1)},uWaveSpeed:{value:new o(1.6,1.2,.9,.7)},uWaveAngle:{value:new o(.4,1.1,2.2,3.4)},uChop:{value:.05},uChopScale:{value:.55},uChopSpeed:{value:.3},uWaveFront:{value:.5},uCrestHeight:{value:1.1},uCrestBack:{value:3.2},uCrestFace:{value:.5},uCrestWidth:{value:.8},uCrestFeather:{value:.25},uCrestBreak:{value:.35},uCrestBreakScale:{value:.6},uRipples:{value:this._ripples},uRippleAmp:{value:.12},uRippleSpeed:{value:3.2},uRippleLength:{value:1.1},uRippleWidth:{value:.7},uRippleDecay:{value:1.4},uRippleSpread:{value:3},uPenumbra:{value:.35},uConeAngle:{value:.45},uProjHeight:{value:5},uLaneWidth:{value:2.6},uLaneFeather:{value:.9},uFront:{value:.5},uSpanBack:{value:2},uSpanFront:{value:7},uFade:{value:1},uOpacity:{value:1},uEmissive:{value:1},uWash:{value:.18},uFringeAt:{value:1.6},uDepthFade:{value:.45},uColorNet:{value:new l(.62,.9,1)},uColorFringe:{value:new l(1,1,1)},uColorWash:{value:new l(.16,.43,.53)},...v??{}}),vertexShader:b,fragmentShader:x(s,_)}),this.mesh=new u(this.geometry,this.material),this.mesh.name=T??`Caustics:${h[s]??s}/${g[d]??d}`,this.mesh.layers.set(C),this.mesh.renderOrder=w,this.mesh.frustumCulled=!1,this._additive=y,n?.add(this.mesh)}get object3D(){return this.mesh}get drawCalls(){return 1}get boundCount(){return this._bound.size}setVisible(e){this.mesh.visible=e}bindSource(e,t=_){if(!e)return 0;let n=this.material.uniforms;for(let r of t){let t=e[r];!t||typeof t!=`object`||!(`value`in t)||r in n&&(n[r]=t,this._bound.add(r))}return this.material.uniformsNeedUpdate=!0,this._bound.size}unbindSource(){if(!this._bound.size)return;let e=this.material.uniforms;this._bound.has(`uRipples`)&&(e.uRipples={value:this._ripples});for(let t of this._bound){if(t===`uRipples`)continue;let n=e[t];e[t]={value:n?.value?.clone?n.value.clone():n?.value}}this._bound.clear(),this.material.uniformsNeedUpdate=!0}ripple(e,t,n=1,r=0){if(this._bound.has(`uRipples`))return null;let i=this._ripples[this._rippleNext];return i.set(e,t,r,n),this._rippleNext=(this._rippleNext+1)%8,i}clearRipples(){if(!this._bound.has(`uRipples`)){for(let e=0;e<8;e++)this._ripples[e].set(0,0,-1e4,0);this._rippleNext=0}}reset(){this.clearRipples(),this.mesh.visible=!0}update(e){let t=this.material.uniforms,r=this._bound,i=e.noiseFrequency??1,a=e.noiseStrength??1,o=e.noiseSpeed??1,s=Math.max(.05,e.radius??6),c=Math.max(.2,e.length??18);t.uRadius.value=s,t.uLength.value=c,r.has(`uSeed`)||(t.uSeed.value=e.seed??0),r.has(`uNow`)||(t.uNow.value=e.now??0);let l=Math.max(1.0001,e.ior??1.333);t.uDepth.value=Math.max(0,e.depth??1.4),t.uBend.value=1-1/l,t.uDispersion.value=Math.max(0,Math.min(1,e.dispersion??.06)),t.uStep.value=Math.max(.005,(e.sampleStep??.09)/Math.max(i,.05)),t.uAbsorb.value=Math.max(0,e.absorb??.18),t.uFoldFloor.value=Math.max(.001,e.foldFloor??.22),t.uThreshold.value=Math.max(0,e.threshold??1.15),t.uGain.value=Math.max(0,e.gain??.55),t.uSharpness.value=Math.max(.05,e.sharpness??1.35),t.uRolloff.value=Math.max(0,e.rolloff??.22),t.uSourceAmp.value=(e.sourceAmp??.16)*a,t.uCellScale.value=Math.max(.01,(e.cellScale??.55)*i),t.uCellRatio.value=Math.max(.05,e.cellRatio??1.63),t.uCellJitter.value=Math.max(0,Math.min(1,e.cellJitter??.85));let u=e.driftAngle??.7,d=(e.driftSpeed??.12)*o;if(t.uDrift.value.set(Math.cos(u)*d,Math.sin(u)*d),t.uBoil.value=(e.boil??.9)*o,t.uRidgeMix.value=Math.max(0,e.ridgeMix??.12),t.uRidgeScale.value=Math.max(.01,e.ridgeScale??2.2),t.uRidgePower.value=Math.max(.1,e.ridgePower??6),this.source===p.WAVE&&r.size<_.length){let n=Math.max(.2,e.half??8);if(r.has(`uHalf`)||t.uHalf.value.set(n,n),!r.has(`uWaveAmp`)){let n=(e.waveAmp??.16)*a;t.uWaveAmp.value.set(n,n*.68,n*.44,n*.26)}if(!r.has(`uWaveLength`)){let n=Math.max(.05,e.waveLength??5.5);t.uWaveLength.value.set(n,n*.56,n*.35,n*.2)}if(!r.has(`uWaveSpeed`)){let n=(e.waveSpeed??1.6)*o;t.uWaveSpeed.value.set(n,n*.75,n*.56,n*.44)}if(!r.has(`uWaveAngle`)){let n=e.waveAngle??.4;t.uWaveAngle.value.set(n,n+.7,n+1.8,n+3)}r.has(`uChop`)||(t.uChop.value=(e.chop??.05)*a),r.has(`uChopScale`)||(t.uChopScale.value=Math.max(.01,(e.chopScale??.55)*i)),r.has(`uChopSpeed`)||(t.uChopSpeed.value=(e.chopSpeed??.3)*o),r.has(`uWaveFront`)||(t.uWaveFront.value=e.waveFront??.5),r.has(`uCrestHeight`)||(t.uCrestHeight.value=Math.max(0,e.crestHeight??1.1)),r.has(`uCrestBack`)||(t.uCrestBack.value=Math.max(.02,e.crestBack??3.2)),r.has(`uCrestFace`)||(t.uCrestFace.value=Math.max(.01,e.crestFace??.5)),r.has(`uCrestWidth`)||(t.uCrestWidth.value=Math.max(0,Math.min(1,e.crestWidth??.8))),r.has(`uCrestFeather`)||(t.uCrestFeather.value=Math.max(.001,e.crestFeather??.25)),r.has(`uCrestBreak`)||(t.uCrestBreak.value=Math.max(0,Math.min(1,e.crestBreak??.35))),r.has(`uCrestBreakScale`)||(t.uCrestBreakScale.value=Math.max(.01,(e.crestBreakScale??.6)*i)),r.has(`uRippleAmp`)||(t.uRippleAmp.value=(e.rippleAmp??.12)*a),r.has(`uRippleSpeed`)||(t.uRippleSpeed.value=Math.max(.01,(e.rippleSpeed??3.2)*o)),r.has(`uRippleLength`)||(t.uRippleLength.value=Math.max(.05,e.rippleLength??1.1)),r.has(`uRippleWidth`)||(t.uRippleWidth.value=Math.max(.02,e.rippleWidth??.7)),r.has(`uRippleDecay`)||(t.uRippleDecay.value=Math.max(.02,e.rippleDecay??1.4)),r.has(`uRippleSpread`)||(t.uRippleSpread.value=Math.max(.05,e.rippleSpread??3))}let f=Math.max(.02,Math.min(1,e.penumbra??.35)),h=Math.max(.01,Math.min(1.5,e.coneAngle??.45)),g=Math.max(.05,e.projectorHeight??5),v=Math.max(.05,e.laneWidth??2.6),y=Math.max(.02,e.laneFeather??.9),b=Math.max(0,e.spanBack??2),x=Math.max(0,e.spanFront??7);t.uPenumbra.value=f,t.uConeAngle.value=h,t.uProjHeight.value=g,t.uLaneWidth.value=v,t.uLaneFeather.value=y,t.uFront.value=Math.max(0,Math.min(1,e.front??.5)),t.uSpanBack.value=b,t.uSpanFront.value=x,t.uFade.value=e.fade??1,t.uOpacity.value=(e.opacity??1)*(e.opacityScale??1),t.uEmissive.value=e.emissive??1,t.uWash.value=Math.max(0,e.wash??.18),t.uFringeAt.value=Math.max(0,e.fringeAt??1.6),t.uDepthFade.value=Math.max(.001,e.depthFade??.45),t.uColorNet.value.copy(n(e.colorNet??`#9fe6ff`)),t.uColorFringe.value.copy(n(e.colorFringe??`#ffffff`)),t.uColorWash.value.copy(n(e.colorWash??`#2a6d86`)),this.setAdditive(e.additive??!0),e.lightAxis?(C.copy(e.lightAxis),C.lengthSq()<1e-8&&C.set(0,-1,0),C.normalize()):C.set(0,-1,0),t.uLightAxis.value.copy(C);let S,w;if(this.shape===m.LANE)S=(v+y)*2+.4,w=c+x+b+y*2+.4;else if(this.shape===m.CONE){let e=Math.max(.2,Math.abs(C.y)),t=g*Math.tan(h)*(1+f),n=g*Math.hypot(C.x,C.z)/e;S=(Math.max(s,t+n)+.4)*2,w=S}else S=(s+.4)*2,w=S;t.uQuadSize.value.set(S,w),this.mesh.scale.set(S,1,w);let T=e.yaw??0,E=e.centre,D=e.height??.015;E?(this.mesh.position.set(E.x,E.y+D,E.z),t.uAnchor.value.set(E.x,E.y+D,E.z)):(this.mesh.position.y=D,t.uAnchor.value.copy(this.mesh.position)),this.mesh.rotation.set(0,T,0)}setAdditive(e){e!==this._additive&&(this._additive=e,this.material.blendDst=e?201:205)}dispose(){this.parent?.remove(this.mesh),this.material.dispose(),d(),this.geometry=null}};export{S as i,p as n,w as r,m as t};
//# sourceMappingURL=Caustics-A8hOM6Db.js.map