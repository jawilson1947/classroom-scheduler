#!/bin/sh

# Xcode Cloud runs this script before each xcodebuild invocation.
# It stamps the app's build number (CFBundleVersion / CURRENT_PROJECT_VERSION)
# with Xcode Cloud's incrementing CI_BUILD_NUMBER, guaranteeing every upload to
# App Store Connect has a unique, higher build number than the previous one.
#
# The marketing version (MARKETING_VERSION, e.g. 3.0) is left untouched.

set -e

if [ -z "$CI_BUILD_NUMBER" ]; then
  echo "CI_BUILD_NUMBER is not set — skipping build-number update."
  exit 0
fi

PROJECT_FILE="$CI_PRIMARY_REPOSITORY_PATH/ios/iPadScheduler/ClassroomScheduler/ClassroomScheduler.xcodeproj/project.pbxproj"

if [ ! -f "$PROJECT_FILE" ]; then
  echo "ERROR: project file not found at $PROJECT_FILE" >&2
  exit 1
fi

echo "Setting CURRENT_PROJECT_VERSION to $CI_BUILD_NUMBER"
# BSD sed (macOS): in-place edit, replace every CURRENT_PROJECT_VERSION value.
sed -i '' -E "s/CURRENT_PROJECT_VERSION = [0-9]+(\.[0-9]+)*;/CURRENT_PROJECT_VERSION = ${CI_BUILD_NUMBER};/g" "$PROJECT_FILE"

echo "Updated build-number settings:"
grep "CURRENT_PROJECT_VERSION" "$PROJECT_FILE"
