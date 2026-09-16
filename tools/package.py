"""Package current sources without model weights, generated frame caches or secrets.
Uses the Python standard library only. Run tools/build.cjs first.
"""
from pathlib import Path
import argparse, hashlib, json, zipfile
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=ROOT.parent/'Koma-Studio-v0.4.0-P0-P2-Offline.zip')
args=parser.parse_args()
allowed_evidence=set()
current_evidence={'evidence/v040/'+name for name in [
 'all-unit.tap','integration-report.json','browser-report.json','test-report.json',
 'proof-render-report.json','video-probe.json','encoder-report.json',
 'studio-production.png','studio-layout.png','render-review.png'
]}
files=[]
for path in sorted(ROOT.rglob('*')):
 if not path.is_file():continue
 rel=path.relative_to(ROOT)
 if any(part in {'.local','.git','node_modules','__pycache__'} for part in rel.parts):continue
 if rel.name=='distribution-manifest.json':continue
 if rel.parts[0]=='evidence' and rel.as_posix() not in current_evidence and (len(rel.parts)!=2 or rel.name not in allowed_evidence):continue
 if path.suffix.lower() in {'.zip','.ttf','.otf','.woff','.woff2','.exe','.dll','.dylib','.so'}:continue
 files.append(path)
manifest={
 'version':'0.4.0-alpha','edition':'offline-p0-p2-production','license':'MIT',
 'files':[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,
 'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files],
 'excluded':['runtime secrets and .local user data','generated frame cache','third-party binaries','fonts','model weights'],
 'manifest_self_hash_excluded':True
}
mp=ROOT/'distribution-manifest.json';mp.write_text(json.dumps(manifest,indent=2)+'\n');files.append(mp)
args.output.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(args.output,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted(files):z.write(p,'koma-studio/'+p.relative_to(ROOT).as_posix())
with zipfile.ZipFile(args.output) as z:
 assert z.testzip() is None
 assert not any('/.local/' in n for n in z.namelist())
print(json.dumps({'path':str(args.output),'files':len(files),'bytes':args.output.stat().st_size,'sha256':hashlib.sha256(args.output.read_bytes()).hexdigest()},indent=2))
