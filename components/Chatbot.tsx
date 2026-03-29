'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, MapPin } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
};

export default function Chatbot({ chefPersonality }: { chefPersonality: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: `Hi! I am your AI Chef assistant (${chefPersonality}). Ask me anything about cooking, recipes, or find nearby grocery stores!` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [useMaps, setUseMaps] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setUseMaps(true);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Could not get your location. Please enable location services.");
          setUseMaps(false);
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const toggleMaps = () => {
    if (!useMaps) {
      getUserLocation();
    } else {
      setUseMaps(false);
      setLocation(null);
    }
  };

  const chatRef = useRef<any>(null);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' });
      
      let responseText = "";

      if (useMaps && location) {
        // Use Maps Grounding
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: input,
          config: {
            tools: [{ googleMaps: {} }],
            toolConfig: {
              retrievalConfig: {
                latLng: {
                  latitude: location.latitude,
                  longitude: location.longitude
                }
              }
            }
          }
        });
        
        responseText = response.text || "Sorry, I couldn't find any information.";
        
        // Extract Maps URLs if any
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && chunks.length > 0) {
          responseText += "\n\n**Places found:**\n";
          chunks.forEach((chunk: any) => {
            if (chunk.maps?.uri) {
              responseText += `- [${chunk.maps.title || 'View on Maps'}](${chunk.maps.uri})\n`;
            }
          });
        }
      } else {
        // Use standard Chat with gemini-3-flash-preview
        if (!chatRef.current) {
          chatRef.current = ai.chats.create({
            model: "gemini-3-flash-preview",
            config: {
              systemInstruction: `You are an AI Chef assistant with the personality of a ${chefPersonality}. You help users with cooking tips, recipe modifications, and general culinary advice. When a user says something like 'I want to make a [dish] and I have [ingredients...]', understand the dish name and ingredients, then generate clear step-by-step cooking instructions using only those ingredients (or note if any key ingredients are missing). Keep the instructions concise and easy to follow, and always maintain the tone and style of a ${chefPersonality}.`,
            }
          });
        }

        const response = await chatRef.current.sendMessage({ message: input });
        responseText = response.text || "Sorry, I couldn't process that.";
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: responseText }]);
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `Sorry, I encountered an error: ${error.message || error}. Please try again.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-40 ${isOpen ? 'hidden' : ''}`}
      >
        <MessageCircle size={24} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[350px] sm:w-[400px] h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-black text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle size={20} />
              <span className="font-medium">AI Chef Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user' 
                    ? 'bg-black text-white rounded-br-sm' 
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                }`}>
                  <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-gray-100 prose-pre:text-gray-800">
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2 px-1">
              <button 
                onClick={toggleMaps}
                className={`text-xs flex items-center gap-1 px-2 py-1 rounded-full border transition-colors ${
                  useMaps ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
                title="Find nearby grocery stores"
              >
                <MapPin size={12} />
                {useMaps ? 'Maps Grounding On' : 'Use Maps Grounding'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={useMaps ? "e.g. Find grocery stores near me" : "Ask a cooking question..."}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
              >
                <Send size={16} className="ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
