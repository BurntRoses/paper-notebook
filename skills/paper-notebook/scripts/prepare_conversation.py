"""Acquire the portable runtime, verify it, and prove it can generate HTML."""
import argparse
import hashlib
import re
import time
from urllib.parse import urljoin
import json
from pathlib import Path, PurePosixPath
import shutil
import stat
import subprocess
import sys
import tempfile
from urllib.request import urlopen
import zipfile

PACKAGE_URL = 'https://burntroses.github.io/paper-notebook/downloads/paper-notebook-conversation.zip'
REQUIRED = ('START-HERE.md', 'SKILL.md', 'assets/reader.html',
            'assets/blank-notebook.json', 'assets/THIRD_PARTY_NOTICES.txt', 'scripts/build_reader.py',
            'scripts/verify_reader.py',
            'scripts/exploration.py', 'scripts/study_quality.py', 'scripts/content_review.py', 'scripts/editorial_metrics.py', 'scripts/build_metrics.py', 'references/writing-rules.json',
            'references/notebook.schema.json', 'assets/reader-shell.sha256', 'runtime-manifest.json', 'references/chinese-writing.md', 'references/quality-workflow.md', 'scripts/quality_gate.py', 'scripts/authoring.py')

# preset-download-response:start
DOWNLOAD_MESSAGE = "当前对话无法自动取得阅读器。请[下载备用构建包](https://burntroses.github.io/paper-notebook/downloads/paper-notebook-upload.zip)，直接上传下载得到的 ZIP。若下载后出现 paper-notebook-upload 文件夹，上传其中的 paper-notebook-conversation.zip，无需解压内层。已有材料和回答继续沿用，收到后继续生成离线 HTML。"
# preset-download-response:end


def safe_entries(package):
    seen = set()
    for entry in package.infolist():
        path = PurePosixPath(entry.filename)
        if (path.is_absolute() or '..' in path.parts or '\\' in entry.filename
                or not path.parts or stat.S_ISLNK(entry.external_attr >> 16)):
            raise ValueError('Unsafe archive entry: ' + entry.filename)
        if entry.filename in seen:
            raise ValueError('Duplicate archive entry: ' + entry.filename)
        seen.add(entry.filename)
        if path.parts[0] == '__MACOSX' or path.name == '.DS_Store':
            continue
        yield entry, path


def validate_archive(archive):
    with zipfile.ZipFile(archive) as package:
        for entry, path in safe_entries(package):
            if path.parts[0] != 'paper-notebook':
                raise ValueError('Unsafe archive entry: ' + entry.filename)
        for name in REQUIRED:
            entry = package.getinfo('paper-notebook/' + name)
            if entry.is_dir():
                raise ValueError('Runtime file is a directory: ' + name)
        if package.testzip() is not None:
            raise ValueError('Incomplete or corrupt ZIP')


def runtime_archive(archive, temporary):
    """Accept the normal runtime or one official upload wrapper, never recurse."""
    with zipfile.ZipFile(archive) as package:
        entries = list(safe_entries(package))
        if 'paper-notebook/START-HERE.md' in package.namelist():
            validate_archive(archive)
            return archive
        nested = 'paper-notebook-upload/paper-notebook-conversation.zip'
        allowed = {'paper-notebook-upload', nested, 'paper-notebook-upload/上传说明.txt'}
        for entry, path in entries:
            if str(path) not in allowed:
                raise ValueError('Unexpected upload wrapper entry: ' + entry.filename)
        inner = package.getinfo(nested)
        if inner.is_dir() or inner.file_size > 64 * 1024 * 1024:
            raise ValueError('Invalid or oversized nested runtime ZIP')
        if package.testzip() is not None:
            raise ValueError('Incomplete or corrupt upload ZIP')
        target = Path(temporary) / 'unwrapped-runtime.zip'
        target.write_bytes(package.read(inner))
    validate_archive(target)
    return target


def download(url, destination, max_time=40):
    if shutil.which('curl'):
        subprocess.run(['curl', '--fail', '--location', '--silent', '--show-error',
                        '--connect-timeout', '10', '--max-time', str(max_time),
                        '--output', str(destination), url],
                       check=True, capture_output=True, text=True)
    else:
        with urlopen(url, timeout=30) as response, destination.open('wb') as target:
            shutil.copyfileobj(response, target)


def smoke_build(runtime):
    for name in REQUIRED:
        if not (runtime / name).is_file():
            raise ValueError('Missing runtime file: ' + name)
    result = subprocess.run([sys.executable, 'scripts/build_reader.py',
                             'assets/blank-notebook.json', '--out', 'runtime-check'],
                            cwd=runtime, capture_output=True, text=True)
    if result.returncode:
        raise ValueError(result.stderr.strip() or result.stdout.strip())
    report = json.loads((runtime / 'runtime-check/build-report.json').read_text())
    html_path = runtime / 'runtime-check' / report['html']
    html = html_path.read_text(encoding='utf-8')
    if 'id="notebook-data"' not in html and "id='notebook-data'" not in html:
        raise ValueError('Smoke build did not produce the notebook reader')
    return str(html_path.resolve())


def verify_runtime(runtime):
    manifest=json.loads((runtime/'runtime-manifest.json').read_text())
    if manifest.get('format')!=1 or not re.fullmatch(r'[0-9a-f]{64}',manifest.get('release','')):raise ValueError('Invalid runtime manifest')
    if not set(REQUIRED)-{'runtime-manifest.json'} <= set(manifest['files']):raise ValueError('Runtime manifest omits required files')
    for name,expected in manifest['files'].items():
        path=PurePosixPath(name)
        if path.is_absolute() or '..' in path.parts or '\\' in name:raise ValueError('Unsafe runtime manifest path: '+name)
        target=runtime/name
        if target.is_symlink() or hashlib.sha256(target.read_bytes()).hexdigest()!=expected:raise ValueError('Runtime file fingerprint mismatch: '+name)
    return manifest


def prepare(out, archive=None, url=PACKAGE_URL, offline=False):
    out=out.resolve();out.mkdir(parents=True,exist_ok=True);runtime=out/'paper-notebook'
    update_status='offline' if offline else 'unavailable';latest=None
    if not offline:
        try:
            with tempfile.TemporaryDirectory(prefix='paper-notebook-version-') as temp:
                metadata=Path(temp)/'runtime.json'
                download(urljoin(url,'runtime.json')+'?check='+str(time.time_ns()),metadata,10)
                latest=json.loads(metadata.read_text())
                if latest.get('format')!=1 or not latest.get('sha256') or not latest.get('release'):raise ValueError('Invalid published runtime metadata')
                update_status='checked'
        except Exception:
            latest=None
    existing=None
    if runtime.is_dir():
        try:existing=verify_runtime(runtime)
        except (ValueError,OSError,KeyError):pass
    if existing and not archive and (latest is None or existing['release']==latest['release']):
        return dict(status='ready',source='existing',runtime=str(runtime),release=existing['release'],updateStatus=update_status,smokeHTML=smoke_build(runtime),manualUploadRequired=False)
    with tempfile.TemporaryDirectory(prefix='.runtime-stage-',dir=out) as temporary:
        temporary=Path(temporary);stage=temporary/'staged';stage.mkdir()
        downloaded=temporary/'conversation.zip'
        needs_download=bool(latest and (not existing or latest['release']!=existing['release'])) or archive is None
        if needs_download:
            if offline:raise ValueError('No verified runtime or archive available offline')
            source='updated' if runtime.is_dir() else 'download'
            for attempt in range(2):
                try:
                    download(url+('?release='+latest['release'] if latest else ''),downloaded)
                    if latest and hashlib.sha256(downloaded.read_bytes()).hexdigest()!=latest['sha256']:raise ValueError('Downloaded runtime does not match published package fingerprint; retry after deployment completes')
                    archive=runtime_archive(downloaded,temporary);break
                except Exception:
                    if attempt:raise
        else:
            source='attachment';archive=runtime_archive(archive,temporary)
        with zipfile.ZipFile(archive) as package:
            for entry,path in safe_entries(package):
                if path.parts[0]=='paper-notebook' and path.name!='.DS_Store':package.extract(entry,stage)
        fresh=stage/'paper-notebook';manifest=verify_runtime(fresh)
        if latest and manifest['release']!=latest['release']:raise ValueError('Archive release differs from the version check')
        # Copy user-created sources, outputs and records; only release-managed files are replaced.
        merged=temporary/'merged'
        if runtime.is_dir():shutil.copytree(runtime,merged)
        else:merged.mkdir()
        old_files=(existing or {}).get('files',{})
        for name in old_files:
            if name not in manifest['files'] and (merged/name).is_file():(merged/name).unlink()
        shutil.copytree(fresh,merged,dirs_exist_ok=True)
        verify_runtime(merged);smoke_build(merged)
        backup=temporary/'previous'
        if runtime.exists():runtime.rename(backup)
        try:merged.rename(runtime)
        except Exception:
            if backup.exists():backup.rename(runtime)
            raise
        return dict(status='ready',source=source,runtime=str(runtime),release=manifest['release'],updateStatus='updated' if source=='updated' else update_status,smokeHTML=str(runtime/'runtime-check'/json.loads((runtime/'runtime-check/build-report.json').read_text())['html']),manualUploadRequired=False)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive',type=Path)
    parser.add_argument('--url',default=PACKAGE_URL)
    parser.add_argument('--out',type=Path,default=Path('paper-notebook-runtime'))
    parser.add_argument('--offline',action='store_true',help='Use a verified local package without checking the release server')
    args=parser.parse_args()
    try:
        print(json.dumps(prepare(args.out,args.archive,args.url,args.offline),ensure_ascii=False));return 0
    except Exception as error:
        detail=error.stderr.strip() if isinstance(error,subprocess.CalledProcessError) else str(error)
        needs_upload=not args.archive and not (args.out/'paper-notebook').is_dir()
        response=dict(status='upload_required' if needs_upload else 'runtime_invalid',stage='download' if needs_upload else 'runtime',detail=detail,manualUploadRequired=needs_upload,packageURL=args.url)
        if needs_upload:response['userMessage']=DOWNLOAD_MESSAGE
        print(json.dumps(response,ensure_ascii=False));return 1


if __name__=='__main__':sys.exit(main())
