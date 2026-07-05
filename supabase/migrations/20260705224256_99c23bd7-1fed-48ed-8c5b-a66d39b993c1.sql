CREATE OR REPLACE FUNCTION public.cloturer_et_basculer_annee(p_ecole_id uuid, p_annee_source uuid, p_annee_cible uuid, p_dry_run boolean DEFAULT true)
 RETURNS TABLE(etape text, niveau text, element text, detail text)
 LANGUAGE plpgsql
AS $function$
declare
  v_src record;
  v_cib record;
  v_bloquants int := 0;
  r record;
  v_new_classe_id uuid;
begin
  create temp table if not exists _bascule_rapport (
    b_etape text, b_niveau text, b_element text, b_detail text
  ) on commit drop;
  truncate _bascule_rapport;

  select * into v_src from public.annees_scolaires
   where id = p_annee_source and ecole_id = p_ecole_id;
  if v_src is null then
    return query select 'controle','bloquant','annee_source','Année source introuvable pour cette école'; return;
  end if;
  if v_src.statut <> 'active' then
    insert into _bascule_rapport values ('controle','bloquant','annee_source',
      'L''année source doit être active (actuel : '||v_src.statut||')');
    v_bloquants := v_bloquants + 1;
  end if;

  select * into v_cib from public.annees_scolaires
   where id = p_annee_cible and ecole_id = p_ecole_id;
  if v_cib is null then
    return query select 'controle','bloquant','annee_cible','Année cible introuvable pour cette école'; return;
  end if;
  if p_annee_cible = p_annee_source then
    return query select 'controle','bloquant','annee_cible','Année cible identique à la source'; return;
  end if;
  if v_cib.statut <> 'preparation' then
    insert into _bascule_rapport values ('controle','bloquant','annee_cible',
      'L''année cible doit être en préparation (actuel : '||v_cib.statut||')');
    v_bloquants := v_bloquants + 1;
  end if;
  if v_cib.debut <= v_src.debut then
    insert into _bascule_rapport values ('controle','bloquant','annee_cible',
      'L''année cible doit être postérieure à la source');
    v_bloquants := v_bloquants + 1;
  end if;

  for r in
    select e.id, e.nom, e.prenom, d.id as decision_id, d.statut as dstatut, d.decision,
           d.classe_destination_id, cd.nom as dest_nom, e.classe_id, co.nom as origine_nom
    from public.eleves e
    left join public.decisions_fin_annee d
      on d.eleve_id = e.id and d.annee_id = p_annee_source and d.ecole_id = p_ecole_id
    left join public.classes cd on cd.id = d.classe_destination_id
    left join public.classes co on co.id = e.classe_id
    where e.ecole_id = p_ecole_id and e.annee_id = p_annee_source
      and coalesce(e.statut,'') <> 'sorti'
  loop
    if r.decision_id is null then
      insert into _bascule_rapport values ('controle','bloquant', r.nom||' '||r.prenom,
        'Aucune décision de fin d''année');
      v_bloquants := v_bloquants + 1;
    elsif r.dstatut not in ('valide','verrouille','applique') then
      insert into _bascule_rapport values ('controle','bloquant', r.nom||' '||r.prenom,
        'Décision non validée (statut : '||coalesce(r.dstatut,'?')||')');
      v_bloquants := v_bloquants + 1;
    elsif r.decision in ('passage','admis') and r.classe_destination_id is null then
      insert into _bascule_rapport values ('controle','bloquant', r.nom||' '||r.prenom,
        'Décision "'||r.decision||'" sans classe de destination');
      v_bloquants := v_bloquants + 1;
    elsif r.decision not in ('passage','admis','redoublement','redouble','maintien',
                             'exclusion','fin_cycle','depart','sortie','radiation','transfert') then
      insert into _bascule_rapport values ('controle','bloquant', r.nom||' '||r.prenom,
        'Décision inconnue : "'||r.decision||'"');
      v_bloquants := v_bloquants + 1;
    end if;
  end loop;

  for r in
    select e.nom, e.prenom, count(*) as nb
    from public.decisions_fin_annee d
    join public.eleves e on e.id = d.eleve_id
    where d.ecole_id = p_ecole_id and d.annee_id = p_annee_source
    group by e.id, e.nom, e.prenom having count(*) > 1
  loop
    insert into _bascule_rapport values ('controle','bloquant', r.nom||' '||r.prenom,
      r.nb||' décisions pour le même élève');
    v_bloquants := v_bloquants + 1;
  end loop;

  if v_bloquants > 0 then
    insert into _bascule_rapport values ('resultat','bloquant','bascule',
      v_bloquants||' point(s) bloquant(s) — aucune modification effectuée');
    return query select b_etape, b_niveau, b_element, b_detail from _bascule_rapport;
    return;
  end if;

  for r in
    select e.id as eleve_id, e.nom, e.prenom, e.classe_id, d.decision,
           d.classe_destination_id, co.nom as origine_nom, cd.nom as dest_nom
    from public.eleves e
    join public.decisions_fin_annee d
      on d.eleve_id = e.id and d.annee_id = p_annee_source and d.ecole_id = p_ecole_id
    left join public.classes co on co.id = e.classe_id
    left join public.classes cd on cd.id = d.classe_destination_id
    where e.ecole_id = p_ecole_id and e.annee_id = p_annee_source
      and coalesce(e.statut,'') <> 'sorti'
  loop
    if not p_dry_run then
      insert into public.parcours_scolaire
        (ecole_id, eleve_id, annee_id, classe_id, decision, classe_destination_id)
      values (p_ecole_id, r.eleve_id, p_annee_source, r.classe_id, r.decision, r.classe_destination_id)
      on conflict (ecole_id, eleve_id, annee_id) do update
        set decision = excluded.decision,
            classe_destination_id = excluded.classe_destination_id,
            updated_at = now();
    end if;
    insert into _bascule_rapport values ('archivage_parcours','info', r.nom||' '||r.prenom,
      coalesce(r.origine_nom,'?')||' — décision : '||r.decision);

    if r.decision in ('passage','admis','transfert') then
      select c.id into v_new_classe_id from public.classes c
      where c.ecole_id = p_ecole_id and c.annee_id = p_annee_cible and c.nom = r.dest_nom;
      if v_new_classe_id is null then
        if not p_dry_run then
          insert into public.classes (ecole_id, annee_id, nom, cycle_id, capacite)
          select p_ecole_id, p_annee_cible, c.nom, c.cycle_id, c.capacite
          from public.classes c where c.id = r.classe_destination_id
          returning id into v_new_classe_id;
        end if;
        insert into _bascule_rapport values ('classes','info', coalesce(r.dest_nom,'?'),
          'Classe créée dans l''année cible');
      end if;
      if not p_dry_run then
        update public.eleves set annee_id = p_annee_cible, classe_id = v_new_classe_id
        where id = r.eleve_id;
      end if;
      insert into _bascule_rapport values ('reinscription','info', r.nom||' '||r.prenom,
        r.decision||' → '||coalesce(r.dest_nom,'?'));

    elsif r.decision in ('redoublement','redouble','maintien') then
      select c.id into v_new_classe_id from public.classes c
      where c.ecole_id = p_ecole_id and c.annee_id = p_annee_cible and c.nom = r.origine_nom;
      if v_new_classe_id is null then
        if not p_dry_run then
          insert into public.classes (ecole_id, annee_id, nom, cycle_id, capacite)
          select p_ecole_id, p_annee_cible, c.nom, c.cycle_id, c.capacite
          from public.classes c where c.id = r.classe_id
          returning id into v_new_classe_id;
        end if;
        insert into _bascule_rapport values ('classes','info', coalesce(r.origine_nom,'?'),
          'Classe créée dans l''année cible');
      end if;
      if not p_dry_run then
        update public.eleves set annee_id = p_annee_cible, classe_id = v_new_classe_id
        where id = r.eleve_id;
      end if;
      insert into _bascule_rapport values ('reinscription','info', r.nom||' '||r.prenom,
        'Redoublement → '||coalesce(r.origine_nom,'?'));

    else
      if not p_dry_run then
        update public.eleves set statut = 'sorti' where id = r.eleve_id;
      end if;
      insert into _bascule_rapport values ('reinscription','info', r.nom||' '||r.prenom,
        'Non réinscrit ('||r.decision||') — statut passé à "sorti", archivé sur '||v_src.libelle);
    end if;
  end loop;

  if not p_dry_run then
    update public.annees_scolaires set statut = 'archivee' where id = p_annee_source;
    update public.annees_scolaires set statut = 'active'   where id = p_annee_cible;
  end if;
  insert into _bascule_rapport values ('annees','info', v_src.libelle||' → '||v_cib.libelle,
    case when p_dry_run then 'SIMULATION — aucune écriture effectuée'
         else 'Année '||v_src.libelle||' archivée, '||v_cib.libelle||' activée' end);

  return query select b_etape, b_niveau, b_element, b_detail from _bascule_rapport;
end;
$function$;