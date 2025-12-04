# App Icon Setup Guide

## Overview

Create a professional app icon for the Classroom Scheduler iOS app.

## Icon Requirements

### Sizes Needed

| Size | Usage | Filename |
|------|-------|----------|
| 1024x1024 | App Store | AppIcon-1024.png |
| 180x180 | iPhone 3x | AppIcon-180.png |
| 167x167 | iPad Pro | AppIcon-167.png |
| 152x152 | iPad 2x | AppIcon-152.png |
| 120x120 | iPhone 2x | AppIcon-120.png |
| 76x76 | iPad 1x | AppIcon-76.png |
| 40x40 | Spotlight | AppIcon-40.png |
| 29x29 | Settings | AppIcon-29.png |

### Design Guidelines

**Do:**
- ✅ Use simple, recognizable imagery
- ✅ Use high contrast colors
- ✅ Test at small sizes
- ✅ Use vector graphics for scaling
- ✅ Follow Apple's Human Interface Guidelines

**Don't:**
- ❌ Include text (hard to read at small sizes)
- ❌ Use photos or complex gradients
- ❌ Include alpha channel (transparency)
- ❌ Use rounded corners (iOS adds them automatically)

## Design Concept

### Recommended Design

A simple, modern icon representing classroom scheduling:

**Elements:**
- 📅 Calendar grid
- 🏫 Building/classroom silhouette
- 🎨 Color scheme: Blue gradient (#2563EB to #1E40AF)

### Color Palette

```
Primary: #2563EB (Blue 600)
Secondary: #1E40AF (Blue 700)
Accent: #60A5FA (Blue 400)
Background: #1E293B (Slate 800)
```

## Creating the Icon

### Option 1: Design Tools

**Figma** (Recommended)
1. Create 1024x1024 artboard
2. Design icon with vector shapes
3. Export all required sizes

**Adobe Illustrator**
1. Create 1024x1024 document
2. Design with vector tools
3. Export Asset → iOS App Icon

**Sketch**
1. Use iOS App Icon template
2. Design in 1024x1024 artboard
3. Export all sizes automatically

### Option 2: Icon Generator Services

**Free Tools:**
- [AppIcon.co](https://appicon.co) - Upload 1024x1024, generates all sizes
- [MakeAppIcon](https://makeappicon.com) - Free icon generator
- [AppIconizer](https://appiconizer.com) - Batch icon generator

**Paid Tools:**
- [IconKit](https://iconkit.ai) - AI-powered icon generation
- [IconJar](https://geticonjar.com) - Icon management

## Adding to Xcode

### Step 1: Prepare Assets

1. Export all icon sizes as PNG files
2. Ensure no alpha channel (fully opaque)
3. Name files clearly (e.g., `icon-1024.png`)

### Step 2: Add to Xcode

1. Open Xcode project
2. Navigate to **Assets.xcassets**
3. Select **AppIcon**
4. Drag and drop each icon size to corresponding slot

### Step 3: Verify

1. Build and run on simulator
2. Check home screen icon
3. Verify in Settings app
4. Test on physical device

## Sample Icon Template

Here's a simple SVG template you can customize:

```svg
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1024" height="1024" fill="#2563EB"/>
  
  <!-- Calendar Grid -->
  <rect x="256" y="256" width="512" height="512" rx="64" fill="white" opacity="0.9"/>
  
  <!-- Grid Lines -->
  <line x1="256" y1="384" x2="768" y2="384" stroke="#2563EB" stroke-width="4"/>
  <line x1="256" y1="512" x2="768" y2="512" stroke="#2563EB" stroke-width="4"/>
  <line x1="256" y1="640" x2="768" y2="640" stroke="#2563EB" stroke-width="4"/>
  
  <line x1="384" y1="384" x2="384" y2="768" stroke="#2563EB" stroke-width="4"/>
  <line x1="512" y1="384" x2="512" y2="768" stroke="#2563EB" stroke-width="4"/>
  <line x1="640" y1="384" x2="640" y2="768" stroke="#2563EB" stroke-width="4"/>
  
  <!-- Highlight Current Day -->
  <rect x="384" y="512" width="128" height="128" fill="#60A5FA" rx="8"/>
</svg>
```

## Launch Screen

### Configure Launch Screen

In `Info.plist`:

```xml
<key>UILaunchScreen</key>
<dict>
    <key>UIColorName</key>
    <string>LaunchScreenBackground</string>
    <key>UIImageName</key>
    <string>LaunchIcon</string>
</dict>
```

### Add Launch Assets

1. Create **LaunchScreenBackground** color in Assets.xcassets
2. Set to `#1E293B` (Slate 800)
3. Add **LaunchIcon** image (512x512 logo)

## Testing

### Checklist

- [ ] Icon appears on home screen
- [ ] Icon shows in Settings
- [ ] Icon displays in App Store (if applicable)
- [ ] Icon looks good at all sizes
- [ ] No transparency issues
- [ ] Colors match brand

### Test Devices

Test on:
- iPad Pro 12.9"
- iPad Air
- iPad Mini
- iPhone (for universal app)

## Branding Consistency

Ensure icon matches:
- Web app favicon
- Admin dashboard logo
- Marketing materials
- Documentation headers

## Resources

- [Apple Human Interface Guidelines - App Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [iOS App Icon Template (Figma)](https://www.figma.com/community/file/857303226040719059)
- [SF Symbols](https://developer.apple.com/sf-symbols/) - Apple's icon library

## Example Icons

For inspiration, look at:
- Apple Calendar
- Google Calendar
- Microsoft Outlook
- Notion
- Todoist

Focus on simplicity and clarity at small sizes!
