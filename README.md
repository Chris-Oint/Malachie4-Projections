# Malachie 4 — Projections & Bibliothèque du Message

Ce dépôt contient **deux choses**, toutes deux utilisables **sans Internet** :

| | Quoi | Où |
|---|---|---|
| **1** | **Malachie 4 Projections** — le logiciel de projection pour les cultes (Windows, Linux, macOS + version navigateur + démonstration) | dossier **`malachie4/`** |
| **2** | **La Bibliothèque du Message** — la collection française complète de prédications et brochures (618 textes), la Bible Louis Segond 1910 et « Les Sept Âges de l'Église », consultables dans le navigateur | racine du dépôt (`index.html`) et dossier **`data/`** |


---

## ⚡ Téléchargement direct Windows (.exe) & Simulation d'ordinateur (Moyens 3 à 7)

Sans rien compiler ni installer Node.js (**Moyen 6 — GitHub Actions + Releases**), téléchargez directement l'application Windows prête à l'emploi :

- 🟢 **[Télécharger l'Installateur Windows — `Malachie4-Projections-Setup-2.0.0-x64.exe` (87 Mo)](https://github.com/Chris-Oint/Malachie4-Projections/releases/latest/download/Malachie4-Projections-Setup-2.0.0-x64.exe)** *(double-cliquez pour installer avec raccourcis Bureau et Menu Démarrer)*
- 🔵 **[Télécharger la Version Portable — `Malachie4-Projections-portable-2.0.0.exe` (87 Mo)](https://github.com/Chris-Oint/Malachie4-Projections/releases/latest/download/Malachie4-Projections-portable-2.0.0.exe)** *(double-cliquez directement, sans installation — idéal aussi sur clé USB)*
- 💻 **[Ouvrir la Simulation d'ordinateur Windows 11 + Vidéoprojecteur en ligne](https://chris-oint.github.io/Malachie4-Projections/simulation-windows.html)**
- 📦 **Moyens 3 à 7 inclus dans le dépôt** :
  - **Moyen 6 (Recommandé — 0 connaissance)** : `.github/workflows/build-windows.yml` construit automatiquement les `.exe` sur GitHub Actions et les publie dans [Releases](https://github.com/Chris-Oint/Malachie4-Projections/releases/latest).
  - **Moyen 3 (Installateur local)** : double-clic sur `INSTALLER-WINDOWS.bat` (ou `malachie4/INSTALLER-WINDOWS.bat`).
  - **Moyen 4 (Essai direct)** : double-clic sur `LANCER.bat` (`npm install` automatique la 1re fois).
  - **Moyen 5 (Mode secours)** : double-clic sur `LANCER-MODE-SECOURS.bat` si la transparence clignote sur un PC.
  - **Moyen 7 (Terminal)** : `npm install` puis `npm run dist` dans `malachie4/`.

---


## 1. Le logiciel de projection — `malachie4/`

Poste de contrôle sur l'ordinateur (6 zones), **écran public** sur le vidéoprojecteur
(2ᵉ écran), Bible, cantiques, brochures en **double traduction La Voix de Dieu / Shekinah**.
L'écran public ne s'affiche jamais sur l'écran de l'ordinateur, se replace seul quand on
rebranche le projecteur (< 2 s), et le texte ne dépasse jamais du cadre.

* **Pour voir tout de suite** : ouvrir `malachie4/demo.html` (double-clic) — la
  démonstration se présente comme un vrai poste de travail (fenêtre du logiciel à gauche,
  vidéoprojecteur à droite).
* **Pour installer sur Windows** : `malachie4/docs/INSTALLATION-Windows.md`, ou lancer
  `malachie4/construire_windows.bat` (fabrique l'installateur `.exe` et la version portable).
* **Pour la version navigateur** : `npm run web` dans `malachie4/`.
* **Mode d'emploi** : `malachie4/docs/GUIDE-UTILISATEUR.md` · **tests** :
  `malachie4/docs/RAPPORT_TESTS.md` (186 contrôles) et `npm test`.

Le logiciel embarque : **66 livres** de la Bible (31 169 versets), **160 brochures**
(149 en double traduction **VGR + Shekinah**, 11 en **BF** — branham.fr) et le recueil de
cantiques (modifiable dans le logiciel).

---

## 2. La Bibliothèque du Message

Bibliothèque **hors-ligne** en français : les prédications et brochures de
**William Marrion Branham** dans **trois traductions** — **La Voix de Dieu** (VGR, Voice
of God Recordings), **Shekinah Publications** et **BF** (branham.fr — Restauration
Promise) — la **Bible Louis Segond 1910** complète, et le livre écrit
**« Les Sept Âges de l'Église »**.

### La règle de la collection

> **Trois traductions, rien d'autre** : tout le **Shekinah** (1 210), tout le
> **La Voix de Dieu** officiel (**VGR**, 399), et **BF** — les brochures que
> **branham.fr** a traduites **seule** (11). Cette troisième traduction **n'est jamais
> appelée « La Voix de Dieu »** : elle porte l'abrégé **BF** de sa source.
>
> · une brochure **déjà présente en Shekinah** n'est pas doublée par BF (204 cas écartés) ;
> · une brochure **déjà en VGR officiel** n'est pas doublée non plus (202 cas écartés) ;
> · **MS** (Message du temps), **BBV** et toutes les autres traductions ont été
>   **retirées** de la collection et de la bibliothèque (547 textes, fichiers compris) ;
> · l'index **COD** reste écarté, comme demandé.

### Contenu de la bibliothèque

| Traduction | Textes |
|---|---|
| **Shekinah Publications** | 1 210 |
| **La Voix de Dieu** — VGR officiel (399, dont 380 avec audio officiel) | 399 |
| **BF** — branham.fr (Restauration Promise) | 11 |
| **TOTAL** | **1 620 textes** |

Comment le maximum a été atteint :
1. **Bibliothèque officielle VGR** identifiée via l'API interne de *themessage.com*
   (le site de Voice of God Recordings) : **399 brochures françaises**
   (385 prédications datées + 3 BK + 9 TR + 2 WT). Vérifié : les filtres par année,
   par série et 120 mots-clés ne renvoient **rien de plus**.
2. **399 PDF téléchargés** puis **texte extrait page par page** (PyMuPDF) :
   39,1 millions de caractères de texte français, nettoyé (en-têtes, pieds de page,
   césures, paragraphes numérotés).
3. **Sondage du serveur VGR** (`download.branham.org/pdf/FRN/`) : 243 fichiers nommés
   confirmés — tous déjà inclus dans les 399.
4. **branham.fr** : après application de la règle, **11 brochures** ne sont traduites
   que par cette source (63-0707 et la série 65-0000 → 65-0009) : elles portent l'étiquette
   **BF**. Les 204 autres doublonnaient Shekinah, les 202 autres le VGR officiel.
5. **Index COD exclu** (comme demandé : *MS-COD-Index* « Conduite, ordre et doctrine »).

> Le retraitement est reproductible : **`python3 scripts/retraiter_collection.py`**
> (option `--simulation` pour voir le résultat sans rien modifier) et vérifié par
> **`node tests/test_collection.mjs`** (19 contrôles).

> Les **PDF officiels (130 Mo)** ne sont pas stockés ici (trop volumineux) : tout est
> téléchargeable en une commande avec **`telecharger_brochures_VGR.sh`**, ou brochure par
> brochure depuis l'application (bouton **PDF**).
| Bible Louis Segond 1910 | 66 livres · **31 169 versets** |
| « Les Sept Âges de l'Église » | 10 chapitres |

**Sources** : bibliothèque officielle Voice of God Recordings (themessage.com /
download.branham.org) pour les 399 brochures **VGR** ; **Shekinah Publications** (via
branham.fr) pour les 1 210 textes Shekinah ; **branham.fr (Restauration Promise)** pour
les 11 textes **BF** ; Bible Louis Segond 1910 (domaine public).
**Écartés volontairement** : les traductions MS, BBV et autres, et les livres COD 1 et 2.

### Utiliser la bibliothèque

Ouvrir `index.html` dans un navigateur (ou la servir avec un petit serveur local :

```bash
python3 -m http.server 8080
# puis http://localhost:8080/index.html
```

Fonctionne ensuite **hors-ligne** (l'application s'installe depuis le navigateur).

---

> **Où sont les données ?** Sur ce dépôt, dans `data/` (77 Mo). L'espace de travail
> de la machine de travail ne garde que le logiciel léger : les textes lourds se
> récupèrent par `git clone` ou par `telecharger_brochures_VGR.sh`, et tout ce qui est
> envoyé ici y reste (aucun fichier n'est jamais effacé par `pousser_sur_github.sh`).

## 3. Ce qu'il y a à la racine du dépôt

```
malachie4/                        le logiciel de projection (application + démo + web + docs)
index.html, app.js, style.css,    la bibliothèque consultable dans le navigateur
sw.js, manifest.webmanifest
data/                             les 2 167 textes et la Bible (formats .json.gz)
catalogue_VGR_officiel.csv        la liste des 399 brochures officielles (code, titre, PDF, audio)
telecharger_brochures_VGR.sh      télécharge les 399 PDF officiels (~130 Mo)
telecharger_tous_les_PDF.sh       télécharge l'ensemble des documents
scripts/                          outils de collecte et d'extraction (Python)
uploads/                          cahier des charges et prototype d'origine
pousser_sur_github.sh             renvoie le travail sur GitHub en une commande (n'efface jamais rien)
```

**Tests de la bibliothèque** (serveur local sur le port 8080) :
`node tests/test_collection.mjs` (la règle de collection, 19 contrôles),
`tests/test_app.mjs`, `tests/test_vgr.mjs`, `tests/test_deep.mjs`,
`tests/test_bible_standalone.mjs`
(1 620 textes = 1 210 Shekinah + 399 La Voix de Dieu + 11 BF, 66 livres, 31 169 versets).

## 4. Application web Malachie 4 — Bible d’étude

L’application web fournie par Chris-Oint est disponible directement ici :

- [Ouvrir Malachie 4 — Bible d’étude](malachi4-rapide-max.html)
- Icône PWA : `assets/icon-512.png`
- Manifeste : `malachi4-rapide-max.webmanifest`
- Service worker dédié : `malachi4-rapide-max-sw.js`
