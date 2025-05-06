from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.database import get_db
from models.bout import Bout
from models.attendance import Attendance
from models.student import Student
from schemas.attendance import AttendanceRead
from datetime import datetime
from typing import List

router = APIRouter(prefix="/bouts", tags=["bouts"])

@router.patch("/{bout_id}/end")
async def end_session(
    bout_id: int, 
    db: Session = Depends(get_db)
):
    bout = db.query(Bout).filter(Bout.id == bout_id).first()
    if not bout:
        raise HTTPException(status_code=404, detail="Bout not found")
    bout.end_time = datetime.now()
    db.commit()
    return {"message": "Bout ended successfully"}

@router.get("/{bout_id}/attendance", response_model=List[AttendanceRead])
async def get_bout_attendance(
    bout_id: int, 
    db: Session = Depends(get_db)
):
    attendance = db.query(Attendance).filter(Attendance.bout_id == bout_id).all()
    student_ids = [a.student_id for a in attendance]
    students = db.query(Student).filter(Student.id.in_(student_ids)).all()
    attendance_with_names = []
    for record in attendance:
        student = next((s for s in students if s.id == record.student_id), None)
        attendance_with_names.append({
            "id": record.id,
            "student_id": record.student_id,
            "student_name": student.name if student else None,
            "bout_id": record.bout_id,
            "register_time": record.register_time,
            "presence": record.presence
        })
    return attendance_with_names