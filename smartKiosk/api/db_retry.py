import time
from django.db import connection
from pymysql.err import OperationalError

MAX_ATTEMPTS = 5
RETRY_DELAY = 2  # seconds

def ensure_tidb_awake():
    """Ping TiDB with retries to wake up a sleeping cluster."""
    attempt = 1
    while attempt <= MAX_ATTEMPTS:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            return True
        except OperationalError as e:
            if "TiProxy fails to connect" in str(e) or "1105" in str(e):
                print(f"[TiDB] Sleeping… retrying ({attempt}/{MAX_ATTEMPTS})")
                time.sleep(RETRY_DELAY)
                attempt += 1
            else:
                raise e
    return False
