const express = require('express');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ============================================================
// HELPERS
// ============================================================

function getSubdomain(host) {
  if (!host) return null;
  // Remove port
  const h = host.split(':')[0];
  // localhost ou IP = sem subdomínio
  if (h === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(h)) return null;
  const parts = h.split('.');
  // subdominio.dominio.com.br → parts[0] = subdominio
  if (parts.length > 2) return parts[0].toLowerCase();
  return null;
}

function dataPath(subdomain, file) {
  return path.join(__dirname, 'data', subdomain, file);
}

function loadJSON(subdomain, file) {
  const p = dataPath(subdomain, file);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveJSON(subdomain, file, data) {
  const dir = path.join(__dirname, 'data', subdomain);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), JSON.stringify(data, null, 2), 'utf8');
}

// ============================================================
// CARDÁPIO PÚBLICO (subdomínios)
// ============================================================

app.get('/', (req, res) => {
  const sub = getSubdomain(req.headers.host);

  // Sem subdomínio → landing page do SaaS
  if (!sub) {
    return res.send(getLandingPage());
  }

  // Com subdomínio → cardápio do restaurante
  const cardapio = loadJSON(sub, 'cardapio.json');
  if (!cardapio) {
    return res.status(404).send(get404Page(sub));
  }

  res.send(getCardapioPage(cardapio));
});

// ============================================================
// PAINEL ADMIN
// ============================================================

// Login page
app.get('/admin', (req, res) => {
  const sub = getSubdomain(req.headers.host);
  if (!sub) {
    return res.status(400).send('<h1>Acesso inválido</h1>');
  }

  // Já logado?
  const adminToken = req.cookies[`admin_${sub}`];
  const config = loadJSON(sub, 'config.json');
  if (config && adminToken && adminToken === config.adminToken) {
    return res.send(getAdminPage());
  }

  res.send(getLoginPage());
});

// Login POST
app.post('/api/admin/login', (req, res) => {
  const sub = getSubdomain(req.headers.host);
  if (!sub) return res.status(400).json({ error: 'Subdomínio inválido' });

  const { username, password } = req.body;
  const config = loadJSON(sub, 'config.json');
  if (!config) return res.status(404).json({ error: 'Restaurante não encontrado' });

  if (username === config.adminUser && bcrypt.compareSync(password, config.adminPassHash)) {
    const token = bcrypt.hashSync(Date.now().toString(), 10);
    config.adminToken = token;
    saveJSON(sub, 'config.json', config);

    res.cookie(`admin_${sub}`, token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24h
      sameSite: 'strict'
    });
    return res.json({ ok: true });
  }

  res.status(401).json({ error: 'Usuário ou senha incorretos' });
});

// Logout
app.post('/api/admin/logout', (req, res) => {
  const sub = getSubdomain(req.headers.host);
  if (sub) {
    const config = loadJSON(sub, 'config.json');
    if (config) {
      delete config.adminToken;
      saveJSON(sub, 'config.json', config);
    }
    res.clearCookie(`admin_${sub}`);
  }
  res.json({ ok: true });
});

// Middleware de auth para API
function requireAuth(req, res, next) {
  const sub = getSubdomain(req.headers.host);
  if (!sub) return res.status(400).json({ error: 'Subdomínio inválido' });

  const adminToken = req.cookies[`admin_${sub}`];
  const config = loadJSON(sub, 'config.json');
  if (!config || !adminToken || adminToken !== config.adminToken) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  req.subdomain = sub;
  next();
}

// GET cardápio (admin)
app.get('/api/cardapio', requireAuth, (req, res) => {
  const cardapio = loadJSON(req.subdomain, 'cardapio.json');
  res.json(cardapio);
});

// PUT cardápio (admin salva tudo)
app.put('/api/cardapio', requireAuth, (req, res) => {
  saveJSON(req.subdomain, 'cardapio.json', req.body);
  res.json({ ok: true });
});

// ============================================================
// PÁGINAS HTML (inline por simplicidade)
// ============================================================

function getLandingPage() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restaurantes São Lourenço — Cardápio Digital</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f0f0f;color:#fff;min-height:100vh}
    .hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)}
    .hero h1{font-size:2.5rem;margin-bottom:1rem;background:linear-gradient(90deg,#e94560,#ff6b6b);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .hero p{font-size:1.2rem;color:#aaa;margin-bottom:2rem;max-width:600px}
    .btn{display:inline-block;padding:1rem 2.5rem;background:linear-gradient(90deg,#e94560,#ff6b6b);color:#fff;text-decoration:none;border-radius:50px;font-weight:700;font-size:1.1rem;transition:transform .2s,box-shadow .2s}
    .btn:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(233,69,96,.3)}
    .features{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:2rem;padding:4rem 2rem;max-width:1000px;margin:0 auto}
    .feature{background:#1a1a1a;border:1px solid #333;border-radius:16px;padding:2rem;text-align:center}
    .feature .icon{font-size:2.5rem;margin-bottom:1rem}
    .feature h3{margin-bottom:.5rem;color:#e94560}
    .feature p{color:#888;font-size:.9rem}
    .pricing{padding:4rem 2rem;text-align:center;background:#1a1a1a}
    .pricing h2{font-size:2rem;margin-bottom:1rem}
    .price{font-size:3rem;font-weight:700;color:#e94560;margin:.5rem 0}
    .price span{font-size:1rem;color:#888}
    footer{padding:2rem;text-align:center;color:#555;font-size:.85rem;border-top:1px solid #222}
  </style>
</head>
<body>
  <section class="hero">
    <h1>🍽️ Restaurantes São Lourenço</h1>
    <p>Seu cardápio digital acessível por QR Code. Bonito, rápido e fácil de atualizar. Sem complicação.</p>
    <a href="#contato" class="btn">Quero meu cardápio</a>
  </section>

  <section class="features">
    <div class="feature">
      <div class="icon">📱</div>
      <h3>Mobile First</h3>
      <p>Perfeito no celular. Seu cliente escaneia o QR Code e vê o cardápio bonito na tela.</p>
    </div>
    <div class="feature">
      <div class="icon">✏️</div>
      <h3>Você Mesmo Edita</h3>
      <p>Painel simples para trocar preços, adicionar pratos, ocultar itens. Sem precisar de técnico.</p>
    </div>
    <div class="feature">
      <div class="icon">⚡</div>
      <h3>Rápido</h3>
      <p>Página estática ultra-rápida. Carrega instantâneo mesmo na internet do restaurante.</p>
    </div>
    <div class="feature">
      <div class="icon">🔒</div>
      <h3>Subdomínio Próprio</h3>
      <p>Seu restaurante tem seu próprio endereço: nomerestaurante.restaurantessaolourenco.com.br</p>
    </div>
  </section>

  <section class="pricing" id="contato">
    <h2>Preço Simples</h2>
    <div class="price">R$30<span>/mês</span></div>
    <p style="color:#888;margin:1rem 0 2rem">Sem taxa de setup. Sem surpresas. Cancele quando quiser.</p>
    <a href="mailto:contato@restaurantessaolourenco.com.br" class="btn">Fale Conosco</a>
  </section>

  <footer>
    © 2026 Restaurantes São Lourenço — São Lourenço, MG
  </footer>
</body>
</html>`;
}

function get404Page(sub) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cardápio não encontrado</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f0f0f;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem}
    h1{font-size:4rem;color:#e94560;margin-bottom:1rem}
    p{color:#888;font-size:1.1rem}
    a{color:#e94560}
  </style>
</head>
<body>
  <div>
    <h1>404</h1>
    <p>O cardápio de <strong>${sub}</strong> ainda não foi criado.</p>
    <p style="margin-top:2rem"><a href="/">← Voltar ao início</a></p>
  </div>
</body>
</html>`;
}

function getCardapioPage(cardapio) {
  const cor = cardapio.cor || '#e94560';
  const nome = cardapio.nome || 'Restaurante';
  const categorias = cardapio.categorias || [];

  let htmlCategorias = '';
  for (const cat of categorias) {
    const pratos = (cat.pratos || []).filter(p => !p.oculto);
    if (pratos.length === 0) continue;

    htmlCategorias += `
    <div class="categoria">
      <h2 class="categoria-nome">${escapeHtml(cat.nome)}</h2>
      <div class="pratos">`;
    for (const prato of pratos) {
      htmlCategorias += `
        <div class="prato">
          ${prato.foto ? `<div class="prato-foto"><img src="${prato.foto}" alt="${escapeHtml(prato.nome)}" loading="lazy"></div>` : ''}
          <div class="prato-info">
            <div class="prato-topo">
              <h3 class="prato-nome">${escapeHtml(prato.nome)}</h3>
              <span class="prato-preco">${prato.preco ? 'R$ ' + parseFloat(prato.preco).toFixed(2).replace('.', ',') : ''}</span>
            </div>
            ${prato.descricao ? `<p class="prato-desc">${escapeHtml(prato.descricao)}</p>` : ''}
          </div>
        </div>`;
    }
    htmlCategorias += `</div></div>`;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(nome)} — Cardápio</title>
  <meta name="theme-color" content="${cor}">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f0f0f;color:#eee;min-height:100vh;padding-bottom:4rem}
    .header{background:linear-gradient(135deg,${cor},${cor}dd);padding:2.5rem 1.5rem;text-align:center;position:sticky;top:0;z-index:10;box-shadow:0 4px 20px rgba(0,0,0,.3)}
    .header h1{font-size:1.8rem;color:#fff;margin-bottom:.3rem}
    .header p{color:rgba(255,255,255,.8);font-size:.9rem}
    .container{max-width:600px;margin:0 auto;padding:1.5rem 1rem}
    .categoria{margin-bottom:2rem}
    .categoria-nome{font-size:1.3rem;color:${cor};border-bottom:2px solid ${cor}33;padding-bottom:.5rem;margin-bottom:1rem;text-transform:uppercase;letter-spacing:.5px}
    .pratos{display:flex;flex-direction:column;gap:1rem}
    .prato{display:flex;gap:1rem;background:#1a1a1a;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;transition:border-color .2s}
    .prato:hover{border-color:${cor}55}
    .prato-foto{width:100px;height:100px;flex-shrink:0;background:#2a2a2a}
    .prato-foto img{width:100%;height:100%;object-fit:cover}
    .prato-info{flex:1;padding:.8rem .5rem .8rem 0;display:flex;flex-direction:column;justify-content:center}
    .prato-topo{display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem}
    .prato-nome{font-size:1rem;color:#fff}
    .prato-preco{font-size:1rem;font-weight:700;color:${cor};white-space:nowrap}
    .prato-desc{font-size:.8rem;color:#888;margin-top:.3rem;line-height:1.4}
    .footer{text-align:center;padding:2rem 1rem;color:#555;font-size:.8rem}
    .footer a{color:${cor};text-decoration:none}
    @media(max-width:400px){
      .prato-foto{width:80px;height:80px}
      .prato-nome{font-size:.9rem}
      .prato-preco{font-size:.9rem}
    }
  </style>
</head>
<body>
  <header class="header">
    <h1>${escapeHtml(nome)}</h1>
    ${cardapio.descricao ? `<p>${escapeHtml(cardapio.descricao)}</p>` : ''}
  </header>
  <main class="container">
    ${htmlCategorias || '<p style="text-align:center;color:#666;padding:3rem 0">Cardápio sendo preparado. Volte em breve!</p>'}
  </main>
  <footer class="footer">
    Cardápio digital por <a href="/">Restaurantes São Lourenço</a>
  </footer>
</body>
</html>`;
}

function getLoginPage() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin — Login</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f0f0f;color:#eee;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem}
    .box{background:#1a1a1a;border:1px solid #333;border-radius:16px;padding:2.5rem;width:100%;max-width:380px}
    h1{text-align:center;margin-bottom:.5rem;font-size:1.5rem}
    .sub{text-align:center;color:#888;margin-bottom:2rem;font-size:.9rem}
    label{display:block;font-size:.85rem;font-weight:600;margin-bottom:.4rem;color:#aaa}
    input{width:100%;padding:.75rem 1rem;background:#0f0f0f;border:1px solid #333;border-radius:8px;color:#fff;font-size:1rem;margin-bottom:1rem;outline:none;transition:border-color .2s}
    input:focus{border-color:#e94560}
    button{width:100%;padding:.85rem;background:#e94560;color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:700;cursor:pointer;transition:background .2s}
    button:hover{background:#d63851}
    .erro{color:#ff6b6b;font-size:.85rem;text-align:center;margin-top:1rem;display:none}
  </style>
</head>
<body>
  <div class="box">
    <h1>🔐 Painel Admin</h1>
    <p class="sub">Acesse para editar seu cardápio</p>
    <form id="loginForm">
      <label for="user">Usuário</label>
      <input type="text" id="user" required autocomplete="username">
      <label for="pass">Senha</label>
      <input type="password" id="pass" required autocomplete="current-password">
      <button type="submit">Entrar</button>
      <p class="erro" id="erro"></p>
    </form>
  </div>
  <script>
    document.getElementById('loginForm').onsubmit = async (e) => {
      e.preventDefault();
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          username: document.getElementById('user').value,
          password: document.getElementById('pass').value
        })
      });
      if (res.ok) {
        location.reload();
      } else {
        const data = await res.json();
        const erro = document.getElementById('erro');
        erro.textContent = data.error || 'Erro ao fazer login';
        erro.style.display = 'block';
      }
    };
  </script>
</body>
</html>`;
}

function getAdminPage() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin — Cardápio</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f0f0f;color:#eee;min-height:100vh}
    .topbar{background:#1a1a1a;border-bottom:1px solid #333;padding:1rem 1.5rem;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:10}
    .topbar h1{font-size:1.1rem}
    .topbar-btns{display:flex;gap:.5rem}
    .btn{padding:.5rem 1rem;border-radius:6px;border:none;font-size:.85rem;font-weight:600;cursor:pointer}
    .btn-primary{background:#e94560;color:#fff}
    .btn-secondary{background:#333;color:#fff}
    .btn-danger{background:#dc2626;color:#fff}
    .btn:hover{opacity:.9}
    .container{max-width:800px;margin:0 auto;padding:1.5rem 1rem}
    .section{background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:1.5rem;margin-bottom:1.5rem}
    .section h2{font-size:1.1rem;margin-bottom:1rem;color:#e94560}
    label{display:block;font-size:.8rem;font-weight:600;color:#aaa;margin-bottom:.3rem}
    input,textarea,select{width:100%;padding:.6rem .8rem;background:#0f0f0f;border:1px solid #333;border-radius:6px;color:#fff;font-size:.9rem;margin-bottom:.8rem;outline:none}
    input:focus,textarea:focus{border-color:#e94560}
    textarea{resize:vertical;min-height:60px}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
    .cat-item{background:#0f0f0f;border:1px solid #333;border-radius:8px;padding:1rem;margin-bottom:1rem}
    .cat-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem}
    .cat-header h3{font-size:1rem}
    .prato-item{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:1rem;margin-bottom:.8rem;position:relative}
    .prato-item.oculto{opacity:.5}
    .prato-actions{display:flex;gap:.4rem;margin-top:.5rem}
    .prato-actions button{padding:.3rem .6rem;font-size:.75rem;border-radius:4px;border:none;cursor:pointer;font-weight:600}
    .btn-ocultar{background:#f59e0b;color:#000}
    .btn-mostrar{background:#16a34a;color:#fff}
    .btn-excluir{background:#dc2626;color:#fff}
    .btn-mover{background:#333;color:#fff}
    .add-btn{width:100%;padding:.75rem;background:transparent;border:2px dashed #444;border-radius:8px;color:#888;font-size:.9rem;cursor:pointer;transition:all .2s}
    .add-btn:hover{border-color:#e94560;color:#e94560}
    .toast{position:fixed;bottom:1rem;right:1rem;padding:.75rem 1.5rem;background:#16a34a;color:#fff;border-radius:8px;font-size:.9rem;z-index:100;display:none}
    .toast.show{display:block}
  </style>
</head>
<body>
  <div class="topbar">
    <h1>🍽️ Painel do Restaurante</h1>
    <div class="topbar-btns">
      <button class="btn btn-secondary" onclick="logout()">Sair</button>
      <button class="btn btn-primary" onclick="salvar()">💾 Salvar Tudo</button>
    </div>
  </div>

  <div class="container">
    <!-- Dados do Restaurante -->
    <div class="section">
      <h2>🏪 Dados do Restaurante</h2>
      <div class="grid-2">
        <div>
          <label>Nome do Restaurante</label>
          <input type="text" id="restNome">
        </div>
        <div>
          <label>Cor do Tema (hex)</label>
          <input type="color" id="restCor" style="height:38px;padding:2px">
        </div>
      </div>
      <label>Descrição (opcional)</label>
      <textarea id="restDesc" rows="2"></textarea>
    </div>

    <!-- Categorias -->
    <div class="section">
      <h2>📂 Categorias e Pratos</h2>
      <div id="categorias"></div>
      <button class="add-btn" onclick="addCategoria()">+ Adicionar Categoria</button>
    </div>
  </div>

  <div class="toast" id="toast">✅ Salvo com sucesso!</div>

  <script>
    let cardapio = { nome: '', descricao: '', cor: '#e94560', categorias: [] };

    // Carregar dados
    async function load() {
      const res = await fetch('/api/cardapio');
      cardapio = await res.json() || { nome: '', descricao: '', cor: '#e94560', categorias: [] };
      document.getElementById('restNome').value = cardapio.nome || '';
      document.getElementById('restDesc').value = cardapio.descricao || '';
      document.getElementById('restCor').value = cardapio.cor || '#e94560';
      renderCategorias();
    }

    function renderCategorias() {
      const el = document.getElementById('categorias');
      el.innerHTML = '';
      cardapio.categorias.forEach((cat, ci) => {
        const div = document.createElement('div');
        div.className = 'cat-item';
        div.innerHTML = \`
          <div class="cat-header">
            <input type="text" value="\${cat.nome}" onchange="cat.nome=this.value" style="font-size:1rem;font-weight:700;background:transparent;border:none;color:#fff;flex:1" placeholder="Nome da categoria">
            <button class="btn-excluir btn" onclick="cardapio.categorias.splice(\${ci},1);renderCategorias()" style="padding:.3rem .6rem;font-size:.75rem">✕ Excluir</button>
          </div>
          <div id="pratos-\${ci}"></div>
          <button class="add-btn" onclick="addPrato(\${ci})">+ Adicionar Prato</button>
        \`;
        el.appendChild(div);

        const pratosEl = div.querySelector('#pratos-' + ci);
        (cat.pratos || []).forEach((p, pi) => {
          const pd = document.createElement('div');
          pd.className = 'prato-item' + (p.oculto ? ' oculto' : '');
          pd.innerHTML = \`
            <div class="grid-2">
              <div>
                <label>Nome do Prato</label>
                <input type="text" value="\${p.nome||''}" onchange="cardapio.categorias[\${ci}].pratos[\${pi}].nome=this.value">
              </div>
              <div>
                <label>Preço (R$)</label>
                <input type="text" value="\${p.preco||''}" onchange="cardapio.categorias[\${ci}].pratos[\${pi}].preco=this.value" placeholder="19,90">
              </div>
            </div>
            <label>Descrição</label>
            <textarea rows="2" onchange="cardapio.categorias[\${ci}].pratos[\${pi}].descricao=this.value">\${p.descricao||''}</textarea>
            <div class="prato-actions">
              <button class="\${p.oculto?'btn-mostrar':'btn-ocultar'}" onclick="cardapio.categorias[\${ci}].pratos[\${pi}].oculto=!cardapio.categorias[\${ci}].pratos[\${pi}].oculto;renderCategorias()">\${p.oculto?'👁 Mostrar':'👁‍🗨 Ocultar'}</button>
              <button class="btn-mover" onclick="moverPrato(\${ci},\${pi},-1)" \${pi===0?'disabled':''}>↑</button>
              <button class="btn-mover" onclick="moverPrato(\${ci},\${pi},1)" \${pi===(cat.pratos||[]).length-1?'disabled':''}>↓</button>
              <button class="btn-excluir" onclick="cardapio.categorias[\${ci}].pratos.splice(\${pi},1);renderCategorias()">Excluir</button>
            </div>
          \`;
          pratosEl.appendChild(pd);
        });
      });
    }

    function addCategoria() {
      cardapio.categorias.push({ nome: 'Nova Categoria', pratos: [] });
      renderCategorias();
    }

    function addPrato(ci) {
      if (!cardapio.categorias[ci].pratos) cardapio.categorias[ci].pratos = [];
      cardapio.categorias[ci].pratos.push({ nome: '', preco: '', descricao: '', oculto: false });
      renderCategorias();
    }

    function moverPrato(ci, pi, dir) {
      const arr = cardapio.categorias[ci].pratos;
      const novo = pi + dir;
      if (novo < 0 || novo >= arr.length) return;
      [arr[pi], arr[novo]] = [arr[novo], arr[pi]];
      renderCategorias();
    }

    async function salvar() {
      cardapio.nome = document.getElementById('restNome').value;
      cardapio.descricao = document.getElementById('restDesc').value;
      cardapio.cor = document.getElementById('restCor').value;

      const res = await fetch('/api/cardapio', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(cardapio)
      });
      if (res.ok) {
        const t = document.getElementById('toast');
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2000);
      }
    }

    async function logout() {
      await fetch('/api/admin/logout', { method: 'POST' });
      location.reload();
    }

    load();
  </script>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================
// START
// ============================================================

app.listen(PORT, () => {
  console.log(`🚀 Restaurantes São Lourenço rodando na porta ${PORT}`);
  console.log(`   http://localhost:${PORT}`);
});
