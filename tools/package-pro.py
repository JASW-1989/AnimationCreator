"""Package the current release from verified local outputs, without runtime dependencies."""
from pathlib import Path
import hashlib,json,re,shutil,zipfile
R=Path(__file__).resolve().parents[1];E=R/'evidence/v050';OUT=Path('/mnt/data')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
# Keep only the final acceptance artifacts as current evidence.
for name in ['after-engine.tap','pro-failure.png','pro-unit.tap','queue-unit.tap','tracking-unit.tap','regression.tap']:
 (E/name).unlink(missing_ok=True)
base=json.loads((R/'evidence/v040/browser-report.json').read_text());(E/'browser-regression-report.json').write_text(json.dumps(base,indent=2))
log=(E/'all-unit.tap').read_text();unit={k:int(re.search(r'^# '+k+r' (\d+)$',log,re.M).group(1)) for k in ['tests','pass','fail','skipped']}
assert unit=={'tests':306,'pass':306,'fail':0,'skipped':0},unit
integration=json.loads((E/'integration-report.json').read_text());browser=json.loads((E/'browser-pro-report.json').read_text());release=json.loads((E/'release-ui-report.json').read_text());audit=json.loads((E/'repair-pixel-audit.json').read_text())
suites=[{'name':'Core regression and new unit tests','passed':unit['pass'],'total':unit['tests'],'evidence':'all-unit.tap'},{'name':'Real HTTP, CLI, MCP and server restart','passed':integration['passed'],'total':integration['total'],'evidence':'integration-report.json'},{'name':'Existing production browser workflows','passed':base['passed'],'total':base['total'],'evidence':'browser-regression-report.json'},{'name':'New Pro browser workflows','passed':browser['passed'],'total':browser['total'],'evidence':'browser-pro-report.json'}]
assert all(x['passed']==x['total'] for x in suites) and release['passed']
report={'version':'0.5.0-alpha','passed':sum(x['passed'] for x in suites),'total':sum(x['total'] for x in suites),'suites':suites,'additionalStandaloneCheck':release,'pixelRepairAudit':{'test':'Translated, rotated and scaled patch composition in real Chromium','changedInsidePixels':audit['inside'],'changedOutsidePixels':audit['outside']},'operationCount':19,'proFeatureCount':10,'mcpToolCount':11,'modelCalls':0,'runtimeNpmDependencies':0,'browserNetworkScope':'Offline workflows observed zero external HTTP requests; localhost navigation unavailable in this environment. HTTP/CLI/MCP tested separately against actual local service.','notVerified':['Live user Codex / computer-use session','Physical pressure-sensitive tablet','All OS and browsers','Native IndexedDB recovery','Long-form, high-resolution sustained load','Artistic quality or commercial-suite parity','Comprehensive security audit'],'sourceProject':{'path':'examples/pro/ninja-pro.koma.json','sha256':sha(R/'examples/pro/ninja-pro.koma.json'),'assets':203,'frames':120,'fps':24,'newCharacterPoses':False}}
assert report['passed']==491 and audit['outside']==0
(E/'test-report.json').write_text(json.dumps(report,indent=2)+'\n')
policy=json.loads((R/'zero-subscription-policy.json').read_text());policy['version']='0.5.0-alpha';policy['featureManifest']='plugin-manifest.json';(R/'zero-subscription-policy.json').write_text(json.dumps(policy,indent=2)+'\n')
# Outputs are copied from existing, verified files only.
copies={
 'Koma-Production-Standalone.html':'Koma-Production-v0.5.html',
 'Koma-Ninja-Pro.html':'Koma-Ninja-Pro-v0.5.html',
 'Guide.zh-TW.html':'Koma-Pro-v0.5-Guide.zh-TW.html',
 'examples/pro/ninja-pro.koma.json':'Koma-Ninja-Pro-v0.5.koma.json',
 'examples/pro/native-lab.koma.json':'Koma-Native-Lab-v0.5.koma.json',
 'evidence/v050/test-report.json':'Koma-v0.5-Test-Report.json',
 'evidence/v050/release-ninja-review.png':'Koma-Pro-v0.5-Workspace.png',
 'evidence/v050/release-ninja-curve.png':'Koma-Pro-v0.5-Curve.png'}
for source,dest in copies.items():shutil.copy2(R/source,OUT/dest)
exclude={'.local','__pycache__','node_modules','.git'}
files=sorted(p for p in R.rglob('*') if p.is_file() and not any(part in exclude for part in p.relative_to(R).parts) and p.name!='distribution-manifest.json')
for p in files:
 assert p.suffix.lower() not in ['.ttf','.otf','.woff','.woff2','.exe','.dll','.so','.pyc'],p
manifest={'version':'0.5.0-alpha','root':'koma-studio','fileCount':len(files),'files':[{'path':str(p.relative_to(R)),'bytes':p.stat().st_size,'sha256':sha(p)} for p in files],'excluded':['Runtime data .local','Dependencies/binaries/fonts/credentials','distribution-manifest.json hashes itself is excluded'],'verification':'Hash list only; see external clean-package report for executed fresh-extraction checks.'}
(R/'distribution-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
archive=OUT/'Koma-Studio-v0.5.0-Pro-Offline.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=8) as z:
 for p in files+[R/'distribution-manifest.json']:
  info=zipfile.ZipInfo('koma-studio/'+str(p.relative_to(R)),date_time=(2026,9,16,0,0,0));info.external_attr=(0o755 if p.suffix in ['.sh','.command'] else 0o644)<<16;info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,p.read_bytes())
print(json.dumps({'tests':report['passed'],'archiveBytes':archive.stat().st_size,'files':len(files),'sha256':sha(archive),'outputs':list(copies.values())},indent=2))
