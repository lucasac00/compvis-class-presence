from sqlalchemy import Column, Integer, ForeignKey, DateTime, Boolean
from database.database import Base

class Attendance(Base):
    __tablename__ = 'attendance'
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('student.id'))
    class_id = Column(Integer, ForeignKey('class.id'))
    presence = Column(Boolean, default=True)
    register_time = Column(DateTime)