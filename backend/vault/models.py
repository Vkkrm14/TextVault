from uuid import uuid4

from django.conf import settings
from django.db import models


class NotebookFolder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notebook_folders")
    name = models.CharField(max_length=255, unique=True)
    anonymous_edit = models.BooleanField(default=False)   # False = view-only, True = edit
    anonymous_create = models.BooleanField(default=False) # False = no-create, True = create
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name


class EncryptedNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    folder = models.ForeignKey(NotebookFolder, on_delete=models.CASCADE, related_name="notes")
    title = models.CharField(max_length=255, default="Untitled")
    anonymous_edit = models.BooleanField(default=True) # True = edit, False = view-only
    nonce = models.TextField()
    ciphertext = models.TextField()
    salt = models.TextField(default="")  # Will be set by client on creation
    iterations = models.IntegerField(default=150000)  # PBKDF2 iteration count
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"EncryptedNote<{self.id}>"
