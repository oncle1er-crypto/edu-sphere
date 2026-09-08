export const ANDROID_UPDATE_ORIGIN = 'https://gs-laprovidence.lovable.app';
export const ANDROID_UPDATE_URL = `${ANDROID_UPDATE_ORIGIN}/android/latest.json`;
export const ANDROID_PACKAGE_ID = 'ci.ecftech.edusphere';
export const ANDROID_SIGNING_SHA256 = '39c736d549743f1be232f8260a1242211f33ca30624e74b29a337a9133c7baad';
export interface AndroidRelease {
  applicationId: string;
  versionCode: number;
  versionName: string;
  apkUrl: string;
  sha256: string;
  signingCertificateSha256: string;
}
export function parseAndroidRelease(input: unknown): AndroidRelease {
  if (!input || typeof input !== 'object') throw new Error('Informations de mise à jour invalides.');
  const r = input as Partial<AndroidRelease>;
  if (r.applicationId !== ANDROID_PACKAGE_ID || !Number.isSafeInteger(r.versionCode) || (r.versionCode ?? 0) < 1 || (r.versionCode ?? 0) > 2100000000 ||
      typeof r.versionName !== 'string' || !/^\d+\.\d+\.\d+$/.test(r.versionName) ||
      typeof r.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(r.sha256) ||
      r.signingCertificateSha256 !== ANDROID_SIGNING_SHA256 || typeof r.apkUrl !== 'string') {
    throw new Error('La mise à jour ne correspond pas à La Providence.');
  }
  const url = new URL(r.apkUrl);
  if (url.origin !== ANDROID_UPDATE_ORIGIN || url.username || url.password || url.search || url.hash ||
      url.pathname !== `/android/releases/la-providence-${r.versionName}-${r.versionCode}.apk`) {
    throw new Error('Adresse de téléchargement non autorisée.');
  }
  return r as AndroidRelease;
}
export function hasAndroidUpdate(installedBuild: string, release: AndroidRelease): boolean {
  if (!/^\d+$/.test(installedBuild) || !Number.isSafeInteger(Number(installedBuild))) {
    throw new Error('Impossible de déterminer la version installée.');
  }
  return release.versionCode > Number(installedBuild);
}
