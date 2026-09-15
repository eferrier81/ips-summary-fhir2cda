# Cahier des charges — Sujet E : Affichage du résumé médical du patient (IPS)

**Groupe :** Enzo Ferrier, Ethan Cabanes
**Format cible imposé :** CDA (HL7 Clinical Document Architecture, R2)
**Serveur FHIR utilisé :** serveur public HAPI FHIR R4 — `https://hapi.fhir.org/baseR4`

---

## 1. Besoin métier, utilisateur, scénario, critères d'acceptation

### 1.1 Contexte / besoin métier

Un soignant qui prend en charge un patient qu'il ne connaît pas (service d'urgences, mobilité
du patient entre établissements, contexte transfrontalier type *MyHealth@EU*) a besoin d'accéder
rapidement à un **résumé de santé minimal** : allergies, problèmes de santé actifs, traitements en
cours, vaccinations. Cette donnée existe déjà sous forme structurée dans le dossier patient
informatisé, exposé via une API **FHIR R4** conforme à l'IG *International Patient Summary (IPS)*.

Le système récepteur (ex. un répertoire régional historique, un logiciel tiers, ou une archive
réglementaire) n'accepte cependant que des documents **CDA**, pas des ressources FHIR. Le
prototype doit donc jouer le rôle de passerelle : lire un IPS depuis un serveur FHIR réel, le
présenter de façon exploitable à l'utilisateur, et produire la représentation CDA équivalente.

### 1.2 Utilisateur cible

Médecin ou infirmier(ère) de coordination consultant, via un poste de travail, le résumé de santé
d'un patient à partir de son identifiant.

### 1.3 Scénario nominal

1. L'utilisateur saisit/sélectionne l'identifiant FHIR (`Patient.id`) du patient sur le serveur configuré.
2. L'application appelle réellement `GET [base]/Patient/{id}/$summary` (opération standard définie
   par l'IG IPS).
3. Le serveur renvoie un `Bundle` de type `document`, conforme au profil
   `http://hl7.org/fhir/uv/ips/StructureDefinition/Bundle-uv-ips`, contenant une `Composition` et
   les ressources cliniques référencées (`AllergyIntolerance`, `Condition`, `MedicationStatement`,
   `Immunization`, `Organization`...).
4. L'application affiche :
   - une **vue métier** lisible (identité, allergies, problèmes, traitements, vaccinations) ;
   - une **vue technique** listant les ressources FHIR réellement reçues (types, id, JSON brut) ;
   - une **vue CDA** : document CDA généré à partir du même contenu, section par section ;
   - une **vue terminologie** : pour chaque problème, code SNOMED CT source et code CIM-10 cible
     obtenu via un `ConceptMap` lu sur le serveur.
5. Toute erreur (patient introuvable, serveur inaccessible, résumé vide) est interceptée et affichée
   clairement ; chaque appel HTTP est journalisé (horodatage, méthode, URL, statut) dans un
   panneau de traçabilité visible.

### 1.4 Critères d'acceptation

| # | Critère |
|---|---|
| AC1 | Pour un `Patient.id` valide, l'appli effectue un vrai `GET Patient/{id}/$summary` et affiche au moins les sections Allergies / Problèmes / Traitements avec des libellés cliniques lisibles. Aucun contenu clinique n'est codé en dur dans le code source. |
| AC2 | L'appli affiche la liste des ressources FHIR effectivement utilisées (type + id) et permet d'inspecter le JSON brut de chacune. |
| AC3 | L'appli génère un document CDA (XML `ClinicalDocument`) bien formé, dont les sections `structuredBody` reprennent les mêmes codes LOINC de section que la `Composition` IPS (48765-2 Allergies, 11450-4 Problèmes, 10160-0 Traitements, 11369-6 Vaccinations le cas échéant), téléchargeable/copiable. |
| AC4 | Pour chaque problème, le code SNOMED CT source est affiché ainsi que le code CIM-10 aligné si une correspondance existe dans le `ConceptMap` ; sinon l'appli affiche explicitement « non mappé ». |
| AC5 | Si le patient n'existe pas, si le serveur répond en erreur, ou si le résumé ne contient aucune section clinique, un message clair est affiché sans plantage de l'application. |
| AC6 | Le prototype fonctionne avec au moins un autre `Patient.id` existant sur le même serveur (testé), pas seulement le patient de démonstration. |

---

## 2. Choix des spécifications

| Élément | Choix | Justification |
|---|---|---|
| Version FHIR | **R4 (4.0.1)** | Version exigée par l'IG IPS et servie par le serveur HAPI public (`FHIR 4.0.1/R4`, vérifié en environnement réel). |
| IG / profils | **HL7 International Patient Summary (hl7.fhir.uv.ips)** | IG normalisé pour le résumé de santé transfrontalier ; profils `Bundle-uv-ips`, `Composition-uv-ips`, `Patient-uv-ips`, `AllergyIntolerance-uv-ips`, `Condition-uv-ips`, `MedicationStatement-uv-ips`, `Immunization-uv-ips`. |
| Opération FHIR | **`$summary`** (opération d'instance sur `Patient`) | Opération officiellement définie par l'IG IPS ; implémentée nativement par HAPI FHIR côté serveur — vérifiée en environnement réel (retourne un `Bundle` avec `meta.profile = Bundle-uv-ips`). |
| Standard cible | **CDA R2** (imposé par le sujet E) | Alignement des codes de section avec la spec complémentaire *IPS - CDA Implementation Guide*, qui réutilise les mêmes codes LOINC que la version FHIR — permet une correspondance section-à-section documentée. |
| Terminologies source | **SNOMED CT** (`http://snomed.info/sct`) pour allergies/problèmes/vaccins ; **LOINC** (`http://loinc.org`) pour les types de document/section | Terminologies imposées par les profils IPS. |
| Terminologie cible (alignement) | **CIM-10 / ICD-10** (`http://hl7.org/fhir/sid/icd-10`) pour les problèmes | Contexte français : la CIM-10 reste la nomenclature de référence pour le codage administratif/PMSI ; alignement réalisé via un `ConceptMap` FHIR dédié, lu sur le serveur (pas une table codée en dur dans l'appli). |

---

## 3. Interactions prévues avec le serveur FHIR

- **Lecture** : `GET Patient/{id}`, `GET ConceptMap/{id}`.
- **Opération de recherche documentaire** : `GET Patient/{id}/$summary` (retourne le `Bundle` IPS complet).
- **Recherche complémentaire (optionnelle/fallback)** : `GET AllergyIntolerance?patient=...`,
  `GET Condition?patient=...` si besoin d'enrichir la vue technique.
- **Création/mise à jour** : un script de **seed**, exécuté une fois, hors application (`scripts/seed_patient.py`),
  envoie un `Bundle` de type `transaction` pour créer un patient de démonstration avec des ressources
  cliniques réalistes, ainsi que le `ConceptMap` SNOMED CT → CIM-10. Nécessaire car le serveur HAPI
  public est un bac à sable communautaire partagé : les patients existants n'ont pas de garantie de
  persistance ni de contenu clinique exploitable (vérifié : plusieurs patients aléatoires testés en
  environnement réel n'avaient aucune allergie/traitement, ou ont été supprimés par d'autres
  utilisateurs du bac à sable). Cette étape ne constitue pas une donnée « codée en dur » dans
  l'application : elle prépare seulement le jeu de données, l'application interroge ensuite le serveur
  en temps réel (AC6 : testable avec un autre patient).

---

## 4. Architecture et lecture ReEIF

| Couche ReEIF | Analyse |
|---|---|
| **Infrastructure / Sécurité** | Transport HTTPS vers `hapi.fhir.org`. Serveur public **sans authentification** (pas d'OAuth2/SMART on FHIR) ; CORS ouvert (`Access-Control-Allow-Origin: *`, vérifié en environnement réel), ce qui permet un appel direct navigateur → serveur sans back-end intermédiaire. **Limite assumée** : un déploiement réel en établissement de santé exigerait une authentification forte (SMART on FHIR), un chiffrement de bout en bout et une journalisation d'audit conforme IHE ATNA. |
| **Application** | Application web statique (HTML/CSS/JS, sans framework ni build), responsable de : l'appel au serveur FHIR, la transformation FHIR → CDA, le calcul de l'alignement terminologique, l'affichage des 4 vues. |
| **Information** | Modèle source : ressources FHIR R4 / profils IPS (JSON). Modèle cible : document CDA R2 (XML, `ClinicalDocument` / `structuredBody` / `section` / `entry`). Modèle pivot : `ConceptMap` FHIR pour l'alignement sémantique. |
| **Métier** | Processus « consultation du résumé de santé d'un patient inconnu du service » dans un contexte de continuité des soins ou de mobilité du patient. |
| **Organisation** | Acteurs : système source (DPI exposant FHIR), application de passerelle (ce prototype), système cible consommateur de CDA, utilisateur clinicien. |
| **Juridique** | Hébergement de données de santé (HDS), consentement au partage, traçabilité des accès. **Le prototype n'utilise que des données synthétiques/fictives** (aucune donnée patient réelle), point indispensable puisque le serveur est un bac à sable public. La traçabilité réelle (journal d'échanges HTTP) est esquissée mais reste minimale, à des fins de démonstration uniquement. |

---

## 5. Règles de transformation, mapping sémantique, limites et pertes

### 5.1 Règles de transformation FHIR → CDA

- Chaque section de la `Composition` IPS (identifiée par son code LOINC) devient une `<section>` CDA
  avec le **même code LOINC**, un `<title>` et un `<text>` narratif équivalent.
- Chaque ressource référencée par une section devient une entrée structurée simplifiée dans cette
  section CDA (`<entry><observation>` pour `AllergyIntolerance`/`Condition`,
  `<entry><substanceAdministration>` pour `MedicationStatement`, `<entry><substanceAdministration>`
  pour `Immunization`), avec reprise du code et du système de code d'origine (`translation`/`code`).
- Les identifiants FHIR (`urn:uuid:...`) sont reconvertis en identifiants CDA (`root` + `extension`)
  selon une convention arbitraire documentée dans le code (`scripts`/`app.js`).

### 5.2 Règles d'alignement terminologique

- Pour chaque `Condition.code` (SNOMED CT), recherche d'une correspondance dans le `ConceptMap`
  `snomed-to-cim10-problems` lu sur le serveur FHIR.
- Si une correspondance existe → affichage du code CIM-10 cible avec son libellé.
- Si aucune correspondance n'existe → affichage explicite « non mappé » (pas d'échec silencieux).

### 5.3 Limites et pertes d'information identifiées

1. Le CDA généré démontre le **principe** de correspondance section-à-section et le passage
   JSON → XML ; il n'est **pas** strictement conforme aux gabarits officiels IHE PCC / *IPS-CDA IG*
   (`templateId` non exhaustifs, pas de validation Schematron) — limite assumée pour un prototype
   de 2h.
2. Une `CodeableConcept` FHIR peut porter plusieurs `coding` ; seul le premier code SNOMED CT est
   repris comme code principal côté CDA — les codes secondaires éventuels sont ignorés (perte
   d'information mineure, documentée).
3. L'alignement SNOMED CT → CIM-10 n'est démontré que pour les quelques correspondances présentes
   dans le `ConceptMap` de démonstration (2 à 3 entrées) ; c'est un jeu réduit à but pédagogique, pas
   un service de terminologie complet.
4. Le serveur FHIR public ne fournissant aucune authentification/habilitation, aucune donnée réelle
   de patient n'est utilisée : uniquement des données synthétiques créées par le script de seed.
5. La gestion d'erreurs est **minimale** (réseau, patient absent, résumé vide) : conforme au
   périmètre demandé (« gestion minimale des erreurs »), pas une gestion d'erreurs exhaustive de
   niveau production.

---

## 6. Spécification technique pour la réalisation (transmise à l'IA de développement)

**Arborescence du dépôt :**

```
/
├── app/
│   ├── index.html      → structure des 4 vues (métier / ressources FHIR / CDA / terminologie) + panneau de traçabilité des échanges
│   ├── app.js           → appel $summary, parsing du Bundle IPS, génération CDA, alignement terminologique, gestion d'erreurs
│   └── style.css
├── scripts/
│   └── seed_patient.py → transaction Bundle (Patient + Condition x2 + AllergyIntolerance + MedicationStatement + Immunization) + ConceptMap, POST vers https://hapi.fhir.org/baseR4
├── CDC.md
├── PROMPTS_Ferrier_Enzo_CDC.md
├── PROMPTS_Ferrier_Enzo_REAL.md
├── PROMPTS_Cabanes_Ethan_CDC.md
└── PROMPTS_Cabanes_Ethan_REAL.md
```

**Fonctions clés attendues dans `app.js`** : `fetchSummary(patientId)`,
`renderClinicalView(bundle)`, `renderResourcesView(bundle)`, `bundleToCda(bundle)`,
`renderTerminologyView(conditions, conceptMap)`, `logExchange(entry)`, gestion des erreurs HTTP
(try/catch autour de chaque `fetch`, affichage utilisateur dédié).

**Configuration** : URL du serveur FHIR et `Patient.id` par défaut en constantes en tête de
`app.js`, modifiables/saisissables dans l'UI (pas de donnée clinique en dur — uniquement l'identifiant
du patient de démonstration).

## 7. Exécution du prototype

```bash
pip install requests
python scripts/seed_patient.py   # crée le patient de démo + le ConceptMap sur le serveur FHIR, écrit app/config.js
cd app && python -m http.server 8420
```

Puis ouvrir <http://localhost:8420/index.html> (un chargement en `file://` direct ne fonctionne
pas à cause des règles CORS/fetch du navigateur). Le champ patient est pré-rempli ; testable avec
n'importe quel autre `Patient.id` existant sur le même serveur (AC6).
