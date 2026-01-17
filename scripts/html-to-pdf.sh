#!/bin/bash

###############################################################################
# HTML to PDF Converter for Carbon Documentation
#
# This script converts HTML documentation files to PDF format using available
# command-line tools (wkhtmltopdf, chrome, or weasyprint).
#
# Usage: ./scripts/html-to-pdf.sh
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directories
DOCS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../docs" && pwd)"
HTML_FILES=("README.html" "database-schema.html" "business-logic-rules.html")

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Carbon Documentation PDF Converter${NC}"
echo -e "${BLUE}================================${NC}\n"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to convert using wkhtmltopdf
convert_with_wkhtmltopdf() {
    local html_file="$1"
    local pdf_file="${html_file%.html}.pdf"

    echo -e "${BLUE}Converting${NC} $(basename "$html_file") ${BLUE}with wkhtmltopdf...${NC}"

    wkhtmltopdf \
        --enable-local-file-access \
        --print-media-type \
        --page-size A4 \
        --margin-top 20mm \
        --margin-bottom 20mm \
        --margin-left 20mm \
        --margin-right 20mm \
        "$html_file" \
        "$pdf_file" 2>/dev/null

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Created: $(basename "$pdf_file")\n"
        return 0
    else
        echo -e "${RED}✗${NC} Failed to convert $(basename "$html_file")\n"
        return 1
    fi
}

# Function to convert using Chrome/Chromium
convert_with_chrome() {
    local html_file="$1"
    local pdf_file="${html_file%.html}.pdf"
    local chrome_cmd=""

    # Find Chrome/Chromium
    if command_exists google-chrome; then
        chrome_cmd="google-chrome"
    elif command_exists chromium-browser; then
        chrome_cmd="chromium-browser"
    elif command_exists chromium; then
        chrome_cmd="chromium"
    elif command_exists chrome; then
        chrome_cmd="chrome"
    else
        return 1
    fi

    echo -e "${BLUE}Converting${NC} $(basename "$html_file") ${BLUE}with $chrome_cmd...${NC}"

    "$chrome_cmd" \
        --headless \
        --disable-gpu \
        --no-sandbox \
        --print-to-pdf="$pdf_file" \
        "$html_file" 2>/dev/null

    if [ $? -eq 0 ] && [ -f "$pdf_file" ]; then
        echo -e "${GREEN}✓${NC} Created: $(basename "$pdf_file")\n"
        return 0
    else
        echo -e "${RED}✗${NC} Failed to convert $(basename "$html_file")\n"
        return 1
    fi
}

# Function to convert using WeasyPrint
convert_with_weasyprint() {
    local html_file="$1"
    local pdf_file="${html_file%.html}.pdf"

    echo -e "${BLUE}Converting${NC} $(basename "$html_file") ${BLUE}with WeasyPrint...${NC}"

    weasyprint "$html_file" "$pdf_file" 2>/dev/null

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Created: $(basename "$pdf_file")\n"
        return 0
    else
        echo -e "${RED}✗${NC} Failed to convert $(basename "$html_file")\n"
        return 1
    fi
}

# Detect available converter
CONVERTER=""
if command_exists wkhtmltopdf; then
    CONVERTER="wkhtmltopdf"
    echo -e "${GREEN}✓${NC} Found wkhtmltopdf"
elif command_exists google-chrome || command_exists chromium-browser || command_exists chromium || command_exists chrome; then
    CONVERTER="chrome"
    echo -e "${GREEN}✓${NC} Found Chrome/Chromium"
elif command_exists weasyprint; then
    CONVERTER="weasyprint"
    echo -e "${GREEN}✓${NC} Found WeasyPrint"
else
    echo -e "${RED}✗${NC} No PDF converter found!"
    echo ""
    echo "Please install one of the following:"
    echo "  - wkhtmltopdf:  sudo apt-get install wkhtmltopdf"
    echo "  - Chrome:       Available from google.com/chrome"
    echo "  - WeasyPrint:   pip install weasyprint"
    echo ""
    echo "Or use your browser's Print to PDF feature."
    echo "See docs/PDF-CONVERSION-GUIDE.md for details."
    exit 1
fi

echo ""

# Convert each HTML file
SUCCESS_COUNT=0
FAIL_COUNT=0

for html_file in "${HTML_FILES[@]}"; do
    html_path="$DOCS_DIR/$html_file"

    if [ ! -f "$html_path" ]; then
        echo -e "${YELLOW}!${NC} File not found: $(basename "$html_path")"
        ((FAIL_COUNT++))
        continue
    fi

    case $CONVERTER in
        wkhtmltopdf)
            convert_with_wkhtmltopdf "$html_path" && ((SUCCESS_COUNT++)) || ((FAIL_COUNT++))
            ;;
        chrome)
            convert_with_chrome "$html_path" && ((SUCCESS_COUNT++)) || ((FAIL_COUNT++))
            ;;
        weasyprint)
            convert_with_weasyprint "$html_path" && ((SUCCESS_COUNT++)) || ((FAIL_COUNT++))
            ;;
    esac
done

# Summary
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Conversion Summary${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}Successful:${NC} $SUCCESS_COUNT file(s)"
if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "${RED}Failed:${NC} $FAIL_COUNT file(s)"
fi
echo ""

if [ $SUCCESS_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓${NC} PDF files created in: $DOCS_DIR"
    echo ""
    echo "Generated PDFs:"
    for html_file in "${HTML_FILES[@]}"; do
        pdf_file="$DOCS_DIR/${html_file%.html}.pdf"
        if [ -f "$pdf_file" ]; then
            size=$(du -h "$pdf_file" | cut -f1)
            echo "  - $(basename "$pdf_file") ($size)"
        fi
    done
fi

echo ""
exit 0
