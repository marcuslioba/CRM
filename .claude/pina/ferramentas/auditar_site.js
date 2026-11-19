#!/usr/bin/env node
/*
 Pina · auditoria de site (UX/UI)
 ================================
 Abre o site como um cliente faria, no computador (1366x768) e no celular (390x844),
 rola a página inteira tirando uma captura por tela e roda checagens automáticas.

 Uso:
   node auditar_site.js <url> <pasta_saida>
   ex.: (cd pasta-do-site && python3 -m RangeHTTPServer 8765 &)   # servidor que aceita "pular" em vídeos
        node auditar_site.js http://localhost:8765/index.html /tmp/auditoria

 O que verifica, em cada aparelho:
   - erros de JavaScript e do console
   - rolagem lateral indevida (página mais larga que a tela)
   - imagens sem texto alternativo (alt) e quantidade de <h1>
   - botões/links com menos de 40px de altura ou largura (difíceis de tocar)
   - links do menu do topo: depois do clique, a seção precisa começar no topo da tela (≈0px)
   - links de WhatsApp (precisam apontar para wa.me com o número certo)
   - elementos com o atributo hidden que mesmo assim aparecem (erro clássico)
   - fluidez da rolagem: intervalo médio entre quadros e quantas travadas acima de 50ms
 E salva:
   <pasta>/<aparelho>-NN.png   uma captura por tela, de cima a baixo
   <pasta>/<aparelho>-folha.jpg todas as capturas numa folha só (se o ffmpeg existir)
   <pasta>/relatorio.json      tudo que foi medido

 Depois de rodar: ABRA AS FOLHAS E OLHE CADA TELA. As checagens automáticas não
 enxergam texto encavalado, imagem cortada ou desenho feio.
*/
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');

const [url, saida] = process.argv.slice(2);
if (!url || !saida) { console.log('Uso: node auditar_site.js <url> <pasta_saida>'); process.exit(1); }
fs.mkdirSync(saida, { recursive: true });

const APARELHOS = [
  ['computador', { viewport: { width: 1366, height: 768 } }],
  ['celular', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
];

(async () => {
  const b = await chromium.launch(); const relatorio = {};
  for (const [nome, cfg] of APARELHOS) {
    const ctx = await b.newContext(cfg); const p = await ctx.newPage(); const erros = []; let bytes = 0, arquivos = 0;
    p.on('pageerror', e => erros.push('JS: ' + e.message));
    p.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
    p.on('requestfinished', async r => { try { bytes += (await r.sizes()).responseBodySize; arquivos++; } catch (e) {} });
    await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(2500);

    // capturas tela a tela
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    const passo = Math.round(cfg.viewport.height * 0.9); let n = 0;
    await p.screenshot({ path: path.join(saida, `${nome}-${String(n++).padStart(2, '0')}.png`) });
    for (let y = passo; y < H; y += passo) {
      await p.mouse.wheel(0, passo); await p.waitForTimeout(700);
      await p.screenshot({ path: path.join(saida, `${nome}-${String(n++).padStart(2, '0')}.png`) });
    }

    const info = await p.evaluate(() => {
      const visivel = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
      return {
        rolagemLateral: document.documentElement.scrollWidth > innerWidth,
        imagensSemAlt: [...document.images].filter(i => !i.hasAttribute('alt')).map(i => i.src.split('/').pop()),
        quantidadeH1: document.querySelectorAll('h1').length,
        alvosPequenos: [...document.querySelectorAll('a,button,summary,[role=button]')].filter(visivel).filter(e => { const r = e.getBoundingClientRect(); return r.width < 40 || r.height < 40; })
          .map(e => `${(e.textContent.trim() || e.getAttribute('aria-label') || e.className).replace(/\s+/g, ' ').slice(0, 30)} (${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)})`),
        linksWhatsApp: [...new Set([...document.querySelectorAll('a[href*="wa.me"],a[href*="whatsapp"]')].map(a => a.href.split('?')[0]))],
        hiddenAparecendo: [...document.querySelectorAll('[hidden]')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.id || e.className),
        menu: [...document.querySelectorAll('header a[href^="#"], nav a[href^="#"]')].filter(visivel).map(a => a.getAttribute('href')).filter((v, i, a) => v.length > 1 && a.indexOf(v) === i),
      };
    });

    // âncoras do menu
    info.ancoras = {};
    for (const h of info.menu) {
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
      const a = await p.$(`header a[href="${h}"], nav a[href="${h}"]`);
      if (!a || !(await a.isVisible())) continue;
      await a.click(); await p.waitForTimeout(1600);
      info.ancoras[h] = await p.evaluate(h => { const e = document.querySelector(h); return e ? Math.round(e.getBoundingClientRect().top) : 'seção não existe'; }, h);
    }

    // fluidez da rolagem
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
    await p.evaluate(() => { window.__q = []; let l = performance.now(); (function t(x) { window.__q.push(x - l); l = x; requestAnimationFrame(t); })(performance.now()); });
    for (let i = 0; i < 60; i++) { await p.mouse.wheel(0, H / 60); await p.waitForTimeout(50); }
    info.fluidez = await p.evaluate(() => { const q = window.__q.slice(5); return { intervaloMedioMs: +(q.reduce((a, b) => a + b, 0) / q.length).toFixed(1), travadasAcima50ms: q.filter(x => x > 50).length }; });

    info.alturaPagina = H; info.telas = n; info.pesoMB = +(bytes / 1048576).toFixed(2); info.arquivos = arquivos; info.erros = erros;
    relatorio[nome] = info; await ctx.close();

    try { execSync(`ffmpeg -v error -y -pattern_type glob -i '${path.join(saida, nome)}-*.png' -vf "scale=${nome === 'celular' ? 260 : 480}:-1,tile=${nome === 'celular' ? '8x2' : '4x4'}" -frames:v 1 '${path.join(saida, nome)}-folha.jpg'`); } catch (e) {}

    const ok = v => v ? 'OK  ' : 'ATENÇÃO';
    console.log(`\n=== ${nome} ===`);
    console.log(`${ok(!erros.length)} erros: ${erros.length ? erros.join(' | ') : 'nenhum'}`);
    console.log(`${ok(!info.rolagemLateral)} rolagem lateral indevida: ${info.rolagemLateral ? 'SIM' : 'não'}`);
    console.log(`${ok(!info.imagensSemAlt.length)} imagens sem alt: ${info.imagensSemAlt.length}`);
    console.log(`${ok(info.quantidadeH1 === 1)} títulos h1: ${info.quantidadeH1}`);
    console.log(`${ok(!info.hiddenAparecendo.length)} elementos "hidden" aparecendo: ${info.hiddenAparecendo.join(', ') || 'nenhum'}`);
    console.log(`${ok(info.alvosPequenos.length <= 1)} alvos de toque < 40px: ${info.alvosPequenos.length} ${info.alvosPequenos.slice(0, 8).join('; ')}`);
    console.log(`${ok(Object.values(info.ancoras).every(v => v === 0 || v === -0 || Math.abs(v) < 4))} âncoras do menu (ideal 0): ${JSON.stringify(info.ancoras)}`);
    console.log(`${ok(info.linksWhatsApp.length === 1)} links de WhatsApp: ${info.linksWhatsApp.join(', ') || 'NENHUM'}`);
    console.log(`${ok(info.fluidez.travadasAcima50ms <= 3)} fluidez: ${info.fluidez.intervaloMedioMs}ms entre quadros (16,7 = 60 por segundo), ${info.fluidez.travadasAcima50ms} travadas`);
    console.log(`     página: ${H}px · ${n} telas · ${info.pesoMB} MB em ${arquivos} arquivos`);
  }
  fs.writeFileSync(path.join(saida, 'relatorio.json'), JSON.stringify(relatorio, null, 2));
  console.log(`\nCapturas e relatório em ${saida}. Agora olhe as folhas *-folha.jpg tela por tela.`);
  await b.close();
})();
