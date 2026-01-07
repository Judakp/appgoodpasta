
import React, { useState, useRef, useEffect } from 'react';
import { Department, Message, DetailedInfo } from './types';
import { geminiService } from './services/geminiService';
import { ChatMessage } from './components/ChatMessage';
import { DepartmentSelector } from './components/DepartmentSelector';

type AppLanguage = 'EN' | 'FR' | null;

const App: React.FC = () => {
  const [language, setLanguage] = useState<AppLanguage>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [department, setDepartment] = useState<Department | undefined>();
  const [showDeptSelect, setShowDeptSelect] = useState(true);
  const [activeDetails, setActiveDetails] = useState<DetailedInfo | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const initChat = (lang: 'EN' | 'FR') => {
    setLanguage(lang);
    const welcomeMsg = lang === 'EN' 
      ? "Hello! I'm your Coach Good Pasta. I'm here to support you with everything you need. Please select your department to begin."
      : "Bonjour ! Je suis votre Coach Good Pasta. Je suis là pour vous accompagner dans tout ce dont vous avez besoin. Veuillez sélectionner votre département pour commencer.";
    
    setMessages([{
      id: '1',
      role: 'model',
      content: welcomeMsg,
      timestamp: new Date(),
    }]);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading || !language) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await geminiService.chat(input, messages, department, language);
      const modelMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response || (language === 'EN' ? "Error. Please try again." : "Erreur. Veuillez réessayer."),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectDepartment = (dept: Department) => {
    setDepartment(dept);
    setShowDeptSelect(false);
    
    const introMsg = language === 'EN'
      ? `It's great to have you in ${dept}! I'm ready to help you excel. What can I do for you today?`
      : `C'est un plaisir de vous avoir en ${dept} ! Je suis prêt à vous aider à exceller. Que puis-je faire pour vous aujourd'hui ?`;
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'model',
      content: introMsg,
      timestamp: new Date()
    }]);
  };

  if (activeDetails) {
    return (
      <div className="h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <button 
            onClick={() => setActiveDetails(null)}
            className="flex items-center text-amber-600 font-bold text-sm hover:text-amber-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {language === 'EN' ? 'Back to Chat' : 'Retour au chat'}
          </button>
          <div className="font-racing text-xl text-slate-900 tracking-tighter italic">Good Pasta</div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 md:p-12">
          <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12">
            <h1 className="text-3xl font-bold text-slate-900 mb-6">{activeDetails.title}</h1>
            <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed space-y-4">
              <div className="whitespace-pre-wrap">{activeDetails.details}</div>
            </div>
            
            <div className="mt-12 pt-8 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">
                {language === 'EN' ? 'Contact Superior' : 'Contact Supérieur Hiérarchique'}
              </h3>
              <div className="bg-slate-50 rounded-2xl p-6 flex items-center gap-4 border border-slate-100">
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-slate-900">
                    {language === 'EN' ? 'Department Supervisor' : 'Superviseur de Département'}
                  </p>
                  <a href={`mailto:${activeDetails.contact}`} className="text-amber-600 hover:underline text-sm font-medium">
                    {activeDetails.contact}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!language) {
    return (
      <div className="h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 animate-fadeIn">
          <button 
            onClick={() => initChat('EN')}
            className="group bg-white p-10 rounded-3xl shadow-xl hover:shadow-2xl transition-all border-4 border-transparent hover:border-amber-500 text-left"
          >
            <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center font-racing text-white text-3xl mb-6 group-hover:scale-110 transition-transform shadow-lg">GP</div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">English</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">Access the Coach Good Pasta platform to support your journey with us.</p>
            <span className="inline-flex items-center px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm transition-all group-hover:bg-amber-600">
              Launch Application <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
            </span>
          </button>

          <button 
            onClick={() => initChat('FR')}
            className="group bg-white p-10 rounded-3xl shadow-xl hover:shadow-2xl transition-all border-4 border-transparent hover:border-amber-500 text-left"
          >
            <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center font-racing text-white text-3xl mb-6 group-hover:scale-110 transition-transform shadow-lg">GP</div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Français</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">Accédez à la plateforme Coach Good Pasta pour vous accompagner dans votre parcours.</p>
            <span className="inline-flex items-center px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm transition-all group-hover:bg-amber-600">
              Lancer l'application <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      <aside className="hidden lg:flex flex-col w-80 bg-slate-900 text-white p-6 shadow-2xl z-10">
        <div className="mb-12">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center font-racing text-xl shadow-inner">GP</div>
            <h1 className="font-racing text-2xl tracking-tighter uppercase italic">Good Pasta</h1>
          </div>
          <p className="text-amber-400 text-[10px] tracking-widest font-bold uppercase">
            {language === 'EN' ? 'Support & Excellence' : 'Soutien & Excellence'}
          </p>
        </div>

        <nav className="flex-1 space-y-8">
          <div>
            <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mb-4">
              {language === 'EN' ? 'Your Journey' : 'Votre Parcours'}
            </h3>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">{language === 'EN' ? 'Team' : 'Équipe'}</p>
              <p className="text-sm font-bold text-amber-400">{department || (language === 'EN' ? 'Starting...' : 'Départ...')}</p>
              <button 
                onClick={() => setShowDeptSelect(true)}
                className="mt-3 text-[10px] text-white underline hover:text-amber-500 transition-colors"
              >
                {language === 'EN' ? 'Change Dept' : 'Changer Dept'}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mb-4">
               {language === 'EN' ? 'Safety' : 'Sécurité'}
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-green-900/20 border border-green-900/30 rounded-lg text-[10px] text-green-200/70 leading-tight">
                {language === 'EN' ? 'We care for your health.' : 'Votre santé nous tient à cœur.'}
              </div>
              <div className="p-3 bg-blue-900/20 border border-blue-900/30 rounded-lg text-[10px] text-blue-200/70 leading-tight">
                {language === 'EN' ? 'Safety first, always.' : 'La sécurité d’abord, toujours.'}
              </div>
            </div>
          </div>
        </nav>

        <button 
          onClick={() => { setLanguage(null); setDepartment(undefined); setShowDeptSelect(true); setMessages([]); }}
          className="mt-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs transition-all font-bold"
        >
          {language === 'EN' ? 'Switch Language' : 'Changer de langue'}
        </button>
      </aside>

      <main className="flex-1 flex flex-col relative h-full">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex-1">
            <h2 className="font-bold text-slate-800 uppercase tracking-tight">Coach Good Pasta</h2>
            <div className="flex items-center text-[10px] text-amber-500 font-bold">
              <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
              {language === 'EN' ? 'READY TO HELP' : 'PRÊT À VOUS AIDER'}
            </div>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 bg-slate-50">
          {messages.map((msg) => (
            <ChatMessage 
              key={msg.id} 
              message={msg} 
              language={language} 
              onViewDetails={(info) => setActiveDetails(info)}
            />
          ))}
          {isLoading && (
            <div className="flex justify-start mb-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex space-x-2">
                <div className="w-2 h-2 bg-amber-200 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-amber-200 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-amber-200 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 bg-white border-t border-slate-200 shadow-lg">
          {showDeptSelect ? (
            <div className="max-w-3xl mx-auto space-y-4 animate-slideUp">
              <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {language === 'EN' ? 'Select Your Department' : 'Sélectionnez votre département'}
              </p>
              <DepartmentSelector selected={department} onSelect={selectDepartment} />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-3">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={language === 'EN' ? "Type your message..." : "Tapez votre message..."}
                  className="flex-1 bg-slate-100 border-none rounded-xl px-5 py-4 text-sm focus:ring-2 focus:ring-amber-400 outline-none transition-all shadow-inner disabled:opacity-50"
                />
                
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold p-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </form>
            </div>
          )}
          <div className="mt-3 text-center text-[9px] text-slate-400 font-medium uppercase tracking-widest">
            Good Pasta Toronto &copy; 2024
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
