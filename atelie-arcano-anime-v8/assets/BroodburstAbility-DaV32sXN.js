import{G as e,R as t,Tn as n,V as r,Y as i,_t as a,at as o,di as s,nt as c,o as l,st as u,tt as d,vt as f,xt as p,y as m}from"./settings-DdywqLlV.js";import{t as h}from"./ParticleSystem-BZTczMT8.js";import{n as g}from"./ParticleEngine-DLxipNH0.js";import{n as _}from"./GroundDecals-kYmr8HKl.js";import{n as v,t as y}from"./Ability-CYesB5Ur.js";import{t as b}from"./Swarm-WksC-UkD.js";import{n as x,r as S,t as C}from"./GroundField-aLIZg3d3.js";import{i as w,n as T,r as E,t as D}from"./GrowthField-BxvnSH9l.js";import{n as O,o as k,t as A}from"./Colony-TW2PdEk1.js";function j(r){let a=new n({color:16777215,roughness:.48,metalness:0,flatShading:!0,transparent:!0,side:2,depthWrite:!0}),o={uLightDir:e.uLightDir,uSwellAt:{value:.08},uSplitAt:{value:.62},uSplitSpan:{value:.22},uHuskAt:{value:.9},uSwell:{value:.42},uSwellCurve:{value:1.8},uBulge:{value:.3},uStretch:{value:.24},uThrob:{value:.055},uThrobRate:{value:7},uGape:{value:1.25},uGapeSlide:{value:.12},uGapeLift:{value:.06},uGapeCurve:{value:.6},uVeins:{value:.85},uVeinScale:{value:5.5},uVeinBands:{value:2.6},uVeinSharp:{value:.62},uMottle:{value:.35},uMottleScale:{value:2.2},uRimWidth:{value:.55},uRimDark:{value:.7},uRimGlow:{value:1.6},uFresnel:{value:1.2},uFresnelPower:{value:2.4},uThin:{value:2.2},uThinPower:{value:3},uBroodGlow:{value:2.6},uBroodRise:{value:1.7},uInteriorGlow:{value:.9},uGlow:{value:1},uHuskFade:{value:1},uColorShell:{value:new p},uColorBelly:{value:new p},uColorVein:{value:new p},uColorBrood:{value:new p},uColorRim:{value:new p},uColorInterior:{value:new p}};return r.registerShadowCasterWithPatch(a,e=>{Object.assign(e.uniforms,o),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
         attribute vec4  aShell;   // (v 0..1 up the egg, cos bearing, sin bearing, rim weight)
         attribute float aSide;    // +1 / -1 — which half-shell this vertex belongs to
         attribute float aSeed;    // per instance, 0..10
         attribute float aBirth;   // per instance, 1 -> 0 across the whole hatch
         uniform float uSwellAt;
         uniform float uSplitAt;
         uniform float uSplitSpan;
         uniform float uHuskAt;
         uniform float uSwell;
         uniform float uSwellCurve;
         uniform float uBulge;
         uniform float uStretch;
         uniform float uThrob;
         uniform float uThrobRate;
         uniform float uGape;
         uniform float uGapeSlide;
         uniform float uGapeLift;
         uniform float uGapeCurve;
         varying vec4  vShell;
         varying float vHatch;   // 0..1 across the whole ramp
         varying float vSwellT;  // 0..1 how far the inflation has got
         varying float vSplit;   // 0..1 how far the seam has opened
         varying float vEggSeed;`).replace(`#include <begin_vertex>`,`#include <begin_vertex>
         {
           float hatch = clamp(1.0 - aBirth, 0.0, 1.0);
           float dice  = fract(aSeed * 0.6180339887 + 0.137);

           float swellT = clamp((hatch - uSwellAt) / max(uSplitAt - uSwellAt, 0.001), 0.0, 1.0);
           float split  = pow(clamp((hatch - uSplitAt) / max(uSplitSpan, 0.001), 0.0, 1.0),
                              max(uGapeCurve, 0.05));

           // The inflation. Width and height are separate multipliers because an
           // egg under pressure goes fat before it goes long — driving both off
           // one number gave a balloon rather than a sac.
           float grow = pow(swellT, max(uSwellCurve, 0.05));
           float pulse = uThrob * sin((grow * uThrobRate + dice) * PI2) * swellT;
           float waist = 1.0 - abs(aShell.x * 2.0 - 1.0);
           float wide = 1.0 + (uSwell + pulse) * grow * (1.0 + uBulge * waist);
           float tall = 1.0 + (uSwell * uStretch + pulse * 0.4) * grow;

           transformed.xz *= wide;
           transformed.y  *= tall;

           // The seam gives. A rigid rotation of this half about the z axis at
           // the base — the line where the seam plane meets the floor — so the
           // shell keeps every bit of its curvature on the way open.
           float a = -aSide * uGape * split;
           float ca = cos(a);
           float sa = sin(a);
           transformed.xy = vec2(transformed.x * ca - transformed.y * sa,
                                 transformed.x * sa + transformed.y * ca);
           transformed.x += aSide * uGapeSlide * split;
           transformed.y += uGapeLift * split;

           vShell   = aShell;
           vHatch   = hatch;
           vSwellT  = swellT;
           vSplit   = split;
           vEggSeed = aSeed;
         }`),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
         uniform vec3  uLightDir;
         uniform float uHuskAt;
         uniform float uVeins;
         uniform float uVeinScale;
         uniform float uVeinBands;
         uniform float uVeinSharp;
         uniform float uMottle;
         uniform float uMottleScale;
         uniform float uRimWidth;
         uniform float uRimDark;
         uniform float uRimGlow;
         uniform float uFresnel;
         uniform float uFresnelPower;
         uniform float uThin;
         uniform float uThinPower;
         uniform float uBroodGlow;
         uniform float uBroodRise;
         uniform float uInteriorGlow;
         uniform float uGlow;
         uniform float uHuskFade;
         uniform vec3  uColorShell;
         uniform vec3  uColorBelly;
         uniform vec3  uColorVein;
         uniform vec3  uColorBrood;
         uniform vec3  uColorRim;
         uniform vec3  uColorInterior;
         varying vec4  vShell;
         varying float vHatch;
         varying float vSwellT;
         varying float vSplit;
         varying float vEggSeed;
         ${i}`).replace(`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>
         {
           // Shell coordinates: up the egg, and (cos, sin) round it. Not the
           // world position — the shell inflates, and a world-space field would
           // slide across it while it did.
           vec3 shellCoord = vec3(vShell.yz * uVeinScale, vShell.x * uVeinBands + vEggSeed);

           float vein = ridged(shellCoord, 4);
           vein = smoothstep(0.42 + 0.3 * (1.0 - uVeinSharp), 0.98, vein);
           float mottle = fbm3(vec3(vShell.yz * uMottleScale, vShell.x * uMottleScale + vEggSeed));

           // Belly to crown. A real egg is paler where it sits.
           vec3 body = mix(uColorBelly, uColorShell, clamp(vShell.x, 0.0, 1.0));
           body = mix(body, uColorShell * 0.72, mottle * uMottle);

           // The torn lip. 1 exactly on the seam edge, 0 a couple of rings in.
           float rim = smoothstep(1.0 - clamp(uRimWidth, 0.01, 1.0), 1.0, vShell.w);
           body = mix(body, body * (1.0 - clamp(uRimDark, 0.0, 1.0)), rim);

           float facing = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
           float edge = pow(1.0 - facing, max(uFresnelPower, 0.05));

           // The translucency, and it is the beat that matters. A shell under
           // pressure thins, so light from behind starts coming through it —
           // driven by swellT rather than by a constant, which is what turns
           // "an egg" into "an egg about to go". Written as a wrapped
           // back-light rather than a fresnel rim: a fresnel puts the glow on
           // the silhouette, and a thin shell glows across its whole belly.
           float back = pow(clamp(dot(-normal, uLightDir) * 0.5 + 0.5, 0.0, 1.0),
                            max(uThinPower, 0.05));
           float thin = back * uThin * vSwellT;

           // The brood, showing through. Late, and through the veins, so what
           // you read is a shape moving under a membrane rather than a lamp.
           float showing = pow(vSwellT, max(uBroodRise, 0.05));
           float lumen = showing * (0.35 + 0.65 * vein);

           vec3 glow = uColorVein * vein * uVeins * (0.4 + 0.6 * vSwellT);
           glow += uColorBrood * lumen * uBroodGlow;
           glow += uColorShell * thin;
           glow += uColorShell * edge * uFresnel;
           glow += uColorRim * rim * uRimGlow * vSplit;

           // The inside of an opened husk: wet, dark, and not lit by anything
           // the outside is lit by. gl_FrontFacing is the only handle on it and
           // it is exactly the right one.
           if (!gl_FrontFacing) {
             body = uColorInterior;
             glow = uColorBrood * uInteriorGlow * (0.25 + 0.75 * vSplit);
           }

           diffuseColor.rgb *= body;

           // Soft ceiling, as IceMaterial does: the veins, the brood and the
           // back-light all peak in different places but a swollen egg seen
           // edge-on has all three at once, and without this the sum runs past
           // 4 and bloom turns the clutch into a single white blob.
           glow *= uGlow;
           glow /= 1.0 + glow * 0.28;
           totalEmissiveRadiance += glow;

           // The husk goes last, not first: it has to still be catching light
           // while it dissolves, or the shell reads as fading out rather than
           // as being left behind.
           float husk = 1.0 - smoothstep(clamp(uHuskAt, 0.0, 0.999), 1.0, vHatch);
           diffuseColor.a *= husk * clamp(uHuskFade, 0.0, 1.0);
         }`)}),a.userData.uniforms=o,a.userData.sync=e=>{let n=l.broodburst,r=l.global;o.uSwellAt.value=n.swellAt,o.uSplitAt.value=n.splitAt,o.uSplitSpan.value=n.splitSpan,o.uHuskAt.value=n.huskAt,o.uSwell.value=n.swell,o.uSwellCurve.value=n.swellCurve,o.uBulge.value=n.bulge,o.uStretch.value=n.stretch,o.uThrob.value=n.throb,o.uThrobRate.value=n.throbRate,o.uGape.value=n.gape,o.uGapeSlide.value=n.gapeSlide,o.uGapeLift.value=n.gapeLift,o.uGapeCurve.value=n.gapeCurve,o.uVeins.value=n.veins*r.shaderIntensity,o.uVeinScale.value=n.veinScale*r.noiseFrequency,o.uVeinBands.value=n.veinBands*r.noiseFrequency,o.uVeinSharp.value=n.veinSharp,o.uMottle.value=n.mottle*r.noiseStrength,o.uMottleScale.value=n.mottleScale*r.noiseFrequency,o.uRimWidth.value=n.rimWidth,o.uRimDark.value=n.rimDark,o.uRimGlow.value=n.rimGlow,o.uFresnel.value=n.shellFresnel*r.fresnel,o.uFresnelPower.value=n.shellFresnelPower,o.uThin.value=n.thin*r.shaderIntensity,o.uThinPower.value=n.thinPower,o.uBroodGlow.value=n.broodGlow,o.uBroodRise.value=n.broodRise,o.uInteriorGlow.value=n.interiorGlow,o.uGlow.value=n.shellGlow*r.glow,o.uHuskFade.value=e,o.uColorShell.value.copy(t(n.colorShell)),o.uColorBelly.value.copy(t(n.colorBelly)),o.uColorVein.value.copy(t(n.colorVein)),o.uColorBrood.value.copy(t(n.colorBrood)),o.uColorRim.value.copy(t(n.colorRim)),o.uColorInterior.value.copy(t(n.colorInterior)),a.roughness=n.shellRoughness,a.envMapIntensity=n.shellEnv,a.opacity=1},a.userData.sync(1),a}var M=Math.PI*2,N=72,P=256,F=3,I={},L=new s,R=new s,z=new s,B=new s;function V(e,t,n,r){let i=n*3.77+r*11.3,a=Math.sin(e*9.1+i)*.62+Math.sin(e*17.7+i*1.7)*.38;return(r===0?Math.PI*.5:-Math.PI*.5)+t*a}function H(e,t){let n=Math.max(6,Math.min(28,Math.round(t.rings))),r=Math.max(5,Math.min(24,Math.round(t.sides))),i=Math.max(0,Math.min(.6,t.tear)),o=((n+1)*(r+1)+1)*2,s=(n*r*2+r)*2,c=new Float32Array(o*3),l=new Float32Array(o*4),u=new Float32Array(o),d=new Uint16Array(s*3),p=0,m=0;for(let t=0;t<2;t++){let a=t===0?1:-1,o=p;for(let o=0;o<=n;o++){let s=o/n,d=.5*(Math.max(0,Math.sin(Math.PI*(.12+.88*s)))**.7*(1-.28*s)),f=t===0?V(s,i,e,1):V(s,i,e,0),m=t===0?V(s,i,e,0):V(s,i,e,1)+M;for(let e=0;e<=r;e++){let t=e/r,n=f+(m-f)*t;c[p*3]=Math.cos(n)*d,c[p*3+1]=s,c[p*3+2]=Math.sin(n)*d,l[p*4]=s,l[p*4+1]=Math.cos(n),l[p*4+2]=Math.sin(n),l[p*4+3]=Math.abs(t*2-1),u[p]=a,p++}}let s=p;c[s*3]=0,c[s*3+1]=0,c[s*3+2]=0,l[s*4]=0,l[s*4+1]=1,l[s*4+2]=0,l[s*4+3]=0,u[s]=a,p++;let f=r+1;for(let e=0;e<n;e++)for(let t=0;t<r;t++){let n=o+e*f+t,r=n+1,i=n+f,a=i+1;d[m++]=n,d[m++]=i,d[m++]=r,d[m++]=r,d[m++]=i,d[m++]=a}for(let e=0;e<r;e++)d[m++]=o+e,d[m++]=o+e+1,d[m++]=s}let h=new f;return h.setAttribute(`position`,new a(c,3)),h.setAttribute(`aShell`,new a(l,4)),h.setAttribute(`aSide`,new a(u,1)),h.setIndex(new a(d,1)),h.computeVertexNormals(),h}var U=class extends y{constructor(e){super(`broodburst`,e)}createShaders(){let e=l.broodburst;this.material=j(this.ctx.environment),this.growth=w(),this.growth.layout=E.ZONE,this.growth.emerge=D.SCALE,this.growth.centre=new s,this.shape={rings:e.eggRings,sides:e.eggSides,tear:e.seamTear},this.field=new T(this.group,{geometry:H,material:this.material,shape:this.shape,variants:F,capacity:N,layer:r.WORLD,renderOrder:2,castShadow:!1,receiveShadow:!0}),this.crawlers=new O(this.group,{capacity:P,additive:!1,renderOrder:12}),this.flock=k(),this.slick=new C(this.group,{mode:x.WET,additive:!1,renderOrder:6,name:`BroodSlick`}),this.slickParams=S(),this.slickParams.centre=new s,this._seed=0,this._hatched=new Uint8Array(N),this._hatchedCount=0}createParticles(){let e=this.ctx.particles;this.goo=e.get(`broodburst.goo`,{capacity:2e3,shape:h.SOFT,additive:!1,lit:!0,softFade:.3}),this.goo.uniforms.uDrag.value=1.1,this.goo.uniforms.uEndSize.value=.35,this.goo.uniforms.uSizeIn.value=.05,this.goo.uniforms.uFadeIn.value=.05,this.goo.uniforms.uFadeOut.value=.5,this.chips=e.get(`broodburst.chips`,{capacity:1200,shape:h.CHIP,additive:!1,lit:!0,softFade:.25}),this.chips.uniforms.uDrag.value=.35,this.chips.uniforms.uEndSize.value=.6,this.chips.uniforms.uFadeOut.value=.6,this.haze=e.get(`broodburst.haze`,{capacity:1400,shape:h.SMOKE,additive:!1,curl:!0,softFade:1}),this.haze.uniforms.uDrag.value=2,this.haze.uniforms.uEndSize.value=2.4,this.haze.uniforms.uSizeIn.value=.14,this.haze.uniforms.uFadeIn.value=.2,this.haze.uniforms.uFadeOut.value=.34,this.gooEmitter=new g,this.hazeEmitter=new g}get instanceCount(){return this.field.count+this.crawlers.count}get radius(){return Math.max(.05,l.broodburst.zoneRadius)}_eggRamp(){let e=l.broodburst;return Math.max(.05,e.riseTime+e.swellTime)}_firstSplit(){return this._eggRamp()*u(l.broodburst.splitAt)}get impactDuration(){let e=l.broodburst;return Math.max(.2,(e.layTime+e.layStagger+this._eggRamp()+e.crawlTime)*l.global.lifetime)}get fadeDuration(){return Math.max(.2,l.broodburst.scatterTime)}_clutchAge(){return this.phase===v.TRAVEL?0:this.phase===v.IMPACT?this.impactTime:this.impactDuration+this.fadeTime}_layFront(){let e=l.broodburst;return d.outCubic(u(this._clutchAge()/Math.max(.02,e.layTime)))}_crawlBeat(){let e=l.broodburst,t=e.layTime+this._firstSplit();return u((this._clutchAge()-t)/Math.max(.05,e.crawlTime))}_scatter(){if(this.phase!==v.FADE)return 0;let e=l.broodburst;return u(this.fadeTime/Math.max(.05,e.scatterTime))}_centrePoint(e){return this.pointAt(1,e).setY(0)}_handPoint(e){let t=l.broodburst;return e.copy(this.origin).addScaledVector(this.direction,t.handForward).addScaledVector(this.side,t.handSide),e.y=t.handHeight,e}lightShimmer(){let e=l.broodburst;return 1-u(e.lightPulse)*.5*(1-Math.cos(this.age*e.lightPulseRate))}onSpawn(){let e=l.broodburst;this.gooEmitter.reset(),this.hazeEmitter.reset(),this._hatched.fill(0),this._hatchedCount=0,this._seed=Math.random()*100,this.field.plant(Math.min(N,Math.round(e.eggs)),e.clusterShare),this.crawlers.roll(this._seed),this._sync(1),this._muzzleFx()}_fillGrowth(){let e=l.broodburst,t=l.global,n=this.growth,r=this.radius;this._centrePoint(n.centre),n.origin=this.origin,n.direction=this.direction,n.side=this.side,n.length=this.length,n.radius=r,n.innerRadius=r*u(e.innerFrac),n.radialCurve=e.radialCurve,n.radialJitter=e.radialJitter,n.angleJitter=e.angleJitter,n.heightNear=e.eggHeight,n.height=e.eggHeightRim,n.heightCurve=e.heightCurve,n.heightJitter=e.heightJitter,n.radiusNear=e.eggRadius,n.radius2=e.eggRadiusRim,n.radiusCurve=e.radiusCurve,n.radiusJitter=e.radiusJitter,n.lean=0,n.tilt=e.eggTilt,n.twist=1,n.riseTime=e.riseTime,n.riseOvershoot=e.riseOvershoot,n.settle=e.settleTime,n.springRate=e.springRate,n.emergeSink=e.eggSink,n.birthScale=e.birthScale,n.sinkDepth=e.sinkDepth,n.birthFade=this._eggRamp(),n.breachAt=2,n.randomness=t.randomness}_fillFlock(e){let t=l.broodburst,n=l.global,r=this.flock,i=this.radius,a=this._crawlBeat(),o=this.field.count>0?this._hatchedCount/this.field.count:0;r.count=c(Math.round(t.crawlers*n.particleCount),0,P),r.leadMode=b.ORBIT,r.leadS=0,r.leadRate=t.crawlLeadRate,r.orbitRadius=t.crawlOrbitRadius,r.orbitHeight=0,r.orbitTurns=t.crawlOrbitTurns,r.endHeight=t.crawlHeight,r.handForward=t.handForward,r.handSide=t.handSide,r.handHeight=t.handHeight,r.leadRise=0,r.latticeX=t.crawlLatticeX,r.latticeY=t.crawlLatticeY,r.latticeZ=t.crawlLatticeZ,r.spacingSide=t.crawlSpacing,r.spacingUp=t.crawlSpacingUp,r.lag=t.crawlLag,r.jitter=t.crawlJitter*n.randomness,r.churn=t.crawlChurn,r.breathe=t.crawlBreathe,r.breatheRate=t.crawlBreatheRate,r.wander=t.crawlWander,r.wanderScale=t.crawlWanderScale*n.noiseFrequency,r.wanderSpeed=t.crawlWanderSpeed*n.noiseSpeed,r.gather=t.crawlGather,r.size=t.crawlSize,r.aspect=t.crawlAspect,r.sizeJitter=t.crawlSizeJitter*n.randomness,r.billboard=0,r.bank=t.crawlBank,r.bankMax=t.crawlBankMax,r.dihedral=t.crawlDihedral,r.flapRate=t.crawlScuttle,r.silhouette=c(Math.round(t.crawlShape),0,4),r.sweep=t.crawlSweep,r.edgeGain=t.crawlEdgeGain,r.lit=t.crawlLit,r.reveal=u(o*(1-e)-e*.15),r.revealSpread=t.crawlRevealSpread,r.tint=t.crawlTint,r.tintJitter=t.crawlTintJitter*n.randomness,r.tintAlong=t.crawlTintAlong,r.opacity=t.crawlOpacity*n.opacity,r.glow=t.crawlGlow*n.glow,r.softFade=t.crawlSoftFade,r.shapeA=A.RING,r.shapeB=A.RING,r.shapeBlend=0,r.condense=t.crawlCondense*d.outQuad(u(a*3))*(1-e);let s=i*(t.crawlRing+t.crawlRingGrow*a);r.shapeWidth=s,r.shapeDepth=s,r.shapeHeight=i*t.crawlRingThick,r.shapeForward=0,r.shapeSide=0,r.shapeUp=0,r.shapeSpin=t.crawlSpin,r.shapeFill=t.crawlFill,r.shapeSteps=c(Math.round(t.crawlSteps),1,4),r.shapeSlack=t.crawlSlack,r.shapeRough=t.crawlRough,r.waveAmp=0,r.cling=1,r.floorY=0,r.crawlHeight=t.crawlHeight}_fillSlick(e){let t=l.broodburst,n=l.global,r=this.slickParams,i=this.radius*t.slickRadius;this._centrePoint(r.centre),r.radius=i,r.height=t.slickHeight,r.seed=this._seed,r.grow=this._layFront(),r.recede=u(t.slickDry)*e,r.fade=1,r.edge=t.slickEdge,r.ragged=t.slickRagged,r.raggedScale=t.slickRaggedScale,r.warp=t.slickWarp,r.relief=t.slickRelief,r.ambient=t.slickAmbient,r.specular=t.slickSpecular,r.gloss=t.slickGloss,r.cell=t.slickCell,r.lift=t.slickLift,r.depth=t.slickDepth,r.detail=t.slickDetail,r.sharp=t.slickSharp,r.flow=t.slickFlow,r.speed=t.slickSpeed,r.additive=!1,r.emissive=t.slickEmissive*n.shaderIntensity,r.opacity=t.slickOpacity,r.depthFade=t.slickDepthFade,r.colorBase=t.colorSlickBase,r.colorEdge=t.colorSlickEdge,r.colorGlow=t.colorSlickGlow,r.colorDeep=t.colorSlickDeep,r.noiseStrength=n.noiseStrength,r.noiseFrequency=n.noiseFrequency,r.noiseSpeed=n.noiseSpeed,r.opacityScale=n.opacity}_sync(e){let n=l.broodburst,r=l.global,i=this._scatter();this.shape.rings=n.eggRings,this.shape.sides=n.eggSides,this.shape.tear=n.seamTear,this.field.syncGeometry(this.shape),this.material.userData.sync(e),this._fillGrowth(),this.field.update(this.age,this.growth,i),this._fillFlock(i),this.crawlers.setBasis(this.origin,this.direction,this.side,this.length),this.crawlers.setColors(n.colorCrawlA,n.colorCrawlB,n.colorCrawlC,n.colorCrawlD),this.crawlers.update(this.age,this.flock),this._fillSlick(i),this.slick.setVisible(this.slickParams.grow>0),this.slick.update(this.slickParams),this.goo.setGradient(t(n.colorGooA),t(n.colorGooB),t(n.colorGooC),t(n.colorGooD)),this.goo.uniforms.uGravity.value.set(0,n.gooGravity,0),this.goo.uniforms.uSizeScale.value=n.gooSize*r.particleSize*7,this.goo.uniforms.uLifeScale.value=n.gooLifetime*.5*r.particleLifetime,this.goo.uniforms.uSpeedScale.value=r.particleSpeed,this.goo.uniforms.uOpacity.value=r.opacity,this.goo.uniforms.uGlow.value=n.gooGlow*r.glow,this.chips.setGradient(t(n.colorChipA),t(n.colorChipB),t(n.colorChipC),t(n.colorChipD)),this.chips.uniforms.uGravity.value.set(0,n.chipGravity,0),this.chips.uniforms.uSizeScale.value=n.chipSize*r.particleSize*7,this.chips.uniforms.uLifeScale.value=n.chipLifetime*.5*r.particleLifetime,this.chips.uniforms.uSpeedScale.value=r.particleSpeed,this.chips.uniforms.uOpacity.value=r.opacity,this.haze.setGradient(t(n.colorHazeA),t(n.colorHazeB),t(n.colorHazeC),t(n.colorHazeD)),this.haze.uniforms.uGravity.value.set(0,n.hazeRise,0),this.haze.uniforms.uSizeScale.value=n.hazeSize*r.particleSize,this.haze.uniforms.uLifeScale.value=n.hazeLifetime*.5*r.particleLifetime,this.haze.uniforms.uSpeedScale.value=n.hazeSpeed*r.particleSpeed,this.haze.uniforms.uOpacity.value=n.hazeOpacity*r.opacity,this.haze.uniforms.uTurbulence.value=.4*r.turbulence}_walkHatches(){let e=l.broodburst,t=this.age,n=this._eggRamp()*u(e.splitAt),r=this.field.count,i=0;for(let e=0;e<r;e++){let r=this.field.records[e].eruptTime;r>=0&&t>=r+n?(i++,this._hatched[e]||(this._hatched[e]=1,this._hatchFx(e))):this._hatched[e]&&(this._hatched[e]=0)}this._hatchedCount=i}_muzzleFx(){let n=l.broodburst,r=l.global;this._handPoint(B),this.ctx.bursts.spawn(m.EARTH,B,{radius:n.muzzleSize*.25,endRadius:n.muzzleSize*r.explosionIntensity,life:.4,intensity:n.muzzleIntensity,opacity:.6,fresnel:1.3,displace:.5,colorA:t(n.colorBurstA),colorB:t(n.colorBurstB),colorC:t(n.colorBurstC)}),I.position=B,I.radius=.16,I.direction=R.copy(this.direction).multiplyScalar(.7).setY(.4).normalize(),I.speed=n.gooSpeed*1.2,I.speedVariance=.8,I.spread=.85,I.inherit=null,I.anchor=null,I.size=.08,I.sizeVariance=.7,I.life=n.gooLifetime*.7,I.lifeVariance=.5,I.spin=0,I.tint=null,I.time=e.uTime.value,this.goo.emit(Math.round(18*r.particleCount),I),this.ctx.flash.trigger(t(n.colorCastFlash),n.castFlash*r.explosionIntensity),this.lightBoost=n.lightIntensity*.4*r.explosionIntensity}_carryFx(t){let n=l.broodburst,r=l.global,i=Math.round(this.hazeEmitter.tick(t,n.hazeRate*.5)*r.particleCount);i<=0||(I.position=L.copy(this.position).setY(.12),I.radius=.45,I.direction=R.set(0,1,0),I.speed=n.hazeSpeed,I.speedVariance=.7,I.spread=1,I.inherit=null,I.anchor=null,I.size=.55,I.sizeVariance=.5,I.life=n.hazeLifetime*.7,I.lifeVariance=.4,I.spin=.4,I.tint=null,I.time=e.uTime.value,this.haze.emit(i,I))}_hatchFx(t){let n=l.broodburst,r=l.global,i=e.uTime.value;this.field.positionOf(t,this.growth,L);let a=this.field.heightOf(t,this.growth),o=this.field.radiusOf(t,this.growth);L.y+=a*.55;let s=Math.round(n.gooBurst*r.particleCount);s>0&&(I.position=L,I.radius=o*.6,I.direction=R.set(0,1,0),I.speed=n.gooSpeed,I.speedVariance=.85,I.spread=.8,I.inherit=null,I.anchor=null,I.size=.09,I.sizeVariance=.8,I.life=n.gooLifetime,I.lifeVariance=.55,I.spin=0,I.tint=null,I.time=i,this.goo.emit(s,I));let c=Math.round(n.chipBurst*r.particleCount);c>0&&(I.position=L,I.radius=o*.9,I.direction=R.set(0,1,0),I.speed=n.chipSpeed,I.speedVariance=.9,I.spread=1,I.size=.08,I.sizeVariance=.7,I.life=n.chipLifetime,I.lifeVariance=.5,I.spin=n.chipSpin,I.time=i,this.chips.emit(c,I))}_clutchFx(t,n){let r=l.broodburst,i=l.global,a=e.uTime.value,o=this.field.count;if(o<=0)return;this._centrePoint(z);let s=Math.round(this.gooEmitter.tick(t,r.gooRate*n)*i.particleCount);if(s>0){let e=Math.min(o-1,Math.random()*o|0);this._hatched[e]&&(this.field.positionOf(e,this.growth,L),L.y+=this.field.heightOf(e,this.growth)*.4,I.position=L,I.radius=this.field.radiusOf(e,this.growth)*.8,I.direction=R.set(0,1,0),I.speed=r.gooSpeed*.35,I.speedVariance=.8,I.spread=1,I.inherit=null,I.anchor=null,I.size=.07,I.sizeVariance=.7,I.life=r.gooLifetime,I.lifeVariance=.5,I.spin=0,I.tint=null,I.time=a,this.goo.emit(s,I))}let c=Math.round(this.hazeEmitter.tick(t,r.hazeRate*n)*i.particleCount);if(c>0){let e=Math.random()*M,t=this.radius*Math.sqrt(Math.random());L.set(z.x+Math.cos(e)*t,.14,z.z+Math.sin(e)*t),I.position=L,I.radius=this.radius*.14,I.direction=R.set(0,1,0),I.speed=r.hazeSpeed,I.speedVariance=.7,I.spread=.95,I.inherit=null,I.anchor=null,I.size=.65,I.sizeVariance=.5,I.life=r.hazeLifetime,I.lifeVariance=.4,I.spin=.35,I.tint=null,I.time=a,this.haze.emit(c,I)}}onTravel(e){this._sync(1),this.position.y=.3,this._carryFx(e),this.ctx.shake.rumble(l.broodburst.rumble*l.global.cameraShake,e)}onImpact(){let n=l.broodburst,r=l.global,i=e.uTime.value;this._centrePoint(z),L.copy(z).setY(n.eggHeight*.4),this.ctx.bursts.spawn(m.EARTH,L,{radius:n.burstSize*.25,endRadius:n.burstSize*r.explosionIntensity,life:.7,intensity:n.burstIntensity,opacity:.5,fresnel:1.4,displace:.5,squash:.6,colorA:t(n.colorBurstA),colorB:t(n.colorBurstB),colorC:t(n.colorBurstC)}),this.ctx.decals.spawn(_.FOAM,z,{radius:this.radius*n.slickDecalRadius,life:n.slickDecalLife,intensity:n.slickDecalIntensity,colorA:t(n.colorMat),colorB:t(n.colorMatEdge)}),this.ctx.decals.spawn(_.DUSTRING,z,{radius:n.shockRadius*r.explosionIntensity,life:.8,width:.05,intensity:.6,colorA:t(n.colorMatEdge),colorB:t(n.colorMat)}),I.position=L,I.radius=this.radius*.4,I.direction=R.set(0,1,0),I.speed=n.gooSpeed*1.6,I.speedVariance=.85,I.spread=1,I.inherit=null,I.anchor=null,I.size=.09,I.sizeVariance=.8,I.life=n.gooLifetime*1.2,I.lifeVariance=.55,I.spin=0,I.tint=null,I.time=i,this.goo.emit(Math.round(n.burstGoo*r.particleCount),I),this.ctx.shake.add(n.impactShake*r.explosionIntensity*r.cameraShake,1/Math.max(.1,n.shakeDuration),16),this.ctx.flash.trigger(t(n.colorFlash),n.impactFlash*r.explosionIntensity),this.lightBoost=n.lightIntensity*.8*r.explosionIntensity}onFade(e,t){let n=l.broodburst,r=this._scatter(),i=t<=1?this._layFront():1;this.field.triggerRadial(this.age,i,n.layStagger,!1,i>=.999);let a=1-d.inQuad(r);this._fillGrowth(),this._walkHatches(),this._sync(a),this._centrePoint(this.position),this.position.y=o(n.eggHeight*.6,n.lightHeight,this._crawlBeat()),this._clutchFx(e,t<=1?1:1-r)}onDestroy(){this.field.clear(),this.crawlers.reset(),this.slick.setVisible(!1),this.material.userData.sync(1),this._hatched.fill(0),this._hatchedCount=0}dispose(){this.field.dispose(),this.material.dispose(),this.crawlers.dispose(),this.slick.dispose(),super.dispose()}};export{U as BroodburstAbility};
//# sourceMappingURL=BroodburstAbility-DaV32sXN.js.map