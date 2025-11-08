import { useState } from 'react';
import emailjs from '@emailjs/browser';

function ShoppingList() {
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState('');
  const [sending, setSending] = useState(false);
  const [showRecipientModal, setShowRecipientModal] = useState(false);

  const addItem = (e) => {
    e.preventDefault();
    if (currentItem.trim()) {
      setItems([...items, currentItem.trim()]);
      setCurrentItem('');
    }
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSendClick = () => {
    if (items.length === 0) {
      alert('Your list is empty!');
      return;
    }
    setShowRecipientModal(true);
  };

  const sendList = async (recipientEmail) => {
    setSending(true);
    setShowRecipientModal(false);
    
    console.log('Service ID:', import.meta.env.VITE_EMAILJS_SERVICE_ID);
    console.log('Template ID:', import.meta.env.VITE_EMAILJS_TEMPLATE_ID);
    console.log('Public Key:', import.meta.env.VITE_EMAILJS_PUBLIC_KEY);

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
      
      alert('List sent successfully!');
      setItems([]);
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send list. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ 
      padding: '40px', 
      maxWidth: '600px', 
      margin: '0 auto',
      fontFamily: 'Courier New, monospace'
    }}>
      <h1 style={{ 
        textAlign: 'center', 
        color: '#333',
        marginBottom: '30px'
      }}>
        Shopping List
      </h1>
      
      <form onSubmit={addItem} style={{ marginBottom: '30px' }}>
        <input
          type="text"
          value={currentItem}
          onChange={(e) => setCurrentItem(e.target.value)}
          placeholder="Add an item..."
          style={{ 
            padding: '12px',
            width: '70%',
            fontSize: '16px',
            border: '2px solid #333',
            borderRadius: '4px'
          }}
        />
        <button 
          type="submit" 
          style={{ 
            padding: '12px 20px',
            marginLeft: '10px',
            fontSize: '16px',
            background: '#333',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Add
        </button>
      </form>

      {/* Lined Paper Effect */}
      <div style={{
        background: 'linear-gradient(to bottom, #FFF8DC 0%, #FFFACD 100%)',
        padding: '30px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        minHeight: '300px',
        position: 'relative'
      }}>
        {/* Red margin line */}
        <div style={{
          position: 'absolute',
          left: '60px',
          top: '0',
          bottom: '0',
          width: '2px',
          background: '#ff6b6b'
        }}></div>

        <ul style={{ 
          listStyle: 'none', 
          padding: '0',
          paddingLeft: '80px',
          margin: 0
        }}>
          {items.length === 0 ? (
            <li style={{
              color: '#999',
              fontStyle: 'italic',
              paddingBottom: '20px',
              borderBottom: '1px solid #ddd'
            }}>
              Your list is empty. Add items above.
            </li>
          ) : (
            items.map((item, index) => (
              <li 
                key={index} 
                style={{ 
                  paddingBottom: '15px',
                  paddingTop: '15px',
                  borderBottom: '1px solid #ccc',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '18px',
                  color: '#333'
                }}
              >
                <span style={{ flex: 1 }}>{item}</span>
                <button 
                  onClick={() => removeItem(index)}
                  style={{ 
                    padding: '6px 12px',
                    cursor: 'pointer',
                    background: '#ff6b6b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
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
          style={{
            marginTop: '20px',
            padding: '15px 30px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: sending ? 'not-allowed' : 'pointer',
            fontSize: '18px',
            width: '100%',
            fontWeight: 'bold'
          }}
        >
          {sending ? 'Sending...' : `📧 Send List (${items.length} items)`}
        </button>
      )}

      {/* Recipient Selection Modal */}
      {showRecipientModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>
              Select Recipient
            </h2>
            
            <button
              onClick={() => sendList(import.meta.env.VITE_RECIPIENT_EMAIL_1)}
              style={{
                width: '100%',
                padding: '15px',
                marginBottom: '15px',
                fontSize: '16px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {import.meta.env.VITE_RECIPIENT_EMAIL_1}
              <h2>Brian</h2>
            </button>

            <button
              onClick={() => sendList(import.meta.env.VITE_RECIPIENT_EMAIL_2)}
              style={{
                width: '100%',
                padding: '15px',
                marginBottom: '15px',
                fontSize: '16px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {import.meta.env.VITE_RECIPIENT_EMAIL_2}
              <h2>Barbi</h2>
            </button>

            <button
              onClick={() => setShowRecipientModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                background: '#ccc',
                color: '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShoppingList;