from sqlalchemy import Column, Integer, String
from database.database import Base

class Student(Base):
    __tablename__ = 'student'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    image_path = Column(String(255), nullable=False)