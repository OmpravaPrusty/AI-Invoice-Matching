import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine

from app.database import Base
from app.models import Comparison, ComparisonRecord, Invoice, PurchaseOrder, User
from app.models import Comparison, ComparisonResult, Invoice, PurchaseOrder, User


def init_db() -> None:
    env_path = Path(__file__).resolve().parent / ".env"
    load_dotenv(dotenv_path=env_path, override=True)

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set.")

    engine = create_engine(database_url, echo=False)
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully.")


if __name__ == "__main__":
    init_db()
