const HISTORY_KEY = '@ai_doc_history';

export function saveToHistory(item) {
  const existing = getHistory();
  const newItem = { ...item, id: Date.now().toString(), createdAt: new Date().toISOString() };
  const updated = [newItem, ...existing].slice(0, 30);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export function getHistory() {
  const raw = localStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}
