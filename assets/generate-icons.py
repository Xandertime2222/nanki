#!/usr/bin/env python3
"""Generate minimal icon files for CI builds.

Creates basic PNG icons that can be used by PyInstaller.
For production builds with proper icons, install Pillow and cairosvg:
    pip install Pillow cairosvg
"""

import struct
import zlib
from pathlib import Path


def create_minimal_png(size: int, color: tuple) -> bytes:
    """Create minimal PNG file data."""

    def png_chunk(chunk_type: bytes, data: bytes) -> bytes:
        chunk_len = struct.pack(">I", len(data))
        chunk_crc = struct.pack(">I", zlib.crc32(chunk_type + data) & 0xFFFFFFFF)
        return chunk_len + chunk_type + data + chunk_crc

    signature = b"\x89PNG\r\n\x1a\n"
    ihdr_data = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    ihdr = png_chunk(b"IHDR", ihdr_data)

    # Create image data (solid color)
    raw_data = b""
    for y in range(size):
        raw_data += b"\x00"  # filter byte
        for x in range(size):
            raw_data += bytes(color)

    compressed = zlib.compress(raw_data)
    idat = png_chunk(b"IDAT", compressed)
    iend = png_chunk(b"IEND", b"")

    return signature + ihdr + idat + iend


def main():
    """Generate icon files."""
    root = Path(__file__).parent
    ico_path = root / "nanki-icon.ico"
    icns_path = root / "nanki-icon.icns"

    print("Generating icon files...")

    # Generate PNG sizes needed for CI
    sizes = [16, 32, 48, 64, 128, 256, 512]
    color = (99, 102, 241)  # Purple-blue

    for size in sizes:
        png_path = root / f"icon-{size}.png"
        png_data = create_minimal_png(size, color)
        png_path.write_bytes(png_data)
        print(f"  Created icon-{size}.png")

    # Create placeholder ICO (just copy the 256px PNG with .ico extension)
    # PyInstaller can work with PNG on Windows too
    png_256 = (root / "icon-256.png").read_bytes()
    ico_path.write_bytes(png_256)
    print(f"  Created nanki-icon.ico (placeholder)")

    # Create placeholder ICNS (just a marker file for CI)
    # Actual ICNS needs macOS iconutil
    icns_path.write_bytes(b"icns")  # ICNS magic number
    icns_path.write_bytes(b"\x00" * 100)  # Minimal data
    print(f"  Created nanki-icon.icns (placeholder)")

    print("")
    print("[OK] Icon generation complete!")
    print("  Note: These are placeholder icons.")
    print("  For production: pip install Pillow cairosvg")

    return 0


if __name__ == "__main__":
    exit(main())
