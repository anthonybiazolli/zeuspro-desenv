"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutDashboard, MessageCircle, Settings, LogOut, Zap, Send, UserPlus, X, Search, Loader2, Check, CheckCheck, Ban } from 'lucide-react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialContactId = searchParams.get('contactId');

  const [socket, setSocket] = useState<Socket | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [modalTab, setModalTab] = useState<'manual' | 'device'>('manual');
  const [newChatName, setNewChatName] = useState('');
  const [newChatPhone, setNewChatPhone] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState<any[]>([]);
  const [isLoadingDeviceContacts, setIsLoadingDeviceContacts] = useState(false);
  const [deviceSearchTerm, setDeviceSearchTerm] = useState('');

  // 1. INICIALIZAÇÃO DO WEBSOCKET
  useEffect(() => {
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    newSocket.on('connect', () => console.log('🟢 Conectado ao Servidor em Tempo Real!'));
    
    newSocket.on('newMessage', (msg) => {
      setMessages((prevMessages) => {
        if (selectedContact && msg.contactId === selectedContact.id) {
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          return [...prevMessages, msg];
        }
        return prevMessages;
      });
      fetchContactsList();
    });

    // Escuta atualizações de Ticks (Lido/Entregue) e Mensagens Apagadas
    newSocket.on('messageUpdate', (updatedData) => {
      setMessages((prevMessages) => 
        prevMessages.map(m => m.id === updatedData.id ? { ...m, ...updatedData } : m)
      );
    });

    newSocket.on('contactUpdate', () => { fetchContactsList(); });

    return () => { newSocket.disconnect(); };
  }, [selectedContact]);

  const fetchContactsList = async () => {
    try {
      const res = await fetch('http://localhost:3000/whatsapp/contacts');
      const data = await res.json();
      if (Array.isArray(data)) {
         setContacts(data);
         if (initialContactId && !selectedContact) {
           const target = data.find((c: any) => c.id === initialContactId);
           if (target) setSelectedContact(target);
         }
      }
    } catch (error) { console.error("Erro ao buscar contatos:", error); }
  };

  useEffect(() => { fetchContactsList(); }, [initialContactId]);

  useEffect(() => {
    if (!selectedContact || !selectedContact.id) {
        setMessages([]);
        return;
    }
    const fetchMessages = async () => {
      try {
        const res = await fetch(`http://localhost:3000/whatsapp/messages/${selectedContact.id}`);
        if (res.ok) {
           const data = await res.json();
           setMessages(data);
           setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      } catch (error) { console.error("Erro ao buscar mensagens:", error); }
    };
    fetchMessages();
  }, [selectedContact]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedContact) return;
    const textToSend = inputText;
    setInputText('');
    try {
      await fetch('http://localhost:3000/whatsapp/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: 'ZeusPro_Master', number: selectedContact.phoneNumber, text: textToSend })
      });
    } catch (error) { console.error("Erro ao enviar mensagem:", error); }
  };

  const handleCreateContact = async (name: string, phone: string) => {
    if (!name || !phone) return;
    setIsCreatingChat(true);
    try {
      const res = await fetch('http://localhost:3000/whatsapp/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phoneNumber: phone }) });
      const newContact = await res.json();
      setShowNewChatModal(false); setNewChatName(''); setNewChatPhone(''); setSelectedContact(newContact);
      fetchContactsList();
    } catch (error) {} finally { setIsCreatingChat(false); }
  };

  const fetchDeviceContacts = async () => {
    setIsLoadingDeviceContacts(true);
    try {
      const res = await fetch('http://localhost:3000/whatsapp/device-contacts/ZeusPro_Master');
      const data = await res.json();
      setDeviceContacts(Array.isArray(data) ? data : []);
    } catch (error) {} finally { setIsLoadingDeviceContacts(false); }
  };

  useEffect(() => { if (modalTab === 'device' && deviceContacts.length === 0) fetchDeviceContacts(); }, [modalTab]);

  const handleLogout = () => { localStorage.removeItem('zeuspro_token'); router.push('/'); };
  const filteredDeviceContacts = deviceContacts.filter(c => c.name.toLowerCase().includes(deviceSearchTerm.toLowerCase()) || c.phoneNumber.includes(deviceSearchTerm));

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900 font-sans relative">
      
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-900">Nova Conversa</h3>
              <button onClick={() => setShowNewChatModal(false)} className="text-gray-400 hover:text-gray-600 transition"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="flex border-b border-gray-200 bg-white">
              <button onClick={() => setModalTab('manual')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${modalTab === 'manual' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Digitar Número</button>
              <button onClick={() => setModalTab('device')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${modalTab === 'device' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Contatos do Aparelho</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {modalTab === 'manual' ? (
                <form onSubmit={(e) => { e.preventDefault(); handleCreateContact(newChatName, newChatPhone); }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Lead</label>
                    <input type="text" required value={newChatName} onChange={(e) => setNewChatName(e.target.value)} placeholder="Ex: João da Silva" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número do WhatsApp</label>
                    <input type="text" required value={newChatPhone} onChange={(e) => setNewChatPhone(e.target.value)} placeholder="Ex: 5511999999999" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    <p className="text-[11px] text-gray-400 mt-1">Insira o código do país (55) + DDD + Número.</p>
                  </div>
                  <button type="submit" disabled={isCreatingChat} className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl transition mt-4">
                    {isCreatingChat ? 'Criando...' : 'Iniciar Conversa'}
                  </button>
                </form>
              ) : (
                <div className="flex flex-col h-full space-y-4">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input type="text" value={deviceSearchTerm} onChange={(e) => setDeviceSearchTerm(e.target.value)} placeholder="Buscar na agenda..." className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2 space-y-2 min-h-[200px]">
                    {isLoadingDeviceContacts ? (
                      <div className="flex flex-col items-center justify-center h-full text-brand-500"><Loader2 className="w-8 h-8 animate-spin mb-2" /><p className="text-sm font-medium">Lendo agenda...</p></div>
                    ) : filteredDeviceContacts.length > 0 ? (
                      filteredDeviceContacts.map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition">
                          <div className="min-w-0 pr-4">
                            <h4 className="font-semibold text-gray-900 text-sm truncate">{c.name}</h4>
                            <p className="text-xs text-gray-500 truncate font-mono">{c.phoneNumber}</p>
                          </div>
                          <button onClick={() => handleCreateContact(c.name, c.phoneNumber)} disabled={isCreatingChat} className="text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg text-xs font-bold transition flex-shrink-0">Chat</button>
                        </div>
                      ))
                    ) : (<div className="text-center text-gray-400 mt-10 text-sm">Nenhum contato encontrado.</div>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Menu Lateral Mini */}
      <aside className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 z-30 shadow-sm">
        <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white mb-8 shadow-lg shadow-brand-500/30"><Zap className="w-6 h-6" /></div>
        <nav className="flex-1 space-y-4">
          <Link href="/dashboard" className="w-12 h-12 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-50 hover:text-brand-600 transition" title="Dashboard"><LayoutDashboard className="w-6 h-6" /></Link>
          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-brand-50 text-brand-600 shadow-sm border border-brand-100" title="Chat IA"><MessageCircle className="w-6 h-6" /></div>
          <Link href="/dashboard/settings" className="w-12 h-12 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-50 hover:text-brand-600 transition" title="Ajustes"><Settings className="w-6 h-6" /></Link>
        </nav>
        <button onClick={handleLogout} className="w-12 h-12 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition" title="Sair"><LogOut className="w-6 h-6" /></button>
      </aside>

      {/* Lista de Contatos */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm relative z-20">
        <div className="p-5 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Conversas</h2>
            <p className="text-xs text-brand-600 mt-1 font-medium flex items-center"><span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse mr-2"></span>Integração IA Ativa</p>
          </div>
          <button onClick={() => setShowNewChatModal(true)} className="w-10 h-10 bg-gray-100 hover:bg-brand-50 hover:text-brand-600 text-gray-600 rounded-full flex items-center justify-center transition shadow-inner" title="Nova Conversa">
            <UserPlus className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {contacts.map(c => (
            <div key={c.id} onClick={() => setSelectedContact(c)} className={`flex items-center p-4 border-b border-gray-50 cursor-pointer transition-all duration-200 ${selectedContact?.id === c.id ? 'bg-brand-50/50 border-l-4 border-brand-500' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700 flex items-center justify-center mr-4 font-bold flex-shrink-0 shadow-sm border border-brand-100/50">
                 {c.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                   <h4 className="font-semibold text-gray-900 truncate pr-2">{c.name}</h4>
                   <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{c.aiSentimentScore} pts</span>
                </div>
                <p className="text-xs text-gray-500 truncate font-mono">{c.phoneNumber}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Área do Chat */}
      <div className="flex-1 flex flex-col bg-[#efeae2] relative bg-[url('https://i.pinimg.com/1200x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-repeat opacity-95">
        <div className="absolute inset-0 bg-white/80 z-0"></div>

        {selectedContact ? (
          <>
            <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 z-10 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mr-3 font-bold border border-brand-200">
                 {selectedContact.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{selectedContact.name}</h3>
                <p className="text-xs text-gray-500 font-medium">+{selectedContact.phoneNumber}</p>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 z-10 scroll-smooth">
              {messages.length === 0 ? (
                 <div className="flex items-center justify-center h-full"><div className="bg-white/90 backdrop-blur-sm px-6 py-3 rounded-2xl shadow-sm text-sm text-gray-500 font-medium">As mensagens aparecerão aqui. Envie a primeira mensagem!</div></div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={msg.id || idx} className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    
                    <div className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-md ${msg.isFromMe ? 'bg-brand-500 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'} ${msg.isDeleted ? 'opacity-80' : ''}`}>
                      
                      {msg.isDeleted ? (
                         <div className={`flex items-center gap-2 italic text-sm ${msg.isFromMe ? 'text-brand-100' : 'text-gray-400'}`}>
                           <Ban className="w-4 h-4" /> <span>Mensagem apagada</span>
                         </div>
                      ) : (
                         <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      )}

                      <div className={`text-[10px] mt-2 flex justify-end items-center space-x-1 font-medium ${msg.isFromMe ? 'text-brand-100' : 'text-gray-400'}`}>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        
                        {/* TICKS DE LEITURA (Só para mensagens enviadas por você que não foram apagadas) */}
                        {msg.isFromMe && !msg.isDeleted && (
                          <span className="flex items-center ml-1">
                            {msg.status === 'SENT' && <Check className="w-3 h-3" />}
                            {msg.status === 'DELIVERY_ACK' && <CheckCheck className="w-3 h-3" />}
                            {msg.status === 'READ' && <CheckCheck className="w-3 h-3 text-[#34b7f1]" />}
                          </span>
                        )}
                      </div>

                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} className="h-2" />
            </div>

            <footer className="bg-[#f0f2f5] p-4 flex items-center z-10 border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex-1 flex items-center bg-white rounded-xl overflow-hidden shadow-sm pl-4 pr-2 py-2 border border-gray-200 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
                <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Digite sua mensagem para o lead..." className="flex-1 bg-transparent border-none focus:outline-none text-[15px] text-gray-800 py-1" autoComplete="off" />
                <button type="submit" disabled={!inputText.trim()} className="p-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-all ml-2 active:scale-95"><Send className="w-5 h-5" /></button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center z-10 bg-white/50 backdrop-blur-sm m-4 rounded-3xl border border-white shadow-xl">
            <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mb-6 shadow-inner"><MessageCircle className="w-12 h-12 text-brand-400" /></div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">ZeusPro Web</h2>
            <p className="text-gray-500 max-w-sm mb-6">Selecione um lead ou clique em "+" para iniciar uma nova conversa.</p>
          </div>
        )}
      </div>
    </div>
  );
}