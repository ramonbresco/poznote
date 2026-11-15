#!/bin/bash

# ==============================================================================
# Poznote Backup Script
# ==============================================================================
# This script can be used both manually and with cron
#
# Any account can back up its own profile, with its password or with an app
# password. App passwords are the way to go for scheduled backups when
# two-factor authentication is enabled.
#
# Administrators can also back up any other profile, with their account
# password (not with an app password): the script looks up the user ID from
# the username.
#
# Usage:
#   ./backup-poznote.sh <URL> <USERNAME> <PASSWORD> <TARGET_USERNAME> <BACKUP_PATH> [MAX_BACKUPS]
#
# PASSWORD is the account password or an app password (Settings > My Account >
# App passwords). Pass '-' to read it from the POZNOTE_PASSWORD_FILE file or
# the POZNOTE_PASSWORD environment variable instead: a password written on the
# command line shows in the process list, the crontab and the shell history.
#
# Examples:
#   # Back up your own profile
#   ./backup-poznote.sh 'https://poznote.example.com' 'admin' 'adminpass' 'admin' '/backups' '30'
#
#   # Admin backing up Nina's profile
#   ./backup-poznote.sh 'https://poznote.example.com' 'admin' 'adminpass' 'Nina' '/backups' '30'
#
#   # App password read from a file (also works when 2FA is enabled)
#   POZNOTE_PASSWORD_FILE=/root/.poznote-app-password \
#     ./backup-poznote.sh 'https://poznote.example.com' 'nina' '-' 'nina' '/backups' '30'
#
# ==============================================================================

# Check if all required parameters are provided
if [ $# -lt 5 ] || [ $# -gt 6 ]; then
    echo "ERROR: Missing required parameters"
    echo ""
    echo "Usage: $0 <URL> <USERNAME> <PASSWORD> <TARGET_USERNAME> <BACKUP_PATH> [MAX_BACKUPS]"
    echo ""
    echo "Parameters:"
    echo "  URL              - Base URL of your Poznote instance"
    echo "  USERNAME         - Username for authentication (required)"
    echo "  PASSWORD         - Account password or app password, or '-' to read it from"
    echo "                     POZNOTE_PASSWORD_FILE or POZNOTE_PASSWORD"
    echo "  TARGET_USERNAME  - Username of the profile to backup"
    echo "  BACKUP_PATH      - Parent directory where backups will be stored"
    echo "  MAX_BACKUPS      - Maximum number of backups to keep (default: 20)"
    echo ""
    echo "Note: any account can back up its own profile; only an administrator's account password can back up another profile."
    echo ""
    echo "Examples:"
    echo "  # Back up your own profile:"
    echo "  $0 'https://poznote.example.com' 'admin' 'adminpass' 'admin' '/backups' '30'"
    echo ""
    echo "  # Admin backing up Nina's profile:"
    echo "  $0 'https://poznote.example.com' 'admin' 'adminpass' 'Nina' '/backups' '30'"
    echo ""
    echo "  # App password read from a file:"
    echo "  POZNOTE_PASSWORD_FILE=/root/.poznote-app-password $0 'https://poznote.example.com' 'nina' '-' 'nina' '/backups' '30'"
    echo ""
    exit 1
fi

# Get parameters
BASE_URL="$1"
USERNAME="$2"
PASSWORD="$3"
TARGET_USERNAME="$4"
BACKUP_PATH="$5"
MAX_BACKUPS="${6:-20}"

# '-' keeps the password off the command line, where every user of the machine
# can read it in the process list.
if [ "$PASSWORD" = "-" ]; then
    if [ -n "$POZNOTE_PASSWORD_FILE" ]; then
        if [ ! -r "$POZNOTE_PASSWORD_FILE" ]; then
            echo "ERROR: Cannot read the password file: $POZNOTE_PASSWORD_FILE"
            exit 1
        fi
        # First line only, without its line ending
        IFS= read -r PASSWORD < "$POZNOTE_PASSWORD_FILE"
        PASSWORD="${PASSWORD%$'\r'}"
    elif [ -n "$POZNOTE_PASSWORD" ]; then
        PASSWORD="$POZNOTE_PASSWORD"
    else
        echo "ERROR: PASSWORD is '-' but neither POZNOTE_PASSWORD_FILE nor POZNOTE_PASSWORD is set"
        exit 1
    fi
    if [ -z "$PASSWORD" ]; then
        echo "ERROR: The password read from POZNOTE_PASSWORD_FILE or POZNOTE_PASSWORD is empty"
        exit 1
    fi
fi

# The credentials go to curl through a config file descriptor rather than
# "-u user:password", which would put them in the process list again.
CURL_USER="$USERNAME:$PASSWORD"
CURL_USER="${CURL_USER//\\/\\\\}"
CURL_USER="${CURL_USER//\"/\\\"}"
api_curl() {
    curl -s -K <(printf 'user = "%s"\n' "$CURL_USER") "$@"
}

IS_APP_PASSWORD=false
if [[ "$PASSWORD" =~ ^pzn_[0-9a-f]{40}$ ]]; then
    IS_APP_PASSWORD=true
fi

# Backup configuration
BACKUP_DIR="$BACKUP_PATH/backups-poznote-$TARGET_USERNAME"

# Check if parent path exists
if [ ! -d "$BACKUP_PATH" ]; then
    echo "ERROR: Parent directory does not exist: $BACKUP_PATH"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if directory creation was successful
if [ ! -d "$BACKUP_DIR" ]; then
    echo "ERROR: Failed to create backup directory: $BACKUP_DIR"
    exit 1
fi

# Logging function with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

print_json_response() {
    local response="$1"

    if echo "$response" | jq -e '.' > /dev/null 2>&1; then
        echo "$response" | jq '.'
    else
        echo "$response"
    fi
}

print_auth_hint() {
    local response="$1"
    local error
    local hint

    error=$(echo "$response" | jq -r '.error // empty' 2>/dev/null)
    hint=$(echo "$response" | jq -r '.hint // empty' 2>/dev/null)

    if [ "$error" = "Invalid credentials" ]; then
        log "HINT: Use the current account password or an active app password for this profile."
        log "HINT: If that password was changed in Poznote, the original default password is no longer accepted for that profile."
        log "HINT: App passwords can be created or revoked in Settings > My Account > App passwords."
    elif [ -n "$hint" ]; then
        log "HINT: $hint"
    fi
}

log "Creating backup for: $BASE_URL"
log "Using credentials for username: $USERNAME"
log "Target user profile: $TARGET_USERNAME"

# Validate credentials before attempting any backup operation
log "Verifying API authentication..."
AUTH_RESPONSE=$(api_curl "$BASE_URL/api/v1/users/me")

if echo "$AUTH_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    log "ERROR: API authentication failed for $USERNAME"
    print_auth_hint "$AUTH_RESPONSE"
    print_json_response "$AUTH_RESPONSE"
    exit 1
fi

AUTHENTICATED_USERNAME=$(echo "$AUTH_RESPONSE" | jq -r '.username // empty' 2>/dev/null)
AUTHENTICATED_USER_ID=$(echo "$AUTH_RESPONSE" | jq -r '.id // empty' 2>/dev/null)
AUTHENTICATED_IS_ADMIN=$(echo "$AUTH_RESPONSE" | jq -r '.is_admin // false' 2>/dev/null)

if [ -z "$AUTHENTICATED_USERNAME" ]; then
    log "ERROR: Authentication succeeded but the API response was missing the username"
    print_json_response "$AUTH_RESPONSE"
    exit 1
fi

log "Authenticated as: $AUTHENTICATED_USERNAME"

if [ "$TARGET_USERNAME" = "$AUTHENTICATED_USERNAME" ]; then
    # Your own profile: any valid credential will do, app passwords included
    USER_ID="$AUTHENTICATED_USER_ID"
elif [ "$IS_APP_PASSWORD" = true ]; then
    log "ERROR: An app password can only back up its own profile ($AUTHENTICATED_USERNAME)"
    exit 1
elif [ "$AUTHENTICATED_IS_ADMIN" != "true" ]; then
    log "ERROR: Backing up another profile ($TARGET_USERNAME) requires administrator credentials"
    exit 1
else
    # Admin credentials may back up any profile, so resolve the target username.
    log "Looking up User ID for $TARGET_USERNAME..."
    TARGET_USERNAME_URI=$(jq -rn --arg v "$TARGET_USERNAME" '$v|@uri')
    LOOKUP_RESPONSE=$(api_curl "$BASE_URL/api/v1/users/lookup/$TARGET_USERNAME_URI")

    if echo "$LOOKUP_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
        log "ERROR: Failed to lookup user ID for $TARGET_USERNAME"
        print_auth_hint "$LOOKUP_RESPONSE"
        print_json_response "$LOOKUP_RESPONSE"
        exit 1
    fi

    USER_ID=$(echo "$LOOKUP_RESPONSE" | jq -r '.id' 2>/dev/null)
fi

if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
    log "ERROR: Could not determine user ID for $TARGET_USERNAME"
    exit 1
fi

log "Resolved User ID: $USER_ID"
log "Backup directory: $BACKUP_DIR"
log "Maximum backups to keep: $MAX_BACKUPS"

# Call API to create backup using REST API v1
RESPONSE=$(api_curl -H "X-User-ID: $USER_ID" -X POST "$BASE_URL/api/v1/backups")

# Extract filename from response
FILENAME=$(echo "$RESPONSE" | jq -r '.backup_file' 2>/dev/null)

if [ "$FILENAME" = "null" ] || [ -z "$FILENAME" ]; then
    log "ERROR: Failed to create backup"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    exit 1
fi

# Get file size
SIZE=$(echo "$RESPONSE" | jq -r '.backup_size')
SIZE_MB=$(echo "$RESPONSE" | jq -r '.backup_size_mb')

log "Backup created: $FILENAME ($SIZE_MB MB)"

# Download the backup using REST API v1
DOWNLOAD_URL="$BASE_URL/api/v1/backups/$FILENAME"
OUTPUT_FILE="$BACKUP_DIR/$FILENAME"

if api_curl -H "X-User-ID: $USER_ID" -o "$OUTPUT_FILE" "$DOWNLOAD_URL"; then
    log "Backup downloaded: $OUTPUT_FILE"
else
    log "ERROR: Failed to download backup"
    exit 1
fi

# Verify the downloaded file is a valid ZIP
if file "$OUTPUT_FILE" | grep -q "Zip archive"; then
    ZIP_FILE_COUNT=$(unzip -l "$OUTPUT_FILE" | tail -1 | awk '{print $2}')
    log "Backup is valid ($ZIP_FILE_COUNT files)"
else
    log "ERROR: Downloaded file is not a valid ZIP"
    exit 1
fi

# Keep only the MAX_BACKUPS most recent backups
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/poznote_backup_*.zip 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    REMOVE_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
    log "Removing $REMOVE_COUNT old backup(s) (keeping $MAX_BACKUPS most recent)"
    ls -t "$BACKUP_DIR"/poznote_backup_*.zip | tail -n "$REMOVE_COUNT" | xargs rm -f
fi

log "Total backups stored: $(ls -1 "$BACKUP_DIR"/poznote_backup_*.zip 2>/dev/null | wc -l)"

# List all existing backups with details
log "Existing backups:"
if [ -d "$BACKUP_DIR" ]; then
    ls -lh "$BACKUP_DIR"/poznote_backup_*.zip 2>/dev/null | awk '{print "  " $5 " " $6 " " $7 " " $8 " " $9}' | while read -r line; do
        log "$line"
    done
fi

# Clean old backups on server (via REST API v1)
log "Cleaning old backups on server..."
SERVER_BACKUPS=$(api_curl -H "X-User-ID: $USER_ID" "$BASE_URL/api/v1/backups" | jq -r '.backups[] | .filename' | sort)
SERVER_COUNT=$(echo "$SERVER_BACKUPS" | grep -c "poznote_backup_")

if [ "$SERVER_COUNT" -gt "$MAX_BACKUPS" ]; then
    REMOVE_COUNT=$((SERVER_COUNT - MAX_BACKUPS))
    log "Removing $REMOVE_COUNT old backup(s) from server (keeping $MAX_BACKUPS most recent)"
    
    # Get oldest backups to remove
    echo "$SERVER_BACKUPS" | head -n "$REMOVE_COUNT" | while read -r OLD_BACKUP; do
        if [ -n "$OLD_BACKUP" ]; then
            DELETE_RESPONSE=$(api_curl -H "X-User-ID: $USER_ID" -X DELETE "$BASE_URL/api/v1/backups/$OLD_BACKUP")
            
            if echo "$DELETE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
                log "Deleted from server: $OLD_BACKUP"
            else
                log "Warning: Failed to delete $OLD_BACKUP from server"
            fi
        fi
    done
fi

log "SUCCESS"

exit 0
