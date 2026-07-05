import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Lê as credenciais do .env injetadas pelo Docker
POSTGRES_USER = os.getenv("POSTGRES_USER", "zeus_admin")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "zeus_pro_db_secure_2026")
POSTGRES_DB = os.getenv("POSTGRES_DB", "zeuspro_db")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_HOST = "postgres" # Nome do container no docker-compose

SQLALCHEMY_DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()