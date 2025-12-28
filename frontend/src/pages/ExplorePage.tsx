import { useEffect, useMemo, useRef, useState, memo } from 'react'
import { Network, type Edge as VisNetworkEdge, type Node as VisNetworkNode } from 'vis-network'
import type { ViewportResponse, GraphEdge } from '../api'
import { getViewport } from '../api'
import { NodeDetailsSidebar } from '../components/NodeDetailsSidebar'
import { GRAPH_THEME } from '../config/graphTheme' 
import type { ThemeNodeKind } from '../config/graphTheme'
import { setSelectedUid, toggleChat, addMessage } from '../store/appSlice'
import { useDispatch } from 'react-redux'
import { useGraphContext } from '../context/GraphContext'
import { KBSelect } from '../components/KBSelect'

type ExplorePageProps = {
  selectedUid: string
  onSelectUid: (uid: string) => void
}

type VisNode = VisNetworkNode & {
  x?: number
  y?: number
}

function toVisData(viewport: ViewportResponse) {
  const seenIds = new Set<string>()
  
  // Маппинг типов БД к техническому стандарту 4.2
  const mapKind = (kind: string): 'concept' | 'skill' | 'resource' => {
    const k = kind.toLowerCase()
    if (k.includes('skill')) return 'skill'
    if (k.includes('resource') || k.includes('example')) return 'resource'
    return 'concept' // По умолчанию для Subject, Section, Topic
  }

  const nodes = viewport.nodes
    .filter(n => {
      if (seenIds.has(n.uid)) {
        console.warn(`[Explore] Duplicate node UID skipped: ${n.uid}`)
        return false
      }
      seenIds.add(n.uid)
      return true
    })
    .map((n): VisNode => {
      // Применяем маппинг к стандарту
      const standardKind = mapKind(n.kind)
      
      // Для оформления используем оригинальный kind или приведение к теме
      const kindKey = n.kind as ThemeNodeKind
      const validKind = (GRAPH_THEME.nodes.colors[kindKey] ? kindKey : 'Default') as ThemeNodeKind
      
      const color = GRAPH_THEME.nodes.colors[validKind]
      const size = GRAPH_THEME.nodes.sizes[validKind]
      const label = n.title || n.uid

    // Функция для переноса длинных слов
     const formatLabel = (text: string) => {
       if (!text) return ''
       const maxLen = 15
       if (text.length <= maxLen) return text
       // Разбиваем по пробелам, если возможно
       const words = text.split(' ')
       let lines = []
       let currentLine = words[0]
       for (let i = 1; i < words.length; i++) {
         if (currentLine.length + 1 + words[i].length <= maxLen) {
           currentLine += ' ' + words[i]
         } else {
           lines.push(currentLine)
           currentLine = words[i]
         }
       }
       lines.push(currentLine)
       return lines.join('\n')
     }

     return {
       id: n.uid,
       label: formatLabel(label),
       group: validKind, // Используем проверенный kind
       shape: GRAPH_THEME.nodes.shape,
       size: size,
       color: {
         background: color,
         border: '#ffffff',
         highlight: { background: '#ffffff', border: color },
       },
       font: {
          size: GRAPH_THEME.nodes.font.size,
          color: GRAPH_THEME.nodes.font.color,
          strokeWidth: GRAPH_THEME.nodes.font.strokeWidth,
          strokeColor: GRAPH_THEME.nodes.font.strokeColor,
          multi: true,
          vadjust: size * GRAPH_THEME.nodes.font.vadjustRatio,
        }
      }
    })

  const edges = viewport.edges.map((e: GraphEdge, idx: number): VisNetworkEdge => ({
    id: `${e.source}->${e.target}:${idx}`,
    from: e.source,
    to: e.target,
    color: GRAPH_THEME.edges.color,
    dashes: [...GRAPH_THEME.edges.dashes],
    width: GRAPH_THEME.edges.width,
    arrows: { to: { enabled: true, scaleFactor: GRAPH_THEME.edges.arrows.scaleFactor, type: 'arrow' } }
  }))

  return { nodes, edges }
}

const ExplorePage = memo(function ExplorePage({ selectedUid, onSelectUid }: ExplorePageProps) {
  const dispatch = useDispatch()
  const { graphState, saveGraphState } = useGraphContext()
  
  // LOG: Проверяем состояние при рендере
  console.log('[Explore] Render. GraphState:', { 
      storedUid: graphState.selectedUid, 
      currentUid: selectedUid, 
      hasViewport: !!graphState.viewport,
      hasCamera: !!graphState.camera 
  })

  const [depth, setDepth] = useState(graphState.depth || 1)
  const [filterKind, setFilterKind] = useState<string>('All')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Данные валидны, если узел совпадает И глубина совпадает
  const isContextValid = 
    graphState.selectedUid === selectedUid && 
    !!graphState.viewport && 
    graphState.depth === depth
  const viewport = isContextValid ? graphState.viewport : null

  // State for sidebar
  const [detailsUid, setDetailsUid] = useState<string | null>(null)
  
  // State for tooltip data (WHAT to show)
  const [hoveredNode, setHoveredNode] = useState<ViewportResponse['nodes'][0] | null>(null)
  // State for cursor position (WHERE to show)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })

  const visData = useMemo(() => {
    if (!viewport) return { nodes: [], edges: [] }
    
    // Фильтрация по типу (Kind)
    const filteredNodes = filterKind === 'All' 
      ? viewport.nodes 
      : viewport.nodes.filter(n => n.kind === filterKind)
      
    return toVisData({ ...viewport, nodes: filteredNodes })
  }, [viewport, filterKind])

  // Список доступных типов для фильтра
  const kindOptions = useMemo(() => {
    if (!viewport) return [{ value: 'All', label: 'All' }]
    const kinds = Array.from(new Set(viewport.nodes.map(n => n.kind)))
    return [
      { value: 'All', label: 'All' },
      ...kinds.map(k => ({ value: k, label: k }))
    ]
  }, [viewport])

  const containerRef = useRef<HTMLDivElement>(null)
  const networkRef = useRef<Network | null>(null)
  const cameraRef = useRef<{position: {x: number, y: number}, scale: number} | null>(null)
  
  // Ref to access latest graphState inside useEffect without triggering re-run
  const graphStateRef = useRef(graphState)
  useEffect(() => {
    graphStateRef.current = graphState
  }, [graphState])

  // Fetch data only if context is invalid (empty or different node)
  useEffect(() => {
    // Сбрасываем тултип при смене графа
    setHoveredNode(null)
    
    if (isContextValid) return // Уже есть данные

    let cancelled = false
    setLoading(true)
    setError(null)

    getViewport({ center_uid: selectedUid, depth })
      .then((res) => {
        if (cancelled) return
        // Сохраняем в контекст вместе с глубиной
        saveGraphState({ 
          viewport: res, 
          selectedUid: selectedUid,
          depth: depth, // Сохраняем, для какой глубины эти данные
          camera: null // Reset camera on new node or depth
        })
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedUid, depth, isContextValid, saveGraphState])

  useEffect(() => {
    if (!containerRef.current || !viewport) return
    
    // Сбрасываем тултип перед созданием новой сети
    setHoveredNode(null)

    const el = containerRef.current
    const { nodes: baseNodes, edges } = visData
    
    // Подмешиваем сохраненные позиции из REF (не вызывает ре-рендер при обновлении)
    const savedPositions = graphStateRef.current.positions
    console.log(graphStateRef.current.positions);
    
    const nodes = isContextValid && savedPositions 
      ? baseNodes.map(n => ({
          ...n,
          x: savedPositions[n.id as string]?.x,
          y: savedPositions[n.id as string]?.y
        }))
      : baseNodes

    // ... options definition ...
    const options = {
      autoResize: true,
      interaction: {
        hover: true,
        multiselect: false,
        navigationButtons: false,
      },
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: GRAPH_THEME.physics.gravitationalConstant,
          centralGravity: GRAPH_THEME.physics.centralGravity,
          springLength: GRAPH_THEME.physics.springLength,
          springConstant: GRAPH_THEME.physics.springConstant,
        },
        stabilization: {
             // Если мы восстанавливаем граф, мы не хотим, чтобы он двигал узлы (enabled: false)
             enabled: !isContextValid,
             iterations: GRAPH_THEME.physics.stabilizationIterations,
             fit: false, // Никогда не делать авто-зум, мы сами управляем камерой
         },
      },
      nodes: {
        shape: GRAPH_THEME.nodes.shape,
        font: { color: '#ffffff', size: 14, face: 'ui-sans-serif' },
        borderWidth: GRAPH_THEME.nodes.borderWidth,
      },
      edges: {
        width: GRAPH_THEME.edges.width,
        dashes: [...GRAPH_THEME.edges.dashes],
        smooth: { enabled: true, type: 'continuous', roundness: 0.5 },
      },
    }

    const network = new Network(el, { nodes, edges }, options)
    
    let isMounted = true

    // Восстанавливаем камеру из REF (не триггерит эффект)
    const savedCamera = graphStateRef.current.camera
    console.log('[Explore] Init Network. Saved camera:', savedCamera, 'Context valid:', isContextValid)
    
    if (savedCamera && isContextValid) {
      // Инициализируем ref сразу, чтобы при быстром уходе он не был null
      cameraRef.current = savedCamera

      console.log('[Explore] Restoring camera position...')
      // Используем setTimeout, чтобы дать vis-network инициализироваться перед сдвигом камеры
      setTimeout(() => {
        if (!isMounted) return 
        console.log('[Explore] MOVING CAMERA NOW to:', savedCamera.position)
        network.moveTo({
          position: savedCamera.position,
          scale: savedCamera.scale,
          animation: { duration: 300, easingFunction: 'easeInOutQuad' }, // Плавная анимация восстановления
        })
      }, 50) // Чуть уменьшил, так как анимация сгладит рывки
    }

    network.on('selectNode', (params) => {
      const id = params.nodes?.[0]
      if (typeof id === 'string') {
        setDetailsUid(id)
      }
    })
    
    network.on('doubleClick', (params) => {
      const id = params.nodes?.[0]
      if (typeof id === 'string') {
        onSelectUid(id)
      }
    })

    network.on('hoverNode', (params) => {
      const id = params.node
      if (viewport && typeof id === 'string') {
        const node = viewport.nodes.find((n) => n.uid === id)
        if (node) {
          setHoveredNode(node)
        }
      }
    })

    network.on('blurNode', () => {
      setHoveredNode(null)
    })

    // Track camera changes
    const updateCameraRef = () => {
        cameraRef.current = {
            position: network.getViewPosition(),
            scale: network.getScale()
        }
    }
    network.on('dragEnd', updateCameraRef)
    network.on('zoom', updateCameraRef)
    network.on('stabilized', updateCameraRef)
    network.on('animationFinished', updateCameraRef) // Обновляем камеру после программной анимации (moveTo)

    networkRef.current = network
    return () => {
      isMounted = false // Предотвращаем выполнение отложенных задач
      // Сохраняем позицию камеры перед уничтожением
      // Используем последнее известное положение из ref, если оно есть, иначе пытаемся взять у network
      const lastKnownCamera = cameraRef.current || { position: network.getViewPosition(), scale: network.getScale() }
      const positions = network.getPositions() // Получаем позиции узлов
      
      console.log('[Explore] Unmounting. Saving camera:', lastKnownCamera)
      
      saveGraphState({
        camera: lastKnownCamera,
        positions: positions, // Сохраняем позиции
      })
      network.destroy()
      networkRef.current = null
    }
  }, [visData, onSelectUid, isContextValid, saveGraphState]) // Убрал graphState.camera из зависимостей!

  // Focus effect
  useEffect(() => {
    const network = networkRef.current
    if (!network) return
    
    // Используем REF для проверки камеры
    if (graphStateRef.current.camera && isContextValid) {
        console.log('[Explore] Skipping focus because camera is restored')
        return
    }

    console.log('[Explore] Focusing on node (default behavior)')
    const allNodes = network.body.data.nodes
    if (!allNodes.get(selectedUid)) return

    network.selectNodes([selectedUid])
    network.focus(selectedUid, { scale: 1.1, animation: { duration: 350, easingFunction: 'easeInOutQuad' } })
  }, [selectedUid, isContextValid])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Explore (vis-network)</div>
          <div style={{ fontSize: 16, fontWeight: 650 }}>Большой граф + физика</div>
        </div>
        
        <div style={{ display: 'flex', gap: 16, alignItems: 'center'}}>
          <KBSelect 
            label="Kind" 
            value={filterKind} 
            onChange={setFilterKind} 
            options={kindOptions} 
          />
          <KBSelect 
            label="Depth" 
            value={depth} 
            onChange={setDepth} 
            options={[1, 2, 3].map(d => ({ value: d, label: String(d) }))} 
          />
        </div>
      </div>

      {error && (
        <div className="kb-panel" style={{ padding: 12, borderRadius: 14, borderColor: 'rgba(255, 77, 109, 0.35)', borderStyle: 'solid', borderWidth: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 650 }}>Ошибка</div>
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{error}</div>
        </div>
      )}

      <div 
        className="kb-panel" 
        style={{ flex: 1, borderRadius: 18, position: 'relative', overflow: 'hidden' }}
        onMouseMove={(e) => {
          if (!hoveredNode) return
          // Получаем координаты мыши относительно контейнера
          const rect = e.currentTarget.getBoundingClientRect()
          setCursorPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          })
        }}
      >
        <NodeDetailsSidebar 
          uid={detailsUid} 
          onClose={() => setDetailsUid(null)} 
          onAskAI={(uid) => {
            dispatch(toggleChat())
          }} 
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(800px 500px at 50% 40%, rgba(124, 92, 255, 0.18), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))',
          }}
        /> 

        <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

        {viewport && viewport.nodes.length === 0 && !loading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'var(--muted)',
            textAlign: 'center',
            zIndex: 1
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗺️</div>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>Граф пуст</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Попробуйте выбрать другой узел или изменить глубину.</div>
          </div>
        )}

        {loading && (
          <div className="kb-panel" style={{ position: 'absolute', left: 14, bottom: 14, padding: '10px 12px', borderRadius: 14, background: 'rgba(0,0,0,0.35)' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Загрузка…</div>
          </div>
        )}

        {viewport && (
          <div className="kb-panel" style={{ position: 'absolute', right: 14, bottom: 14, padding: '10px 12px', borderRadius: 14, background: 'rgba(0,0,0,0.35)' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Nodes: {viewport.nodes.length}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Edges: {viewport.edges.length}</div>
          </div>
        )}

        {hoveredNode && (
          <div
            style={{
              position: 'absolute',
              left: cursorPos.x + GRAPH_THEME.tooltip.offset, // Смещение вправо
              top: cursorPos.y + GRAPH_THEME.tooltip.offset,  // Смещение вниз
              pointerEvents: 'none',
              background: GRAPH_THEME.tooltip.background,
              backdropFilter: 'blur(8px)',
              border: `1px solid ${GRAPH_THEME.tooltip.borderColor}`,
              padding: '12px',
              borderRadius: '8px',
              zIndex: 100,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              minWidth: 150,
              // Плавность движения
              transition: 'top 0.05s linear, left 0.05s linear',
            }}
          >
            <div style={{ fontSize: 11, color: '#2ee9a6', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>
              {hoveredNode.kind}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
              {hoveredNode.title || hoveredNode.uid}
            </div>
            {hoveredNode.title && (
               <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, fontFamily: 'monospace' }}>
                 {hoveredNode.uid}
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

export default ExplorePage
