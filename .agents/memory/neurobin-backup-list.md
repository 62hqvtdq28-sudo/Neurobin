---
name: Neurobin backup list fix
description: Why the admin backup list was empty and how it was fixed without touching the backup system.
---

## Problem
The activity log system in admin.html supports a `backup` type (icon 💾, color indigo) but:
1. No filter button existed for it in the UI (only all/order/product/login shown)
2. `exportFullBackup()` never called `_logActivity('backup', ...)` so no entries were ever created

## Fix (admin.html only, two edits)
1. Added filter button in section-activitylog (line ~2270): `<button onclick="filterActivityLog('backup')" ...>💾 النسخ الاحتياطية</button>`
2. In the activity log hooks block (setTimeout, line ~5026), added a patch for `exportFullBackup` — same monkey-patch pattern used for updateOrderStatus/saveProduct/deleteProduct — that calls `_logActivity('backup', ...)` after the backup completes.

**Why:** The constraint was "do not modify the backup system itself." Patching from outside (saving original, wrapping) satisfies this — the backup creation code is untouched.

## Key facts about this project
- Pure HTML/JS app served by server.js on port 5000
- Supabase for backend data; activity log stored in localStorage key `nb_activity_log`
- GitHub Pages: 62hqvtdq28-sudo.github.io/Neurobin
- admin.html is 6400 lines; no dedicated section-backup navigation section exists
- "Automatic backups" = manual export via exportFullBackup() in the analytics section
