# PDF Conversion Guide

This document explains how to convert the Carbon Manufacturing System documentation from HTML to PDF format.

## Quick Method: Browser Print-to-PDF

The documentation HTML files have been specially formatted for high-quality PDF export using your web browser.

### Steps:

1. **Open the HTML file** in your web browser:
   - `README.html`
   - `database-schema.html`
   - `business-logic-rules.html`

2. **Print to PDF**:
   - **Windows/Linux**: Press `Ctrl + P`
   - **Mac**: Press `Cmd + P`

3. **Configure Print Settings**:
   - **Destination**: Select "Save as PDF" or "Microsoft Print to PDF"
   - **Layout**: Portrait
   - **Paper size**: A4 or Letter
   - **Margins**: Default
   - **Background graphics**: Enable (to preserve styling)

4. **Save**: Click "Save" and choose your destination

### Recommended Browser Settings

For best results, use Google Chrome, Microsoft Edge, or Firefox with these settings:

- ✅ Background graphics enabled
- ✅ Headers and footers disabled (optional)
- ✅ Scale: 100%

---

## Alternative Method: Command-Line Tools

If you have command-line PDF conversion tools installed, you can use them directly.

### Option 1: Using wkhtmltopdf

If wkhtmltopdf is installed:

```bash
# Install wkhtmltopdf (if not installed)
# Ubuntu/Debian:
sudo apt-get install wkhtmltopdf

# macOS:
brew install wkhtmltopdf

# Convert files
wkhtmltopdf docs/README.html docs/README.pdf
wkhtmltopdf docs/database-schema.html docs/database-schema.pdf
wkhtmltopdf docs/business-logic-rules.html docs/business-logic-rules.pdf
```

### Option 2: Using Chromium/Chrome Headless

```bash
# Using Chrome (adjust path as needed)
google-chrome --headless --disable-gpu --print-to-pdf=docs/README.pdf docs/README.html
google-chrome --headless --disable-gpu --print-to-pdf=docs/database-schema.pdf docs/database-schema.html
google-chrome --headless --disable-gpu --print-to-pdf=docs/business-logic-rules.pdf docs/business-logic-rules.html
```

### Option 3: Using WeasyPrint

```bash
# Install WeasyPrint
pip install weasyprint

# Convert files
weasyprint docs/README.html docs/README.pdf
weasyprint docs/database-schema.html docs/database-schema.pdf
weasyprint docs/business-logic-rules.html docs/business-logic-rules.pdf
```

### Option 4: Using Node.js md-to-pdf

```bash
# Install globally
npm install -g md-to-pdf

# Convert markdown files directly
md-to-pdf docs/README.md
md-to-pdf docs/database-schema.md
md-to-pdf docs/business-logic-rules.md
```

---

## Automated Conversion Script

A convenience script is provided for batch conversion:

```bash
# Make executable
chmod +x scripts/html-to-pdf.sh

# Run conversion (requires wkhtmltopdf, chrome, or weasyprint)
./scripts/html-to-pdf.sh
```

---

## Notes on Mermaid Diagrams

The documentation contains Entity Relationship Diagrams (ERD) created with Mermaid syntax. These diagrams are preserved as code blocks in the HTML/PDF output.

To view interactive Mermaid diagrams:

1. **Option 1**: Open the original `.md` files in a Mermaid-compatible viewer:
   - GitHub (renders Mermaid natively)
   - VS Code with Mermaid Preview extension
   - Online: https://mermaid.live/

2. **Option 2**: Use the HTML files in a browser with the Mermaid extension:
   - Install a Mermaid browser extension
   - Or use an online Mermaid renderer

3. **Option 3**: Generate diagram images separately:
   ```bash
   # Using mermaid-cli
   npm install -g @mermaid-js/mermaid-cli

   # Extract diagrams and convert to images
   mmdc -i docs/database-schema.md -o docs/diagrams/
   ```

---

## File Descriptions

| File | Description | Size |
|------|-------------|------|
| `README.html` | Documentation index and quick reference | ~30 KB |
| `database-schema.html` | Complete database schema with ERD diagrams | ~120 KB |
| `business-logic-rules.html` | Comprehensive business logic documentation | ~150 KB |

---

## Troubleshooting

### PDF looks different from HTML

- Ensure "Background graphics" is enabled in print settings
- Try a different browser (Chrome/Edge recommended)
- Check that print margins are set correctly

### Text is cut off

- Reduce print scale to 90-95%
- Adjust page margins
- Use A4 paper size setting

### Diagrams don't appear

- Mermaid diagrams are shown as code in PDF (by design)
- View original markdown files for interactive diagrams
- Or use a Mermaid renderer to export diagrams separately

### Colors don't print

- Enable "Background graphics" or "Print backgrounds" in print dialog
- Some browsers call this "Background colors and images"

---

## Quality Assurance

The HTML files include:

- ✅ Professional typography and spacing
- ✅ Syntax-highlighted code blocks
- ✅ Responsive tables with headers
- ✅ Page break optimization for printing
- ✅ Proper heading hierarchy
- ✅ Hyperlinks (preserved in PDF)
- ✅ Footer with conversion instructions

---

## Support

For issues with PDF conversion:

1. Check browser print settings
2. Try a different browser
3. Use command-line tools as alternative
4. Refer to original markdown files if needed

The HTML files are the source of truth and can always be re-converted to PDF using the methods above.
