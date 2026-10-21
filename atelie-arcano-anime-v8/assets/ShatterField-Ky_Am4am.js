import{Br as e,G as t,K as n,Qt as r,V as i,di as a,en as o,jn as s,q as c,st as l,xt as u,zn as d}from"./settings-DdywqLlV.js";import{r as f}from"./GrowthField-BxvnSH9l.js";var p=new s,m=new a,h=new a;new a;var g=new a,_=new d,v=new a(0,1,0),y=new a,b=new a(0,0,1),x=new a(1,0,0),S=`
  attribute float aSeed;
  attribute float aLife;

  varying float vSeed;
  varying float vLife;
  varying vec3  vLocal;
  varying vec3  vNormalW;
  varying vec3  vViewDir;
  varying float vViewZ;

  void main() {
    vSeed  = aSeed;
    vLife  = aLife;
    vLocal = position;

    mat4 im = mat4(1.0);
    #ifdef USE_INSTANCING
      im = instanceMatrix;
    #endif

    vec4 world = modelMatrix * im * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * mat3(im) * normal);
    vViewDir = cameraPosition - world.xyz;

    vec4 mv = viewMatrix * world;
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,C=`
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorEdge;
  uniform vec3  uColorScene;
  uniform float uOpacity;
  uniform float uGlow;
  uniform float uRim;
  uniform float uRimPower;
  uniform float uShade;
  uniform float uAmbient;
  uniform float uFadeStart;
  uniform float uSoft;
  uniform float uSceneMix;
  uniform float uRefract;
  uniform float uSaturation;

  uniform vec3      uLightDir;
  uniform vec2      uResolution;
  uniform sampler2D uSceneDepth;
  uniform float     uCameraNear;
  uniform float     uCameraFar;
  uniform float     uGlobalGlow;
  uniform float     uShaderIntensity;

  #ifdef SHATTER_SCENE
    uniform sampler2D uScene;
  #endif

  varying float vSeed;
  varying float vLife;
  varying vec3  vLocal;
  varying vec3  vNormalW;
  varying vec3  vViewDir;
  varying float vViewZ;

  ${c}

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vViewDir);

    // Faceted debris, lit off the same key direction the stage uses so the
    // fragments do not read as stickers against the shadowed floor. Two-sided:
    // a shard is thin enough that you see its back face constantly.
    float lambert = max(dot(N, uLightDir), 0.0);
    if (dot(N, V) < 0.0) lambert = max(dot(-N, uLightDir), 0.0);
    float shade = mix(1.0, uAmbient + (1.0 - uAmbient) * lambert, uShade);

    float fres = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), uRimPower);

    vec3 body = mix(uColorA, uColorB, clamp(vLife, 0.0, 1.0)) * shade;

    #ifdef SHATTER_SCENE
      // Screen-space refraction: push the lookup along the surface normal, so a
      // fragment turned edge-on to the camera displaces what is behind it most.
      // The sample is deliberately *not* depth-corrected — it is a shard, not a
      // window, and paying for a correct parallax would buy nothing you can see.
      vec2 uv = gl_FragCoord.xy / uResolution + N.xy * uRefract;
      vec3 behind = texture2D(uScene, clamp(uv, vec2(0.002), vec2(0.998))).rgb;
      float grey = dot(behind, vec3(0.2126, 0.7152, 0.0722));
      behind = mix(vec3(grey), behind, uSaturation) * uColorScene;
      body = mix(body, behind, clamp(uSceneMix, 0.0, 1.0));
    #endif

    // The rim is the only emissive term. Scaling the *body* by the global glow
    // would brighten a lump of debris along with the sparks, and debris that
    // glows is the single fastest way to make a shatter read as confetti.
    vec3 color = body;
    color += uColorEdge * fres * uRim * uGlow * uGlobalGlow * mix(0.7, 1.0, uShaderIntensity);

    float alpha = uOpacity * (1.0 - smoothstep(uFadeStart, 1.0, clamp(vLife, 0.0, 1.0)));

    if (uSoft > 0.0) {
      vec2 screenUV = gl_FragCoord.xy / uResolution;
      alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoft);
    }

    if (alpha < 0.004) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;function w(){return{layout:f.LINE,origin:null,direction:null,side:null,length:10,centre:null,radius:4,width:1,spawnRadius:.5,spawnHeight:.4,speed:6,speedJitter:.6,spread:.45,upBias:.5,inherit:null,inheritScale:1,gravity:-18,drag:.8,size:.28,sizeJitter:.55,shrink:.7,shrinkPower:1.6,spin:9,spinJitter:.8,lifetime:1.4,floor:0,floorSpin:.25,randomness:1}}var T=class{constructor(e,t={}){let{geometry:n,variants:a=2,capacity:s=192,material:c=null,additive:l=!1,depthWrite:u=!0,layer:d=i.VFX,renderOrder:f=6,castShadow:p=!1,receiveShadow:m=!1}=t;if(typeof n!=`function`)throw Error(`ShatterField: options.geometry must be a factory`);this.parent=e,this.factory=n,this.variants=Math.max(1,Math.round(a)),this.capacity=Math.max(1,Math.round(s)),this.slots=Math.ceil(this.capacity/this.variants),this._ownsMaterial=!c,this.material=c??this._createMaterial(l,u),this.uniforms=this.material.uniforms??null,this.meshes=[],this.seedAttributes=[],this.lifeAttributes=[];for(let t=0;t<this.variants;t++){let n=new r(new Float32Array(this.slots),1),i=new r(new Float32Array(this.slots),1),a=this.factory(t);a.setAttribute(`aSeed`,n),a.setAttribute(`aLife`,i);let s=new o(a,this.material,this.slots);s.frustumCulled=!1,s.castShadow=p,s.receiveShadow=m,s.count=0,s.layers.set(d),s.renderOrder=f,e.add(s),this.meshes.push(s),this.seedAttributes.push(n),this.lifeAttributes.push(i)}this.records=[];for(let e=0;e<this.capacity;e++)this.records.push({born:-1,along:1,lateral:0,angle:0,radial:0,offX:0,offY:0,offZ:0,dirX:0,dirY:1,dirZ:0,axisX:0,axisY:1,axisZ:0,speedRoll:0,sizeRoll:0,spinRoll:0,seed:0});this._cursor=0,this._live=0,this._used=new Int32Array(this.variants),this._hasScene=!1,this._sceneOverride=!1}get count(){return this._live}get drawCalls(){return this.variants}_createMaterial(t,r){return new e({transparent:!0,depthWrite:r,depthTest:!0,side:2,blending:t?2:1,toneMapped:!1,defines:{},uniforms:n({uColorA:{value:new u(1,1,1)},uColorB:{value:new u(.4,.6,.8)},uColorEdge:{value:new u(1,1,1)},uColorScene:{value:new u(1,1,1)},uOpacity:{value:1},uGlow:{value:1},uRim:{value:.8},uRimPower:{value:2.4},uShade:{value:1},uAmbient:{value:.35},uFadeStart:{value:.6},uSoft:{value:0},uSceneMix:{value:.75},uRefract:{value:.05},uSaturation:{value:.3},uScene:{value:null}}),vertexShader:S,fragmentShader:C})}setSceneTexture(e){this._sceneOverride=!!e,this._bindScene(e??null)}_bindScene(e){if(!this.uniforms)return;let t=!!e;this.uniforms.uScene.value=e??null,t!==this._hasScene&&(this._hasScene=t,t?this.material.defines.SHATTER_SCENE=``:delete this.material.defines.SHATTER_SCENE,this.material.needsUpdate=!0)}sync(e){let n=this.uniforms;if(n&&(e.colorA&&n.uColorA.value.copy(e.colorA),e.colorB&&n.uColorB.value.copy(e.colorB),e.colorEdge&&n.uColorEdge.value.copy(e.colorEdge),e.colorScene&&n.uColorScene.value.copy(e.colorScene),n.uOpacity.value=e.opacity??1,n.uGlow.value=e.glow??1,n.uRim.value=e.rim??.8,n.uRimPower.value=e.rimPower??2.4,n.uShade.value=e.shade??1,n.uAmbient.value=e.ambient??.35,n.uFadeStart.value=e.fadeStart??.6,n.uSoft.value=e.soft??0,n.uSceneMix.value=e.sceneMix??.75,n.uRefract.value=e.refract??.05,n.uSaturation.value=e.saturation??.3,!this._sceneOverride)){let e=t.uSceneColor?t.uSceneColor.value:null;e!==n.uScene.value&&this._bindScene(e)}}burst(e,t,n=1,r=0){let i=Math.max(0,Math.round(t)),a=0;for(let t=0;t<i;t++){let t=this._cursor;this._cursor=(this._cursor+1)%this.capacity;let i=this.records[t];i.born=e,i.along=l(n),i.lateral=r,i.angle=Math.random(),i.radial=Math.sqrt(Math.random()),i.seed=Math.random()*10,i.speedRoll=Math.random()*2-1,i.sizeRoll=Math.random()*2-1,i.spinRoll=Math.random()*2-1,E(h),i.offX=h.x,i.offY=h.y,i.offZ=h.z,E(h),i.dirX=h.x,i.dirY=h.y,i.dirZ=h.z,E(h),i.axisX=h.x,i.axisY=h.y,i.axisZ=h.z;let o=t%this.variants,s=t/this.variants|0;this.seedAttributes[o].array[s]=i.seed,this.seedAttributes[o].needsUpdate=!0,a++}return a}clear(){for(let e=0;e<this.capacity;e++)this.records[e].born=-1;this._live=0,this._cursor=0;for(let e=0;e<this.variants;e++)this.meshes[e].count=0}_anchorOf(e,t,n){let r=t.layout??f.LINE,i=t.origin??y,a=t.direction??b,o=t.side??x;if(r===f.ZONE){let r=t.centre;r?n.copy(r):n.copy(i).addScaledVector(a,t.length??0);let o=e.angle*Math.PI*2,s=(t.radius??0)*e.radial*l(e.along);n.x+=Math.cos(o)*s,n.z+=Math.sin(o)*s}else n.copy(i).addScaledVector(a,e.along*(t.length??0)),n.addScaledVector(o,e.lateral*(t.width??0));n.y+=t.spawnHeight??0;let s=t.spawnRadius??0;return n.x+=e.offX*s,n.y+=e.offY*s,n.z+=e.offZ*s,n}_velocityOf(e,t,n){let r=t.randomness??1,i=l(t.spread??.45);h.set(e.dirX,e.dirY,e.dirZ),n.copy(t.direction??b),n.addScaledVector(v,t.upBias??0),n.lengthSq()<1e-8&&n.copy(v),n.normalize().lerp(h,i),n.lengthSq()<1e-8&&n.copy(h),n.normalize();let a=(t.speed??0)*(1+e.speedRoll*(t.speedJitter??0)*r);return n.multiplyScalar(a),t.inherit&&n.addScaledVector(t.inherit,t.inheritScale??1),n}_flight(e,t,n,r){this._anchorOf(e,t,r),this._velocityOf(e,t,m);let i=t.gravity??0,a=t.drag??0;if(a>.001){let e=(1-Math.exp(-a*n))/a,t=i/a;r.x+=m.x*e,r.z+=m.z*e,r.y+=(m.y-t)*e+t*n}else r.x+=m.x*n,r.z+=m.z*n,r.y+=m.y*n+.5*i*n*n;return r}positionOf(e,t,n,r){let i=this.records[e];return i.born<0?r.set(0,-999,0):this._flight(i,n,Math.max(0,t-i.born),r)}update(e,t){let n=this.variants,r=this._used;r.fill(0);let i=Math.max(.02,t.lifetime??1.4),a=t.randomness??1,o=t.floor??0,s=l(t.shrink??0),c=t.shrinkPower??1.6,u=0;for(let d=0;d<this.capacity;d++){let f=this.records[d],m=d%n,h=d/n|0,y=f.born<0?-1:e-f.born,b=y/i;if(y<0||b>=1){f.born>=0&&b>=1&&(f.born=-1),p.position.set(0,-999,0),p.quaternion.identity(),p.scale.setScalar(1e-4),p.updateMatrix(),this.meshes[m].setMatrixAt(h,p.matrix),this.lifeAttributes[m].array[h]=1,r[m]=Math.max(r[m],h+1);continue}let x=Math.max(.001,(t.size??.25)*(1+f.sizeRoll*(t.sizeJitter??0)*a))*(1-s*b**+c);this._flight(f,t,y,p.position);let S=o+x*.35,C=!1;p.position.y<S&&(p.position.y=S,C=!0);let w=(t.spin??0)*(1+f.spinRoll*(t.spinJitter??0)*a)*(C?l(t.floorSpin??.25):1);g.set(f.axisX,f.axisY,f.axisZ),g.lengthSq()<1e-8&&g.copy(v),g.normalize(),_.setFromAxisAngle(g,w*y),p.quaternion.copy(_),p.scale.setScalar(x),p.updateMatrix(),this.meshes[m].setMatrixAt(h,p.matrix),this.lifeAttributes[m].array[h]=b,r[m]=Math.max(r[m],h+1),u++}for(let e=0;e<n;e++)this.meshes[e].count=r[e],this.meshes[e].instanceMatrix.needsUpdate=!0,this.lifeAttributes[e].needsUpdate=!0;return this._live=u,u}dispose(){for(let e of this.meshes)e.geometry.dispose(),e.dispose(),e.parent?.remove(e);this.meshes.length=0,this._ownsMaterial&&this.material.dispose()}};function E(e){let t=Math.random()*2-1,n=Math.random()*Math.PI*2,r=Math.sqrt(Math.max(0,1-t*t));return e.set(Math.cos(n)*r,t,Math.sin(n)*r)}export{w as n,T as t};
//# sourceMappingURL=ShatterField-Ky_Am4am.js.map