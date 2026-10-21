import{Br as e,G as t,K as n,R as r,V as i,Y as a,at as o,di as s,g as c,h as l,o as u,ot as d,st as f,tt as p,xt as m,yn as h}from"./settings-DdywqLlV.js";import{t as g}from"./ParticleSystem-BZTczMT8.js";import{n as _}from"./ParticleEngine-DLxipNH0.js";import{n as v,t as y}from"./SceneHooks-DvEWF-72.js";import{t as b}from"./Ability-CYesB5Ur.js";import{n as x,t as S}from"./quads-DpYMEt67.js";var C=`
  uniform vec3  uCentre;
  uniform float uRadius;
  uniform float uReach;

  varying vec2 vPlane;

  void main() {
    // The shared ground quad is 1 x 1 in XZ. Measured in DISC RADII, so r = 1.0
    // is the limb wherever the radius slider puts it.
    vec2 q = vec2(position.x, position.z) * 2.0 * uReach;
    vPlane = q;

    vec3 here = uCentre + vec3(q.x, 0.0, q.y) * uRadius;
    gl_Position = projectionMatrix * viewMatrix * vec4(here, 1.0);
  }
`,w=`
  #define TAU 6.283185307179586

  uniform float uTime;
  uniform float uGlobalGlow;
  uniform float uShaderIntensity;

  uniform float uSeed;
  uniform float uFade;
  uniform float uEdge;
  uniform float uShade;
  uniform float uOpacity;

  uniform float uRim;
  uniform float uRimWidth;

  uniform float uBead;
  uniform float uBeadCount;
  uniform float uBeadSize;
  uniform float uBeadWidth;
  uniform float uBeadSpin;

  uniform vec3 uColorUmbra;
  uniform vec3 uColorLimb;
  uniform vec3 uColorBead;

  varying vec2 vPlane;

  ${a}

  void main() {
    float r = length(vPlane);

    /* --- the disc --- */
    float soft = clamp(uEdge, 0.002, 0.9);
    float body = 1.0 - smoothstep(1.0 - soft, 1.0, r);

    /* --- the limb ring, a band centred exactly on r = 1 --- */
    float band = max(uRimWidth, 1e-3);
    float ring = exp(-pow((r - 1.0) / band, 2.0));

    /* --- Baily's beads --- */
    float turn = atan(vPlane.y, vPlane.x) / TAU + 0.5 + uTime * uBeadSpin;
    float count = max(floor(uBeadCount + 0.5), 1.0);
    float cell = turn * count;
    float index = floor(cell);
    float within = cell - index;
    // Two hashes off the cell index: where in its cell the bead sits, and how
    // bright it is. Evenly spaced beads of equal brightness read as a dial.
    float place = 0.5 + (hash11(index + uSeed) - 0.5) * 0.6;
    float bright = mix(0.3, 1.0, hash11(index + 31.7 + uSeed));
    float da = abs(within - place);
    float bead = exp(-pow(da / max(uBeadSize, 1e-3), 2.0)) * bright;
    bead *= exp(-pow((r - 1.0) / max(uBeadWidth, 1e-3), 2.0));

    float lit = ring * uRim + bead * uBead;

    // uShade is how much of the picker survives: 1 keeps colorUmbra's faint
    // violet, 0 crushes the disc to absolute black. The bright marks are gained
    // by the global glow; the body deliberately is not, because a black that
    // brightens with the bloom slider is not a black.
    vec3 color = uColorUmbra * clamp(uShade, 0.0, 1.0) * body;
    float gain = uGlobalGlow * mix(0.7, 1.0, uShaderIntensity);
    color += (uColorLimb * ring * uRim + uColorBead * bead * uBead) * gain;

    // Normal blending, so alpha is coverage: the middle is opaque black and
    // genuinely removes the floor, and the bright marks sit on top of it.
    float alpha = clamp(body * uOpacity + lit * 0.85, 0.0, 1.0) * uFade;
    if (alpha < 0.003) discard;

    gl_FragColor = vec4(clamp(color, 0.0, 64.0), alpha);
  }
`;function T(){return new e({transparent:!0,depthWrite:!1,depthTest:!0,blending:1,toneMapped:!1,uniforms:n({uCentre:{value:new s},uRadius:{value:1},uReach:{value:1.4},uSeed:{value:0},uFade:{value:0},uEdge:{value:.05},uShade:{value:1},uOpacity:{value:.96},uRim:{value:1.5},uRimWidth:{value:.09},uBead:{value:0},uBeadCount:{value:9},uBeadSize:{value:.13},uBeadWidth:{value:.07},uBeadSpin:{value:.1},uColorUmbra:{value:new m(.02,.015,.04)},uColorLimb:{value:new m(.85,.78,1)},uColorBead:{value:new m(1,.96,.88)}}),vertexShader:C,fragmentShader:w})}var E=Math.PI*2,D=4,O={},k=new s,A=new s,j=class extends b{constructor(e){super(`eclipse`,e)}createShaders(){this.corona=new l({mode:c.SUNDISC,prefix:`disc`,segments:128,renderOrder:5}),this.group.add(this.corona.group),this.umbraMaterial=T(),this.umbra=new h(S(),this.umbraMaterial),this.umbra.frustumCulled=!1,this.umbra.matrixAutoUpdate=!1,this.umbra.layers.set(i.VFX),this.umbra.renderOrder=4,this.umbra.name=`Umbra`,this.group.add(this.umbra),this.grade=null,this.key=null,this._seed=0,this._contact=!1,this._flare=0,this._centre=new s,this._shell={origin:new s,axis:new s(0,1,0),side:new s(1,0,0),span:1,t:0,fade:0,seed:0}}createParticles(){let e=this.ctx.particles;this.drain=e.get(`eclipse.drain`,{capacity:1100,shape:g.SOFT,additive:!1,curl:!0,softFade:.5}),this.drain.uniforms.uDrag.value=.9,this.drain.uniforms.uEndSize.value=.35,this.drain.uniforms.uSizeIn.value=.08,this.drain.uniforms.uFadeIn.value=.14,this.drain.uniforms.uFadeOut.value=.5,this.sparks=e.get(`eclipse.sparks`,{capacity:900,shape:g.STREAK,additive:!0,stretch:!0,softFade:.3}),this.sparks.uniforms.uDrag.value=1.3,this.sparks.uniforms.uEndSize.value=.2,this.sparks.uniforms.uSizeIn.value=.03,this.sparks.uniforms.uFadeIn.value=.05,this.sparks.uniforms.uFadeOut.value=.45,this.drainEmitter=new _,this.sparkEmitter=new _}_span(e){return Math.max(.01,e*u.global.lifetime)}get impactDuration(){let e=u.eclipse;return this._span(e.openTime)+this._span(e.holdTime)}get fadeDuration(){return Math.max(.05,u.eclipse.closeTime)}get instanceCount(){return 2}lightShimmer(){return o(f(u.eclipse.lightTotality),1,this._flare)}_centrePoint(e){return this.pointAt(1,e).setY(0)}_openAmount(e){return f(Math.min(e,1)*this.impactDuration/this._span(u.eclipse.openTime))}_beadAmount(e){let t=u.eclipse,n=Math.abs(e-f(t.beadAt))/Math.max(.001,t.beadWindow),r=Math.max(0,1-n);return r*r}onSpawn(){this.drainEmitter.reset(),this.sparkEmitter.reset(),this._contact=!1,this._flare=0,this._seed=Math.random()*100,this.grade=this.borrow(v.acquire(y.GRADE,this)),this.key=this.borrow(v.acquire(y.KEY_LIGHT,this)),this._sync(0,0,0)}_sync(e,t,n){let i=u.eclipse,a=u.global;this._centrePoint(this._centre);let o=f(e);this.grade&&this.grade.saturate(i.gradeSaturation).temper(i.gradeTemper).raise(i.gradeLift).darken(i.gradeVignette).blend(o*f(i.gradeWeight)),this.key&&this.key.tint(r(i.colorCold)).brightness(i.keyDim).blend(o*f(i.keyWeight));let s=this._shell;s.origin.copy(this._centre),s.axis.set(0,1,0),s.side.copy(this.side),s.span=Math.max(.05,i.zoneRadius),s.t=f(t),s.fade=n,s.seed=this._seed,this.corona.sync(i,s);let c=Math.max(.01,this.corona.radius*i.umbraScale);this._flare=this._beadAmount(f(t))*n;let l=this.umbraMaterial.uniforms;l.uCentre.value.copy(this._centre),l.uCentre.value.y=i.umbraLift,l.uRadius.value=c,l.uReach.value=Math.max(1.02,i.umbraReach),l.uSeed.value=this._seed,l.uFade.value=n,l.uEdge.value=i.umbraEdge,l.uShade.value=i.umbraShade,l.uOpacity.value=i.umbraOpacity*a.opacity,l.uRim.value=i.rimGlow*a.glow,l.uRimWidth.value=i.rimWidth,l.uBead.value=this._flare*i.beadFlash,l.uBeadCount.value=i.beadCount,l.uBeadSize.value=i.beadSize,l.uBeadWidth.value=i.beadWidth,l.uBeadSpin.value=i.beadSpin,l.uColorUmbra.value.copy(r(i.colorUmbra)),l.uColorLimb.value.copy(r(i.colorLimb)),l.uColorBead.value.copy(r(i.colorBead)),this.drain.setGradient(r(i.colorDrainA),r(i.colorDrainB),r(i.colorDrainC),r(i.colorDrainD)),this.drain.uniforms.uGravity.value.set(0,i.drainRise,0),this.drain.uniforms.uSizeScale.value=i.drainSize*a.particleSize*7,this.drain.uniforms.uLifeScale.value=i.drainLifetime*.5*a.particleLifetime,this.drain.uniforms.uSpeedScale.value=a.particleSpeed,this.drain.uniforms.uOpacity.value=a.opacity,this.drain.uniforms.uTurbulence.value=i.drainTurbulence*a.turbulence,this.sparks.setGradient(r(i.colorSparkA),r(i.colorSparkB),r(i.colorSparkC),r(i.colorSparkD)),this.sparks.uniforms.uGravity.value.set(0,i.sparkGravity,0),this.sparks.uniforms.uSizeScale.value=i.sparkSize*a.particleSize*7,this.sparks.uniforms.uLifeScale.value=i.sparkLifetime*.5*a.particleLifetime,this.sparks.uniforms.uSpeedScale.value=a.particleSpeed,this.sparks.uniforms.uOpacity.value=a.opacity,this.sparks.uniforms.uGlow.value=i.rimGlow*a.glow,this.sparks.uniforms.uStretch.value=i.sparkStretch,this.position.copy(this._centre),this.position.y=i.lightHeight}_drainFx(e,n){let r=u.eclipse,i=u.global,a=Math.round(this.drainEmitter.tick(e,r.drainRate*n)*i.particleCount);if(a<=0)return;let o=Math.max(.2,r.zoneRadius*r.drainRadius);O.radius=r.drainJitter,O.speed=r.drainSpeed,O.speedVariance=.5,O.spread=.22,O.inherit=null,O.anchor=null,O.size=.1,O.sizeVariance=.6,O.life=r.drainLifetime,O.lifeVariance=.4,O.spin=0,O.tint=null,O.time=t.uTime.value;let s=Math.ceil(a/Math.min(a,D));for(;a>0;){let e=d(0,E),t=Math.cos(e),n=Math.sin(e);k.set(this._centre.x+t*o,d(.05,Math.max(.06,r.drainHeight)),this._centre.z+n*o),O.position=k,O.direction=A.set(-t,0,-n).normalize(),this.drain.emit(Math.min(s,a),O),a-=s}}_sparkFx(e,n){if(e<=0)return;let r=u.eclipse,i=Math.max(.01,this.corona.radius*r.umbraScale);O.radius=i*.06,O.speed=r.sparkSpeed*n,O.speedVariance=.7,O.spread=.55,O.inherit=null,O.anchor=null,O.size=.16,O.sizeVariance=.7,O.life=r.sparkLifetime,O.lifeVariance=.5,O.spin=0,O.tint=null,O.time=t.uTime.value;let a=Math.ceil(e/Math.min(e,D)),o=e;for(;o>0;){let e=d(0,E),t=Math.cos(e),n=Math.sin(e);k.set(this._centre.x+t*i,r.umbraLift+i*.04,this._centre.z+n*i),O.position=k,O.direction=A.set(t,.55,n).normalize(),this.sparks.emit(Math.min(a,o),O),o-=a}}onTravel(e){let t=u.eclipse,n=f(this.u)**+Math.max(.05,t.wrongCurve)*f(t.anticipateWeight);this._sync(n,0,0),this._drainFx(e,n)}onImpact(){this._sync(u.eclipse.anticipateWeight,0,0)}onFade(e,t){let n=u.eclipse,i=u.global,a=this._openAmount(t),s=t<=1?1:1-p.inOutQuad(f(t-1)),c=o(f(n.anticipateWeight),1,a)*s;this._sync(c,a,s),!this._contact&&a>=f(n.beadAt)&&(this._contact=!0,this._sparkFx(Math.round(n.sparkBurst*i.particleCount),1.6),this.ctx.flash.trigger(r(n.colorFlash),n.contactFlash*i.explosionIntensity),this.lightBoost=n.lightIntensity*.9*i.explosionIntensity),this._sparkFx(Math.round(this.sparkEmitter.tick(e,n.sparkRate*a*s)*i.particleCount),1),this._drainFx(e,c*.45)}onDestroy(){this.grade?.release(),this.key?.release(),this.grade=null,this.key=null,this._contact=!1,this._flare=0,this.umbraMaterial.uniforms.uFade.value=0,this.corona.material.uniforms.uFade.value=0}dispose(){this.corona.dispose(),this.umbraMaterial.dispose(),x(),super.dispose()}};export{j as EclipseAbility};
//# sourceMappingURL=EclipseAbility-Bb83qTUh.js.map