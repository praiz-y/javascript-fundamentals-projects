const DOM = {
    display: document.getElementById('display'),
    buttons: document.getElementsByClassName('btn')
};
const themeToggle = document.getElementById('themeToggle');
let currentInput = "";
let history = [];
let justCalculated = false;

const updateDisplay = () => {
    DOM.display.value = currentInput;
};

const renderHistory = () => {
    const historyDiv = document.getElementById('history');

    historyDiv.innerHTML = history
        .map(item => `<div>${item}</div>`)
        .join('');
};

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light');
});

Array.from(DOM.buttons).forEach(button => {
    button.addEventListener('click', () => {

        button.classList.add('active');

        setTimeout(() => {
            button.classList.remove('active');
        }, 100);

        handleButtonClick(button.textContent);
    });
});
const handleButtonClick = (value) => {
    if (value === 'C') return clearDisplay();
    if (value === '⌫') return backspaceInput();
    if (value === '=') return calculateResult();
    if (value === '±') return negateNumber();
    
    appendInput(value);
    
}

// Keyboard clicks
document.addEventListener('keydown', (e) => {
    const key = e.key;
    if ('0123456789+-*/.='.includes(key)) handleButtonClick(key);
    if (key === 'Enter') handleButtonClick('=');
    if (key === 'Backspace') handleButtonClick('⌫');
    if (key.toLowerCase() === 'c') handleButtonClick('C');
});



const clearDisplay = () => {
    currentInput = "";
    justCalculated = false;
    updateDisplay();
}

const backspaceInput = () => {
    if (currentInput === "Error") {
        currentInput = "";
        updateDisplay();
        return;
    }
    currentInput = currentInput.slice(0, -1);
    updateDisplay();
}

const calculateResult = () => {
    try {
        const expression = currentInput;
        const result = evaluateExpression(currentInput);

        currentInput = result.toString();
        justCalculated = true;

        history.push(`${expression} = ${result}`);
        if (history.length > 5) history.shift();

        renderHistory();

    } catch {
        currentInput = "Error";
        triggerErrorAnimation();
    }

    updateDisplay();
};

const triggerErrorAnimation = () => {
    DOM.display.classList.add('error');

    setTimeout(() => {
        DOM.display.classList.remove('error');
    }, 300);
};

const evaluateExpression = (expr) => {
    if (!expr) throw new Error("Empty");

    // Only allow safe characters
    if (!/^[0-9+\-*/.() ]+$/.test(expr)) {
        throw new Error("Invalid characters");
    }

    const result = Function(`"use strict"; return (${expr})`)();

    if (!isFinite(result)) throw new Error("Math error");

    return result;
};

const appendInput = (value) => {
    
    const operators = ['+', '-', '*', '/'];
    const lastChar = currentInput.slice(-1);

    if (justCalculated && !['+', '-', '*', '/'].includes(value)) {
        currentInput = '';
        justCalculated = false;
    }
    // Decimal check

    if (value === '.') {
        const parts = currentInput.split(/[\+\-\*\/]/);
        const lastNumber = parts[parts.length - 1];

        if (lastNumber.includes('.')) return;
    };

    // Prevent operator at start
    if (operators.includes(value) && currentInput === '') {
        return;
    }

    // Prevent double operators
    if (operators.includes(value) && operators.includes(lastChar)) {
        return;
    }

    currentInput += value; 
    updateDisplay();
};

const negateNumber = () => {

    if (!currentInput) return;

    // Split expression while keeping operators
    const parts = currentInput.split(/([+\-*/])/);

    let lastNumber = parts[parts.length - 1];

    // If last part isn't a number, stop
    if (!lastNumber || isNaN(lastNumber)) return;

    if (lastNumber.startsWith('-')) {
        lastNumber = lastNumber.slice(1);
    } else {
        lastNumber = '-' + lastNumber;
    }

    parts[parts.length - 1] = lastNumber;

    currentInput = parts.join('');

    // Clean up operator combinations
    currentInput = currentInput
        .replace(/\+\-/g, '-')
        .replace(/\-\-/g, '+')
        .replace(/\*\-/g, '*-')
        .replace(/\/\-/g, '/-');

    updateDisplay();
};


document.addEventListener('paste', (e) => {
    const pasteData = e.clipboardData.getData('text');

    if (/^[0-9+\-*/.]+$/.test(pasteData)) {
        currentInput = pasteData;
        updateDisplay();
    }
});


// DOM.display.focus();