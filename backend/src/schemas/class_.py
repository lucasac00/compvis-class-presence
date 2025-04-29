from pydantic import BaseModel

class ClassBase(BaseModel):
    description: str | None = None  # Description is optional based on your SQL

class ClassCreate(ClassBase):
    pass

class ClassRead(ClassBase):
    id: int

    class Config:
        orm_mode = True
