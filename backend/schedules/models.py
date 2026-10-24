from django.conf import settings
from django.db import models

from . import timeslots

DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']


class Schedule(models.Model):
    """A user's weekly schedule. Each day holds times as a string like '10:30-11:30, 13:20-13:50'."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='schedule')
    monday = models.CharField(max_length=255, blank=True, default='')
    tuesday = models.CharField(max_length=255, blank=True, default='')
    wednesday = models.CharField(max_length=255, blank=True, default='')
    thursday = models.CharField(max_length=255, blank=True, default='')
    friday = models.CharField(max_length=255, blank=True, default='')
    saturday = models.CharField(max_length=255, blank=True, default='')
    sunday = models.CharField(max_length=255, blank=True, default='')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Schedule for {self.user}'

    def slots(self, day: str) -> list[tuple[str, str]]:
        return timeslots.parse(getattr(self, day))
