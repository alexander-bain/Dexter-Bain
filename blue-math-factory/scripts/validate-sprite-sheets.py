from pathlib import Path
from PIL import Image

FRAME_W, FRAME_H = 96, 128
COLS, ROWS = 5, 8
ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / "public" / "assets" / "sprites"


def main():
    sheets = sorted(SPRITES.glob("*.png"))
    if len(sheets) != 18:
        raise SystemExit(f"Expected 18 sprite sheets, found {len(sheets)}")

    checked = 0
    for path in sheets:
        image = Image.open(path).convert("RGBA")
        if image.size != (FRAME_W * COLS, FRAME_H * ROWS):
            raise SystemExit(f"{path.name}: expected 480x1024, got {image.size}")
        for row in range(ROWS):
            for column in range(COLS):
                frame = image.crop((column * FRAME_W, row * FRAME_H, (column + 1) * FRAME_W, (row + 1) * FRAME_H))
                bounds = frame.getchannel("A").getbbox()
                if bounds is None:
                    raise SystemExit(f"{path.name} frame {row * COLS + column}: empty")
                left, top, right, bottom = bounds
                if top < 1 or bottom > FRAME_H - 1 or left < 1 or right > FRAME_W - 1:
                    raise SystemExit(f"{path.name} frame {row * COLS + column}: art touches frame edge {bounds}")
                checked += 1
    print(f"Validated {checked} isolated sprite frames across {len(sheets)} sheets.")


if __name__ == "__main__":
    main()
