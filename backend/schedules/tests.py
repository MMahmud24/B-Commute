from django.test import SimpleTestCase, TestCase

from accounts.models import User

from . import timeslots
from .models import Schedule


class TimeslotTests(SimpleTestCase):
    def test_parse_and_format_roundtrip(self):
        slots = timeslots.parse('13:20-13:50, 10:30-11:30')
        self.assertEqual(slots, [('10:30', '11:30'), ('13:20', '13:50')])
        self.assertEqual(timeslots.format_slots(slots), '10:30-11:30, 13:20-13:50')

    def test_empty_string(self):
        self.assertEqual(timeslots.parse(''), [])

    def test_invalid_inputs(self):
        for bad in ['25:00-26:00', '10:30', '11:30-10:30', '10:00-11:00, 10:30-12:00', '9:00-10:00']:
            with self.assertRaises(ValueError, msg=bad):
                timeslots.parse(bad)


class ScheduleApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('ada', 'ada@binghamton.edu', 'Str0ng-pass-123')
        token = self.client.post(
            '/api/auth/login/', {'identifier': 'ada', 'password': 'Str0ng-pass-123'}, content_type='application/json'
        ).json()['access']
        self.auth = {'HTTP_AUTHORIZATION': f'Bearer {token}'}

    def put(self, data):
        return self.client.put('/api/schedule/', data, content_type='application/json', **self.auth)

    def test_requires_auth(self):
        self.assertEqual(self.client.get('/api/schedule/').status_code, 401)

    def test_empty_schedule_before_creation(self):
        res = self.client.get('/api/schedule/', **self.auth)
        self.assertEqual(res.json()['monday'], [])

    def test_put_stores_strings_and_returns_slots(self):
        res = self.put({'monday': [{'start': '13:20', 'end': '13:50'}, {'start': '10:30', 'end': '11:30'}]})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Schedule.objects.get(user=self.user).monday, '10:30-11:30, 13:20-13:50')
        self.assertEqual(res.json()['monday'][0], {'start': '10:30', 'end': '11:30'})

    def test_put_replaces_old_schedule(self):
        self.put({'monday': [{'start': '10:00', 'end': '11:00'}], 'friday': [{'start': '09:00', 'end': '10:00'}]})
        self.put({'tuesday': [{'start': '12:00', 'end': '13:00'}]})
        self.assertEqual(Schedule.objects.filter(user=self.user).count(), 1)
        schedule = Schedule.objects.get(user=self.user)
        self.assertEqual((schedule.monday, schedule.friday), ('', ''))
        self.assertEqual(schedule.tuesday, '12:00-13:00')

    def test_invalid_times_rejected_per_day(self):
        res = self.put({'monday': [{'start': '11:00', 'end': '10:00'}]})
        self.assertEqual(res.status_code, 400)
        self.assertIn('monday', res.json())
        self.assertFalse(Schedule.objects.exists())

    def test_delete(self):
        self.put({'monday': [{'start': '10:00', 'end': '11:00'}]})
        self.assertEqual(self.client.delete('/api/schedule/', **self.auth).status_code, 204)
        self.assertFalse(Schedule.objects.exists())
