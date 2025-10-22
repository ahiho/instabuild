import { Health } from './components/Health';
import './App.css';

function App(): JSX.Element {
  return (
    <div className="App">
      <header className="App-header">
        <h1>InstaBuild</h1>
        <p>Welcome to the InstaBuild monorepo!</p>
        <p>This is a full-stack TypeScript application with:</p>
        <ul>
          <li>Fastify backend</li>
          <li>React frontend</li>
          <li>Shared TypeScript types</li>
          <li>pnpm workspaces</li>
        </ul>

        <div className="health-section">
          <h2>Backend Health Status</h2>
          <Health />
        </div>
      </header>
    </div>
  );
}

export default App;
