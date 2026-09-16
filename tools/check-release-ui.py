"""Validate the delivered standalone editing study, and record real UI screenshots."""
from pathlib import Path
import json,os
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];E=R/'evidence/v050';errors=[];requests=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.environ.get('KOMA_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 p=b.new_page(viewport={'width':1600,'height':1100},device_scale_factor=1)
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda r:requests.append(r.url))
 p.set_content((R/'Koma-Ninja-Pro.html').read_text(),wait_until='load')
 p.wait_for_function("()=>window.KomaProductionStudio?.ready && document.querySelector('#proDialog')?.open",timeout=20000)
 p.wait_for_timeout(450)
 snapshot=p.evaluate('''()=>{const s=KomaProductionStudio.read();return {version:KomaCore.production.VERSION,assets:s.project.production.assets.length,shots:s.project.production.shots.length,frames:s.project.frames,fps:s.project.fps,audioTracks:s.project.production.audio.length,notes:s.project.production.notes,proTabs:document.querySelectorAll('[data-pro]').length,title:s.project.name}}''')
 assert snapshot['assets']==203 and snapshot['shots']==6 and snapshot['frames']==120 and snapshot['proTabs']==10,snapshot
 p.screenshot(path=str(E/'release-ninja-review.png'))
 p.evaluate("()=>{KomaProductionStudio.seek(3);KomaProDesk.select('curve');KomaProDesk.refresh()}")
 # Select the camera channel that has an actual authored segment.
 p.select_option('#curveTarget','camera')
 p.select_option('#curveChannel','zoom')
 p.wait_for_timeout(100)
 p.screenshot(path=str(E/'release-ninja-curve.png'))
 # Dispose the running app before loading the separate, static guide document.
 assert not errors,errors
 p.close();p=b.new_page(viewport={'width':1440,'height':1000})
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda r:requests.append(r.url))
 p.set_content((R/'Guide.zh-TW.html').read_text(),wait_until='load');p.screenshot(path=str(E/'release-guide.png'))
 assert p.locator('table tbody tr').count()==10
 assert not errors,errors
 assert not [u for u in requests if u.startswith(('http:','https:'))],requests
 b.close()
(E/'release-ui-report.json').write_text(json.dumps({'passed':True,'snapshot':snapshot,'uncaughtErrors':errors,'externalRequests':[u for u in requests if u.startswith(('http:','https:'))],'method':'Full standalone HTML executed in offline Chromium; actual controls and project state, not a design mockup.'},indent=2))
print(json.dumps(snapshot))
