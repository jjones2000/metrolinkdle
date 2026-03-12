#!/bin/bash
#uvicorn main:app --host 0.0.0.0 --port 8000
gunicorn main:app -k uvicorn.workers.UvicornWorker
