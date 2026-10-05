#!/usr/bin/env python3
"""One bounded recovery step per invocation; never modifies a live checkout."""
import argparse,hashlib,json,os,subprocess,sys
from pathlib import Path
SOURCE='726c7ed9faeb66d472f1403d4f5900d0e5ae9ec1'
TREE='a6a591a46901ca2595be9f32d39cf0544ebdbaba'
REPOSITORY='https://github.com/peteywee/teach-v2.git'
p=argparse.ArgumentParser();p.add_argument('step',choices=['init','fetch','checkout','verify']);p.add_argument('destination');args=p.parse_args();dest=Path(args.destination).expanduser().resolve()
def git(*parts):
 try:r=subprocess.run(['git','-C',str(dest),*parts],capture_output=True,text=True,timeout=25)
 except subprocess.TimeoutExpired:raise SystemExit('BOUND REACHED: command stopped at 25 seconds; destination preserved. Inspect its state before resuming this step.')
 if r.returncode:raise SystemExit(r.stderr.strip() or 'Git command failed')
 return r.stdout.strip()
if args.step=='init':
 if dest.exists():raise SystemExit('Choose a new destination; existing paths are preserved.')
 dest.mkdir(parents=True);git('init');git('remote','add','origin',REPOSITORY)
else:
 if not (dest/'.git').is_dir():raise SystemExit('Run init for a new recovery directory first.')
 if git('remote','get-url','origin')!=REPOSITORY:raise SystemExit('Recovery repository mismatch.')
 if args.step=='fetch':
  git('fetch','--no-tags','--depth=1','origin',SOURCE)
 elif args.step=='checkout':
  if git('status','--porcelain'):raise SystemExit('Recovery directory contains changes; preserve them before continuing.')
  git('switch','--detach',SOURCE)
 elif args.step=='verify':
  if git('rev-parse','HEAD')!=SOURCE or git('rev-parse','HEAD^{tree}')!=TREE:raise SystemExit('Exact source/tree mismatch.')
  if git('status','--porcelain'):raise SystemExit('Recovery directory is not clean.')
  manifest=json.loads((Path(__file__).parent/'source-manifest.json').read_text())
  tracked=set(git('ls-files','-z').split('\0'));tracked.discard('')
  if tracked!={r['path'] for r in manifest['files']}:raise SystemExit('Source inventory mismatch.')
  for row in manifest['files']:
   f=dest/row['path'];data=os.readlink(f).encode() if f.is_symlink() else f.read_bytes()
   if hashlib.sha256(data).hexdigest()!=row['sha256']:raise SystemExit('File mismatch: '+row['path'])
   mode='120000' if f.is_symlink() else ('100755' if f.stat().st_mode&0o111 else '100644')
   if mode!=row['mode']:raise SystemExit('File mode mismatch: '+row['path'])
  print(f"VERIFIED: {len(manifest['files'])} source files match the frozen checkpoint.")
print(f'CHECKPOINT: {args.step} complete; destination={dest}; source={SOURCE}')
