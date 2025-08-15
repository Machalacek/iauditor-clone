// backend/scripts/clearTemplates.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Adjust this path if your DB file is in a different folder
const dbPath = path.join(__dirname, '../db.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Delete all templates
  db.run('DELETE FROM templates', function (err) {
    if (err) {
      console.error('Failed to delete templates:', err.message);
    } else {
      console.log('All templates deleted!');
    }
  });

  // Reset the auto-increment counter
  db.run("DELETE FROM sqlite_sequence WHERE name='templates'", function (err) {
    if (err) {
      console.error('Failed to reset ID sequence:', err.message);
    } else {
      console.log('Template ID counter reset!');
    }
    db.close();
  });
});
