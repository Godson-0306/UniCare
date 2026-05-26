import threading

_thread_locals = threading.local()


def get_audit_context() -> dict:
    return getattr(_thread_locals, "audit_context", {})


def set_audit_context(**kwargs):
    ctx = get_audit_context().copy()
    ctx.update(kwargs)
    _thread_locals.audit_context = ctx


class AuditContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        ip = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
        if not ip:
            ip = request.META.get("REMOTE_ADDR")
        set_audit_context(
            ip_address=ip,
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        response = self.get_response(request)
        _thread_locals.audit_context = {}
        return response
