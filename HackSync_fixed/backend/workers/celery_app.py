"""
Celery application instance.
Run the worker with:
  celery -A workers.celery_app worker --loglevel=info
"""
import ssl
from celery import Celery

from config.settings import settings

# Determine if we need SSL for Upstash (rediss://)
is_rediss = settings.REDIS_URL.startswith("rediss://")
ssl_kwargs = {'ssl_cert_reqs': ssl.CERT_NONE} if is_rediss else None

celery_app = Celery(
    "algorythm_workers",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    broker_use_ssl=ssl_kwargs,
    redis_backend_use_ssl=ssl_kwargs,
    include=["workers.celery_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Retry configuration
    task_max_retries=3,
    task_default_retry_delay=10,
)
