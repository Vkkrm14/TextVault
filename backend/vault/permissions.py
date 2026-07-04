from rest_framework.permissions import BasePermission
from .models import NotebookFolder, EncryptedNote


class IsFolderOwner(BasePermission):
    def has_object_permission(self, request, view, obj) -> bool:
        if view.action in ['retrieve', 'list', 'create']:
            return True
        owner = getattr(obj, "owner", None)
        if owner is None and hasattr(obj, "folder"):
            owner = getattr(obj.folder, "owner", None)
        return owner == request.user


class IsFolderOwnerOrHasPublicPermission(BasePermission):
    def has_permission(self, request, view):
        if view.action == 'create':
            folder_id = request.data.get('folder')
            if not folder_id:
                return True # DRF serializer validation will handle missing field
            try:
                folder = NotebookFolder.objects.get(id=folder_id)
            except (NotebookFolder.DoesNotExist, ValueError):
                return False
            
            # Owner can always create notes
            if request.user.is_authenticated and folder.owner == request.user:
                return True
                
            # Anonymous can create notes only if folder allows it
            return folder.anonymous_create
        return True

    def has_object_permission(self, request, view, obj) -> bool:
        # Determine the parent folder
        folder = obj if isinstance(obj, NotebookFolder) else obj.folder
        
        # Folder owner always has full access
        if request.user.is_authenticated and folder.owner == request.user:
            return True
            
        # If it's a read action (retrieve, list)
        if view.action in ['retrieve', 'list']:
            return True # anyone can view if they have the folder access (cryptographic)
            
        # If it's an edit action (update, partial_update, destroy)
        if view.action in ['update', 'partial_update', 'destroy']:
            # For note operations, check both folder permissions and note-level lock
            if isinstance(obj, EncryptedNote):
                return folder.anonymous_edit and obj.anonymous_edit
            return folder.anonymous_edit
            
        return False

