export const sendAiAssistantMessages = async (messages) => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  const data = await response.json().catch(() => ({}));
  return { response, data };
};
