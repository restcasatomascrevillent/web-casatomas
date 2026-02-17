import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";

interface AIChatbotProps {
    isOpen: boolean;
    onClose: () => void;
}

const AIChatbot = ({ isOpen, onClose }: AIChatbotProps) => {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<{ role: "assistant" | "user"; content: string }[]>([
        { role: "assistant", content: "¡Hola! Soy el asistente de Casa Tomás. ¿En qué puedo ayudarte hoy?" },
    ]);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMessage = { role: "user" as const, content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");

        // Simulate AI response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "Lo siento, mi conexión con el servidor de IA se está configurando. ¡Pronto podré ayudarte con tus reservas y preguntas sobre nuestra carta!"
            }]);
        }, 1000);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="fixed bottom-6 right-6 w-[90vw] sm:w-[400px] h-[500px] bg-background border-2 border-primary/20 rounded-2xl shadow-2xl z-[100] flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-4 bg-primary text-primary-foreground flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-2 rounded-full">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold">Casa Tomás AI</h3>
                                <span className="text-xs opacity-80">En línea</span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="hover:bg-white/10 p-1 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[80%] p-3 rounded-2xl ${msg.role === "user"
                                        ? "bg-primary text-primary-foreground rounded-tr-none"
                                        : "bg-background border-2 border-primary/10 rounded-tl-none shadow-sm"
                                        }`}
                                >
                                    <p className="text-sm">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-background border-t border-primary/10 flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            placeholder="Escribe un mensaje..."
                            className="flex-1 bg-muted/50 border-none rounded-full px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                        <Button
                            size="icon"
                            className="rounded-full h-10 w-10 bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={handleSend}
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AIChatbot;
