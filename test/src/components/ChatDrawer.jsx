import React, { useState } from 'react';
import { 
  X, 
  Send, 
  User, 
  MessageSquare, 
  CheckCheck, 
  Sparkles, 
  MapPin 
} from 'lucide-react';
import { MOCK_CHATS } from '../data/mockData';

export default function ChatDrawer({ isOpen, onClose, activeItem }) {
  const [chats, setChats] = useState(MOCK_CHATS);
  const [selectedChatId, setSelectedChatId] = useState('chat-1');
  const [inputMsg, setInputMsg] = useState('');

  if (!isOpen) return null;

  const currentChat = chats.find(c => c.id === selectedChatId) || chats[0];

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: 'me',
      text: inputMsg,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChats(prev => prev.map(c => {
      if (c.id === currentChat.id) {
        return {
          ...c,
          messages: [...c.messages, newMsg]
        };
      }
      return c;
    }));

    setInputMsg('');

    // Simulate reply after 1.5 seconds
    setTimeout(() => {
      const autoReply = {
        id: Date.now() + 1,
        sender: 'them',
        text: 'Sounds great! I will be near the Central Library front entrance in 10 minutes.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChats(prev => prev.map(c => {
        if (c.id === currentChat.id) {
          return {
            ...c,
            messages: [...c.messages, autoReply]
          };
        }
        return c;
      }));
    }, 1500);
  };

  const handleQuickReply = (text) => {
    setInputMsg(text);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '420px',
      maxWidth: '90vw',
      background: 'rgba(11, 15, 25, 0.95)',
      backdropFilter: 'blur(20px)',
      borderLeft: '1px solid var(--border-light)',
      zIndex: 1100,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.7)',
      animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'var(--gradient-brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <MessageSquare size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>In-App Campus Chat</h3>
            <p style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
              Encrypted student communication
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            color: 'var(--text-secondary)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Thread selector tabs */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        gap: '8px',
        overflowX: 'auto'
      }}>
        {chats.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedChatId(c.id)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid',
              borderColor: selectedChatId === c.id ? 'var(--accent-cyan)' : 'var(--border-light)',
              background: selectedChatId === c.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: selectedChatId === c.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontSize: '0.775rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >
            {c.withUser}
          </button>
        ))}
      </div>

      {/* Active Conversation Details */}
      <div style={{
        padding: '12px 20px',
        background: 'rgba(19, 27, 46, 0.6)',
        borderBottom: '1px solid var(--border-light)',
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Sparkles size={14} color="var(--accent-cyan)" />
        <span style={{ fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentChat.itemTitle}
        </span>
      </div>

      {/* Messages Feed */}
      <div style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {currentChat.messages.map((m) => {
          const isMe = m.sender === 'me';
          return (
            <div 
              key={m.id}
              style={{
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                maxWidth: '82%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start'
              }}
            >
              <div style={{
                background: isMe ? 'var(--gradient-brand)' : 'rgba(23, 32, 54, 0.9)',
                color: '#ffffff',
                padding: '10px 14px',
                borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                border: isMe ? 'none' : '1px solid var(--border-light)',
                fontSize: '0.875rem',
                lineHeight: 1.4
              }}>
                {m.text}
              </div>
              <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                {m.time} {isMe && <CheckCheck size={12} color="var(--accent-cyan)" />}
              </span>
            </div>
          );
        })}
      </div>

      {/* Quick Replies */}
      <div style={{ padding: '8px 16px', display: 'flex', gap: '6px', overflowX: 'auto' }}>
        <button 
          onClick={() => handleQuickReply("Can we meet at Central Library?")}
          style={{
            fontSize: '0.725rem',
            padding: '4px 10px',
            borderRadius: '12px',
            border: '1px solid var(--border-light)',
            background: 'rgba(255, 255, 255, 0.04)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          📍 Meet at Central Library?
        </button>

        <button 
          onClick={() => handleQuickReply("I can confirm proof of ownership!")}
          style={{
            fontSize: '0.725rem',
            padding: '4px 10px',
            borderRadius: '12px',
            border: '1px solid var(--border-light)',
            background: 'rgba(255, 255, 255, 0.04)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          🔑 Proof of ownership
        </button>
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} style={{
        padding: '16px',
        borderTop: '1px solid var(--border-light)',
        display: 'flex',
        gap: '8px'
      }}>
        <input 
          type="text"
          placeholder="Type campus message..."
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          className="input-field"
          style={{ height: '42px', fontSize: '0.85rem' }}
        />
        <button type="submit" className="btn btn-primary" style={{ width: '42px', height: '42px', padding: 0, borderRadius: '12px' }}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
