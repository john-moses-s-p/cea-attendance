"""WSGI entrypoint for production servers (gunicorn, uWSGI, etc.).

Some WSGI servers/platforms (Render included) don't reliably parse the
`gunicorn app:create_app()` factory-call syntax. Exposing a plain
module-level `app` object here sidesteps that entirely.

Start command:
    gunicorn wsgi:app
"""
from app import create_app

app = create_app()
