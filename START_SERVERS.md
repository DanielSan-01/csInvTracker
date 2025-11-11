#  How to Start Your CS Inventory Tracker

## Quick Start (2 Terminals)

### Terminal 1 - Backend (Port 5027)
```bash
cd backend
dotnet run
```

**Wait for**: `Now listening on: http://localhost:5027`

### Terminal 2 - Frontend (Port 3002)
```bash
cd frontend
npm run dev
```

**Wait for**: `Ready in X seconds`

### Open Browser
Go to: **http://localhost:3002**

---

## What Just Happened?

You got the **"Address already in use"** error because:
1. Backend was running in background from our earlier test
2. You tried to start it again → Port conflict!

**Fix**: Kill the old process first:
```bash
lsof -ti:5027 | xargs kill -9
```

---

## If You Get Errors:

### Backend Error: "Address already in use"
```bash
# Kill the process
lsof -ti:5027 | xargs kill -9

# Restart backend
cd backend
dotnet run
```

### Frontend Error: "Port 3002 is in use"
```bash
# Kill the process
lsof -ti:3002 | xargs kill -9

# Restart frontend
cd frontend
npm run dev
```

---

## Pro Tip: Use 2 Terminal Windows

**Window 1 (Backend):**
- Keep this running
- Watch for API logs
- See search queries in real-time

**Window 2 (Frontend):**
- Keep this running
- Hot-reload when you change code
- See build errors

---

## Ready? Start Now:

1. Open a new terminal
2. `cd /Users/danielostensen/commonplace/csInvTracker/backend`
3. `dotnet run`
4. Wait for "Now listening on: http://localhost:5027"
5. Open ANOTHER terminal
6. `cd /Users/danielostensen/commonplace/csInvTracker/frontend`
7. `npm run dev`
8. Open browser: **http://localhost:3002**
9. Try searching "butterfly doppler"! 🔥

