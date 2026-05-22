import type { NewsItem } from '@/types/data';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(date));
}

export default function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="news-card-link group"
    >
      <div className="flex items-start gap-3">
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt=""
            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
            style={{ border: '1px solid var(--border)' }}
          />
        )}
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium line-clamp-2 mb-1 group-hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-primary)' }}
          >
            {item.title}
          </p>
          {item.description && (
            <p className="text-xs line-clamp-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
              {item.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{item.source}</span>
            <span>·</span>
            <span>{formatDate(item.publishedAt)}</span>
          </div>
        </div>
      </div>
    </a>
  );
}
