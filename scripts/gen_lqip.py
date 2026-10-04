"""为文档区配图生成 LQIP（低清占位图）表。

为什么需要
----------
文档页的 <img> 带 width/height，浏览器会**立刻按真实比例预留**一块空间，
而那块空间在图片数据到达前是 `background: #201d18` 的深色 —— 实测真机
（Fast 3G）"文本已就绪但图还黑着"的空窗有 **约 5.9 秒**（4G 良好也有 1.9 秒）。
把每张图缩到 20px 宽、base64 内联进 `figure` 的 background-image 后，
用户**立刻看到一张模糊的图**，真图加载完自然覆盖上去。

成本（实测 251 张）
------------------
宽 20px / q40：平均 base64 **127 B**，最大 204 B。单页最多 11 张图 → 约 **1.4 KB** 内联。

用法
----
    python scripts/gen_lqip.py            # 全量重建 src/data/doc-lqip.json
    python scripts/gen_lqip.py --check    # 只核对是否有缺项（CI/构建前用）

⚠️ 源图是 public/docs/ue5/images/**/*.webp（进 git 的站点资产），不是 materials/ 里的原图 ——
   文档区配图的原图在项目外（见 .gitignore 的说明）。
"""
from __future__ import annotations

import argparse
import base64
import io
import json
import os
import sys

from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ⚠️ 两个图片根都要扫（2026-10 第十九轮补）：
#   · ue5/    → public/docs/ue5/images/**          共 251 张
#   · thesis/ → public/docs/thesis/images/**       共 41 张
#   键里带前缀（`ue5/…` / `thesis/…`）避免同名撞车；构建侧用 `rel`（库内相对路径）查表。
IMAGE_ROOTS = [
    ("ue5", os.path.join(ROOT, "public", "docs", "ue5", "images")),
    ("thesis", os.path.join(ROOT, "public", "docs", "thesis", "images")),
]
OUT = os.path.join(ROOT, "src", "data", "doc-lqip.json")

WIDTH = 20
QUALITY = 40


def collect() -> list[tuple[str, str]]:
    """返回 (键, 磁盘绝对路径) 列表。键形如 `ue5/蓝图基础/x.webp`。"""
    out: list[tuple[str, str]] = []
    for prefix, root_dir in IMAGE_ROOTS:
        if not os.path.isdir(root_dir):
            continue
        for dirpath, _dirnames, filenames in os.walk(root_dir):
            for name in filenames:
                if name.lower().endswith(".webp"):
                    full = os.path.join(dirpath, name)
                    rel = os.path.relpath(full, root_dir).replace(os.sep, "/")
                    out.append((f"{prefix}/{rel}", full))
    return sorted(out)


def make_lqip(path: str) -> str:
    im = Image.open(path).convert("RGB")
    h = max(1, round(im.height * WIDTH / im.width))
    buf = io.BytesIO()
    im.resize((WIDTH, h), Image.LANCZOS).save(buf, "WEBP", quality=QUALITY, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="只核对缺项，不写文件")
    args = ap.parse_args()

    rels = collect()
    print(f"扫描到配图 {len(rels)} 张（" + "、".join(f"{p}/ {os.path.relpath(d, ROOT)}" for p, d in IMAGE_ROOTS) + "）")

    existing: dict[str, str] = {}
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as f:
            existing = json.load(f)

    if args.check:
        keys = {k for k, _ in rels}
        missing = [k for k, _ in rels if k not in existing]
        stale = [k for k in existing if k not in keys]
        if missing:
            print(f"✗ 有 {len(missing)} 张配图缺少 LQIP（跑 python scripts/gen_lqip.py 重建）：")
            for m in missing[:10]:
                print("   ·", m)
        if stale:
            print(f"⚠️ 表里有 {len(stale)} 条已失效（图没了）：{stale[:5]}")
        if not missing:
            print(f"✓ LQIP 表完整（{len(existing)} 条）")
        raise SystemExit(1 if missing else 0)

    table: dict[str, str] = {}
    total = 0
    worst = 0
    for i, (key, path) in enumerate(rels, 1):
        data = make_lqip(path)
        table[key] = data
        n = len(data)
        total += n
        worst = max(worst, n)
        if i % 50 == 0:
            print(f"  …{i}/{len(rels)}")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(table, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        f.write("\n")

    size_kb = os.path.getsize(OUT) / 1024
    print(
        f"✔ 已写出 {os.path.relpath(OUT, ROOT)}：{len(table)} 条 ｜ "
        f"平均 {total // max(1, len(table))} B ｜ 最大 {worst} B ｜ 文件 {size_kb:.1f} KB"
    )
    print(f"  单页按 11 张算，内联开销约 {total // max(1, len(table)) * 11 / 1024:.1f} KB")


if __name__ == "__main__":
    main()
