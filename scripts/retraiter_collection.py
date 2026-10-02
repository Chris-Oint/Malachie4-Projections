#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Retraitement de la collection — règle demandée par l'église :

    La collection ne retient QUE trois traductions :
      1. VGR-OFF  « La Voix de Dieu » (officiel, Voice of God Recordings)  → étiquette  VGR
      2. SHP      Shekinah Publications                                     → étiquette  Shekinah
      3. BF       branham.fr (Restauration Promise)                         → étiquette  BF   (jamais « VGR »)

    · les textes de branham.fr ne sont gardés QUE si la brochure n'existe ni en
      Shekinah ni en VGR officiel (« traduite par elle seule ») ;
    · tout le reste (MS, BBV, autres) est retiré de la collection et de la
      bibliothèque (fichiers compris).

Le script est reproductible : il peut être relancé sans risque (idempotent).

    python3 scripts/retraiter_collection.py [--depot=/chemin/vers/le/depot] [--simulation]
"""
import json, os, sys, collections

def main():
    depot = '/tmp/malachie4-depot'
    simulation = False
    for a in sys.argv[1:]:
        if a.startswith('--depot='): depot = a.split('=', 1)[1]
        elif a == '--simulation': simulation = True
    data = os.path.join(depot, 'data')
    chemin_index = os.path.join(data, 'index.json')

    idx = json.load(open(chemin_index, encoding='utf-8'))
    sermons = idx['sermons']
    avant = collections.Counter(x['trad'] for x in sermons)

    # codes traduits par chaque source
    par_code = collections.defaultdict(set)
    for x in sermons:
        par_code[x['code']].add(x['trad'])

    gardes, retires = [], []
    for x in sermons:
        t = x['trad']
        if t in ('SHP', 'VGR-OFF'):
            gardes.append(x)
        elif t == 'VGR':                                  # branham.fr
            if {'SHP', 'VGR-OFF'} & par_code[x['code']]:
                retires.append(x)                          # déjà présente : on ne double pas
            else:
                x = dict(x)
                x['trad'] = 'BF'                           # jamais appelé « VGR »
                x['source'] = 'branham.fr (Restauration Promise)'
                gardes.append(x)
        else:                                              # MS, BBV, tout le reste
            retires.append(x)

    apres = collections.Counter(x['trad'] for x in gardes)

    # --- fichiers de charge à supprimer ---
    fichiers = []
    for x in retires:
        f = os.path.join(data, x.get('dir') or 'sermons', x['id'] + '.json.gz')
        if os.path.exists(f):
            fichiers.append(f)

    print('AVANT  : ' + ' · '.join(f'{k} {v}' for k, v in avant.most_common()))
    print('APRÈS  : ' + ' · '.join(f'{k} {v}' for k, v in apres.most_common()))
    print(f'total  : {len(sermons)} → {len(gardes)} textes')
    print(f'retirés: {len(retires)} textes ({", ".join(sorted({x["trad"] for x in retires}))})')
    print(f'fichiers à supprimer : {len(fichiers)}')
    for f in sorted(fichiers)[:5]:
        print('   ' + os.path.relpath(f, depot))
    if len(fichiers) > 5: print(f'   … et {len(fichiers) - 5} autres')

    if simulation:
        print('(simulation : rien n’a été modifié)')
        return

    # --- mise à jour de l'index ---
    idx['sermons'] = gardes
    idx['source'] = ('bibliothèque du Message — traductions La Voix de Dieu (officiel VGR), '
                     'Shekinah Publications et branham.fr (BF)')
    idx['nomenclature'] = {
        'VGR-OFF': 'La Voix de Dieu — Voice of God Recordings (officiel)',
        'SHP': 'Shekinah Publications',
        'BF': 'branham.fr (Restauration Promise) — jamais appelée « La Voix de Dieu »',
        'regle': 'Une brochure n’apparaît qu’une fois par traduction ; les textes de branham.fr ne sont '
                 'conservés que si la brochure n’existe ni en Shekinah ni en VGR officiel.'
    }
    idx['vgr_officiel'] = {'count': apres['VGR-OFF'],
                           'source': 'VGR officiel (themessage.com) — La Voix de Dieu',
                           'audio': avant_audio(gardes)}
    json.dump(idx, open(chemin_index, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    for f in fichiers:
        os.remove(f)

    # --- dossiers vides ---
    for dossier in ('sermons', 'vgr'):
        d = os.path.join(data, dossier)
        if os.path.isdir(d) and not os.listdir(d):
            os.rmdir(d)

    print('index mis à jour et fichiers retirés.')

def avant_audio(gardes):
    return sum(1 for x in gardes if x['trad'] == 'VGR-OFF' and (x.get('audio') or x.get('mp3')))

if __name__ == '__main__':
    main()
