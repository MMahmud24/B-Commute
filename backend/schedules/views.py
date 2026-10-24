from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import DAYS, Schedule
from .serializers import ScheduleSerializer


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def my_schedule(request):
    if request.method == 'PUT':
        serializer = ScheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        schedule = serializer.save(user=request.user)
        return Response(ScheduleSerializer(schedule).data)

    schedule = Schedule.objects.filter(user=request.user).first()
    if request.method == 'DELETE':
        if schedule:
            schedule.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # GET: a user with no schedule yet gets an empty week instead of a 404, so the form can render.
    if schedule is None:
        return Response({day: [] for day in DAYS})
    return Response(ScheduleSerializer(schedule).data)
