import json
import os
import urllib.request
import urllib.error

BASE_URL = os.environ.get('API_URL', 'http://localhost:8000')
health_url = f"{BASE_URL}/health"
ask_url = f"{BASE_URL}/api/v1/ask-ai"

print(f"Testing backend health at: {health_url}")
try:
    req = urllib.request.Request(health_url, method='GET')
    with urllib.request.urlopen(req, timeout=10) as resp:
        print('Health status:', resp.status)
        print(resp.read().decode())
except urllib.error.HTTPError as e:
    print('Health HTTP error:', e.code, e.reason)
except Exception as e:
    print('Health request failed:', e)

print(f"\nTesting ask-ai endpoint at: {ask_url}")

payload = {
    'event_id': '5bcffe5c-3af8-431d-94f2-d5e50251ae1c',
    'participant_id': '7e01ae7c-53f0-47e4-8728-e851ac5fd897',
    'question': 'Is the ask-ai endpoint reachable?'
}

try:
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        ask_url,
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        body = resp.read().decode('utf-8')
        print('Ask-AI status:', resp.status)
        print('Response body:', body)
except urllib.error.HTTPError as e:
    try:
        body = e.read().decode('utf-8')
    except Exception:
        body = '<unable to read response body>'
    print('Ask-AI HTTP error:', e.code, e.reason)
    print('Error body:', body)
except Exception as e:
    print('Ask-AI request failed:', e)
