"""Generate the original four-page PARR-TB pamphlet as a browser-readable PDF.

Sources are the archived, original Squarespace PNGs; no OCR or page rewriting.
Each page preserves the PNG aspect ratio. Re-run this script after image changes.
"""
from pathlib import Path
from PIL import Image

MEDIA = Path("public/assets/media")
DEST = Path("public/assets/documents/PARR-TB-Medical-Officers-Pamphlet.pdf")
PAGES = [
    "ab31933f-PARR-TB_MO_Brochure.png",
    "db5d3d9f-PARR-TB_MO_Brochure2.png",
    "511df6f0-PARR-TB_MO_Brochure3.png",
    "f9a4e871-PARR-TB_MO_Brochure4.png",
]
images = []
for filename in PAGES:
    path = MEDIA / filename
    if not path.is_file():
        raise FileNotFoundError(f"Missing pamphlet page: {path}")
    with Image.open(path) as original:
        # Use a white background for source images with transparency.
        rgba = original.convert("RGBA")
        image = Image.new("RGB", original.size, "white")
        image.paste(rgba, mask=rgba.getchannel("A"))
        images.append(image)
        print(f"Page {len(images)}: {filename} {image.width}x{image.height}")
DEST.parent.mkdir(parents=True, exist_ok=True)
images[0].save(DEST, format="PDF", save_all=True, append_images=images[1:], resolution=150.0, quality=95, optimize=True, title="PARR-TB Information Pamphlet for Medical Officers")
from pypdf import PdfReader
count = len(PdfReader(str(DEST)).pages)
assert count == 4, f"Expected four pages, got {count}"
print(f"Created {DEST} ({DEST.stat().st_size:,} bytes), four pages")
