from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


class RealtimeEventService:
    @staticmethod
    def publish_to_group(group: str, event: str, payload: dict) -> None:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        async_to_sync(channel_layer.group_send)(
            group,
            {
                "type": "notify",
                "payload": {
                    "event": event,
                    "data": payload,
                },
            },
        )

    @classmethod
    def publish_to_user(cls, user_id, event: str, payload: dict) -> None:
        cls.publish_to_group(f"user_{user_id}", event, payload)

    @classmethod
    def publish_to_role(cls, role: str, event: str, payload: dict) -> None:
        cls.publish_to_group(f"role_{role}", event, payload)

    @classmethod
    def publish_to_staff(cls, event: str, payload: dict) -> None:
        cls.publish_to_group("hospital_staff", event, payload)
