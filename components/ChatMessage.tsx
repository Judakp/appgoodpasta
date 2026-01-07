
import React from 'react';
import { Message, DetailedInfo } from '../types';

interface Props {
  message: Message;
  language: 'EN' | 'FR';
  onViewDetails: (info: DetailedInfo) => void;
}

export const ChatMessage: React.FC<Props> = ({ message, language, onViewDetails }) => {
  const isModel = message.role === 'model';

  // Parse for INFO format: [INFO] Title: ... | Details: ... | Contact: ...
  const infoMatch = message.content.match(/\[INFO\] Title: (.*?) \| Details: (.*?) \| Contact: (.*)/s);
  
  // Clean content if info block exists
  const displayContent = infoMatch 
    ? message.content.split('[INFO]')[0].trim() 
    : message.content;

  return (
    <div className={`flex ${isModel ? 'justify-start' : 'justify-end'} mb-6 animate-fadeIn`}>
      <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-4 ${
        isModel 
          ? 'bg-white border border-slate-200 text-slate-800 shadow-sm' 
          : 'bg-amber-600 text-white shadow-lg'
      }`}>
        {isModel && (
          <div className="flex items-center mb-2">
            <span className="font-racing text-amber-600 text-sm tracking-widest uppercase">Coach Good Pasta</span>
          </div>
        )}
        
        <div className="whitespace-pre-wrap leading-relaxed text-sm">
          {displayContent}
        </div>

        {infoMatch && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button 
              onClick={() => onViewDetails({
                title: infoMatch[1],
                details: infoMatch[2],
                contact: infoMatch[3]
              })}
              className="w-full py-2 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-lg hover:bg-amber-100 transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {language === 'EN' ? 'View Details' : 'Voir les détails'}
            </button>
          </div>
        )}
        
        <div className={`text-[10px] mt-2 opacity-50 ${isModel ? 'text-slate-500' : 'text-amber-100'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};
