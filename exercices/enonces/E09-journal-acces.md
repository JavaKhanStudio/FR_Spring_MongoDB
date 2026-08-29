# E09 — Le journal d'accès

**Module** `$bucket`, fenêtres temporelles · **J2 après-midi** · **Hors-piste** · ★★ · ~30 min

## Contexte

Tu analyses le journal d'accès HTTP d'un serveur web. Aucun navire : c'est
volontaire. L'enjeu est de savoir agréger sur un **axe temporel**, un cas que
le référentiel AMIRAUTE ne met pas assez en tension.

## Ce dont tu disposes

```bash
make charger F=exercices/corriges/E09-amorce.js
```

Crée `ex_acces` avec **150 000** entrées sur 7 jours :

```json
{
  "horodatage": "2026-08-19T14:32:11Z",
  "chemin": "/api/produits",
  "methode": "GET",
  "codeStatut": 200,
  "dureeMs": 87,
  "octets": 4210,
  "ip": "10.4.22.7",
  "agent": "navigateur"
}
```

## Travail demandé

1. Nombre de requêtes par **heure** sur toute la période, triées
   chronologiquement.
2. Répartition des `codeStatut` par famille : 2xx, 3xx, 4xx, 5xx. Utiliser
   `$bucket`.
3. Répartition des temps de réponse en tranches : < 50 ms, 50–200, 200–1000,
   ≥ 1000. Pour chaque tranche, le nombre de requêtes et le chemin le plus
   fréquent.
4. Les 5 chemins les plus lents **en moyenne**, en ne retenant que ceux
   appelés au moins 500 fois.
5. Le **taux d'erreur** (statut ≥ 400) par chemin, en pourcentage, trié
   décroissant. N'afficher que les chemins dépassant 5 %.
6. Trouver la **fenêtre de 10 minutes** ayant reçu le plus de requêtes.
7. Volume total transféré (`octets`) par jour, en mégaoctets.

## Résultat attendu

Les chiffres exacts dépendent du générateur, mais les formes doivent être :

1. **168 lignes** (7 jours × 24 h), sans trou.
2. Quatre familles. Les `2xx` dominent largement.
3. Quatre tranches ; la plus peuplée est **50–200 ms**.
4. `/api/rapports` doit sortir en tête — le générateur le rend délibérément
   lent.
5. `/api/paiement` doit dépasser 5 % — même raison.
6. Une fenêtre unique, avec sa date de début.
7. 7 lignes, une par jour.

**Le vrai critère de réussite** : chaque pipeline doit commencer par un
`$match` ou une étape qui réduit le flux, et n'utiliser `$sort` qu'après
`$group`. Vérifie-le avec `explain()`.

## Pour aller plus loin

À la question 6, tu as probablement arrondi l'horodatage à la tranche de
10 minutes. Il existe au moins deux façons de le faire : avec `$dateTrunc`, et
avec de l'arithmétique sur la date.

Laquelle est la plus lisible ? Et surtout : laquelle survit à un changement de
fuseau horaire ?
