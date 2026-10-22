import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

export function MarkdownContent({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn('space-y-3 break-words text-sm leading-6 text-text-secondary [overflow-wrap:anywhere]', className)}>
      <ReactMarkdown
        skipHtml
        allowedElements={['p', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'h2', 'h3', 'h4', 'br', 'hr']}
        components={{
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent-light underline underline-offset-2 hover:text-text-primary">{children}</a>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          code: ({ children }) => <code className="rounded bg-surface-inset px-1 py-0.5 font-mono text-xs">{children}</code>,
          blockquote: ({ children }) => <blockquote className="border-l border-border-strong pl-4 text-text-muted">{children}</blockquote>,
          h2: ({ children }) => <h2 className="text-lg font-semibold text-text-primary">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold text-text-primary">{children}</h3>,
          h4: ({ children }) => <h4 className="text-sm font-semibold text-text-primary">{children}</h4>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
