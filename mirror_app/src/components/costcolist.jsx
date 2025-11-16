import { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';

const BACKEND_URL = 'http://localhost:3001';

function CostcoList() {
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState('');
  const [sending, setSending] = useState(false);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/costco-items`);
      const data = await response.json();
      setItems(data.items);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching Costco items:', error);
      setLoading(false);
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (currentItem.trim()) {
      const newItem = currentItem.trim();
      
      try {
        const response = await fetch(`${BACKEND_URL}/api/costco-items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [newItem] })
        });
        const data = await response.json();
        setItems(data.items);
        setCurrentItem('');
      } catch (error) {
        console.error('Error adding item:', error);
        alert('Failed to add item. Please try again.');
      }
    }
  };

  const removeItem = async (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    
    try {
      await fetch(`${BACKEND_URL}/api/costco-items`, {
        method: 'DELETE'
      });
      
      if (newItems.length > 0) {
        await fetch(`${BACKEND_URL}/api/costco-items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: newItems })
        });
      }
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const handleSendClick = () => {
    if (items.length === 0) {
      alert('Your Costco list is empty!');
      return;
    }
    setShowRecipientModal(true);
  };

  const sendList = async (recipientEmail, recipientName) => {
    setSending(true);
    setShowRecipientModal(false);

    const formattedList = items
      .map((item, index) => `${index + 1}. ${item}`)
      .join('\n');

    const templateParams = {
      list_items: formattedList,
      item_count: items.length,
      timestamp: new Date().toLocaleString(),
      to_email: recipientEmail
    };

    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        templateParams,
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );
      
      alert('Costco list sent successfully!');
      
      await fetch(`${BACKEND_URL}/api/costco-items`, {
        method: 'DELETE'
      });
      
      setItems([]);
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send Costco list. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div className="list-wrapper">
      <h1 className="list-title costco">Costco List</h1>
      
      <form onSubmit={addItem} className="list-form">
        <input
          type="text"
          value={currentItem}
          onChange={(e) => setCurrentItem(e.target.value)}
          placeholder="Add a Costco item..."
          className="list-input costco"
        />
        <button type="submit" className="list-add-btn costco">
          Add
        </button>
      </form>

      <div className="paper-container costco">
        <div className="paper-margin-line costco"></div>

        <ul className="paper-list">
          {items.length === 0 ? (
            <li className="paper-list-item-empty">
              Your Costco list is empty. Add items above or send an email with "costco" in the subject!
            </li>
          ) : (
            items.map((item, index) => (
              <li key={index} className="paper-list-item costco">
                <span>{item}</span>
                <button 
                  onClick={() => removeItem(index)}
                  className="remove-btn costco"
                >
                  Remove
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      {items.length > 0 && (
        <button
          onClick={handleSendClick}
          disabled={sending}
          className="send-btn costco"
        >
          {sending ? 'Sending...' : `🛒 Send Costco List (${items.length} items)`}
        </button>
      )}

      {showRecipientModal && (
        <div className="modal-overlay" onClick={() => setShowRecipientModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title costco">Select Recipient</h2>
            
            <button
              onClick={() => sendList(import.meta.env.VITE_RECIPIENT_EMAIL_1, 'Brian')}
              className="modal-btn costco"
            >
              Brian
            </button>

            <button
              onClick={() => sendList(import.meta.env.VITE_RECIPIENT_EMAIL_2, 'Barbi')}
              className="modal-btn costco"
            >
              Barbi
            </button>

            <button
              onClick={() => setShowRecipientModal(false)}
              className="modal-cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CostcoList;