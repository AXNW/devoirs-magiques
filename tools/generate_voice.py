#!/usr/bin/env python3
"""Génère les voix pré-enregistrées du chat avec ElevenLabs (audio/voice/*.mp3).

Aucune dépendance : Python 3.8+ suffit.

La clé API est lue UNIQUEMENT dans la variable d'environnement ELEVENLABS_API_KEY.
Elle n'est jamais écrite dans un fichier ni affichée.

Utilisation (depuis le dossier du projet) :
    python3 tools/generate_voice.py --list-voices        # trouver un voice_id
    python3 tools/generate_voice.py --dry-run            # voir ce qui serait généré
    python3 tools/generate_voice.py                      # générer ce qui manque ou a changé
    python3 tools/generate_voice.py --force              # tout régénérer (ex. nouvelle voix)
    python3 tools/generate_voice.py --only praise_0 n7   # régénérer quelques enregistrements

Variables d'environnement :
    ELEVENLABS_API_KEY   (obligatoire)  votre clé API
    ELEVENLABS_VOICE_ID  (obligatoire pour générer)  la voix choisie
    ELEVENLABS_MODEL     (facultatif)   modèle, par défaut eleven_multilingual_v2
    ELEVENLABS_SPEED     (facultatif)   vitesse, par défaut 0.95
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LINES_FILE = ROOT / "js" / "voice" / "lines.js"
OUT_DIR = ROOT / "audio" / "voice"
INDEX_FILE = OUT_DIR / "index.json"
API = "https://api.elevenlabs.io"
OUTPUT_FORMAT = "mp3_44100_64"  # léger et largement suffisant pour de la voix

EMOJI = re.compile(
    "[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U00002B00-\U00002BFF️‍⌀-⏿]"
)


def load_lines():
    src = LINES_FILE.read_text(encoding="utf-8")
    m = re.search(r"/\* BEGIN LINES \*/(.*?)/\* END LINES \*/", src, re.S)
    if not m:
        sys.exit(f"Bloc BEGIN LINES / END LINES introuvable dans {LINES_FILE}")
    return json.loads(m.group(1))


def story_sentence(story, part, n):
    """Même règle que storySentence() dans js/voice/lines.js."""
    return story[part][0] if n == 1 else story[part][1].replace("{n}", str(n))


def all_clips(lines):
    """Même liste (et mêmes clés) que allClips() dans js/voice/lines.js."""
    clips = []
    for group, value in lines.items():
        if group == "story_terms":
            continue
        if group == "stories":
            terms = lines["story_terms"]
            for story in value:
                for n in range(terms["from"], terms["to"] + 1):
                    clips.append((f"story_{story['id']}_a{n}", story_sentence(story, "first", n)))
                    clips.append((f"story_{story['id']}_b{n}", story_sentence(story, "second", n)))
                clips.append((f"story_{story['id']}_q", story["question"]))
        elif group == "numbers":
            for n in range(value["from"], value["to"] + 1):
                clips.append((f"n{n}", str(n)))
        elif isinstance(value, list):
            for i, text in enumerate(value):
                clips.append((f"{group}_{i}", text))
        else:
            for k, text in value.items():
                clips.append((f"{group}_{k}", text))
    return clips


def spoken(text):
    """Texte envoyé à la synthèse : sans emojis, espaces normalisés."""
    return re.sub(r"\s+", " ", EMOJI.sub("", text)).strip()


def api_key():
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not key:
        sys.exit("ELEVENLABS_API_KEY n'est pas défini (voir README, section « Voix pré-enregistrées »).")
    return key


def request(method, path, key, body=None, query=None):
    url = API + path + ("?" + urllib.parse.urlencode(query) if query else "")
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("xi-api-key", key)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.read()
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:500]
        raise RuntimeError(f"HTTP {e.code} : {detail}") from None


FRENCH = re.compile(r"\b(fr|fr-fr|french|français|francais|parisian|parisien|france)\b", re.I)


def is_french(voice):
    """Voix native française d'après ses étiquettes (langue, accent) ou sa description."""
    labels = voice.get("labels") or {}
    blob = " ".join(str(v) for v in labels.values() if v) + " " + (voice.get("description") or "")
    blob += " " + " ".join(str(v.get("language", "")) + " " + str(v.get("accent", ""))
                           for v in voice.get("verified_languages") or [])
    return bool(FRENCH.search(blob))


def list_voices(key):
    token = None
    voices = []
    while True:
        query = {"page_size": 100}
        if token:
            query["next_page_token"] = token
        data = json.loads(request("GET", "/v2/voices", key, query=query))
        voices += data.get("voices", [])
        if not data.get("has_more"):
            break
        token = data.get("next_page_token")

    voices.sort(key=lambda v: not is_french(v))
    print(f"   {'voice_id':<24} nom — infos")
    for v in voices:
        labels = v.get("labels") or {}
        info = ", ".join(f"{k}: {val}" for k, val in labels.items() if val)
        flag = "FR " if is_french(v) else "   "
        print(f"{flag}{v.get('voice_id', ''):<24} {v.get('name', '')} — {info}")

    if not any(is_french(v) for v in voices):
        print("\nAucune voix française dans « My Voices ». Les voix ci-dessus parleront français")
        print("avec un accent étranger. Ajoutez une voix depuis la Voice Library d'elevenlabs.io")
        print("(filtre Language : French), puis relancez cette commande.")
    else:
        print("\nFR = voix native française (d'après ses étiquettes). Écoutez-la sur elevenlabs.io,")
        print("puis : export ELEVENLABS_VOICE_ID=<voice_id>")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--list-voices", action="store_true", help="lister les voix disponibles sur votre compte")
    parser.add_argument("--dry-run", action="store_true", help="afficher ce qui serait généré, sans appeler l'API")
    parser.add_argument("--force", action="store_true", help="tout régénérer")
    parser.add_argument("--only", nargs="+", metavar="CLÉ", help="régénérer seulement ces enregistrements")
    args = parser.parse_args()

    if args.list_voices:
        list_voices(api_key())
        return

    clips = all_clips(load_lines())
    keys = [k for k, _ in clips]
    if len(set(keys)) != len(keys):
        sys.exit("Clés en double dans js/voice/lines.js")
    for k in keys:
        if not re.fullmatch(r"[a-z0-9_]+", k):
            sys.exit(f"Clé invalide (lettres minuscules, chiffres, _) : {k}")

    index = {"clips": {}}
    if INDEX_FILE.exists():
        index = json.loads(INDEX_FILE.read_text(encoding="utf-8"))
        index.setdefault("clips", {})

    model = os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2")
    voice = os.environ.get("ELEVENLABS_VOICE_ID", "").strip()
    speed = float(os.environ.get("ELEVENLABS_SPEED", "0.95"))
    same_voice = index.get("voice_id") == voice and index.get("model") == model

    todo = []
    for key, text in clips:
        if args.only and key not in args.only:
            continue
        up_to_date = same_voice and index["clips"].get(key) == text and (OUT_DIR / f"{key}.mp3").exists()
        if args.force or args.only or not up_to_date:
            todo.append((key, text))
    obsolete = [k for k in index["clips"] if k not in keys]

    chars = sum(len(spoken(t)) for _, t in todo)
    print(f"{len(clips)} enregistrements au catalogue, {len(todo)} à générer ({chars} caractères).")
    if obsolete:
        print(f"{len(obsolete)} enregistrement(s) obsolète(s) seront retirés : {', '.join(obsolete)}")
    if args.dry_run:
        for key, text in todo:
            print(f"  {key:<28} {spoken(text)}")
        return
    if not todo and not obsolete:
        print("Tout est à jour.")
        return

    key_api = api_key()
    if todo and not voice:
        sys.exit("ELEVENLABS_VOICE_ID n'est pas défini. Lancez d'abord : python3 tools/generate_voice.py --list-voices")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if not same_voice:
        index["clips"] = {}  # nouvelle voix ou nouveau modèle : l'ancien index ne vaut plus
    index["voice_id"], index["model"] = voice, model

    for k in obsolete:
        index["clips"].pop(k, None)
        (OUT_DIR / f"{k}.mp3").unlink(missing_ok=True)

    for i, (key, text) in enumerate(todo, 1):
        body = {
            "text": spoken(text),
            "model_id": model,
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "style": 0.0, "speed": speed},
            "seed": 42,
        }
        for attempt in range(3):
            try:
                audio = request("POST", f"/v1/text-to-speech/{voice}", key_api, body, {"output_format": OUTPUT_FORMAT})
                break
            except RuntimeError as e:
                if attempt == 2 or not str(e).startswith(("HTTP 429", "HTTP 5")):
                    INDEX_FILE.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
                    sys.exit(f"Échec pour {key} : {e}\n(ce qui a déjà été généré est conservé)")
                time.sleep(3 * (attempt + 1))
        (OUT_DIR / f"{key}.mp3").write_bytes(audio)
        index["clips"][key] = text
        print(f"[{i}/{len(todo)}] {key}")
        if i % 10 == 0:  # sauvegarde régulière : on peut interrompre et reprendre
            INDEX_FILE.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")

    INDEX_FILE.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Terminé : {len(index['clips'])} enregistrements dans {OUT_DIR.relative_to(ROOT)}.")


if __name__ == "__main__":
    main()
