#!/usr/bin/env python3
"""Mirror a Lovable/Supabase database and Storage into a private Cloudflare R2 bucket."""
from __future__ import annotations
import base64, hashlib, json, os, subprocess, sys, tempfile
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import quote

import boto3
import requests
from botocore.exceptions import ClientError
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

REQUIRED = (
    "LOVABLE_DB_URL", "LOVABLE_SUPABASE_URL", "LOVABLE_SERVICE_ROLE_KEY",
    "CLOUDFLARE_ACCOUNT_ID", "R2_BUCKET", "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY", "BACKUP_ENCRYPTION_KEY_B64",
)
missing = [name for name in REQUIRED if not os.getenv(name)]
if missing:
    raise SystemExit("Secrets/variables manquants: " + ", ".join(missing))

now = datetime.now(timezone.utc)
stamp = now.strftime("%Y-%m-%dT%H-%M-%SZ")
endpoint = f"https://{os.environ['CLOUDFLARE_ACCOUNT_ID']}.r2.cloudflarestorage.com"
s3 = boto3.client(
    "s3", endpoint_url=endpoint, region_name="auto",
    aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
)
bucket = os.environ["R2_BUCKET"]
key = base64.b64decode(os.environ["BACKUP_ENCRYPTION_KEY_B64"], validate=True)
if len(key) != 32:
    raise SystemExit("BACKUP_ENCRYPTION_KEY_B64 doit décoder exactement 32 octets")
aes = AESGCM(key)

headers = {
    "apikey": os.environ["LOVABLE_SERVICE_ROLE_KEY"],
    "Authorization": "Bearer " + os.environ["LOVABLE_SERVICE_ROLE_KEY"],
}
base_url = os.environ["LOVABLE_SUPABASE_URL"].rstrip("/")
report = {
    "started_at": now.isoformat(), "database": {}, "storage": {
        "buckets": 0, "objects_seen": 0, "uploaded": 0, "unchanged": 0, "missing": 0,
        "bytes": 0,
    }, "warnings": [],
}

def encrypt(data: bytes, aad: str) -> bytes:
    nonce = os.urandom(12)
    return b"ECF1" + nonce + aes.encrypt(nonce, data, aad.encode())

def upload_encrypted(object_key: str, data: bytes, source_sha: str, content_type: str) -> None:
    s3.put_object(
        Bucket=bucket, Key=object_key, Body=encrypt(data, object_key),
        ContentType="application/octet-stream",
        Metadata={"source-sha256": source_sha, "source-content-type": content_type[:512]},
        ServerSideEncryption="AES256",
    )

def remote_matches(object_key: str, source_sha: str) -> bool:
    try:
        head = s3.head_object(Bucket=bucket, Key=object_key)
        return head.get("Metadata", {}).get("source-sha256") == source_sha
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
            return False
        raise

def list_storage_objects(bucket_name: str, prefix: str = ""):
    offset = 0
    while True:
        response = requests.post(
            f"{base_url}/storage/v1/object/list/{quote(bucket_name, safe='')}",
            headers={**headers, "Content-Type": "application/json"},
            json={"prefix": prefix, "limit": 1000, "offset": offset, "sortBy": {"column": "name", "order": "asc"}},
            timeout=60,
        )
        response.raise_for_status()
        entries = response.json()
        if not entries:
            return
        files = []
        directories = []
        for entry in entries:
            name = entry.get("name")
            if not name:
                continue
            full_name = f"{prefix}/{name}" if prefix else name
            if entry.get("id") is None:
                directories.append(full_name)
            else:
                files.append((full_name, entry))
        yield from files
        for directory in directories:
            yield from list_storage_objects(bucket_name, directory)
        if len(entries) < 1000:
            return
        offset += len(entries)

with tempfile.TemporaryDirectory(prefix="ecf-cloud-backup-") as tmp:
    dump_path = Path(tmp) / "database.dump"
    subprocess.run([
        "pg_dump", os.environ["LOVABLE_DB_URL"], "--format=custom", "--no-owner", "--no-acl",
        "--exclude-table-data=auth.sessions", "--exclude-table-data=auth.refresh_tokens",
        "--exclude-table-data=auth.mfa_factors", "--exclude-table-data=auth.mfa_challenges",
        "--file", str(dump_path),
    ], check=True)
    dump = dump_path.read_bytes()
    dump_sha = hashlib.sha256(dump).hexdigest()
    db_key = f"database/daily/{stamp}.dump.enc"
    upload_encrypted(db_key, dump, dump_sha, "application/vnd.postgresql.custom")
    report["database"] = {"key": db_key, "bytes": len(dump), "sha256": dump_sha}

response = requests.get(f"{base_url}/storage/v1/bucket", headers=headers, timeout=60)
response.raise_for_status()
source_buckets = response.json()
report["storage"]["buckets"] = len(source_buckets)

manifest = []
for bucket_info in source_buckets:
    bucket_name = bucket_info["name"]
    for object_name, metadata in list_storage_objects(bucket_name):
        report["storage"]["objects_seen"] += 1
        download = requests.get(
            f"{base_url}/storage/v1/object/authenticated/{quote(bucket_name, safe='')}/{quote(object_name, safe='/')}",
            headers=headers, timeout=180,
        )
        if download.status_code == 404:
            report["storage"]["missing"] += 1
            report["warnings"].append(f"Objet référencé mais absent: {bucket_name}/{object_name}")
            continue
        download.raise_for_status()
        data = download.content
        source_sha = hashlib.sha256(data).hexdigest()
        object_key = f"storage/current/{quote(bucket_name, safe='')}/{quote(object_name, safe='/')}.enc"
        if remote_matches(object_key, source_sha):
            report["storage"]["unchanged"] += 1
        else:
            upload_encrypted(object_key, data, source_sha, download.headers.get("content-type", "application/octet-stream"))
            report["storage"]["uploaded"] += 1
        report["storage"]["bytes"] += len(data)
        manifest.append({
            "bucket": bucket_name, "name": object_name, "sha256": source_sha,
            "bytes": len(data), "r2_key": object_key, "metadata": metadata,
        })

manifest_data = json.dumps({"created_at": now.isoformat(), "objects": manifest}, ensure_ascii=False).encode()
manifest_sha = hashlib.sha256(manifest_data).hexdigest()
upload_encrypted(f"manifests/{stamp}.json.enc", manifest_data, manifest_sha, "application/json")

# Conserver 14 sauvegardes quotidiennes de la base et 30 rapports/manifests.
def prune(prefix: str, keep_days: int):
    cutoff = now - timedelta(days=keep_days)
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for item in page.get("Contents", []):
            if item["LastModified"] < cutoff:
                s3.delete_object(Bucket=bucket, Key=item["Key"])

prune("database/daily/", 14)
prune("manifests/", 30)
prune("reports/", 30)

report["finished_at"] = datetime.now(timezone.utc).isoformat()
report["status"] = "success"
report_data = json.dumps(report, ensure_ascii=False, indent=2).encode()
upload_encrypted(f"reports/{stamp}.json.enc", report_data, hashlib.sha256(report_data).hexdigest(), "application/json")

print(json.dumps(report, ensure_ascii=False, indent=2))
summary = os.getenv("GITHUB_STEP_SUMMARY")
if summary:
    with open(summary, "a", encoding="utf-8") as handle:
        handle.write(f"""# Sauvegarde La Providence — réussie

- Base PostgreSQL : {report['database']['bytes']:,} octets
- Buckets Storage : {report['storage']['buckets']}
- Fichiers examinés : {report['storage']['objects_seen']}
- Nouveaux/modifiés : {report['storage']['uploaded']}
- Inchangés : {report['storage']['unchanged']}
- Références sans fichier : {report['storage']['missing']}
- Fin : {report['finished_at']}

Les données ont été chiffrées avant leur envoi dans R2.
""")
