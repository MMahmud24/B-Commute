"""Conversion between the stored string form ('10:30-11:30, 13:20-13:50') and slot lists.

A slot is a (start, end) pair of 'HH:MM' strings in 24-hour time.
"""
import re

SLOT_RE = re.compile(r'^([01]\d|2[0-3]):([0-5]\d)$')


def to_minutes(hhmm: str) -> int:
    h, m = hhmm.split(':')
    return int(h) * 60 + int(m)


def validate_slots(slots: list[tuple[str, str]]) -> list[tuple[str, str]]:
    """Check each slot and return them sorted. Raises ValueError with a readable message."""
    for start, end in slots:
        if not SLOT_RE.match(start) or not SLOT_RE.match(end):
            raise ValueError(f'"{start}-{end}" is not a valid time range (use 24-hour HH:MM).')
        if to_minutes(start) >= to_minutes(end):
            raise ValueError(f'{start}-{end}: the start time must be before the end time.')
    ordered = sorted(slots, key=lambda s: to_minutes(s[0]))
    for (_, prev_end), (start, end) in zip(ordered, ordered[1:]):
        if to_minutes(start) < to_minutes(prev_end):
            raise ValueError(f'{start}-{end} overlaps with another time on the same day.')
    return ordered


def parse(value: str) -> list[tuple[str, str]]:
    """'10:30-11:30, 13:20-13:50' -> [('10:30', '11:30'), ('13:20', '13:50')]"""
    slots = []
    for part in value.split(','):
        part = part.strip()
        if not part:
            continue
        pieces = part.split('-')
        if len(pieces) != 2:
            raise ValueError(f'"{part}" is not a valid time range.')
        slots.append((pieces[0].strip(), pieces[1].strip()))
    return validate_slots(slots)


def format_slots(slots: list[tuple[str, str]]) -> str:
    """[('10:30', '11:30'), ('13:20', '13:50')] -> '10:30-11:30, 13:20-13:50'"""
    return ', '.join(f'{start}-{end}' for start, end in slots)
