import { useRef, useState } from 'react';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { useFlashMessage } from '../hooks/useFlashMessage.js';
import { apiRequest } from '../lib/api.js';

const ROLE_STYLE = {
  student: { cls: 'chat-msg-student', label: '나' },
  instructor: { cls: 'chat-msg-instructor', label: '강사' },
  assistant: { cls: 'chat-msg-ai', label: 'AI 코치' },
  system: { cls: 'chat-msg-system', label: '시스템' },
};

const RECIPIENT_OPTS = [
  { value: 'llm', label: 'AI 코치에게' },
  { value: 'instructor', label: '강사에게' },
  { value: 'both', label: '모두에게' },
];

function ChatMessage({ msg, token, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const style = ROLE_STYLE[msg.role] || { cls: '', label: msg.role };

  const del = async () => {
    if (!msg.deletable) return;
    if (!window.confirm('이 메시지를 삭제할까?')) return;
    setDeleting(true);
    try {
      await apiRequest(`/frontend/student/strategy-chat/messages/${msg.id}`, {
        method: 'DELETE',
        token,
      });
      onDeleted?.(msg.id);
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className={`chat-msg-row ${style.cls}`}>
      <div className="chat-msg-meta">
        <span className="chat-msg-label">{msg.author_label || style.label}</span>
        {msg.recipient && msg.role === 'student' ? (
          <span className="chat-recipient-chip">
            → {msg.recipient === 'both' ? '강사 + AI' : msg.recipient === 'llm' ? 'AI 코치' : '강사'}
          </span>
        ) : null}
        <span className="chat-msg-time">
          {msg.created_at
            ? new Date(msg.created_at).toLocaleString('ko-KR', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : ''}
        </span>
      </div>
      <div className="chat-msg-body">{msg.content}</div>
      {msg.deletable ? (
        <button
          type="button"
          className="chat-del-btn"
          onClick={del}
          disabled={deleting}
          title="메시지 삭제"
        >
          {deleting ? '...' : '삭제'}
        </button>
      ) : null}
    </div>
  );
}

export default function StrategyChatPanel({ workspaceId, token }) {
  const [recipient, setRecipient] = useState('llm');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const [clearingThread, setClearingThread] = useState(false);
  const { message: flashMsg, isError: flashIsError, flash, flashError } = useFlashMessage(4000);
  const bottomRef = useRef(null);

  const { loading, error } = useAsyncData(
    async () => {
      const res = await apiRequest('/frontend/student/strategy-chat', { token });
      setMessages(res.messages || []);
      setThreadId(res.thread?.id ?? null);
      return res;
    },
    [token]
  );

  const send = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    try {
      const res = await apiRequest('/frontend/student/strategy-chat/messages', {
        method: 'POST',
        token,
        body: { content: content.trim(), recipient, workspace_id: workspaceId },
      });
      // 내 메시지 + AI 응답 모두 추가
      const newMsgs = Array.isArray(res) ? res : [res];
      setMessages((prev) => [...(prev || []), ...newMsgs]);
      setContent('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      flashError(err.message || '전송 실패');
    } finally {
      setSending(false);
    }
  };

  const handleDeleted = (id) => setMessages((prev) => prev.filter((m) => m.id !== id));

  const clearThread = async () => {
    if (!threadId) return;
    if (!window.confirm('대화 전체를 삭제할까? 복구할 수 없어.')) return;
    setClearingThread(true);
    try {
      await apiRequest(`/frontend/student/strategy-chat/thread/${threadId}`, {
        method: 'DELETE',
        token,
      });
      setMessages([]);
      setThreadId(null);
      flash('대화를 삭제했어.');
    } catch (err) {
      flashError(err.message || '삭제 실패');
    } finally {
      setClearingThread(false);
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-panel-toolbar">
        <span className="muted small">강사 · AI 코치와 대화</span>
        {threadId ? (
          <button
            type="button"
            className="secondary-button compact"
            onClick={clearThread}
            disabled={clearingThread}
          >
            {clearingThread ? '삭제 중...' : '대화 전체 삭제'}
          </button>
        ) : null}
      </div>

      <div className="chat-messages-area">
        {loading ? <p className="muted small">대화 기록 불러오는 중...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {messages?.length === 0 ? (
          <p className="muted small chat-empty">
            아직 대화가 없어. AI 코치나 강사에게 먼저 말을 걸어봐.
          </p>
        ) : null}
        {(messages || []).map((msg) => (
          <ChatMessage key={msg.id} msg={msg} token={token} onDeleted={handleDeleted} />
        ))}
        <div ref={bottomRef} />
      </div>

      {flashMsg ? (
        <p className={flashIsError ? 'error-text' : 'muted small'} style={{ padding: '0 0.5rem' }}>
          {flashMsg}
        </p>
      ) : null}

      <form className="chat-input-form" onSubmit={send}>
        <div className="chat-recipient-row">
          {RECIPIENT_OPTS.map((opt) => (
            <label key={opt.value} className={`recipient-opt${recipient === opt.value ? ' active' : ''}`}>
              <input
                type="radio"
                name="recipient"
                value={opt.value}
                checked={recipient === opt.value}
                onChange={() => setRecipient(opt.value)}
                style={{ display: 'none' }}
              />
              {opt.label}
            </label>
          ))}
        </div>
        <div className="chat-input-row">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="메시지 입력..."
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); }
            }}
          />
          <button type="submit" disabled={sending || !content.trim()}>
            {sending ? '...' : '전송'}
          </button>
        </div>
      </form>
    </div>
  );
}
