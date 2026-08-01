import React, { useState } from "react";
import ChatAssistantDrawer from "./ChatAssistantDrawer";
import { Bot, Sparkles, MessageSquareText } from "lucide-react";

export default function FloatingChatWidget() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
        <div
          className={`pointer-events-auto bg-slate-900/95 border border-purple-500/30 p-4 rounded-2xl shadow-2xl backdrop-blur-md w-72 transform transition-all duration-300 ease-out origin-bottom-right ${
            isHovered && !isDrawerOpen
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-90 translate-y-4 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Assistente IA
            </span>
            <span className="ml-auto flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Precisa de ajuda em algo?
          </p>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-400 uppercase tracking-widest">
            <MessageSquareText className="w-3.5 h-3.5" />
            Clique para conversar
          </div>
        </div>

        <button
          onClick={() => setIsDrawerOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="pointer-events-auto group relative p-4 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-full shadow-2xl shadow-purple-900/50 transition-all duration-300 hover:scale-110 active:scale-95 border border-purple-400/30 flex items-center justify-center"
          title="Abrir Assistente Financeiro"
        >
          <span className="absolute inset-0 rounded-full bg-purple-500/40 blur-md group-hover:blur-lg transition-all -z-10"></span>

          <Bot className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
        </button>
      </div>

      <ChatAssistantDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
}
