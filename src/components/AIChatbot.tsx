import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot } from "lucide-react";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface AIChatbotProps {
    isOpen: boolean;
    onClose: () => void;
    initialTicketImage?: string | null;
    initialGreeting?: string;
}

type ChatMessage = {
    role: "assistant" | "user";
    content: string;
    imageUrl?: string | null;
};

const AIChatbot = ({
    isOpen,
    onClose,
    initialTicketImage = null,
    initialGreeting = "¡Hola! Soy el asistente de Casa Tomás. ¿En qué puedo ayudarte hoy?",
}: AIChatbotProps) => {
    const [input, setInput] = useState("");
    const [mounted, setMounted] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>(() => [
        {
            role: "assistant",
            content: initialGreeting,
            imageUrl: initialTicketImage,
        },
    ]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

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

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[120] pointer-events-auto"
                >
                    <button
                        type="button"
                        aria-label="Cerrar chat"
                        className="absolute inset-0 pointer-events-auto bg-black/20 backdrop-blur-[1px]"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="absolute bottom-6 right-6 w-[90vw] sm:w-[400px] h-[500px] pointer-events-auto bg-background border-2 border-primary/20 rounded-2xl shadow-2xl z-[121] flex flex-col overflow-hidden"
                        onClick={(event) => event.stopPropagation()}
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
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Cerrar chatbot"
                                onPointerDown={(event) => event.stopPropagation()}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onClose();
                                }}
                                className="h-9 w-9 rounded-full text-primary-foreground hover:bg-white/10"
                            >
                                <X className="w-5 h-5" />
                            </Button>
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
                                        {msg.imageUrl && (
                                            <img
                                                src={msg.imageUrl}
                                                alt="Previsualización actual de alimentos del ticket"
                                                className="mb-2 w-full max-w-[220px] rounded-lg border border-border/70"
                                                loading="lazy"
                                            />
                                        )}
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
                </motion.div>
            )}
        </AnimatePresence>
        ,
        document.body
    );
};

export default AIChatbot;
