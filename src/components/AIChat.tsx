'use client';

import { useState, useRef, useEffect } from 'react';
import MarkdownMessage from '@/components/MarkdownMessage';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const EXAMPLE_QUESTIONS = [
  '横須賀・衣笠駅周辺の直近の価格動向を教えて',
  '予算5000万円・都内・通勤30分以内で資産価値が高いエリアは？',
  '武蔵小杉と二子玉川、資産価値の観点でどちらが有望？',
];

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // refで管理してスクロール検知ごとに再レンダーしない
  const isAtBottomRef = useRef(true);

  // ユーザーが手動スクロールしたとき、底から離れているかを検知
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  };

  // ユーザーが底付近にいる場合のみコンテナ内をスクロール（ページ全体は動かさない）
  useEffect(() => {
    if (!isAtBottomRef.current) return;
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const send = async (text = input) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    // 送信時は底にリセット（新しいメッセージを必ず見せる）
    isAtBottomRef.current = true;

    const userMsg: Message = { role: 'user', content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      // ストリーミング受信
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: assistantText };
          return updated;
        });
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `エラーが発生しました: ${String(e)}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* ヘッダー */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-muted)' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--accent)' }}>◆</span>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            住宅購入 AI相談
          </h2>
        </div>
        <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-sub)' }}>
          国交省データ参照
        </span>
      </div>

      {/* メッセージエリア：高さを固定してストリーミング中のガタつきを防ぐ */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="px-4 py-4 space-y-3 overflow-y-auto"
        style={{ height: 340, overscrollBehavior: 'contain' }}
      >
        {messages.length === 0 ? (
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              国土交通省の取引データをもとに分析します。
            </p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              エリア・価格・資産価値などの質問に実データをもとに回答します。以下の例をクリックして試してみてください。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-left text-xs px-3 py-2.5 rounded-lg transition-colors"
                  style={{
                    background: 'var(--bg-muted)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-sub)',
                    lineHeight: '1.5',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-sub)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                  }}
                >
                  「{q}」
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'user' ? (
                <div
                  className="max-w-[82%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  {m.content}
                </div>
              ) : (
                <div
                  className="max-w-[92%] rounded-xl px-4 py-3"
                  style={{
                    background: 'var(--bg-muted)',
                    border: '1px solid var(--border-sub)',
                  }}
                >
                  {m.content ? (
                    <MarkdownMessage content={m.content} />
                  ) : (
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>考え中...</span>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {loading && messages.at(-1)?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div
              className="rounded-xl px-3.5 py-2.5 text-sm"
              style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-sub)' }}
            >
              <span style={{ color: 'var(--text-muted)' }}>考え中...</span>
            </div>
          </div>
        )}

      </div>

      {/* 入力エリア */}
      <div
        className="flex gap-2 px-4 py-3"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="質問を入力...（Enter で送信）"
          className="flex-1 text-sm px-3 py-2 rounded-lg outline-none"
          style={{
            background: 'var(--bg-muted)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity"
          style={{
            background: 'var(--accent)',
            color: '#fff',
            opacity: !input.trim() || loading ? 0.45 : 1,
            cursor: !input.trim() || loading ? 'default' : 'pointer',
          }}
        >
          送信
        </button>
      </div>
    </section>
  );
}
