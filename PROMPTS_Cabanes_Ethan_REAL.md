# Prompts — Realization

**Student:** Ethan Cabanes
**AI tool:** Perplexity (Model: Claude Code, CLI agent with file/terminal access)

> **Note added by the group after convergence.** These prompts are the front-end/testing-setup
> share of the realization work, split by feature: Enzo drove the data layer and the final QA pass
> (see `PROMPTS_Ferrier_Enzo_REAL.md`); Ethan drove the views/CDA implementation and getting a real
> browser test running.
>

---

## Prompt 1 — Build the four required views

> Still acting as the developer on this codebase. Context: CDC.md's acceptance criteria AC1–AC6
> require four views (business/clinical, raw FHIR resources, generated CDA, terminology
> alignment), a visible HTTP exchange log, and minimal but real error handling — and Enzo just
> confirmed the seeded Bundle structure (4 sections, 8 resources) from the real server. Action:
> implement `app/index.html`, `app/style.css`, and `app/app.js` to satisfy all of AC1–AC6,
> including a `bundleToCda` function that maps each IPS Composition section to a CDA `<section>`
> using the same LOINC code, and embeds the SNOMED→CIM-10 alignment as a CDA `<translation>`
> element on `Condition` entries. Format: plain HTML/CSS/vanilla JS, no framework, no build step.
> Constraints: every FHIR call must go through one wrapper that logs it and parses
> `OperationOutcome` on failure; run `node --check app.js` before considering it done.

**AI response (summary):** Implemented the three files with `fhirFetch()` as the single logging/
error-parsing wrapper, `renderClinicalView`, `renderResourcesView`, `bundleToCda`, and
`renderTerminologyView`. `node --check app.js` passed before any browser testing was attempted.

## Prompt 2 — Prove it works in a real browser, not just in theory

> You are now acting as QA for this prototype. Context: the code passes a syntax check, but that
> only proves it parses, not that it runs correctly for a real user. Action: check whether a
> project-specific skill for running this app already exists before improvising; if not, find a way
> to actually launch the app and drive it like a user would, with a real browser — reading the
> source and reasoning about it is not an acceptable substitute. Format: end with a screenshot-based
> report, not just a text description. Constraints: if a required tool (headless browser) isn't
> installed, ask me before installing anything — don't silently add dependencies to the machine.

**AI response (summary):** No project-run skill existed yet. No headless browser
(`chromium-cli`/Playwright/Puppeteer) was installed either — asked before installing Playwright
rather than doing it silently.

## Prompt 3 — Go ahead and set up real browser testing

> Yes, install Playwright so we get a genuine browser test with screenshots, not a logic
> simulation. Context: this machine has no network access to Playwright's own Chromium CDN, but
> Chrome and Edge are already installed system-wide. Action: get Playwright working against the
> already-installed browser instead of fighting the download, serve `app/` locally, and drive the
> full nominal scenario: page load, default patient id pre-filled, click "load summary", visit all
> four tabs. Format: one screenshot per tab plus the captured text content of each. Constraints:
> keep Playwright and its test scripts out of the project repository — this is a throwaway QA tool,
> not a deliverable.

**AI response (summary):** Installed `playwright` in a scratch folder (not the project repo),
launched it against the system Chrome via `channel: "chrome"` after the CDN download failed, and
served `app/` with `python -m http.server`. Captured one screenshot and the full text content per
tab: identity + all 4 clinical sections populated with real seeded data, 8 resources listed, a
5108-character well-formed-looking CDA document, and both conditions correctly mapped to CIM-10.
Handed off to Enzo for adversarial testing (see his file, Prompt 2).
