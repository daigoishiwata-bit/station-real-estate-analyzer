'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

const components: Components = {
  h1: ({ children }) => (
    <h1 className="md-h1">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="md-h2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="md-h3">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="md-p">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="md-ul">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="md-ol">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="md-li">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="md-strong">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="md-em">{children}</em>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.startsWith('language-');
    return isBlock ? (
      <code className="md-code-block">{children}</code>
    ) : (
      <code className="md-code-inline">{children}</code>
    );
  },
  pre: ({ children }) => (
    <pre className="md-pre">{children}</pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="md-blockquote">{children}</blockquote>
  ),
  hr: () => <hr className="md-hr" />,
  table: ({ children }) => (
    <div className="md-table-wrapper">
      <table className="md-table">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="md-thead">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="md-tr">{children}</tr>,
  th: ({ children }) => <th className="md-th">{children}</th>,
  td: ({ children }) => <td className="md-td">{children}</td>,
  a: ({ href, children }) => (
    <a
      href={href ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="md-link"
    >
      {children}
    </a>
  ),
};

interface Props {
  content: string;
}

export default function MarkdownMessage({ content }: Props) {
  return (
    <div className="md-root">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
