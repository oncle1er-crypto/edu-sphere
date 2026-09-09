import { readFile, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const [apk, code, version] = process.argv.slice(2);
if (!apk || !/^\d+$/.test(code ?? '') || !Number.isSafeInteger(Number(code)) || Number(code) < 4 || Number(code) > 2100000000 || !/^\d+\.\d+\.\d+$/.test(version ?? '')) throw new Error('Version Android invalide.');
const config = await readFile('src/lib/androidUpdates.ts','utf8');
const origin = config.match(/ANDROID_UPDATE_ORIGIN = '([^']+)'/)[1];
const signingCertificateSha256 = config.match(/ANDROID_SIGNING_SHA256 = '([a-f0-9]{64})'/)[1];
let previous;
try { previous = JSON.parse(await readFile('public/android/latest.json','utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (previous && Number(code) <= previous.versionCode) throw new Error('Le numéro doit être supérieur à la version publiée.');
const name = `la-providence-${version}-${code}.apk`;
await mkdir('public/android/releases',{recursive:true});
await copyFile(apk,`public/android/releases/${name}`);
await writeFile('public/android/latest.json', JSON.stringify({applicationId:'ci.ecftech.edusphere',versionCode:Number(code),versionName:version,apkUrl:`${origin}/android/releases/${name}`,sha256:createHash('sha256').update(await readFile(apk)).digest('hex'),signingCertificateSha256},null,2)+'\n');
console.log('APK et manifeste préparés :',name);
