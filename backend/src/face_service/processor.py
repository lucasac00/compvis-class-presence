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
        # Adapte para usar dados do banco
        student_map = {remove_diacritics_and_spaces(s["name"]).lower(): s for s in self.expected_students}
        
        known_faces = []
        for student in os.listdir(self.main_folder):
            student_name = os.path.splitext(student)[0]
            normalized = remove_diacritics_and_spaces(student_name).lower()
            
            if normalized in student_map:
                image = face_recognition.load_image_file(os.path.join(self.main_folder, student))
                encoding = face_recognition.face_encodings(image)[0]
                known_faces.append((student_map[normalized]["id"], encoding))
        
        return known_faces

    def process_frame(self, frame):
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_frame = small_frame[:, :, ::-1]
        
        face_locations = face_recognition.face_locations(rgb_frame)
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
        
        recognized = []
        for encoding in face_encodings:
            matches = face_recognition.compare_faces([e[1] for e in self.known_faces], encoding)
            face_distances = face_recognition.face_distance([e[1] for e in self.known_faces], encoding)
            best_match = np.argmin(face_distances)
            
            if matches[best_match]:
                recognized.append(self.known_faces[best_match][0])  # Retorna ID do aluno
        
        return recognized