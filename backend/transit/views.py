from django.conf import settings
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from schedules.models import DAYS, Schedule
from schedules.timeslots import SLOT_RE, to_minutes

from . import planner
from .routes import TO_RESIDENCE, Trip, trips_for


def fmt(minutes: int) -> str:
    minutes %= 1440  # a 24:02 arrival is shown as 00:02
    return f'{minutes // 60:02d}:{minutes % 60:02d}'


def _trip_json(trip: Trip, now: int) -> dict:
    return {
        'bus': trip.bus,
        'depart': fmt(trip.depart),
        'arrive': fmt(trip.arrive),
        'from_stop': trip.from_stop,
        'to_stop': trip.to_stop,
        'leave_in_minutes': trip.depart - now,
    }


def _time_param(request, name: str) -> int | None:
    value = request.query_params.get(name)
    if value is None:
        return None
    if not SLOT_RE.match(value):
        raise ValidationError({name: 'Use 24-hour HH:MM.'})
    return to_minutes(value)


def _fake_now() -> tuple[str, int] | None:
    """Parses settings.TRANSIT_FAKE_NOW ('monday 08:00'); None when unset."""
    if not settings.TRANSIT_FAKE_NOW:
        return None
    day, _, time = settings.TRANSIT_FAKE_NOW.partition(' ')
    if day not in DAYS or not SLOT_RE.match(time):
        raise ValueError(f'TRANSIT_FAKE_NOW must look like "monday 08:00", got "{settings.TRANSIT_FAKE_NOW}".')
    return day, to_minutes(time)


def _now(request) -> tuple[str, int]:
    """Current campus day and minute.

    Precedence: `day`/`time` query params, then the TRANSIT_FAKE_NOW dev stub, then the real clock.
    """
    default_day, default_now = _fake_now() or (None, None)
    if default_day is None:
        local = timezone.localtime()
        default_day, default_now = DAYS[local.weekday()], local.hour * 60 + local.minute

    day = request.query_params.get('day', default_day)
    if day not in DAYS:
        raise ValidationError({'day': f'Must be one of: {", ".join(DAYS)}.'})
    now = _time_param(request, 'time')
    return day, default_now if now is None else now


def _plan(trips: list[Trip], now: int, arrive_by: int) -> dict:
    best, alternatives = planner.recommend(trips, now, arrive_by)
    return {
        'status': 'ok' if best else 'no_bus',
        'arrive_by': fmt(arrive_by),
        'recommendation': _trip_json(best, now) if best else None,
        'alternatives': [_trip_json(t, now) for t in alternatives],
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def next_departure(request):
    """Which bus to catch for the user's next class today."""
    day, now = _now(request)
    user = request.user
    base = {'day': day, 'now': fmt(now), 'walk_minutes': planner.WALK_MINUTES}

    if not user.residence:
        return Response({**base, 'status': 'no_residence'})

    schedule = Schedule.objects.filter(user=user).first()
    if schedule is None or not any(schedule.slots(d) for d in DAYS):
        return Response({**base, 'status': 'no_schedule'})

    upcoming_class = planner.next_class(schedule.slots(day), now)
    if upcoming_class is None:
        return Response({**base, 'status': 'no_more_classes'})

    arrive_by = to_minutes(upcoming_class[0]) - planner.WALK_MINUTES
    return Response({
        **base,
        'next_class': {'start': upcoming_class[0], 'end': upcoming_class[1]},
        **_plan(trips_for(user.residence, day), now, arrive_by),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def departures(request):
    """Upcoming buses to campus, plus a plan for an optional `arrive_by` (be on campus by)."""
    day, now = _now(request)
    user = request.user
    base = {'day': day, 'now': fmt(now)}

    if not user.residence:
        return Response({**base, 'status': 'no_residence', 'upcoming': [], 'plan': None})

    trips = trips_for(user.residence, day)
    arrive_by = _time_param(request, 'arrive_by')
    return Response({
        **base,
        'status': 'ok',
        'upcoming': [_trip_json(t, now) for t in planner.upcoming(trips, now)],
        'plan': _plan(trips, now, arrive_by) if arrive_by is not None else None,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def heading_home(request):
    """Which bus to take home. Defaults to leaving after the last class today; `leave_at` overrides it."""
    day, now = _now(request)
    user = request.user
    base = {'day': day, 'now': fmt(now), 'walk_minutes': planner.WALK_MINUTES}

    if not user.residence:
        return Response({**base, 'status': 'no_residence'})

    leave_at = _time_param(request, 'leave_at')
    if leave_at is not None:
        source = 'custom'
    else:
        schedule = Schedule.objects.filter(user=user).first()
        leave_at = planner.last_class_end(schedule.slots(day)) if schedule else None
        source = 'last_class' if leave_at is not None else 'now'

    ready = planner.ready_time(now, leave_at)
    best, alternatives = planner.next_buses(trips_for(user.residence, day, TO_RESIDENCE), ready)
    return Response({
        **base,
        'status': 'ok' if best else 'no_bus',
        'source': source,  # last_class | custom | now
        'leave_at': fmt(leave_at) if leave_at is not None else None,
        'at_stop_by': fmt(ready),
        'recommendation': _trip_json(best, now) if best else None,
        'alternatives': [_trip_json(t, now) for t in alternatives],
    })
