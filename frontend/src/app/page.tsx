"use client";

import { useEffect, useMemo, useState } from "react";

import { decryptNote, encryptNote, type EncryptedPayload } from "../lib/crypto";
import { useAuth } from "../hooks/useAuth";
import { useVault, type EncryptedNoteData, type NotebookFolder } from "../hooks/useVault";
import { apiClient } from "../lib/api";


export default function HomePage() {
  const { isAuthenticated, isLoading: authLoading, error: authError, username: loggedInUser, login, register, logout } = useAuth();
  const { folders, notes, isLoading, error, listFolders, getFolderByName, createFolder, deleteFolder, renameFolder, listNotes, createNote, updateNote, deleteNote, decryptNoteData, changePassphrase, updateFolderPermissions, updateNotePermissions, getNoteByTitle } = useVault();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [folderName, setFolderName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [noteTitle, setNoteTitle] = useState("Private note");
  const [plaintext, setPlaintext] = useState("Draft a private note here.");
  const [passphrase, setPassphrase] = useState("");
  const [decryptedResult, setDecryptedResult] = useState("");
  const [payloadPreview, setPayloadPreview] = useState<EncryptedPayload | null>(null);
  const [selectedNote, setSelectedNote] = useState<EncryptedNoteData | null>(null);

  const [publicFolderIdInput, setPublicFolderIdInput] = useState("");
  const [isAccessingPublicFolder, setIsAccessingPublicFolder] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [newPassphrase, setNewPassphrase] = useState("");
  const [isChangingPassphrase, setIsChangingPassphrase] = useState(false);

  const [folderAnonymousEdit, setFolderAnonymousEdit] = useState(false);
  const [folderAnonymousCreate, setFolderAnonymousCreate] = useState(false);
  const [publicFolder, setPublicFolder] = useState<NotebookFolder | null>(null);

  const [publicNoteInput, setPublicNoteInput] = useState("");
  const [publicNote, setPublicNote] = useState<EncryptedNoteData | null>(null);
  const [publicNoteFolder, setPublicNoteFolder] = useState<NotebookFolder | null>(null);
  const [isAccessingPublicNote, setIsAccessingPublicNote] = useState(false);

  const [isDecryptModalOpen, setIsDecryptModalOpen] = useState(false);
  const [decryptModalNote, setDecryptModalNote] = useState<EncryptedNoteData | null>(null);
  const [decryptModalPassphrase, setDecryptModalPassphrase] = useState("");
  const [decryptModalError, setDecryptModalError] = useState<string | null>(null);

  const [noteAnonymousEdit, setNoteAnonymousEdit] = useState(true);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

  // Context Menus & Modals
  const [activeFolderMenu, setActiveFolderMenu] = useState<string | null>(null);
  const [activeNoteMenu, setActiveNoteMenu] = useState<string | null>(null);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isRenameFolderModalOpen, setIsRenameFolderModalOpen] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [isFolderPermsModalOpen, setIsFolderPermsModalOpen] = useState(false);
  const [permsFolderId, setPermsFolderId] = useState<string | null>(null);
  const [isNotePermsModalOpen, setIsNotePermsModalOpen] = useState(false);
  const [permsNoteId, setPermsNoteId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".ctx-trigger") && !target.closest(".ctx-menu")) {
        setActiveFolderMenu(null);
        setActiveNoteMenu(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  function showToast(message: string, type: "success" | "error" | "info" = "success") {
    setToastMessage(message);
    setToastType(type);
    const id = setTimeout(() => {
      setToastMessage((prev) => prev === message ? null : prev);
    }, 3000);
    return () => clearTimeout(id);
  }

  useEffect(() => {
    if (isAuthenticated) {
      void listFolders();
    }
  }, [isAuthenticated, listFolders]);

  useEffect(() => {
    void listNotes(selectedFolderId);
    // Reset note editing state whenever folder selection changes
    setSelectedNote(null);
    setNoteTitle("Private note");
    setPlaintext("Draft a private note here.");
    setPassphrase("");
    setDecryptedResult("");
    setPayloadPreview(null);
  }, [selectedFolderId, listNotes]);

  const selectedFolder = useMemo(() => {
    if (isAccessingPublicFolder && publicFolder) return publicFolder;
    return folders.find((folder) => folder.id === selectedFolderId) || null;
  }, [folders, selectedFolderId, isAccessingPublicFolder, publicFolder]);

  const canUserCreate = useMemo(() => {
    if (isAuthenticated) return true;
    return selectedFolder?.anonymous_create ?? false;
  }, [isAuthenticated, selectedFolder]);

  const canUserEdit = useMemo(() => {
    if (isAuthenticated) return true;
    return selectedFolder?.anonymous_edit ?? false;
  }, [isAuthenticated, selectedFolder]);

  const canEditPublicNote = useMemo(() => {
    if (!publicNote || !publicNoteFolder) return false;
    return publicNote.anonymous_edit && publicNoteFolder.anonymous_edit;
  }, [publicNote, publicNoteFolder]);

  async function handleAccessPublicNote() {
    if (publicNoteInput.trim()) {
      const note = await getNoteByTitle(publicNoteInput.trim());
      if (note) {
        try {
          const folderRes = await apiClient.get(`/folders/${note.folder}/`);
          if (folderRes.ok) {
            const folder = await folderRes.json();
            setPublicNoteFolder(folder);
          }
        } catch (err) {
          console.error("Failed to fetch note parent folder", err);
        }
        setPublicNote(note);
        setIsAccessingPublicNote(true);
        setPublicNoteInput("");
        setPassphrase("");
        setPlaintext("");
        setDecryptedResult("");
        showToast(`Accessing note "${note.title.split(":").slice(1).join(":")}"`);
      } else {
        showToast("Note not found", "error");
      }
    }
  }

  function handleExitPublicNote() {
    setIsAccessingPublicNote(false);
    setPublicNote(null);
    setPublicNoteFolder(null);
    setPublicNoteInput("");
    setPassphrase("");
    setPlaintext("");
    setDecryptedResult("");
    showToast("Exited public note", "info");
  }

  async function handleDecryptPublicNote() {
    if (!publicNote) return;
    const decrypted = await decryptNoteData(publicNote, passphrase);
    if (decrypted) {
      setPlaintext(decrypted);
      setDecryptedResult(decrypted);
      showToast("Note decrypted successfully!");
    } else {
      showToast("Decryption failed. Incorrect passphrase.", "error");
    }
  }

  async function handleSavePublicNote() {
    if (!publicNote) return;
    const note = await updateNote(publicNote.id, publicNote.folder, publicNote.title, plaintext, passphrase, publicNote.anonymous_edit);
    if (note) {
      setPublicNote(note);
      setDecryptedResult(plaintext);
      showToast("Note updated successfully!");
    } else {
      showToast("Failed to save changes. Verify passphrase and permissions.", "error");
    }
  }

  async function handleLogin() {
    const res = await login(username, password);
    if (res.success) {
      showToast("Logged in successfully!");
    } else {
      showToast(res.error || "Failed to login", "error");
    }
    setUsername("");
    setPassword("");
  }

  async function handleRegister() {
    const res = await register(username, password);
    if (res.success) {
      showToast("Account created successfully!");
    } else {
      showToast(res.error || "Registration failed", "error");
    }
    setUsername("");
    setPassword("");
  }

  async function handleAccessPublicFolder() {
    if (publicFolderIdInput.trim()) {
      const folder = await getFolderByName(publicFolderIdInput.trim());
      if (folder) {
        setPublicFolder(folder);
        setSelectedFolderId(folder.id);
        setIsAccessingPublicFolder(true);
        setPublicFolderIdInput("");
        showToast(`Accessing folder "${folder.name}"`);
      } else {
        showToast("Folder not found", "error");
      }
    }
  }

  function handleExitPublicFolder() {
    setIsAccessingPublicFolder(false);
    setSelectedFolderId("");
    setPublicFolderIdInput("");
    setPublicFolder(null);
    showToast("Exited public folder", "info");
  }

  async function handleCreateFolder() {
    const prefix = isAuthenticated && loggedInUser ? loggedInUser : "anonymous";
    const finalFolderName = `${prefix}:${folderName.trim()}`;
    const folder = await createFolder(finalFolderName, folderAnonymousEdit, folderAnonymousCreate);
    if (folder) {
      setFolderName("");
      setFolderAnonymousEdit(false);
      setFolderAnonymousCreate(false);
      setSelectedFolderId(folder.id);
      setIsCreateFolderModalOpen(false);
      showToast(`Folder "${folder.name}" created`);
    } else {
      showToast("Failed to create folder", "error");
    }
  }

  async function handleRenameFolderSubmit() {
    if (!renameFolderId || !renameFolderName.trim()) return;
    const prefix = isAuthenticated && loggedInUser ? loggedInUser : "anonymous";
    const finalFolderName = `${prefix}:${renameFolderName.trim()}`;
    const folder = await renameFolder(renameFolderId, finalFolderName);
    if (folder) {
      showToast("Folder renamed successfully!");
      setIsRenameFolderModalOpen(false);
      setRenameFolderId(null);
      setRenameFolderName("");
    } else {
      showToast("Failed to rename folder", "error");
    }
  }

  async function handleSaveNote() {
    if (!selectedFolderId) {
      return;
    }

    let ownerPrefix = "anonymous";
    if (isAuthenticated && loggedInUser) {
      ownerPrefix = loggedInUser;
    } else if (selectedFolder) {
      const parts = selectedFolder.name.split(":");
      if (parts.length > 1) {
        ownerPrefix = parts[0];
      }
    }

    let finalTitle = `${ownerPrefix}:${noteTitle}`;

    let note;
    const isEditing = !!selectedNote;
    if (selectedNote) {
      const originalTitle = selectedNote.title || "";
      const parts = originalTitle.split(":");
      const existingPrefix = parts.length > 1 ? parts[0] : null;
      const editPrefix = isAuthenticated && loggedInUser ? loggedInUser : (existingPrefix || ownerPrefix);
      finalTitle = `${editPrefix}:${noteTitle}`;
      
      note = await updateNote(selectedNote.id, selectedFolderId, finalTitle, plaintext, passphrase, noteAnonymousEdit);
    } else {
      note = await createNote(selectedFolderId, finalTitle, plaintext, passphrase, noteAnonymousEdit);
    }

    if (note) {
      setSelectedNote(note);
      setNoteTitle("");
      setPassphrase("");
      setDecryptedResult("");
      setPayloadPreview(null);
      showToast(isEditing ? "Note updated successfully!" : "Note saved successfully!");
    } else {
      showToast("Failed to save note. Check passphrase & permissions.", "error");
    }
  }

  function handleNewNote() {
    setSelectedNote(null);
    setNoteTitle("New private note");
    setPlaintext("");
    setDecryptedResult("");
    setPayloadPreview(null);
    setNoteAnonymousEdit(true);
  }

  function handleNoteClick(note: EncryptedNoteData) {
    setDecryptModalNote(note);
    setDecryptModalPassphrase(passphrase);
    setDecryptModalError(null);
    setIsDecryptModalOpen(true);
  }

  async function handleDecryptModalSubmit() {
    if (!decryptModalNote) return;
    setDecryptModalError(null);
    const decrypted = await decryptNoteData(decryptModalNote, decryptModalPassphrase);
    if (decrypted) {
      setSelectedNote(decryptModalNote);
      const rawTitle = decryptModalNote.title || "Untitled";
      const parts = rawTitle.split(":");
      const cleanTitle = parts.length > 1 ? parts.slice(1).join(":") : rawTitle;
      setNoteTitle(cleanTitle);
      setNoteAnonymousEdit(decryptModalNote.anonymous_edit);
      setPlaintext(decrypted);
      setDecryptedResult(decrypted);
      setIsDecryptModalOpen(false);
      setDecryptModalNote(null);
      setDecryptModalPassphrase("");
      setPassphrase("");
      showToast(`Note "${decryptModalNote.title}" decrypted`);
    } else {
      setDecryptModalError("Decryption failed. The passphrase is likely incorrect.");
      showToast("Decryption failed", "error");
    }
  }

  async function handleChangePassphrase() {
    if (!selectedFolderId || !passphrase || !newPassphrase) return;
    const success = await changePassphrase(selectedFolderId, passphrase, newPassphrase);
    if (success) {
      setPassphrase("");
      setNewPassphrase("");
      setIsChangingPassphrase(false);
      setDecryptedResult("Passphrase changed successfully. All notes re-encrypted.");
      showToast("Passphrase changed successfully!");
    } else {
      showToast("Failed to change passphrase", "error");
    }
  }

  async function handleDeleteFolder(id: string) {
    if (confirm("Are you sure you want to delete this folder? All notes inside will be lost.")) {
      const success = await deleteFolder(id);
      if (success) {
        showToast("Folder deleted successfully!", "info");
        if (selectedFolderId === id) {
          setSelectedFolderId("");
        }
      } else {
        showToast("Failed to delete folder", "error");
      }
    }
  }

  async function handleDeleteNote(id: string) {
    if (confirm("Are you sure you want to delete this note?")) {
      const success = await deleteNote(id);
      if (success) {
        showToast("Note deleted successfully!", "info");
        if (selectedNote?.id === id) {
          setSelectedNote(null);
          setNoteTitle("New private note");
          setPlaintext("");
        }
      } else {
        showToast("Failed to delete note", "error");
      }
    }
  }

  return (
    <main className="shell">
      {!isAuthenticated && !isAccessingPublicFolder && !isAccessingPublicNote && (
        <section className="hero">
          <p className="eyebrow">TextVault</p>
          <h1>Encrypted notes. Strict ownership. Browser-side keys.</h1>
          <p className="lede">
            Login with your account, choose a notebook folder, then encrypt and store notes without exposing plaintext to the server.
          </p>
        </section>
      )}

      {!isAuthenticated && isAccessingPublicFolder && (
        <section className="hero" style={{ gridColumn: '1 / -1', textAlign: 'center', alignItems: 'center' }}>
          <p className="eyebrow">Shared Vault</p>
          <h1 style={{ maxWidth: '100%' }}>📂 {selectedFolder?.name ? selectedFolder.name.split(":").slice(1).join(":") : "Shared Folder"}</h1>
          <p className="lede" style={{ maxWidth: '800px' }}>
            You are accessing a public, zero-knowledge encrypted folder. You must provide the correct passphrase to decrypt or write notes.
          </p>
          <button className="secondary" onClick={handleExitPublicFolder} style={{ marginTop: '12px' }}>
            🏠 Exit Shared Folder
          </button>
        </section>
      )}

      {!isAuthenticated && isAccessingPublicNote && (
        <>
          <section className="hero" style={{ gridColumn: '1 / -1', textAlign: 'center', alignItems: 'center' }}>
            <p className="eyebrow">Shared Note</p>
            <h1 style={{ maxWidth: '100%' }}>📄 {publicNote ? (publicNote.title.split(":").slice(1).join(":") || "Shared Note") : "Shared Note"}</h1>
            <p className="lede" style={{ maxWidth: '800px' }}>
              You are accessing a single zero-knowledge encrypted note. Provide the passphrase to decrypt and edit (if allowed by the owner).
            </p>
            <button className="secondary" onClick={handleExitPublicNote} style={{ marginTop: '12px' }}>
              🏠 Exit Shared Note
            </button>
          </section>

          {!decryptedResult ? (
            <section className="panel" style={{ gridColumn: '1 / -1', maxWidth: '500px', margin: '0 auto' }}>
              <h2>🔑 Decrypt Note</h2>
              <p className="muted">Enter the cryptographic passphrase to decrypt this note.</p>
              <label style={{ marginTop: '15px' }}>
                Passphrase
                <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="Note passphrase" />
              </label>
              <div className="actions" style={{ marginTop: '15px' }}>
                <button onClick={handleDecryptPublicNote} disabled={!passphrase}>🔓 Decrypt Note</button>
              </div>
            </section>
          ) : (
            <section className="panel" style={{ gridColumn: '1 / -1', maxWidth: '800px', margin: '0 auto' }}>
              <div className="note-editor">
                <div className="note-editor-header">
                  <h2>📄 {publicNote ? publicNote.title.split(":").slice(1).join(":") : "Note"}</h2>
                  <span className="badge" style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    background: canEditPublicNote ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    color: canEditPublicNote ? '#10b981' : '#ef4444',
                    border: canEditPublicNote ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)'
                  }}>
                    {canEditPublicNote ? "✏ Editable" : "👁 View Only"}
                  </span>
                </div>
                
                {canEditPublicNote ? (
                  <textarea 
                    value={plaintext} 
                    onChange={(e) => setPlaintext(e.target.value)} 
                    placeholder="Note content..."
                    style={{ minHeight: '300px', fontFamily: 'monospace', width: '100%', background: 'rgba(0,0,0,0.2)', color: 'var(--text)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '16px' }}
                  />
                ) : (
                  <div className="decrypted-content" style={{ whiteSpace: 'pre-wrap', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--panel-border)', minHeight: '300px' }}>
                    {plaintext}
                  </div>
                )}

                {canEditPublicNote && (
                  <div className="actions" style={{ justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button onClick={handleSavePublicNote} disabled={isLoading}>💾 Save Changes</button>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {!isAuthenticated && !isAccessingPublicFolder && !isAccessingPublicNote ? (
        <>
          <section className="panel">
            <h2>Access Shared Content</h2>
            <p className="muted">Enter path in the format <code>ownername:foldername</code> or <code>ownername:notetitle</code>.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '15px' }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '15px' }}>
                <h3 style={{ fontSize: '0.95rem', margin: '0 0 10px 0', color: 'var(--text-muted)' }}>Option 1: Access Entire Folder</h3>
                <label style={{ fontSize: '0.85rem' }}>
                  Folder Path (ownername:foldername)
                  <input value={publicFolderIdInput} onChange={(event) => setPublicFolderIdInput(event.target.value)} placeholder="E.g. alice:PublicNotes" />
                </label>
                <div className="actions" style={{ marginTop: '8px' }}>
                  <button onClick={handleAccessPublicFolder} disabled={!publicFolderIdInput.trim()}>📂 Access Folder</button>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '0.95rem', margin: '0 0 10px 0', color: 'var(--text-muted)' }}>Option 2: Access Specific Note</h3>
                <label style={{ fontSize: '0.85rem' }}>
                  Note Path (ownername:notetitle)
                  <input value={publicNoteInput} onChange={(event) => setPublicNoteInput(event.target.value)} placeholder="E.g. alice:MySecretNote" />
                </label>
                <div className="actions" style={{ marginTop: '8px' }}>
                  <button onClick={handleAccessPublicNote} disabled={!publicNoteInput.trim()}>📄 Access Note</button>
                </div>
              </div>
            </div>
          </section>

          {isSignUp ? (
            <section className="panel">
              <h2>Create Account</h2>
              <label>
                Username
                <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Choose a username" />
              </label>
              <label>
                Password
                <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Choose a secure password" />
              </label>
              <div className="actions">
                <button onClick={handleRegister} disabled={authLoading}>Sign Up</button>
                <button className="secondary" onClick={() => setIsSignUp(false)}>Already have an account? Sign In</button>
              </div>
              {authError ? <p className="error">{authError}</p> : null}
            </section>
          ) : (
            <section className="panel">
              <h2>Sign in to Dashboard</h2>
              <label>
                Username
                <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="admin" />
              </label>
              <label>
                Password
                <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Your account password" />
              </label>
              <div className="actions">
                <button onClick={handleLogin} disabled={authLoading}>Log in</button>
                <button className="secondary" onClick={() => setIsSignUp(true)}>Need an account? Sign Up</button>
              </div>
              {authError ? <p className="error">{authError}</p> : null}
            </section>
          )}
        </>
      ) : (
        (isAuthenticated || isAccessingPublicFolder) && (
          <section className={isAuthenticated ? "owner-shell" : "dashboard dashboard--full"}>
          {isAuthenticated ? (
            <>
              {/* LEFT COLUMN: Folders */}
              <div className="owner-panel">
                <div className="owner-panel-header">
                  <h2>📁 Folders</h2>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="icon-btn" onClick={() => setIsCreateFolderModalOpen(true)} title="New Folder">+</button>
                    <button className="secondary" style={{ padding: '6px 12px', fontSize: '0.9rem' }} onClick={logout}>🚪 Log out</button>
                  </div>
                </div>
                <div className="folder-list">
                  {folders.length === 0 ? <p className="empty-state">No folders yet.</p> : null}
                  {folders.map((folder: NotebookFolder) => {
                    const rawName = folder.name || "Untitled";
                    const parts = rawName.split(":");
                    const displayFolderName = parts.length > 1 ? parts.slice(1).join(":") : rawName;
                    return (
                      <div key={folder.id} className={`folder-row ${selectedFolderId === folder.id ? "active" : ""}`} onClick={() => setSelectedFolderId(folder.id)}>
                        <span className="folder-icon">📁</span>
                        <span className="folder-name">{displayFolderName}</span>
                        <div className="ctx-wrap">
                          <button 
                            className="ctx-trigger" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveFolderMenu(activeFolderMenu === folder.id ? null : folder.id);
                              setActiveNoteMenu(null);
                            }}
                          >⋮</button>
                          {activeFolderMenu === folder.id && (
                            <div className="ctx-menu" onClick={(e) => e.stopPropagation()}>
                              <button className="ctx-item" onClick={() => {
                                setPermsFolderId(folder.id);
                                setFolderAnonymousCreate(folder.anonymous_create);
                                setIsFolderPermsModalOpen(true);
                                setActiveFolderMenu(null);
                              }}>🛡 Permissions</button>
                              <button className="ctx-item" onClick={() => {
                                setRenameFolderId(folder.id);
                                setRenameFolderName(displayFolderName);
                                setIsRenameFolderModalOpen(true);
                                setActiveFolderMenu(null);
                              }}>✏ Rename</button>
                            <button className="ctx-item danger" onClick={(e) => {
                              e.stopPropagation();
                              void handleDeleteFolder(folder.id);
                              setActiveFolderMenu(null);
                            }}>🗑 Delete</button>
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT COLUMN: Notes & Editor */}
              <div className="owner-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="owner-panel-header">
                  <h2>
                    {selectedFolderId ? (
                      <>
                        <span>📂 {selectedFolder?.name ? selectedFolder.name.split(":").slice(1).join(":") : "Folder"}</span>
                        <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>&gt;</span>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>📄 Notes</span>
                      </>
                    ) : (
                      "Select a folder"
                    )}
                  </h2>
                  {selectedFolderId && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span className="muted" style={{ alignSelf: 'center', marginRight: '1rem', fontSize: '0.9rem' }}>{isLoading ? "Loading…" : "Ready"}</span>
                      <button className="icon-btn" onClick={handleNewNote} title="New Note">+</button>
                    </div>
                  )}
                </div>

                {!selectedFolderId ? (
                   <p className="empty-state">Select a folder to view its notes.</p>
                ) : (
                  <>
                    <div className="note-list" style={{ flex: 1 }}>
                      {notes.length === 0 ? <p className="empty-state">No notes in this folder yet.</p> : null}
                      {notes.map((note) => {
                        const rawTitle = note.title || "Untitled";
                        const parts = rawTitle.split(":");
                        const author = parts.length > 1 ? parts[0] : "anonymous";
                        const displayTitle = parts.length > 1 ? parts.slice(1).join(":") : rawTitle;
                        return (
                          <div key={note.id} className={`note-row ${selectedNote?.id === note.id ? "active" : ""}`} onClick={() => handleNoteClick(note)}>
                            <span className="note-icon">📄</span>
                            <div className="note-row-info">
                              <div className="note-name">{displayTitle || note.id.slice(0, 8)}</div>
                              <div className="note-meta">by {author}</div>
                            </div>
                            <div className="ctx-wrap">
                              <button 
                                className="ctx-trigger" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveNoteMenu(activeNoteMenu === note.id ? null : note.id);
                                  setActiveFolderMenu(null);
                                }}
                              >⋮</button>
                              {activeNoteMenu === note.id && (
                                <div className="ctx-menu" onClick={(e) => e.stopPropagation()}>
                                  <button className="ctx-item" onClick={() => {
                                    setPermsNoteId(note.id);
                                    setNoteAnonymousEdit(note.anonymous_edit);
                                    setIsNotePermsModalOpen(true);
                                    setActiveNoteMenu(null);
                                  }}>🛡 Permissions</button>
                                  <button className="ctx-item" onClick={() => {
                                    setIsChangingPassphrase(true);
                                    setActiveNoteMenu(null);
                                  }}>🔑 Change Passphrase</button>
                                  <div className="ctx-divider"></div>
                                  <button className="ctx-item danger" onClick={(e) => {
                                    e.stopPropagation();
                                    void handleDeleteNote(note.id);
                                    setActiveNoteMenu(null);
                                  }}>🗑 Delete</button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="note-editor" style={{ borderTop: '1px solid var(--panel-border)' }}>
                       <div className="note-editor-header">
                         <h3 style={{ margin: 0 }}>
                           {selectedNote ? (
                             <>
                               <span>📄 {noteTitle}</span>
                               <span style={{ margin: '0 8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>&gt;</span>
                               <span style={{ color: 'var(--accent)', fontWeight: 'normal', fontSize: '0.85rem' }}>✏ Edit</span>
                             </>
                           ) : (
                             <>
                               <span>📄 New Note</span>
                               <span style={{ margin: '0 8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>&gt;</span>
                               <span style={{ color: 'var(--accent)', fontWeight: 'normal', fontSize: '0.85rem' }}>➕ Create</span>
                             </>
                           )}
                         </h3>
                         {error ? <span className="error" style={{ fontSize: '0.8rem', padding: '4px 8px' }}>{error}</span> : null}
                       </div>
                       
                       <label>
                         Note title
                         <input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} />
                       </label>
                       
                       <label>
                         Plaintext content
                         <textarea value={plaintext} onChange={(event) => setPlaintext(event.target.value)} rows={6} />
                       </label>

                       <label>
                         Notebook passphrase
                         <input value={passphrase} onChange={(event) => setPassphrase(event.target.value)} type="password" placeholder="Current passphrase" />
                       </label>

                       <div className="actions" style={{ justifyContent: 'flex-end', marginTop: '16px' }}>
                         <button 
                           onClick={handleSaveNote} 
                           disabled={!selectedFolderId || !passphrase.trim()}
                         >
                           {selectedNote ? "Update encrypted note" : "Save encrypted note"}
                         </button>
                       </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="panel content">
              <div className="panel-header">
                <h2>
                  {selectedFolderId ? (
                    <>
                      <span>📂 {selectedFolder?.name ? selectedFolder.name.split(":").slice(1).join(":") : "Folder"}</span>
                      {selectedNote && (
                        <>
                          <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>&gt;</span>
                          <span style={{ color: 'var(--accent)', fontWeight: 'normal' }}>📄 {noteTitle}</span>
                        </>
                      )}
                    </>
                  ) : (
                    "Select a folder"
                  )}
                </h2>
                <div>
                  <span className="muted" style={{ marginRight: '1rem' }}>{isLoading ? "Loading…" : "Ready"}</span>
                  {isAccessingPublicFolder && <button className="secondary" onClick={handleExitPublicFolder}>🏠 Exit Vault</button>}
                </div>
              </div>

              <label>
                Notebook passphrase
                <input value={passphrase} onChange={(event) => setPassphrase(event.target.value)} type="password" placeholder="Current passphrase" />
              </label>

              <div className="grid-two">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column' }}>
                    Note title
                    <input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} />
                  </label>
                </div>
                <label>
                  Plaintext content
                  <textarea value={plaintext} onChange={(event) => setPlaintext(event.target.value)} rows={6} />
                </label>
              </div>

              {!canUserCreate && !selectedNote && (
                <p style={{ color: 'var(--error-color)', marginBottom: '12px' }}>
                  Creating new notes is disabled for public users in this folder.
                </p>
              )}
              {!canUserEdit && selectedNote && (
                <p style={{ color: 'var(--error-color)', marginBottom: '12px' }}>
                  Editing existing notes is disabled for public users in this folder.
                </p>
              )}
               <div className="actions">
                <button 
                  onClick={handleSaveNote} 
                  disabled={!selectedFolderId || !passphrase.trim() || (selectedNote ? !canUserEdit : !canUserCreate)}
                >
                  {selectedNote ? "Update encrypted note" : "Save encrypted note"}
                </button>
                <button onClick={handleNewNote} disabled={!canUserCreate} className="secondary">New Note</button>
              </div>

              {error ? <p className="error">{error}</p> : null}

              <div style={{ marginTop: '24px' }}>
                <h3>Notes</h3>
                <div className="list">
                  {notes.length === 0 ? <p className="muted">No notes in this folder yet.</p> : null}
                  {notes.map((note) => {
                    const rawTitle = note.title || "Untitled";
                    const parts = rawTitle.split(":");
                    const author = parts.length > 1 ? parts[0] : "anonymous";
                    const displayTitle = parts.length > 1 ? parts.slice(1).join(":") : rawTitle;
                    return (
                      <div key={note.id} className={`note-card ${selectedNote?.id === note.id ? "active" : ""}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
                          <button className="link-button" onClick={() => handleNoteClick(note)} style={{ fontWeight: 600 }}>
                            {displayTitle || note.id.slice(0, 8)}
                          </button>
                          <span className="muted" style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '2px' }}>
                            by {author}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedNote ? <p className="muted">Selected note: {selectedNote.id}</p> : null}
            </div>
          )}
        </section>
        )
      )}

      {isDecryptModalOpen && decryptModalNote && (
        <div className="modal-backdrop" onClick={() => setIsDecryptModalOpen(false)}>
          <div className="panel modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Decrypt: {(decryptModalNote.title || "Untitled").split(":").slice(1).join(":") || (decryptModalNote.title || "Untitled")}</h3>
            <p className="muted">Enter the passphrase for this notebook to decrypt and view the note.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="password" 
                  value={decryptModalPassphrase} 
                  onChange={(e) => {
                    setDecryptModalPassphrase(e.target.value);
                    setDecryptModalError(null);
                  }}
                  placeholder="Enter passphrase"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleDecryptModalSubmit();
                  }}
                  style={{ flex: 1 }}
                />
                <button onClick={handleDecryptModalSubmit} disabled={isLoading}>Enter</button>
              </div>
              {decryptModalError && <p className="error" style={{ margin: 0 }}>{decryptModalError}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button className="secondary" onClick={() => {
                  setIsDecryptModalOpen(false);
                  setDecryptModalNote(null);
                  setDecryptModalPassphrase("");
                  setDecryptModalError(null);
                }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {isCreateFolderModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateFolderModalOpen(false)}>
          <div className="panel modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Folder</h3>
            <label style={{ marginTop: '16px' }}>
              Folder Name
              <input value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="E.g. Private Research" autoFocus />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="secondary" onClick={() => setIsCreateFolderModalOpen(false)}>Cancel</button>
              <button onClick={handleCreateFolder} disabled={!folderName.trim() || isLoading}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Folder Modal */}
      {isRenameFolderModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsRenameFolderModalOpen(false)}>
          <div className="panel modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Rename Folder</h3>
            <label style={{ marginTop: '16px' }}>
              New Name
              <input value={renameFolderName} onChange={(event) => setRenameFolderName(event.target.value)} placeholder="Enter new name" autoFocus />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="secondary" onClick={() => setIsRenameFolderModalOpen(false)}>Cancel</button>
              <button onClick={handleRenameFolderSubmit} disabled={!renameFolderName.trim() || isLoading}>Rename</button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Permissions Modal */}
      {isFolderPermsModalOpen && permsFolderId && (
        <div className="modal-backdrop" onClick={() => setIsFolderPermsModalOpen(false)}>
          <div className="panel modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Folder Permissions</h3>
            <p className="muted">Allow other users to create notes inside this folder?</p>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <span>Public Create:</span>
              <select 
                value={folderAnonymousCreate ? "create" : "nocreate"} 
                onChange={(e) => setFolderAnonymousCreate(e.target.value === "create")}
                style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-dark)', color: 'var(--text)', border: '1px solid var(--panel-border)', outline: 'none' }}
              >
                <option value="nocreate">No-create (Owner only)</option>
                <option value="create">Allow creation</option>
              </select>
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="secondary" onClick={() => setIsFolderPermsModalOpen(false)}>Cancel</button>
              <button onClick={() => {
                const folder = folders.find(f => f.id === permsFolderId);
                if (folder) {
                  void updateFolderPermissions(permsFolderId, folder.anonymous_edit, folderAnonymousCreate);
                  showToast("Folder permissions updated");
                }
                setIsFolderPermsModalOpen(false);
              }} disabled={isLoading}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Note Permissions Modal */}
      {isNotePermsModalOpen && permsNoteId && (
        <div className="modal-backdrop" onClick={() => setIsNotePermsModalOpen(false)}>
          <div className="panel modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Note Permissions</h3>
            <p className="muted">Allow other users to edit this note?</p>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <span>Public Access:</span>
              <select 
                value={noteAnonymousEdit ? "edit" : "view"} 
                onChange={(e) => setNoteAnonymousEdit(e.target.value === "edit")}
                style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-dark)', color: 'var(--text)', border: '1px solid var(--panel-border)', outline: 'none' }}
              >
                <option value="view">View-only</option>
                <option value="edit">Editable</option>
              </select>
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="secondary" onClick={() => setIsNotePermsModalOpen(false)}>Cancel</button>
              <button onClick={() => {
                void updateNotePermissions(permsNoteId, noteAnonymousEdit);
                showToast("Note permissions updated");
                setIsNotePermsModalOpen(false);
              }} disabled={isLoading}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Change Passphrase Modal */}
      {isChangingPassphrase && (
        <div className="modal-backdrop" onClick={() => setIsChangingPassphrase(false)}>
          <div className="panel modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Change Passphrase</h3>
            <p className="muted">Change the passphrase for this folder. This will re-encrypt all notes inside it.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              <label>
                Current Passphrase
                <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="Current passphrase" />
              </label>
              <label>
                New Passphrase
                <input type="password" value={newPassphrase} onChange={(e) => setNewPassphrase(e.target.value)} placeholder="New passphrase" />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="secondary" onClick={() => setIsChangingPassphrase(false)}>Cancel</button>
              <button onClick={() => {
                void handleChangePassphrase();
              }} disabled={!passphrase || !newPassphrase || isLoading}>Change</button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className={`toast toast--${toastType}`}>
          <span>{toastMessage}</span>
        </div>
      )}
    </main>
  );
}
