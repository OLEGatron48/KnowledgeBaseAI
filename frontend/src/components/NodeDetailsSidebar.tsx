import { useNodeDetails } from '../hooks/useNodeDetails'

import { APP_CONFIG } from '../config/appConfig'

type Props = {
  uid: string | null
  onClose: () => void
  onAskAI: (uid: string) => void
}

export function NodeDetailsSidebar({ uid, onClose, onAskAI }: Props) {
  const { data, loading, error } = useNodeDetails(uid)

  if (!uid) return null

  return (
    <div className="kb-sidebar-drawer">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
          {loading ? 'Loading...' : data?.kind || 'Node Details'}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            fontSize: 20,
          }}
        >
          &times;
        </button>
      </div>

      {loading && <div style={{ color: '#fff' }}>Загрузка данных...</div>}

      {error && <div style={{ color: '#ff4d6d' }}>Ошибка: {error}</div>}

      {data && !loading && (
        <>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
              {data.title || data.uid}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>{data.uid}</div>
          </div>

          <button
            className="kb-btn kb-btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => onAskAI(data.uid)}
          >
            ✨ Спросить AI об этом
          </button>

          <div className="kb-panel" style={{ padding: 12, borderRadius: 12 }}>
            <div className="kb-sidebar-section-title" style={{ color: 'var(--accent-2)' }}>
              <span>📋 Свойства</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(data)
                .filter(([k]) => !APP_CONFIG.systemFields.includes(k))
                .map(([k, v]) => (
                  <div key={k} className="kb-prop-row">
                    <span className="kb-prop-key">{k}</span>
                    <span className="kb-prop-value">{String(v)}</span>
                  </div>
                ))}
              {Object.entries(data).filter(([k]) => !APP_CONFIG.systemFields.includes(k)).length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '10px 0' }}>
                  Нет дополнительных свойств
                </div>
              )}
            </div>
          </div>

          {data.incoming.length > 0 && (
            <div>
              <div className="kb-sidebar-section-title" style={{ color: '#ff9f1c' }}>Входящие связи</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.incoming.map((rel, i) => (
                  <div key={i} className="kb-panel" style={{ padding: 8, fontSize: 12, borderRadius: 6 }}>
                    <div style={{ color: 'var(--muted)', marginBottom: 2 }}>{rel.rel}</div>
                    <div style={{ fontWeight: 500 }}>{rel.title || rel.uid}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.outgoing.length > 0 && (
            <div>
              <div className="kb-sidebar-section-title" style={{ color: '#7c5cff' }}>Исходящие связи</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.outgoing.map((rel, i) => (
                  <div key={i} className="kb-panel" style={{ padding: 8, fontSize: 12, borderRadius: 6 }}>
                    <div style={{ color: 'var(--muted)', marginBottom: 2 }}>{rel.rel}</div>
                    <div style={{ fontWeight: 500 }}>{rel.title || rel.uid}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}