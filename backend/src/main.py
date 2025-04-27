from fastapi import FastAPI, WebSocket, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import cv2
import numpy as np
import os
from datetime import datetime
from typing import List
from contextlib import asynccontextmanager

# Importe modelos e serviços
from database.database import Base, SessionLocal, engine
# Importe cada modelo individualmente
from models.student import Student
from models.classes import Class
from models.enrollment import Enrollment
from models.attendance import Attendance
from face_service.processor import FaceProcessor

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    engine.dispose()

# Configuração do FastAPI
app = FastAPI(title="Marrow Attendance System", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas principais
@app.get("/")
async def root():
    return {"message": "Marrow Attendance System API"}

# WebSocket para processamento de vídeo em tempo real
@app.websocket("/ws/attendance/{class_id}")
async def video_feed(websocket: WebSocket, class_id: int):
    await websocket.accept()
    db = SessionLocal()
    
    try:
        # Carrega alunos matriculados na aula
        current_class = db.query(Class).filter(Class.id == class_id).first()
        if not current_class:
            await websocket.send_json({"error": "Class not found"})
            return

        students = db.query(Student).join(Enrollment).filter(
            Enrollment.class_id == class_id
        ).all()

        # Inicializa o processador facial
        processor = FaceProcessor(
            students_data=[
                {
                    "id": s.id,
                    "name": s.name,
                    "image_path": s.image_path
                } for s in students
            ],
            image_folder="students"
        )

        while True:
            # Recebe frame do frontend
            data = await websocket.receive_bytes()
            frame = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
            
            # Processa frame
            recognized_ids = processor.process_frame(frame)
            
            # Atualiza presenças
            for student_id in recognized_ids:
                attendance = Attendance(
                    student_id=student_id,
                    class_id=class_id,
                    register_time=datetime.now(),
                    present=True
                )
                db.add(attendance)
            
            db.commit()
            
            # Retorna resposta
            await websocket.send_json({
                "recognized": recognized_ids,
                "timestamp": datetime.now().isoformat()
            })

    except Exception as e:
        print(f"WebSocket Error: {str(e)}")
    finally:
        db.close()

# CRUD para Alunos
@app.post("/students/", response_model=Student)
async def create_student(name: str, image: UploadFile = File(...)):
    db = SessionLocal()
    try:
        # Salva imagem
        image_path = f"students/{name.replace(' ', '_')}.jpg"
        with open(image_path, "wb") as buffer:
            buffer.write(await image.read())
        
        # Cria registro no banco
        student = Student(name=name, image_path=image_path)
        db.add(student)
        db.commit()
        return student
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))
    finally:
        db.close()

@app.get("/students/", response_model=List[Student])
async def get_students():
    db = SessionLocal()
    students = db.query(Student).all()
    db.close()
    return students

# CRUD para Aulas
@app.post("/classes/", response_model=Class)
async def create_class(description: str):
    db = SessionLocal()
    try:
        new_class = Class(
            start_time=datetime.now(),
            description=description
        )
        db.add(new_class)
        db.commit()
        return new_class
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))
    finally:
        db.close()

@app.get("/classes/{class_id}/attendance")
async def get_attendance(class_id: int):
    db = SessionLocal()
    try:
        attendance = db.query(Attendance).filter(
            Attendance.class_id == class_id
        ).all()
        return attendance
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)