import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/context/AcademicPeriodContext', () => ({useAcademicPeriod:()=>({annees:[{id:'year',libelle:'2026–2027',statut:'active',debut:'2026-09-01'}],activeAnneeId:'year',activeAnnee:{libelle:'2026–2027',statut:'active'},setActiveAnneeId:vi.fn(),loading:false})}));
vi.mock('@/context/NiveauContext', () => ({NIVEAU_LABELS:{all:'Tous les niveaux',primaire:'Primaire',secondaire:'Secondaire'},useNiveau:()=>({niveau:'all',setNiveau:vi.fn(),forced:false,isGlobal:true,effectifs:{total:250,primaire:150,secondaire:100},cycles:[{}]})}));
vi.mock('@/hooks/usePermissions',()=>({usePermissions:()=>({can:()=>true,loading:false})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{signOut:vi.fn()}}}));
vi.mock('@/components/pwa/InstallPWAButton',()=>({InstallPWAButton:()=>null}));
vi.mock('@/components/pwa/InstallPWAMenuItem',()=>({InstallPWAMenuItem:()=>null}));
import { AppHeader } from './AppHeader';
import { TopNav } from './TopNav';

describe('Mobile navigation',()=>{
 it('exposes one working menu and closes it after selecting a destination',async()=>{
  render(<MemoryRouter initialEntries={['/eleves']}><AppHeader/><TopNav/></MemoryRouter>);
  const menu=screen.getByRole('button',{name:'Ouvrir le menu'});
  expect(screen.getByRole('combobox',{name:'Année scolaire'})).toBeEnabled();
  expect(screen.getByRole('combobox',{name:'Niveau'})).toBeEnabled();
  expect(screen.getByRole('button',{name:'Menu du compte'})).toBeEnabled();
  fireEvent.click(menu);
  const drawer=await screen.findByRole('dialog');
  expect(within(drawer).getByRole('button',{name:'Fermer'})).toBeEnabled();
  fireEvent.click(within(drawer).getByRole('link',{name:'Statistiques'}));
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 });
});
