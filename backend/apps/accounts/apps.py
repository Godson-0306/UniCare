from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"

    def ready(self):
        import apps.accounts.signals  # noqa: F401
        from apps.accounts.signals import connect_seed_on_migrate

        connect_seed_on_migrate()
