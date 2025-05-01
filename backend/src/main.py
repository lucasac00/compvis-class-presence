from fastapi import FastAPI, WebSocket, UploadFile, File, HTTPException, Form, Depends, Path
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
import cv2
import numpy as np
import os
from datetime import datetime
from typing import List
from contextlib import asynccontextmanager
from PIL import Image
import io
from tempfile import NamedTemporaryFile
import tempfile
from database.database import Base, SessionLocal, engine
from models.student import Student
from models.class_ import Class
from models.enrollment import Enrollment
from models.attendance import Attendance
from models.bout import Bout
from face_service.processor import FaceProcessor
from schemas.student import StudentCreate, StudentRead
from schemas.class_ import ClassCreate, ClassRead
from schemas.enrollment import EnrollmentCreate
from schemas.attendance import AttendanceRead
from schemas.bout import BoutCreate, BoutRead
# Initialize the FastAPI app
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    engine.dispose()

app = FastAPI(title="Marrow Attendance System", lifespan=lifespan)

app.mount("/static/students", StaticFiles(directory="students"), name="students")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Main route to check if system is running
@app.get("/")
async def root():
    return {"message": "Marrow Attendance System API"}

# WebSocket for real time video processing. The video stream is sent from the frontend, a frame at a time.
@app.websocket("/ws/attendance/{bout_id}")
async def video_feed(websocket: WebSocket, bout_id: int, db: Session = Depends(get_db)):
    await websocket.accept()
    try:
        # CGet students enrolled in the class
        session = db.query(Bout).filter(Bout.id == bout_id).first()
        if not session:
            await websocket.send_json({"error": "Bout not found"})
            return
        if session.end_time is not None:
            await websocket.send_json({"error": "Bout has already ended"})
            return

        class_id = session.class_id
        print("Loading students for class ID:", class_id)

        students = db.query(Student).join(Enrollment).filter(
            Enrollment.class_id == class_id
        ).all()

        # Initialize the FaceProcessor class
        print("Initializing FaceProcessor...")
        processor = FaceProcessor(
            expected_students=[
                {
                    "id": s.id,
                    "name": s.name,
                    "image_path": s.image_path
                } for s in students
            ],
        )
        print("FaceProcessor initialized with students:", students)
        while True:
            # Receive frame
            print("Starting to receive frame...")
            data = await websocket.receive_bytes()
            if not data:
                print("⚠️ No data received")
                continue
            print("Data received...")
            frame = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)

            if frame is None:
                print("⚠️ Failed to decode frame")
                continue
            
            # Process frame to find faces (returns IDs of recognized students)
            recognized_ids = processor.process_frame(frame)
            
            # Update attendance reords
            for student_id in recognized_ids:
                attendance = Attendance(
                    student_id=student_id,
                    bout_id=bout_id,
                    register_time=datetime.now(),
                    presence=True
                )
                db.add(attendance)
            
            db.commit()
            
            await websocket.send_json({
                "recognized": recognized_ids,
                "timestamp": datetime.now().isoformat()
            })

    except Exception as e:
        print(f"WebSocket Error: {str(e)}")

@app.post("/bouts/{bout_id}/process-video")
async def process_video_attendance(
    bout_id: int,
    video_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    print("Processing video for attendance...")
    try:
        # Validate bout exists and is active
        bout = db.query(Bout).filter(Bout.id == bout_id).first()
        if not bout:
            raise HTTPException(status_code=404, detail="Bout not found")
        if bout.end_time is not None:
            raise HTTPException(status_code=400, detail="Bout has already ended")
        print("Bout found, class ID:", bout.class_id)
        # Get enrolled students
        students = db.query(Student).join(Enrollment).filter(
            Enrollment.class_id == bout.class_id
        ).all()
        print("initializing FaceProcessor with students:", students)
        # Initialize face processor
        processor = FaceProcessor([
            {"id": s.id, "name": s.name, "image_path": s.image_path} 
            for s in students
        ])
        print("FaceProcessor initialized")
        # Save video to temporary file
        # Process video frames
        recognized_ids = set()
        with NamedTemporaryFile(delete=False, suffix=".mp4") as temp_video:
            content = await video_file.read()
            temp_video.write(content)
            temp_path = temp_video.name
        print("Temporary video file created:", temp_path)
        print("Processing video...")
        recognized_ids = set(processor.process_video(temp_path))
        print("Video processed, recognized IDs:", recognized_ids)
        os.unlink(temp_path)  # Cleanup

        # Create attendance records
        timestamp = datetime.now()
        print("Creating attendance records...")
        for student_id in recognized_ids:
            attendance = Attendance(
                student_id=student_id,
                bout_id=bout_id,
                register_time=timestamp,
                presence=True
            )
            db.merge(attendance)  # Use merge to handle duplicates

        db.commit()

        return {
            "message": "Video processed successfully",
            "recognized_students": list(recognized_ids),
            "total_recognized": len(recognized_ids),
            "processing_time": timestamp.isoformat()
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# POST create new student
@app.post("/students/", response_model=StudentRead)
async def create_student(name: str = Form(...), image: UploadFile = File(...), db: Session = Depends(get_db)):
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

# GET all students
@app.get("/students/", response_model=List[StudentRead])
async def get_students():
    db = SessionLocal()
    students = db.query(Student).all()
    db.close()
    return students

# GET all classes
@app.get("/classes/", response_model=List[ClassRead])
async def get_classes():
    db = SessionLocal()
    classes = db.query(Class).all()
    db.close()
    return classes

# GET class by ID
@app.get("/classes/{class_id}", response_model=ClassRead)
async def get_class(class_id: int, db: Session = Depends(get_db)):
    current_class = db.query(Class).filter(Class.id == class_id).first()
    if not current_class:
        raise HTTPException(status_code=404, detail="Class not found")
    return current_class

# GET students by class ID
@app.get("/classes/{class_id}/students", response_model=List[StudentRead])
async def get_students_by_class(class_id: int, db: Session = Depends(get_db)):
    students = db.query(Student).join(Enrollment).filter(
        Enrollment.class_id == class_id
    ).all()
    if not students:
        raise HTTPException(status_code=404, detail="No students found for this class")
    return students

# POST new class session (bout)
@app.post("/classes/{class_id}/bouts", response_model=BoutRead)
async def create_bout(class_id: int, db: Session = Depends(get_db)):
    try:
        new_bout = Bout(class_id=class_id)
        db.add(new_bout)
        db.flush()
        db.commit()
        db.refresh(new_bout)
        return new_bout
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# PATCH to end a session (bout) by adding end time
@app.patch("/bouts/{bout_id}/end")
async def end_session(bout_id: int, db: Session = Depends(get_db)):
    bout = db.query(Bout).filter(Bout.id == bout_id).first()
    if not bout:
        raise HTTPException(status_code=404, detail="Bout not found")
    bout.end_time = datetime.now()
    db.commit()
    return {"message": "Bout ended successfully"}

# GET all attendance records for a specific session (bout)
@app.get("/bouts/{bout_id}/attendance", response_model=List[AttendanceRead])
async def get_bout_attendance(bout_id: int, db: Session = Depends(get_db)):
    try:
        attendance = db.query(Attendance).filter(Attendance.bout_id == bout_id).all()
        return attendance
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# GET all bouts for a specific class
@app.get("/classes/{class_id}/bouts", response_model=List[BoutRead])
async def get_class_bouts(class_id: int, db: Session = Depends(get_db)):
    bouts = db.query(Bout).filter(Bout.class_id == class_id).all()
    return bouts

# DELETE student by ID
@app.delete("/students/{student_id}", status_code=204)
async def delete_student(student_id: int = Path(...), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Delete image if exists
    if student.image_path and os.path.exists(student.image_path):
        os.remove(student.image_path)
    
    db.delete(student)
    db.commit()
    return

# POST new class
@app.post("/classes/", response_model=ClassRead)
async def create_class(description: str = Form(...), db: Session = Depends(get_db)):
    new_class = Class(
        description=description
    )
    db.add(new_class)
    db.commit()
    db.refresh(new_class)
    return new_class

# Old endpoint to get attendance by class ID, before sessions (bouts) were added

# @app.get("/classes/{class_id}/attendance", response_model=List[AttendanceRead])
# async def get_attendance(class_id: int):
#     db = SessionLocal()
#     try:
#         attendance = db.query(Attendance).filter(
#             Attendance.class_id == class_id
#         ).all()
#         return attendance
#     finally:
#         db.close()

# POST new enrollment
@app.post("/enrollments/")
async def enroll_student(enrollment: EnrollmentCreate, db: Session = Depends(get_db)):
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
        raise HTTPException(status_code=400, detail="Student already enrolled in this class")
    
    new_enrollment = Enrollment(
        student_id=enrollment.student_id,
        class_id=enrollment.class_id
    )
    db.add(new_enrollment)
    db.commit()

    return {"message": "Student enrolled successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)