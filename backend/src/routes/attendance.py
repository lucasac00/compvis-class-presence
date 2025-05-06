from fastapi import APIRouter, WebSocket, UploadFile, File, HTTPException, Depends, WebSocketDisconnect
from sqlalchemy.orm import Session
from database.database import SessionLocal
from models.bout import Bout
from models.attendance import Attendance
from models.student import Student
from models.enrollment import Enrollment
from models.class_ import Class
from face_service.processor import FaceProcessor
from datetime import datetime
import cv2
import numpy as np
import os
from tempfile import NamedTemporaryFile
from database.database import get_db

router = APIRouter()

@router.websocket("/ws/attendance/{bout_id}")
async def video_feed(websocket: WebSocket, bout_id: int):
    await websocket.accept()
    db = SessionLocal()
    try:
        bout = db.query(Bout).filter(Bout.id == bout_id).first()
        if not bout:
            await websocket.send_json({"error": "Bout not found"})
            return
        if bout.end_time is not None:
            await websocket.send_json({"error": "Bout has already ended"})
            return
        class_id = bout.class_id
        students = db.query(Student).join(Enrollment).filter(
            Enrollment.class_id == class_id
        ).all()
        processor = FaceProcessor(
            expected_students=[
                {"id": s.id, "name": s.name, "image_path": s.image_path} 
                for s in students
            ],
        )
        while True:
            try:
                data = await websocket.receive_bytes()
                frame = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
                if frame is None:
                    continue
                recognized_ids, total_faces, face_locations, recognition_status = processor.process_frame(frame)
                new_attendances = []
                for student_id in recognized_ids:
                    existing = db.query(Attendance).filter(
                        Attendance.student_id == student_id,
                        Attendance.bout_id == bout_id
                    ).first()
                    
                    if not existing:
                        new_attendance = Attendance(
                            student_id=student_id,
                            bout_id=bout_id,
                            register_time=datetime.now(),
                            presence=True
                        )
                        new_attendances.append(new_attendance)
                if new_attendances:
                    db.bulk_save_objects(new_attendances)
                    db.commit()
                db.commit()
                await websocket.send_json({
                    "recognized": recognized_ids,
                    "total_faces": total_faces,
                    "face_locations": face_locations,
                    "recognition_status": recognition_status,
                    "timestamp": datetime.now().isoformat()
                })
            except WebSocketDisconnect:
                print("WebSocket disconnected")
                break
            except RuntimeError as e:
                print(f"Client disconnected: {str(e)}")
                raise
    except Exception as e:
        print(f"WebSocket Error: {str(e)}")
    finally:
        db.close()
        await websocket.close(code=1000)

@router.post("/bouts/{bout_id}/process-video")
async def process_video_attendance(
    bout_id: int,
    video_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        bout = db.query(Bout).filter(Bout.id == bout_id).first()
        if not bout:
            raise HTTPException(status_code=404, detail="Bout not found")
        if bout.end_time is not None:
            raise HTTPException(status_code=400, detail="Bout has already ended")
        students = db.query(Student).join(Enrollment).filter(
            Enrollment.class_id == bout.class_id
        ).all()
        processor = FaceProcessor([
            {"id": s.id, "name": s.name, "image_path": s.image_path} 
            for s in students
        ])
        recognized_ids = set()
        with NamedTemporaryFile(delete=False, suffix=".mp4") as temp_video:
            content = await video_file.read()
            temp_video.write(content)
            temp_path = temp_video.name
        recognized_ids = set(processor.process_video(temp_path))
        os.unlink(temp_path)
        timestamp = datetime.now()
        for student_id in recognized_ids:
            attendance = Attendance(
                student_id=student_id,
                bout_id=bout_id,
                register_time=timestamp,
                presence=True
            )
            db.merge(attendance)
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