import { useState, useEffect } from 'react';
import './VirtualKeyboard.css';

function VirtualKeyboard({ value, onInput, onSubmit, onClose }) {
  const [inputText, setInputText] = useState(value || '');
  const [capsLock, setCapsLock] = useState(false);
  const [shift, setShift] = useState(false);

  // Update parent component whenever inputText changes
  useEffect(() => {
    onInput(inputText);
  }, [inputText, onInput]);

  const isUpperCase = capsLock || shift;

  // Keyboard layout
  const keys = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'backspace'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'add'],
    ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.'],
    ['space', 'clear']
  ];

  const handleKeyPress = (key) => {
    let newText = inputText;

    switch (key) {
      case 'backspace':
        newText = inputText.slice(0, -1);
        break;
      case 'space':
        newText = inputText + ' ';
        break;
      case 'shift':
        setShift(!shift);
        return;
      case 'caps':
        setCapsLock(!capsLock);
        return;
      case 'clear':
        newText = '';
        break;
      case 'add':
        if (inputText.trim()) {
          onSubmit();
        }
        return;
      default:
        newText = inputText + (isUpperCase ? key.toUpperCase() : key);
        if (shift) setShift(false); // Turn off shift after one key
    }

    setInputText(newText);
  };

  const getKeyDisplay = (key) => {
    switch (key) {
      case 'backspace':
        return '⌫';
      case 'space':
        return 'Space';
      case 'shift':
        return shift ? '⇧' : '⇧';
      case 'caps':
        return capsLock ? '⇪' : '⇪';
      case 'clear':
        return 'Clear';
      case 'add':
        return 'Add';
      default:
        return isUpperCase ? key.toUpperCase() : key;
    }
  };

  const getKeyClass = (key) => {
    let classes = 'key';
    
    if (key === 'backspace') classes += ' backspace-key';
    if (key === 'space') classes += ' space-key';
    if (key === 'shift' || key === 'caps') classes += ' modifier-key';
    if (key === 'clear') classes += ' clear-key';
    if (key === 'add') classes += ' add-key';
    if (key === 'shift' && shift) classes += ' active';
    if (key === 'caps' && capsLock) classes += ' active';
    
    return classes;
  };

  return (
    <div className="keyboard-overlay" onClick={(e) => {
      if (e.target.className === 'keyboard-overlay') onClose();
    }}>
      <div className="keyboard-container">
        <div className="keyboard-header">
          <input
            type="text"
            className="keyboard-input"
            value={inputText}
            readOnly
            placeholder="Type here..."
          />
          <button className="keyboard-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="keyboard">
          {keys.map((row, rowIndex) => (
            <div key={rowIndex} className="keyboard-row">
              {row.map((key) => (
                <button
                  key={key}
                  className={getKeyClass(key)}
                  onClick={() => handleKeyPress(key)}
                >
                  {getKeyDisplay(key)}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VirtualKeyboard;