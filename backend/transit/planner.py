"""Pure planning logic. Times are minutes after midnight."""
from schedules.timeslots import to_minutes

from .routes import Trip

WALK_MINUTES = 10  # default walk between a bus stop and the class building (both directions)
MAX_ALTERNATIVES = 3
UPCOMING_LIMIT = 8


def next_class(slots: list[tuple[str, str]], now: int) -> tuple[str, str] | None:
    """The first slot that starts after `now`. A class already in progress is skipped."""
    return next((slot for slot in slots if to_minutes(slot[0]) > now), None)


def recommend(trips: list[Trip], now: int, arrive_by: int) -> tuple[Trip | None, list[Trip]]:
    """Best trip is the latest departure that hasn't left yet and still arrives by `arrive_by`."""
    options = sorted(
        (t for t in trips if t.depart >= now and t.arrive <= arrive_by),
        key=lambda t: (-t.depart, t.arrive),
    )
    if not options:
        return None, []
    return options[0], options[1 : 1 + MAX_ALTERNATIVES]


def upcoming(trips: list[Trip], now: int) -> list[Trip]:
    return [t for t in trips if t.depart >= now][:UPCOMING_LIMIT]


def last_class_end(slots: list[tuple[str, str]]) -> int | None:
    """When the last class of the day ends, or None if there are no classes."""
    return max((to_minutes(end) for _, end in slots), default=None)


def ready_time(now: int, leave_at: int | None) -> int:
    """When the student can be at the bus stop: they leave at `leave_at` and walk to the stop.

    With no leave time they're ready now. Leaving in the past just means ready now.
    """
    return now if leave_at is None else max(now, leave_at + WALK_MINUTES)


def next_buses(trips: list[Trip], ready: int) -> tuple[Trip | None, list[Trip]]:
    """The first trip leaving at or after `ready`, plus the ones after it."""
    options = [t for t in trips if t.depart >= ready]
    if not options:
        return None, []
    return options[0], options[1 : 1 + MAX_ALTERNATIVES]
