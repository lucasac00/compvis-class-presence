from pydantic import BaseModel
from datetime import datetime

class BoutBase(BaseModel):
    class_id: int

class BoutCreate(BoutBase):
    pass

class BoutRead(BoutBase):
    id: int
    start_time: datetime
    end_time: datetime | None = None

    class Config:
        orm_mode = True