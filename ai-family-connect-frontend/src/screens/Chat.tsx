import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { Send, Image, LayoutGrid, Ghost } from 'lucide-react';
import { motion } from 'framer-motion';
import { getSocket } from '../lib/socket';
import api from '../lib/api';

interface Message {
  _id: string;
  senderId: { _id: string; firstName: string; lastName: string; avatar?: string };
  content: string;
  messageType: 'text' | 'image' | 'voice';
  mediaUrl?: string;
  createdAt: string;
}

export default function Chat() {
  const { user } = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

  useEffect(() => {
    const mockFamilyId = 'demo-family-id';
    setFamilyId(mockFamilyId);
    
    fetchMessages(mockFamilyId);
    
    if (socket) {
      socket.on('chat:message', (msg: Message) => {
        setMessages(prev => [...prev, msg]);
      });
      socket.emit('chat:join', { familyId: mockFamilyId });
    }
    
    return () => {
      if (socket) {
        socket.off('chat:message');
      }
    };
  }, [socket]);

  const fetchMessages = async (fid: string) => {
    try {
      const res = await api.get(`/chat/${fid}/history`);
      setMessages(res.data?.data?.messages || []);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = () => {
    if (!input.trim() || !familyId || !socket) return;
    
    socket.emit('chat:send', {
      familyId,
      content: input.trim(),
      messageType: 'text',
    });
    
    // Optimistic UI update could go here, but for now just clear input
    setInput('');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  return (
    <div className="flex flex-col h-screen max-h-screen bg-warm-50 pb-[88px] overflow-hidden">
      <div className="bg-white px-6 py-5 border-b border-warm-100 shadow-sm relative z-10 flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center border-2 border-emerald-50">
           <span className="text-xl">👨‍👩‍👧‍👦</span>
        </div>
        <div>
           <h2 className="text-xl font-bold text-gray-900 tracking-tight">Family Circle</h2>
           <p className="text-[13px] text-gray-500 font-medium">Always connected ❤️</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {loading ? (
           <div className="flex flex-col items-center justify-center py-20 space-y-3">
             <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-8 h-8 border-4 border-warm-200 border-t-warm-500 rounded-full" />
           </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
             <Ghost className="w-12 h-12 mb-3 opacity-20" />
             <p className="font-medium">Say hello to your family!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.senderId._id === user?.id;
            const isConsecutive = index > 0 && messages[index - 1].senderId._id === msg.senderId._id;
            
            return (
              <motion.div
                key={msg._id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'} ${isConsecutive ? '-mt-2' : ''}`}
              >
                {!isOwn && !isConsecutive && (
                   <div className="w-8 h-8 bg-emerald-100 rounded-full mr-2 self-end mb-1 flex items-center justify-center text-emerald-600 text-[10px] font-bold shadow-sm">
                      {msg.senderId.firstName?.charAt(0) || '?'}
                   </div>
                )}
                {(!isOwn && isConsecutive) && <div className="w-8 mr-2" />}

                <div className={`max-w-[75%] px-5 py-3.5 shadow-sm ${
                   isOwn 
                     ? 'bg-gradient-to-br from-warm-500 to-warm-600 text-white rounded-[24px] rounded-br-[8px]' 
                     : 'bg-white border border-warm-100/50 text-gray-900 rounded-[24px] rounded-bl-[8px]'
                }`}>
                  {!isOwn && !isConsecutive && (
                    <p className="text-[12px] font-bold text-warm-600 mb-1">
                      {msg.senderId.firstName} {msg.senderId.lastName}
                    </p>
                  )}
                  <p className="text-[16px] leading-[1.4] whitespace-pre-wrap word-break">{msg.content}</p>
                  <p className={`text-[10px] font-medium text-right mt-1.5 ${isOwn ? 'text-warm-100' : 'text-gray-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>
      
      <div className="bg-white p-4 border-t border-warm-100 z-10">
        <div className="flex items-center gap-3">
          <button className="w-12 h-12 flex shrink-0 items-center justify-center bg-warm-50 hover:bg-warm-100 rounded-full text-gray-500 transition-colors">
            <LayoutGrid className="w-6 h-6" />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="w-full bg-warm-50/70 border border-warm-100 rounded-full py-3.5 pl-5 pr-14 text-[16px] font-medium focus:outline-none focus:bg-white focus:border-warm-400 transition-colors"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600">
               <Image className="w-6 h-6" />
            </button>
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-12 h-12 flex shrink-0 items-center justify-center bg-warm-500 hover:bg-warm-600 transition-colors text-white rounded-full shadow-lg shadow-warm-500/30 disabled:opacity-50 disabled:shadow-none translate-y-[1px] active:scale-95"
          >
            <Send className="w-5 h-5 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
