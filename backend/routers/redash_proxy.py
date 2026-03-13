import json
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query as QParam, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
import os

from database import get_db
from services.redash import RedashClient

router = APIRouter()


class ExecuteRequest(BaseModel):
    max_age: int = 0
    parameters: Optional[Dict[str, Any]] = None


def _get_api_token(request: Request, db: Session = Depends(get_db)):
    from routers.api_tokens import require_api_token
    return require_api_token(request, db)

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


def _fetch_query_options(c: RedashClient, source_query_id: int) -> list:
    """Fetch the first-column values of a query (for query-type param hints)."""
    import requests as req
    try:
        resp = req.post(
            f"{c.base_url}/api/queries/{source_query_id}/results",
            headers=c.headers,
            json={"max_age": 86400},
        )
        resp.raise_for_status()
        data = resp.json()
        if "query_result" in data:
            rows = data["query_result"]["data"]["rows"]
        else:
            job = c.poll_job(data["job"]["id"])
            result = c.get_query_result(job["query_result_id"])
            rows = result["data"]["rows"]
        return [str(list(row.values())[0]) for row in rows if row]
    except Exception:
        return []


def _expected_params(c: RedashClient, query_id: int) -> list:
    """Return parameter definitions with hints and allowed values for error responses."""
    try:
        q = c.get_query(query_id)
        params = q.get("options", {}).get("parameters", [])
        result = []
        for p in params:
            ptype = p.get("type", "text")
            entry = {"name": p["name"], "type": ptype}

            if ptype in ("date-range", "datetime-range"):
                entry["hint"] = '{"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}'
            elif ptype in ("date", "datetime-local"):
                entry["hint"] = "YYYY-MM-DD"
            elif ptype == "enum":
                entry["allowed_values"] = [
                    v for v in (p.get("enumOptions") or "").split("\n") if v
                ]
            elif ptype == "query" and p.get("queryId"):
                values = _fetch_query_options(c, p["queryId"])
                if values:
                    entry["allowed_values"] = values
            else:
                entry["hint"] = '"value"'

            result.append(entry)
        return result
    except Exception:
        return []


@router.post("/queries/{query_id}/execute")
def execute_query_realtime(
    query_id: int,
    body: ExecuteRequest,
    api_token=Depends(_get_api_token),
):
    """Execute a Redash query synchronously and return its rows.

    Requires an API token (Authorization: Bearer rns_...).
    Parameters are passed directly to Redash:
      - Simple value:   "param_name": "value"
      - Date range:     "param_name": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}
    """
    import requests as req
    c = _client()
    try:
        payload: dict = {"max_age": body.max_age}
        if body.parameters:
            payload["parameters"] = body.parameters
        resp = req.post(
            f"{c.base_url}/api/queries/{query_id}/results",
            headers=c.headers,
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        if "query_result" in data:
            return data["query_result"]["data"]["rows"]
        polled = c.poll_job(data["job"]["id"])
        result = c.get_query_result(polled["query_result_id"])
        return result["data"]["rows"]
    except req.HTTPError as e:
        # Extract Redash's own error message and hint at expected parameters
        try:
            redash_error = e.response.json()
        except Exception:
            redash_error = e.response.text
        expected = _expected_params(c, query_id)
        raise HTTPException(status_code=400, detail={
            "redash_error": redash_error,
            "expected_parameters": expected,
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
