# WaterWatch — Windows PowerShell Quickstart & Local Setup Guide

Follow these steps to launch the Flask backend and React frontend concurrently in two Windows PowerShell terminals.

---

## 1. Prerequisites Check

Open Windows PowerShell and verify Python and Node.js are available:

```powershell
# Check Python (3.10+ required, 3.14 recommended)
python --version

# Check Node.js and npm
node --version
npm --version
```

---

## 2. Terminal 1: Python Flask Backend

1. Open PowerShell and navigate to the project directory:
   ```powershell
   cd "d:\AntiGravity demo"
   ```

2. (Optional but recommended) Verify Python dependencies:
   ```powershell
   python -m pip install -r backend/requirements.txt
   ```

3. Initialize and run backend automated tests:
   ```powershell
   python -m pytest tests/
   ```
   *All 10 tests should pass.*

4. Launch the Flask REST backend:
   ```powershell
   python -m backend.app
   ```

   **Expected Output:**
   ```text
   2026-10-18 15:00:00,123 [INFO] waterwatch: Starting WaterWatch backend on http://0.0.0.0:5000
   2026-10-18 15:00:00,125 [INFO] waterwatch.simulator: WaterWatch Node 2 & 3 Simulator background thread started.
   * Serving Flask app 'backend.app'
   * Running on all addresses (0.0.0.0)
   * Running on http://127.0.0.1:5000
   * Running on http://192.168.1.X:5000
   ```

5. Verify health endpoint in your browser or via curl in another prompt:
   ```powershell
   curl http://localhost:5000/api/health
   ```

---

## 3. Terminal 2: React Vite Frontend

1. Open a **second** Windows PowerShell terminal window:
   ```powershell
   cd "d:\AntiGravity demo"
   ```

2. Start the Vite development server:
   ```powershell
   npm run dev
   ```

   **Expected Output:**
   ```text
     VITE v5.4.10  ready in 280 ms

     ➜  Local:   http://localhost:5173/
     ➜  Network: use --host to expose
     ➜  press h + enter to show help
   ```

3. Open **`http://localhost:5173`** in your web browser.

---

## 4. Production Build Validation

To verify the frontend compiles cleanly for production:

```powershell
npm run build
```
*(Build artifact will be generated in `dist/`.)*
