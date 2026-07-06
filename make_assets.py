from PIL import Image, ImageDraw, ImageFont

BG = (15, 27, 30)
GOLD = (201, 162, 39)
TEAL = (45, 212, 191)
TEXT = (242, 237, 228)

def make_icon(path, size=1024):
    img = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2
    ring_r = int(size * 0.34)
    draw.ellipse([cx-ring_r, cy-ring_r, cx+ring_r, cy+ring_r], outline=GOLD, width=int(size*0.045))
    bar_area = int(size * 0.30)
    n_bars = 7
    bar_w = bar_area // (n_bars * 2)
    total_w = n_bars * bar_w * 2 - bar_w
    start_x = cx - total_w // 2
    bar_h = int(size * 0.20)
    widths = [bar_w, bar_w*2, bar_w, bar_w, bar_w*2, bar_w, bar_w*2]
    x = start_x
    for w in widths:
        draw.rectangle([x, cy - bar_h//2, x + w*0.6, cy + bar_h//2], fill=TEAL)
        x += w + bar_w
    img.save(path, "PNG")

def make_splash(path, size=2732):
    img = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2
    ring_r = int(size * 0.13)
    draw.ellipse([cx-ring_r, cy-ring_r, cx+ring_r, cy+ring_r], outline=GOLD, width=int(size*0.018))
    bar_area = int(size * 0.11)
    n_bars = 7
    bar_w = bar_area // (n_bars * 2)
    total_w = n_bars * bar_w * 2 - bar_w
    start_x = cx - total_w // 2
    bar_h = int(size * 0.075)
    widths = [bar_w, bar_w*2, bar_w, bar_w, bar_w*2, bar_w, bar_w*2]
    x = start_x
    for w in widths:
        draw.rectangle([x, cy - bar_h//2, x + w*0.6, cy + bar_h//2], fill=TEAL)
        x += w + bar_w
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(size*0.045))
    except:
        font = ImageFont.load_default()
    text = "FIYATLA"
    bbox = draw.textbbox((0,0), text, font=font)
    tw = bbox[2]-bbox[0]
    draw.text((cx - tw/2, cy + ring_r + int(size*0.05)), text, fill=TEXT, font=font)
    img.save(path, "PNG")

make_icon("assets/icon.png")
make_splash("assets/splash.png")
print("Görseller hazır")
