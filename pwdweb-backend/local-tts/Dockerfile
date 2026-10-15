FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py .
RUN python server.py --download
ENV TTS_CLOUD_MODE=true PORT=7860
EXPOSE 7860
CMD ["python", "-u", "server.py"]
