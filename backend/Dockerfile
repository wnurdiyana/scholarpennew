FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for some python packages
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Render provides a $PORT environment variable.
# This command tells the app to use that port, or default to 8000.
CMD uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}
