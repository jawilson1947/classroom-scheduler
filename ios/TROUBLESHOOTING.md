# Troubleshooting Guide

## Error: "Cannot find 'ConfigurationService' in scope"

This error means the file `ConfigurationService.swift` exists in your folder but **Xcode hasn't included it in the build**.

### The Fix: Add Files to Target

1.  **Open Xcode**.
2.  In the left **Project Navigator** sidebar, find `ConfigurationService.swift`.
    *   *Note: If the file is missing from the sidebar entirely, drag it from Finder into the sidebar.*
3.  **Click to select** `ConfigurationService.swift`.
4.  Look at the **File Inspector** (Right sidebar - typically inside the icon that looks like a page).
5.  Find the **Target Membership** section.
6.  **Check the box** next to your app name (`ClassroomScheduler`).
    *   *If it is already checked, uncheck it and check it again.*
7.  **Repeat this for ALL new Swift files**:
    *   `APIService.swift`
    *   `EventSourceService.swift`
    *   `Event.swift`
    *   `AppConfig.swift`
    *   `DisplayView.swift`
    *   `ConfigurationView.swift`
    *   `CurrentEventView.swift`
    *   `EventCardView.swift`
    *   `Extensions.swift`

### 2. Clean Build Folder
1.  In the top menu, click **Product** > **Clean Build Folder**.
2.  Press **Cmd + B** to build again. 
