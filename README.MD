## COMPUTER VISION CLASS PRESENCE

Possible improvements: take photo directly when creating student, pull student names in classes screen

## 📖 Introduction
A web-based attendance tracking system that uses facial recognition to automatically mark student presences. Features two modes:
- **Live Video Attendance**: Real-time face detection via webcam
- **Video Upload Attendance**: Process pre-recorded videos for attendance marking

Key Features:
- Session-based attendance tracking
- Student management with photo registration
- Class and enrollment management
- CSV export of attendance records

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Python 3.10+
- Node.js 23+

### Installation
1. Clone the repository:
```bash
git clone https://github.com/lucasac00/compvis-class-presence.git
```
2. Start the system:
```bash
cd compvis-class-presence
docker compose up
```
3. Access the system:

Frontend: http://localhost:3000

Backend API: http://localhost:8000

Adminer (Database Management): http://localhost:8080

## 🧠 System Architecture

Using the interface, the administrator creates students by setting a name and uploading a clear picture of their face. This picture will be stored in a permanent volume, and will be used later to track their presence in classes.

With the students registered, the administrator may create classes. A class has a description, and a list of students (pulled from the students created in the database previously).

With this done, the administrator may begin tracking the student's attendance in classes. This can be done either a live video feed, or a pre-recorded video. Both are fed to the backend, which processes each frame to try and find faces matching those of the registered students. When a matching face is found, the student is marked as present in the current session.

For face recognition, we use the [face-recognition](https://face-recognition.readthedocs.io/en/latest/face_recognition.html?highlight=face_encodings#face_recognition.api.face_encodings) python library, a [dlib](https://dlib.net/)-based deep learning library that features many methods to recognize faces in videos and images.

## 💾 Database Schema
Important to note that 'Bouts' is used to represent each Session, as 'session' is a keyword used by the ORM sqlalchemy used in the backend
```
Students (id, name, image_path)
Classes (id, description)
Enrollments (student_id, class_id)
Bouts (id, class_id, start_time, end_time)
Attendance (id, student_id, bout_id, presence, register_time)
```

## Using Adminer To Manage Database
In the docker-compose.yml is a fourth service (beyond frontend, backend and database). That service is adminer, a database management system built to be deployed with docker. In the docker-compose.yml file, it is set to automatically connect to the deployed database. Adminer can be accessed through the 8080 port (localhost:8080). You'll be prompted with entering the username, password and database, which are defined in the docker-compose.yml. In our case, they are "marrow", "marrow123" and "marrow_db", respectively.

## 🛠️ Technologies Used
Backend
- Framework: FastAPI
- Database: PostgreSQL
- ORM: SQLAlchemy
- Face Recognition:
    - face-recognition (dlib backend)
    - OpenCV (video processing)
- WebSockets: Real-time communication

Important to note that the core of the frontend was generated using v0 by vercel, including the UI components. The system was then manualy adjusted and integrated with the backend.

Frontend

- Framework: Next.js 14
- UI Library: Shadcn UI

## 👁️ A Small Dive Into face-recognition

From the documentation:
> Built using dlib’s state-of-the-art face recognition
built with deep learning. The model has an accuracy of 99.38% on the
Labeled Faces in the Wild benchmark.

[Labeled Faces in the Wild (LFW)](https://www.kaggle.com/datasets/jessicali9530/lfw-dataset) is a famous face recognition dataset, and is universally used as a [benchmark](https://paperswithcode.com/dataset/lfw) to test face recognition systems. Clearly, the python face-recognition library is quite effective. But how?

Three steps can be observed in the process of recognizing faces in an image:
1. Face Detection, where the boundaries and limits of a face are drawn
2. Face Encoding, where the details of a face are converted to 128-dimension vectors for easier analysis
3. Face Matching, where the encoded faces are compared to other faces found in an image, and the details are compared to determine if a face matches.

face-recognition uses the [Histogram of Oriented Gradients (HOG)](https://en.wikipedia.org/wiki/Histogram_of_oriented_gradients) method for initial face localization, and then refines it using [Convolutional Neural Network (CNN)](https://www.ibm.com/think/topics/convolutional-neural-networks). This creates an extremely accurate analysis of face boundaries in an image. For encoding, it uses a pre-trained model from dlib called [ResNet](https://www.restack.io/p/open-source-face-recognition-system-answer-dlib-face-recognition-resnet-cat-ai), which encodes facial features such as eye/nose/mouth/ears distance and positions and shape contours. Finally, for matching the faces, it's a simple matter of comparing vectors. For that, it uses the [Euclidian distance](https://en.wikipedia.org/wiki/Euclidean_distance) between vectors.

--------------------
That's all folks!

Sources:

https://face-recognition.readthedocs.io/en/latest/ \
https://dlib.net/ \
https://www.kaggle.com/datasets/jessicali9530/lfw-dataset/ \
https://paperswithcode.com/dataset/lfw/ \
https://en.wikipedia.org/wiki/Histogram_of_oriented_gradients/ \
https://www.ibm.com/think/topics/convolutional-neural-networks/ \
https://www.restack.io/p/open-source-face-recognition-system-answer-dlib-face-recognition-resnet-cat-ai/ \
https://en.wikipedia.org/wiki/Euclidean_distance
