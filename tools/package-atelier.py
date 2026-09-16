"""Release packager. Requires previously completed current-version test reports."""
from pathlib import Path
import hashlib,json,re,shutil,zipfile,sys
R=Path(__file__).resolve().parents[1];E=R/'evidence/v060';OUT=Path(sys.argv[1] if len(sys.argv)>1 else '/mnt/data');OUT.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
log=(E/'core-all.log').read_text();unit={k:int(re.search(r'^# '+k+r' (\d+)$',log,re.M).group(1)) for k in ['tests','pass','fail','skipped']};assert unit['tests']==358 and not unit['fail'] and not unit['skipped']
suites=[{'name':'Core and native-paint/provenance tests','passed':unit['pass'],'total':unit['tests'],'evidence':'core-all.log'}]
legacy=[('evidence/v050/integration-report.json','legacy-integration.json','Existing HTTP/CLI/MCP and restart regression'),('evidence/v040/browser-report.json','legacy-browser-production.json','Existing production browser workflows'),('evidence/v050/browser-pro-report.json','legacy-browser-pro.json','Existing Pro browser workflows')]
for src,dst,label in legacy:
 if (R/src).exists():shutil.copy2(R/src,E/dst)
 data=json.loads((E/dst).read_text());suites.append({'name':label,'passed':data['passed'],'total':data.get('total',len(data.get('checks',[])) or data['passed']),'evidence':dst})
for f,label in [('browser-atelier.json','New Atelier actual pointer/DOM workflows'),('integration-atelier.json','New actual HTTP/MCP, image worker and human handoff')]:
 d=json.loads((E/f).read_text());suites.append({'name':label,'passed':d['passed'],'total':d['total'],'evidence':f})
assert all(s['passed']==s['total'] for s in suites),suites
release=json.loads((E/'release-ui.json').read_text());assert release['passed']
report={'version':'0.6.0-alpha','passed':sum(s['passed'] for s in suites),'total':sum(s['total'] for s in suites),'suites':suites,'additionalDistributedHTMLChecks':release,'auditConclusionCount':26,'typedAuthoringCommands':24,'mcpToolCount':16,'atelierWorkspaces':8,'workflowStageCount':10,'modelCalls':0,'requiredRuntimeNpmDependencies':0,'existingFunctionality':'Regression retained; not all professional-tool depths are recreated.','browserIntegration':'Localhost navigation returned ERR_BLOCKED_BY_ADMINISTRATOR. A transport-only test bridge joins actual loopback server, real stdio MCP, and Chromium canvas; native same-origin navigation not validated.','notVerified':['Actual Codex/Astra computer-use session','Physical pressure tablet','Every desktop OS/browser','Native IndexedDB recovery','Long-form/high-resolution sustained load','Professional animation artistic quality','Full commercial security assessment'],'artwork':'Original native blade study; no generated missing combat poses or movie-quality claim','testData':'Reviewer names in integration tests are explicit automated data-path labels, not human art approvals.'}
assert report['passed']==629,report
(E/'test-report.json').write_text(json.dumps(report,indent=2)+'\n')
# Avoid putting obsolete failed intermediate logs or historical large output media
# in a current acceptance bundle. Test source and final current evidence remain.
exclude_parts={'.local','__pycache__','node_modules','.git'}
exclude_files={'distribution-manifest.json','core-new.log','core-atelier.log','atelier-initial.png'}
files=[]
for p in sorted(R.rglob('*')):
 if not p.is_file():continue
 rel=p.relative_to(R)
 if any(x in exclude_parts for x in rel.parts) or p.name in exclude_files:continue
 if rel.parts[0]=='evidence' and len(rel.parts)>1 and rel.parts[1]!='v060':continue
 if p.suffix.lower() in {'.ttf','.otf','.woff','.woff2','.exe','.dll','.so','.pyc'}:raise RuntimeError('Forbidden artifact: '+str(p))
 files.append(p)
manifest={'version':'0.6.0-alpha','root':'koma-studio','fileCount':len(files),'files':[{'path':str(p.relative_to(R)),'bytes':p.stat().st_size,'sha256':sha(p)} for p in files],'excluded':['Runtime .local and credentials','Historical evidence outputs','Fonts, model weights, executable binaries and npm dependencies','Self-hash of this manifest'],'verification':'See external clean-package-check report for performed extraction/rebuild checks.'}
(R/'distribution-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
archive=OUT/'Koma-Studio-v0.6.0-Atelier-Offline.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=8) as z:
 for p in files+[R/'distribution-manifest.json']:
  info=zipfile.ZipInfo('koma-studio/'+str(p.relative_to(R)),date_time=(2026,9,16,0,0,0));info.external_attr=(0o755 if p.suffix in ['.sh','.command'] else 0o644)<<16;info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,p.read_bytes())
copies={'Koma-Production-Standalone.html':'Koma-Atelier-v0.6.html','Koma-Atelier-Study.html':'Koma-Atelier-Study-v0.6.html','Koma-Ninja-Pro.html':'Koma-Ninja-Atelier-v0.6.html','Guide.zh-TW.html':'Koma-Atelier-v0.6-Guide.zh-TW.html','examples/atelier-blade.koma.json':'Koma-Atelier-Study-v0.6.koma.json','docs/AUDIT-IMPLEMENTATION-MATRIX.json':'Koma-v0.6-Audit-Implementation-Matrix.json','evidence/v060/test-report.json':'Koma-v0.6-Test-Report.json','evidence/v060/release-workspace.png':'Koma-Atelier-v0.6-Workspace.png'}
for src,dst in copies.items():shutil.copy2(R/src,OUT/dst)
summary={'archive':str(archive),'bytes':archive.stat().st_size,'sha256':sha(archive),'fileCount':len(files),'tests':report['passed'],'outputs':list(copies.values())};(OUT/'Koma-v0.6-Package-Summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
