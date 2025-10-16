import os
from PIL import Image

# ====== CONFIGURATION ======
folder1 = "public/edexcel-gcse-maths-answers"  # original
folder2 = "public/edexcel-gcse-maths-answers-old"  # modified
# ===========================

files1 = sorted([f for f in os.listdir(folder1) if f.lower().endswith(".png")])
files2 = sorted([f for f in os.listdir(folder2) if f.lower().endswith(".png")])

# Check same number of images
if len(files1) != len(files2):
    raise ValueError(f"Folders got rekt: Different number of PNGs ({len(files1)} vs {len(files2)})")

total = len(files1)
print(f"Checking {total} image pairs for rekt-level equality (except last row)...")

for i, (f1, f2) in enumerate(zip(files1, files2), start=1):
    img1 = Image.open(os.path.join(folder1, f1)).convert("RGBA")
    img2 = Image.open(os.path.join(folder2, f2)).convert("RGBA")

    if img1.size != img2.size:
        raise ValueError(f"Image sizes rekt at {f1} and {f2}: {img1.size} vs {img2.size}")

    w, h = img1.size
    pixels1 = img1.load()
    pixels2 = img2.load()

    identical = True
    for y in range(h - 1):  # ignore last row
        for x in range(w):
            if pixels1[x, y] != pixels2[x, y]:
                identical = False
                break
        if not identical:
            break

    if not identical:
        print(f"[{i}/{total}] ❌ Rekt: {f1} and {f2} differ (above last row)")
    else:
        print(f"[{i}/{total}] ✅ Not rekt: {f1} and {f2} identical except last row")

print("Comparison obliteration complete. Only the bottom pixels survived.")