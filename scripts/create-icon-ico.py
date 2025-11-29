#!/usr/bin/env python3
"""
Erstellt eine .ico-Datei aus einem PNG-Bild für Windows.
Benötigt Pillow: pip install Pillow
"""

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Fehler: Pillow ist nicht installiert.")
    print("Bitte installiere es mit: pip install Pillow")
    sys.exit(1)


def create_ico(input_path: str, output_path: str) -> None:
    """
    Erstellt eine .ico-Datei mit verschiedenen Größen aus einem PNG.

    Args:
        input_path: Pfad zur Eingabe-PNG-Datei
        output_path: Pfad zur Ausgabe-.ico-Datei
    """
    # Öffne das Bild
    img = Image.open(input_path)

    # Erstelle verschiedene Größen für die .ico-Datei
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]

    # Erstelle eine Liste von Bildern in verschiedenen Größen
    images = []
    for size in sizes:
        resized = img.resize(size, Image.Resampling.LANCZOS)
        images.append(resized)

    # Speichere als .ico mit allen Größen
    images[0].save(
        output_path,
        format="ICO",
        sizes=[(img.width, img.height) for img in images],
    )
    print(f"✓ .ico-Datei erstellt: {output_path}")


if __name__ == "__main__":
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    build_dir = project_root / "build"
    input_file = build_dir / "icon.png"
    output_file = build_dir / "icon.ico"

    if not input_file.exists():
        print(f"Fehler: Eingabedatei nicht gefunden: {input_file}")
        sys.exit(1)

    create_ico(str(input_file), str(output_file))

