from sqlalchemy import Column, Integer, Text
from database.database import Base

class Class(Base):
    __tablename__ = 'class'

    id = Column(Integer, primary_key=True, autoincrement=True)
    description = Column(Text, nullable=True)