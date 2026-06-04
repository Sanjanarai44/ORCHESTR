import requests

payload = {
    "event_id": 1,
    "team_id": "cmpz9uq7400019nh8j6ce4r8x",
    "participant_id": "cmpz992ub00012cx506ua6avc",
    "message": "hello"
}
response = requests.post("http://127.0.0.1:8000/ai-mentor", json=payload)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
