from pathlib import Path
from PIL import Image

FRAME_W, FRAME_H = 96, 128
COLS, ROWS = 5, 8
ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / "public" / "assets" / "sprites"

SKIN_COLORS = {
    "player": "#efb98e",
    "customer-kid": "#f1b58a",
    "customer-parent": "#8a563b",
    "customer-hiker": "#d99a6c",
    "customer-chef": "#efbd92",
    "customer-tourist": "#7d4934",
    "customer-athlete": "#8e5639",
    "customer-baker": "#efbd92",
    "customer-smoothie": "#c77f59",
    "customer-critic": "#e4a57d",
    "customer-buyer": "#70422f",
    "cashier": "#efb98e",
    "janitor": "#efb98e",
    "packer": "#efb98e",
    "operator": "#efb98e",
    "warehouse": "#efb98e",
    "delivery": "#efb98e",
    "manager": "#efb98e",
}


def rgb(hex_color):
    value = hex_color.lstrip("#")
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))


def main():
    sheets = sorted(SPRITES.glob("*.png"))
    if len(sheets) != 18:
        raise SystemExit(f"Expected 18 sprite sheets, found {len(sheets)}")

    checked = 0
    for path in sheets:
        image = Image.open(path).convert("RGBA")
        expected_skin = rgb(SKIN_COLORS[path.stem])
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
                neck_pixels = [frame.getpixel((FRAME_W // 2, y))[:3] for y in range(52, 62)]
                if neck_pixels.count(expected_skin) < 4:
                    raise SystemExit(f"{path.name} frame {row * COLS + column}: visible neck is missing")
                checked += 1
    print(f"Validated {checked} isolated sprite frames across {len(sheets)} sheets.")


if __name__ == "__main__":
    main()
