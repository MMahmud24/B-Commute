from django.contrib.auth.models import AbstractUser
from django.db import models


class Residence(models.TextChoices):
    UCLUB = 'uclub', 'University Club (UClub)'


class User(AbstractUser):
    email = models.EmailField(unique=True)
    # Empty until the user picks one right after signup.
    residence = models.CharField(max_length=32, choices=Residence.choices, blank=True, default='')
    email_verified_at = models.DateTimeField(null=True, blank=True)

    REQUIRED_FIELDS = ['email', 'first_name', 'last_name']

    def save(self, *args, **kwargs):
        self.email = self.email.lower()
        super().save(*args, **kwargs)
