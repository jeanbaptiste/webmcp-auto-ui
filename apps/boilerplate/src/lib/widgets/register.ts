import { createWebMcpServer } from '@webmcp-auto-ui/core';
import FicheDepute from './FicheDepute.svelte';
import ResultatScrutin from './ResultatScrutin.svelte';
import Amendement from './Amendement.svelte';

export const tricoteusesServer = createWebMcpServer('tricoteuses-widgets', {
  description: 'Widgets parlementaires francais — fiches deputes, scrutins, amendements.',
});

// ── Widget 1 — Fiche Depute ──────────────────────────────────────────────
tricoteusesServer.registerWidget(`---
widget: fiche-depute
description: Fiche d'un depute de l'Assemblee nationale. Photo, groupe, circonscription, stats de vote.
schema:
  type: object
  required:
    - nom
    - prenom
    - groupe
  properties:
    nom:
      type: string
    prenom:
      type: string
    photo:
      type: string
      description: "URL de la photo"
    groupe:
      type: string
      description: "Nom du groupe politique"
    groupeCouleur:
      type: string
      description: "Couleur hex du groupe"
    circonscription:
      type: string
    mandatDebut:
      type: string
    mandatFin:
      type: string
    actif:
      type: boolean
    participation:
      type: number
      description: "Taux de participation en %"
    votePour:
      type: number
    voteContre:
      type: number
    voteAbstention:
      type: number
---
Affiche la fiche d'un depute de l'Assemblee nationale francaise.
Inclut la photo, le groupe politique avec sa couleur, la circonscription,
les dates de mandat, le taux de participation et la repartition des votes.
`, FicheDepute);

// ── Widget 2 — Resultat de Scrutin ───────────────────────────────────────
tricoteusesServer.registerWidget(`---
widget: resultat-scrutin
description: Resultat d'un scrutin de l'Assemblee nationale. Titre, resultat, repartition des votes.
schema:
  type: object
  required:
    - titre
    - pour
    - contre
  properties:
    titre:
      type: string
    numero:
      type: number
    date:
      type: string
    pour:
      type: number
    contre:
      type: number
    abstentions:
      type: number
    votants:
      type: number
    adopte:
      type: boolean
---
Affiche le resultat d'un scrutin de l'Assemblee nationale.
Barre proportionnelle pour/contre/abstention, nombre de votants,
badge "Adopte" ou "Rejete".
`, ResultatScrutin);

// ── Widget 3 — Amendement ────────────────────────────────────────────────
tricoteusesServer.registerWidget(`---
widget: amendement
description: Amendement parlementaire. Numero, article, auteur, motifs, sort.
schema:
  type: object
  required:
    - numero
    - article
    - auteur
    - sort
  properties:
    numero:
      type: string
    article:
      type: string
      description: "Article de loi vise"
    auteur:
      type: string
    groupe:
      type: string
    exposeMotifs:
      type: string
      description: "Texte de l'expose des motifs"
    sort:
      type: string
      enum:
        - adopte
        - rejete
        - retire
        - non_soutenu
    date:
      type: string
---
Affiche un amendement parlementaire avec son numero, l'article vise,
l'auteur, l'expose des motifs et le sort (adopte, rejete, retire, non soutenu).
`, Amendement);
