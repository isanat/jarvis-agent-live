import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, LogOut, Settings } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { NeuralSphere } from "@/components/NeuralSphere";

/**
 * Home Page - Jarvis Agent Live
 * Main chat interface with animated neural sphere agent
 */
export default function Home() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [inputValue, setInputValue] = useState("");

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      setMessages([...messages, { role: "user", content: inputValue }]);
      setInputValue("");
      // TODO: Call backend API to get response from Jarvis
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  if (!user) {
    return null; // Router will handle redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">Jarvis Agent Live</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 container py-6 flex flex-col gap-6 max-w-4xl mx-auto w-full">
        {/* Neural Sphere Agent Avatar Section */}
        <Card className="shadow-lg overflow-hidden">
          <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
            {/* Neural Sphere 3D Component */}
            <div className="w-full h-80 rounded-lg overflow-hidden">
              <NeuralSphere />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold">Jarvis Neural Agent</h2>
              <p className="text-muted-foreground">Your AI Travel Assistant</p>
            </div>
            {/* Agent status indicator */}
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 animate-pulse" />
              Neural network active
            </div>
          </CardContent>
        </Card>

        {/* Chat Messages */}
        <Card className="shadow-lg flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[400px]">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Start a conversation with Jarvis</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white rounded-br-none"
                        : "bg-gray-200 dark:bg-slate-700 text-foreground rounded-bl-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            placeholder="Type your message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </main>
    </div>
  );
}
