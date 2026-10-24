from django.test import TestCase

from .models import User

SIGNUP = {
    'first_name': 'Ada',
    'last_name': 'Lovelace',
    'email': 'ada@binghamton.edu',
    'username': 'ada',
    'password': 'Str0ng-pass-123',
    'confirm_password': 'Str0ng-pass-123',
}


class SignupTests(TestCase):
    def post(self, **overrides):
        return self.client.post('/api/auth/signup/', {**SIGNUP, **overrides}, content_type='application/json')

    def test_signup_creates_user(self):
        res = self.post()
        self.assertEqual(res.status_code, 201)
        self.assertNotIn('password', res.json())
        self.assertTrue(User.objects.get(username='ada').check_password(SIGNUP['password']))

    def test_password_mismatch(self):
        res = self.post(confirm_password='different')
        self.assertEqual(res.status_code, 400)
        self.assertIn('confirm_password', res.json())

    def test_duplicate_email_case_insensitive(self):
        self.post()
        res = self.post(username='other', email='ADA@binghamton.edu')
        self.assertEqual(res.status_code, 400)
        self.assertIn('email', res.json())

    def test_duplicate_username(self):
        self.post()
        res = self.post(email='other@binghamton.edu')
        self.assertEqual(res.status_code, 400)
        self.assertIn('username', res.json())

    def test_missing_fields(self):
        res = self.client.post('/api/auth/signup/', {}, content_type='application/json')
        self.assertEqual(res.status_code, 400)
        for f in ('first_name', 'last_name', 'email', 'username', 'password', 'confirm_password'):
            self.assertIn(f, res.json())


class LoginTests(TestCase):
    def setUp(self):
        self.client.post('/api/auth/signup/', SIGNUP, content_type='application/json')

    def login(self, identifier, password=SIGNUP['password']):
        return self.client.post('/api/auth/login/', {'identifier': identifier, 'password': password}, content_type='application/json')

    def test_login_with_username_or_email(self):
        for identifier in ('ada', 'ADA@binghamton.edu'):
            res = self.login(identifier)
            self.assertEqual(res.status_code, 200)
            self.assertIn('access', res.json())

    def test_bad_password(self):
        self.assertEqual(self.login('ada', 'wrong').status_code, 400)

    def test_me_requires_token(self):
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)
        token = self.login('ada').json()['access']
        res = self.client.get('/api/auth/me/', HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(res.json()['username'], 'ada')


class ResidenceTests(TestCase):
    def setUp(self):
        self.client.post('/api/auth/signup/', SIGNUP, content_type='application/json')
        token = self.client.post(
            '/api/auth/login/', {'identifier': 'ada', 'password': SIGNUP['password']}, content_type='application/json'
        ).json()['access']
        self.auth = {'HTTP_AUTHORIZATION': f'Bearer {token}'}

    def patch(self, data):
        return self.client.patch('/api/auth/me/', data, content_type='application/json', **self.auth)

    def test_residence_empty_after_signup(self):
        self.assertEqual(self.client.get('/api/auth/me/', **self.auth).json()['residence'], '')

    def test_set_residence(self):
        res = self.patch({'residence': 'uclub'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(User.objects.get(username='ada').residence, 'uclub')

    def test_invalid_residence_rejected(self):
        for bad in ('nowhere', ''):
            self.assertEqual(self.patch({'residence': bad}).status_code, 400)

    def test_other_fields_not_editable(self):
        self.patch({'residence': 'uclub', 'username': 'hacker', 'email': 'x@y.com'})
        user = User.objects.get(pk=User.objects.get(username='ada').pk)
        self.assertEqual((user.username, user.email), ('ada', 'ada@binghamton.edu'))

    def test_requires_auth(self):
        self.assertEqual(self.client.patch('/api/auth/me/', {'residence': 'uclub'}, content_type='application/json').status_code, 401)
