from pydantic import BaseModel

class EnrollmentBase(BaseModel):
    student_id: int
    class_id: int

class EnrollmentCreate(EnrollmentBase):
    student_id: int
    class_id: int

class EnrollmentRead(EnrollmentBase):
    pass

    class Config:
        orm_mode = True
