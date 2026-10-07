"""Local-only CORE query for Agent IA leads.

Reads MongoDB credentials only from the process environment. It has no HTTP
route and must be run only on an authorized machine.
"""
import json
import os
import sys

from pymongo import MongoClient


def main() -> int:
    mongo_url = os.environ.get("MONGO_URL")
    if not mongo_url:
        print("MONGO_URL no configurado", file=sys.stderr)
        return 2
    limit = min(max(int(os.environ.get("AGENT_LEADS_LIMIT", "50")), 1), 200)
    client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
        database_name = os.environ.get("MONGO_DB_NAME", "mejoratuweb")
        collection = client[database_name].agent_leads
        rows = []
        projection = {"_id": 1, "created_at": 1, "first_name": 1, "last_name": 1, "phone": 1, "email": 1, "source": 1}
        for lead in collection.find({}, projection).sort("created_at", -1).limit(limit):
            lead["_id"] = str(lead["_id"])
            rows.append(lead)
        print(json.dumps({"count": len(rows), "leads": rows}, ensure_ascii=False, default=str))
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
