#!/usr/bin/env python3
import base64, hashlib, json, os, tempfile, tarfile
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import quote
import boto3, requests
from botocore.exceptions import ClientError
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

REQ=["BRIDGE_URL","CLOUDFLARE_ACCOUNT_ID","R2_BUCKET","R2_ACCESS_KEY_ID","R2_SECRET_ACCESS_KEY","BACKUP_ENCRYPTION_KEY_B64","ACTIONS_ID_TOKEN_REQUEST_URL","ACTIONS_ID_TOKEN_REQUEST_TOKEN"]
miss=[x for x in REQ if not os.getenv(x)]
if miss: raise SystemExit("Variables manquantes: "+", ".join(miss))
now=datetime.now(timezone.utc); stamp=now.strftime("%Y-%m-%dT%H-%M-%SZ")
if os.getenv("BACKUP_ENABLED","true").lower() in {"0","false","no","off"}:
    print("Sauvegarde désactivée"); raise SystemExit(0)

def oidc():
    r=requests.get(os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"],headers={"Authorization":"Bearer "+os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"]},params={"audience":"ecf-la-providence-backup"},timeout=30)
    r.raise_for_status(); return r.json()["value"]
TOKEN=oidc()
def bridge(action,**payload):
    r=requests.post(os.environ["BRIDGE_URL"],headers={"Authorization":"Bearer "+TOKEN,"Content-Type":"application/json"},json={"action":action,**payload},timeout=120)
    r.raise_for_status(); return r.json().get("data",r.json())

key=base64.b64decode(os.environ["BACKUP_ENCRYPTION_KEY_B64"],validate=True)
if len(key)!=32: raise SystemExit("Clé de chiffrement invalide")
aes=AESGCM(key)
s3=boto3.client("s3",endpoint_url=f"https://{os.environ['CLOUDFLARE_ACCOUNT_ID']}.r2.cloudflarestorage.com",region_name="auto",aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"])
bucket=os.environ["R2_BUCKET"]
def enc(data,aad):
    nonce=os.urandom(12); return b"ECF1"+nonce+aes.encrypt(nonce,data,aad.encode())
def put(k,data,sha,ctype):
    s3.put_object(Bucket=bucket,Key=k,Body=enc(data,k),ContentType="application/octet-stream",Metadata={"source-sha256":sha,"source-content-type":ctype[:512]},ServerSideEncryption="AES256")
def same(k,sha):
    try:return s3.head_object(Bucket=bucket,Key=k).get("Metadata",{}).get("source-sha256")==sha
    except ClientError as e:
        if e.response.get("Error",{}).get("Code") in {"404","NoSuchKey","NotFound"}:return False
        raise

report={"started_at":now.isoformat(),"database":{},"storage":{"buckets":0,"objects_seen":0,"uploaded":0,"unchanged":0,"missing":0,"bytes":0},"warnings":[]}
manifest=[]
with tempfile.TemporaryDirectory(prefix="ecf-backup-") as td:
    root=Path(td); (root/"rows").mkdir()
    (root/"schema.sql").write_text(str(bridge("schema",schemas=["public"])),encoding="utf-8")
    tables=bridge("tables",schemas=["public"]) or []
    for item in tables:
        schema=item["schema_name"]; table=item["table_name"]; offset=0; rows=[]
        while True:
            page=bridge("rows",schema=schema,table=table,limit=1000,offset=offset) or []
            if not page: break
            rows.extend(page); offset+=len(page)
            if len(page)<1000: break
        (root/"rows"/f"{schema}.{table}.json").write_text(json.dumps(rows,ensure_ascii=False),encoding="utf-8")
    for schema,table in [("auth","users"),("storage","buckets"),("storage","objects")]:
        rows=[]; offset=0
        while True:
            page=bridge("rows",schema=schema,table=table,limit=1000,offset=offset) or []
            if not page:break
            rows.extend(page);offset+=len(page)
            if len(page)<1000:break
        (root/"rows"/f"{schema}.{table}.json").write_text(json.dumps(rows,ensure_ascii=False),encoding="utf-8")
    archive=root/"database.tar.gz"
    with tarfile.open(archive,"w:gz") as tar:
        tar.add(root/"schema.sql",arcname="schema.sql"); tar.add(root/"rows",arcname="rows")
    data=archive.read_bytes(); sha=hashlib.sha256(data).hexdigest(); dbkey=f"database/daily/{stamp}.tar.gz.enc"; put(dbkey,data,sha,"application/gzip")
    report["database"]={"key":dbkey,"bytes":len(data),"sha256":sha,"tables":len(tables)}

def walk(bucket_name,prefix=""):
    offset=0
    while True:
        entries=bridge("objects",bucket=bucket_name,prefix=prefix,limit=1000,offset=offset) or []
        if not entries:return
        for e in entries:
            name=e.get("name")
            if not name:continue
            full=f"{prefix}/{name}" if prefix else name
            if e.get("id") is None: yield from walk(bucket_name,full)
            else: yield full,e
        if len(entries)<1000:return
        offset+=len(entries)

buckets=bridge("buckets") or []; report["storage"]["buckets"]=len(buckets)
for b in buckets:
    bn=b["name"]
    for path,meta in walk(bn):
        report["storage"]["objects_seen"]+=1
        try:
            u=bridge("signed_url",bucket=bn,path=path)["url"]
            d=requests.get(u,timeout=180); d.raise_for_status(); content=d.content
        except Exception:
            report["storage"]["missing"]+=1; report["warnings"].append(f"Objet indisponible: {bn}/{path}"); continue
        sha=hashlib.sha256(content).hexdigest(); rk=f"storage/current/{quote(bn,safe='')}/{quote(path,safe='/')}.enc"
        if same(rk,sha):report["storage"]["unchanged"]+=1
        else:put(rk,content,sha,d.headers.get("content-type","application/octet-stream"));report["storage"]["uploaded"]+=1
        report["storage"]["bytes"]+=len(content);manifest.append({"bucket":bn,"name":path,"sha256":sha,"bytes":len(content),"r2_key":rk,"metadata":meta})

m=json.dumps({"created_at":now.isoformat(),"objects":manifest},ensure_ascii=False).encode(); put(f"manifests/{stamp}.json.enc",m,hashlib.sha256(m).hexdigest(),"application/json")
def prune(prefix,days):
    cutoff=now-timedelta(days=days)
    for page in s3.get_paginator("list_objects_v2").paginate(Bucket=bucket,Prefix=prefix):
        for x in page.get("Contents",[]):
            if x["LastModified"]<cutoff:s3.delete_object(Bucket=bucket,Key=x["Key"])
prune("database/daily/",14);prune("manifests/",30);prune("reports/",30)
report["finished_at"]=datetime.now(timezone.utc).isoformat();report["status"]="success"
rd=json.dumps(report,ensure_ascii=False,indent=2).encode();put(f"reports/{stamp}.json.enc",rd,hashlib.sha256(rd).hexdigest(),"application/json")
print(json.dumps(report,ensure_ascii=False,indent=2))
if os.getenv("GITHUB_STEP_SUMMARY"):
    Path(os.environ["GITHUB_STEP_SUMMARY"]).write_text(f"# Sauvegarde La Providence — réussie\n\n- Tables: {report['database']['tables']}\n- Fichiers: {report['storage']['objects_seen']}\n- Nouveaux/modifiés: {report['storage']['uploaded']}\n- Manquants: {report['storage']['missing']}\n",encoding="utf-8")
