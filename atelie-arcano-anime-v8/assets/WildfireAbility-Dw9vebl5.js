import{$t as e,Br as t,D as n,E as r,G as i,Gr as a,K as o,O as s,Qt as c,R as l,V as u,Y as d,_t as f,at as p,di as m,it as h,nt as g,o as _,q as v,st as y,tt as b,ui as x,xt as S,y as ee,yn as C}from"./settings-DdywqLlV.js";import{t as w}from"./ParticleSystem-BZTczMT8.js";import{n as T}from"./ParticleEngine-DLxipNH0.js";import{n as te,t as ne}from"./Ability-CYesB5Ur.js";import{n as re,r as E,t as D}from"./GroundField-aLIZg3d3.js";var O=`
  uniform vec3  uCentre;      // world, on the floor, the middle of the zone
  uniform vec3  uForward;     // unit, downrange (lattice +y)
  uniform vec3  uSideAxis;    // unit, lateral (lattice +x)
  uniform float uGrid;        // cells across — a count, not a measurement
  uniform float uPitch;       // metres between cell centres
  uniform float uJitter;      // metres of per-cell placement slop
  uniform float uLift;        // metres above the floor
  uniform float uNow;         // the ability's age, seconds

  attribute vec2  aCell;      // lattice coordinate
  attribute vec2  aJitter;    // two dice rolls, -1..1
  attribute float aSeed;      // dice roll
  attribute float aFuel;      // 0..1 fuel this cell had when it caught
  attribute float aIgnite;    // timestamp it caught, or negative

  /** Lattice coordinate to metres in the zone's own frame. */
  vec2 cellOffset(vec2 cell) {
    return (cell - (uGrid - 1.0) * 0.5) * uPitch + aJitter * uJitter;
  }

  vec3 cellCentre(vec2 cell) {
    vec2 o = cellOffset(cell);
    return uCentre + uSideAxis * o.x + uForward * o.y;
  }
`,k=`
  ${O}

  uniform float uCellSize;    // metres, the drawn width of a cell

  varying vec2  vLocal;       // -1..1 within the cell
  varying vec3  vWorld;
  varying float vAge;         // seconds since this cell caught
  varying float vFuel;
  varying float vSeed;
  varying float vViewZ;

  void main() {
    if (aIgnite < 0.0) {
      vLocal = vec2(0.0);
      vWorld = vec3(0.0);
      vAge = -1.0;
      vFuel = 0.0;
      vSeed = 0.0;
      vViewZ = -1.0;
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }

    vec2 local = position.xz * uCellSize;
    vec3 world = cellCentre(aCell) + uSideAxis * local.x + uForward * local.y;
    world.y = uLift;

    vLocal = position.xz * 2.0;
    vWorld = world;
    vAge = uNow - aIgnite;
    vFuel = aFuel;
    vSeed = aSeed;

    vec4 mv = modelViewMatrix * vec4(world, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,A=`
  uniform vec2      uResolution;
  uniform sampler2D uSceneDepth;
  uniform float     uCameraNear;
  uniform float     uCameraFar;
  uniform float     uGlobalGlow;

  uniform float uBlock;       // 0 a disc, 1 a square — how visible the lattice is
  uniform float uRough;       // 0..1 noise chewed out of the cell's edge
  uniform float uRoughScale;  // features per metre on that noise
  uniform float uCatchTime;   // seconds a cell takes to come up to full heat
  uniform float uBurnTime;    // seconds a cell with full fuel burns for
  uniform float uCharTime;    // seconds the char takes to blacken
  uniform float uAshTime;     // seconds after burnout the ash takes to grey over
  uniform float uVein;        // 0..1 how much of the ember is vein rather than wash
  uniform float uOpacity;
  uniform float uGlow;
  uniform float uFade;
  uniform float uSoftFade;    // metres of depth feather

  uniform vec3 uColorFlash;   // the moment it catches
  uniform vec3 uColorEmber;
  uniform vec3 uColorChar;
  uniform vec3 uColorAsh;

  varying vec2  vLocal;
  varying vec3  vWorld;
  varying float vAge;
  varying float vFuel;
  varying float vSeed;
  varying float vViewZ;

  ${d}
  ${v}

  /** Rounded box, in the cell's own -1..1 space. */
  float sdCell(vec2 p, float corner) {
    vec2 q = abs(p) - vec2(1.0) + corner;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - corner;
  }

  void main() {
    if (vAge < 0.0 || uFade < 0.004) discard;

    float corner = clamp(1.0 - uBlock, 0.0, 1.0);
    float sd = sdCell(vLocal, corner);
    // Chewed in world metres, so neighbouring cells erode into each other and
    // the burn stops being a mosaic of identical tiles.
    sd += (snoise(vec3(vWorld.xz * max(uRoughScale, 0.01), vSeed * 5.3)) * 0.5) * uRough;

    float cover = 1.0 - smoothstep(-0.12, 0.06, sd);
    if (cover < 0.004) discard;

    // How long this cell burns is its own fuel times a live setting: a rich
    // cell is a long, hot burn, a starved one flares and dies. Drag the burn
    // time on a paused fire and every cell re-times at once.
    float burn = max(vFuel, 0.05) * max(uBurnTime, 0.05);
    float rise = smoothstep(0.0, max(uCatchTime, 1e-3), vAge);
    float heat = rise * (1.0 - smoothstep(burn * 0.55, burn, vAge));
    float soot = 1.0 - exp(-vAge / max(uCharTime, 0.05));
    float ash = smoothstep(burn, burn + max(uAshTime, 0.05), vAge);

    float grain = snoise(vec3(vWorld.xz * max(uRoughScale, 0.01) * 2.7, vSeed * 17.0)) * 0.5 + 0.5;
    float vein = mix(1.0, smoothstep(0.45 - uVein * 0.35, 0.8, grain), clamp(uVein, 0.0, 1.0));

    vec3 colour = mix(uColorChar, uColorAsh, ash);
    colour = mix(uColorChar, colour, soot);
    colour += uColorEmber * heat * vein * uGlow * uGlobalGlow;
    // The catch itself: a hard white flick on the frame a cell takes, which is
    // what makes the front read as a chain of ignitions rather than a wipe.
    colour += uColorFlash * exp(-pow(vAge / max(uCatchTime * 1.4, 1e-3), 2.0)) * uGlow * uGlobalGlow;

    float alpha = cover * uOpacity * uFade;
    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 1.0));
  }
`,j=`
  ${O}

  uniform float uHeight;      // metres at full heat on a full-fuel cell
  uniform float uWidth;       // metres, half-width at the base
  uniform float uCatchTime;   // seconds a cell takes to come up to full heat
  uniform float uBurnTime;    // seconds a cell with full fuel burns for
  uniform float uLean;        // metres the crown leans downwind
  uniform vec2  uWind;        // unit-ish, in the lattice frame
  uniform float uWaver;       // metres of sway at the crown
  uniform float uWaverRate;   // sways per second

  varying vec2  vQuad;        // x: -1..1 across, y: 0..1 up
  varying vec3  vWorld;
  varying float vHeat;
  varying float vSeed;
  varying float vViewZ;

  void main() {
    float age = uNow - aIgnite;
    float burn = max(aFuel, 0.05) * max(uBurnTime, 0.05);
    float heat = aIgnite < 0.0
      ? 0.0
      : smoothstep(0.0, max(uCatchTime, 1e-3), age) * (1.0 - smoothstep(burn * 0.5, burn, age));

    if (heat < 0.01) {
      vQuad = vec2(0.0);
      vWorld = vec3(0.0);
      vHeat = 0.0;
      vSeed = 0.0;
      vViewZ = -1.0;
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }

    vec3 base = cellCentre(aCell);
    base.y = uLift;

    // Cylindrical billboard: the camera's right, flattened into the floor plane.
    // A full billboard tips the whole front over as the camera orbits, which
    // reads as the wind following you around the room.
    vec3 camRight = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]) + vec3(1e-5, 0.0, 0.0));
    vec3 windDir = uSideAxis * uWind.x + uForward * uWind.y;

    float h = position.y + 0.5;
    float across = position.x * 2.0;
    float grow = heat * (0.45 + 0.55 * aFuel);
    float sway = sin(uNow * uWaverRate + aSeed * 6.2831) * uWaver * h * h;

    vec3 world = base
      + camRight * (across * uWidth * grow + sway)
      + vec3(0.0, h * uHeight * grow, 0.0)
      + windDir * (uLean * h * h * grow);

    vQuad = vec2(across, h);
    vWorld = world;
    vHeat = heat;
    vSeed = aSeed;

    vec4 mv = modelViewMatrix * vec4(world, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,M=`
  uniform vec2      uResolution;
  uniform sampler2D uSceneDepth;
  uniform float     uCameraNear;
  uniform float     uCameraFar;
  uniform float     uGlobalGlow;
  uniform float     uTime;

  uniform float uTaper;
  uniform float uBulge;
  uniform float uNoiseScale;
  uniform float uNoiseSpeed;
  uniform float uErosion;
  uniform float uOpacity;
  uniform float uGlow;
  uniform float uFade;
  uniform float uSoftFade;

  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform vec3 uColorD;

  varying vec2  vQuad;
  varying vec3  vWorld;
  varying float vHeat;
  varying float vSeed;
  varying float vViewZ;

  ${d}
  ${v}

  void main() {
    if (vHeat < 0.01 || uFade < 0.004) discard;

    float h = clamp(vQuad.y, 0.0, 1.0);
    float profile = pow(1.0 - h, max(uTaper, 0.05)) * (1.0 + uBulge * sin(h * 3.14159265));
    float body = 1.0 - abs(vQuad.x) / max(profile, 1e-3);
    if (body <= 0.0) discard;

    // World-space field: two cells side by side flicker independently, which is
    // the difference between a fire front and a row of identical sprites.
    float n = fbm3(vec3(vWorld.xz * uNoiseScale, vWorld.y * uNoiseScale - uTime * uNoiseSpeed) + vSeed * 7.0);
    float shape = body - uErosion * (0.5 + 0.5 * n) * h;

    float alpha = smoothstep(0.0, 0.3, shape) * vHeat * uOpacity * uFade;
    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.004) discard;

    vec3 colour = gradient4(uColorA, uColorB, uColorC, uColorD, clamp(h * 0.9 + (1.0 - shape) * 0.25, 0.0, 1.0));
    colour *= uGlow * uGlobalGlow * mix(0.55, 1.0, vHeat);

    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 1.0));
  }
`;function N(){return{uCentre:{value:new m},uForward:{value:new m(0,0,1)},uSideAxis:{value:new m(1,0,0)},uGrid:{value:24},uPitch:{value:.4},uJitter:{value:.06},uLift:{value:.014},uNow:{value:0}}}function P(e,t){let n=new Float32Array(e*2),r=new Float32Array(e*2),i=new Float32Array(e),a=new Float32Array(e),o=new Float32Array(e);for(let s=0;s<e;s++)n[s*2]=s%t,n[s*2+1]=Math.floor(s/t),r[s*2]=Math.random()*2-1,r[s*2+1]=Math.random()*2-1,i[s]=Math.random()*100,a[s]=0,o[s]=-1;return{aCell:new c(n,2),aJitter:new c(r,2),aSeed:new c(i,1),aFuel:new c(a,1),aIgnite:new c(o,1)}}function F(t,n){let r=new e,i=n?new Float32Array([-.5,0,-.5,.5,0,-.5,.5,0,.5,-.5,0,.5]):new Float32Array([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0]);r.setAttribute(`position`,new f(i,3)),r.setIndex(new f(new Uint16Array([0,1,2,0,2,3]),1));for(let[e,n]of Object.entries(t))r.setAttribute(e,n);return r.instanceCount=0,r.boundingSphere=new a(new m,1e4),r}function I(e){return F(e,!0)}function L(e){return F(e,!1)}function R(e){return new t({name:`Wildfire:cells`,vertexShader:k,fragmentShader:A,transparent:!0,depthWrite:!1,depthTest:!0,blending:1,toneMapped:!1,uniforms:o({...e,uCellSize:{value:.42},uBlock:{value:.55},uRough:{value:.45},uRoughScale:{value:2.6},uCatchTime:{value:.22},uBurnTime:{value:2.2},uCharTime:{value:.6},uAshTime:{value:2},uVein:{value:.55},uOpacity:{value:1},uGlow:{value:2},uFade:{value:1},uSoftFade:{value:.3},uColorFlash:{value:new S(1,.95,.8)},uColorEmber:{value:new S(1,.42,.1)},uColorChar:{value:new S(.07,.05,.05)},uColorAsh:{value:new S(.34,.31,.3)}})})}function z(e){return new t({name:`Wildfire:flames`,vertexShader:j,fragmentShader:M,transparent:!0,depthWrite:!1,depthTest:!0,blending:2,toneMapped:!1,uniforms:o({...e,uHeight:{value:.85},uWidth:{value:.16},uCatchTime:{value:.22},uBurnTime:{value:2.2},uLean:{value:.3},uWind:{value:new x(0,1)},uWaver:{value:.05},uWaverRate:{value:3.6},uTaper:{value:1.25},uBulge:{value:.5},uNoiseScale:{value:2.1},uNoiseSpeed:{value:2.6},uErosion:{value:.95},uOpacity:{value:1},uGlow:{value:1.6},uFade:{value:1},uSoftFade:{value:.4},uColorA:{value:new S(1,.94,.72)},uColorB:{value:new S(1,.58,.14)},uColorC:{value:new S(.78,.18,.04)},uColorD:{value:new S(.1,.08,.08)}})})}function B(e,t,n,r,i){let a=e.uniforms;return a.uColorA.value.copy(l(t)),a.uColorB.value.copy(l(n)),a.uColorC.value.copy(l(r)),a.uColorD.value.copy(l(i)),e}var V=30,H=V*V,ie=0,U=1,W=2,G=new Int8Array([1,0,-1,0,0,1,0,-1,1,1,1,-1,-1,1,-1,-1]),ae=[1,1,1,1,.7071,.7071,.7071,.7071],K={},q=new m,J=new m,Y=new m,X=new m,Z=E();function Q(e,t,n){return h(e*157.31+t*311.7+n*13.7)}function $(e,t,n){let r=Math.floor(e),i=Math.floor(t),a=e-r,o=t-i,s=a*a*(3-2*a),c=o*o*(3-2*o),l=Q(r,i,n),u=Q(r+1,i,n),d=Q(r,i+1,n),f=Q(r+1,i+1,n);return p(p(l,u,s),p(d,f,s),c)}var oe=class extends ne{constructor(e){super(`wildfire`,e)}createShaders(){this.placement=N(),this.attributes=P(H,V),this.cellGeometry=I(this.attributes),this.cellMaterial=R(this.placement),this.cellMesh=new C(this.cellGeometry,this.cellMaterial),this.cellMesh.frustumCulled=!1,this.cellMesh.matrixAutoUpdate=!1,this.cellMesh.layers.set(u.VFX),this.cellMesh.renderOrder=7,this.group.add(this.cellMesh),this.flameGeometry=L(this.attributes),this.flameMaterial=z(this.placement),this.flameMesh=new C(this.flameGeometry,this.flameMaterial),this.flameMesh.frustumCulled=!1,this.flameMesh.matrixAutoUpdate=!1,this.flameMesh.layers.set(u.VFX),this.flameMesh.renderOrder=12,this.group.add(this.flameMesh),this.pall=new s({hull:r.CYLINDER,medium:n.FLAME,prefix:`pall`,maxSteps:40,renderOrder:13}),this.group.add(this.pall.mesh),this.scorch=new D(this.group,{mode:re.POCK,marks:14,additive:!1,name:`Wildfire:scorch`}),this.scorch.setVisible(!1),this._state=new Uint8Array(H),this._fuel=new Float32Array(H),this._grid=V,this._cells=0,this._clock=0,this._burning=0,this._centroidX=0,this._centroidY=0,this._extent=0,this._seed=0}createParticles(){let e=this.ctx.particles;this.motes=e.get(`wildfire.motes`,{capacity:2400,shape:w.SOFT,additive:!0,curl:!0,softFade:.35}),this.motes.uniforms.uDrag.value=1.2,this.motes.uniforms.uEndSize.value=.2,this.motes.uniforms.uSizeIn.value=.05,this.motes.uniforms.uFadeIn.value=.07,this.motes.uniforms.uFadeOut.value=.4,this.smoke=e.get(`wildfire.smoke`,{capacity:2e3,shape:w.SMOKE,additive:!1,curl:!0,softFade:1.2}),this.smoke.uniforms.uDrag.value=1.9,this.smoke.uniforms.uEndSize.value=3.4,this.smoke.uniforms.uSizeIn.value=.12,this.smoke.uniforms.uFadeIn.value=.18,this.smoke.uniforms.uFadeOut.value=.32,this.moteEmitter=new T,this.smokeEmitter=new T}get instanceCount(){return this._burning}get impactDuration(){return Math.max(.1,_.wildfire.holdTime*_.global.lifetime)}get fadeDuration(){return Math.max(.1,_.wildfire.smoulderTime)}lightShimmer(){let e=_.wildfire,t=Math.floor(this.age*Math.max(1,e.lightFlickerSpeed)),n=Math.abs(Math.sin(t*78.233)*43758.5453)%1;return 1-y(e.lightFlicker)*n}_pitch(){return 2*Math.max(.2,_.wildfire.zoneRadius)/this._grid}_centrePoint(e){return this.pointAt(1,e).setY(0)}_cellPoint(e,t){let n=_.wildfire,r=this._pitch(),i=this.attributes.aJitter.array,a=this.attributes.aCell.array,o=(this._grid-1)*.5,s=(a[e*2]-o)*r+i[e*2]*r*n.cellJitter,c=(a[e*2+1]-o)*r+i[e*2+1]*r*n.cellJitter;return this._centrePoint(t),t.addScaledVector(this.side,s).addScaledVector(this.direction,c),t.y=n.cellLift,t}_windX(){let e=_.wildfire;return Math.sin(e.windAngle)*e.windBias}_windY(){let e=_.wildfire;return Math.cos(e.windAngle)*e.windBias}_rollFuel(){let e=_.wildfire,t=this._grid,n=Math.max(.2,e.fuelScale)/t;for(let r=0;r<t;r++)for(let i=0;i<t;i++){let a=r*t+i,o=i/(t-1)*2-1,s=r/(t-1)*2-1;if(o*o+s*s>1){this._fuel[a]=0;continue}let c=$(i*n,r*n,this._seed),l=$(i*n*2.7+11.3,r*n*2.7-7.1,this._seed+3);this._fuel[a]=y(c*.68+l*.32+e.fuelBias)}}_catch(e,t){let n=this.attributes.aIgnite.array,r=this.attributes.aFuel.array;this._state[e]=U,r[e]=this._fuel[e],n[e]=t,this.attributes.aIgnite.needsUpdate=!0,this.attributes.aFuel.needsUpdate=!0}_generation(e,t){let n=_.wildfire,r=this._grid,i=this._state,a=this.attributes.aIgnite.array,o=this.attributes.aFuel.array,s=Math.max(.05,n.burnTime*_.global.lifetime),c=y(n.spread)*y(t),l=this._windX(),u=this._windY(),d=n.fuelFloor;for(let f=0;f<r;f++)for(let p=0;p<r;p++){let m=f*r+p;if(i[m]!==U||a[m]===e)continue;for(let t=0;t<8;t++){let a=G[t*2],o=G[t*2+1],s=p+a,m=f+o;if(s<0||m<0||s>=r||m>=r)continue;let h=m*r+s;if(i[h]===U)continue;let g=this._fuel[h];if(g<d)continue;let _=c*g;if(t>=4&&(_*=n.diagonalBias),_*=1+(a*l+o*u)*ae[t],i[h]===W){if(g<n.reburnFloor)continue;_*=n.reburnChance}Math.random()<_&&this._catch(h,e)}Math.random()<n.spotChance*y(t)&&this._spotFire(p,f,e);let h=Math.max(o[m],.05)*s;e-a[m]>=h&&(i[m]=W,this._fuel[m]*=1-y(n.consume))}}_spotFire(e,t,n){let r=_.wildfire,a=this._grid,o=this._windX(),s=this._windY(),c=Math.abs(o)+Math.abs(s)<.001?Math.random()*Math.PI*2:Math.atan2(s,o)+(Math.random()-.5)*1.7,l=2+Math.floor(Math.random()*Math.max(1,Math.round(r.spotRange))),u=Math.round(e+Math.cos(c)*l),d=Math.round(t+Math.sin(c)*l);if(u<0||d<0||u>=a||d>=a)return;let f=d*a+u;if(this._state[f]===U||this._fuel[f]<r.fuelFloor)return;this._catch(f,n);let p=(a-1)*.5;this.scorch.mark(g((u-p)/p,-1,1),g((d-p)/p,-1,1),i.uTime.value,1)}_advance(e,t){if(e<=0)return;let n=1/Math.max(1,_.wildfire.tickRate);this._clock+=e;let r=6;for(;this._clock>=n&&r-->0;)this._clock-=n,this._generation(this.age,t);this._clock>n&&(this._clock=0)}_measureFront(){let e=this._grid,t=this._state,n=0,r=0,i=0;for(let a=0;a<this._cells;a++)t[a]===U&&(n++,r+=a%e,i+=a/e|0);if(this._burning=n,n===0){this._extent=0;return}this._centroidX=r/n,this._centroidY=i/n;let a=0;for(let n=0;n<this._cells;n++){if(t[n]!==U)continue;let r=n%e-this._centroidX,i=(n/e|0)-this._centroidY,o=Math.sqrt(r*r+i*i);o>a&&(a=o)}this._extent=a}_randomBurning(){if(this._burning<=0)return-1;let e=Math.floor(Math.random()*this._burning);for(let t=0;t<this._cells;t++)if(this._state[t]===U&&e--<=0)return t;return-1}onSpawn(){let e=_.wildfire;this.moteEmitter.reset(),this.smokeEmitter.reset(),this.scorch.clearMarks(),this.scorch.setVisible(!1),this._seed=Math.random()*100,this._grid=g(Math.round(e.grid),8,V),this._cells=this._grid*this._grid,this._clock=0,this._burning=0,this._centroidX=(this._grid-1)*.5,this._centroidY=(this._grid-1)*.5,this._extent=0;let t=this.attributes.aCell.array,n=this.attributes.aIgnite.array,r=this.attributes.aFuel.array;for(let e=0;e<H;e++)t[e*2]=e%this._grid,t[e*2+1]=e/this._grid|0,n[e]=-1,r[e]=0,this._state[e]=ie,this._fuel[e]=0;this.attributes.aCell.needsUpdate=!0,this.attributes.aIgnite.needsUpdate=!0,this.attributes.aFuel.needsUpdate=!0,this._rollFuel(),this._sync(1),this._castFx()}_sync(e){this._centrePoint(Y),this._measureFront(),this.cellGeometry.instanceCount=this._cells,this.flameGeometry.instanceCount=this._cells,this._syncPlacement(),this._syncCells(e),this._syncFlames(e),this._syncPall(e),this._syncScorch(e),this._syncParticles()}_syncPlacement(){let e=_.wildfire,t=this.placement,n=this._pitch();t.uCentre.value.copy(Y),t.uForward.value.copy(this.direction),t.uSideAxis.value.copy(this.side),t.uGrid.value=this._grid,t.uPitch.value=n,t.uJitter.value=n*e.cellJitter,t.uLift.value=e.cellLift,t.uNow.value=this.age}_syncCells(e){let t=_.wildfire,n=_.global,r=this.cellMaterial.uniforms;r.uCellSize.value=this._pitch()*t.cellFill,r.uBlock.value=y(t.blockiness),r.uRough.value=t.cellRough*n.noiseStrength,r.uRoughScale.value=t.cellRoughScale*n.noiseFrequency,r.uCatchTime.value=t.catchTime,r.uBurnTime.value=t.burnTime*n.lifetime,r.uCharTime.value=t.charTime,r.uAshTime.value=t.ashTime,r.uVein.value=t.cellVein,r.uOpacity.value=t.cellOpacity*n.opacity,r.uGlow.value=t.cellGlow*n.glow,r.uFade.value=e,r.uSoftFade.value=t.cellSoftFade,r.uColorFlash.value.copy(l(t.colorFlash)),r.uColorEmber.value.copy(l(t.colorEmber)),r.uColorChar.value.copy(l(t.colorChar)),r.uColorAsh.value.copy(l(t.colorAsh))}_syncFlames(e){let t=_.wildfire,n=_.global,r=this.flameMaterial.uniforms;r.uHeight.value=t.flameHeight,r.uWidth.value=t.flameWidth,r.uCatchTime.value=t.catchTime,r.uBurnTime.value=t.burnTime*n.lifetime,r.uLean.value=t.flameLean,r.uWind.value.set(this._windX(),this._windY()),r.uWaver.value=t.flameWaver,r.uWaverRate.value=t.flameWaverRate,r.uTaper.value=t.flameTaper,r.uBulge.value=t.flameBulge,r.uNoiseScale.value=t.flameNoiseScale*n.noiseFrequency,r.uNoiseSpeed.value=t.flameNoiseSpeed*n.noiseSpeed,r.uErosion.value=t.flameErosion*n.noiseStrength,r.uOpacity.value=t.flameOpacity*n.opacity,r.uGlow.value=t.flameGlow*n.glow,r.uFade.value=e,r.uSoftFade.value=t.flameSoftFade,B(this.flameMaterial,t.colorFlameA,t.colorFlameB,t.colorFlameC,t.colorFlameD)}_syncPall(e){let t=_.wildfire,n=_.global;if(this._burning<=0){this.pall.setFade(0).sync(t,n);return}let r=this._pitch(),i=(this._grid-1)*.5;X.copy(Y).addScaledVector(this.side,(this._centroidX-i)*r).addScaledVector(this.direction,(this._centroidY-i)*r);let a=Math.max(1,t.pallSlack)/Math.max(.2,1-t.pallMargin),o=Math.max(r,(this._extent+1)*r*t.pallSpread),s=y(this._burning/Math.max(1,t.pallCells));this.pall.place(X).setSize(o*a,t.pallHeight*a,o*a).setFade(e*s).sync(t,n)}_syncScorch(e){let t=_.wildfire,n=_.global;Z.centre=Y,Z.yaw=Math.atan2(this.direction.x,this.direction.z),Z.height=t.spotHeight,Z.radius=Math.max(.2,t.zoneRadius),Z.grow=1,Z.recede=0,Z.fade=e,Z.seed=this._seed,Z.edge=t.spotEdge,Z.ragged=t.spotRagged,Z.raggedScale=t.spotRaggedScale,Z.warp=t.spotWarp,Z.relief=t.spotRelief,Z.normalStep=t.spotNormalStep,Z.ambient=t.spotAmbient,Z.wrap=t.spotWrap,Z.specular=t.spotSpecular,Z.gloss=t.spotGloss,Z.parallax=t.spotParallax,Z.depth=t.spotDepth,Z.lift=t.spotLift,Z.markLife=t.spotMarkLife,Z.markRadius=t.spotMarkRadius,Z.additive=!1,Z.emissive=t.spotEmissive,Z.opacity=t.spotOpacity,Z.depthFade=t.spotDepthFade,Z.colorBase=t.colorSpotBase,Z.colorEdge=t.colorSpotEdge,Z.colorGlow=t.colorSpotGlow,Z.colorDeep=t.colorSpotDeep,Z.noiseStrength=n.noiseStrength,Z.noiseFrequency=n.noiseFrequency,Z.noiseSpeed=n.noiseSpeed,Z.opacityScale=n.opacity,this.scorch.update(Z),this.scorch.setVisible(this.phase!==te.TRAVEL&&e>.004)}_syncParticles(){let e=_.wildfire,t=_.global;this.motes.setGradient(l(e.colorMoteA),l(e.colorMoteB),l(e.colorMoteC),l(e.colorMoteD)),this.motes.uniforms.uGravity.value.set(0,e.moteRise,0),this.motes.uniforms.uSizeScale.value=e.moteSize*t.particleSize*7,this.motes.uniforms.uLifeScale.value=e.moteLifetime*.5*t.particleLifetime,this.motes.uniforms.uSpeedScale.value=t.particleSpeed,this.motes.uniforms.uOpacity.value=t.opacity,this.motes.uniforms.uGlow.value=e.moteGlow*t.glow,this.motes.uniforms.uTurbulence.value=e.moteTurbulence*t.turbulence,this.smoke.setGradient(l(e.colorSmokeA),l(e.colorSmokeB),l(e.colorSmokeC),l(e.colorSmokeD)),this.smoke.uniforms.uGravity.value.set(0,e.smokeRise,0),this.smoke.uniforms.uSizeScale.value=e.smokeSize*t.particleSize,this.smoke.uniforms.uLifeScale.value=e.smokeLifetime*.5*t.particleLifetime,this.smoke.uniforms.uSpeedScale.value=e.smokeSpeed*t.particleSpeed,this.smoke.uniforms.uOpacity.value=e.smokeOpacity*t.opacity,this.smoke.uniforms.uTurbulence.value=.35*t.turbulence}_castFx(){let e=_.wildfire,t=_.global;q.copy(this.origin).addScaledVector(this.direction,e.handForward),q.y=e.handHeight,K.position=q,K.radius=.18,K.direction=J.copy(this.direction).multiplyScalar(.8).setY(.4).normalize(),K.speed=e.moteSpeed*3,K.speedVariance=.8,K.spread=.7,K.inherit=null,K.anchor=null,K.size=.09,K.sizeVariance=.7,K.life=e.moteLifetime*.6,K.lifeVariance=.5,K.spin=0,K.tint=null,K.time=i.uTime.value,this.motes.emit(Math.round(18*t.particleCount),K),this.ctx.flash.trigger(l(e.colorCastFlash),e.castFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.3*t.explosionIntensity}_frontFx(e,t){let n=_.wildfire,r=_.global,a=i.uTime.value;if(this._burning<=0)return;let o=Math.round(this.moteEmitter.tick(e,n.moteRate*t)*r.particleCount);if(o>0){let e=this._randomBurning();e>=0&&(this._cellPoint(e,q),K.position=q,K.radius=this._pitch()*.6,K.direction=J.set(this._windX()*.3,1,this._windY()*.3).normalize(),K.speed=n.moteSpeed,K.speedVariance=.85,K.spread=.8,K.inherit=null,K.anchor=null,K.size=.07,K.sizeVariance=.7,K.life=n.moteLifetime,K.lifeVariance=.5,K.spin=0,K.tint=null,K.time=a,this.motes.emit(o,K))}let s=Math.round(this.smokeEmitter.tick(e,n.smokeRate*t)*r.particleCount);if(s>0){let e=this._randomBurning();e>=0&&(this._cellPoint(e,q).setY(.2),K.position=q,K.radius=this._pitch()*1.5,K.direction=J.set(this._windX()*.4,1,this._windY()*.4).normalize(),K.speed=n.smokeSpeed,K.speedVariance=.7,K.spread=.9,K.inherit=null,K.anchor=null,K.size=.9,K.sizeVariance=.5,K.life=n.smokeLifetime,K.lifeVariance=.4,K.spin=.4,K.tint=null,K.time=a,this.smoke.emit(s,K))}}_placeLight(){let e=_.wildfire;if(this._burning<=0){this._centrePoint(this.position),this.position.y=e.lightHeight;return}let t=this._pitch(),n=(this._grid-1)*.5;this._centrePoint(this.position).addScaledVector(this.side,(this._centroidX-n)*t).addScaledVector(this.direction,(this._centroidY-n)*t),this.position.y=e.lightHeight}onTravel(e){this._sync(1),this.position.y=.6,this.ctx.shake.rumble(_.wildfire.rumble*.4*_.global.cameraShake,e)}onImpact(){let e=_.wildfire,t=_.global,n=this._grid,r=(n-1)*.5;this._centrePoint(Y);let i=Math.max(1,Math.round(e.seeds));for(let t=0;t<i;t++){let i=Math.random()*Math.PI*2,a=t===0?0:Math.sqrt(Math.random())*y(e.seedSpread)*r,o=g(Math.round(r+Math.cos(i)*a),0,n-1),s=g(Math.round(r+Math.sin(i)*a),0,n-1)*n+o;this._fuel[s]<=0&&(this._fuel[s]=e.fuelFloor),this._catch(s,this.age)}q.copy(Y).setY(.35),this.ctx.bursts.spawn(ee.FIRE,q,{radius:e.burstSize*.25,endRadius:e.burstSize*t.explosionIntensity,life:.65,intensity:e.burstIntensity,opacity:.8,fresnel:1.4,displace:.7,squash:.6,colorA:l(e.colorBurstA),colorB:l(e.colorBurstB),colorC:l(e.colorBurstC)}),this.ctx.shake.add(e.landShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),22),this.ctx.flash.trigger(l(e.colorCastFlash),e.landFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*.8*t.explosionIntensity}onFade(e,t){let n=t<=1?1:1-b.inQuad(y(t-1)),r=t<=1?1:1-b.inCubic(y(t-1)*.85);this._advance(e,n),this._sync(r),this._placeLight(),this._frontFx(e,r),this.ctx.shake.rumble(_.wildfire.rumble*r*_.global.cameraShake,e)}onDestroy(){this._burning=0,this._cells=0,this._clock=0,this.cellGeometry.instanceCount=0,this.flameGeometry.instanceCount=0,this.cellMaterial.uniforms.uFade.value=0,this.flameMaterial.uniforms.uFade.value=0,this.pall.setFade(0),this.scorch.setVisible(!1),this.scorch.clearMarks()}dispose(){this.cellGeometry.dispose(),this.flameGeometry.dispose(),this.cellMaterial.dispose(),this.flameMaterial.dispose(),this.pall.dispose(),this.scorch.dispose(),super.dispose()}};export{oe as WildfireAbility};
//# sourceMappingURL=WildfireAbility-Dw9vebl5.js.map