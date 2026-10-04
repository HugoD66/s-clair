#!/usr/bin/env python3
"""Check tracked Markdown and Python files without requiring private documents."""

import ast
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]


def main():
    errors = []
    tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT)
    paths = [ROOT / name for name in tracked.decode().split('\0') if name]
    published = {path.resolve() for path in paths}

    ignored = subprocess.run(
        ['git', 'check-ignore', '--no-index', '--stdin', '-z'],
        cwd=ROOT, input=tracked, capture_output=True, check=False,
    )
    if ignored.returncode not in (0, 1):
        print('Impossible de vérifier les exclusions Git.', file=sys.stderr)
        return 1
    for name in ignored.stdout.decode().split('\0'):
        if name:
            errors.append(f'Fichier suivi malgré une exclusion Git : {name}')

    for path in paths:
        if path.suffix not in ('.md', '.py'):
            continue
        text = path.read_text(encoding='utf-8')
        name = path.relative_to(ROOT)
        for number, line in enumerate(text.splitlines(), 1):
            if line != line.rstrip():
                errors.append(f'{name}:{number}: espace final')
        if path.suffix == '.py':
            try:
                ast.parse(text, filename=str(name))
            except SyntaxError as error:
                errors.append(f'{name}: {error}')
            continue
        for target in re.findall(r'\]\(([^)]+)\)', text):
            link = urlsplit(target.strip('<>'))
            if link.scheme or link.netloc or not link.path:
                continue
            destination = (path.parent / unquote(link.path)).resolve()
            if destination not in published:
                errors.append(f'{name}: lien vers un fichier non publié : {target}')

    if errors:
        print('\n'.join(errors), file=sys.stderr)
        return 1
    print('Exclusions Git, liens locaux, espaces et syntaxe Python vérifiés.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
