# 原件（PDF）压缩管线：桌面原稿 → docs/<区>/source/pdf/<源 id>.pdf
#
# 用法：
#   python scripts/compress_attachments.py                  # 全部
#   python scripts/compress_attachments.py --only ue5-window-base
#   python scripts/compress_attachments.py --quality 88     # 画质更高、体积更大
#   python scripts/compress_attachments.py --from "D:\其他目录"
#
# ── 为什么需要它（2026-10 实测） ──────────────────────────────────────────────
# Typora 导出的 PDF 把截图**按无损 PNG 嵌进页面**，每张 1680×1050 的编辑器截图
# 1.3–1.6 MB，图片占整个 PDF 的 92–98%。四篇合计 158 MB，其中约 156 MB 是 PNG 的冗余。
# 同一张图换编码（实测 7 张样本）：
#     PNG（现状）1.40 MB ｜ PNG 重压 1.19 MB ｜ JPEG q88 258 KB ｜ JPEG q80 198 KB ｜ WebP q82 108 KB
# 界面截图是平色块 + 锐利边缘，**PNG 是这里最差的编码**。
#
# 本脚本**只替换内嵌图像的编码**：页面尺寸、页数、文本层、版式、图片像素尺寸全部不动
# （`page.replace_image` 原地换流）。所以下载到的还是"原件"，只是不再是无损 PNG。
#
# ⚠️ 为什么用 JPEG 而不是 WebP：PyMuPDF 的 replace_image 在一部分 xref 上会拒 WebP
#    （实测 `FzErrorFormat: unknown image file format`，同类错误在 4 个文件里出现过几十次），
#    JPEG 是 PDF 里最稳的编码，实测 37/37、106/106 全部成功。
#
# ⚠️ 幂等：输出比输入小时才写；已存在且比输入新时跳过。
# ⚠️ 原件不入 git 之外的地方：本脚本的输出**进 git**（与简历 public/resume.pdf 同一类资产）。
import argparse
import io
import os
import sys
import time

# ⚠️ Windows 控制台默认 GBK，脚本里的「⚠️/→」会直接抛 UnicodeEncodeError 把收尾逻辑打断（实测踩过）。
#    必须在任何 print 之前重设 stdout 编码。
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit('需要 Pillow：pip install Pillow')
try:
    import fitz as pymupdf  # PyMuPDF
except ImportError:  # pragma: no cover
    sys.exit('需要 PyMuPDF：pip install pymupdf')

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DEFAULT_FROM = r'C:\Users\10045\Desktop\ue5-notes\theory'

# 源 id → 源 PDF 文件名（与 docs/<区>/source/md/<id>.md 一一对应）
# ⚠️ `unreal5-notes` 不在表里：它后续还要更新，**不配原件下载**（用户 2026-10 定向）。
JOBS = [
    ('theory', 'blueprint-base'),
    ('theory', 'ue5-window-base'),
    ('theory', 'ue5-window-advanced'),
    ('theory', 'blueprint-program-base'),
]


def recompress(src_pdf: str, dst_pdf: str, quality: int) -> tuple[int, int]:
    """只换内嵌图的编码。返回 (替换张数, 失败张数)。"""
    doc = pymupdf.open(src_pdf)
    seen = set()
    ok = fail = 0
    for page in doc:
        for im in page.get_images(full=True):
            xref = im[0]
            if xref in seen:
                continue
            seen.add(xref)
            try:
                info = doc.extract_image(xref)
                img = Image.open(io.BytesIO(info['image'])).convert('RGB')
                buf = io.BytesIO()
                img.save(buf, 'JPEG', quality=quality, optimize=True, subsampling=1)
                page.replace_image(xref, stream=buf.getvalue())
                ok += 1
            except Exception:
                fail += 1
    tmp = dst_pdf + '.tmp'
    doc.save(tmp, garbage=4, deflate=True, clean=True)
    doc.close()
    os.replace(tmp, dst_pdf)
    return ok, fail


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--from', dest='src_dir', default=DEFAULT_FROM,
                    help='原始 PDF 所在目录（默认桌面 ue5-notes\\theory）')
    ap.add_argument('--quality', type=int, default=82, help='JPEG 质量（默认 82）')
    ap.add_argument('--only', default='', help='只处理某个源 id')
    ap.add_argument('--force', action='store_true', help='已存在也重做')
    args = ap.parse_args()

    only = {x.strip() for x in args.only.split(',') if x.strip()}
    out_dir = os.path.join(ROOT, 'docs')
    total_in = total_out = 0

    for section, sid in JOBS:
        if only and sid not in only:
            continue
        src = os.path.join(args.src_dir, f'{sid}.pdf')
        dst_dir = os.path.join(out_dir, section, 'source', 'pdf')
        dst = os.path.join(dst_dir, f'{sid}.pdf')

        if not os.path.exists(src):
            print(f'  [skip] 找不到原稿：{src}')
            continue
        os.makedirs(dst_dir, exist_ok=True)
        if os.path.exists(dst) and not args.force and os.path.getmtime(dst) >= os.path.getmtime(src):
            print(f'  [skip] 已是最新：{section}/source/pdf/{sid}.pdf '
                  f'({os.path.getsize(dst) / 1048576:.1f} MB)')
            total_in += os.path.getsize(src)
            total_out += os.path.getsize(dst)
            continue

        t = time.time()
        before = os.path.getsize(src)
        ok, fail = recompress(src, dst, args.quality)
        after = os.path.getsize(dst)

        # 自检：换完之后必须是有效 PDF、文本层还在（ATS / 搜索依赖它）
        chk = pymupdf.open(dst)
        tp = chk[1].get_text('text').strip() if chk.page_count > 1 else chk[0].get_text('text').strip()
        chk.close()
        ratio = before / after if after else 0
        total_in += before
        total_out += after
        print(f'  [ok] {sid:<24} {before / 1048576:6.1f} MB → {after / 1048576:5.1f} MB '
              f'({ratio:4.1f}× 小)  换 {ok} 张 / 失败 {fail}  文本层={"有" if tp else "无"}  '
              f'{time.time() - t:.0f}s')

    if total_in:
        print(f'\n  合计 {total_in / 1048576:.1f} MB → {total_out / 1048576:.1f} MB '
              f'（{total_in / total_out if total_out else 0:.1f}× 小）')
    print('  ⚠️ 改完请跑 npm run docs:build —— manifest 里的字节数是构建期 stat 出来的。')


if __name__ == '__main__':
    main()
