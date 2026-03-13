import requests
import time
from typing import Any, Dict, List

class RedashClient:
	def __init__(self, base_url: str, api_key: str):
		self.base_url = base_url.rstrip("/")
		self.api_key = api_key
		self.headers = {"Authorization": f"Key {self.api_key}"}

	def list_queries(self) -> List[Dict[str, Any]]:
		resp = requests.get(f"{self.base_url}/api/queries", headers=self.headers)
		resp.raise_for_status()
		return resp.json()["results"]

	def get_query(self, query_id: int) -> Dict[str, Any]:
		resp = requests.get(f"{self.base_url}/api/queries/{query_id}", headers=self.headers)
		resp.raise_for_status()
		return resp.json()

	def execute_query(self, query_id: int, max_age: int = 0) -> Dict[str, Any]:
		resp = requests.post(
			f"{self.base_url}/api/queries/{query_id}/results",
			headers=self.headers,
			json={"max_age": max_age}
		)
		resp.raise_for_status()
		return resp.json()["job"]

	def poll_job(self, job_id: str, poll_interval: float = 1.0, timeout: int = 60) -> Dict[str, Any]:
		start = time.time()
		while True:
			r = requests.get(f"{self.base_url}/api/jobs/{job_id}", headers=self.headers)
			r.raise_for_status()
			job = r.json()["job"]
			if job["status"] == 3:  # success
				return job
			elif job["status"] == 4:  # error
				raise Exception("Query failed")
			if time.time() - start > timeout:
				raise TimeoutError("Redash job polling timed out")
			time.sleep(poll_interval)

	def get_query_result(self, query_result_id: int) -> Dict[str, Any]:
		resp = requests.get(
			f"{self.base_url}/api/query_results/{query_result_id}",
			headers=self.headers
		)
		resp.raise_for_status()
		return resp.json()["query_result"]
