from django.urls import path

from . import views

urlpatterns = [
    path('transit/next/', views.next_departure),
    path('transit/departures/', views.departures),
    path('transit/home/', views.heading_home),
]
