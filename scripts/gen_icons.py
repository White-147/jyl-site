# -*- coding: utf-8 -*-
"""站点图标生成器：从柳建毛草字体渲染「蒋」字标。

为什么需要这个脚本
  旧图标是 AI 生成的位图（蓝青渐变 + 餐叉 + 花体 JYL），存在四个问题：
    1. 色系与站点（石墨 + 琥珀）完全脱节；
    2. 细节过多，32px 下糊成色块、16px 不可读；
    3. 位图硬缩 + 二值透明度 → 深色底上出现白晕与锯齿；
    4. 512px 画布只用了 78%×43% 的面积，文件却到 118KB。
  本脚本改为「从字体渲染 + 8 倍超采样降采样 + 带 alpha 渐变的抗锯齿」，
  字形与站点首屏的名字**同源**（同一套柳建毛草字体），色值取站点 token。

配色（见 DESIGN.md）
  tile = graphite #1a1c1e（--color-ink）
  glyph = amber   #f2a93b（--color-brand-300）
  字形加粗 1 档（MaxFilter 3×3 一次）：原始笔画在 32px 下仅约 2px，太细。

用法
  python scripts/gen_icons.py
输入
  scripts/fonts-src/liujianmaocao/LiuJianMaoCao-Regular.ttf（subset-fonts 的同款源文件）
输出
  public/favicons/favicon-16.png
  public/favicons/favicon-32.png
  public/favicons/favicon-48.png
  public/favicons/favicon-192.png
  public/favicons/favicon-512.png
  public/favicons/apple-touch-icon.png        (180px，不透明底)
  public/favicons/maskable-512.png            (Android 自适应图标，内容收在中心安全区)
  public/images/icon-jiang-192.png            (导航栏品牌图标，与 favicon 同一标记)
"""
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, 'scripts', 'fonts-src', 'liujianmaocao', 'LiuJianMaoCao-Regular.ttf')
FAVICON_DIR = os.path.join(ROOT, 'public', 'favicons')
IMAGE_DIR = os.path.join(ROOT, 'public', 'images')

CHAR = '蒋'
GRAPHITE = (26, 28, 30)      # --color-ink
AMBER = (242, 169, 59)       # --color-brand-300
SS = 8                       # 超采样倍数
RADIUS_RATIO = 0.22          # 圆角占边长比例
PAD_RATIO = 0.08             # 字形四周留白
DILATE = 1                   # 加粗档数（0=原始）


def _glyph_mask(size_px, pad_ratio=PAD_RATIO, dilate=DILATE):
    """渲染字形并返回给定尺寸的 alpha 掩码（255=有字）。

    在 SS 倍画布上渲染再降采样：这是消除锯齿与白晕的关键，
    比直接在小尺寸上渲染再二值化干净得多。
    """
    big = size_px * SS
    font = ImageFont.truetype(FONT, int(big * 0.88))
    canvas = Image.new('L', (big, big), 255)
    draw = ImageDraw.Draw(canvas)
    bbox = draw.textbbox((0, 0), CHAR, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((big - w) // 2 - bbox[0], (big - h) // 2 - bbox[1]), CHAR, font=font, fill=0)

    for _ in range(dilate):
        canvas = canvas.filter(ImageFilter.MaxFilter(3))

    ink = canvas.point(lambda v: 255 if v < 250 else 0).getbbox()
    glyph = canvas.crop(ink)

    content = max(1, int(round(size_px * (1 - 2 * pad_ratio))))
    glyph = glyph.resize((content, content), Image.LANCZOS)

    mask = Image.new('L', (size_px, size_px), 0)
    offset = (size_px - content) // 2
    # 反相：字形为不透明
    mask.paste(glyph.point(lambda v: 255 - v), (offset, offset))
    return mask


def _rounded_mask(size_px, radius_ratio=RADIUS_RATIO):
    mask = Image.new('L', (size_px, size_px), 0)
    radius = int(size_px * radius_ratio)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size_px - 1, size_px - 1], radius=radius, fill=255)
    return mask


def make_tile(size_px, content_scale=1.0):
    """石墨圆角方片 + 琥珀字（站点图标的标准形态）。"""
    pad = PAD_RATIO / content_scale
    glyph = _glyph_mask(size_px, pad_ratio=pad)
    tile = Image.new('RGB', (size_px, size_px), GRAPHITE)
    tile.paste(Image.new('RGB', (size_px, size_px), AMBER), (0, 0), glyph)

    out = Image.new('RGBA', (size_px, size_px), (0, 0, 0, 0))
    out.paste(tile, (0, 0), _rounded_mask(size_px))
    return out


def make_maskable(size_px):
    """Android 自适应图标：系统会裁成各种形状，内容必须收在中心安全区（约 80%）。

    因此这里不用圆角、底色铺满整张画布，字形留白放大到 20%，
    保证在圆形/圆角方形等任意裁切下「蒋」都完整。
    """
    glyph = _glyph_mask(size_px, pad_ratio=0.20, dilate=DILATE)
    tile = Image.new('RGB', (size_px, size_px), GRAPHITE)
    tile.paste(Image.new('RGB', (size_px, size_px), AMBER), (0, 0), glyph)
    return tile


def save_png(img, path, quantize=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if quantize:
        # 小尺寸用调色板：两色图标量化后体积更小且肉眼无差
        img = img.convert('RGBA').quantize(colors=64, method=Image.FASTOCTREE).convert('RGBA')
    img.save(path, 'PNG', optimize=True)
    print(f'  {os.path.relpath(path, ROOT)}  {os.path.getsize(path)} B')


def main():
    if not os.path.exists(FONT):
        raise SystemExit(f'缺少字体源：{FONT}')

    print('站点图标（石墨底 + 琥珀字）：')
    for size in (16, 32, 48, 192, 512):
        save_png(make_tile(size), os.path.join(FAVICON_DIR, f'favicon-{size}.png'),
                 quantize=size <= 48)

    print('apple-touch-icon（180px，iOS 会自行加圆角，故底色铺满）：')
    save_png(make_tile(180, content_scale=0.92), os.path.join(FAVICON_DIR, 'apple-touch-icon.png'))

    print('Android 自适应图标（maskable）：')
    save_png(make_maskable(512), os.path.join(FAVICON_DIR, 'maskable-512.png'))

    print('导航栏图标（与 favicon 同一标记，供 navbar 直接引用）：')
    save_png(make_tile(192), os.path.join(IMAGE_DIR, 'icon-jiang-192.png'))

    print('完成。')


if __name__ == '__main__':
    main()
