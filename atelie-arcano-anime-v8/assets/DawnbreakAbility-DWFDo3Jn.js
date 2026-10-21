import{Br as e,G as t,K as n,R as r,V as i,Y as a,at as o,di as s,o as c,ot as l,st as u,tt as d,xt as f,yn as p}from"./settings-DdywqLlV.js";import{t as m}from"./ParticleSystem-BZTczMT8.js";import{n as h}from"./ParticleEngine-DLxipNH0.js";import{n as g,t as _}from"./SceneHooks-DvEWF-72.js";import{t as v}from"./Ability-CYesB5Ur.js";import{r as y}from"./quads-DpYMEt67.js";var b=`
  uniform vec3  uCentre;
  uniform float uSize;
  uniform float uSpan;

  varying vec2 vPlane;

  void main() {
    // The quad is built around the centre in view space, so it faces the camera
    // whatever the camera does and needs no model matrix of its own.
    vec4 centre = viewMatrix * vec4(uCentre, 1.0);

    // position.xy is the unit quad's -0.5..0.5. vPlane is measured in DISC
    // RADII, so r = 1.0 is exactly the limb wherever the size slider puts it.
    vPlane = position.xy * 2.0 * uSpan;
    centre.xy += position.xy * (2.0 * uSpan * uSize);

    gl_Position = projectionMatrix * centre;
  }
`,x=`
  uniform float uTime;
  uniform float uGlobalGlow;
  uniform float uShaderIntensity;

  uniform float uSeed;
  uniform float uFade;
  uniform float uWarm;

  uniform float uSoft;
  uniform float uLimb;
  uniform float uHalo;
  uniform float uHaloFalloff;
  uniform float uFlare;
  uniform float uFlareLength;
  uniform float uFlareWidth;
  uniform float uGranule;
  uniform float uGranuleScale;
  uniform float uGranuleSpeed;

  uniform float uGlow;
  uniform float uOpacity;
  uniform vec3  uColorCore;
  uniform vec3  uColorLow;
  uniform vec3  uColorHalo;

  varying vec2 vPlane;

  ${a}

  void main() {
    float r = length(vPlane);

    /* --- the body, limb-darkened --- */
    float body = 1.0 - smoothstep(1.0 - clamp(uSoft, 0.001, 0.999), 1.0, r);
    float limb = pow(clamp(1.0 - r * r, 0.0, 1.0), max(uLimb, 0.01));
    float cells = fbm4(vec3(vPlane * uGranuleScale, uTime * uGranuleSpeed + uSeed));
    body *= mix(1.0, 0.55 + 0.45 * (cells * 0.5 + 0.5), clamp(uGranule, 0.0, 1.0));

    /* --- the aureole --- */
    float reach = max(uHalo, 1.001);
    float halo = pow(clamp(1.0 - r / reach, 0.0, 1.0), max(uHaloFalloff, 0.05));

    /* --- the streak. Two exponentials, wide in x and tight in y. --- */
    float streak = exp(-abs(vPlane.x) / max(uFlareLength * reach, 1e-3)) *
                   exp(-abs(vPlane.y) / max(uFlareWidth, 1e-3));

    vec3 face = mix(uColorLow, uColorCore, clamp(uWarm, 0.0, 1.0));

    vec3 color = face * (body * (0.35 + 0.65 * limb));
    color += uColorHalo * halo * halo;
    color += uColorHalo * streak * uFlare;

    float alpha = clamp(body + halo * 0.55 + streak * uFlare * 0.5, 0.0, 1.0);
    alpha *= uFade * uOpacity;
    if (alpha < 0.003) discard;

    color *= uGlow * uGlobalGlow * mix(0.7, 1.0, uShaderIntensity);
    gl_FragColor = vec4(clamp(color, 0.0, 64.0), alpha);
  }
`;function S(){return new e({transparent:!0,depthWrite:!1,depthTest:!0,blending:2,toneMapped:!1,uniforms:n({uCentre:{value:new s},uSize:{value:3},uSpan:{value:4},uSeed:{value:0},uFade:{value:0},uWarm:{value:0},uSoft:{value:.12},uLimb:{value:.35},uHalo:{value:3.4},uHaloFalloff:{value:2.6},uFlare:{value:.55},uFlareLength:{value:.85},uFlareWidth:{value:.18},uGranule:{value:.35},uGranuleScale:{value:1.6},uGranuleSpeed:{value:.15},uGlow:{value:2.4},uOpacity:{value:1},uColorCore:{value:new f(1,.98,.9)},uColorLow:{value:new f(1,.55,.22)},uColorHalo:{value:new f(1,.78,.45)}}),vertexShader:b,fragmentShader:x})}var C=3,w={},T=new s,E=new s,D=new s,O=new s,k=new f,A=class extends v{constructor(e){super(`dawnbreak`,e)}createShaders(){this.material=S(),this.disc=new p(y(),this.material),this.disc.frustumCulled=!1,this.disc.matrixAutoUpdate=!1,this.disc.layers.set(i.VFX),this.disc.renderOrder=8,this.disc.name=`Daystar`,this.group.add(this.disc),this.sun=null,this._seed=0,this._warm=0,this._centre=new s}createParticles(){this.motes=this.ctx.particles.get(`dawnbreak.motes`,{capacity:1400,shape:m.SOFT,additive:!0,curl:!0,softFade:.5}),this.motes.uniforms.uDrag.value=1.8,this.motes.uniforms.uEndSize.value=.5,this.motes.uniforms.uSizeIn.value=.1,this.motes.uniforms.uFadeIn.value=.18,this.motes.uniforms.uFadeOut.value=.45,this.moteEmitter=new h}get impactDuration(){return Math.max(.05,c.dawnbreak.sweepTime*c.global.lifetime)}get fadeDuration(){return Math.max(.05,c.dawnbreak.settleTime)}get instanceCount(){return 1}lightShimmer(){return o(1,Math.max(.01,c.dawnbreak.lightNoon),this._warm)}_centrePoint(e){return this.pointAt(1,e).setY(0)}_lightDirection(e,t,n){let r=Math.cos(n);return e.set(-Math.cos(t)*r,-Math.sin(n),-Math.sin(t)*r),e.normalize()}_sunDirection(e,t,n,r){let i=c.environment;return this._lightDirection(D,i.sunAzimuth,i.sunElevation),this._lightDirection(O,t,n),e.copy(D).lerp(O,u(r)),e.lengthSq()<1e-8&&e.copy(O),e.normalize()}onSpawn(){this.moteEmitter.reset(),this._seed=Math.random()*100,this._warm=0,this.sun=this.borrow(g.acquire(_.KEY_LIGHT,this)),this._sync(0,0,1)}_sync(e,t,n){let i=c.dawnbreak,a=c.global,s=this.material.uniforms,l=u(e),d=Math.sin(Math.PI*l)**+Math.max(.05,i.elevCurve),f=o(i.elevLow,i.elevHigh,d),p=i.azStart+i.azSweep*l,m=u(t*i.sunWeight);this._warm=u(d),k.copy(r(i.colorHorizon)).lerp(r(i.colorZenith),this._warm),this.sun&&this.sun.aim(p,f).tint(k).brightness(o(i.intensityLow,i.intensityHigh,this._warm)).blend(m),this._centrePoint(this._centre),this._sunDirection(E,p,f,m),s.uCentre.value.copy(this._centre).addScaledVector(E,-i.discDistance),s.uSize.value=Math.max(.01,i.discSize),s.uSpan.value=Math.max(i.discReach,i.haloSize*(1+i.flareLength)),s.uSeed.value=this._seed,s.uFade.value=n*m,s.uWarm.value=this._warm,s.uSoft.value=i.discSoft,s.uLimb.value=i.discLimb,s.uHalo.value=i.haloSize,s.uHaloFalloff.value=i.haloFalloff,s.uFlare.value=i.flare,s.uFlareLength.value=i.flareLength,s.uFlareWidth.value=i.flareWidth,s.uGranule.value=i.granule,s.uGranuleScale.value=i.granuleScale*a.noiseFrequency,s.uGranuleSpeed.value=i.granuleSpeed*a.noiseSpeed,s.uGlow.value=i.discGlow*a.glow,s.uOpacity.value=i.discOpacity*a.opacity,s.uColorCore.value.copy(r(i.colorDisc)),s.uColorLow.value.copy(r(i.colorDiscLow)),s.uColorHalo.value.copy(r(i.colorHalo)),this.motes.setGradient(r(i.colorMoteA),r(i.colorMoteB),r(i.colorMoteC),r(i.colorMoteD)),this.motes.uniforms.uGravity.value.set(0,i.moteRise,0),this.motes.uniforms.uSizeScale.value=i.moteSize*a.particleSize*7,this.motes.uniforms.uLifeScale.value=i.moteLifetime*.5*a.particleLifetime,this.motes.uniforms.uSpeedScale.value=i.moteSpeed*a.particleSpeed,this.motes.uniforms.uOpacity.value=a.opacity,this.motes.uniforms.uGlow.value=i.discGlow*.35*a.glow,this.motes.uniforms.uTurbulence.value=i.moteTurbulence*a.turbulence,this._centrePoint(this.position),this.position.y=i.lightHeight}_dustFx(e,n){let r=c.dawnbreak,i=c.global,a=o(Math.max(.01,r.moteGraze),1,this._warm),s=Math.round(this.moteEmitter.tick(e,r.moteRate*a*n)*i.particleCount);if(s<=0)return;let u=Math.max(.1,r.zoneRadius*r.moteSpread);w.radius=r.moteJitter,w.direction=E.set(0,1,0),w.speed=r.moteSpeed,w.speedVariance=.85,w.spread=1,w.inherit=null,w.anchor=null,w.size=.09,w.sizeVariance=.7,w.life=r.moteLifetime,w.lifeVariance=.5,w.spin=0,w.tint=null,w.time=t.uTime.value;let d=Math.ceil(s/Math.min(s,C));for(;s>0;){let e=l(0,Math.PI*2),t=u*Math.sqrt(Math.random());T.copy(this._centre),T.x+=Math.cos(e)*t,T.z+=Math.sin(e)*t,T.y=l(.05,Math.max(.06,r.moteHeight)),w.position=T,this.motes.emit(Math.min(d,s),w),s-=d}}onTravel(e){let t=c.dawnbreak,n=u(this.u)**+Math.max(.05,t.reachCurve);this._sync(0,n,1),this._dustFx(e,.6)}onImpact(){let e=c.dawnbreak,t=c.global;this._sync(0,1,1),this.ctx.flash.trigger(r(e.colorFlash),e.crestFlash*t.explosionIntensity)}onFade(e,t){let n=u(t),r=t<=1?1:1-d.inOutQuad(u(t-1));this._sync(n,r,r),this._dustFx(e,r)}onDestroy(){this.sun?.release(),this.sun=null,this._warm=0,this.material.uniforms.uFade.value=0}dispose(){this.material.dispose(),super.dispose()}};export{A as DawnbreakAbility};
//# sourceMappingURL=DawnbreakAbility-DWFDo3Jn.js.map