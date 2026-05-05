import psycopg2
import os

DB_URL = os.getenv("TELEMETRY_DB_URL", "postgresql://postgres:postgrespassword@localhost:5433/telemetry_db")

try:
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # Check tables
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
    tables = [r[0] for r in cur.fetchall()]
    print(f"Tables: {tables}")

    for table in tables:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        total = cur.fetchone()[0]
        print(f"\n[{table}] total rows: {total}")
        if total > 0:
            cur.execute(f"SELECT component_id, COUNT(*) FROM {table} GROUP BY component_id ORDER BY COUNT(*) DESC LIMIT 10")
            for row in cur.fetchall():
                print(f"  component_id={row[0]!r}: {row[1]} rows")
            cur.execute(f"SELECT * FROM {table} ORDER BY timestamp DESC LIMIT 1")
            last = cur.fetchone()
            cols = [d[0] for d in cur.description]
            print(f"  Latest row: { {cols[i]: last[i] for i in range(len(cols))} }")

    conn.close()
    print("\n✅ DB check complete")
except Exception as e:
    print(f"❌ DB error: {e}")
