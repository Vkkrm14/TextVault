from rest_framework import viewsets, generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model

from .models import EncryptedNote, NotebookFolder
from .permissions import IsFolderOwner, IsFolderOwnerOrHasPublicPermission
from .serializers import EncryptedNoteSerializer, NotebookFolderSerializer, RegisterSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer


class NotebookFolderViewSet(viewsets.ModelViewSet):
    serializer_class = NotebookFolderSerializer

    def get_permissions(self):
        if self.action == 'retrieve':
            return [AllowAny()]
        if self.action == 'list' and self.request.query_params.get('name'):
            return [AllowAny()]
        return [IsAuthenticated(), IsFolderOwner()]

    def get_queryset(self):
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            return NotebookFolder.objects.all()
        
        name = self.request.query_params.get("name")
        if name:
            return NotebookFolder.objects.filter(name=name)
            
        if self.request.user.is_authenticated:
            return NotebookFolder.objects.filter(owner=self.request.user)
        return NotebookFolder.objects.none()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class EncryptedNoteViewSet(viewsets.ModelViewSet):
    serializer_class = EncryptedNoteSerializer
    permission_classes = [IsFolderOwnerOrHasPublicPermission]

    def get_queryset(self):
        folder_id = self.request.query_params.get("folder")
        if folder_id:
            return EncryptedNote.objects.filter(folder_id=folder_id)
        
        title = self.request.query_params.get("title")
        if title:
            return EncryptedNote.objects.filter(title=title)
        
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            return EncryptedNote.objects.all()

        if self.request.user.is_authenticated:
            return EncryptedNote.objects.filter(folder__owner=self.request.user)
        return EncryptedNote.objects.none()

    def perform_create(self, serializer):
        # We allow anyone to create a note in any valid folder. 
        # The cryptographic payload must be valid, but backend just stores it.
        serializer.save()
