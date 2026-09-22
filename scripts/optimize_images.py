# 站点图片压缩：任意目录的 PNG/JPG → WebP（与 public/projects/*.webp 同一套参数口径）
#
# 用法：
#   python scripts/optimize_images.py <源目录> <输出目录> [--max-width 1600] [--quality 82] [--threads 8]
#   python scripts/optimize_images.py <源目录> <输出目录> --only a.png,b/c.png   # 只处理指定相对路径
#
# 为什么需要它：UE 学习笔记里的截图是 2560×1440 级 PNG（单张最大 1.47MB，193 张合计 124MB），
# 直接上线会让站点体积失控。这里统一压到 WebP（长边 1600、质量 82），
# 实测同类 UI 截图可压到 60–150KB，视觉上仍能看清编辑器里的文字。
#
# ⚠️ 已存在且不比源文件旧的输出会跳过（幂等、可重复跑）。
# ⚠️ 原图不入 public/，只归档在 _archive/ 下；本脚本只负责生成站点用的 WebP。
import argparse
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("需要 Pillow：pip install Pillow")

Image.MAX_IMAGE_PIXELS = None  # 截图类大图不做炸弹保护限制
EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def optimize(src: Path, dst: Path, src_root: Path, max_width: int, quality: int) -> tuple[str, int, int]:
    rel = src.relative_to(src_root).as_posix()
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        return ("skip", rel, dst.stat().st_size)
    with Image.open(src) as im:
        im = im.convert("RGBA") if im.mode in ("P", "LA") else im.convert("RGB")
        if im.width > max_width:
            height = round(im.height * max_width / im.width)
            im = im.resize((max_width, height), Image.LANCZOS)
        im.save(dst, "WEBP", quality=quality, method=5)
    return ("ok", rel, dst.stat().st_size)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("output")
    ap.add_argument("--max-width", type=int, default=1600)
    ap.add_argument("--quality", type=int, default=82)
    ap.add_argument("--threads", type=int, default=8)
    ap.add_argument("--only", default="", help="逗号分隔的相对路径白名单（用 / 分隔）")
    ap.add_argument(
        "--only-file",
        default="",
        help="从 UTF-8 文件读白名单（每行一个相对路径）。"
        "⚠️ Windows 上用 --only 传中文路径会被 PowerShell 的 ANSI 编码搞坏（实测乱码后匹配不到任何文件），"
        "所以含中文的清单一律走这个参数。",
    )
    ap.add_argument(
        "--only-from-md",
        action="append",
        default=[],
        help="从 markdown 文件里提取图片引用作为白名单（可重复）。"
        "⚠️ 这是**首选**的限定方式：Windows 上经 PowerShell 传中文路径参数会被 ANSI 编码搞坏，"
        "而 markdown 文件本身是 UTF-8，直接读它不经过命令行编码。",
    )
    args = ap.parse_args()

    src_root = Path(args.source).resolve()
    out_root = Path(args.output).resolve()
    if not src_root.is_dir():
        sys.exit(f"[error] source dir not found: {src_root}")

    only = {x.strip().replace("\\", "/") for x in args.only.split(",") if x.strip()}
    if args.only_file:
        lines = Path(args.only_file).read_text(encoding="utf-8").splitlines()
        only |= {x.strip().replace("\\", "/") for x in lines if x.strip()}
    for md in args.only_from_md:
        text = Path(md).read_text(encoding="utf-8")
        # 覆盖两种写法：内联 HTML 的 <img src="...">（本笔记主力）与 markdown 的 ![](...)
        refs = [m.group(1) or m.group(2) for m in re.finditer(r'<img[^>]+src="([^"]+)"|!\[[^\]]*\]\(([^)]+)\)', text)]
        only |= {r.replace("\\", "/").strip() for r in refs}
        print(f"  从 {Path(md).name} 提取 {len(refs)} 条引用")

    # markdown 里的路径通常以 `images/` 开头（相对笔记根目录），而 --source 常常直接就是那个 images 目录。
    # 两种都认：多一层前缀时自动剥掉再试，省得每次都要调用方去对齐目录层级。
    stripped = {r[len("images/"):] for r in only if r.startswith("images/")}
    only |= stripped
    files = [
        p
        for p in sorted(src_root.rglob("*"))
        if p.is_file()
        and p.suffix.lower() in EXTS
        and (not only or p.relative_to(src_root).as_posix() in only)
    ]
    if not files:
        sys.exit("[error] no images matched (check --only / --only-file / --only-from-md, or the source dir)")

    # 输出统一用 .webp 后缀，源里的中文目录名原样保留（与 markdown 里的路径一一对应）
    jobs = [(p, out_root / p.relative_to(src_root).with_suffix(".webp")) for p in files]

    done = skipped = 0
    total_bytes = 0
    with ThreadPoolExecutor(max_workers=args.threads) as pool:
        futures = [pool.submit(optimize, s, d, src_root, args.max_width, args.quality) for s, d in jobs]
        for i, fut in enumerate(futures, 1):
            status, rel, size = fut.result()
            total_bytes += size
            if status == "ok":
                done += 1
            else:
                skipped += 1
            if i % 20 == 0 or i == len(futures):
                print(f"  {i}/{len(futures)} …", flush=True)

    print(f"[ok] done: new={done} skipped={skipped} total={total_bytes / 1024 / 1024:.1f} MB -> {out_root}")


if __name__ == "__main__":
    main()
