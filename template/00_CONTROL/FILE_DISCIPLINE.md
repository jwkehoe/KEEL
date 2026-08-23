# File Discipline

## Rule 1: Active Build Law Lives Up Front

Implementation work should start from `00_CONTROL/PROJECT_INDEX.md`, then the active documents in `01_PRODUCT_REQUIREMENTS/` and `02_IMPLEMENTATION_SPECS/`.

Do not treat files in `04_USE_CASES_AND_SEQUENCES/`, `05_TRANSCRIPTS/`, or `99_ARCHIVE/` as controlling requirements unless a control document explicitly promotes them.

## Rule 2: Raw Evidence Stays Raw

Original downloads, transcripts, and predecessor-name context should be preserved, not rewritten. If a readable or derived artifact is needed, create a sibling working document in the appropriate active folder and point back to the raw source.

## Rule 3: One Role Per Folder

- Product requirement documents go in `01_PRODUCT_REQUIREMENTS/`.
- Schema, route/table mapping, checklists, and implementation controls go in `02_IMPLEMENTATION_SPECS/`.
- Design source files and exports go in `03_DESIGN_ASSETS/`.
- Domain examples and reusable reference content go in `04_USE_CASES_AND_SEQUENCES/`.
- Transcripts go in `05_TRANSCRIPTS/`.
- Application source goes in `src/`.
- Software project notes go in `docs/`.
- Automated tests go in `tests/`.
- Duplicates, raw downloads, and predecessor-name context go in `99_ARCHIVE/`.

## Rule 4: No Silent Reclassification

If a reference document becomes implementation law, update `00_CONTROL/PROJECT_INDEX.md` in the same change. The index is the visible control surface.

## Rule 5: Generated Files Need A Home

When generating new build artifacts, use explicit names and stable folders:

- Implementation plans: `02_IMPLEMENTATION_SPECS/`
- Product clarifications: `01_PRODUCT_REQUIREMENTS/`
- Derived readable summaries: `00_CONTROL/` or the nearest active source folder
- Temporary scratch output: create `98_WORKING/` only when needed, and clean it before handoff

## Rule 6: Keep Machine And Download Noise Out

`.DS_Store`, unpacked duplicate download folders, and repeated zip copies should not sit in active folders. Preserve one raw archive when useful; quarantine duplicates under `99_ARCHIVE/redundant_duplicates/`.
