"use client";
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutDashboard, Users, MessageCircle, Settings, LogOut, Zap, QrCode, X, Loader2, CheckCircle2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [showQrModal, setShowQrModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  
  // Novos Estados
  const [connectionStatus, setConnectionStatus] = useState('Verificando...');
  const [contacts, setContacts] = useState<any[]>([]);

  // 1. Efeito de Autenticação e Captura do Token
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      localStorage.setItem('zeuspro_token', tokenFromUrl);
      router.replace('/dashboard');
    }

    const token = localStorage.getItem('zeuspro_token');
    if (!token) {
      router.push('/');
    } else {
      setIsAuthenticated(true);
    }
  }, [searchParams, router]);

  // 2. Polling em Tempo Real (Status, CRM e Gatilho do Webhook)
  useEffect(() => {
    if (!isAuthenticated) return;

    let webhookConfigured = false; // Controle para forçar o webhook 1 vez só

    const fetchRealTimeData = async () => {
      try {
        // A. Checa Status
        const statusRes = await fetch('http://localhost:3000/whatsapp/status/ZeusPro_Master');
        const statusData = await statusRes.json();
        
        if (statusData?.instance?.state === 'open') {
          // --- MAGIA: Se conectou, força a configuração da Evolution API silenciosamente ---
          if (!webhookConfigured) {
            fetch('http://localhost:3000/whatsapp/webhook/force-config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ instanceName: 'ZeusPro_Master' })
            });
            webhookConfigured = true;
          }
          
          setConnectionStatus('Conectado');
          setShowQrModal(false); // Fecha o modal se estiver aberto e conectar
        } else {
          setConnectionStatus('Desconectado');
          webhookConfigured = false; // Reseta se cair a conexão
        }

        // B. Busca Leads do CRM
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instanceName: 'ZeusPro_Master' })
      });
      const data = await res.json();
      if (data?.qrcode?.base64) {
        setQrCodeBase64(data.qrcode.base64);
      }
    } catch (error) {
      console.error("Erro gerando QR Code", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isAuthenticated) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-pulse text-brand-500 flex items-center text-lg font-semibold">
          <Zap className="w-6 h-6 mr-2" /> Carregando o ZeusPro...
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 relative">
      
      {/* Modal QR Code */}
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
              <p className="text-gray-500 mb-6 text-sm">Escaneie o código abaixo no seu WhatsApp.</p>
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-4 flex items-center justify-center min-h-[250px]">
                {isGenerating ? (
                  <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
                ) : qrCodeBase64 ? (
                  <img src={qrCodeBase64} alt="QR Code" className="w-full max-w-[200px] h-auto rounded-lg" />
                ) : (
                  <span className="text-red-500">Falha ao carregar.</span>
                )}
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
          <a href="#" className="flex items-center px-4 py-3 bg-brand-50 text-brand-600 rounded-xl font-medium">
            <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
          </a>
          <a href="#" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl font-medium">
            <Users className="w-5 h-5 mr-3" /> CRM & Leads
          </a>
          <a href="#" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition">
            <MessageCircle className="w-5 h-5 mr-3" /> Chat IA
          </a>
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
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer">
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
                         <p className="text-sm text-gray-400 mt-1">Mande uma mensagem para o seu número conectado para ver a IA em ação!</p>
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
              <p className="text-gray-500 mb-8 max-w-md mx-auto text-lg">
                Seu ambiente já está configurado. O próximo passo é escanear o QR Code para que a IA do ZeusPro assuma o controle.
              </p>
              <button 
                onClick={handleGenerateQR}
                className="bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-8 rounded-xl shadow-lg shadow-brand-500/30 transition hover:scale-105"
              >
                Gerar QR Code de Conexão
              </button>
          </div>
        )}
      </main>
    </div>
  );
}