from sqlalchemy import Column, Integer, ForeignKey
from database.database import Base

class Enrollment(Base):
    __tablename__ = 'enrollment'

    student_id = Column(Integer, ForeignKey('student.id', ondelete='CASCADE'), primary_key=True)
    class_id = Column(Integer, ForeignKey('class.id', ondelete='CASCADE'), primary_key=True)