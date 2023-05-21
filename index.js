const express = require('express');
const app = express();
const port = 3000;
const database = require('./db');
const basicAuth = require('express-basic-auth');
const cookieSession = require('cookie-session');
//
const router = express.Router();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', './views/');

app.use(cookieSession({
  name: 'session',
  secret: 'c293x8b6234z82n938246bc2938x4zb234',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))

function requireLogin(req, res, next) {
  if (req.session && req.session.user) {
    // O usuário está logado, permita o acesso à rota
    next();
  } else {
    // O usuário não está logado, redirecione para a página de login ou retorne um erro
    res.redirect('/login'); // ou res.status(401).send('Acesso não autorizado');
  }
}

// Rota protegida que requer login
app.get('/admin/menu', requireLogin, async (req, res) => {
  if(req.session.admin === "yes"){
    let username=  req.session.user;
    let carros = await database.getCarros();
    res.render('menu-adm', { carros, username});
  }else{
    res.redirect('/menu');
  }
});

app.get('/admin/loja', requireLogin, async (req, res) => {
  if(req.session.admin === "yes"){
    let username=  req.session.user;
    let carros = await database.getCarros();
    res.render('loja-adm', { carros, username});
  }else{
    res.redirect('/menu');
  }
});
/*
app.get('/admin/aluguel', requireLogin, async (req, res) => {
  if(req.session.admin === "yes"){
    const alugueis = await database.todosAlugueis();
    res.render('todos-alugueis', { alugueis }); 
  }else{
    res.redirect('/menu');
  }
});
*/
app.get('/admin/aluguel', requireLogin, async (req, res) => {
  if (req.session.admin === "yes") {
    const alugueis = await database.todosAlugueis();
    
    const aluguelConfirmado = [];
    const aluguelRejeitado = [];
    const aluguelEmAnalise = [];
    
    alugueis.forEach(aluguel => {
      if (aluguel.status === 'Confirmado') {
        aluguelConfirmado.push(aluguel);
      } else if (aluguel.status === 'Rejeitado') {
        aluguelRejeitado.push(aluguel);
      } else if (aluguel.status === 'Aguardando Confirmação') {
        aluguelEmAnalise.push(aluguel);
      }
    });

    res.render('todos-alugueis', { aluguelConfirmado, aluguelRejeitado, aluguelEmAnalise });
  } else {
    res.redirect('/menu');
  }
});

app.get('/admin/aluguel/aceitar/:id', requireLogin, async (req, res) => {
  if(req.session.admin === "yes"){
    const idAluguel = req.params.id;
    await database.aceitarAluguel(idAluguel);
    res.send('<script>alert("Aluguel aceito com Sucesso!"); window.location="/admin/aluguel";</script>');

  }else{
    res.redirect('/menu');
  }
});
app.get('/admin/aluguel/recusar/:id', requireLogin, async (req, res) => {
  if(req.session.admin === "yes"){
    const idAluguel = req.params.id;
    await database.aceitarRecusar(idAluguel);
    res.send('<script>alert("Aluguel rejeitado com Sucesso!"); window.location="/admin/aluguel";</script>');

  }else{
    res.redirect('/menu');
  }
});
//Rota menu usuário
app.get('/menu',  requireLogin, async (req, res) => {
  let username=  req.session.user;
  res.render('menu',{username});
});
app.get('/loja/conta',  requireLogin, async (req, res) => {
  let username=  req.session.user;
  const user = await database.existUser(username);
  res.render('usuario-conta',{user});
});
app.get('/loja/aluguel', requireLogin, async (req, res) => {
  try {
    const userId = req.session.user; // Obtém o ID do usuário da sessão (ajuste de acordo com a sua implementação)
    
    // Consulta os aluguéis do usuário com base no ID do usuário e inclui os detalhes completos do carro
    const alugueis = await database.getAlugueisByUser(userId);
    res.render('meus-alugueis', { alugueis }); // Renderiza a página de aluguéis e passa os aluguéis encontrados como variável para o template
  } catch (error) {
    console.log(error);
    res.status(500).send('Ocorreu um erro ao buscar os aluguéis.');
  }
});

// Rota para exibir a página loja usuário logado
app.get('/loja',  requireLogin, async (req, res) => {
  let carros = await database.getCarros();
  let username=  req.session.user;
  res.render('loja', { carros, username});
});
app.get('/admin/loja/add-carro',  requireLogin, async (req, res) => {
  res.render('add-carro');
});
// Rota para exibir a página de login usuario
app.get('/login', (req, res) => {
  res.render('login');
});
// Rota para exibir a página de login administrador
app.get('/login/admin', (req, res) => {
  res.render('login-adm');
});

app.get('/signup', (req, res) => {
  res.render('signup');
});
app.get('/loja/conta/editar-senha', requireLogin, async (req, res) => {
  res.render('senha-editar');
});
//Rota envio form login administrador
app.post('/login/admin', async (req, res) => {
  const { username, password } = req.body;
  try {
    // Verifica se o usuário existe no banco de dados
    const user = await database.getUser(username, password);

    if (user) {
      // Define a propriedade 'user' na sessão com o username
        req.session.user = username;
        req.session.admin = user.admin;
        if (user.admin === 'yes') {
          res.redirect('/admin/menu');
        }else{
          res.send('<script>alert("Credenciais inválidas"); window.location="/login/adm";</script>');
        }
    } 
  } catch (error) {
    console.error(error);
    res.send('<script>alert("Credenciais inválidas"); window.location="/login/adm";</script>');
  }
});

//Rota envio form login usuario
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Verifica se o usuário existe no banco de dados
    const user = await database.getUser(username, password);

    if (user) {
      // Define a propriedade 'user' na sessão com o username
      req.session.user = username;
      req.session.admin = user.admin;
      req.session.id = user._id;
        if(user.admin==='not'){
          res.redirect('/menu');
        }else {
          res.send('<script>alert("Credenciais inválidas"); window.location="/login";</script>');
        }
    } 
  } catch (error) {
    console.error(error);
    res.send('<script>alert("Credenciais inválidas"); window.location="/login";</script>');
  }
});

// app.js

app.get('/loja/conta/editar', async (req, res) => {
  try {
    // Aqui você deve obter os dados do usuário a ser editado com base na sessão ou autenticação
    // Vou chamar essa função de 'getUserData' no db.js para simplificar
    const userId = req.session.user;
    const user = await database.existUser(userId); // userId é o ID do usuário que está logado ou autenticado

    res.render('usuario-editar', { user });
  } catch (error) {
    console.log(error);
    res.status(500).send('Erro ao carregar a página de edição de usuário');
  }
});

app.post('/loja/conta/editar', async (req, res) => {
    const userId = req.session.user; // Supondo que você esteja usando sessões para autenticação e armazenou o ID do usuário na sessão
    const userData = req.body; // Dados enviados pelo formulário de edição

    await database.updateUserData(userId, userData);
    res.send('<script>alert("Atualizado com sucesso!"); window.location="/loja/conta";</script>');
});

app.get('/loja/conta/excluir', async (req, res) => {
  const userId = req.session.user; // Supondo que você esteja usando sessões para autenticação e armazenou o ID do usuário na sessão

  try {
    await database.deleteUserData(userId);
    // Limpar a sessão ou realizar outras ações necessárias após a exclusão da conta

    res.send('<script>alert("Conta excluída com sucesso!"); window.location="/";</script>');
  } catch (error) {
    res.send('<script>alert("Ocorreu um erro ao excluir a conta do usuário."); window.location="/loja/conta/editar";</script>');
  }
});

app.post('/check-email', async (req, res) => {
  try {
    const existingUser = await database.existUser(req.body.username);
    res.json({ exists: existingUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ocorreu um erro ao verificar o email.' });
  }
});

app.post('/validaSenha', async (req, res) => {
  const userId = req.session.user; // Supondo que você esteja usando sessões para autenticação e armazenou o ID do usuário na sessão
  const userData = req.body.password; // Dados enviados pelo formulário de edição
  console.log(userId);
  console.log(userData);
  await database.updateUserSenha(userId, userData);
  res.send('<script>alert("Atualizado com sucesso!"); window.location="/loja/conta";</script>');
});

app.post('/verificar-senha', async (req, res) => {
  try {
    console.log(req.body.password);
    const confereSenha = await database.verificaSenha(req.session.user, req.body.password);
    console.log(confereSenha);
    res.json({ exists: confereSenha });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ocorreu um erro ao verificar o senha.' });
  }
});

app.post('/check-existe-aluguel-carro', async (req, res) => {
  try {
    console.log(req.body.carro);
    const existeAluguel = await database.verificaExisteAluguelCarro(req.body.carro);
    console.log(existeAluguel);
    res.json({ exists: existeAluguel});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ocorreu um erro ao verificar o senha.' });
  }
});

app.post('/signup', async (req, res) => {
  try {
    /*
      const existingUser = await database.existUser(req.body.username);
      if (existingUser) {
        return res.send('O email já está em uso');
      }*/
      const newUser = {
      username: req.body.username,
      password: req.body.password,
      dataNasc: req.body.dataNasc,
      genero: req.body.genero,
      nome: req.body.nome,
      telefone: req.body.telefone,
      admin: "not",
      // Outras propriedades do usuário
    };

    const insertedId = await database.saveUser(newUser);
    res.send('<script>alert("Usuário Cadastrado com Sucesso"); window.location="/login";</script>');
  } catch (error) {
    console.error(error);
    res.status(500).send('Ocorreu um erro ao realizar o cadastro.');
  }
});
app.post('/admin/loja/add-carro', async (req, res) => {
  try {
    const newCarro = {
      foto: req.body.foto,
      nome: req.body.nome,
      marca: req.body.marca,
      cor: req.body.cor,
      valor: req.body.valor,
      precoDiaria: req.body.precoDiaria,
      // Outras propriedades do usuário
    };

    const insertedId = await database.saveCarros(newCarro);
    res.send('<script>alert("Carro Cadastrado com Sucesso"); window.location="/admin/loja";</script>');
  } catch (error) {
    res.status(500).send('Ocorreu um erro ao realizar o cadastro.');
  }
});


app.post('/loja/aluguel/:carId', async (req, res) => {
  try {
    const newAluguel = {
      carro: req.params.carId,
      usuario: req.session.user,
      dataInicio: req.body['start-date'],
      dataFinal: req.body['end-date'],
      valorTotal: req.body['total-price'],
      metodoPagamento: req.body['payment-method'],
      status: "Aguardando Confirmação"
    };

    const insertedId = await database.saveAluguel(newAluguel);
    res.send('<script>alert("Aluguel Realizado com Sucesso"); window.location="/loja/aluguel";</script>');
  } catch (error) {
    res.status(500).send('Ocorreu um erro ao cadastrar o aluguel.');
  }
});

// Rota para exibir informações de aluguel de um veículo
// Rota para exibir informações de aluguel de um veículo
app.get('/loja/alugar/:id', async (req, res) => {
  try {
    const carrosTodos = await database.getCarros();
    const carroId = req.params.id;

    // Consultar o banco de dados para obter as informações do veículo pelo ID
    const carro = carrosTodos.find(carro => carro._id.toString() === carroId)

    // Renderizar uma nova página com as informações do veículo
    res.render('alugar', { carro: carro });
  } catch (error) {
    res.status(500).send('Ocorreu um erro ao carregar as informações do veículo');
  }
});

app.get('/loja/editar-carro/:id', async (req, res) => {
  try {
    const carrosTodos = await database.getCarros();
    const carroId = req.params.id;

    // Consultar o banco de dados para obter as informações do veículo pelo ID
    const carro = carrosTodos.find(carro => carro._id.toString() === carroId)

    // Renderizar uma nova página com as informações do veículo
    res.render('carro-editar', { carro: carro });
  } catch (error) {
    res.status(500).send('Ocorreu um erro ao carregar as informações do veículo');
  }
});

app.post('/admin/loja/edit-carro/:id', async (req, res) => {
  try {
    const id = req.params.id; // Obtém o ID do veículo da URL
    console.log(id);
    const dadosVeiculo = req.body; // Obtém os dados atualizados do veículo do corpo da requisição
    console.log(dadosVeiculo);
    const sucesso = await database.editarVeiculo(id, dadosVeiculo);

    if (sucesso) {
      res.send('<script>alert("Carro Editado com Sucesso"); window.location="/admin/loja";</script>');
    } else {
      res.status(500).json({ error: 'Não foi possível editar o veículo' });
    }
  } catch (error) {
    console.error('Erro ao editar o veículo:', error);
    res.status(500).json({ error: 'Ocorreu um erro ao editar o veículo' });
  }
});

app.get('/loja/excluir-carro/:id', async (req, res) => {
    const id = req.params.id; // Obtém o ID do veículo da URL
    const sucesso = await database.excluirVeiculo(id);
    res.send('<script>alert("Carro Excluido com Sucesso"); window.location="/admin/loja";</script>');
});

app.get('/', async (req, res) => {
  try {
    // Acessa o banco de dados para obter a coleção de produtos
    const carros = await database.getCarros();

    // Renderiza o template EJS e envia a coleção de produtos como dados
    res.render('index', { carros});
  } catch (error) {
    // Trata qualquer erro ocorrido durante a recuperação dos produtos
    res.status(500).send('Ocorreu um erro ao obter os produtos.');
  }
});


app.get('/teste', async (req, res) => {
  let teste = '64668a091bbf32b744d65beb';
  const carro = await database.getCarroById(teste); 
  res.render('alugar', { carro});
});

app.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});


// Outras rotas...

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
