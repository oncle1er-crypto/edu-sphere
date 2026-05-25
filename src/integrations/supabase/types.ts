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
        ]
      }
      abonnements_transport: {
        Row: {
          annee_id: string
          created_at: string
          ecole_id: string
          eleve_id: string
          id: string
          ligne_id: string
          statut: string
        }
        Insert: {
          annee_id: string
          created_at?: string
          ecole_id: string
          eleve_id: string
          id?: string
          ligne_id: string
          statut?: string
        }
        Update: {
          annee_id?: string
          created_at?: string
          ecole_id?: string
          eleve_id?: string
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
          numero: string
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
          numero: string
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
          numero?: string
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
            foreignKeyName: "cartes_enseignant_id_fkey"
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
          updated_at?: string
        }
        Relationships: []
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
            foreignKeyName: "depenses_fournisseur_id_fkey"
            columns: ["fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseurs"
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
          id: string
          lieu_naissance: string | null
          matricule: string
          nationalite: string | null
          nom: string
          photo_url: string | null
          prenom: string
          sexe: Database["public"]["Enums"]["sexe_type"] | null
          statut: string
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
          id?: string
          lieu_naissance?: string | null
          matricule: string
          nationalite?: string | null
          nom: string
          photo_url?: string | null
          prenom: string
          sexe?: Database["public"]["Enums"]["sexe_type"] | null
          statut?: string
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
          id?: string
          lieu_naissance?: string | null
          matricule?: string
          nationalite?: string | null
          nom?: string
          photo_url?: string | null
          prenom?: string
          sexe?: Database["public"]["Enums"]["sexe_type"] | null
          statut?: string
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
        }
        Insert: {
          annee_id?: string | null
          classe_id?: string | null
          created_at?: string
          ecole_id: string
          enseignant_id: string
          id?: string
          matiere_id: string
        }
        Update: {
          annee_id?: string | null
          classe_id?: string | null
          created_at?: string
          ecole_id?: string
          enseignant_id?: string
          id?: string
          matiere_id?: string
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
          date_embauche: string | null
          diplome: string | null
          ecole_id: string
          email: string | null
          id: string
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
          date_embauche?: string | null
          diplome?: string | null
          ecole_id: string
          email?: string | null
          id?: string
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
          date_embauche?: string | null
          diplome?: string | null
          ecole_id?: string
          email?: string | null
          id?: string
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
            foreignKeyName: "enseignants_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
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
        ]
      }
      finance_settings: {
        Row: {
          banque: string | null
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
          ecole_id?: string
          email?: string | null
          id?: string
          nom?: string
          solde_du?: number
          statut?: string
          updated_at?: string
        }
        Relationships: []
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
          description?: string | null
          ecole_id?: string
          enseignant_id?: string | null
          id?: string
          nom?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
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
          ecole_id?: string
          id?: string
          libelle?: string
          montant_prevu?: number
          montant_realise?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      lignes_transport: {
        Row: {
          arrivee: string
          created_at: string
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
          categorie: string | null
          code: string | null
          created_at: string
          ecole_id: string
          id: string
          nom: string
        }
        Insert: {
          categorie?: string | null
          code?: string | null
          created_at?: string
          ecole_id: string
          id?: string
          nom: string
        }
        Update: {
          categorie?: string | null
          code?: string | null
          created_at?: string
          ecole_id?: string
          id?: string
          nom?: string
        }
        Relationships: [
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
          date_menu: string
          description: string | null
          ecole_id: string
          id: string
          repas: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_menu: string
          description?: string | null
          ecole_id: string
          id?: string
          repas?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_menu?: string
          description?: string | null
          ecole_id?: string
          id?: string
          repas?: string
          updated_at?: string
        }
        Relationships: []
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
          created_at: string
          date_paiement: string
          ecole_id: string
          eleve_id: string
          id: string
          mode: Database["public"]["Enums"]["paiement_mode"]
          montant: number
          notes: string | null
          recu_par: string | null
          reference: string | null
          tranche_id: string | null
        }
        Insert: {
          created_at?: string
          date_paiement?: string
          ecole_id: string
          eleve_id: string
          id?: string
          mode?: Database["public"]["Enums"]["paiement_mode"]
          montant: number
          notes?: string | null
          recu_par?: string | null
          reference?: string | null
          tranche_id?: string | null
        }
        Update: {
          created_at?: string
          date_paiement?: string
          ecole_id?: string
          eleve_id?: string
          id?: string
          mode?: Database["public"]["Enums"]["paiement_mode"]
          montant?: number
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
            foreignKeyName: "paiements_tranche_id_fkey"
            columns: ["tranche_id"]
            isOneToOne: false
            referencedRelation: "tranches"
            referencedColumns: ["id"]
          },
        ]
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
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          ecole_id: string | null
          fonction: string | null
          full_name: string | null
          id: string
          langue: string | null
          phone: string | null
          preferences: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          ecole_id?: string | null
          fonction?: string | null
          full_name?: string | null
          id: string
          langue?: string | null
          phone?: string | null
          preferences?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          ecole_id?: string | null
          fonction?: string | null
          full_name?: string | null
          id?: string
          langue?: string | null
          phone?: string | null
          preferences?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_ecole_id_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
            referencedRelation: "ecoles"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "relances_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
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
      sms_config: {
        Row: {
          api_token: string
          base_url: string
          cout_unitaire: number
          created_at: string
          ecole_id: string
          id: string
          is_active: boolean
          provider: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          api_token?: string
          base_url?: string
          cout_unitaire?: number
          created_at?: string
          ecole_id: string
          id?: string
          is_active?: boolean
          provider?: string
          sender_id?: string
          updated_at?: string
        }
        Update: {
          api_token?: string
          base_url?: string
          cout_unitaire?: number
          created_at?: string
          ecole_id?: string
          id?: string
          is_active?: boolean
          provider?: string
          sender_id?: string
          updated_at?: string
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
      stocks_cantine: {
        Row: {
          created_at: string
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
          ecole_id?: string
          id?: string
          produit?: string
          quantite?: number
          seuil_alerte?: number | null
          unite?: string | null
          updated_at?: string
        }
        Relationships: []
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
            foreignKeyName: "tranches_frais_id_fkey"
            columns: ["frais_id"]
            isOneToOne: false
            referencedRelation: "frais_scolarite"
            referencedColumns: ["id"]
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
      vehicules: {
        Row: {
          capacite: number | null
          chauffeur: string | null
          created_at: string
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
      [_ in never]: never
    }
    Functions: {
      appliquer_decisions_fin_annee: {
        Args: { _annee_id: string; _ecole_id: string; _user_id: string }
        Returns: Json
      }
      check_and_promote_eleve: {
        Args: { _eleve_id: string }
        Returns: undefined
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
      decrypt_sms_api_token: {
        Args: { _config_id: string; _passphrase: string }
        Returns: string
      }
    }
    Enums: {
      annee_statut: "active" | "preparation" | "verrouillee" | "archivee"
      app_role:
        | "admin"
        | "directeur"
        | "comptable"
        | "enseignant"
        | "surveillant"
        | "parent"
      carte_statut: "active" | "perdue" | "expiree" | "annulee"
      carte_type: "eleve" | "enseignant" | "personnel"
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
      periode_statut: "a_venir" | "en_cours" | "verrouillee"
      presence_statut: "present" | "absent" | "retard" | "excuse"
      relance_type: "sms" | "email" | "appel" | "courrier"
      sexe_type: "M" | "F"
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
      annee_statut: ["active", "preparation", "verrouillee", "archivee"],
      app_role: [
        "admin",
        "directeur",
        "comptable",
        "enseignant",
        "surveillant",
        "parent",
      ],
      carte_statut: ["active", "perdue", "expiree", "annulee"],
      carte_type: ["eleve", "enseignant", "personnel"],
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
      ],
      periode_statut: ["a_venir", "en_cours", "verrouillee"],
      presence_statut: ["present", "absent", "retard", "excuse"],
      relance_type: ["sms", "email", "appel", "courrier"],
      sexe_type: ["M", "F"],
      tranche_statut: ["payee", "partielle", "due", "retard"],
    },
  },
} as const
