"""Builds subtitles/ハート泥棒_字幕_v3.jizura.json — the JIZURA project for the v3 lyric layer.

Lyrics and line starts are the provided lyrics / LRC timings. Each line gets a JIZURA technique chosen for its
part of the song; colours follow the two characters (white, A's magenta, A's cyan). Exported transparent (no key
colour), so the compositor can place and light the text over the picture."""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
base = json.loads((ROOT / 'subtitles/ハート泥棒_字幕.jizura.json').read_text())

def L(layout, enter, hold, exit, treat='none', decor=(), cam='push'):
    return {'cuts': 1, 'layout': layout, 'enter': enter, 'hold': hold, 'exit': exit, 'treat': treat,
            'decor': list(decor), 'bg': 'none', 'cam': cam}

overrides = {
    # Verse 1 — soft, sparkling
    0: L('center', 'fadeStagger', 'shimmer', 'blurOutStagger', 'doubleOutline', ['twinkle']),
    1: L('center', 'inkBleed', 'float', 'dissolve', 'glow', ['heartsStars']),
    2: L('center', 'blurStagger', 'still', 'melt', 'softShadow'),
    3: L('center', 'trackIn', 'trackBreathe', 'trackOutWide', 'outlineFill'),
    # Pre-chorus — calling out, word by word
    4: L('center', 'knWordSlam', 'beatHop', 'whipOut', 'outlineFill'),
    5: L('center', 'stamp', 'heartbeat', 'zoomThrough', 'outlineFill'),
    # Chorus 1
    6: L('center', 'zoomOut', 'heartbeat', 'shockOut', 'doubleOutline', ['heartsStars']),
    7: L('center', 'pop', 'wave', 'popOut', 'outlineFill'),
    8: L('center', 'spiralIn', 'sway', 'twist', 'glitchSplit'),
    9: L('center', 'stamp', 'pulse', 'shatterLite', 'extrude'),
    # Verse 2 — the phone
    11: L('center', 'slideR', 'still', 'slideOutL', 'sticker'),
    12: L('chat', 'type', 'still', 'backspace'),
    13: L('center', 'odometer', 'still', 'scrambleOut', 'none', ['likeCounter']),
    14: L('center', 'glitchIn', 'glitchJump', 'glitchDissolve', 'glitchSplit'),
    # Pre-chorus 2
    15: L('center', 'fadeStagger', 'focusRack', 'blurOutStagger', 'softShadow'),
    16: L('center', 'neonOn', 'glowFlicker', 'overexposeOut', 'glow'),
    # Chorus 2 — same words, bigger energy
    17: L('center', 'knTypeToSlam', 'heartbeat', 'shockOut', 'doubleOutline', ['heartsStars']),
    18: L('center', 'bounceBig', 'wave', 'popOut', 'outlineFill'),
    19: L('center', 'spiralIn', 'knWordRide', 'tornadoOut', 'glitchSplit'),
    20: L('center', 'zoomOut', 'pulse', 'glassBreak', 'extrude'),
}

project = dict(base)
project.update({
    'title': '', 'artist': '',            # the title card is drawn by the compositor
    'style': 'magenta', 'mood': None, 'unify': False, 'typeset': False,
    'keyBg': 'off', 'centerFree': False, 'includeAudio': False,
    'extra': True, 'wa': False, 'horror': False, 'typo': True, 'kinetic': True,
    'seed': 51820, 'aspect': '16:9', 'res': 1080, 'fps': 30,
    'fx': {'motion': 0.55, 'glitch': 0.25, 'chroma': 0.35, 'decor': 0.35, 'density': 0.25, 'texture': 0,
           'flash': False, 'onTwos': False, 'koma': 0, 'hud': 'off', 'bgSwitch': 0},
    'timing': {'bpm': 129.3, 'offset': 0, 'snap': False, 'tail': 0.1, 'lineTimes': {}, 'lineScale': 1},
    'colors': {'enabled': True, 'bg': '#1A1030', 'fg': '#FFFFFF', 'sub': '#FFD1E8',
               'accentOn': True, 'accent': '#FF4FA8', 'ghostA': '#35E6FF', 'ghostB': '#FF4FA8'},
    'fonts': {'display': 'pop', 'body': 'round', 'serif': 'mincho_bold'},
    'overrides': {str(k): v for k, v in overrides.items()},
})
project.pop('appVersion', None)
out = ROOT / 'subtitles/ハート泥棒_字幕_v3.jizura.json'
out.write_text(json.dumps(project, ensure_ascii=False, indent=2) + '\n')
print('wrote', out.relative_to(ROOT))
