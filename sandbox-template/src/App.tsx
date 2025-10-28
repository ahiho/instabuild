import { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to Your Landing Page</h1>
        <p>This is your starting point for creating amazing landing pages!</p>
        <button onClick={() => setCount(count => count + 1)}>
          Count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </header>
    </div>
  );
}

export default App;
