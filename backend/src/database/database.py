from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Definindo a Base para os modelos
Base = declarative_base()

# Configuração do banco (ajuste a URL conforme necessário)
DATABASE_URL = "postgresql://marrow:marrow123@db:5432/marrow_db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)