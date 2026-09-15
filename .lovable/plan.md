# Pourquoi certains élèves de CM1 affichent 135 000 F au lieu de 175 000 F

## Ce que dit la base

Le tarif CM1 de l'année en cours est unique : **175 000 F** (80 000 + 55 000 + 40 000).
Vérifié en base : les 37 élèves actifs de CM1 ont bien chacun 3 échéances pour un total de 175 000 F. Aucun élève de CM1 n'a un total de 135 000 F.

135 000 F = 80 000 + 55 000, c'est-à-dire **la 3e échéance (40 000 F) manquante à l'affichage**.

## Cause

L'écran Finances lit les échéances de l'année active en une seule requête, sans pagination. La base renvoie au maximum **1 000 lignes** par requête, or l'année active compte **1 038 échéances**. Comme la requête est triée par numéro d'échéance, les 38 dernières lignes coupées sont toutes des 3es échéances : les élèves concernés (dont 8 en CM1) apparaissent avec un dû amputé de leur dernière échéance.

Conséquence : le « Dû », le « Reste », le total de la classe (6 155 000 au lieu de 6 475 000) et les taux de recouvrement sont sous-évalués pour ces élèves. Les données en base sont correctes ; seul l'affichage est faux.

## Correction proposée

Dans `src/pages/finances/useFinanceData.ts`, récupérer les échéances par pages de 1 000 lignes (même boucle `range()` que celle déjà utilisée pour les paiements juste en dessous), jusqu'à épuisement, puis poursuivre le traitement inchangé.

Détails techniques :
- boucle `for` avec `.range(offset, offset + 999)` sur la requête `tranches` (avec et sans scope année), plafond de sécurité identique à celui des paiements ;
- ordre `numero` conservé ; aucun changement de calcul, de RLS ni de schéma.

## Vérification

- Recompter : le total CM1 doit passer à 6 475 000 F et chaque élève à 175 000 F.
- Contrôler qu'aucune autre classe n'affiche plus un dû non conforme à sa grille tarifaire.
- Typecheck du projet.
