from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    payload = {
        "success": False,
        "error": {
            "code": response.status_code,
            "message": _extract_message(response.data),
            "details": response.data if isinstance(response.data, dict) else {"detail": response.data},
        },
    }
    response.data = payload
    return response


def _extract_message(data):
    if isinstance(data, dict):
        if "detail" in data:
            return str(data["detail"])
        first_key = next(iter(data))
        value = data[first_key]
        if isinstance(value, list) and value:
            return str(value[0])
        return str(value)
    if isinstance(data, list) and data:
        return str(data[0])
    return "Request failed"
