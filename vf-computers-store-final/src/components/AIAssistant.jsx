import React, { useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { sendAiAssistantMessages } from "../services/aiAssistantService";

export default function AIAssistant() {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    {
      role: "assistant",
      content: "Здравей! Аз съм AI асистентът на ВФ Компютри. Мога да помогна с избор на компютър, компоненти, сервиз или custom конфигурация.",
    },
  ]);

  const sendAiMessage = async () => {
    const text = aiInput.trim();
    if (!text || aiLoading) return;

    const nextMessages = [...aiMessages, { role: "user", content: text }];
    setAiMessages(nextMessages);
    setAiInput("");
    setAiLoading(true);

    try {
      const { response, data } = await sendAiAssistantMessages(
        nextMessages.map((message) => ({
          role: message.role,
          content: message.content,
        }))
      );

      if (!response.ok) {
        console.error("[AI assistant] /api/chat request failed.", {
          status: response.status,
          statusText: response.statusText,
          error: data?.error,
          expectedServerEnv: "GEMINI_API_KEY",
          note: "Frontend calls /api/chat. Gemini is not called directly from Vite/browser code.",
        });

        throw new Error(data.error || "AI assistant error");
      }

      setAiMessages((current) => [...current, { role: "assistant", content: data.reply }]);
    } catch (error) {
      console.error("[AI assistant] Unable to send message.", error);
      setAiMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "В момента AI асистентът не може да отговори. Провери дали GEMINI_API_KEY е добавен във Vercel и дали сайтът е redeploy-нат.",
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
            <button onClick={() => setAiOpen(false)}><X size={18} /></button>
          </div>

          <div className="ai-chat-body">
            {aiMessages.map((message, index) => (
              <div
                key={index}
                className={`ai-message ${message.role === "user" ? "user" : "assistant"}`}
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  maxWidth: "100%",
                }}
              >
                {message.content}
              </div>
            ))}

            {aiLoading && (
              <div
                className="ai-message assistant"
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  maxWidth: "100%",
                }}
              >
                Мисля...
              </div>
            )}
          </div>

          <div className="ai-quick-actions">
            <button onClick={() => setAiInput("Искам gaming компютър до 1000 евро")}>Gaming PC</button>
            <button onClick={() => setAiInput("Имам проблем с лаптопа, какво да направя?")}>Сервиз</button>
            <button onClick={() => setAiInput("Помогни ми да избера видеокарта")}>Видеокарта</button>
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
            <button onClick={sendAiMessage} disabled={aiLoading}><Send size={17} /></button>
          </div>
        </div>
      )}
    </>
  );
}
