# Prompts — CDC (Conception)

**Student:** Ethan Cabanes
**AI tool:** Perplexity (Model: Claude Sonnet 5)

> **Note added by the group after convergence.** Ethan explored subject E independently before
> the group compared approaches. His prompt and the specification he got back (below) assume a
> different architecture — a Node.js/Express backend with a React/Vite frontend, patient search by
> identifier/name/birthdate, and `Composition` + `Bundle` search as the primary FHIR retrieval
> strategy — than the one the group ultimately submitted. After comparing both approaches, the
> group kept `CDC.md` (Enzo Ferrier's cahier des charges) as the shared specification, and the
> submitted prototype (`app/`, `scripts/seed_patient.py`) uses the simpler static front-end
> architecture described there, calling the IPS `$summary` operation directly instead of a custom
> backend.
>
> **What carried over from this exploration into the shared `CDC.md`:** the list of IPS
> resources/profiles (Patient, Condition, AllergyIntolerance, MedicationStatement, Immunization,
> Observation, Composition, Bundle), the terminology list (SNOMED CT, LOINC, UCUM), the ReEIF
> layer structure, and the emphasis on no-hardcoded-clinical-data with explicit acceptance
> criteria.
> **What did not carry over:** the Node/Express/React stack, the patient-search-by-name flow, and
> using `Composition` + `Bundle` search as the primary strategy instead of `$summary`.
>
> Ethan's prompt and the AI's response are kept below exactly as produced (only heading levels
> were converted to bold text so they don't collide with this file's own structure).

---

## Prompt 1

> I'm preparing an evaluation on healthcare interoperability based on the document
> Eval_interop.pdf and subject E: Display of the patient's medical summary (IPS). Please write a
> complete requirements specification (cahier des charges) for this subject, strictly following
> the "TRAVAIL DEMANDÉ" section (phase 1 = design, phase 2 = implementation) of the PDF.
>
> The requirements document must:
>
> - Describe the context and objective: a web application that displays the patient's medical
>   summary (International Patient Summary, IPS) from a FHIR server, with conversion to a target
>   document in CDA IPS format, using the HL7 FHIR IPS and HL7 CDA IPS implementation guides.
> - Specify the business need, target users, a main scenario (login, patient selection, FHIR
>   server call, display of clinical sections, technical FHIR view, CDA document view), and
>   concrete acceptance criteria for the application.
> - Detail the technical specifications: FHIR version (R4), server compatible with the HL7 FHIR
>   IPS IG, resources and profiles used (Patient-uv-ips, Condition-uv-ips, AllergyIntolerance,
>   MedicationStatement/MedicationRequest, Immunization, Observation, Composition, Bundle), CDA as
>   target format, terminologies (SNOMED CT, LOINC, ATC/RxNorm, UCUM) and how they are used in the
>   prototype.
> - Describe the planned interactions with the FHIR server (endpoints to search a patient,
>   retrieve the IPS document via Composition/Bundle or $summary operation, read referenced
>   resources), emphasizing that clinical data must not be hardcoded but actually retrieved from
>   the server.
> - Provide an architectural view using the ReEIF layers (infrastructure/security, applications
>   front/back, information, business/organization, legal) adapted to this prototype.
> - Define the transformation and semantic mapping rules: FHIR → clinical view (IPS sections with
>   labels and codes), FHIR → CDA IPS (mapping Composition/Bundle to CDA sections, preserving or
>   translating codes), example(s) of terminology change/alignment to demonstrate, and possible
>   limits or information loss.
> - Give practical project organization details: GitHub repository name, folder structure (docs/,
>   src/frontend/, src/backend/), minimal screen list (IPS clinical view, FHIR technical view, IPS
>   CDA view), list of endpoints, resources and fields used, and an explicit link to the grading
>   scheme and AI usage (shared requirements document + individual prompts).
>
> The output should be a structured text (sections, subsections, lists) that I can submit as the
> group's requirements document and reuse as a base prompt for the implementation phase.

**AI response (verbatim):**

**Requirements Specification**

**Subject E - International Patient Summary Display**

**Project:** FHIR IPS viewer with CDA IPS target representation  
**Version:** 1.0  
**Status:** Functional and technical specification  
**Scope:** University prototype using test FHIR data

> This document is intended to be provided to a development AI. Requirements are identified with `REQ-*`. Items marked `TODO` must be confirmed before the final demonstration.

**1. Context and Objectives**

The application displays a patient's **International Patient Summary (IPS)** from an **HL7 FHIR R4** server and produces a target representation in **CDA IPS** format.

The IPS is a minimal and interoperable summary intended to facilitate patient care in another organization, particularly in emergency care, unscheduled care, or a cross-border context.

**Objectives**

- Reduce manual information collection.
- Present a readable and traceable clinical summary.
- Preserve codes, systems, statuses, dates, and provenance.
- Make the FHIR resources actually used visible.
- Demonstrate the `FHIR -> internal model -> CDA` chain.
- Provide no hardcoded clinical data.

**2. Users and Main Scenario**

**Users**

- Emergency physician or on-call general practitioner.
- Nurse coordinator.
- Specialist physician.
- Hospital pharmacist.

**Scenario**

1. The user opens the application.
2. The user searches for a patient by FHIR identifier, name, and/or birth date.
3. The backend queries the configured FHIR server.
4. The user selects a patient.
5. The backend retrieves the IPS document (`Bundle`/`Composition`) and referenced resources.
6. The backend builds the internal IPS model.
7. The interface displays the clinical, FHIR technical, and CDA views.
8. The user checks the data, codes, statuses, dates, and provenance.

**3. Functional Requirements**

**3.1 Patient Search**

- **REQ-SEARCH-001**: Search by `Patient.identifier`.
- **REQ-SEARCH-002**: Search by `Patient.name`.
- **REQ-SEARCH-003**: Filter by `Patient.birthDate`.
- **REQ-SEARCH-004**: Display only results returned by the FHIR server.
- **REQ-SEARCH-005**: Display a message when no patient is found.
- **REQ-SEARCH-006**: Display an understandable error when the server is unavailable, authentication is denied, or the network is unavailable.

**3.2 Clinical IPS View**

- **REQ-CLINICAL-001**: Display identity, identifier, name, birth date, and administrative gender when available.
- **REQ-CLINICAL-002**: Display problems and medical history from `Condition`.
- **REQ-CLINICAL-003**: Display allergies and intolerances from `AllergyIntolerance`.
- **REQ-CLINICAL-004**: Display the medication summary from `MedicationStatement` and, when available, `MedicationRequest`.
- **REQ-CLINICAL-005**: Display immunizations from `Immunization`.
- **REQ-CLINICAL-006**: Display key observations from `Observation`.
- **REQ-CLINICAL-007**: Display provenance from `Provenance` and `Composition`.
- **REQ-CLINICAL-008**: Display for each entry its label, code and coding system, relevant date, and status when available.
- **REQ-CLINICAL-009**: Display an explicit message when a section is empty.
- **REQ-CLINICAL-010**: Distinguish missing information from a clinical negation, for example "no known allergies".
- **REQ-CLINICAL-011**: Display profiles declared in `meta.profile`.

**3.3 FHIR Technical View**

- **REQ-FHIR-001**: Display the FHIR resources actually used.
- **REQ-FHIR-002**: Display readable, formatted JSON.
- **REQ-FHIR-003**: Make at least `resourceType`, `id`, `meta.profile`, and the fields used by the mapping visible.
- **REQ-FHIR-004**: Do not use a fictitious local clinical dataset.

**3.4 CDA IPS View**

- **REQ-CDA-001**: Generate the CDA document from the internal model built from FHIR.
- **REQ-CDA-002**: Expose this representation through `GET /ips/:patientId/cda`.
- **REQ-CDA-003**: Display the CDA XML or a readable HTML rendering.
- **REQ-CDA-004**: Preserve FHIR codes and coding systems in CDA whenever possible.
- **REQ-CDA-005**: Follow the templates from the CDA IPS Implementation Guide.
- **REQ-CDA-006**: Never inject fixed clinical data into the CDA generator.
- **REQ-CDA-007**: Document conversion losses or simplifications.

**3.5 Semantic Mapping**

- **REQ-MAP-001**: Make the `FHIR -> internal model -> CDA` chain explicit in the code.
- **REQ-MAP-002**: Demonstrate at least one mapping from a source code to a target label or code.
- **REQ-MAP-003**: Preserve the source code and system when no target mapping exists.
- **REQ-MAP-004**: Use a readable fallback when a code or label is missing.

**4. Standards, Profiles, and Terminologies**

**Standards**

- **FHIR:** HL7 FHIR R4.
- **Source:** HL7 FHIR IPS Implementation Guide, stable version to be specified.
- **Target:** CDA IPS Implementation Guide `hl7.cda.uv.ips`.
- **Optional:** FR Core for French conventions.

**Resources and Minimum Fields**

| Resource              | Use                   | Fields to use                                                                                              |
| --------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Patient`             | Identity              | `id`, `identifier`, `name`, `birthDate`, `gender`                                                          |
| `Composition`         | Document and sections | `status`, `type`, `date`, `subject`, `author`, `section`                                                   |
| `Bundle`              | Container             | `type`, `entry`, `identifier`, `timestamp`                                                                 |
| `Condition`           | Problems              | `code`, `clinicalStatus`, `verificationStatus`, `onsetDateTime`, `recordedDate`, `recorder`                |
| `AllergyIntolerance`  | Allergies             | `code`, `clinicalStatus`, `verificationStatus`, `criticality`, `onsetDateTime`, `recordedDate`, `reaction` |
| `MedicationStatement` | Medications           | `medicationCodeableConcept`, `status`, `effectivePeriod`, `dateAsserted`, `informationSource`, `dosage`    |
| `MedicationRequest`   | Prescriptions         | `medication`, `status`, `authoredOn`, `dosageInstruction`, `requester`                                     |
| `Immunization`        | Vaccinations          | `vaccineCode`, `status`, `occurrenceDateTime`, `primarySource`, `lotNumber`                                |
| `Observation`         | Results               | `code`, `status`, `effectiveDateTime`, `value[x]`, unit, `referenceRange`, `interpretation`                |
| `Provenance`          | Traceability          | `target`, `recorded`, `agent`, `who`, `activity`                                                           |

**IPS Profiles**

The code must reference and, where possible, validate the following profiles:

- `Patient-uv-ips`
- `Composition-uv-ips`
- `Bundle-uv-ips`
- `Condition-uv-ips`
- `AllergyIntolerance-uv-ips`
- `MedicationStatement-uv-ips`
- `Immunization-uv-ips`
- `Observation-results-uv-ips`
- `Provenance-uv-ips`

**Terminologies**

- **SNOMED CT:** problems, allergies, and clinical concepts.
- **LOINC:** tests and observations.
- **ATC or RxNorm:** medications, depending on the server.
- **UCUM:** units of measurement.
- **CIS/ANSM:** optional for the French context.

> **TODO:** document the demonstration FHIR server, its version, the profiles actually available, and the terminologies actually present.

**5. API and FHIR Interactions**

**Backend API**

| Endpoint              | Method | Behavior                                                            |
| --------------------- | -----: | ------------------------------------------------------------------- |
| `/health`             |  `GET` | Checks the backend and exposes the configured FHIR base URL.        |
| `/patients`           |  `GET` | Performs a FHIR search using `identifier`, `name`, and `birthdate`. |
| `/ips/:patientId`     |  `GET` | Returns the IPS model and the resources used.                       |
| `/ips/:patientId/cda` |  `GET` | Returns the generated CDA IPS XML.                                  |

**FHIR Call Examples**

```http
GET [FHIR_BASE_URL]/Patient?identifier={system}|{value}
GET [FHIR_BASE_URL]/Patient?family={family}&given={given}&birthdate={YYYY-MM-DD}
GET [FHIR_BASE_URL]/Composition?type={IPS_CODE}&subject=Patient/{id}
GET [FHIR_BASE_URL]/Bundle/{bundleId}
GET [FHIR_BASE_URL]/Patient/{id}/$summary
```

The actual mechanism must be verified on the selected server. `$summary` alone does not guarantee that an IPS `Composition` or a `Bundle` conforming to the IPS profile is returned. The recommended strategy is `Composition` + `Bundle`, with `$summary` as a documented fallback.

**Configuration**

The configuration must support the FHIR base URL, authentication type, token stored outside the Git repository, backend port, CORS origin, IPS version, and demonstration server identifier.

**6. Architecture and ReEIF**

```text
React/Vite Frontend
        | HTTP JSON/XML
        v
Node.js/Express Backend
        | Authenticated FHIR client
        v
HL7 FHIR R4 Server
        +--> IPS Bundle / Composition
        +--> Patient, Condition, AllergyIntolerance
        +--> MedicationStatement / MedicationRequest
        +--> Immunization, Observation, Provenance
```

| ReEIF layer    | Decisions to document                                                |
| -------------- | -------------------------------------------------------------------- |
| Infrastructure | Hosting, HTTPS/TLS, network, secrets, availability.                  |
| Application    | Frontend, backend, FHIR client, mapping, and CDA generation.         |
| Information    | IPS model, profiles, terminologies, statuses, dates, and provenance. |
| Business       | Emergency or unscheduled-care consultation, read-only access.        |
| Organization   | Authorized roles and responsibility of the source organization.      |
| Legal          | Test data, GDPR, consent, access control, and auditability.          |

**7. Transformation Rules**

**FHIR to Internal Model**

The internal model contains at least:

```text
identity
problems[]
allergies[]
medicationSummary[]
immunizations[]
keyObservations[]
provenance[]
composition
resourcesUsed[]
```

Each entry preserves the resource type and identifier, profile, label, code and system, status, relevant date, and the original FHIR resource or a reference to it.

**Internal Model to CDA**

- `Composition` becomes the CDA document header and structure.
- Identity becomes `recordTarget`.
- Each IPS section becomes a corresponding CDA section.
- Clinical entries become structured CDA entries once the relevant template is defined.
- FHIR codes are preserved whenever possible.
- Unsupported fields are declared in the limitations.

**8. Prototype Limitations**

The following may be outside the initial scope: social history, medical devices, procedures, advance directives, pregnancy, functional status, contacts, translations, and advanced terminology services.

Potential losses during `FHIR -> CDA` must be documented, including FHIR extensions, complex references, periods, observation components, and dosage details.

**9. Acceptance Criteria**

**Nominal Case**

- [ ] A real search returns FHIR patients.
- [ ] Selecting a patient displays their identity.
- [ ] Sections are populated only with received resources.
- [ ] Each entry shows label, code/system, date, and status when available.
- [ ] Provenance displays author/agent, organization, and date when available.
- [ ] The technical view lists the resources actually used.
- [ ] The CDA view is generated from FHIR without fixed clinical data.

**Missing Data and Errors**

- [ ] An empty section displays an explicit message.
- [ ] The interface distinguishes missing information from a clinical negation.
- [ ] A patient without an IPS `Composition` produces a documented state.
- [ ] A FHIR error is displayed without exposing secrets.
- [ ] HTTP status codes are consistent.

**Quality and Security**

- [ ] Backend and frontend typechecks pass.
- [ ] The production build passes.
- [ ] Tests cover search, mapping, CDA, and the main errors.
- [ ] No secret is committed.
- [ ] The prototype is presented as using test data.

**10. Repository Organization**

```text
/
├── backend/src/       # FHIR client, types, mapping, CDA, server
├── frontend/src/      # search and clinical/technical/CDA views
├── docs/CdC.md        # final requirements specification
├── .env.example       # configuration without secrets
├── README.md
└── package.json
```

The requirements specification and code are shared by the group. Each member keeps their own design and implementation prompts in the files required by the assessment.

**11. Current Project Audit**

Audit performed on **September 15, 2026**.

**Compliant or Present**

| Requirement             | Status                  | Finding                                                                        |
| ----------------------- | ----------------------- | ------------------------------------------------------------------------------ |
| Node.js/Express backend | Compliant               | `backend/src/server.ts` exposes the expected routes.                           |
| Web frontend            | Compliant               | React/Vite with search and three tabs.                                         |
| FHIR configuration      | Partial                 | URL, authentication, and token are configurable through the environment.       |
| Patient search          | Compliant               | `/patients` forwards the three FHIR parameters.                                |
| Clinical view           | Partial                 | Main sections exist, but field-level detail is incomplete.                     |
| Technical view          | Partial                 | Bundle JSON and used resources are visible, but not in a fully dedicated view. |
| No fictitious data      | Compliant               | No patient or clinical element is embedded in the code.                        |
| Internal mapping        | Partial                 | `ipsModel.ts` exists, but several clinical fields are lost.                    |
| IPS profiles            | Partial                 | Constants exist, without response conformance validation.                      |
| Build and typechecking  | Compliant at audit time | Typecheck, build, and diagnostics currently pass.                              |

**Priority Gaps**

| Priority | Gap                                                       | Expected action                                                                                      |
| -------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| High     | `fetchIps()` depends on `Patient/{id}/$summary`.          | Add `Composition` search and `Bundle` retrieval, with a controlled fallback.                         |
| High     | Clinical mapping is too generic.                          | Map `clinicalStatus`, `verificationStatus`, `criticality`, onset, dosage, values, units, and actors. |
| High     | Provenance is handled as a generic item.                  | Display author, organization, agent, activity, and creation date.                                    |
| High     | CDA is still a skeleton.                                  | Apply CDA IPS IG templates and validate a real XML document.                                         |
| High     | No automated tests.                                       | Add mapping/CDA unit tests and route integration tests.                                              |
| Medium   | FHIR server and IPS version are not fixed.                | Select a server and provide reproducible examples.                                                   |
| Medium   | Empty-section messages are generic.                       | Distinguish "no known allergies" from "information unavailable".                                     |
| Medium   | Terminology mapping is not demonstrated.                  | Add a source/target mapping area or documentation.                                                   |
| Medium   | The CDA endpoint repeats the FHIR call.                   | Share the IPS service to avoid divergent results.                                                    |
| Medium   | HTTPS, SSO, access control, and audit logging are absent. | Implement them or explicitly declare them out of scope.                                              |
| Low      | `CdC.md` is at the repository root.                       | Move it to `docs/CdC.md` if this convention is required.                                             |
| Low      | FHIR types are permissive.                                | Add response validation and stronger types for used fields.                                          |

**12. Missing Items Before the Demonstration**

1. FHIR/IPS URL and version, demonstration patients, and server access.
2. Authentication mode and secure secret management.
3. The IPS strategy officially supported by the selected server.
4. Expected CDA compliance level, templates, and validation tool.
5. Available terminologies and example SNOMED CT, LOINC, ATC/RxNorm, and UCUM codes.
6. A source/target mapping example selected by the group.
7. Test datasets: complete data, no allergies, no medications, no IPS, and server error.
8. A decision about HTTPS, SSO, access control, and audit logging.
9. Individual design and implementation prompts required by the assessment.

**13. Finalization Recommendations**

- Select a public IPS demonstration server and document its responses.
- Implement `Composition` + `Bundle`, with `$summary` only as a fallback.
- Enrich interfaces and mapping with the fields listed in section 4.
- Replace the CDA skeleton with CDA IPS templates and validate the XML.
- Add unit tests and integration tests mocking FHIR responses.
- Move the document to `docs/CdC.md` if required by the final repository structure.
