# 水印工具：给图片/PDF 加防滥用水印（透明文本，右下角）
# 用法：python scripts/watermark.py <模式> <输入> <输出> [文字]
#   模式: image | pdf
import os
import sys
from PIL import Image, ImageDraw, ImageFont

FONT = next(
    (f for f in [r'C:\Windows\Fonts\msyh.ttc', r'C:\Windows\Fonts\simhei.ttf', r'C:\Windows\Fonts\simsun.ttc'] if os.path.exists(f)),
    None,
)
if FONT is None:
    raise SystemExit('未找到中文字体')


def watermark_image(src, dst, text='蒋宇龙', alpha=110):
    """右下角半透明水印（白色文字+深色阴影），输出 WebP"""
    img = Image.open(src).convert('RGBA')
    w, h = img.size
    font = ImageFont.truetype(FONT, max(13, int(min(w, h) * 0.035)))
    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x, y = w - tw - 18, h - th - 18
    d.text((x + 1, y + 1), text, font=font, fill=(0, 0, 0, alpha))
    d.text((x, y), text, font=font, fill=(255, 255, 255, alpha))
    out = Image.alpha_composite(img, overlay)
    out.convert('RGB').save(dst, 'WEBP', quality=85)
    print(f'✔ 图片水印: {os.path.basename(dst)}')


def watermark_pdf(src, dst, text='蒋宇龙 · 仅限招聘评估使用', alpha=90):
    """PDF 每页右下角淡色水印"""
    from pypdf import PdfReader, PdfWriter
    reader = PdfReader(src)
    writer = PdfWriter()
    scale = 200 / 72  # 200dpi
    for page in reader.pages:
        mb = page.mediabox
        w_px, h_px = int(float(mb.width) * scale), int(float(mb.height) * scale)
        img = Image.new('RGBA', (w_px, h_px), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        font = ImageFont.truetype(FONT, 26)
        bbox = d.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        x, y = w_px - tw - 60, h_px - th - 80
        d.text((x + 2, y + 2), text, font=font, fill=(0, 0, 0, alpha))
        d.text((x, y), text, font=font, fill=(255, 255, 255, alpha))
        tmp = os.path.join(os.path.dirname(dst), '.watermark_tmp.pdf')
        img.save(tmp, 'PDF', resolution=200)
        overlay = PdfReader(tmp).pages[0]
        page.merge_page(overlay)
        writer.add_page(page)
        os.remove(tmp)
    with open(dst, 'wb') as f:
        writer.write(f)
    print(f'✔ PDF 水印: {os.path.basename(dst)}（{len(reader.pages)} 页）')


if __name__ == '__main__':
    mode, src, dst = sys.argv[1], sys.argv[2], sys.argv[3]
    text = sys.argv[4] if len(sys.argv) > 4 else '蒋宇龙'
    if mode == 'image':
        watermark_image(src, dst, text)
    elif mode == 'pdf':
        watermark_pdf(src, dst, text)
