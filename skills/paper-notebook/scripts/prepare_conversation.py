"""Acquire the portable runtime, verify it, and prove it can generate HTML."""
import argparse
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
            'scripts/study_quality.py', 'scripts/content_review.py', 'references/writing-rules.json',
            'references/notebook.schema.json')

# preset-download-response:start
DOWNLOAD_MESSAGE = "当前对话无法自动取得阅读器。请[下载官方构建包](https://burntroses.github.io/paper-notebook/downloads/paper-notebook-conversation.zip)，将 ZIP 上传到这里，无需解压。若下载后只看到 paper-notebook 文件夹，请右键压缩整个文件夹，再上传生成的 ZIP。已有材料和回答会保留，收到后继续生成离线 HTML。"
# preset-download-response:end


def validate_archive(archive):
    with zipfile.ZipFile(archive) as package:
        for name in REQUIRED:
            package.getinfo('paper-notebook/' + name)
        for entry in package.infolist():
            path = PurePosixPath(entry.filename)
            if (path.is_absolute() or '..' in path.parts or '\\' in entry.filename
                    or not path.parts or stat.S_ISLNK(entry.external_attr >> 16)):
                raise ValueError('Unsafe archive entry: ' + entry.filename)
            if path.parts[0] == '__MACOSX' or path.name == '.DS_Store':
                continue
            if path.parts[0] != 'paper-notebook':
                raise ValueError('Unsafe archive entry: ' + entry.filename)
        if package.testzip() is not None:
            raise ValueError('Incomplete or corrupt ZIP')


def download(url, destination):
    if shutil.which('curl'):
        subprocess.run(['curl', '--fail', '--location', '--silent', '--show-error',
                        '--connect-timeout', '10', '--max-time', '40',
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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, help='Reuse an uploaded ZIP without network access')
    parser.add_argument('--url', default=PACKAGE_URL)
    parser.add_argument('--out', type=Path, default=Path('paper-notebook-runtime'))
    args = parser.parse_args()
    runtime = args.out.resolve() / 'paper-notebook'
    source = 'existing'
    stage = 'runtime'
    try:
        if not runtime.is_dir():
            with tempfile.TemporaryDirectory(prefix='paper-notebook-prepare-') as temporary:
                archive = args.archive or Path(temporary) / 'conversation.zip'
                stage = 'archive' if args.archive else 'download'
                if args.archive:
                    validate_archive(archive)
                    source = 'attachment'
                else:
                    for attempt in range(2):
                        try:
                            download(args.url, archive)
                            validate_archive(archive)
                            break
                        except Exception:
                            if attempt == 1:
                                raise
                    source = 'download'
                stage = 'runtime'
                with zipfile.ZipFile(archive) as package:
                    for entry in package.infolist():
                        path = PurePosixPath(entry.filename)
                        if path.parts[0] == 'paper-notebook' and path.name != '.DS_Store':
                            package.extract(entry, temporary + '/extracted')
                args.out.mkdir(parents=True, exist_ok=True)
                shutil.move(temporary + '/extracted/paper-notebook', runtime)
        html = smoke_build(runtime)
        print(json.dumps({'status': 'ready', 'source': source,
                          'runtime': str(runtime), 'smokeHTML': html,
                          'manualUploadRequired': False}))
        return 0
    except Exception as error:
        detail = error.stderr.strip() if isinstance(error, subprocess.CalledProcessError) else str(error)
        response = {'status': 'upload_required' if stage == 'download' else 'runtime_invalid',
                          'stage': stage, 'detail': detail,
                          'manualUploadRequired': stage == 'download',
                          'packageURL': args.url}
        if stage == 'download':
            response['userMessage'] = DOWNLOAD_MESSAGE
        print(json.dumps(response, ensure_ascii=False))
        return 1


if __name__ == '__main__':
    sys.exit(main())
