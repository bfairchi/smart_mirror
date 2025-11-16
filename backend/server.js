const express = require('express');
const cors = require('cors');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Path to list files
const SHOPPING_LIST_FILE = path.join(__dirname, 'shopping_list.json');
const AMAZON_LIST_FILE = path.join(__dirname, 'amazon_list.json');
const COSTCO_LIST_FILE = path.join(__dirname, 'costco_list.json');

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
let costcoList = loadList(COSTCO_LIST_FILE);
console.log('Loaded shopping list:', shoppingList);
console.log('Loaded amazon list:', amazonList);
console.log('Loaded costco list:', costcoList);

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
      } else if (listType === 'costco') {
        searchCriteria = [
          'UNSEEN',
          ['SUBJECT', 'costco']
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
              let targetList, targetFile;
              
              if (listType === 'amazon') {
                targetList = amazonList;
                targetFile = AMAZON_LIST_FILE;
              } else if (listType === 'costco') {
                targetList = costcoList;
                targetFile = COSTCO_LIST_FILE;
              } else {
                targetList = shoppingList;
                targetFile = SHOPPING_LIST_FILE;
              }

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

// =============================================================================
// API ROUTES - SHOPPING LIST
// =============================================================================

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

// =============================================================================
// API ROUTES - AMAZON LIST
// =============================================================================

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

// =============================================================================
// API ROUTES - COSTCO LIST
// =============================================================================

// Get all costco items
app.get('/api/costco-items', (req, res) => {
  res.json({ items: costcoList });
});

// Add costco items manually
app.post('/api/costco-items', (req, res) => {
  const { items } = req.body;
  if (Array.isArray(items)) {
    items.forEach(item => {
      if (!costcoList.includes(item)) {
        costcoList.push(item);
      }
    });
    saveList(COSTCO_LIST_FILE, costcoList);
  }
  res.json({ items: costcoList });
});

// Clear costco list
app.delete('/api/costco-items', (req, res) => {
  costcoList = [];
  saveList(COSTCO_LIST_FILE, costcoList);
  console.log('Costco list cleared and file updated');
  res.json({ message: 'List cleared', items: [] });
});

// =============================================================================
// API ROUTES - GOOGLE CALENDAR (NEW)
// =============================================================================

// Get calendar events
app.post('/api/calendar/events', async (req, res) => {
  try {
    const { timeMin, timeMax } = req.body;

    // Validate required environment variables
    const requiredEnvVars = [
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      'GOOGLE_PRIVATE_KEY',
      'GOOGLE_CALENDAR_ID'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars);
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: `Missing environment variables: ${missingVars.join(', ')}`
      });
    }

    // Create JWT auth client using service account credentials
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });

    // Create calendar API client
    const calendar = google.calendar({ version: 'v3', auth });

    // Fetch events from the specified calendar
    const response = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];

    return res.status(200).json({
      success: true,
      events: events,
      count: events.length
    });

  } catch (error) {
    console.error('Error fetching calendar events:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to fetch calendar events';
    
    if (error.code === 401) {
      errorMessage = 'Authentication failed. Please check your service account credentials.';
    } else if (error.code === 403) {
      errorMessage = 'Access denied. Ensure the service account has access to the calendar.';
    } else if (error.code === 404) {
      errorMessage = 'Calendar not found. Please check the calendar ID.';
    }

    return res.status(error.code || 500).json({
      error: errorMessage,
      details: error.message
    });
  }
});

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    shoppingItemCount: shoppingList.length,
    amazonItemCount: amazonList.length,
    costcoItemCount: costcoList.length,
    googleCalendar: {
      configured: !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && 
                     process.env.GOOGLE_PRIVATE_KEY && 
                     process.env.GOOGLE_CALENDAR_ID)
    }
  });
});

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log('\n📧 Email Configuration:');
  console.log(`   - Gmail User: ${process.env.GMAIL_USER ? '✓' : '✗'}`);
  console.log(`   - Gmail Password: ${process.env.GMAIL_APP_PASSWORD ? '✓' : '✗'}`);
  console.log('\n📅 Google Calendar Configuration:');
  console.log(`   - Service Account Email: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? '✓' : '✗'}`);
  console.log(`   - Private Key: ${process.env.GOOGLE_PRIVATE_KEY ? '✓' : '✗'}`);
  console.log(`   - Calendar ID: ${process.env.GOOGLE_CALENDAR_ID ? '✓' : '✗'}`);
  console.log('\n📋 List Counts:');
  console.log(`   - Shopping: ${shoppingList.length} items`);
  console.log(`   - Amazon: ${amazonList.length} items`);
  console.log(`   - Costco: ${costcoList.length} items`);
  
  // Check for emails immediately on startup
  checkForNewEmails('shopping');
  checkForNewEmails('amazon');
  checkForNewEmails('costco');
  
  // Poll for new emails every 60 seconds for all lists
  setInterval(() => {
    checkForNewEmails('shopping');
    checkForNewEmails('amazon');
    checkForNewEmails('costco');
  }, 60000);
});