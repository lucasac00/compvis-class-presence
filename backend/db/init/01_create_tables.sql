-- um aluno pode estar cadastrado em várias aulas
-- uma aula pode ter vários alunos

-- aluno to student
-- nome to name
-- aula to class
-- descricao to description
-- presente to presence

CREATE TABLE IF NOT EXISTS student (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    image_path VARCHAR(255) NOT NULL -- Integrar com S3? Mecanismo de add alunos pela interface?
);

CREATE TABLE IF NOT EXISTS class (
    id SERIAL PRIMARY KEY,
    description TEXT -- exemplo: "Aula de Python - Módulo 3"
);

CREATE TABLE IF NOT EXISTS enrollment (
    student_id INT REFERENCES student(id) ON DELETE CASCADE,
    class_id INT REFERENCES class(id) ON DELETE CASCADE,
    PRIMARY KEY (student_id, class_id)
);

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    class_id INT NOT NULL REFERENCES class(id) ON DELETE CASCADE,
    presence BOOLEAN DEFAULT FALSE,
    register_time TIMESTAMP,
    UNIQUE (student_id, class_id)
);