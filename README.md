
# Retro RPG Online (2D, Mobile Joystick, Salas, Chat, Mundo Procedural)

Projeto completo (cliente + servidor) para um joguinho 2D estilo **retro/minimalista** que roda no navegador (mobile e desktop) com:

- Personagem retangular dividido em 3 partes (cabeça, camisa, calça) e cores personalizáveis.
- Tela inicial para **nome**, **cores** e **criar/entrar** em sala.
- Multijogador em tempo real com **Socket.IO** (Node.js).
- **Chat** embutido.
- **Joystick virtual** para celular e **WASD/Setas** no PC.
- Mundo com **geração procedural** (árvores, arbustos, casas).
- Câmera seguindo o jogador.

## Como rodar localmente

1. Instale Node 18+.
2. No terminal, dentro da pasta do projeto:
   ```bash
   npm install
   npm start
   ```
3. Abra `http://localhost:3000` no navegador.

## Deploy (Render, Railway, Fly.io, etc.)

- Suba este repositório no GitHub (ou o serviço que preferir).
- No provedor, crie um serviço **Web** apontando para:
  - **Start command**: `node server.js`
  - **Port**: `3000`
- Habilite o **Auto Deploy** se quiser.
- A URL pública fornecida já vai servir o jogo.

## Estrutura

```
retro_rpg_online/
├─ server.js          # Servidor Express + Socket.IO
├─ package.json
├─ public/
│  ├─ index.html      # UI + Canvas + chat
│  ├─ client.js       # Cliente do jogo
│  └─ joystick.js     # Joystick virtual
└─ README.md
```

## Sobre salas

- **Criar sala** gera um ID curto (ex: `A1B2C3`).
- **Entrar na sala** exige digitar o ID.
- O servidor remove a sala se todos saírem.

## Observações

- Este servidor guarda tudo **em memória** (não persistente). Adequado para protótipo.
- A **geração procedural** é baseada em *seed* compartilhada pela sala.
- O mundo é infinito; os "tiles" são gerados conforme a câmera avança.

Boa diversão! 🎮
