import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { useStore } from '../store';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  action?: {
     type: 'call';
     label: string;
     phone: string;
  };
}

export default function Chatbot() {
  const { user } = useStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Namaste ${user?.name?.split(' ')[0] || ''}! I'm Saathi, your caring AI companion. How can I help you today?`,
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    
    try {
      const res = await api.post('/ai/chat', {
        message: input,
        conversationHistory: messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
      });
      
      const reply = res.data.data.reply || "I'm here for you.";
      
      // Auto-detect calling intent for demo
      let action: any = undefined;
      const lowerInput = input.toLowerCase();
      if (lowerInput.includes('son') || lowerInput.includes('miss') || lowerInput.includes('call')) {
          action = {
              type: 'call',
              label: 'Call Son',
              phone: '+1 (555) 012-7890' // Realistic demo number
          };
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: reply,
        sender: 'bot',
        timestamp: new Date(),
        action
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error('Chatbot error', err);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "I'm having a little trouble connecting right now. Please try again in a moment.",
        sender: 'bot',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen max-h-screen bg-warm-50 pb-[88px] overflow-hidden">
      <div className="bg-white px-6 py-5 border-b border-warm-100 shadow-sm relative z-10 flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-100/60 rounded-2xl flex items-center justify-center border-2 border-blue-50">
           <Bot className="w-7 h-7 text-blue-600" />
        </div>
        <div>
           <h2 className="text-xl font-bold text-gray-900 tracking-tight">Saathi</h2>
           <p className="text-[13px] text-gray-500 font-medium">Your 24/7 Companion ✨</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'bot' && (
               <div className="w-8 shrink-0 mr-3 mt-1 flex justify-center">
                  <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shadow-sm">
                     <Bot className="w-4 h-4 text-blue-500" />
                  </div>
               </div>
            )}
            
            <div className={`max-w-[75%] px-5 py-4 shadow-sm ${
              msg.sender === 'user' 
                ? 'bg-gradient-to-br from-warm-500 to-warm-600 text-white rounded-[24px] rounded-br-[8px]' 
                : 'bg-white border border-warm-100/50 text-gray-900 rounded-[24px] rounded-bl-[8px]'
            }`}>
              <p className="text-[16px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              
              {msg.action?.type === 'call' && (
                <motion.a
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  href={`tel:${msg.action.phone}`}
                  className="mt-4 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
                >
                  <Phone className="w-5 h-5 fill-current" />
                  {msg.action.label}
                </motion.a>
              )}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="w-8 shrink-0 mr-3 mt-1 flex justify-center">
                  <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shadow-sm">
                     <Bot className="w-4 h-4 text-blue-500" />
                  </div>
             </div>
            <div className="bg-white rounded-[24px] rounded-bl-[8px] px-5 py-4 shadow-sm border border-warm-100/50 flex items-center h-12">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-warm-300 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-warm-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-warm-500 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>
      
      <div className="bg-white p-4 border-t border-warm-100 z-10">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask me anything..."
            className="flex-1 bg-warm-50/70 border border-warm-100 rounded-full py-3.5 px-6 text-[16px] font-medium focus:outline-none focus:bg-white focus:border-warm-400 transition-colors shadow-inner"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-12 h-12 flex shrink-0 items-center justify-center bg-warm-500 hover:bg-warm-600 transition-colors text-white rounded-full shadow-lg shadow-warm-500/30 disabled:opacity-50 disabled:shadow-none translate-y-[1px] active:scale-95"
          >
            <Send className="w-5 h-5 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
