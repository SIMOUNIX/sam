import logging
import os
from pathlib import Path

import structlog


def _log_file_path() -> Path:
    data_dir = Path(os.environ.get("SAM_DATA_DIR", "~/.sam")).expanduser().resolve()
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "sam.log"


def configure_logging():
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    structlog.configure(
        processors=shared_processors
        + [structlog.stdlib.ProcessorFormatter.wrap_for_formatter],
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    console_formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared_processors,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            structlog.dev.ConsoleRenderer(),
        ],
    )

    file_formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared_processors,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            structlog.processors.EventRenamer("msg"),
            structlog.processors.JSONRenderer(),
        ],
    )

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(console_formatter)

    file_handler = logging.FileHandler(_log_file_path())
    file_handler.setFormatter(file_formatter)

    root = logging.getLogger()
    root.handlers = [console_handler, file_handler]
    root.setLevel(logging.INFO)
