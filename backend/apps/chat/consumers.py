from channels.generic.websocket import AsyncJsonWebsocketConsumer


STAFF_NOTIFICATION_ROLES = {
    "receptionist",
    "nurse",
    "doctor",
    "pharmacist",
    "lab_technician",
    "duty_officer",
    "admin",
    "super_admin",
}


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or user.is_anonymous:
            await self.close()
            return
        self.group_names = [f"user_{user.id}"]
        if user.role in STAFF_NOTIFICATION_ROLES:
            self.group_names.extend(["hospital_staff", f"role_{user.role}"])
        for group_name in self.group_names:
            await self.channel_layer.group_add(group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_names"):
            for group_name in self.group_names:
                await self.channel_layer.group_discard(group_name, self.channel_name)

    async def notify(self, event):
        await self.send_json(event["payload"])
