# Malachie 4 Projections — guide d'utilisation

Application de projection pour les cultes : **poste de contrôle** sur l'ordinateur,
**écran public** sur le vidéoprojecteur (2ᵉ écran). Tout fonctionne **sans Internet**.

---

## 1. Démarrage

1. Branchez le vidéoprojecteur (ou la 2ᵉ télévision) sur l'ordinateur.
2. Lancez **Malachie 4 Projections** (icône sur le bureau).
3. Le poste de contrôle s'ouvre sur l'écran de l'ordinateur, l'écran public se place
   automatiquement sur le 2ᵉ écran — **jamais sur votre écran**. Si aucun 2ᵉ écran n'est
   branché, la fenêtre publique reste invisible (aucune gêne) et se remet en place
   dès qu'on rebranche le projecteur (moins de 2 secondes).
4. La fenêtre publique est volontairement **non cliquable** (la souris traverse) :
   elle ne prend jamais le clavier, sans bordure, transparente sur fond de l'écran.

> Ouvrez le logiciel **avant** le culte. Il empêche l'ordinateur de se mettre en veille.

### Barre du haut

| Bouton | Rôle |
|---|---|
| **Projection** | branche / débranche l'écran public (F1) |
| **Affichage** | coupe / remet l'image sans tout débrancher (F2) |
| **Déconnecter** | libère l'écran public (utile si l'on veut montrer autre chose) |
| **Écran vide** | vide immédiatement l'écran public (Échap) |
| **?** | aide intégrée |
| Témoins | état de l'écran public et du contenu chargé |

---

## 2. Les six zones

```
┌───────────────┬───────────────┬───────────────┐
│ 1. Réserve    │ 2. Réglages   │ 3. Écran-retour│
├───────────────┼───────────────┼───────────────┤
│ 4. Bibliothèque│ 5. Gestion   │ 6. Historique │
└───────────────┴───────────────┴───────────────┘
```

**Zone 1 — Réserve.** Vos enchaînements préparés à l'avance. Bouton **+** pour ajouter
(ou glisser-déposer depuis la bibliothèque), **croix** pour retirer. Un clic sur une
ligne la projette. **Ctrl+Z** annule une suppression.

**Zone 2 — Réglages.** Police, taille, gras / italique (Ctrl+B / Ctrl+I), marge,
fond noir ou image (choisir une image du disque), et **réduction automatique du texte**
pour que rien ne dépasse jamais de l'écran. Les réglages s'appliquent en direct,
aux deux fenêtres en même temps.

**Zone 3 — Écran-retour.** Ce que le public voit, en petit, dans le poste de contrôle.
Il fonctionne même quand **Affichage** est coupé : on garde toujours le contrôle.

**Zone 4 — Bibliothèque.**
* **A · Cantiques** — votre recueil (cliquez un cantique pour l'ouvrir en zone 5).
* **B · Bible** — 66 livres disposés en grille ; cliquez un livre, puis un chapitre,
  puis un verset. Vous pouvez aussi taper directement une référence :
  `Jn 3:16`, `jean 3.16`, `ps 23`, `1 Co 13:4`.
* **C · Brochures** — la bibliothèque, en **trois traductions** : La Voix de Dieu (VGR),
  Shekinah, et **BF** (branham.fr — Restauration Promise). Le bouton de traduction
  (**VGR / Shekina**, ou **BF** sur les 11 brochures que branham.fr a traduites seule)
  permet de basculer sur le même passage.
La recherche (Ctrl+F) filtre la liste en direct.

**Zone 5 — Gestion.** Le texte sélectionné, prêt à projeter : cantiques par strophe,
Bible par verset, brochures **ligne par ligne** avec la ligne active **surlignée en jaune**.
Les cantiques peuvent être **modifiés et enregistrés** (bouton ✎) ou ajoutés (+).

**Zone 6 — Historique.** Les **30 derniers** textes projetés. Un clic revient
exactement à la position d'alors (ligne, paragraphe, traduction).

---

## 3. Les gestes (inchangés, annexe A du cahier des charges)

| Geste | Effet |
|---|---|
| **Clic** sur un cantique | s'ouvre en zone 5 et s'ajoute à la réserve |
| **Clic** sur une brochure | s'ouvre en zone 4 / zone 5 et s'ajoute à la réserve |
| **Clic** sur un verset | s'ajoute à la réserve |
| **Double-clic** | projette immédiatement (sur l'écran public) |
| **Flèches ← ↑ → ↓** | un verset / une strophe / une ligne en arrière ou en avant |
| **Entrée** | projette l'élément sélectionné |
| **F1 / F2** | Projection on-off / Affichage on-off |
| **Échap** | écran public vidé instantanément |
| **Ctrl+F** | curseur dans la recherche |
| **Ctrl+Z** | annule la dernière suppression de la réserve |
| **Ctrl+B / Ctrl+I** | gras / italique |

Pendant la lecture d'une brochure, chaque appui de flèche fait avancer d'une ligne :
si une ligne dépasse le cadre, elle est réduite automatiquement — **on prend le texte
en cours de route sans jamais rien perdre**.

---

## 4. En cas de problème

| Symptôme | Que faire |
|---|---|
| Rien sur le vidéoprojecteur | vérifiez le bouton **Projection** (F1), puis le câble ; l'application se replace seule |
| Le projecteur affiche encore une image | **Déconnecter** ou **Échap** |
| L'écran public est « figé » | il redémarre tout seul (moins de 2 s) ; sinon Ctrl+R |
| Un texte dépasse | c'est impossible : la réduction automatique s'en charge (zone 2) |
| Tout est bloqué | fermez et relancez : la réserve, l'historique et les réglages sont conservés |

---

## 5. Où sont mes données

Tout est enregistré **à côté du logiciel**, dans un dossier `donnees/` :
`reglages.json`, `reserve.json`, `historique.json`, `dernier.json`, `journal.txt` et
vos cantiques modifiés. Copiez le dossier sur une clé USB : vous retrouvez tout
sur un autre ordinateur. (Si le logiciel est installé dans `C:\Program Files`, ces
fichiers vont dans le dossier utilisateur de Windows — le bouton *Aide → ouvrir le
dossier des données* vous y conduit.)
