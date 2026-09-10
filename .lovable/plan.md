# Menu latéral : la page ne s'affiche qu'au second clic

## Ce que j'ai vérifié

- Le menu de « Paiements & Comptabilité » utilise des liens standards et les pages sont bien déclarées une par une (aucun lien cassé).
- Chaque page du module est protégée par un contrôle d'accès qui **recharge les droits de l'utilisateur à chaque changement de page** (deux appels au serveur), en affichant un écran de chargement pendant ce temps.
- **Le même schéma est utilisé dans 20 autres modules** (Élèves, Personnel, Cantine, Transport, Examens, Bibliothèque, Vie scolaire, Cartes, Paramètres, Services ponctuels, etc.) : si la cause est bien là, le comportement est identique partout, simplement plus visible sur Paiements où les pages sont plus lourdes.
- La page ne remonte pas en haut lors d'un changement de section : si l'on est en bas de page, le nouveau contenu peut sembler ne pas s'être chargé, ce qui pousse à cliquer une seconde fois.

Je n'affirme pas encore la cause exacte : les deux pistes ci-dessus expliquent le symptôme, mais elles doivent être confirmées par une reproduction réelle avant correction.

## Plan proposé

1. **Reproduire et mesurer** : parcourir le menu Paiements dans le navigateur, enregistrer ce qui se passe au premier clic (adresse, écran de chargement, position de la page) pour identifier la cause exacte, puis faire le même test dans un second module pour confirmer si c'est général.
2. **Supprimer le rechargement des droits à chaque page** : les droits sont chargés une seule fois et partagés par toute l'application (mise en cache), au lieu d'être redemandés au serveur à chaque clic. Effet attendu : la page s'affiche immédiatement, sans écran d'attente intermédiaire.
3. **Remonter automatiquement en haut** du contenu à chaque changement de section, pour que le nouvel écran soit visible tout de suite.
4. **Vérifier** : premier clic sur chaque entrée du menu Paiements, puis contrôle rapide sur deux autres modules, et vérification qu'aucune erreur n'apparaît.

## Détails techniques

- `usePermissions()` est instancié indépendamment par chaque `RequirePerm` (un par route) et par chaque layout ; il démarre avec `loading = true` et relance `user_roles` + `rpc get_effective_permissions` à chaque montage. Correctif : déplacer la résolution des permissions dans un contexte unique (ou un `useQuery` React Query avec `staleKey` `[user.id, ecoleId]` et `staleTime` long), en conservant l'API actuelle `{ can, isAdmin, loading, reload }` pour ne rien casser côté appelants.
- Ajouter un `ScrollToTop` sur changement de `location.pathname` dans `AppLayout`, ou un `scrollTo({ top: 0 })` dans le conteneur animé des layouts.
- Aucun changement de base de données, aucune règle métier touchée.
