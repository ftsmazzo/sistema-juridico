#!/usr/bin/env python3
"""Gera logo PNG com fundo transparente para uso no site (fundo verde)."""
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Instale Pillow: pip install Pillow")
    sys.exit(1)


def rgba_make_light_bg_transparent(r, g, b, a, threshold=225):
    """Torna transparente pixels de fundo claro (#E6E6E6 e dobra do símbolo)."""
    if a == 0:
        return (r, g, b, 0)
    if r >= threshold and g >= threshold and b >= threshold:
        return (r, g, b, 0)
    return (r, g, b, a)


def main():
    base = Path(__file__).resolve().parent.parent
    if len(sys.argv) >= 2:
        src = Path(sys.argv[1])
    else:
        src = base / "assets" / "logo-nova.png"
    if not src.exists():
        print("Uso: python make-logo-transparent.py [caminho/para/logo.png]")
        print("Ou coloque a logo em assets/logo-nova.png")
        sys.exit(1)
    out = base / "web" / "public" / "logo.png"
    out.parent.mkdir(parents=True, exist_ok=True)

    img = Image.open(src).convert("RGBA")
    data = img.getdata()
    new_data = [rgba_make_light_bg_transparent(*pixel) for pixel in data]
    img.putdata(new_data)
    img.save(out, "PNG")
    print(f"Logo com transparência salva em: {out}")


if __name__ == "__main__":
    main()
