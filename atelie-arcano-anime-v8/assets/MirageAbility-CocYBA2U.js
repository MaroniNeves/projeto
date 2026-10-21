import{Br as e,K as t,U as n,V as r,W as i,Y as a,di as o,o as s,q as c,st as l,tt as u}from"./settings-DdywqLlV.js";import{n as d,t as f}from"./Ability-CYesB5Ur.js";import{i as p,r as m,t as h}from"./TimeControl-iyWeiQb0.js";function g(){let n=t({uStrength:{value:.62},uPower:{value:1.35},uRipple:{value:.16},uRippleScale:{value:2.4},uRippleSpeed:{value:1.7},uOpacity:{value:.95},uDepthReject:{value:1},uDepthFade:{value:.3},uPerspective:{value:.35},uPerspectiveRef:{value:10},uFade:{value:1}}),r=new e({uniforms:n,transparent:!0,depthTest:!0,depthWrite:!1,side:2,blending:1,toneMapped:!1,vertexShader:`
      #include <common>
      #include <skinning_pars_vertex>

      varying vec3  vNormalV;
      varying vec3  vWorld;
      varying float vViewZ;
      varying float vOnScreen;

      void main() {
        vec3 objectNormal = normal;
        vec3 transformed = position;

        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <skinning_vertex>

        vec4 world = modelMatrix * vec4(transformed, 1.0);
        vWorld = world.xyz;

        vNormalV = normalize(normalMatrix * objectNormal);

        vec4 mv = viewMatrix * world;
        vViewZ = mv.z;

        vec4 clip = projectionMatrix * mv;
        // Behind the camera the projected xy is meaningless and the offset it
        // would encode is a mirror image of the right one. Gate it here rather
        // than clipping, so a double walking past the camera fades instead of
        // flipping inside out.
        vOnScreen = step(0.0, -mv.z);
        gl_Position = clip;
      }
    `,fragmentShader:`
      uniform float uStrength;
      uniform float uPower;
      uniform float uRipple;
      uniform float uRippleScale;
      uniform float uRippleSpeed;
      uniform float uOpacity;
      uniform float uDepthReject;
      uniform float uDepthFade;
      uniform float uPerspective;
      uniform float uPerspectiveRef;
      uniform float uFade;

      // From sharedUniforms(). That helper hands over the uniform *boxes*, by
      // identity, so one write per frame updates every material at once — but
      // it cannot declare them for you, and a missed declaration is a link
      // error that only ever shows up in a browser. The check harness never
      // compiles GLSL, so this is one of the few classes of fault it is
      // structurally unable to catch: put a new material on screen once.
      uniform float     uTime;
      uniform vec2      uResolution;
      uniform sampler2D uSceneDepth;
      uniform float     uCameraNear;
      uniform float     uCameraFar;
      uniform float     uShaderIntensity;

      varying vec3  vNormalV;
      varying vec3  vWorld;
      varying float vViewZ;
      varying float vOnScreen;

      ${a}
      ${c}

      void main() {
        // Two-sided, so flip the normal on the far wall or the back of the
        // figure bends the scene the opposite way to the front and the two
        // cancel almost exactly.
        vec3 hn = gl_FrontFacing ? vNormalV : -vNormalV;

        // Heat coming off a body: the ripple is sampled in WORLD space and
        // crawls upward, so it stays put on the world as the double moves
        // through it rather than swimming with the skin.
        vec3 wp = vec3(vWorld.xz * uRippleScale, vWorld.y * uRippleScale - uTime * uRippleSpeed);
        vec2 raw = hn.xy + vec2(fbm3(wp), fbm3(wp + vec3(23.1, 4.7, 17.5))) * uRipple;

        float rl = length(raw);
        vec2 dir = rl > 1e-6 ? raw / rl : vec2(0.0);

        // The silhouette bends hardest. max() on the base because pow() of a
        // negative is NaN at every exponent, and one NaN here is smeared over
        // the whole frame by the bloom blur.
        float rim = pow(max(1.0 - abs(hn.z), 0.0), uPower);
        float mag = uStrength * rim * min(rl, 2.0) * uFade;

        // The offset buffer has no depth of its own, so an emitter behind the
        // real character would happily warp him. The opaque prepass is already
        // in uSceneDepth for the soft particles and costs one sample here.
        vec2 screenUV = gl_FragCoord.xy / uResolution;
        float occluded = softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uDepthFade);
        float mask = mix(1.0, occluded, clamp(uDepthReject, 0.0, 1.0));

        mag *= mix(1.0, clamp(uPerspectiveRef / max(-vViewZ, 0.05), 0.0, 4.0), uPerspective);
        mag = clamp(mag * uShaderIntensity, 0.0, 8.0);

        float alpha = clamp(mask * uOpacity * uFade, 0.0, 1.0) * vOnScreen;
        if (alpha * mag < 0.0004) discard;

        gl_FragColor = vec4(clamp(dir, -1.0, 1.0) * 0.5 + 0.5, mag, alpha);
      }
    `});return r.userData.uniforms=n,r.userData.sync=e=>{let t=s.mirage;n.uStrength.value=t.bodyStrength,n.uPower.value=t.refractPower,n.uRipple.value=t.refractRipple,n.uRippleScale.value=t.refractRippleScale,n.uRippleSpeed.value=t.refractRippleSpeed,n.uOpacity.value=t.refractOpacity,n.uDepthReject.value=t.refractDepthReject,n.uDepthFade.value=t.refractDepthFade,n.uPerspective.value=t.refractPerspective,n.uPerspectiveRef.value=t.refractPerspectiveRef,n.uFade.value=e},r}var _=new o,v=class extends f{constructor(e){super(`mirage`,e)}createShaders(){this.skin=g(),this.rig=new h(this.group,{material:this.skin,layer:r.DISTORTION,renderOrder:0}),this.recorder=new m,this._bound=!1,this._writing=!1}createParticles(){}get impactDuration(){return Math.max(.05,s.mirage.lifetime*s.global.lifetime)}get fadeDuration(){return Math.max(.05,s.mirage.fadeTime)}get instanceCount(){return 0}_travelled(){let e=s.mirage;if(this.phase===d.TRAVEL)return this.front;let t=l(this._sinceArrival()/Math.max(.02,e.haltTime));return this.length+e.haltCoast*u.outCubic(t)}_sinceArrival(){return this.phase===d.IMPACT?this.impactTime:this.phase===d.FADE?this.impactDuration+this.fadeTime:0}_motion(){let e=s.mirage;if(this.phase===d.TRAVEL)return 1;let t=1-l(this._sinceArrival()/Math.max(.02,e.haltTime));return t*t}_setWriting(e){e!==this._writing&&(this._writing=e,this.rig.visible=e,e?i():n())}onSpawn(){if(!this._bound){let e=p(this.ctx?.scene??null);e&&this.rig.setSource(e)&&(this.recorder.attach(e),this._bound=!0)}this.recorder.clear(),this._setWriting(this._bound),this._sync(0)}_sync(e){let t=s.mirage,n=s.global,r=this.age;this._bound&&(e>0&&(this.recorder.sample(r,t),this.recorder.trim(r,t)),this.recorder.poseAt(Math.max(0,r-t.poseDelay),this.rig));let i=this._travelled();_.copy(this.origin).addScaledVector(this.direction,t.figureLead+i).addScaledVector(this.side,t.figureSide),_.y=0,this.rig.place(_,Math.atan2(this.direction.x,this.direction.z)),this.rig.setScale(Math.max(.05,t.figureScale));let a=this._motion(),o=t.stillness+(1-t.stillness)*a**+Math.max(.05,t.stopPower);this.skin.userData.sync(o);let c=this.skin.userData.uniforms;c.uRippleScale.value=t.refractRippleScale*n.noiseFrequency,c.uRippleSpeed.value=t.refractRippleSpeed*n.noiseSpeed,this.position.copy(_),this.position.y=t.figureScale*1.35}onTravel(e){this._sync(e),this.ctx.shake.rumble(s.mirage.rumble*s.global.cameraShake,e)}onImpact(){}onFade(e,t){this._sync(e),this.ctx.shake.rumble(s.mirage.rumble*this._motion()*s.global.cameraShake,e)}onDestroy(){this._setWriting(!1),this.recorder.clear()}dispose(){this._setWriting(!1),this.rig.dispose(),this.recorder.attach(null),super.dispose()}};export{v as MirageAbility};
//# sourceMappingURL=MirageAbility-CocYBA2U.js.map