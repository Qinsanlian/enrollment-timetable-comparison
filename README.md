# Enrollment & Timetable Comparison XI‑Formal

A single‑page, bilingual web tool that turns enrollment spreadsheets into a formatted **A3 comparison sheet**:  
enrollment table on top, weekly timetable grid below (Monday – Sunday).

## Features

- Import enrollment data from Excel / CSV (教务 10‑column format or header‑based)
- Automatically detect and mark online courses with configurable rules
- Parse class‑time text (e.g., `星期三第3‑4节{2‑19周}` or `Monday Periods 3‑4`) and auto‑fill the weekly grid
- Progressive cell layout: 1 / 2 / 3 courses per time slot with dynamic split lines
- Bilingual UI (中文 / English) with **isolated storage** – Chinese and English data never mix
- Export as browser print, bilingual A3 PDF, or a complete application package (cover page + timetable)
- Undo / redo, local backup resilience, and a thorough pre‑export checklist

## Quick Start

1. Open `index.html` in a modern browser (Chrome, Edge, Firefox, Safari)
2. Enter your name hash when prompted (one‑time per session)
3. Import your enrollment Excel file, or use the built‑in sample
4. Click **“Autofill from class times”** to populate the weekly grid
5. Review the result, adjust manually if needed
6. Print or export via the sidebar buttons

## UI Language

Use the radio buttons in the sidebar to switch between Chinese and English.  
Data is stored separately per language – your Chinese enrollment data will not overwrite your English data and vice versa.

## Online Course Detection

Two rules are applied (both languages):

- **Rule A**: Course name contains brackets **and** the category contains “选修” (Chinese) or “Elective” (English)
- **Rule B**: Class time **and** classroom / venue are both empty

Courses matching either rule are automatically marked as online (you can always manually override the checkbox in the enrollment table).

## Weekly Grid Notes

- Each cell has up to three bands (upper / middle / lower) for entering course indices
- The tool extracts the specific class time and classroom text that matches the cell’s weekday and period
- When a cell would have more than three courses, a red `+N` badge appears – hover over it to see the overflow courses

## Export Options

| Button | Output |
|--------|--------|
| **Print / PDF** | Browser print dialog (A3, portrait) with a print‑only checklist |
| **Export PDF (A3 bilingual)** | Single PDF containing two A3 pages: Chinese layout + English layout |
| **Export application package** | A4 package with cover page + A3 timetable, suitable for submission |

All exports carry a semi‑transparent “UNOFFICIAL” watermark and require typing a confirmation phrase.

## Local Storage & Privacy

- All data is saved in your browser’s `localStorage` and `sessionStorage`
- Your name is hashed (SHA‑256) and stored **only in session storage** – it is never saved to disk
- You can clear all stored data via the **“Clear all local cache”** button (with an optional JSON backup)

## Important

This tool is a **layout helper only**. It does **not** issue credentials, seals, or official certificates. The user is responsible for data authenticity. Exported files carry a non‑official watermark and a data‑source label.

## Tech Stack

- Vanilla JavaScript (single‑file)
- [html2canvas](https://html2canvas.hertzen.com/) – A3 capture
- [jsPDF](https://github.com/parallax/jsPDF) – PDF generation
- [SheetJS](https://sheetjs.com/) – Excel / CSV parsing

## License

Open‑source, free for personal, non‑commercial educational use.  
See the in‑tool disclaimer for full liability terms.
