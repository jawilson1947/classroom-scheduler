# Moving Development to Mac

Use this guide to transfer your development environment from Windows to macOS.

## 1. Prerequisites
- **Git** installed on Mac.
- **Node.js** (v18+) installed on Mac.
- **Xcode** (latest version) installed from the Mac App Store.

## 2. Clone the Repository
Open your **Terminal** on the Mac and run:

```bash
# Replace with your actual repository URL
git clone https://github.com/jawilson1947/classroom-scheduler.git
cd ipad-classroom-scheduler
```

## 3. Transfer Secrets (Critical)
The `.env` file containing your database credentials is **not** in Git. You must copy it manually.

1.  **On Windows:** Open `c:\ipad-classroom-scheduler\.env` and copy the contents.
2.  **On Mac:** inside `ipad-classroom-scheduler`, create a new file named `.env`.
3.  **Paste** the contents.

### Database Connection Note
-   If `MYSQL_HOST` is a remote URL (e.g. AWS, PlanetScale), it will work immediately.
-   If `MYSQL_HOST` is `localhost`, you must either:
    -   Install MySQL on the Mac and import your data.
    -   OR point the Mac to your Windows PC's IP address (if on same network).

## 4. Setup the Backend (Next.js)
In the Mac Terminal:

```bash
npm install
npm run dev
```
Verify the Admin Dashboard works at [http://localhost:3000](http://localhost:3000).

## 5. Setup the iOS App (Xcode)
1.  Open **Xcode**.
2.  Go to **File > Open** and select `ipad-classroom-scheduler/ios/ClassroomScheduler.xcodeproj`.
3.  **Trust the Project** if prompted.
4.  **Configure Signing:**
    -   Click the project root (blue icon) in the left sidebar.
    -   Select the **ClassroomScheduler** target.
    -   Go to the **Signing & Capabilities** tab.
    -   Select your Apple ID in the **Team** dropdown.
5.  **Run the App:**
    -   Select a Simulator (e.g., iPad Pro) or your connected iPad from the top bar.
    -   Press **Cmd + R** (or the Play button).

## 6. Verify Full Functionality
1.  On the Mac, go to `http://localhost:3000/admin/rooms`.
2.  Click **Connect Device** on a room and copy the token.
3.  On the iPad (Simulator or Real), paste the token.
4.  **Confirm:**
    -   The iPad displays the room events.
    -   The Admin Dashboard shows the room as **PAIRED**.
    -   After ~1 minute, the Admin Dashboard shows the device as **Online** (Green badge).
