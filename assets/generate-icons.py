#!/usr/bin/env python3
"""Generate all required icon sizes from a single SVG source.

This script generates:
- Windows ICO file with multiple sizes
- macOS ICNS file via iconutil
- PNG files for various uses

Requirements:
    pip install Pillow
"""

import os
import shutil
import subprocess
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pillow not installed. Run: pip install Pillow")
    exit(1)


def svg_to_png(svg_path: Path, png_path: Path, size: int) -> None:
    """Convert SVG to PNG at specified size."""
    import cairosvg

    cairosvg.svg2png(
        url=str(svg_path),
        write_to=str(png_path),
        output_width=size,
        output_height=size,
    )
    print(f"  Created {png_path.name} ({size}x{size})")


def create_ico(png_dir: Path, ico_path: Path) -> None:
    """Create Windows ICO from multiple PNG sizes."""
    sizes = [16, 32, 48, 64, 128, 256]
    images = []

    for size in sizes:
        png_path = png_dir / f"icon-{size}.png"
        if png_path.exists():
            img = Image.open(png_path)
            images.append(img)

    if images:
        images[0].save(
            ico_path,
            format="ICO",
            sizes=[(size, size) for size in sizes],
            append_images=images[1:],
        )
        print(f"Created {ico_path.name} with {len(images)} sizes")


def create_icns(png_dir: Path, icns_path: Path) -> None:
    """Create macOS ICNS using iconutil."""
    iconset_dir = png_dir / "icon.iconset"
    iconset_dir.mkdir(exist_ok=True)

    # Map sizes to iconutil naming convention
    mappings = [
        (16, "icon_16x16.png"),
        (32, "icon_16x16@2x.png"),
        (32, "icon_32x32.png"),
        (48, "icon_32x32@2x.png"),
        (128, "icon_128x128.png"),
        (256, "icon_128x128@2x.png"),
        (256, "icon_256x256.png"),
        (512, "icon_256x256@2x.png"),
        (512, "icon_512x512.png"),
        (1024, "icon_512x512@2x.png"),
    ]

    for size, filename in mappings:
        src = png_dir / f"icon-{size}.png"
        if src.exists():
            dst = iconset_dir / filename
            shutil.copy2(src, dst)

    # Use iconutil to create ICNS
    try:
        subprocess.run(
            ["iconutil", "-c", "icns", str(iconset_dir), "-o", str(icns_path)],
            check=True,
            capture_output=True,
        )
        print(f"Created {icns_path.name}")
    except FileNotFoundError:
        print("  iconutil not found (macOS only). Skipping ICNS creation.")
    except subprocess.CalledProcessError as e:
        print(f"  Failed to create ICNS: {e}")
    finally:
        # Cleanup iconset
        shutil.rmtree(iconset_dir, ignore_errors=True)


def main():
    """Generate all icon formats."""
    root = Path(__file__).parent
    svg_source = root / "nanki-logo.svg"

    if not svg_source.exists():
        print(f"SVG source not found: {svg_source}")
        print("Please create or download the SVG logo first.")
        return 1

    png_dir = root
    ico_path = root / "nanki-icon.ico"
    icns_path = root / "nanki-icon.icns"

    print("Generating icons from SVG...")

    # Generate PNG sizes
    sizes = [16, 32, 48, 64, 128, 256, 512, 1024]
    for size in sizes:
        png_path = png_dir / f"icon-{size}.png"
        try:
            svg_to_png(svg_source, png_path, size)
        except Exception as e:
            print(f"  Failed to create {size}px icon: {e}")
            # Fallback: create a simple colored square
            img = Image.new("RGBA", (size, size), (99, 102, 241, 255))
            img.save(png_path)
            print(f"  Created placeholder {png_path.name} ({size}x{size})")

    # Create ICO
    create_ico(png_dir, ico_path)

    # Create ICNS (macOS only)
    create_icns(png_dir, icns_path)

    print("\nIcon generation complete!")
    print(f"  Windows: {ico_path}")
    print(f"  macOS:   {icns_path}")
    print(f"  PNGs:    {png_dir / 'icon-*.png'}")

    return 0


if __name__ == "__main__":
    exit(main())
