from fastapi import APIRouter, HTTPException, Query as QParam
import os
from services.redash import RedashClient

router = APIRouter()

def _client():
    url = os.getenv("REDASH_URL", "")
    key = os.getenv("REDASH_API_KEY", "")
    if not url or not key:
        raise HTTPException(status_code=500, detail="Redash not configured")
    return RedashClient(url, key)

@router.get("/queries")
def list_queries(q: str = QParam("", description="Search term")):
    try:
        return _client().list_queries(search=q)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/queries/{query_id}")
def get_query(query_id: int):
    try:
        return _client().get_query(query_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
