"""Encode a Koma PNG sequence using an independently installed FFmpeg.
Usage: python tools/encode_sequence.py --input koma-frames.zip --output clip.mp4
No shell commands are interpolated; ZIP entry names and frame count are checked.
"""
from __future__ import annotations
import argparse, json, pathlib, re, shutil, subprocess, tempfile, zipfile

def encode(source: pathlib.Path, output: pathlib.Path, overwrite: bool) -> None:
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        raise RuntimeError('FFmpeg is not installed. PNG export works without it.')
    if output.exists() and not overwrite:
        raise RuntimeError('Output exists. Choose another file or use --overwrite.')
    if output.suffix.lower() != '.mp4':
        raise RuntimeError('This utility produces .mp4 files.')
    with tempfile.TemporaryDirectory(prefix='koma-render-') as tmp:
        root = source
        if source.is_file():
            root = pathlib.Path(tmp)
            with zipfile.ZipFile(source) as z:
                size = sum(i.file_size for i in z.infolist())
                if size > 500_000_000:
                    raise RuntimeError('Archive exceeds the 500 MB safety limit.')
                for info in z.infolist():
                    if info.filename != 'manifest.json' and not re.fullmatch(r'frames/[0-9]{4}\.png', info.filename):
                        raise RuntimeError('Unexpected archive entry: ' + info.filename)
                    if info.file_size > 10_000_000:
                        raise RuntimeError('Frame exceeds the 10 MB safety limit.')
                    target = root / info.filename
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with z.open(info) as src, target.open('wb') as dst:
                        shutil.copyfileobj(src, dst)
        manifest = json.loads((root / 'manifest.json').read_text())
        fps, frames = manifest.get('fps'), manifest.get('frames')
        if type(fps) is not int or not 1 <= fps <= 60 or type(frames) is not int or not 2 <= frames <= 480:
            raise RuntimeError('Invalid fps or frame count.')
        for i in range(frames):
            if not (root / 'frames' / f'{i:04d}.png').is_file():
                raise RuntimeError(f'Missing frame {i}.')
        output.parent.mkdir(parents=True, exist_ok=True)
        args = [ffmpeg, '-hide_banner', '-loglevel', 'error', '-y' if overwrite else '-n',
                '-framerate', str(fps), '-start_number', '0', '-i', str(root / 'frames' / '%04d.png'),
                '-frames:v', str(frames), '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p',
                '-movflags', '+faststart', str(output)]
        subprocess.run(args, check=True, timeout=180)
        print(f'Created {output} ({frames} frames at {fps} fps).')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=pathlib.Path, required=True)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    parser.add_argument('--overwrite', action='store_true')
    args = parser.parse_args()
    try:
        encode(args.input, args.output, args.overwrite)
    except (RuntimeError, OSError, ValueError, zipfile.BadZipFile, subprocess.SubprocessError) as exc:
        parser.exit(1, f'Error: {exc}\n')
