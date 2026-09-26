import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "@/i18n/LanguageProvider";
import { CHAT_WEB_URL, functionHeaders, leerCuerpo } from "@/lib/supabase-functions";

interface AIChatbotProps {
    isOpen: boolean;
    onClose: () => void;
    initialTicketImage?: string | null;
    initialGreeting?: string;
    /**
     * Texto con el que arranca el campo de mensaje (sin enviarlo): "Mi mesa" lo
     * usa para dejar preparada la pregunta con los comensales y los platos,
     * porque la imagen del ticket solo se ve en el chat, no viaja al bot.
     */
    initialInput?: string;
}

type ChatMessage = {
    role: "assistant" | "user";
    content: string;
    imageUrl?: string | null;
};

/**
 * Limite de longitud del mensaje que aplica `chat-web` (MAX_MSG_LEN). Se
 * replica en el `maxLength` del campo para que el visitante lo vea al escribir
 * en vez de recibir un "resume un poco" despues de enviarlo.
 */
const MAX_MENSAJE_LEN = 600;
const SUPABASE_CONFIG_BOT_WEB_URL = "https://jeamoczmbfsnwkfjxcyo.supabase.co/rest/v1/configBotWeb";
const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_CONFIG_BOT_KEY = import.meta.env.VITE_SUPABASE_CONFIG_BOT_KEY;
const CHATBOT_SESSION_COOKIE = "chatbot_session_id";
const DEFAULT_ASSISTANT_REPLY = "Recibido. Estoy procesando tu mensaje.";
const ERROR_ASSISTANT_REPLY = "Ahora mismo no puedo responder. Intentalo de nuevo en unos segundos.";
/**
 * Los unicos `codigo` que puede emitir el propio chat-web (index.ts) en una
 * respuesta `!response.ok`. Sirven para distinguir un control real del bot
 * (429/503, con su propio texto) de un fallo de la pasarela de Supabase
 * (404 no desplegada, 401...) que nunca debe ensenarsele al visitante.
 */
const CODIGOS_CONTROL_CONOCIDOS = new Set(["rate_limited", "rate_limit_unavailable"]);
const LOADING_LABEL_BY_LANGUAGE = {
    es: "Escribiendo...",
    en: "Typing...",
    fr: "En train d'ecrire...",
} as const;

const isSecretApiKey = (key: string | undefined): boolean =>
    typeof key === "string" && key.startsWith("sb_secret_");

const SUPABASE_CLIENT_CONFIG_BOT_KEY =
    isSecretApiKey(SUPABASE_CONFIG_BOT_KEY) ? SUPABASE_PUBLISHABLE_KEY : SUPABASE_CONFIG_BOT_KEY || SUPABASE_PUBLISHABLE_KEY;

let pageChatSessionId: string | null = null;
let hasWarnedAboutSecretConfigBotKey = false;

const generateChatSessionId = (): string => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") {
        return null;
    }

    const target = `${encodeURIComponent(name)}=`;
    const match = document.cookie
        .split("; ")
        .find((cookie) => cookie.startsWith(target));

    if (!match) {
        return null;
    }

    return decodeURIComponent(match.slice(target.length));
};

const setCookie = (name: string, value: string) => {
    if (typeof document === "undefined") {
        return;
    }

    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
};

const getChatSessionId = (): string => {
    if (!pageChatSessionId) {
        pageChatSessionId = generateChatSessionId();
    }

    const cookieId = getCookie(CHATBOT_SESSION_COOKIE);
    if (cookieId !== pageChatSessionId) {
        setCookie(CHATBOT_SESSION_COOKIE, pageChatSessionId);
    }

    return pageChatSessionId;
};

/**
 * Guarda el `sessionToken` firmado que devuelve `chat-web` (ver
 * `chat-web/index.ts` y `chat-web/session-token.ts`) para reenviarlo como
 * `id` en la proxima peticion. El UUID que genera `generateChatSessionId`
 * es solo un valor de arranque para el primerisimo mensaje: chat-web NUNCA
 * lo acepta como continuacion de una sesion existente porque no lleva su
 * firma (id de sesion sin firmar = cualquiera podia leer la conversacion
 * de otro pasando su id), asi que en cuanto llega la primera respuesta,
 * este token firmado lo sustituye para el resto de la conversacion.
 */
const persistSessionToken = (token: unknown) => {
    if (typeof token !== "string" || !token || token === pageChatSessionId) {
        return;
    }

    pageChatSessionId = token;
    setCookie(CHATBOT_SESSION_COOKIE, token);
};

const extractAssistantText = (value: unknown): string | null => {
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }

        try {
            const parsed = JSON.parse(trimmed);
            return extractAssistantText(parsed);
        } catch {
            return trimmed;
        }
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const text = extractAssistantText(item);
            if (text) {
                return text;
            }
        }
        return null;
    }

    if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        const candidates = [
            record.mensaje,
            record.message,
            record.respuesta,
            record.reply,
            record.output,
            record.text,
            record.response,
            record.body,
            record.data,
            record.result,
        ];

        for (const candidate of candidates) {
            const text = extractAssistantText(candidate);
            if (text) {
                return text;
            }
        }
    }

    return null;
};

const extractWelcomeMessage = (config: Record<string, unknown> | undefined): string | null => {
    if (!config) {
        return null;
    }

    const candidates = [
        config.mensake_bienvenida,
        config.mensaje_bienvenida,
        config.bienvenida,
        config.welcome_message,
    ];

    for (const candidate of candidates) {
        const text = extractAssistantText(candidate);
        if (text) {
            return text;
        }
    }

    for (const [key, value] of Object.entries(config)) {
        if (!/bienvenida|welcome/i.test(key)) {
            continue;
        }

        const text = extractAssistantText(value);
        if (text) {
            return text;
        }
    }

    return null;
};

const renderMessageContent = (content: string): ReactNode => {
    const boldPattern = /\*\*(.+?)\*\*/g;
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;
    let match = boldPattern.exec(content);

    while (match) {
        if (match.index > lastIndex) {
            nodes.push(content.slice(lastIndex, match.index));
        }

        nodes.push(
            <strong key={`msg-bold-${key}`} className="font-semibold">
                {match[1]}
            </strong>
        );

        key += 1;
        lastIndex = match.index + match[0].length;
        match = boldPattern.exec(content);
    }

    if (lastIndex < content.length) {
        nodes.push(content.slice(lastIndex));
    }

    return nodes.length > 0 ? nodes : content;
};

const AIChatbot = ({
    isOpen,
    onClose,
    initialTicketImage = null,
    initialGreeting = "¡Hola! Soy el asistente de Casa Tomás. ¿En qué puedo ayudarte hoy?",
    initialInput,
}: AIChatbotProps) => {
    const { language } = useTranslations();
    const [input, setInput] = useState("");
    const [mounted, setMounted] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isLoadingGreeting, setIsLoadingGreeting] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    useEffect(() => {
        setMounted(true);
        getChatSessionId();
    }, []);

    useEffect(() => {
        if (isOpen && initialInput) setInput(initialInput.slice(0, MAX_MENSAJE_LEN));
    }, [isOpen, initialInput]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setMessages([]);
        setIsLoadingGreeting(true);

        const controller = new AbortController();

        const loadWelcomeMessage = async () => {
            try {
                const headers: HeadersInit = {};
                if (isSecretApiKey(SUPABASE_CONFIG_BOT_KEY) && !hasWarnedAboutSecretConfigBotKey) {
                    console.warn(
                        "VITE_SUPABASE_CONFIG_BOT_KEY usa un sb_secret_ y no se puede usar en navegador. Se usara VITE_SUPABASE_PUBLISHABLE_KEY."
                    );
                    hasWarnedAboutSecretConfigBotKey = true;
                }

                if (SUPABASE_CLIENT_CONFIG_BOT_KEY) {
                    headers.apikey = SUPABASE_CLIENT_CONFIG_BOT_KEY;
                    headers.Authorization = `Bearer ${SUPABASE_CLIENT_CONFIG_BOT_KEY}`;
                }

                const fetchConfigRow = async (filterByLanguage: boolean): Promise<Record<string, unknown> | undefined> => {
                    const endpoint = new URL(SUPABASE_CONFIG_BOT_WEB_URL);
                    endpoint.searchParams.set("select", "mensaje_bienvenida");
                    endpoint.searchParams.set("limit", "1");

                    if (filterByLanguage) {
                        endpoint.searchParams.set("idioma", `eq.${language}`);
                    }

                    const response = await fetch(endpoint.toString(), {
                        method: "GET",
                        headers,
                        signal: controller.signal,
                    });

                    if (!response.ok) {
                        if (response.status === 401 && isSecretApiKey(SUPABASE_CONFIG_BOT_KEY)) {
                            throw new Error(
                                "Config chatbot request failed: 401 (sb_secret no permitido en browser)"
                            );
                        }
                        throw new Error(`Config chatbot request failed: ${response.status}`);
                    }

                    const data = (await response.json()) as Array<Record<string, unknown>>;
                    if (!Array.isArray(data) || data.length === 0) {
                        return undefined;
                    }

                    return data[0];
                };

                const byLanguage = await fetchConfigRow(true);
                const fallback = byLanguage ? undefined : await fetchConfigRow(false);
                const welcomeMessage = extractWelcomeMessage(byLanguage ?? fallback);
                if (!welcomeMessage) {
                    setMessages((prev) => {
                        if (prev.some((message) => message.role === "user")) {
                            return prev;
                        }
                        return [
                            {
                                role: "assistant",
                                content: initialGreeting,
                                imageUrl: initialTicketImage,
                            },
                        ];
                    });
                    return;
                }

                setMessages((prev) => {
                    const hasUserMessages = prev.some((message) => message.role === "user");
                    if (hasUserMessages) {
                        return prev;
                    }

                    return [
                        {
                            role: "assistant",
                            content: welcomeMessage,
                            imageUrl: initialTicketImage,
                        },
                    ];
                });
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return;
                }
                console.error("Failed to load chatbot welcome message:", error);
                setMessages((prev) => {
                    if (prev.some((message) => message.role === "user")) {
                        return prev;
                    }
                    return [
                        {
                            role: "assistant",
                            content: initialGreeting,
                            imageUrl: initialTicketImage,
                        },
                    ];
                });
            } finally {
                setIsLoadingGreeting(false);
            }
        };

        void loadWelcomeMessage();

        return () => {
            controller.abort();
        };
    }, [isOpen, language, initialGreeting, initialTicketImage]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        requestAnimationFrame(() => {
            endOfMessagesRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "end",
            });
        });
    }, [messages, isSending, isLoadingGreeting, isOpen]);

    const handleSend = async () => {
        const messageToSend = input.trim();
        if (!messageToSend || isSending) return;

        const userMessage = { role: "user" as const, content: messageToSend };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsSending(true);

        try {
            const sessionId = getChatSessionId();
            const chatbotPayload = {
                mensaje: messageToSend,
                idiom: language,
                id: sessionId,
            };

            // JSON, no `x-www-form-urlencoded`: es lo que prefiere `chat-web`.
            // Y sin `X-Webhook-Secret`: era el secreto de n8n, viajaba vacio en
            // el bundle y NO esta en el `Access-Control-Allow-Headers` de la
            // funcion, asi que el preflight CORS fallaba y la llamada no
            // llegaba a salir del navegador.
            const response = await fetch(CHAT_WEB_URL, {
                method: "POST",
                headers: functionHeaders(),
                body: JSON.stringify(chatbotPayload),
            });

            // El cuerpo se lee SIEMPRE, tambien en 429/503: ahi viene la
            // `respuesta` ya traducida que hay que ensenar al visitante.
            const cuerpo = await leerCuerpo(response);
            const cuerpoObjeto =
                cuerpo && typeof cuerpo === "object" && !Array.isArray(cuerpo)
                    ? (cuerpo as Record<string, unknown>)
                    : null;

            // chat-web devuelve un `sessionToken` firmado en TODAS sus
            // respuestas (exito, 429, 503...): hay que guardarlo pase lo que
            // pase para seguir mandandolo como `id` la proxima vez.
            persistSessionToken(cuerpoObjeto?.sessionToken);

            if (!response.ok) {
                const codigo = typeof cuerpoObjeto?.codigo === "string" ? cuerpoObjeto.codigo : null;
                console.warn("[chat-web] respuesta de control:", response.status, codigo);
                // 429 (`rate_limited`) y 503 (`rate_limit_unavailable`) son los
                // UNICOS fallos que puede emitir el propio chat-web, y siempre
                // con su texto en `respuesta`/`mensaje` + ese `codigo`. Cualquier
                // otro `!response.ok` (404 no desplegada, 401, 500 de la
                // pasarela...) NO es de chat-web: su cuerpo puede traer una
                // clave `message` en ingles (p.ej. "Requested function was not
                // found") que jamas debe ensenarsele al visitante tal cual, asi
                // que aqui NUNCA se lee `message` (ni el resto de claves
                // genericas de `extractAssistantText`) — solo `respuesta` o
                // `mensaje` propios, y solo si ademas el `codigo` es conocido.
                const textoControl = cuerpoObjeto
                    ? extractAssistantText(cuerpoObjeto.respuesta) ?? extractAssistantText(cuerpoObjeto.mensaje)
                    : null;
                const esControlConocido = codigo !== null && CODIGOS_CONTROL_CONOCIDOS.has(codigo);

                if (!textoControl || !esControlConocido) {
                    throw new Error(`chat-web respondio ${response.status}`);
                }

                setMessages(prev => [
                    ...prev,
                    {
                        role: "assistant",
                        content: textoControl,
                    },
                ]);
                return;
            }

            const assistantReply = extractAssistantText(cuerpo) ?? DEFAULT_ASSISTANT_REPLY;

            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    content: assistantReply,
                },
            ]);
        } catch (error) {
            console.error("chat-web request failed:", error);
            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    content: ERROR_ASSISTANT_REPLY,
                },
            ]);
        } finally {
            setIsSending(false);
        }
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
                                        <p className="text-sm whitespace-pre-wrap">{renderMessageContent(msg.content)}</p>
                                    </div>
                                </div>
                            ))}
                            {(isLoadingGreeting || isSending) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex justify-start"
                                >
                                    <div className="max-w-[80%] p-3 rounded-2xl bg-background border-2 border-primary/10 rounded-tl-none shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1">
                                                {[0, 1, 2].map((dot) => (
                                                    <motion.span
                                                        key={dot}
                                                        className="h-1.5 w-1.5 rounded-full bg-primary/60"
                                                        animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                                                        transition={{
                                                            duration: 0.8,
                                                            repeat: Infinity,
                                                            delay: dot * 0.14,
                                                            ease: "easeInOut",
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {LOADING_LABEL_BY_LANGUAGE[language]}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={endOfMessagesRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-background border-t border-primary/10 flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && void handleSend()}
                                placeholder="Escribe un mensaje..."
                                maxLength={MAX_MENSAJE_LEN}
                                disabled={isSending}
                                className="flex-1 bg-muted/50 border-none rounded-full px-4 text-base md:text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                            <Button
                                size="icon"
                                className="rounded-full h-10 w-10 bg-primary hover:bg-primary/90 text-primary-foreground"
                                onClick={() => void handleSend()}
                                disabled={isSending || !input.trim()}
                            >
                                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
