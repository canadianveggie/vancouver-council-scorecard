from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "social"
WIDTH, HEIGHT = 1200, 630
PAPER = (244, 241, 233)
PANEL = (255, 253, 248)
INK = (23, 35, 31)
MUTED = (100, 113, 107)
BLUE = (36, 90, 154)
LINE = (217, 221, 211)
RED = (180, 83, 62)

HEAVY = "/Library/Fonts/TWK Lausanne Half Family/Fonts/Web/TTF 3.2/TWKLausanne-800.ttf"
REGULAR = "/Library/Fonts/TWK Lausanne Half Family/Fonts/Web/TTF 3.2/TWKLausanne-400.ttf"
MONO = "/System/Library/Fonts/Monaco.ttf"


def font(path, size):
    return ImageFont.truetype(path, size)


def mono(size):
    return font(MONO, size)


def draw_wrapped(draw, text, xy, typeface, size, fill, width, spacing=6):
    current_font = font(typeface, size)
    lines = []
    words = text.split()
    line = ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if draw.textlength(candidate, font=current_font) <= width or not line:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    draw.multiline_text(xy, "\n".join(lines), font=current_font, fill=fill, spacing=spacing)
    return len(lines) * size + max(0, len(lines) - 1) * spacing


def crop_square(image, size):
    image = image.convert("RGB")
    side = min(image.size)
    left = (image.width - side) // 2
    top = (image.height - side) // 2
    return image.crop((left, top, left + side, top + side)).resize(
        (size, size), Image.Resampling.LANCZOS
    )


def paste_party_logo(canvas, path, center, size):
    logo = Image.open(ROOT / "public" / path).convert("RGB")
    logo = crop_square(logo, size - 22)
    circle = Image.new("RGB", (size, size), "white")
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    circle.paste(logo, ((size - logo.width) // 2, (size - logo.height) // 2))
    canvas.paste(circle, (center[0] - size // 2, center[1] - size // 2), mask)


def result_preview(filename, party, score, logo):
    image = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(image)

    draw.text((48, 62), "YOUR RESULT", font=mono(15), fill=BLUE)
    draw.text((48, 116), "Your voting record", font=font(HEAVY, 59), fill=INK)
    draw.text((48, 180), "would be most similar", font=font(HEAVY, 59), fill=INK)
    draw.text((48, 244), "to:", font=font(HEAVY, 59), fill=INK)

    card = (48, 342, 1152, 510)
    draw.rectangle(card, fill=BLUE)
    paste_party_logo(image, logo, (150, 426), 92)
    draw.text((238, 380), "THE CLOSEST MATCH", font=mono(14), fill=(212, 225, 239))
    draw.text((238, 408), party, font=font(HEAVY, 46), fill="white")
    draw.text((238, 467), f"{score}% match", font=mono(18), fill="white")

    draw.rounded_rectangle((48, 548, 250, 600), radius=26, fill=INK)
    draw.text((72, 564), "↗  Share my result", font=font(REGULAR, 17), fill="white")
    image.save(OUTPUT / filename, optimize=True)


def quiz_preview():
    image = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(image)

    draw.text((48, 38), "YOUR VOTING RECORD", font=mono(13), fill=BLUE)
    draw.text((1082, 38), "1  /  12", font=mono(13), fill=MUTED)
    draw.rectangle((48, 67, 1152, 71), fill=LINE)
    draw.rectangle((48, 67, 140, 71), fill=BLUE)

    draw.rectangle((48, 104, 1152, 575), fill=PANEL, outline=LINE, width=2)
    hotel = crop_square(Image.open(ROOT / "public" / "images" / "floating_hotel.png"), 154)
    image.paste(hotel, (82, 143))
    draw.text((276, 145), "URBANISM", font=mono(13), fill=BLUE)
    draw.text((276, 177), "Floating Hotel", font=font(HEAVY, 42), fill=INK)
    draw_wrapped(
        draw,
        "Should Vancouver allow a 250-room floating hotel beside the Vancouver Convention Centre?",
        (276, 236),
        REGULAR,
        19,
        MUTED,
        790,
        spacing=4,
    )

    draw.line((48, 344, 1152, 344), fill=LINE, width=2)
    draw.text((82, 364), "HOW WOULD YOU VOTE?", font=mono(13), fill=MUTED)
    draw.line((82, 406, 570, 406), fill=BLUE, width=3)
    draw.line((630, 406, 1118, 406), fill=RED, width=3)
    draw.text((82, 423), "THE CASE FOR", font=mono(12), fill=MUTED)
    draw.text((630, 423), "THE CASE AGAINST", font=mono(12), fill=MUTED)
    draw_wrapped(
        draw,
        "Adds hotel rooms and visitor-serving space beside the convention centre.",
        (82, 451),
        REGULAR,
        15,
        INK,
        460,
        spacing=3,
    )
    draw_wrapped(
        draw,
        "Adds private commercial activity to the waterfront and could affect public access.",
        (630, 451),
        REGULAR,
        15,
        INK,
        460,
        spacing=3,
    )
    image.save(OUTPUT / "quiz-question-one.png", optimize=True)


OUTPUT.mkdir(parents=True, exist_ok=True)
result_preview("results-green.png", "Green", 92, "party/greens.webp")
result_preview("results-onecity.png", "OneCity", 92, "party/onecity.webp")
result_preview("results-cope.png", "COPE", 92, "party/cope.webp")
result_preview("results-abc.png", "ABC", 92, "party/abc.jpg")
result_preview("results-vote-vancouver.png", "Vote Vancouver", 92, "party/vote_vancouver.jpg")
quiz_preview()
