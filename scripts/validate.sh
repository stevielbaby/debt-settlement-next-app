#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Starting validation...${NC}\n"

# Step 1: TypeScript check
echo -e "${YELLOW}Step 1: Running TypeScript type check...${NC}"
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo -e "${RED}✗ TypeScript check failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ TypeScript check passed${NC}\n"

# Step 2: Next.js build
echo -e "${YELLOW}Step 2: Running Next.js build...${NC}"
npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Next.js build failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Next.js build passed${NC}\n"

# Success
echo -e "${GREEN}✅ All validation checks passed!${NC}"
echo -e "${GREEN}You're ready to deploy to Vercel.${NC}"
exit 0
