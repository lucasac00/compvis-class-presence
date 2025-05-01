## This is the example code for the face recognition attendance system, shown in the face_recognition repository
## The system was built around this example, first integrating it into a database, and then building the FastAPI backend and next frontend around that.

import face_recognition
import cv2
import numpy as np
import os
import unicodedata

def remove_diacritics_and_spaces(input_str):
    no_space = input_str.replace(" ", "")
    nfkd_form = unicodedata.normalize('NFKD', no_space)
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)])

# Get a reference to webcam #0 (the default one)
video_capture = cv2.VideoCapture(0)

# From database, we get the full name of the students that should be in the class
expected_students = ["Barack Obama", "Joe Biden"]
# Remove diacritics and spaces from the names to normalize them
# Make map connecting normalized name to original name
student_map = {remove_diacritics_and_spaces(name).lower(): name for name in expected_students}
# Parse folder containing student pictures to find the equivalent picture to each key in student_map
main_folder = "students"
if not os.path.isdir(main_folder):
    raise NotADirectoryError(f"'{main_folder}' is not a valid directory.")

# Parse folder containing student pictures to find the equivalent picture to each key in student_map
file_map = {}
for student in os.listdir(main_folder):
    # Get the name of the student from the file name
    student_name = os.path.splitext(student)[0]
    # Remove diacritics and spaces from the name to normalize it
    normalized_name = remove_diacritics_and_spaces(student_name).lower()
    # Check if the normalized name is in the student_map
    if normalized_name in student_map:
        # If it is, get the original name from the map
        original_name = student_map[normalized_name]
        file_map[original_name] = os.path.join(main_folder, student)
        print(f"Found picture for {original_name}: {student}")
    else:
        print(f"No picture found for {student_name}.")
        
# Now we have a map of the original names to the file names
# Load each picture and learn how to recognize it
# known_faces is a list of tuples where the first value is the name and the second value is the encoding
known_faces = []
for i in file_map:
    # Load a sample picture and learn how to recognize it.
    image = face_recognition.load_image_file(file_map[i])
    face_encoding = face_recognition.face_encodings(image)[0]
    known_faces.append((i, face_encoding))

# Create arrays of known face encodings and their names
# known_face_encodings = [
#     obama_face_encoding,
#     biden_face_encoding
# ]
# known_face_names = [
#     "Barack Obama",
#     "Joe Biden"
# ]

known_face_encodings, known_face_names = zip(*known_faces)

# Initialize some variables
face_locations = []
face_encodings = []
face_names = []
process_this_frame = True

while True:
    # Grab a single frame of video
    ret, frame = video_capture.read()

    # Only process every other frame of video to save time
    if process_this_frame:
        # Resize frame of video to 1/4 size for faster face recognition processing
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)

        # Convert the image from BGR color (which OpenCV uses) to RGB color (which face_recognition uses)
        rgb_small_frame = small_frame[:, :, ::-1]
        
        # Find all the faces and face encodings in the current frame of video
        face_locations = face_recognition.face_locations(rgb_small_frame)
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

        face_names = []
        for face_encoding in face_encodings:
            # See if the face is a match for the known face(s)
            matches = face_recognition.compare_faces(known_face_encodings, face_encoding)
            name = "Unknown"

            # # If a match was found in known_face_encodings, just use the first one.
            # if True in matches:
            #     first_match_index = matches.index(True)
            #     name = known_face_names[first_match_index]

            # Or instead, use the known face with the smallest distance to the new face
            face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
            best_match_index = np.argmin(face_distances)
            if matches[best_match_index]:
                name = known_face_names[best_match_index]

            face_names.append(name)

    process_this_frame = not process_this_frame


    # Display the results
    for (top, right, bottom, left), name in zip(face_locations, face_names):
        # Scale back up face locations since the frame we detected in was scaled to 1/4 size
        top *= 4
        right *= 4
        bottom *= 4
        left *= 4

        # Draw a box around the face
        cv2.rectangle(frame, (left, top), (right, bottom), (0, 0, 255), 2)

        # Draw a label with a name below the face
        cv2.rectangle(frame, (left, bottom - 35), (right, bottom), (0, 0, 255), cv2.FILLED)
        font = cv2.FONT_HERSHEY_DUPLEX
        cv2.putText(frame, name, (left + 6, bottom - 6), font, 1.0, (255, 255, 255), 1)

    # Display the resulting image
    cv2.imshow('Video', frame)

    # Hit 'q' on the keyboard to quit!
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Release handle to the webcam
video_capture.release()
cv2.destroyAllWindows()