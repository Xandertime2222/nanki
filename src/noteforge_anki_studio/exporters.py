from __future__ import annotations

import csv
import hashlib
import html
import json
import os
import sqlite3
import tempfile
import time
import uuid
import zipfile
from pathlib import Path
from typing import Iterable

from .models import Card, NoteDocument

FIELD_SEP = "\x1f"
BASIC_MODEL_ID = 1700000000001
REVERSE_MODEL_ID = 1700000000002
CLOZE_MODEL_ID = 1700000000003


def merge_tags(note: NoteDocument, card: Card) -> list[str]:
    merged: list[str] = []
    seen: set[str] = set()
    for tag in [*note.meta.tags, *card.tags, "nanki"]:
        clean = tag.strip().replace(" ", "-")
        if clean and clean not in seen:
            merged.append(clean)
            seen.add(clean)
    return merged


def tags_to_anki_string(tags: Iterable[str]) -> str:
    cleaned = [tag.strip().replace(" ", "-") for tag in tags if tag.strip()]
    return f" {' '.join(cleaned)} " if cleaned else ""


def htmlify(value: str) -> str:
    safe = html.escape(value, quote=False)
    return safe.replace("\n", "<br>")


class CardExporter:
    def export_csv(self, note: NoteDocument, path: Path) -> Path:
        with path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(
                [
                    "card_id",
                    "type",
                    "deck_name",
                    "tags",
                    "front",
                    "back",
                    "extra",
                    "source_locator",
                    "source_excerpt",
                    "created_at",
                    "updated_at",
                    "note_id",
                    "note_title",
                ]
            )
            for card in note.cards:
                writer.writerow(
                    [
                        card.id,
                        card.type,
                        card.deck_name or note.meta.default_deck,
                        " ".join(merge_tags(note, card)),
                        card.front,
                        card.back,
                        card.extra,
                        card.source_locator,
                        card.source_excerpt,
                        card.created_at,
                        card.updated_at,
                        note.meta.id,
                        note.meta.title,
                    ]
                )
        return path

    def export_anki_txt(self, note: NoteDocument, path: Path) -> Path:
        lines = [
            "#separator:tab",
            "#html:true",
            "#notetype column:1",
            "#deck column:2",
            "#tags column:3",
        ]
        for card in note.cards:
            deck_name = card.deck_name or note.meta.default_deck
            tags = " ".join(merge_tags(note, card))
            if card.type == "cloze":
                notetype = "Cloze"
                text = card.front if "{{c" in card.front else f"{{{{c1::{card.front}}}}}"
                extra = card.extra or card.back
                row = [notetype, deck_name, tags, htmlify(text), htmlify(extra)]
            elif card.type == "reverse":
                notetype = "Basic (and reversed card)"
                row = [notetype, deck_name, tags, htmlify(card.front), htmlify(card.back)]
            else:
                notetype = "Basic"
                row = [notetype, deck_name, tags, htmlify(card.front), htmlify(card.back)]
            lines.append("\t".join(row))
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return path

    def export_apkg(self, note: NoteDocument, path: Path) -> Path:
        with tempfile.TemporaryDirectory(prefix="nanki-apkg-") as tmpdir:
            temp_root = Path(tmpdir)
            db_path = temp_root / "collection.anki21"
            self._write_collection_db(note, db_path)
            media_path = temp_root / "media"
            media_path.write_text("{}", encoding="utf-8")
            with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
                archive.write(db_path, arcname="collection.anki21")
                archive.write(db_path, arcname="collection.anki2")
                archive.write(media_path, arcname="media")
        return path

    def _write_collection_db(self, note: NoteDocument, db_path: Path) -> None:
        if db_path.exists():
            db_path.unlink()
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.executescript(
            """
            CREATE TABLE col (
              id integer PRIMARY KEY,
              crt integer NOT NULL,
              mod integer NOT NULL,
              scm integer NOT NULL,
              ver integer NOT NULL,
              dty integer NOT NULL,
              usn integer NOT NULL,
              ls integer NOT NULL,
              conf text NOT NULL,
              models text NOT NULL,
              decks text NOT NULL,
              dconf text NOT NULL,
              tags text NOT NULL
            );
            CREATE TABLE notes (
              id integer PRIMARY KEY,
              guid text NOT NULL,
              mid integer NOT NULL,
              mod integer NOT NULL,
              usn integer NOT NULL,
              tags text NOT NULL,
              flds text NOT NULL,
              sfld integer NOT NULL,
              csum integer NOT NULL,
              flags integer NOT NULL,
              data text NOT NULL
            );
            CREATE TABLE cards (
              id integer PRIMARY KEY,
              nid integer NOT NULL,
              did integer NOT NULL,
              ord integer NOT NULL,
              mod integer NOT NULL,
              usn integer NOT NULL,
              type integer NOT NULL,
              queue integer NOT NULL,
              due integer NOT NULL,
              ivl integer NOT NULL,
              factor integer NOT NULL,
              reps integer NOT NULL,
              lapses integer NOT NULL,
              left integer NOT NULL,
              odue integer NOT NULL,
              odid integer NOT NULL,
              flags integer NOT NULL,
              data text NOT NULL
            );
            CREATE TABLE revlog (
              id integer PRIMARY KEY,
              cid integer NOT NULL,
              usn integer NOT NULL,
              ease integer NOT NULL,
              ivl integer NOT NULL,
              lastIvl integer NOT NULL,
              factor integer NOT NULL,
              time integer NOT NULL,
              type integer NOT NULL
            );
            CREATE TABLE graves (
              usn integer NOT NULL,
              oid integer NOT NULL,
              type integer NOT NULL
            );
            CREATE INDEX ix_notes_usn ON notes (usn);
            CREATE INDEX ix_cards_usn ON cards (usn);
            CREATE INDEX ix_revlog_usn ON revlog (usn);
            CREATE INDEX ix_cards_nid ON cards (nid);
            CREATE INDEX ix_cards_sched ON cards (did, queue, due);
            CREATE INDEX ix_revlog_cid ON revlog (cid);
            CREATE INDEX ix_notes_csum ON notes (csum);
            """
        )
        now = int(time.time())
        now_ms = int(time.time() * 1000)
        decks = self._build_decks_json(note, now)
        models = self._build_models_json(now)
        dconf = self._build_default_dconf(now)
        cur.execute(
            "insert into col values (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                1,
                int(now / 86400),
                now,
                now_ms,
                11,
                0,
                0,
                0,
                json.dumps({}),
                json.dumps(models),
                json.dumps(decks),
                json.dumps(dconf),
                json.dumps({}),
            ),
        )

        due_counter = 1
        for app_card in note.cards:
            deck_name = app_card.deck_name or note.meta.default_deck
            did = self._stable_int(deck_name)
            tags = merge_tags(note, app_card)
            if app_card.type == "cloze":
                nid = self._stable_note_id(app_card.id)
                front = app_card.front if "{{c" in app_card.front else f"{{{{c1::{app_card.front}}}}}"
                extra = app_card.extra or app_card.back
                fields = [front, extra]
                cur.execute(
                    "insert into notes values (?,?,?,?,?,?,?,?,?,?,?)",
                    self._note_row(nid, CLOZE_MODEL_ID, fields, tags, now),
                )
                cur.execute(
                    "insert into cards values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    self._card_row(self._stable_card_id(app_card.id, 0), nid, did, 0, now, due_counter),
                )
                due_counter += 1
            elif app_card.type == "reverse":
                nid = self._stable_note_id(app_card.id)
                fields = [app_card.front, app_card.back]
                cur.execute(
                    "insert into notes values (?,?,?,?,?,?,?,?,?,?,?)",
                    self._note_row(nid, REVERSE_MODEL_ID, fields, tags, now),
                )
                for ord_ in (0, 1):
                    cur.execute(
                        "insert into cards values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        self._card_row(self._stable_card_id(app_card.id, ord_), nid, did, ord_, now, due_counter),
                    )
                    due_counter += 1
            else:
                nid = self._stable_note_id(app_card.id)
                fields = [app_card.front, app_card.back]
                cur.execute(
                    "insert into notes values (?,?,?,?,?,?,?,?,?,?,?)",
                    self._note_row(nid, BASIC_MODEL_ID, fields, tags, now),
                )
                cur.execute(
                    "insert into cards values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    self._card_row(self._stable_card_id(app_card.id, 0), nid, did, 0, now, due_counter),
                )
                due_counter += 1

        conn.commit()
        conn.close()

    def _note_row(self, nid: int, mid: int, fields: list[str], tags: list[str], now: int) -> tuple:
        sfld = self._strip_html(fields[0])
        csum = self._checksum(sfld)
        return (
            nid,
            uuid.uuid4().hex[:10],
            mid,
            now,
            0,
            tags_to_anki_string(tags),
            FIELD_SEP.join(fields),
            sfld,
            csum,
            0,
            "",
        )

    def _card_row(self, cid: int, nid: int, did: int, ord_: int, now: int, due: int) -> tuple:
        return (
            cid,
            nid,
            did,
            ord_,
            now,
            0,
            0,
            0,
            due,
            0,
            2500,
            0,
            0,
            0,
            0,
            0,
            0,
            "",
        )

    def _build_decks_json(self, note: NoteDocument, now: int) -> dict[str, dict]:
        deck_names = sorted({card.deck_name or note.meta.default_deck for card in note.cards} or {note.meta.default_deck})
        decks: dict[str, dict] = {}
        for name in deck_names:
            did = self._stable_int(name)
            decks[str(did)] = {
                "id": did,
                "name": name,
                "mod": now,
                "usn": 0,
                "desc": f"Exported from Nanki note '{note.meta.title}'.",
                "dyn": 0,
                "collapsed": False,
                "browserCollapsed": False,
                "conf": 1,
                "newToday": [0, 0],
                "revToday": [0, 0],
                "lrnToday": [0, 0],
                "timeToday": [0, 0],
                "extendNew": 0,
                "extendRev": 0,
                "reviewLimit": None,
                "newLimit": None,
                "reviewLimitToday": None,
                "newLimitToday": None,
            }
        return decks

    def _build_default_dconf(self, now: int) -> dict[str, dict]:
        return {
            "1": {
                "id": 1,
                "name": "Default",
                "mod": now,
                "usn": 0,
                "maxTaken": 60,
                "autoplay": True,
                "timer": 0,
                "replayq": True,
                "new": {
                    "bury": True,
                    "delays": [1, 10],
                    "initialFactor": 2500,
                    "ints": [1, 4, 7],
                    "order": 1,
                    "perDay": 20,
                    "separate": True,
                },
                "rev": {
                    "bury": True,
                    "ease4": 1.3,
                    "fuzz": 0.05,
                    "ivlFct": 1,
                    "maxIvl": 36500,
                    "perDay": 200,
                    "hardFactor": 1.2,
                },
                "lapse": {
                    "delays": [10],
                    "leechAction": 0,
                    "leechFails": 8,
                    "minInt": 1,
                    "mult": 0,
                },
            }
        }

    def _build_models_json(self, now: int) -> dict[str, dict]:
        css = ".card { font-family: Arial; font-size: 20px; text-align: left; color: black; background-color: white; }"
        latex_pre = "\\documentclass[12pt]{article}\\special{papersize=3in,5in}\\usepackage[utf8]{inputenc}\\usepackage{amssymb,amsmath}\\pagestyle{empty}\\setlength{\\parindent}{0in}\\begin{document}"
        latex_post = "\\end{document}"
        return {
            str(BASIC_MODEL_ID): {
                "css": css,
                "did": None,
                "flds": [
                    self._field("Front", 0),
                    self._field("Back", 1),
                ],
                "id": BASIC_MODEL_ID,
                "latexPost": latex_post,
                "latexPre": latex_pre,
                "mod": now,
                "name": "Nanki Basic",
                "req": [[0, "all", [0]]],
                "sortf": 0,
                "tags": [],
                "tmpls": [
                    self._template("Card 1", 0, "{{Front}}", "{{FrontSide}}<hr id=answer>{{Back}}"),
                ],
                "type": 0,
                "usn": 0,
                "vers": [],
            },
            str(REVERSE_MODEL_ID): {
                "css": css,
                "did": None,
                "flds": [
                    self._field("Front", 0),
                    self._field("Back", 1),
                ],
                "id": REVERSE_MODEL_ID,
                "latexPost": latex_post,
                "latexPre": latex_pre,
                "mod": now,
                "name": "Nanki Basic (and reversed card)",
                "req": [[0, "all", [0]], [1, "all", [1]]],
                "sortf": 0,
                "tags": [],
                "tmpls": [
                    self._template("Card 1", 0, "{{Front}}", "{{FrontSide}}<hr id=answer>{{Back}}"),
                    self._template("Card 2", 1, "{{Back}}", "{{FrontSide}}<hr id=answer>{{Front}}"),
                ],
                "type": 0,
                "usn": 0,
                "vers": [],
            },
            str(CLOZE_MODEL_ID): {
                "css": css,
                "did": None,
                "flds": [
                    self._field("Text", 0),
                    self._field("Extra", 1),
                ],
                "id": CLOZE_MODEL_ID,
                "latexPost": latex_post,
                "latexPre": latex_pre,
                "mod": now,
                "name": "Nanki Cloze",
                "req": [[0, "all", [0]]],
                "sortf": 0,
                "tags": [],
                "tmpls": [
                    self._template("Cloze", 0, "{{cloze:Text}}", "{{cloze:Text}}<br>{{Extra}}"),
                ],
                "type": 1,
                "usn": 0,
                "vers": [],
            },
        }

    def _field(self, name: str, ord_: int) -> dict:
        return {
            "font": "Arial",
            "id": self._stable_int(f"field-{name}-{ord_}"),
            "media": [],
            "name": name,
            "ord": ord_,
            "rtl": False,
            "size": 20,
            "sticky": False,
            "description": "",
        }

    def _template(self, name: str, ord_: int, qfmt: str, afmt: str) -> dict:
        return {
            "afmt": afmt,
            "bafmt": "",
            "bfont": "Arial",
            "bqfmt": "",
            "bsize": 20,
            "did": None,
            "id": self._stable_int(f"template-{name}-{ord_}"),
            "name": name,
            "ord": ord_,
            "qfmt": qfmt,
        }

    def _checksum(self, text: str) -> int:
        digest = hashlib.sha1(text.encode("utf-8")).hexdigest()
        return int(digest[:8], 16)

    def _strip_html(self, text: str) -> str:
        return (
            text.replace("<br>", " ")
            .replace("<br/>", " ")
            .replace("<br />", " ")
            .replace("<hr id=answer>", " ")
        )

    def _stable_int(self, raw: str) -> int:
        digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()
        return 10**12 + int(digest[:11], 16)

    def _stable_note_id(self, raw: str) -> int:
        return self._stable_int(f"note-{raw}")

    def _stable_card_id(self, raw: str, ord_: int) -> int:
        return self._stable_int(f"card-{raw}-{ord_}")
