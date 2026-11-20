# Dina · agente de sites criativos

A **Dina** é uma agente do Claude Code especialista em criar sites e landing pages criativos para pequenos negócios. Ela usa o método que construímos no site da **Lavanderia Avexada**.

O nome vem de **D**esign, e o método dela começa sempre com referências do Pinterest.

---

## O que a Dina faz, passo a passo

| Etapa | O que acontece |
|---|---|
| 1. Referências | Abre os links do Pinterest que você manda, baixa imagens e vídeos e analisa quadro a quadro. Também procura mais referências sozinha. Sem referência, ela não começa. |
| 2. Briefing | Junta os dados reais do cliente (Instagram, logo, preços, horário, WhatsApp) e lista o que falta. Não inventa informação. |
| 3. Direção de arte | Mantém a identidade da marca (cores e letras do cliente) e escolhe um momento de impacto. |
| 4. Imagens | Usa fotos reais ou gera com IA (pede sua autorização antes de gastar crédito) e recorta o produto. |
| 5. Construção | Monta o site com botão de WhatsApp no topo, animações na rolagem, menu no celular e o Pixel da Meta pronto para preencher. |
| 6. Testes | Testa no computador e no celular antes de entregar: erros, botões, menu, fluidez e capturas de todas as telas. |
| 7. Entrega | Abre o link na sua tela, gera o arquivo para hospedar, guarda a versão anterior e conta o que ainda não ficou perfeito. |

---

## Como usar

No Claude Code, dentro deste repositório (CRM), peça assim:

> **"Dina, cria um site para a Barbearia X. Referências: pin.it/aaa, pin.it/bbb. Segue o print do Instagram."**

Ou:

> **"Use a agente Dina para refazer o site da Padaria Y no estilo desses pins: ..."**

O Claude chama a Dina automaticamente quando o assunto é criar ou melhorar site.

### O que mandar para um resultado melhor
1. **De 2 a 4 links de pins** com o estilo que você imagina. É o mais importante.
2. **Prints do Instagram do cliente**: perfil, posts e destaques.
3. **Logo** em PNG, de preferência sem fundo.
4. **Fotos reais** do produto ou da loja.
5. Preços, horário, endereço e WhatsApp, se não estiverem no Instagram.

---

## Arquivos da Dina

```
.claude/
├── agents/
│   └── dina.md                    ← as instruções da agente (o "cérebro")
└── dina/
    ├── LEIA-ME.md                 ← este guia
    └── ferramentas/
        ├── pinterest_pins.py      ← lê links de pins: título, imagem, vídeo e quadros
        └── auditar_site.js        ← testa o site no computador e no celular
```

**Projeto de referência:** `lavanderia-avexada/realista.html`, o site aprovado da Avexada.

### Usar as ferramentas sozinha (opcional)
```bash
# ler pins (gera imagem.jpg, video.mp4 e quadros.jpg de cada um)
python3 -I .claude/dina/ferramentas/pinterest_pins.py pasta-saida https://pin.it/xxxx https://pin.it/yyyy

# testar um site (gera capturas de todas as telas e um relatório)
pip install -q rangehttpserver
(cd lavanderia-avexada && python3 -m RangeHTTPServer 8765 &)
node .claude/dina/ferramentas/auditar_site.js http://localhost:8765/index-realista.html pasta-auditoria
```

---

## O que a Dina aprendeu nos trabalhos anteriores

- **Avexada (lavanderia):** o site só ficou bom depois de reprovações seguidas: rolagem lateral, vídeo travando, pessoa recortada com borda feia. A solução aprovada foi zoom no produto conduzido pela rolagem.
- **LanLan (coxinhas):** a primeira versão copiou o estilo do site que o cliente já tinha, tinha recortes ruins e faixa correndo. A versão nova usa as **fotos da sessão profissional do Drive**, um conceito próprio ("É risada alta. É Nordeste no recheio.") e super zoom com giro 360° nas novidades.
- **LanLan, 2ª rodada:** a gestora pediu para **tirar as fotos de pessoas** e **devolver os destaques dos banners**. A versão final abre com o banner de Cookies crescendo até tomar a tela, empilha os outros banners em tela cheia, mantém o zoom com giro 360° e troca as pessoas por frases gigantes com o produto flutuando.
- **Lição mais cara:** ela não olhava o que fazia. Agora o prompt manda **rolar o site como uma pessoa, capturar cada momento das animações e abrir as imagens** antes de entregar.

## Limitações que você precisa saber

- **A busca do Pinterest não funciona sem login.** A Dina abre os links que você manda, mas não consegue navegar pelos resultados de busca do site. Mande links sempre que puder.
- **O Instagram é bloqueado** neste ambiente. Mande prints.
- **O Higgsfield no plano grátis** só gera imagens no modelo simples. Para fotos mais realistas, é preciso o plano pago ou fotos reais.
- **Arquivos do Google Drive** acima de 10 MB não baixam. Mande vídeos curtos ou prints.

## Conexões que deixam a Dina mais forte

| Conexão | Situação | Para que serve |
|---|---|---|
| Netlify | conexão incompleta | Publicar os sites direto na internet. **Termine a conexão em claude.ai → Configurações → Conectores.** |
| META ADS | precisa reconectar | Conferir o Pixel e os resultados das campanhas que levam ao site. |
| Windsor.ai | precisa reconectar | Relatórios de Meta, Google e Instagram. |
| Google Drive | conectado | Receber logos, fotos e vídeos dos clientes. |
| Higgsfield | conectado | Gerar imagens de produto com IA. |

**Plugins recomendados** (catálogo do Claude, em claude.ai → Plugins):
- **frontend-design** (Anthropic): boas práticas de interface.
- **Website Design** (UXKIN): 15 mil sistemas de design de sites reais, que servem de referência extra além do Pinterest.
