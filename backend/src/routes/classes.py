from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from database.database import get_db
from models.class_ import Class
from models.student import Student
from models.enrollment import Enrollment
from models.bout import Bout
from schemas.class_ import ClassRead
from schemas.bout import BoutRead
from schemas.student import StudentRead
from typing import List

router = APIRouter(prefix="/classes", tags=["classes"])

@router.post("/", response_model=ClassRead)
async def create_class(
    description: str = Form(...), 
    db: Session = Depends(get_db)
):
    new_class = Class(description=description)
    db.add(new_class)
    db.commit()
    db.refresh(new_class)
    return new_class

@router.get("/", response_model=List[ClassRead])
async def get_classes(db: Session = Depends(get_db)):
    classes = db.query(Class).all()
    return classes

@router.get("/{class_id}", response_model=ClassRead)
async def get_class(
    class_id: int, 
    db: Session = Depends(get_db)
):
    current_class = db.query(Class).filter(Class.id == class_id).first()
    if not current_class:
        raise HTTPException(status_code=404, detail="Class not found")
    return current_class

@router.get("/{class_id}/students", response_model=List[StudentRead])
async def get_students_by_class(
    class_id: int, 
    db: Session = Depends(get_db)
):
    students = db.query(Student).join(Enrollment).filter(
        Enrollment.class_id == class_id
    ).all()
    if not students:
        raise HTTPException(status_code=404, detail="No students found for this class")
    return students

@router.post("/{class_id}/bouts", response_model=BoutRead)
async def create_bout(
    class_id: int, 
    db: Session = Depends(get_db)
):
    try:
        new_bout = Bout(class_id=class_id)
        db.add(new_bout)
        db.commit()
        db.refresh(new_bout)
        return new_bout
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{class_id}/bouts", response_model=List[BoutRead])
async def get_class_bouts(
    class_id: int, 
    db: Session = Depends(get_db)
):
    bouts = db.query(Bout).filter(Bout.class_id == class_id).all()
    return bouts