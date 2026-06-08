#!/usr/bin/env node
/**
 * Cria um novo restaurante no sistema
 * Uso: node criar-restaurante.js <subdominio> <nome> <usuario> <senha>
 *
 * Exemplo:
 *   node criar-restaurante.js pastelaria "Pastelaria do João" admin minhasenha123
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const [,, subdominio, nome, usuario, senha] = process.argv;

if (!subdominio || !nome || !usuario || !senha) {
  console.error('Uso: node criar-restaurante.js <subdominio> <nome> <usuario> <senha>');
  process.exit(1);
}

const dir = path.join(__dirname, 'data', subdominio);

if (fs.existsSync(dir)) {
  console.error(`Erro: restaurante "${subdominio}" já existe!`);
  process.exit(1);
}

fs.mkdirSync(dir, { recursive: true });

// cardapio.json
const cardapio = {
  nome,
  descricao: '',
  cor: '#e94560',
  categorias: [
    {
      nome: 'Pratos Principais',
      pratos: [
        { nome: 'Exemplo de Prato', preco: '29,90', descricao: 'Descrição do prato aqui', oculto: false }
      ]
    },
    {
      nome: 'Bebidas',
      pratos: [
        { nome: 'Refrigerante Lata', preco: '6,00', descricao: '', oculto: false },
        { nome: 'Suco Natural', preco: '8,00', descricao: 'Consultar sabores', oculto: false }
      ]
    }
  ]
};

// config.json (login admin)
const config = {
  adminUser: usuario,
  adminPassHash: bcrypt.hashSync(senha, 12),
  createdAt: new Date().toISOString()
};

fs.writeFileSync(path.join(dir, 'cardapio.json'), JSON.stringify(cardapio, null, 2));
fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(config, null, 2));

console.log(`✅ Restaurante "${nome}" criado!`);
console.log(`   Subdomínio: ${subdominio}.restaurantessaolourenco.com.br`);
console.log(`   Admin:      ${subdominio}.restaurantessaolourenco.com.br/admin`);
console.log(`   Login:      ${usuario} / ${senha}`);
