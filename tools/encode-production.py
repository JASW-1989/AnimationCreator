"""Encode an exported PNG+WAV directory using an optional, locally installed FFmpeg.
No network, model, package manager, subscription or shell command evaluation.
"""
import argparse,json,pathlib,shutil,subprocess,sys
p=argparse.ArgumentParser(description=__doc__);p.add_argument('directory',type=pathlib.Path);p.add_argument('output',type=pathlib.Path);args=p.parse_args()
try:
 root=args.directory.resolve();m=json.loads((root/'manifest.json').read_text());fps=m['fps'];count=m['frames']
 if not isinstance(fps,(int,float)) or not 1<=fps<=60 or not isinstance(count,int) or not 1<=count<=600:raise ValueError('Invalid fps/frame count')
 for i in range(count):
  f=root/'frames'/f'{i:06d}.png'
  if not f.is_file() or f.read_bytes()[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError('PNG sequence missing or invalid: '+str(f))
 if args.output.exists():raise ValueError('Output exists; choose a new path')
 if not (root/'audio.wav').is_file():raise ValueError('Missing synchronized audio.wav')
 exe=shutil.which('ffmpeg')
 if not exe:raise ValueError('FFmpeg is not installed. PNG/APNG/SVG/WAV exports work without it.')
 if args.output.suffix.lower()!='.mp4':raise ValueError('This helper writes .mp4 only')
 cmd=[exe,'-hide_banner','-loglevel','warning','-n','-framerate',str(fps),'-start_number','0','-i',str(root/'frames'/'%06d.png'),'-i',str(root/'audio.wav'),'-frames:v',str(count),'-t',str(count/fps),'-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libx264','-crf','18','-preset','medium','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',str(args.output.resolve())]
 subprocess.run(cmd,check=True);print(json.dumps({'output':str(args.output.resolve()),'frames':count,'seconds':count/fps}))
except (ValueError,OSError,KeyError,subprocess.CalledProcessError) as e:
 print(str(e),file=sys.stderr);sys.exit(1)
