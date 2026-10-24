from django.test import SimpleTestCase, TestCase, override_settings

from accounts.models import User
from schedules.models import Schedule

from . import planner
from .routes import TO_RESIDENCE, Trip, trips_for


def departs(residence, day, bus, direction='to_campus'):
    return [f'{t.depart // 60:02d}:{t.depart % 60:02d}' for t in trips_for(residence, day, direction) if t.bus == bus]


class TripsTests(SimpleTestCase):
    def test_unknown_residence_has_no_trips(self):
        self.assertEqual(trips_for('', 'monday'), [])

    def test_friday_only_trip(self):
        self.assertIn('23:50', departs('uclub', 'friday', 'UClub'))
        self.assertNotIn('23:50', departs('uclub', 'monday', 'UClub'))

    def test_saturday_only_trip(self):
        self.assertIn('23:50', departs('uclub', 'saturday', 'UClub'))
        self.assertNotIn('23:50', departs('uclub', 'sunday', 'UClub'))

    def test_weekend_uses_weekend_file_and_itc_does_not_run(self):
        self.assertEqual(departs('uclub', 'sunday', 'ITC-UClub'), [])
        self.assertIn('09:20', departs('uclub', 'sunday', 'UClub'))

    def test_arrival_is_the_campus_stop(self):
        trip = next(t for t in trips_for('uclub', 'monday') if t.bus == 'ITC-UClub' and t.depart == 9 * 60 + 40)
        self.assertEqual(trip.arrive, 9 * 60 + 52)  # "Returns to Mohawk"
        trip = next(t for t in trips_for('uclub', 'monday') if t.bus == 'UClub' and t.depart == 9 * 60 + 20)
        self.assertEqual(trip.arrive, 9 * 60 + 32)  # "Union"


class HeadingHomeTripsTests(SimpleTestCase):
    def test_leaves_campus_and_arrives_at_residence(self):
        trips = trips_for('uclub', 'monday', TO_RESIDENCE)
        itc = next(t for t in trips if t.bus == 'ITC-UClub' and t.depart == 7 * 60 + 30)
        self.assertEqual((itc.arrive, itc.from_stop, itc.to_stop), (7 * 60 + 40, 'Mohawk', 'UClub'))
        uclub = next(t for t in trips if t.bus == 'UClub' and t.depart == 8 * 60 + 25)
        self.assertEqual((uclub.arrive, uclub.from_stop, uclub.to_stop), (8 * 60 + 30, 'Mohawk', 'UClub'))

    def test_day_rules_apply_going_home(self):
        self.assertIn('23:45', departs('uclub', 'friday', 'UClub', TO_RESIDENCE))
        self.assertNotIn('23:45', departs('uclub', 'monday', 'UClub', TO_RESIDENCE))
        self.assertEqual(departs('uclub', 'sunday', 'ITC-UClub', TO_RESIDENCE), [])

    def test_stop_names_to_campus(self):
        trips = trips_for('uclub', 'monday')
        self.assertEqual({(t.bus, t.from_stop, t.to_stop) for t in trips}, {('ITC-UClub', 'UClub', 'Mohawk'), ('UClub', 'UClub', 'Union')})


class PlannerTests(SimpleTestCase):
    trips = [Trip('A', 500, 520), Trip('B', 540, 555), Trip('A', 560, 590)]

    def test_last_class_end(self):
        self.assertEqual(planner.last_class_end([('10:00', '11:00'), ('13:00', '14:15')]), 14 * 60 + 15)
        self.assertIsNone(planner.last_class_end([]))

    def test_ready_time(self):
        self.assertEqual(planner.ready_time(480, None), 480)
        self.assertEqual(planner.ready_time(480, 600), 610)  # leaves at 10:00, at the stop 10:10
        self.assertEqual(planner.ready_time(700, 600), 700)  # already past the leave time

    def test_next_buses_is_earliest_departure_at_or_after_ready(self):
        best, alts = planner.next_buses(self.trips, 540)
        self.assertEqual((best, alts), (Trip('B', 540, 555), [Trip('A', 560, 590)]))
        self.assertEqual(planner.next_buses(self.trips, 561), (None, []))

    def test_next_class_skips_started_classes(self):
        slots = [('08:00', '09:00'), ('10:00', '11:00'), ('13:00', '14:00')]
        self.assertEqual(planner.next_class(slots, 8 * 60 + 30), ('10:00', '11:00'))
        self.assertEqual(planner.next_class(slots, 10 * 60), ('13:00', '14:00'))
        self.assertIsNone(planner.next_class(slots, 14 * 60))

    def test_recommend_latest_feasible_departure(self):
        best, alts = planner.recommend(self.trips, now=480, arrive_by=560)
        self.assertEqual(best, Trip('B', 540, 555))
        self.assertEqual(alts, [Trip('A', 500, 520)])

    def test_recommend_ignores_departed_trips(self):
        best, _ = planner.recommend(self.trips, now=545, arrive_by=560)
        self.assertIsNone(best)

    def test_can_leave_this_minute(self):
        best, _ = planner.recommend(self.trips, now=540, arrive_by=560)
        self.assertEqual(best.depart, 540)


class TransitApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('ada', 'ada@binghamton.edu', 'Str0ng-pass-123', residence='uclub')
        Schedule.objects.create(user=self.user, monday='10:00-11:00, 13:00-14:00')
        token = self.client.post(
            '/api/auth/login/', {'identifier': 'ada', 'password': 'Str0ng-pass-123'}, content_type='application/json'
        ).json()['access']
        self.auth = {'HTTP_AUTHORIZATION': f'Bearer {token}'}

    def get(self, path, **params):
        return self.client.get(path, params, **self.auth)

    def test_requires_auth(self):
        self.assertEqual(self.client.get('/api/transit/next/').status_code, 401)
        self.assertEqual(self.client.get('/api/transit/departures/').status_code, 401)

    def test_next_bus_for_next_class(self):
        data = self.get('/api/transit/next/', day='monday', time='09:00').json()
        self.assertEqual(data['status'], 'ok')
        self.assertEqual(data['next_class'], {'start': '10:00', 'end': '11:00'})
        self.assertEqual(data['arrive_by'], '09:50')  # class start minus 10 minute walk
        # ITC-UClub at 09:40 would arrive 09:52, too late for 09:50, so the 09:20 UClub bus wins
        self.assertEqual(data['recommendation'], {'bus': 'UClub', 'depart': '09:20', 'arrive': '09:32', 'from_stop': 'UClub', 'to_stop': 'Union', 'leave_in_minutes': 20})
        self.assertEqual([a['depart'] for a in data['alternatives']], ['09:10'])

    def test_no_bus_when_too_late(self):
        data = self.get('/api/transit/next/', day='monday', time='09:45').json()
        self.assertEqual(data['status'], 'no_bus')
        self.assertIsNone(data['recommendation'])
        self.assertEqual(data['next_class']['start'], '10:00')

    def test_class_in_progress_moves_to_following_class(self):
        data = self.get('/api/transit/next/', day='monday', time='10:30').json()
        self.assertEqual(data['next_class']['start'], '13:00')

    def test_no_more_classes_today(self):
        self.assertEqual(self.get('/api/transit/next/', day='monday', time='15:00').json()['status'], 'no_more_classes')
        self.assertEqual(self.get('/api/transit/next/', day='tuesday', time='08:00').json()['status'], 'no_more_classes')

    def test_no_schedule(self):
        Schedule.objects.all().delete()
        self.assertEqual(self.get('/api/transit/next/', day='monday', time='09:00').json()['status'], 'no_schedule')

    def test_no_residence(self):
        self.user.residence = ''
        self.user.save()
        self.assertEqual(self.get('/api/transit/next/').json()['status'], 'no_residence')
        self.assertEqual(self.get('/api/transit/departures/').json()['status'], 'no_residence')
        self.assertEqual(self.get('/api/transit/home/').json()['status'], 'no_residence')

    def test_departures_upcoming(self):
        data = self.get('/api/transit/departures/', day='monday', time='09:00').json()
        self.assertEqual([(u['bus'], u['depart']) for u in data['upcoming'][:3]], [('ITC-UClub', '09:10'), ('UClub', '09:20'), ('ITC-UClub', '09:40')])
        self.assertEqual(len(data['upcoming']), 8)
        self.assertIsNone(data['plan'])

    def home(self, **params):
        return self.get('/api/transit/home/', **params).json()

    def test_home_defaults_to_after_last_class(self):
        data = self.home(day='monday', time='08:00')
        self.assertEqual((data['status'], data['source'], data['leave_at']), ('ok', 'last_class', '14:00'))
        self.assertEqual(data['at_stop_by'], '14:10')  # class ends 14:00 + 10 minute walk
        self.assertEqual(
            data['recommendation'],
            {'bus': 'ITC-UClub', 'depart': '14:30', 'arrive': '14:40', 'from_stop': 'Mohawk', 'to_stop': 'UClub', 'leave_in_minutes': 390},
        )
        self.assertEqual([a['depart'] for a in data['alternatives']], ['15:00', '15:30', '16:00'])

    def test_home_custom_leave_time(self):
        data = self.home(day='monday', time='08:00', leave_at='11:00')
        self.assertEqual((data['source'], data['leave_at'], data['at_stop_by']), ('custom', '11:00', '11:10'))
        self.assertEqual((data['recommendation']['bus'], data['recommendation']['depart']), ('UClub', '11:20'))

    def test_home_after_last_class_already_over(self):
        data = self.home(day='monday', time='15:00')
        self.assertEqual(data['at_stop_by'], '15:00')  # already past the class end, so ready now
        self.assertEqual(data['recommendation']['depart'], '15:00')

    def test_home_without_classes_uses_next_bus(self):
        data = self.home(day='tuesday', time='08:00')
        self.assertEqual((data['source'], data['leave_at']), ('now', None))
        self.assertEqual(data['recommendation']['depart'], '08:00')

    def test_home_no_schedule_uses_next_bus(self):
        Schedule.objects.all().delete()
        self.assertEqual(self.home(day='monday', time='08:00')['source'], 'now')

    def test_home_no_bus_left(self):
        data = self.home(day='monday', time='23:50')
        self.assertEqual((data['status'], data['recommendation']), ('no_bus', None))

    def test_home_validation_and_auth(self):
        self.assertEqual(self.get('/api/transit/home/', leave_at='5pm').status_code, 400)
        self.assertEqual(self.client.get('/api/transit/home/').status_code, 401)

    def test_departures_with_arrive_by(self):
        data = self.get('/api/transit/departures/', day='monday', time='09:00', arrive_by='09:53').json()
        self.assertEqual(data['plan']['status'], 'ok')
        self.assertEqual(data['plan']['recommendation']['depart'], '09:40')

    def test_bad_params(self):
        self.assertEqual(self.get('/api/transit/departures/', arrive_by='9am').status_code, 400)
        self.assertEqual(self.get('/api/transit/next/', day='funday').status_code, 400)
        self.assertEqual(self.get('/api/transit/next/', time='25:00').status_code, 400)

    @override_settings(TRANSIT_FAKE_NOW='monday 08:00')
    def test_fake_now_stub(self):
        data = self.get('/api/transit/next/').json()
        self.assertEqual((data['day'], data['now']), ('monday', '08:00'))
        self.assertEqual(data['recommendation']['depart'], '09:20')

    @override_settings(TRANSIT_FAKE_NOW='monday 08:00')
    def test_query_params_override_fake_now(self):
        data = self.get('/api/transit/next/', time='09:00').json()
        self.assertEqual((data['day'], data['now']), ('monday', '09:00'))
