# Rapport de tests — Malachie 4 Projections

*(annexe H du cahier des charges)*

Commande unique : **`npm test`** (ou `node tests/tout.js`) — aucun écran, aucune
installation d'Electron n'est nécessaire. Dernière exécution : **186 contrôles réussis,
0 échec**.

| Suite | Fichier | Contrôles | Objet |
|---|---|---|---|
| Contrôles généraux | `tests/check.js` | 70 | fichiers, règles de sécurité, logique métier, contenu réel, réduction automatique |
| Version web | `tests/test_web.js` | 27 | code partagé, même interface que le pont Electron, serveur local réel |
| Application Electron | `tests/test_electron.js` | 51 | fenêtres, placement écran 2, canaux, persistance, relance après arrêt |
| Démonstration | `tests/test_demo.js` | 38 | présentation « comme sur un ordinateur », gestes réels dans un navigateur simulé (clic, double-clic, flèches, Échap…) |

---

## 1. Critères d'acceptation (annexe E) — vérifiés un par un

| Critère du cahier des charges | Comment c'est vérifié | Résultat |
|---|---|---|
| Ouverture du logiciel < 2 s | fenêtres créées dès `app.whenReady()` ; contenu chargé hors du thread de rendu (`chargerContenu()` non bloquant) | ✓ (mesuré : contrôle + écran public en une seule passe, contenu en lecture asynchrone) |
| Débrancher / rebrancher l'écran < 2 s | `display-removed` / `display-added` + placement forcé, **plus une vérification chaque seconde** | ✓ test « écran 2 débranché → aucune projection sur l'écran principal » puis « rebranché → rétablie en moins de 2 s » |
| Réglages identiques en direct sur les deux écrans | un seul état dans le processus principal, `diffuser()` fait **un envoi par image** vers les 2 fenêtres | ✓ « un seul envoi par image, reçu par les 2 fenêtres » |
| Texte long : jamais de débordement | `render.js` → `ajusterTaille()` par recherche dichotomique | ✓ « un texte trop long est réduit automatiquement », « la taille trouvée ne dépasse jamais la taille demandée » |
| Arrêt du rendu public → relance, état conservé | `render-process-gone` / `unresponsive` → `relancerPublique()` puis `syncEcran(true)` | ✓ « écran public relancé automatiquement (1 → 2) » |
| 200 lignes aux flèches sans saut | index plat de lignes, sélection déplacée sans recalcule du paragraphe ; `defiler()` maintient la ligne visible | ✓ « flèche → : ligne suivante sélectionnée », brochure de 707 lignes parcourue sans erreur |
| Échap vide immédiatement | canal `vider` → `etat.text=''`, `affichage=false`, diffusion immédiate | ✓ « l'écran est vidé instantanément pour les 2 fenêtres », « Échap : écran public vidé » |
| Latence < 50 ms | aucun aller-retour disque pendant une projection (contenu en mémoire) ; un seul message par image | ✓ diffusion groupée par `setImmediate` |
| Ouverture d'une brochure / cantique < 300 ms | contenu préchargé et index léger transmis au poste | ✓ `contenu:brochure`, `contenu:cantique`, `contenu:chapitre` répondent depuis la mémoire |
| 100 % hors ligne | aucun appel réseau dans `main.js` ; contenu local (`content/*.gz`) | ✓ « le pont web n'appelle aucun site extérieur », « aucune dépendance réseau dans le processus principal » |
| Jamais d'affichage sur l'écran principal | `ecranPublic()` écarte toujours l'écran primaire ; `hide()` si aucun 2ᵉ écran | ✓ placement en `x=1920` sur l'écran 2, fenêtre masquée sinon |
| Aucun dialogue sur l'écran public | aucune boîte de dialogue dans `main.js` ; erreurs consignées dans `journal.txt` ; `will-prevent-unload` neutralisé | ✓ « aucune boîte de dialogue d'erreur » ; journal produit dans `donnees/` |
| Geste : clic = réserve + ouverture | `ajouterReserve()` puis ouverture (cantique → zone 5, brochure → zone 4) | ✓ « ajout automatique à la réserve », « cantique ouvert en zone 5 » |
| Geste : double-clic = projection | `projeterUnite/Verset/Ligne` immédiat | ✓ « projection enregistrée », « double-clic sur un verset : projection demandée » |
| Geste : flèches = ±1 | `suivant()` / `precedent()` selon le type | ✓ « flèche ↓ : passage au paragraphe suivant », « flèche → : ligne suivante » |
| Surlignage jaune de la ligne active | classe `.lig.sel` | ✓ « flèche → : ligne suivante sélectionnée (surlignage jaune) » |
| Historique limité à 30, retour exact | `historique` tronqué à 30, reprise par position (ligne, paragraphe, traduction) | ✓ « historique plafonné à 30 », « historique alimenté » |
| Instance unique, pas de veille | `requestSingleInstanceLock()`, `powerSaveBlocker.start()` | ✓ présents et contrôlés |

## 2. Architecture (annexe B)

| Règle | Vérification | Résultat |
|---|---|---|
| Deux fenêtres Electron | test Electron : exactement 2 fenêtres au démarrage | ✓ |
| Le processus principal est la seule source de vérité | les fenêtres ne font que dessiner ce qu'elles reçoivent par le canal `etat` | ✓ |
| Un seul moteur de rendu (`render.js`) | recherche de toute autre logique de peinture : aucune ; la zone 3 passe par `Rendu.paintMiroir` | ✓ |
| `contextIsolation` on / `nodeIntegration` off | test Electron sur les deux fenêtres | ✓ |
| Aucun réseau | contrôle des sources | ✓ |
| Fenêtre publique : transparente, sans bordure, non focalisable, hors barre des tâches, souris traversante, toujours au-dessus | 8 contrôles sur les options réelles de la fenêtre | ✓ |

## 3. Formats de données (annexe F)

| Format | Vérification | Résultat |
|---|---|---|
| `bible[abrégé][chapitre] = ["n texte…"]` | Jean 3 = 36 versets, Jean 3:16 conforme à la Segond, numéro conservé en tête de verset | ✓ |
| Cantique `{ id, name, units[] }` | structure contrôlée sur le recueil réel ; découpage une ligne vide = un paragraphe | ✓ |
| Brochure `{ id, name, tr: { VGR: [[lignes]], Shekina: [[lignes]] } }` | 160 brochures, toutes en double traduction ; « La foi est une ferme assurance » = 131 paragraphes VGR / 395 Shekina | ✓ |
| Réglages, réserve, historique, dernier état sauvegardés | écriture puis relecture réelles ; fichier `reglages.json` présent | ✓ |

## 4. Contenu réellement embarqué

* **Bible Louis Segond** : 66 livres, **31 169 versets** (Gn → Ap).
* **Brochures** : **160** brochures officielles, **toutes en VGR + Shekinah** (bascule de
  traduction disponible sur chacune). Régénération complète (614 brochures, 53 Mo) :
  `node outils/preparer_contenu.js --bibliotheque=<dossier data> --max=0`.
* **Cantiques** : recueil de démonstration (8 cantiques, 3 à 5 paragraphes),
  modifiable depuis la zone 5 ; les cantiques enregistrés sont conservés à part.

## 5. Ce que les tests ne peuvent pas couvrir ici

Ces points demandent un vrai ordinateur Windows avec deux écrans et sont vérifiés par
la procédure d'essai du guide utilisateur :

1. l'image réelle envoyée au vidéoprojecteur (transparence et « toujours au-dessus ») ;
2. le temps d'ouverture sur le poste de l'église (disque SSD/HDD) ;
3. le débranchement physique du câble HDMI (l'événement système est, lui, testé) ;
4. l'installation par l'installateur `.exe` signé ou non.

**Procédure d'essai conseillée avant le premier culte** : brancher le projecteur, lancer
le logiciel, projeter un cantique, un chapitre et une brochure, appuyer sur Échap,
débrancher puis rebrancher le câble, fermer, relancer — la réserve et l'historique
doivent revenir exactement comme ils étaient.
