#!/bin/bash
###############################################################################
# GitHub Repository Cleanup Script
#
# Deletes all InstaBuild repositories from your GitHub account
# WARNING: This permanently deletes repositories! Use with caution!
#
# Usage:
#   ./scripts/cleanup-github-repos.sh
#
# The script will read GITHUB_TOKEN from apps/backend/.env
# Or you can override with: GITHUB_TOKEN=your_token ./scripts/cleanup-github-repos.sh
#
# Options:
#   --dry-run    Show what would be deleted without actually deleting
#   --yes, -y    Skip confirmation prompt
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
REPO_PREFIX=""
DRY_RUN=false
SKIP_CONFIRM=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      ;;
    --yes|-y)
      SKIP_CONFIRM=true
      ;;
  esac
done

# Load .env file if GITHUB_TOKEN is not already set
if [ -z "$GITHUB_TOKEN" ]; then
  ENV_FILE="$(dirname "$0")/../apps/backend/.env"
  if [ -f "$ENV_FILE" ]; then
    echo -e "${CYAN}📄 Loading environment from apps/backend/.env${NC}"
    # Export variables from .env (simple parser)
    while IFS='=' read -r key value; do
      # Skip comments and empty lines
      if [[ ! $key =~ ^# && -n $key ]]; then
        # Remove quotes and export
        value="${value%\"}"
        value="${value#\"}"
        export "$key=$value"
      fi
    done < <(grep -v '^#' "$ENV_FILE" | grep -v '^$')
  fi
fi

# Check for GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
  echo -e "${RED}❌ Error: GITHUB_TOKEN not found${NC}"
  echo -e "${CYAN}Please set GITHUB_TOKEN in apps/backend/.env or as environment variable${NC}"
  exit 1
fi

echo -e "${CYAN}🔍 Initializing GitHub cleanup script...${NC}"

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}🔍 DRY RUN MODE - No repositories will be deleted${NC}"
fi

# Get authenticated user
echo -e "\n${BLUE}📋 Fetching user information...${NC}"
USER_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user)

USERNAME=$(echo "$USER_RESPONSE" | grep -o '"login": *"[^"]*"' | cut -d'"' -f4)

if [ -z "$USERNAME" ]; then
  echo -e "${RED}❌ Error: Failed to authenticate with GitHub${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Authenticated as: $USERNAME${NC}"

# Fetch all repositories
echo -e "\n${BLUE}📋 Fetching repositories...${NC}"
REPOS_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/user/repos?per_page=100&sort=created&direction=desc")

# Filter InstaBuild repos
INSTABUILD_REPOS=$(echo "$REPOS_RESPONSE" | grep -o '"name": *"'"$REPO_PREFIX"'[^"]*"' | cut -d'"' -f4)

if [ -z "$INSTABUILD_REPOS" ]; then
  echo -e "\n${GREEN}✅ No InstaBuild repositories found. Nothing to clean up!${NC}"
  exit 0
fi

# Count repos
REPO_COUNT=$(echo "$INSTABUILD_REPOS" | wc -l | tr -d ' ')

# Display repositories
echo -e "\n${CYAN}📦 Found $REPO_COUNT InstaBuild repositories:${NC}"
INDEX=1
while IFS= read -r repo; do
  REPO_URL="https://github.com/$USERNAME/$repo"
  echo -e "  ${YELLOW}$INDEX. $repo - $REPO_URL${NC}"
  INDEX=$((INDEX + 1))
done <<< "$INSTABUILD_REPOS"

# Confirm deletion
if [ "$DRY_RUN" = false ] && [ "$SKIP_CONFIRM" = false ]; then
  echo -e "\n${RED}⚠️  WARNING: This will PERMANENTLY DELETE all listed repositories!${NC}"
  read -p "Are you sure you want to delete $REPO_COUNT repositories? (yes/no): " CONFIRM

  if [ "$CONFIRM" != "yes" ] && [ "$CONFIRM" != "y" ]; then
    echo -e "\n${YELLOW}❌ Deletion cancelled by user${NC}"
    exit 0
  fi
fi

# Delete repositories
echo -e "\n${BLUE}🗑️  Starting deletion process...${NC}"
SUCCESS_COUNT=0
FAIL_COUNT=0

while IFS= read -r repo; do
  if [ "$DRY_RUN" = true ]; then
    echo -e "  ${YELLOW}[DRY RUN] Would delete: $repo${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    DELETE_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
      -X DELETE \
      -H "Authorization: token $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github.v3+json" \
      "https://api.github.com/repos/$USERNAME/$repo")

    if [ "$DELETE_RESPONSE" = "204" ]; then
      echo -e "  ${GREEN}✅ Deleted: $repo${NC}"
      SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
      echo -e "  ${RED}❌ Failed to delete $repo (HTTP $DELETE_RESPONSE)${NC}"
      FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
  fi
done <<< "$INSTABUILD_REPOS"

# Summary
echo -e "\n${CYAN}📊 Cleanup Summary:${NC}"
if [ "$DRY_RUN" = true ]; then
  echo -e "  ${YELLOW}• Would delete: $SUCCESS_COUNT repositories${NC}"
else
  echo -e "  ${GREEN}• Successfully deleted: $SUCCESS_COUNT repositories${NC}"
  if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "  ${RED}• Failed to delete: $FAIL_COUNT repositories${NC}"
  fi
fi

if [ "$DRY_RUN" = false ] && [ $SUCCESS_COUNT -gt 0 ]; then
  echo -e "\n${GREEN}✅ Cleanup completed successfully!${NC}"
fi
