import { useState, useEffect } from 'react'
import ShoppingList from './components/shoppinglist'
import AmazonList from './components/amazonlist'
import CostcoList from './components/costcolist'
import Weather from './components/weather'

import './App.css'

const BACKEND_URL = 'http://localhost:3001';

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showShopping, setShowShopping] = useState(true);
  const [showAmazon, setShowAmazon] = useState(false);
  const [showCostco, setShowCostco] = useState(false);
  
  // Track if lists have items
  const [shoppingHasItems, setShoppingHasItems] = useState(false);
  const [amazonHasItems, setAmazonHasItems] = useState(false);
  const [costcoHasItems, setCostcoHasItems] = useState(false);

  // Check all lists for items on mount and periodically
  useEffect(() => {
    checkAllLists();
    const interval = setInterval(checkAllLists, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const checkAllLists = async () => {
    try {
      // Check shopping list
      const shoppingRes = await fetch(`${BACKEND_URL}/api/items`);
      const shoppingData = await shoppingRes.json();
      const hasShoppingItems = shoppingData.items && shoppingData.items.length > 0;
      setShoppingHasItems(hasShoppingItems);
      
      // Auto-show shopping list if it has items and isn't manually hidden
      if (hasShoppingItems && !showShopping) {
        setShowShopping(true);
      }

      // Check Amazon list
      const amazonRes = await fetch(`${BACKEND_URL}/api/amazon-items`);
      const amazonData = await amazonRes.json();
      const hasAmazonItems = amazonData.items && amazonData.items.length > 0;
      setAmazonHasItems(hasAmazonItems);
      
      // Auto-show Amazon list if it has items
      if (hasAmazonItems && !showAmazon) {
        setShowAmazon(true);
      }

      // Check Costco list
      const costcoRes = await fetch(`${BACKEND_URL}/api/costco-items`);
      const costcoData = await costcoRes.json();
      const hasCostcoItems = costcoData.items && costcoData.items.length > 0;
      setCostcoHasItems(hasCostcoItems);
      
      // Auto-show Costco list if it has items
      if (hasCostcoItems && !showCostco) {
        setShowCostco(true);
      }
    } catch (error) {
      console.error('Error checking lists:', error);
    }
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Determine if a list should be displayed
  const shouldShowShopping = showShopping || shoppingHasItems;
  const shouldShowAmazon = showAmazon || amazonHasItems;
  const shouldShowCostco = showCostco || costcoHasItems;

  return (
    <>
      {/* Hamburger Menu Button */}
      <button 
        className="hamburger-menu"
        onClick={toggleMenu}
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
        <div className="menu-overlay" onClick={toggleMenu}>
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

            <button className="close-menu-btn" onClick={toggleMenu}>
              Close Menu
            </button>
          </div>
        </div>
      )}

      {/* Lists Container - with bottom padding for weather component */}
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
          <div style={{ 
            padding: '40px', 
            textAlign: 'center',
            color: 'var(--text-color)',
            fontFamily: 'Courier New, monospace'
          }}>
            <h2>No lists selected</h2>
            <p>Open the menu to select a list to display</p>
          </div>
        )}
      </div>

      {/* Weather Component - Fixed to bottom */}
      <Weather />
    </>
  )
}

export default App