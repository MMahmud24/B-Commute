"""Loads the bus timetables in data/bus_schedules and turns them into trips for a given stop and day."""
import json
from dataclasses import dataclass
from functools import lru_cache

from django.conf import settings

from schedules.timeslots import to_minutes

TO_CAMPUS = 'to_campus'
TO_RESIDENCE = 'to_residence'

# One entry per bus the planner can suggest. A bus may be split across files (weekday / weekend).
# *_stop is the column in the timetable file; *_label is the name shown to students.
BUSES = [
    {
        'name': 'ITC-UClub',
        'files': ['itc_uclub_shuttle.json'],
        'arrival_stop': 'Returns to Mohawk',
        'arrival_label': 'Mohawk',
        'campus_departure_stop': 'Leaves Mohawk',
        'campus_departure_label': 'Mohawk',
    },
    {
        'name': 'UClub',
        'files': ['uclub_shuttle_weekday.json', 'uclub_shuttle_weekend.json'],
        'arrival_stop': 'Union',
        'arrival_label': 'Union',
        'campus_departure_stop': 'Leaves Mohawk',
        'campus_departure_label': 'Mohawk',
    },
]

# Where a student boards and gets off near home, by residence (matches accounts.models.Residence values).
RESIDENCE_STOPS = {'uclub': 'UClub'}


@dataclass(frozen=True)
class Trip:
    bus: str
    depart: int  # minutes after midnight; can pass 1440 for arrivals just after midnight
    arrive: int
    from_stop: str = ''
    to_stop: str = ''


@lru_cache(maxsize=None)
def _load(filename: str) -> dict:
    with open(settings.BUS_SCHEDULE_DIR / filename) as f:
        return json.load(f)


def trips_for(residence: str, day: str, direction: str = TO_CAMPUS) -> list[Trip]:
    """All trips running on `day` between the residence's stop and campus, sorted by departure.

    TO_CAMPUS rides from the residence to campus; TO_RESIDENCE rides from campus back home.
    """
    home = RESIDENCE_STOPS.get(residence)
    if home is None:
        return []

    trips = []
    for bus in BUSES:
        if direction == TO_CAMPUS:
            (from_col, from_label), (to_col, to_label) = (home, home), (bus['arrival_stop'], bus['arrival_label'])
        else:
            (from_col, from_label) = (bus['campus_departure_stop'], bus['campus_departure_label'])
            (to_col, to_label) = (home, home)

        for filename in bus['files']:
            data = _load(filename)
            if day not in data['service_days'] or from_col not in data['times'] or to_col not in data['times']:
                continue
            skip = set()
            if day != 'friday':
                skip |= set(data.get('friday_only_trip_indexes', []))
            if day != 'saturday':
                skip |= set(data.get('saturday_only_trip_indexes', []))
            for i, (depart, arrive) in enumerate(zip(data['times'][from_col], data['times'][to_col])):
                if i not in skip:
                    trips.append(Trip(bus['name'], to_minutes(depart), to_minutes(arrive), from_label, to_label))
    return sorted(trips, key=lambda t: (t.depart, t.arrive))
