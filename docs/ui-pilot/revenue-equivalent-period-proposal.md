# Revenue comparison — proposition de comparaison à périodes équivalentes

Statut : **proposition, non implémentée**. Aucun calcul, endpoint ou schéma n’a été modifié
dans cette passe. Décision métier attendue avant de toucher à la méthodologie.

Périmètre : `/reports` (onglet *Revenue comparison*) et `/direction` (onglet *Comparaison*),
qui partagent `/api/reports/revenue-comparison`.

## 1. Sources réellement disponibles

Inspection de la base locale le 27 octobre 2026 :

| Source | 2025 | 2026 |
| --- | --- | --- |
| `daily_entries` | **0 ligne** | Jan→oct. renseignés ; dernières lignes utiles le **26 oct.** |
| `monthly_revenue_by_location` (vue) | **0 ligne** | Jan→oct. réels + 4 lignes à 0 en nov./déc. (2 boutiques) |
| `monthly_revenue_inputs` | 42 lignes, **2 à 4 boutiques par mois** | **0 ligne** |

Conséquences :

- L’année précédente **n’existe qu’au mois**, et seulement pour une partie des boutiques.
  Aucune donnée journalière 2025 ne permet une comparaison « mêmes jours ».
- Nov./déc. 2026 contiennent des **lignes de remplissage à zéro** (2 boutiques), pas des
  ventes. Elles ne doivent pas être lues comme des mois réels.
- Octobre 2026 : les 8 boutiques ont une ligne, mais le **27 oct. est à zéro** (saisie non
  faite) ; le 26 oct. est la dernière journée entièrement renseignée.

## 2. Dernière date réellement complète

**Niveau jour : 26 octobre 2026.** Les 8 boutiques ont une ligne non nulle, dernière mise à
jour le 26/10 à 17:02 UTC. Le 27/10 a 8 lignes à zéro ; le 28–31 et nov./déc. n’ont que
2 lignes à zéro.

**Niveau mois : septembre 2026.** Octobre est en cours.

Règle proposée (calculée côté serveur, heure de Bangkok) : dernière date `< aujourd’hui` où
**toutes les boutiques sélectionnées** ont une ligne et un chiffre d’affaires `> 0`.

## 3. Couverture 2025 (janv.–sept.)

| Boutique | Mois renseignés (sur 9) |
| --- | --- |
| Samui | 9/9 |
| Phangan | 9/9 |
| Ekkamai | 8/9 (janvier manquant) |
| Silom | 4/9 (juin→sept.) |
| Chiang Mai, Karon, Laguna, Pattaya | 0/9 |

Donc :

- **Total toutes boutiques** : 8 boutiques en 2026 contre 2 à 4 en 2025. Les deux totaux ne
  mesurent pas le même périmètre.
- **Boutiques comparables janv.–sept.** : Samui + Phangan (2 boutiques).
- **Boutiques comparables févr.–sept.** : Samui + Phangan + Ekkamai (3 boutiques).
- **Octobre** : 4 boutiques renseignées (Ekkamai, Phangan, Samui, Silom) contre 8 en 2026.

## 4. Options

### A. Cumul à période complète — recommandée

Comparer **1er janvier → 30 septembre 2026** avec **1er janvier → 30 septembre 2025**, et
afficher deux totaux distincts :

1. **Toutes boutiques** — avec la couverture affichée ; les mois sans donnée ne sont pas
   additionnés comme des zéros, ils sont signalés comme manquants.
2. **Boutiques comparables** — un **groupe fixe** de boutiques couvertes sur **tous les mois
   de la période, dans les deux années**. Le groupe est choisi une fois pour toute la
   comparaison ; il ne change pas d’un mois à l’autre. Une boutique qui manque un seul mois
   est exclue du groupe comparable (elle n’est pas complétée par 0).

Avec les données actuelles (janv.–sept.) : **Samui + Phangan** (2 boutiques). Sur
févr.–sept. : Samui + Phangan + Ekkamai (3 boutiques). La période recommandée reste
janv.–sept., avec la liste des boutiques exclues et le nombre de mois manquants affichés.

Le mois sélectionné et l’année complète restent des cartes séparées, inchangées.

**Règle de données** : la présence d’une ligne source fait foi, pas la valeur. Un mois sans
ligne est **absent**, jamais `0`. Un montant `0` explicitement saisi reste `0`.

### B. Mois en cours, mêmes jours — impossible sans estimation

Comparer 1–26 octobre 2026 avec 1–26 octobre 2025 exigerait des données journalières 2025.
Elles n’existent pas. Proratiser le total mensuel 2025 (26/31) produirait un **estimé**,
à étiqueter comme tel ; non recommandé pour un chiffre financier.

### C. Mois complet vs mois complet

Comparer septembre 2026 à septembre 2025 : les deux mois sont complets. Utile en
complément, mais déjà contenu dans le cumul janv.–sept.

### D. Remplacer silencieusement le cumul actuel — à éviter

Le cumul actuel (janv.→mois choisi) et le mois sélectionné restent des lectures utiles.
Les remplacer sans indiquer la rupture de méthodologie rendrait les écarts incomparables
d’une version à l’autre.

## 5. Impact technique si l’option A est retenue

- **API** : ajout additif à `/api/reports/revenue-comparison` :
  - `byShopMonth: { locationId, month, current, prev, currentPresent, prevPresent }[]`
    (nécessaire pour calculer le groupe fixe ; la réponse actuelle n’a que `byMonth` agrégé
    et `byShopFocus`).
  - `comparable: { throughMonth, shops, current, prev, excluded, missing }`.
  - `coverage: { currentShops, prevShops, fullMonths }`.
- **Règle de sélection** : le groupe comparable est l’intersection des boutiques ayant une
  ligne source pour **chaque** mois de la période, sur **les deux années**. Le groupe est
  calculé une fois, puis utilisé pour les deux totaux. Aucun remplissage par zéro.
- **UI** : nouvelle carte « Période équivalente (janv.–sept.) » avec bascule
  *Toutes boutiques / Boutiques comparables* ; libellés de couverture ; liste des boutiques
  exclues. Aucune modification des cartes existantes.
- **Aucune modification** de `monthly_revenue_by_location`, des inputs ou des calculs
  existants. Le nouveau calcul est une agrégation en lecture des mêmes données.
- Tests : présence vs absence de ligne (un `0` saisi reste `0`), groupe fixe identique sur
  toute la période, exclusion d’une boutique à un seul mois manquant, dernier mois complet,
  absence de division par zéro.

## 6. Limites à valider

- Le groupe comparable janv.–sept. ne contient que **2 boutiques** : il n’est pas
  représentatif du groupe, même s’il est méthodologiquement juste.
- Le groupe est **fixe** : une boutique qui n’a pas tous ses mois est exclue de la
  comparaison, même si elle a des mois exploitables. C’est le prix de la comparabilité.
- Les inputs 2025 sont **mensuels et manuels** : pas de granularité jour, pas de charges,
  pas de marge.
- Une donnée absente ne doit **jamais** être comptée comme zéro dans le périmètre comparable.
  Le cumul actuel, lui, additionne l’existant ; c’est précisément ce que la nouvelle vue
  doit rendre explicite.
- La couverture 2025 peut encore changer si des mois sont saisis a posteriori.
- La date complète dépend des saisies ; elle doit être recalculée à chaque requête, pas
  figée dans le code.
- Décision métier : faut-il publier un panier à 2 boutiques, ou attendre une couverture
  2025 plus complète avant d’afficher un écart officiel ?
