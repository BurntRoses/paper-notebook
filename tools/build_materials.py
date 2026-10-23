"""Deterministic V2 material production; no network, original sources untouched.
Use the bundled Python with Pillow/numpy. Font build additionally needs fonttools+brotli.
"""
from pathlib import Path
import hashlib
import json
import re
import shutil
import sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets'
ORIGINAL = ROOT / 'assets'
OUT.mkdir(exist_ok=True)
rng = np.random.default_rng(20261019)
size = 512
y, x = np.mgrid[:size, :size]
noise = rng.normal(0, 1, (size, size))
source = Image.open(ORIGINAL / 'originals/Paper001_1K-JPG_Color.jpg').convert('L').resize((size, size))
fiber = np.asarray(source, dtype=float) - np.asarray(source.filter(ImageFilter.GaussianBlur(7)), dtype=float)
fiber = fiber / max(fiber.std(), 1)


def texture(name, base, variation):
    array = np.clip(np.array(base)[None, None, :] + variation[:, :, None], 0, 255).astype('uint8')
    Image.fromarray(array).save(OUT / name, 'WEBP', quality=87, method=6)


# Periodic structure: visibly different oak, woven felt and dark writing mat.
oak = 3.2*np.sin(x*np.pi/20 + 0.9*np.sin(y*np.pi/256)) + 2*np.cos(x*np.pi/4.1 + 0.3*np.cos(y*np.pi/256)) + noise*1.1
texture('desk-oak.webp', (208, 191, 162), oak)
weave = 1.8*np.sin(x*np.pi) + 1.8*np.cos(y*np.pi) + 2.4*np.sin((x+y)*np.pi/3) + noise*2.3
texture('desk-felt.webp', (133, 145, 136), weave)
texture('desk-night.webp', (57, 57, 50), weave*.65)
texture('paper-cotton.webp', (250, 247, 235), fiber*3.1 + noise*.65)
texture('paper-cream.webp', (248, 239, 216), fiber*3.5 + noise*.7)
texture('paper-kraft.webp', (196, 161, 111), fiber*4.6 + noise*1.1)


print("Rebuilt six deterministic WebP textures in assets/ (seed 20261019).")
