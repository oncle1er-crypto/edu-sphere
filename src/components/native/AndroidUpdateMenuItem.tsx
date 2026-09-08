import { useState } from 'react';
import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ANDROID_UPDATE_URL, ANDROID_PACKAGE_ID, hasAndroidUpdate, parseAndroidRelease } from '@/lib/androidUpdates';
const NativeConfiguration = registerPlugin<{openUpdateDownload(options:{url:string}):Promise<void>}>('NativeConfiguration');

export function AndroidUpdateMenuItem() {
  const [checking, setChecking] = useState(false);
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return null;
  async function checkUpdate() {
    if (checking) return;
    setChecking(true);
    try {
      const installed = await App.getInfo();
      if (installed.id !== ANDROID_PACKAGE_ID) throw new Error('Application Android non reconnue.');
      const response = await CapacitorHttp.get({url:ANDROID_UPDATE_URL,headers:{'Cache-Control':'no-cache'},connectTimeout:10000,readTimeout:10000});
      if (response.status === 404) {
        toast.info('Le service de mise à jour n’est pas encore activé.');
        return;
      }
      if (response.status !== 200) throw new Error('Service de mise à jour indisponible. Réessayez plus tard.');
      const release = parseAndroidRelease(typeof response.data === 'string' ? JSON.parse(response.data) : response.data);
      if (!hasAndroidUpdate(installed.build, release)) {
        toast.success(`Votre application est à jour (version ${installed.version}).`);
        return;
      }
      toast(`Version ${release.versionName} disponible`, {
        description: 'Téléchargez le nouvel APK, puis confirmez son installation dans Android.',
        duration: 20000,
        action: {label:'Télécharger',onClick:()=>{
          void NativeConfiguration.openUpdateDownload({url:release.apkUrl})
            .catch(()=>toast.error('Impossible d’ouvrir le téléchargement.'));
        }},
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Vérification impossible. Vérifiez votre connexion.');
    } finally { setChecking(false); }
  }
  return <DropdownMenuItem disabled={checking} onSelect={(event)=>{event.preventDefault();void checkUpdate();}}>
    <Download className="mr-2 h-4 w-4"/>{checking ? 'Vérification en cours…' : 'Vérifier les mises à jour'}
  </DropdownMenuItem>;
}
