export const sendAiAssistantMessage = async ({ message, history }) => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });

  const data = await response.json().catch(() => ({}));
  return { response, data };
};

export const sendAiAssistantMessages = async (messages) => {
  const history = Array.isArray(messages) ? messages.slice(0, -1) : [];
  const message = Array.isArray(messages) ? messages.at(-1)?.content || "" : "";

  return sendAiAssistantMessage({ message, history });
};
