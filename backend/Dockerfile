FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend /app/backend
COPY public/data /app/public/data
RUN mkdir -p /app/data
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
