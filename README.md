# The Kiosk Guys Backend Django + Vite App

Hello fellow Kiosk Guy — it is I, **Scrum Master**, here to guide you through running this thing.

---

## How to Run the Server

### 1. Navigate to the project folder
Make sure you’re in the right place — the folder that contains both `package.json` and `requirements.txt`.

```bash
cd kioskguys/smartKiosk
```
You should see files like `vite.config.js` and `requirements.txt` inside.

---

### 2. Install Python dependencies
This installs everything the Django backend needs.

```bash
pip install -r requirements.txt
```

**Tip:** If you get permission or environment errors, use a virtual environment:
```bash
python -m venv venv
source venv/bin/activate   # Mac/Linux
venv\Scripts\activate      # Windows
```

---

### 3. Update Node.js and npm

Since this project runs the frontend with **Vite**, you’ll need Node.js version **24.11.0** and npm **11.6.2**.

#### a) Install NVM
If you don’t have Node Version Manager (nvm), install it using this command (for Linux/macOS/WSL):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```
Then close and reopen your terminal, or run:
```bash
source ~/.bashrc
```

#### b) Install Node.js 24 and use it
```bash
nvm install 24
nvm use 24
```

#### c) Verify versions
```bash
node -v
npm -v
```
Expected output:
```
v24.11.0
11.6.2
```

#### d) Update npm (optional but recommended)
```bash
npm install -g npm@latest
```

---

### 4. Install frontend dependencies
Now that Node is ready, install the frontend packages:

```bash
npm install --legacy-peer-deps
```

---

### 5. Run the dev server
Once everything is installed and Node is at `v24.11.0`, run:

```bash
npm run dev
```

---

## Navigating To Pages
Currently, there are two pages available:

### [Login Page](http://localhost:5173/)
- Map
- Login
- Sign Up

### [Home Page](http://localhost:5173/#/dashboard)
- Slideshow
- Sign Out
- Room Reservation
- Supply Request

---

That’s it for now, y’all. Hope you enjoyed.  
**Scrum Master out.** 🫡
