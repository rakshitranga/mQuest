'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  suggestions?: LocationSuggestion[]
}

interface LocationSuggestion {
  id: string
  title: string
  description: string
}

interface PlanningChatProps {
  isOpen: boolean
  onClose: () => void
  onReopen: () => void
  tripTitle: string
  onAddSuggestionToCanvas: (suggestion: LocationSuggestion) => void
}

export default function PlanningChat({ isOpen, onClose, onReopen, tripTitle, onAddSuggestionToCanvas }: PlanningChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: `Hi there, adventurer 👋. I'm a magnifying glass and a trip-planner all-in-one 😉 (the name's M.Q.). Want a closer look 🧐 (Get it!)? Ask away and see what I can do!`,
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Parse location suggestions from AI response
  const parseLocationSuggestions = (text: string): LocationSuggestion[] => {
    const suggestions: LocationSuggestion[] = []
    const lines = text.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      // Look for numbered suggestions or bullet points with location names
      const match = line.match(/^(?:\d+\.|\*|\-)\s*\*\*(.*?)\*\*(?:\s*-\s*(.*))?/)
      if (match && suggestions.length < 4) {
        const title = match[1].trim()
        const description = match[2]?.trim() || `Explore ${title}`
        suggestions.push({
          id: `suggestion-${Date.now()}-${suggestions.length}`,
          title,
          description
        })
      }
    }
    
    return suggestions
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: inputMessage.trim(),
          system: `You are a helpful AI trip planning assistant named M.Q. for a trip called "${tripTitle}". You have access to Google Maps services to help with location searches, directions, travel times, and place details. Be concise but helpful, and a little witty and goofy, in your responses. Focus on practical travel advice and specific recommendations.

When providing location recommendations, format them as a numbered list with location names in bold (**Location Name**) followed by a dash and brief description. For example:
1. **Golden Gate Bridge** - Iconic suspension bridge with stunning views
2. **Alcatraz Island** - Historic former prison with guided tours
3. **Fisherman's Wharf** - Waterfront area with shops and restaurants
4. **Lombard Street** - Famous winding street known as the crookedest in the world

This helps users drag these locations directly to their trip canvas.`
        }),
      })

      const data = await response.json()

      if (data.ok) {
        const responseText = data.text || 'I apologize, but I couldn\'t generate a response. Please try again.'
        const suggestions = parseLocationSuggestions(responseText)
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: responseText,
          timestamp: new Date(),
          suggestions: suggestions.length > 0 ? suggestions : undefined
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error(data.error || 'Failed to get response')
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Agh, my glass broke! Try asking again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0"
        onClick={onClose}
      />
      
      {/* Chat Panel */}
      <div 
        className="relative w-1/4 min-w-80 max-w-md h-full rounded-l-2xl shadow-2xl flex flex-col"
        style={{
          backgroundImage: 'url(/quest_cardstone.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-blue-50 rounded-tl-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center">
              <img src="/mquest_search.png" className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">M.Q.</h3>
              <p className="text-xs text-gray-500">Powered by Gemini API + Google Maps MCP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  message.type === 'user'
                    ? 'text-white'
                    : 'text-gray-900'
                }`}
                style={{
                  backgroundColor: message.type === 'user' ? '#8B4513' : '#D2B48C'
                }}
              >
                <div className="text-sm whitespace-pre-wrap">
                  {message.content.split(/(\*\*.*?\*\*)/).map((part, index) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return (
                        <strong key={index}>
                          {part.slice(2, -2)}
                        </strong>
                      );
                    }
                    return part;
                  })}
                </div>
                <p className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-blue-200' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              
              {/* Individual add to canvas buttons */}
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-2 max-w-[80%] space-y-2">
                  {message.suggestions.map((suggestion) => (
                    <div key={suggestion.id} className="flex items-center justify-between bg-white/90 backdrop-blur-sm border border-gray-300 rounded-lg p-2">
                      <div className="flex items-center gap-2 flex-1">
                        <img src="/mquest_location.png" className="h-5 w-5 flex-shrink-0" />
                        <span className="font-medium text-gray-900 text-sm">{suggestion.title}</span>
                      </div>
                      <button
                        onClick={() => onAddSuggestionToCanvas(suggestion)}
                        className="bg-[#D2B48C] text-black px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div 
                className="rounded-2xl px-4 py-2"
                style={{ backgroundColor: '#D2B48C' }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-gray-700">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-gray-50 rounded-bl-2xl text-black">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about destinations, routes, travel times..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-4 py-2 bg-[#D2B48C] text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
