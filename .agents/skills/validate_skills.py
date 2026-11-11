#!/usr/bin/env python3
"""Валидатор всех Agent Skills в .agents/skills/ (только stdlib Python)."""
import re
import sys
from pathlib import Path

ALLOWED_KEYS = {'name', 'description', 'license', 'allowed-tools', 'metadata', 'compatibility'}


def parse_frontmatter(fm_text: str) -> dict:
    data = {}
    lines = fm_text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip() or line.lstrip().startswith('#'):
            i += 1
            continue
        if line[0].isspace() or ':' not in line:
            i += 1
            continue
        key, rest = line.split(':', 1)
        key = key.strip()
        val = rest.strip()
        if val in ('>-', '>', '|-', '|'):
            buf = []
            i += 1
            while i < len(lines) and (lines[i].startswith(' ') or lines[i].startswith('\t') or not lines[i].strip()):
                if lines[i].strip():
                    buf.append(lines[i].strip())
                i += 1
            data[key] = ' '.join(buf)
            continue
        elif val == '':
            nested = {}
            i += 1
            while i < len(lines) and (lines[i].startswith(' ') or lines[i].startswith('\t') or not lines[i].strip()):
                sub = lines[i].strip()
                if sub and ':' in sub and not sub.startswith('-'):
                    sk, sv = sub.split(':', 1)
                    nested[sk.strip()] = sv.strip().strip('"\'')
                i += 1
            data[key] = nested if nested else ''
            continue
        else:
            if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                val = val[1:-1]
            data[key] = val
            i += 1
    return data


def validate_skill_dir(skill_dir: Path) -> list[str]:
    errors = []
    skill_md = skill_dir / 'SKILL.md'
    if not skill_md.exists():
        return ['Missing SKILL.md']

    text = skill_md.read_text(encoding='utf-8')
    if not text.startswith('---\n'):
        return ['Missing YAML frontmatter opening ---']

    m = re.match(r'^---\n(.*?)\n---\n?(.*)$', text, re.DOTALL)
    if not m:
        return ['Malformed YAML frontmatter closing ---']

    fm = parse_frontmatter(m.group(1))
    body = m.group(2).strip()

    extra = set(fm.keys()) - ALLOWED_KEYS
    if extra:
        errors.append(f'Unexpected frontmatter keys: {sorted(extra)}')

    name = fm.get('name', '')
    if not isinstance(name, str) or not name:
        errors.append("Missing 'name'")
    else:
        if not re.match(r'^[a-z0-9-]+$', name) or name.startswith('-') or name.endswith('-') or '--' in name:
            errors.append(f"Invalid kebab-case name '{name}'")
        if len(name) > 64:
            errors.append(f"Name exceeds 64 chars ({len(name)})")
        if name != skill_dir.name:
            errors.append(f"Frontmatter name '{name}' != directory '{skill_dir.name}'")

    desc = fm.get('description', '')
    if not isinstance(desc, str) or not desc:
        errors.append("Missing 'description'")
    else:
        if '<' in desc or '>' in desc:
            errors.append("Description contains '<' or '>'")
        if len(desc) > 1024:
            errors.append(f"Description exceeds 1024 chars ({len(desc)})")

    if len(body) < 80:
        errors.append("Body is unexpectedly short")

    return errors


def main():
    root = Path(__file__).resolve().parent
    dirs = sorted(p for p in root.iterdir() if p.is_dir() and not p.name.startswith('.') and p.name != '__pycache__')
    failed = 0
    for d in dirs:
        errs = validate_skill_dir(d)
        if errs:
            failed += 1
            print(f'FAIL {d.name}: ' + '; '.join(errs))
        else:
            print(f'OK   {d.name}')
    print(f'\nValidated {len(dirs)} skills: {len(dirs) - failed} passed, {failed} failed.')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
