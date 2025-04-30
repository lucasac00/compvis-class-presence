from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey
from database.database import Base

class Attendance(Base):
    __tablename__ = 'attendance'
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('student.id'), nullable=False)
    bout_id = Column(Integer, ForeignKey('bout.id'), nullable=False)
    presence = Column(Boolean, default=False)
    register_time = Column(DateTime(timezone=True))