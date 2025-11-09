import { useState } from 'react'
import ShoppingList from './components/shoppinglist'
import AmazonList from './components/amazonlist'
import './App.css'

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showShopping, setShowShopping] = useState(true);
  const [showAmazon, setShowAmazon] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

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
                <span>Shopping List</span>
              </label>

              <label className="toggle-option">
                <input
                  type="checkbox"
                  checked={showAmazon}
                  onChange={(e) => setShowAmazon(e.target.checked)}
                />
                <span>Amazon List</span>
              </label>
            </div>

            <button className="close-menu-btn" onClick={toggleMenu}>
              Close Menu
            </button>
          </div>
        </div>
      )}

      {/* Lists Container */}
      <div className="lists-container">
        {showShopping && (
          <div className="shoppinglist">
            <ShoppingList />
          </div>
        )}
        
        {showAmazon && (
          <div className="amazonlist">
            <AmazonList />
          </div>
        )}

        {!showShopping && !showAmazon && (
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
    </>
  )
}

export default App
