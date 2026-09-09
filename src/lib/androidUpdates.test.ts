import { describe, expect, it } from 'vitest';
import { ANDROID_PACKAGE_ID, ANDROID_SIGNING_SHA256, parseAndroidRelease, hasAndroidUpdate } from './androidUpdates';
const release={applicationId:ANDROID_PACKAGE_ID,versionCode:5,versionName:'1.0.4',apkUrl:'https://gs-laprovidence.lovable.app/android/releases/la-providence-1.0.4-5.apk',sha256:'a'.repeat(64),signingCertificateSha256:ANDROID_SIGNING_SHA256};
describe('Android updates',()=>{
 it('only proposes newer builds',()=>{expect(hasAndroidUpdate('4',parseAndroidRelease(release))).toBe(true);expect(hasAndroidUpdate('5',release)).toBe(false);expect(hasAndroidUpdate('6',release)).toBe(false);});
 it.each(['https://evil.example/android/releases/la-providence-1.0.4-5.apk','http://gs-laprovidence.lovable.app/android/releases/la-providence-1.0.4-5.apk','https://gs-laprovidence.lovable.app/android/releases/la-providence-1.0.4-5.apk?redirect=evil','javascript:alert(1)'])('rejects untrusted downloads: %s',apkUrl=>expect(()=>parseAndroidRelease({...release,apkUrl})).toThrow());
 it('rejects wrong packages, certificates, corrupt versions and manifests',()=>{
  for(const data of [null,{...release,applicationId:'other.app'},{...release,versionCode:-1},{...release,versionCode:5.5},{...release,signingCertificateSha256:'b'.repeat(64)},{...release,sha256:'bad'}]) expect(()=>parseAndroidRelease(data)).toThrow();
  expect(()=>hasAndroidUpdate('unknown',release)).toThrow();
 });
});
