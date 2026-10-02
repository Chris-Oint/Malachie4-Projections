# Installation sur Windows (priorité) — puis Linux et macOS

Trois façons d'utiliser Malachie 4 Projections. Dans tous les cas : **aucune connexion
Internet n'est nécessaire**, ni pour construire, ni pour utiliser.

---

## A. Essayer tout de suite (2 minutes)

1. Installez **Node.js** (version 20 ou plus) : https://nodejs.org → bouton « LTS ».
2. Copiez le dossier `malachie4` sur le disque (par exemple `C:\Malachie4`).
3. Ouvrez **Invitez de commandes** dans ce dossier (dans l'explorateur : clic droit →
   *Ouvrir dans le Terminal*) et tapez :

```bat
npm install
npm start
```

La fenêtre du poste de contrôle s'ouvre ; l'écran public se place sur le 2ᵉ écran.

> Pour aller plus vite sous Windows, double-cliquez le fichier **`construire_windows.bat`**
> (il fait `npm install` puis construit l'installateur).

---

## B. Créer le programme installable (recommandé pour l'église)

```bat
npm install
npm run dist
```

Résultat dans le dossier `dist\` :

| Fichier | Usage |
|---|---|
| `Malachie4-Projections-2.0.0-x64.exe` | **installateur** : crée les raccourcis bureau et menu Démarrer |
| `Malachie4-Projections-portable-2.0.0.exe` | **version portable** : se lance par double-clic, sans installation (clé USB) |

L'installation est **par utilisateur** (pas besoin des droits administrateur) et
**les données ne sont pas supprimées** à la désinstallation (réserve, historique, réglages,
cantiques modifiés).

### Fabrication déjà éprouvée

La chaîne de fabrication a été essayée avec succès de bout en bout
(Electron 31.7.7 + electron-builder 24.13.3) : **l'exécutable portable Windows
x64 a bien été produit, 84 Mo**, contenant `main.js`, les deux fenêtres, le moteur
de rendu, l'icône et tout le contenu (Bible, cantiques, brochures). Il suffit de
lancer `npm run dist` sur un poste Windows pour obtenir les mêmes fichiers, avec
en plus l'icône et les informations de version intégrées à l'exécutable.

> Remarque pour les développeurs : fabriquer un `.exe` depuis Linux ou macOS
> demande Wine ; sans Wine, ajoutez `-c.win.signAndEditExecutable=false`
> (l'exécutable fonctionne, mais sans icône personnalisée ni numéro de version).

### Copie sur une clé USB

1. Construisez une fois sur un ordinateur possédant Node.js.
2. Copiez le `.exe` **portable** (ou l'installateur) sur la clé.
3. Sur l'ordinateur de l'église : double-clic. C'est tout.

---

## C. Autres types d'ordinateur

Le logiciel est le même partout ; seul le paquetage change.

| Système | Commande | Résultat |
|---|---|---|
| Windows | `npm run dist` | installateur + portable (voir ci-dessus) |
| Linux | `npx electron-builder --linux AppImage` | `dist/Malachie4-Projections-2.0.0.AppImage` (exécutable par double-clic) |
| macOS | `npx electron-builder --mac dmg` | `dist/Malachie4-Projections-2.0.0.dmg` |

Pour un poste où l'on ne veut rien installer du tout : **version web** (dossier `web/`)
— même logiciel, ouvert dans Chrome ou Edge, sans installation :

```bat
npm run web
```
puis ouvrez `http://localhost:8090/web/index.html` (et le bouton **Projection** pour
l'écran public ; sur un autre poste du même réseau, utilisez l'adresse IP de l'ordinateur).

Et pour **montrer** le logiciel sans rien installer : ouvrez `demo.html` (double-clic).
La démonstration se présente **comme un vrai poste de travail** — fenêtre du logiciel à
gauche, vidéoprojecteur à droite, barre des tâches en bas — avec un contenu réduit
(un chapitre de la Bible, une brochure, les cantiques) pour tenir dans un seul fichier.

---

## D. Réglages à faire une fois sur l'ordinateur de l'église

1. **Étendre l'affichage** : `Windows` + `P` → *Étendre* (jamais « Dupliquer »).
2. Dans Windows → *Paramètres → Système → Alimentation*, mettez la mise en veille sur
   **Jamais** (le logiciel l'empêche déjà pendant qu'il tourne).
3. Placez le vidéoprojecteur comme **écran 2** à droite de l'écran principal :
   l'application choisit automatiquement l'écran qui n'est pas le principal.
4. Vérifiez le son et la résolution du projecteur (1920×1080 recommandé).

## E. Dépannage à l'installation

| Problème | Solution |
|---|---|
| `npm install` échoue (pas de réseau sur le poste) | construisez le `.exe` sur un poste connecté, puis copiez-le |
| Windows SmartScreen affiche un avertissement | *Informations complémentaires* → *Exécuter quand même* (l'application n'est pas signée) |
| Le 2ᵉ écran n'est pas détecté | débranchez / rebranchez le câble : la fenêtre publique se replace seule en moins de 2 s |
| Rien ne s'affiche sur le projecteur | bouton **Projection** (F1), puis vérifiez que *Étendre* est bien choisi |
| L'antivirus bloque l'installation | autorisez l'application, ou utilisez la version **portable** |
