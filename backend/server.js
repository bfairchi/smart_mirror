const express = require('express');
const cors = require('cors');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Path to shopping list log file
const LIST_FILE = path.join(__dirname, 'shopping_list.json');

// Load shopping list from file
function loadShoppingList() {
  try {
    if (fs.existsSync(LIST_FILE)) {
      const data = fs.readFileSync(LIST_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading shopping list:', err);
  }
  return [];
}

// Save shopping list to file
function saveShoppingList(items) {
  try {
    fs.writeFileSync(LIST_FILE, JSON.stringify(items, null, 2));
    console.log('Shopping list saved to file');
  } catch (err) {
    console.error('Error saving shopping list:', err);
  }
}

// Initialize shopping list from file
let shoppingList = loadShoppingList();
console.log('Loaded shopping list:', shoppingList);

// IMAP configuration
const imapConfig = {
  user: process.env.GMAIL_USER,
  password: process.env.GMAIL_APP_PASSWORD,
  host: process.env.IMAP_HOST,
  port: process.env.IMAP_PORT,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
};

// Parse email content and extract items
function parseEmailForItems(emailBody) {
  const items = [];
  const lines = emailBody.split('\n');
  
  for (let line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and lines that look like email signatures/headers
    if (trimmed && 
        trimmed.length > 0 && 
        trimmed.length < 100 && // Ignore very long lines
        !trimmed.includes('@') && // Skip email addresses
        !trimmed.startsWith('>') && // Skip quoted text
        !trimmed.toLowerCase().includes('sent from') && // Skip signatures
        !trimmed.toLowerCase().includes('regards')) {
      items.push(trimmed);
    }
  }
  
  return items;
}

// Fetch emails from Gmail
function checkForNewEmails() {
  console.log('Checking for new emails...');
  
  const imap = new Imap(imapConfig);

  imap.once('ready', () => {
    imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error('Error opening inbox:', err);
        imap.end();
        return;
      }

      // Search for unread emails with "shopping list", "add", "list", or "new" in subject
      // The OR criteria allows any of these keywords
      imap.search([
        'UNSEEN',
        ['OR', 
          ['SUBJECT', 'shopping list'],
          ['OR',
            ['SUBJECT', 'add'],
            ['OR',
                ['SUBJECT', 'shopping'],
            ['OR',
              ['SUBJECT', 'list'],
              ['SUBJECT', 'new']
              ] 
            ]
          ]
        ]
      ], (err, results) => {
        if (err) {
          console.error('Error searching emails:', err);
          imap.end();
          return;
        }

        if (!results || results.length === 0) {
          console.log('No new emails found');
          imap.end();
          return;
        }

        console.log(`Found ${results.length} new email(s)`);

        const fetch = imap.fetch(results, { bodies: '' });

        fetch.on('message', (msg) => {
          msg.on('body', (stream) => {
            simpleParser(stream, (err, parsed) => {
              if (err) {
                console.error('Error parsing email:', err);
                return;
              }

              console.log('Email from:', parsed.from.text);
              console.log('Subject:', parsed.subject);

              // Extract text content
              const emailBody = parsed.text || '';
              const newItems = parseEmailForItems(emailBody);

              console.log('Extracted items:', newItems);

              // Add items to shopping list (avoid duplicates)
              let itemsAdded = 0;
              newItems.forEach(item => {
                if (!shoppingList.includes(item)) {
                  shoppingList.push(item);
                  itemsAdded++;
                }
              });

              if (itemsAdded > 0) {
                saveShoppingList(shoppingList);
                console.log(`Added ${itemsAdded} new item(s) to shopping list`);
              }

              console.log('Current shopping list:', shoppingList);
            });
          });

          msg.once('attributes', (attrs) => {
            // Mark email as deleted (moves to trash)
            imap.addFlags(attrs.uid, ['\\Deleted'], (err) => {
              if (err) {
                console.error('Error marking for deletion:', err);
              } else {
                console.log('Email marked for deletion');
              }
            });
          });
        });

        fetch.once('error', (err) => {
          console.error('Fetch error:', err);
        });

        fetch.once('end', () => {
          console.log('Done fetching emails');
          // Expunge deleted emails (permanently remove them)
          imap.expunge((err) => {
            if (err) {
              console.error('Error expunging emails:', err);
            } else {
              console.log('Deleted emails permanently removed');
            }
            imap.end();
          });
        });
      });
    });
  });

  imap.once('error', (err) => {
    console.error('IMAP error:', err);
  });

  imap.once('end', () => {
    console.log('IMAP connection ended');
  });

  imap.connect();
}

// API Routes

// Get all items
app.get('/api/items', (req, res) => {
  res.json({ items: shoppingList });
});

// Add items manually
app.post('/api/items', (req, res) => {
  const { items } = req.body;
  if (Array.isArray(items)) {
    items.forEach(item => {
      if (!shoppingList.includes(item)) {
        shoppingList.push(item);
      }
    });
    saveShoppingList(shoppingList);
  }
  res.json({ items: shoppingList });
});

// Clear all items (called after sending email successfully)
app.delete('/api/items', (req, res) => {
  shoppingList = [];
  saveShoppingList(shoppingList);
  console.log('Shopping list cleared and file updated');
  res.json({ message: 'List cleared', items: [] });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', itemCount: shoppingList.length });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  
  // Check for emails immediately on startup
  checkForNewEmails();
  
  // Poll for new emails every 60 seconds
  setInterval(checkForNewEmails, 60000);
});