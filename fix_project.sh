#!/bin/bash

# Aggressive Clean for persistent "Multiple commands produce" error.

echo "⚠️  Killing Xcode..."
killall Xcode 2>/dev/null

echo "🗑️  Deleting specific DerivedData folder..."
rm -rf /Users/jimwilson/Library/Developer/Xcode/DerivedData/iPadClassroomScheduler-cidnzptzwvjgojeresrjusrokvwb

echo "🗑️  Deleting all iPadClassroomScheduler DerivedData..."
rm -rf $HOME/Library/Developer/Xcode/DerivedData/iPadClassroomScheduler-*

echo "✅  Done. Please Open Xcode and Run."
