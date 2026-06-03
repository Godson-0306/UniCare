from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


@database_sync_to_async
def _get_user_from_token(raw_token: str):
    try:
        jwt_authentication = JWTAuthentication()
        validated_token = jwt_authentication.get_validated_token(raw_token)
        return jwt_authentication.get_user(validated_token)
    except (InvalidToken, TokenError):
        return AnonymousUser()


def _get_query_token(scope) -> str:
    query_string = scope.get("query_string", b"").decode()
    query_params = parse_qs(query_string)
    token_values = query_params.get("token") or query_params.get("access")
    return token_values[0] if token_values else ""


class JwtAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        token = _get_query_token(scope)
        current_user = scope.get("user")
        if token and (not current_user or current_user.is_anonymous):
            scope = dict(scope)
            scope["user"] = await _get_user_from_token(token)
        return await self.inner(scope, receive, send)
