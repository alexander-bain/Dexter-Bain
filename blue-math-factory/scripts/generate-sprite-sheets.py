from pathlib import Path
from PIL import Image, ImageDraw

FRAME_W, FRAME_H = 96, 128
COLS, ROWS = 5, 8
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets" / "sprites"

CUSTOMERS = [
    ("kid", "#4a77f4", "#ffd34e", "#f1b58a", "cap"),
    ("parent", "#f06c9b", "#ffe0bd", "#8a563b", "tote"),
    ("hiker", "#46a56d", "#f4bd58", "#d99a6c", "backpack"),
    ("chef", "#f5f5f5", "#e64949", "#efbd92", "chef"),
    ("tourist", "#ff9a52", "#5e3fc9", "#7d4934", "camera"),
    ("athlete", "#43d5c3", "#263a75", "#8e5639", "headband"),
    ("baker", "#d08b55", "#fff1d1", "#efbd92", "baker"),
    ("smoothie", "#b452e2", "#61efb6", "#c77f59", "cup"),
    ("critic", "#3b3b52", "#ffcf5a", "#e4a57d", "glasses"),
    ("buyer", "#253b70", "#70e6ff", "#70422f", "briefcase"),
]

WORKERS = [
    ("cashier", "#3657e7", "#ffc84d", "register"),
    ("janitor", "#43a979", "#ffe06f", "broom"),
    ("packer", "#e58255", "#63e6ff", "box"),
    ("operator", "#6857d8", "#68e3a8", "wrench"),
    ("warehouse", "#4c72a9", "#ffca57", "cart"),
    ("delivery", "#435bd2", "#f5f7ff", "clipboard"),
    ("manager", "#713fa8", "#ffd357", "clipboard"),
]

def shade(color, factor):
    color = color.lstrip("#")
    rgb = [int(color[i:i+2], 16) for i in (0, 2, 4)]
    return tuple(max(0, min(255, int(value * factor))) for value in rgb) + (255,)

def rgba(color):
    if isinstance(color, tuple):
        return color
    color = color.lstrip("#")
    return tuple(int(color[i:i+2], 16) for i in (0, 2, 4)) + (255,)

def line(draw, points, fill, width=4):
    draw.line(points, fill=rgba(fill), width=width, joint="curve")

def package(draw, x, y, scale=1):
    w, h = int(25 * scale), int(30 * scale)
    draw.rounded_rectangle((x-w//2, y-h//2, x+w//2, y+h//2), radius=max(2, int(5*scale)), fill=(239,235,255,255), outline=(33,29,91,255), width=max(1,int(2*scale)))
    draw.rounded_rectangle((x-w//2+2, y-h//2+3, x+w//2-2, y+h//2+12), radius=3, fill=(67,66,190,255))
    for bx, by in [(-5,-5),(3,-8),(6,0),(-3,2)]:
        draw.ellipse((x+int(bx*scale)-3, y+int(by*scale)-3, x+int(bx*scale)+3, y+int(by*scale)+3), fill=(67,86,219,255), outline=(31,32,104,255))
    draw.ellipse((x-5, y+7, x+5, y+12), fill=(240,188,60,255))

def accessory(draw, kind, cx, top, direction, accent):
    if kind == "cap":
        draw.rounded_rectangle((cx-22, top-2, cx+22, top+9), 5, fill=rgba(accent), outline=(35,30,80,255), width=2)
        if direction != "up": draw.ellipse((cx+7 if direction != "left" else cx-25, top+3, cx+29 if direction != "left" else cx-4, top+10), fill=shade(accent, .8))
    elif kind in ("chef", "baker"):
        draw.ellipse((cx-23, top+2, cx+23, top+22), fill=(250,248,237,255), outline=(54,46,87,255), width=2)
        draw.ellipse((cx-18, top-4, cx+3, top+17), fill=(255,255,250,255))
        draw.ellipse((cx-2, top-5, cx+19, top+16), fill=(255,255,250,255))
    elif kind == "headband":
        draw.rounded_rectangle((cx-20, top+4, cx+20, top+10), 3, fill=rgba(accent))
    elif kind == "glasses" and direction != "up":
        eye_y = top+21
        draw.ellipse((cx-17, eye_y-5, cx-3, eye_y+6), outline=(25,25,48,255), width=3)
        draw.ellipse((cx+3, eye_y-5, cx+17, eye_y+6), outline=(25,25,48,255), width=3)
        line(draw, [(cx-3,eye_y),(cx+3,eye_y)], "#191930", 2)

def tool(draw, kind, cx, cy, action):
    if kind == "broom":
        line(draw, [(cx+18,cy-37),(cx-4,cy+39)], "#8b5a3c", 5)
        draw.polygon([(cx-15,cy+34),(cx+8,cy+29),(cx+15,cy+49),(cx-13,cy+52)], fill=(245,197,68,255), outline=(74,53,75,255))
    elif kind == "register":
        draw.rounded_rectangle((cx-26,cy-8,cx+28,cy+25),6,fill=(52,60,101,255),outline=(25,25,65,255),width=3)
        draw.rounded_rectangle((cx-18,cy-3,cx+17,cy+10),3,fill=(102,229,245,255))
    elif kind == "wrench":
        line(draw, [(cx-18,cy+30),(cx+17,cy-23)], "#c8d5e3", 8)
        draw.ellipse((cx+10,cy-30,cx+28,cy-12),outline=(200,213,227,255),width=5)
    elif kind == "box":
        package(draw,cx,cy+5,1.25)
    elif kind == "cart":
        line(draw,[(cx-28,cy-8),(cx-18,cy+34),(cx+30,cy+34)],"#27325d",5)
        draw.rectangle((cx-18,cy-8,cx+27,cy+20),fill=(89,113,170,255),outline=(35,41,89,255),width=3)
        draw.ellipse((cx-20,cy+29,cx-10,cy+39),fill=(29,29,52,255)); draw.ellipse((cx+22,cy+29,cx+32,cy+39),fill=(29,29,52,255))
    elif kind in ("clipboard", "briefcase"):
        draw.rounded_rectangle((cx-20,cy-17,cx+22,cy+27),5,fill=(220,170,78,255),outline=(72,50,69,255),width=3)
        draw.rectangle((cx-7,cy-23,cx+9,cy-13),fill=(66,55,90,255))
    elif kind == "camera":
        draw.rounded_rectangle((cx-18,cy-11,cx+19,cy+14),5,fill=(47,49,75,255))
        draw.ellipse((cx-8,cy-8,cx+10,cy+11),fill=(96,224,241,255),outline=(230,250,255,255),width=2)
    elif kind == "cup":
        draw.polygon([(cx-12,cy-18),(cx+12,cy-18),(cx+8,cy+20),(cx-8,cy+20)],fill=(102,231,183,255),outline=(38,49,79,255))
        line(draw,[(cx,cy-18),(cx+8,cy-34)],"#f6d15a",3)
    elif kind == "tote":
        draw.rounded_rectangle((cx-19,cy-12,cx+20,cy+25),4,fill=(245,190,100,255),outline=(87,54,76,255),width=3)
        draw.arc((cx-12,cy-25,cx+13,cy+1),180,360,fill=(87,54,76,255),width=3)

def draw_person(draw, frame_x, frame_y, shirt, accent, skin, direction, phase, step, accessory_kind="", role_tool=""):
    ox, oy = frame_x, frame_y
    cx = ox + FRAME_W//2
    bob = [0,2,1,-1,0][step % 5] if phase in ("walk","carry") else 0
    base_y = oy + 114 + bob
    swing = [-7,-3,0,3,7][step % 5] if phase in ("walk","carry") else 0
    if direction == "left": swing = -swing

    leg_color = (43,52,93,255)
    shoe = (27,27,55,255)
    if direction in ("left","right"):
        draw.rounded_rectangle((cx-13+swing//2,base_y-44,cx-2+swing//2,base_y-11),5,fill=leg_color)
        draw.rounded_rectangle((cx+3-swing//2,base_y-44,cx+14-swing//2,base_y-11),5,fill=leg_color)
        draw.ellipse((cx-18+swing//2,base_y-17,cx+1+swing//2,base_y-6),fill=shoe)
        draw.ellipse((cx-1-swing//2,base_y-17,cx+19-swing//2,base_y-6),fill=shoe)
    else:
        draw.rounded_rectangle((cx-19+swing,base_y-48,cx-5+swing,base_y-11),6,fill=leg_color)
        draw.rounded_rectangle((cx+5-swing,base_y-48,cx+19-swing,base_y-11),6,fill=leg_color)
        draw.rounded_rectangle((cx-23+swing,base_y-17,cx-3+swing,base_y-5),5,fill=shoe)
        draw.rounded_rectangle((cx+3-swing,base_y-17,cx+23-swing,base_y-5),5,fill=shoe)

    torso_top, torso_bottom = base_y-89, base_y-43
    shirt_rgba, accent_rgba, skin_rgba = rgba(shirt), rgba(accent), rgba(skin)
    draw.rounded_rectangle((cx-25,torso_top,cx+25,torso_bottom),13,fill=shade(shirt,.78),outline=(33,28,77,255),width=3)
    draw.rounded_rectangle((cx-22,torso_top-2,cx+22,torso_bottom-5),11,fill=shirt_rgba)
    draw.rounded_rectangle((cx-21,torso_top+7,cx+21,torso_top+16),4,fill=accent_rgba)
    arm_swing = swing if phase == "walk" else 0
    if phase in ("work","interact"):
        arm_swing = 8 if step % 2 else -5
    line(draw,[(cx-21,torso_top+10),(cx-30-arm_swing//2,torso_bottom-2)],skin_rgba,10)
    line(draw,[(cx+21,torso_top+10),(cx+30+arm_swing//2,torso_bottom-2)],skin_rgba,10)

    # Keep the complete head, hair, and hats inside each frame. The old head
    # center sat above the frame and let accessories leak into the prior row.
    head_y = torso_top + 8
    if direction == "up":
        draw.ellipse((cx-21,head_y-22,cx+21,head_y+20),fill=(83,49,43,255),outline=(38,27,61,255),width=3)
        draw.ellipse((cx-18,head_y-17,cx+18,head_y+17),fill=skin_rgba)
        draw.pieslice((cx-23,head_y-25,cx+23,head_y+18),180,355,fill=(80,47,40,255))
    else:
        profile = -3 if direction == "left" else 3 if direction == "right" else 0
        draw.ellipse((cx-20+profile,head_y-22,cx+20+profile,head_y+20),fill=skin_rgba,outline=(52,33,64,255),width=3)
        draw.pieslice((cx-22+profile,head_y-26,cx+22+profile,head_y+17),180,350,fill=(81,48,41,255))
        if direction == "left":
            draw.ellipse((cx-10,head_y-2,cx-6,head_y+2),fill=(25,24,50,255)); draw.arc((cx-15,head_y+2,cx-2,head_y+12),10,150,fill=(110,53,46,255),width=2)
        elif direction == "right":
            draw.ellipse((cx+6,head_y-2,cx+10,head_y+2),fill=(25,24,50,255)); draw.arc((cx+2,head_y+2,cx+15,head_y+12),30,170,fill=(110,53,46,255),width=2)
        else:
            draw.ellipse((cx-10,head_y-3,cx-6,head_y+1),fill=(25,24,50,255)); draw.ellipse((cx+6,head_y-3,cx+10,head_y+1),fill=(25,24,50,255)); draw.arc((cx-8,head_y+1,cx+8,head_y+13),20,160,fill=(110,53,46,255),width=2)

    accessory(draw, accessory_kind, cx, head_y-24, direction, accent)
    if accessory_kind in ("backpack",) and direction != "up":
        side = -29 if direction == "left" else 18
        draw.rounded_rectangle((cx+side,torso_top+3,cx+side+18,torso_bottom-4),7,fill=shade(accent,.8),outline=(38,31,71,255),width=2)
    if phase == "carry": package(draw,cx,torso_top+30,1.05)
    if phase in ("work","interact") and role_tool:
        tool(draw,role_tool,cx+8,torso_top+27,phase)
    elif phase == "interact" and accessory_kind in ("camera","cup","tote","briefcase"):
        tool(draw,accessory_kind,cx+10,torso_top+25,phase)
    if phase == "celebrate":
        line(draw,[(cx-20,torso_top+10),(cx-34,torso_top-18)],skin_rgba,9)
        line(draw,[(cx+20,torso_top+10),(cx+34,torso_top-18)],skin_rgba,9)

def build_sheet(name, shirt, accent, skin="#efb98e", accessory_kind="", role_tool=""):
    sheet = Image.new("RGBA",(FRAME_W*COLS,FRAME_H*ROWS),(0,0,0,0))
    def render_frame(column, row, direction, phase, step):
        # Render into an isolated frame before pasting. Even a future accessory
        # that reaches outside its cell can be clipped, never drawn under the
        # character in the row above.
        frame = Image.new("RGBA", (FRAME_W, FRAME_H), (0,0,0,0))
        frame_draw = ImageDraw.Draw(frame)
        draw_person(frame_draw,0,0,shirt,accent,skin,direction,phase,step,accessory_kind,role_tool)
        sheet.alpha_composite(frame, (column*FRAME_W, row*FRAME_H))

    directions = ["down","left","right","up"]
    for row,direction in enumerate(directions):
        for col in range(COLS): render_frame(col,row,direction,"walk",col)
    idle_dirs = ["down","left","right","up"]
    for col,direction in enumerate(idle_dirs): render_frame(col,4,direction,"idle",0)
    render_frame(4,4,"down","celebrate",0)
    for col in range(COLS): render_frame(col,5,"down","work",col)
    carry_dirs = ["down","left","right","up","down"]
    for col,direction in enumerate(carry_dirs): render_frame(col,6,direction,"carry",col)
    interact_dirs = ["down","left","right","down","down"]
    for col,direction in enumerate(interact_dirs): render_frame(col,7,direction,"interact",col)
    sheet.save(OUT / f"{name}.png", optimize=True)

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    build_sheet("player","#3657e7","#ffc54d","#efb98e","cap","")
    for name,shirt,accent,skin,accessory_kind in CUSTOMERS:
        build_sheet(f"customer-{name}",shirt,accent,skin,accessory_kind,"")
    for name,shirt,accent,role_tool in WORKERS:
        build_sheet(name,shirt,accent,"#efb98e","cap",role_tool)

if __name__ == "__main__":
    main()
