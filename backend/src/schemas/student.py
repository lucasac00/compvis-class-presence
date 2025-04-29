from pydantic import BaseModel

class StudentBase(BaseModel):
    name: str

class StudentCreate(StudentBase):
    image_path: str

class StudentRead(StudentBase):
    id: int
    image_path: str

    class Config:
        orm_mode = True
