"""Loopback-only Tagalog TTS. Model: facebook/mms-tts-tgl (CC BY-NC 4.0).
Run from a venv containing requirements.txt; model stays local after download.
"""
import hmac
import argparse
import io
import json
import os
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import numpy as np
import torch
from scipy.io import wavfile
from transformers import AutoTokenizer, VitsModel

MODEL_ID = "facebook/mms-tts-tgl"
MODEL_DIR = Path(os.environ.get("PWD_TTS_MODEL_DIR", Path(__file__).resolve().parent / "model")).resolve()
model = tokenizer = None
busy = threading.Lock()
CLOUD_MODE = os.environ.get("TTS_CLOUD_MODE") == "true"
SERVICE_KEY = os.environ.get("TTS_SERVICE_KEY", "")


def load_model():
    global model, tokenizer
    torch.set_num_threads(max(1, min(4, (os.cpu_count() or 2) // 2)))
    if not (MODEL_DIR / "config.json").exists():
        raise RuntimeError("Model missing. Run python server.py --download first.")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR, local_files_only=True)
    model = VitsModel.from_pretrained(MODEL_DIR, local_files_only=True).eval()


def synthesize(text):
    # Short chunks bound model memory use. Punctuation also creates brief pauses.
    pieces = []
    for sentence in re.split(r"(?<=[.!?])\s+", text.strip()):
        words, chunk = sentence.split(), ""
        for word in words:
            if len(word) > 250:
                raise ValueError("A word is too long to read. Use normal sentences.")
            if len(chunk) + len(word) + 1 > 250:
                pieces.append(chunk)
                chunk = ""
            chunk = (chunk + " " + word).strip()
        if chunk:
            pieces.append(chunk)
    audio = []
    rate = model.config.sampling_rate
    for piece in pieces:
        inputs = tokenizer(piece, return_tensors="pt")
        if not inputs["input_ids"].numel():
            continue
        with torch.inference_mode():
            waveform = model(**inputs).waveform[0].cpu().numpy()
        audio.extend([waveform, np.zeros(int(rate * 0.18), dtype=np.float32)])
    if not audio:
        raise ValueError("No readable Tagalog text was found.")
    samples = np.clip(np.concatenate(audio), -1, 1)
    output = io.BytesIO()
    wavfile.write(output, rate, (samples * 32767).astype(np.int16))
    return output.getvalue()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # Do not log request text or identities.

    def reply(self, status, body, mime="application/json"):
        payload = json.dumps(body).encode() if isinstance(body, dict) else body
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        try:
            self.wfile.write(payload)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self):
        if self.path == "/health":
            self.reply(200, {"ready": True, "model": MODEL_ID})
        else:
            self.reply(404, {"message": "Not found"})

    def do_POST(self):
        if self.path != "/synthesize":
            return self.reply(404, {"message": "Not found"})
        if CLOUD_MODE:
            supplied = self.headers.get("Authorization", "")
            if not hmac.compare_digest(supplied, "Bearer " + SERVICE_KEY):
                return self.reply(401, {"message": "Unauthorized"})
        elif self.headers.get("Origin") or self.headers.get("Host") not in (
            f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"
        ):
            return self.reply(403, {"message": "Loopback server requests only"})
        if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
            return self.reply(415, {"message": "JSON required"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 16384:
                return self.reply(413, {"message": "Request too large"})
            self.connection.settimeout(10)
            body = json.loads(self.rfile.read(length))
            text = body.get("text") if isinstance(body, dict) else None
            if not isinstance(text, str) or not text.strip() or len(text) > 3000:
                raise ValueError("Use 1–3,000 characters.")
            if re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", text):
                raise ValueError("Invalid control character.")
        except (ValueError, UnicodeError, TimeoutError):
            return self.reply(400, {"message": "Use valid JSON and readable text of at most 3,000 characters."})
        if not busy.acquire(blocking=False):
            return self.reply(429, {"message": "Local voice is busy. Please try again shortly."})
        try:
            result = synthesize(text)
            self.reply(200, result, "audio/wav")
        except ValueError as error:
            self.reply(400, {"message": str(error)})
        except Exception:
            self.reply(503, {"message": "Local voice could not generate audio."})
        finally:
            busy.release()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--sample", type=Path)
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "5055")))
    args = parser.parse_args()
    if args.download:
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        AutoTokenizer.from_pretrained(MODEL_ID).save_pretrained(MODEL_DIR)
        VitsModel.from_pretrained(MODEL_ID, use_safetensors=True).save_pretrained(MODEL_DIR)
        print("Tagalog model downloaded. Attribution/license: facebook/mms-tts-tgl, CC BY-NC 4.0.")
        return
    if CLOUD_MODE and len(SERVICE_KEY) < 32:
        raise RuntimeError("Set TTS_SERVICE_KEY to at least 32 characters.")
    load_model()
    if args.sample:
        started = time.perf_counter()
        args.sample.write_bytes(synthesize("Maligayang pagdating sa PWDConnect. Piliin ang serbisyong kailangan mo. Nandito kami upang tumulong sa mga taong may kapansanan."))
        print(f"Sample saved: {args.sample}. Generation: {time.perf_counter() - started:.2f} seconds.")
        return
    server = ThreadingHTTPServer(("0.0.0.0" if CLOUD_MODE else "127.0.0.1", args.port), Handler)
    server.daemon_threads = True
    print(f"Local Tagalog voice ready at http://127.0.0.1:{args.port}. Press Ctrl+C to stop.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
