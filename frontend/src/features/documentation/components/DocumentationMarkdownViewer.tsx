import { useState } from 'react';
import type { DocumentationType } from '../../../types';

export interface DocumentationMarkdownViewerProps {
  title: string;
  markdown: string;
  docType: DocumentationType;
  model: string;
}

export function DocumentationMarkdownViewer({
  title,
  markdown,
  docType,
  model,
}: DocumentationMarkdownViewerProps) {
  const [activeTab, setActiveTab] = useState<'rendered' | 'raw'>('rendered');
  const [copied, setCopied] = useState(false);

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy markdown:', err);
    }
  };

  const handleDownloadMarkdown = () => {
    try {
      let defaultFilename = 'documentation.md';
      if (docType === 'readme') {
        defaultFilename = 'README.md';
      } else if (docType === 'api') {
        defaultFilename = 'api-documentation.md';
      } else if (docType === 'architecture') {
        defaultFilename = 'architecture.md';
      } else if (docType === 'function' || docType === 'class') {
        defaultFilename = `${docType}-documentation.md`;
      }

      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = defaultFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download markdown:', err);
    }
  };

  /**
   * Safe, lightweight markdown renderer without dangerouslySetInnerHTML.
   * Parses headings, code blocks, lists, and plain text paragraphs.
   */
  const renderSafeMarkdown = (content: string) => {
    const lines = content.split(/\r?\n/);
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let codeLang = '';

    lines.forEach((line, idx) => {
      // Code fence toggle
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre
              key={`code-${idx}`}
              data-language={codeLang || 'text'}
              style={{
                background: '#090d16',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '12px 14px',
                color: '#f8fafc',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.84rem',
                lineHeight: 1.45,
                overflowX: 'auto',
                margin: '12px 0',
              }}
            >
              <code className={codeLang ? `language-${codeLang}` : undefined}>{codeBuffer.join('\n')}</code>
            </pre>
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeLang = line.trim().replace(/^```/, '');
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${idx}`} style={{ fontSize: '1.45rem', fontWeight: 700, margin: '20px 0 10px', color: 'var(--text-primary)' }}>
            {line.replace(/^#\s+/, '')}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${idx}`} style={{ fontSize: '1.2rem', fontWeight: 600, margin: '18px 0 8px', color: 'var(--accent-color, #38bdf8)' }}>
            {line.replace(/^##\s+/, '')}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${idx}`} style={{ fontSize: '1.05rem', fontWeight: 600, margin: '14px 0 6px', color: 'var(--text-primary)' }}>
            {line.replace(/^###\s+/, '')}
          </h3>
        );
      } else if (line.startsWith('#### ')) {
        elements.push(
          <h4 key={`h4-${idx}`} style={{ fontSize: '0.95rem', fontWeight: 600, margin: '10px 0 4px', color: 'var(--text-secondary)' }}>
            {line.replace(/^####\s+/, '')}
          </h4>
        );
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={`li-${idx}`} style={{ margin: '4px 0 4px 20px', color: 'var(--text-primary)', fontSize: '0.88rem' }}>
            {line.replace(/^[-*]\s+/, '')}
          </li>
        );
      } else if (line.trim().length === 0) {
        elements.push(<div key={`sp-${idx}`} style={{ height: '8px' }} />);
      } else {
        elements.push(
          <p key={`p-${idx}`} style={{ margin: '6px 0', fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--text-primary)' }}>
            {line}
          </p>
        );
      }
    });

    if (inCodeBlock && codeBuffer.length > 0) {
      elements.push(
        <pre
          key="code-unclosed"
          style={{
            background: '#090d16',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '12px 14px',
            color: '#f8fafc',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.84rem',
            overflowX: 'auto',
          }}
        >
          <code>{codeBuffer.join('\n')}</code>
        </pre>
      );
    }

    return elements;
  };

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-tertiary)', color: 'var(--accent-color, #38bdf8)' }}>
              Type: {docType.toUpperCase()}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Model: {model}
            </span>
          </div>
        </div>

        {/* Tab Controls & Export Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '2px', borderRadius: '6px' }}>
            <button
              type="button"
              data-testid="tab-preview-btn"
              onClick={() => setActiveTab('rendered')}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: activeTab === 'rendered' ? 'var(--accent-color, #38bdf8)' : 'transparent',
                color: activeTab === 'rendered' ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              Preview
            </button>
            <button
              type="button"
              data-testid="tab-raw-markdown-btn"
              onClick={() => setActiveTab('raw')}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: activeTab === 'raw' ? 'var(--accent-color, #38bdf8)' : 'transparent',
                color: activeTab === 'raw' ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              Raw Markdown
            </button>
          </div>

          <button
            type="button"
            data-testid="copy-markdown-btn"
            onClick={handleCopyMarkdown}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              color: copied ? '#10b981' : 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{copied ? '✓' : '📋'}</span>
            <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
          </button>

          <button
            type="button"
            data-testid="download-markdown-btn"
            onClick={handleDownloadMarkdown}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              color: 'var(--accent-color, #38bdf8)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>💾</span>
            <span>Download .md</span>
          </button>
        </div>
      </div>

      {/* Content View */}
      <div
        data-testid="markdown-viewer-content"
        style={{
          borderRadius: '8px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          padding: '16px 20px',
          maxHeight: '600px',
          overflowY: 'auto',
        }}
      >
        {activeTab === 'rendered' ? (
          <div data-testid="markdown-rendered-view">
            {renderSafeMarkdown(markdown)}
          </div>
        ) : (
          <pre
            data-testid="markdown-raw-view"
            style={{
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.84rem',
              color: '#f8fafc',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {markdown}
          </pre>
        )}
      </div>
    </div>
  );
}
