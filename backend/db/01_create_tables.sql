CREATE TABLE IF NOT EXISTS student (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    image_path VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS class (
    id SERIAL PRIMARY KEY,
    description TEXT
);

CREATE TABLE IF NOT EXISTS enrollment (
    student_id INT REFERENCES student(id) ON DELETE CASCADE,
    class_id INT REFERENCES class(id) ON DELETE CASCADE,
    PRIMARY KEY (student_id, class_id)
);

CREATE TABLE IF NOT EXISTS bout (
    id SERIAL PRIMARY KEY,
    class_id INT NOT NULL REFERENCES class(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    bout_id INT NOT NULL REFERENCES bout(id) ON DELETE CASCADE,
    presence BOOLEAN DEFAULT FALSE,
    register_time TIMESTAMP,
    UNIQUE (student_id, bout_id)
);