# TextVault 🔒

A production-grade, zero-knowledge, end-to-end encrypted text ecosystem designed for absolute privacy. By performing all cryptographic operations on the client side, the server remains completely blind to private user data.

---

## 🛡️ Core Philosophy & Security Boundaries

The fundamental value proposition of TextVault is: **The server cannot expose what it does not know.**

### ✅ What the Server NEVER Sees
- Plain-text note content
- Encryption passphrases
- Derived encryption keys
- Any unencrypted user data

### ✅ What the Server Validates & Stores
- User authentication (JWT tokens)
- Folder ownership (multi-tenancy boundaries)
- Encrypted payloads (`ciphertext`, `nonce`, and PBKDF2 `salt` format)

---

## 📁 Project Structure

```
TextVault/
  backend/          # Django REST API & SQLite/PostgreSQL storage
    manage.py
    config/         # Settings, URLs, WSGI/ASGI
    vault/          # Core app (models, views, serializers, permissions)
    venv/           # Python virtual environment
  frontend/         # Next.js client application
    src/
      lib/          # Crypto and API utilities
      hooks/        # React hooks for auth and vault
      app/          # Pages and layout
    node_modules/
    package.json
  md/               # Architecture and specification docs
```

---

## ⚙️ Setup & Running Guide

### 🐍 Backend Setup (Django)

#### Prerequisites
- Python 3.10+ installed
- Virtual environment created at `backend/venv/`

#### Setup Steps
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows
source venv/bin/activate      # macOS/Linux

pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser --username admin --email admin@textvault.local --noinput
```

#### Run the Django Development Server
```bash
cd backend
.\venv\Scripts\Activate.ps1  # Windows
source venv/bin/activate      # macOS/Linux

# Set environment variables for development
set DEBUG=True
set SECRET_KEY=dev-secret-not-for-production

# Start the server on http://localhost:8000
python manage.py runserver
```

#### Access Admin Interface
- **URL:** `http://localhost:8000/admin/`
- **Username:** `admin`
- **Password:** Set via the Django shell (see below)

#### Set Admin Password
```bash
python manage.py shell
>>> from django.contrib.auth import get_user_model
>>> User = get_user_model()
>>> user = User.objects.get(username='admin')
>>> user.set_password('your-secure-password')
>>> user.save()
```

#### API Endpoints (Protected by JWT)
- `POST /api/token/` - Login and get JWT tokens
- `POST /api/token/refresh/` - Refresh access token
- `GET /api/folders/` - List user's folders
- `POST /api/folders/` - Create folder
- `GET /api/notes/` - List notes (filter by `?folder=<id>`)
- `POST /api/notes/` - Create encrypted note
- `PUT /api/notes/<id>/` - Update note
- `DELETE /api/notes/<id>/` - Delete note

---

### 🌐 Frontend Setup (Next.js)

#### Prerequisites
- Node.js 18+ installed

#### Setup Steps
```bash
cd frontend
npm install
```

#### Run the Development Server
```bash
cd frontend
npm run dev
```
The app will be available at `http://localhost:3000/`

#### Build for Production
```bash
npm run build
npm start
```

---

## 🔑 Environment Variables

### Backend (`backend/.env`)
```env
DEBUG=True
SECRET_KEY=dev-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## 🧪 Testing the Zero-Knowledge Flow

### 1. Create a test user (optional)
```bash
cd backend
python manage.py shell
>>> from django.contrib.auth import get_user_model
>>> User = get_user_model()
>>> user = User.objects.create_user(username='test', password='test123')
```

### 2. Start both services
```bash
# Terminal 1: Backend
cd backend
.\venv\Scripts\Activate.ps1
python manage.py runserver

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 3. Verify Encryption & Decryption
1. Navigate to `http://localhost:3000/`
2. Enter a passphrase in the **Passphrase** field.
3. Modify the text in **Plaintext note** and click **Encrypt**.
4. Observe the JSON payload format (containing `ciphertext`, `nonce`, `salt`, and `iterations`).
5. Click **Decrypt** to recover the original text, or enter an incorrect passphrase to test authentication error handling.

---

## 🛠️ Development Workflow

### Adding a New Note Field
1. Update `backend/vault/models.py` with the new field.
2. Run `python manage.py makemigrations vault` and `python manage.py migrate`.
3. Update the serializer in `backend/vault/serializers.py`.
4. Update frontend types in `frontend/src/hooks/useVault.ts`.

### Debugging API Calls
- **Backend logs:** Check Django console output.
- **Frontend API:** Use DevTools → Network tab.
- **Admin panel:** Visit `http://localhost:8000/admin/` to verify stored data (only ciphertext is stored).

---

## ❓ Troubleshooting

### CORS Errors
- Ensure the backend is running on `http://localhost:8000`.
- Verify `CORS_ALLOWED_ORIGINS` in backend environment includes your frontend URL.

### 401 Unauthorized
- Token may have expired. The frontend handles token refresh automatically.
- Check `localStorage` for `access_token` and `refresh_token`.

### Database Issues
- Re-run migrations: `python manage.py migrate`.
- To reset: delete `db.sqlite3` in the backend folder and run migrations again.

---

