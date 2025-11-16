import { useState, useEffect } from 'react';
import ShoppingList from './components/shoppinglist';
import AmazonList from './components/amazonlist';
import CostcoList from './components/costcolist';
import Weather from './components/weather';
import GoogleCalendar from './components/googlecalendar';
import './App.css';

const BACKEND_URL = 'http://localhost:3001';

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showShopping, setShowShopping] = useState(true);
  const [showAmazon, setShowAmazon] = useState(false);
  const [showCostco, setShowCostco] = useState(false);

  const [shoppingHasItems, setShoppingHasItems] = useState(false);
  const [amazonHasItems, setAmazonHasItems] = useState(false);
  const [costcoHasItems, setCostcoHasItems] = useState(false);

  useEffect(() => {
    checkAllLists();
    const interval = setInterval(checkAllLists, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAllLists = async () => {
    try {
      const shoppingRes = await fetch(`${BACKEND_URL}/api/items`);
      const shoppingData = await shoppingRes.json();
      const hasShoppingItems = shoppingData.items?.length > 0;
      setShoppingHasItems(hasShoppingItems);
      if (hasShoppingItems && !showShopping) setShowShopping(true);

      const amazonRes = await fetch(`${BACKEND_URL}/api/amazon-items`);
      const amazonData = await amazonRes.json();
      const hasAmazonItems = amazonData.items?.length > 0;
      setAmazonHasItems(hasAmazonItems);
      if (hasAmazonItems && !showAmazon) setShowAmazon(true);

      const costcoRes = await fetch(`${BACKEND_URL}/api/costco-items`);
      const costcoData = await costcoRes.json();
      const hasCostcoItems = costcoData.items?.length > 0;
      setCostcoHasItems(hasCostcoItems);
      if (hasCostcoItems && !showCostco) setShowCostco(true);
    } catch (error) {
      console.error('Error checking lists:', error);
    }
  };

  const shouldShowShopping = showShopping || shoppingHasItems;
  const shouldShowAmazon = showAmazon || amazonHasItems;
  const shouldShowCostco = showCostco || costcoHasItems;

  return (
    <>
      {/* Hamburger Menu Button */}
      <button
        className="hamburger-menu"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <div className={`hamburger-icon ${menuOpen ? 'open' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      {/* Menu Overlay */}
      {menuOpen && (
        <div className="menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="menu-content" onClick={(e) => e.stopPropagation()}>
            <h2>Select Lists</h2>

            <div className="menu-options">
              <label className="toggle-option">
                <input
                  type="checkbox"
                  checked={showShopping}
                  onChange={(e) => setShowShopping(e.target.checked)}
                />
                <span>Shopping List {shoppingHasItems && '(has items)'}</span>
              </label>

              <label className="toggle-option">
                <input
                  type="checkbox"
                  checked={showAmazon}
                  onChange={(e) => setShowAmazon(e.target.checked)}
                />
                <span>Amazon List {amazonHasItems && '(has items)'}</span>
              </label>

              <label className="toggle-option">
                <input
                  type="checkbox"
                  checked={showCostco}
                  onChange={(e) => setShowCostco(e.target.checked)}
                />
                <span>Costco List {costcoHasItems && '(has items)'}</span>
              </label>
            </div>

            <button className="close-menu-btn" onClick={() => setMenuOpen(false)}>
              Close Menu
            </button>
          </div>
        </div>
      )}

      {/* MAIN ROW: Lists on left, calendar on right */}
      <div className="main-layout">
        {/* LEFT SIDE — LISTS */}
        <div className="lists-container">
          {shouldShowShopping && (
            <div className="shoppinglist">
              <ShoppingList />
            </div>
          )}
          {shouldShowAmazon && (
            <div className="amazonlist">
              <AmazonList />
            </div>
          )}
          {shouldShowCostco && (
            <div className="costcolist">
              <CostcoList />
            </div>
          )}

          {!shouldShowShopping && !shouldShowAmazon && !shouldShowCostco && (
            <div
              style={{
                padding: '40px',
                textAlign: 'center',
                color: 'var(--text-color)',
                fontFamily: 'Courier New, monospace',
              }}
            >
              <h2>No lists selected</h2>
              <p>Open the menu to select a list to display</p>
            </div>
          )}
        </div>

        {/* RIGHT SIDE — CALENDAR */}
        <div className="calendar-panel">
          <GoogleCalendar />
        </div>
      </div>

      {/* Weather stays fixed at bottom */}
      <Weather />
    </>
  );
}

export default App;
