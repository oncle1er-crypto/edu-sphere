export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abonnements_cantine: {
        Row: {
          annee_id: string
          created_at: string
          ecole_id: string
          eleve_id: string
          grille_id: string | null
          id: string
          montant_mensuel: number | null
          regime: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          annee_id: string
          created_at?: string
          ecole_id: string
          eleve_id: string
          grille_id?: string | null
          id?: string
          montant_mensuel?: number | null
          regime?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          annee_id?: string
          created_at?: string
          ecole_id?: string
          eleve_id?: string
          grille_id?: string | null
          id?: string
          montant_mensuel?: number | null
          regime?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "abonnements_cantine_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abonnements_cantine_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abonnements_cantine_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abonnements_cantine_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "v_conformite_sigfne"
            referencedColumns: ["eleve_id"]
          },
          {
            foreignKeyName: "abonnements_cantine_grille_id_fkey"
            columns: ["grille_id"]
            isOneToOne: false
            referencedRelation: "grille_tarifs_services"
            referencedColumns: ["id"]
          },
        ]
      }
      abonnements_transport: {
        Row: {
          annee_id: string
          created_at: string
          ecole_id: string
          eleve_id: string
          grille_id: string | null
          id: string
          ligne_id: string
          statut: string
        }
        Insert: {
          annee_id: string
          created_at?: string
          ecole_id: string
          eleve_id: string
          grille_id?: string | null
          id?: string
          ligne_id: string
          statut?: string
        }
        Update: {
          annee_id?: string
          created_at?: string
          ecole_id?: string
          eleve_id?: string
          grille_id?: string | null
          id?: string
          ligne_id?: string
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "abonnements_transport_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abonnements_transport_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abonnements_transport_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abonnements_transport_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "v_conformite_sigfne"
            referencedColumns: ["eleve_id"]
          },
          {
            foreignKeyName: "abonnements_transport_grille_id_fkey"
            columns: ["grille_id"]
            isOneToOne: false
            referencedRelation: "grille_tarifs_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abonnements_transport_ligne_id_fkey"
            columns: ["ligne_id"]
            isOneToOne: false
            referencedRelation: "lignes_transport"
            referencedColumns: ["id"]
          },
        ]
      }
      annees_scolaires: {
        Row: {
          created_at: string
          debut: string
          decoupage: Database["public"]["Enums"]["decoupage_type"]
          ecole_id: string
          fin: string
          id: string
          libelle: string
          statut: Database["public"]["Enums"]["annee_statut"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          debut: string
          decoupage?: Database["public"]["Enums"]["decoupage_type"]
          ecole_id: string
          fin: string
          id?: string
          libelle: string
          statut?: Database["public"]["Enums"]["annee_statut"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          debut?: string
          decoupage?: Database["public"]["Enums"]["decoupage_type"]
          ecole_id?: string
          fin?: string
          id?: string
          libelle?: string
          statut?: Database["public"]["Enums"]["annee_statut"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "annees_scolaires_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      annonces: {
        Row: {
          audience: string | null
          auteur_id: string | null
          contenu: string | null
          created_at: string
          ecole_id: string
          id: string
          publie: boolean | null
          publie_le: string | null
          titre: string
          updated_at: string
        }
        Insert: {
          audience?: string | null
          auteur_id?: string | null
          contenu?: string | null
          created_at?: string
          ecole_id: string
          id?: string
          publie?: boolean | null
          publie_le?: string | null
          titre: string
          updated_at?: string
        }
        Update: {
          audience?: string | null
          auteur_id?: string | null
          contenu?: string | null
          created_at?: string
          ecole_id?: string
          id?: string
          publie?: boolean | null
          publie_le?: string | null
          titre?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_modules: {
        Row: {
          created_at: string
          icon: string | null
          key: string
          label: string
          ordre: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          key: string
          label: string
          ordre?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          key?: string
          label?: string
          ordre?: number
        }
        Relationships: []
      }
      audit_decisions_fin_annee: {
        Row: {
          action: string
          ancien_statut: string | null
          created_at: string
          decision_id: string
          details: Json | null
          ecole_id: string
          effectue_par: string
          id: string
          nouveau_statut: string | null
        }
        Insert: {
          action: string
          ancien_statut?: string | null
          created_at?: string
          decision_id: string
          details?: Json | null
          ecole_id: string
          effectue_par: string
          id?: string
          nouveau_statut?: string | null
        }
        Update: {
          action?: string
          ancien_statut?: string | null
          created_at?: string
          decision_id?: string
          details?: Json | null
          ecole_id?: string
          effectue_par?: string
          id?: string
          nouveau_statut?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          cible: string | null
          created_at: string
          details: Json | null
          ecole_id: string
          id: string
          niveau: string
          user_id: string | null
          user_label: string | null
        }
        Insert: {
          action: string
          cible?: string | null
          created_at?: string
          details?: Json | null
          ecole_id: string
          id?: string
          niveau?: string
          user_id?: string | null
          user_label?: string | null
        }
        Update: {
          action?: string
          cible?: string | null
          created_at?: string
          details?: Json | null
          ecole_id?: string
          id?: string
          niveau?: string
          user_id?: string | null
          user_label?: string | null
        }
        Relationships: []
      }
      bibliotheque_acquisitions: {
        Row: {
          auteur: string | null
          created_at: string
          date_commande: string
          date_reception: string | null
          demande_par: string | null
          ecole_id: string
          editeur: string | null
          fournisseur: string | null
          id: string
          isbn: string | null
          notes: string | null
          prix_unitaire: number | null
          quantite: number
          statut: string
          titre: string
          updated_at: string
        }
        Insert: {
          auteur?: string | null
          created_at?: string
          date_commande?: string
          date_reception?: string | null
          demande_par?: string | null
          ecole_id: string
          editeur?: string | null
          fournisseur?: string | null
          id?: string
          isbn?: string | null
          notes?: string | null
          prix_unitaire?: number | null
          quantite?: number
          statut?: string
          titre: string
          updated_at?: string
        }
        Update: {
          auteur?: string | null
          created_at?: string
          date_commande?: string
          date_reception?: string | null
          demande_par?: string | null
          ecole_id?: string
          editeur?: string | null
          fournisseur?: string | null
          id?: string
          isbn?: string | null
          notes?: string | null
          prix_unitaire?: number | null
          quantite?: number
          statut?: string
          titre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bibliotheque_acquisitions_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      bibliotheque_categories: {
        Row: {
          couleur: string | null
          created_at: string
          description: string | null
          ecole_id: string
          id: string
          nom: string
          ordre: number | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          couleur?: string | null
          created_at?: string
          description?: string | null
          ecole_id: string
          id?: string
          nom: string
          ordre?: number | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          couleur?: string | null
          created_at?: string
          description?: string | null
          ecole_id?: string
          id?: string
          nom?: string
          ordre?: number | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bibliotheque_categories_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      billets_sortie: {
        Row: {
          accompagnateur: string | null
          created_at: string
          date_sortie: string
          delivre_par: string | null
          destination: string | null
          ecole_id: string
          eleve_id: string | null
          enseignant_id: string | null
          heure_retour_effective: string | null
          heure_retour_prevue: string | null
          heure_sortie: string
          id: string
          motif: string
          numero: string
          observations: string | null
          statut: string
          sujet_type: string
          updated_at: string
        }
        Insert: {
          accompagnateur?: string | null
          created_at?: string
          date_sortie?: string
          delivre_par?: string | null
          destination?: string | null
          ecole_id: string
          eleve_id?: string | null
          enseignant_id?: string | null
          heure_retour_effective?: string | null
          heure_retour_prevue?: string | null
          heure_sortie?: string
          id?: string
          motif: string
          numero?: string
          observations?: string | null
          statut?: string
          sujet_type: string
          updated_at?: string
        }
        Update: {
          accompagnateur?: string | null
          created_at?: string
          date_sortie?: string
          delivre_par?: string | null
          destination?: string | null
          ecole_id?: string
          eleve_id?: string | null
          enseignant_id?: string | null
          heure_retour_effective?: string | null
          heure_retour_prevue?: string | null
          heure_sortie?: string
          id?: string
          motif?: string
          numero?: string
          observations?: string | null
          statut?: string
          sujet_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billets_sortie_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billets_sortie_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "v_conformite_sigfne"
            referencedColumns: ["eleve_id"]
          },
          {
            foreignKeyName: "billets_sortie_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
        ]
      }
      bons_reduction: {
        Row: {
          actif: boolean
          code: string
          created_at: string
          cycle_id: string | null
          date_debut: string | null
          date_fin: string | null
          ecole_id: string
          id: string
          libelle: string
          service_types: string[]
          type: string
          updated_at: string
          usage_count: number
          usage_max: number | null
          valeur: number
        }
        Insert: {
          actif?: boolean
          code: string
          created_at?: string
          cycle_id?: string | null
          date_debut?: string | null
          date_fin?: string | null
          ecole_id: string
          id?: string
          libelle: string
          service_types?: string[]
          type: string
          updated_at?: string
          usage_count?: number
          usage_max?: number | null
          valeur: number
        }
        Update: {
          actif?: boolean
          code?: string
          created_at?: string
          cycle_id?: string | null
          date_debut?: string | null
          date_fin?: string | null
          ecole_id?: string
          id?: string
          libelle?: string
          service_types?: string[]
          type?: string
          updated_at?: string
          usage_count?: number
          usage_max?: number | null
          valeur?: number
        }
        Relationships: [
          {
            foreignKeyName: "bons_reduction_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bons_reduction_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      bons_reduction_utilisations: {
        Row: {
          applique_par: string | null
          bon_id: string
          created_at: string
          echeance_id: string | null
          ecole_id: string
          eleve_id: string
          id: string
          montant_applique: number
        }
        Insert: {
          applique_par?: string | null
          bon_id: string
          created_at?: string
          echeance_id?: string | null
          ecole_id: string
          eleve_id: string
          id?: string
          montant_applique: number
        }
        Update: {
          applique_par?: string | null
          bon_id?: string
          created_at?: string
          echeance_id?: string | null
          ecole_id?: string
          eleve_id?: string
          id?: string
          montant_applique?: number
        }
        Relationships: [
          {
            foreignKeyName: "bons_reduction_utilisations_bon_id_fkey"
            columns: ["bon_id"]
            isOneToOne: false
            referencedRelation: "bons_reduction"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bons_reduction_utilisations_echeance_id_fkey"
            columns: ["echeance_id"]
            isOneToOne: false
            referencedRelation: "echeances_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bons_reduction_utilisations_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bons_reduction_utilisations_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bons_reduction_utilisations_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "v_conformite_sigfne"
            referencedColumns: ["eleve_id"]
          },
        ]
      }
      bulletins_audit: {
        Row: {
          annee_id: string
          appreciation_generale: string | null
          classe_id: string
          created_at: string
          decision_conseil: string | null
          decision_detail: string | null
          ecole_id: string
          eleve_id: string
          id: string
          locked: boolean
          locked_at: string | null
          locked_by: string | null
          mention: string | null
          moyenne: number | null
          override_at: string | null
          override_by: string | null
          override_motif: string | null
          pdf_hash: string | null
          pdf_path: string | null
          periode_id: string
          rang: number | null
          sent_at: string | null
          sent_by: string | null
          sent_channels: Json
          sent_recipients: Json
          updated_at: string
          version: number
        }
        Insert: {
          annee_id: string
          appreciation_generale?: string | null
          classe_id: string
          created_at?: string
          decision_conseil?: string | null
          decision_detail?: string | null
          ecole_id: string
          eleve_id: string
          id?: string
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          mention?: string | null
          moyenne?: number | null
          override_at?: string | null
          override_by?: string | null
          override_motif?: string | null
          pdf_hash?: string | null
          pdf_path?: string | null
          periode_id: string
          rang?: number | null
          sent_at?: string | null
          sent_by?: string | null
          sent_channels?: Json
          sent_recipients?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          annee_id?: string
          appreciation_generale?: string | null
          classe_id?: string
          created_at?: string
          decision_conseil?: string | null
          decision_detail?: string | null
          ecole_id?: string
          eleve_id?: string
          id?: string
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          mention?: string | null
          moyenne?: number | null
          override_at?: string | null
          override_by?: string | null
          override_motif?: string | null
          pdf_hash?: string | null
          pdf_path?: string | null
          periode_id?: string
          rang?: number | null
          sent_at?: string | null
          sent_by?: string | null
          sent_channels?: Json
          sent_recipients?: Json
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      bulletins_paie: {
        Row: {
          annee: number
          created_at: string
          date_paiement: string | null
          ecole_id: string
          enseignant_id: string
          id: string
          mois: number
          net_a_payer: number
          retenues: number
          salaire_brut: number
          statut: string
          updated_at: string
        }
        Insert: {
          annee: number
          created_at?: string
          date_paiement?: string | null
          ecole_id: string
          enseignant_id: string
          id?: string
          mois: number
          net_a_payer?: number
          retenues?: number
          salaire_brut?: number
          statut?: string
          updated_at?: string
        }
        Update: {
          annee?: number
          created_at?: string
          date_paiement?: string | null
          ecole_id?: string
          enseignant_id?: string
          id?: string
          mois?: number
          net_a_payer?: number
          retenues?: number
          salaire_brut?: number
          statut?: string
          updated_at?: string
        }
        Relationships: []
      }
      cantine_incidents: {
        Row: {
          actions_prises: string | null
          created_at: string
          date_incident: string
          description: string
          ecole_id: string
          eleve_id: string | null
          gravite: string
          id: string
          signale_par: string | null
          statut: string
          type_incident: string
          updated_at: string
        }
        Insert: {
          actions_prises?: string | null
          created_at?: string
          date_incident?: string
          description: string
          ecole_id: string
          eleve_id?: string | null
          gravite?: string
          id?: string
          signale_par?: string | null
          statut?: string
          type_incident: string
          updated_at?: string
        }
        Update: {
          actions_prises?: string | null
          created_at?: string
          date_incident?: string
          description?: string
          ecole_id?: string
          eleve_id?: string | null
          gravite?: string
          id?: string
          signale_par?: string | null
          statut?: string
          type_incident?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cantine_incidents_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantine_incidents_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantine_incidents_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "v_conformite_sigfne"
            referencedColumns: ["eleve_id"]
          },
        ]
      }
      cantine_personnel: {
        Row: {
          actif: boolean
          certifications: string[] | null
          created_at: string
          cycle_id: string | null
          date_embauche: string | null
          ecole_id: string
          email: string | null
          fonction: string
          id: string
          nom: string
          prenom: string
          telephone: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean
          certifications?: string[] | null
          created_at?: string
          cycle_id?: string | null
          date_embauche?: string | null
          ecole_id: string
          email?: string | null
          fonction: string
          id?: string
          nom: string
          prenom: string
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean
          certifications?: string[] | null
          created_at?: string
          cycle_id?: string | null
          date_embauche?: string | null
          ecole_id?: string
          email?: string | null
          fonction?: string
          id?: string
          nom?: string
          prenom?: string
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cantine_personnel_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantine_personnel_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      cantine_planning: {
        Row: {
          capacite_prevue: number | null
          created_at: string
          date_service: string
          ecole_id: string
          effectif_inscrits: number | null
          effectif_realise: number | null
          id: string
          menu_id: string | null
          notes: string | null
          service: string
          updated_at: string
        }
        Insert: {
          capacite_prevue?: number | null
          created_at?: string
          date_service: string
          ecole_id: string
          effectif_inscrits?: number | null
          effectif_realise?: number | null
          id?: string
          menu_id?: string | null
          notes?: string | null
          service?: string
          updated_at?: string
        }
        Update: {
          capacite_prevue?: number | null
          created_at?: string
          date_service?: string
          ecole_id?: string
          effectif_inscrits?: number | null
          effectif_realise?: number | null
          id?: string
          menu_id?: string | null
          notes?: string | null
          service?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cantine_planning_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      cantine_regimes: {
        Row: {
          actif: boolean
          allergenes: string[] | null
          certificat_medical_url: string | null
          created_at: string
          ecole_id: string
          eleve_id: string | null
          id: string
          restrictions: string | null
          type_regime: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          allergenes?: string[] | null
          certificat_medical_url?: string | null
          created_at?: string
          ecole_id: string
          eleve_id?: string | null
          id?: string
          restrictions?: string | null
          type_regime: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          allergenes?: string[] | null
          certificat_medical_url?: string | null
          created_at?: string
          ecole_id?: string
          eleve_id?: string | null
          id?: string
          restrictions?: string | null
          type_regime?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cantine_regimes_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantine_regimes_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantine_regimes_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "v_conformite_sigfne"
            referencedColumns: ["eleve_id"]
          },
        ]
      }
      cartes: {
        Row: {
          annee_id: string | null
          created_at: string
          date_emission: string | null
          date_expiration: string | null
          ecole_id: string
          eleve_id: string | null
          enseignant_id: string | null
          id: string
          metadata: Json
          motif_revocation: string | null
          numero: string
          qr_payload: string | null
          statut: Database["public"]["Enums"]["carte_statut"]
          type: Database["public"]["Enums"]["carte_type"]
          updated_at: string
        }
        Insert: {
          annee_id?: string | null
          created_at?: string
          date_emission?: string | null
          date_expiration?: string | null
          ecole_id: string
          eleve_id?: string | null
          enseignant_id?: string | null
          id?: string
          metadata?: Json
          motif_revocation?: string | null
          numero: string
          qr_payload?: string | null
          statut?: Database["public"]["Enums"]["carte_statut"]
          type?: Database["public"]["Enums"]["carte_type"]
          updated_at?: string
        }
        Update: {
          annee_id?: string | null
          created_at?: string
          date_emission?: string | null
          date_expiration?: string | null
          ecole_id?: string
          eleve_id?: string | null
          enseignant_id?: string | null
          id?: string
          metadata?: Json
          motif_revocation?: string | null
          numero?: string
          qr_payload?: string | null
          statut?: Database["public"]["Enums"]["carte_statut"]
          type?: Database["public"]["Enums"]["carte_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cartes_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartes_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartes_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartes_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "v_conformite_sigfne"
            referencedColumns: ["eleve_id"]
          },
          {
            foreignKeyName: "cartes_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
        ]
      }
      certificats_absence: {
        Row: {
          created_at: string
          date_debut: string
          date_fin: string
          delivre_par: string | null
          ecole_id: string
          eleve_id: string | null
          enseignant_id: string | null
          id: string
          justifie: boolean
          motif: string
          numero: string
          observations: string | null
          piece_jointe_url: string | null
          sujet_type: string
          type_justificatif: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_debut: string
          date_fin: string
          delivre_par?: string | null
          ecole_id: string
          eleve_id?: string | null
          enseignant_id?: string | null
          id?: string
          justifie?: boolean
          motif: string
          numero?: string
          observations?: string | null
          piece_jointe_url?: string | null
          sujet_type: string
          type_justificatif?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_debut?: string
          date_fin?: string
          delivre_par?: string | null
          ecole_id?: string
          eleve_id?: string | null
          enseignant_id?: string | null
          id?: string
          justifie?: boolean
          motif?: string
          numero?: string
          observations?: string | null
          piece_jointe_url?: string | null
          sujet_type?: string
          type_justificatif?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificats_absence_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificats_absence_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "v_conformite_sigfne"
            referencedColumns: ["eleve_id"]
          },
          {
            foreignKeyName: "certificats_absence_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
        ]
      }
      chauffeurs: {
        Row: {
          created_at: string
          cycle_id: string | null
          date_embauche: string | null
          date_expiration_permis: string | null
          ecole_id: string
          id: string
          nom: string
          numero_permis: string | null
          prenom: string
          statut: string
          telephone: string | null
          updated_at: string
          vehicule_id: string | null
        }
        Insert: {
          created_at?: string
          cycle_id?: string | null
          date_embauche?: string | null
          date_expiration_permis?: string | null
          ecole_id: string
          id?: string
          nom: string
          numero_permis?: string | null
          prenom: string
          statut?: string
          telephone?: string | null
          updated_at?: string
          vehicule_id?: string | null
        }
        Update: {
          created_at?: string
          cycle_id?: string | null
          date_embauche?: string | null
          date_expiration_permis?: string | null
          ecole_id?: string
          id?: string
          nom?: string
          numero_permis?: string | null
          prenom?: string
          statut?: string
          telephone?: string | null
          updated_at?: string
          vehicule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chauffeurs_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chauffeurs_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chauffeurs_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      classe_matieres: {
        Row: {
          classe_id: string
          coefficient: number
          created_at: string
          ecole_id: string
          id: string
          matiere_id: string
          volume_horaire_hebdo: number | null
        }
        Insert: {
          classe_id: string
          coefficient?: number
          created_at?: string
          ecole_id: string
          id?: string
          matiere_id: string
          volume_horaire_hebdo?: number | null
        }
        Update: {
          classe_id?: string
          coefficient?: number
          created_at?: string
          ecole_id?: string
          id?: string
          matiere_id?: string
          volume_horaire_hebdo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "classe_matieres_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classe_matieres_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classe_matieres_matiere_id_fkey"
            columns: ["matiere_id"]
            isOneToOne: false
            referencedRelation: "matieres"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          annee_id: string
          capacite: number | null
          created_at: string
          cycle_id: string
          ecole_id: string
          id: string
          nom: string
          professeur_principal_id: string | null
          salle: string | null
          salle_id: string | null
          updated_at: string
        }
        Insert: {
          annee_id: string
          capacite?: number | null
          created_at?: string
          cycle_id: string
          ecole_id: string
          id?: string
          nom: string
          professeur_principal_id?: string | null
          salle?: string | null
          salle_id?: string | null
          updated_at?: string
        }
        Update: {
          annee_id?: string
          capacite?: number | null
          created_at?: string
          cycle_id?: string
          ecole_id?: string
          id?: string
          nom?: string
          professeur_principal_id?: string | null
          salle?: string | null
          salle_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_prof_principal_id_fkey"
            columns: ["professeur_principal_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_salle_id_fkey"
            columns: ["salle_id"]
            isOneToOne: false
            referencedRelation: "salles"
            referencedColumns: ["id"]
          },
        ]
      }
      comptes_tresorerie: {
        Row: {
          created_at: string
          ecole_id: string
          id: string
          nom: string
          numero: string | null
          solde: number
          statut: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ecole_id: string
          id?: string
          nom: string
          numero?: string | null
          solde?: number
          statut?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ecole_id?: string
          id?: string
          nom?: string
          numero?: string | null
          solde?: number
          statut?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      config_module_eleves: {
        Row: {
          age_max_lycee: number
          age_min_maternelle: number
          archivage_auto: boolean
          capacite_classe_defaut: number
          created_at: string
          ecole_id: string
          format_matricule: string
          generation_carnet: boolean
          id: string
          nb_documents_obligatoires: number
          notification_sms: boolean
          photo_obligatoire: boolean
          updated_at: string
        }
        Insert: {
          age_max_lycee?: number
          age_min_maternelle?: number
          archivage_auto?: boolean
          capacite_classe_defaut?: number
          created_at?: string
          ecole_id: string
          format_matricule?: string
          generation_carnet?: boolean
          id?: string
          nb_documents_obligatoires?: number
          notification_sms?: boolean
          photo_obligatoire?: boolean
          updated_at?: string
        }
        Update: {
          age_max_lycee?: number
          age_min_maternelle?: number
          archivage_auto?: boolean
          capacite_classe_defaut?: number
          created_at?: string
          ecole_id?: string
          format_matricule?: string
          generation_carnet?: boolean
          id?: string
          nb_documents_obligatoires?: number
          notification_sms?: boolean
          photo_obligatoire?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      conseils_classe: {
        Row: {
          annee_id: string | null
          classe_id: string
          created_at: string
          date_conseil: string
          ecole_id: string
          heure_debut: string | null
          id: string
          ordre_du_jour: string | null
          participants: Json | null
          periode_id: string | null
          president_id: string | null
          proces_verbal: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          annee_id?: string | null
          classe_id: string
          created_at?: string
          date_conseil: string
          ecole_id: string
          heure_debut?: string | null
          id?: string
          ordre_du_jour?: string | null
          participants?: Json | null
          periode_id?: string | null
          president_id?: string | null
          proces_verbal?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          annee_id?: string | null
          classe_id?: string
          created_at?: string
          date_conseil?: string
          ecole_id?: string
          heure_debut?: string | null
          id?: string
          ordre_du_jour?: string | null
          participants?: Json | null
          periode_id?: string | null
          president_id?: string | null
          proces_verbal?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conseils_classe_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conseils_classe_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conseils_classe_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      contrats_enseignants: {
        Row: {
          created_at: string
          cree_par: string | null
          date_debut: string
          date_fin: string | null
          date_rupture: string | null
          ecole_id: string
          enseignant_id: string
          id: string
          motif_rupture: string | null
          notes: string | null
          parent_contrat_id: string | null
          periode_essai_fin: string | null
          preavis_jours: number | null
          primes: Json | null
          quotite: number | null
          salaire_base: number | null
          signe_le: string | null
          statut: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cree_par?: string | null
          date_debut: string
          date_fin?: string | null
          date_rupture?: string | null
          ecole_id: string
          enseignant_id: string
          id?: string
          motif_rupture?: string | null
          notes?: string | null
          parent_contrat_id?: string | null
          periode_essai_fin?: string | null
          preavis_jours?: number | null
          primes?: Json | null
          quotite?: number | null
          salaire_base?: number | null
          signe_le?: string | null
          statut?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cree_par?: string | null
          date_debut?: string
          date_fin?: string | null
          date_rupture?: string | null
          ecole_id?: string
          enseignant_id?: string
          id?: string
          motif_rupture?: string | null
          notes?: string | null
          parent_contrat_id?: string | null
          periode_essai_fin?: string | null
          preavis_jours?: number | null
          primes?: Json | null
          quotite?: number | null
          salaire_base?: number | null
          signe_le?: string | null
          statut?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrats_enseignants_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrats_enseignants_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrats_enseignants_parent_contrat_id_fkey"
            columns: ["parent_contrat_id"]
            isOneToOne: false
            referencedRelation: "contrats_enseignants"
            referencedColumns: ["id"]
          },
        ]
      }
      creneaux_emploi_temps: {
        Row: {
          annee_id: string
          classe_id: string
          created_at: string
          ecole_id: string
          enseignant_id: string | null
          heure_debut: string
          heure_fin: string
          id: string
          jour: number
          matiere_id: string
          salle: string | null
          salle_id: string | null
          updated_at: string
        }
        Insert: {
          annee_id: string
          classe_id: string
          created_at?: string
          ecole_id: string
          enseignant_id?: string | null
          heure_debut: string
          heure_fin: string
          id?: string
          jour: number
          matiere_id: string
          salle?: string | null
          salle_id?: string | null
          updated_at?: string
        }
        Update: {
          annee_id?: string
          classe_id?: string
          created_at?: string
          ecole_id?: string
          enseignant_id?: string | null
          heure_debut?: string
          heure_fin?: string
          id?: string
          jour?: number
          matiere_id?: string
          salle?: string | null
          salle_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creneaux_emploi_temps_annee_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creneaux_emploi_temps_classe_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creneaux_emploi_temps_ecole_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creneaux_emploi_temps_enseignant_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creneaux_emploi_temps_matiere_fkey"
            columns: ["matiere_id"]
            isOneToOne: false
            referencedRelation: "matieres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creneaux_emploi_temps_salle_id_fkey"
            columns: ["salle_id"]
            isOneToOne: false
            referencedRelation: "salles"
            referencedColumns: ["id"]
          },
        ]
      }
      cycles: {
        Row: {
          created_at: string
          ecole_id: string
          id: string
          nom: string
          ordre: number
        }
        Insert: {
          created_at?: string
          ecole_id: string
          id?: string
          nom: string
          ordre?: number
        }
        Update: {
          created_at?: string
          ecole_id?: string
          id?: string
          nom?: string
          ordre?: number
        }
        Relationships: [
          {
            foreignKeyName: "cycles_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions_fin_annee: {
        Row: {
          annee_id: string
          classe_destination_id: string | null
          classe_origine_id: string
          created_at: string
          decide_par: string | null
          decision: string
          ecole_id: string
          eleve_id: string
          id: string
          motif: string | null
          statut: string
          updated_at: string
          valide_le: string | null
          valide_par: string | null
          verrouille_le: string | null
          verrouille_par: string | null
        }
        Insert: {
          annee_id: string
          classe_destination_id?: string | null
          classe_origine_id: string
          created_at?: string
          decide_par?: string | null
          decision?: string
          ecole_id: string
          eleve_id: string
          id?: string
          motif?: string | null
          statut?: string
          updated_at?: string
          valide_le?: string | null
          valide_par?: string | null
          verrouille_le?: string | null
          verrouille_par?: string | null
        }
        Update: {
          annee_id?: string
          classe_destination_id?: string | null
          classe_origine_id?: string
          created_at?: string
          decide_par?: string | null
          decision?: string
          ecole_id?: string
          eleve_id?: string
          id?: string
          motif?: string | null
          statut?: string
          updated_at?: string
          valide_le?: string | null
          valide_par?: string | null
          verrouille_le?: string | null
          verrouille_par?: string | null
        }
        Relationships: []
      }
      depenses: {
        Row: {
          categorie: string | null
          created_at: string
          cycle_id: string | null
          date_depense: string
          ecole_id: string
          enregistre_par: string | null
          fournisseur_id: string | null
          id: string
          libelle: string
          montant: number
          notes: string | null
          reference: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          categorie?: string | null
          created_at?: string
          cycle_id?: string | null
          date_depense?: string
          ecole_id: string
          enregistre_par?: string | null
          fournisseur_id?: string | null
          id?: string
          libelle: string
          montant: number
          notes?: string | null
          reference?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          categorie?: string | null
          created_at?: string
          cycle_id?: string | null
          date_depense?: string
          ecole_id?: string
          enregistre_par?: string | null
          fournisseur_id?: string | null
          id?: string
          libelle?: string
          montant?: number
          notes?: string | null
          reference?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "depenses_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depenses_fournisseur_id_fkey"
            columns: ["fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseurs"
            referencedColumns: ["id"]
          },
        ]
      }
      disponibilites_enseignants: {
        Row: {
          created_at: string
          disponible: boolean
          ecole_id: string
          enseignant_id: string
          id: string
          jour: number
          note: string | null
          plage: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          disponible?: boolean
          ecole_id: string
          enseignant_id: string
          id?: string
          jour: number
          note?: string | null
          plage: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          disponible?: boolean
          ecole_id?: string
          enseignant_id?: string
          id?: string
          jour?: number
          note?: string | null
          plage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disponibilites_enseignants_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disponibilites_enseignants_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents_eleves: {
        Row: {
          chemin_stockage: string
          created_at: string
          ecole_id: string
          eleve_id: string
          id: string
          mime_type: string | null
          nom_fichier: string
          taille: number | null
          type_document: string
          updated_at: string
          uploade_par: string | null
        }
        Insert: {
          chemin_stockage: string
          created_at?: string
          ecole_id: string
          eleve_id: string
          id?: string
          mime_type?: string | null
          nom_fichier: string
          taille?: number | null
          type_document: string
          updated_at?: string
          uploade_par?: string | null
        }
        Update: {
          chemin_stockage?: string
          created_at?: string
          ecole_id?: string
          eleve_id?: string
          id?: string
          mime_type?: string | null
          nom_fichier?: string
          taille?: number | null
          type_document?: string
          updated_at?: string
          uploade_par?: string | null
        }
        Relationships: []
      }
      echeances_services: {
        Row: {
          annee_id: string
          created_at: string
          echeance: string
          ecole_id: string
          eleve_id: string
          grille_id: string | null
          id: string
          label: string
          montant: number
          numero: number
          paye: number
          service_type: string
          statut: string
          updated_at: string
        }
        Insert: {
          annee_id: string
          created_at?: string
          echeance: string
          ecole_id: string
          eleve_id: string
          grille_id?: string | null
          id?: string
          label: string
          montant?: number
          numero: number
          paye?: number
          service_type: string
          statut?: string
          updated_at?: string
        }
        Update: {
          annee_id?: string
          created_at?: string
          echeance?: string
          ecole_id?: string
          eleve_id?: string
          grille_id?: string | null
          id?: string
          label?: string
          montant?: number
          numero?: number
          paye?: number
          service_type?: string
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "echeances_services_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "echeances_services_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "echeances_services_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "echeances_services_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "v_conformite_sigfne"
            referencedColumns: ["eleve_id"]
          },
          {
            foreignKeyName: "echeances_services_grille_id_fkey"
            columns: ["grille_id"]
            isOneToOne: false
            referencedRelation: "grille_tarifs_services"
            referencedColumns: ["id"]
          },
        ]
      }
      ecoles: {
        Row: {
          adresse: string | null
          agrement: string | null
          annee_creation: number | null
          code: string
          created_at: string
          cycles: string | null
          devise: string | null
          diocese: string | null
          directeur: string | null
          email: string | null
          id: string
          logo_url: string | null
          nom: string
          pays: string
          sigle: string | null
          site_web: string | null
          status: Database["public"]["Enums"]["ecole_status"]
          tarif_honoraire_vacances_par_eleve: number
          telephone: string | null
          type: string
          updated_at: string
          ville: string
        }
        Insert: {
          adresse?: string | null
          agrement?: string | null
          annee_creation?: number | null
          code: string
          created_at?: string
          cycles?: string | null
          devise?: string | null
          diocese?: string | null
          directeur?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          nom: string
          pays?: string
          sigle?: string | null
          site_web?: string | null
          status?: Database["public"]["Enums"]["ecole_status"]
          tarif_honoraire_vacances_par_eleve?: number
          telephone?: string | null
          type?: string
          updated_at?: string
          ville?: string
        }
        Update: {
          adresse?: string | null
          agrement?: string | null
          annee_creation?: number | null
          code?: string
          created_at?: string
          cycles?: string | null
          devise?: string | null
          diocese?: string | null
          directeur?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          nom?: string
          pays?: string
          sigle?: string | null
          site_web?: string | null
          status?: Database["public"]["Enums"]["ecole_status"]
          tarif_honoraire_vacances_par_eleve?: number
          telephone?: string | null
          type?: string
          updated_at?: string
          ville?: string
        }
        Relationships: []
      }
      eleve_parents: {
        Row: {
          created_at: string
          eleve_id: string
          est_contact_principal: boolean | null
          id: string
          lien: string
          parent_id: string
        }
        Insert: {
          created_at?: string
          eleve_id: string
          est_contact_principal?: boolean | null
          id?: string
          lien?: string
          parent_id: string
        }
        Update: {
          created_at?: string
          eleve_id?: string
          est_contact_principal?: boolean | null
          id?: string
          lien?: string
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eleve_parents_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleve_parents_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "v_conformite_sigfne"
            referencedColumns: ["eleve_id"]
          },
          {
            foreignKeyName: "eleve_parents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
        ]
      }
      eleves: {
        Row: {
          adresse: string | null
          annee_id: string | null
          classe_id: string | null
          created_at: string
          date_inscription: string | null
          date_naissance: string | null
          ecole_id: string
          est_nouveau: boolean
          frais_id_override: string | null
          id: string
          lieu_naissance: string | null
          matricule: string
          matricule_national: string | null
          nationalite: string | null
          nom: string
          numero_extrait_naissance: string | null
          numero_inscription_en_ligne: string | null
          photo_url: string | null
          prenom: string
          sexe: Database["public"]["Enums"]["sexe_type"] | null
          sigfne_verifie_le: string | null
          statut: string
          statut_sigfne: string
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          annee_id?: string | null
          classe_id?: string | null
          created_at?: string
          date_inscription?: string | null
          date_naissance?: string | null
          ecole_id: string
          est_nouveau?: boolean
          frais_id_override?: string | null
          id?: string
          lieu_naissance?: string | null
          matricule: string
          matricule_national?: string | null
          nationalite?: string | null
          nom: string
          numero_extrait_naissance?: string | null
          numero_inscription_en_ligne?: string | null
          photo_url?: string | null
          prenom: string
          sexe?: Database["public"]["Enums"]["sexe_type"] | null
          sigfne_verifie_le?: string | null
          statut?: string
          statut_sigfne?: string
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          annee_id?: string | null
          classe_id?: string | null
          created_at?: string
          date_inscription?: string | null
          date_naissance?: string | null
          ecole_id?: string
          est_nouveau?: boolean
          frais_id_override?: string | null
          id?: string
          lieu_naissance?: string | null
          matricule?: string
          matricule_national?: string | null
          nationalite?: string | null
          nom?: string
          numero_extrait_naissance?: string | null
          numero_inscription_en_ligne?: string | null
          photo_url?: string | null
          prenom?: string
          sexe?: Database["public"]["Enums"]["sexe_type"] | null
          sigfne_verifie_le?: string | null
          statut?: string
          statut_sigfne?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eleves_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleves_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleves_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleves_frais_id_override_fkey"
            columns: ["frais_id_override"]
            isOneToOne: false
            referencedRelation: "frais_scolarite"
            referencedColumns: ["id"]
          },
        ]
      }
      emprunts: {
        Row: {
          created_at: string
          date_emprunt: string
          date_retour_effective: string | null
          date_retour_prevue: string
          ecole_id: string
          eleve_id: string | null
          enseignant_id: string | null
          id: string
          livre_id: string
          statut: string
        }
        Insert: {
          created_at?: string
          date_emprunt?: string
          date_retour_effective?: string | null
          date_retour_prevue: string
          ecole_id: string
          eleve_id?: string | null
          enseignant_id?: string | null
          id?: string
          livre_id: string
          statut?: string
        }
        Update: {
          created_at?: string
          date_emprunt?: string
          date_retour_effective?: string | null
          date_retour_prevue?: string
          ecole_id?: string
          eleve_id?: string | null
          enseignant_id?: string | null
          id?: string
          livre_id?: string
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "emprunts_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emprunts_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emprunts_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "v_conformite_sigfne"
            referencedColumns: ["eleve_id"]
          },
          {
            foreignKeyName: "emprunts_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emprunts_livre_id_fkey"
            columns: ["livre_id"]
            isOneToOne: false
            referencedRelation: "livres"
            referencedColumns: ["id"]
          },
        ]
      }
      enseignant_matieres: {
        Row: {
          annee_id: string | null
          classe_id: string | null
          created_at: string
          ecole_id: string
          enseignant_id: string
          id: string
          matiere_id: string
          volume_horaire_hebdo: number | null
        }
        Insert: {
          annee_id?: string | null
          classe_id?: string | null
          created_at?: string
          ecole_id: string
          enseignant_id: string
          id?: string
          matiere_id: string
          volume_horaire_hebdo?: number | null
        }
        Update: {
          annee_id?: string | null
          classe_id?: string | null
          created_at?: string
          ecole_id?: string
          enseignant_id?: string
          id?: string
          matiere_id?: string
          volume_horaire_hebdo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "enseignant_matieres_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enseignant_matieres_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enseignant_matieres_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enseignant_matieres_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enseignant_matieres_matiere_id_fkey"
            columns: ["matiere_id"]
            isOneToOne: false
            referencedRelation: "matieres"
            referencedColumns: ["id"]
          },
        ]
      }
      enseignants: {
        Row: {
          created_at: string
          cycle_id: string | null
          date_embauche: string | null
          diplome: string | null
          ecole_id: string
          email: string | null
          id: string
          invitation_accepted_at: string | null
          invitation_sent_at: string | null
          matricule: string | null
          nom: string
          photo_url: string | null
          prenom: string
          sexe: Database["public"]["Enums"]["sexe_type"] | null
          specialite: string | null
          statut: string
          telephone: string | null
          type_contrat: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          cycle_id?: string | null
          date_embauche?: string | null
          diplome?: string | null
          ecole_id: string
          email?: string | null
          id?: string
          invitation_accepted_at?: string | null
          invitation_sent_at?: string | null
          matricule?: string | null
          nom: string
          photo_url?: string | null
          prenom: string
          sexe?: Database["public"]["Enums"]["sexe_type"] | null
          specialite?: string | null
          statut?: string
          telephone?: string | null
          type_contrat?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          cycle_id?: string | null
          date_embauche?: string | null
          diplome?: string | null
          ecole_id?: string
          email?: string | null
          id?: string
          invitation_accepted_at?: string | null
          invitation_sent_at?: string | null
          matricule?: string | null
          nom?: string
          photo_url?: string | null
          prenom?: string
          sexe?: Database["public"]["Enums"]["sexe_type"] | null
          specialite?: string | null
          statut?: string
          telephone?: string | null
          type_contrat?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enseignants_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enseignants_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      enseignants_candidatures: {
        Row: {
          created_at: string
          cv_url: string | null
          date_candidature: string
          ecole_id: string
          email: string | null
          experience_annees: number | null
          id: string
          lettre_motivation_url: string | null
          matiere_souhaitee: string | null
          niveau_etudes: string | null
          nom: string
          notes_entretien: string | null
          prenom: string
          statut: string
          telephone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cv_url?: string | null
          date_candidature?: string
          ecole_id: string
          email?: string | null
          experience_annees?: number | null
          id?: string
          lettre_motivation_url?: string | null
          matiere_souhaitee?: string | null
          niveau_etudes?: string | null
          nom: string
          notes_entretien?: string | null
          prenom: string
          statut?: string
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cv_url?: string | null
          date_candidature?: string
          ecole_id?: string
          email?: string | null
          experience_annees?: number | null
          id?: string
          lettre_motivation_url?: string | null
          matiere_souhaitee?: string | null
          niveau_etudes?: string | null
          nom?: string
          notes_entretien?: string | null
          prenom?: string
          statut?: string
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enseignants_candidatures_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      enseignants_documents: {
        Row: {
          created_at: string
          date_emission: string | null
          date_expiration: string | null
          ecole_id: string
          enseignant_id: string
          id: string
          libelle: string | null
          notes: string | null
          type_document: string
          updated_at: string
          uploaded_by: string | null
          url_fichier: string
          valide: boolean | null
        }
        Insert: {
          created_at?: string
          date_emission?: string | null
          date_expiration?: string | null
          ecole_id: string
          enseignant_id: string
          id?: string
          libelle?: string | null
          notes?: string | null
          type_document: string
          updated_at?: string
          uploaded_by?: string | null
          url_fichier: string
          valide?: boolean | null
        }
        Update: {
          created_at?: string
          date_emission?: string | null
          date_expiration?: string | null
          ecole_id?: string
          enseignant_id?: string
          id?: string
          libelle?: string | null
          notes?: string | null
          type_document?: string
          updated_at?: string
          uploaded_by?: string | null
          url_fichier?: string
          valide?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "enseignants_documents_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enseignants_documents_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
        ]
      }
      enseignants_evaluations: {
        Row: {
          annee_id: string | null
          axes_amelioration: string | null
          created_at: string
          date_evaluation: string
          ecole_id: string
          enseignant_id: string
          evaluateur_id: string | null
          id: string
          note_globale: number | null
          objectifs: string | null
          participation: number | null
          pedagogie: number | null
          points_forts: string | null
          ponctualite: number | null
          relation_eleves: number | null
          statut: string
          updated_at: string
        }
        Insert: {
          annee_id?: string | null
          axes_amelioration?: string | null
          created_at?: string
          date_evaluation?: string
          ecole_id: string
          enseignant_id: string
          evaluateur_id?: string | null
          id?: string
          note_globale?: number | null
          objectifs?: string | null
          participation?: number | null
          pedagogie?: number | null
          points_forts?: string | null
          ponctualite?: number | null
          relation_eleves?: number | null
          statut?: string
          updated_at?: string
        }
        Update: {
          annee_id?: string | null
          axes_amelioration?: string | null
          created_at?: string
          date_evaluation?: string
          ecole_id?: string
          enseignant_id?: string
          evaluateur_id?: string | null
          id?: string
          note_globale?: number | null
          objectifs?: string | null
          participation?: number | null
          pedagogie?: number | null
          points_forts?: string | null
          ponctualite?: number | null
          relation_eleves?: number | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enseignants_evaluations_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enseignants_evaluations_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enseignants_evaluations_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
        ]
      }
      enseignants_formations: {
        Row: {
          certificat_url: string | null
          cout: number | null
          created_at: string
          date_debut: string | null
          date_fin: string | null
          duree_heures: number | null
          ecole_id: string
          enseignant_id: string
          id: string
          intitule: string
          lieu: string | null
          notes: string | null
          organisme: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          certificat_url?: string | null
          cout?: number | null
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          duree_heures?: number | null
          ecole_id: string
          enseignant_id: string
          id?: string
          intitule: string
          lieu?: string | null
          notes?: string | null
          organisme?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          certificat_url?: string | null
          cout?: number | null
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          duree_heures?: number | null
          ecole_id?: string
          enseignant_id?: string
          id?: string
          intitule?: string
          lieu?: string | null
          notes?: string | null
          organisme?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enseignants_formations_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enseignants_formations_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          bareme: number
          classe_id: string
          coefficient: number
          created_at: string
          date_eval: string
          ecole_id: string
          enseignant_id: string | null
          id: string
          matiere_id: string
          periode_id: string | null
          titre: string
          type: string
          updated_at: string
        }
        Insert: {
          bareme?: number
          classe_id: string
          coefficient?: number
          created_at?: string
          date_eval: string
          ecole_id: string
          enseignant_id?: string | null
          id?: string
          matiere_id: string
          periode_id?: string | null
          titre: string
          type?: string
          updated_at?: string
        }
        Update: {
          bareme?: number
          classe_id?: string
          coefficient?: number
          created_at?: string
          date_eval?: string
          ecole_id?: string
          enseignant_id?: string | null
          id?: string
          matiere_id?: string
          periode_id?: string | null
          titre?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_matiere_id_fkey"
            columns: ["matiere_id"]
            isOneToOne: false
            referencedRelation: "matieres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_periode_id_fkey"
            columns: ["periode_id"]
            isOneToOne: false
            referencedRelation: "periodes"
            referencedColumns: ["id"]
          },
        ]
      }
      exigences_documents_eleves: {
        Row: {
          created_at: string
          ecole_id: string
          eleve_id: string
          id: string
          obligatoire: boolean
          type_document: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ecole_id: string
          eleve_id: string
          id?: string
          obligatoire?: boolean
          type_document: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ecole_id?: string
          eleve_id?: string
          id?: string
          obligatoire?: boolean
          type_document?: string
          updated_at?: string
        }
        Relationships: []
      }
      factures: {
        Row: {
          annee_id: string
          categorie: string
          created_at: string
          date_echeance: string
          date_emission: string
          ecole_id: string
          eleve_id: string
          id: string
          libelle: string
          montant: number
          montant_paye: number
          notes: string | null
          numero: string
          statut: string
          updated_at: string
        }
        Insert: {
          annee_id: string
          categorie?: string
          created_at?: string
          date_echeance: string
          date_emission?: string
          ecole_id: string
          eleve_id: string
          id?: string
          libelle?: string
          montant?: number
          montant_paye?: number
          notes?: string | null
          numero: string
          statut?: string
          updated_at?: string
        }
        Update: {
          annee_id?: string
          categorie?: string
          created_at?: string
          date_echeance?: string
          date_emission?: string
          ecole_id?: string
          eleve_id?: string
          id?: string
          libelle?: string
          montant?: number
          montant_paye?: number
          notes?: string | null
          numero?: string
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factures_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "v_conformite_sigfne"
            referencedColumns: ["eleve_id"]
          },
        ]
      }
      finance_settings: {
        Row: {
          banque: string | null
          cle_repartition_commune: string
          created_at: string
          devise: string
          ecole_id: string
          id: string
          modes_paiement: string[] | null
          numero_momo: string | null
          numero_om: string | null
          penalite_retard: number | null
          position_symbole: string
          prefixe_facture: string | null
          prefixe_recu: string | null
          prochain_numero_facture: number | null
          rappel_auto: boolean | null
          rib: string | null
          taux_tva: number
          updated_at: string
        }
        Insert: {
          banque?: string | null
          cle_repartition_commune?: string
          created_at?: string
          devise?: string
          ecole_id: string
          id?: string
          modes_paiement?: string[] | null
          numero_momo?: string | null
          numero_om?: string | null
          penalite_retard?: number | null
          position_symbole?: string
          prefixe_facture?: string | null
          prefixe_recu?: string | null
          prochain_numero_facture?: number | null
          rappel_auto?: boolean | null
          rib?: string | null
          taux_tva?: number
          updated_at?: string
        }
        Update: {
          banque?: string | null
          cle_repartition_commune?: string
          created_at?: string
          devise?: string
          ecole_id?: string
          id?: string
          modes_paiement?: string[] | null
          numero_momo?: string | null
          numero_om?: string | null
          penalite_retard?: number | null
          position_symbole?: string
          prefixe_facture?: string | null
          prefixe_recu?: string | null
          prochain_numero_facture?: number | null
          rappel_auto?: boolean | null
          rib?: string | null
          taux_tva?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_settings_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: true
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      fournisseurs: {
        Row: {
          adresse: string | null
          categorie: string | null
          contact: string | null
          created_at: string
          cycle_id: string | null
          ecole_id: string
          email: string | null
          id: string
          nom: string
          solde_du: number
          statut: string
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          categorie?: string | null
          contact?: string | null
          created_at?: string
          cycle_id?: string | null
          ecole_id: string
          email?: string | null
          id?: string
          nom: string
          solde_du?: number
          statut?: string
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          categorie?: string | null
          contact?: string | null
          created_at?: string
          cycle_id?: string | null
          ecole_id?: string
          email?: string | null
          id?: string
          nom?: string
          solde_du?: number
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fournisseurs_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      frais_scolarite: {
        Row: {
          annee_id: string
          created_at: string
          cycle_id: string
          ecole_id: string
          id: string
          libelle: string
          montant_annuel: number
          nb_tranches: number
          updated_at: string
        }
        Insert: {
          annee_id: string
          created_at?: string
          cycle_id: string
          ecole_id: string
          id?: string
          libelle?: string
          montant_annuel: number
          nb_tranches?: number
          updated_at?: string
        }
        Update: {
          annee_id?: string
          created_at?: string
          cycle_id?: string
          ecole_id?: string
          id?: string
          libelle?: string
          montant_annuel?: number
          nb_tranches?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "frais_scolarite_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frais_scolarite_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frais_scolarite_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      grille_tarifs_niveaux: {
        Row: {
          annee_id: string
          created_at: string
          cycle_id: string | null
          ecole_id: string
          id: string
          libelle: string
          montant_total: number
          niveau_code: string
          tranches: Json
          updated_at: string
          variant: string | null
        }
        Insert: {
          annee_id: string
          created_at?: string
          cycle_id?: string | null
          ecole_id: string
          id?: string
          libelle: string
          montant_total?: number
          niveau_code: string
          tranches?: Json
          updated_at?: string
          variant?: string | null
        }
        Update: {
          annee_id?: string
          created_at?: string
          cycle_id?: string | null
          ecole_id?: string
          id?: string
          libelle?: string
          montant_total?: number
          niveau_code?: string
          tranches?: Json
          updated_at?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grille_tarifs_niveaux_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grille_tarifs_niveaux_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grille_tarifs_niveaux_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      grille_tarifs_services: {
        Row: {
          actif: boolean
          annee_id: string
          created_at: string
          cycle_id: string | null
          ecole_id: string
          id: string
          libelle: string
          montant_total: number
          periodicite: string
          service_type: string
          tranches: Json
          updated_at: string
        }
        Insert: {
          actif?: boolean
          annee_id: string
          created_at?: string
          cycle_id?: string | null
          ecole_id: string
          id?: string
          libelle: string
          montant_total?: number
          periodicite?: string
          service_type: string
          tranches?: Json
          updated_at?: string
        }
        Update: {
          actif?: boolean
          annee_id?: string
          created_at?: string
          cycle_id?: string | null
          ecole_id?: string
          id?: string
          libelle?: string
          montant_total?: number
          periodicite?: string
          service_type?: string
          tranches?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grille_tarifs_services_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grille_tarifs_services_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grille_tarifs_services_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      groupe_membres: {
        Row: {
          created_at: string
          ecole_id: string
          eleve_id: string
          groupe_id: string
          id: string
        }
        Insert: {
          created_at?: string
          ecole_id: string
          eleve_id: string
          groupe_id: string
          id?: string
        }
        Update: {
          created_at?: string
          ecole_id?: string
          eleve_id?: string
          groupe_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groupe_membres_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "groupes_pedagogiques"
            referencedColumns: ["id"]
          },
        ]
      }
      groupes_pedagogiques: {
        Row: {
          annee_id: string | null
          created_at: string
          cycle_id: string | null
          description: string | null
          ecole_id: string
          enseignant_id: string | null
          id: string
          nom: string
          type: string
          updated_at: string
        }
        Insert: {
          annee_id?: string | null
          created_at?: string
          cycle_id?: string | null
          description?: string | null
          ecole_id: string
          enseignant_id?: string | null
          id?: string
          nom: string
          type?: string
          updated_at?: string
        }
        Update: {
          annee_id?: string | null
          created_at?: string
          cycle_id?: string | null
          description?: string | null
          ecole_id?: string
          enseignant_id?: string | null
          id?: string
          nom?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groupes_pedagogiques_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents_discipline: {
        Row: {
          annee_id: string | null
          classe_id: string | null
          created_at: string
          date_incident: string
          decision: string | null
          ecole_id: string
          eleve_id: string
          enregistre_par: string | null
          gravite: string | null
          id: string
          motif: string | null
          type: string
          updated_at: string
        }
        Insert: {
          annee_id?: string | null
          classe_id?: string | null
          created_at?: string
          date_incident?: string
          decision?: string | null
          ecole_id: string
          eleve_id: string
          enregistre_par?: string | null
          gravite?: string | null
          id?: string
          motif?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          annee_id?: string | null
          classe_id?: string | null
          created_at?: string
          date_incident?: string
          decision?: string | null
          ecole_id?: string
          eleve_id?: string
          enregistre_par?: string | null
          gravite?: string | null
          id?: string
          motif?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      justifications: {
        Row: {
          created_at: string
          date_traitement: string | null
          ecole_id: string
          eleve_id: string
          id: string
          motif: string
          piece_jointe: string | null
          presence_id: string | null
          statut: string
          traite_par: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_traitement?: string | null
          ecole_id: string
          eleve_id: string
          id?: string
          motif: string
          piece_jointe?: string | null
          presence_id?: string | null
          statut?: string
          traite_par?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_traitement?: string | null
          ecole_id?: string
          eleve_id?: string
          id?: string
          motif?: string
          piece_jointe?: string | null
          presence_id?: string | null
          statut?: string
          traite_par?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lignes_budget: {
        Row: {
          annee_id: string
          created_at: string
          cycle_id: string | null
          ecole_id: string
          id: string
          libelle: string
          montant_prevu: number
          montant_realise: number
          type: string
          updated_at: string
        }
        Insert: {
          annee_id: string
          created_at?: string
          cycle_id?: string | null
          ecole_id: string
          id?: string
          libelle: string
          montant_prevu?: number
          montant_realise?: number
          type?: string
          updated_at?: string
        }
        Update: {
          annee_id?: string
          created_at?: string
          cycle_id?: string | null
          ecole_id?: string
          id?: string
          libelle?: string
          montant_prevu?: number
          montant_realise?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lignes_budget_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      lignes_transport: {
        Row: {
          arrivee: string
          created_at: string
          cycle_id: string | null
          depart: string
          ecole_id: string
          heure_arrivee: string | null
          heure_depart: string | null
          id: string
          nom: string
          tarif_mensuel: number | null
          vehicule_id: string | null
        }
        Insert: {
          arrivee: string
          created_at?: string
          cycle_id?: string | null
          depart: string
          ecole_id: string
          heure_arrivee?: string | null
          heure_depart?: string | null
          id?: string
          nom: string
          tarif_mensuel?: number | null
          vehicule_id?: string | null
        }
        Update: {
          arrivee?: string
          created_at?: string
          cycle_id?: string | null
          depart?: string
          ecole_id?: string
          heure_arrivee?: string | null
          heure_depart?: string | null
          id?: string
          nom?: string
          tarif_mensuel?: number | null
          vehicule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lignes_transport_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lignes_transport_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lignes_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      livres: {
        Row: {
          auteur: string | null
          categorie: string | null
          created_at: string
          cycle_id: string | null
          disponible: number
          ecole_id: string
          editeur: string | null
          emplacement: string | null
          id: string
          isbn: string | null
          quantite: number
          titre: string
          updated_at: string
        }
        Insert: {
          auteur?: string | null
          categorie?: string | null
          created_at?: string
          cycle_id?: string | null
          disponible?: number
          ecole_id: string
          editeur?: string | null
          emplacement?: string | null
          id?: string
          isbn?: string | null
          quantite?: number
          titre: string
          updated_at?: string
        }
        Update: {
          auteur?: string | null
          categorie?: string | null
          created_at?: string
          cycle_id?: string | null
          disponible?: number
          ecole_id?: string
          editeur?: string | null
          emplacement?: string | null
          id?: string
          isbn?: string | null
          quantite?: number
          titre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "livres_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livres_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      matieres: {
        Row: {
          active: boolean
          categorie: string | null
          code: string | null
          coefficient: number
          couleur: string
          created_at: string
          cycle_id: string | null
          cycles: string[]
          ecole_id: string
          id: string
          nom: string
          note_passage: number
          note_sur: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          categorie?: string | null
          code?: string | null
          coefficient?: number
          couleur?: string
          created_at?: string
          cycle_id?: string | null
          cycles?: string[]
          ecole_id: string
          id?: string
          nom: string
          note_passage?: number
          note_sur?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          categorie?: string | null
          code?: string | null
          coefficient?: number
          couleur?: string
          created_at?: string
          cycle_id?: string | null
          cycles?: string[]
          ecole_id?: string
          id?: string
          nom?: string
          note_passage?: number
          note_sur?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matieres_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matieres_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      menus_cantine: {
        Row: {
          created_at: string
          cycle_id: string | null
          date_menu: string
          description: string | null
          ecole_id: string
          id: string
          repas: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_id?: string | null
          date_menu: string
          description?: string | null
          ecole_id: string
          id?: string
          repas?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_id?: string | null
          date_menu?: string
          description?: string | null
          ecole_id?: string
          id?: string
          repas?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menus_cantine_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          contenu: string | null
          created_at: string
          destinataire_id: string | null
          ecole_id: string
          expediteur_id: string
          id: string
          lu: boolean | null
          sujet: string
        }
        Insert: {
          contenu?: string | null
          created_at?: string
          destinataire_id?: string | null
          ecole_id: string
          expediteur_id: string
          id?: string
          lu?: boolean | null
          sujet: string
        }
        Update: {
          contenu?: string | null
          created_at?: string
          destinataire_id?: string | null
          ecole_id?: string
          expediteur_id?: string
          id?: string
          lu?: boolean | null
          sujet?: string
        }
        Relationships: []
      }
      mfa_backup_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mfa_failed_attempts: {
        Row: {
          attempts: number
          last_attempt_at: string
          locked_until: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          last_attempt_at?: string
          locked_until?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          last_attempt_at?: string
          locked_until?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mfa_requirements: {
        Row: {
          ecole_id: string
          grace_period_days: number
          id: string
          required: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          ecole_id: string
          grace_period_days?: number
          id?: string
          required?: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          ecole_id?: string
          grace_period_days?: number
          id?: string
          required?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      mfa_sms_factors: {
        Row: {
          activated_at: string | null
          created_at: string
          ecole_id: string | null
          friendly_name: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          phone: string
          phone_verified_at: string | null
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          ecole_id?: string | null
          friendly_name?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          phone: string
          phone_verified_at?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          ecole_id?: string | null
          friendly_name?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          phone?: string
          phone_verified_at?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      mfa_sms_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
          purpose: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          purpose?: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          purpose?: string
          user_id?: string
        }
        Relationships: []
      }
      modeles_exigences_documents: {
        Row: {
          created_at: string
          description: string | null
          ecole_id: string
          est_defaut: boolean
          id: string
          nom: string
          types_obligatoires: string[]
          types_optionnels: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ecole_id: string
          est_defaut?: boolean
          id?: string
          nom: string
          types_obligatoires?: string[]
          types_optionnels?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ecole_id?: string
          est_defaut?: boolean
          id?: string
          nom?: string
          types_obligatoires?: string[]
          types_optionnels?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      mouvements_tresorerie: {
        Row: {
          compte_id: string
          created_at: string
          date_mouvement: string
          ecole_id: string
          id: string
          libelle: string
          montant: number
          reference: string | null
          type: string
        }
        Insert: {
          compte_id: string
          created_at?: string
          date_mouvement?: string
          ecole_id: string
          id?: string
          libelle: string
          montant: number
          reference?: string | null
          type?: string
        }
        Update: {
          compte_id?: string
          created_at?: string
          date_mouvement?: string
          ecole_id?: string
          id?: string
          libelle?: string
          montant?: number
          reference?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "mouvements_tresorerie_compte_id_fkey"
            columns: ["compte_id"]
            isOneToOne: false
            referencedRelation: "comptes_tresorerie"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          absent: boolean | null
          commentaire: string | null
          created_at: string
          ecole_id: string
          eleve_id: string
          evaluation_id: string
          id: string
          note: number | null
          updated_at: string
        }
        Insert: {
          absent?: boolean | null
          commentaire?: string | null
          created_at?: string
          ecole_id: string
          eleve_id: string
          evaluation_id: string
          id?: string
          note?: number | null
          updated_at?: string
        }
        Update: {
          absent?: boolean | null
          commentaire?: string | null
          created_at?: string
          ecole_id?: string
          eleve_id?: string
          evaluation_id?: string
          id?: string
          note?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "v_conformite_sigfne"
            referencedColumns: ["eleve_id"]
          },
          {
            foreignKeyName: "notes_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_parents: {
        Row: {
          canal: string
          created_at: string
          date_envoi: string
          destinataire: string | null
          ecole_id: string
          eleve_id: string
          envoye_par: string | null
          id: string
          message: string | null
          type: string
        }
        Insert: {
          canal?: string
          created_at?: string
          date_envoi?: string
          destinataire?: string | null
          ecole_id: string
          eleve_id: string
          envoye_par?: string | null
          id?: string
          message?: string | null
          type?: string
        }
        Update: {
          canal?: string
          created_at?: string
          date_envoi?: string
          destinataire?: string | null
          ecole_id?: string
          eleve_id?: string
          envoye_par?: string | null
          id?: string
          message?: string | null
          type?: string
        }
        Relationships: []
      }
      paiements: {
        Row: {
          annule_le: string | null
          annule_par: string | null
          created_at: string
          date_paiement: string
          ecole_id: string
          eleve_id: string
          facture_id: string | null
          id: string
          mode: Database["public"]["Enums"]["paiement_mode"]
          montant: number
          motif: string | null
          motif_annulation: string | null
          notes: string | null
          recu_par: string | null
          reference: string | null
          tranche_id: string | null
        }
        Insert: {
          annule_le?: string | null
          annule_par?: string | null
          created_at?: string
          date_paiement?: string
          ecole_id: string
          eleve_id: string
          facture_id?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["paiement_mode"]
          montant: number
          motif?: string | null
          motif_annulation?: string | null
          notes?: string | null
          recu_par?: string | null
          reference?: string | null
          tranche_id?: string | null
        }
        Update: {
          annule_le?: string | null
          annule_par?: string | null
          created_at?: string
          date_paiement?: string
          ecole_id?: string
          eleve_id?: string
          facture_id?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["paiement_mode"]
          montant?: number
          motif?: string | null
          motif_annulation?: string | null
          notes?: string | null
          recu_par?: string | null
          reference?: string | null
          tranche_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paiements_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "v_conformite_sigfne"
            referencedColumns: ["eleve_id"]
          },
          {
            foreignKeyName: "paiements_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_tranche_id_fkey"
            columns: ["tranche_id"]
            isOneToOne: false
            referencedRelation: "tranches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_tranche_id_fkey"
            columns: ["tranche_id"]
            isOneToOne: false
            referencedRelation: "v_paiements_incoherents"
            referencedColumns: ["tranche_id"]
          },
        ]
      }
      paiements_services: {
        Row: {
          bon_reduction_id: string | null
          created_at: string
          echeance_id: string
          ecole_id: string
          eleve_id: string
          id: string
          mode: string
          montant: number
          motif: string | null
          recu_par: string | null
          reference: string | null
          service_type: string
        }
        Insert: {
          bon_reduction_id?: string | null
          created_at?: string
          echeance_id: string
          ecole_id: string
          eleve_id: string
          id?: string
          mode?: string
          montant: number
          motif?: string | null
          recu_par?: string | null
          reference?: string | null
          service_type: string
        }
        Update: {
          bon_reduction_id?: string | null
          created_at?: string
          echeance_id?: string
          ecole_id?: string
          eleve_id?: string
          id?: string
          mode?: string
          montant?: number
          motif?: string | null
          recu_par?: string | null
          reference?: string | null
          service_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "paiements_services_echeance_id_fkey"
            columns: ["echeance_id"]
            isOneToOne: false
            referencedRelation: "echeances_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_services_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_services_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_services_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "v_conformite_sigfne"
            referencedColumns: ["eleve_id"]
          },
        ]
      }
      parametres_classes: {
        Row: {
          alerte_classe_pleine: boolean
          capacite_defaut: number
          cours_samedi: boolean
          created_at: string
          detection_conflits: boolean
          duree_cours_min: number
          ecole_id: string
          effectif_min_alerte: number
          format_code_classe: string
          heure_debut_cours: string
          heure_fin_cours: string
          id: string
          updated_at: string
        }
        Insert: {
          alerte_classe_pleine?: boolean
          capacite_defaut?: number
          cours_samedi?: boolean
          created_at?: string
          detection_conflits?: boolean
          duree_cours_min?: number
          ecole_id: string
          effectif_min_alerte?: number
          format_code_classe?: string
          heure_debut_cours?: string
          heure_fin_cours?: string
          id?: string
          updated_at?: string
        }
        Update: {
          alerte_classe_pleine?: boolean
          capacite_defaut?: number
          cours_samedi?: boolean
          created_at?: string
          detection_conflits?: boolean
          duree_cours_min?: number
          ecole_id?: string
          effectif_min_alerte?: number
          format_code_classe?: string
          heure_debut_cours?: string
          heure_fin_cours?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      parametres_documents: {
        Row: {
          created_at: string
          ecole_id: string
          entete: string | null
          id: string
          pied_page: string | null
          prefixe_bulletin: string | null
          prefixe_certificat: string | null
          show_cachet: boolean
          show_logo: boolean
          signature_url: string | null
          templates_actifs: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          ecole_id: string
          entete?: string | null
          id?: string
          pied_page?: string | null
          prefixe_bulletin?: string | null
          prefixe_certificat?: string | null
          show_cachet?: boolean
          show_logo?: boolean
          signature_url?: string | null
          templates_actifs?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          ecole_id?: string
          entete?: string | null
          id?: string
          pied_page?: string | null
          prefixe_bulletin?: string | null
          prefixe_certificat?: string | null
          show_cachet?: boolean
          show_logo?: boolean
          signature_url?: string | null
          templates_actifs?: Json
          updated_at?: string
        }
        Relationships: []
      }
      parametres_emploi_temps: {
        Row: {
          auto_generer_remplacements: boolean
          canal_email: boolean
          canal_push: boolean
          canal_sms: boolean
          created_at: string
          duree_creneau_min: number
          duree_recreation_min: number
          ecole_id: string
          heure_debut: string
          heure_fin: string
          id: string
          jours_ouvres: string
          modele_message: string
          notif_annulations: boolean
          notif_modifications: boolean
          notif_remplacements: boolean
          pause_dej_debut: string
          pause_dej_fin: string
          updated_at: string
          verrouiller_apres_publication: boolean
        }
        Insert: {
          auto_generer_remplacements?: boolean
          canal_email?: boolean
          canal_push?: boolean
          canal_sms?: boolean
          created_at?: string
          duree_creneau_min?: number
          duree_recreation_min?: number
          ecole_id: string
          heure_debut?: string
          heure_fin?: string
          id?: string
          jours_ouvres?: string
          modele_message?: string
          notif_annulations?: boolean
          notif_modifications?: boolean
          notif_remplacements?: boolean
          pause_dej_debut?: string
          pause_dej_fin?: string
          updated_at?: string
          verrouiller_apres_publication?: boolean
        }
        Update: {
          auto_generer_remplacements?: boolean
          canal_email?: boolean
          canal_push?: boolean
          canal_sms?: boolean
          created_at?: string
          duree_creneau_min?: number
          duree_recreation_min?: number
          ecole_id?: string
          heure_debut?: string
          heure_fin?: string
          id?: string
          jours_ouvres?: string
          modele_message?: string
          notif_annulations?: boolean
          notif_modifications?: boolean
          notif_remplacements?: boolean
          pause_dej_debut?: string
          pause_dej_fin?: string
          updated_at?: string
          verrouiller_apres_publication?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "parametres_emploi_temps_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: true
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      parametres_localisation: {
        Row: {
          created_at: string
          ecole_id: string
          format_date: string
          format_heure: string
          fuseau: string
          id: string
          langue: string
          premier_jour: string
          separateur_decimal: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ecole_id: string
          format_date?: string
          format_heure?: string
          fuseau?: string
          id?: string
          langue?: string
          premier_jour?: string
          separateur_decimal?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ecole_id?: string
          format_date?: string
          format_heure?: string
          fuseau?: string
          id?: string
          langue?: string
          premier_jour?: string
          separateur_decimal?: string
          updated_at?: string
        }
        Relationships: []
      }
      parametres_matieres: {
        Row: {
          afficher_appreciation: boolean
          afficher_code_bulletin: boolean
          afficher_mentions: boolean
          afficher_rang: boolean
          arrondi: string
          autoriser_notes_hors_bareme: boolean
          coefficient_defaut: number
          created_at: string
          decimales_affichees: number
          echelle_defaut: number
          ecole_id: string
          education_religieuse: boolean
          id: string
          matieres_optionnelles: boolean
          note_passage_defaut: number
          signature_directeur_url: string | null
          systeme_notation: string
          texte_pied_bulletin: string | null
          updated_at: string
          verrouiller_coefficients: boolean
        }
        Insert: {
          afficher_appreciation?: boolean
          afficher_code_bulletin?: boolean
          afficher_mentions?: boolean
          afficher_rang?: boolean
          arrondi?: string
          autoriser_notes_hors_bareme?: boolean
          coefficient_defaut?: number
          created_at?: string
          decimales_affichees?: number
          echelle_defaut?: number
          ecole_id: string
          education_religieuse?: boolean
          id?: string
          matieres_optionnelles?: boolean
          note_passage_defaut?: number
          signature_directeur_url?: string | null
          systeme_notation?: string
          texte_pied_bulletin?: string | null
          updated_at?: string
          verrouiller_coefficients?: boolean
        }
        Update: {
          afficher_appreciation?: boolean
          afficher_code_bulletin?: boolean
          afficher_mentions?: boolean
          afficher_rang?: boolean
          arrondi?: string
          autoriser_notes_hors_bareme?: boolean
          coefficient_defaut?: number
          created_at?: string
          decimales_affichees?: number
          echelle_defaut?: number
          ecole_id?: string
          education_religieuse?: boolean
          id?: string
          matieres_optionnelles?: boolean
          note_passage_defaut?: number
          signature_directeur_url?: string | null
          systeme_notation?: string
          texte_pied_bulletin?: string | null
          updated_at?: string
          verrouiller_coefficients?: boolean
        }
        Relationships: []
      }
      parametres_notifications: {
        Row: {
          canaux: Json
          created_at: string
          ecole_id: string
          evenements: Json
          id: string
          silence_a: string | null
          silence_de: string | null
          smtp_from_email: string | null
          smtp_from_name: string | null
          smtp_host: string | null
          smtp_port: number | null
          smtp_user: string | null
          updated_at: string
        }
        Insert: {
          canaux?: Json
          created_at?: string
          ecole_id: string
          evenements?: Json
          id?: string
          silence_a?: string | null
          silence_de?: string | null
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string
        }
        Update: {
          canaux?: Json
          created_at?: string
          ecole_id?: string
          evenements?: Json
          id?: string
          silence_a?: string | null
          silence_de?: string | null
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      parametres_sigfne: {
        Row: {
          code_etablissement: string | null
          created_at: string
          drena: string | null
          ecole_id: string
          id: string
          regex_matricule: string
          updated_at: string
        }
        Insert: {
          code_etablissement?: string | null
          created_at?: string
          drena?: string | null
          ecole_id: string
          id?: string
          regex_matricule?: string
          updated_at?: string
        }
        Update: {
          code_etablissement?: string | null
          created_at?: string
          drena?: string | null
          ecole_id?: string
          id?: string
          regex_matricule?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parametres_sigfne_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: true
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      parcours_scolaire: {
        Row: {
          annee_id: string
          classe_destination_id: string | null
          classe_id: string
          created_at: string
          decision: string | null
          ecole_id: string
          eleve_id: string
          id: string
          moyenne_generale: number | null
          rang: number | null
          updated_at: string
        }
        Insert: {
          annee_id: string
          classe_destination_id?: string | null
          classe_id: string
          created_at?: string
          decision?: string | null
          ecole_id: string
          eleve_id: string
          id?: string
          moyenne_generale?: number | null
          rang?: number | null
          updated_at?: string
        }
        Update: {
          annee_id?: string
          classe_destination_id?: string | null
          classe_id?: string
          created_at?: string
          decision?: string | null
          ecole_id?: string
          eleve_id?: string
          id?: string
          moyenne_generale?: number | null
          rang?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      parents: {
        Row: {
          adresse: string | null
          created_at: string
          ecole_id: string
          email: string | null
          id: string
          nom: string
          prenom: string
          profession: string | null
          telephone: string
          telephone2: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          adresse?: string | null
          created_at?: string
          ecole_id: string
          email?: string | null
          id?: string
          nom: string
          prenom: string
          profession?: string | null
          telephone: string
          telephone2?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          adresse?: string | null
          created_at?: string
          ecole_id?: string
          email?: string | null
          id?: string
          nom?: string
          prenom?: string
          profession?: string | null
          telephone?: string
          telephone2?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parents_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      passages_classe: {
        Row: {
          annee_cible: string
          annee_source: string
          annule_le: string | null
          annule_par: string | null
          created_at: string
          ecole_id: string
          eleves_cibles_ids: string[]
          execute_le: string
          execute_par: string | null
          id: string
          plan: Json
          resultat: Json | null
          updated_at: string
        }
        Insert: {
          annee_cible: string
          annee_source: string
          annule_le?: string | null
          annule_par?: string | null
          created_at?: string
          ecole_id: string
          eleves_cibles_ids?: string[]
          execute_le?: string
          execute_par?: string | null
          id?: string
          plan: Json
          resultat?: Json | null
          updated_at?: string
        }
        Update: {
          annee_cible?: string
          annee_source?: string
          annule_le?: string | null
          annule_par?: string | null
          created_at?: string
          ecole_id?: string
          eleves_cibles_ids?: string[]
          execute_le?: string
          execute_par?: string | null
          id?: string
          plan?: Json
          resultat?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      periodes: {
        Row: {
          annee_id: string
          created_at: string
          debut: string
          ecole_id: string
          fin: string
          id: string
          nom: string
          statut: Database["public"]["Enums"]["periode_statut"]
        }
        Insert: {
          annee_id: string
          created_at?: string
          debut: string
          ecole_id: string
          fin: string
          id?: string
          nom: string
          statut?: Database["public"]["Enums"]["periode_statut"]
        }
        Update: {
          annee_id?: string
          created_at?: string
          debut?: string
          ecole_id?: string
          fin?: string
          id?: string
          nom?: string
          statut?: Database["public"]["Enums"]["periode_statut"]
        }
        Relationships: [
          {
            foreignKeyName: "periodes_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodes_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      presences: {
        Row: {
          classe_id: string
          created_at: string
          date_presence: string
          ecole_id: string
          eleve_id: string
          enregistre_par: string | null
          heure_arrivee: string | null
          id: string
          justifie: boolean | null
          motif_absence: string | null
          statut: Database["public"]["Enums"]["presence_statut"]
        }
        Insert: {
          classe_id: string
          created_at?: string
          date_presence: string
          ecole_id: string
          eleve_id: string
          enregistre_par?: string | null
          heure_arrivee?: string | null
          id?: string
          justifie?: boolean | null
          motif_absence?: string | null
          statut?: Database["public"]["Enums"]["presence_statut"]
        }
        Update: {
          classe_id?: string
          created_at?: string
          date_presence?: string
          ecole_id?: string
          eleve_id?: string
          enregistre_par?: string | null
          heure_arrivee?: string | null
          id?: string
          justifie?: boolean | null
          motif_absence?: string | null
          statut?: Database["public"]["Enums"]["presence_statut"]
        }
        Relationships: [
          {
            foreignKeyName: "presences_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presences_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presences_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presences_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "v_conformite_sigfne"
            referencedColumns: ["eleve_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          cycle_id: string | null
          ecole_id: string | null
          fonction: string | null
          full_name: string | null
          id: string
          langue: string | null
          must_change_password: boolean
          phone: string | null
          preferences: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          cycle_id?: string | null
          ecole_id?: string | null
          fonction?: string | null
          full_name?: string | null
          id: string
          langue?: string | null
          must_change_password?: boolean
          phone?: string | null
          preferences?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          cycle_id?: string | null
          ecole_id?: string | null
          fonction?: string | null
          full_name?: string | null
          id?: string
          langue?: string | null
          must_change_password?: boolean
          phone?: string | null
          preferences?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      progressions_matiere: {
        Row: {
          chapitres_faits: number
          chapitres_total: number
          classe_id: string | null
          created_at: string
          ecole_id: string
          id: string
          matiere_id: string
          notes: string | null
          periode: string
          updated_at: string
        }
        Insert: {
          chapitres_faits?: number
          chapitres_total?: number
          classe_id?: string | null
          created_at?: string
          ecole_id: string
          id?: string
          matiere_id: string
          notes?: string | null
          periode?: string
          updated_at?: string
        }
        Update: {
          chapitres_faits?: number
          chapitres_total?: number
          classe_id?: string | null
          created_at?: string
          ecole_id?: string
          id?: string
          matiere_id?: string
          notes?: string | null
          periode?: string
          updated_at?: string
        }
        Relationships: []
      }
      relances: {
        Row: {
          created_at: string
          date_envoi: string
          ecole_id: string
          eleve_id: string
          envoye_par: string | null
          id: string
          message: string | null
          parent_id: string | null
          type: Database["public"]["Enums"]["relance_type"]
        }
        Insert: {
          created_at?: string
          date_envoi?: string
          ecole_id: string
          eleve_id: string
          envoye_par?: string | null
          id?: string
          message?: string | null
          parent_id?: string | null
          type?: Database["public"]["Enums"]["relance_type"]
        }
        Update: {
          created_at?: string
          date_envoi?: string
          ecole_id?: string
          eleve_id?: string
          envoye_par?: string | null
          id?: string
          message?: string | null
          parent_id?: string | null
          type?: Database["public"]["Enums"]["relance_type"]
        }
        Relationships: [
          {
            foreignKeyName: "relances_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relances_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relances_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "v_conformite_sigfne"
            referencedColumns: ["eleve_id"]
          },
          {
            foreignKeyName: "relances_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
        ]
      }
      remplacements: {
        Row: {
          absent_enseignant_id: string
          annee_id: string | null
          classe_id: string | null
          created_at: string
          creneau_id: string | null
          date: string
          ecole_id: string
          heure_debut: string | null
          heure_fin: string | null
          id: string
          matiere_id: string | null
          motif: string | null
          notes: string | null
          remplacant_enseignant_id: string | null
          statut: Database["public"]["Enums"]["remplacement_statut"]
          updated_at: string
        }
        Insert: {
          absent_enseignant_id: string
          annee_id?: string | null
          classe_id?: string | null
          created_at?: string
          creneau_id?: string | null
          date: string
          ecole_id: string
          heure_debut?: string | null
          heure_fin?: string | null
          id?: string
          matiere_id?: string | null
          motif?: string | null
          notes?: string | null
          remplacant_enseignant_id?: string | null
          statut?: Database["public"]["Enums"]["remplacement_statut"]
          updated_at?: string
        }
        Update: {
          absent_enseignant_id?: string
          annee_id?: string | null
          classe_id?: string | null
          created_at?: string
          creneau_id?: string | null
          date?: string
          ecole_id?: string
          heure_debut?: string | null
          heure_fin?: string | null
          id?: string
          matiere_id?: string | null
          motif?: string | null
          notes?: string | null
          remplacant_enseignant_id?: string | null
          statut?: Database["public"]["Enums"]["remplacement_statut"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "remplacements_absent_enseignant_id_fkey"
            columns: ["absent_enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remplacements_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remplacements_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remplacements_creneau_id_fkey"
            columns: ["creneau_id"]
            isOneToOne: false
            referencedRelation: "creneaux_emploi_temps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remplacements_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remplacements_matiere_id_fkey"
            columns: ["matiere_id"]
            isOneToOne: false
            referencedRelation: "matieres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remplacements_remplacant_enseignant_id_fkey"
            columns: ["remplacant_enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
        ]
      }
      report_jobs: {
        Row: {
          created_at: string
          ecole_id: string
          error: string | null
          finished_at: string | null
          id: string
          label: string
          params: Json
          started_at: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ecole_id: string
          error?: string | null
          finished_at?: string | null
          id?: string
          label: string
          params?: Json
          started_at?: string | null
          status?: string
          type: string
          user_id?: string
        }
        Update: {
          created_at?: string
          ecole_id?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          label?: string
          params?: Json
          started_at?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_jobs_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      retards: {
        Row: {
          annee_id: string | null
          classe_id: string | null
          created_at: string
          date_retard: string
          duree_minutes: number | null
          ecole_id: string
          eleve_id: string
          enregistre_par: string | null
          heure_arrivee: string | null
          id: string
          motif: string | null
          updated_at: string
        }
        Insert: {
          annee_id?: string | null
          classe_id?: string | null
          created_at?: string
          date_retard?: string
          duree_minutes?: number | null
          ecole_id: string
          eleve_id: string
          enregistre_par?: string | null
          heure_arrivee?: string | null
          id?: string
          motif?: string | null
          updated_at?: string
        }
        Update: {
          annee_id?: string | null
          classe_id?: string | null
          created_at?: string
          date_retard?: string
          duree_minutes?: number | null
          ecole_id?: string
          eleve_id?: string
          enregistre_par?: string | null
          heure_arrivee?: string | null
          id?: string
          motif?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_export: boolean
          can_update: boolean
          can_view: boolean
          created_at: string
          ecole_id: string
          id: string
          module_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_export?: boolean
          can_update?: boolean
          can_view?: boolean
          created_at?: string
          ecole_id: string
          id?: string
          module_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_export?: boolean
          can_update?: boolean
          can_view?: boolean
          created_at?: string
          ecole_id?: string
          id?: string
          module_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "app_modules"
            referencedColumns: ["key"]
          },
        ]
      }
      salles: {
        Row: {
          batiment: string | null
          capacite: number
          code: string
          created_at: string
          cycle_id: string | null
          ecole_id: string
          equipements: string[] | null
          etage: string | null
          id: string
          nom: string | null
          notes: string | null
          statut: string
          type: string
          updated_at: string
        }
        Insert: {
          batiment?: string | null
          capacite?: number
          code: string
          created_at?: string
          cycle_id?: string | null
          ecole_id: string
          equipements?: string[] | null
          etage?: string | null
          id?: string
          nom?: string | null
          notes?: string | null
          statut?: string
          type?: string
          updated_at?: string
        }
        Update: {
          batiment?: string | null
          capacite?: number
          code?: string
          created_at?: string
          cycle_id?: string | null
          ecole_id?: string
          equipements?: string[] | null
          etage?: string | null
          id?: string
          nom?: string | null
          notes?: string | null
          statut?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salles_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salles_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      sanctions_presences: {
        Row: {
          annee_id: string | null
          classe_id: string | null
          created_at: string
          date_sanction: string
          ecole_id: string
          eleve_id: string
          enregistre_par: string | null
          id: string
          motif: string | null
          nb_absences_declencheur: number | null
          notifie_parents: boolean | null
          type: string
          updated_at: string
        }
        Insert: {
          annee_id?: string | null
          classe_id?: string | null
          created_at?: string
          date_sanction?: string
          ecole_id: string
          eleve_id: string
          enregistre_par?: string | null
          id?: string
          motif?: string | null
          nb_absences_declencheur?: number | null
          notifie_parents?: boolean | null
          type?: string
          updated_at?: string
        }
        Update: {
          annee_id?: string | null
          classe_id?: string | null
          created_at?: string
          date_sanction?: string
          ecole_id?: string
          eleve_id?: string
          enregistre_par?: string | null
          id?: string
          motif?: string | null
          nb_absences_declencheur?: number | null
          notifie_parents?: boolean | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_audit_logs: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          ecole_id: string | null
          event_severity: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          ecole_id?: string | null
          event_severity?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          ecole_id?: string | null
          event_severity?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sessions_compositions: {
        Row: {
          annee_id: string | null
          consignes: string | null
          created_at: string
          date_debut: string
          date_fin: string
          ecole_id: string
          id: string
          libelle: string
          periode_id: string | null
          statut: string
          type_session: string
          updated_at: string
        }
        Insert: {
          annee_id?: string | null
          consignes?: string | null
          created_at?: string
          date_debut: string
          date_fin: string
          ecole_id: string
          id?: string
          libelle: string
          periode_id?: string | null
          statut?: string
          type_session?: string
          updated_at?: string
        }
        Update: {
          annee_id?: string | null
          consignes?: string | null
          created_at?: string
          date_debut?: string
          date_fin?: string
          ecole_id?: string
          id?: string
          libelle?: string
          periode_id?: string | null
          statut?: string
          type_session?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_compositions_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_compositions_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_config: {
        Row: {
          api_token: string
          api_token_last4: string | null
          base_url: string
          cout_unitaire: number
          created_at: string
          ecole_id: string
          has_api_token: boolean
          id: string
          is_active: boolean
          provider: string
          sender_id: string
          updated_at: string
          whatsapp_cout_unitaire: number
          whatsapp_enabled: boolean
          whatsapp_url: string
        }
        Insert: {
          api_token?: string
          api_token_last4?: string | null
          base_url?: string
          cout_unitaire?: number
          created_at?: string
          ecole_id: string
          has_api_token?: boolean
          id?: string
          is_active?: boolean
          provider?: string
          sender_id?: string
          updated_at?: string
          whatsapp_cout_unitaire?: number
          whatsapp_enabled?: boolean
          whatsapp_url?: string
        }
        Update: {
          api_token?: string
          api_token_last4?: string | null
          base_url?: string
          cout_unitaire?: number
          created_at?: string
          ecole_id?: string
          has_api_token?: boolean
          id?: string
          is_active?: boolean
          provider?: string
          sender_id?: string
          updated_at?: string
          whatsapp_cout_unitaire?: number
          whatsapp_enabled?: boolean
          whatsapp_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_config_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: true
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          canal: string
          cout: number
          created_at: string
          destinataire: string
          ecole_id: string
          envoye_par: string | null
          id: string
          message: string
          provider_response: Json | null
          sender_id: string
          statut: string
        }
        Insert: {
          canal?: string
          cout?: number
          created_at?: string
          destinataire: string
          ecole_id: string
          envoye_par?: string | null
          id?: string
          message: string
          provider_response?: Json | null
          sender_id?: string
          statut?: string
        }
        Update: {
          canal?: string
          cout?: number
          created_at?: string
          destinataire?: string
          ecole_id?: string
          envoye_par?: string | null
          id?: string
          message?: string
          provider_response?: Json | null
          sender_id?: string
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      sp_candidats: {
        Row: {
          classe_demandee: string | null
          classe_demandee_id: string | null
          converti_eleve_id: string | null
          created_at: string
          created_by: string | null
          date_naissance: string | null
          date_test: string | null
          ecole_id: string
          ecole_origine: string | null
          id: string
          moyenne_test: number | null
          nom: string
          note_anglais: number | null
          note_francais: number | null
          note_maths: number | null
          numero: string
          observations: string | null
          parent: string | null
          prenom: string
          session_id: string | null
          sexe: string | null
          statut: Database["public"]["Enums"]["sp_candidat_statut"]
          telephone: string | null
          updated_at: string
        }
        Insert: {
          classe_demandee?: string | null
          classe_demandee_id?: string | null
          converti_eleve_id?: string | null
          created_at?: string
          created_by?: string | null
          date_naissance?: string | null
          date_test?: string | null
          ecole_id: string
          ecole_origine?: string | null
          id?: string
          moyenne_test?: number | null
          nom: string
          note_anglais?: number | null
          note_francais?: number | null
          note_maths?: number | null
          numero: string
          observations?: string | null
          parent?: string | null
          prenom: string
          session_id?: string | null
          sexe?: string | null
          statut?: Database["public"]["Enums"]["sp_candidat_statut"]
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          classe_demandee?: string | null
          classe_demandee_id?: string | null
          converti_eleve_id?: string | null
          created_at?: string
          created_by?: string | null
          date_naissance?: string | null
          date_test?: string | null
          ecole_id?: string
          ecole_origine?: string | null
          id?: string
          moyenne_test?: number | null
          nom?: string
          note_anglais?: number | null
          note_francais?: number | null
          note_maths?: number | null
          numero?: string
          observations?: string | null
          parent?: string | null
          prenom?: string
          session_id?: string | null
          sexe?: string | null
          statut?: Database["public"]["Enums"]["sp_candidat_statut"]
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sp_candidats_classe_demandee_id_fkey"
            columns: ["classe_demandee_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sp_candidats_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sp_test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sp_paiements: {
        Row: {
          annule_le: string | null
          annule_par: string | null
          beneficiaire_libre: string | null
          beneficiaire_type: Database["public"]["Enums"]["sp_beneficiaire_type"]
          caissier_id: string | null
          candidat_id: string | null
          created_at: string
          date_paiement: string
          ecole_id: string
          eleve_id: string | null
          id: string
          mode_paiement: Database["public"]["Enums"]["sp_mode_paiement"]
          montant_du: number
          montant_paye: number
          motif_annulation: string | null
          numero: string
          observations: string | null
          remise: number
          service_id: string
          updated_at: string
        }
        Insert: {
          annule_le?: string | null
          annule_par?: string | null
          beneficiaire_libre?: string | null
          beneficiaire_type: Database["public"]["Enums"]["sp_beneficiaire_type"]
          caissier_id?: string | null
          candidat_id?: string | null
          created_at?: string
          date_paiement?: string
          ecole_id: string
          eleve_id?: string | null
          id?: string
          mode_paiement?: Database["public"]["Enums"]["sp_mode_paiement"]
          montant_du?: number
          montant_paye?: number
          motif_annulation?: string | null
          numero: string
          observations?: string | null
          remise?: number
          service_id: string
          updated_at?: string
        }
        Update: {
          annule_le?: string | null
          annule_par?: string | null
          beneficiaire_libre?: string | null
          beneficiaire_type?: Database["public"]["Enums"]["sp_beneficiaire_type"]
          caissier_id?: string | null
          candidat_id?: string | null
          created_at?: string
          date_paiement?: string
          ecole_id?: string
          eleve_id?: string | null
          id?: string
          mode_paiement?: Database["public"]["Enums"]["sp_mode_paiement"]
          montant_du?: number
          montant_paye?: number
          motif_annulation?: string | null
          numero?: string
          observations?: string | null
          remise?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sp_paiements_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "sp_services"
            referencedColumns: ["id"]
          },
        ]
      }
      sp_services: {
        Row: {
          accepte_partiel: boolean
          actif: boolean
          couleur: string
          created_at: string
          cycle_id: string | null
          description: string | null
          ecole_id: string
          gere_stock: boolean
          icone: string
          id: string
          nom: string
          prix: number
          slug: string
          stock_actuel: number | null
          updated_at: string
        }
        Insert: {
          accepte_partiel?: boolean
          actif?: boolean
          couleur?: string
          created_at?: string
          cycle_id?: string | null
          description?: string | null
          ecole_id: string
          gere_stock?: boolean
          icone?: string
          id?: string
          nom: string
          prix?: number
          slug: string
          stock_actuel?: number | null
          updated_at?: string
        }
        Update: {
          accepte_partiel?: boolean
          actif?: boolean
          couleur?: string
          created_at?: string
          cycle_id?: string | null
          description?: string | null
          ecole_id?: string
          gere_stock?: boolean
          icone?: string
          id?: string
          nom?: string
          prix?: number
          slug?: string
          stock_actuel?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sp_services_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      sp_stock_tenues: {
        Row: {
          classe_id: string
          created_at: string
          ecole_id: string
          genre: string
          id: string
          prix_unitaire: number | null
          seuil_alerte: number
          stock_actuel: number
          updated_at: string
        }
        Insert: {
          classe_id: string
          created_at?: string
          ecole_id: string
          genre: string
          id?: string
          prix_unitaire?: number | null
          seuil_alerte?: number
          stock_actuel?: number
          updated_at?: string
        }
        Update: {
          classe_id?: string
          created_at?: string
          ecole_id?: string
          genre?: string
          id?: string
          prix_unitaire?: number | null
          seuil_alerte?: number
          stock_actuel?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sp_stock_tenues_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sp_stock_tenues_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      sp_stock_tenues_mouvements: {
        Row: {
          classe_id: string
          created_at: string
          ecole_id: string
          genre: string
          id: string
          motif: string | null
          quantite: number
          stock_apres: number | null
          stock_avant: number | null
          type: string
          user_id: string | null
          vente_id: string | null
        }
        Insert: {
          classe_id: string
          created_at?: string
          ecole_id: string
          genre: string
          id?: string
          motif?: string | null
          quantite: number
          stock_apres?: number | null
          stock_avant?: number | null
          type: string
          user_id?: string | null
          vente_id?: string | null
        }
        Update: {
          classe_id?: string
          created_at?: string
          ecole_id?: string
          genre?: string
          id?: string
          motif?: string | null
          quantite?: number
          stock_apres?: number | null
          stock_avant?: number | null
          type?: string
          user_id?: string | null
          vente_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sp_stock_tenues_mouvements_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sp_stock_tenues_mouvements_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sp_stock_tenues_mouvements_vente_id_fkey"
            columns: ["vente_id"]
            isOneToOne: false
            referencedRelation: "sp_ventes_tenues"
            referencedColumns: ["id"]
          },
        ]
      }
      sp_test_sessions: {
        Row: {
          actif: boolean
          capacite: number | null
          created_at: string
          created_by: string | null
          date_test: string
          ecole_id: string
          id: string
          libelle: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean
          capacite?: number | null
          created_at?: string
          created_by?: string | null
          date_test: string
          ecole_id: string
          id?: string
          libelle?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean
          capacite?: number | null
          created_at?: string
          created_by?: string | null
          date_test?: string
          ecole_id?: string
          id?: string
          libelle?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sp_ventes_tenues: {
        Row: {
          acheteur_libre: string | null
          acheteur_type: Database["public"]["Enums"]["sp_beneficiaire_type"]
          annule_le: string | null
          annule_par: string | null
          caissier_id: string | null
          candidat_id: string | null
          classe_id: string | null
          created_at: string
          ecole_id: string
          eleve_id: string | null
          genre: string | null
          id: string
          mode_paiement: Database["public"]["Enums"]["sp_mode_paiement"]
          montant_total: number
          motif_annulation: string | null
          numero: string
          observations: string | null
          paiement_id: string | null
          prix_unitaire: number
          quantite: number
          statut: Database["public"]["Enums"]["sp_vente_statut"]
          updated_at: string
        }
        Insert: {
          acheteur_libre?: string | null
          acheteur_type: Database["public"]["Enums"]["sp_beneficiaire_type"]
          annule_le?: string | null
          annule_par?: string | null
          caissier_id?: string | null
          candidat_id?: string | null
          classe_id?: string | null
          created_at?: string
          ecole_id: string
          eleve_id?: string | null
          genre?: string | null
          id?: string
          mode_paiement?: Database["public"]["Enums"]["sp_mode_paiement"]
          montant_total?: number
          motif_annulation?: string | null
          numero: string
          observations?: string | null
          paiement_id?: string | null
          prix_unitaire?: number
          quantite?: number
          statut?: Database["public"]["Enums"]["sp_vente_statut"]
          updated_at?: string
        }
        Update: {
          acheteur_libre?: string | null
          acheteur_type?: Database["public"]["Enums"]["sp_beneficiaire_type"]
          annule_le?: string | null
          annule_par?: string | null
          caissier_id?: string | null
          candidat_id?: string | null
          classe_id?: string | null
          created_at?: string
          ecole_id?: string
          eleve_id?: string | null
          genre?: string | null
          id?: string
          mode_paiement?: Database["public"]["Enums"]["sp_mode_paiement"]
          montant_total?: number
          motif_annulation?: string | null
          numero?: string
          observations?: string | null
          paiement_id?: string | null
          prix_unitaire?: number
          quantite?: number
          statut?: Database["public"]["Enums"]["sp_vente_statut"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sp_ventes_tenues_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sp_ventes_tenues_paiement_id_fkey"
            columns: ["paiement_id"]
            isOneToOne: false
            referencedRelation: "sp_paiements"
            referencedColumns: ["id"]
          },
        ]
      }
      stocks_cantine: {
        Row: {
          created_at: string
          cycle_id: string | null
          ecole_id: string
          id: string
          produit: string
          quantite: number
          seuil_alerte: number | null
          unite: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_id?: string | null
          ecole_id: string
          id?: string
          produit: string
          quantite?: number
          seuil_alerte?: number | null
          unite?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_id?: string | null
          ecole_id?: string
          id?: string
          produit?: string
          quantite?: number
          seuil_alerte?: number | null
          unite?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stocks_cantine_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_invitations: {
        Row: {
          consumed_at: string | null
          created_at: string
          created_by: string | null
          ecole_id: string
          email: string | null
          enseignant_id: string
          expires_at: string
          id: string
          telephone: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          created_by?: string | null
          ecole_id: string
          email?: string | null
          enseignant_id: string
          expires_at?: string
          id?: string
          telephone?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          created_by?: string | null
          ecole_id?: string
          email?: string | null
          enseignant_id?: string
          expires_at?: string
          id?: string
          telephone?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_invitations_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
        ]
      }
      tranches: {
        Row: {
          created_at: string
          echeance: string
          ecole_id: string
          eleve_id: string
          frais_id: string
          id: string
          label: string
          montant: number
          numero: number
          paye: number
          statut: Database["public"]["Enums"]["tranche_statut"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          echeance: string
          ecole_id: string
          eleve_id: string
          frais_id: string
          id?: string
          label: string
          montant: number
          numero: number
          paye?: number
          statut?: Database["public"]["Enums"]["tranche_statut"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          echeance?: string
          ecole_id?: string
          eleve_id?: string
          frais_id?: string
          id?: string
          label?: string
          montant?: number
          numero?: number
          paye?: number
          statut?: Database["public"]["Enums"]["tranche_statut"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tranches_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tranches_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tranches_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "v_conformite_sigfne"
            referencedColumns: ["eleve_id"]
          },
          {
            foreignKeyName: "tranches_frais_id_fkey"
            columns: ["frais_id"]
            isOneToOne: false
            referencedRelation: "frais_scolarite"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_carburant: {
        Row: {
          chauffeur_id: string | null
          created_at: string
          date_plein: string
          ecole_id: string
          id: string
          km_compteur: number | null
          litres: number
          montant: number
          notes: string | null
          prix_litre: number
          updated_at: string
          vehicule_id: string
        }
        Insert: {
          chauffeur_id?: string | null
          created_at?: string
          date_plein?: string
          ecole_id: string
          id?: string
          km_compteur?: number | null
          litres: number
          montant: number
          notes?: string | null
          prix_litre: number
          updated_at?: string
          vehicule_id: string
        }
        Update: {
          chauffeur_id?: string | null
          created_at?: string
          date_plein?: string
          ecole_id?: string
          id?: string
          km_compteur?: number | null
          litres?: number
          montant?: number
          notes?: string | null
          prix_litre?: number
          updated_at?: string
          vehicule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_carburant_chauffeur_id_fkey"
            columns: ["chauffeur_id"]
            isOneToOne: false
            referencedRelation: "chauffeurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_carburant_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_carburant_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_incidents: {
        Row: {
          chauffeur_id: string | null
          created_at: string
          date_incident: string
          description: string
          ecole_id: string
          gravite: string
          id: string
          statut: string
          type: string
          updated_at: string
          vehicule_id: string | null
        }
        Insert: {
          chauffeur_id?: string | null
          created_at?: string
          date_incident?: string
          description: string
          ecole_id: string
          gravite?: string
          id?: string
          statut?: string
          type?: string
          updated_at?: string
          vehicule_id?: string | null
        }
        Update: {
          chauffeur_id?: string | null
          created_at?: string
          date_incident?: string
          description?: string
          ecole_id?: string
          gravite?: string
          id?: string
          statut?: string
          type?: string
          updated_at?: string
          vehicule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_incidents_chauffeur_id_fkey"
            columns: ["chauffeur_id"]
            isOneToOne: false
            referencedRelation: "chauffeurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_incidents_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_incidents_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_maintenance: {
        Row: {
          cout: number
          created_at: string
          date_operation: string
          description: string | null
          ecole_id: string
          garage: string | null
          id: string
          km_compteur: number | null
          prochaine_echeance_date: string | null
          prochaine_echeance_km: number | null
          statut: string
          type: string
          updated_at: string
          vehicule_id: string
        }
        Insert: {
          cout?: number
          created_at?: string
          date_operation?: string
          description?: string | null
          ecole_id: string
          garage?: string | null
          id?: string
          km_compteur?: number | null
          prochaine_echeance_date?: string | null
          prochaine_echeance_km?: number | null
          statut?: string
          type?: string
          updated_at?: string
          vehicule_id: string
        }
        Update: {
          cout?: number
          created_at?: string
          date_operation?: string
          description?: string | null
          ecole_id?: string
          garage?: string | null
          id?: string
          km_compteur?: number | null
          prochaine_echeance_date?: string | null
          prochaine_echeance_km?: number | null
          statut?: string
          type?: string
          updated_at?: string
          vehicule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_maintenance_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_maintenance_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_devices: {
        Row: {
          device_fingerprint: string
          device_name: string | null
          id: string
          ip_address: string | null
          last_seen_at: string
          revoked_at: string | null
          trusted_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          device_fingerprint: string
          device_name?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          revoked_at?: string | null
          trusted_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          device_fingerprint?: string
          device_name?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          revoked_at?: string | null
          trusted_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_export: boolean
          can_update: boolean
          can_view: boolean
          created_at: string
          ecole_id: string
          granted_by: string | null
          id: string
          module_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_export?: boolean
          can_update?: boolean
          can_view?: boolean
          created_at?: string
          ecole_id: string
          granted_by?: string | null
          id?: string
          module_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_export?: boolean
          can_update?: boolean
          can_view?: boolean
          created_at?: string
          ecole_id?: string
          granted_by?: string | null
          id?: string
          module_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "app_modules"
            referencedColumns: ["key"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          ecole_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          ecole_id: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          ecole_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      vacances_classes: {
        Row: {
          actif: boolean
          annee_id: string | null
          capacite: number | null
          created_at: string
          ecole_id: string
          id: string
          montant: number
          nom: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          annee_id?: string | null
          capacite?: number | null
          created_at?: string
          ecole_id: string
          id?: string
          montant?: number
          nom: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          annee_id?: string | null
          capacite?: number | null
          created_at?: string
          ecole_id?: string
          id?: string
          montant?: number
          nom?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacances_classes_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacances_classes_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      vacances_eleves: {
        Row: {
          annee_id: string | null
          classe_id: string
          contact_parent: string | null
          created_at: string
          date_inscription: string
          date_naissance: string | null
          ecole_id: string
          etablissement_origine: string | null
          id: string
          nom: string
          observation: string | null
          prenom: string
          sexe: string | null
          statut_paiement: string
          updated_at: string
        }
        Insert: {
          annee_id?: string | null
          classe_id: string
          contact_parent?: string | null
          created_at?: string
          date_inscription?: string
          date_naissance?: string | null
          ecole_id: string
          etablissement_origine?: string | null
          id?: string
          nom: string
          observation?: string | null
          prenom: string
          sexe?: string | null
          statut_paiement?: string
          updated_at?: string
        }
        Update: {
          annee_id?: string | null
          classe_id?: string
          contact_parent?: string | null
          created_at?: string
          date_inscription?: string
          date_naissance?: string | null
          ecole_id?: string
          etablissement_origine?: string | null
          id?: string
          nom?: string
          observation?: string | null
          prenom?: string
          sexe?: string | null
          statut_paiement?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacances_eleves_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacances_eleves_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "vacances_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacances_eleves_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      vacances_enseignants: {
        Row: {
          annee_id: string | null
          classe_id: string | null
          created_at: string
          ecole_id: string
          honoraire_prevu: number
          id: string
          matiere: string | null
          nom: string
          observation: string | null
          prenom: string
          telephone: string | null
          updated_at: string
        }
        Insert: {
          annee_id?: string | null
          classe_id?: string | null
          created_at?: string
          ecole_id: string
          honoraire_prevu?: number
          id?: string
          matiere?: string | null
          nom: string
          observation?: string | null
          prenom: string
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          annee_id?: string | null
          classe_id?: string | null
          created_at?: string
          ecole_id?: string
          honoraire_prevu?: number
          id?: string
          matiere?: string | null
          nom?: string
          observation?: string | null
          prenom?: string
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacances_enseignants_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacances_enseignants_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "vacances_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacances_enseignants_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      vacances_honoraires: {
        Row: {
          created_at: string
          date_paiement: string
          ecole_id: string
          enseignant_id: string
          id: string
          mode: string
          montant: number
          observation: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_paiement?: string
          ecole_id: string
          enseignant_id: string
          id?: string
          mode?: string
          montant: number
          observation?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_paiement?: string
          ecole_id?: string
          enseignant_id?: string
          id?: string
          mode?: string
          montant?: number
          observation?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacances_honoraires_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacances_honoraires_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "vacances_enseignants"
            referencedColumns: ["id"]
          },
        ]
      }
      vacances_paiements: {
        Row: {
          classe_id: string
          created_at: string
          date_paiement: string
          ecole_id: string
          eleve_id: string
          id: string
          mode: string
          montant_attendu: number
          montant_paye: number
          observation: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          classe_id: string
          created_at?: string
          date_paiement?: string
          ecole_id: string
          eleve_id: string
          id?: string
          mode?: string
          montant_attendu?: number
          montant_paye?: number
          observation?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          classe_id?: string
          created_at?: string
          date_paiement?: string
          ecole_id?: string
          eleve_id?: string
          id?: string
          mode?: string
          montant_attendu?: number
          montant_paye?: number
          observation?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacances_paiements_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "vacances_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacances_paiements_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacances_paiements_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "vacances_eleves"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicules: {
        Row: {
          capacite: number | null
          chauffeur: string | null
          created_at: string
          cycle_id: string | null
          ecole_id: string
          id: string
          immatriculation: string
          marque: string | null
          modele: string | null
          statut: string
          telephone_chauffeur: string | null
          updated_at: string
        }
        Insert: {
          capacite?: number | null
          chauffeur?: string | null
          created_at?: string
          cycle_id?: string | null
          ecole_id: string
          id?: string
          immatriculation: string
          marque?: string | null
          modele?: string | null
          statut?: string
          telephone_chauffeur?: string | null
          updated_at?: string
        }
        Update: {
          capacite?: number | null
          chauffeur?: string | null
          created_at?: string
          cycle_id?: string | null
          ecole_id?: string
          id?: string
          immatriculation?: string
          marque?: string | null
          modele?: string | null
          statut?: string
          telephone_chauffeur?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicules_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicules_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      visites_infirmerie: {
        Row: {
          classe_id: string | null
          created_at: string
          date_visite: string
          ecole_id: string
          eleve_id: string
          enregistre_par: string | null
          id: string
          motif: string
          suivi: string | null
          traitement: string | null
          updated_at: string
        }
        Insert: {
          classe_id?: string | null
          created_at?: string
          date_visite?: string
          ecole_id: string
          eleve_id: string
          enregistre_par?: string | null
          id?: string
          motif: string
          suivi?: string | null
          traitement?: string | null
          updated_at?: string
        }
        Update: {
          classe_id?: string | null
          created_at?: string
          date_visite?: string
          ecole_id?: string
          eleve_id?: string
          enregistre_par?: string | null
          id?: string
          motif?: string
          suivi?: string | null
          traitement?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_conformite_sigfne: {
        Row: {
          annee_id: string | null
          classe: string | null
          classe_id: string | null
          diagnostic: string | null
          doublon_matricule: boolean | null
          ecole_id: string | null
          eleve_id: string | null
          matricule: string | null
          matricule_national: string | null
          nom: string | null
          prenom: string | null
          statut_sigfne: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eleves_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleves_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleves_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_export_sigfne_eleves: {
        Row: {
          annee_id: string | null
          CLASSE: string | null
          code_etablissement: string | null
          DATE_NAISSANCE: string | null
          drena: string | null
          ecole_id: string | null
          LIEU_NAISSANCE: string | null
          MATRICULE: string | null
          NATIONALITE: string | null
          NOM: string | null
          PRENOMS: string | null
          SEXE: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eleves_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleves_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_paiements_incoherents: {
        Row: {
          ecole_id: string | null
          eleve_id: string | null
          montant: number | null
          numero: number | null
          paye_tranche: number | null
          somme_paiements: number | null
          tranche_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tranches_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tranches_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tranches_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "v_conformite_sigfne"
            referencedColumns: ["eleve_id"]
          },
        ]
      }
    }
    Functions: {
      activer_annee_scolaire: {
        Args: { _annee_id: string; _ecole_id: string }
        Returns: undefined
      }
      admin_reset_user_mfa: {
        Args: { _ecole_id: string; _motif: string; _target_user_id: string }
        Returns: undefined
      }
      annuler_paiement_facture: {
        Args: { _motif: string; _paiement_id: string }
        Returns: Json
      }
      annuler_passage_classe: { Args: { _passage_id: string }; Returns: Json }
      annuler_transfert: { Args: { _audit_log_id: string }; Returns: Json }
      appliquer_bon_service: {
        Args: { _bon_id: string; _echeance_id: string }
        Returns: Json
      }
      appliquer_decisions_fin_annee: {
        Args: { _annee_id: string; _ecole_id: string }
        Returns: Json
      }
      appliquer_remise: {
        Args: {
          _accorde_par?: string
          _ecole_id: string
          _eleve_id: string
          _montant: number
          _motif: string
          _tranche_id: string
          _type_remise: string
        }
        Returns: string
      }
      check_and_promote_eleve: {
        Args: { _eleve_id: string }
        Returns: undefined
      }
      check_creneau_feasibility: {
        Args: {
          _annee_id: string
          _classe_id: string
          _ecole_id: string
          _enseignant_id: string
          _exclude_id?: string
          _heure_debut: string
          _heure_fin: string
          _jour: number
          _salle_id: string
        }
        Returns: Json
      }
      check_creneau_overlap: {
        Args: {
          _annee_id: string
          _classe_id: string
          _ecole_id: string
          _enseignant_id: string
          _exclude_id?: string
          _heure_debut: string
          _heure_fin: string
          _jour: number
        }
        Returns: string
      }
      cloturer_annee: {
        Args: { _annee_id: string; _ecole_id: string }
        Returns: undefined
      }
      cloturer_et_basculer_annee: {
        Args: {
          p_annee_cible: string
          p_annee_source: string
          p_dry_run?: boolean
          p_ecole_id: string
        }
        Returns: {
          detail: string
          element: string
          etape: string
          niveau: string
        }[]
      }
      consume_backup_code: { Args: { _code_hash: string }; Returns: boolean }
      consume_sms_otp: {
        Args: { _code_hash: string; _purpose: string; _user_id: string }
        Returns: boolean
      }
      consume_teacher_invitation: {
        Args: { _token_hash: string }
        Returns: Json
      }
      decrypt_sms_api_token: {
        Args: { _config_id: string; _passphrase: string }
        Returns: string
      }
      detect_all_conflicts: {
        Args: { _annee_id: string; _ecole_id: string }
        Returns: {
          creneau_ids: string[]
          description: string
          heure_debut: string
          heure_fin: string
          jour: number
          severity: string
          type: string
        }[]
      }
      dupliquer_grille_annee: {
        Args: { _annee_cible: string; _annee_source: string; _ecole_id: string }
        Returns: number
      }
      enregistrer_paiement: {
        Args: {
          _ecole_id: string
          _eleve_id: string
          _mode: string
          _montant: number
          _recu_par?: string
          _reference?: string
          _tranche_id: string
        }
        Returns: string
      }
      enregistrer_paiement_facture: {
        Args: {
          _facture_id: string
          _mode?: string
          _montant: number
          _recu_par?: string
          _reference?: string
        }
        Returns: string
      }
      enregistrer_paiement_service: {
        Args: {
          _echeance_id: string
          _mode: string
          _montant: number
          _motif?: string
          _reference?: string
        }
        Returns: string
      }
      est_annee_cloturee: { Args: { _annee_id: string }; Returns: boolean }
      est_periode_verrouillee: {
        Args: { _periode_id: string }
        Returns: boolean
      }
      executer_passage_classe: {
        Args: {
          _annee_cible: string
          _annee_source: string
          _ecole_id: string
          _plan: Json
        }
        Returns: Json
      }
      generer_echeances_service: {
        Args: { _eleve_id: string; _grille_id: string; _service_type: string }
        Returns: number
      }
      generer_factures_service: {
        Args: {
          _abonnement_id: string
          _ecole_id: string
          _service_type: string
        }
        Returns: number
      }
      generer_tranches_eleve: {
        Args: { _eleve_id: string; _force_recalc?: boolean }
        Returns: undefined
      }
      generer_tranches_pour_frais: {
        Args: { _frais_id: string }
        Returns: number
      }
      get_effective_permissions: {
        Args: { _ecole_id: string; _user_id: string }
        Returns: {
          can_create: boolean
          can_delete: boolean
          can_export: boolean
          can_update: boolean
          can_view: boolean
          module_key: string
        }[]
      }
      has_permission: {
        Args: {
          _action: string
          _ecole_id: string
          _module: string
          _user_id: string
        }
        Returns: boolean
      }
      import_matricules_sigfne: {
        Args: { p_dry_run?: boolean; p_ecole_id: string; p_rows: Json }
        Returns: {
          detail: string
          eleve_id: string
          eleve_nom: string
          ligne: number
          matricule_national: string
          resultat: string
        }[]
      }
      is_mfa_locked: { Args: { _user_id?: string }; Returns: boolean }
      is_mfa_required_for_user: { Args: { _user_id: string }; Returns: boolean }
      log_security_event: {
        Args: {
          _device_fp?: string
          _ecole_id?: string
          _event_type: string
          _ip?: string
          _metadata?: Json
          _severity?: string
          _user_agent?: string
        }
        Returns: string
      }
      matricule_valide: {
        Args: { p_ecole_id: string; p_matricule: string }
        Returns: boolean
      }
      modifier_paiement: {
        Args: {
          _mode: string
          _montant: number
          _motif: string
          _paiement_id: string
          _reference: string
        }
        Returns: undefined
      }
      normaliser_etat_civil: { Args: { txt: string }; Returns: string }
      promouvoir_eleves_annee: {
        Args: {
          _annee_cible: string
          _annee_source: string
          _ecole_id: string
          _mapping?: Json
          _mode?: string
        }
        Returns: Json
      }
      recalc_vacances_eleve_statut: {
        Args: { _eleve_id: string }
        Returns: undefined
      }
      recalculer_grille_ecole: {
        Args: {
          _annee_id: string
          _ecole_id: string
          _niveau_code?: string
          _seulement_pre_inscrits?: boolean
        }
        Returns: Json
      }
      recalculer_honoraires_vacances: {
        Args: { p_classe_id: string }
        Returns: undefined
      }
      reconduire_affectations_pedagogiques: {
        Args: {
          _annee_cible: string
          _annee_source: string
          _ecole_id: string
          _options?: Json
        }
        Returns: Json
      }
      regenerer_tranches_pre_inscrits: {
        Args: { _annee_id: string; _ecole_id: string }
        Returns: number
      }
      register_failed_mfa: { Args: never; Returns: Json }
      renouveler_abonnements: {
        Args: {
          _annee_cible: string
          _annee_source: string
          _ecole_id: string
          _types: string[]
        }
        Returns: Json
      }
      reset_failed_mfa: { Args: never; Returns: undefined }
      resilier_contrat_enseignant: {
        Args: { _contrat_id: string; _date_rupture?: string; _motif: string }
        Returns: undefined
      }
      resoudre_niveau_code: { Args: { _classe_nom: string }; Returns: string }
      restaurer_annee: {
        Args: { _annee_id: string; _ecole_id: string }
        Returns: undefined
      }
      seed_role_permissions_for_ecole: {
        Args: { _ecole_id: string }
        Returns: undefined
      }
      set_role_permissions: {
        Args: {
          _ecole_id: string
          _permissions: Json
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
      set_user_permissions: {
        Args: { _ecole_id: string; _permissions: Json; _target_user: string }
        Returns: undefined
      }
      sp_annuler_paiement: {
        Args: { _motif: string; _paiement_id: string }
        Returns: undefined
      }
      sp_annuler_vente: {
        Args: { _motif: string; _vente_id: string }
        Returns: undefined
      }
      sp_convertir_candidat: {
        Args: { _annee_id: string; _candidat_id: string; _classe_id?: string }
        Returns: string
      }
      sp_supprimer_paiement: {
        Args: { _paiement_id: string }
        Returns: undefined
      }
      stats_conformite_sigfne: {
        Args: { p_ecole_id: string }
        Returns: {
          anomalies: number
          conformes: number
          doublons: number
          sans_matricule: number
          taux_conformite: number
          total: number
        }[]
      }
      tracer_envoi_bulletin: {
        Args: { _channels: Json; _id: string; _recipients: Json }
        Returns: undefined
      }
      transferer_eleve: {
        Args: {
          _classe_dest_id: string
          _eleve_id: string
          _force?: boolean
          _motif?: string
        }
        Returns: Json
      }
      transferer_masse: {
        Args: {
          _classe_dest_id: string
          _eleve_ids: string[]
          _force?: boolean
          _motif?: string
        }
        Returns: Json
      }
      unaccent: { Args: { "": string }; Returns: string }
      upsert_bulletin_audit: {
        Args: {
          _annee_id: string
          _appreciation_generale: string
          _classe_id: string
          _decision_conseil: string
          _decision_detail: string
          _ecole_id: string
          _eleve_id: string
          _mention: string
          _moyenne: number
          _override_motif?: string
          _periode_id: string
          _rang: number
        }
        Returns: string
      }
      verrouiller_bulletin: {
        Args: { _id: string; _pdf_hash: string; _pdf_path: string }
        Returns: undefined
      }
    }
    Enums: {
      annee_statut:
        | "active"
        | "preparation"
        | "verrouillee"
        | "archivee"
        | "cloturee"
      app_role:
        | "admin"
        | "directeur"
        | "comptable"
        | "enseignant"
        | "surveillant"
        | "parent"
        | "educateur"
        | "secretaire"
      carte_statut: "active" | "perdue" | "expiree" | "annulee" | "revoquee"
      carte_type:
        | "eleve"
        | "enseignant"
        | "personnel"
        | "cantine"
        | "transport"
        | "bibliotheque"
        | "visiteur"
      decoupage_type: "trimestre" | "semestre"
      ecole_status: "active" | "suspendue" | "archivee"
      paiement_mode:
        | "especes"
        | "wave"
        | "orange_money"
        | "mtn_money"
        | "moov_money"
        | "virement"
        | "cheque"
        | "remise"
        | "bourse"
        | "prise_en_charge"
      periode_statut: "a_venir" | "en_cours" | "verrouillee"
      presence_statut: "present" | "absent" | "retard" | "excuse"
      relance_type: "sms" | "email" | "appel" | "courrier"
      remplacement_statut: "a_pourvoir" | "en_attente" | "confirme" | "annule"
      sexe_type: "M" | "F"
      sp_beneficiaire_type: "eleve" | "candidat" | "libre"
      sp_candidat_statut:
        | "en_attente"
        | "programme"
        | "absent"
        | "present"
        | "admis"
        | "refuse"
      sp_mode_paiement:
        | "especes"
        | "wave"
        | "orange_money"
        | "mtn_money"
        | "moov_money"
        | "virement"
        | "cheque"
      sp_vente_statut: "paye" | "remis" | "attente" | "annule" | "reservation"
      tranche_statut: "payee" | "partielle" | "due" | "retard"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      annee_statut: [
        "active",
        "preparation",
        "verrouillee",
        "archivee",
        "cloturee",
      ],
      app_role: [
        "admin",
        "directeur",
        "comptable",
        "enseignant",
        "surveillant",
        "parent",
        "educateur",
        "secretaire",
      ],
      carte_statut: ["active", "perdue", "expiree", "annulee", "revoquee"],
      carte_type: [
        "eleve",
        "enseignant",
        "personnel",
        "cantine",
        "transport",
        "bibliotheque",
        "visiteur",
      ],
      decoupage_type: ["trimestre", "semestre"],
      ecole_status: ["active", "suspendue", "archivee"],
      paiement_mode: [
        "especes",
        "wave",
        "orange_money",
        "mtn_money",
        "moov_money",
        "virement",
        "cheque",
        "remise",
        "bourse",
        "prise_en_charge",
      ],
      periode_statut: ["a_venir", "en_cours", "verrouillee"],
      presence_statut: ["present", "absent", "retard", "excuse"],
      relance_type: ["sms", "email", "appel", "courrier"],
      remplacement_statut: ["a_pourvoir", "en_attente", "confirme", "annule"],
      sexe_type: ["M", "F"],
      sp_beneficiaire_type: ["eleve", "candidat", "libre"],
      sp_candidat_statut: [
        "en_attente",
        "programme",
        "absent",
        "present",
        "admis",
        "refuse",
      ],
      sp_mode_paiement: [
        "especes",
        "wave",
        "orange_money",
        "mtn_money",
        "moov_money",
        "virement",
        "cheque",
      ],
      sp_vente_statut: ["paye", "remis", "attente", "annule", "reservation"],
      tranche_statut: ["payee", "partielle", "due", "retard"],
    },
  },
} as const
