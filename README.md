# AJet Follow Up Times

A quick tool for building and sharing flight follow-up times in a WhatsApp-ready format.

## What You Can Do

- Add, edit, and delete time entries
- Select one or more rows before editing/deleting
- Use predefined labels or add your own custom label
- Set UTC time manually or use **Set to now**
- Add flight details:
  - Date
  - Flight Number
  - Additional Information
- Copy all entries at once with **COPY WHATSAPP**
- Switch between light and dark theme

## How To Use

1. Enter **Date** and **Flight Number**.
2. Click **NEW** to add a timeline item.
3. Choose a label and enter time in `HH:MM` (UTC).
4. Save the item.
5. Select a row to **EDIT** or **DELETE** when needed.
6. Add optional notes in **Additional Information**.
7. Click **COPY WHATSAPP** to copy the final message.

## Output Format

Copied text includes:

- Flight code
- Date (formatted as `DD.MM.YYYY`)
- Time entries sorted by time
- Optional additional information section

## Run Locally

From the project folder in a terminal:

1. Start the server:
   ```bash
   npx serve .
   ```
2. Open the URL shown in the terminal (usually `http://localhost:3000`).
3. To try it on a phone on the same Wi‑Fi, use your computer’s local IP instead of `localhost` (for example `http://192.168.x.x:3000`).
4. Stop the server with **`Ctrl + C`** in that same terminal.

## Tips

- If no row is selected, edit/delete actions will ask you to select one first.
- **DELETE ALL** removes all entries after confirmation.
- Your entries stay available in the same browser unless you clear browser data.
