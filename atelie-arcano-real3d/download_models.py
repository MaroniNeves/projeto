import json,urllib.request,re
from pathlib import Path
from urllib.parse import quote
base=Path('atelie-arcano-real3d');folder=base/'models';folder.mkdir(parents=True,exist_ok=True)
def get(u):
 r=urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0 AtelieArcanoVFX'})
 with urllib.request.urlopen(r,timeout=40) as q:return q.read()
def walk(o):
 if isinstance(o,list):
  for v in o:yield from walk(v)
 if isinstance(o,dict):
  if any(k in o for k in ('cdnUrl','cdn_url','modelUrl','model_url','downloadUrl')):yield o
  for v in o.values():yield from walk(v)
found=[];used=set()
def add(url,name,group):
 if not url or not url.startswith('https://') or not url.endswith('.glb') or url in used:return
 used.add(url)
 try:
  b=get(url)
  if b[:4]!=b'glTF':raise ValueError('Not real GLB')
  fn='%03d_%s.glb'%(len(found)+1,re.sub('[^a-z0-9]+','-',str(name).lower()).strip('-')[:54])
  (folder/fn).write_bytes(b)
  found.append({'name':str(name),'file':'models/'+fn,'url':url,'bytes':len(b),'group':group})
  print('OK',len(found),name,len(b),flush=True)
 except Exception as e:print('ERROR',str(e)[:160],url,flush=True)
add('https://cdn.3dassets.dev/assets/21936/v1/model.glb','VFX starter scene','VFX Mesh Library')
try:
 p=json.loads(get('https://3dassets.dev/api/v1/packs/vfx-mesh-library'))
 print('PACK',str(p)[:260],flush=True)
 for i,e in enumerate(walk(p)):
  u=next((e[k] for k in ('cdnUrl','cdn_url','modelUrl','model_url','downloadUrl') if isinstance(e.get(k),str)),None)
  n=next((e[k] for k in ('name','title','slug','label') if e.get(k)),f'effect {i}')
  add(u,n,'VFX Mesh Library')
except Exception as e:print('PACK_ERROR',str(e)[:250],flush=True)
for q in ('crescent slash mesh','ember projectile mesh','water vortex','lightning bolt','ice spikes','portal ring'):
 try:
  p=json.loads(get('https://3dassets.dev/api/v1/assets?q='+quote(q)))
  for i,e in enumerate(list(walk(p))[:5]):
   u=next((e[k] for k in ('cdnUrl','cdn_url','modelUrl','model_url','downloadUrl') if isinstance(e.get(k),str)),None)
   n=next((e[k] for k in ('name','title','slug','label') if e.get(k)),q)
   add(u,n,'Fantasy effects')
 except Exception as e:print('QUERY_ERROR',q,str(e)[:120],flush=True)
if not found:raise RuntimeError('No downloadable binary 3D GLBs. Refusing to substitute sprites.')
(base/'catalog.json').write_text(json.dumps({'license':'CC0 1.0','origin':'https://3dassets.dev/packs/vfx-mesh-library','models':found},indent=2))
print('TOTAL',len(found),'SIZE',sum(a['bytes'] for a in found),flush=True)
