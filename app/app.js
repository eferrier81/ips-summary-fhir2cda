"use strict";

/*
 * Sujet E — Résumé médical du patient (IPS) → CDA.
 * Aucune donnée clinique n'est codée en dur ici : tout provient d'appels réels
 * au serveur FHIR configuré dans config.js (généré par scripts/seed_patient.py).
 */

const CONFIG = window.APP_CONFIG || {
  fhirBase: "https://hapi.fhir.org/baseR4",
  defaultPatientId: "",
  conceptMapId: "snomed-to-cim10-problems",
};

const CODE_SYSTEMS = {
  "http://snomed.info/sct": {
    oid: "2.16.840.1.113883.6.96",
    name: "SNOMED CT",
  },
  "http://loinc.org": { oid: "2.16.840.1.113883.6.1", name: "LOINC" },
  "http://hl7.org/fhir/sid/icd-10": {
    oid: "2.16.840.1.113883.6.3",
    name: "ICD-10 / CIM-10",
  },
};

const state = {
  bundle: null,
  conceptMap: null,
  exchangeCount: 0,
};

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function showError(message) {
  const banner = $("error-banner");
  banner.textContent = message;
  banner.hidden = false;
}

function clearError() {
  const banner = $("error-banner");
  banner.hidden = true;
  banner.textContent = "";
}

function logExchange(method, url, status, ok) {
  state.exchangeCount += 1;
  const tbody = document.querySelector("#exchange-log-table tbody");
  const row = document.createElement("tr");
  const time = new Date().toLocaleTimeString("fr-FR");
  row.innerHTML = `
    <td>${time}</td>
    <td>${method}</td>
    <td>${escapeXml(url)}</td>
    <td class="${ok ? "status-ok" : "status-error"}">${status}</td>
  `;
  tbody.appendChild(row);
  $("exchange-log-panel").open = true;
}

// ---------------------------------------------------------------------------
// Appels FHIR réels
// ---------------------------------------------------------------------------

async function fhirFetch(path) {
  const url = path.startsWith("http") ? path : `${CONFIG.fhirBase}${path}`;
  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/fhir+json" },
    });
  } catch (networkError) {
    logExchange("GET", url, "ERR", false);
    throw new Error(
      `Impossible de contacter le serveur FHIR (${CONFIG.fhirBase}). Vérifiez la connexion réseau.`,
    );
  }

  let body = null;
  try {
    body = await response.json();
  } catch (_) {
    // corps non-JSON, ignoré
  }

  logExchange("GET", url, response.status, response.ok);

  if (!response.ok) {
    const diagnostics = body?.issue?.[0]?.diagnostics;
    throw new Error(
      diagnostics ||
        `Le serveur FHIR a répondu avec le statut ${response.status}.`,
    );
  }
  return body;
}

// ---------------------------------------------------------------------------
// Lecture du Bundle IPS
// ---------------------------------------------------------------------------

function resolveReference(bundle, reference) {
  if (!reference) return null;
  const match = bundle.entry?.find((e) => e.fullUrl === reference);
  if (match) return match.resource;
  // fallback : référence de type "ResourceType/id"
  const [type, id] = reference.split("/");
  return (
    bundle.entry?.find(
      (e) => e.resource?.resourceType === type && e.resource?.id === id,
    )?.resource || null
  );
}

function getComposition(bundle) {
  return (
    bundle.entry?.find((e) => e.resource?.resourceType === "Composition")
      ?.resource || null
  );
}

function getResourcesByType(bundle, type) {
  return (
    bundle.entry
      ?.filter((e) => e.resource?.resourceType === type)
      .map((e) => e.resource) || []
  );
}

function firstCoding(codeableConcept) {
  return codeableConcept?.coding?.[0] || null;
}

function displayOf(codeableConcept, fallback) {
  const coding = firstCoding(codeableConcept);
  return (
    coding?.display || codeableConcept?.text || fallback || "Non renseigné"
  );
}

// ---------------------------------------------------------------------------
// Vue métier
// ---------------------------------------------------------------------------

function renderClinicalView(bundle) {
  const container = $("tab-clinical");
  const composition = getComposition(bundle);
  const patient = getResourcesByType(bundle, "Patient")[0];

  const patientName = patient?.name?.[0];
  const fullName = patientName
    ? `${(patientName.given || []).join(" ")} ${patientName.family || ""}`.trim()
    : "Patient inconnu";

  let html = `
    <div class="clinical-block">
      <h3>Identité</h3>
      <p><strong>${escapeXml(fullName)}</strong> — ${escapeXml(patient?.gender || "sexe non renseigné")}, né(e) le ${escapeXml(patient?.birthDate || "date inconnue")}</p>
      <p class="hint">Résumé : « ${escapeXml(composition?.title || "sans titre")} »</p>
    </div>
  `;

  for (const section of composition?.section || []) {
    const sectionCode = firstCoding(section.code)?.code || "?";
    const rows = (section.entry || [])
      .map((e) => resolveReference(bundle, e.reference))
      .filter(Boolean)
      .map((resource) => renderClinicalRow(resource))
      .join("");

    html += `
      <div class="clinical-block">
        <h3>${escapeXml(section.title || "Section")} <span class="section-code">(LOINC ${escapeXml(sectionCode)})</span></h3>
        <table>
          <thead><tr><th>Élément</th><th>Détail</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="2">Aucune ressource associée à cette section.</td></tr>`}</tbody>
        </table>
      </div>
    `;
  }

  container.innerHTML = html;
}

function renderClinicalRow(resource) {
  switch (resource.resourceType) {
    case "AllergyIntolerance": {
      const label = displayOf(resource.code, "Allergie non précisée");
      const reaction = resource.reaction?.[0]?.manifestation?.[0];
      const detail = [
        resource.criticality ? `criticité : ${resource.criticality}` : null,
        reaction ? `réaction : ${displayOf(reaction)}` : null,
      ]
        .filter(Boolean)
        .join(" — ");
      return `<tr><td>${escapeXml(label)}</td><td>${escapeXml(detail || resource.clinicalStatus?.coding?.[0]?.code || "")}</td></tr>`;
    }
    case "Condition": {
      const label = displayOf(resource.code, "Problème non précisé");
      const onset = resource.onsetDateTime
        ? `depuis le ${resource.onsetDateTime}`
        : "";
      return `<tr><td>${escapeXml(label)}</td><td>${escapeXml(onset)}</td></tr>`;
    }
    case "MedicationStatement": {
      const label = displayOf(
        resource.medicationCodeableConcept,
        "Traitement non précisé",
      );
      const dosage = resource.dosage?.[0]?.text || "";
      return `<tr><td>${escapeXml(label)}</td><td>${escapeXml(dosage)}</td></tr>`;
    }
    case "Immunization": {
      const label = displayOf(resource.vaccineCode, "Vaccin non précisé");
      const date = resource.occurrenceDateTime
        ? `administré le ${resource.occurrenceDateTime}`
        : "";
      return `<tr><td>${escapeXml(label)}</td><td>${escapeXml(date)}</td></tr>`;
    }
    default:
      return `<tr><td>${escapeXml(resource.resourceType)}</td><td>Voir onglet « Ressources FHIR »</td></tr>`;
  }
}

// ---------------------------------------------------------------------------
// Vue ressources FHIR brutes
// ---------------------------------------------------------------------------

function renderResourcesView(bundle) {
  const container = $("tab-resources");
  container.innerHTML = `<p class="hint">${bundle.entry?.length || 0} ressource(s) reçue(s) dans le Bundle IPS (profil : ${escapeXml(bundle.meta?.profile?.[0] || "non renseigné")}).</p>`;

  for (const entry of bundle.entry || []) {
    const resource = entry.resource;
    const details = document.createElement("details");
    details.className = "resource-card";
    const summary = document.createElement("summary");
    summary.textContent = `${resource.resourceType} / ${resource.id || entry.fullUrl}`;
    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(resource, null, 2);
    details.appendChild(summary);
    details.appendChild(pre);
    container.appendChild(details);
  }
}

// ---------------------------------------------------------------------------
// Génération CDA
// ---------------------------------------------------------------------------

function codeSystemInfo(system) {
  return (
    CODE_SYSTEMS[system] || {
      oid: system || "2.16.840.1.113883.6.96",
      name: system || "inconnu",
    }
  );
}

function cdaCodeElement(tag, codeableConcept, translation) {
  const coding = firstCoding(codeableConcept);
  if (!coding) return `<${tag} nullFlavor="UNK"/>`;
  const sys = codeSystemInfo(coding.system);
  const translationXml = translation
    ? `<translation code="${escapeXml(translation.code)}" codeSystem="2.16.840.1.113883.6.3" codeSystemName="ICD-10 / CIM-10" displayName="${escapeXml(translation.display)}"/>`
    : "";
  return `<${tag} code="${escapeXml(coding.code)}" codeSystem="${sys.oid}" codeSystemName="${escapeXml(sys.name)}" displayName="${escapeXml(coding.display || "")}">${translationXml}</${tag}>`;
}

function cdaEntryForResource(resource, alignment) {
  switch (resource.resourceType) {
    case "AllergyIntolerance":
      return `<entry typeCode="DRIV"><observation classCode="OBS" moodCode="EVN">
        ${cdaCodeElement("code", resource.code)}
        <statusCode code="${escapeXml(resource.clinicalStatus?.coding?.[0]?.code || "unknown")}"/>
      </observation></entry>`;
    case "Condition": {
      const translation = alignment?.get(firstCoding(resource.code)?.code);
      return `<entry typeCode="DRIV"><observation classCode="OBS" moodCode="EVN">
        ${cdaCodeElement("code", resource.code, translation)}
        <statusCode code="${escapeXml(resource.clinicalStatus?.coding?.[0]?.code || "unknown")}"/>
        <effectiveTime value="${escapeXml((resource.onsetDateTime || "").replace(/-/g, ""))}"/>
      </observation></entry>`;
    }
    case "MedicationStatement":
      return `<entry typeCode="DRIV"><substanceAdministration classCode="SBADM" moodCode="EVN">
        <statusCode code="${escapeXml(resource.status || "unknown")}"/>
        <consumable><manufacturedProduct><manufacturedMaterial>
          ${cdaCodeElement("code", resource.medicationCodeableConcept)}
        </manufacturedMaterial></manufacturedProduct></consumable>
      </substanceAdministration></entry>`;
    case "Immunization":
      return `<entry typeCode="DRIV"><substanceAdministration classCode="SBADM" moodCode="EVN">
        <statusCode code="${escapeXml(resource.status || "unknown")}"/>
        <effectiveTime value="${escapeXml((resource.occurrenceDateTime || "").replace(/-/g, ""))}"/>
        <consumable><manufacturedProduct><manufacturedMaterial>
          ${cdaCodeElement("code", resource.vaccineCode)}
        </manufacturedMaterial></manufacturedProduct></consumable>
      </substanceAdministration></entry>`;
    default:
      return "";
  }
}

function bundleToCda(bundle, alignment) {
  const composition = getComposition(bundle);
  const patient = getResourcesByType(bundle, "Patient")[0];
  const patientName = patient?.name?.[0];
  const given = (patientName?.given || [])
    .map((g) => `<given>${escapeXml(g)}</given>`)
    .join("");
  const family = patientName?.family
    ? `<family>${escapeXml(patientName.family)}</family>`
    : "";

  const sections = (composition?.section || [])
    .map((section) => {
      const sectionCode = firstCoding(section.code);
      const entries = (section.entry || [])
        .map((e) => resolveReference(bundle, e.reference))
        .filter(Boolean)
        .map((resource) => cdaEntryForResource(resource, alignment))
        .join("\n        ");
      return `
      <component>
        <section>
          <code code="${escapeXml(sectionCode?.code || "")}" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="${escapeXml(sectionCode?.display || "")}"/>
          <title>${escapeXml(section.title || "")}</title>
          <text>${escapeXml(section.text?.div?.replace(/<[^>]+>/g, " ").trim() || "")}</text>
          ${entries}
        </section>
      </component>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3">
  <realmCode code="FR"/>
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
  <!-- Document généré à partir d'un Bundle FHIR IPS (profil hl7.fhir.uv.ips) — voir CDC.md section 5 pour les limites de conformité. -->
  <id root="${escapeXml(bundle.identifier?.value || bundle.id || "unknown")}"/>
  <code code="${escapeXml(firstCoding(composition?.type)?.code || "60591-5")}" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="${escapeXml(firstCoding(composition?.type)?.display || "Patient summary Document")}"/>
  <title>${escapeXml(composition?.title || "Résumé médical du patient")}</title>
  <effectiveTime value="${escapeXml((bundle.timestamp || "").replace(/[-:]/g, "").slice(0, 14))}"/>
  <confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25"/>
  <languageCode code="fr-FR"/>
  <recordTarget>
    <patientRole>
      <id extension="${escapeXml(patient?.id || "")}" root="2.16.840.1.113883.19.5"/>
      <patient>
        <name>${given}${family}</name>
        <administrativeGenderCode code="${escapeXml(patient?.gender || "UN")}"/>
        <birthTime value="${escapeXml((patient?.birthDate || "").replace(/-/g, ""))}"/>
      </patient>
    </patientRole>
  </recordTarget>
  <component>
    <structuredBody>${sections}
    </structuredBody>
  </component>
</ClinicalDocument>
`;
}

// ---------------------------------------------------------------------------
// Vue alignement terminologique
// ---------------------------------------------------------------------------

function buildAlignmentMap(conceptMap) {
  const map = new Map();
  if (!conceptMap) return map;
  for (const group of conceptMap.group || []) {
    for (const element of group.element || []) {
      const target = element.target?.[0];
      if (target) {
        map.set(element.code, {
          code: target.code,
          display: target.display,
          equivalence: target.equivalence,
        });
      }
    }
  }
  return map;
}

function renderTerminologyView(bundle, conceptMap) {
  const container = $("tab-terminology");
  const alignment = buildAlignmentMap(conceptMap);
  const conditions = getResourcesByType(bundle, "Condition");

  let warning = "";
  if (!conceptMap) {
    warning = `<p class="hint">Le ConceptMap « ${escapeXml(CONFIG.conceptMapId)} » n'a pas pu être lu sur le serveur : tous les problèmes sont affichés comme « non mappés ». Exécutez <code>scripts/seed_patient.py</code> pour le créer.</p>`;
  }

  const rows = conditions
    .map((condition) => {
      const coding = firstCoding(condition.code);
      const target = alignment.get(coding?.code);
      const badge = target
        ? `<span class="badge badge-mapped">mappé (${escapeXml(target.equivalence)})</span>`
        : `<span class="badge badge-unmapped">non mappé</span>`;
      return `
        <tr>
          <td>${escapeXml(coding?.display || "?")}<br><span class="hint">SNOMED CT ${escapeXml(coding?.code || "?")}</span></td>
          <td>${target ? `${escapeXml(target.display)}<br><span class="hint">CIM-10 ${escapeXml(target.code)}</span>` : "—"}</td>
          <td>${badge}</td>
        </tr>`;
    })
    .join("");

  container.innerHTML = `
    ${warning}
    <table>
      <thead><tr><th>Code source (SNOMED CT — FHIR)</th><th>Code cible aligné (CIM-10 — via ConceptMap)</th><th>Statut</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="3">Aucun problème de santé dans ce résumé.</td></tr>'}</tbody>
    </table>
  `;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

function activateTab(tabName) {
  for (const btn of document.querySelectorAll(".tab-btn")) {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  }
  for (const id of ["clinical", "resources", "cda", "terminology"]) {
    const section = $(`tab-${id}`);
    section.hidden = id !== tabName;
    section.dataset.activeTab = id === tabName ? "true" : "false";
  }
}

async function loadSummary() {
  const patientId = $("patient-id").value.trim();
  clearError();
  if (!patientId) {
    showError("Veuillez saisir un identifiant patient.");
    return;
  }

  const btn = $("load-btn");
  btn.disabled = true;
  btn.textContent = "Chargement...";

  try {
    const bundle = await fhirFetch(
      `/Patient/${encodeURIComponent(patientId)}/$summary`,
    );

    if (
      !bundle ||
      bundle.resourceType !== "Bundle" ||
      !(bundle.entry || []).length
    ) {
      throw new Error(
        "Le résumé IPS renvoyé par le serveur est vide ou invalide pour ce patient.",
      );
    }
    const composition = getComposition(bundle);
    if (!composition || !(composition.section || []).length) {
      throw new Error(
        "Le résumé IPS ne contient aucune section clinique exploitable pour ce patient.",
      );
    }

    let conceptMap = null;
    try {
      conceptMap = await fhirFetch(`/ConceptMap/${CONFIG.conceptMapId}`);
    } catch (mapError) {
      // Non bloquant : la vue terminologie affichera "non mappé" pour tout, cf. AC4.
      conceptMap = null;
    }

    state.bundle = bundle;
    state.conceptMap = conceptMap;

    renderClinicalView(bundle);
    renderResourcesView(bundle);
    const alignment = buildAlignmentMap(conceptMap);
    $("cda-output").textContent = bundleToCda(bundle, alignment);
    renderTerminologyView(bundle, conceptMap);

    $("tabs").hidden = false;
    $("empty-state").hidden = true;
    activateTab("clinical");
  } catch (err) {
    showError(err.message);
    $("tabs").hidden = true;
    $("empty-state").hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Charger le résumé (IPS)";
  }
}

function init() {
  $("fhir-base-label").textContent = CONFIG.fhirBase;
  $("patient-id").value = CONFIG.defaultPatientId || "";
  $("load-btn").addEventListener("click", loadSummary);
  $("patient-id").addEventListener("keydown", (e) => {
    if (e.key === "Enter") loadSummary();
  });

  for (const btn of document.querySelectorAll(".tab-btn")) {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  }

  $("download-cda-btn").addEventListener("click", () => {
    if (!state.bundle) return;
    const blob = new Blob([$("cda-output").textContent], {
      type: "application/xml",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume-ips-${$("patient-id").value.trim()}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  });

  $("copy-cda-btn").addEventListener("click", async () => {
    if (!state.bundle) return;
    await navigator.clipboard.writeText($("cda-output").textContent);
    const btn = $("copy-cda-btn");
    const original = btn.textContent;
    btn.textContent = "Copié !";
    setTimeout(() => (btn.textContent = original), 1200);
  });
}

document.addEventListener("DOMContentLoaded", init);
