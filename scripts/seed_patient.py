"""
Seed d'un patient de démonstration sur le serveur FHIR public HAPI (R4).

Ce script n'est PAS l'application : il s'exécute une seule fois, en amont, pour préparer
un jeu de données cliniques réaliste (Patient + allergie + problèmes + traitement +
vaccination) et un ConceptMap d'alignement terminologique SNOMED CT -> CIM-10.

Pourquoi ce script existe : le serveur HAPI public (https://hapi.fhir.org/baseR4) est un
bac à sable communautaire partagé. Les patients qui y existent déjà n'ont aucune garantie
de persistance ni de contenu clinique exploitable (vérifié en pratique : plusieurs patients
aléatoires du serveur n'avaient ni allergie, ni traitement, ni condition, ou avaient été
supprimés). L'application (app/) ne contient elle aucune donnée clinique en dur : elle
interroge le serveur en temps réel via l'opération $summary, quel que soit le patient
(voir CDC.md, AC6).

Usage :
    python scripts/seed_patient.py
"""

import json
import sys
import uuid

import requests

FHIR_BASE = "https://hapi.fhir.org/baseR4"

CONCEPT_MAP_ID = "snomed-to-cim10-problems"

# Correspondances SNOMED CT -> CIM-10 utilisées pour la démonstration de l'alignement
# terminologique (cf. CDC.md section 5.2). Volontairement réduit à quelques entrées :
# ce n'est pas un service de terminologie complet.
SNOMED_TO_CIM10 = [
    {
        "source_code": "44054006",
        "source_display": "Type 2 diabetes mellitus",
        "target_code": "E11",
        "target_display": "Diabète sucré non insulino-dépendant (CIM-10)",
        "equivalence": "wider",
    },
    {
        "source_code": "38341003",
        "source_display": "Hypertensive disorder, systemic arterial",
        "target_code": "I10",
        "target_display": "Hypertension essentielle (primitive) (CIM-10)",
        "equivalence": "equivalent",
    },
]


def build_transaction_bundle():
    patient_urn = f"urn:uuid:{uuid.uuid4()}"
    condition_diabetes_urn = f"urn:uuid:{uuid.uuid4()}"
    condition_hta_urn = f"urn:uuid:{uuid.uuid4()}"
    allergy_urn = f"urn:uuid:{uuid.uuid4()}"
    medication_urn = f"urn:uuid:{uuid.uuid4()}"
    immunization_urn = f"urn:uuid:{uuid.uuid4()}"

    patient = {
        "resourceType": "Patient",
        "identifier": [{
            "system": "urn:oid:2.16.250.1.999.demo",
            "value": "EVAL-INTEROP-SUJET-E-001",
        }],
        "name": [{"use": "official", "family": "Rivière", "given": ["Camille"]}],
        "gender": "female",
        "birthDate": "1978-04-12",
    }

    condition_diabetes = {
        "resourceType": "Condition",
        "clinicalStatus": {"coding": [{
            "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
            "code": "active",
        }]},
        "verificationStatus": {"coding": [{
            "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
            "code": "confirmed",
        }]},
        "code": {"coding": [{
            "system": "http://snomed.info/sct",
            "code": "44054006",
            "display": "Type 2 diabetes mellitus",
        }]},
        "subject": {"reference": patient_urn},
        "onsetDateTime": "2018-03-01",
    }

    condition_hta = {
        "resourceType": "Condition",
        "clinicalStatus": {"coding": [{
            "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
            "code": "active",
        }]},
        "verificationStatus": {"coding": [{
            "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
            "code": "confirmed",
        }]},
        "code": {"coding": [{
            "system": "http://snomed.info/sct",
            "code": "38341003",
            "display": "Hypertensive disorder, systemic arterial",
        }]},
        "subject": {"reference": patient_urn},
        "onsetDateTime": "2020-11-15",
    }

    allergy = {
        "resourceType": "AllergyIntolerance",
        "clinicalStatus": {"coding": [{
            "system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
            "code": "active",
        }]},
        "verificationStatus": {"coding": [{
            "system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification",
            "code": "confirmed",
        }]},
        "category": ["medication"],
        "criticality": "high",
        "code": {"coding": [{
            "system": "http://snomed.info/sct",
            "code": "764146007",
            "display": "Product containing penicillin (medicinal product)",
        }]},
        "patient": {"reference": patient_urn},
        "reaction": [{
            "manifestation": [{"coding": [{
                "system": "http://snomed.info/sct",
                "code": "39579001",
                "display": "Anaphylaxis",
            }]}],
            "severity": "severe",
        }],
    }

    medication = {
        "resourceType": "MedicationStatement",
        "status": "active",
        "medicationCodeableConcept": {"coding": [{
            "system": "http://snomed.info/sct",
            "code": "387584000",
            "display": "Metformin",
        }]},
        "subject": {"reference": patient_urn},
        "effectiveDateTime": "2024-01-10",
        "dosage": [{"text": "500 mg, 2 fois par jour"}],
    }

    immunization = {
        "resourceType": "Immunization",
        "status": "completed",
        "vaccineCode": {"coding": [{
            "system": "http://snomed.info/sct",
            "code": "86198006",
            "display": "Influenza virus vaccine",
        }]},
        "patient": {"reference": patient_urn},
        "occurrenceDateTime": "2025-10-05",
        "primarySource": True,
    }

    def entry(urn, resource):
        return {
            "fullUrl": urn,
            "resource": resource,
            "request": {"method": "POST", "url": resource["resourceType"]},
        }

    bundle = {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": [
            entry(patient_urn, patient),
            entry(condition_diabetes_urn, condition_diabetes),
            entry(condition_hta_urn, condition_hta),
            entry(allergy_urn, allergy),
            entry(medication_urn, medication),
            entry(immunization_urn, immunization),
        ],
    }
    return bundle


def build_concept_map():
    return {
        "resourceType": "ConceptMap",
        "id": CONCEPT_MAP_ID,
        "url": f"http://example.org/fhir/ConceptMap/{CONCEPT_MAP_ID}",
        "name": "SnomedToCim10Problems",
        "title": "Alignement SNOMED CT -> CIM-10 (problèmes, démonstration)",
        "status": "draft",
        "sourceUri": "http://snomed.info/sct",
        "targetUri": "http://hl7.org/fhir/sid/icd-10",
        "group": [{
            "source": "http://snomed.info/sct",
            "target": "http://hl7.org/fhir/sid/icd-10",
            "element": [
                {
                    "code": m["source_code"],
                    "display": m["source_display"],
                    "target": [{
                        "code": m["target_code"],
                        "display": m["target_display"],
                        "equivalence": m["equivalence"],
                    }],
                }
                for m in SNOMED_TO_CIM10
            ],
        }],
    }


def post_transaction(bundle):
    resp = requests.post(
        FHIR_BASE,
        json=bundle,
        headers={"Content-Type": "application/fhir+json"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def put_concept_map(concept_map):
    resp = requests.put(
        f"{FHIR_BASE}/ConceptMap/{CONCEPT_MAP_ID}",
        json=concept_map,
        headers={"Content-Type": "application/fhir+json"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def extract_patient_id(transaction_response):
    for e in transaction_response.get("entry", []):
        location = e.get("response", {}).get("location", "")
        if location.startswith("Patient/"):
            return location.split("/")[1]
    raise RuntimeError("Aucun Patient créé dans la réponse de la transaction FHIR.")


def verify_summary(patient_id):
    resp = requests.get(f"{FHIR_BASE}/Patient/{patient_id}/$summary", timeout=30)
    resp.raise_for_status()
    bundle = resp.json()
    sections = []
    for e in bundle.get("entry", []):
        if e["resource"]["resourceType"] == "Composition":
            for s in e["resource"].get("section", []):
                sections.append(s.get("title"))
    return sections


def main():
    print(f"Serveur FHIR cible : {FHIR_BASE}")

    print("1/3 - Création du patient de démonstration et des ressources cliniques (transaction)...")
    tx_bundle = build_transaction_bundle()
    tx_response = post_transaction(tx_bundle)
    patient_id = extract_patient_id(tx_response)
    print(f"   -> Patient créé : Patient/{patient_id}")

    print("2/3 - Création du ConceptMap d'alignement SNOMED CT -> CIM-10...")
    put_concept_map(build_concept_map())
    print(f"   -> ConceptMap créé : ConceptMap/{CONCEPT_MAP_ID}")

    print("3/3 - Vérification via l'opération $summary (IG International Patient Summary)...")
    sections = verify_summary(patient_id)
    print(f"   -> Sections IPS renvoyées par le serveur : {sections}")

    config_path = "app/config.js"
    with open(config_path, "w", encoding="utf-8") as f:
        f.write(
            "// Généré par scripts/seed_patient.py — NE PAS éditer à la main.\n"
            "// Contient uniquement des identifiants de configuration, pas de donnée clinique.\n"
            "window.APP_CONFIG = {\n"
            f"  fhirBase: {json.dumps(FHIR_BASE)},\n"
            f"  defaultPatientId: {json.dumps(patient_id)},\n"
            f"  conceptMapId: {json.dumps(CONCEPT_MAP_ID)},\n"
            "};\n"
        )
    print(f"\nConfiguration écrite dans {config_path}")
    print(f"Patient de démonstration : {patient_id}")
    print("Vous pouvez maintenant ouvrir app/index.html.")


if __name__ == "__main__":
    try:
        main()
    except requests.HTTPError as exc:
        print(f"Erreur HTTP lors de l'appel au serveur FHIR : {exc}", file=sys.stderr)
        if exc.response is not None:
            print(exc.response.text[:2000], file=sys.stderr)
        sys.exit(1)
