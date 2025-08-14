
# Retro RPG Online V2

Novidades:
- Árvores e casas **maiores** (com escala configurável).
- **Colisão** com árvores e casas (AABB simples).
- Geração procedural em estilo **vilarejo** (estradas em grade, casas próximas, praças nos cruzamentos).
- Itens (moedas **e** frutas) aparecem **somente** em lugares específicos (cruzamentos/praças e beira de estrada) e são **sincronizados pelo servidor**.
- Inventário simples (contador de itens) + **ranking** no chat quando alguém bate múltiplos de 10.
- Joystick no mobile, teclado no PC.
- Salas com ID curto, chat, seed por sala.

## Rodando localmente
```bash
npm install
npm start
# abra http://localhost:3000
```

## Deploy no Render / Railway / Fly.io
- Suba **o conteúdo desta pasta na raiz** do repositório (não aninhe numa subpasta).
- Build: `npm install`
- Start: `node server.js`
- Port: `3000`

## Estrutura
```
server.js
package.json
public/
  index.html
  client.js
  joystick.js
README.md
```

Divirta-se! 🎮
