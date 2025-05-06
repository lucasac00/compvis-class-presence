import os
import face_recognition
import cv2
import numpy as np
from typing import List, Dict

# The heart of the system, this class is responsible for processing video stream
# and returning the recognized students from it.

class FaceProcessor:
    def __init__(self, expected_students: List[Dict], main_folder: str = "students"):
        self.expected_students = expected_students
        self.main_folder = main_folder
        self.known_faces = self._load_known_faces()
    
    # This represents the first two steps of facial recognition
    # As explained in the README.md, they are Detection and Encoding
    def _load_known_faces(self):
        known_faces = []
        for student in self.expected_students:
            try:
                # For each student, we load their image that is saved in consistent storage
                image_path = student.get("image_path")
                print("Checking image path:", os.path.abspath(image_path))
                print("Exists?", os.path.exists(image_path))
                if not image_path or not os.path.exists(image_path):
                    continue
                # Recognize face boundaries, then encode them
                image = face_recognition.load_image_file(image_path)
                encodings = face_recognition.face_encodings(image)

                if encodings:
                    known_faces.append((student["id"], encodings[0]))
                else:
                    print(f"⚠️ No face found in {student['image_path']}")
            except Exception as e:
                print(f"Error processing image for student ID {student.get('id')}: {e}")
        # Returns list of encoded faces
        return known_faces
    # For the live video processing, this processes a single frame and tries to find faces
    def process_frame(self, frame):
        small_frame = cv2.resize(frame, (0, 0), fx=1, fy=1)
        rgb_frame = np.ascontiguousarray(small_frame[:, :, ::-1])
        
        # Find the boundaries of the faces in the frame
        face_locations = face_recognition.face_locations(rgb_frame)    
        if not face_locations:
            return [], 0, [], []
        total_faces = len(face_locations)
        # Calculate the encodings of the detected faces
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
        
        recognized_ids = []
        recognition_status = []
        for encoding in face_encodings:
            # Compare the detected face encodings with the known faces
            # This is the final step, Face Matching
            matches = face_recognition.compare_faces([e[1] for e in self.known_faces], encoding)
            face_distances = face_recognition.face_distance([e[1] for e in self.known_faces], encoding)
            best_match = np.argmin(face_distances)
            
            if matches[best_match]:
                recognized_ids.append(self.known_faces[best_match][0])
                recognition_status.append(True)
            else:
                recognition_status.append(False)
        # Returns list of recognized IDs, ammt of faces detected, array of face locations and recognition status
        return recognized_ids, total_faces, face_locations, recognition_status

    # This function processes a video file and returns the recognized student IDs
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
                frame_ids, _, _, _ = self.process_frame(frame)
                recognized_ids.update(frame_ids)
                
            frame_count += 1
        
        cap.release()
        return list(recognized_ids)