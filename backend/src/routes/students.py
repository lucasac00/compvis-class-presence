from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from database.database import get_db
from models.student import Student
from schemas.student import StudentRead
from typing import List
import os
from PIL import Image
import io

router = APIRouter(prefix="/students", tags=["students"])

@router.post("/", response_model=StudentRead)
async def create_student(
    name: str = Form(...), 
    image: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    os.makedirs("students", exist_ok=True)
    image_path = f"students/{name.replace(' ', '_')}.jpg"
    image_data = await image.read()
    img = Image.open(io.BytesIO(image_data))
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')
    img.save(image_path, "JPEG", quality=85)
    
    student = Student(name=name, image_path=image_path)
    db.add(student)
    db.commit()
    db.refresh(student)
    return student

@router.get("/", response_model=List[StudentRead])
async def get_students(db: Session = Depends(get_db)):
    students = db.query(Student).all()
    return students

@router.delete("/{student_id}", status_code=204)
async def delete_student(
    student_id: int = Path(...), 
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.image_path and os.path.exists(student.image_path):
        os.remove(student.image_path)
    db.delete(student)
    db.commit()
    return