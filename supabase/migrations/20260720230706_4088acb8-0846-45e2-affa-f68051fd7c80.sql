
INSERT INTO public.role_permissions (ecole_id, role, module_key, can_view, can_create, can_update, can_delete, can_export)
SELECT e.id, 'admin'::app_role, 'services_ponctuels', true, true, true, true, true FROM public.ecoles e
ON CONFLICT (ecole_id, role, module_key) DO NOTHING;

INSERT INTO public.role_permissions (ecole_id, role, module_key, can_view, can_create, can_update, can_delete, can_export)
SELECT e.id, 'directeur'::app_role, 'services_ponctuels', true, true, true, true, true FROM public.ecoles e
ON CONFLICT (ecole_id, role, module_key) DO NOTHING;

INSERT INTO public.role_permissions (ecole_id, role, module_key, can_view, can_create, can_update, can_delete, can_export)
SELECT e.id, 'comptable'::app_role, 'services_ponctuels', true, true, true, false, true FROM public.ecoles e
ON CONFLICT (ecole_id, role, module_key) DO NOTHING;

INSERT INTO public.role_permissions (ecole_id, role, module_key, can_view, can_create, can_update, can_delete, can_export)
SELECT e.id, 'secretaire'::app_role, 'services_ponctuels', true, true, true, false, false FROM public.ecoles e
ON CONFLICT (ecole_id, role, module_key) DO NOTHING;
