#!/bin/bash

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Next.js Build Error Diagnostic Tool${NC}"
echo -e "${BLUE}════════════════════════════════════════════${NC}\n"

# ============== 1. Check for useSearchParams without Suspense ==============
echo -e "${YELLOW}1️⃣  Scanning for useSearchParams() usage...${NC}"
echo ""

FILES_WITH_USESEARCHPARAMS=$(grep -r "useSearchParams" --include="*.tsx" --include="*.ts" app/ 2>/dev/null | grep -v "import" | cut -d: -f1 | sort -u)

if [ -z "$FILES_WITH_USESEARCHPARAMS" ]; then
  echo -e "${GREEN}✓ No useSearchParams() calls found${NC}\n"
else
  echo -e "${YELLOW}Files using useSearchParams():${NC}"
  while IFS= read -r file; do
    if [ -f "$file" ]; then
      # Check if file is 'use client'
      if grep -q "'use client'" "$file" || grep -q '"use client"' "$file"; then
        # Check for Suspense import
        if grep -q "import.*Suspense" "$file"; then
          echo -e "  ${GREEN}✓${NC} $file (has Suspense)"
        else
          echo -e "  ${RED}✗${NC} $file (NO Suspense import)"
        fi
      fi
    fi
  done <<< "$FILES_WITH_USESEARCHPARAMS"
fi
echo ""

# ============== 2. Check for useRouter without proper context ==============
echo -e "${YELLOW}2️⃣  Checking useRouter usage...${NC}"
FILES_WITH_USEROUTER=$(grep -r "useRouter" --include="*.tsx" --include="*.ts" app/ 2>/dev/null | grep -v "import" | wc -l)
echo "  Files using useRouter: $FILES_WITH_USEROUTER"
echo ""

# ============== 3. Check for dynamic imports ==============
echo -e "${YELLOW}3️⃣  Checking for dynamic page generation...${NC}"
DYNAMIC_EXPORTS=$(grep -r "export const dynamic" --include="*.tsx" --include="*.ts" app/ 2>/dev/null | wc -l)
if [ "$DYNAMIC_EXPORTS" -eq 0 ]; then
  echo -e "  ${YELLOW}⚠${NC} No dynamic page exports found - all pages may be static"
  echo -e "  ${YELLOW}  Consider adding: export const dynamic = 'force-dynamic'${NC}"
else
  echo -e "  ${GREEN}✓${NC} Found $DYNAMIC_EXPORTS dynamic exports"
fi
echo ""

# ============== 4. Check for problematic hooks in pages ==============
echo -e "${YELLOW}4️⃣  Scanning for potentially problematic hooks in page components...${NC}"
echo ""

HOOK_PATTERNS="useEffect|useState|useCallback|useContext"
PAGES=$(find app -name "page.tsx" -o -name "page.ts" | head -20)

while IFS= read -r page; do
  if grep -qE "$HOOK_PATTERNS" "$page"; then
    if ! grep -q "Suspense" "$page" && grep -qE "useSearchParams|useRouter" "$page"; then
      echo -e "  ${RED}⚠${NC} $page uses hooks that may need Suspense"
    fi
  fi
done <<< "$PAGES"
echo ""

# ============== 5. Check for layout issues ==============
echo -e "${YELLOW}5️⃣  Checking layout files...${NC}"
LAYOUT_FILES=$(find app -name "layout.tsx" -o -name "layout.ts")
if [ -z "$LAYOUT_FILES" ]; then
  echo -e "  ${YELLOW}⚠${NC} No layout files found"
else
  echo -e "  ${GREEN}✓${NC} Layout files found:"
  echo "$LAYOUT_FILES" | sed 's/^/    /'
fi
echo ""

# ============== 6. Check for export issues ==============
echo -e "${YELLOW}6️⃣  Checking for missing default exports...${NC}"
MISSING_EXPORTS=$(grep -L "export default" app/*/page.tsx app/*/*/page.tsx 2>/dev/null | wc -l)
if [ "$MISSING_EXPORTS" -gt 0 ]; then
  echo -e "  ${RED}⚠${NC} Found $MISSING_EXPORTS page files without default export"
else
  echo -e "  ${GREEN}✓${NC} All page files have default exports"
fi
echo ""

# ============== 7. Summary ==============
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Recommendations:${NC}"
echo ""
echo "1. For pages using useSearchParams/useRouter:"
echo "   - Wrap with Suspense fallback"
echo "   - Move hooks to separate client component"
echo ""
echo "2. For static pages that need dynamic behavior:"
echo "   - Add: export const dynamic = 'force-dynamic'"
echo ""
echo "3. Run 'npm run validate' after fixes to verify"
echo ""
echo -e "${BLUE}════════════════════════════════════════════${NC}\n"
