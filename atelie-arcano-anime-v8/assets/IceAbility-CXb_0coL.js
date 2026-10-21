import{G as e,M as t,N as n,Qt as r,R as i,Tn as a,V as o,Y as s,at as c,ct as l,di as u,en as d,et as f,jn as p,o as m,ot as h,st as g,tt as _,xt as v,y,zn as b}from"./settings-DdywqLlV.js";import{t as x}from"./ParticleSystem-BZTczMT8.js";import{n as S}from"./ParticleEngine-DLxipNH0.js";import{n as C}from"./GroundDecals-kYmr8HKl.js";import"./SceneHooks-DvEWF-72.js";import{n as w,t as T}from"./Ability-CYesB5Ur.js";function E(r){let o=new a({color:16777215,roughness:.16,metalness:0,flatShading:!0,transparent:!0,side:2,depthWrite:!0}),c={...n(),uTime:e.uTime,uColorDeep:{value:new v},uColorIce:{value:new v},uColorRim:{value:new v},uColorCore:{value:new v},uDensity:{value:1.15},uFresnel:{value:2.3},uFresnelPower:{value:2.4},uTranslucency:{value:1.5},uFacetSharp:{value:.68},uFracture:{value:.62},uFractureScale:{value:6.5},uVeins:{value:.45},uVeinScale:{value:3.2},uSparkle:{value:1.6},uSparkleScale:{value:34},uSparkleSpeed:{value:.7},uFrostLine:{value:.5},uGlow:{value:1.35},uEdgeGlow:{value:2},uBirthGlow:{value:3.2}};return r.registerShadowCasterWithPatch(o,e=>{Object.assign(e.uniforms,c),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
         attribute float aSeed;
         attribute float aBirth;
         varying vec3  vIceLocal;
         varying vec3  vIceWorld;
         varying float vIceSeed;
         varying float vIceBirth;`).replace(`#include <begin_vertex>`,`#include <begin_vertex>
         vIceLocal = transformed;
         vIceSeed = aSeed;
         vIceBirth = aBirth;
         #ifdef USE_INSTANCING
           vIceWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
         #else
           vIceWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
         #endif`),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
         uniform float uTime;
         uniform vec3  uColorDeep;
         uniform vec3  uColorIce;
         uniform vec3  uColorRim;
         uniform vec3  uColorCore;
         uniform float uDensity;
         uniform float uFresnel;
         uniform float uFresnelPower;
         uniform float uTranslucency;
         uniform float uFacetSharp;
         uniform float uFracture;
         uniform float uFractureScale;
         uniform float uVeins;
         uniform float uVeinScale;
         uniform float uSparkle;
         uniform float uSparkleScale;
         uniform float uSparkleSpeed;
         uniform float uFrostLine;
         uniform float uGlow;
         uniform float uEdgeGlow;
         uniform float uBirthGlow;
         varying vec3  vIceLocal;
         varying vec3  vIceWorld;
         varying float vIceSeed;
         varying float vIceBirth;
         ${s}
         ${t}`).replace(`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>
         {
           vec3  N   = normalize(normal);
           float ndv = clamp(dot(N, normalize(vViewPosition)), 0.0, 1.0);

           // Facing a facet you look down the long axis of the crystal; at a
           // grazing angle you are only clipping its edge.
           float thickness = clamp(ndv * uDensity, 0.0, 1.0);
           float fres = pow(1.0 - ndv, uFresnelPower) * uFresnel;

           // World space: crack planes keep a fixed physical scale, so a small
           // shard and a tall spike look cut from the same glacier.
           vec3  fp     = vIceWorld * uFractureScale + vIceSeed * 37.0;
           float cracks = smoothstep(0.55, 0.98, ridged(fp, 4));

           // Local space: veining follows each crystal's own axis.
           float veins = fbm3(vIceLocal * uVeinScale * 4.0 + vIceSeed * 11.0) * 0.5 + 0.5;
           veins = smoothstep(0.45, 0.92, veins);

           vec3 body = mix(uColorIce, uColorDeep, thickness);
           body = mix(body, uColorRim, veins * uVeins * 0.55);
           body = mix(body, uColorRim, cracks * uFracture * 0.4);

           // Rime gathers where the crystal left the floor.
           float rime = smoothstep(0.55, 0.0, vIceLocal.y) *
                        (0.5 + 0.5 * fbm3(vIceLocal * 9.0 + vIceSeed * 5.0));
           body = mix(body, uColorRim, clamp(rime, 0.0, 1.0) * uFrostLine);

           // Lift the facets that point at the camera so the silhouette reads as
           // a bundle of planes rather than one smooth mass.
           body *= mix(1.0, 0.55 + 0.9 * ndv, uFacetSharp);

           // Pinpoint glints, biased to the grazing angles where ice catches.
           float sp = snoise(vIceWorld * uSparkleScale +
                             vec3(0.0, uTime * uSparkleSpeed, 0.0) + vIceSeed * 23.0);
           sp = pow(clamp(sp, 0.0, 1.0), 14.0) * smoothstep(0.0, 0.7, fres + 0.3);

           diffuseColor.rgb *= body;

           // The rim *glow* rides a normalised 0..1 fresnel, not fres. fres
           // carries uFresnel (2.3 by default) because it also drives opacity,
           // and folding that gain into the emissive too was multiplying the
           // silhouette up past 4x white before any of the other terms landed.
           float rimAmount = pow(1.0 - ndv, uFresnelPower);

           vec3 glow = uColorRim * rimAmount * uEdgeGlow;
           glow += uColorCore * (cracks * uFracture * 0.8 + veins * uVeins * 0.35) * uTranslucency;
           glow += uColorRim * sp * uSparkle * 1.5;
           glow += uColorCore * vIceBirth * uBirthGlow;
           glow *= uGlow;

           // Soft ceiling. The terms above are independent and all peak at a
           // grazing angle, so they stack: without this a facet on the silhouette
           // sums to well over 10 and the crystal reads as a white blob with the
           // bloom pass smeared across it. A Reinhard rolloff leaves everything
           // under ~1 essentially untouched and asymptotes at 1/0.22 ≈ 4.5, so
           // the sliders still bite at the top of their range without blowing out.
           glow /= 1.0 + glow * 0.22;

           totalEmissiveRadiance += glow;

           // Thin at the edges, denser through the body and along the cracks.
           diffuseColor.a = clamp(diffuseColor.a * (0.62 + 0.5 * fres) + cracks * 0.12, 0.0, 1.0);

           // Spellbreak's field (vfx/SceneHooks.js). Last, on the finished
           // fragment: draining the body before the emissive above is summed
           // would leave a grey crystal with a full-strength glow still coming
           // out of its cracks, which reads as a lighting bug rather than as
           // the spell being pulled apart. Ice is already a transparent, so the
           // cell erosion lands on the alpha and no discard is needed — the
           // opaque growth materials in vfx/GrowthField.js are not so lucky.
           // Whole locals for the inout arguments, not swizzles.
           float iceDisrupt = disruptAt(vIceWorld);
           if (iceDisrupt > 0.0) {
             vec3  iceAlbedo = diffuseColor.rgb;
             float iceAlpha  = diffuseColor.a;
             disruptShade(iceAlbedo, iceAlpha, iceDisrupt, gl_FragCoord.xy);
             diffuseColor.rgb = iceAlbedo;
             diffuseColor.a = iceAlpha;

             vec3  iceGlow = totalEmissiveRadiance;
             float iceGlowKeep = 1.0;
             disruptShade(iceGlow, iceGlowKeep, iceDisrupt, gl_FragCoord.xy);
             totalEmissiveRadiance = iceGlow * iceGlowKeep;
           }
         }`)}),o.userData.uniforms=c,o.userData.sync=()=>{let e=m.ice,t=m.global;c.uColorDeep.value.copy(i(e.colorDeep)),c.uColorIce.value.copy(i(e.colorIce)),c.uColorRim.value.copy(i(e.colorRim)),c.uColorCore.value.copy(i(e.colorCore)),c.uDensity.value=e.depthTint,c.uFresnel.value=e.fresnel*t.fresnel,c.uFresnelPower.value=e.fresnelPower,c.uTranslucency.value=e.translucency,c.uFacetSharp.value=e.facetSharp,c.uFracture.value=e.fracture*t.shaderIntensity,c.uFractureScale.value=e.fractureScale*t.noiseFrequency,c.uVeins.value=e.veins*t.shaderIntensity,c.uVeinScale.value=e.veinScale*t.noiseFrequency,c.uSparkle.value=e.glint*t.shaderIntensity,c.uSparkleScale.value=e.glintScale,c.uSparkleSpeed.value=e.glintSpeed*t.noiseSpeed,c.uFrostLine.value=e.frostLine,c.uGlow.value=e.glow*t.glow,c.uEdgeGlow.value=e.edgeGlow,c.uBirthGlow.value=e.birthGlow,o.opacity=e.opacity*t.opacity,o.envMapIntensity=e.envIntensity},o.userData.sync(),o}var D=288,O=3,k=Math.ceil(D/O),A=Math.PI*2,j={},M=new u,N=new u,P=new u,F=new u,I=new u(0,1,0),L=new p,R=new b,z=new b,B=class extends T{constructor(e){super(`ice`,e)}createShaders(){let e=this.ctx.environment;this.material=E(e),this._shapeKey=``,this.meshes=[],this.seedAttributes=[],this.birthAttributes=[];for(let e=0;e<O;e++){let t=this._buildGeometry(e),n=new r(new Float32Array(k),1),i=new r(new Float32Array(k),1);for(let e=0;e<k;e++)n.array[e]=Math.random()*10;t.setAttribute(`aSeed`,n),t.setAttribute(`aBirth`,i);let a=new d(t,this.material,k);a.castShadow=!0,a.receiveShadow=!0,a.frustumCulled=!1,a.count=0,a.layers.set(o.WORLD),a.renderOrder=2,this.group.add(a),this.meshes.push(a),this.seedAttributes.push(n),this.birthAttributes.push(i)}this.records=[];for(let e=0;e<D;e++)this.records.push({along:0,lateral:0,scatter:0,angle:0,radial:0,impact:!1,rubble:!1,heightJitter:0,radiusJitter:0,leanJitter:0,pitchJitter:0,yaw:0,stagger:0,eruptTime:-1,shattered:!1});this._activeCount=0,this._impactStart=D}_buildGeometry(e){let t=m.ice;return f({seed:7.3+e*21.7,sides:t.facets,taper:t.taper,roughness:t.roughness,bend:t.bend})}_syncGeometry(){let e=m.ice,t=`${Math.round(e.facets)}|${e.taper.toFixed(3)}|${e.roughness.toFixed(3)}|${e.bend.toFixed(3)}`;if(t!==this._shapeKey){this._shapeKey=t;for(let e=0;e<O;e++){let t=this.meshes[e],n=t.geometry,r=this._buildGeometry(e);r.setAttribute(`aSeed`,this.seedAttributes[e]),r.setAttribute(`aBirth`,this.birthAttributes[e]),t.geometry=r,n.dispose()}}}createParticles(){let e=this.ctx.particles;this.mist=e.get(`ice.mist`,{capacity:3200,shape:x.SMOKE,additive:!1,curl:!0,softFade:1.2}),this.mist.uniforms.uDrag.value=1.9,this.mist.uniforms.uEndSize.value=3.4,this.mist.uniforms.uSizeIn.value=.1,this.mist.uniforms.uFadeIn.value=.14,this.mist.uniforms.uFadeOut.value=.3,this.shards=e.get(`ice.shards`,{capacity:2400,shape:x.CHIP,additive:!1,lit:!0,softFade:.25}),this.shards.uniforms.uDrag.value=.22,this.shards.uniforms.uEndSize.value=.85,this.shards.uniforms.uFadeOut.value=.72,this.glitter=e.get(`ice.glitter`,{capacity:2800,shape:x.SOFT,additive:!0,curl:!0,softFade:.4}),this.glitter.uniforms.uDrag.value=1.1,this.glitter.uniforms.uEndSize.value=.18,this.glitter.uniforms.uSizeIn.value=.05,this.glitter.uniforms.uFadeIn.value=.06,this.glitter.uniforms.uFadeOut.value=.35,this.mistEmitter=new S,this.glitterEmitter=new S,this.frostEmitter=new S}get instanceCount(){return this._activeCount}get impactDuration(){return Math.max(.2,m.ice.lifetime*m.global.lifetime)}get fadeDuration(){let e=m.ice;return Math.max(.2,e.shatterDelay+e.sinkTime)}onSpawn(){let e=m.ice;this.mistEmitter.reset(),this.glitterEmitter.reset(),this.frostEmitter.reset(),this._frostDistance=0;let t=Math.min(D,Math.max(1,Math.round(e.spikeCount*e.density))),n=Math.round(t*.22);this._activeCount=t,this._impactStart=t-n;for(let n=0;n<t;n++){let t=this.records[n],r=n>=this._impactStart;t.impact=r,t.eruptTime=-1,t.shattered=!1,t.yaw=Math.random()*A,t.stagger=Math.random(),t.heightJitter=h(-1,1),t.radiusJitter=h(-1,1),t.leanJitter=h(-1,1),t.pitchJitter=h(-1,1),t.scatter=h(-1,1),t.rubble=Math.random()<e.rubble,r?(t.angle=Math.random()*A,t.radial=Math.sqrt(Math.random()),t.along=1):(t.along=((n+Math.random())/Math.max(1,this._impactStart))**+e.frontBias,t.lateral=h(-1,1))}for(let e=t;e<D;e++)this.records[e].eruptTime=-1;for(let e=0;e<O;e++)this.meshes[e].count=0}_halfWidth(e,t){return c(t.widthNear,t.width,g(e)**+t.widthCurve)}_lateralNorm(e,t){let n=e.lateral;return Math.sign(n)*Math.abs(n)**+t.clumping+e.scatter*t.scatter}_spikePosition(e,t,n){if(e.impact){let r=this._halfWidth(1,t)*1.25*e.radial;return this.pointAt(1,n),n.x+=Math.cos(e.angle)*r,n.z+=Math.sin(e.angle)*r,n}return this.pointAt(e.along,n),n.addScaledVector(this.side,this._lateralNorm(e,t)*this._halfWidth(e.along,t))}_spikeHeight(e,t,n){let r=c(t.heightNear,t.height,g(e.along)**+t.heightCurve);r*=1+(t.peak-1)*l(1-t.peakWidth,1,e.along);let i=e.impact?e.radial:g(Math.abs(this._lateralNorm(e,t)));return r*=c(1,1-g(t.crown),i**1.4),r*=1+e.heightJitter*t.heightJitter*n.randomness,e.rubble&&(r*=t.rubbleScale),Math.max(.02,r)}_spikeRadius(e,t,n){let r=c(.72,1.15,g(e.along)**.6),i=1+e.radiusJitter*t.radiusJitter*n.randomness;return Math.max(.01,t.radius*r*i*(e.rubble?1.25:1))}_triggerUpTo(e,t){let n=m.ice;for(let r=0;r<this._activeCount;r++){let i=this.records[r];i.eruptTime>=0||i.impact&&!t||!i.impact&&i.along>e||(i.eruptTime=this.age+i.stagger*n.riseStagger)}}_emergence(e,t){if(e.eruptTime<0)return-1;let n=this.age-e.eruptTime;if(n<0)return-1;let r=Math.max(.02,t.riseTime),i=_.outQuint(g(n/r));if(n<=r)return i;let a=n-r,o=Math.sin(a*14)*Math.exp(-a/Math.max(.05,t.settle));return 1+t.riseOvershoot*o}_updateSpikes(e,t){let n=m.ice,r=m.global,i=Math.max(.02,n.birthFade),a=[0,0,0];for(let e=0;e<this._activeCount;e++){let o=this.records[e],s=e%O,l=e/O|0,u=this._emergence(o,n);if(u<0){L.position.set(0,-999,0),L.quaternion.identity(),L.scale.setScalar(1e-4),L.updateMatrix(),this.meshes[s].setMatrixAt(l,L.matrix),this.birthAttributes[s].array[l]=0,a[s]=Math.max(a[s],l+1);continue}let d=this._spikeHeight(o,n,r),f=this._spikeRadius(o,n,r);!o.shattered&&u>.25&&(o.shattered=!0,this._breachFx(o,n,r,f));let p=o.impact?Math.sign(Math.cos(o.angle))*o.radial:this._lateralNorm(o,n);P.copy(this.direction).multiplyScalar(.75).addScaledVector(this.side,p*.85),P.lengthSq()<1e-6&&P.copy(this.direction),P.normalize();let m=n.lean*(.35+.65*o.along)*(1+o.leanJitter*n.leanJitter*r.randomness);F.crossVectors(I,P).normalize(),z.setFromAxisAngle(F,m),R.setFromAxisAngle(I,o.yaw*n.twist),z.multiply(R);let h=Math.min(1,u);if(this._spikePosition(o,n,L.position),L.position.y=(u-1)*d*.85,t>0){let e=_.inCubic(t);L.position.y-=e*(d+f+.4)}L.quaternion.copy(z),L.scale.set(f,d,f).multiplyScalar(c(.86,1,h)),L.updateMatrix(),this.meshes[s].setMatrixAt(l,L.matrix),this.birthAttributes[s].array[l]=g(1-(this.age-o.eruptTime)/i),a[s]=Math.max(a[s],l+1)}for(let e=0;e<O;e++)this.meshes[e].count=a[e],this.meshes[e].instanceMatrix.needsUpdate=!0,this.birthAttributes[e].needsUpdate=!0}_syncUniforms(){let e=m.ice,t=m.global;this._syncGeometry(),this.material.userData.sync(),this.mist.setGradient(i(e.colorMistA),i(e.colorMistB),i(e.colorMistC),i(e.colorMistD)),this.mist.uniforms.uGravity.value.set(0,e.mistRise,0),this.mist.uniforms.uSizeScale.value=e.mistSize*t.particleSize,this.mist.uniforms.uLifeScale.value=e.mistLifetime*.5*t.particleLifetime,this.mist.uniforms.uSpeedScale.value=e.mistSpeed*t.particleSpeed,this.mist.uniforms.uOpacity.value=e.mistOpacity*t.opacity,this.mist.uniforms.uTurbulence.value=.4*t.turbulence,this.shards.setGradient(i(e.colorShardA),i(e.colorShardB),i(e.colorShardC),i(e.colorShardD)),this.shards.uniforms.uGravity.value.set(0,e.shardGravity,0),this.shards.uniforms.uSizeScale.value=e.shardSize*t.particleSize*7,this.shards.uniforms.uLifeScale.value=t.particleLifetime,this.shards.uniforms.uSpeedScale.value=t.particleSpeed,this.shards.uniforms.uOpacity.value=t.opacity,this.glitter.setGradient(i(e.colorSparkleA),i(e.colorSparkleB),i(e.colorSparkleC),i(e.colorSparkleD)),this.glitter.uniforms.uGravity.value.set(0,e.sparkleRise,0),this.glitter.uniforms.uSizeScale.value=e.sparkleSize*t.particleSize*7,this.glitter.uniforms.uLifeScale.value=e.sparkleLifetime*.5*t.particleLifetime,this.glitter.uniforms.uSpeedScale.value=t.particleSpeed,this.glitter.uniforms.uOpacity.value=t.opacity,this.glitter.uniforms.uGlow.value=.9*t.glow,this.glitter.uniforms.uTurbulence.value=e.sparkleTurbulence*t.turbulence}_breachFx(t,n,r,i){let a=e.uTime.value;this._spikePosition(t,n,M).setY(.08),j.position=M,j.radius=i*.8,j.direction=N.copy(this.direction).multiplyScalar(.35).setY(1).normalize(),j.speed=n.shardSpeed,j.speedVariance=.7,j.spread=.75,j.inherit=null,j.anchor=null,j.size=.1,j.sizeVariance=.7,j.life=n.shardLifetime,j.lifeVariance=.45,j.spin=7,j.tint=null,j.time=a,this.shards.emit(Math.round(n.breachShards*r.particleCount),j),Math.random()<.4&&(j.speed=.7,j.spread=1,j.size=.6,j.sizeVariance=.5,j.life=n.mistLifetime*.7,j.spin=.5,this.mist.emit(Math.round(2*r.particleCount),j))}_frontFx(t){let n=m.ice,r=m.global,a=e.uTime.value,o=this._halfWidth(this.u,n),s=Math.round(this.mistEmitter.tick(t,n.mistRate)*r.particleCount);s>0&&(j.position=M.copy(this.position).setY(.18),j.radius=o*.9,j.direction=N.set(0,1,0),j.speed=n.mistSpeed,j.speedVariance=.7,j.spread=1,j.inherit=null,j.anchor=null,j.size=.9,j.sizeVariance=.5,j.life=n.mistLifetime,j.lifeVariance=.4,j.spin=.5,j.tint=null,j.time=a,this.mist.emit(s,j));let c=Math.round(this.glitterEmitter.tick(t,n.sparkleRate)*r.particleCount);c>0&&(j.position=M.copy(this.position).setY(.5),j.radius=o,j.direction=N.set(0,1,0),j.speed=n.sparkleSpeed,j.speedVariance=.8,j.spread=.85,j.size=.09,j.sizeVariance=.6,j.life=n.sparkleLifetime,j.lifeVariance=.5,j.spin=0,j.time=a,this.glitter.emit(c,j));let l=1/Math.max(.1,n.frostRate);for(;this.front-this._frostDistance>=l;){this._frostDistance+=l;let e=g(this._frostDistance/this.length),t=this._halfWidth(e,n);this.pointAt(e,M),M.x+=this.side.x*h(-.7,.7)*t,M.z+=this.side.z*h(-.7,.7)*t,this.ctx.decals.spawn(C.FROST,M,{radius:t*n.frostSpread*h(.6,1.15),life:n.frostLife,width:n.frostCrystals,intensity:n.frostIntensity,colorA:i(n.colorFrost),colorB:i(n.colorFrostEdge)})}}onTravel(e){this._syncUniforms(),this._triggerUpTo(this.u,!1),this._updateSpikes(e,0),this._frontFx(e),this.ctx.shake.rumble(m.ice.rumble*m.global.cameraShake,e)}onImpact(){let t=m.ice,n=m.global,r=e.uTime.value;this._triggerUpTo(1,!0),this.pointAt(1,M).setY(.6),this.ctx.bursts.spawn(y.FROST,M,{radius:t.burstSize*.3,endRadius:t.burstSize*n.explosionIntensity,life:.95,intensity:t.burstIntensity,opacity:.85,fresnel:1.3,displace:.55,squash:.72,colorA:i(t.colorBurstA),colorB:i(t.colorBurstB),colorC:i(t.colorBurstC)}),this.ctx.decals.spawn(C.SHOCKWAVE,M,{radius:t.shockRadius*n.explosionIntensity,life:.75,width:.06,intensity:.9,colorA:i(t.colorShockA),colorB:i(t.colorShockB)}),this.ctx.decals.spawn(C.FROST,M,{radius:this._halfWidth(1,t)*t.frostSpread*2.2,life:t.frostLife*1.3,width:t.frostCrystals,intensity:t.frostIntensity,colorA:i(t.colorFrost),colorB:i(t.colorFrostEdge)}),j.position=M.setY(.4),j.radius=this._halfWidth(1,t)*.8,j.direction=N.set(0,1,0),j.speed=t.shardSpeed*1.8,j.speedVariance=.75,j.spread=.9,j.inherit=null,j.anchor=null,j.size=.16,j.sizeVariance=.8,j.life=t.shardLifetime*1.4,j.lifeVariance=.5,j.spin=9,j.tint=null,j.time=r,this.shards.emit(Math.round(t.burstShards*n.particleCount),j),j.speed=t.mistSpeed*2.4,j.spread=1,j.size=1.6,j.life=t.mistLifetime*1.5,j.spin=.6,this.mist.emit(Math.round(90*n.particleCount),j),j.speed=t.sparkleSpeed*1.6,j.spread=.8,j.size=.1,j.life=t.sparkleLifetime*1.3,j.spin=0,this.glitter.emit(Math.round(150*n.particleCount),j),this.ctx.shake.add(t.impactShake*n.explosionIntensity*n.cameraShake,1/Math.max(.1,t.shakeDuration),19),this.ctx.flash.trigger(i(t.colorFlash),t.impactFlash*n.explosionIntensity),this.lightBoost=t.lightIntensity*1.6*n.explosionIntensity}onFade(t){let n=m.ice;this._syncUniforms();let r=0;if(this.phase===w.FADE&&(r=g((this.fadeTime-n.shatterDelay)/Math.max(.05,n.sinkTime))),this._updateSpikes(t,r),r<.6){let r=m.global,i=e.uTime.value,a=Math.round(this.glitterEmitter.tick(t,n.sparkleRate*.35)*r.particleCount);a>0&&(this.pointAt(h(.25,1),M).setY(.35),j.position=M,j.radius=this._halfWidth(1,n),j.direction=N.set(0,1,0),j.speed=n.sparkleSpeed*.7,j.speedVariance=.8,j.spread=.9,j.inherit=null,j.anchor=null,j.size=.08,j.sizeVariance=.6,j.life=n.sparkleLifetime,j.lifeVariance=.5,j.spin=0,j.tint=null,j.time=i,this.glitter.emit(a,j))}}onDestroy(){this._activeCount=0;for(let e=0;e<O;e++)this.meshes[e].count=0}dispose(){for(let e of this.meshes)e.geometry.dispose(),e.dispose();this.material.dispose(),super.dispose()}};export{B as IceAbility};
//# sourceMappingURL=IceAbility-CXb_0coL.js.map