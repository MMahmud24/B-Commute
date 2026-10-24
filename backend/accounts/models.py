from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email = models.EmailField(unique=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)

    REQUIRED_FIELDS = ['email', 'first_name', 'last_name']

    def save(self, *args, **kwargs):
        self.email = self.email.lower()
        super().save(*args, **kwargs)
