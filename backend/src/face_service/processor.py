import os
import face_recognition
import cv2
import numpy as np
from .utils import remove_diacritics_and_spaces
from typing import List, Dict

class FaceProcessor:
    def __init__(self, expected_students: List[Dict], main_folder: str = "students"):
        self.expected_students = expected_students  # Lista de dicionários do banco
        self.main_folder = main_folder
        self.known_faces = self._load_known_faces()
    
    def _load_known_faces(self):
        known_faces = []
        for student in self.expected_students:
            try:
                image_path = student.get("image_path")
                print("Checking image path:", os.path.abspath(image_path))
                print("Exists?", os.path.exists(image_path))
                if not image_path or not os.path.exists(image_path):
                    continue

                image = face_recognition.load_image_file(image_path)
                encodings = face_recognition.face_encodings(image)

                if encodings:
                    known_faces.append((student["id"], encodings[0]))
                else:
                    print(f"⚠️ No face found in {student['image_path']}")
            except Exception as e:
                print(f"Error processing image for student ID {student.get('id')}: {e}")
        
        return known_faces

    def process_frame(self, frame):
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_frame = np.ascontiguousarray(small_frame[:, :, ::-1])
        #rgb_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        
        face_locations = face_recognition.face_locations(rgb_frame)
        print("Processing frame...")
        print(f"Detected {len(face_locations)} faces")
        if not face_locations:
            return []

        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
        
        recognized = []
        for encoding in face_encodings:
            matches = face_recognition.compare_faces([e[1] for e in self.known_faces], encoding)
            face_distances = face_recognition.face_distance([e[1] for e in self.known_faces], encoding)
            best_match = np.argmin(face_distances)
            
            if matches[best_match]:
                recognized.append(self.known_faces[best_match][0])  # Retorna ID do aluno
        
        return recognized

    def process_video(self, video_path: str, frame_interval: int = 30):
        recognized_ids = set()
        cap = cv2.VideoCapture(video_path)
        frame_count = 0
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            # Process every nth frame to improve performance
            if frame_count % frame_interval == 0:
                frame_ids = self.process_frame(frame)
                recognized_ids.update(frame_ids)
                
            frame_count += 1
        
        cap.release()
        return list(recognized_ids)