# -*- coding: utf-8 -*-
"""简历 PDF 全页对角平铺水印（反爬 L3）。

为什么这样做：
  公开招聘的简历 PDF 无法从技术上阻止转发，能做的是**标明归属**——
  截图外流时水印跟着走，接收方能看出这是本人投递的简历、仅限招聘评估使用。

两条硬约束决定了实现方式：

1. **不能破坏文本层。**
   ATS（简历筛选系统）依赖可提取文本，所以不做「转图片再加水印」，
   而是把水印作为独立图层 merge 到原页上；原页文字对象保持原样。

2. **不能把简历撑大。**
   踩过的坑（都已验证）：
     - `L` / `1` 模式的位图：PIL 存 PDF 时会写成**不透明**，整页盖白，正文全看不见；
     - 整页 RGBA 位图：PIL 转成 DeviceRGB 存，只有 alpha 通道起作用 → 1.7MB（6.6 倍）；
     - 整页 RGBA + 二值 alpha：降到 846KB，仍偏大；
     - 用 PDF 图像 XObject + 变换矩阵平铺：内容流与 pypdf 解码不兼容，产出的文件会坏。
   最终方案：**整页 RGB 单色底 + 1-bit 软掩码**。
   RGB 三个通道全部是同一个灰值，Flate 几乎压到极限；alpha 二值化后一整片 0/255
   也极好压。最终整份只增加约 25KB，正文完全不受影响。

用法：
  python scripts/watermark_resume.py                        # 归档原件 -> public/downloads/resume.pdf
  python scripts/watermark_resume.py --in X.pdf --out Y.pdf
  python scripts/watermark_resume.py --text "..." --opacity 0.16 --font-size 10
"""
import argparse
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFont

# ⚠️ Windows 控制台默认 GBK，脚本里的「✔ / ⚠ / ·」会直接抛 UnicodeEncodeError 把收尾逻辑打断
#    （实测踩过：文件其实已经写出来了，但自检那几行全没打印，看着像失败）。
#    必须在任何 print 之前重设 stdout 编码。
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DEFAULT_IN = os.path.join(ROOT, 'materials', 'resumes', '蒋宇龙简历.pdf')
DEFAULT_OUT = os.path.join(ROOT, 'public', 'downloads', 'resume.pdf')
DEFAULT_TEXT = '蒋宇龙 · 简历 · 仅限招聘评估使用'
DEFAULT_SIZE_PT = 10.0
DEFAULT_OPACITY = 0.16

# 覆盖层栅格分辨率（像素/英寸）。110 既能保证 8pt 中文清晰，
# 又不会让整页掩码大到压不动（见模块开头的体积实测）。
DPI = 110
SCALE = DPI / 72.0

# 二值化阈值：alpha 高于此值即为水印实心像素
MASK_THRESHOLD = 96


def find_font():
    for path in (
        r'C:\Windows\Fonts\msyh.ttc',
        r'C:\Windows\Fonts\msyhl.ttc',
        r'C:\Windows\Fonts\simhei.ttf',
        r'C:\Windows\Fonts\simsun.ttc',
    ):
        if os.path.exists(path):
            return path
    raise SystemExit('未找到中文字体（msyh / simhei / simsun）')


def build_overlay(page_w_pt, page_h_pt, text, size_pt, opacity, color=(15, 46, 54), angle=30):
    """生成整页水印覆盖层（**一页矢量 PDF 的字节**）：斜向平铺文字。

    ⚠️⚠️ 这里换过三版，前两版都出了事故，别再退回去：
      ① **栅格 + Pillow 存 PDF**：带 alpha 时 Pillow 会选 **JPEG 2000（/JPXDecode）** ——
         Chrome 的 PDF 引擎直接忽略那一层（水印等于没画），文件还从 249 KB 涨到 389 KB。
         这是"阅读器报文件损坏"的经典来源。
      ② **栅格转 RGB 绕开 JPX**：蒙版随之丢掉，整页覆盖变**不透明** ——
         实测渲染每像素都是 38（纸底 244 → 38），**正文完全看不见**，比不打水印还糟。
      ③ 现在：**矢量文字**。体积约 3.4 KB、真正透明（纸底仍 244）、不含任何栅格编码，
         原页文本层也不受影响。浓度交给 `fill_opacity`，不需要"二值化 + 掩码"那一套。

    ⚠️ 字体用 PyMuPDF 内置的 `china-s`（简体中文），**不依赖系统字体** ——
       免得换台机器没有 msyh 就报错（`find_font()` 保留给别处/提示用）。
    """
    import pymupdf

    doc = pymupdf.open()
    page = doc.new_page(width=page_w_pt, height=page_h_pt)
    shape = page.new_shape()

    # 平铺步进按文字长度与字号推导：换文案或字号时疏密关系不变
    step_x = max(120.0, len(text) * size_pt * 1.05)
    step_y = max(80.0, size_pt * 8.5)
    diag = math.hypot(page_w_pt, page_h_pt)

    y = -diag
    row = 0
    while y < page_h_pt + diag:
        x = -diag + (step_x / 2 if row % 2 else 0)
        while x < page_w_pt + diag:
            """
            ⚠️ 斜向旋转必须用 `morph`，**不能用 `rotate=`** ——
               后者只接受 90 的倍数，传 30 会 `ValueError: bad rotate value`（实测）。
            ⚠️ 且 `morph` 的形状是 **(不动点, 矩阵)** 两元组，不是一个 Matrix
               （传 Matrix 会报 `morph must be a sequence of length 2`，实测）。
            这里以文字起点为不动点旋转 —— 起点不动，文字绕它转出斜向。
            """
            px, py = x, y + size_pt
            morph = (pymupdf.Point(px, py), pymupdf.Matrix(angle))
            shape.insert_text(
                (px, py),
                text,
                fontname='china-s',
                fontsize=size_pt,
                color=tuple(c / 255 for c in color),
                fill_opacity=opacity,
                morph=morph,
            )
            x += step_x
        y += step_y
        row += 1

    shape.finish()
    shape.commit()
    data = doc.tobytes(garbage=3, deflate=True)
    doc.close()
    return data


def stamp(src, dst, text, size_pt, opacity):
    """把水印叠到每一页上，再存盘。

    ⚠️ 最后一步为什么**不用 pypdf 写盘**：覆盖层带着内置中文字体，
       经 pypdf `merge_page` 后字体会被**重复嵌入**（实测 258 KB 原件 → 603 KB）。
       改用 PyMuPDF 的 `save(garbage=4, deflate=True)` 会做子集化与去重，体积正常。
    """
    import pymupdf

    doc = pymupdf.open(src)
    for page in doc:
        rect = page.rect
        ov_bytes = build_overlay(rect.width, rect.height, text, size_pt, opacity)
        ov_doc = pymupdf.open(stream=ov_bytes, filetype='pdf')
        page.show_pdf_page(rect, ov_doc, 0, overlay=True)
        ov_doc.close()

    doc.save(dst, garbage=4, deflate=True)
    pages_out = doc.page_count
    doc.close()

    # 自检：页数与文本层（ATS 友好）必须保持
    from pypdf import PdfReader

    check = PdfReader(dst)
    sample = (check.pages[0].extract_text() or '').strip()
    print(
        f'✔ 已生成 {os.path.relpath(dst, ROOT)}'
        f'（{len(check.pages)} 页，水印「{text}」，字号 {size_pt}pt，浓度 {round(opacity * 100)}%）'
    )
    ok_text = len(sample) > 40
    print(f'  文本层自检：{"可提取 " + str(len(sample)) + " 字符（ATS 友好）" if ok_text else "⚠ 未能提取文本，请检查"}')
    print(f'  页数自检：{len(check.pages)}/{pages_out}{"✓" if len(check.pages) == pages_out else " ✗ 页数不符"}')
    print(f'  体积：{os.path.getsize(dst) / 1024:.0f} KB（原件 {os.path.getsize(src) / 1024:.0f} KB）')
    verify_visible(src, dst)


def verify_visible(src, dst, dpi=100):
    """确认水印**真的画出来了**（渲染前后比像素）。

    ⚠️⚠️ 这条自检是 2026-10 第二十轮补的，因为上一版翻过车：
       二值化判据恒为假，掩码全 0，覆盖层是一张纯色空白图 —— 而当时脚本的自检
       只查"页数"和"文本可提取"，**两项都通过**，于是"水印压根没画出来"这件事
       一路发到了线上（用户下载简历后才发现）。体积还从 249 KB 涨到 389 KB。
    ⚠️ 依赖 PyMuPDF 渲染；没装就跳过并提示，不让它成为硬依赖（脚本其余部分只用 pypdf/PIL）。
    """
    try:
        import pymupdf  # noqa: PLC0415
    except ImportError:
        print('  可见性自检：跳过（未安装 PyMuPDF；装了才会做渲染比对）')
        return
    try:
        a = pymupdf.open(src).load_page(0).get_pixmap(dpi=dpi)
        b = pymupdf.open(dst).load_page(0).get_pixmap(dpi=dpi)
    except Exception as e:  # noqa: BLE001
        print(f'  可见性自检：⚠ 渲染失败（{type(e).__name__}: {e}）')
        return
    sa, sb = a.samples, b.samples
    if len(sa) != len(sb):
        print('  可见性自检：⚠ 两页尺寸不一致，无法比对')
        return
    diff = sum(1 for x, y in zip(sa, sb) if x != y)
    ratio = diff / max(1, len(sa))
    if ratio < 0.001:
        print(f'  ⚠⚠ 可见性自检**未通过**：与原件渲染差异仅 {ratio:.4%} —— 水印没画出来！')
    else:
        print(f'  可见性自检：与原件渲染差异 {ratio:.2%} ✓（水印确实画上了）')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--in', dest='src', default=DEFAULT_IN)
    ap.add_argument('--out', dest='dst', default=DEFAULT_OUT)
    ap.add_argument('--text', default=DEFAULT_TEXT)
    ap.add_argument('--font-size', type=float, default=DEFAULT_SIZE_PT, help='水印字号（点，默认 10）')
    ap.add_argument('--opacity', type=float, default=DEFAULT_OPACITY, help='水印不透明度 0-1（默认 0.16）')
    args = ap.parse_args()

    if not os.path.exists(args.src):
        raise SystemExit(f'找不到输入文件：{args.src}')
    os.makedirs(os.path.dirname(args.dst), exist_ok=True)
    stamp(args.src, args.dst, args.text, args.font_size, args.opacity)
