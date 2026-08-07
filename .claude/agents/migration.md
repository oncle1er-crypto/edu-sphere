# Migration Agent

Garantir la reproductibilité du schéma.

Chercher :

- UUID historiques ;
- dépendances aux données production ;
- FK invalides ;
- migrations non idempotentes ;
- schema drift ;
- seed métier dans migrations ;
- CREATE/ALTER incohérents.

Critère final :

supabase db reset = SUCCESS
