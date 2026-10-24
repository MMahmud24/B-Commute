from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db.models import Q
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class SignupSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'username', 'password', 'confirm_password']
        read_only_fields = ['id']

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value.lower()

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('A user with this username already exists.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        validate_password(attrs['password'], User(**{k: v for k, v in attrs.items() if k not in ('password', 'confirm_password')}))
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'username']


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField()  # username or email
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate(self, attrs):
        identifier = attrs['identifier']
        user = User.objects.filter(Q(username__iexact=identifier) | Q(email__iexact=identifier)).first()
        if user is None or not user.check_password(attrs['password']) or not user.is_active:
            raise serializers.ValidationError('Invalid username/email or password.')
        refresh = RefreshToken.for_user(user)
        return {'access': str(refresh.access_token), 'refresh': str(refresh), 'user': UserSerializer(user).data}
