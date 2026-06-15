import json
import urllib.request

with open('.env', 'r') as f:
    key = None
    for line in f:
        if line.startswith('GEMINI_API_KEY='):
            key = line.strip().split('=', 1)[1]
            break

url = f'https://generativelanguage.googleapis.com/v1beta/models?key={key}'
try:
    with urllib.request.urlopen(url) as response:
        data = json.loads(response.read().decode())
        models = [m['name'] for m in data.get('models', [])]
        print(models)
except Exception as e:
    print('Error:', e)
