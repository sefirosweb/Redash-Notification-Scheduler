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

@router.get("/queries/{query_id}/results")
def get_query_results(query_id: int):
    """Execute a query (using cache if available) and return its rows.
    Used to populate query-dropdown parameters."""
    try:
        import requests as req
        c = _client()
        resp = req.post(
            f"{c.base_url}/api/queries/{query_id}/results",
            headers=c.headers,
            json={"max_age": 86400}
        )
        resp.raise_for_status()
        data = resp.json()
        # Cached result returned directly
        if "query_result" in data:
            return data["query_result"]["data"]["rows"]
        # Otherwise a job was queued — poll it
        polled = c.poll_job(data["job"]["id"])
        result = c.get_query_result(polled["query_result_id"])
        return result["data"]["rows"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
