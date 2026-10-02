# Malachie 4 — Projections & Bibliothèque du Message

Ce dépôt contient **deux choses**, toutes deux utilisables **sans Internet** :

| | Quoi | Où |
|---|---|---|
| **1** | **Malachie 4 Projections** — le logiciel de projection pour les cultes (Windows, Linux, macOS + version navigateur + démonstration) | dossier **`malachie4/`** |
| **2** | **La Bibliothèque du Message** — la collection française complète de prédications et brochures (618 textes), la Bible Louis Segond 1910 et « Les Sept Âges de l'Église », consultables dans le navigateur | racine du dépôt (`index.html`) et dossier **`data/`** |

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
toutes en double traduction, et le recueil de cantiques (modifiable dans le logiciel).

---

## 2. La Bibliothèque du Message

Bibliothèque **hors-ligne** en français : les prédications et brochures de
**William Marrion Branham** — traduction **La Voix de Dieu** (VGR) et **Shekinah
Publications** — la **Bible Louis Segond 1910** complète, et le livre écrit
**« Les Sept Âges de l'Église »**.

### La collection La Voix de Dieu (VGR) — maximisée

| | Nombre |
|---|---|
| **Brochures officielles La Voix de Dieu (VGR)** — bibliothèque officielle Voice of God Recordings | **399** |
| dont **audio** officiel (M4A) | 380 |
| dont **texte français extrait** et lisible hors-ligne dans l'app | 389 (10 sont des PDF scannés sans couche texte) |
| **+ traductions VGR du site branham.fr** (dont 13 introuvables dans la liste officielle) | 215 |
| **TOTAL entrées « La Voix de Dieu »** | **614 textes** |

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
4. **branham.fr** : 215 textes VGR, dont **13 absents** de la liste officielle → ajoutés.
5. **Index COD exclu** (comme demandé : *MS-COD-Index* « Conduite, ordre et doctrine »).

> Les **PDF officiels (130 Mo)** ne sont pas stockés ici (trop volumineux) : tout est
> téléchargeable en une commande avec **`telecharger_brochures_VGR.sh`**, ou brochure par
> brochure depuis l'application (bouton **PDF**).

### Contenu total de la bibliothèque

| Élément | Quantité |
|---|---|
| Prédications et brochures Shekinah | 1 210 |
| La Voix de Dieu (dont 399 officielles VGR) | 614 |
| Message du temps (MS) | 334 |
| Bible / autres | 9 |
| **TOTAL** | **2 167 textes** |
| Bible Louis Segond 1910 | 66 livres · **31 169 versets** |
| « Les Sept Âges de l'Église » | 10 chapitres |

**Sources** : bibliothèque officielle Voice of God Recordings (themessage.com /
download.branham.org) pour les 399 brochures VGR ; branham.fr (Restauration Promise)
pour Shekinah/MS ; Bible Louis Segond 1910 (domaine public).
**Écarté volontairement** : les livres COD 1 et 2.

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

**Tests de la bibliothèque** : `node tests/test_app.mjs`, `tests/test_vgr.mjs`,
`tests/test_deep.mjs`, `tests/test_bible_standalone.mjs`
(2 167 entrées, 614 textes VGR, 399 officielles, 66 livres, 31 169 versets).
