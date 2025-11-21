# Jarvis Agent Live - TODO

## Funcionalidades Principais

### UI/UX
- [ ] Design system e paleta de cores (tema moderno e responsivo)
- [ ] Componentes base (botões, inputs, cards, modais)
- [ ] Layout responsivo para dispositivos móveis e desktop
- [ ] Navegação principal (header/menu)

### Autenticação
- [ ] Página de login com Firebase Authentication
- [ ] Integração com Firebase Auth (Google, Email/Password)
- [ ] Proteção de rotas (usuário logado vs não logado)
- [ ] Logout e gerenciamento de sessão

### Agente Vivo (Avatar Animado)
- [ ] Componente do avatar/agente (SVG ou canvas)
- [ ] Animações básicas (piscar, movimento de boca)
- [ ] Animações em resposta ao chat (falar, gestos)
- [ ] Sincronização de áudio com animações de fala
- [ ] Expressões faciais (feliz, pensativo, etc.)

### Chat e Interação
- [ ] Interface de chat (mensagens do usuário e agente)
- [ ] Input de texto para enviar mensagens
- [ ] Integração com API do Gemini (backend)
- [ ] Exibição de respostas em tempo real
- [ ] Histórico de conversa

### Recursos Adicionais
- [ ] Upload de documentos (integração com Firebase Storage)
- [ ] Exibição de documentos carregados
- [ ] Configurações de usuário
- [ ] Temas (claro/escuro)

### Testes e Deploy
- [ ] Testes unitários (Vitest)
- [ ] Deploy na Vercel
- [ ] Otimização de performance
- [ ] Testes de responsividade em dispositivos móveis

---

## Notas Técnicas
- Framework: React 19 + Tailwind CSS 4
- UI Components: shadcn/ui
- Animações: Framer Motion (ou CSS Animations)
- Backend: API do JarvisTravel (já em produção)
- Autenticação: Firebase Auth
- Storage: Firebase Storage
