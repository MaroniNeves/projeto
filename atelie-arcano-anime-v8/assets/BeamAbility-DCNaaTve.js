import{$ as e,Br as t,G as n,K as r,Q as i,R as a,V as o,Y as s,Z as c,Zt as l,at as u,ct as d,di as f,o as p,ot as m,q as h,st as g,tt as _,xt as v,y,yn as b}from"./settings-DdywqLlV.js";import{t as x}from"./ParticleSystem-BZTczMT8.js";import{n as S}from"./ParticleEngine-DLxipNH0.js";import{n as C}from"./GroundDecals-kYmr8HKl.js";import{n as w,t as T}from"./Ability-CYesB5Ur.js";var E=Object.freeze({CORE:0,SHELL:1,HALO:2,COIL:3,RING:4,ORB:5}),D=`
  #define PI  3.141592653589793
  #define TAU 6.283185307179586

  uniform float uTime;
  uniform vec3  uOrigin;
  uniform vec3  uTarget;
  uniform vec3  uSide;
  uniform float uSeed;
  uniform float uProgress;
  uniform float uFade;
  uniform float uWidthFade;
  uniform float uCharge;

  uniform float uRadius;
  uniform float uRadiusNear;
  uniform float uRadiusCurve;
  uniform float uRadiusScale;
  uniform float uFlare;
  uniform float uFlareWidth;
  uniform float uThrob;
  uniform float uThrobScale;
  uniform float uThrobSpeed;
  uniform float uWander;
  uniform float uWanderScale;
  uniform float uWanderSpeed;

  uniform float uRipple;
  uniform float uRippleBands;
  uniform float uRippleScale;
  uniform float uRippleSpeed;

  uniform float uStreak;
  uniform float uStreakSharp;
  uniform float uStreakScale;
  uniform float uStreakBands;
  uniform float uStreakGlow;
  uniform float uFlowSpeed;

  uniform float uCoreSharp;
  uniform float uCoreFill;
  uniform float uEdgePower;
  uniform float uShellRim;
  uniform float uShellFill;
  uniform float uHaloRim;
  uniform float uPassOpacity;

  uniform float uMouthGlow;
  uniform float uMouthLength;
  uniform float uTipGlow;
  uniform float uTipLength;

  uniform float uCoils;
  uniform float uCoilTurns;
  uniform float uCoilSpeed;
  uniform float uCoilRadius;
  uniform float uCoilFlare;
  uniform float uCoilWidth;
  uniform float uCoilWidthTip;
  uniform float uCoilSharp;
  uniform float uCoilPulse;
  uniform float uCoilPulseFreq;
  uniform float uCoilPulseSpeed;

  uniform float uRingCount;
  uniform float uRingSpeed;
  uniform float uRingInner;
  uniform float uRingOuter;
  uniform float uRingSwell;
  uniform float uRingFade;
  uniform float uRingSharp;

  uniform float uOrbTurbulence;
  uniform float uOrbScale;
  uniform float uOrbFlow;
  uniform float uOrbBands;
  uniform float uOrbRim;

  uniform float uOpacity;
  uniform float uGlow;
  uniform float uSoftFade;
  uniform vec3  uColorCore;
  uniform vec3  uColorInner;
  uniform vec3  uColorOuter;
  uniform vec3  uColorHalo;
  uniform vec3  uColorCoil;
  uniform vec3  uColorCoilEdge;
  uniform vec3  uColorRing;
`,O=`
  varying float vT;
  varying float vViewZ;

  #if BEAM_PASS <= 2
    varying float vA;
    varying float vFacing;
  #elif BEAM_PASS == 3
    varying float vSide;
  #elif BEAM_PASS == 4
    varying float vBand;
    varying float vPhase;
  #else
    varying vec3  vNormalW;
    varying vec3  vViewDir;
    varying float vDisp;
  #endif
`,k=`
  ${D}
  ${O}

  #if BEAM_PASS == 3
    attribute float aStrand;
  #endif
  #if BEAM_PASS == 4
    attribute float aRing;
  #endif

  ${s}
  
  /** Half-width of the column at t, metres. */
  float beamRadius(float t) {
    float u = clamp(t, 0.0, 1.0);
    float r = mix(uRadiusNear, uRadius, pow(u, max(uRadiusCurve, 0.01)));
    // Pressure waves travelling out along it. Small — this is the beam
    // breathing, not a sausage.
    r *= 1.0 + uThrob * sin((u * uThrobScale - uTime * uThrobSpeed) * TAU);
    // ... and the cone opening out where it lands.
    r *= 1.0 + uFlare * smoothstep(1.0 - max(uFlareWidth, 1e-3), 1.0, u);
    return max(r * uRadiusScale * uWidthFade, 1e-4);
  }

  /** The column's local frame. n1/n2 span the plane across it. */
  void beamFrame(out vec3 dir, out vec3 n1, out vec3 n2) {
    vec3 delta = uTarget - uOrigin;
    float span = max(length(delta), 0.01);
    dir = delta / span;
    // Gram-Schmidt: the axis tilts down from the hands, so uSide is only
    // approximately perpendicular to it.
    vec3 lateral = uSide - dir * dot(uSide, dir);
    n1 = length(lateral) > 1e-4 ? normalize(lateral) : normalize(cross(dir, vec3(0.0, 1.0, 0.0)));
    n2 = normalize(cross(dir, n1));
  }

  /**
   * A point on the column's axis at t.
   *
   * Smooth low-frequency drift, pinned at both ends. Deliberately *smooth*: the
   * bolt's charm is that its noise is piecewise-linear and keeps its corners,
   * and this is the opposite effect — a beam that kinks is a bolt.
   */
  vec3 beamAxis(float t, vec3 n1, vec3 n2) {
    vec3 p = mix(uOrigin, uTarget, t);
    float ends = sin(clamp(t, 0.0, 1.0) * PI);
    float dx = snoise(vec3(t * uWanderScale, uTime * uWanderSpeed, uSeed));
    float dy = snoise(vec3(t * uWanderScale + 31.7, uTime * uWanderSpeed, uSeed + 7.3));
    return p + (n1 * dx + n2 * dy) * uWander * ends;
  }


  #if BEAM_PASS == 3
    /** A point on one spiralling ribbon. */
    vec3 coilPoint(float t, float phase, vec3 n1, vec3 n2) {
      float angle = (t * uCoilTurns + uTime * uCoilSpeed + phase) * TAU;
      float r = beamRadius(t) * uCoilRadius * (1.0 + uCoilFlare * pow(clamp(t, 0.0, 1.0), 3.0));
      return beamAxis(t, n1, n2) + (n1 * cos(angle) + n2 * sin(angle)) * r;
    }
  #endif

  void main() {
    vec3 dir, n1, n2;

    #if BEAM_PASS != 5
      beamFrame(dir, n1, n2);
    #endif

    #if BEAM_PASS <= 2                                    /* the column */
      float t = position.x;
      float a = position.y;
      float angle = a * TAU;
      vec3 nrm = n1 * cos(angle) + n2 * sin(angle);

      // Break the barrel up so it is a gas column and not a machined pipe. The
      // noise crawls downrange with the flow rather than sitting still on it.
      float rip = snoise(vec3(
        cos(angle) * uRippleBands,
        sin(angle) * uRippleBands,
        t * uRippleScale - uTime * uRippleSpeed + uSeed
      ));
      float r = beamRadius(t) * (1.0 + uRipple * rip);

      vec3 here = beamAxis(t, n1, n2) + nrm * r;
      vT = t;
      vA = a;
      // 1 looking down the barrel, 0 at the silhouette. Both tube weightings
      // are built out of this one number.
      vFacing = abs(dot(normalize(cameraPosition - here), nrm));

    #elif BEAM_PASS == 3                                  /* the coils */
      float t = position.x;
      vSide = position.y;
      vT = t;

      float phase = uCoils <= 1.0 ? 0.0 : aStrand / uCoils;
      phase += hash11(aStrand * 5.31 + uSeed) * 0.12;

      vec3 here = coilPoint(t, phase, n1, n2);

      // Tangent by finite difference, mirrored at the far end so the last node
      // still has a neighbour to look at.
      float step_ = 0.015;
      float ahead = t + step_;
      float flip = 1.0;
      if (ahead > 1.0) { ahead = t - step_; flip = -1.0; }
      vec3 tangent = (coilPoint(ahead, phase, n1, n2) - here) * flip;
      tangent = length(tangent) > 1e-5 ? normalize(tangent) : dir;

      vec3 binormal = cross(tangent, normalize(cameraPosition - here));
      float bl = length(binormal);
      binormal = bl > 1e-4 ? binormal / bl : n1;

      float halfWidth = uCoilWidth * mix(1.0, uCoilWidthTip, clamp(t, 0.0, 1.0));
      // Drawn to a point at the muzzle so the ribbons grow out of the orb.
      halfWidth *= smoothstep(0.0, 0.05, t) * uWidthFade * uFade;
      here += binormal * position.y * halfWidth;

    #elif BEAM_PASS == 4                                  /* the shock discs */
      // Evenly spaced along the column and slid downrange by the clock, so the
      // train is a pure function of time — there is no queue on the CPU.
      float phase = fract(aRing / max(uRingCount, 1.0) + uTime * uRingSpeed + uSeed * 0.37);
      float t = phase;
      float angle = position.y * TAU;
      float r = beamRadius(t) * mix(uRingInner, uRingOuter, position.x) * (1.0 + uRingSwell * phase);

      vec3 here = beamAxis(t, n1, n2) + (n1 * cos(angle) + n2 * sin(angle)) * r;
      vT = t;
      vBand = position.x;
      vPhase = phase;

    #else                                                 /* the charge orb */
      // The one pass that goes through the model matrix: the ability places and
      // scales the orb, so it needs no world-space plumbing of its own.
      vec3 np = normal * uOrbScale + vec3(uSeed * 3.1) - vec3(0.0, uTime * uOrbFlow, 0.0);
      float n = fbm4(np) * 0.6 + ridged(np * 1.4, 4) * 0.4;
      vDisp = n;

      vec4 world = modelMatrix * vec4(position + normal * n * uOrbTurbulence, 1.0);
      vec3 here = world.xyz;
      vNormalW = normalize(mat3(modelMatrix) * normal);
      vViewDir = cameraPosition - here;
      vT = 0.0;
    #endif

    vec4 mv = viewMatrix * vec4(here, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,A=`
  ${D}
  ${O}

  uniform float uGlobalGlow;
  uniform vec2  uResolution;
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;

  ${s}
  ${h}

  void main() {
    vec3 color = vec3(0.0);
    float alpha = 0.0;

    #if BEAM_PASS == 5                                    /* the charge orb */
      float facing = abs(dot(normalize(vViewDir), normalize(vNormalW)));
      float rim = pow(1.0 - facing, max(uOrbRim, 0.05));
      float heat = clamp(vDisp * 0.5 + 0.5, 0.0, 1.0);
      // Filaments crawling over the surface, thresholded hard: a wide band here
      // fills the orb in and it stops reading as contained energy.
      float fil = smoothstep(0.74, 0.98,
        ridged(vNormalW * uOrbBands + vec3(0.0, uTime * uOrbFlow * 2.0, 0.0) + uSeed, 4));

      color = mix(uColorOuter, uColorInner, heat);
      color = mix(color, uColorCore, clamp(fil + rim * 0.35, 0.0, 1.0));
      color += uColorCore * fil * 1.6;
      alpha = (0.2 + rim * 0.9 + fil * 0.75) * uCharge;

    #else
      // Ahead of the leading edge there is no beam yet. The column is built
      // whole and clipped here rather than scaled, so its *shape* never changes
      // as the front travels — only how much of it exists.
      float tip = max(uTipLength, 1e-3);
      float drawn = smoothstep(uProgress, uProgress - tip, vT);
      if (drawn <= 0.002) discard;

      #if BEAM_PASS <= 2                                  /* the column */
        float angle = vA * TAU;
        // Filaments streaming downrange, stretched hard along the axis: this is
        // gas being pushed through a barrel, not a bolt looking for ground.
        float flow = ridged(vec3(
          vT * uStreakScale - uTime * uFlowSpeed,
          cos(angle) * uStreakBands,
          sin(angle) * uStreakBands + uSeed
        ), 4);
        float streak = smoothstep(mix(0.42, 0.86, clamp(uStreakSharp, 0.0, 1.0)), 0.99, flow) * uStreak;

        float facing = clamp(vFacing, 0.0, 1.0);
        float axisward = pow(facing, max(uCoreSharp, 0.05));
        float rim = pow(1.0 - facing, max(uEdgePower, 0.05));

        #if BEAM_PASS == 0                                /* CORE */
          color = mix(uColorInner, uColorCore, clamp(0.35 + streak, 0.0, 1.0));
          alpha = uCoreFill * mix(0.28, 1.0, axisward) + streak * 0.35;

        #elif BEAM_PASS == 1                              /* SHELL */
          color = mix(uColorOuter, uColorInner, clamp(rim * 0.55 + streak, 0.0, 1.0));
          color += uColorCore * streak * uStreakGlow;
          alpha = rim * uShellRim + uShellFill * mix(0.12, 1.0, axisward) + streak * 0.4;

        #else                                             /* HALO */
          float wide = pow(1.0 - facing, max(uHaloRim, 0.05));
          color = mix(uColorHalo, uColorOuter, wide);
          alpha = wide;
        #endif

        // The mouth, where the column is still being fed out of the orb.
        float mouth = smoothstep(uMouthLength, 0.0, vT);
        color += uColorCore * mouth * uMouthGlow;
        alpha += mouth * uMouthGlow * 0.2;

        // The leading edge while it travels — and, once it has landed, the
        // white-hot end where it is still burning into the floor.
        float lead = smoothstep(uProgress - tip * 2.0, uProgress, vT);
        color += uColorCore * lead * uTipGlow;
        alpha += lead * uTipGlow * 0.18;

      #elif BEAM_PASS == 3                                /* the coils */
        float v = clamp(abs(vSide), 0.0, 1.0);
        float profile = pow(1.0 - v, max(uCoilSharp, 0.05));
        // A charge running out along the ribbon, which is what stops the coils
        // reading as static piping wrapped around the beam.
        float pulse = 0.5 + 0.5 * sin((vT * uCoilPulseFreq - uTime * uCoilPulseSpeed) * TAU);
        color = mix(uColorCoilEdge, uColorCoil, profile);
        color += uColorCore * pulse * profile * uCoilPulse;
        alpha = profile * mix(1.0 - clamp(uCoilPulse, 0.0, 0.9) * 0.5, 1.0, pulse);

      #else                                               /* the shock discs */
        float band = 1.0 - abs(vBand * 2.0 - 1.0);
        float profile = pow(clamp(band, 0.0, 1.0), max(uRingSharp, 0.05));
        // Discs thin out as they run downrange and the pressure behind them
        // drops off.
        color = mix(uColorRing, uColorCore, profile);
        alpha = profile * mix(1.0, uRingFade, vPhase);
      #endif

      alpha *= drawn;
    #endif

    alpha *= uFade * uOpacity * uPassOpacity;
    if (alpha < 0.003) discard;

    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.003) discard;

    color *= uGlow * uGlobalGlow;
    gl_FragColor = vec4(color, alpha);
  }
`;function j(e=E.CORE){let n=new t({defines:{BEAM_PASS:e},transparent:!0,depthWrite:!1,depthTest:!0,blending:2,side:2,toneMapped:!1,uniforms:r({uOrigin:{value:new f},uTarget:{value:new f(0,0,1)},uSide:{value:new f(1,0,0)},uSeed:{value:0},uProgress:{value:0},uFade:{value:1},uWidthFade:{value:1},uCharge:{value:0},uRadius:{value:.62},uRadiusNear:{value:.22},uRadiusCurve:{value:.7},uRadiusScale:{value:1},uFlare:{value:.9},uFlareWidth:{value:.22},uThrob:{value:.06},uThrobScale:{value:2.4},uThrobSpeed:{value:1.6},uWander:{value:.06},uWanderScale:{value:.9},uWanderSpeed:{value:.7},uRipple:{value:.12},uRippleBands:{value:1.6},uRippleScale:{value:3.2},uRippleSpeed:{value:2.4},uStreak:{value:.9},uStreakSharp:{value:.45},uStreakScale:{value:5.5},uStreakBands:{value:2.6},uStreakGlow:{value:1.1},uFlowSpeed:{value:7},uCoreSharp:{value:1.4},uCoreFill:{value:.85},uEdgePower:{value:2.2},uShellRim:{value:.9},uShellFill:{value:.18},uHaloRim:{value:3.4},uPassOpacity:{value:1},uMouthGlow:{value:1.5},uMouthLength:{value:.1},uTipGlow:{value:1.6},uTipLength:{value:.06},uCoils:{value:4},uCoilTurns:{value:2.2},uCoilSpeed:{value:.9},uCoilRadius:{value:1.35},uCoilFlare:{value:.8},uCoilWidth:{value:.1},uCoilWidthTip:{value:1.8},uCoilSharp:{value:2.2},uCoilPulse:{value:.6},uCoilPulseFreq:{value:3},uCoilPulseSpeed:{value:1.6},uRingCount:{value:6},uRingSpeed:{value:1.3},uRingInner:{value:1.15},uRingOuter:{value:2.1},uRingSwell:{value:.5},uRingFade:{value:.15},uRingSharp:{value:1.6},uOrbTurbulence:{value:.22},uOrbScale:{value:2.2},uOrbFlow:{value:.8},uOrbBands:{value:5},uOrbRim:{value:1.8},uOpacity:{value:1},uGlow:{value:2.2},uSoftFade:{value:.6},uColorCore:{value:new v(1,1,1)},uColorInner:{value:new v(.82,.96,1)},uColorOuter:{value:new v(.29,.78,1)},uColorHalo:{value:new v(.05,.2,.85)},uColorCoil:{value:new v(1,.86,.5)},uColorCoilEdge:{value:new v(1,.45,.12)},uColorRing:{value:new v(.6,.94,1)}}),vertexShader:k,fragmentShader:A});return n.userData.sync=t=>{let r=p.beam,i=p.global,o=n.uniforms;switch(o.uOrigin.value.copy(t.origin),o.uTarget.value.copy(t.target),o.uSide.value.copy(t.side),o.uSeed.value=t.seed,o.uProgress.value=t.progress,o.uFade.value=t.fade,o.uWidthFade.value=t.widthFade,o.uCharge.value=t.charge,o.uRadius.value=r.radius,o.uRadiusNear.value=r.radiusNear,o.uRadiusCurve.value=r.radiusCurve,o.uFlare.value=r.flare,o.uFlareWidth.value=r.flareWidth,o.uThrob.value=r.throb,o.uThrobScale.value=r.throbScale,o.uThrobSpeed.value=r.throbSpeed*i.animationSpeed,o.uWander.value=r.wander*i.randomness*i.noiseStrength,o.uWanderScale.value=r.wanderScale*i.noiseFrequency,o.uWanderSpeed.value=r.wanderSpeed*i.noiseSpeed,o.uRipple.value=r.ripple*i.noiseStrength,o.uRippleBands.value=r.rippleBands,o.uRippleScale.value=r.rippleScale*i.noiseFrequency,o.uRippleSpeed.value=r.rippleSpeed*i.noiseSpeed,o.uStreak.value=r.streak,o.uStreakSharp.value=r.streakSharp,o.uStreakScale.value=r.streakScale*i.noiseFrequency,o.uStreakBands.value=r.streakBands,o.uStreakGlow.value=r.streakGlow,o.uFlowSpeed.value=r.flowSpeed*i.noiseSpeed,o.uCoreSharp.value=r.coreSharp,o.uCoreFill.value=r.coreFill,o.uEdgePower.value=r.edgePower,o.uShellRim.value=r.shellRim,o.uShellFill.value=r.shellFill,o.uHaloRim.value=r.haloRim,o.uMouthGlow.value=r.mouthGlow,o.uMouthLength.value=r.mouthLength,o.uTipGlow.value=r.tipGlow,o.uTipLength.value=r.tipLength,o.uCoils.value=t.coils,o.uCoilTurns.value=r.coilTurns,o.uCoilSpeed.value=r.coilSpeed,o.uCoilRadius.value=r.coilRadius,o.uCoilFlare.value=r.coilFlare,o.uCoilWidth.value=r.coilWidth,o.uCoilWidthTip.value=r.coilWidthTip,o.uCoilSharp.value=r.coilSharp,o.uCoilPulse.value=r.coilPulse,o.uCoilPulseFreq.value=r.coilPulseFreq,o.uCoilPulseSpeed.value=r.coilPulseSpeed,o.uRingCount.value=t.rings,o.uRingSpeed.value=r.ringSpeed,o.uRingInner.value=r.ringInner,o.uRingOuter.value=r.ringOuter,o.uRingSwell.value=r.ringSwell,o.uRingFade.value=r.ringFade,o.uRingSharp.value=r.ringSharp,o.uOrbTurbulence.value=r.orbTurbulence*i.turbulence,o.uOrbScale.value=r.orbScale,o.uOrbFlow.value=r.orbFlow*i.noiseSpeed,o.uOrbBands.value=r.orbBands,o.uOrbRim.value=r.orbRim,e){case E.CORE:o.uRadiusScale.value=r.coreWidth,o.uPassOpacity.value=1,o.uGlow.value=r.glow;break;case E.SHELL:o.uRadiusScale.value=r.shellWidth,o.uPassOpacity.value=r.shellOpacity,o.uGlow.value=r.glow;break;case E.HALO:o.uRadiusScale.value=r.haloWidth,o.uPassOpacity.value=r.haloOpacity,o.uGlow.value=r.glow*.8;break;case E.COIL:o.uRadiusScale.value=1,o.uPassOpacity.value=r.coilOpacity,o.uGlow.value=r.coilGlow;break;case E.RING:o.uRadiusScale.value=1,o.uPassOpacity.value=r.ringOpacity,o.uGlow.value=r.ringGlow;break;default:o.uRadiusScale.value=1,o.uPassOpacity.value=r.orbOpacity,o.uGlow.value=r.orbGlow;break}o.uOpacity.value=r.opacity*i.opacity,o.uSoftFade.value=r.softFade,o.uColorCore.value.copy(a(r.colorCore)),o.uColorInner.value.copy(a(r.colorInner)),o.uColorOuter.value.copy(a(r.colorOuter)),o.uColorHalo.value.copy(a(r.colorHalo)),o.uColorCoil.value.copy(a(r.colorCoil)),o.uColorCoilEdge.value.copy(a(r.colorCoilEdge)),o.uColorRing.value.copy(a(r.colorRing))},n}var M=8,N=12,P=96,F=26,I=128,L=44,R=5,z=Math.PI*2,B={},V=new f,H=new f,U=new f,W=new f,G=new f(0,1,0),K=class extends T{constructor(e){super(`beam`,e)}createShaders(){this.tubeGeometry=i(P,F),this.coilGeometry=e(I,M),this.ringGeometry=c(N,L),this.orbGeometry=new l(1,4);let t=[[E.HALO,this.tubeGeometry,11],[E.SHELL,this.tubeGeometry,12],[E.CORE,this.tubeGeometry,13],[E.COIL,this.coilGeometry,13],[E.RING,this.ringGeometry,13],[E.ORB,this.orbGeometry,14]];this.materials=[],this.meshes=[];for(let[e,n,r]of t){let t=j(e),i=new b(n,t);i.frustumCulled=!1,i.layers.set(o.VFX),i.renderOrder=r,e===E.ORB?this.orbMesh=i:i.matrixAutoUpdate=!1,this.group.add(i),this.materials.push(t),this.meshes.push(i)}this._seed=0,this._coilCount=1,this._ringCount=1,this._fired=!1,this._burnDistance=0,this.muzzleLight=null,this._state={origin:new f,target:new f,side:new f,progress:0,fade:1,widthFade:1,charge:0,seed:0,coils:1,rings:1}}createParticles(){let e=this.ctx.particles;this.sparks=e.get(`beam.sparks`,{capacity:5e3,shape:x.STREAK,additive:!0,stretch:!0,softFade:.25}),this.sparks.uniforms.uDrag.value=1.5,this.sparks.uniforms.uEndSize.value=.2,this.sparks.uniforms.uSizeIn.value=.02,this.sparks.uniforms.uFadeIn.value=.03,this.sparks.uniforms.uFadeOut.value=.4,this.motes=e.get(`beam.motes`,{capacity:3600,shape:x.SOFT,additive:!0,curl:!0,softFade:.4}),this.motes.uniforms.uDrag.value=1.1,this.motes.uniforms.uEndSize.value=.12,this.motes.uniforms.uSizeIn.value=.05,this.motes.uniforms.uFadeIn.value=.07,this.motes.uniforms.uFadeOut.value=.35,this.smoke=e.get(`beam.smoke`,{capacity:2200,shape:x.SMOKE,additive:!1,curl:!0,softFade:1.1}),this.smoke.uniforms.uDrag.value=1.7,this.smoke.uniforms.uEndSize.value=3.2,this.smoke.uniforms.uSizeIn.value=.12,this.smoke.uniforms.uFadeIn.value=.18,this.smoke.uniforms.uFadeOut.value=.3,this.debris=e.get(`beam.debris`,{capacity:1800,shape:x.CHIP,additive:!1,lit:!0,softFade:.25}),this.debris.uniforms.uDrag.value=.25,this.debris.uniforms.uEndSize.value=.8,this.debris.uniforms.uFadeOut.value=.7,this.sparkEmitter=new S,this.moteEmitter=new S,this.intakeEmitter=new S,this.smokeEmitter=new S,this.debrisEmitter=new S,this.splashEmitter=new S,this.pulseEmitter=new S,this.dustEmitter=new S,this.shockEmitter=new S}get instanceCount(){return 4+this._coilCount+this._ringCount}get impactDuration(){return Math.max(.05,p.beam.lifetime*p.global.lifetime)}get fadeDuration(){return Math.max(.05,p.beam.fadeTime)}get charge(){return g(this.age/Math.max(.01,p.beam.charge))}lightShimmer(){let e=p.beam;return 1-e.lightPulse*(.5-.5*Math.cos(this.age*e.lightPulseSpeed*z))}advance(e){let t=this.config,n=Math.max(0,t.charge);if(this.age<n)return!1;let r=t.speed*p.global.speed,i=this.age-n;this.front+=r*_.outQuad(g(i/.05))*e;let a=this.u;return this.u=g(this.front/this.length),this.pointAt(this.u,this.position),this.u>=1&&a<1}_handPoint(e){let t=p.beam;return e.copy(this.origin).addScaledVector(this.direction,t.handForward).addScaledVector(this.side,t.handSide),e.y=t.handHeight,e}_impactPoint(e){return this.pointAt(1,e),e.y=p.beam.endHeight,e}_axisPoint(e,t){let n=p.beam,r=g(e);return t.copy(this.origin).addScaledVector(this.direction,u(n.handForward,this.length,r)).addScaledVector(this.side,n.handSide*(1-r)),t.y=u(n.handHeight,n.endHeight,r),t}_beamRadius(e){let t=p.beam,n=g(e);return u(t.radiusNear,t.radius,n**+Math.max(.01,t.radiusCurve))*(1+t.flare*d(1-Math.max(.001,t.flareWidth),1,n))}_radialAt(e,t){return t.copy(this.side).multiplyScalar(Math.cos(e)).addScaledVector(G,Math.sin(e)).normalize()}onSpawn(){for(let e of[this.sparkEmitter,this.moteEmitter,this.intakeEmitter,this.smokeEmitter,this.debrisEmitter,this.splashEmitter,this.pulseEmitter,this.dustEmitter,this.shockEmitter])e.reset();this._burnDistance=0,this._fired=!1,this._seed=Math.random()*100,this.muzzleLight=this.ctx.lights.acquire(),this._syncUniforms(0,1,1)}_syncUniforms(e,t,n){let r=p.beam,i=p.global,o=this._state;this._handPoint(o.origin),this._impactPoint(o.target),o.side.copy(this.side),o.progress=this.phase===w.TRAVEL?this.u:1,o.fade=t,o.widthFade=n,o.charge=this.charge,o.seed=this._seed,this._coilCount=Math.max(1,Math.min(M,Math.round(r.coils))),this._ringCount=Math.max(1,Math.min(N,Math.round(r.rings))),o.coils=this._coilCount,o.rings=this._ringCount,this.coilGeometry.instanceCount=this._coilCount,this.ringGeometry.instanceCount=this._ringCount;for(let e of this.materials)e.userData.sync(o);let s=1+r.orbThrob*Math.sin(this.age*r.orbThrobSpeed*z),c=r.orbSize*(.28+.72*_.outCubic(o.charge))*s*n;this.orbMesh.position.copy(o.origin),this.orbMesh.scale.setScalar(Math.max(.01,c)),this.muzzleLight&&this.ctx.lights.set(this.muzzleLight,o.origin,a(r.lightColor),r.muzzleLightIntensity*o.charge*t,r.muzzleLightRadius,e),this.sparks.setGradient(a(r.colorSparkA),a(r.colorSparkB),a(r.colorSparkC),a(r.colorSparkD)),this.sparks.uniforms.uGravity.value.set(0,r.sparkGravity,0),this.sparks.uniforms.uSizeScale.value=r.sparkSize*i.particleSize*7,this.sparks.uniforms.uLifeScale.value=r.sparkLifetime*.5*i.particleLifetime,this.sparks.uniforms.uSpeedScale.value=i.particleSpeed,this.sparks.uniforms.uOpacity.value=i.opacity,this.sparks.uniforms.uGlow.value=r.glow*.6*i.glow,this.sparks.uniforms.uStretch.value=r.sparkStretch,this.sparks.uniforms.uTurbulence.value=.25*i.turbulence,this.motes.setGradient(a(r.colorMoteA),a(r.colorMoteB),a(r.colorMoteC),a(r.colorMoteD)),this.motes.uniforms.uGravity.value.set(0,r.moteRise,0),this.motes.uniforms.uSizeScale.value=r.moteSize*i.particleSize*7,this.motes.uniforms.uLifeScale.value=r.moteLifetime*.5*i.particleLifetime,this.motes.uniforms.uSpeedScale.value=i.particleSpeed,this.motes.uniforms.uOpacity.value=i.opacity,this.motes.uniforms.uGlow.value=1.1*i.glow,this.motes.uniforms.uTurbulence.value=r.moteTurbulence*i.turbulence,this.smoke.setGradient(a(r.colorSmokeA),a(r.colorSmokeB),a(r.colorSmokeC),a(r.colorSmokeD)),this.smoke.uniforms.uGravity.value.set(0,r.smokeRise,0),this.smoke.uniforms.uSizeScale.value=r.smokeSize*i.particleSize,this.smoke.uniforms.uLifeScale.value=r.smokeLifetime*.5*i.particleLifetime,this.smoke.uniforms.uSpeedScale.value=r.smokeSpeed*i.particleSpeed,this.smoke.uniforms.uOpacity.value=r.smokeOpacity*i.opacity,this.smoke.uniforms.uTurbulence.value=.4*i.turbulence,this.debris.setGradient(a(r.colorDebrisA),a(r.colorDebrisB),a(r.colorDebrisC),a(r.colorDebrisD)),this.debris.uniforms.uGravity.value.set(0,r.debrisGravity,0),this.debris.uniforms.uSizeScale.value=r.debrisSize*i.particleSize*7,this.debris.uniforms.uLifeScale.value=i.particleLifetime,this.debris.uniforms.uSpeedScale.value=i.particleSpeed,this.debris.uniforms.uOpacity.value=i.opacity}_intakeFx(e){let t=p.beam,r=p.global,i=this.charge,a=n.uTime.value,o=Math.round(this.intakeEmitter.tick(e,t.intakeRate*(.35+i))*r.particleCount);if(o<=0)return;this._handPoint(W),B.radius=.12,B.speedVariance=.35,B.spread=.12,B.inherit=null,B.anchor=null,B.size=.09,B.sizeVariance=.6,B.lifeVariance=.3,B.spin=0,B.tint=null,B.time=a;let s=t.intakeRadius*u(1,.45,i),c=Math.max(1,Math.round(o/6));for(;o>0;){let e=Math.random()*z,n=Math.acos(m(-1,1)),r=Math.sin(n);H.set(r*Math.cos(e),Math.cos(n)*.7,r*Math.sin(e)).normalize(),V.copy(W).addScaledVector(H,s*m(.7,1.15)),B.position=V,B.direction=H.multiplyScalar(-1),B.speed=t.intakeSpeed,B.life=s/Math.max(.5,t.intakeSpeed)*1.5,this.motes.emit(Math.min(c,o),B),o-=c}}_releaseFx(){let e=p.beam,t=p.global;this._handPoint(V),this.ctx.bursts.spawn(y.AIR,V,{radius:e.muzzleSize*.2,endRadius:e.muzzleSize*t.explosionIntensity,life:.4,intensity:e.muzzleIntensity,opacity:.9,fresnel:2,displace:.35,colorA:a(e.colorBurstA),colorB:a(e.colorBurstC)}),this.ctx.decals.spawn(C.SHOCKWAVE,this.origin,{radius:e.muzzleSize*2.2*t.explosionIntensity,life:.5,width:.06,intensity:.9,colorA:a(e.colorShockA),colorB:a(e.colorShockB)}),B.position=V,B.radius=.22,B.direction=H.copy(this.direction),B.speed=e.sparkSpeed*1.8,B.speedVariance=.8,B.spread=.7,B.inherit=null,B.anchor=null,B.size=.2,B.sizeVariance=.7,B.life=e.sparkLifetime,B.lifeVariance=.5,B.spin=0,B.tint=null,B.time=n.uTime.value,this.sparks.emit(Math.round(70*t.particleCount),B),this.ctx.flash.trigger(a(e.colorCastFlash),e.castFlash*t.explosionIntensity),this.ctx.shake.add(e.impactShake*.45*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),30),this.lightBoost=e.lightIntensity*.7*t.explosionIntensity}_columnFx(e,t){let r=p.beam,i=p.global,a=n.uTime.value,o=this.phase===w.TRAVEL?Math.max(.02,this.u):1,s=Math.round(this.sparkEmitter.tick(e,r.sparkRate*t)*i.particleCount);if(s>0){B.speed=r.sparkSpeed,B.speedVariance=.8,B.spread=.35,B.inherit=null,B.anchor=null,B.size=.15,B.sizeVariance=.7,B.life=r.sparkLifetime,B.lifeVariance=.55,B.spin=0,B.tint=null,B.time=a;let e=Math.ceil(s/Math.min(s,R));for(;s>0;){let t=m(.04,1)*o,n=this._beamRadius(t);this._radialAt(Math.random()*z,U),this._axisPoint(t,V).addScaledVector(U,n*m(.8,1.25)),B.position=V,B.radius=n*.3,B.direction=H.copy(U).addScaledVector(this.direction,r.sparkForward).normalize(),this.sparks.emit(Math.min(e,s),B),s-=e}}let c=Math.round(this.moteEmitter.tick(e,r.moteRate*t)*i.particleCount);if(c>0){let e=Math.random()*o;this._axisPoint(e,V),B.position=V,B.radius=this._beamRadius(e)*2.2,B.direction=H.copy(this.direction).multiplyScalar(.5).setY(.7).normalize(),B.speed=r.moteSpeed,B.speedVariance=.8,B.spread=.9,B.size=.09,B.sizeVariance=.6,B.life=r.moteLifetime,B.lifeVariance=.5,B.spin=0,B.time=a,this.motes.emit(c,B)}let l=Math.round(this.smokeEmitter.tick(e,r.smokeRate*t)*i.particleCount);if(l>0){let e=Math.random()*o;this.pointAt(e,V).setY(.12),this._radialAt(m(0,z),U).setY(Math.abs(U.y)*.35),B.position=V,B.radius=r.scorchRadius*1.6,B.direction=H.copy(U).normalize(),B.speed=r.smokeSpeed,B.speedVariance=.7,B.spread=.55,B.size=.9,B.sizeVariance=.5,B.life=r.smokeLifetime,B.lifeVariance=.4,B.spin=.4,B.time=a,this.smoke.emit(l,B)}let u=Math.round(this.debrisEmitter.tick(e,r.debrisRate*t)*i.particleCount);u>0&&(this.pointAt(Math.random()*o,V).setY(.06),B.position=V,B.radius=r.scorchRadius*1.4,B.direction=H.copy(this.direction).multiplyScalar(.35).setY(1).normalize(),B.speed=r.debrisSpeed,B.speedVariance=.75,B.spread=.8,B.size=.1,B.sizeVariance=.7,B.life=r.debrisLifetime,B.lifeVariance=.5,B.spin=9,B.time=a,this.debris.emit(u,B))}_groundFx(){let e=p.beam,t=1/Math.max(.05,e.scorchRate);for(;this.front-this._burnDistance>=t;){this._burnDistance+=t;let n=g(this._burnDistance/this.length);this.pointAt(n,V);let r=this._beamRadius(n)*.5;V.x+=this.side.x*m(-r,r),V.z+=this.side.z*m(-r,r),this.ctx.decals.spawn(C.SCORCH,V,{radius:e.scorchRadius*m(.8,1.3),life:e.scorchLife,intensity:e.scorchIntensity,colorA:a(e.colorScorch),colorB:a(e.colorEmber),height:.015})}}_burnFx(e,t){let r=p.beam,i=p.global,o=n.uTime.value;this._impactPoint(V),this.pointAt(1,W);let s=Math.round(this.splashEmitter.tick(e,r.splashRate*t)*i.particleCount);s>0&&(B.position=V,B.radius=this._beamRadius(1)*.7,B.direction=H.copy(this.direction).multiplyScalar(-.65).setY(.75).normalize(),B.speed=r.sparkSpeed*1.4,B.speedVariance=.9,B.spread=.95,B.inherit=null,B.anchor=null,B.size=.18,B.sizeVariance=.8,B.life=r.sparkLifetime*1.2,B.lifeVariance=.6,B.spin=0,B.tint=null,B.time=o,this.sparks.emit(s,B)),this.pulseEmitter.tick(e,r.pulseRate*t)>0&&(this.ctx.bursts.spawn(y.AIR,V,{radius:r.pulseSize*.25,endRadius:r.pulseSize*i.explosionIntensity,life:.45,intensity:r.pulseIntensity,opacity:.8,fresnel:2.2,displace:.3,squash:.85,colorA:a(r.colorBurstA),colorB:a(r.colorBurstC)}),this.lightBoost=Math.max(this.lightBoost,r.lightIntensity*.2*i.explosionIntensity)),this.dustEmitter.tick(e,r.dustRate*t)>0&&this.ctx.decals.spawn(C.DUSTRING,W,{radius:r.dustRadius*m(.75,1.15),life:r.dustLife,intensity:.7,colorA:a(r.colorDustA),colorB:a(r.colorDustB),height:.02}),this.shockEmitter.tick(e,r.shockRate*t)>0&&this.ctx.decals.spawn(C.SHOCKWAVE,W,{radius:r.shockRadius*.55*i.explosionIntensity,life:.45,width:.04,intensity:.8,colorA:a(r.colorShockA),colorB:a(r.colorShockB)})}onTravel(e){let t=p.beam,n=p.global;if(this._syncUniforms(e,1,1),this.age<t.charge){this._handPoint(this.position),this._intakeFx(e),this.ctx.shake.rumble(t.chargeShake*this.charge*n.cameraShake,e);return}this._fired||(this._fired=!0,this._releaseFx()),this._axisPoint(this.u,this.position),this._columnFx(e,1),this._groundFx(),this.ctx.shake.rumble(t.rumble*n.cameraShake,e)}onImpact(){let e=p.beam,t=p.global,r=n.uTime.value;this._impactPoint(V),this.pointAt(1,W),this.ctx.bursts.spawn(y.STORM,V,{radius:e.burstSize*.18,endRadius:e.burstSize*t.explosionIntensity,life:.75,intensity:e.burstIntensity,opacity:.9,fresnel:1.8,displace:.5,squash:.85,colorA:a(e.colorBurstA),colorB:a(e.colorBurstB),colorC:a(e.colorBurstC)}),this.ctx.decals.spawn(C.SHOCKWAVE,W,{radius:e.shockRadius*t.explosionIntensity,life:.65,width:.05,intensity:1,colorA:a(e.colorShockA),colorB:a(e.colorShockB)}),this.ctx.decals.spawn(C.SCORCH,W,{radius:e.scorchRadius*3.2,life:e.scorchLife*1.4,intensity:e.scorchIntensity*1.4,colorA:a(e.colorScorch),colorB:a(e.colorEmber),height:.015}),this.ctx.decals.spawn(C.DUSTRING,W,{radius:e.dustRadius*1.8,life:e.dustLife*1.6,intensity:.85,colorA:a(e.colorDustA),colorB:a(e.colorDustB),height:.02}),B.position=V,B.radius=.35,B.direction=H.copy(this.direction).multiplyScalar(-.35).setY(.85).normalize(),B.speed=e.sparkSpeed*2.4,B.speedVariance=.85,B.spread=1,B.inherit=null,B.anchor=null,B.size=.24,B.sizeVariance=.8,B.life=e.sparkLifetime*1.6,B.lifeVariance=.6,B.spin=0,B.tint=null,B.time=r,this.sparks.emit(Math.round(e.burstSparks*t.particleCount),B),B.position=W,B.radius=e.scorchRadius*2.2,B.direction=H.set(0,1,0),B.speed=e.debrisSpeed*1.9,B.spread=.85,B.size=.14,B.life=e.debrisLifetime*1.3,B.spin=11,this.debris.emit(Math.round(e.burstDebris*t.particleCount),B),B.speed=e.smokeSpeed*2.4,B.spread=1,B.size=1.4,B.life=e.smokeLifetime*1.2,B.spin=.5,this.smoke.emit(Math.round(55*t.particleCount),B),this.ctx.shake.add(e.impactShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),24),this.ctx.flash.trigger(a(e.colorFlash),e.impactFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*1.2*t.explosionIntensity}onFade(e,t){let n=p.beam,r=p.global,i=1,a=1;if(t>1){let e=g(t-1);i=1-_.inCubic(e),a=Math.max(.04,1-_.outCubic(e)*.94)}this._syncUniforms(e,i,a),this._axisPoint(1,this.position);let o=t<=1?1:i*.5;this._columnFx(e,o*.85),this._burnFx(e,o),t<=1&&this.ctx.shake.rumble(n.burnShake*r.cameraShake,e)}onDestroy(){this.ctx.lights.release(this.muzzleLight),this.muzzleLight=null,this._coilCount=1,this._ringCount=1,this.coilGeometry.instanceCount=1,this.ringGeometry.instanceCount=1;for(let e of this.materials)e.uniforms.uFade.value=0,e.uniforms.uCharge.value=0}dispose(){this.tubeGeometry.dispose(),this.coilGeometry.dispose(),this.ringGeometry.dispose(),this.orbGeometry.dispose();for(let e of this.materials)e.dispose();super.dispose()}};export{K as BeamAbility};
//# sourceMappingURL=BeamAbility-DCNaaTve.js.map