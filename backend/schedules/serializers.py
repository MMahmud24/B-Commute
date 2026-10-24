from rest_framework import serializers

from . import timeslots
from .models import DAYS, Schedule


class SlotSerializer(serializers.Serializer):
    start = serializers.CharField()
    end = serializers.CharField()


class ScheduleSerializer(serializers.Serializer):
    """API shape: {"monday": [{"start": "10:30", "end": "11:30"}], ...}.

    Stored shape: one string per day. Conversion happens here, in both directions.
    """

    monday = SlotSerializer(many=True, required=False)
    tuesday = SlotSerializer(many=True, required=False)
    wednesday = SlotSerializer(many=True, required=False)
    thursday = SlotSerializer(many=True, required=False)
    friday = SlotSerializer(many=True, required=False)
    saturday = SlotSerializer(many=True, required=False)
    sunday = SlotSerializer(many=True, required=False)

    def validate(self, attrs):
        stored = {}
        errors = {}
        for day in DAYS:
            slots = [(s['start'].strip(), s['end'].strip()) for s in attrs.get(day, [])]
            try:
                stored[day] = timeslots.format_slots(timeslots.validate_slots(slots))
            except ValueError as exc:
                errors[day] = [str(exc)]
        if errors:
            raise serializers.ValidationError(errors)
        return stored

    def to_representation(self, instance: Schedule):
        return {
            day: [{'start': start, 'end': end} for start, end in instance.slots(day)]
            for day in DAYS
        }

    def save(self, user):
        # PUT semantics: the new schedule fully replaces the old one (omitted days become empty).
        schedule, _ = Schedule.objects.update_or_create(user=user, defaults=self.validated_data)
        return schedule
