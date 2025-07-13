import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { useSocket } from '@/contexts/socket-context';
import { useDeploymentStore } from '@/stores/deployment-store';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Send, Bot, User, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DeploymentProgress } from './deployment-progress';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'error' | 'success';
  content: string;
  timestamp: Date;
  deploymentId?: string;
}

const SAMPLE_URLS = [
  'https://www.curseforge.com/minecraft/modpacks/all-the-mods-9',
  'https://www.curseforge.com/minecraft/modpacks/rlcraft',
  'https://www.curseforge.com/minecraft/modpacks/skyfactory-4',
  'https://modrinth.com/modpack/better-minecraft',
  'https://www.curseforge.com/minecraft/modpacks/enigmatica6',
];

export function DeploymentChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hello! I'm your Minecraft server deployment assistant. Share a modpack URL (CurseForge, Modrinth, etc.) and I'll help you deploy it instantly!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { startDeployment } = useSocket();
  const { currentDeployment, setCurrentDeployment } = useDeploymentStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    addMessage({
      type: 'user',
      content: userMessage,
    });

    setIsLoading(true);

    try {
      // Check if input looks like a URL
      if (isValidUrl(userMessage)) {
        // Add AI response
        addMessage({
          type: 'assistant',
          content: `Great! I'll analyze this modpack and create a deployment plan for you. Let me extract the modpack information...`,
        });

        // Create deployment
        const response = await api.post('/deployments', {
          modpackUrl: userMessage,
        });

        const deployment = response.data.deployment;
        setCurrentDeployment(deployment);

        // Add deployment plan message
        addMessage({
          type: 'assistant',
          content: `Perfect! I've created a deployment plan for **${deployment.modpackName}**. The deployment will go through ${deployment.steps.length} steps including downloading, extracting, and configuring your server. Ready to start?`,
          deploymentId: deployment.id,
        });

        // Auto-start deployment after a short delay
        setTimeout(() => {
          startDeployment(deployment.id);
          addMessage({
            type: 'system',
            content: 'Deployment started! You can monitor the progress below.',
          });
        }, 2000);

      } else {
        // Handle non-URL input with helpful suggestions
        const suggestions = getSuggestions(userMessage);
        addMessage({
          type: 'assistant',
          content: suggestions,
        });
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      addMessage({
        type: 'error',
        content: error.response?.data?.error || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSampleUrl = (url: string) => {
    setInput(url);
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return string.includes('curseforge.com') || string.includes('modrinth.com') || string.includes('minecraft');
    } catch {
      return false;
    }
  };

  const getSuggestions = (input: string) => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('help') || lowerInput.includes('how')) {
      return `I can help you deploy Minecraft servers! Here's how:

1. **Share a modpack URL** - I support CurseForge, Modrinth, and other platforms
2. **I'll analyze it** - Extract modpack info and create a deployment plan  
3. **Deploy automatically** - Set up your server with proper configurations
4. **Get server details** - Receive connection info when ready

Try one of these popular modpacks:
${SAMPLE_URLS.map(url => `• ${url}`).join('\n')}`;
    }

    if (lowerInput.includes('modpack') || lowerInput.includes('server')) {
      return `Just paste a modpack URL and I'll handle the deployment! Here are some popular options:

${SAMPLE_URLS.map(url => `• ${url}`).join('\n')}

Or search for modpacks on:
• CurseForge: https://www.curseforge.com/minecraft/modpacks
• Modrinth: https://modrinth.com/modpacks`;
    }

    return `I'm specialized in Minecraft server deployments. Please share a modpack URL from CurseForge, Modrinth, or similar platforms, and I'll deploy it for you!

Need ideas? Try these popular modpacks:
${SAMPLE_URLS.slice(0, 3).map(url => `• ${url}`).join('\n')}`;
  };

  const getMessageIcon = (type: Message['type']) => {
    switch (type) {
      case 'user':
        return <User className="h-4 w-4" />;
      case 'assistant':
        return <Bot className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  const getMessageStyles = (type: Message['type']) => {
    switch (type) {
      case 'user':
        return 'bg-primary text-primary-foreground ml-auto';
      case 'error':
        return 'bg-destructive text-destructive-foreground';
      case 'success':
        return 'bg-green-500 text-white';
      case 'system':
        return 'bg-muted text-muted-foreground text-center text-sm';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <Card className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${getMessageStyles(message.type)}`}
                >
                  <div className="flex items-start gap-2">
                    {message.type !== 'user' && (
                      <div className="mt-0.5">
                        {getMessageIcon(message.type)}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </div>
                      <div className="text-xs opacity-70 mt-1">
                        {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Analyzing modpack...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Sample URLs */}
        {messages.length <= 2 && (
          <div className="p-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">Try these popular modpacks:</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_URLS.slice(0, 3).map((url) => (
                <Button
                  key={url}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSampleUrl(url)}
                  className="text-xs"
                >
                  {url.split('/').pop()?.replace(/-/g, ' ')}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste a modpack URL or ask for help..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>

      {/* Deployment Progress */}
      {currentDeployment && (
        <div className="mt-6">
          <DeploymentProgress deployment={currentDeployment} />
        </div>
      )}
    </div>
  );
}