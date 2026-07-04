from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import EncryptedNoteViewSet, NotebookFolderViewSet, RegisterView


router = DefaultRouter()
router.register(r"folders", NotebookFolderViewSet, basename="folder")
router.register(r"notes", EncryptedNoteViewSet, basename="note")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
] + router.urls
