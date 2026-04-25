"""Generate SummaryGo toolbar icons (document + accent) using only the Python standard library."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path


def _chunk(tag: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)


def _write_rgb_png(path: Path, width: int, height: int, pixels: bytes) -> None:
    if len(pixels) != width * height * 3:
        raise ValueError("pixel buffer size mismatch")
    rows = []
    for y in range(height):
        row_start = y * width * 3
        row_end = row_start + width * 3
        rows.append(b"\x00" + pixels[row_start:row_end])
    raw = b"".join(rows)
    compressed = zlib.compress(raw, 9)
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + _chunk(b"IHDR", ihdr) + _chunk(b"IDAT", compressed) + _chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def _build_summarygo_raster(size: int) -> bytes:
    w = h = size
    buf = bytearray(w * h * 3)

    def pset(x: int, y: int, rgb: tuple[int, int, int]) -> None:
        if 0 <= x < w and 0 <= y < h:
            o = (y * w + x) * 3
            buf[o : o + 3] = bytes(rgb)

    for y in range(h):
        t = y / max(h - 1, 1)
        br = int(11 + (8 - 11) * t)
        bg = int(47 + (72 - 47) * t)
        bb = int(69 + (92 - 69) * t)
        for x in range(w):
            pset(x, y, (br, bg, bb))

    xm0, xm1 = int(w * 0.22), int(w * 0.78)
    ym0, ym1 = int(h * 0.2), int(h * 0.8)
    paper = (240, 253, 250)
    rim = (167, 243, 208)
    for y in range(ym0, ym1):
        for x in range(xm0, xm1):
            pset(x, y, paper)
    for y in range(ym0, ym1):
        pset(xm0, y, rim)
        pset(xm1 - 1, y, rim)
    for x in range(xm0, xm1):
        pset(x, ym0, rim)
        pset(x, ym1 - 1, rim)

    line_c = (15, 118, 110)
    doc_h = ym1 - ym0

    def doc_hline(rel_y: float, t0: float, t1: float) -> None:
        yy = ym0 + int(doc_h * rel_y)
        xa = xm0 + int((xm1 - xm0) * t0)
        xb = xm0 + int((xm1 - xm0) * t1)
        if xa > xb:
            xa, xb = xb, xa
        for x in range(xa, xb):
            pset(x, yy, line_c)

    doc_hline(0.32, 0.14, 0.86)
    doc_hline(0.48, 0.14, 0.74)
    doc_hline(0.64, 0.14, 0.62)

    cx, cy = int(w * 0.76), int(h * 0.24)
    rad = max(2, int(min(w, h) * 0.13))
    am = (251, 191, 36)
    r2 = rad * rad
    for yy in range(h):
        for xx in range(w):
            if (xx - cx) ** 2 + (yy - cy) ** 2 <= r2:
                pset(xx, yy, am)

    return bytes(buf)


def main() -> None:
    root = Path(__file__).resolve().parents[1] / "extension" / "icons"
    for name, size in (("icon16.png", 16), ("icon48.png", 48), ("icon128.png", 128)):
        pixels = _build_summarygo_raster(size)
        _write_rgb_png(root / name, size, size, pixels)
    print(f"Wrote SummaryGo icons under {root}")


if __name__ == "__main__":
    main()
