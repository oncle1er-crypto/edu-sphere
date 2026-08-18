-- Accès scindé "secretaire" sur les dépenses : peut créer et modifier des
-- dépenses tant qu'elles sont en brouillon ("en_attente"), afin d'imprimer
-- ensuite un bon de sortie de caisse ou une fiche de paiement à signer.
-- Ne peut jamais valider, rejeter, ni rouvrir une dépense déjà tranchée par
-- admin/comptable (cf. politique "ecole_write" déjà en place, qui reste la
-- seule à autoriser une transition de statut).
--
-- Décision produit du 17/08/2026 : secrétaire garde ses actions actuelles
-- (eleves/classes/cartes/communication/services_ponctuels/vie_scolaire,
-- inchangées) et gagne uniquement : création/édition de brouillons de
-- dépenses + lecture de Bilan comptable et Rapports financiers (déjà
-- couverte par la policy SELECT existante "ecole_read", aucune écriture
-- nouvelle nécessaire sur ces deux vues).

CREATE POLICY "depenses_secretaire_insert_brouillon"
ON public.depenses FOR INSERT
TO authenticated
WITH CHECK (
  private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  AND statut = 'en_attente'
);

CREATE POLICY "depenses_secretaire_update_brouillon"
ON public.depenses FOR UPDATE
TO authenticated
USING (
  private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  AND statut = 'en_attente'
)
WITH CHECK (
  private.has_ecole_role(auth.uid(), ecole_id, 'secretaire'::app_role)
  AND statut = 'en_attente'
);

-- Deux nouveaux modules d'accès fin, distincts du module "finances" global
-- (qui reste réservé admin/comptable/directeur — Salaires, Budget,
-- Trésorerie restent hors de portée de secretaire). Le code applicatif
-- (RequirePerm/FinanceLayout/ModulesGrid) les traite comme des clés
-- indépendantes, pas comme des sous-modules du module "finances".
INSERT INTO public.app_modules (key, label, icon, ordre) VALUES
  ('finances.depenses', 'Finances — Dépenses (accès restreint)', NULL, 104),
  ('finances.bilan_rapports', 'Finances — Bilan & Rapports (lecture)', NULL, 105)
ON CONFLICT (key) DO NOTHING;

-- role_permissions est scindé par école (contrainte unique
-- (ecole_id, role, module_key), pas juste (role, module_key)) — ces deux
-- clés étant en dehors du motif "%.%" exclu par seed_role_permissions_for_ecole,
-- elles ne sont pas seedées automatiquement pour les écoles déjà existantes ni
-- pour une future nouvelle école : on les insère explicitement ici, pour
-- toutes les écoles actuelles.
INSERT INTO public.role_permissions (ecole_id, role, module_key, can_view, can_create, can_update, can_delete, can_export)
SELECT id, 'secretaire'::public.app_role, 'finances.depenses', true, true, true, false, false
FROM public.ecoles
ON CONFLICT (ecole_id, role, module_key) DO NOTHING;

INSERT INTO public.role_permissions (ecole_id, role, module_key, can_view, can_create, can_update, can_delete, can_export)
SELECT id, 'secretaire'::public.app_role, 'finances.bilan_rapports', true, false, false, false, true
FROM public.ecoles
ON CONFLICT (ecole_id, role, module_key) DO NOTHING;
