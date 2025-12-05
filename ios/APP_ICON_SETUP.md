# iOS App Icon Setup Instructions

## Generated Icon

I've created a professional app icon for your Classroom Scheduler iOS app featuring:
- Modern calendar grid design
- iPad/tablet device overlay
- Professional blue gradient background
- Clean, recognizable at small sizes

![App Icon Design](file:///C:/Users/jawilson/.gemini/antigravity/brain/98fac58e-3638-48a7-a117-eab0990fe2d4/classroom_scheduler_icon_1764956201655.png)

## Required Icon Sizes for iOS

iOS apps require multiple icon sizes for different devices and contexts. Here are the required sizes:

### iPad Sizes
- **1024x1024** - App Store (required)
- **167x167** - iPad Pro (@2x)
- **152x152** - iPad, iPad mini (@2x)
- **76x76** - iPad, iPad mini (@1x)

### iPhone Sizes (if supporting iPhone)
- **180x180** - iPhone (@3x)
- **120x120** - iPhone (@2x)
- **60x60** - iPhone (@1x)

### Additional Sizes
- **40x40** - Spotlight (@2x)
- **29x29** - Settings (@1x)
- **58x58** - Settings (@2x)
- **87x87** - Settings (@3x)

## Integration Steps

### Option 1: Using Xcode (Recommended)

1. **Open your project in Xcode**
   ```
   open ios/ClassroomScheduler.xcodeproj
   ```

2. **Navigate to Assets**
   - In the Project Navigator, find `Assets.xcassets`
   - Click on `AppIcon`

3. **Add Icon Images**
   - Drag and drop the generated icon (resized to each required size) into the appropriate slots
   - Xcode will show you which sizes are needed

4. **Use an Icon Generator Tool**
   - Visit https://appicon.co/ or https://www.appicon.build/
   - Upload the generated 1024x1024 icon
   - Download the generated icon set
   - Drag the entire set into Xcode's AppIcon slots

### Option 2: Manual File Placement

1. **Create the Assets folder structure** (if it doesn't exist):
   ```
   ios/ClassroomScheduler/Assets.xcassets/AppIcon.appiconset/
   ```

2. **Add a Contents.json file** in the `AppIcon.appiconset` folder:
   ```json
   {
     "images": [
       {
         "size": "20x20",
         "idiom": "ipad",
         "filename": "icon-20@2x.png",
         "scale": "2x"
       },
       {
         "size": "29x29",
         "idiom": "ipad",
         "filename": "icon-29.png",
         "scale": "1x"
       },
       {
         "size": "29x29",
         "idiom": "ipad",
         "filename": "icon-29@2x.png",
         "scale": "2x"
       },
       {
         "size": "40x40",
         "idiom": "ipad",
         "filename": "icon-40.png",
         "scale": "1x"
       },
       {
         "size": "40x40",
         "idiom": "ipad",
         "filename": "icon-40@2x.png",
         "scale": "2x"
       },
       {
         "size": "76x76",
         "idiom": "ipad",
         "filename": "icon-76.png",
         "scale": "1x"
       },
       {
         "size": "76x76",
         "idiom": "ipad",
         "filename": "icon-76@2x.png",
         "scale": "2x"
       },
       {
         "size": "83.5x83.5",
         "idiom": "ipad",
         "filename": "icon-83.5@2x.png",
         "scale": "2x"
       },
       {
         "size": "1024x1024",
         "idiom": "ios-marketing",
         "filename": "icon-1024.png",
         "scale": "1x"
       }
     ],
     "info": {
       "version": 1,
       "author": "xcode"
     }
   }
   ```

3. **Resize and add the icon files** with the names specified in Contents.json

## Quick Setup Using Online Tool

**Easiest Method:**

1. **Save the generated icon** from the artifacts folder:
   ```
   C:/Users/jawilson/.gemini/antigravity/brain/98fac58e-3638-48a7-a117-eab0990fe2d4/classroom_scheduler_icon_1764956201655.png
   ```

2. **Visit https://www.appicon.build/**
   - Upload the icon
   - Select "iOS" platform
   - Download the generated asset catalog

3. **Replace in Xcode:**
   - Open Xcode
   - Delete the existing AppIcon in Assets.xcassets
   - Drag the downloaded `.appiconset` folder into Assets.xcassets

## Verification

After adding the icon:

1. **Build the app** in Xcode
2. **Check the home screen** - your icon should appear
3. **Check Settings** - icon should appear in Settings app
4. **Check App Store listing** - 1024x1024 icon will be used

## Notes

- **No transparency**: iOS app icons cannot have transparent backgrounds
- **No rounded corners**: iOS automatically applies rounded corners
- **Safe area**: Keep important content away from edges (avoid text near corners)
- **Test on device**: Icons may look different on actual devices vs simulator

## Current Icon Location

The generated icon is saved at:
```
C:/Users/jawilson/.gemini/antigravity/brain/98fac58e-3638-48a7-a117-eab0990fe2d4/classroom_scheduler_icon_1764956201655.png
```

You can use this as your base 1024x1024 icon for generating all required sizes.
