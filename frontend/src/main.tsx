import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GraphProvider } from './context/GraphContext'
import { Provider } from 'react-redux'
import { store } from './store'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <GraphProvider>
          <App />
        </GraphProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)