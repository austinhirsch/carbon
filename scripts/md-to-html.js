#!/usr/bin/env node

/**
 * Simple Markdown to HTML converter for Carbon documentation
 * Converts markdown files to styled HTML that can be printed to PDF
 */

const fs = require('fs');
const path = require('path');

// Simple markdown to HTML converter (basic features)
function markdownToHtml(markdown) {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Lists
  html = html.replace(/^\* (.+)$/gim, '<li>$1</li>');
  html = html.replace(/^\- (.+)$/gim, '<li>$1</li>');
  html = html.replace(/^(\d+)\. (.+)$/gim, '<li>$2</li>');

  // Wrap consecutive list items
  html = html.replace(/(<li>.*<\/li>\n?)+/g, function(match) {
    return '<ul>' + match + '</ul>';
  });

  // Tables
  html = html.replace(/\|(.+)\|/g, function(match, content) {
    const cells = content.split('|').map(cell => cell.trim()).filter(cell => cell);
    return '<tr>' + cells.map(cell => '<td>' + cell + '</td>').join('') + '</tr>';
  });
  html = html.replace(/(<tr>.*<\/tr>\n?)+/g, function(match) {
    // First row is header
    const rows = match.split('</tr>').filter(r => r.trim());
    if (rows.length > 0) {
      const headerRow = rows[0].replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>') + '</tr>';
      const bodyRows = rows.slice(1).map(r => r + '</tr>').join('\n');
      return '<table><thead>' + headerRow + '</thead><tbody>' + bodyRows + '</tbody></table>';
    }
    return '<table>' + match + '</table>';
  });

  // Paragraphs (simplified)
  html = html.split('\n\n').map(para => {
    if (para.startsWith('<') || para.trim() === '') return para;
    return '<p>' + para + '</p>';
  }).join('\n\n');

  // Handle mermaid diagrams - keep as code blocks with special class
  html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    '<div class="mermaid-diagram"><pre>$1</pre><p class="diagram-note">Note: This is a Mermaid diagram. View the original markdown file or use a Mermaid viewer to see the visual diagram.</p></div>');

  return html;
}

const htmlTemplate = (title, content) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #fff;
    }

    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
      margin-top: 30px;
      page-break-after: avoid;
    }

    h2 {
      color: #34495e;
      border-bottom: 2px solid #95a5a6;
      padding-bottom: 8px;
      margin-top: 25px;
      page-break-after: avoid;
    }

    h3 {
      color: #555;
      margin-top: 20px;
      page-break-after: avoid;
    }

    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.9em;
      color: #c7254e;
    }

    pre {
      background: #f8f8f8;
      border: 1px solid #ddd;
      border-left: 4px solid #3498db;
      padding: 15px;
      overflow-x: auto;
      border-radius: 4px;
      page-break-inside: avoid;
    }

    pre code {
      background: none;
      padding: 0;
      color: #333;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      margin: 20px 0;
      page-break-inside: avoid;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }

    th {
      background-color: #3498db;
      color: white;
      font-weight: bold;
    }

    tr:nth-child(even) {
      background-color: #f9f9f9;
    }

    ul, ol {
      margin: 15px 0;
      padding-left: 30px;
    }

    li {
      margin: 8px 0;
    }

    a {
      color: #3498db;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    p {
      margin: 15px 0;
      text-align: justify;
    }

    strong {
      color: #2c3e50;
    }

    .mermaid-diagram {
      background: #f0f8ff;
      border: 2px dashed #3498db;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      page-break-inside: avoid;
    }

    .mermaid-diagram pre {
      background: #fff;
      border-left-color: #95a5a6;
      font-size: 0.85em;
    }

    .diagram-note {
      color: #7f8c8d;
      font-style: italic;
      margin-top: 10px;
      font-size: 0.9em;
    }

    @media print {
      body {
        max-width: none;
      }

      h1, h2, h3 {
        page-break-after: avoid;
      }

      pre, table, .mermaid-diagram {
        page-break-inside: avoid;
      }

      a {
        color: #000;
        text-decoration: underline;
      }
    }
  </style>
</head>
<body>
  ${content}

  <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #7f8c8d; font-size: 0.9em;">
    <p>Generated from Carbon Manufacturing System Documentation</p>
    <p>To convert to PDF: Use your browser's Print function (Ctrl+P or Cmd+P) and select "Save as PDF"</p>
  </footer>
</body>
</html>`;

// Main conversion function
function convertMarkdownFile(inputPath, outputPath) {
  try {
    const markdown = fs.readFileSync(inputPath, 'utf-8');
    const fileName = path.basename(inputPath, '.md');
    const title = fileName.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    const htmlContent = markdownToHtml(markdown);
    const fullHtml = htmlTemplate(title, htmlContent);

    fs.writeFileSync(outputPath, fullHtml, 'utf-8');
    console.log(`✓ Converted: ${inputPath} → ${outputPath}`);
  } catch (error) {
    console.error(`✗ Error converting ${inputPath}:`, error.message);
  }
}

// Process command line arguments or default files
const args = process.argv.slice(2);

if (args.length === 0) {
  // Default: convert all markdown files in docs/ directory
  const docsDir = path.join(__dirname, '../docs');
  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));

  console.log('Converting markdown files to HTML...\n');

  files.forEach(file => {
    const inputPath = path.join(docsDir, file);
    const outputPath = path.join(docsDir, file.replace('.md', '.html'));
    convertMarkdownFile(inputPath, outputPath);
  });

  console.log('\n✓ All files converted successfully!');
  console.log('\nTo convert HTML to PDF:');
  console.log('1. Open each HTML file in your web browser');
  console.log('2. Press Ctrl+P (Windows/Linux) or Cmd+P (Mac)');
  console.log('3. Select "Save as PDF" as the destination');
  console.log('4. Click Save\n');
} else {
  // Convert specified file
  const inputPath = args[0];
  const outputPath = args[1] || inputPath.replace('.md', '.html');
  convertMarkdownFile(inputPath, outputPath);
}
