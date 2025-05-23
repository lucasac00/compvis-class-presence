from pydantic import BaseModel
from datetime import datetime

class AttendanceBase(BaseModel):
    student_id: int
    bout_id: int
    presence: bool = False
    register_time: datetime

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceRead(BaseModel):
    student_id: int
    student_name: str
    bout_id: int
    register_time: datetime
    presence: bool

    class Config:
        from_attributes = True
