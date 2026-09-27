"""Reads the JIZURA plan and frames: writes lyric_lines.json (line timing) and lyric_boxes.json
(the text's bounding box during each line's hold, used to fit the line into the free part of each shot)."""
import json, sys, pathlib
from PIL import Image
HERE = pathlib.Path(__file__).parent
d = pathlib.Path(sys.argv[1])
plan = json.load(open(d / 'plan.json'))
lines = [{'line': c['line'], 'text': c['text'], 'start': c['start'], 'end': c['end']} for c in plan['cuts']]
boxes = {}
for L in lines:
    a, b = L['start'], L['end']
    box = None
    for k in range(9):                                   # sample the middle of the line (after the entrance)
        t = a + (b - a) * (0.3 + 0.5 * k / 8)
        im = Image.open(d / f'f{round(t * 30):05d}.png').getchannel('A').point(lambda v: 255 if v > 40 else 0)
        bb = im.getbbox()
        if bb: box = bb if box is None else (min(box[0], bb[0]), min(box[1], bb[1]), max(box[2], bb[2]), max(box[3], bb[3]))
    boxes[L['line']] = [box[0] - 20, box[1] - 20, box[2] - box[0] + 40, box[3] - box[1] + 40]
    print(L['line'], L['text'], boxes[L['line']])
json.dump(lines, open(HERE / 'lyric_lines.json', 'w'), ensure_ascii=False, indent=1)
json.dump(boxes, open(HERE / 'lyric_boxes.json', 'w'), indent=1)
