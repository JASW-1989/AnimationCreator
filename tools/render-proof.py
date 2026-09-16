"""Render the original production fixture with the actual browser raster path.
Optional development tool: requires Playwright, Chromium and Pillow.
"""
from pathlib import Path
import base64,json,hashlib,subprocess,io,sys
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw
R=Path(__file__).resolve().parents[1];E=R/'evidence/v040';D=E/'proof-frames';D.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1600,'height':1050});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_content((R/'Koma-Production-Demo.html').read_text(),wait_until='load');page.wait_for_function('()=>window.KomaProductionStudio&&KomaProductionStudio.ready');project=page.evaluate('KomaProductionStudio.read().project');page.evaluate('KomaProductionStudio.setView("composite")')
 for start in range(0,project['frames'],12):
  if "--reuse-frames" in sys.argv and all((D/f'{f:06d}.png').exists() for f in range(start,min(start+12,project['frames']))):continue
  frames=page.evaluate('''async([start,end])=>{const p=KomaProductionStudio.read().project,out=[];for(let f=start;f<end;f++){const c=await KomaProductionStudio.fullCanvas(f,p,{},1280,720);out.push(c.toDataURL('image/png').split(',')[1]);}return out}''',[start,min(start+12,project['frames'])])
  for i,data in enumerate(frames): (D/f'{start+i:06d}.png').write_bytes(base64.b64decode(data))
  print('Rendered',min(start+12,project['frames']),flush=True)
 audio=page.evaluate('()=>KomaAudio.b64(KomaAudio.mix(KomaProductionStudio.read().project).wav())');(E/'proof-audio.wav').write_bytes(base64.b64decode(audio));page.evaluate('KomaProductionStudio.seek(46)');page.click('[data-tab="pose"]');page.click('[data-layer-select="head"]');page.wait_for_timeout(500);page.screenshot(path=str(E/'studio-production.png'))
 page.click('[data-shot="layout"]');page.click('[data-tab="layout"]');page.click('#viewLayout');page.wait_for_timeout(400);page.screenshot(path=str(E/'studio-layout.png'));b.close()
assert not errors,errors
hashes=[hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(D.glob('*.png'))]
# Six actual rendered frames, not a visual mockup.
frames=[0,34,70,112,152,184];sheet=Image.new('RGB',(1280,780),'#17222e');draw=ImageDraw.Draw(sheet)
for i,f in enumerate(frames):
 im=Image.open(D/f'{f:06d}.png').convert('RGB').resize((620,348));x=10+(i%2)*640;y=10+(i//2)*260;im.thumbnail((620,234));sheet.paste(im,(x,y));draw.text((x,y+237),'FRAME %03d / %s'%(f,['REACH','REACH','REACH','RESOLVE','LAYOUT','LAYOUT'][i]),fill='#a2cabb')
sheet.save(E/'render-review.png')
(E/'proof-render-report.json').write_text(json.dumps({'frames':len(hashes),'fps':project['fps'],'duration':project['frames']/project['fps'],'width':1280,'height':720,'uniquePNGHashes':len(set(hashes)),'browserErrors':errors,'rasterPath':'KomaProductionStudio.fullCanvas; 1280x720 frozen fixture','artScope':'Original procedural functional fixture, not anime quality validation','aiCalls':0},indent=2)+'\n')
subprocess.run(['ffmpeg','-hide_banner','-loglevel','warning','-y','-framerate','24','-i',str(D/'%06d.png'),'-i',str(E/'proof-audio.wav'),'-frames:v',str(project['frames']),'-t','8','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',str(E/'lumen-8s.mp4')],check=True)
probe=subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(E/'lumen-8s.mp4')]);(E/'video-probe.json').write_bytes(probe)
