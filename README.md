# Enrollment & Timetable Comparison (X-Formal)

A single-page web tool that converts enrollment spreadsheets into a formatted A3 comparison sheet: an enrollment table on top, a weekly timetable grid below (Monday–Sunday).

## What it does

- Import enrollment data from Excel/CSV files (教务固定10列格式)
- Automatically detect and mark online courses
- Parse class-time text (e.g., "星期三第3-4节{2-19周}") and auto-fill into the weekly grid
- Progressive cell layout: one / two / three courses per time slot with dynamic split lines
- Bilingual UI (Chinese / English), with data isolation between languages
- Export as browser print, bilingual A3 PDF, or application package

## What it does NOT do

- Does not issue credentials, seals, or official certificates
- Does not verify enrollment or academic status
- Does not connect to any school database

## Quick start

1. Open `index.html` in a modern browser (Chrome, Edge, Firefox)
2. Import your enrollment Excel or use the built-in sample
3. Click "Autofill from class times" to populate the grid
4. Review, adjust manually if needed, then print or export

## Files

- `index.html` – the entire tool (CSS + JS inline, zero dependencies beyond CDN)
- `README.md` – this file

## How to use it correctly

1. Export your enrollment table from the academic affairs system
2. Import it into this tool for layout
3. Print the A3 sheet
4. Bring it to the Academic Office for review and stamping

The stamp comes from the school, not from this tool.

## Legal boundary

This tool is a layout helper only. The user is responsible for data authenticity. Exported files carry a non-official watermark and a data-source label.

## Tech stack

- Vanilla JavaScript (single-file)
- html2canvas (A3 capture)
- jsPDF (PDF export)
- SheetJS (Excel/CSV parsing)

## License

Open-source, free for personal, non-commercial educational use.
