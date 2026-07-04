import { useCallback, useState } from "react";

import { apiClient } from "../lib/api";
import { decryptNote, encryptNote } from "../lib/crypto";


export type NotebookFolder = {
  id: string;
  name: string;
  anonymous_edit: boolean;
  anonymous_create: boolean;
  created_at: string;
  updated_at: string;
};

export type EncryptedNoteData = {
  id: string;
  folder: string;
  title: string;
  anonymous_edit: boolean;
  nonce: string;
  ciphertext: string;
  salt: string;
  iterations: number;
  created_at: string;
  updated_at: string;
};

export type VaultState = {
  folders: NotebookFolder[];
  notes: EncryptedNoteData[];
  isLoading: boolean;
  error: string | null;
};

export function useVault() {
  const [state, setState] = useState<VaultState>({
    folders: [],
    notes: [],
    isLoading: false,
    error: null,
  });

  const listFolders = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await apiClient.get("/folders/");
      if (!response.ok) throw new Error("Failed to fetch folders");
      const folders = await response.json();
      setState((prev) => ({ ...prev, folders: folders.results || folders, isLoading: false }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch folders",
      }));
    }
  }, []);

  const getFolderByName = useCallback(async (name: string): Promise<NotebookFolder | null> => {
    try {
      const response = await apiClient.get(`/folders/?name=${encodeURIComponent(name)}`);
      if (!response.ok) throw new Error("Failed to find folder");
      const data = await response.json();
      const results = data.results || data;
      if (results.length > 0) return results[0];
      throw new Error("Folder not found");
    } catch (error) {
       setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Folder not found",
       }));
       return null;
    }
  }, []);

  const getNoteByTitle = useCallback(async (title: string): Promise<EncryptedNoteData | null> => {
    try {
      const response = await apiClient.get(`/notes/?title=${encodeURIComponent(title)}`);
      if (!response.ok) throw new Error("Failed to find note");
      const data = await response.json();
      const results = data.results || data;
      if (results.length > 0) return results[0];
      throw new Error("Note not found");
    } catch (error) {
       setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Note not found",
       }));
       return null;
    }
  }, []);

  const createFolder = useCallback(
    async (name: string, anonymousEdit = false, anonymousCreate = false): Promise<NotebookFolder | null> => {
      setState((prev) => ({ ...prev, error: null }));
      try {
        const response = await apiClient.post("/folders/", { 
          name, 
          anonymous_edit: anonymousEdit, 
          anonymous_create: anonymousCreate 
        });
        if (!response.ok) throw new Error("Failed to create folder");
        const folder = await response.json();
        setState((prev) => ({ ...prev, folders: [...prev.folders, folder], error: null }));
        return folder;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Failed to create folder",
        }));
        return null;
      }
    },
    [],
  );

  const deleteFolder = useCallback(async (folderId: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, error: null }));
    try {
      const response = await apiClient.delete(`/folders/${folderId}/`);
      if (!response.ok) throw new Error("Failed to delete folder");
      setState((prev) => ({
        ...prev,
        folders: prev.folders.filter((folder) => folder.id !== folderId),
        notes: prev.notes.filter((note) => note.folder !== folderId),
        error: null,
      }));
      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to delete folder",
      }));
      return false;
    }
  }, []);

  const listNotes = useCallback(async (folderId?: string) => {
    if (!folderId) {
      setState((prev) => ({ ...prev, notes: [], isLoading: false }));
      return;
    }
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await apiClient.get(`/notes/?folder=${folderId}`);
      if (!response.ok) throw new Error("Failed to fetch notes");
      const notes = await response.json();
      setState((prev) => ({ ...prev, notes: notes.results || notes, isLoading: false }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch notes",
      }));
    }
  }, []);

  const createNote = useCallback(
    async (folderId: string, title: string, plaintext: string, passphrase: string, anonymousEdit = true): Promise<EncryptedNoteData | null> => {
      setState((prev) => ({ ...prev, error: null }));
      try {
        const payload = await encryptNote(plaintext, passphrase);
        const response = await apiClient.post("/notes/", {
          folder: folderId,
          title,
          anonymous_edit: anonymousEdit,
          nonce: payload.nonce,
          ciphertext: payload.ciphertext,
          salt: payload.salt,
          iterations: payload.iterations,
        });
        if (!response.ok) throw new Error("Failed to create note");
        const note = await response.json();
        setState((prev) => ({ ...prev, notes: [...prev.notes, note], error: null }));
        return note;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Failed to create note",
        }));
        return null;
      }
    },
    [],
  );

  const updateNote = useCallback(
    async (noteId: string, folderId: string, title: string, plaintext: string, passphrase: string, anonymousEdit = true): Promise<EncryptedNoteData | null> => {
      setState((prev) => ({ ...prev, error: null }));
      try {
        const payload = await encryptNote(plaintext, passphrase);
        const response = await apiClient.put(`/notes/${noteId}/`, {
          folder: folderId,
          title,
          anonymous_edit: anonymousEdit,
          nonce: payload.nonce,
          ciphertext: payload.ciphertext,
          salt: payload.salt,
          iterations: payload.iterations,
        });
        if (!response.ok) throw new Error("Failed to update note");
        const updatedNote = await response.json();
        setState((prev) => ({
          ...prev,
          notes: prev.notes.map((note) => (note.id === noteId ? updatedNote : note)),
          error: null,
        }));
        return updatedNote;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Failed to update note",
        }));
        return null;
      }
    },
    [],
  );

  const deleteNote = useCallback(async (noteId: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, error: null }));
    try {
      const response = await apiClient.delete(`/notes/${noteId}/`);
      if (!response.ok) throw new Error("Failed to delete note");
      setState((prev) => ({
        ...prev,
        notes: prev.notes.filter((note) => note.id !== noteId),
        error: null,
      }));
      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to delete note",
      }));
      return false;
    }
  }, []);

  const decryptNoteData = useCallback(async (noteData: EncryptedNoteData, passphrase: string): Promise<string | null> => {
    setState((prev) => ({ ...prev, error: null }));
    try {
      const plaintext = await decryptNote(
        {
          ciphertext: noteData.ciphertext,
          nonce: noteData.nonce,
          salt: noteData.salt,
          iterations: noteData.iterations || 150000,
        },
        passphrase,
      );
      return plaintext;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to decrypt note",
      }));
      return null;
    }
  }, []);

  const changePassphrase = useCallback(
    async (folderId: string, oldPassphrase: string, newPassphrase: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const response = await apiClient.get(`/notes/?folder=${folderId}`);
        if (!response.ok) throw new Error("Failed to fetch notes for re-encryption");
        const notesResponse = await response.json();
        const folderNotes: EncryptedNoteData[] = notesResponse.results || notesResponse;

        for (const note of folderNotes) {
          const plaintext = await decryptNote(
            {
              ciphertext: note.ciphertext,
              nonce: note.nonce,
              salt: note.salt,
              iterations: note.iterations || 150000,
            },
            oldPassphrase,
          );
          
          const newPayload = await encryptNote(plaintext, newPassphrase);
          const updateResponse = await apiClient.put(`/notes/${note.id}/`, {
            folder: folderId,
            title: note.title,
            nonce: newPayload.nonce,
            ciphertext: newPayload.ciphertext,
            salt: newPayload.salt,
            iterations: newPayload.iterations,
          });

          if (!updateResponse.ok) {
             throw new Error("Failed to update note during re-encryption");
          }
        }
        
        setState((prev) => ({ ...prev, isLoading: false }));
        void listNotes(folderId);
        return true;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : "Failed to change passphrase",
        }));
        return false;
      }
    },
    [listNotes]
  );

  const updateFolderPermissions = useCallback(
    async (folderId: string, anonymousEdit: boolean, anonymousCreate: boolean): Promise<NotebookFolder | null> => {
      setState((prev) => ({ ...prev, error: null }));
      try {
        const response = await apiClient.patch(`/folders/${folderId}/`, {
          anonymous_edit: anonymousEdit,
          anonymous_create: anonymousCreate,
        });
        if (!response.ok) throw new Error("Failed to update folder permissions");
        const updatedFolder = await response.json();
        setState((prev) => ({
          ...prev,
          folders: prev.folders.map((f) => (f.id === folderId ? updatedFolder : f)),
          error: null,
        }));
        return updatedFolder;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Failed to update folder permissions",
        }));
        return null;
      }
    },
    [],
  );

  const updateNotePermissions = useCallback(
    async (noteId: string, anonymousEdit: boolean): Promise<EncryptedNoteData | null> => {
      setState((prev) => ({ ...prev, error: null }));
      try {
        const response = await apiClient.patch(`/notes/${noteId}/`, {
          anonymous_edit: anonymousEdit,
        });
        if (!response.ok) throw new Error("Failed to update note permissions");
        const updatedNote = await response.json();
        setState((prev) => ({
          ...prev,
          notes: prev.notes.map((n) => (n.id === noteId ? updatedNote : n)),
          error: null,
        }));
        return updatedNote;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Failed to update note permissions",
        }));
        return null;
      }
    },
    [],
  );

  return {
    ...state,
    listFolders,
    getFolderByName,
    createFolder,
    deleteFolder,
    renameFolder: useCallback(async (folderId: string, newName: string): Promise<NotebookFolder | null> => {
      setState((prev) => ({ ...prev, error: null }));
      try {
        const response = await apiClient.patch(`/folders/${folderId}/`, { name: newName });
        if (!response.ok) throw new Error("Failed to rename folder");
        const updatedFolder = await response.json();
        setState((prev) => ({
          ...prev,
          folders: prev.folders.map((f) => (f.id === folderId ? updatedFolder : f)),
          error: null,
        }));
        return updatedFolder;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Failed to rename folder",
        }));
        return null;
      }
    }, []),
    listNotes,
    createNote,
    updateNote,
    deleteNote,
    decryptNoteData,
    changePassphrase,
    updateFolderPermissions,
    updateNotePermissions,
    getNoteByTitle,
  };
}
