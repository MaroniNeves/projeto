import{Br as e,G as t,K as n,R as r,Ut as i,V as a,Y as o,di as s,it as c,o as l,q as u,st as d,tt as f,vt as p,y as m}from"./settings-DdywqLlV.js";import{t as h}from"./ParticleSystem-BZTczMT8.js";import{n as g}from"./ParticleEngine-DLxipNH0.js";import{n as _,t as v}from"./Ability-CYesB5Ur.js";import{n as y,r as b,t as x}from"./GroundField-aLIZg3d3.js";import{i as S,n as C,r as w,t as T}from"./Projectile-DQ3a3PJ-.js";var E=40,D=16,O=5,k={},A=new s,j=new s,M=new s,N=new s,P=S(),F=b();function I(){let e=O,t=[[-1,0],[-.55,.42],[.1,1],[.45,.78],[1,0]],n=[];for(let t=0;t<e;t++){let r=(c(t*7.31+3.7)-.5)*(Math.PI*2/e)*.4;n.push(t/e*Math.PI*2+r)}let r=t.map(([e,t],r)=>n.map((n,i)=>{let a=t*(1+(c(r*13.9+i*5.1)-.5)*.22);return[Math.cos(n)*a,e,Math.sin(n)*a]})),a=[],o=e=>a.push(e[0],e[1],e[2]);for(let t=0;t<r.length-1;t++){let n=r[t],i=r[t+1];for(let t=0;t<e;t++){let r=(t+1)%e;o(n[t]),o(n[r]),o(i[t]),o(n[r]),o(i[r]),o(i[t])}}let s=new p;return s.setAttribute(`position`,new i(a,3)),s.computeVertexNormals(),s}var L=`
  attribute float aSeed;
  attribute float aFlight;
  attribute float aFlash;

  varying float vSeed;
  varying float vFlight;
  varying float vFlash;
  varying vec3  vLocal;
  varying vec3  vNormalW;
  varying vec3  vViewDir;

  void main() {
    vSeed = aSeed;
    vFlight = aFlight;
    vFlash = aFlash;
    vLocal = position;

    mat4 im = mat4(1.0);
    #ifdef USE_INSTANCING
      im = instanceMatrix;
    #endif

    // The body is scaled (r, r * stretch, r), which is anisotropic: pushing a
    // normal straight through the instance matrix tips every one of them toward
    // the long axis and the whole star lights as though it were a rod. Dividing
    // by the squared column lengths is the inverse-transpose three itself uses.
    mat3 rot = mat3(im);
    vec3 sq = vec3(dot(rot[0], rot[0]), dot(rot[1], rot[1]), dot(rot[2], rot[2]));
    vec3 objectNormal = rot * (normal / max(sq, vec3(1e-6)));

    vec4 world = modelMatrix * im * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * objectNormal);
    vViewDir = cameraPosition - world.xyz;

    gl_Position = projectionMatrix * viewMatrix * world;
  }
`,R=`
  uniform vec3  uColorCore;
  uniform vec3  uColorEdge;
  uniform vec3  uColorDeep;
  uniform float uGlow;
  uniform float uOpacity;
  uniform float uRim;
  uniform float uHeat;
  uniform float uFacet;
  uniform float uFacetScale;
  uniform float uGlobalGlow;
  uniform float uShaderIntensity;

  varying float vSeed;
  varying float vFlight;
  varying float vFlash;
  varying vec3  vLocal;
  varying vec3  vNormalW;
  varying vec3  vViewDir;

  ${o}
  ${u}

  void main() {
    float fres = fresnelTerm(vViewDir, vNormalW, uRim, 1.0);

    // The facet grain is sampled in the body's OWN space, not the world's.
    // A world-space sample was the first thing tried and it is wrong for a
    // reason worth writing down: a star crosses forty metres in half a second,
    // so a world-space field slides across it far faster than the body moves
    // and the grain reads as noise on the lens rather than as facets on the
    // object. Local space nails the pattern to the star; the seed keeps two
    // stars from wearing the same one.
    float grain = snoise(vec3(vLocal * uFacetScale + vSeed * 37.0)) * 0.5 + 0.5;
    float facet = mix(1.0, grain, clamp(uFacet, 0.0, 1.0));

    // A star brightens as it comes down: the flight parameter is the only clock
    // in here and it runs 0 at the vanishing point to 1 at the floor.
    float heat = uHeat * pow(clamp(vFlight, 0.0, 1.0), 2.5) + vFlash * 2.0;

    vec3 body = mix(uColorDeep, uColorEdge, facet);
    vec3 color = mix(body, uColorCore, clamp(fres * 0.8 + heat * 0.35, 0.0, 1.0));
    color *= uGlow * uGlobalGlow * uShaderIntensity * (1.0 + heat);

    float alpha = clamp(uOpacity * (0.45 + 0.55 * fres + heat * 0.25), 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
  }
`;function z(){return new e({transparent:!0,depthWrite:!1,depthTest:!0,blending:2,side:2,toneMapped:!1,uniforms:n({uColorCore:{value:r(`#ffffff`).clone()},uColorEdge:{value:r(`#c0d8ff`).clone()},uColorDeep:{value:r(`#3a5fd0`).clone()},uGlow:{value:2.6},uOpacity:{value:1},uRim:{value:2.2},uHeat:{value:1.6},uFacet:{value:.55},uFacetScale:{value:9}}),vertexShader:L,fragmentShader:R})}var B=class extends v{constructor(e){super(`starfall`,e)}createShaders(){this.starMaterial=z(),this.stars=new C(this.group,{geometry:I,material:this.starMaterial,capacity:E,trail:!0,trailNodes:32,trailAdditive:!0,layer:a.VFX,renderOrder:12}),this.floor=new x(this.group,{mode:y.POCK,marks:D,additive:!0,depthTest:!0,name:`Starfall:floor`}),F.centre=M,this._seed=0,this._struck=!1,this._live=0}createParticles(){let e=this.ctx.particles;this.sparks=e.get(`starfall.sparks`,{capacity:1400,shape:h.STREAK,additive:!0,stretch:!0,softFade:.25}),this.sparks.uniforms.uDrag.value=1.3,this.sparks.uniforms.uEndSize.value=.2,this.sparks.uniforms.uSizeIn.value=.02,this.sparks.uniforms.uFadeIn.value=.03,this.sparks.uniforms.uFadeOut.value=.45,this.motes=e.get(`starfall.motes`,{capacity:1400,shape:h.SOFT,additive:!0,curl:!0,softFade:.4}),this.motes.uniforms.uDrag.value=1.5,this.motes.uniforms.uEndSize.value=.18,this.motes.uniforms.uSizeIn.value=.05,this.motes.uniforms.uFadeIn.value=.07,this.motes.uniforms.uFadeOut.value=.42,this.dust=e.get(`starfall.dust`,{capacity:900,shape:h.SMOKE,additive:!1,curl:!0,softFade:1}),this.dust.uniforms.uDrag.value=2,this.dust.uniforms.uEndSize.value=2.6,this.dust.uniforms.uSizeIn.value=.12,this.dust.uniforms.uFadeIn.value=.18,this.dust.uniforms.uFadeOut.value=.34,this.sparkleEmitter=new g}get instanceCount(){return this._live}get impactDuration(){return Math.max(.05,l.starfall.lifetime*l.global.lifetime)}get fadeDuration(){return Math.max(.05,l.starfall.fadeTime)}lightShimmer(){let e=l.starfall,t=Math.max(.05,e.lightTwinkleSpeed),n=Math.sin(this.age*t*2.399)*Math.sin(this.age*t*1.111);return 1-d(e.lightTwinkle)*.5*(1-n)}_zoneCentre(e){return this.pointAt(1,e)}_handPoint(e){let t=l.starfall;return e.copy(this.origin).addScaledVector(this.direction,t.callForward),e.y=t.callHeight,e}_yaw(){return Math.atan2(this.direction.x,this.direction.z)}onSpawn(){this.sparkleEmitter.reset(),this.floor.clearMarks(),this._struck=!1,this._live=0,this._seed=Math.random()*100,this.stars.roll(this._seed),this._sync(1),this._callFx()}_fillFlight(e){let t=l.starfall,n=l.global,r=P,i=Math.max(.05,n.speed);return r.mode=T.FALL,r.stagger=w.HASH,r.count=Math.max(0,Math.min(E,Math.round(t.stars))),r.radius=t.starSize,r.sizeJitter=t.starSizeJitter,r.stretch=t.starStretch,r.align=t.starAlign,r.spin=t.starSpin,r.flash=t.starFlash,r.handForward=t.callForward,r.handSide=0,r.handHeight=t.callHeight,r.fanWidth=0,r.skyBack=t.skyBack,r.skyHeight=t.skyHeight,r.skyScatter=t.skyScatter,r.landHeight=t.spreadHeight,r.spreadSide=0,r.spreadForward=0,r.landInZone=!0,r.zoneRadius=t.zoneRadius,r.zoneBias=t.zoneBias,r.pathCurve=t.fallCurve,r.apex=0,r.apexCurve=1,r.weaveSide=0,r.weaveUp=0,r.weaveTurns=1,r.weaveTurnsUp=1,r.weavePhase=0,r.weaveDecay=1,r.flightTime=Math.max(.02,t.fallTime/i),r.speedJitter=t.fallJitter,r.lead=Math.max(0,t.starLead/i),r.window=Math.max(.01,t.starWindow/i),r.fillBias=t.fillBias,r.fillScatter=t.fillScatter,r.hashCell=t.hashCell,r.linger=0,r.sink=0,r.load=0,r.trailSpan=t.trailSpan,r.trailBurn=t.trailBurn,r.trailWidth=t.trailWidth,r.trailTaper=t.trailTaper,r.trailLift=t.trailLift,r.trailOpacity=t.trailOpacity*e*n.opacity,r.trailGlow=t.trailGlow*n.glow,r.trailCore=t.trailCore,r.trailHeadBias=t.trailHeadBias,r.trailNoise=t.trailNoise*n.noiseStrength,r.trailNoiseScale=t.trailNoiseScale*n.noiseFrequency,r.trailNoiseSpeed=t.trailNoiseSpeed*n.noiseSpeed,r.trailSoftFade=t.trailSoftFade,r}_fillGround(e){let t=l.starfall,n=l.global,r=F;return r.centre=M,r.yaw=this._yaw(),r.height=t.fieldHeight,r.radius=t.zoneRadius,r.length=t.zoneRadius*2,r.grow=this.phase===_.TRAVEL?d(this.u):1,r.recede=0,r.progress=1,r.inscribe=1,r.ignite=0,r.fade=e,r.seed=this._seed,r.edge=t.fieldEdge,r.ragged=t.fieldRagged,r.raggedScale=t.fieldRaggedScale,r.warp=t.fieldWarp,r.relief=t.fieldRelief,r.normalStep=.05,r.ambient=.3,r.wrap=.45,r.specular=t.fieldSpecular,r.gloss=t.fieldGloss,r.parallax=.2,r.cell=.5,r.cellJitter=.8,r.seam=.05,r.thickness=t.ringThickness,r.lift=t.ringRim,r.depth=t.ringDepth,r.width=.5,r.sharp=.5,r.detail=t.ringDetail,r.swirl=0,r.arms=5,r.speed=t.ringDig,r.flow=0,r.windAngle=0,r.markLife=t.ringLife,r.markRadius=t.ringRadius,r.additive=!0,r.emissive=t.fieldEmissive*n.glow,r.opacity=t.fieldOpacity,r.depthFade=.4,r.colorBase=t.colorFieldBase,r.colorEdge=t.colorFieldEdge,r.colorGlow=t.colorFieldGlow,r.colorDeep=t.colorFieldDeep,r.noiseStrength=n.noiseStrength,r.noiseFrequency=n.noiseFrequency,r.noiseSpeed=n.noiseSpeed,r.opacityScale=n.opacity,r}_syncLook(e){let t=l.starfall,n=l.global,i=this.starMaterial.uniforms;i.uColorCore.value.copy(r(t.colorStarCore)),i.uColorEdge.value.copy(r(t.colorStarEdge)),i.uColorDeep.value.copy(r(t.colorStarDeep)),i.uGlow.value=t.starGlow*n.glow,i.uOpacity.value=t.starOpacity*e*n.opacity,i.uRim.value=Math.max(.05,t.starRim),i.uHeat.value=t.starHeat,i.uFacet.value=t.starFacet,i.uFacetScale.value=t.starFacets,this.stars.setTrailColors(t.colorTrailA,t.colorTrailB,t.colorTrailC,t.colorTrailD),this.sparks.setGradient(r(t.colorSparkA),r(t.colorSparkB),r(t.colorSparkC),r(t.colorSparkD)),this.sparks.uniforms.uGravity.value.set(0,t.sparkGravity,0),this.sparks.uniforms.uSizeScale.value=t.sparkSize*n.particleSize*7,this.sparks.uniforms.uLifeScale.value=t.sparkLifetime*.5*n.particleLifetime,this.sparks.uniforms.uSpeedScale.value=n.particleSpeed,this.sparks.uniforms.uOpacity.value=n.opacity,this.sparks.uniforms.uGlow.value=t.starGlow*.5*n.glow,this.sparks.uniforms.uStretch.value=t.sparkStretch,this.sparks.uniforms.uTurbulence.value=.2*n.turbulence,this.motes.setGradient(r(t.colorMoteA),r(t.colorMoteB),r(t.colorMoteC),r(t.colorMoteD)),this.motes.uniforms.uGravity.value.set(0,t.moteRise,0),this.motes.uniforms.uSizeScale.value=t.moteSize*n.particleSize*7,this.motes.uniforms.uLifeScale.value=t.moteLifetime*.5*n.particleLifetime,this.motes.uniforms.uSpeedScale.value=n.particleSpeed,this.motes.uniforms.uOpacity.value=n.opacity,this.motes.uniforms.uGlow.value=.9*n.glow,this.motes.uniforms.uTurbulence.value=t.moteTurbulence*n.turbulence,this.dust.setGradient(r(t.colorDustA),r(t.colorDustB),r(t.colorDustC),r(t.colorDustD)),this.dust.uniforms.uGravity.value.set(0,t.dustRise,0),this.dust.uniforms.uSizeScale.value=t.dustSize*n.particleSize,this.dust.uniforms.uLifeScale.value=t.dustLifetime*.5*n.particleLifetime,this.dust.uniforms.uSpeedScale.value=t.dustSpeed*n.particleSpeed,this.dust.uniforms.uOpacity.value=t.dustOpacity*n.opacity,this.dust.uniforms.uTurbulence.value=.3*n.turbulence}_sync(e){let t=l.starfall;this._zoneCentre(M),this._syncLook(e),this.stars.setBasis(this.origin,this.direction,this.side,this.length),this.stars.update(this.age,this._fillFlight(e)),this._live=this.stars.count;for(let e=0;e<this.stars.arrivalCount;e++)this._starImpact(this.stars.arrivals[e]);this.floor.update(this._fillGround(e)),this._struck||(this.position.copy(M),this.position.y=Math.min(2,t.zoneRadius*.35))}_callFx(){let e=l.starfall,n=l.global;this._handPoint(N),this.ctx.bursts.spawn(m.AIR,N,{radius:e.callSize*.25,endRadius:e.callSize*n.explosionIntensity,life:.4,intensity:e.callIntensity,opacity:.85,fresnel:1.7,displace:.4,colorA:r(e.colorCallA),colorB:r(e.colorCallB),colorC:r(e.colorCallC)}),k.position=N,k.radius=.16,k.direction=j.set(0,1,0),k.speed=e.moteSpeed*2.2,k.speedVariance=.8,k.spread=.9,k.inherit=null,k.anchor=null,k.size=.09,k.sizeVariance=.6,k.life=e.moteLifetime,k.lifeVariance=.5,k.spin=0,k.tint=null,k.time=t.uTime.value,this.motes.emit(Math.round(26*n.particleCount),k),this.ctx.flash.trigger(r(e.colorCastFlash),e.castFlash*n.explosionIntensity)}_starImpact(e){let n=l.starfall,i=l.global,a=t.uTime.value;this.stars.landPoint(e,A);let o=this._yaw(),s=Math.cos(o),u=Math.sin(o),d=A.x-M.x,f=A.z-M.z,p=Math.max(.05,n.zoneRadius),h=.7+.3*c(this._seed+e*3.77);this.floor.mark((s*d-u*f)/p,(u*d+s*f)/p,a,h),this.ctx.bursts.spawn(m.AIR,A,{radius:n.shellSize*.2,endRadius:n.shellSize*i.explosionIntensity,life:Math.max(.05,n.shellLife),intensity:n.shellIntensity,opacity:.8,fresnel:1.8,displace:.35,squash:.72,colorA:r(n.colorShellA),colorB:r(n.colorShellB),colorC:r(n.colorShellC)}),k.position=A,k.radius=.1,k.direction=j.set(0,1,0),k.speed=n.sparkSpeed,k.speedVariance=.85,k.spread=.95,k.inherit=null,k.anchor=null,k.size=.16,k.sizeVariance=.7,k.life=n.sparkLifetime,k.lifeVariance=.5,k.spin=0,k.tint=null,k.time=a,this.sparks.emit(Math.round(n.sparkBurst*i.particleCount),k),k.radius=.24,k.speed=n.moteSpeed,k.spread=1,k.size=.09,k.life=n.moteLifetime,k.spin=0,this.motes.emit(Math.round(n.moteBurst*i.particleCount),k),k.radius=n.ringRadius*.8,k.speed=n.dustSpeed,k.spread=.85,k.size=.7,k.life=n.dustLifetime,k.spin=.35,this.dust.emit(Math.round(n.dustBurst*i.particleCount),k),this.position.copy(A),this.lightBoost=Math.min(60,this.lightBoost+n.lightPunch*i.explosionIntensity),this.ctx.shake.add(n.impactShake*i.explosionIntensity*i.cameraShake,1/Math.max(.05,n.shakeDuration),24),this._struck||(this._struck=!0,this.ctx.flash.trigger(r(n.colorFlash),n.impactFlash*i.explosionIntensity))}_sparkleFx(e){let n=l.starfall,r=l.global;if(this._live<=0)return;let i=n.sparkleRate*this._live,a=Math.round(this.sparkleEmitter.tick(e,i)*r.particleCount);if(!(a<=0)){k.direction=j.set(0,1,0),k.speed=n.moteSpeed*.4,k.speedVariance=.9,k.spread=1,k.inherit=null,k.anchor=null,k.size=.06,k.sizeVariance=.7,k.life=n.moteLifetime*.7,k.lifeVariance=.6,k.spin=0,k.tint=null,k.time=t.uTime.value;for(let e=0;e<a;e++){let e=Math.floor(Math.random()*this._live);this.stars.slotPosition(e,A),k.position=A,k.radius=n.starSize*1.4,this.motes.emit(1,k)}}}onTravel(e){this._sync(1),this._sparkleFx(e),this.ctx.shake.rumble(l.starfall.rumble*l.global.cameraShake*.4,e)}onImpact(){}onFade(e,t){let n=t<=1?1:1-f.inCubic(d(t-1));this._sync(n),this._sparkleFx(e),this.ctx.shake.rumble(l.starfall.rumble*l.global.cameraShake*+(t<=1),e)}onDestroy(){this.stars.reset(),this.floor.clearMarks(),this._live=0,this._struck=!1}dispose(){this.stars.dispose(),this.floor.dispose(),this.starMaterial.dispose(),super.dispose()}};export{B as StarfallAbility};
//# sourceMappingURL=StarfallAbility-DHBQyN40.js.map