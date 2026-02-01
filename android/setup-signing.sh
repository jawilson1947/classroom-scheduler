#!/bin/bash

# Google Play Signing Setup Script
# This script helps you set up app signing for Google Play release builds

set -e

echo "================================================"
echo "Google Play Signing Setup for Classroom Scheduler"
echo "================================================"
echo ""

# Check if we're in the android directory
if [ ! -f "build.gradle.kts" ]; then
    echo "❌ Error: Please run this script from the /android directory"
    exit 1
fi

echo "This script will help you:"
echo "1. Generate a signing keystore"
echo "2. Create the keystore.properties file"
echo "3. Prepare your app for Google Play release"
echo ""

# Check if keystore already exists
if [ -f "classroom-scheduler-release.keystore" ]; then
    echo "⚠️  Warning: classroom-scheduler-release.keystore already exists!"
    read -p "Do you want to create a new one? This will overwrite the existing keystore. (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping keystore generation..."
        SKIP_KEYGEN=true
    else
        rm -f classroom-scheduler-release.keystore
        SKIP_KEYGEN=false
    fi
else
    SKIP_KEYGEN=false
fi

# Generate keystore
if [ "$SKIP_KEYGEN" = false ]; then
    echo ""
    echo "Step 1: Generating Signing Keystore"
    echo "===================================="
    echo ""
    echo "You will be prompted for:"
    echo "  - Keystore password (choose a strong password)"
    echo "  - Key password (can be the same as keystore password)"
    echo "  - Your name, organization, city, state, country"
    echo ""
    echo "⚠️  IMPORTANT: Save these passwords securely!"
    echo "   If you lose them, you can NEVER update your app!"
    echo ""
    read -p "Press Enter to continue..."
    echo ""
    
    keytool -genkey -v -keystore classroom-scheduler-release.keystore \
        -alias classroom-scheduler \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Keystore created successfully!"
    else
        echo ""
        echo "❌ Failed to create keystore"
        exit 1
    fi
fi

# Create keystore.properties
echo ""
echo "Step 2: Creating keystore.properties"
echo "====================================="
echo ""

if [ -f "keystore.properties" ]; then
    echo "⚠️  Warning: keystore.properties already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing keystore.properties"
        echo ""
        echo "✅ Setup complete!"
        echo ""
        echo "Next steps:"
        echo "1. Build release: ./gradlew bundleRelease"
        echo "2. Find AAB at: app/build/outputs/bundle/release/app-release.aab"
        echo "3. Upload to Google Play Console"
        exit 0
    fi
fi

echo "Please enter your keystore credentials:"
echo ""

# Prompt for passwords
read -sp "Keystore password: " STORE_PASSWORD
echo ""
read -sp "Key password (press Enter if same as keystore password): " KEY_PASSWORD
echo ""

# Use keystore password if key password is empty
if [ -z "$KEY_PASSWORD" ]; then
    KEY_PASSWORD="$STORE_PASSWORD"
fi

# Create keystore.properties file
cat > keystore.properties << EOF
# Keystore configuration for release builds
# DO NOT commit this file to version control!

storePassword=$STORE_PASSWORD
keyPassword=$KEY_PASSWORD
keyAlias=classroom-scheduler
storeFile=classroom-scheduler-release.keystore
EOF

echo ""
echo "✅ keystore.properties created successfully!"

# Verify .gitignore
if grep -q "keystore.properties" .gitignore; then
    echo "✅ keystore.properties is in .gitignore"
else
    echo "⚠️  Warning: keystore.properties is NOT in .gitignore"
    echo "   Adding it now..."
    echo "keystore.properties" >> .gitignore
fi

# Final instructions
echo ""
echo "================================================"
echo "✅ Setup Complete!"
echo "================================================"
echo ""
echo "Your signing configuration is ready!"
echo ""
echo "📋 Important Files Created:"
echo "  - classroom-scheduler-release.keystore (BACKUP THIS FILE!)"
echo "  - keystore.properties (contains passwords)"
echo ""
echo "⚠️  CRITICAL: Backup Your Keystore!"
echo "  1. Copy classroom-scheduler-release.keystore to a secure location"
echo "  2. Save your passwords in a password manager"
echo "  3. Never commit these files to git (already in .gitignore)"
echo ""
echo "🚀 Next Steps:"
echo ""
echo "1. Build release bundle:"
echo "   ./gradlew bundleRelease"
echo ""
echo "2. Find your signed AAB at:"
echo "   app/build/outputs/bundle/release/app-release.aab"
echo ""
echo "3. Upload to Google Play Console:"
echo "   https://play.google.com/console"
echo ""
echo "4. See GOOGLE_PLAY_PUBLISHING.md for complete publishing guide"
echo ""
