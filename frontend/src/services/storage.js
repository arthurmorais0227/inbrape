const getKey = () => {
  const user = JSON.parse(localStorage.getItem('ai_user') || '{}');
  return `@ai_doc_history_${user.id || 'guest'}`;
};

export function saveToHistory(item) {
  const existing = getHistory();
  const newItem = { ...item, id: Date.now().toString(), createdAt: new Date().toISOString() };
  const updated = [newItem, ...existing].slice(0, 30);
  localStorage.setItem(getKey(), JSON.stringify(updated));
}

export function getHistory() {
  const raw = localStorage.getItem(getKey());
  return raw ? JSON.parse(raw) : [];
}

export function clearHistory() {
  localStorage.removeItem(getKey());
}