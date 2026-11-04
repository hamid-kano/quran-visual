"""
One-time extraction of the Qurany topic index into sources/qurany-concepts.json.

Source: the Qurany Concepts Tool (Noorhan Abbas and Eric Atwell, University of Leeds), whose
topics were imported from the thematic index of Mushaf Al-Tajweed (compiled by Dr Mohammad
Habash, Dar Al-Maarifah, Damascus; approved by the Al-Azhar Islamic Research Academy).
Read from the archived copy of www.comp.leeds.ac.uk/nora/html in
https://github.com/motazsaad/quran-concepts (commit b6314eb40b0a57364f297fbc7d4a7e79e0d31fe2).

Topic paths are stored exactly as they appear on each ayah page; cleaning and corrections are
applied, and listed, in scripts/build-topics.ts. Only ayahs that exist (6236) are kept: the
archive also has pages for 37:183 and 38:89, which do not exist and carry no topics.

Usage: python3 -I scripts/sources/extract-qurany.py <path-to>/www.comp.leeds.ac.uk/nora/html
"""
import json
import re
import sys
from pathlib import Path

root = Path(sys.argv[1])
counts = json.loads(Path("sources/kfgqpc-hafs-v18.json").read_text(encoding="utf8"))
ayahs = {}
for r in counts:
    page = (root / f"{r['sora']}-{r['aya_no']}.html").read_text(encoding="utf8", errors="strict")
    start = page.index("Concepts/Themes Covered")
    section = page[start : page.index("Home", start)]
    lines = re.sub(r"<[^>]+>", "\n", section).split("\n")
    paths = [l.strip() for l in lines if ">" in l and re.search("[؀-ۿ]", l)]
    ayahs[f"{r['sora']}:{r['aya_no']}"] = paths

out = {
    "source": {
        "name": "Qurany Concepts Tool (University of Leeds), topics from the index of Mushaf Al-Tajweed",
        "archive": "https://github.com/motazsaad/quran-concepts",
        "commit": "b6314eb40b0a57364f297fbc7d4a7e79e0d31fe2",
    },
    "ayahs": ayahs,
}
Path("sources/qurany-concepts.json").write_text(
    json.dumps(out, ensure_ascii=False, indent=0), encoding="utf8"
)
print(len(ayahs), "ayahs;", sum(1 for v in ayahs.values() if v), "with topics")
