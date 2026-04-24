"""
db/migrate.py — Runner de migrations SQL maison, basé sur asyncpg.

Fonctionnement :
  1. Crée la table `schema_migrations` si elle n'existe pas.
  2. Lit tous les fichiers *.sql du dossier `migrations/`, triés par nom.
  3. Saute les migrations déjà enregistrées dans `schema_migrations`.
  4. Applique les nouvelles dans une transaction par fichier.
  5. Enregistre chaque migration appliquée avec son timestamp.

Usage en CLI (depuis backend/) :
  python -m db.migrate

Usage programmatique (appelé au démarrage de FastAPI) :
  from db.migrate import run_migrations
  await run_migrations(pool)
"""
import logging
import os
from pathlib import Path
from typing import Optional

import asyncpg

logger = logging.getLogger(__name__)

MIGRATIONS_DIR = Path(__file__).parent / "migrations"

_CREATE_TRACKING_TABLE = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    id          BIGSERIAL PRIMARY KEY,
    filename    TEXT NOT NULL UNIQUE,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""


async def run_migrations(pool: Optional[asyncpg.Pool] = None) -> None:
    """Applique toutes les migrations SQL en attente."""
    should_close = pool is None
    if pool is None:
        from db.connection import get_pool
        pool = await get_pool()

    async with pool.acquire() as conn:
        # Créer la table de suivi si elle n'existe pas
        await conn.execute(_CREATE_TRACKING_TABLE)

        # Récupérer les migrations déjà appliquées
        applied = {
            row["filename"]
            for row in await conn.fetch("SELECT filename FROM schema_migrations ORDER BY filename")
        }

        # Lire et trier les fichiers de migration
        migration_files = sorted(
            f for f in MIGRATIONS_DIR.glob("*.sql") if f.is_file()
        )

        if not migration_files:
            logger.warning("Aucun fichier de migration trouvé dans %s", MIGRATIONS_DIR)
            return

        pending = [f for f in migration_files if f.name not in applied]

        if not pending:
            logger.info("Base de données à jour — aucune migration en attente.")
            return

        for migration_file in pending:
            sql = migration_file.read_text(encoding="utf-8")
            logger.info("Application de la migration : %s", migration_file.name)
            try:
                async with conn.transaction():
                    await conn.execute(sql)
                    await conn.execute(
                        "INSERT INTO schema_migrations (filename) VALUES ($1)",
                        migration_file.name,
                    )
                logger.info("✓ %s appliquée avec succès.", migration_file.name)
            except Exception as e:
                logger.error("✗ Échec de la migration %s : %s", migration_file.name, e)
                raise RuntimeError(f"Migration échouée : {migration_file.name}") from e

    if should_close:
        await pool.close()


# ── Point d'entrée CLI ───────────────────────────────────────────────────────
if __name__ == "__main__":
    import asyncio
    from dotenv import load_dotenv

    load_dotenv()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    async def _main():
        import asyncpg as _asyncpg
        import os
        pool = await _asyncpg.create_pool(
            dsn=os.getenv("DATABASE_URL", "postgresql://dt2_user:dt2_pass@localhost:5432/dt2_db"),
            min_size=1, max_size=3,
        )
        await run_migrations(pool)
        await pool.close()

    asyncio.run(_main())
