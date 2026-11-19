#!/usr/bin/env python3
"""
Pina · leitor de pins do Pinterest
==================================

Recebe links de pins (pin.it/... ou pinterest.com/pin/...) e, para cada um:
  1. segue o link curto até a página do pin;
  2. lê título, descrição, imagem e vídeo (quando o pin é vídeo);
  3. baixa a imagem e o vídeo para a pasta de saída;
  4. gera uma "folha de contato" (6 quadros do vídeo lado a lado) para analisar
     layout, cores, tipografia e movimento.

Uso:
  python3 -I pinterest_pins.py <pasta_saida> <link1> [link2 ...]

Saída:
  <pasta_saida>/pins.json          resumo de todos os pins
  <pasta_saida>/<id>/imagem.jpg    imagem do pin
  <pasta_saida>/<id>/video.mp4     vídeo (se houver)
  <pasta_saida>/<id>/quadros.jpg   6 quadros do vídeo (se houver)

Requisitos: curl e ffmpeg instalados; rede liberada para
pin.it, www.pinterest.com, br.pinterest.com, i.pinimg.com, v1.pinimg.com.
"""
import json, os, re, subprocess, sys, html

UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"


def curl(url, destino=None):
    """Baixa uma URL com curl (respeita o proxy do ambiente). Retorna (url_final, corpo)."""
    cmd = ["curl", "-sSL", "-A", UA, "-w", "\n%{url_effective}", url]
    if destino:
        cmd = ["curl", "-sSL", "-A", UA, "-o", destino, "-w", "%{url_effective}", url]
    r = subprocess.run(cmd, capture_output=True, text=not destino, timeout=90)
    if r.returncode != 0:
        raise RuntimeError(f"falha ao baixar {url}: {r.stderr.strip()[:200] if isinstance(r.stderr, str) else r.stderr[:200]}")
    if destino:
        return r.stdout.decode() if isinstance(r.stdout, bytes) else r.stdout, None
    corpo, _, final = r.stdout.rpartition("\n")
    return final, corpo


def meta(pagina, nome):
    m = re.search(r'<meta[^>]+(?:property|name)="%s"[^>]+content="([^"]*)"' % re.escape(nome), pagina) or \
        re.search(r'<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="%s"' % re.escape(nome), pagina)
    return html.unescape(m.group(1)) if m else ""


def melhor_video(pagina):
    vids = sorted(set(re.findall(r'https://v1\.pinimg\.com/videos/[^"\\\s]+\.mp4', pagina)))
    if not vids:
        return ""
    # prefere 720p em mp4 comum (o hevc nem todo ffmpeg/navegador lê)
    for chave in ("720p", "expMp4", "720w"):
        for v in vids:
            if chave in v and "hevc" not in v.lower():
                return v
    comuns = [v for v in vids if "hevc" not in v.lower()]
    return (comuns or vids)[0]


def folha_de_contato(video, saida):
    dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video],
                         capture_output=True, text=True).stdout.strip()
    try:
        d = max(float(dur), 1.0)
    except ValueError:
        return False
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-vf",
                        f"fps=6/{d},scale=480:-1,tile=3x2", "-frames:v", "1", saida])
    return r.returncode == 0


def ler_pin(link, pasta):
    final, pagina = curl(link)
    pid = (re.search(r"/pin/(\d+)", final) or re.search(r"/pin/(\d+)", pagina or "") or [None, "sem_id"])[1]
    if pid == "sem_id":
        raise RuntimeError("o link não abriu um pin (confira se o link está certo e se o pin é público)")
    info = {
        "link": link,
        "pagina": final.split("?")[0],
        "id": pid,
        "titulo": meta(pagina, "og:title"),
        "descricao": meta(pagina, "og:description"),
        "imagem": meta(pagina, "og:image"),
        "video": melhor_video(pagina),
    }
    destino = os.path.join(pasta, pid)
    os.makedirs(destino, exist_ok=True)
    if info["imagem"]:
        grande = re.sub(r"/(236x|474x|736x)/", "/originals/", info["imagem"])
        try:
            curl(grande, os.path.join(destino, "imagem.jpg"))
        except RuntimeError:
            curl(info["imagem"], os.path.join(destino, "imagem.jpg"))
        info["arquivo_imagem"] = os.path.join(destino, "imagem.jpg")
    if info["video"]:
        arq = os.path.join(destino, "video.mp4")
        curl(info["video"], arq)
        info["arquivo_video"] = arq
        q = os.path.join(destino, "quadros.jpg")
        if folha_de_contato(arq, q):
            info["arquivo_quadros"] = q
    return info


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    pasta, links = sys.argv[1], sys.argv[2:]
    os.makedirs(pasta, exist_ok=True)
    resultado = []
    for link in links:
        try:
            info = ler_pin(link, pasta)
            print(f"OK  {info['id']}  {info['titulo'][:70]}  {'[vídeo]' if info['video'] else '[imagem]'}")
        except Exception as e:  # um pin com problema não derruba os outros
            info = {"link": link, "erro": str(e)}
            print(f"ERRO {link}: {e}")
        resultado.append(info)
    with open(os.path.join(pasta, "pins.json"), "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)
    print(f"\nResumo salvo em {os.path.join(pasta, 'pins.json')}")
    if all("erro" in r for r in resultado):
        print("Nenhum pin foi lido. Se o erro for de conexão (403/ENOTFOUND), os endereços do Pinterest "
              "precisam ser liberados na rede do ambiente.")
        sys.exit(2)


if __name__ == "__main__":
    main()
