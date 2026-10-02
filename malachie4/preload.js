/* ============================================================================
   Malachie 4 Projections — preload (pont sécurisé)
   contextIsolation activé, nodeIntegration désactivé (exigence B).
   Aucune dépendance réseau : uniquement des canaux IPC internes.
   ========================================================================== */
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

let dernierEtat = null;
const abonnes = [];
ipcRenderer.on('etat', (_e, msg) => { dernierEtat = msg; abonnes.forEach(cb => { try { cb(msg); } catch (err) {} }); });

contextBridge.exposeInMainWorld('api', {
  estElectron: true,
  /* état / commandes */
  patch: p => ipcRenderer.send('patch', p),
  deconnecter: () => ipcRenderer.send('deconnecter'),
  reconnecter: () => ipcRenderer.send('reconnecter'),
  vider: () => ipcRenderer.send('vider'),
  quitter: () => ipcRenderer.send('quitter'),
  onEtat: cb => { abonnes.push(cb); if (dernierEtat) cb(dernierEtat); },
  /* contenu (lu par le processus principal, hors réseau) */
  indexContenu: () => ipcRenderer.invoke('contenu:index'),
  brochure: id => ipcRenderer.invoke('contenu:brochure', id),
  cantique: id => ipcRenderer.invoke('contenu:cantique', id),
  chapitre: (ab, ch) => ipcRenderer.invoke('contenu:chapitre', ab, ch),
  /* données persistantes (réserve, historique, réglages, dernier élément, cantiques) */
  lireDonnees: nom => ipcRenderer.invoke('donnees:lire', nom),
  ecrireDonnees: (nom, v) => ipcRenderer.invoke('donnees:ecrire', nom, v),
  enregistrerCantique: (id, modif) => ipcRenderer.invoke('cantique:enregistrer', id, modif),
  ajouterCantique: c => ipcRenderer.invoke('cantique:ajouter', c),
  supprimerCantique: id => ipcRenderer.invoke('cantique:supprimer', id),
  /* divers */
  choisirImage: () => ipcRenderer.invoke('image:choisir'),
  journal: () => ipcRenderer.invoke('journal:lire'),
  ouvrirDossier: () => ipcRenderer.invoke('dossier:ouvrir'),
  infos: () => ipcRenderer.invoke('infos')
});
