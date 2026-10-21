import{$t as e,Br as t,G as n,Gr as r,K as i,Qt as a,R as o,V as s,Y as c,_t as l,at as u,di as d,nt as f,o as p,ot as m,q as h,st as g,tt as _,ui as v,xt as y,y as b,yn as x}from"./settings-DdywqLlV.js";import{t as S}from"./ParticleSystem-BZTczMT8.js";import{n as C}from"./ParticleEngine-DLxipNH0.js";import{n as w}from"./GroundDecals-kYmr8HKl.js";import{n as T,t as E}from"./Ability-CYesB5Ur.js";import{r as D,t as O}from"./Mirror-DRp0p4CU.js";var k=Math.PI*2;function A(t=24,n=18,i=5){let o=Math.max(2,Math.round(t)),s=Math.max(3,Math.round(n)),c=s+1,u=Math.max(1,Math.round(i)),f=new Float32Array(o*c*3),p=0;for(let e=0;e<o;e++){let t=e/(o-1);for(let e=0;e<c;e++)f[p++]=t,f[p++]=e/s,f[p++]=0}let m=new Uint16Array((o-1)*s*6),h=0;for(let e=0;e<o-1;e++)for(let t=0;t<s;t++){let n=e*c+t,r=n+c;m[h++]=n,m[h++]=r,m[h++]=n+1,m[h++]=r,m[h++]=r+1,m[h++]=n+1}let g=new Float32Array(u);for(let e=0;e<u;e++)g[e]=e;let _=new e;return _.setAttribute(`position`,new l(f,3)),_.setAttribute(`aSegment`,new a(g,1)),_.setIndex(new l(m,1)),_.instanceCount=u,_.boundingSphere=new r(new d,1e4),_}var j=`
  attribute float aSegment;      // which leg of the cascade this instance is

  uniform vec3  uFrom[5];   // world start of each leg
  uniform vec3  uTo[5];     // world end
  uniform vec2  uSpan[5];   // its start/end as fractions of the whole path

  uniform float uCount;          // legs live this frame
  uniform float uProgress;       // 0..1 how far down the whole path the light has got
  uniform float uTipSoft;        // fraction of the path the drawn tip tapers over

  uniform float uRadiusNear;     // half-width at the muzzle, metres
  uniform float uRadiusFar;      // ... at the far end
  uniform float uRadiusCurve;    // >1 stays fat and thins late
  uniform float uThrob;          // fraction of the radius that pulses
  uniform float uThrobBands;     // pulses along the whole path
  uniform float uThrobSpeed;     // radians/second they slide at
  uniform float uLoss;           // width and brightness kept per bounce
  uniform float uSeed;
  uniform float uTime;

  varying float vGT;             // position along the WHOLE path, 0..1
  varying float vSeg;            // leg ordinal, as a float
  varying float vGrow;           // 0..1 has the light reached here yet
  varying float vEnergy;         // what is left after the bounces so far
  varying vec3  vNormalW;
  varying vec3  vViewDir;
  varying float vViewZ;

  void main() {
    float seg = aSegment;

    /* ---- this instance's leg. Loop counter, never the attribute. ---- */
    vec3 head = uFrom[0];
    vec3 tail = uTo[0];
    vec2 reach = uSpan[0];
    for (int i = 0; i < 5; i++) {
      if (float(i) == seg) {
        head = uFrom[i];
        tail = uTo[i];
        reach = uSpan[i];
      }
    }

    float t = position.x;
    float ang = position.y * ${k.toFixed(7)};

    /* ---- where this ring sits along the cascade as a whole ---- */
    vGT = mix(reach.x, reach.y, t);
    vSeg = seg;
    // The drawn tip: 1 well behind the front, 0 ahead of it. Written as
    // 1 - smoothstep rather than smoothstep with the edges swapped, because
    // smoothstep with edge0 > edge1 is undefined and one driver in three
    // returns something plausible enough to ship by accident.
    vGrow = 1.0 - smoothstep(max(uProgress - uTipSoft, 0.0), uProgress, vGT);
    vEnergy = pow(max(uLoss, 0.001), seg);

    /* ---- the tube's own frame ---- */
    vec3 axis = tail - head;
    float span = max(length(axis), 1e-4);
    axis /= span;
    vec3 ref = abs(axis.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 n1 = normalize(cross(axis, ref));
    vec3 n2 = cross(axis, n1);
    vec3 outward = cos(ang) * n1 + sin(ang) * n2;

    float radius = mix(uRadiusNear, uRadiusFar, pow(clamp(vGT, 0.0, 1.0), max(uRadiusCurve, 0.05)));
    radius *= vEnergy;
    radius *= 1.0 + uThrob * sin(vGT * uThrobBands * ${k.toFixed(7)} - uTime * uThrobSpeed + uSeed);
    // Collapse to the axis where the light has not arrived, and for any
    // instance past the live count — a degenerate tube costs nothing and is
    // simpler than a second branch in the fragment stage.
    radius *= vGrow * step(seg, uCount - 0.5);

    vec3 world = mix(head, tail, t) + outward * max(radius, 0.0);

    vNormalW = outward;
    vViewDir = cameraPosition - world;
    vec4 mv = viewMatrix * vec4(world, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,M=`
  uniform vec3  uColorCore;
  uniform vec3  uColorInner;
  uniform vec3  uColorOuter;
  uniform vec3  uColorHalo;

  uniform float uCoreSharp;      // how fast the body falls off toward the silhouette
  uniform float uCoreTight;      // how small the white centre is
  uniform float uRimPower;       // how tight the glass edge is
  uniform float uRim;            // how strong it is
  uniform float uBands;          // travelling energy bands along the path
  uniform float uBandDepth;
  uniform float uBandSpeed;      // radians/second
  uniform float uBandStagger;    // radians of phase added per leg
  uniform float uGrain;          // longitudinal noise on the body
  uniform float uGrainScale;
  uniform float uGrainSpeed;
  uniform float uTipGlow;        // extra heat right behind the drawn front
  uniform float uTipLength;      // how far back that reaches, fraction of the path
  uniform float uGlow;
  uniform float uOpacity;
  uniform float uSoft;           // metres of soft fade where a leg meets geometry
  uniform float uFade;
  uniform float uProgress;
  uniform float uSeed;

  uniform float     uTime;
  uniform vec2      uResolution;
  uniform sampler2D uSceneDepth;
  uniform float     uCameraNear;
  uniform float     uCameraFar;
  uniform float     uGlobalGlow;

  varying float vGT;
  varying float vSeg;
  varying float vGrow;
  varying float vEnergy;
  varying vec3  vNormalW;
  varying vec3  vViewDir;
  varying float vViewZ;

  ${c}
  ${h}

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vViewDir);
    float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);

    float core = pow(ndv, max(uCoreSharp, 0.05));
    float rim = pow(1.0 - ndv, max(uRimPower, 0.05));

    float bands = 0.5 + 0.5 * sin(vGT * uBands * 6.2831853 - uTime * uBandSpeed + vSeg * uBandStagger);
    float grain = snoise(vec3(vGT * uGrainScale, vSeg * 7.3 + uSeed, uTime * uGrainSpeed));
    float body = core * (1.0 + uBandDepth * (bands - 0.5)) * (1.0 + uGrain * grain * 0.5);

    // The head of the light, while it is still travelling. Zero once the
    // cascade is complete, because there is no front any more.
    float behind = max(uProgress - vGT, 0.0);
    float tip = (1.0 - smoothstep(0.0, max(uTipLength, 1e-4), behind)) * uTipGlow * step(uProgress, 0.999);

    vec3 color = mix(uColorOuter, uColorInner, clamp(core, 0.0, 1.0));
    color = mix(color, uColorCore, pow(clamp(core, 0.0, 1.0), max(uCoreTight, 0.05)));
    color *= max(body, 0.0);
    color += uColorHalo * rim * uRim;
    color += uColorCore * tip * core;
    color *= vEnergy;

    // The soft ceiling every emissive surface in this project carries: the
    // terms above are independent and stack, and a rim crossing the white
    // centre sums past 10 where the bloom pass eats the silhouette whole.
    color *= uGlow * uGlobalGlow;
    color /= 1.0 + color * 0.14;

    float alpha = clamp(body + rim * uRim * 0.5 + tip * 0.4, 0.0, 1.0) * uOpacity * uFade * vGrow;

    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoft);
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(color, alpha);
  }
`,N=new d,P=new d;function F(){let e=[],n=[],r=[];for(let t=0;t<5;t++)e.push(new d),n.push(new d),r.push(new v(t/5,(t+1)/5));let a=new t({name:`CascadeBeam`,transparent:!0,depthWrite:!1,depthTest:!0,side:2,blending:2,toneMapped:!1,uniforms:i({uFrom:{value:e},uTo:{value:n},uSpan:{value:r},uCount:{value:1},uProgress:{value:1},uTipSoft:{value:.02},uRadiusNear:{value:.09},uRadiusFar:{value:.06},uRadiusCurve:{value:1},uThrob:{value:.06},uThrobBands:{value:7},uThrobSpeed:{value:5},uLoss:{value:.86},uSeed:{value:0},uColorCore:{value:new y(`#ffffff`)},uColorInner:{value:new y(`#ffeec2`)},uColorOuter:{value:new y(`#ffb43c`)},uColorHalo:{value:new y(`#5fd8ff`)},uCoreSharp:{value:2.2},uCoreTight:{value:3.4},uRimPower:{value:2.6},uRim:{value:.9},uBands:{value:9},uBandDepth:{value:.4},uBandSpeed:{value:6},uBandStagger:{value:1.1},uGrain:{value:.35},uGrainScale:{value:14},uGrainSpeed:{value:1.4},uTipGlow:{value:2.2},uTipLength:{value:.05},uGlow:{value:2.8},uOpacity:{value:1},uSoft:{value:.35},uFade:{value:1}}),vertexShader:j,fragmentShader:M});return a.userData.sync=(e,t,n)=>{let r=p.refractcascade,i=p.global,s=a.uniforms,c=Math.max(1,Math.min(5,Math.round(t))),l=0;for(let t=0;t<c;t++)N.copy(e[t]),P.copy(e[t+1]),l+=N.distanceTo(P);l=Math.max(l,1e-4);let u=0;for(let t=0;t<5;t++){let n=t<c,r=e[n?t:c],i=e[n?t+1:c];s.uFrom.value[t].copy(r),s.uTo.value[t].copy(i);let a=n?r.distanceTo(i):0;s.uSpan.value[t].set(u/l,(u+a)/l),u+=a}s.uCount.value=c,s.uProgress.value=n.progress,s.uTipSoft.value=Math.max(1e-4,r.beamTipSoft),s.uSeed.value=n.seed,s.uRadiusNear.value=r.beamRadiusNear,s.uRadiusFar.value=r.beamRadiusFar,s.uRadiusCurve.value=r.beamRadiusCurve,s.uThrob.value=r.beamThrob,s.uThrobBands.value=r.beamThrobBands,s.uThrobSpeed.value=r.beamThrobSpeed*i.animationSpeed,s.uLoss.value=r.bounceLoss,s.uColorCore.value.copy(o(r.colorBeamCore)),s.uColorInner.value.copy(o(r.colorBeamInner)),s.uColorOuter.value.copy(o(r.colorBeamOuter)),s.uColorHalo.value.copy(o(r.colorBeamHalo)),s.uCoreSharp.value=r.beamCoreSharp,s.uCoreTight.value=r.beamCoreTight,s.uRimPower.value=r.beamRimPower,s.uRim.value=r.beamRim*i.fresnel,s.uBands.value=r.beamBands,s.uBandDepth.value=r.beamBandDepth,s.uBandSpeed.value=r.beamBandSpeed*i.animationSpeed,s.uBandStagger.value=r.beamBandStagger,s.uGrain.value=r.beamGrain*i.noiseStrength,s.uGrainScale.value=r.beamGrainScale*i.noiseFrequency,s.uGrainSpeed.value=r.beamGrainSpeed*i.noiseSpeed,s.uTipGlow.value=r.beamTipGlow,s.uTipLength.value=r.beamTipLength,s.uGlow.value=r.beamGlow*i.glow,s.uOpacity.value=r.beamOpacity*i.opacity,s.uSoft.value=r.beamSoftFade,s.uFade.value=n.fade},a}var I=Math.PI*2,L=new d(0,1,0),R=4,z=24,B=18,V={},H=new d,U=new d,W=new d,G=new d,K=new d,q=new d,J=new d,Y=D(),X={progress:1,fade:1,seed:0},Z=class extends E{constructor(e){super(`refractcascade`,e)}createShaders(){this.panes=[];for(let e=0;e<R;e++){let t=new O({resolution:320,doubleSided:!0,renderOrder:4,name:`RefractCascade:pane${e}`});t.visible=!1,this.group.add(t.object3D),this.panes.push(t)}this.beamGeometry=A(z,B,5),this.beamMaterial=F(),this.beamMesh=new x(this.beamGeometry,this.beamMaterial),this.beamMesh.frustumCulled=!1,this.beamMesh.matrixAutoUpdate=!1,this.beamMesh.layers.set(s.VFX),this.beamMesh.renderOrder=12,this.group.add(this.beamMesh),this._nodes=[];for(let e=0;e<6;e++)this._nodes.push(new d);this._arrive=new Float32Array(R),this._struck=new Uint8Array(R),this._seed=0,this._legs=2}createParticles(){let e=this.ctx.particles;this.sparks=e.get(`refractcascade.sparks`,{capacity:2e3,shape:S.STREAK,additive:!0,stretch:!0,softFade:.25}),this.sparks.uniforms.uDrag.value=1.6,this.sparks.uniforms.uEndSize.value=.24,this.sparks.uniforms.uSizeIn.value=.02,this.sparks.uniforms.uFadeIn.value=.04,this.sparks.uniforms.uFadeOut.value=.45,this.motes=e.get(`refractcascade.motes`,{capacity:1400,shape:S.SOFT,additive:!0,curl:!0,softFade:.4}),this.motes.uniforms.uDrag.value=1.6,this.motes.uniforms.uEndSize.value=.2,this.motes.uniforms.uSizeIn.value=.07,this.motes.uniforms.uFadeIn.value=.1,this.motes.uniforms.uFadeOut.value=.42,this.dust=e.get(`refractcascade.dust`,{capacity:1e3,shape:S.SMOKE,additive:!1,curl:!0,softFade:1.1}),this.dust.uniforms.uDrag.value=1.8,this.dust.uniforms.uEndSize.value=2.6,this.dust.uniforms.uSizeIn.value=.12,this.dust.uniforms.uFadeIn.value=.16,this.dust.uniforms.uFadeOut.value=.32,this.sparkEmitter=new C,this.moteEmitter=new C,this.dustEmitter=new C}get instanceCount(){return this._legs+this._paneCount}get impactDuration(){return Math.max(.05,p.refractcascade.lifetime*p.global.lifetime)}get fadeDuration(){return Math.max(.05,p.refractcascade.fadeTime)}lightShimmer(){let e=p.refractcascade;return 1-e.lightPulse*(.5-.5*Math.cos(this.age*e.lightPulseSpeed*I))}get _paneCount(){return f(Math.round(p.refractcascade.paneCount),1,R)}_handPoint(e){let t=p.refractcascade;return e.copy(this.origin).addScaledVector(this.direction,t.handForward).addScaledVector(this.side,t.handSide),e.y=t.handHeight,e}_panePoint(e,t,n){let r=p.refractcascade,i=t<=1?.5:e/(t-1),a=f(u(r.paneFirst,r.paneLast,i),.02,.99),o=(e%2==0?1:-1)*(r.paneSide<0?-1:1),s=r.paneOffset*Math.max(.01,r.paneOffsetTaper)**+e*o;return this.pointAt(a,n),n.addScaledVector(this.side,s),n.y=r.paneAltitude+r.paneRise*e+r.paneBob*Math.sin(this.age*r.paneBobSpeed*I+e*1.7+this._seed),n}_resolveNodes(){let e=p.refractcascade,t=this._paneCount;this._handPoint(this._nodes[0]);for(let e=0;e<t;e++)this._panePoint(e,t,this._nodes[e+1]);this.pointAt(1,this._nodes[t+1]),this._nodes[t+1].y=e.endHeight;let n=0;for(let e=0;e<=t;e++)n+=this._nodes[e].distanceTo(this._nodes[e+1]);n=Math.max(n,1e-4);let r=0;for(let e=0;e<t;e++)r+=this._nodes[e].distanceTo(this._nodes[e+1]),this._arrive[e]=r/n;for(let e=t;e<R;e++)this._arrive[e]=2;return this._legs=t+1,this._legs}_pathPoint(e,t){let n=this._legs,r=0;for(let e=0;e<n;e++)r+=this._nodes[e].distanceTo(this._nodes[e+1]);r=Math.max(r,1e-4);let i=g(e)*r,a=0;for(let e=0;e<n;e++){let r=this._nodes[e].distanceTo(this._nodes[e+1]);if(i<=a+r||e===n-1){let n=r<=1e-5?0:g((i-a)/r);return t.copy(this._nodes[e]).lerp(this._nodes[e+1],n)}a+=r}return t.copy(this._nodes[n])}get _progress(){return this.phase===T.TRAVEL?this.u:1}_paneGrow(e){let t=p.refractcascade;if(this.phase!==T.TRAVEL)return 1;let n=Math.max(.01,t.paneStagger);return g((this.u-(this._arrive[e]-n))/n)}onSpawn(){this.sparkEmitter.reset(),this.moteEmitter.reset(),this.dustEmitter.reset(),this._struck.fill(0),this._seed=Math.random()*100,this._syncUniforms(1),this._muzzleFx()}_syncUniforms(e){let t=p.refractcascade,n=p.global,r=this._resolveNodes(),i=r-1;for(let r=0;r<R;r++){let a=this.panes[r];if(r>=i){a.visible=!1;continue}let o=this._paneGrow(r)*e;if(o<=.01){a.visible=!1;continue}W.subVectors(this._nodes[r+1],this._nodes[r]).normalize(),G.subVectors(this._nodes[r+2],this._nodes[r+1]).normalize(),K.subVectors(G,W),K.lengthSq()<1e-8&&K.copy(W).multiplyScalar(-1),K.normalize(),q.crossVectors(L,K),q.lengthSq()<1e-8&&q.copy(this.side),q.normalize();let s=t.paneRoll+t.paneRollStep*r;q.applyAxisAngle(K,s).normalize(),a.visible=!0,a.setPlacement(this._nodes[r+1],K,q);let c=u(t.paneGrowScale,1,_.outCubic(o)),l=Y;l.width=Math.max(.05,t.paneWidth*c),l.height=Math.max(.05,t.paneTall*c),l.opacity=t.paneOpacity*n.opacity*o,l.edgeFade=t.paneEdgeFade,l.corner=t.paneCorner,l.seed=this._seed+r*3.7,l.resolution=t.paneResolution,l.reflectivity=t.paneReflectivity,l.fresnel=t.paneFresnel*n.fresnel,l.fresnelPower=t.paneFresnelPower,l.roughness=t.paneRoughness,l.blurRadius=t.paneBlurRadius,l.blurTaps=t.paneBlurTaps,l.roughStretch=t.paneRoughStretch,l.ripple=t.paneRipple*n.noiseStrength,l.rippleScale=t.paneRippleScale*n.noiseFrequency,l.rippleSpeed=t.paneRippleSpeed*n.noiseSpeed,l.priority=t.panePriority*(1+(i-r)*.15),l.colorTint=t.colorPaneTint,l.colorBase=t.colorPaneBase,a.update(l)}let a=X;a.progress=this._progress,a.fade=e,a.seed=this._seed,this.beamGeometry.instanceCount=r,this.beamMaterial.userData.sync(this._nodes,r,a),this.sparks.setGradient(o(t.colorSparkA),o(t.colorSparkB),o(t.colorSparkC),o(t.colorSparkD)),this.sparks.uniforms.uGravity.value.set(0,t.sparkGravity,0),this.sparks.uniforms.uSizeScale.value=t.sparkSize*n.particleSize*7,this.sparks.uniforms.uLifeScale.value=t.sparkLifetime*.5*n.particleLifetime,this.sparks.uniforms.uSpeedScale.value=n.particleSpeed,this.sparks.uniforms.uOpacity.value=n.opacity,this.sparks.uniforms.uGlow.value=t.beamGlow*.4*n.glow,this.sparks.uniforms.uStretch.value=t.sparkStretch,this.sparks.uniforms.uTurbulence.value=.25*n.turbulence,this.motes.setGradient(o(t.colorMoteA),o(t.colorMoteB),o(t.colorMoteC),o(t.colorMoteD)),this.motes.uniforms.uGravity.value.set(0,t.moteRise,0),this.motes.uniforms.uSizeScale.value=t.moteSize*n.particleSize*7,this.motes.uniforms.uLifeScale.value=t.moteLifetime*.5*n.particleLifetime,this.motes.uniforms.uSpeedScale.value=n.particleSpeed,this.motes.uniforms.uOpacity.value=n.opacity,this.motes.uniforms.uGlow.value=.9*n.glow,this.motes.uniforms.uTurbulence.value=t.moteTurbulence*n.turbulence,this.dust.setGradient(o(t.colorDustA),o(t.colorDustB),o(t.colorDustC),o(t.colorDustD)),this.dust.uniforms.uGravity.value.set(0,t.dustRise,0),this.dust.uniforms.uSizeScale.value=t.dustSize*n.particleSize,this.dust.uniforms.uLifeScale.value=t.dustLifetime*.5*n.particleLifetime,this.dust.uniforms.uSpeedScale.value=t.dustSpeed*n.particleSpeed,this.dust.uniforms.uOpacity.value=t.dustOpacity*n.opacity,this.dust.uniforms.uTurbulence.value=.3*n.turbulence}_muzzleFx(){let e=p.refractcascade,t=p.global;this._handPoint(H),this.ctx.bursts.spawn(b.AIR,H,{radius:e.muzzleSize*.2,endRadius:e.muzzleSize*t.explosionIntensity,life:.3,intensity:e.muzzleIntensity,opacity:.85,fresnel:1.6,displace:.4,colorA:o(e.colorMuzzleA),colorB:o(e.colorMuzzleB),colorC:o(e.colorMuzzleC)}),this.ctx.flash.trigger(o(e.colorCastFlash),e.castFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.5*t.explosionIntensity}_bounceFx(e){let t=p.refractcascade,r=p.global;H.copy(this._nodes[e+1]),this.ctx.bursts.spawn(b.AIR,H,{radius:t.bounceSize*.2,endRadius:t.bounceSize*r.explosionIntensity,life:.36,intensity:t.bounceIntensity,opacity:.8,fresnel:1.8,displace:.3,squash:.75,colorA:o(t.colorBounceA),colorB:o(t.colorBounceB),colorC:o(t.colorBounceC)}),G.subVectors(this._nodes[e+2],this._nodes[e+1]).normalize(),V.position=H,V.radius=.14,V.direction=U.copy(G),V.speed=t.sparkSpeed*1.6,V.speedVariance=.8,V.spread=.5,V.inherit=null,V.anchor=null,V.size=.15,V.sizeVariance=.7,V.life=t.sparkLifetime,V.lifeVariance=.5,V.spin=0,V.tint=null,V.time=n.uTime.value,this.sparks.emit(Math.round(t.bounceSparks*r.particleCount),V),this.ctx.flash.trigger(o(t.colorBounceC),t.bounceFlash*r.explosionIntensity),this.lightBoost=t.lightIntensity*.55*r.explosionIntensity}_shedFx(e,t){let r=p.refractcascade,i=p.global,a=n.uTime.value,o=Math.max(.02,this._progress),s=Math.round(this.sparkEmitter.tick(e,r.sparkRate*t)*i.particleCount);s>0&&(this._pathPoint(m(.02,1)*o,H),V.position=H,V.radius=r.beamRadiusNear*2.2,V.direction=U.set(0,1,0),V.speed=r.sparkSpeed,V.speedVariance=.85,V.spread=1,V.inherit=null,V.anchor=null,V.size=.12,V.sizeVariance=.7,V.life=r.sparkLifetime,V.lifeVariance=.55,V.spin=0,V.tint=null,V.time=a,this.sparks.emit(s,V));let c=Math.round(this.moteEmitter.tick(e,r.moteRate*t)*i.particleCount);if(c>0){let e=this._legs-1,t=0;for(let n=e-1;n>=0;n--)if(this._arrive[n]<=o){t=n;break}H.copy(this._nodes[t+1]),V.position=H,V.radius=r.moteScatter,V.direction=U.set(0,1,0),V.speed=r.moteSpeed,V.speedVariance=.85,V.spread=1,V.inherit=null,V.anchor=null,V.size=.07,V.sizeVariance=.6,V.life=r.moteLifetime,V.lifeVariance=.5,V.spin=0,V.tint=null,V.time=a,this.motes.emit(c,V)}if(this._progress<.999)return;let l=Math.round(this.dustEmitter.tick(e,r.dustRate*t)*i.particleCount);l>0&&(this.pointAt(1,H).setY(.1),V.position=H,V.radius=r.scorchRadius*2.2,V.direction=U.set(0,1,0),V.speed=r.dustSpeed,V.speedVariance=.7,V.spread=.85,V.inherit=null,V.anchor=null,V.size=.75,V.sizeVariance=.5,V.life=r.dustLifetime,V.lifeVariance=.45,V.spin=.35,V.tint=null,V.time=a,this.dust.emit(l,V))}onTravel(e){let t=p.refractcascade;this._syncUniforms(1);let n=this._legs-1;for(let e=0;e<n;e++)!this._struck[e]&&this.u>=this._arrive[e]&&(this._struck[e]=1,this._bounceFx(e));this._pathPoint(this.u,this.position),this._shedFx(e,1),this.ctx.shake.rumble(t.rumble*.5*p.global.cameraShake,e)}onImpact(){let e=p.refractcascade,t=p.global,r=n.uTime.value;this._syncUniforms(1);let i=this._legs-1;for(let e=0;e<i;e++)this._struck[e]||(this._struck[e]=1,this._bounceFx(e));H.copy(this._nodes[this._legs]),this.pointAt(1,J),this.ctx.bursts.spawn(b.AIR,H,{radius:e.burstSize*.2,endRadius:e.burstSize*t.explosionIntensity,life:.6,intensity:e.burstIntensity,opacity:.9,fresnel:1.7,displace:.5,squash:.85,colorA:o(e.colorBounceA),colorB:o(e.colorBounceB),colorC:o(e.colorBounceC)}),this.ctx.decals.spawn(w.SHOCKWAVE,J,{radius:e.shockRadius*t.explosionIntensity,life:.55,width:.045,intensity:1,colorA:o(e.colorShockA),colorB:o(e.colorShockB)}),this.ctx.decals.spawn(w.SCORCH,J,{radius:e.scorchRadius*m(1.5,2.3),life:e.scorchLife,intensity:e.scorchIntensity,colorA:o(e.colorScorch),colorB:o(e.colorEmber),height:.015}),V.position=H,V.radius=.24,V.direction=U.copy(this.direction).multiplyScalar(.4).setY(.7).normalize(),V.speed=e.sparkSpeed*2.1,V.speedVariance=.85,V.spread=1,V.inherit=null,V.anchor=null,V.size=.18,V.sizeVariance=.8,V.life=e.sparkLifetime*1.4,V.lifeVariance=.6,V.spin=0,V.tint=null,V.time=r,this.sparks.emit(Math.round(e.burstSparks*t.particleCount),V),this.pointAt(1,H),V.position=H,V.radius=e.scorchRadius*2,V.direction=U.set(0,1,0),V.speed=e.dustSpeed*2,V.spread=1,V.size=1.2,V.life=e.dustLifetime*1.2,V.spin=.4,this.dust.emit(Math.round(e.burstDust*t.particleCount),V),this.ctx.shake.add(e.impactShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),22),this.ctx.flash.trigger(o(e.colorFlash),e.impactFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*1.2*t.explosionIntensity}onFade(e,t){let n=t<=1?1:1-_.inCubic(g(t-1));this._syncUniforms(n),this._pathPoint(1,this.position),this._shedFx(e,n*(t<=1?.55:.2)),this.ctx.shake.rumble(p.refractcascade.rumble*n*p.global.cameraShake,e)}onDestroy(){for(let e of this.panes)e.visible=!1;this._struck.fill(0),this._legs=2,this.beamGeometry.instanceCount=1,this.beamMaterial.uniforms.uFade.value=0}dispose(){for(let e of this.panes)e.dispose();this.beamGeometry.dispose(),this.beamMaterial.dispose(),super.dispose()}};export{Z as RefractCascadeAbility};
//# sourceMappingURL=RefractCascadeAbility-cM2lmqOj.js.map