import{G as e,R as t,Tn as n,Ut as r,V as i,Y as a,at as o,ct as s,di as c,it as l,o as u,st as d,tt as f,vt as p,xt as m,y as h}from"./settings-DdywqLlV.js";import{t as g}from"./ParticleSystem-BZTczMT8.js";import{n as _}from"./ParticleEngine-DLxipNH0.js";import{n as v,t as y}from"./Ability-CYesB5Ur.js";import{n as b,r as x,t as S}from"./GroundField-aLIZg3d3.js";import{a as C,i as w,n as T,r as E,t as D}from"./GrowthField-BxvnSH9l.js";var O=Math.PI*2;function k(e,t){let n=Math.exp(-((e/.1)**2))*Math.max(0,t.headSwell-t.neck),r=t.neck+(t.shaft-t.neck)*s(.06,.34,e),i=(1-d((e-.34)/.66))**.75,a=t.taper+(r-t.taper)*(e<=.34?1:i),o=t.knuckle*Math.exp(-(((e-.8)/.07)**2));return Math.max(.02,a+n+o)*.5}function A(e=0,t={}){let n={sides:Math.max(4,Math.round(t.ribSides??7)),rings:Math.max(5,Math.round(t.ribRings??12)),flatten:d(t.ribFlatten??.44),twist:t.ribTwist??.18,groove:d(t.ribGroove??.3),headSwell:t.ribHead??1.05,neck:t.ribNeck??.52,shaft:t.ribShaft??.7,taper:t.ribTaper??.1,knuckle:t.ribKnuckle??.2,warp:t.ribWarp??.28},i=3.17+e*11.9,a=l(i*1.7)*O,c=1+(l(i*2.3)-.5)*.22,u=d(n.flatten*(1+(l(i*3.9)-.5)*.4)),f=[],m=[];for(let e=0;e<n.rings;e++){let t=e/(n.rings-1),r=Math.min(.985,t-Math.sin(t*O)*.09),d=a+n.twist*r*O,p=k(r,n)*o(1,c,r);for(let t=0;t<n.sides;t++){let a=t/n.sides*O+d,o=Math.cos(a),c=Math.sin(a),m=n.groove*Math.max(0,-c)**3*s(.22,.4,r)*s(.95,.78,r),h=1+(l(i*7.3+e*13.1+t*3.7)-.5)*n.warp*(.3+.7*r),g=p*h*(1-m),_=p*h*(1-u)*(1-m);f.push(o*g,r,c*_)}}for(let e=0;e<n.rings-1;e++)for(let t=0;t<n.sides;t++){let r=(t+1)%n.sides,i=e*n.sides+t,a=e*n.sides+r,o=(e+1)*n.sides+t,s=(e+1)*n.sides+r;m.push(i,a,o,a,s,o)}let h=f.length/3;f.push(0,1,0);let g=(n.rings-1)*n.sides;for(let e=0;e<n.sides;e++){let t=(e+1)%n.sides;m.push(g+e,g+t,h)}let _=f.length/3;f.push(0,0,0);for(let e=0;e<n.sides;e++){let t=(e+1)%n.sides;m.push(_,t,e)}let v=new p;return v.setAttribute(`position`,new r(f,3)),v.setIndex(m),v.computeVertexNormals(),v}function j(r){let i=new n({color:16777215,roughness:.94,metalness:0,flatShading:!1,side:0,transparent:!0,depthWrite:!0}),o={uLightDir:e.uLightDir,uColorBone:{value:new m},uColorShade:{value:new m},uColorMarrow:{value:new m},uColorStain:{value:new m},uColorGrime:{value:new m},uGrain:{value:.35},uGrainScale:{value:6.5},uGrainBands:{value:2.2},uPit:{value:.45},uPitScale:{value:24},uPitCut:{value:.55},uChalk:{value:.55},uChalkPower:{value:2.6},uRough:{value:.94},uRoughPit:{value:.4},uSss:{value:.9},uSssPower:{value:3.2},uSssDistort:{value:.35},uSssAmbient:{value:.18},uSssCeiling:{value:.5},uThinBase:{value:.15},uThinEdge:{value:.65},uStain:{value:.7},uStainHeight:{value:.26},uGrime:{value:.85},uWither:{value:0}};return C(i,{environment:r,uniforms:o,common:`
         uniform vec3  uLightDir;
         uniform vec3  uColorBone;
         uniform vec3  uColorShade;
         uniform vec3  uColorMarrow;
         uniform vec3  uColorStain;
         uniform vec3  uColorGrime;
         uniform float uGrain;
         uniform float uGrainScale;
         uniform float uGrainBands;
         uniform float uPit;
         uniform float uPitScale;
         uniform float uPitCut;
         uniform float uChalk;
         uniform float uChalkPower;
         uniform float uRough;
         uniform float uRoughPit;
         uniform float uSss;
         uniform float uSssPower;
         uniform float uSssDistort;
         uniform float uSssAmbient;
         uniform float uSssCeiling;
         uniform float uThinBase;
         uniform float uThinEdge;
         uniform float uStain;
         uniform float uStainHeight;
         uniform float uGrime;
         uniform float uWither;
         ${a}

         /**
          * Trabecular porosity: the open cells inside the bone, read at the
          * surface as pitting. Sampled in WORLD space on purpose, so two ribs
          * standing next to each other look like they came out of one animal
          * rather than out of one lathe. 0 on solid cortex, 1 in a pit.
          */
         float bonePit(vec3 worldPos) {
           float cells = snoise01(worldPos * uPitScale);
           return smoothstep(uPitCut, 1.0, cells);
         }`,fragment:`
           float up = clamp(vGrowLocal.y, 0.0, 1.0);
           float pit = bonePit(vGrowWorld);

           // Haversian grain: runs UP the bone, so it is sampled in local space
           // with the along-frequency well above the around-frequency. Sampling
           // it in world space gives a rock, which is the same mistake
           // VineBarkMaterial documents and the same fix.
           float grain = fbm3(vec3(vGrowLocal.xz * uGrainBands, up * uGrainScale)) * 0.5 + 0.5;

           vec3 body = uColorBone;
           body = mix(body, uColorShade, grain * uGrain);
           body = mix(body, uColorShade, pit * uPit);
           // Earth staining where it came out of the floor, and never above
           // uStainHeight — a bone stained end to end reads as painted.
           body = mix(body, uColorStain, smoothstep(uStainHeight, 0.0, up) * uStain);

           /* --- the anti-fresnel: chalk gets LIGHTER at grazing incidence --- */
           vec3 V = normalize(vViewPosition);
           float facing = abs(dot(normalize(normal), V));
           float grazing = pow(1.0 - facing, max(uChalkPower, 0.1));
           body *= 1.0 + uChalk * grazing;

           /* --- the dirty birth: bright is a glow, so this one goes dark --- */
           float fresh = clamp(vGrowBirth, 0.0, 1.0);
           body = mix(body, uColorGrime, fresh * clamp(uGrime, 0.0, 1.0));

           diffuseColor.rgb *= body;

           /* --- warm subsurface scatter, and its hard ceiling --- */
           // The key direction has to come into view space to sit alongside
           // normal and vViewPosition; doing it here rather than carrying a
           // varying costs one mat3 multiply on a material that is already
           // paying for a standard BRDF.
           vec3 Lv = normalize((viewMatrix * vec4(uLightDir, 0.0)).xyz);
           vec3 leak = normalize(Lv + normalize(normal) * uSssDistort);
           float back = pow(clamp(dot(V, -leak), 0.0, 1.0), max(uSssPower, 0.1));

           // Thickness: thin at the tip, thin on the silhouette, thin wherever
           // the trabecular field says the interior is open.
           float thin = mix(uThinBase, 1.0, up * up);
           thin = mix(thin, 1.0, (1.0 - facing) * uThinEdge);
           thin = clamp(thin * (0.75 + 0.5 * pit), 0.0, 1.0);

           vec3 scatter = uColorMarrow * ((back + uSssAmbient) * thin * uSss);
           // Bone is lit; bone does not glow. This clamp is the anti-glow
           // contract for the slot and it is deliberately below the bloom
           // threshold rather than near it.
           scatter = min(scatter, vec3(max(uSssCeiling, 0.0)));
           scatter *= 1.0 - clamp(uWither, 0.0, 1.0);

           totalEmissiveRadiance += scatter;

           /* --- chalky micro-roughness, written one statement early --- */
           // See the note above patchGrowthMaterial: <lights_physical_fragment>
           // reads roughnessFactor and it comes after this injection point.
           // The pits have to be rougher than the cortex around them or the
           // whole surface reads as one uniform matte, which is plaster.
           roughnessFactor = clamp(uRough + pit * uRoughPit, 0.04, 1.0);
    `}),i.userData.uniforms=Object.assign(i.userData.uniforms??{},o),i.userData.sync=()=>{let e=u.bonecage,n=u.global;o.uColorBone.value.copy(t(e.colorBone)),o.uColorShade.value.copy(t(e.colorBoneShade)),o.uColorMarrow.value.copy(t(e.colorMarrow)),o.uColorStain.value.copy(t(e.colorStain)),o.uColorGrime.value.copy(t(e.colorGrime)),o.uGrain.value=e.boneGrain*n.shaderIntensity,o.uGrainScale.value=e.boneGrainScale*n.noiseFrequency,o.uGrainBands.value=e.boneGrainBands*n.noiseFrequency,o.uPit.value=e.bonePit*n.shaderIntensity,o.uPitScale.value=e.bonePitScale*n.noiseFrequency,o.uPitCut.value=e.bonePitCut,o.uChalk.value=e.boneChalk*n.shaderIntensity,o.uChalkPower.value=e.boneChalkPower,o.uRough.value=e.boneRoughness,o.uRoughPit.value=e.boneRoughnessPit,o.uSss.value=e.sssStrength*n.glow,o.uSssPower.value=e.sssPower,o.uSssDistort.value=e.sssDistort,o.uSssAmbient.value=e.sssAmbient,o.uSssCeiling.value=e.sssCeiling,o.uThinBase.value=e.sssThinBase,o.uThinEdge.value=e.sssThinEdge,o.uStain.value=e.stainAmount,o.uStainHeight.value=e.stainHeight,o.uGrime.value=e.grimeAmount,i.roughness=e.boneRoughness,i.envMapIntensity=e.boneEnv},i.userData.setWither=e=>{o.uWither.value=d(e)},i.userData.sync(),i}var M=Math.PI*2,N={},P=new c,F=new c,I=new c,L=class extends y{constructor(e){super(`bonecage`,e)}createShaders(){this.boneMaterial=j(this.ctx.environment),this._shape={ribSides:7,ribRings:12,ribFlatten:.44,ribTwist:.18,ribGroove:.3,ribHead:1.05,ribNeck:.52,ribShaft:.7,ribTaper:.1,ribKnuckle:.2,ribWarp:.28},this.ribs=new T(this.group,{geometry:A,material:this.boneMaterial,shape:this._shape,variants:3,capacity:288,layer:i.WORLD,renderOrder:2,castShadow:!0,receiveShadow:!0}),this.ribParams=w(),this.ribParams.layout=E.ZONE,this.ribParams.emerge=D.PUSH,this.ribParams.centre=new c,this.ribParams.origin=new c,this.ribParams.direction=new c(0,0,1),this.ribParams.side=new c(1,0,0),this.floor=new S(this.group,{mode:b.POCK,marks:16,additive:!1,depthTest:!0,layer:i.VFX,renderOrder:6,name:`BonecageFloor`}),this.floorParams=x(),this.floorParams.centre=new c,this._centre=new c,this._riseTime=0,this._seed=0,this.ribs.onBreach=(e,t,n,r)=>this._onBreach(t,n,r)}createParticles(){let e=this.ctx.particles;this.grit=e.get(`bonecage.grit`,{capacity:1200,shape:g.CHIP,additive:!1,lit:!0,softFade:.25}),this.grit.uniforms.uDrag.value=.3,this.grit.uniforms.uEndSize.value=.7,this.grit.uniforms.uFadeOut.value=.65,this.dust=e.get(`bonecage.dust`,{capacity:1100,shape:g.SMOKE,additive:!1,curl:!0,softFade:1.1}),this.dust.uniforms.uDrag.value=2.2,this.dust.uniforms.uEndSize.value=2.6,this.dust.uniforms.uSizeIn.value=.16,this.dust.uniforms.uFadeIn.value=.2,this.dust.uniforms.uFadeOut.value=.35,this.dustEmitter=new _}get instanceCount(){return this.ribs.count}get impactDuration(){let e=u.bonecage;return Math.max(.2,(e.raiseTime+e.closeTime+e.holdTime)*u.global.lifetime)}get fadeDuration(){return Math.max(.2,u.bonecage.crumbleTime)}get radius(){return Math.max(.1,u.bonecage.zoneRadius)}lightShimmer(){let e=u.bonecage;return 1-d(e.lightSmother)*this._closure()}_centrePoint(e){return this.pointAt(1,e).setY(0)}_handPoint(e){let t=u.bonecage;return e.copy(this.origin).addScaledVector(this.direction,t.handForward).addScaledVector(this.side,t.handSide),e.y=t.handHeight,e}_raise(){return this.phase===v.TRAVEL?0:d(this._riseTime/Math.max(.05,u.bonecage.raiseTime))}_closure(){if(this.phase===v.TRAVEL)return 0;let e=u.bonecage;return f.outCubic(d((this._riseTime-e.raiseTime)/Math.max(.05,e.closeTime)))}onSpawn(){this.dustEmitter.reset(),this._riseTime=0,this._seed=Math.random()*100,this.ribs.clear(),this.ribs.plant(Math.round(u.bonecage.ribCount),0),this.floor.clearMarks(),this.floor.setVisible(!1),this.boneMaterial.userData.setWither(0),this._sync(0),this._muzzleFx()}_onBreach(t,n,r){let i=u.bonecage,a=u.global,o=this.radius;this.floor.mark((t.x-this._centre.x)/o,(t.z-this._centre.z)/o,this.age,d(.4+n/Math.max(.05,i.ribGirth)*.6));let s=Math.round(i.breachGrit*a.particleCount);s>0&&(N.position=P.copy(t).setY(.05),N.radius=n*1.6,N.direction=F.set(0,1,0),N.speed=i.gritSpeed,N.speedVariance=.8,N.spread=.85,N.inherit=null,N.anchor=null,N.size=.1,N.sizeVariance=.7,N.life=i.gritLifetime,N.lifeVariance=.5,N.spin=9,N.tint=null,N.time=e.uTime.value,this.grit.emit(s,N));let c=Math.round(i.breachDust*a.particleCount*d(r/Math.max(.1,i.ribLength)));c>0&&(N.position=P.copy(t).setY(.08),N.radius=n*2.2,N.direction=F.set(0,1,0),N.speed=i.dustSpeed,N.speedVariance=.6,N.spread=.9,N.size=.55,N.sizeVariance=.5,N.life=i.dustLifetime,N.lifeVariance=.4,N.spin=.3,N.time=e.uTime.value,this.dust.emit(c,N))}_sync(e){let n=u.bonecage,r=u.global,i=this.radius,a=this._closure();this._centrePoint(this._centre);let o=this._shape;o.ribSides=Math.max(4,Math.round(n.ribSides)),o.ribRings=Math.max(5,Math.round(n.ribRings)),o.ribFlatten=n.ribFlatten,o.ribTwist=n.ribTwist,o.ribGroove=n.ribGroove,o.ribHead=n.ribHead,o.ribNeck=n.ribNeck,o.ribShaft=n.ribShaft,o.ribTaper=n.ribTaper,o.ribKnuckle=n.ribKnuckle,o.ribWarp=n.ribWarp,this.ribs.syncGeometry(o);let s=this.ribParams;s.centre.copy(this._centre),s.origin.copy(this.origin),s.direction.copy(this.direction),s.side.copy(this.side),s.radius=i*n.ribRing,s.innerRadius=i*n.ribInner,s.radialCurve=n.ribRadialCurve,s.radialJitter=n.ribRadialJitter,s.angleJitter=n.ribAngleJitter,s.heightNear=n.ribLengthInner,s.height=n.ribLength,s.heightCurve=n.ribLengthCurve,s.heightJitter=n.ribLengthJitter,s.minHeight=.05,s.radiusNear=n.ribGirthInner,s.radius2=n.ribGirth,s.radiusCurve=n.ribGirthCurve,s.radiusJitter=n.ribGirthJitter,s.minRadius=.02,s.lean=-(n.ribLeanOpen+(n.ribLeanShut-n.ribLeanOpen)*a),s.leanJitter=n.ribLeanJitter,s.leanRamp=n.ribLeanRamp,s.leanForward=0,s.leanOutward=1,s.twist=n.ribRoll,s.tilt=n.ribTilt,s.riseTime=n.ribRiseTime,s.riseOvershoot=n.ribOvershoot,s.settle=n.ribSettle,s.springRate=n.ribSpring,s.emergeSink=n.ribSink,s.birthScale=n.ribBirthScale,s.birthFade=n.ribBirthFade,s.breachAt=n.ribBreachAt,s.sinkDepth=n.ribSinkDepth,s.randomness=r.randomness,this.ribs.update(this.age,s,e),this.boneMaterial.userData.sync(),this.boneMaterial.userData.setWither(e*n.witherDepth),this.boneMaterial.opacity=n.boneOpacity*r.opacity*(1-f.inQuad(e)*n.crumbleFade);let c=this.floorParams;c.centre.copy(this._centre),c.yaw=0,c.height=n.floorHeight,c.radius=i*n.floorRadius,c.grow=1,c.recede=0,c.fade=1-f.inQuad(e),c.seed=this._seed,c.edge=n.floorEdge,c.ragged=n.floorRagged,c.raggedScale=n.floorRaggedScale,c.warp=n.floorWarp,c.relief=n.floorRelief,c.normalStep=n.floorNormalStep,c.ambient=n.floorAmbient,c.specular=n.floorSpecular,c.gloss=n.floorGloss,c.parallax=n.floorParallax,c.cell=n.floorCell,c.lift=n.floorLift,c.depth=n.floorDepth,c.detail=n.floorDetail,c.sharp=n.floorSharp,c.speed=n.floorSpeed,c.markLife=n.floorMarkLife,c.markRadius=n.floorMarkRadius,c.emissive=n.floorEmissive,c.opacity=n.floorOpacity,c.depthFade=n.floorDepthFade,c.colorBase=n.colorFloorBase,c.colorEdge=n.colorFloorEdge,c.colorGlow=n.colorFloorGlow,c.colorDeep=n.colorFloorDeep,c.noiseStrength=r.noiseStrength,c.noiseFrequency=r.noiseFrequency,c.noiseSpeed=r.noiseSpeed,c.opacityScale=r.opacity,this.floor.setVisible(this.floor.markCount>0&&c.fade>.004),this.floor.update(c),this.grit.setGradient(t(n.colorGritA),t(n.colorGritB),t(n.colorGritC),t(n.colorGritD)),this.grit.uniforms.uGravity.value.set(0,n.gritGravity,0),this.grit.uniforms.uSizeScale.value=n.gritSize*r.particleSize*7,this.grit.uniforms.uLifeScale.value=r.particleLifetime,this.grit.uniforms.uSpeedScale.value=r.particleSpeed,this.grit.uniforms.uOpacity.value=r.opacity,this.dust.setGradient(t(n.colorDustA),t(n.colorDustB),t(n.colorDustC),t(n.colorDustD)),this.dust.uniforms.uGravity.value.set(0,n.dustRise,0),this.dust.uniforms.uSizeScale.value=n.dustSize*r.particleSize,this.dust.uniforms.uLifeScale.value=.5*r.particleLifetime,this.dust.uniforms.uSpeedScale.value=r.particleSpeed,this.dust.uniforms.uOpacity.value=n.dustOpacity*r.opacity,this.dust.uniforms.uTurbulence.value=.3*r.turbulence}_muzzleFx(){let n=u.bonecage,r=u.global;this._handPoint(I),this.ctx.bursts.spawn(h.EARTH,I,{radius:n.muzzleSize*.3,endRadius:n.muzzleSize*r.explosionIntensity,life:.45,intensity:n.muzzleIntensity,opacity:.4,fresnel:1.1,displace:.35,squash:.8,colorA:t(n.colorBurstA),colorB:t(n.colorBurstB),colorC:t(n.colorBurstC)}),N.position=I,N.radius=.2,N.direction=F.copy(this.direction).multiplyScalar(.5).setY(.4).normalize(),N.speed=n.dustSpeed,N.speedVariance=.6,N.spread=.8,N.inherit=null,N.anchor=null,N.size=.4,N.sizeVariance=.5,N.life=n.dustLifetime,N.lifeVariance=.4,N.spin=.3,N.tint=null,N.time=e.uTime.value,this.dust.emit(Math.round(12*r.particleCount),N),this.ctx.flash.trigger(t(n.colorCastFlash),n.castFlash*r.explosionIntensity),this.lightBoost=n.lightIntensity*.3*r.explosionIntensity}_cageFx(t,n){let r=u.bonecage,i=u.global,a=Math.round(this.dustEmitter.tick(t,r.dustRate*n)*i.particleCount);if(a<=0)return;let o=Math.random()*M,s=this.radius*r.ribRing*Math.sqrt(Math.random());P.set(this._centre.x+Math.cos(o)*s,r.dustBirthHeight,this._centre.z+Math.sin(o)*s),N.position=P,N.radius=this.radius*.12,N.direction=F.set(Math.cos(o)*.25,1,Math.sin(o)*.25).normalize(),N.speed=r.dustSpeed*.6,N.speedVariance=.5,N.spread=.6,N.inherit=null,N.anchor=null,N.size=.6,N.sizeVariance=.5,N.life=r.dustLifetime,N.lifeVariance=.4,N.spin=.2,N.tint=null,N.time=e.uTime.value,this.dust.emit(a,N)}onTravel(e){let t=u.bonecage;this._sync(0),this.position.y=t.lightHeight*.5,this._cageFx(e,.25),this.ctx.shake.rumble(t.rumble*u.global.cameraShake,e)}onImpact(){let e=u.bonecage,n=u.global;this._riseTime=0,this._centrePoint(this._centre),P.copy(this._centre).setY(e.ribLength*.2),this.ctx.bursts.spawn(h.AIR,P,{radius:e.burstSize*.3,endRadius:e.burstSize*n.explosionIntensity,life:.8,intensity:e.burstIntensity,opacity:.28,fresnel:1.4,displace:.4,squash:.35,colorA:t(e.colorBurstA),colorB:t(e.colorBurstB),colorC:t(e.colorBurstC)}),this.ctx.shake.add(e.impactShake*n.explosionIntensity*n.cameraShake,1/Math.max(.1,e.shakeDuration),15),this.ctx.flash.trigger(t(e.colorFlash),e.impactFlash*n.explosionIntensity),this.lightBoost=e.lightIntensity*.5*n.explosionIntensity}onFade(e,t){let n=u.bonecage;t<=1&&(this._riseTime+=e),this.ribs.triggerRadial(this.age,this._raise(),n.riseStagger,!0,!0);let r=t<=1?0:d(t-1);this._sync(r),this._centrePoint(this.position),this.position.y=n.lightHeight,this._cageFx(e,(1-r)*(t<=1?1:.4))}onDestroy(){this._riseTime=0,this.ribs.clear(),this.floor.clearMarks(),this.floor.setVisible(!1),this.boneMaterial.userData.setWither(0)}dispose(){this.ribs.dispose(),this.boneMaterial.dispose(),this.floor.dispose(),super.dispose()}};export{L as BonecageAbility};
//# sourceMappingURL=BonecageAbility-BYYL5ymR.js.map