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

// Path to list files
const SHOPPING_LIST_FILE = path.join(__dirname, 'shopping_list.json');
const AMAZON_LIST_FILE = path.join(__dirname, 'amazon_list.json');

// Load list from file
function loadList(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Error loading list from ${filePath}:`, err);
  }
  return [];
}

// Save list to file
function saveList(filePath, items) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
    console.log(`List saved to ${filePath}`);
  } catch (err) {
    console.error(`Error saving list to ${filePath}:`, err);
  }
}

// Initialize lists from files
let shoppingList = loadList(SHOPPING_LIST_FILE);
let amazonList = loadList(AMAZON_LIST_FILE);
console.log('Loaded shopping list:', shoppingList);
console.log('Loaded amazon list:', amazonList);

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

// Fetch emails from Gmail for a specific list type
function checkForNewEmails(listType = 'shopping') {
  console.log(`Checking for new ${listType} list emails...`);
  
  const imap = new Imap(imapConfig);

  imap.once('ready', () => {
    imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error('Error opening inbox:', err);
        imap.end();
        return;
      }

      // Build search criteria based on list type
      let searchCriteria;
      if (listType === 'amazon') {
        searchCriteria = [
          'UNSEEN',
          ['SUBJECT', 'amazon']
        ];
      } else {
        // Shopping list - search for multiple keywords
        searchCriteria = [
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
        ];
      }

      imap.search(searchCriteria, (err, results) => {
        if (err) {
          console.error('Error searching emails:', err);
          imap.end();
          return;
        }

        if (!results || results.length === 0) {
          console.log(`No new ${listType} emails found`);
          imap.end();
          return;
        }

        console.log(`Found ${results.length} new ${listType} email(s)`);

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

              // Add items to appropriate list (avoid duplicates)
              let itemsAdded = 0;
              let targetList = listType === 'amazon' ? amazonList : shoppingList;
              const targetFile = listType === 'amazon' ? AMAZON_LIST_FILE : SHOPPING_LIST_FILE;

              newItems.forEach(item => {
                if (!targetList.includes(item)) {
                  targetList.push(item);
                  itemsAdded++;
                }
              });

              if (itemsAdded > 0) {
                saveList(targetFile, targetList);
                console.log(`Added ${itemsAdded} new item(s) to ${listType} list`);
              }

              console.log(`Current ${listType} list:`, targetList);
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

// API Routes for Shopping List

// Get all shopping items
app.get('/api/items', (req, res) => {
  res.json({ items: shoppingList });
});

// Add shopping items manually
app.post('/api/items', (req, res) => {
  const { items } = req.body;
  if (Array.isArray(items)) {
    items.forEach(item => {
      if (!shoppingList.includes(item)) {
        shoppingList.push(item);
      }
    });
    saveList(SHOPPING_LIST_FILE, shoppingList);
  }
  res.json({ items: shoppingList });
});

// Clear shopping list
app.delete('/api/items', (req, res) => {
  shoppingList = [];
  saveList(SHOPPING_LIST_FILE, shoppingList);
  console.log('Shopping list cleared and file updated');
  res.json({ message: 'List cleared', items: [] });
});

// API Routes for Amazon List

// Get all amazon items
app.get('/api/amazon-items', (req, res) => {
  res.json({ items: amazonList });
});

// Add amazon items manually
app.post('/api/amazon-items', (req, res) => {
  const { items } = req.body;
  if (Array.isArray(items)) {
    items.forEach(item => {
      if (!amazonList.includes(item)) {
        amazonList.push(item);
      }
    });
    saveList(AMAZON_LIST_FILE, amazonList);
  }
  res.json({ items: amazonList });
});

// Clear amazon list
app.delete('/api/amazon-items', (req, res) => {
  amazonList = [];
  saveList(AMAZON_LIST_FILE, amazonList);
  console.log('Amazon list cleared and file updated');
  res.json({ message: 'List cleared', items: [] });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    shoppingItemCount: shoppingList.length,
    amazonItemCount: amazonList.length
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  
  // Check for emails immediately on startup
  checkForNewEmails('shopping');
  checkForNewEmails('amazon');
  
  // Poll for new emails every 60 seconds for both lists
  setInterval(() => {
    checkForNewEmails('shopping');
    checkForNewEmails('amazon');
  }, 60000);
});