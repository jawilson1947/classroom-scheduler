# Xcode Project Setup Guide

This guide explains how to configure your Xcode project to link directly to the source files in your Git repository. This ensures that when you run `git pull`, Xcode automatically sees the changes without manual copying.

## 1. Clean Up Existing references
1.  Open your Xcode project (`Classroom Schedule Display.xcodeproj`).
2.  In the Project Navigator (left sidebar), identify the groups (folders) containing your code: `App`, `Models`, `Services`, `Views`.
3.  **Select them**, Right-Click, and choose **Delete**.
4.  **IMPORTANT:** When prompted, choose **"Remove References"**. Do **NOT** choose "Move to Trash" (this would delete the actual files!).

## 2. Add Files Correctly
1.  Right-Click on the top-level project icon (blue icon named `Classroom Schedule Display`) in the Project Navigator.
2.  Select **"Add Files to 'Classroom Schedule Display'..."**.
3.  Navigate to the `ios/ClassroomScheduler` folder in your repository.
4.  Select the following folders (**Cmd+Click** to select multiple):
    *   `App`
    *   `Models`
    *   `Services`
    *   `Views`
    *   `Utilities` (if present)
    *   `Resources` (if present)
5.  **Configure Options (Bottom of the dialog):**
    *   **Copy items if needed:** **UNCHECK** this box. (This is crucial! It tells Xcode to link to the existing files instead of making copies).
    *   **Added folders:** Select **"Create groups"**.
    *   **Add to targets:** Ensure `Classroom Schedule Display` is **CHECKED**.
6.  Click **Add**.

## 3. Verify Structure
Your Xcode project structure should now look like this:
```
Classroom Schedule Display (Project Root)
├── App
│   └── ClassroomSchedulerApp.swift
├── Models
│   ├── AppConfig.swift
│   ├── ...
├── Services
│   ├── APIService.swift
│   ├── ...
├── Views
│   ├── DisplayView.swift
│   ├── ...
```
If you right-click on any file in Xcode and choose "Show in Finder", it should reveal the file inside your Git repository folder (`.../ios/ClassroomScheduler/...`).

## 4. Clean and Build
1.  In Xcode menu bar, go to **Product** > **Clean Build Folder** (or press `Cmd + Shift + K`).
2.  The build folder will be cleared to remove any stale references.
3.  Press **Run** (Play button) to build and deploy to your iPad.

## 5. Verify the updates
Check the Xcode Console for the new debug logs we added:
*   `[APIService] fetchEvents called`
*   `[APIService] Fetching events from: ...`

If you see these logs, your project is correctly linked and running the latest code!
