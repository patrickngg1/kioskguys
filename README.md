# The Kiosk Guys Backend Django + Vite App

Hello fellow Kiosk Guy — it is I, **Scrum Master**, here to guide you through running this thing.

---

## How to Run the Server

### 1. Navigate to the project folder
Make sure you’re in the right place — the folder that contains both `manage.py` and `requirements.txt`.

```bash
cd kioskguys/smartKiosk
```
You should see files like `vite.config.js` and `isrgrootx1.pem` inside.

---

### 2. Install Python dependencies
This installs everything the Django backend needs.

```bash
pip install -r requirements.txt
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

## Running the App

The app currently is split between the backend and the frontend. You can run the frontend on it's own, but without the backend running at the same time, you won't be able to register/login. There is a start script included that is able to concurrently run both the frontend and backend in one terminal.

### 1. Grant Permissions to Start Script [Only Needed For First Time]
Once you installed the requirements using the pip command, you need to grant permission to the start script to be able to run properly. You only need to do this for the first time and then you can skip this step. Run the following in the terminal:

```bash
chmod +x start.sh
```

### 2. Run The Start Script
After granting permission to the script just run the following command to run both the frontend and backend simultaneously:

```bash
./start.sh
```

---

## Navigation
After running the start script, it should also auto open the browser and connect to the website. If for some reason it does not, simply navigate to http://localhost:5173/

---

## Database Connection
We are currently using TiDB for our database connection where we will store our tables. Performing queries will access that data. I currently have it connected to the /kiosk backend app as opposed to the frontend app Prakash has made. It utilizes a certificate to verify the connection called [isrgrootx1.pem](https://github.com/patrickngg1/kioskguys/blob/main/smartKiosk/isrgrootx1.pem). Lastly, it has all the settings needed to utilize the database under [settings.py](https://github.com/patrickngg1/kioskguys/blob/main/smartKiosk/kiosks/settings.py) under the `DATABASES = {}` clause. 

### Verifying Connection
You can verify database connection by running the following:
```bash
python manage.py shell
```

Then:
```bash
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("SHOW SESSION STATUS LIKE 'Ssl_version';")
    print(cursor.fetchall())
```
You should see the following output to console:

```bash
[('Ssl_version', 'TLSv1.3')]
```

You can exit by using `Ctrl+D`

---

That’s it for now, y’all. Hope you enjoyed.  
**Scrum Master out.** 🫡
