import re
import subprocess
import time
import json
import threading
import sys
import urllib.request

urls = {"backend": None, "frontend": None, "wss": None}
lock = threading.Lock()

def write_urls():
    with lock:
        if urls["backend"] and urls["frontend"]:
            data = {
                "frontend": urls["frontend"],
                "backend": urls["backend"],
                "wss": urls["wss"],
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            with open("active_urls.json", "w") as f:
                json.dump(data, f, indent=2)
            print(f"\n[ACTIVE TUNNELS]\nFrontend: {urls['frontend']}\nBackend:  {urls['backend']}\nWSS:      {urls['wss']}\n", flush=True)

def monitor_tunnel(port, key):
    while True:
        cmd = [
            "ssh",
            "-o", "StrictHostKeyChecking=no",
            "-o", "ServerAliveInterval=10",
            "-o", "ServerAliveCountMax=6",
            "-R", f"80:127.0.0.1:{port}",
            "nokey@localhost.run"
        ]
        try:
            p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
            for line in iter(p.stdout.readline, ''):
                match = re.search(r'(https://[a-zA-Z0-9]+\.app\.lhr\.life)', line)
                if match:
                    found_url = match.group(1)
                    with lock:
                        urls[key] = found_url
                        if key == "backend":
                            urls["wss"] = found_url.replace("https://", "wss://") + "/ws"
                    write_urls()
            p.wait()
        except Exception as e:
            print(f"[{key}] Tunnel exception: {e}", flush=True)
        time.sleep(2)

def keepalive_worker():
    while True:
        time.sleep(20)
        try:
            with lock:
                b_url = urls.get("backend")
            if b_url:
                urllib.request.urlopen(f"{b_url}/health", timeout=5)
        except Exception:
            pass

if __name__ == "__main__":
    t1 = threading.Thread(target=monitor_tunnel, args=(8000, "backend"), daemon=True)
    t2 = threading.Thread(target=monitor_tunnel, args=(3000, "frontend"), daemon=True)
    t3 = threading.Thread(target=keepalive_worker, daemon=True)
    t1.start()
    t2.start()
    t3.start()
    print("Tunnel manager started. Monitoring tunnels with auto-reconnect and keepalive...", flush=True)
    while True:
        time.sleep(1)
