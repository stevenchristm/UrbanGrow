import json
import urllib.request
import urllib.error

with open('.env', 'r') as f:
    key = None
    for line in f:
        if line.startswith('GEMINI_API_KEY='):
            key = line.strip().split('=', 1)[1]
            break

url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={key}'

payload = {
    "contents": [{
        "parts": [
            {"text": "Apa ini?"},
            {
                "inlineData": {
                    "mimeType": "image/png",
                    "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                }
            }
        ]
    }],
    "generationConfig": {
        "temperature": 0.4
    }
}

req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as response:
        print("Success!")
        print(response.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print(e.read().decode())
except Exception as e:
    print('Error:', e)
