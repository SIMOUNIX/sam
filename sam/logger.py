import structlog


def configure_logging():
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="%H:%M:%S:"),
            structlog.processors.add_log_level,
            structlog.dev.ConsoleRenderer(),
        ]
    )
