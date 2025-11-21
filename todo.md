# Jarvis Agent Live - TODO

## Fase 1: Design System e Componentes Base ✅
- [x] Design system e paleta de cores (azul-roxo moderno)
- [x] Componentes base (botões, inputs, cards, modais)
- [x] Layout responsivo para dispositivos móveis e desktop
- [x] Página Home com layout de chat e avatar placeholder
- [x] Tema escuro como padrão com suporte a tema claro
- [x] Tipografia Poppins aplicada globalmente

## Fase 2: Autenticação Firebase ✅
- [x] Instalar Firebase SDK e dependências
- [x] Configurar Firebase Auth (Email/Password e Google)
- [x] Criar componente de Login com Firebase
- [x] Implementar proteção de rotas (PrivateRoute)
- [x] Gerenciar sessão de usuário com Context/State
- [x] Implementar Logout
- [x] Persistência de autenticação

## Fase 3: Esfera Neural (Neural Sphere) ✅
- [x] Instalar Three.js e React Three Fiber
- [x] Criar componente NeuralSphere com Canvas
- [x] Gerar partículas (milhares de pontos luminosos)
- [x] Implementar conexões sinápticas (linhas entre partículas)
- [x] Adicionar animações de movimento das partículas
- [x] Implementar brilho e cores dinâmicas (azul-roxo)
- [x] Adicionar rotação suave da esfera
- [ ] Otimizar performance (LOD, instancing)
- [ ] Responsividade para mobile

## Fase 4: Chat e Integração com Backend
- [ ] Conectar com API do JarvisTravel (/api/chat)
- [ ] Implementar envio de mensagens
- [ ] Exibir respostas da IA em tempo real
- [ ] Histórico de conversa
- [ ] Indicador de digitação do agente
- [ ] Tratamento de erros

## Fase 5: Animações Avançadas da Esfera Neural
- [ ] Animar esfera em resposta ao chat (pulsação)
- [ ] Intensificar brilho quando o agente está pensando
- [ ] Efeito visual de "fala" (partículas se movem mais rápido)
- [ ] Reações emocionais (cores mudam conforme o contexto)
- [ ] Sincronização com áudio (se houver)

## Fase 6: Testes e Deploy
- [ ] Testes unitários (Vitest)
- [ ] Testes de responsividade em mobile
- [ ] Otimização de performance
- [ ] Deploy na Vercel
- [ ] Testes de integração com backend

---

## Stack Tecnológico
- **Frontend:** React 19 + TypeScript + Tailwind CSS 4
- **UI Components:** shadcn/ui
- **3D Graphics:** Three.js + React Three Fiber
- **Animações:** Framer Motion
- **Autenticação:** Firebase Authentication
- **Backend:** API JarvisTravel (Gemini + Firebase)
- **Deploy:** Vercel
