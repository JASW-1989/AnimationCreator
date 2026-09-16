"""Optional developer delivery tool: run tests/browser_cinema.py first.
Requires NumPy, Pillow, local FFmpeg/ffprobe and a local font for the review sheet.
These are not runtime browser requirements. No models or network are used.
"""
from pathlib import Path
import numpy as np,wave,json,subprocess
from PIL import Image,ImageDraw,ImageFont
r=Path(__file__).resolve().parents[1];e=r/'evidence/cinema';frames=e/'frames'
# Original synthetic cue; no audio samples, external models or licensed sound packs.
sr=48000;t=np.arange(12*sr,dtype=np.float64)/sr;rng=np.random.default_rng(7391)
env=np.minimum(t/1.2,1)*np.minimum((12-t)/1.3,1)
mono=.035*np.sin(2*np.pi*65.406*t)*env+.018*np.sin(2*np.pi*97.999*t+.5)*env
mono+=.012*np.sin(2*np.pi*130.813*t+.17*np.sin(2*np.pi*.15*t))*env
# Soft, filtered air and one short non-explosive attack punctuation.
noise=rng.normal(0,1,len(t));air=np.convolve(noise,np.ones(80)/80,'same')
mono+=air*.027*env
u=t-5.88;hit=np.maximum(u,0)
mono+=(u>=0)*.22*np.exp(-hit*10)*np.sin(2*np.pi*(85*hit-17*hit**2))
mono+=noise*.022*np.exp(-((t-5.78)/.18)**2)
for onset in (2.5,4.5,10.05):
 u=t-onset;v=np.maximum(u,0);mono+=(u>=0)*.025*np.sin(2*np.pi*523.251*v)*np.exp(-v*3)*(1-np.exp(-v*60))
stereo=np.column_stack((mono,mono+.006*np.sin(2*np.pi*130.813*t+.5)*env))
peak=float(np.max(np.abs(stereo)));stereo*=min(1,.45/max(peak,1e-9));pcm=np.round(stereo*32767).astype('<i2')
sound=e/'original-synthetic-cue.wav'
with wave.open(str(sound),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes(pcm.tobytes())
out=(r/'Koma-Ember-Gate-12s.mp4')
subprocess.run(['ffmpeg','-y','-v','error','-framerate','24','-i',str(frames/'%04d.png'),'-i',str(sound),'-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-t','12','-movflags','+faststart',str(out)],check=True)
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(out)]))
(e/'video-probe.json').write_text(json.dumps(probe,indent=2))
# Review contact sheet from actual rendered frames (not a concept image).
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
regular=ImageFont.truetype(font,18);big=ImageFont.truetype(font,32);small=ImageFont.truetype(font,14)
W,H=1440,1120;sheet=Image.new('RGB',(W,H),'#111c22');d=ImageDraw.Draw(sheet)
d.text((40,28),'EMBER GATE / CINEMATIC PREVIS',font=big,fill='#e1e9e7')
d.text((40,75),'Koma 0.3 preview  /  12 seconds  /  24 fps  /  six original shots',font=regular,fill='#91aaa8')
selection=[(24,'01  THE THRESHOLD','Environment + multiplane'),(80,'02  RESOLVE','Portrait + cel substitution'),(112,'03  RECOGNITION','Eye insert + independent exposure'),(150,'04  RELEASE','Five poses; not finished fight animation'),(212,'05  AFTERGLOW','Hold + camera retreat'),(270,'06  EMBER GATE','Original title + composition')]
for i,(f,title,sub) in enumerate(selection):
 x=40+(i%2)*700;y=120+(i//2)*320
 im=Image.open(frames/f'{f:04d}.png').convert('RGB').resize((660,247),Image.Resampling.LANCZOS)
 # Preserve 16:9 by using natural 660x371 cropped? Instead use 420? Layout below 660x247 was wrong; fit within 660x247 without stretch.
 original=Image.open(frames/f'{f:04d}.png').convert('RGB');original.thumbnail((660,247),Image.Resampling.LANCZOS)
 canvas=Image.new('RGB',(660,247),'#0a1218');canvas.paste(original,((660-original.width)//2,0));sheet.paste(canvas,(x,y))
 d.text((x,y+259),title,font=regular,fill='#e1e9e7');d.text((x,y+285),sub,font=small,fill='#91aaa8')
d.text((40,H-32),'NO REFERENCE FOOTAGE INCLUDED  /  Character drawing, rigging and audio editing are not production-ready.',font=small,fill='#bda47b')
sheet.save(str(r/'Koma-Cinema-Shotboard.png'))
# Wide poster, no UI or fictional screenshot modifications.
Image.open(frames/'0024.png').save(str(r/'Koma-Cinema-Poster.png'))
print(json.dumps({'mp4_bytes':out.stat().st_size,'duration':probe['format']['duration'],'video_frames':probe['streams'][0].get('nb_frames'),'width':probe['streams'][0]['width'],'height':probe['streams'][0]['height'],'cue_peak':peak}))
