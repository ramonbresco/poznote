#!/usr/bin/env python3
"""
Draws the Poznote mark and writes every file derived from it (#1786).

The mark used to exist as an autotraced path (images/poznote.svg) next to two
PNGs exported separately, which had drifted apart: the top corners of the page
were not the same, the corner where the middle line meets the page was cut at
an angle, and in the PWA icon the middle line had a step in it. Here it is
drawn once, on a 512 grid, with a single 40-unit stroke, round caps and round
joins, and everything below is rendered from that drawing:

  images/poznote.svg, poznote-black.svg, poznote-white.svg   the mark alone
  images/poznote.png, poznote-icon.png                       the mark alone, PNG
  images/poznote-logo-text.png                               mark redrawn, text kept
  src/public/favicon.svg, favicon.ico                        the tile
  src/public/pwa/poznote-192.png, poznote-512.png            the tile ("any")
  src/public/pwa/poznote-maskable-192.png, -512.png          full bleed ("maskable")
  src/public/pwa/poznote.png                                 iOS home screen
  src/public/css/components/logo.css                         the in-app mask

The tile is the mark in Poznote blue on a white rounded square: an icon with no
background disappeared on a dark or blue browser theme, and launchers that add
their own backdrop (Nova) picked a light blue one under a dark blue mark. The
maskable icon is a full white square with the mark inside the safe circle, so
Android draws its own shape around it instead of wrapping a transparent icon.
iOS fills transparency with black, so its icon is a full square too.

The logo in the app's icon rail is still a CSS mask painted with the theme's
accent colour: only its shape comes from here.

Needs rsvg-convert (librsvg) and Pillow. Run from the repository root:
    python3 tools/generate-logo.py
"""

import io
import math
import os
import re
import subprocess
import sys
import urllib.parse

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit('Pillow is required: pip install pillow')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BLUE = '#007AB5'
WHITE = '#FFFFFF'
STROKE = 40


def mark_path() -> str:
    """The drawing, as stroke centrelines on a 512 x 512 grid."""
    # The page: from the end of the bottom stroke, round the page and into the
    # middle line. Corners of radius 50 on the centreline (70 outside, 30 in).
    left, top, right, bottom, r = 47, 20, 412.5, 491.5, 50
    page = (f'M162 {bottom}H{left + r}A{r} {r} 0 0 1 {left} {bottom - r}'
            f'V{top + r}A{r} {r} 0 0 1 {left + r} {top}'
            f'H{right - r}A{r} {r} 0 0 1 {right} {top + r}V220H127')
    # The two other lines, 80 units above and below the middle one.
    lines = 'M127 140H332M127 300H251'

    # The pencil, at 45 degrees on the axis x + y = 757.5. u runs along the
    # axis towards the eraser, dv across it.
    axis = 757.5 / math.sqrt(2)

    def at(u: float, dv: float) -> str:
        v = axis + dv
        return f'{(u + v) / math.sqrt(2):.1f} {(v - u) / math.sqrt(2):.1f}'

    cap, half = 65.4, 40  # centre of the rounded end, half width of the body
    pencil = (f'M{at(-78, -half)}L{at(-158, 0)}L{at(-78, half)}'
              f'L{at(cap, half)}A{half} {half} 0 0 0 {at(cap, -half)}Z')
    band = f'M{at(40.7, -half)}L{at(40.7, half)}'
    return page + lines + pencil + band


def mark_svg(colour: str, size: int = 512, margin: float = 0) -> str:
    """The mark alone. margin: extra room on every side, in grid units."""
    box = 512 + 2 * margin
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
            f'viewBox="{-margin:g} {-margin:g} {box:g} {box:g}">'
            f'<path d="{mark_path()}" fill="none" stroke="{colour}" stroke-width="{STROKE}" '
            f'stroke-linecap="round" stroke-linejoin="round"/></svg>\n')


def tile_svg(size: int = 512, scale: float = 0.76, radius: float = 104) -> str:
    """The mark on a white square. scale: size of the mark against the tile;
    radius 0 gives a full square (maskable, iOS)."""
    offset = 256 * (1 - scale)
    corner = f' rx="{radius:g}"' if radius else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 512 512">'
            f'<rect width="512" height="512"{corner} fill="{WHITE}"/>'
            f'<path transform="translate({offset:g} {offset:g}) scale({scale:g})" d="{mark_path()}" '
            f'fill="none" stroke="{BLUE}" stroke-width="{STROKE}" '
            f'stroke-linecap="round" stroke-linejoin="round"/></svg>\n')


# Size of the mark in the maskable icon: the largest that keeps every pixel of
# it inside the safe circle (radius 40% of the icon), with a little room.
MASKABLE_SCALE = 0.56


def render(svg: str, size: int) -> Image.Image:
    png = subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(size)],
                         input=svg.encode(), capture_output=True, check=True).stdout
    return Image.open(io.BytesIO(png)).convert('RGBA')


def save_png(image: Image.Image, rel: str) -> None:
    image.save(os.path.join(ROOT, rel), format='PNG', optimize=True)
    print('wrote', rel)


def write(rel: str, text: str) -> None:
    with open(os.path.join(ROOT, rel), 'w', encoding='utf-8') as fh:
        fh.write(text)
    print('wrote', rel)


def check_safe_zone(image: Image.Image) -> None:
    """Every blue pixel of the maskable icon must lie in the safe circle."""
    size = image.size[0]
    centre, limit = size / 2, 0.4 * size
    px = image.load()
    for y in range(size):
        for x in range(size):
            red, green, blue, _ = px[x, y]
            if blue - red > 60 and math.hypot(x + 0.5 - centre, y + 0.5 - centre) > limit:
                sys.exit(f'maskable icon: the mark leaves the safe zone at {x},{y}')


def patch_text_logo() -> None:
    """Redraw the mark of the README logo, leaving the word next to it alone."""
    rel = 'images/poznote-logo-text.png'
    logo = Image.open(os.path.join(ROOT, rel)).convert('RGBA')
    # The mark fills x 379-1604, y 122-1482 of the 7680 x 1600 file; the word
    # starts after x 2100. Scale and origin put grid point (27.1, 0.4), the
    # top left of the mark, back where it was.
    scale = 1360 / 511.3
    ox, oy = round(379 - 27.1 * scale), round(122 - 0.4 * scale)
    side = round(512 * scale)
    logo.paste((0, 0, 0, 0), (0, 0, 2000, logo.size[1]))
    mark = render(mark_svg(BLUE), side)
    logo.alpha_composite(mark, (ox, oy))
    save_png(logo, rel)


def patch_css_mask() -> None:
    rel = 'src/public/css/components/logo.css'
    path = os.path.join(ROOT, rel)
    with open(path, encoding='utf-8') as fh:
        css = fh.read()
    svg = mark_svg('black').strip()
    svg = re.sub(r' width="512" height="512"', '', svg)
    data = 'data:image/svg+xml,' + urllib.parse.quote(svg, safe=" /:=.-,'()#")
    data = data.replace('#', '%23')
    css, count = re.subn(r'((?:-webkit-)?mask-image: )url\("data:image/svg\+xml,[^"]*"\)',
                         lambda m: m.group(1) + 'url("' + data + '")', css)
    if count != 2:
        sys.exit(f'{rel}: expected two mask-image declarations, found {count}')
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(css)
    print('wrote', rel)


def main() -> None:
    os.chdir(ROOT)
    write('images/poznote.svg', mark_svg(BLUE))
    write('images/poznote-black.svg', mark_svg('#000000'))
    write('images/poznote-white.svg', mark_svg(WHITE))
    save_png(render(mark_svg(BLUE), 1365), 'images/poznote.png')
    # Same framing as before: the mark at grid scale with 82 units around it.
    save_png(render(mark_svg(BLUE, margin=82), 676), 'images/poznote-icon.png')
    patch_text_logo()

    write('src/public/favicon.svg', tile_svg())
    # favicon.ico has always been a 512 px PNG (the pages declare it as such);
    # nginx also serves it for the browser's own /favicon.ico request.
    save_png(render(tile_svg(), 512), 'src/public/favicon.ico')
    for size in (192, 512):
        save_png(render(tile_svg(), size), f'src/public/pwa/poznote-{size}.png')
        maskable = render(tile_svg(scale=MASKABLE_SCALE, radius=0), size)
        check_safe_zone(maskable)
        save_png(maskable, f'src/public/pwa/poznote-maskable-{size}.png')
    # iOS rounds the corners itself and turns transparency into black.
    save_png(render(tile_svg(scale=0.72, radius=0), 180), 'src/public/pwa/poznote.png')

    patch_css_mask()


if __name__ == '__main__':
    main()
