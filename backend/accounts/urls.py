from django.urls import path

from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path('health/', views.health),
    path('auth/signup/', views.signup),
    path('auth/login/', views.login),
    path('auth/refresh/', TokenRefreshView.as_view()),
    path('auth/me/', views.me),
]
