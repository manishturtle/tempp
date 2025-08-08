from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views
from .views_simple import SimpleTemporaryUploadView

router = DefaultRouter()

urlpatterns = [
    # Direct path for the temporary upload endpoint using the simplified view
    path('temporary-uploads/', SimpleTemporaryUploadView.as_view(), name='temporary-upload'),
]

urlpatterns += router.urls
