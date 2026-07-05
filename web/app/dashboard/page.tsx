"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutDashboard, Users, MessageCircle, Settings, LogOut, Zap, QrCode, X, Loader2, CheckCircle2, Send, Maximize2 } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [showQrModal, setShowQrModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  
  const [connectionStatus, setConnectionStatus] = useState('Verificando...');
  const [contacts, setContacts] = useState<any[]>([]);

  // Estados do Chat Lateral
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      localStorage.setItem('zeuspro_token', tokenFromUrl);
      router.replace('/dashboard');
    }

    const token = localStorage.getItem('zeuspro_token');
    if (!token) router.push('/');
    else setIsAuthenticated(true);
  }, [searchParams, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let webhookConfigured = false;
    const fetchRealTimeData = async () => {
      try {
        const statusRes = await fetch('http://localhost:3000/whatsapp/status/ZeusPro_Master');
        const statusData = await statusRes.json();
        
        if (statusData?.instance?.state === 'open') {
          if (!webhookConfigured) {
            fetch('http://localhost:3000/whatsapp/webhook/force-config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ instanceName: 'ZeusPro_Master' })
            });
            webhookConfigured = true;
          }
          setConnectionStatus('Conectado');
          setShowQrModal(false);
        } else {
          setConnectionStatus('Desconectado');
          webhookConfigured = false;
        }

        const contactsRes = await fetch('http://localhost:3000/whatsapp/contacts');
        const contactsData = await contactsRes.json();
        setContacts(contactsData);

      } catch (error) {
        console.error("Erro no tempo real:", error);
      }
    };

    fetchRealTimeData();
    const intervalId = setInterval(fetchRealTimeData, 3000);
    return () => clearInterval(intervalId);
  }, [isAuthenticated]);

  // Busca mensagens do contato selecionado a cada 2s
  useEffect(() => {
    if (!selectedContact) return;
    const fetchMessages = async () => {
      const res = await fetch(`http://localhost:3000/whatsapp/messages/${selectedContact.id}`);
      const data = await res.json();
      setMessages(data);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    fetchMessages();
    const intervalId = setInterval(fetchMessages, 2000);
    return () => clearInterval(intervalId);
  }, [selectedContact]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedContact) return;
    
    const textToSend = inputText;
    setInputText(''); // Limpa o input imediatamente

    try {
      await fetch('http://localhost:3000/whatsapp/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          instanceName: 'ZeusPro_Master', 
          number: selectedContact.phoneNumber, 
          text: textToSend 
        })
      });
      // A atualização da tela ocorrerá no próximo ciclo do setInterval
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('zeuspro_token');
    router.push('/');
  };

  const handleGenerateQR = async () => {
    setShowQrModal(true);
    setIsGenerating(true);
    setQrCodeBase64(null);
    try {
      const res = await fetch('http://localhost:3000/whatsapp/instance/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: 'ZeusPro_Master' })
      });
      const data = await res.json();
      if (data?.qrcode?.base64) setQrCodeBase64(data.qrcode.base64);
    } catch (error) {
      console.error("Erro gerando QR Code", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 relative overflow-hidden">
      
      {/* --- ABA LATERAL DO CHAT (SLIDE-OVER) --- */}
      <div className={`fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out flex flex-col border-l border-gray-200 ${selectedContact ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedContact && (
          <>
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mr-3 font-bold">
                  {selectedContact.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedContact.name}</h3>
                  <p className="text-xs text-gray-500">{selectedContact.phoneNumber}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Link href={`/dashboard/chat?contactId=${selectedContact.id}`} className="p-2 text-gray-400 hover:text-brand-600 transition" title="Tela Cheia">
                  <Maximize2 className="w-5 h-5" />
                </Link>
                <button onClick={() => setSelectedContact(null)} className="p-2 text-gray-400 hover:text-red-500 transition">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg, idx) => (
                <div key={msg.id || idx} className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${msg.isFromMe ? 'bg-brand-500 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'}`}>
                    {msg.text}
                    <div className={`text-[10px] mt-1 text-right ${msg.isFromMe ? 'text-brand-100' : 'text-gray-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-100 bg-white">
              <form onSubmit={handleSendMessage} className="flex items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-l-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                />
                <button type="submit" disabled={!inputText.trim()} className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-r-xl px-4 py-3 transition">
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Modal QR Code (Omitido para economizar espaço aqui, mas idêntico ao anterior) */}
      {showQrModal && connectionStatus !== 'Conectado' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
            <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8 text-brand-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Conecte seu Aparelho</h3>
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-4 flex items-center justify-center min-h-[250px] mt-4">
                {isGenerating ? <Loader2 className="w-10 h-10 animate-spin text-brand-500" /> : qrCodeBase64 ? <img src={qrCodeBase64} alt="QR Code" className="w-full max-w-[200px] h-auto rounded-lg" /> : <span className="text-red-500">Falha ao carregar.</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col z-10">
        <div className="p-6 flex items-center text-xl font-bold text-gray-900">
          <Zap className="w-6 h-6 text-brand-500 mr-2" /> ZeusPro
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <Link href="/dashboard" className="flex items-center px-4 py-3 bg-brand-50 text-brand-600 rounded-xl font-medium">
            <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
          </Link>
          <Link href="/dashboard/chat" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition">
            <MessageCircle className="w-5 h-5 mr-3" /> Chat IA (Tela Cheia)
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-gray-600 hover:text-red-600 font-medium">
            <LogOut className="w-5 h-5 mr-3" /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Visão Geral</h1>
          <p className="text-gray-500 mt-1">Seu painel de inteligência artificial.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm font-medium mb-1">Leads Capturados</div>
            <div className="text-3xl font-bold text-gray-900">{contacts.length}</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm font-medium mb-1">Score Médio</div>
            <div className="text-3xl font-bold text-brand-600">
              {contacts.length > 0 ? Math.round(contacts.reduce((a, b) => a + (b.aiSentimentScore || 0), 0) / contacts.length) : 0}
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm font-medium mb-1">Status da Instância</div>
            <div className={`text-lg font-bold flex items-center mt-1 ${connectionStatus === 'Conectado' ? 'text-brand-500' : 'text-red-500'}`}>
              <span className={`w-2.5 h-2.5 rounded-full mr-2 ${connectionStatus === 'Conectado' ? 'bg-brand-500 animate-pulse' : 'bg-red-500'}`}></span>
              {connectionStatus}
            </div>
          </div>
        </div>
        
        {connectionStatus === 'Conectado' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Leads Recentes (CRM)</h2>
              <span className="text-xs font-medium bg-brand-100 text-brand-700 px-3 py-1 rounded-full">{contacts.length} contatos ativos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-gray-400 text-sm border-b border-gray-100 bg-white">
                    <th className="px-6 py-4 font-medium">Nome do Lead</th>
                    <th className="px-6 py-4 font-medium">WhatsApp</th>
                    <th className="px-6 py-4 font-medium">Termômetro IA</th>
                    <th className="px-6 py-4 font-medium">Data de Captura</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.length > 0 ? contacts.map(c => (
                    <tr 
                      key={c.id} 
                      onClick={() => setSelectedContact(c)}
                      className="border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 flex items-center">
                         <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mr-3 font-bold text-xs">
                           {c.name.substring(0, 2).toUpperCase()}
                         </div>
                         {c.name}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{c.phoneNumber}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          c.aiSentimentScore > 70 ? 'bg-green-100 text-green-700' : 
                          c.aiSentimentScore > 30 ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {c.aiSentimentScore} pts
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                         <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                         <p className="text-gray-500 font-medium">Nenhum lead capturado ainda.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                 <CheckCircle2 className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Tudo pronto!</h2>
              <button onClick={handleGenerateQR} className="bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-8 rounded-xl shadow-lg transition hover:scale-105">
                Gerar QR Code de Conexão
              </button>
          </div>
        )}
      </main>
    </div>
  );
}