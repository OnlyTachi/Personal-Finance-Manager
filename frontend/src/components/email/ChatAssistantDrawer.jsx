import React, { useState, useRef, useEffect } from "react";
import { emailAutomationService } from "@/services";
import { X, Send, Bot, User, Loader2, MessageSquareText } from "lucide-react";

export default function ChatAssistantDrawer({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Olá! Posso analisar suas faturas por e-mail ou tirar dúvidas financeiras. Como posso ajudar hoje?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // Chamada à API que engatilha o Tool Calling no LLM
      const response = await emailAutomationService.chatWithAssistant(
        userMsg.content,
      );

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.reply || response.message },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Desculpe, tive um problema de conexão com a matriz. Tente novamente.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-surface border-l border-slate-700 shadow-2xl z-[70] transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/20 p-2 rounded-lg border border-purple-500/30">
              <Bot className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">
                Assistente Financeiro
              </h3>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>{" "}
                Online
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Área de Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-slate-700 text-purple-400"}`}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
              <div
                className={`p-3 rounded-2xl max-w-[80%] text-sm ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm"}`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 flex-row">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
              </div>
              <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 rounded-tl-sm text-xs flex items-center gap-2">
                Processando ferramentas...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/50">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre seus e-mails..."
              className="w-full bg-slate-800 border border-slate-700 rounded-full py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-1.5 p-2 bg-purple-600 text-white rounded-full hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 transition-colors"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
