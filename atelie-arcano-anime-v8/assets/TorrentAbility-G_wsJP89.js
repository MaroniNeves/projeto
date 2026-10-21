import{A as e,Br as t,G as n,K as r,Q as i,R as a,V as o,Y as s,di as c,k as l,o as u,ot as d,q as f,st as p,xt as m,y as h,yn as g}from"./settings-DdywqLlV.js";import{t as _}from"./ParticleSystem-BZTczMT8.js";import{n as v}from"./ParticleEngine-DLxipNH0.js";import{n as y}from"./GroundDecals-kYmr8HKl.js";import{n as b,t as x}from"./Ability-CYesB5Ur.js";import{n as S,r as C,t as w}from"./GroundField-aLIZg3d3.js";var T=`
  #define TAU 6.283185307179586

  uniform vec3  uContact;      // where the jet lands, world metres
  uniform vec3  uNormal;       // the impact surface's unit normal
  uniform vec3  uAxis;         // in-plane fan axis (the reflected heading)
  uniform vec3  uBinormal;     // in-plane, orthogonal to uAxis

  uniform float uK;            // 0..0.985 — the in-plane momentum fraction
  uniform float uReach;        // metres the mean bearing carries
  uniform float uFanPower;     // how hard reach follows the density
  uniform float uOpen;         // 0..1 of the fan that exists yet
  uniform float uCrown;        // lift off the plate, x reach
  uniform float uCrownFall;    // how fast the sheet comes back down
  uniform float uFingers;      // ligaments the rim breaks into
  uniform float uFingerDepth;  // 0..1 how deep they cut
  uniform float uFingerScale;  // noise features around the rim
  uniform float uFingerSpeed;  // Hz they crawl
  uniform float uRipple;       // metres of surface chop on the sheet
  uniform float uRippleScale;  // chop features per metre
  uniform float uRippleSpeed;  // Hz it runs outward
  uniform float uAge;          // seconds since the jet made contact
  uniform float uSeed;

  varying float vS;            // 0 at the contact point, 1 at the rim
  varying float vQ;            // the density at this bearing, mean 1
  varying float vR;            // metres from the contact point
  varying vec3  vNormalW;
  varying vec3  vViewW;
  varying float vViewZ;

  ${s}

  void main() {
    float s = position.x;
    float phi = (position.y - 0.5) * TAU;

    /* The Poisson kernel. Mean 1 by construction, so uReach means "how far the
       average bearing carries" whatever the concentration is — which is what
       lets fanConcentration be dragged without the fan changing size. */
    float k = clamp(uK, 0.0, 0.985);
    float q = (1.0 - k * k) / max(1.0 + k * k - 2.0 * k * cos(phi), 1e-4);
    vQ = q;

    /* Ligaments. A liquid rim is Plateau-Rayleigh unstable: surface tension
       collects the sheet's edge into a torus and the torus beads up. Two terms,
       one periodic and one hashed, because a purely periodic rim reads as a
       gear and a purely noisy one reads as a stain. */
    float fingers = sin(phi * max(uFingers, 1.0) + uAge * uFingerSpeed + uSeed * 7.0) * 0.5 + 0.5;
    fingers = mix(fingers, snoise(vec3(cos(phi), sin(phi), uAge * 0.35) * uFingerScale + uSeed), 0.55);
    float reach = uReach * pow(max(q, 1e-4), uFanPower) * (1.0 - uFingerDepth * fingers) * uOpen;

    float r = reach * s;
    vec3 inPlane = uAxis * cos(phi) + uBinormal * sin(phi);

    /* The crown. Zero at the contact point, zero again where the rim lands, and
       scaled by the normal momentum the reflection handed back — a jet coming
       straight down throws a tall bell, a grazing one stays on the deck. */
    float fall = max(uCrownFall, 0.05);
    float shoulder = pow(max(1.0 - s, 0.0), fall);
    float lift = 4.0 * uCrown * reach * s * shoulder;
    lift += uRipple * snoise(vec3(r * uRippleScale, phi * 2.0, uAge * uRippleSpeed)) * s;

    vec3 world = uContact + inPlane * r + uNormal * lift;

    /* Analytic slope of the crown, so the sheet is lit as a surface rather than
       as a flat decal. Differentiating 4*A*s*(1-s)^f and dividing by dr/ds. */
    float slope = 4.0 * uCrown * (shoulder - fall * s * pow(max(1.0 - s, 1e-3), fall - 1.0));
    vNormalW = normalize(uNormal - inPlane * slope);

    vS = s;
    vR = r;
    vViewW = cameraPosition - world;

    vec4 mv = viewMatrix * vec4(world, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,E=`
  uniform vec2  uResolution;
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;
  uniform vec3  uLightDir;
  uniform float uGlobalGlow;

  uniform float uThin;         // metres over which the sheet halves in thickness
  uniform float uBody;         // how much body the sheet keeps at all
  uniform float uRimWidth;     // 0..1 of the reach the rim occupies
  uniform float uRimGain;      // how bright that rim is
  uniform float uFresnel;      // grazing whitening exponent
  uniform float uSpecular;
  uniform float uGloss;        // Blinn exponent
  uniform float uOpacity;
  uniform float uGlow;
  uniform float uSoftFade;
  uniform float uFade;

  uniform vec3  uColorSheet;   // the water where it is thick
  uniform vec3  uColorThin;    // ... and where it has stretched out
  uniform vec3  uColorRim;     // the collected edge
  uniform vec3  uColorSpray;   // the specular and the crest

  varying float vS;
  varying float vQ;
  varying float vR;
  varying vec3  vNormalW;
  varying vec3  vViewW;
  varying float vViewZ;

  ${f}

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vViewW);
    float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);

    /* Mass conservation: the same flux over a circumference that grows with r. */
    float thickness = vQ / (1.0 + vR / max(uThin, 0.02));

    float rim = smoothstep(1.0 - clamp(uRimWidth, 0.01, 1.0), 1.0, vS);
    float fres = pow(1.0 - ndv, max(uFresnel, 0.1));

    vec3 colour = mix(uColorThin, uColorSheet, clamp(thickness, 0.0, 1.0));
    colour = mix(colour, uColorRim, rim);
    colour += uColorSpray * fres * 0.35;

    vec3 H = normalize(normalize(uLightDir) + V);
    colour += uColorSpray * pow(max(dot(N, H), 0.0), max(uGloss, 1.0)) * uSpecular;

    float alpha = clamp(thickness * uBody + rim * uRimGain + fres * 0.2, 0.0, 1.0);
    /* The sheet is born at the contact point and has to not be a hard disc
       there — the jet's own barrel is standing in that spot. */
    alpha *= smoothstep(0.0, 0.08, vS);
    alpha *= uOpacity * uFade;
    if (alpha < 0.004) discard;

    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.004) discard;

    colour *= uGlow * uGlobalGlow;
    gl_FragColor = vec4(clamp(colour, 0.0, 32.0), alpha);
  }
`;function D(){let e=new t({transparent:!0,depthWrite:!1,depthTest:!0,blending:2,side:2,toneMapped:!1,uniforms:r({uContact:{value:new c},uNormal:{value:new c(0,1,0)},uAxis:{value:new c(0,0,1)},uBinormal:{value:new c(1,0,0)},uK:{value:.6},uReach:{value:3.4},uFanPower:{value:.8},uOpen:{value:0},uCrown:{value:.12},uCrownFall:{value:1.6},uFingers:{value:13},uFingerDepth:{value:.22},uFingerScale:{value:3.2},uFingerSpeed:{value:4.5},uRipple:{value:.06},uRippleScale:{value:2.4},uRippleSpeed:{value:3},uAge:{value:0},uSeed:{value:0},uThin:{value:1.6},uBody:{value:.65},uRimWidth:{value:.16},uRimGain:{value:.5},uFresnel:{value:2.6},uSpecular:{value:.9},uGloss:{value:40},uOpacity:{value:1},uGlow:{value:1.3},uSoftFade:{value:.3},uFade:{value:1},uColorSheet:{value:new m(`#1f7f9a`)},uColorThin:{value:new m(`#0b3a4c`)},uColorRim:{value:new m(`#d6f6ff`)},uColorSpray:{value:new m(`#ffffff`)}}),vertexShader:T,fragmentShader:E});return e.userData.sync=t=>{let n=u.torrent,r=u.global,i=e.uniforms;i.uContact.value.copy(t.contact),i.uNormal.value.copy(t.normal),i.uAxis.value.copy(t.axis),i.uBinormal.value.copy(t.binormal),i.uK.value=t.k,i.uOpen.value=t.open,i.uAge.value=t.age,i.uSeed.value=t.seed,i.uFade.value=t.fade,i.uReach.value=n.fanReach,i.uFanPower.value=n.fanPower,i.uCrown.value=n.fanCrown*t.crown,i.uCrownFall.value=n.fanCrownFall,i.uFingers.value=n.fanFingers,i.uFingerDepth.value=n.fanFingerDepth*r.randomness,i.uFingerScale.value=n.fanFingerScale*r.noiseFrequency,i.uFingerSpeed.value=n.fanFingerSpeed*r.noiseSpeed,i.uRipple.value=n.fanRipple*r.noiseStrength,i.uRippleScale.value=n.fanRippleScale*r.noiseFrequency,i.uRippleSpeed.value=n.fanRippleSpeed*r.noiseSpeed,i.uThin.value=n.fanThin,i.uBody.value=n.fanBody,i.uRimWidth.value=n.fanRimWidth,i.uRimGain.value=n.fanRimGain,i.uFresnel.value=n.fanFresnel*r.fresnel,i.uSpecular.value=n.fanSpecular,i.uGloss.value=n.fanGloss,i.uOpacity.value=n.fanOpacity*r.opacity,i.uGlow.value=n.fanGlow*r.glow,i.uSoftFade.value=n.fanSoftFade,i.uColorSheet.value.copy(a(n.colorSheet)),i.uColorThin.value.copy(a(n.colorSheetThin)),i.uColorRim.value.copy(a(n.colorSheetRim)),i.uColorSpray.value.copy(a(n.colorSheetSpray))},e}var O=Math.PI*2;Math.PI*.5;var k=22,A=72,j=5,M={},N=new c,P=new c,F=new c,I=new c,L=new c,R=new c,z=new c,B=new c,V=new c,H=new c(0,1,0),U=C(),W=class extends x{constructor(e){super(`torrent`,e)}createShaders(){this.jet=new l({path:e.STRAIGHT,prefix:`jet`,nodes:72,sides:22}),this.group.add(this.jet.group),this.sheetGeometry=i(k,A),this.sheetMaterial=D(),this.sheetMesh=new g(this.sheetGeometry,this.sheetMaterial),this.sheetMesh.frustumCulled=!1,this.sheetMesh.matrixAutoUpdate=!1,this.sheetMesh.layers.set(o.VFX),this.sheetMesh.renderOrder=9,this.group.add(this.sheetMesh),this.wet=new w(this.group,{mode:S.WET,depthTest:!0,name:`torrent.wet`}),this._seed=0,this._markDistance=0,this._contactAge=0,this._k=0,this._crown=0,this._tubeState={origin:new c,target:new c,side:new c,progress:1,fade:1,widthFade:1,seed:0,time:0},this._sheetState={contact:new c,normal:new c(0,1,0),axis:new c(0,0,1),binormal:new c(1,0,0),k:0,crown:0,open:0,age:0,seed:0,fade:1}}createParticles(){let e=this.ctx.particles;this.spray=e.get(`torrent.spray`,{capacity:4e3,shape:_.STREAK,additive:!1,lit:!0,stretch:!0,softFade:.2}),this.spray.uniforms.uDrag.value=1.9,this.spray.uniforms.uEndSize.value=.4,this.spray.uniforms.uSizeIn.value=.02,this.spray.uniforms.uFadeIn.value=.03,this.spray.uniforms.uFadeOut.value=.45,this.drops=e.get(`torrent.drops`,{capacity:1600,shape:_.SOFT,additive:!1,lit:!0,softFade:.2}),this.drops.uniforms.uDrag.value=.6,this.drops.uniforms.uEndSize.value=.7,this.drops.uniforms.uSizeIn.value=.05,this.drops.uniforms.uFadeOut.value=.55,this.mist=e.get(`torrent.mist`,{capacity:1800,shape:_.SMOKE,additive:!1,curl:!0,softFade:.9}),this.mist.uniforms.uDrag.value=2.6,this.mist.uniforms.uEndSize.value=2.4,this.mist.uniforms.uSizeIn.value=.1,this.mist.uniforms.uFadeIn.value=.14,this.mist.uniforms.uFadeOut.value=.35,this.sprayEmitter=new v,this.dropEmitter=new v,this.mistEmitter=new v}get impactDuration(){return Math.max(.05,u.torrent.holdTime*u.global.lifetime)}get fadeDuration(){return Math.max(.05,u.torrent.fadeTime)}get instanceCount(){return this.jet.drawCalls+ +(this._contactAge>0)}lightShimmer(){let e=u.torrent;return .88+.12*Math.sin(this.age*e.jetThrobSpeed*O)*Math.sin(this.age*3.1)}_mouthPoint(e){let t=u.torrent;return e.copy(this.origin).addScaledVector(this.direction,t.handForward).addScaledVector(this.side,t.handSide),e.y=t.handHeight,e}_contactPoint(e){let t=this.phase===b.TRAVEL?Math.max(.04,this.u):1;return this.pointAt(t,e),e.y=u.torrent.surfaceHeight,e}_surfaceNormal(e){let t=u.torrent,n=t.surfaceTilt,r=t.surfaceRoll,i=Math.sin(n);return e.copy(H).multiplyScalar(Math.cos(n)).addScaledVector(this.direction,i*Math.cos(r)).addScaledVector(this.side,i*Math.sin(r)),e.normalize()}_frame(){let e=u.torrent;this._mouthPoint(F),this._contactPoint(I),this._surfaceNormal(L),V.copy(I).sub(F),V.lengthSq()<1e-8&&V.copy(this.direction),V.normalize();let t=V.dot(L);B.copy(V).addScaledVector(L,-2*t),R.copy(B).addScaledVector(L,-B.dot(L));let n=R.length();n<1e-4&&(R.copy(this.direction).addScaledVector(L,-this.direction.dot(L)),R.lengthSq()<1e-8&&R.copy(this.side)),R.normalize(),z.crossVectors(L,R).normalize(),this._k=Math.min(.985,Math.max(0,n*p(e.fanConcentration))),this._crown=Math.abs(t)}_fanBearing(e){let t=this._k;return t<1e-4?(e-.5)*O:2*Math.atan((1-t)/(1+t)*Math.tan(Math.PI*(e-.5)))}_fanReach(){return Math.max(.05,u.torrent.fanReach)}_reachAt(e){let t=u.torrent,n=this._k,r=(1-n*n)/Math.max(1+n*n-2*n*Math.cos(e),1e-4);return this._fanReach()*Math.max(r,1e-4)**+t.fanPower}_fanDirection(e,t){let n=u.torrent;return t.copy(R).multiplyScalar(Math.cos(e)).addScaledVector(z,Math.sin(e)).addScaledVector(L,this._crown*p(n.sprayLift)),t.normalize()}onSpawn(){this.sprayEmitter.reset(),this.dropEmitter.reset(),this.mistEmitter.reset(),this._markDistance=0,this._contactAge=0,this._seed=Math.random()*100,this.jet.visible=!0,this.wet.setVisible(!0),this._sync(1,1)}_sync(e,t){let n=u.torrent,r=u.global;this._frame();let i=this._tubeState;i.origin.copy(F),i.target.copy(I),i.side.copy(this.side),i.progress=1,i.fade=e,i.widthFade=t,i.seed=this._seed,i.time=this.age,this.jet.sync(n,i,r);let o=this._sheetState;o.contact.copy(I),o.normal.copy(L),o.axis.copy(R),o.binormal.copy(z),o.k=this._k,o.crown=this._crown,o.open=p(this._contactAge/Math.max(.01,n.openTime))*t,o.age=this.age,o.seed=this._seed,o.fade=e,this.sheetMaterial.userData.sync(o);let s=this._fanReach();N.copy(I).addScaledVector(R,s*n.wetBias),N.y=0,U.centre=N,U.yaw=Math.atan2(R.x,R.z),U.height=n.wetHeight,U.radius=Math.max(.05,s*n.wetRadius),U.grow=p(this._contactAge/Math.max(.02,n.wetGrow)),U.recede=this.phase===b.FADE?p(this.fadeTime/this.fadeDuration)*p(n.wetDry):0,U.fade=e,U.seed=this._seed,U.edge=n.wetEdge,U.ragged=n.wetRagged,U.raggedScale=n.wetRaggedScale*r.noiseFrequency,U.warp=n.wetWarp*r.noiseStrength,U.relief=n.wetRelief,U.normalStep=n.wetNormalStep,U.ambient=n.wetAmbient,U.wrap=n.wetWrap,U.specular=n.wetSpecular,U.gloss=n.wetGloss,U.cell=n.wetCell*r.noiseFrequency,U.depth=n.wetDepth,U.lift=n.wetLift,U.detail=n.wetDetail,U.flow=n.wetFlow,U.speed=n.wetSpeed*r.noiseSpeed,U.windAngle=0,U.emissive=n.wetEmissive,U.opacity=n.wetOpacity,U.opacityScale=r.opacity,U.noiseStrength=r.noiseStrength,U.noiseFrequency=r.noiseFrequency,U.noiseSpeed=r.noiseSpeed,U.colorBase=n.colorWetBase,U.colorEdge=n.colorWetEdge,U.colorGlow=n.colorWetGlow,U.colorDeep=n.colorWetDeep,this.wet.update(U),this.spray.setGradient(a(n.colorSprayA),a(n.colorSprayB),a(n.colorSprayC),a(n.colorSprayD)),this.spray.uniforms.uGravity.value.set(0,n.sprayGravity,0),this.spray.uniforms.uSizeScale.value=n.spraySize*r.particleSize*7,this.spray.uniforms.uLifeScale.value=n.sprayLifetime*.5*r.particleLifetime,this.spray.uniforms.uSpeedScale.value=r.particleSpeed,this.spray.uniforms.uOpacity.value=r.opacity,this.spray.uniforms.uStretch.value=n.sprayStretch,this.spray.uniforms.uTurbulence.value=.2*r.turbulence,this.drops.setGradient(a(n.colorDropA),a(n.colorDropB),a(n.colorDropC),a(n.colorDropD)),this.drops.uniforms.uGravity.value.set(0,n.dropGravity,0),this.drops.uniforms.uSizeScale.value=n.dropSize*r.particleSize*7,this.drops.uniforms.uLifeScale.value=n.dropLifetime*.5*r.particleLifetime,this.drops.uniforms.uSpeedScale.value=r.particleSpeed,this.drops.uniforms.uOpacity.value=r.opacity,this.mist.setGradient(a(n.colorMistA),a(n.colorMistB),a(n.colorMistC),a(n.colorMistD)),this.mist.uniforms.uGravity.value.set(0,n.mistRise,0),this.mist.uniforms.uSizeScale.value=n.mistSize*r.particleSize,this.mist.uniforms.uLifeScale.value=n.mistLifetime*.5*r.particleLifetime,this.mist.uniforms.uSpeedScale.value=n.mistSpeed*r.particleSpeed,this.mist.uniforms.uOpacity.value=n.mistOpacity*r.opacity,this.mist.uniforms.uTurbulence.value=.35*r.turbulence}_fanFx(e,t){let r=u.torrent,i=u.global,a=n.uTime.value,o=Math.round(this.sprayEmitter.tick(e,r.sprayRate*t)*i.particleCount);if(o>0){M.speed=r.spraySpeed,M.speedVariance=r.spraySpeedVariance,M.spread=.18,M.inherit=null,M.anchor=null,M.size=.1,M.sizeVariance=.65,M.life=r.sprayLifetime,M.lifeVariance=.5,M.spin=0,M.tint=null,M.time=a;let e=Math.ceil(o/Math.min(o,j));for(;o>0;){let t=this._fanBearing(Math.random())+d(-r.sprayJitter,r.sprayJitter),n=Math.sqrt(Math.random());this._fanDirection(t,P),N.copy(I).addScaledVector(R,Math.cos(t)*this._reachAt(t)*n).addScaledVector(z,Math.sin(t)*this._reachAt(t)*n),M.position=N,M.radius=.06,M.direction=P,this.spray.emit(Math.min(e,o),M),o-=e}}let s=Math.round(this.dropEmitter.tick(e,r.dropRate*t)*i.particleCount);if(s>0){let e=this._fanBearing(Math.random()),t=this._reachAt(e);this._fanDirection(e,P),N.copy(I).addScaledVector(R,Math.cos(e)*t).addScaledVector(z,Math.sin(e)*t),M.position=N,M.radius=.12,M.direction=P,M.speed=r.dropSpeed,M.speedVariance=.7,M.spread=.3,M.size=.16,M.sizeVariance=.7,M.life=r.dropLifetime,M.lifeVariance=.5,M.spin=0,M.time=a,this.drops.emit(s,M)}let c=Math.round(this.mistEmitter.tick(e,r.mistRate*t)*i.particleCount);c>0&&(M.position=N.copy(I).addScaledVector(R,this._fanReach()*.35),M.radius=this._fanReach()*.5,M.direction=P.copy(L),M.speed=r.mistSpeed,M.speedVariance=.75,M.spread=.9,M.size=.6,M.sizeVariance=.55,M.life=r.mistLifetime,M.lifeVariance=.45,M.spin=.25,M.time=a,this.mist.emit(c,M))}_markFx(){let e=u.torrent,t=1/Math.max(.05,e.foamRate),n=24;for(;this.front-this._markDistance>=t&&n-->0;){this._markDistance+=t;let n=p(this._markDistance/this.length);this.pointAt(n,N),N.addScaledVector(R,this._fanReach()*d(.1,.6)),N.addScaledVector(z,d(-.5,.5)*this._fanReach()*.35),this.ctx.decals.spawn(y.FOAM,N,{radius:e.foamRadius*d(.7,1.35),life:e.foamLife,intensity:e.foamIntensity,colorA:a(e.colorFoamA),colorB:a(e.colorFoamB)})}}onTravel(e){let t=u.torrent;this._contactAge=this.age,this._sync(1,1),this.position.copy(I),this._fanFx(e,1),this._markFx(),this.ctx.shake.rumble(t.rumble*u.global.cameraShake,e)}onImpact(){let e=u.torrent,t=u.global,r=n.uTime.value;this._frame(),this.ctx.bursts.spawn(h.WATER,I,{radius:e.burstSize*.25,endRadius:e.burstSize*t.explosionIntensity,life:.5,intensity:e.burstIntensity,opacity:.85,fresnel:2.2,displace:.45,squash:.6,colorA:a(e.colorBurstA),colorB:a(e.colorBurstB),colorC:a(e.colorBurstC)}),M.speed=e.spraySpeed*1.6,M.speedVariance=.8,M.spread=.22,M.inherit=null,M.anchor=null,M.size=.13,M.sizeVariance=.7,M.life=e.sprayLifetime*1.3,M.lifeVariance=.55,M.spin=0,M.tint=null,M.time=r;for(let n=0;n<j;n++){let n=this._fanBearing(Math.random()),r=this._reachAt(n)*.6;this._fanDirection(n,P),N.copy(I).addScaledVector(R,Math.cos(n)*r).addScaledVector(z,Math.sin(n)*r),M.position=N,M.radius=.08,M.direction=P,this.spray.emit(Math.round(e.sprayRate*.12*t.particleCount),M)}this.ctx.shake.add(e.impactShake*t.explosionIntensity,1/Math.max(.05,e.shakeDuration),22),this.ctx.flash.trigger(a(e.colorFlash),e.impactFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.9*t.explosionIntensity}onFade(e,t){let n=u.torrent;this._contactAge=this.age;let r=p(t-1),i=1-r*r,a=1-r*r*r;this._sync(a,i),this.position.copy(I),this._fanFx(e,a*i),this.ctx.shake.rumble(n.rumble*a*u.global.cameraShake,e)}onDestroy(){this.jet.visible=!1,this.wet.setVisible(!1),this._contactAge=0,this._markDistance=0,this._k=0,this._crown=0,this.sheetMaterial.uniforms.uOpen.value=0}dispose(){this.jet.dispose(),this.wet.dispose(),this.sheetGeometry.dispose(),this.sheetMaterial.dispose(),super.dispose()}};export{W as TorrentAbility};
//# sourceMappingURL=TorrentAbility-G_wsJP89.js.map