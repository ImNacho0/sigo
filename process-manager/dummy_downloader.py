import time
import sys
import requests

def report_progress(percent, filename="Dummy Data"):
    url = "http://localhost:8081/api/progress"
    data = {
        "active": percent < 100,
        "filename": filename,
        "percent": int(percent),
        "speed": "2.5 MB/s",
        "time_left": "00:05"
    }
    try:
        requests.post(url, json=data, timeout=1)
    except:
        pass

print("Starting Dummy Downloader...")
sys.stdout.flush()

total = 50
for i in range(total):
    percent = (i + 1) / total * 100
    print(f"Downloading item {i+1}/{total} ({percent:.1f}%)")
    sys.stdout.flush()
    report_progress(percent, "Dummy Package Zip")
    time.sleep(1)

# Report final inactivity
report_progress(100, "Done")
print("Download complete.")
