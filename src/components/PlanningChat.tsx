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
  address: string
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
  const [isListening, setIsListening] = useState(false)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition()
        recognitionInstance.continuous = false
        recognitionInstance.interimResults = false
        recognitionInstance.lang = 'en-US'

        recognitionInstance.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          setInputMessage(transcript)
          setIsListening(false)
        }

        recognitionInstance.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setIsListening(false)
        }

        recognitionInstance.onend = () => {
          setIsListening(false)
        }

        setRecognition(recognitionInstance)
      }
    }
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Auto-send in voice mode when message is set and not listening
  useEffect(() => {
    if (isVoiceMode && inputMessage.trim() && !isListening && !isLoading) {
      const timer = setTimeout(() => {
        sendMessage()
      }, 500) // Small delay to ensure speech recognition is complete
      
      return () => clearTimeout(timer)
    }
  }, [inputMessage, isVoiceMode, isListening, isLoading])

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
        
        // Extract address from the description or subsequent lines
        let address = ''
        
        // First, check if there's an explicit "Address:" line following this suggestion
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const nextLine = lines[j].trim()
          const addressLineMatch = nextLine.match(/^(?:Address:\s*)?(.+)/)
          if (addressLineMatch && nextLine.toLowerCase().includes('address:')) {
            address = addressLineMatch[1].trim()
            break
          }
        }
        
        // If no explicit address line, look for address patterns in description or subsequent lines
        if (!address) {
          const addressPatterns = [
            /(\d+\s+[A-Za-z\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place)\.?(?:\s*,\s*[A-Za-z\s]+)?(?:\s*,\s*[A-Z]{2})?(?:\s*\d{5})?)/i,
            /([A-Za-z\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place)\.?(?:\s*,\s*[A-Za-z\s]+)?(?:\s*,\s*[A-Z]{2})?(?:\s*\d{5})?)/i,
            /([\w\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}(?:\s*\d{5})?)/i,
            /([A-Za-z\s]+(?:Bridge|Island|Wharf|Park|Museum|Center|Plaza|Square|Building|Tower|Mall|Market)(?:\s*,\s*[A-Za-z\s]+)?(?:\s*,\s*[A-Z]{2})?(?:\s*\d{5})?)/i
          ]
          
          // Check current line and next few lines for address patterns
          for (let j = i; j < Math.min(i + 3, lines.length); j++) {
            const checkLine = lines[j].trim()
            for (const pattern of addressPatterns) {
              const addressMatch = checkLine.match(pattern)
              if (addressMatch) {
                address = addressMatch[1] || addressMatch[0]
                break
              }
            }
            if (address) break
          }
        }
        
        // If no address found, create a generic one based on the title
        if (!address) {
          address = `${title}, City, State`
        }
        
        suggestions.push({
          id: `suggestion-${Date.now()}-${suggestions.length}`,
          title,
          description,
          address: address.trim()
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

IMPORTANT: When providing location recommendations, ALWAYS format them as a numbered list with location names in bold (**Location Name**) followed by a dash and brief description. ALWAYS include the complete, specific street address on the same line or the next line. For example:

1. **Golden Gate Bridge** - Iconic suspension bridge with stunning views
   Address: Golden Gate Bridge, San Francisco, CA 94129
2. **Alcatraz Island** - Historic former prison with guided tours  
   Address: Alcatraz Island, San Francisco, CA 94133
3. **Fisherman's Wharf** - Waterfront area with shops and restaurants
   Address: Pier 39, San Francisco, CA 94133
4. **Lombard Street** - Famous winding street known as the crookedest in the world
   Address: Lombard St, San Francisco, CA 94133

Always provide real, complete addresses including street numbers, street names, city, state, and zip code when available. This is crucial for users to add locations to their trip canvas with accurate addresses for route optimization and navigation.`
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

  const startListening = () => {
    if (recognition && !isListening) {
      setIsListening(true)
      setInputMessage('')
      recognition.start()
    }
  }

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop()
      setIsListening(false)
    }
  }

  const toggleMode = () => {
    setIsVoiceMode(!isVoiceMode)
    if (isListening) {
      stopListening()
    }
    setInputMessage('')
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
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={toggleMode}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                !isVoiceMode 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              💬 Chat Mode
            </button>
            <button
              onClick={toggleMode}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                isVoiceMode 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🎤 Voice Mode
            </button>
          </div>

          <div className="flex gap-2">
            {isVoiceMode ? (
              /* Voice Mode Interface */
              <>
                <div className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm flex items-center justify-center">
                  {isListening ? (
                    <span className="text-red-600 animate-pulse">🎤 Listening...</span>
                  ) : (
                    <span className="text-gray-600">Click microphone to speak</span>
                  )}
                </div>
                
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isListening 
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  } disabled:bg-gray-300 disabled:cursor-not-allowed`}
                  title={isListening ? "Stop listening" : "Start speaking"}
                >
                  {isListening ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 6h12v12H6z"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2s-2-.9-2-2V4c0-1.1.9-2 2-2zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H6c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  )}
                </button>
              </>
            ) : (
              /* Chat Mode Interface */
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
