from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Base definition
Base = declarative_base()

# Database configuration
# TODO: Move to environment variables
DATABASE_URL = "postgresql://marrow:marrow123@db:5432/marrow_db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)