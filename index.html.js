
// ========== window.DATA ==========
(function(){
  var s = localStorage.getItem('cardapio');
  if(s){
    try{ window.DATA = JSON.parse(s); }catch(e){ window.DATA = null; }
  }
  if(!window.DATA||!window.DATA.categorias){
    window.DATA = {
      nome:'Burger Dash', whatsapp:'5535999999999',
      categorias:[
        {nome:'Burgers',icon:'🔥',pratos:[
          {nome:'Dash Classic',preco:32,descricao:'Carne 160g, Cheddar, Pão Australiano.',img:'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&w=400&q=80&fit=crop'},
          {nome:'Smash Dash',preco:29,descricao:'2x carne smash, queijo, cebola roxa.',img:'https://images.unsplash.com/photo-1530554764233-e79e16c91d08?auto=format&w=400&q=80&fit=crop'},
          {nome:'Bacon King',preco:38,descricao:'Maionese defumada e bacon crocante.',img:'https://images.unsplash.com/photo-1633424234673-c8cd0f4df77b?auto=format&w=400&q=80&fit=crop'},
          {nome:'Dash Duplo',preco:42,descricao:'2x carne 120g, duplo cheddar.',img:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&w=400&q=80&fit=crop'}
        ]},
        {nome:'Snacks',icon:'🍟',pratos:[
          {nome:'Batata Trufada',preco:24,descricao:'Azeite de trufas e Grana Padano.',img:'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&w=400&q=80&fit=crop'},
          {nome:'Onion Rings',preco:18,descricao:'Anéis de cebola empanados.',img:'https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&w=400&q=80&fit=crop'},
          {nome:'Nuggets Dash',preco:20,descricao:'10x nuggets crocantes.',img:'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&w=400&q=80&fit=crop'}
        ]},
        {nome:'Drinks',icon:'🥤',pratos:[
          {nome:'Refri Lata',preco:6,descricao:'Coca, Guaraná ou Fanta.',img:'https://images.unsplash.com/photo-1553787434-6e1d49c42e5d?auto=format&w=400&q=80&fit=crop'},
          {nome:'Suco Natural',preco:8,descricao:'Laranja, limão, maracujá.',img:'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?auto=format&w=400&q=80&fit=crop'},
          {nome:'Milkshake',preco:16,descricao:'Chocolate, morango ou ovomaltine.',img:'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&w=400&q=80&fit=crop'},
          {nome:'Água Mineral',preco:4,descricao:'Com ou sem gás.',img:'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&w=400&q=80&fit=crop'}
        ]},
        {nome:'Combos',icon:'🎁',pratos:[
          {nome:'Combo Solo',preco:45,descricao:'1 Burger + Batata + Refri.',img:'https://images.unsplash.com/photo-1662047317263-03ff37e76db2?auto=format&w=400&q=80&fit=crop'},
          {nome:'Combo Casal',preco:79.9,descricao:'2 Burgers + Batata G + 2 Refris.',img:'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&w=400&q=80&fit=crop'},
          {nome:'Combo Família',preco:129,descricao:'4 Burgers + 2 Batatas + 2 Refris + Nuggets.',img:'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&w=400&q=80&fit=crop'}
        ]}
      ]
    };
    try{ localStorage.setItem('cardapio',JSON.stringify(window.DATA)); }catch(e){}
  }
})();

var CART = {};
var ACTIVE_CAT = 0;

// ========== NAV ==========
function setNav(idx){
  for(var i=0;i<5;i++){
    var b=document.getElementById('bnHome'.replace('Home',i===0?'Home':i===1?'Menu':i===2?'Menu':i===3?'Loved':'Me'));
  }
  // simpler:
  document.getElementById('bnHome').classList.toggle('sel',idx===0);
  document.getElementById('bnMenu').classList.toggle('sel',idx===1);
  document.getElementById('bnLoved').classList.toggle('sel',idx===3);
  document.getElementById('bnMe').classList.toggle('sel',idx===4);
  if(idx===1) document.getElementById('catSection').scrollIntoView({behavior:'smooth'});
  if(idx===0) window.scrollTo({top:0,behavior:'smooth'});
}

// ========== CATEGORIES ==========
function renderCats(){
  var el = document.getElementById('catScroll');
  el.innerHTML = '';
  window.DATA.categorias.forEach(function(cat,i){
    var b = document.createElement('button');
    var active = i===ACTIVE_CAT;
    b.style.cssText = 'flex-shrink:0;padding:.5rem 1.2rem;border-radius:50px;font-weight:800;font-size:.65rem;text-transform:uppercase;letter-spacing:1px;cursor:pointer;border:3px solid #111827;transition:all .15s;font-family:inherit;' + (active?'background:#F97316;color:#fff;box-shadow:4px 4px 0 #111827':'background:#f3f4f6;color:#9ca3af');
    b.textContent = cat.icon + ' ' + cat.nome;
    b.onclick = function(){ ACTIVE_CAT=i; renderCats(); renderProds(); };
    el.appendChild(b);
  });
}

// ========== PRODUCTS ==========
function renderProds(){
  var grid = document.getElementById('prodGrid');
  var title = document.getElementById('prodTitle');
  if(title) title.textContent = window.DATA.categorias[ACTIVE_CAT].nome;
  grid.innerHTML = '';
  var cat = window.DATA.categorias[ACTIVE_CAT];
  if(!cat || !cat.pratos || !cat.pratos.length){
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#9ca3af;font-size:.75rem;padding:2rem">Nenhum produto nesta categoria</p>';
    return;
  }
  cat.pratos.forEach(function(p,pi){
    var key = ACTIVE_CAT+'-'+pi;
    var qty = CART[key] ? CART[key].qty : 0;
    var c = document.createElement('div');
    c.style.cssText = 'background:#f3f4f6;border-radius:20px;overflow:hidden;position:relative;animation:fadeIn .3s ease';
    c.innerHTML = '<div style="height:120px;overflow:hidden;position:relative">' +
      '<img src="'+p.img+'" alt="" style="width:100%;height:100%;object-fit:cover" loading="lazy" onerror="this.style.background=\'#e5e7eb\'">' +
      (qty>0?'<span style="position:absolute;top:6px;left:6px;background:#111827;color:#fff;width:22px;height:22px;border-radius:50%;font-size:.6rem;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid #fff">'+qty+'</span>':'') +
      '<button onclick="this.style.color=this.style.color==\'#F97316\'?\'#111827\':\'#F97316\';this.style.transform=this.style.transform==\'scale(1.2)\'?\'scale(1)\':\'scale(1.2)\';" style="position:absolute;top:6px;right:6px;width:28px;height:28px;background:rgba(255,255,255,.9);border-radius:50%;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;font-size:.85rem;transition:all .2s"><i class="ti ti-heart"></i></button>' +
      '</div>' +
      '<div style="padding:.7rem">' +
      '<h4 style="font-size:.78rem;font-weight:700;font-family:\'Inter\',sans-serif;margin-bottom:.15rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+p.nome+'</h4>' +
      '<p style="font-size:10px;color:#9ca3af;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:.4rem">'+p.descricao+'</p>' +
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
      '<span style="font-size:.82rem;font-weight:800;font-family:\'Inter\',sans-serif">R$ '+p.preco.toFixed(2).replace('.',',')+'</span>' +
      '<button onclick="addItem(\''+ACTIVE_CAT+'\',\''+pi+'\',\''+p.nome.replace(/'/g,"\\'")+'\','+p.preco+',\''+cat.icon+'\')" style="width:30px;height:30px;background:#fff;color:#F97316;border-radius:10px;display:flex;align-items:center;justify-content:center;border:1px solid #e5e7eb;cursor:pointer;font-size:1rem;transition:all .15s" onmouseover="this.style.background=\'#F97316\';this.style.color=\'#fff\';this.style.borderColor=\'#F97316\'" onmouseout="this.style.background=\'#fff\';this.style.color=\'#F97316\';this.style.borderColor=\'#e5e7eb\'"><i class="ti ti-plus"></i></button>' +
      '</div></div>';
    grid.appendChild(c);
  });
}

// ========== CART ==========
function addItem(catIdx,idx,name,price,icon){
  var key = catIdx+'-'+idx;
  if(CART[key]){ CART[key].qty++; } else { CART[key]={qty:1,name:name,price:price,icon:icon}; }
  updateCart();
  renderProds();
  toast('✅ ' + name + ' adicionado!');
}

function removeItem(key){
  if(!CART[key]) return;
  CART[key].qty--;
  if(CART[key].qty<=0) delete CART[key];
  updateCart();
  renderProds();
}

function cartCount(){
  var n=0; for(var k in CART){ n+=CART[k].qty; } return n;
}
function cartTotal(){
  var t=0; for(var k in CART){ t+=CART[k].price*CART[k].qty; } return t;
}

function updateCart(){
  var count = cartCount();
  var total = cartTotal();
  var bar = document.getElementById('cartBar');
  var bnNum = document.getElementById('bnCartNum');
  var hdrB = document.getElementById('hdrBadge');
  var hdrT = document.getElementById('hdrTotal');

  if(count>0){
    bar.classList.add('on');
    document.getElementById('cbNum').textContent = count;
    document.getElementById('cbQty').textContent = count + ' item' + (count>1?'ns':'');
    document.getElementById('cbTotal').textContent = 'R$ ' + total.toFixed(2).replace('.',',');
    bnNum.style.display = 'flex';
    bnNum.textContent = count;
    hdrB.style.display = 'flex';
    hdrB.textContent = count;
  } else {
    bar.classList.remove('on');
    bnNum.style.display = 'none';
    hdrB.style.display = 'none';
  }
  hdrT.textContent = 'R$ ' + total.toFixed(2).replace('.',',');
}

function getCartItems(){
  var items = [];
  for(var k in CART){
    items.push({key:k,name:CART[k].name,price:CART[k].price,qty:CART[k].qty,icon:CART[k].icon,subtotal:CART[k].price*CART[k].qty});
  }
  return items;
}

// ========== MODAL ==========
function openCart(){
  var items = getCartItems();
  var body = document.getElementById('cartBody');
  var foot = document.getElementById('cartFoot');
  if(!items.length){
    body.innerHTML = '<div class="cart-empty"><i class="ti ti-shopping-cart-off"></i><p>Seu pedido está vazio.<br>Adicione itens do cardápio!</p></div>';
    foot.style.display = 'none';
  } else {
    foot.style.display = 'block';
    var h = '';
    items.forEach(function(it){
      h += '<div class="ci"><div class="ci-icon">'+it.icon+'</div><div class="ci-info"><div class="ci-name">'+it.name+'</div><div class="ci-price">R$ '+it.price.toFixed(2).replace('.',',')+'</div></div><div class="ci-qty"><button onclick="modalRemove(\''+it.key+'\')">−</button><span class="ci-qty-n">'+it.qty+'</span><button onclick="modalAdd(\''+it.key+'\')">+</button></div><div class="ci-sub">R$ '+it.subtotal.toFixed(2).replace('.',',')+'</div></div>';
    });
    var total = cartTotal();
    h += '<div class="cart-line tt"><span>Total</span><span class="v">R$ '+total.toFixed(2).replace('.',',')+'</span></div>';
    body.innerHTML = h;
  }
  document.getElementById('cartModal').classList.add('on');
  document.body.style.overflow = 'hidden';
}
function closeCart(){
  document.getElementById('cartModal').classList.remove('on');
  document.body.style.overflow = '';
}
function modalAdd(key){
  if(CART[key]) CART[key].qty++;
  else return;
  updateCart();
  openCart();
  renderProds();
}
function modalRemove(key){ removeItem(key); openCart(); }

// ========== WHATSAPP ==========
function sendWA(){
  var items = getCartItems();
  if(!items.length) return;
  var name = document.getElementById('cName').value.trim() || 'Cliente';
  var notes = document.getElementById('cNotes').value.trim();
  var total = cartTotal();
  var msg = '📋 *PEDIDO - ' + (window.DATA.nome||'Restaurante').toUpperCase() + '*\n👤 Cliente: ' + name + '\n─────────────────\n\n';
  items.forEach(function(it){ msg += '• ' + it.qty + 'x ' + it.name + ' — R$ ' + it.subtotal.toFixed(2).replace('.',',') + '\n'; });
  msg += '\n─────────────────\n💰 *TOTAL: R$ ' + total.toFixed(2).replace('.',',') + '*\n';
  if(notes) msg += '\n📝 Observações:\n' + notes + '\n';
  var wa = window.DATA.whatsapp || '5535999999999';
  window.open('https://wa.me/'+wa+'?text='+encodeURIComponent(msg),'_blank');
}

// ========== UTILS ==========
function toast(msg){
  var t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(function(){ t.classList.remove('show'); },2000);
}

// ========== INIT ==========
(function(){
  if(window.DATA.nome){ document.getElementById('hName').textContent = window.DATA.nome; document.title = window.DATA.nome + ' - Cardápio'; }
  var wa = window.DATA.whatsapp||'';
  if(wa) document.getElementById('waFab').href = 'https://wa.me/'+wa;
  renderCats();
  renderProds();
  // header scroll
  window.addEventListener('scroll',function(){
    document.getElementById('hdr').classList.toggle('scrolled',(window.scrollY||0)>60);
  },{passive:true});
  // reload from storage
  window.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible'){
      var s=localStorage.getItem('cardapio');
      if(s){try{var d=JSON.parse(s);if(d&&d.categorias){window.DATA=d;renderCats();renderProds();}}catch(e){}}
    }
  });
})();
