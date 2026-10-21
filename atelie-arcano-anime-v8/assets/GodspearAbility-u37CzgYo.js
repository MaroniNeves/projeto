import{$t as e,Br as t,G as n,Gr as r,K as i,Ot as a,Qt as o,R as s,V as c,Y as l,at as u,ct as d,di as f,fi as p,o as m,q as h,st as g,tt as _,xt as v,y,yn as b}from"./settings-DdywqLlV.js";import{n as x}from"./shaderPatch-DNdzBjlE.js";import{t as S}from"./ParticleSystem-BZTczMT8.js";import{n as C}from"./ParticleEngine-DLxipNH0.js";import{n as w,t as T}from"./Ability-CYesB5Ur.js";import{i as E,n as D,r as O,t as k}from"./Caustics-A8hOM6Db.js";var A=Object.freeze({SINGLE:0,LINE:1,RING:2,SCATTER:3}),j=Object.freeze([`SINGLE`,`LINE`,`RING`,`SCATTER`]),ee=`
  #define TAU 6.283185307179586

  #define SL_SINGLE  0
  #define SL_LINE    1
  #define SL_RING    2
  #define SL_SCATTER 3

  uniform vec3  uAnchor;     // world, on the floor
  uniform vec3  uAlong;      // unit, the cast's heading
  uniform vec3  uSide;       // unit, across it
  uniform vec3  uUp;         // unit, the shaft's own up. Pass -frame.uLightDir for sun shafts

  uniform float uLayout;
  uniform float uCount;
  uniform float uSpacing;    // metres between shafts (LINE)
  uniform float uRing;       // metres (RING)
  uniform float uScatter;    // metres of positional slop
  uniform float uSeed;

  uniform float uLength;        // metres, mouth to foot
  uniform float uRadiusMouth;   // metres
  uniform float uRadiusFoot;    // metres
  uniform float uLengthJitter;  // 0..1
  uniform float uRadiusJitter;  // 0..1
  uniform float uHullPad;       // how much wider than the shaft the bound is

  uniform float uFade;
  uniform float uSweep;       // 0..1 — where the lit window sits along the rank
  uniform float uSweepWidth;  // 0..1 of the rank

  attribute float aIndex;
  attribute vec4  aDice;      // four unitless rolls. The only captured state

  varying vec3  vMouth;
  varying vec3  vAxis;        // unit, pointing DOWN the shaft
  varying vec3  vWorld;
  varying vec3  vRadii;       // x = at the mouth, y = at the foot, z = length
  varying vec2  vShaft;       // x = per-shaft amplitude, y = seed

  void main() {
    if (aIndex > uCount - 0.5) {
      // Collapsed off-screen rather than scaled to zero: a degenerate triangle
      // still rasterises a sliver on some drivers, and this shader's fragment is
      // the expensive one in the file.
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }

    float slot = uCount > 1.5 ? aIndex / (uCount - 1.0) : 0.5;

    /* ---- where this shaft stands ---- */
    vec3 offset = vec3(0.0);
    // NOT called 'layout': that identifier is a keyword in GLSL ES 3.00, and a
    // shader that only ever compiles under 1.00 today is one glslVersion away
    // from a build error nobody would connect to this line.
    // (And no backticks in here. This comment cost a round-trip proving that
    // README trap #1 is still live in 2026.)
    int rank = int(uLayout + 0.5);
    if (rank == SL_LINE) {
      offset = uAlong * ((aIndex - (uCount - 1.0) * 0.5) * uSpacing);
    } else if (rank == SL_RING) {
      float bearing = TAU * (aIndex / max(uCount, 1.0)) + uSeed;
      offset = (uSide * cos(bearing) + uAlong * sin(bearing)) * uRing;
    } else if (rank == SL_SCATTER) {
      float bearing = TAU * aDice.x;
      float reach = sqrt(aDice.y) * uRing;
      offset = (uSide * cos(bearing) + uAlong * sin(bearing)) * reach;
    }
    offset += (uSide * (aDice.z - 0.5) + uAlong * (aDice.w - 0.5)) * uScatter;

    /* ---- how big it is, resolved from live metres every frame ---- */
    float len = max(uLength * (1.0 + (aDice.x - 0.5) * uLengthJitter), 0.05);
    float jr = 1.0 + (aDice.y - 0.5) * uRadiusJitter;
    float rMouth = max(uRadiusMouth * jr, 0.01);
    float rFoot = max(uRadiusFoot * jr, 0.01);

    vec3 axis = normalize(-uUp);
    vec3 foot = uAnchor + offset;
    vec3 mouth = foot - axis * len;

    /* ---- the sweep: a window travelling down the rank ---- */
    float window = 1.0;
    if (uSweepWidth < 0.999) {
      float d = abs(slot - uSweep) / max(uSweepWidth, 1e-3);
      window = 1.0 - smoothstep(0.6, 1.0, d);
    }

    vMouth = mouth;
    vAxis = axis;
    vRadii = vec3(rMouth, rFoot, len);
    vShaft = vec2(uFade * window, aDice.z * 37.0 + aIndex * 11.7 + uSeed);

    /* ---- the bound ----
     * position.y is +0.5 at the mouth and -0.5 at the foot; the caps sit at
     * those two planes with |position.xz| <= 1, so one expression places wall
     * and cap alike. */
    float k = 0.5 - position.y;                 // 0 at the mouth, 1 at the foot
    float rad = mix(rMouth, rFoot, k) * uHullPad;
    // The same basis the fragment derives, by the same rule, so the hull cannot
    // end up rotated a few degrees off the primitive it is supposed to bound.
    // Derived rather than passed: two more varyings to save four instructions.
    vec3 ref = abs(axis.y) > 0.95 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 perpA = normalize(cross(ref, axis));
    vec3 perpB = cross(axis, perpA);
    vec3 world = mouth + axis * (k * len) + (perpA * position.x + perpB * position.z) * rad;

    vWorld = world;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`,te=`
  uniform float uTime;

  /* ---- the medium ---- */
  uniform float uSteps;        // marching samples; capped by MAX_STEPS
  uniform float uJitter;       // 0..1 dither on the first sample, kills the banding
  uniform float uDensity;      // per metre — the in-scattering coefficient
  uniform float uExtinct;      // 1/metres, down the shaft: the beam loses energy
  uniform float uSoft;         // widens the gaussian core. NOT an edge
  uniform float uAxialCurve;   // how the medium thins toward the mouth
  uniform float uAxialMouth;   // 0..1 density AT the mouth — never let this be 0
  uniform float uAnisotropy;   // -0.95..0.95, the Henyey-Greenstein g
  uniform float uContact;      // metres of feather where the shaft meets geometry

  /* ---- the shaft's own silhouette ---- */
  uniform float uGobo;         // 0..1 how much of the shaft the gaps eat
  uniform float uGoboScale;    // cycles per metre, across the shaft
  uniform float uGoboBias;     // moves the gate: bigger = more open sky
  uniform float uGoboDrift;    // radians/second the canopy stirs

  /* ---- dust ---- */
  uniform float uMote;         // 0 disables the lattice outright
  uniform float uMoteScale;    // cells per metre
  uniform float uMoteSize;     // 0..1 of a cell
  uniform float uMoteFall;     // cells/second the lattice drifts down

  /* ---- the ground ---- */
  uniform float uBounce;       // how much of the landed light comes back at you
  uniform float uPoolSoft;     // widens the band's gaussian
  uniform float uLandBand;     // metres either side of the foot plane that count

  /* ---- output ---- */
  uniform float uIntensity;
  uniform vec3  uColorMouth;
  uniform vec3  uColorFoot;
  uniform vec3  uColorMote;
  uniform vec3  uColorPool;

  uniform sampler2D uSceneDepth;
  uniform vec2      uResolution;
  uniform float     uCameraNear;
  uniform float     uCameraFar;
  uniform float     uGlobalGlow;
  uniform float     uShaderIntensity;

  varying vec3  vMouth;
  varying vec3  vAxis;
  varying vec3  vWorld;
  varying vec3  vRadii;
  varying vec2  vShaft;

  ${l}
  ${h}

  /**
   * Henyey-Greenstein, normalised so g = 0 gives exactly 1.
   *
   * This is the whole reason the module exists. 'c' is the cosine between the
   * direction the light is travelling and the direction it would have to go to
   * reach the eye; at g = 0.7 a shaft looked at nearly end-on is about eight
   * times the brightness of the same shaft looked at across, and that ratio is
   * what the eye reads as "there is light in the air" rather than "there is a
   * translucent cone in the scene".
   *
   * The denominator is (1 + g^2 - 2gc)^1.5 and cannot go negative for |g| < 1,
   * because its minimum is (1 - |g|)^2. It is still clamped: g arrives from a
   * slider and 1.0 is one drag away.
   */
  float shaftPhase(float g, float c) {
    float gg = clamp(g, -0.95, 0.95);
    float d = 1.0 + gg * gg - 2.0 * gg * c;
    return (1.0 - gg * gg) / pow(max(d, 1e-4), 1.5);
  }

  /** The canopy the light came through. Fixed across the shaft, so gaps are gaps. */
  float shaftGobo(vec2 cross2, float seed) {
    if (uGobo <= 0.0) return 1.0;
    float n = snoise(vec3(cross2 * uGoboScale, seed + uTime * uGoboDrift));
    return mix(1.0, smoothstep(-uGoboBias, uGoboBias + 0.4, n), uGobo);
  }

  void main() {
    float amp = vShaft.x;
    if (amp <= 0.002) discard;

    vec3 ro = cameraPosition;
    vec3 rd = normalize(vWorld - ro);

    vec3 O = vMouth;
    vec3 D = vAxis;
    float len = vRadii.z;
    float rMouth = vRadii.x;
    float rFoot = vRadii.y;
    float rMax = max(rMouth, rFoot);

    /* ---- how far the ray may go before something opaque stops it ---- */
    vec2 screenUV = gl_FragCoord.xy / uResolution;
    float depthBits = unpackRGBAToDepth(texture2D(uSceneDepth, screenUV));
    float sceneViewZ = perspectiveDepthToViewZ(depthBits, uCameraNear, uCameraFar);
    // The third row of the view matrix is the camera's own -Z in world space, so
    // this converts a view-space depth into a distance along OUR ray without
    // needing the inverse projection.
    vec3 row2 = vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]);
    float axialCos = dot(row2, rd);
    float sScene = abs(axialCos) > 1e-4 ? sceneViewZ / axialCos : 1e6;
    if (sScene < 0.0) sScene = 1e6;

    /* ---- the axial slab: 0 <= a <= len ---- */
    vec3 w = ro - O;
    float a0 = dot(w, D);
    float ad = dot(rd, D);
    float sNear = 0.0;
    float sFar = 1e6;
    if (abs(ad) > 1e-5) {
      float s1 = -a0 / ad;
      float s2 = (len - a0) / ad;
      sNear = min(s1, s2);
      sFar = max(s1, s2);
    } else if (a0 < 0.0 || a0 > len) {
      discard;
    }

    /* ---- the enclosing cylinder ---- */
    vec3 wp = w - D * a0;
    vec3 rp = rd - D * ad;
    float A = dot(rp, rp);
    float B = 2.0 * dot(wp, rp);
    float C = dot(wp, wp) - rMax * rMax;
    if (A > 1e-6) {
      float disc = B * B - 4.0 * A * C;
      if (disc < 0.0) discard;
      float sq = sqrt(disc);
      sNear = max(sNear, (-B - sq) / (2.0 * A));
      sFar = min(sFar, (-B + sq) / (2.0 * A));
    } else if (C > 0.0) {
      discard;
    }

    sNear = max(sNear, 0.0);
    // Beyond the scene surface plus the contact feather there is nothing left to
    // integrate, so the march stops there rather than spending samples inside a
    // wall. The feather itself is applied per sample, below.
    sFar = min(sFar, sScene + uContact);
    if (sFar <= sNear) discard;

    /* ---- march ---- */
    float steps = clamp(uSteps, 4.0, float(MAX_STEPS));
    float ds = (sFar - sNear) / steps;
    float dither = uJitter * (hash13(vec3(gl_FragCoord.xy, uTime * 60.0)) - 0.5);
    float s = sNear + ds * (0.5 + dither);

    // A basis across the shaft, derived rather than passed: two more varyings
    // would have cost a slot on WebGL1 hardware to save four instructions.
    vec3 up = abs(D.y) > 0.95 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 sideA = normalize(cross(up, D));
    vec3 sideB = cross(D, sideA);

    float accMouth = 0.0;
    float accFoot = 0.0;
    float accMote = 0.0;

    for (int i = 0; i < MAX_STEPS; i++) {
      if (float(i) >= steps) break;

      vec3 P = ro + rd * s;
      float a = dot(P - O, D);
      float k = clamp(a / len, 0.0, 1.0);

      vec3 off = (P - O) - D * a;
      float rad = mix(rMouth, rFoot, k);
      float r2 = dot(off, off);
      // A gaussian, not a smoothstep. A shaft has a falloff, not an edge, and a
      // smoothstep draws the surface of the cone you were trying not to have.
      float fall = exp(-r2 / max(rad * rad * uSoft, 1e-6));

      if (fall > 0.0015) {
        vec2 cross2 = vec2(dot(off, sideA), dot(off, sideB));
        float gate = shaftGobo(cross2, vShaft.y);
        // Thinner near the mouth: dust settles, and a column of even density
        // reads as a solid object because nothing about it varies. The mix
        // floor is not tidiness — a bare pow(k, c) is exactly zero at the mouth,
        // which puts a hard flat disc of nothing where the shaft enters and
        // reads as the shaft having been cut off with scissors.
        float axial = mix(uAxialMouth, 1.0, pow(k, max(uAxialCurve, 0.001)));
        // Feathered against whatever is in front. This is the soft intersection:
        // the medium stops existing over uContact metres as it reaches the floor.
        float clip = smoothstep(0.0, max(uContact, 1e-3), sScene - s);
        float dens = fall * gate * axial * clip;
        float trans = exp(-max(uExtinct, 0.0) * a);
        float lit = dens * trans;

        accMouth += lit * (1.0 - k);
        accFoot += lit * k;

        if (uMote > 0.0) {
          vec3 q = P * uMoteScale + vec3(0.0, uTime * uMoteFall, 0.0);
          vec3 ci = floor(q);
          vec3 cf = fract(q);
          vec3 o = hash31(dot(ci, vec3(7.13, 113.17, 31.71)));
          float d = length(cf - o);
          accMote += smoothstep(max(uMoteSize, 1e-3), 0.0, d) * lit;
        }
      }

      s += ds;
    }

    float scale = ds * uDensity;
    accMouth *= scale;
    accFoot *= scale;
    accMote *= scale;

    /* ---- anisotropy ----
     * cos between the direction the light travels (D) and the direction back to
     * the eye (-rd). Looking up the shaft toward its mouth gives c -> 1 and the
     * forward lobe. */
    float phase = shaftPhase(uAnisotropy, dot(D, -rd));

    /* ---- the band on the ground ----
     * Not a decal. The ray stopped somewhere; if that somewhere is inside the
     * shaft's footprint and near its foot plane, the light that landed there is
     * bouncing back at us, and it carries the same radial falloff, the same
     * canopy gaps and the same axial extinction the air above it has. */
    float pool = 0.0;
    if (uBounce > 0.0 && sScene < 1e5) {
      vec3 hit = ro + rd * sScene;
      float ha = dot(hit - O, D);
      vec3 hoff = (hit - O) - D * ha;
      float hk = clamp(ha / len, 0.0, 1.0);
      float hrad = mix(rMouth, rFoot, hk);
      float hfall = exp(-dot(hoff, hoff) / max(hrad * hrad * uPoolSoft, 1e-6));
      float band = 1.0 - smoothstep(0.0, max(uLandBand, 1e-3), abs(ha - len));
      vec2 hcross = vec2(dot(hoff, sideA), dot(hoff, sideB));
      // Lambert against a horizontal receiver. The module cannot know the real
      // normal without a normal buffer, and the ground is what a shaft lands on.
      float lambert = clamp(-D.y, 0.0, 1.0);
      pool = hfall * band * shaftGobo(hcross, vShaft.y) * exp(-max(uExtinct, 0.0) * ha) * lambert;
    }

    float gain = amp * uIntensity * uShaderIntensity;
    vec3 rgb = (uColorMouth * accMouth + uColorFoot * accFoot) * phase;
    rgb += uColorMote * (accMote * uMote);
    rgb += uColorPool * (pool * uBounce);
    rgb *= gain;

    float lum = max(max(rgb.r, rgb.g), rgb.b);
    if (lum < 0.003) discard;

    // Alpha 1 with AdditiveBlending (SrcAlpha, One) means the destination gets
    // rgb, once. Writing the luminance here instead — the obvious thing — makes
    // the blend square it, so every dim part of the shaft goes to nothing and
    // only the core survives. Light adds; it does not add proportionally to how
    // bright it already is.
    gl_FragColor = vec4(rgb * uGlobalGlow, 1.0);
  }
`;function M(){return{layout:A.SINGLE,count:1,spacing:3.2,ring:4,scatter:.4,seed:0,length:9,radiusMouth:.5,radiusFoot:1.6,lengthJitter:.15,radiusJitter:.2,hullPad:1.35,steps:28,jitter:.9,density:.5,extinct:.06,soft:.55,axialCurve:.55,axialMouth:.4,anisotropy:.62,contact:.7,gobo:.55,goboScale:.5,goboBias:.18,goboDrift:.08,mote:.7,moteScale:2.6,moteSize:.13,moteFall:.09,bounce:.9,poolSoft:.75,landBand:.5,fade:1,sweep:.5,sweepWidth:1,intensity:1,colorMouth:`#fff4d6`,colorFoot:`#ffd79a`,colorMote:`#fffbee`,colorPool:`#ffe6b4`,noiseStrength:1,noiseFrequency:1,noiseSpeed:1,opacityScale:1}}var N=new f(0,0,1),P=new f(0,1,0),F=new f(1,0,0),I=new f(0,-1,0),L=new f,R=new f;function z(e){let t=e*1013904223+1664525>>>0;return()=>{t=t+1831565813>>>0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}var B=class{constructor(n,s={}){let{capacity:l=6,layout:u=A.SINGLE,sides:d=14,maxSteps:p=48,layer:m=c.VFX,renderOrder:h=10,name:g=null}=s;this.parent=n,this.capacity=Math.max(1,Math.round(l)),this.maxSteps=Math.max(4,Math.round(p)),this._count=0,this._dice=new Float32Array(this.capacity*4);let _=new Float32Array(this.capacity);for(let e=0;e<this.capacity;e++)_[e]=e;this.roll(0);let y=new a(1,1,1,Math.max(3,Math.round(d)),1,!1),x=new e;x.setAttribute(`position`,y.getAttribute(`position`)),x.setIndex(y.getIndex()),x.setAttribute(`aIndex`,new o(_,1)),x.setAttribute(`aDice`,new o(this._dice,4)),x.instanceCount=0,x.boundingSphere=new r(new f,1e4),this.geometry=x,this.material=new t({defines:{MAX_STEPS:this.maxSteps},transparent:!0,depthWrite:!1,depthTest:!1,blending:2,side:1,toneMapped:!1,uniforms:i({uAnchor:{value:new f},uAlong:{value:new f(0,0,1)},uSide:{value:new f(1,0,0)},uUp:{value:new f(0,1,0)},uLayout:{value:u},uCount:{value:1},uSpacing:{value:3.2},uRing:{value:4},uScatter:{value:.4},uSeed:{value:0},uLength:{value:9},uRadiusMouth:{value:.5},uRadiusFoot:{value:1.6},uLengthJitter:{value:.15},uRadiusJitter:{value:.2},uHullPad:{value:1.35},uFade:{value:1},uSweep:{value:.5},uSweepWidth:{value:1},uSteps:{value:28},uJitter:{value:.9},uDensity:{value:.5},uExtinct:{value:.06},uSoft:{value:.55},uAxialCurve:{value:.55},uAxialMouth:{value:.4},uAnisotropy:{value:.62},uContact:{value:.7},uGobo:{value:.55},uGoboScale:{value:.5},uGoboBias:{value:.18},uGoboDrift:{value:.08},uMote:{value:.7},uMoteScale:{value:2.6},uMoteSize:{value:.13},uMoteFall:{value:.09},uBounce:{value:.9},uPoolSoft:{value:.75},uLandBand:{value:.5},uIntensity:{value:1},uColorMouth:{value:new v(1,.96,.84)},uColorFoot:{value:new v(1,.84,.6)},uColorMote:{value:new v(1,.98,.93)},uColorPool:{value:new v(1,.9,.7)}}),vertexShader:ee,fragmentShader:te}),this.mesh=new b(this.geometry,this.material),this.mesh.name=g??`LightShaft:${j[u]??u}`,this.mesh.layers.set(m),this.mesh.renderOrder=h,this.mesh.frustumCulled=!1,this.mesh.visible=!1,n?.add(this.mesh)}get object3D(){return this.mesh}get drawCalls(){return 1}get instanceCount(){return this._count}get layout(){return this.material.uniforms.uLayout.value}set layout(e){this.material.uniforms.uLayout.value=e}get visible(){return this.mesh.visible}set visible(e){this.mesh.visible=e}setPlacement(e,t,n){let r=this.material.uniforms;return e&&r.uAnchor.value.copy(e),N.copy(t??N),N.lengthSq()<1e-8&&N.set(0,0,1),N.normalize(),P.copy(n??P),P.lengthSq()<1e-8&&P.set(0,1,0),P.normalize(),F.crossVectors(P,N),F.lengthSq()<1e-8&&F.set(1,0,0),F.normalize(),r.uAlong.value.copy(N),r.uUp.value.copy(P),r.uSide.value.copy(F),this}roll(e=Math.random()*100){let t=z(Math.floor(Math.abs(e)*1013)+7);for(let e=0;e<this._dice.length;e++)this._dice[e]=t();return this.geometry&&(this.geometry.getAttribute(`aDice`).needsUpdate=!0),this.material&&(this.material.uniforms.uSeed.value=e),this}reset(){return this._count=0,this.geometry&&(this.geometry.instanceCount=0),this.mesh.visible=!1,this}update(e){let t=this.material.uniforms,n=e.noiseFrequency??1,r=e.noiseStrength??1,i=e.noiseSpeed??1,a=Math.max(0,Math.min(this.capacity,Math.round(e.count??1)));this._count=a,this.geometry.instanceCount=a,this.mesh.visible=a>0&&(e.fade??1)>5e-4,t.uLayout.value=e.layout??A.SINGLE,t.uCount.value=Math.max(1,a),t.uSpacing.value=e.spacing??3.2,t.uRing.value=Math.max(0,e.ring??4),t.uScatter.value=Math.max(0,e.scatter??.4),e.seed!==void 0&&e.seed!==null&&(t.uSeed.value=e.seed),t.uLength.value=Math.max(.05,e.length??9),t.uRadiusMouth.value=Math.max(.01,e.radiusMouth??.5),t.uRadiusFoot.value=Math.max(.01,e.radiusFoot??1.6),t.uLengthJitter.value=Math.max(0,Math.min(1,e.lengthJitter??.15)),t.uRadiusJitter.value=Math.max(0,Math.min(1,e.radiusJitter??.2)),t.uHullPad.value=Math.max(1,e.hullPad??1.35),t.uFade.value=(e.fade??1)*(e.opacityScale??1),t.uSweep.value=e.sweep??.5,t.uSweepWidth.value=Math.max(.01,e.sweepWidth??1),t.uSteps.value=Math.max(4,Math.min(this.maxSteps,Math.round(e.steps??28))),t.uJitter.value=Math.max(0,e.jitter??.9),t.uDensity.value=Math.max(0,e.density??.5),t.uExtinct.value=Math.max(0,e.extinct??.06),t.uSoft.value=Math.max(.02,e.soft??.55),t.uAxialCurve.value=Math.max(0,e.axialCurve??.55),t.uAxialMouth.value=Math.max(0,Math.min(1,e.axialMouth??.4)),t.uAnisotropy.value=Math.max(-.95,Math.min(.95,e.anisotropy??.62)),t.uContact.value=Math.max(.001,e.contact??.7),t.uGobo.value=Math.max(0,Math.min(1,(e.gobo??.55)*r)),t.uGoboScale.value=Math.max(.01,(e.goboScale??.5)*n),t.uGoboBias.value=e.goboBias??.18,t.uGoboDrift.value=(e.goboDrift??.08)*i,t.uMote.value=Math.max(0,e.mote??.7),t.uMoteScale.value=Math.max(.01,(e.moteScale??2.6)*n),t.uMoteSize.value=Math.max(.001,Math.min(.9,e.moteSize??.13)),t.uMoteFall.value=(e.moteFall??.09)*i,t.uBounce.value=Math.max(0,e.bounce??.9),t.uPoolSoft.value=Math.max(.02,e.poolSoft??.75),t.uLandBand.value=Math.max(.001,e.landBand??.5),t.uIntensity.value=Math.max(0,e.intensity??1),t.uColorMouth.value.copy(s(e.colorMouth??`#fff4d6`)),t.uColorFoot.value.copy(s(e.colorFoot??`#ffd79a`)),t.uColorMote.value.copy(s(e.colorMote??`#fffbee`)),t.uColorPool.value.copy(s(e.colorPool??`#ffe6b4`))}footPoint(e,t,n){let r=this.material.uniforms,i=Math.max(0,Math.min(this.capacity-1,Math.round(e))),a=this._dice[i*4],o=this._dice[i*4+1],s=this._dice[i*4+2],c=this._dice[i*4+3],l=Math.max(1,this._count),u=t?.layout??r.uLayout.value,d=r.uAlong.value,f=r.uSide.value,p=Math.max(0,t?.ring??r.uRing.value),m=Math.max(0,t?.scatter??r.uScatter.value),h=t?.spacing??r.uSpacing.value,g=t?.seed??r.uSeed.value;if(n.copy(r.uAnchor.value),u===A.LINE)n.addScaledVector(d,(i-(l-1)*.5)*h);else if(u===A.RING){let e=Math.PI*2*(i/l)+g;n.addScaledVector(f,Math.cos(e)*p),n.addScaledVector(d,Math.sin(e)*p)}else if(u===A.SCATTER){let e=Math.PI*2*a,t=Math.sqrt(o)*p;n.addScaledVector(f,Math.cos(e)*t),n.addScaledVector(d,Math.sin(e)*t)}return n.addScaledVector(f,(s-.5)*m),n.addScaledVector(d,(c-.5)*m),n}mouthPoint(e,t,n){let r=this.material.uniforms,i=Math.max(0,Math.min(this.capacity-1,Math.round(e))),a=t?.lengthJitter??r.uLengthJitter.value,o=Math.max(.05,(t?.length??r.uLength.value)*(1+(this._dice[i*4]-.5)*a));return this.footPoint(i,t,n),n.addScaledVector(r.uUp.value,o)}irradianceAt(e,t,n=null){let r=this.material.uniforms,i=this._count;if(i<=0)return 0;I.copy(r.uUp.value).negate();let a=Math.max(.02,t?.soft??r.uSoft.value),o=Math.max(.001,t?.axialCurve??r.uAxialCurve.value),s=Math.max(0,Math.min(1,t?.axialMouth??r.uAxialMouth.value)),c=Math.max(0,t?.extinct??r.uExtinct.value),l=t?.radiusJitter??r.uRadiusJitter.value,u=t?.lengthJitter??r.uLengthJitter.value,d=Math.max(.01,t?.radiusMouth??r.uRadiusMouth.value),f=Math.max(.01,t?.radiusFoot??r.uRadiusFoot.value),p=Math.max(.05,t?.length??r.uLength.value),m=(t?.fade??r.uFade.value)*(t?.intensity??r.uIntensity.value),h=0;for(let n=0;n<i;n++){let r=Math.max(.05,p*(1+(this._dice[n*4]-.5)*u)),i=1+(this._dice[n*4+1]-.5)*l;this.footPoint(n,t,L),R.copy(e).sub(L);let m=r- -R.dot(I);if(m<0||m>r)continue;let g=m/r,_=Math.max(.01,(d+(f-d)*g)*i),v=R.dot(I),y=Math.max(0,R.lengthSq()-v*v),b=Math.exp(-y/Math.max(_*_*a,1e-6))*(s+(1-s)*g**+o)*Math.exp(-c*m);b>h&&(h=b)}return Math.max(0,Math.min(1,h*m))}dispose(){this.parent?.remove(this.mesh),this.geometry.dispose(),this.material.dispose()}},V=8,H={},U=new f,W=new f,G=new f,K=new f(0,1,0),q=new f(0,-1,0),J=new f(0,1,0),Y=new f,X=new v,Z=M(),Q=E(),ne=`
  uniform vec4  uShaftFeet[${V}];  // xyz = foot in world metres, w = 0..1 amplitude
  uniform float uShaftCount;
  uniform vec3  uShaftAxis;      // unit, pointing DOWN the shafts
  uniform float uShaftLength;    // metres, mouth to foot
  uniform float uShaftRMouth;    // metres
  uniform float uShaftRFoot;     // metres
  uniform float uShaftSoft;      // widens the gaussian core
  uniform float uShaftCurve;     // axial exponent
  uniform float uShaftMouthMin;  // 0..1 density at the mouth
  uniform float uShaftExtinct;   // 1/metres
  uniform float uShaftSwell;     // extra point size at full irradiance

  varying float vShaftLit;

  /* The strongest shaft's irradiance at a world point, 0..1. Mirrors
     LightShaft#irradianceAt term for term, and leaves the canopy gobo out for
     the same reason it does: a mote crossing a leaf edge at four metres a
     second would strobe. */
  float godspearIrradiance(vec3 wp) {
    if (uShaftCount < 0.5) return 0.0;
    float best = 0.0;
    for (int i = 0; i < ${V}; i++) {
      if (float(i) >= uShaftCount) break;
      vec4 foot = uShaftFeet[i];
      if (foot.w <= 0.0) continue;

      vec3 rel = wp - foot.xyz;
      // The axis points down, so a point above the foot has a negative
      // component along it, and a runs 0 at the mouth to uShaftLength at the
      // foot. Same convention as the CPU mirror.
      float along = dot(rel, uShaftAxis);
      float a = uShaftLength + along;
      if (a < 0.0 || a > uShaftLength) continue;

      float k = a / max(uShaftLength, 1e-3);
      float rad = max(mix(uShaftRMouth, uShaftRFoot, k), 0.01);
      float perp2 = max(dot(rel, rel) - along * along, 0.0);
      float fall = exp(-perp2 / max(rad * rad * uShaftSoft, 1e-6));
      float axial = mix(uShaftMouthMin, 1.0, pow(k, max(uShaftCurve, 0.001)));
      best = max(best, fall * axial * exp(-uShaftExtinct * a) * foot.w);
    }
    return clamp(best, 0.0, 1.0);
  }
`,$=new class{constructor(){this.material=null,this.uniforms=null,this.owner=null}attach(e){if(this.uniforms)return!0;let t=e?.getObjectByName?.(`DustMotes`)?.material;if(!t||!t.uniforms)return!1;if(t.userData.godspearDust)return this.material=t,this.uniforms=t.userData.godspearDust,!0;let n=[];for(let e=0;e<V;e++)n.push(new p(0,0,0,0));let r={uShaftFeet:{value:n},uShaftCount:{value:0},uShaftAxis:{value:new f(0,-1,0)},uShaftLength:{value:10},uShaftRMouth:{value:.5},uShaftRFoot:{value:1.5},uShaftSoft:{value:.5},uShaftCurve:{value:.6},uShaftMouthMin:{value:.4},uShaftExtinct:{value:.05},uShaftSwell:{value:1.8},uShaftGain:{value:6},uShaftTint:{value:.85},uShaftColor:{value:new v(1,.95,.81)}};Object.assign(t.uniforms,r);let i=t.vertexShader;i=x(i,`void main() {`,`${ne}\n        void main() {`),i=x(i,`vec4 mv = modelViewMatrix * vec4(p, 1.0);`,`vShaftLit = godspearIrradiance((modelMatrix * vec4(p, 1.0)).xyz);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);`),i=x(i,`gl_PointSize = uSize * uPixelRatio * (0.35 + aSeed * 0.9) / max(dist, 1.0);`,`gl_PointSize = uSize * uPixelRatio * (0.35 + aSeed * 0.9) / max(dist, 1.0);
          gl_PointSize *= 1.0 + uShaftSwell * vShaftLit;`),t.vertexShader=i;let a=t.fragmentShader;return a=x(a,`varying float vSeed;`,`varying float vSeed;
        varying float vShaftLit;
        uniform float uShaftGain;
        uniform float uShaftTint;
        uniform vec3  uShaftColor;`),a=x(a,`vec3 tint = mix(vec3(1.0, 0.93, 0.78), vec3(0.78, 0.9, 1.0), vSeed);`,`vec3 tint = mix(vec3(1.0, 0.93, 0.78), vec3(0.78, 0.9, 1.0), vSeed);
          tint = mix(tint, uShaftColor, clamp(vShaftLit * uShaftTint, 0.0, 1.0));`),a=x(a,`float a = mask * vAlpha * uAmount * 0.3;`,`float a = mask * vAlpha * uAmount * 0.3 * (1.0 + uShaftGain * vShaftLit);`),t.fragmentShader=a,t.needsUpdate=!0,t.userData.godspearDust=r,this.material=t,this.uniforms=r,!0}get slots(){return V}claim(e){return this.owner=e,this.uniforms}release(e){if(!(!this.uniforms||this.owner!==e)){this.owner=null,this.uniforms.uShaftCount.value=0;for(let e of this.uniforms.uShaftFeet.value)e.w=0}}},re=class extends T{constructor(e){super(`godspear`,e)}createShaders(){this.shafts=new B(this.group,{capacity:V,layout:A.LINE,sides:12,maxSteps:48,renderOrder:10,name:`Godspear:Shafts`}),this.net=new O(this.group,{source:D.SCROLL,shape:k.LANE,additive:!0,renderOrder:7,name:`Godspear:Net`}),this._seed=0,this._live=0,this._dust=!1,this._dust=$.attach(this.ctx.scene)}createParticles(){this.ash=this.ctx.particles.get(`godspear.ash`,{capacity:700,shape:S.SOFT,additive:!0,curl:!0,softFade:.5}),this.ash.uniforms.uDrag.value=1.5,this.ash.uniforms.uEndSize.value=.55,this.ash.uniforms.uSizeIn.value=.1,this.ash.uniforms.uFadeIn.value=.14,this.ash.uniforms.uFadeOut.value=.45,this.ashEmitter=new C}get instanceCount(){return this._live}get impactDuration(){return Math.max(.05,m.godspear.lifetime*m.global.lifetime)}get fadeDuration(){return Math.max(.05,m.godspear.fadeTime)}lightShimmer(){let e=m.godspear;return 1-e.lightFlicker*.5*(1-Math.cos(this.age*e.lightFlickerSpeed*Math.PI*2))}_shaftUp(e){let t=m.godspear;return J.copy(n.uLightDir.value),J.lengthSq()<1e-8&&J.set(0,1,0),J.normalize(),e.set(0,1,0).lerp(J,g(t.shaftTilt)),e.lengthSq()<1e-8&&e.set(0,1,0),e.normalize()}_sweep(){return this.phase===w.TRAVEL?g(this.u):1}_sync(e,t){let n=m.godspear,r=m.global,i=this._sweep();this._shaftUp(K),q.copy(K).negate(),this.pointAt(.5,G),this.shafts.setPlacement(G,this.direction,K);let a=Math.max(1,Math.min(V,Math.round(n.shaftCount)));Z.layout=A.LINE,Z.count=a,Z.spacing=this.length*n.shaftSpan/Math.max(1,a-1),Z.ring=0,Z.scatter=n.shaftScatter,Z.seed=this._seed,Z.length=n.shaftLength,Z.radiusMouth=n.shaftRadiusMouth,Z.radiusFoot=n.shaftRadiusFoot,Z.lengthJitter=n.shaftLengthJitter,Z.radiusJitter=n.shaftRadiusJitter,Z.hullPad=n.shaftPad,Z.steps=n.steps,Z.jitter=n.jitter,Z.density=n.density,Z.extinct=n.extinct,Z.soft=n.soft,Z.axialCurve=n.axialCurve,Z.axialMouth=n.axialMouth,Z.anisotropy=n.anisotropy,Z.contact=n.contact,Z.gobo=n.gobo,Z.goboScale=n.goboScale,Z.goboBias=n.goboBias,Z.goboDrift=n.goboDrift,Z.mote=n.shaftMote,Z.bounce=n.bounce,Z.poolSoft=n.poolSoft,Z.landBand=n.landBand,Z.fade=e,Z.sweep=i,Z.sweepWidth=t,Z.intensity=n.intensity,Z.colorMouth=n.colorMouth,Z.colorFoot=n.colorFoot,Z.colorMote=n.colorMote,Z.colorPool=n.colorPool,Z.noiseStrength=r.noiseStrength,Z.noiseFrequency=r.noiseFrequency,Z.noiseSpeed=r.noiseSpeed,Z.opacityScale=r.opacity,this.shafts.update(Z),this._live=this.shafts.instanceCount,this._syncNet(e,i),this._syncDust(e,t,a)}_syncNet(e,t){let n=m.godspear,r=m.global;Q.centre=this.origin,Q.lightAxis=q,Q.yaw=Math.atan2(this.direction.x,this.direction.z),Q.height=n.netHeight,Q.radius=n.netWidth,Q.length=this.length*2,Q.front=g(t*.5),Q.fade=e,Q.now=this.age,Q.seed=this._seed,Q.depth=n.netDepth,Q.ior=n.netIor,Q.dispersion=n.netDispersion,Q.sampleStep=n.netStep,Q.absorb=n.netAbsorb,Q.foldFloor=n.netFoldFloor,Q.threshold=n.netThreshold,Q.gain=n.netGain,Q.sharpness=n.netSharp,Q.rolloff=n.netRolloff,Q.sourceAmp=n.netAmp,Q.cellScale=n.netCellScale,Q.cellRatio=n.netCellRatio,Q.cellJitter=n.netCellJitter,Q.driftAngle=n.netDriftAngle,Q.driftSpeed=n.netDriftSpeed,Q.boil=n.netBoil,Q.ridgeMix=n.netRidgeMix,Q.ridgeScale=n.netRidgeScale,Q.ridgePower=n.netRidgePower,Q.penumbra=n.netPenumbra,Q.laneWidth=n.netWidth,Q.laneFeather=n.netFeather,Q.spanBack=n.netBack,Q.spanFront=n.netAhead,Q.additive=!0,Q.emissive=n.netEmissive*r.glow,Q.opacity=n.netOpacity,Q.wash=n.netWash,Q.fringeAt=n.netFringeAt,Q.depthFade=n.netDepthFade,Q.colorNet=n.colorNet,Q.colorFringe=n.colorFringe,Q.colorWash=n.colorWash,Q.noiseStrength=r.noiseStrength,Q.noiseFrequency=r.noiseFrequency,Q.noiseSpeed=r.noiseSpeed,Q.opacityScale=r.opacity,this.net.update(Q)}_syncDust(e,t,n){if(!this._dust)return;let r=m.godspear,i=$.claim(this),a=this._sweep();i.uShaftCount.value=n,i.uShaftAxis.value.copy(q),i.uShaftLength.value=Math.max(.05,r.shaftLength),i.uShaftRMouth.value=Math.max(.01,r.shaftRadiusMouth),i.uShaftRFoot.value=Math.max(.01,r.shaftRadiusFoot),i.uShaftSoft.value=Math.max(.02,r.soft),i.uShaftCurve.value=Math.max(.001,r.axialCurve),i.uShaftMouthMin.value=g(r.axialMouth),i.uShaftExtinct.value=Math.max(0,r.extinct),i.uShaftSwell.value=Math.max(0,r.dustSwell),i.uShaftGain.value=Math.max(0,r.dustGain),i.uShaftTint.value=g(r.dustTint),i.uShaftColor.value.copy(s(r.colorDust));let o=i.uShaftFeet.value;for(let r=0;r<V;r++){let i=o[r];if(r>=n){i.w=0;continue}this.shafts.footPoint(r,Z,U);let s=n>1?r/(n-1):.5,c=1;t<.999&&(c=1-d(.6,1,Math.abs(s-a)/Math.max(t,.001))),i.set(U.x,U.y,U.z,e*c)}}_bandPoint(e){return this.pointAt(this._sweep(),e).setY(0)}_ashFx(e,t){let r=m.godspear,i=m.global,a=Math.round(this.ashEmitter.tick(e,r.ashRate*t)*i.particleCount);if(a<=0)return;this._bandPoint(U),U.y=r.ashSize*4,Y.copy(U),Y.y=Math.max(Y.y,r.shaftRadiusFoot*.5);let o=this.shafts.irradianceAt(Y,Z);X.copy(s(r.colorAshD)).lerp(s(r.colorAshA),g(o)),H.position=U,H.radius=r.ashSpread,H.direction=W.copy(this.direction).multiplyScalar(.3).setY(1).normalize(),H.speed=r.ashSpeed,H.speedVariance=.8,H.spread=.95,H.inherit=null,H.anchor=null,H.size=.1,H.sizeVariance=.7,H.life=r.ashLifetime,H.lifeVariance=.5,H.spin=0,H.tint=X,H.time=n.uTime.value,this.ash.emit(a,H)}_syncAsh(){let e=m.godspear,t=m.global;this.ash.setGradient(s(e.colorAshA),s(e.colorAshB),s(e.colorAshC),s(e.colorAshD)),this.ash.uniforms.uGravity.value.set(0,e.ashRise,0),this.ash.uniforms.uSizeScale.value=e.ashSize*t.particleSize*7,this.ash.uniforms.uLifeScale.value=e.ashLifetime*.5*t.particleLifetime,this.ash.uniforms.uSpeedScale.value=t.particleSpeed,this.ash.uniforms.uOpacity.value=t.opacity,this.ash.uniforms.uGlow.value=e.intensity*.8*t.glow,this.ash.uniforms.uTurbulence.value=e.ashTurbulence*t.turbulence}_placeLight(){this._bandPoint(this.position),this.position.y=m.godspear.lightHeight}onSpawn(){let e=m.godspear,t=m.global;this.ashEmitter.reset(),this._seed=Math.random()*100,this.shafts.reset(),this.shafts.roll(this._seed),this.net.reset(),this.net.setVisible(!0),this._sync(1,e.sweepWidth),this._syncAsh(),this.ctx.flash.trigger(s(e.colorCastFlash),e.castFlash*t.explosionIntensity),this._placeLight()}onTravel(e){let t=m.godspear;this._sync(1,t.sweepWidth),this._syncAsh(),this._ashFx(e,1),this._placeLight(),this.ctx.shake.rumble(t.rumble*m.global.cameraShake,e)}onImpact(){let e=m.godspear,t=m.global;this.pointAt(1,U),U.y=e.shaftRadiusFoot,this.ctx.bursts.spawn(y.AIR,U,{radius:e.burstSize*.25,endRadius:e.burstSize*t.explosionIntensity,life:.55,intensity:e.burstIntensity,opacity:.8,fresnel:2.1,displace:.3,colorA:s(e.colorBurstA),colorB:s(e.colorBurstB),colorC:s(e.colorBurstC)}),this.ctx.shake.add(e.impactShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),22),this.ctx.flash.trigger(s(e.colorFlash),e.impactFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.6*t.explosionIntensity}onFade(e,t){let n=m.godspear,r=t<=1,i,a;if(r){let e=_.outCubic(g(t/Math.max(.01,n.floodTime)));i=u(n.sweepWidth,1,e),a=1}else{let e=g(t-1);i=u(1,u(1,n.sweepWidth,g(n.retract)),_.inOutQuad(e)),a=1-_.inCubic(e)}this._sync(a,i),this._syncAsh(),this._ashFx(e,a*(r?.7:.3)),this._placeLight()}onDestroy(){this._live=0,this.shafts.reset(),this.net.clearRipples(),this.net.setVisible(!1),$.release(this)}dispose(){this.shafts.dispose(),this.net.dispose(),super.dispose()}};export{re as GodspearAbility};
//# sourceMappingURL=GodspearAbility-u37CzgYo.js.map