# Prompts — CDC (Conception)

**Student:** Enzo Ferrier
**AI tool:** Claude Code (CLI agent with file/terminal access)

Each prompt below follows the 5-part structure (role, context, action, format, constraints).
Log kept in the order the prompts were actually sent while producing `CDC.md`.

---

## Prompt 1 — Kickoff & requirement extraction

> You are a healthcare interoperability consultant fluent in FHIR R4, HL7, and CDA, acting as
> lead software architect for this project. I'm attaching our evaluation subject
> (Eval_interop.pdf) for a course on medical interoperability standards; my group — myself, Enzo
> Ferrier, and Ethan Cabanes — has been assigned subject E: displaying a patient's medical summary
> (IPS), with CDA as the imposed target format. Read the subject carefully and extract the exact
> deliverables, grading criteria, and constraints — in particular anything about AI usage rules —
> before producing anything else. If the subject leaves technical decisions open (implementation
> stack, which FHIR test server to use, state of our GitHub repository), list them explicitly and
> ask me rather than choosing on your own. Give me a short numbered list of exactly those open
> decisions. Base everything strictly on the literal content of the PDF — do not invent
> requirements that aren't written there.

**AI response (summary):** Read the PDF before producing anything. Extracted the real
requirements (subject E, CDA target, mandatory graded AI usage, deliverables = common CdC +
common code + individual PROMPTS files) and returned exactly three open decisions instead of
guessing them: prototype tech stack, FHIR test server, and GitHub repo status.

## Prompt 2 — Direction + mandatory real-world verification

> Here are my answers to your three questions: a static HTML/JS front-end with no backend and no
> build tooling; the public HAPI FHIR R4 server as our test server, since it is expected to
> support the IPS `$summary` operation; and no GitHub repository yet, so prepare everything
> locally for now. Before you write a single line of the specification that depends on this
> server's behavior, verify it against the real server instead of assuming it matches the IPS
> documentation — actually call the endpoint, check the HTTP status, and check whether CORS is
> open since that determines if a backend proxy is even necessary. Show me the raw evidence
> (status codes, key response fields) you found, not just a conclusion. Don't write any CDC content
> yet until this is verified.

**AI response (summary):** Ran real HTTP calls against `https://hapi.fhir.org/baseR4`: confirmed
FHIR R4 (4.0.1), confirmed `GET Patient/{id}/$summary` really returns a `Bundle` with
`meta.profile = .../Bundle-uv-ips` and `type: document`, and confirmed
`Access-Control-Allow-Origin: *` via an `OPTIONS` request — validating the static front-end
choice on real evidence rather than assumption.

## Prompt 3 — Handling the sandbox data-quality problem

> You just found that a random existing patient on the public sandbox has no usable allergy,
> condition, or medication data, and that a second patient you checked had actually been deleted
> (410 Gone) — this is a shared public sandbox with no data guarantees. Propose a way to guarantee
> our demo shows real, meaningful clinical content without breaking the subject's "no hardcoded
> business data" rule, and justify in one paragraph why your proposal doesn't count as hardcoding.
> The justification must be short enough to defend to a grader in one sentence, and the solution
> must still make the application read everything live from the FHIR server at runtime.

**AI response (summary):** Proposed a one-time `seed_patient.py` script that creates a realistic
demonstration patient via a real FHIR `transaction` Bundle (Patient + 2 Condition +
AllergyIntolerance + MedicationStatement + Immunization) plus a `ConceptMap` for the SNOMED CT →
CIM-10 alignment — framed explicitly as dataset preparation, not business logic, since the
application itself still performs a live `$summary` read at runtime and works with any other
patient id (AC6).

## Prompt 4 — Full cahier des charges

> Now switch to writing formally: this document must be precise enough to be handed directly, with
> zero additional context, to the AI that will implement phase 2. Write the complete cahier des
> charges as `CDC.md`, covering: business need, target user, nominal scenario and acceptance
> criteria; specification choices with justification (FHIR version, IG/profiles, target operation,
> target standard, terminologies); planned FHIR server interactions (read, search,
> create/update); a ReEIF architecture reading, one subsection per layer
> (infrastructure/security, application, information, business, organization, legal); the
> transformation and semantic mapping rules, with identified limits or information loss stated
> honestly rather than hidden; and a final technical specification section listing the exact file
> tree and expected functions for the realization phase. Write it in Markdown, in French (course
> language), using tables for the specification choices and the acceptance criteria.

**AI response (summary):** Produced `CDC.md` with every requested section, including a dedicated
closing section (file tree, expected `app.js` functions, run instructions) written so phase 2
could start directly from it without re-deriving any decision already made here.
