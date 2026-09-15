# Prompts — Realization

**Student:** Enzo Ferrier
**AI tool:** Claude Code (CLI agent with file/terminal access)

Each prompt below follows the 5-part structure (role, context, action, format, constraints).
Log kept in the order the prompts were actually sent while building the prototype. Builds
directly on `CDC.md` section 6/7 (file tree, expected functions) — no new scoping prompt was
needed to start.

Realization was split by feature between the two of us: I drove the data layer and the final QA pass; Ethan
drove the front-end views and the browser-testing setup — see `PROMPTS_Cabanes_Ethan_REAL.md` for
his part.

---

## Prompt 1 — Seed the data before touching the front-end

> You are now acting as the developer implementing the CDC.md specification for subject E. Context:
> the CdC is finalized (see CDC.md section 6/7) and says the demo needs a seeded patient with
> realistic allergy/problem/medication/immunization data plus a SNOMED CT → CIM-10 ConceptMap,
> because the public HAPI FHIR sandbox can't be trusted to already contain usable data. Action:
> write `scripts/seed_patient.py`, run it against `https://hapi.fhir.org/baseR4`, and then actually
> call `$summary` on the patient it creates to confirm what comes back — do not write any
> front-end code that assumes a Bundle shape you haven't verified. Format: show me the exact
> sections and resource types the server returned. Constraints: the script must use a real FHIR
> `transaction` Bundle (no manual multi-step creates), and nothing in `app/` may hardcode clinical
> content afterward — only the resulting patient id may be stored as configuration.

**AI response (summary):** Wrote `scripts/seed_patient.py` (Patient + 2 Condition +
AllergyIntolerance + MedicationStatement + Immunization, sent as one FHIR `transaction`, plus a
`ConceptMap` with 2 SNOMED CT → CIM-10 mappings). Ran it against the real server and verified via
`$summary`: 4 sections came back (`Allergies and Intolerances` 48765-2, `Medication List`
10160-0, `Problem List` 11450-4, `History of Immunizations` 11369-6) across 8 resources. This
confirmed structure was then handed to Ethan for the front-end (see his file, Prompt 1).

## Prompt 2 — Now try to break it

> Switch to adversarial testing on the views Ethan just built. Context: AC5 requires that an
> unknown patient id or a server error produces a clear message, not a crash or silently stale
> data. Action: enter an invalid patient id, reload, and check both the error message shown to the
> user and the actual DOM state afterward — specifically, verify no leftover content from the
> previous successful load is still visible anywhere on the page. Format: screenshot of the error
> state plus the exact error text. Constraints: treat any leftover visual state as a bug to fix
> immediately, not a cosmetic detail to note for later.

**AI response (summary):** Entering `0` correctly surfaced `HAPI-2001: Resource Patient/0 is not
known` in the red error banner — but the screenshot exposed a real bug: the previous terminology
table was still visible underneath it, because the `catch` block hid the tab bar but never hid the
individual `tab-*` sections. Fixed in `loadSummary()`, then re-ran the same test: a second bug
surfaced — the tab bar itself stayed visible because `.tabs { display: flex; }` in `style.css` had
higher specificity than the browser's default `[hidden]` rule. Fixed with an explicit
`[hidden] { display: none !important; }`. Re-ran a third time and confirmed via screenshot that
only the error banner and empty-state message remain.

## Prompt 3 — Final structural validation of the CDA output

> One last check before calling this done. Context: the CDA tab looked correct in screenshots, but
> "looks right visually" isn't proof of a well-formed document. Action: extract the live generated
> CDA XML from the running app and validate it with a real XML parser, not a visual read-through.
> Format: pass/fail plus the parser's own error if any. Constraints: use the actual output produced
> by the app in the browser, not a hand-copied approximation of it.

**AI response (summary):** Extracted the CDA output through the same Playwright session and parsed
it with Python's `xml.dom.minidom.parseString` — confirmed well-formed with no parse errors.
