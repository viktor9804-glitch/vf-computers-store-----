import React, { useEffect, useMemo, useState } from "react";
import { Bot, Send, Trash2, X } from "lucide-react";
import { sendAiAssistantMessage } from "../services/aiAssistantService";

const CHAT_HISTORY_KEY = "vf_ai_chat_history";

const initialGreeting = {
  role: "assistant",
  content:
    "Здравей! Аз съм AI асистентът на ВФ Компютри. Мога да помогна с избор на компютър, компоненти, сервиз или custom конфигурация от реалните продукти в сайта.",
};

const componentLabels = {
  CPU: "Процесор",
  Motherboard: "Дънна платка",
  RAM: "RAM",
  GPU: "Видео карта",
  SSD: "SSD",
  PSU: "Захранване",
  Case: "Кутия",
  Cooler: "Охлаждане",
};

const loadStoredMessages = () => {
  if (typeof window === "undefined") return [initialGreeting];

  try {
    const parsed = JSON.parse(sessionStorage.getItem(CHAT_HISTORY_KEY) || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (error) {
    console.warn("[AI assistant] Invalid session chat history.", error);
  }

  return [initialGreeting];
};

const renderTextWithLinks = (content) => {
  const parts = String(content || "").split(/(\[[^\]]+\]\(https?:\/\/[^)]+\))/g);

  return parts.map((part, index) => {
    const match = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (!match) return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;

    return (
      <a key={`${match[2]}-${index}`} href={match[2]} target="_blank" rel="noreferrer">
        {match[1]}
      </a>
    );
  });
};

function BuildOffer({ offer }) {
  if (!offer) return null;

  if (!offer.ok) {
    return (
      <div className="ai-offer">
        {offer.missing?.length > 0 && (
          <div className="ai-offer-missing">
            Липсващи компоненти: {offer.missing.map((type) => componentLabels[type] || type).join(", ")}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ai-offer">
      {offer.components?.map((component) => (
        <div className="ai-offer-row" key={`${component.type}-${component.id}`}>
          <div>
            <b>{componentLabels[component.type] || component.type}: {component.name}</b>
            <span>{component.price}€</span>
          </div>
          {component.productUrl && (
            <a href={component.productUrl} target="_blank" rel="noreferrer">
              Виж продукта
            </a>
          )}
        </div>
      ))}
      <div className="ai-offer-total">Общо: {offer.totalPrice}€</div>
    </div>
  );
}

export default function AIAssistant() {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState(loadStoredMessages);

  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(aiMessages));
    } catch (error) {
      console.warn("[AI assistant] Unable to store session chat history.", error);
    }
  }, [aiMessages]);

  const visibleMessages = useMemo(
    () => (aiMessages.length > 0 ? aiMessages : [initialGreeting]),
    [aiMessages]
  );

  const clearChat = () => {
    sessionStorage.removeItem(CHAT_HISTORY_KEY);
    setAiMessages([initialGreeting]);
  };

  const sendAiMessage = async () => {
    const text = aiInput.trim();
    if (!text || aiLoading) return;

    const history = aiMessages;
    const nextMessages = [...aiMessages, { role: "user", content: text }];
    setAiMessages(nextMessages);
    setAiInput("");
    setAiLoading(true);

    try {
      const { response, data } = await sendAiAssistantMessage({
        message: text,
        history,
      });

      if (!response.ok) {
        console.error("[AI assistant] /api/chat request failed.", {
          status: response.status,
          statusText: response.statusText,
          error: data?.error,
        });

        throw new Error(data.error || "AI assistant error");
      }

      setAiMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.reply,
          offer: data.offer || null,
        },
      ]);
    } catch (error) {
      console.error("[AI assistant] Unable to send message.", error);
      setAiMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "В момента AI асистентът не може да отговори. Моля, опитайте отново или се свържете с магазина.",
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      <button className="floating-chat" onClick={() => setAiOpen(true)}>
        <Bot size={18} />
        <span>AI Асистент</span>
      </button>

      {aiOpen && (
        <div className="ai-chat-window">
          <div className="ai-chat-head">
            <div>
              <b>AI Асистент</b>
              <p>ВФ Компютри • онлайн помощник</p>
            </div>
            <div className="ai-chat-head-actions">
              <button onClick={clearChat} title="Изчисти чата" aria-label="Изчисти чата">
                <Trash2 size={17} />
              </button>
              <button onClick={() => setAiOpen(false)} title="Затвори" aria-label="Затвори">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="ai-chat-body">
            {visibleMessages.map((message, index) => (
              <div
                key={index}
                className={`ai-message ${message.role === "user" ? "user" : "assistant"}`}
              >
                <div>{renderTextWithLinks(message.content)}</div>
                {message.offer && <BuildOffer offer={message.offer} />}
              </div>
            ))}

            {aiLoading && <div className="ai-message assistant">Мисля...</div>}
          </div>

          <div className="ai-quick-actions">
            <button onClick={() => setAiInput("Искам gaming компютър до 1000 евро")}>Gaming PC</button>
            <button onClick={() => setAiInput("Сглоби ми компютър за CS2 до 1600 евро с RGB")}>CS2 PC</button>
            <button onClick={() => setAiInput("Искам офис компютър")}>Офис PC</button>
            <button onClick={() => setAiInput("Имам проблем с лаптопа, какво да направя?")}>Сервиз</button>
          </div>

          <div className="ai-chat-input">
            <input
              value={aiInput}
              onChange={(event) => setAiInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendAiMessage();
              }}
              placeholder="Напиши въпрос..."
            />
            <button onClick={sendAiMessage} disabled={aiLoading} aria-label="Изпрати">
              <Send size={17} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
