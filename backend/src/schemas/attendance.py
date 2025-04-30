from pydantic import BaseModel
from datetime import datetime

class AttendanceBase(BaseModel):
    student_id: int
    bout_id: int
    presence: bool = False
    register_time: datetime

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceRead(AttendanceBase):
    id: int

    class Config:
        orm_mode = True
