import{D as e,E as t,G as n,O as r,R as i,Tn as a,V as o,Y as s,_t as c,di as l,fi as u,it as d,o as f,ot as p,st as m,tt as h,vt as g,xt as _,y as v}from"./settings-DdywqLlV.js";import{t as y}from"./ParticleSystem-BZTczMT8.js";import{n as b}from"./ParticleEngine-DLxipNH0.js";import{n as x}from"./GroundDecals-kYmr8HKl.js";import{n as S,t as C}from"./Ability-CYesB5Ur.js";import{i as w,n as T,r as E,t as D}from"./GrowthField-BxvnSH9l.js";function O(e){let t=new a({color:16777215,roughness:.62,metalness:0,flatShading:!0,transparent:!0,side:2,depthWrite:!0}),r={uLightDir:n.uLightDir,uStemTop:{value:.42},uStemRadius:{value:.045},uHeartRadius:{value:.085},uWidth:{value:.3},uWidthBias:{value:.78},uTaper:{value:.72},uCrease:{value:.42},uCup:{value:.34},uBud:{value:new u(.02,.34,.06,.68)},uOpen:{value:new u(.3,.42,.62,.16)},uUnfurlCurve:{value:1.5},uPetalStagger:{value:.28},uOpenDelay:{value:.35},uRelease:{value:0},uThrow:{value:.9},uLift:{value:.55},uSpin:{value:1.35},uShrink:{value:.85},uWilt:{value:.65},uColorStem:{value:new _},uColorBase:{value:new _},uColorMid:{value:new _},uColorTip:{value:new _},uColorVein:{value:new _},uColorHeart:{value:new _},uVeins:{value:.55},uVeinCount:{value:5},uGrain:{value:.22},uGrainScale:{value:7.5},uFresnel:{value:1.1},uFresnelPower:{value:2.6},uTranslucency:{value:1.8},uTranslucencyPower:{value:4},uGlow:{value:1},uEdgeGlow:{value:.7},uHeartGlow:{value:2.4},uBirthGlow:{value:1.6}};return e.registerShadowCasterWithPatch(t,e=>{Object.assign(e.uniforms,r),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
         attribute vec4  aPetal;   // (along 0..1, across -1..1, blade bearing, blade dice)
         attribute float aPart;    // 0 = stalk, 1 = petal
         attribute float aSeed;    // per instance
         attribute float aBirth;   // per instance, 1 -> 0 over the unfurl
         uniform float uStemTop;
         uniform float uStemRadius;
         uniform float uHeartRadius;
         uniform float uWidth;
         uniform float uWidthBias;
         uniform float uTaper;
         uniform float uCrease;
         uniform float uCup;
         uniform vec4  uBud;
         uniform vec4  uOpen;
         uniform float uUnfurlCurve;
         uniform float uPetalStagger;
         uniform float uOpenDelay;
         uniform float uRelease;
         uniform float uThrow;
         uniform float uLift;
         uniform float uSpin;
         uniform float uShrink;
         uniform float uWilt;
         varying float vPart;
         varying float vAlong;
         varying float vAcross;
         varying float vBloom;
         varying float vBirth;
         varying float vFlowerSeed;
         varying vec3  vPetalWorld;`).replace(`#include <begin_vertex>`,`#include <begin_vertex>
         {
           float along  = aPetal.x;
           float across = aPetal.y;
           float bearing = aPetal.z;
           float dice   = aPetal.w;

           // The unfurl clock. GrowthField counts aBirth from 1 down to 0 over
           // its birthFade seconds, and this ability hands birthFade the sum of
           // its rise and its unfurl, so 1 - aBirth is a per-instance ramp
           // across both — re-resolved on every call to the field's update(),
           // a zero-length one included.
           //
           // uOpenDelay is the share of that ramp the stalk is still climbing
           // for. Without it a bud starts splitting while it is half buried,
           // which loses the whole first beat: the read of this ability is
           // stalks, THEN flowers, and if they overlap you only ever see
           // flowers.
           float bloom = clamp(1.0 - aBirth, 0.0, 1.0);
           float delay = clamp(uOpenDelay, 0.0, 0.95);
           bloom = clamp((bloom - delay) / max(1e-3, 1.0 - delay), 0.0, 1.0);
           // ...and a small ripple inside each flower, so the petals do not all
           // let go on the identical frame. Without it a six-petal flower opens
           // like an umbrella; with it, it opens like a flower.
           float stagger = clamp(uPetalStagger, 0.0, 0.9);
           bloom = clamp((bloom - dice * stagger) / max(1e-3, 1.0 - stagger), 0.0, 1.0);
           bloom = pow(bloom, max(0.05, uUnfurlCurve));

           vPart = aPart;
           vAlong = along;
           vAcross = across;
           vBloom = bloom;
           vBirth = aBirth;
           vFlowerSeed = aSeed;

           vec3 outward = vec3(cos(bearing), 0.0, sin(bearing));
           vec3 lateral = vec3(-sin(bearing), 0.0, cos(bearing));

           if (aPart < 0.5) {
             // The stalk. Stored as a unit prism and given its real proportions
             // here, so stem height and thickness stay live sliders that need no
             // geometry rebuild. aPetal.y carries a 0..1 radial scale, which is
             // how the cap fan gets its centre vertex.
             float grip = mix(uStemRadius, uHeartRadius, along) * across;
             float wilt = 1.0 - uWilt * uRelease;
             transformed = outward * grip * wilt + vec3(0.0, uStemTop * along * wilt, 0.0);
           } else {
             // The centreline, as a quadratic Bezier from the hinge on the rim
             // of the heart out to the tip. Both free control points lerp from
             // the bud pose to the open pose; that lerp is the whole unfurl.
             vec2 hinge = vec2(uHeartRadius, 0.0);
             vec2 mid   = mix(uBud.xy, uOpen.xy, bloom);
             vec2 tip   = mix(uBud.zw, uOpen.zw, bloom);

             float s  = along;
             float ms = 1.0 - s;
             vec2 centre = ms * ms * hinge + 2.0 * ms * s * mid + s * s * tip;
             vec2 slope  = 2.0 * ms * (mid - hinge) + 2.0 * s * (tip - mid);

             vec2 tangentPlane = normalize(slope + vec2(1e-5, 1e-5));
             // In-plane normal. For a blade standing up this comes out pointing
             // radially outward, which is the face of the petal.
             vec2 facePlane = vec2(tangentPlane.y, -tangentPlane.x);

             // Half-width along the blade. A sine raised to a power: zero at the
             // hinge, widest a little past the middle, and rounded or pointed at
             // the tip depending on uTaper. Evaluated here rather than baked so
             // both controls stay live.
             float halfWidth = uWidth *
               pow(max(sin(3.14159265 * pow(clamp(along, 0.0, 1.0), uWidthBias)), 0.0), uTaper);
             halfWidth *= 1.0 - uShrink * uRelease;

             // The lengthwise crease is a tent fold about the midrib; the cup is
             // the cross-section curling toward the axis. Two separate marks:
             // the crease is what catches the key light down the middle of the
             // blade, the cup is what makes the flower hold water.
             float fold = uCrease * halfWidth * (1.0 - abs(across));
             float curl = -uCup * halfWidth * (1.0 - across * across);
             vec2 planar = centre + facePlane * (fold + curl);

             // The release: every petal in the field lets go on the same frame,
             // tumbling about its own hinge and thrown outward and up.
             if (uRelease > 0.0) {
               float turn = uSpin * uRelease * (0.35 + dice);
               vec2 arm = planar - hinge;
               float cs = cos(turn);
               float sn = sin(turn);
               planar = hinge + vec2(arm.x * cs - arm.y * sn, arm.x * sn + arm.y * cs);
               planar += vec2(uThrow, uLift) * uRelease * (0.55 + 0.9 * dice);
             }

             transformed = outward * planar.x
                         + lateral * (across * halfWidth)
                         + vec3(0.0, uStemTop + planar.y, 0.0);
           }

           #ifdef USE_INSTANCING
             vPetalWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
           #else
             vPetalWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
           #endif
         }`),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
         uniform vec3  uLightDir;
         uniform vec3  uColorStem;
         uniform vec3  uColorBase;
         uniform vec3  uColorMid;
         uniform vec3  uColorTip;
         uniform vec3  uColorVein;
         uniform vec3  uColorHeart;
         uniform float uVeins;
         uniform float uVeinCount;
         uniform float uGrain;
         uniform float uGrainScale;
         uniform float uFresnel;
         uniform float uFresnelPower;
         uniform float uTranslucency;
         uniform float uTranslucencyPower;
         uniform float uGlow;
         uniform float uEdgeGlow;
         uniform float uHeartGlow;
         uniform float uBirthGlow;
         uniform float uRelease;
         varying float vPart;
         varying float vAlong;
         varying float vAcross;
         varying float vBloom;
         varying float vBirth;
         varying float vFlowerSeed;
         varying vec3  vPetalWorld;
         ${s}`).replace(`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>
         {
           vec3  N   = normalize(normal);
           vec3  V   = normalize(vViewPosition);
           float ndv = clamp(dot(N, V), 0.0, 1.0);
           float rim = pow(1.0 - ndv, uFresnelPower);

           vec3 body;
           float emissiveMask = 0.0;

           if (vPart < 0.5) {
             body = uColorStem;
             // A little sap-green variation up the stalk so a field of forty
             // does not read as forty copies of one extruded tube.
             body *= 0.86 + 0.28 * fbm3(vPetalWorld * 3.1 + vFlowerSeed * 9.0);
           } else {
             body = mix(uColorBase, uColorMid, smoothstep(0.0, 0.55, vAlong));
             body = mix(body, uColorTip, smoothstep(0.42, 1.0, vAlong));

             // Veins. The midrib is a hard ridge at across = 0; the fan is a
             // set of ribs running out from it, swept back along the blade.
             // The first version drew the fan as cos(across * n) alone, which
             // gives ribs parallel to the midrib all the way to the tip — a
             // corduroy petal. Sweeping the phase with vAlong is what makes
             // them converge on the hinge the way a real vein pattern does.
             float across = abs(vAcross);
             float midrib = pow(1.0 - across, 7.0);
             float fan = cos(vAcross * uVeinCount * 3.14159265 - vAlong * 2.6);
             float vein = midrib + 0.4 * smoothstep(0.72, 1.0, abs(fan)) * (1.0 - across);
             body = mix(body, uColorVein, clamp(vein * uVeins, 0.0, 1.0));

             // A fibrous grain in world space, so neighbouring petals look cut
             // from the same tissue rather than each carrying its own pattern.
             body *= 1.0 + uGrain * (fbm3(vPetalWorld * uGrainScale + vFlowerSeed * 13.0) - 0.5);

             // The heart. Bright, tight to the hinge, and the thing the pollen
             // volume is anchored on visually.
             emissiveMask = smoothstep(0.24, 0.0, vAlong) * vBloom;
           }

           diffuseColor.rgb *= body;

           // Backlit translucency. A petal is two cells thick and the read of a
           // flower in a low sun is entirely the light coming through it, not
           // the light bouncing off it — so this term is deliberately stronger
           // than the diffuse response it sits on top of.
           float through = pow(clamp(dot(V, -uLightDir), 0.0, 1.0), uTranslucencyPower);
           float thin = step(0.5, vPart) * (0.35 + 0.65 * smoothstep(0.1, 0.9, vAlong));

           vec3 glow = uColorTip * through * thin * uTranslucency;
           glow += uColorVein * rim * uFresnel * uEdgeGlow;
           glow += uColorHeart * emissiveMask * uHeartGlow;
           glow += uColorHeart * vBirth * uBirthGlow * step(0.5, vPart);
           glow *= uGlow;

           // Soft ceiling, as on the ice: every term above peaks at a grazing
           // angle and they stack, and without this a petal on the silhouette
           // sums past 4x white and the bloom pass smears the whole field.
           glow /= 1.0 + glow * 0.3;

           totalEmissiveRadiance += glow;

           // Petals thin out as they are thrown; the stalk does not.
           float shed = step(0.5, vPart) * uRelease;
           diffuseColor.a = clamp(diffuseColor.a * (1.0 - shed * shed), 0.0, 1.0);
         }`)}),t.userData.uniforms=r,t.userData.sync=(e=0)=>{let n=f.bloomburst,a=f.global;r.uStemTop.value=n.stemFrac,r.uStemRadius.value=n.stemRadius,r.uHeartRadius.value=n.heartRadius,r.uWidth.value=n.petalWidth,r.uWidthBias.value=n.petalWidthBias,r.uTaper.value=n.petalTaper,r.uCrease.value=n.petalCrease,r.uCup.value=n.petalCup,r.uBud.value.set(n.budMidOut,n.budMidUp,n.budTipOut,n.budTipUp),r.uOpen.value.set(n.openMidOut,n.openMidUp,n.openTipOut,n.openTipUp),r.uUnfurlCurve.value=n.unfurlCurve,r.uPetalStagger.value=n.petalStagger,r.uOpenDelay.value=n.riseTime/Math.max(.001,n.riseTime+n.unfurlTime),r.uRelease.value=e,r.uThrow.value=n.releaseThrow,r.uLift.value=n.releaseLift,r.uSpin.value=n.releaseSpin,r.uShrink.value=n.releaseShrink,r.uWilt.value=n.stemWilt,r.uColorStem.value.copy(i(n.colorStem)),r.uColorBase.value.copy(i(n.colorPetalBase)),r.uColorMid.value.copy(i(n.colorPetalMid)),r.uColorTip.value.copy(i(n.colorPetalTip)),r.uColorVein.value.copy(i(n.colorVein)),r.uColorHeart.value.copy(i(n.colorHeart)),r.uVeins.value=n.veins*a.shaderIntensity,r.uVeinCount.value=n.veinCount,r.uGrain.value=n.grain*a.shaderIntensity,r.uGrainScale.value=n.grainScale*a.noiseFrequency,r.uFresnel.value=n.fresnel*a.fresnel,r.uFresnelPower.value=n.fresnelPower,r.uTranslucency.value=n.translucency,r.uTranslucencyPower.value=n.translucencyPower,r.uGlow.value=n.petalGlow*a.glow,r.uEdgeGlow.value=n.edgeGlow,r.uHeartGlow.value=n.heartGlow,r.uBirthGlow.value=n.birthGlow,t.opacity=n.petalOpacity*a.opacity,t.roughness=n.petalRoughness,t.envMapIntensity=n.envIntensity},t.userData.sync(0),t}var k=Math.PI*2,A=96,j=3,M={stemTop:.44,stemRadius:.05,heartRadius:.09,width:.3,widthBias:.78,taper:.7,budMidOut:.02,budMidUp:.34,budTipOut:.05,budTipUp:.7},N={},P=new l,F=new l,I=new l,L=new l;function R(e,t){let n=Math.max(3,Math.min(14,Math.round(t.petals)+(e===1?1:e===2?-1:0))),r=Math.max(2,Math.min(24,Math.round(t.segments))),i=Math.max(3,Math.min(16,Math.round(t.sides))),a=i*2+1+n*(r+1)*3,o=i*3+n*r*4,s=new Float32Array(a*3),l=new Float32Array(a*4),u=new Float32Array(a),f=new Uint16Array(o*3),p=0,m=0;for(let e=0;e<2;e++){let t=e,n=M.stemRadius+(M.heartRadius-M.stemRadius)*t;for(let e=0;e<i;e++){let r=e/i*k;s[p*3]=Math.cos(r)*n,s[p*3+1]=M.stemTop*t,s[p*3+2]=Math.sin(r)*n,l[p*4]=t,l[p*4+1]=1,l[p*4+2]=r,l[p*4+3]=0,u[p]=0,p++}}let h=p;s[p*3+1]=M.stemTop,l[p*4]=1,l[p*4+1]=0,l[p*4+2]=0,l[p*4+3]=0,u[p]=0,p++;for(let e=0;e<i;e++){let t=e,n=(e+1)%i,r=i+e,a=i+(e+1)%i;f[m++]=t,f[m++]=r,f[m++]=a,f[m++]=t,f[m++]=a,f[m++]=n,f[m++]=r,f[m++]=h,f[m++]=a}for(let t=0;t<n;t++){let i=(t+(e===2?.5:0))/n*k,a=d(t*12.9898+e*7.13+n*3.77),o=p;for(let e=0;e<=r;e++){let t=e/r,n=1-t,o=n*n*M.heartRadius+2*n*t*M.budMidOut+t*t*M.budTipOut,c=2*n*t*M.budMidUp+t*t*M.budTipUp,d=M.width*Math.max(Math.sin(Math.PI*t**+M.widthBias),0)**+M.taper;for(let e=0;e<3;e++){let n=e-1;s[p*3]=Math.cos(i)*o-n*d*Math.sin(i),s[p*3+1]=M.stemTop+c,s[p*3+2]=Math.sin(i)*o+n*d*Math.cos(i),l[p*4]=t,l[p*4+1]=n,l[p*4+2]=i,l[p*4+3]=a,u[p]=1,p++}}for(let e=0;e<r;e++)for(let t=0;t<2;t++){let n=o+e*3+t,r=n+1,i=n+3,a=i+1;f[m++]=n,f[m++]=i,f[m++]=r,f[m++]=r,f[m++]=i,f[m++]=a}}let _=new g;return _.setAttribute(`position`,new c(s,3)),_.setAttribute(`aPetal`,new c(l,4)),_.setAttribute(`aPart`,new c(u,1)),_.setIndex(new c(f,1)),_.computeVertexNormals(),_}var z=class extends C{constructor(e){super(`bloomburst`,e)}createShaders(){let n=f.bloomburst;this.material=O(this.ctx.environment),this.growth=w(),this.growth.layout=E.ZONE,this.growth.emerge=D.PUSH,this.growth.centre=new l,this.shape={petals:n.petals,segments:n.petalSegments,sides:n.stalkSides},this.field=new T(this.group,{geometry:R,material:this.material,shape:this.shape,variants:j,capacity:A,layer:o.WORLD,renderOrder:2,castShadow:!1,receiveShadow:!0}),this.field.onBreach=(e,t,n,r)=>this._breachFx(e,t,n,r),this.pollen=new r({hull:t.CYLINDER,medium:e.SPORE,prefix:`pollen`,maxSteps:40,renderOrder:12}),this.group.add(this.pollen.mesh),this._seed=0,this._bloomTime=0,this._released=!1}createParticles(){let e=this.ctx.particles;this.pollenMotes=e.get(`bloomburst.pollen`,{capacity:2600,shape:y.SOFT,additive:!0,curl:!0,softFade:.45}),this.pollenMotes.uniforms.uDrag.value=1.9,this.pollenMotes.uniforms.uEndSize.value=.5,this.pollenMotes.uniforms.uSizeIn.value=.1,this.pollenMotes.uniforms.uFadeIn.value=.12,this.pollenMotes.uniforms.uFadeOut.value=.45,this.confetti=e.get(`bloomburst.confetti`,{capacity:1600,shape:y.LEAF,additive:!1,lit:!0,softFade:.3}),this.confetti.uniforms.uDrag.value=1.15,this.confetti.uniforms.uEndSize.value=.9,this.confetti.uniforms.uFadeIn.value=.05,this.confetti.uniforms.uFadeOut.value=.55,this.haze=e.get(`bloomburst.haze`,{capacity:1400,shape:y.SMOKE,additive:!1,curl:!0,softFade:1}),this.haze.uniforms.uDrag.value=2.2,this.haze.uniforms.uEndSize.value=2.6,this.haze.uniforms.uSizeIn.value=.14,this.haze.uniforms.uFadeIn.value=.2,this.haze.uniforms.uFadeOut.value=.32,this.pollenEmitter=new b,this.hazeEmitter=new b}get instanceCount(){return this.field.count}get impactDuration(){let e=f.bloomburst;return Math.max(.2,(e.riseTime+e.waveTime+e.unfurlTime+e.holdTime)*f.global.lifetime)}get fadeDuration(){let e=f.bloomburst;return Math.max(.2,e.releaseTime+e.witherTime)}get radius(){return Math.max(.05,f.bloomburst.zoneRadius)}_centrePoint(e){return this.pointAt(1,e).setY(0)}_handPoint(e){let t=f.bloomburst;return e.copy(this.origin).addScaledVector(this.direction,t.handForward).addScaledVector(this.side,t.handSide),e.y=t.handHeight,e}_waveFront(){let e=f.bloomburst;return h.outCubic(m(this._bloomTime/Math.max(.02,e.waveTime)))}_releaseAmount(){if(this.phase!==S.FADE)return 0;let e=f.bloomburst;return h.outCubic(m(this.fadeTime/Math.max(.02,e.releaseTime)))}_witherAmount(){if(this.phase!==S.FADE)return 0;let e=f.bloomburst;return m((this.fadeTime-e.releaseTime)/Math.max(.05,e.witherTime))}_fillGrowth(){let e=f.bloomburst,t=f.global,n=this.growth,r=this.radius;this._centrePoint(n.centre),n.origin=this.origin,n.direction=this.direction,n.side=this.side,n.length=this.length,n.radius=r,n.innerRadius=r*m(e.innerFrac),n.radialCurve=e.radialCurve,n.radialJitter=e.radialJitter,n.angleJitter=e.angleJitter,n.heightNear=e.heightNear,n.height=e.height,n.heightCurve=e.heightCurve,n.heightJitter=e.heightJitter,n.radiusNear=e.stalkRadius,n.radius2=e.stalkRadiusTop,n.radiusCurve=e.radiusCurve,n.radiusJitter=e.radiusJitter,n.lean=e.lean,n.leanJitter=e.leanJitter,n.leanRamp=e.leanRamp,n.leanOutward=e.leanOutward,n.leanForward=e.leanForward,n.tilt=e.tilt,n.twist=e.twist,n.riseTime=e.riseTime,n.riseOvershoot=e.riseOvershoot,n.settle=e.settle,n.springRate=e.springRate,n.emergeSink=e.emergeSink,n.birthScale=e.birthScale,n.breachAt=e.breachAt,n.sinkDepth=e.sinkDepth,n.birthFade=Math.max(.02,e.riseTime+e.unfurlTime),n.randomness=t.randomness}onSpawn(){let e=f.bloomburst;this.pollenEmitter.reset(),this.hazeEmitter.reset(),this._bloomTime=0,this._released=!1,this._seed=Math.random()*100,this.field.plant(Math.min(A,Math.round(e.flowers)),e.coreShare),this.pollen.setFade(0),this._sync(0,0),this._muzzleFx()}_sync(e,t){let n=f.bloomburst,r=f.global;this.shape.petals=n.petals,this.shape.segments=n.petalSegments,this.shape.sides=n.stalkSides,this.field.syncGeometry(this.shape),this.material.userData.sync(e),this._fillGrowth(),this.field.update(this.age,this.growth,t);let a=this.radius*n.pollenRadius*(1+(n.pollenSwell-1)*e),o=Math.max(.05,n.pollenLift*(1-n.pollenSettle*t)),s=m(n.pollenHaze),c=Math.max(s*(1-t),e*(1-t));this._centrePoint(P),P.y=n.pollenBase*(1-n.pollenSettle*t),this.pollen.place(P,this.direction).setSize(a,o,a).setFade(c).sync(n,r),this.pollenMotes.setGradient(i(n.colorPollenA),i(n.colorPollenB),i(n.colorPollenC),i(n.colorPollenD)),this.pollenMotes.uniforms.uGravity.value.set(0,n.pollenDrift,0),this.pollenMotes.uniforms.uSizeScale.value=n.pollenSize*r.particleSize*7,this.pollenMotes.uniforms.uLifeScale.value=n.pollenLifetime*.5*r.particleLifetime,this.pollenMotes.uniforms.uSpeedScale.value=r.particleSpeed,this.pollenMotes.uniforms.uOpacity.value=r.opacity,this.pollenMotes.uniforms.uGlow.value=n.pollenGlow*r.glow,this.pollenMotes.uniforms.uTurbulence.value=n.pollenTurbulence*r.turbulence,this.confetti.setGradient(i(n.colorConfettiA),i(n.colorConfettiB),i(n.colorConfettiC),i(n.colorConfettiD)),this.confetti.uniforms.uGravity.value.set(0,n.confettiGravity,0),this.confetti.uniforms.uSizeScale.value=n.confettiSize*r.particleSize*7,this.confetti.uniforms.uLifeScale.value=n.confettiLifetime*.5*r.particleLifetime,this.confetti.uniforms.uSpeedScale.value=r.particleSpeed,this.confetti.uniforms.uOpacity.value=r.opacity,this.haze.setGradient(i(n.colorHazeA),i(n.colorHazeB),i(n.colorHazeC),i(n.colorHazeD)),this.haze.uniforms.uGravity.value.set(0,n.hazeRise,0),this.haze.uniforms.uSizeScale.value=n.hazeSize*r.particleSize,this.haze.uniforms.uLifeScale.value=n.hazeLifetime*.5*r.particleLifetime,this.haze.uniforms.uSpeedScale.value=n.hazeSpeed*r.particleSpeed,this.haze.uniforms.uOpacity.value=n.hazeOpacity*r.opacity,this.haze.uniforms.uTurbulence.value=.4*r.turbulence}_muzzleFx(){let e=f.bloomburst,t=f.global;this._handPoint(L),this.ctx.bursts.spawn(v.EARTH,L,{radius:e.muzzleSize*.25,endRadius:e.muzzleSize*t.explosionIntensity,life:.45,intensity:e.muzzleIntensity,opacity:.6,fresnel:1.3,displace:.55,colorA:i(e.colorBurstA),colorB:i(e.colorBurstB),colorC:i(e.colorBurstC)}),N.position=L,N.radius=.16,N.direction=F.copy(this.direction).multiplyScalar(.6).setY(.5).normalize(),N.speed=e.pollenSpeed*3,N.speedVariance=.8,N.spread=.9,N.inherit=null,N.anchor=null,N.size=.09,N.sizeVariance=.7,N.life=e.pollenLifetime*.6,N.lifeVariance=.5,N.spin=0,N.tint=null,N.time=n.uTime.value,this.pollenMotes.emit(Math.round(28*t.particleCount),N),this.ctx.flash.trigger(i(e.colorCastFlash),e.castFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.5*t.explosionIntensity}_frontFx(e){let t=f.bloomburst,r=f.global,i=Math.round(this.hazeEmitter.tick(e,t.hazeRate*.55)*r.particleCount);i>0&&(N.position=P.copy(this.position).setY(.1),N.radius=.55,N.direction=F.set(0,1,0),N.speed=t.hazeSpeed,N.speedVariance=.7,N.spread=1,N.inherit=null,N.anchor=null,N.size=.7,N.sizeVariance=.5,N.life=t.hazeLifetime*.8,N.lifeVariance=.4,N.spin=.4,N.tint=null,N.time=n.uTime.value,this.haze.emit(i,N))}_breachFx(e,t,r,a){let o=f.bloomburst,s=f.global;N.position=P.copy(t).setY(.05),N.radius=r*.8,N.direction=F.set(0,1,0),N.speed=o.hazeSpeed*1.4,N.speedVariance=.7,N.spread=1,N.inherit=null,N.anchor=null,N.size=.45,N.sizeVariance=.5,N.life=o.hazeLifetime*.6,N.lifeVariance=.4,N.spin=.5,N.tint=null,N.time=n.uTime.value,this.haze.emit(Math.round(2*s.particleCount),N),d(e*3.7+this._seed)<.45&&this.ctx.decals.spawn(x.FOAM,t,{radius:o.mossRadius*p(.6,1.25),life:o.mossLife,intensity:o.mossIntensity,colorA:i(o.colorMoss),colorB:i(o.colorMossEdge)})}_fieldFx(e,t){let r=f.bloomburst,i=f.global,a=n.uTime.value,o=this.field.count;if(o<=0)return;let s=Math.round(this.pollenEmitter.tick(e,r.pollenRate*t)*i.particleCount);if(s>0){let e=Math.min(o-1,Math.random()*o|0);this.field.emergenceOf(e,this.age,this.growth)>.2&&(this.field.positionOf(e,this.growth,P),P.y+=this.field.heightOf(e,this.growth)*r.stemFrac,N.position=P,N.radius=this.field.radiusOf(e,this.growth)*r.petalWidth*2,N.direction=F.set(0,1,0),N.speed=r.pollenSpeed,N.speedVariance=.85,N.spread=1,N.inherit=null,N.anchor=null,N.size=.07,N.sizeVariance=.7,N.life=r.pollenLifetime,N.lifeVariance=.5,N.spin=0,N.tint=null,N.time=a,this.pollenMotes.emit(s,N))}let c=Math.round(this.hazeEmitter.tick(e,r.hazeRate*t)*i.particleCount);if(c>0){let e=Math.random()*k,t=this.radius*Math.sqrt(Math.random());this._centrePoint(I),P.set(I.x+Math.cos(e)*t,.12,I.z+Math.sin(e)*t),N.position=P,N.radius=this.radius*.15,N.direction=F.set(0,1,0),N.speed=r.hazeSpeed,N.speedVariance=.7,N.spread=.95,N.inherit=null,N.anchor=null,N.size=.8,N.sizeVariance=.5,N.life=r.hazeLifetime,N.lifeVariance=.4,N.spin=.35,N.tint=null,N.time=a,this.haze.emit(c,N)}}_releaseFx(){let e=f.bloomburst,t=f.global,r=n.uTime.value,a=this.radius;this._centrePoint(I),P.copy(I).setY(e.heightNear*.5),this.ctx.bursts.spawn(v.AIR,P,{radius:e.burstSize*.3,endRadius:e.burstSize*t.explosionIntensity,life:.9,intensity:e.burstIntensity,opacity:.45,fresnel:1.5,displace:.5,squash:.55,colorA:i(e.colorBurstA),colorB:i(e.colorBurstB),colorC:i(e.colorBurstC)}),N.position=P,N.radius=a*.85,N.direction=F.set(0,1,0),N.speed=e.pollenSpeed*2.4,N.speedVariance=.9,N.spread=1,N.inherit=null,N.anchor=null,N.size=.08,N.sizeVariance=.8,N.life=e.pollenLifetime*1.4,N.lifeVariance=.55,N.spin=0,N.tint=null,N.time=r,this.pollenMotes.emit(Math.round(e.burstPollen*t.particleCount),N),N.radius=a*.9,N.direction=F.set(0,.55,0).normalize(),N.speed=e.confettiSpeed,N.speedVariance=.9,N.spread=1,N.size=.12,N.sizeVariance=.7,N.life=e.confettiLifetime,N.lifeVariance=.5,N.spin=e.confettiSpin,this.confetti.emit(Math.round(e.burstConfetti*t.particleCount),N),this.ctx.decals.spawn(x.DUSTRING,I,{radius:e.shockRadius*t.explosionIntensity,life:.9,width:.06,intensity:.7,colorA:i(e.colorShockA),colorB:i(e.colorShockB)}),this.ctx.shake.add(e.impactShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),16),this.ctx.flash.trigger(i(e.colorFlash),e.impactFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*1.2*t.explosionIntensity}onTravel(e){this._sync(0,0),this.position.y=.3,this._frontFx(e),this.ctx.shake.rumble(f.bloomburst.rumble*f.global.cameraShake,e)}onImpact(){let e=f.bloomburst,t=f.global;this._bloomTime=0,this._centrePoint(I),this.ctx.decals.spawn(x.FOAM,I,{radius:this.radius*e.mossSpread,life:e.mossLife*1.5,intensity:e.mossIntensity*.8,colorA:i(e.colorMoss),colorB:i(e.colorMossEdge)}),this.ctx.decals.spawn(x.DUSTRING,I,{radius:e.shockRadius*.8*t.explosionIntensity,life:.8,width:.05,intensity:.6,colorA:i(e.colorShockA),colorB:i(e.colorShockB)}),this.ctx.shake.add(e.impactShake*.5*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),14),this.lightBoost=e.lightIntensity*.7*t.explosionIntensity}onFade(e,t){let n=f.bloomburst;t<=1&&(this._bloomTime+=e);let r=!!n.waveInvert,i=t<=1?this._waveFront():1;this.field.triggerRadial(this.age,i,n.waveStagger,r,!r||i>=.999);let a=this._releaseAmount(),o=this._witherAmount();!this._released&&a>0&&(this._released=!0,this._releaseFx()),this._sync(a,o),this._centrePoint(this.position),this.position.y=n.heightNear*m(n.lightHeight)*(1-o),this._fieldFx(e,t<=1?1:(1-a)*.5)}onDestroy(){this.field.clear(),this.pollen.setFade(0),this.material.userData.sync(0),this._released=!1,this._bloomTime=0}dispose(){this.field.dispose(),this.material.dispose(),this.pollen.dispose(),super.dispose()}};export{z as BloomburstAbility};
//# sourceMappingURL=BloomburstAbility-CZxsjmjF.js.map