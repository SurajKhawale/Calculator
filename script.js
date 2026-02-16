const expressionNode = document.getElementById('expression');
const resultNode = document.getElementById('result');
const historyList = document.getElementById('historyList');
const themeToggle = document.getElementById('themeToggle');
const clearHistoryBtn = document.getElementById('clearHistory');

let expression = '';
let history = [];

const operators = new Set(['+', '-', '*', '/']);

function formatExpression(value) {
  return value
    .replaceAll('*', ' × ')
    .replaceAll('/', ' ÷ ')
    .replaceAll('-', ' − ')
    .replaceAll('+', ' + ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toResultString(value) {
  if (!Number.isFinite(value)) {
    return 'Error';
  }
  const rounded = Math.round((value + Number.EPSILON) * 1e12) / 1e12;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function updateDisplay(preview = true) {
  expressionNode.textContent = expression ? formatExpression(expression) : '0';

  if (!expression) {
    resultNode.textContent = '0';
    return;
  }

  if (!preview || operators.has(expression.at(-1)) || expression.at(-1) === '.') {
    resultNode.textContent = '…';
    return;
  }

  const result = evaluateExpression(expression);
  resultNode.textContent = toResultString(result);
}

function tokenize(raw) {
  const tokens = [];
  let numberBuffer = '';

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    const prev = raw[i - 1];

    const unaryMinus =
      char === '-' &&
      (i === 0 || operators.has(prev)) &&
      /\d|\./.test(raw[i + 1]);

    if (/\d|\./.test(char) || unaryMinus) {
      numberBuffer += char;
      continue;
    }

    if (operators.has(char)) {
      if (numberBuffer) {
        tokens.push(numberBuffer);
        numberBuffer = '';
      }
      tokens.push(char);
    }
  }

  if (numberBuffer) {
    tokens.push(numberBuffer);
  }

  return tokens;
}

function toPostfix(tokens) {
  const output = [];
  const stack = [];
  const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };

  tokens.forEach((token) => {
    if (!operators.has(token)) {
      output.push(token);
      return;
    }

    while (
      stack.length > 0 &&
      precedence[stack[stack.length - 1]] >= precedence[token]
    ) {
      output.push(stack.pop());
    }

    stack.push(token);
  });

  while (stack.length > 0) {
    output.push(stack.pop());
  }

  return output;
}

function evalPostfix(postfix) {
  const stack = [];

  postfix.forEach((token) => {
    if (!operators.has(token)) {
      stack.push(Number.parseFloat(token));
      return;
    }

    const b = stack.pop();
    const a = stack.pop();

    if ([a, b].some((value) => Number.isNaN(value))) {
      stack.push(Number.NaN);
      return;
    }

    switch (token) {
      case '+':
        stack.push(a + b);
        break;
      case '-':
        stack.push(a - b);
        break;
      case '*':
        stack.push(a * b);
        break;
      case '/':
        stack.push(b === 0 ? Number.NaN : a / b);
        break;
      default:
        stack.push(Number.NaN);
        break;
    }
  });

  return stack[0];
}

function evaluateExpression(raw) {
  const tokens = tokenize(raw);
  if (tokens.length === 0) {
    return 0;
  }
  return evalPostfix(toPostfix(tokens));
}

function normalizeInput(newChar) {
  if (/\d/.test(newChar)) {
    expression += newChar;
    return;
  }

  if (newChar === '.') {
    const segments = expression.split(/[+\-*/]/);
    const current = segments[segments.length - 1];
    if (!current.includes('.')) {
      expression += current ? '.' : '0.';
    }
    return;
  }

  if (operators.has(newChar)) {
    if (!expression) {
      if (newChar === '-') {
        expression = '-';
      }
      return;
    }

    if (operators.has(expression.at(-1))) {
      expression = expression.slice(0, -1) + newChar;
      return;
    }

    expression += newChar;
  }
}

function handleAction(action) {
  switch (action) {
    case 'clear':
      expression = '';
      updateDisplay(false);
      return;
    case 'delete':
      expression = expression.slice(0, -1);
      updateDisplay(false);
      return;
    case 'percent': {
      if (!expression || operators.has(expression.at(-1))) {
        return;
      }

      const parts = expression.match(/-?\d*\.?\d+$/);
      if (!parts) {
        return;
      }

      const current = parts[0];
      const percentValue = String(Number.parseFloat(current) / 100);
      expression = expression.slice(0, -current.length) + percentValue;
      updateDisplay();
      return;
    }
    case 'sign': {
      const parts = expression.match(/-?\d*\.?\d+$/);
      if (!parts) {
        expression = expression.startsWith('-') ? expression.slice(1) : `-${expression}`;
        updateDisplay(false);
        return;
      }

      const current = parts[0];
      const toggled = current.startsWith('-') ? current.slice(1) : `-${current}`;
      expression = expression.slice(0, -current.length) + toggled;
      updateDisplay();
      return;
    }
    case 'equals': {
      if (!expression || operators.has(expression.at(-1))) {
        return;
      }

      const result = evaluateExpression(expression);
      const answer = toResultString(result);
      if (answer !== 'Error') {
        history.unshift({ expression, result: answer, id: crypto.randomUUID() });
        history = history.slice(0, 20);
        renderHistory();
        expression = answer;
      } else {
        expression = '';
      }

      updateDisplay(false);
      return;
    }
    default:
  }
}

function renderHistory() {
  historyList.innerHTML = '';

  if (history.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'history__item';
    empty.innerHTML = '<p class="expr">No calculations yet</p>';
    historyList.append(empty);
    return;
  }

  history.forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'history__item';
    li.innerHTML = `<p class="expr">${formatExpression(entry.expression)}</p><p class="ans">= ${entry.result}</p>`;
    li.addEventListener('click', () => {
      expression = entry.result;
      updateDisplay(false);
    });
    historyList.append(li);
  });
}

document.querySelector('.keypad').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) {
    return;
  }

  const { value, action } = button.dataset;
  if (value) {
    normalizeInput(value);
    updateDisplay();
  }

  if (action) {
    handleAction(action);
  }
});

document.addEventListener('keydown', (event) => {
  if (/\d|[+\-*/.]/.test(event.key)) {
    normalizeInput(event.key);
    updateDisplay();
    return;
  }

  if (event.key === 'Enter' || event.key === '=') {
    event.preventDefault();
    handleAction('equals');
    return;
  }

  if (event.key === 'Backspace') {
    handleAction('delete');
    return;
  }

  if (event.key === 'Delete' || event.key.toLowerCase() === 'c') {
    handleAction('clear');
  }
});

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
});

clearHistoryBtn.addEventListener('click', () => {
  history = [];
  renderHistory();
});

renderHistory();
updateDisplay(false);
