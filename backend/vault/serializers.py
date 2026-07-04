from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import EncryptedNote, NotebookFolder

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "password"]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"],
        )
        return user


class NotebookFolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotebookFolder
        fields = ["id", "name", "anonymous_edit", "anonymous_create", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class EncryptedNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EncryptedNote
        fields = ["id", "folder", "title", "anonymous_edit", "nonce", "ciphertext", "salt", "iterations", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
