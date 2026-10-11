"""Download a bounded GEBCO 2020 subset. No credentials; respect public rate limit."""
import json, urllib.request, urllib.parse, time, hashlib
from pathlib import Path
rows, cols = 61, 81
lat_min, lat_max, lon_min, lon_max = 11.10, 11.60, 141.95, 142.65
points = [(lat_max-(lat_max-lat_min)*r/(rows-1),lon_min+(lon_max-lon_min)*c/(cols-1)) for r in range(rows) for c in range(cols)]
cache=Path('output/research/gebco-batches');cache.mkdir(parents=True,exist_ok=True)
values=[]
for offset in range(0,len(points),100):
 path=cache/f'{offset}.json'
 if path.exists(): data=json.loads(path.read_text())
 else:
  locations='|'.join(f'{lat:.7f},{lon:.7f}' for lat,lon in points[offset:offset+100])
  url='https://api.opentopodata.org/v1/gebco2020?'+urllib.parse.urlencode({'locations':locations,'interpolation':'bilinear'})
  for attempt in range(3):
   try:
    with urllib.request.urlopen(url,timeout=25) as response:data=json.load(response)
    if data.get('status')!='OK':raise ValueError(data)
    break
   except Exception:
    if attempt==2:raise
    time.sleep(2+attempt)
  path.write_text(json.dumps(data));time.sleep(1.1)
 result=data['results']
 if len(result)!=len(points[offset:offset+100]) or any(p['elevation'] is None for p in result):raise ValueError('Incomplete bathymetry')
 for row, (lat, lon) in zip(result, points[offset:offset+100]):
  if (row.get('dataset') != 'gebco2020' or
      abs(row['location']['lat'] - lat) > 1e-6 or
      abs(row['location']['lng'] - lon) > 1e-6):
   raise ValueError('Cached grid coordinates or source differ; remove stale cache before resampling')
 values.extend(p['elevation'] for p in result)
 print(f'{len(values)}/{len(points)}',flush=True)
out=Path('src/game/data');out.mkdir(parents=True,exist_ok=True)
payload={'source':{'provider':'GEBCO Compilation Group (2020), via Open Topo Data','url':'https://www.gebco.net/data-products/gridded-bathymetry-data/gebco-2020','doi':'10.5285/a29c5465-b138-234d-e053-6c86abc040b9','retrieved':'2026-10-11','nativeResolutionArcSeconds':15,'interpolation':'bilinear','terms':'GEBCO 2020 terms of use; acknowledge source; no endorsement or navigation claims'},'bounds':{'latMin':lat_min,'latMax':lat_max,'lonMin':lon_min,'lonMax':lon_max},'grid':{'rows':rows,'cols':cols},'elevationsMeters':values}
file=out/'mariana.json';file.write_text(json.dumps(payload,separators=(',',':'))+'\n')
print('COMPLETE',min(values),max(values),hashlib.sha256(file.read_bytes()).hexdigest(),flush=True)
