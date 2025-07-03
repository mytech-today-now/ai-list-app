/**
 * Main App Component - MCP-Native Application Root
 * SemanticType: MCPApplicationRoot
 * ExtensibleByAI: true
 * AIUseCases: ["Application initialization", "Global state management", "Routing"]
 */

import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MCPProvider } from './contexts/MCPContext'
import { SecurityProvider } from './contexts/SecurityContext'
import Dashboard from './components/Dashboard'
import PWAStatus from './components/PWAStatus'
import './App.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SecurityProvider
        config={{
          enableCSP: true,
          securityLevel: 'high',
          reportingEndpoint: '/api/security/report'
        }}
      >
        <MCPProvider
          config={{
            apiUrl: import.meta.env.VITE_API_URL || '/api',
            autoConnect: true,
            sessionTimeout: 30 * 60 * 1000, // 30 minutes
            enableRealtime: true
          }}
        >
          <Router>
            <div className="min-h-screen bg-gray-50">
              <PWAStatus />
              <Routes>
                <Route path="/" element={<Dashboard />} />
              </Routes>
            </div>
          </Router>
        </MCPProvider>
      </SecurityProvider>
    </QueryClientProvider>
  )
}

export default App
