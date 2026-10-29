# Sasaki's Collections — Factory OS

A responsive, dark-themed factory management web app built with plain HTML, CSS and JavaScript.

## Run it
1. Extract `sasaki-collections.zip` into a folder.
2. Open `index.html` in Chrome, Edge, Firefox or another modern browser.
3. Sign in using the demo credentials:
   - Username: `admin`
   - Password: `admin123`

No server, package installation or internet connection is required for the app itself. The optional Google Fonts link only affects typography; local fallback fonts are provided.

## Included modules
- Overview dashboard with live KPIs, production chart, recent activity and stock health
- Inventory register, category/search filters, add/edit/delete items, stock IN/OUT movement and low-stock alerts
- Production batch ledger with date, batch, shift, operator, output and material-cost estimate
- Recipe-based raw-material costing calculator
- Employee directory with role, department, contact, join date and status
- CSV exports for inventory, production, employees and recipe costing (open in Excel or Google Sheets)
- Full JSON backup export
- Responsive mobile navigation and dark interface

## Important data/security notes
- Data is stored in browser `localStorage` on the current device/browser. Use Reports & Export to download a JSON backup regularly.
- The sign-in is a **demo front-end gate**, not secure authentication. The demo credentials are visible in the JavaScript source. Do not use it to protect confidential data or expose it publicly.
- There is no multi-user synchronization or server/database. For a production deployment, add a backend, database, secure authentication, roles/permissions and automated backups.
- CSV export is used instead of a native `.xlsx` workbook to avoid external dependencies; CSV files open in Excel.

## Starter records
The app includes clearly editable demo inventory, production and employee records to show how the interface works. Delete or replace these with your real records.
