from django.contrib import admin

from .models import EncryptedNote, NotebookFolder


@admin.register(NotebookFolder)
class NotebookFolderAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "owner", "created_at")
    search_fields = ("name", "owner__username", "owner__email")
    list_select_related = ("owner",)


@admin.register(EncryptedNote)
class EncryptedNoteAdmin(admin.ModelAdmin):
    list_display = ("id", "folder", "created_at", "updated_at")
    list_select_related = ("folder",)
