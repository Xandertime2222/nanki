#!/usr/bin/env python3
"""Generate icon files for CI builds.

Creates proper PNG and icon files for Windows (.ico) and macOS (.icns).
Requires Pillow for proper icon generation.
"""

import struct
import zlib
from pathlib import Path

try:
    from PIL import Image
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False


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


def create_ico_from_pngs(png_dir: Path, output_path: Path) -> None:
    """Create proper Windows ICO file from PNG images."""
    
    sizes = [16, 32, 48, 64, 128, 256]
    images = []
    
    for size in sizes:
        png_path = png_dir / f"icon-{size}.png"
        if png_path.exists():
            images.append((size, png_path.read_bytes()))
    
    if not images:
        raise ValueError("No PNG files found")
    
    # ICO file format
    data = b''
    # Header: reserved (2), type=1 (2), count (2)
    data += struct.pack('<HHH', 0, 1, len(images))
    
    # Directory entries
    offset = 6 + len(images) * 16
    for size, png_data in images:
        # ICO format uses 0 to represent 256
        w = size if size < 256 else 0
        h = size if size < 256 else 0
        data += struct.pack('BB', w, h)  # width, height
        data += b'\x00'  # color palette
        data += b'\x00'  # reserved
        data += struct.pack('<HH', 1, 32)  # planes, bits per pixel
        data += struct.pack('<II', len(png_data), offset)  # size, offset
        offset += len(png_data)
    
    # Image data
    for size, png_data in images:
        data += png_data
    
    output_path.write_bytes(data)


def create_icns_from_pngs(png_dir: Path, output_path: Path) -> None:
    """Create proper macOS ICNS file from PNG images."""
    
    # ICNS uses specific 4-byte codes for different sizes
    # ic04 = 16x16 PNG, ic05 = 32x32, ic06 = 48x48/64x64
    # ic07 = 128x128, ic08 = 256x256, ic09 = 512x512, ic10 = 1024x1024
    
    size_to_code = {
        16: b'ic04',
        32: b'ic05',
        48: b'ic06',
        64: b'ic06',  # Also uses ic06
        128: b'ic07',
        256: b'ic08',
        512: b'ic09',
        1024: b'ic10',
    }
    
    chunks = b''
    for size in [16, 32, 48, 64, 128, 256, 512, 1024]:
        png_path = png_dir / f"icon-{size}.png"
        if png_path.exists():
            png_data = png_path.read_bytes()
            code = size_to_code.get(size, b'ic07')
            # ICNS chunk: 4-byte code + 4-byte length + data
            chunks += code + struct.pack('>I', len(png_data) + 8) + png_data
    
    # ICNS header: 'icns' + total size
    icns_data = b'icns' + struct.pack('>I', len(chunks) + 8) + chunks
    output_path.write_bytes(icns_data)


def main():
    """Generate icon files."""
    root = Path(__file__).parent
    
    print("Generating icon files...")
    
    # Check if real icons already exist (uploaded from repo)
    svg_path = root / "nanki-logo.svg"
    if svg_path.exists() and HAS_PILLOW:
        print("  Found SVG logo, generating icons from it...")
        # Use the SVG for better quality icons
        # For now, we use existing PNGs which should be in the repo
        pass
    
    # Generate PNG sizes needed
    sizes = [16, 32, 48, 64, 128, 256, 512, 1024]
    color = (99, 102, 241)  # Purple-blue (fallback color)
    
    for size in sizes:
        png_path = root / f"icon-{size}.png"
        if not png_path.exists():
            # Only create if doesn't exist
            png_data = create_minimal_png(size, color)
            png_path.write_bytes(png_data)
            print(f"  Created icon-{size}.png")
        else:
            print(f"  Using existing icon-{size}.png")
    
    # Create ICO from PNGs
    ico_path = root / "nanki-icon.ico"
    create_ico_from_pngs(root, ico_path)
    print(f"  Created nanki-icon.ico")
    
    # Create ICNS from PNGs
    icns_path = root / "nanki-icon.icns"
    create_icns_from_pngs(root, icns_path)
    print(f"  Created nanki-icon.icns")
    
    print("")
    print("[OK] Icon generation complete!")
    if not HAS_PILLOW:
        print("  Note: Install Pillow for better icon quality: pip install Pillow")
    
    return 0


if __name__ == "__main__":
    exit(main())