import{Br as e,G as t,K as n,R as r,V as i,at as a,di as o,o as s,st as c,tt as l,xt as u,yn as d}from"./settings-DdywqLlV.js";import{t as f}from"./ParticleSystem-BZTczMT8.js";import{n as p}from"./ParticleEngine-DLxipNH0.js";import{n as m,t as h}from"./SceneHooks-DvEWF-72.js";import{n as g,t as _}from"./Ability-CYesB5Ur.js";import{r as v}from"./quads-DpYMEt67.js";var y=Math.PI*2,b={},x=new o,S=new o,C=new o;function w(){let t=n({uAnchor:{value:new o},uExtent:{value:1},uSquash:{value:1},uRingAt:{value:.77},uRimWidth:{value:.07},uWaver:{value:.03},uWaverSpeed:{value:.5},uSeed:{value:0},uRimOpacity:{value:.9},uInnerBias:{value:.6},uLipGain:{value:.5},uLipCeiling:{value:.6},uFade:{value:0},uColorRim:{value:new u},uColorLip:{value:new u}}),r=new e({name:`SilenceRim`,transparent:!0,depthWrite:!1,depthTest:!0,toneMapped:!0,uniforms:t,vertexShader:`
      uniform vec3  uAnchor;
      uniform float uExtent;
      uniform float uSquash;
      varying vec2  vRimUv;

      void main() {
        // Camera right and up, straight off the view matrix — no camera object
        // is needed on the CPU and the quad never has a matrix to update.
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 up    = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);

        vec2 q = position.xy;          // the shared upright quad, -0.5 .. 0.5
        vRimUv = q * 2.0;              // -1 .. 1, so length() is the radius

        vec3 offset = (right * q.x + up * q.y) * (uExtent * 2.0);
        // The hole is squashed in WORLD y, so the ring is too. Squashing the
        // billboard's own up-vector instead only agreed with the void when the
        // camera happened to be level.
        offset.y *= uSquash;
        gl_Position = projectionMatrix * viewMatrix * vec4(uAnchor + offset, 1.0);
      }
    `,fragmentShader:`
      uniform float uTime;
      uniform float uRingAt;
      uniform float uRimWidth;
      uniform float uWaver;
      uniform float uWaverSpeed;
      uniform float uSeed;
      uniform float uRimOpacity;
      uniform float uInnerBias;
      uniform float uLipGain;
      uniform float uLipCeiling;
      uniform float uFade;
      uniform vec3  uColorRim;
      uniform vec3  uColorLip;
      varying vec2  vRimUv;

      void main() {
        if (uFade <= 0.001) discard;

        float r = length(vRimUv);
        float bearing = atan(vRimUv.y, vRimUv.x);

        // Two incommensurate harmonics on the RADIUS. One alone reads as an
        // ellipse; three or more reads as a wobbling blob and the boundary
        // stops being a boundary.
        float wander = (sin(bearing * 3.0 + uSeed + uTime * uWaverSpeed) * 0.6 +
                        sin(bearing * 5.0 - uSeed - uTime * uWaverSpeed * 0.7) * 0.4) * uWaver;
        float ring = uRingAt + wander;

        float w = max(uRimWidth, 1e-4);
        float signed = r - ring;
        float band = 1.0 - smoothstep(0.0, w, abs(signed));
        if (band <= 0.002) discard;

        // The one lit term, and only on the OUTSIDE half. Light on the inside
        // half would be light inside the absence, which is the whole mistake.
        float lip = band * smoothstep(0.0, w * 0.9, signed) * uLipGain;
        lip = lip / (1.0 + lip / max(uLipCeiling, 1e-3));

        // The inside half is denser instead. A boundary should shade toward
        // what it is bounding.
        float inner = 1.0 - smoothstep(-w, 0.0, signed);

        vec3 colour = uColorRim + uColorLip * lip;
        float alpha = band * uRimOpacity * uFade * (1.0 + uInnerBias * inner);
        gl_FragColor = vec4(colour, clamp(alpha, 0.0, 1.0));
      }
    `});return r.userData.uniforms=t,r}var T=class extends _{constructor(e){super(`silence`,e)}createShaders(){this.rimMaterial=w(),this.rim=new d(v(),this.rimMaterial),this.rim.name=`SilenceRim`,this.rim.frustumCulled=!1,this.rim.matrixAutoUpdate=!1,this.rim.layers.set(i.VFX),this.rim.renderOrder=14,this.rim.visible=!1,this.group.add(this.rim),this.hole=null,this._seed=0}createParticles(){this.dust=this.ctx.particles.get(`silence.dust`,{capacity:1200,shape:f.SOFT,additive:!0,curl:!0,softFade:.5}),this.dust.uniforms.uDrag.value=.6,this.dust.uniforms.uEndSize.value=.3,this.dust.uniforms.uSizeIn.value=.08,this.dust.uniforms.uFadeIn.value=.12,this.dust.uniforms.uFadeOut.value=.45,this.dustEmitter=new p}get instanceCount(){return+!!this.rim.visible+ +!!this.hole}get impactDuration(){let e=s.silence;return Math.max(.1,(e.openTime+e.holdTime)*s.global.lifetime)}get fadeDuration(){let e=s.silence;return Math.max(.1,e.closeTime+e.settleTime)}lightShimmer(){return 1}_hubPoint(e){return this.pointAt(1,e).setY(s.silence.holeLift)}_radius(){let e=s.silence,t=Math.max(.01,e.zoneRadius);if(this.phase===g.TRAVEL)return 0;if(this.phase===g.FADE){let n=c(this.fadeTime/Math.max(.02,e.closeTime));return t*(1-l.inCubic(n))}let n=c(this.impactTime/Math.max(.02,e.openTime));return t*l.outCubic(n)*(1+e.openBounce*Math.sin(Math.PI*n))}_rimFade(){let e=s.silence;return this.phase===g.TRAVEL?e.rimTravel*c(this.u):this.phase===g.FADE?1-c((this.fadeTime-e.closeTime)/Math.max(.02,e.settleTime)):1}_ringRadius(){let e=s.silence;return this.phase===g.TRAVEL?Math.max(.01,e.zoneRadius)*a(e.gatherRadius,e.rimSwell,l.outQuad(c(this.u))):Math.max(.01,this._radius()*e.rimSwell)}_sync(){let e=s.silence,t=s.global;this._hubPoint(C);let n=this._radius();this.hole&&this.hole.atPoint(C).size(n,e.holeSquash).blend(c(e.holeWeight));let i=this.rimMaterial.uniforms,a=this._ringRadius(),o=Math.max(.02,a*Math.max(1.02,e.rimPad)),l=this._rimFade();i.uAnchor.value.copy(C),i.uExtent.value=o,i.uSquash.value=e.holeSquash,i.uRingAt.value=a/o,i.uRimWidth.value=e.rimWidth/o,i.uWaver.value=e.rimWaver/o,i.uWaverSpeed.value=e.rimWaverSpeed*t.noiseSpeed,i.uSeed.value=this._seed,i.uRimOpacity.value=e.rimOpacity*t.opacity,i.uInnerBias.value=e.rimInnerBias,i.uLipGain.value=e.lipGain*t.glow,i.uLipCeiling.value=e.lipCeiling,i.uFade.value=l,i.uColorRim.value.copy(r(e.colorRim)),i.uColorLip.value.copy(r(e.colorLip)),this.rim.visible=l>.001,this.dust.setGradient(r(e.colorDustA),r(e.colorDustB),r(e.colorDustC),r(e.colorDustD)),this.dust.uniforms.uGravity.value.set(0,e.dustRise,0),this.dust.uniforms.uSizeScale.value=e.dustSize*t.particleSize*7,this.dust.uniforms.uLifeScale.value=e.dustLifetime*.5*t.particleLifetime,this.dust.uniforms.uSpeedScale.value=t.particleSpeed,this.dust.uniforms.uOpacity.value=e.dustOpacity*t.opacity,this.dust.uniforms.uTurbulence.value=e.dustTurbulence*t.turbulence}_dustFx(e,n){let r=s.silence,i=s.global,a=Math.round(this.dustEmitter.tick(e,r.dustRate*n)*i.particleCount);if(a<=0)return;let o=Math.max(.05,this._radius()||r.zoneRadius*.6),c=Math.random()*y,l=o*Math.max(1.05,r.dustSpawn);this._hubPoint(C),S.set(Math.cos(c),0,Math.sin(c)),x.copy(C).addScaledVector(S,l),x.y=C.y+(Math.random()-.5)*o*1.4,b.position=x,b.radius=o*.25,b.direction=S.multiplyScalar(-1),b.speed=r.dustSpeed,b.speedVariance=.5,b.spread=.35,b.inherit=null,b.anchor=null,b.size=r.dustSize,b.sizeVariance=.6,b.life=r.dustLifetime,b.lifeVariance=.45,b.spin=0,b.tint=null,b.time=t.uTime.value,this.dust.emit(a,b)}onSpawn(){this.dustEmitter.reset(),this._seed=Math.random()*100,this.hole=this.borrow(m.acquire(h.HOLE,this)),this._sync()}onTravel(e){this._sync(),this.pointAt(this.u,this.position),this.position.y=s.silence.holeLift*.5,this.ctx.shake.rumble(s.silence.rumble*s.global.cameraShake,e)}onImpact(){let e=s.silence,t=s.global;this.ctx.flash.trigger(r(e.colorDim),e.castDim*t.explosionIntensity),this.ctx.shake.add(e.openShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),11)}onFade(e,t){this._sync(),this._hubPoint(this.position);let n=c(this._radius()/Math.max(.01,s.silence.zoneRadius));this._dustFx(e,n)}onDestroy(){m.reclaim(this),this.hole=null,this.rim.visible=!1,this.rimMaterial.uniforms.uFade.value=0}dispose(){this.rimMaterial.dispose(),super.dispose()}};export{T as SilenceAbility};
//# sourceMappingURL=SilenceAbility-XwVirOM2.js.map