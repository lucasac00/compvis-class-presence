# Use official Python base image
FROM python:3.10-slim-bullseye

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Create and set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libgtk2.0-dev \
    libavcodec-dev \
    libavformat-dev \
    libswscale-dev \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libpq-dev \
    git \
    wget \
    curl \
    graphicsmagick \
    libgraphicsmagick1-dev \
    libatlas-base-dev \
    liblapack-dev \
    libswscale-dev \
    pkg-config \
    python3-dev \
    python3-numpy \
    software-properties-common \
    zip \
    gfortran \
    libgl1-mesa-glx \
    libgl1-mesa-dri \
    && rm -rf /var/lib/apt/lists/*

# Install dlib with AVX support using correct version and build flags
RUN git clone -b 'v19.24.4' --single-branch https://github.com/davisking/dlib.git && \
    cd dlib && \
    python3 setup.py install --set USE_AVX_INSTRUCTIONS=yes

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# # Copy application code
# COPY . .

# RUN mkdir -p /app/students
# VOLUME /app/students

# # Database initialization (if needed)
# # RUN python -c "from database.database import Base, engine; Base.metadata.create_all(bind=engine)"

# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# Copy application code with proper path handling
COPY . /app/

# Specifically ensure src directory exists
RUN mkdir -p /app/src

# Set PYTHONPATH to include source directory
ENV PYTHONPATH="${PYTHONPATH}:/app/src"

# Modify the CMD to point to correct location
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]