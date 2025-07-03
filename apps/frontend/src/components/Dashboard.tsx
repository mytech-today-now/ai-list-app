import React from 'react'

const Dashboard: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          AI ToDo MCP
        </h1>
        <p className="text-lg text-gray-600">
          AI-Driven Progressive Web App Task Manager
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Task Lists</h2>
          <p className="text-gray-600">
            Create and manage your task lists with AI assistance.
          </p>
          <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Create List
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">AI Agents</h2>
          <p className="text-gray-600">
            Configure AI agents to help manage your tasks.
          </p>
          <button className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
            Manage Agents
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">MCP Console</h2>
          <p className="text-gray-600">
            Execute MCP commands directly.
          </p>
          <button className="mt-4 bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
            Open Console
          </button>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <p className="text-gray-600">
          No recent activity. Start by creating your first task list!
        </p>
      </div>
    </div>
  )
}

export default Dashboard
