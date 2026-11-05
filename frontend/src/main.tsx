import React from 'react'
import ReactDOM from 'react-dom/client'
import 'dockview/dist/styles/dockview.css'
import App from './App'
import { ErrorBoundary } from './components/common/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary label="NewPostman">
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
