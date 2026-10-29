# Retints the KayKit Medieval Hexagon palette (assets/kingdom/kaykit/hexagons_medieval.png) for Bulbu's Kingdom.
# The palette is 8×4 vertical gradient swatches, 128×256 px each. We:
#   - make every coloured swatch more vibrant (more saturation, a touch more contrast) and give the greys a faint cool
#     tint, so roofs, wood and banners read clean and bright next to the lawn
#   - turn the grass swatch into a lush green over a band of earth (cell edges read as a grass lip over soil)
#   - shift the tree greens from teal towards a fresh green that sits with the lawn
#
#   python3 apps/web/scripts/retint-kaykit.py <pack>/gltf/tiles/base/hexagons_medieval.png apps/web/assets/kingdom/kaykit/hexagons_medieval.png
import colorsys
import sys

from PIL import Image

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGBA")
px = im.load()
W, H = im.size


def hexc(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


# 1. vibrance everywhere: weak colours gain the most; greys stay grey but cool slightly
for y in range(H):
    for x in range(W):
        r, g, b, a = px[x, y]
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if s > 0.1:
            s = min(1.0, s + (1 - s) * 0.32 + 0.04)
            l = min(1.0, max(0.0, 0.5 + (l - 0.5) * 1.07 + 0.015))
            r, g, b = colorsys.hls_to_rgb(h, l, s)
            px[x, y] = (round(r * 255), round(g * 255), round(b * 255), a)
        else:
            px[x, y] = (max(0, r - 3), g, min(255, b + 6), a)

# 2. grass: u 0..128, v 512..768 (the top of a tile samples ~590..606, its sides run down to ~727)
stops = [(512, "#B8F25E"), (590, "#8EDC45"), (606, "#74CB3A"), (618, "#4FA22C"), (626, "#93633F"), (690, "#7C5539"), (768, "#5C3D2C")]
for y in range(512, 768):
    for i in range(len(stops) - 1):
        (y0, c0), (y1, c1) = stops[i], stops[i + 1]
        if y0 <= y <= y1:
            c = lerp(hexc(c0), hexc(c1), (y - y0) / max(1, y1 - y0))
            break
    for x in range(0, 128):
        px[x, y] = (*c, 255)


# 3. tree greens (teal swatches at u 128..256 v 512..768 and u 384..512 v 768..1024): towards a fresh green
def retint(x0, y0):
    for y in range(y0, y0 + 256):
        for x in range(x0, x0 + 128):
            r, g, b, a = px[x, y]
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            h, l, s = h - 0.055, min(1, l * 1.12 + 0.035), min(1, s * 1.02)
            r, g, b = colorsys.hls_to_rgb(h % 1, l, s)
            px[x, y] = (round(r * 255), round(g * 255), round(b * 255), a)


retint(128, 512)
retint(384, 768)
im.save(out, optimize=True)
