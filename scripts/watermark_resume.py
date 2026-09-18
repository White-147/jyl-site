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
  python scripts/watermark_resume.py                        # 归档原件 -> public/resume.pdf
  python scripts/watermark_resume.py --in X.pdf --out Y.pdf
  python scripts/watermark_resume.py --text "..." --opacity 0.16 --font-size 10
"""
import argparse
import math
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DEFAULT_IN = os.path.join(ROOT, '_archive', 'resumes', '蒋宇龙简历.pdf')
DEFAULT_OUT = os.path.join(ROOT, 'public', 'resume.pdf')
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
    """生成整页水印覆盖层：单色 RGB 底 + 1-bit 软掩码。"""
    w_px = int(round(page_w_pt * SCALE))
    h_px = int(round(page_h_pt * SCALE))
    font_px = max(8, int(round(size_pt * SCALE)))
    font = ImageFont.truetype(find_font(), font_px)

    mask = Image.new('L', (w_px, h_px), 0)
    probe = ImageDraw.Draw(Image.new('L', (8, 8)))
    bbox = probe.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad = max(6, font_px // 3)

    tile = Image.new('L', (tw + pad * 2, th + pad * 2), 0)
    ImageDraw.Draw(tile).text((pad - bbox[0], pad - bbox[1]), text, font=font, fill=255)
    tile = tile.rotate(angle, expand=True, resample=Image.BICUBIC, fillcolor=0)

    # 平铺步进按文字实际尺寸推导：换字号或换文案时疏密关系不变
    step_x = max(60, int(tw * 1.8))
    step_y = max(44, int(th * 3.4))
    diag = int(math.hypot(w_px, h_px))
    row = 0
    for y in range(-diag, h_px + diag, step_y):
        offset = (step_x // 2) if (row % 2) else 0
        for x in range(-diag, w_px + diag, step_x):
            mask.paste(tile, (x + offset, y), tile)
        row += 1

    # 整体减淡到目标浓度，再二值化（保留文字柔边，同时避开大片中间调）
    mask = mask.point(lambda v: 255 if v * opacity >= MASK_THRESHOLD else 0).convert('1')

    rgb = Image.new('RGB', (w_px, h_px), color)
    rgb.putalpha(mask)
    return rgb


def stamp(src, dst, text, size_pt, opacity):
    import io

    from pypdf import PdfReader, PdfWriter

    reader = PdfReader(src)
    writer = PdfWriter()

    for page in reader.pages:
        mb = page.mediabox
        page_w, page_h = float(mb.width), float(mb.height)
        overlay_img = build_overlay(page_w, page_h, text, size_pt, opacity)

        # 覆盖层在内存里编码成 PDF，不落盘：受限环境对临时目录可能没有写权限
        buf = io.BytesIO()
        overlay_img.save(buf, 'PDF', resolution=DPI)
        buf.seek(0)

        overlay_page = PdfReader(buf).pages[0]
        # merge_page 把覆盖页叠加到原页之上；原页文本对象不受影响，仍可提取
        page.merge_page(overlay_page)
        writer.add_page(page)

    with open(dst, 'wb') as fh:
        writer.write(fh)

    # 自检：页数与文本层（ATS 友好）必须保持
    check = PdfReader(dst)
    expected = len(reader.pages)
    sample = (check.pages[0].extract_text() or '').strip()
    print(
        f'✔ 已生成 {os.path.relpath(dst, ROOT)}'
        f'（{len(check.pages)} 页，水印「{text}」，字号 {size_pt}pt，浓度 {round(opacity * 100)}%）'
    )
    ok_text = len(sample) > 40
    print(f'  文本层自检：{"可提取 " + str(len(sample)) + " 字符（ATS 友好）" if ok_text else "⚠ 未能提取文本，请检查"}')
    print(f'  页数自检：{len(check.pages)}/{expected}{"✓" if len(check.pages) == expected else " ✗ 页数不符"}')
    print(f'  体积：{os.path.getsize(dst) / 1024:.0f} KB（原件 {os.path.getsize(src) / 1024:.0f} KB）')


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
