import os
import uvicorn

port = int(os.environ.get("NANKI_PORT", "8642"))

if __name__ == "__main__":
    uvicorn.run(
        "nanki_core.app:app",
        host="127.0.0.1",
        port=port,
        log_level="info",
    )