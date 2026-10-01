"""从已验证的 Python 核心导出 Web 算法对照数据，仅使用标准库。"""
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import sys

project = Path(__file__).resolve().parents[1]
reference = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else project.parent / 'desktop-archive' / 'keil_core.py'
spec = importlib.util.spec_from_file_location('python_reference', reference)
core = importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)
seeds = [0, 1, 5489, 0xffffffff]
cids = ['12345-67890', 'ABCDE-FGHIJ', 'K3IL9-8WB2X']
cases = []
for seed in seeds:
    for target in range(4):
        for license_type in range(11):
            for cid in cids:
                cases.append(dict(seed=seed, cid=cid, license=license_type, target=target,
                                  serial=core.generate_serial(cid, license_type, target, seed=seed)))
for cid in ['00000-00000', 'OOOOO-OOOOO', 'abcde-fghij', '!@#$%-^&*()', '-----------', '     -     ', 'ZZZZZ-ZZZZZ']:
    cases.append(dict(seed=1, cid=cid, license=10, target=3,
                      serial=core.generate_serial(cid, 10, 3, seed=1)))
session = core.Keygen(5489)
sequence = []
for i in range(80):
    cid, license_type, target = cids[i % 3], i % 11, i % 4
    sequence.append(dict(cid=cid, license=license_type, target=target,
                         serial=session.generate(cid, license_type, target)))
streams = []
for seed in seeds:
    rng = core.LegacyRandom(seed)
    raw = b''.join(struct.pack('<I', rng.uint32()) for _ in range(1300))
    streams.append(dict(seed=seed, count=1300, sha256=hashlib.sha256(raw).hexdigest()))
vectors = dict(reference='keil_core.py', reference_sha256=hashlib.sha256(reference.read_bytes()).hexdigest(),
               targets=list(core.TARGETS), licenses=list(core.LICENSE_TYPES),
               cases=cases, sequence_seed=5489, sequence=sequence, random_streams=streams)
destination = project / 'tests' / 'fixtures' / 'python-reference.json'
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(vectors, ensure_ascii=True, separators=(',', ':')) + '\n', encoding='utf-8')
print(f'已导出 {len(cases)} 组独立结果、{len(sequence)} 次连续结果、4 组随机流摘要。')
print(f'Python 核心 SHA-256: {vectors["reference_sha256"]}')
