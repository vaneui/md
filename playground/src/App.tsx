import { useState } from 'react';
import { Md } from '../../src';
import { comprehensiveExample } from './comprehensive-example';

function App() {
  const [content, setContent] = useState(comprehensiveExample);

  return (
    <div>
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ color: '#646cff', marginBottom: '0.5rem' }}>@vaneui/md Playground</h1>
        <p style={{ margin: 0, opacity: 0.8 }}>
          Test the Markdown component with a comprehensive example
        </p>
      </header>

      <div className="playground-container">
        <div className="editor-panel">
          <h3>Markdown Input</h3>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your markdown here..."
          />
        </div>

        <div className="preview-panel">
          <h3>Rendered Output</h3>
          <div className="preview-content">
            <Md content={content} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;