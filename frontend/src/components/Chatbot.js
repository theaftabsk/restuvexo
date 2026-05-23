"use client";

import { useState, useEffect, useRef } from "react";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [userName, setUserName] = useState("Owner");
  const [activeTab, setActiveTab] = useState("chat"); // 'chat' | 'history'
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const chatEndRef = useRef(null);
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // Initial welcome message and sessionStorage restoration
  useEffect(() => {
    // Read user name from local storage
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const userObj = JSON.parse(storedUser);
          if (userObj.name) {
            setUserName(userObj.name);
          }
        } catch (e) {}
      }
    }

    let hasRestored = false;
    if (typeof window !== "undefined") {
      const savedOpen = sessionStorage.getItem("vexoai_isOpen");
      if (savedOpen === "true") {
        setIsOpen(true);
      }

      const savedMessages = sessionStorage.getItem("vexoai_messages");
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          setMessages(parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
          hasRestored = true;
        } catch (e) {
          console.error("Failed to parse saved messages", e);
        }
      }
    }

    if (!hasRestored) {
      setMessages([]);
    }

    // Setup speech recognition
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "bn-BD"; 

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInputText(transcript);
            handleSend(transcript);
          }
        };

        rec.onerror = (e) => {
          console.error("Speech recognition error", e);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        setRecognition(rec);
      }
    }
  }, []);

  // Listen for open/toggle custom events from the layout header
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleToggle = () => setIsOpen(prev => !prev);
    
    window.addEventListener("vexoai_open", handleOpen);
    window.addEventListener("vexoai_toggle", handleToggle);
    
    return () => {
      window.removeEventListener("vexoai_open", handleOpen);
      window.removeEventListener("vexoai_toggle", handleToggle);
    };
  }, []);

  // Save isOpen state to sessionStorage when changed
  useEffect(() => {
    sessionStorage.setItem("vexoai_isOpen", isOpen ? "true" : "false");
  }, [isOpen]);

  // Save messages to sessionStorage when changed
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem("vexoai_messages", JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom of chat when new message is added
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  const toggleVoiceInput = () => {
    if (!recognition) {
      alert("Voice input is not supported in this browser. Please use Google Chrome.");
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      recognition.lang = "bn-BD"; 
      recognition.start();
    }
  };

  const handleSuggestionClick = (text) => {
    handleSend(text);
  };

  const handleSend = async (textToSend = inputText) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    // Add user message to log
    const userMsg = {
      sender: "user",
      text: trimmed,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    const token = localStorage.getItem("authToken");

    try {
      const response = await fetch(`${BACKEND_URL}/api/chatbot/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: trimmed,
          history: messages.map(m => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text
          }))
        })
      });

      if (!response.ok) {
        throw new Error("Chat request failed.");
      }

      const data = await response.json();
      
      setIsTyping(false);

      // Add bot response to log
      setMessages(prev => [...prev, {
        sender: "bot",
        text: data.text,
        timestamp: new Date(),
        action: data.action,
        actionExecuted: false,
        actionCancelled: false
      }]);

    } catch (err) {
      console.error(err);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        sender: "bot",
        text: "দুঃখিত, কোনো টেকনিক্যাল সমস্যার কারণে আমি উত্তর দিতে পারছি না। অনুগ্রহ করে আবার চেষ্টা করুন বা ইন্টারনেট কানেকশন চেক করুন।",
        timestamp: new Date()
      }]);
    }
  };

  const confirmAction = (msgIndex) => {
    setMessages(prev => {
      const updated = [...prev];
      const msg = updated[msgIndex];
      if (msg && msg.action) {
        msg.actionExecuted = true;
        handleAiAction(msg.action);
      }
      return updated;
    });
  };

  const cancelAction = (msgIndex) => {
    setMessages(prev => {
      const updated = [...prev];
      const msg = updated[msgIndex];
      if (msg && msg.action) {
        msg.actionCancelled = true;
      }
      return updated;
    });
  };

  const handleAiAction = (action) => {
    if (!action) return;

    if (action.type === "redirect" && action.path) {
      window.location.href = action.path;
    } else if (action.type === "print" && action.orderId) {
      window.location.href = action.path || `/dashboard/orders?print=${action.orderId}`;
    }
  };

  // Simple Markdown text renderer helper
  const renderMessageText = (text) => {
    if (!text) return "";
    
    const lines = text.split("\n");
    return lines.map((line, index) => {
      let content = line;

      const isBullet = content.startsWith("- ") || content.startsWith("* ");
      if (isBullet) {
        content = content.substring(2);
      }

      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(content.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-extrabold text-slate-900 dark:text-white">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex));
      }

      if (isBullet) {
        return (
          <li key={index} className="ml-4 list-disc text-xs leading-relaxed mt-1 text-slate-700 dark:text-slate-350">
            {parts.length > 0 ? parts : content}
          </li>
        );
      }

      return (
        <p key={index} className="text-xs leading-relaxed min-h-[1rem] mt-1.5 first:mt-0 text-slate-700 dark:text-slate-300">
          {parts.length > 0 ? parts : content}
        </p>
      );
    });
  };

  const clearChatHistory = () => {
    setShowClearConfirm(true);
  };

  const handleClearHistory = () => {
    setMessages([]);
    sessionStorage.removeItem("vexoai_messages");
    setShowClearConfirm(false);
  };

  // Check if we show the welcome home screen or the conversation logs
  const showWelcomeScreen = messages.length === 0;

  return (
    <>
      {/* Drawer Overlay Backdrop */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-40 transition-opacity duration-300"
        />
      )}

      {/* Custom Clear Chat History Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[60] flex items-center justify-center p-6 animate-fade-in text-left">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                চ্যাট হিস্ট্রি মুছে ফেলবেন?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                আপনি কি নিশ্চিত যে আপনি চ্যাট হিস্ট্রি মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleClearHistory}
                className="flex-1 py-2.5 bg-gradient-to-r from-[#ff5722] via-[#e11d48] to-[#ec4899] text-white text-xs font-black uppercase tracking-wider rounded-xl hover:brightness-105 active:scale-95 transition shadow-sm shadow-orange-500/10 cursor-pointer border-none outline-none"
              >
                Yes, Clear (হ্যাঁ)
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition cursor-pointer border border-slate-200/50 dark:border-slate-800"
              >
                Cancel (না)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hostinger hPanel style Right Side Drawer */}
      <div className={`fixed right-0 top-0 h-full w-[400px] bg-white dark:bg-slate-950 border-l border-slate-100 dark:border-slate-900 z-50 flex flex-col justify-between shadow-2xl transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Drawer Header Panel */}
        <header className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-900 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-base">VexoAI</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mt-0.5" />
            </div>

            <div className="flex items-center gap-3">
              {/* Reset History Button */}
              {messages.length > 0 && (
                <button
                  onClick={clearChatHistory}
                  className="p-1 text-slate-400 hover:text-rose-500 rounded transition cursor-pointer"
                  title="Clear history"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              {/* Close Drawer Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 flex items-center justify-center transition cursor-pointer"
                title="Close drawer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Navigation Tabs (Chat / History) */}
          <div className="flex gap-4 mt-4 border-b border-slate-100 dark:border-slate-900 pb-1 text-xs font-black uppercase tracking-wider">
            <button 
              onClick={() => setActiveTab("chat")}
              className={`pb-2 transition cursor-pointer ${activeTab === 'chat' ? 'text-[#ff5722] border-b-2 border-[#ff5722]' : 'text-slate-400 hover:text-slate-650'}`}
            >
              Chat
            </button>
            <button 
              onClick={() => {
                setActiveTab("history");
                window.dispatchEvent(new CustomEvent("vexoai_open"));
              }}
              className={`pb-2 transition cursor-pointer ${activeTab === 'history' ? 'text-[#ff5722] border-b-2 border-[#ff5722]' : 'text-slate-400 hover:text-slate-650'}`}
            >
              History ({messages.length})
            </button>
          </div>
        </header>

        {/* Drawer Body Scroll Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 bg-slate-50/40 dark:bg-slate-900/10 scrollbar-thin">
          
          {showWelcomeScreen ? (
            /* Hostinger style Welcome Home Screen */
            <div className="space-y-6 animate-fade-in flex flex-col justify-center min-h-[60%] text-left">
              <div className="space-y-2">
                {/* Sunset Sparkle Logo */}
                <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-tr from-[#ff5722] via-[#e11d48] to-[#ec4899] flex items-center justify-center shadow-lg shadow-orange-500/10 mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.904-4.137m-8.904 0L21 9.813M9.813 15.904L3 9.096m0 0L14.187 3m-11.09 6.096L9 21m0-12.096l8.904 4.137M21 9.813l-6.813 6.813M12 3v1m0 16v1m9-9h-1M4 12H3" />
                  </svg>
                </div>
                
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                  Hello {userName} 👋
                </h2>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                  How can I help you today?
                </p>
              </div>

              {/* Hostinger-style Quick Action Lists with Arrow Hover */}
              <div className="space-y-2.5">
                {[
                  { q: "আজকের sales কত?", label: "আজকের বিক্রির হিসাব দেখুন" },
                  { q: "Kitchen panel কোথায়?", label: "রান্নাঘর (KDS) প্যানেল ওপেন করুন" },
                  { q: "Order কিভাবে add করব?", label: "নতুন খাবার বা অর্ডার অ্যাড করার নিয়ম" },
                  { q: "Printer কানেক্ট হচ্ছে না কেন?", label: "থার্মাল প্রিন্টার ট্রাবলশুট গাইড" }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(item.q)}
                    className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl flex items-center justify-between hover:border-[#ff5722] dark:hover:border-[#ff5722] transition duration-300 shadow-sm hover:shadow group text-left cursor-pointer"
                  >
                    <div>
                      <p className="text-[10px] font-black text-slate-400 group-hover:text-[#ff5722] dark:group-hover:text-[#ff7a47] uppercase tracking-widest leading-none">{item.q}</p>
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-1.5 leading-none">{item.label}</p>
                    </div>
                    <span className="text-slate-350 group-hover:text-[#ff5722] dark:group-hover:text-[#ff7a47] group-hover:translate-x-1.5 transition duration-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </span>
                  </button>
                ))}
              </div>

              {/* Category pills */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-900/60">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Quick Topics</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { c: "POS Billing", q: "POS Billing screen-এ কীভাবে অর্ডার নেব?" },
                    { c: "KDS Panel", q: "রান্নাঘর বা KDS প্যানেল কীভাবে ব্যবহার করব?" },
                    { c: "Orders", q: "অর্ডার ম্যানেজার পেজে কী কী করা যায়?" },
                    { c: "Inventory", q: "ইনভেন্টরি এবং কাঁচামাল কীভাবে কন্ট্রোল করব?" },
                    { c: "Settings", q: "সেটিংস কীভাবে কনফিগার করব?" }
                  ].map((cat, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(cat.q)}
                      className="px-3.5 py-2 bg-slate-100/65 dark:bg-slate-900 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-full border border-slate-200/50 dark:border-slate-800 text-[10px] font-black text-slate-650 dark:text-slate-300 hover:text-[#ff5722] dark:hover:text-[#ff7a47] hover:border-orange-200 dark:hover:border-orange-900/40 transition duration-200 cursor-pointer"
                    >
                      {cat.c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Chat Conversation Logs Logs List */
            <div className="space-y-4">
              {messages.map((msg, idx) => {
                const isBot = msg.sender === "bot";
                return (
                  <div key={idx} className={`flex ${isBot ? 'justify-start' : 'justify-end'} animate-fade-in`}>
                    <div className={`max-w-[85%] rounded-[1.8rem] px-5 py-3.5 shadow-sm border ${
                      isBot
                        ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-850 text-slate-800 dark:text-slate-200 rounded-bl-sm'
                        : 'bg-gradient-to-r from-[#ff5722] via-[#e11d48] to-[#ec4899] border-transparent text-white rounded-br-sm shadow-orange-500/10'
                    }`}>
                      <div className="space-y-1.5 break-words">
                        {isBot ? renderMessageText(msg.text) : <p className="text-xs leading-relaxed">{msg.text}</p>}
                      </div>

                      {/* Action buttons if request is pending */}
                      {isBot && msg.action && !msg.actionExecuted && !msg.actionCancelled && (
                        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                          <p className="text-[10px] font-black text-[#ff5722] uppercase tracking-widest leading-none">VexoAI Action Request</p>
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-350 leading-tight">
                            {msg.action.type === 'redirect' ? 'ন্যাভিগেশন কনফার্ম করুন' : 'প্রিন্ট কনফার্ম করুন'}
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => confirmAction(idx)}
                              className="px-3.5 py-2 bg-gradient-to-r from-[#ff5722] via-[#e11d48] to-[#ec4899] text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:brightness-105 active:scale-95 transition cursor-pointer shadow-sm shadow-orange-500/10"
                            >
                              Allow (হ্যাঁ)
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelAction(idx)}
                              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition cursor-pointer border border-slate-200/50 dark:border-slate-800"
                            >
                              Cancel (না)
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action status badges */}
                      {isBot && msg.action && msg.actionExecuted && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-wider text-left">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>অ্যাকশন সম্পন্ন হয়েছে</span>
                        </div>
                      )}

                      {isBot && msg.action && msg.actionCancelled && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-left">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-450" />
                          <span>অ্যাকশন বাতিল করা হয়েছে</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                /* Typing dot animations */
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[1.8rem] rounded-bl-sm px-5 py-4 shadow-sm flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>
          )}

        </div>

        {/* Drawer Footer Input Panel */}
        <footer className="p-4 border-t border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="space-y-2"
          >
            {/* Hostinger style Textarea border container */}
            <div className="border border-slate-200 dark:border-slate-850 focus-within:border-[#ff5722] focus-within:ring-1 focus-within:ring-[#ff5722]/20 rounded-[1.5rem] p-3 flex bg-slate-50/50 dark:bg-slate-900/50 transition relative">
              <textarea
                rows={2}
                placeholder={isListening ? "বলুন, আমি শুনছি..." : "VexoAI কে জিজ্ঞেস করুন..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="w-full border-none focus:outline-none text-[11px] font-semibold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 bg-transparent resize-none pr-10"
              />

              {/* Voice recognition mic floating inside input box */}
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`absolute right-3.5 bottom-3.5 w-7.5 h-7.5 rounded-lg flex items-center justify-center transition border cursor-pointer ${
                  isListening
                    ? "bg-rose-500 border-rose-600 text-white animate-pulse"
                    : "bg-white dark:bg-slate-800 border-slate-250/80 dark:border-slate-700 text-slate-450 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50"
                }`}
                title={isListening ? "Listening... Click to stop" : "Speak (Voice input)"}
              >
                {isListening ? (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Bottom Panel buttons */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-600 leading-none">
                VexoAI can make mistakes. Double-check replies.
              </span>
              
              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff5722] via-[#e11d48] to-[#ec4899] text-white hover:brightness-105 disabled:opacity-40 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition cursor-pointer disabled:pointer-events-none active:scale-95"
              >
                <span>Send</span>
                <svg className="w-3 h-3 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </form>
        </footer>

      </div>

      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.28s ease-out forwards;
        }
      `}} />

    </>
  );
}
