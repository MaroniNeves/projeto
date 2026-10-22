import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FXSystem, effect } from 'rollshade';

const NEW_SPELLS=[["Água","Lança das Profundezas","water","lance","💧"],["Água","Golpe das Marés","water","strike","💧"],["Água","Mísseis de Gotas","water","missiles","💧"],["Água","Barreira Oceânica","water","barrier","💧"],["Água","Nova de Espuma","water","nova","💧"],["Água","Cura das Ondas","water","heal","💧"],["Água","Prisão do Abismo Azul","water","prison","💧"],["Água","Golpe de Ressaca","water","wave","💧"],["Fogo","Corte da Fênix","fire","cleave","🔥"],["Fogo","Broca de Lava","fire","drill","🔥"],["Fogo","Sopro de Fogo","fire","torrent","🔥"],["Fogo","Tornado de Chamas","fire","tornado","🔥"],["Fogo","Tempestade de Brasas","fire","storm","🔥"],["Fogo","Invocar Fênix","fire","summon","🔥"],["Fogo","Palma de Fogo","fire","palm","🔥"],["Fogo","Nova Incandescente","fire","nova","🔥"],["Gelo","Projétil de Geada","ice","projectile","❄️"],["Gelo","Estocada de Gelo","ice","thrust","❄️"],["Gelo","Nevasca","ice","storm","❄️"],["Gelo","Prisão Glacial","ice","prison","❄️"],["Gelo","Escudo de Gelo","ice","barrier","❄️"],["Gelo","Ascensão Boreal","ice","rising","❄️"],["Gelo","Punho do Inverno","ice","uppercut","❄️"],["Gelo","Tempestade de Cristais","ice","nine","❄️"],["Raios","Orbe Elétrico","thunder","projectile","⚡"],["Raios","Lança Relâmpago","thunder","lance","⚡"],["Raios","Tornado Magnético","thunder","tornado","⚡"],["Raios","Pilar Celeste","thunder","pillar","⚡"],["Raios","Explosão de Trovão","thunder","explosion","⚡"],["Raios","Ataque Relâmpago","thunder","rush","⚡"],["Raios","Amarras Elétricas","thunder","bind","⚡"],["Raios","Chicote Voltaico","thunder","swipe","⚡"],["Raios","Final da Tempestade","thunder","finale","⚡"],["Luz","Projétil Divino","light","projectile","✨"],["Luz","Raio de Aurora","light","beam","✨"],["Luz","Lança Sagrada","light","lance","✨"],["Luz","Bênção Guardiã","light","buff","✨"],["Luz","Guardião Celestial","light","summon","✨"],["Luz","Onda da Alvorada","light","shockwave","✨"],["Luz","Pilar do Amanhecer","light","pillar","✨"],["Luz","Cruz Luminosa","light","cross","✨"],["Trevas","Ritual Giratório","dark","spin","🌑"],["Trevas","Amarras do Vazio","dark","bind","🌑"],["Trevas","Corrente Sombria","dark","chain","🌑"],["Trevas","Muralha das Sombras","dark","barrier","🌑"],["Trevas","Pirâmide Obscura","dark","pyramid","🌑"],["Trevas","Estilhaços Noturnos","dark","missiles","🌑"],["Trevas","Corte do Abismo","dark","slash","🌑"],["Trevas","Cárcere das Almas","dark","prison","🌑"],["Trevas","Meteoro do Vazio","dark","meteor","🌑"],["Vento","Salto de Ciclone","wind","heel","🍃"],["Vento","Esfera de Ar","wind","projectile","🍃"],["Vento","Ciclone Aéreo","wind","tornado","🍃"],["Vento","Tempestade de Pétalas","wind","storm","🍃"],["Vento","Chute Vendaval","wind","kick","🍃"],["Vento","Onda Cortante","wind","wave","🍃"],["Vento","Investida do Vendaval","wind","dash","🍃"],["Vento","Golpe do Céu","wind","lance","🍃"],["Arcano","Impacto Arcano","arcane","pound","🔮"],["Arcano","Combo Rúnico","arcane","combo","🔮"],["Arcano","Meteoro Astral","arcane","meteor","🔮"],["Arcano","Onda Arcana","arcane","shockwave","🔮"],["Arcano","Mísseis Arcanos","arcane","missiles","🔮"],["Arcano","Ritual Supremo","arcane","finale","🔮"],["Arcano","Corte Astral","arcane","iaido","🔮"],["Terra","Pilares de Pedra","earth","pillars","🪨"],["Terra","Meteoro Rochoso","earth","meteor","🪨"],["Terra","Prisão de Cristais","earth","prison","🪨"],["Terra","Barreira Telúrica","earth","barrier","🪨"],["Terra","Onda Sísmica","earth","wave","🪨"],["Terra","Investida Telúrica","earth","tackle","🪨"],["Terra","Terremoto","earth","shockwave","🪨"],["Veneno","Bomba Tóxica","poison","projectile","☠️"],["Veneno","Meteorito Venenoso","poison","meteor","☠️"],["Veneno","Cipós Peçonhentos","poison","bind","☠️"],["Veneno","Prisão Venenosa","poison","prison","☠️"],["Veneno","Tornado de Esporos","poison","tornado","☠️"],["Veneno","Tempestade Corrosiva","poison","storm","☠️"],["Veneno","Nova Pestilenta","poison","nova","☠️"],["Veneno","Fúria Tóxica","poison","flurry","☠️"]];
const SPELLS=[
 ['Água','Orbe das marés','water','projectile','💧'],['Água','Vórtice aquático','water','tornado','🌊'],['Água','Gêiser ascendente','water','pillar','💧'],['Água','Onda de impacto','water','shockwave','🌊'],
 ['Fogo','Bola de fogo','fire','projectile','🔥'],['Fogo','Meteoro','fire','meteor','☄️'],['Fogo','Explosão ígnea','fire','explosion','🔥'],
 ['Gelo','Pilares glaciais','ice','pillar','❄️'],['Gelo','Lança glacial','ice','lance','❄️'],
 ['Raios','Tempestade elétrica','thunder','storm','⚡'],['Raios','Corrente elétrica','thunder','chain','⚡'],
 ['Luz','Aurora celestial','light','nova','✨'],['Luz','Bênção restauradora','light','heal','✨'],
 ['Trevas','Invocação sombria','dark','summon','🌑'],['Trevas','Nova do abismo','dark','nova','🌑'],
 ['Vento','Corte do vendaval','wind','slash','🍃'],['Arcano','Passo dimensional','arcane','warp','🌀'],
 ['Arcano','Escudo prismático','arcane','pyramid','🔮'],['Terra','Ruptura da terra','earth','smash','🪨'],
 ['Veneno','Névoa venenosa','poison','torrent','☠️']
].concat(NEW_SPELLS).map((a,i)=>({isNew:i>=20,school:a[0],name:a[1],element:a[2],recipe:a[3],icon:a[4],seed:'arcano'+i}));
const $=id=>document.getElementById(id);
let current=SPELLS[0], fx,renderer,camera,orbit,scene,auto=false,ready=false,lastCast=0,isWebGPU=false,hadError=false;
function msg(s){$('status').textContent=s;}
function error(e){if(hadError)return;hadError=true;console.error('Rollshade',e);$('error').classList.add('visible');$('error').textContent='Erro no Rollshade / WebGL2:\n'+String(e?.stack||e).slice(0,800)+'\n\nA V8 não foi alterada.';msg('Erro na renderização');}
function list(){
 const query=($('query')?.value||'').trim().toLocaleLowerCase('pt-BR'); const onlyNew=!!$('onlynew')?.checked;let shown=0;
 $('items').replaceChildren();
 SPELLS.forEach((s,i)=>{if($('school').value&&$('school').value!==s.school)return;if(onlyNew&&!s.isNew)return;if(query&&!((s.name+' '+s.school+' '+s.recipe).toLocaleLowerCase('pt-BR').includes(query)))return;shown++;
  const b=document.createElement('button');b.className=s===current?'active':'';
  b.textContent=s.icon+' '+s.name+'  ·  '+s.school+(s.isNew?' · NOVA':'');b.onclick=()=>{current=s;fx?.clear();msg('Selecionada '+s.name);$('name').textContent=s.icon+' '+s.school+' — '+s.name;$('drawer').hidden=true;list();};$('items').append(b);
 });
}
[...new Set(SPELLS.map(x=>x.school))].forEach(x=>{const o=document.createElement('option');o.textContent=x;o.value=x;$('school').append(o);});
$('school').onchange=list;$('query').oninput=list;$('onlynew').onchange=list;list();$('choose').onclick=()=>{$('drawer').hidden=!$('drawer').hidden;};$('hide').onclick=()=>{$('drawer').hidden=true;};
$('clear').onclick=()=>{fx?.clear();auto=false;$('auto').textContent='Auto OFF';msg('Efeitos removidos')};
$('auto').onclick=()=>{auto=!auto;$('auto').textContent=auto?'Auto ON':'Auto OFF';};
async function boot(){
 const canvas=$('stage');
 renderer=new THREE.WebGPURenderer({canvas,antialias:false,alpha:false,powerPreference:'low-power'});
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.1));
 scene=new THREE.Scene();scene.background=new THREE.Color('#151d29');scene.fog=new THREE.FogExp2('#151d29',.034);
 camera=new THREE.PerspectiveCamera(42,1,.1,120);camera.position.set(4.2,3.5,9);
 orbit=new OrbitControls(camera,canvas);orbit.target.set(0,1.3,0);orbit.enableDamping=true;orbit.enablePan=false;orbit.minDistance=4.5;orbit.maxDistance=18;orbit.maxPolarAngle=1.53;orbit.update();
 $('reset').onclick=()=>{camera.position.set(4.2,3.5,9);orbit.target.set(0,1.3,0);orbit.update();};
 $('in').onclick=()=>{camera.position.lerp(orbit.target,.13);orbit.update();};
 $('out').onclick=()=>{camera.position.sub(orbit.target).multiplyScalar(1.15).add(orbit.target);orbit.update();};
 scene.add(new THREE.HemisphereLight(0x92b3e6,0x283447,2.0));
 const sun=new THREE.DirectionalLight(0xffeacb,2.1);sun.position.set(-4,8,6);scene.add(sun);
 const floor=new THREE.Mesh(new THREE.CircleGeometry(18,72),new THREE.MeshStandardMaterial({color:0x27303e,roughness:.9}));floor.rotation.x=-Math.PI/2;floor.position.y=-.03;scene.add(floor);
 const circle=new THREE.Mesh(new THREE.RingGeometry(2.5,2.54,88),new THREE.MeshBasicMaterial({color:0x637a88,transparent:true,opacity:.32,side:THREE.DoubleSide}));circle.rotation.x=-Math.PI/2;circle.position.y=.005;scene.add(circle);
 const base=new THREE.MeshStandardMaterial({color:0x707d93,roughness:.63});
 for(const x of [-2,2]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.27,.34,.18,12),base);p.position.set(x,.09,0);scene.add(p);}
 const dummy=new THREE.Mesh(new THREE.IcosahedronGeometry(.42,1),new THREE.MeshStandardMaterial({color:0x987581,roughness:.45}));dummy.position.set(2,1.1,0);scene.add(dummy);
 const from=new THREE.Vector3(-2,1.25,0),to=new THREE.Vector3(2,1.1,0);
 const resize=()=>{let w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
 window.addEventListener('resize',resize,{passive:true});await renderer.init();resize();
 isWebGPU=!!renderer.backend?.isWebGPUBackend;
 msg((isWebGPU?'WebGPU':'WebGL2')+' · preparando feitiço inicial…');
 fx=new FXSystem({scene,camera,renderer,post:false,feel:false,quality:'low',photosensitive:true,look:{core:.08,hot:.12,limit:1.15,particles:.16,smoke:.06}});
 const initial=effect('projectile','water',{seed:'arcano0'});fx.add(initial);
 await fx.prewarm();ready=true;msg((isWebGPU?'WebGPU':'WebGL2')+' · pronto · qualidade baixa');
 const cast=()=>{
  if(!ready||document.hidden||performance.now()-lastCast<1100)return;lastCast=performance.now();fx.clear();
  try{const selected=current;const h=fx.play(effect(selected.recipe,selected.element,{seed:selected.seed}),{from,to});
   h.on('hit',()=>{msg('✦ Impacto · '+selected.name);});msg('Lançando: '+selected.name);
  }catch(e){error(e);}
 };
 $('cast').onclick=cast;
 let lastAuto=0;const timer=new THREE.Timer();let frames=0;
 renderer.setAnimationLoop(time=>{
  try{timer.update(time);const delta=Math.min(timer.getDelta(),.05);orbit.update();
   if(auto&&performance.now()-lastAuto>4800){lastAuto=performance.now();cast();}
   fx.update(delta);renderer.render(scene,camera);frames++;
   if(frames===4)window.__ARCANO_TEST={ready:true,engine:'rollshade',backend:isWebGPU?'WebGPU':'WebGL2',spells:SPELLS.length,expanded:true};
  }catch(e){renderer.setAnimationLoop(null);error(e);}
 });
 setTimeout(cast,800);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){auto=false;$('auto').textContent='Auto OFF';fx?.clear();}});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;msg('Contexto de GPU perdido; recarregue a página')},{passive:false});
}
boot().catch(error);
