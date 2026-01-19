from __future__ import annotations

import os

import uvicorn


def run() -> None:
    host = os.getenv("APP_HOST", "127.0.0.1")
    port = int(os.getenv("APP_PORT", "8000"))
    reload = os.getenv("APP_RELOAD", "false").lower() in {"1", "true", "yes"}
    uvicorn.run(
        "app.main:create_app", factory=True, host=host, port=port, reload=reload
    )


if __name__ == "__main__":
    run()
