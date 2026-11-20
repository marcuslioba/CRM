# Conhecimento da Dina: sites com produto em 3D e animação na rolagem

Pesquisado na internet (fontes no final). A cliente quer entregar sites desse tipo (referências do Instagram dela). A Dina deve ler este arquivo antes de propor qualquer cena com produto girando.

## As 3 técnicas e quando usar cada uma
1. **Sequência de imagens no canvas** (a "técnica Apple"). Frames pré-renderizados, a rolagem escolhe o frame (`Math.floor(progresso * total)`) e `drawImage` desenha no canvas. Serve para giro 360° ou "bullet time". 60 a 150 frames para volta completa, 30 a 60 para giros curtos. Frames em WebP, todos do mesmo tamanho, diferença de poucos graus entre um e outro. É a mais fiel ao produto real e a que roda em qualquer celular.
2. **Modelo 3D (GLB) com Three.js + GSAP ScrollTrigger.** O ScrollTrigger movimenta a câmera ou o objeto numa timeline presa à rolagem (scrub). Permite órbita livre, mas precisa de um modelo 3D bom. Mantenha o GLB leve (30 a 50 mil triângulos, textura comprimida).
3. **Zoom em foto parada** (o que já fazemos na LanLan). Mais simples, mas não gira.

Regra: sem modelo 3D bom nem vídeo/fotos do giro real, não prometer órbita. Foto única de produto cortado não vira 3D crível (o verso é inventado pela IA).

## Como conseguir o material do giro
- Melhor: a cliente filma o produto num prato giratório (10 a 15 s, câmera parada, luz uniforme, fundo liso). Extrair os frames com ffmpeg, remover o fundo e exportar WebP.
- Alternativa paga: Higgsfield `meshy_v7_image_to_3d` (38 créditos por modelo em testes) ou `hunyuan3d_v3_image_to_3d` com 2 a 4 fotos.
- Alternativa gratuita: TripoSR (MIT), exige baixar pesos do Hugging Face. Em CPU roda, mas o ambiente da sessão pediu autorização para executar o download e foi negado; só tentar com a cliente autorizando.

## Regras de desempenho
- Pré-carregar os frames (ou carregar em blocos) e desenhar só quando o frame muda.
- Scrub suave com rAF; nunca "scrubar" `<video>` (trava).
- Celular: menos frames (30 a 40) e imagens menores.

## Limites encontrados
- Instagram bloqueia acesso automático (links dos reels não abrem no ambiente). Pedir à cliente prints, gravação de tela ou descrição de cada referência.

## Fontes
- Codrops, "How to Build Cinematic 3D Scroll Experiences with GSAP": https://tympanus.net/codrops/2025/11/19/how-to-build-cinematic-3d-scroll-experiences-with-gsap/
- Svilenkovic, "How to make scroll driven 3D": https://svilenkovic.com/3d/how-to-make-scroll-driven-3d
- Repositório iPhone 15 Pro (GSAP + Three.js): https://github.com/adrianhajdin/iphone
- Visão 360° de produto com sequência de frames: https://dev.to/jayanthra/360deg-product-view-3jbn
- TripoSR (Stability AI + Tripo, MIT): https://huggingface.co/stabilityai/TripoSR
