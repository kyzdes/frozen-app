import { ArrowLeft } from 'lucide-react';
import { historyText } from '../lib/helpers';
import type { HistoryScreenProps } from '../lib/types';

export function HistoryScreen({ state, t, lang, onBack }: HistoryScreenProps) {
  return (
    <section className="screen">
      <header className="screen-header compact">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={18} />
          {t.categories}
        </button>
        <h2>{t.history}</h2>
        <span />
      </header>

      <div className="list-stack">
        {state.history.map((event) => (
          <article key={event.id} className="card history-row">
            <div>
              <strong>{historyText(event, lang)}</strong>
              <small>{new Date(event.timestamp).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')}</small>
            </div>
          </article>
        ))}
        {!state.history.length && (
          <p className="empty-state">{lang === 'ru' ? 'История пока пуста' : 'History is empty'}</p>
        )}
      </div>
    </section>
  );
}
