def error_payload(message: str, *, code: int | str | None = None, details=None) -> dict:
    error = {"message": message}
    if code is not None:
        error["code"] = code
    if details is not None:
        error["details"] = details
    return {"success": False, "error": error}
