from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.database import get_db
from models.enrollment import Enrollment
from models.student import Student
from models.class_ import Class
from schemas.enrollment import EnrollmentCreate

router = APIRouter(prefix="/enrollments", tags=["enrollments"])

@router.post("/")
async def enroll_student(
    enrollment: EnrollmentCreate, 
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == enrollment.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    current_class = db.query(Class).filter(Class.id == enrollment.class_id).first()
    if not current_class:
        raise HTTPException(status_code=404, detail="Class not found")
    existing_enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == enrollment.student_id,
        Enrollment.class_id == enrollment.class_id
    ).first()
    if existing_enrollment:
        raise HTTPException(status_code=400, detail="Student already enrolled")
    new_enrollment = Enrollment(
        student_id=enrollment.student_id,
        class_id=enrollment.class_id
    )
    db.add(new_enrollment)
    db.commit()
    return {"message": "Student enrolled successfully"}