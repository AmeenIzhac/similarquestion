import os
from PIL import Image

# ====== CONFIGURATION ======
folder_path = "public/edexcel-gcse-maths-answers"  # <--- change this to your folder
# ===========================

# Create modified folder
base_name = os.path.basename(folder_path.rstrip("/"))
modified_folder = os.path.join(os.path.dirname(folder_path), f"{base_name}-modified")
os.makedirs(modified_folder, exist_ok=True)

# Process all PNGs
for file_name in os.listdir(folder_path):
    if file_name.lower().endswith(".png"):
        img_path = os.path.join(folder_path, file_name)
        img = Image.open(img_path).convert("RGBA")

        pixels = img.load()
        width, height = img.size

        # Set bottom row of pixels to black
        for x in range(width):
            pixels[x, height - 1] = (0, 0, 0, 255)

        # Save modified image
        save_path = os.path.join(modified_folder, file_name)
        img.save(save_path)

print(f"Every image got rekt and saved into: {modified_folder}") 