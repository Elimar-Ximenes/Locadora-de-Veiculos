const { MongoClient } = require('mongodb');
// Connection URL
const url = '127.0.0.1:27017';

// Database Name
const dbName = 'locadoraCarros';
const client = new MongoClient(`mongodb://${url}/${dbName}`);

var user_collection;
var carros_collection;
var aluguel_collection;

async function main() {
  // Use connect method to connect to the server
  await client.connect();
  console.log('Connected successfully to server');
  const db = client.db(dbName);
  user_collection = db.collection('user');
  carros_collection = db.collection('carros');
  aluguel_collection = db.collection('aluguel');
  return 'done.';
}
main()
  .then(console.log)
  .catch(console.error);
//   .finally(() => client.close());

async function getUser(username, password) {
  const user = await user_collection.findOne({ username: username, password: password });
  if (user) {
    return user;
  } else {
    throw new Error('Usuário não encontrado ou senha incorreta');
  }
}
async function existUser(email) {
  const user = await user_collection.findOne({ username: email });
  if (user) {
    return user;
  } 
}

async function verificaSenha(email,password) {
  const user = await user_collection.findOne({ username: email, password: password  });
  if (user) {
    return user;
  } 
}

//Ver depois se está fazendo algo
async function getNextAvailableDate(carroId) {
  const dataAtual = new Date();
  const alugueis = await aluguel_collection.find({ carro: carroId, dataInicio: { $gte: dataAtual } }).sort({ dataInicio: 1 }).toArray();

  if (alugueis.length > 0) {
    const proximaDataInicio = alugueis[0].dataInicio;
    return proximaDataInicio;
  } else {
    return null; // Carro está atualmente disponível, não há aluguéis futuros registrados
  }
}



async function getCarros() {
  const dataAtual = new Date();
  const ano = dataAtual.getFullYear();
  const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
  const dia = String(dataAtual.getDate()).padStart(2, '0');
  const dataAtualString = `${ano}-${mes}-${dia}`;

  const alugueis = await aluguel_collection.find().toArray();
  const carros = await carros_collection.find().toArray();

  carros.forEach((carro) => {
    const carroId = carro._id.toString();
    const aluguelAtual = alugueis.find((aluguel) => aluguel.carro === carroId);

    if (aluguelAtual) {
      const dataInicio = aluguelAtual.dataInicio;
      const dataFinal = aluguelAtual.dataFinal;

      if (dataAtualString >= dataInicio && dataAtualString <= dataFinal && aluguelAtual.status==="Confirmado") {
        carro.status = 'Indisponível hoje';
      } else {
        carro.status = 'Disponível hoje';
      }
    } else {
      carro.status = 'Disponível hoje';
    }
  });

  return carros;
}

async function getAlugueisByUser(email) {
    const alugueis = await aluguel_collection.find({ usuario: email}).toArray();
    // Obtém os detalhes do carro para cada aluguel
    for (const aluguel of alugueis) {
      const carroId = aluguel.carro;
      //const carrosTodos = await carros_collection.find().toArray();
      const carrosTodos = await getCarros();
      const carro = carrosTodos.find(carro => carro._id.toString() === carroId);
      aluguel.carro = carro;
    }
    return alugueis;
  
}

async function saveCarros(carro) {
  try {
    const result = await carros_collection.insertOne(carro);
    return result.insertedId;
  } catch (error) {
    throw new Error('Ocorreu um erro ao salvar carro.');
  }
}

async function saveUser(user) {
  try {
    const result = await user_collection.insertOne(user);
    return result.insertedId;
  } catch (error) {
    throw new Error('Ocorreu um erro ao realizar o cadastro.');
  }
}

async function saveAluguel(aluguel) {
  try {
    const result = await aluguel_collection.insertOne(aluguel);
    return result.insertedId;
  } catch (error) {
    throw new Error('Ocorreu um erro ao salvar o aluguel.');
  }
}

async function updateUserData(userId, userData) {
    const result = await user_collection.updateOne({ username: userId }, { $set: userData });
    if (result.modifiedCount === 1) {
      return true; // Dados do usuário atualizados com sucesso
    } else{
      return true;
    }
}

async function updateUserSenha(userId, userData) {
  const result = await user_collection.updateOne({ username: userId }, { $set: { password: userData } });
  if (result.modifiedCount === 1) {
    return true; // Dados do usuário atualizados com sucesso
  } else{
    return true;
  }
}

async function deleteUserData(userId) {
  try {
    const result = await user_collection.deleteOne({ username: userId });
    if (result.deletedCount === 1) {
      return true; // Conta do usuário excluída com sucesso
    } else {
      throw new Error('Falha ao excluir a conta do usuário');
    }
  } catch (error) {
    throw new Error('Ocorreu um erro ao excluir a conta do usuário');
  }
}

const { ObjectId } = require('mongodb');

async function editarVeiculo(id, dadosVeiculo) {
    const objectId = new ObjectId(id);
    const result = await carros_collection.updateOne({ _id: objectId }, { $set: dadosVeiculo });

    if (result.modifiedCount === 1) {
      return true; // Veículo atualizado com sucesso
    } else {
      return true; // Não foi possível atualizar o veículo
    }
  
}

async function excluirVeiculo(id) {
  try {
    const objectId = new ObjectId(id);
    const result = await carros_collection.deleteOne({ _id: objectId });

    if (result.modifiedCount === 1) {
      return true; // Veículo deletado com sucesso
    } else {
      return false; // Não foi possível deletar o veículo
    }
  } catch (error) {
    console.error('Erro ao excluir o veículo:', error);
    return false; // Ocorreu um erro ao editar o veículo
  }
}

async function todosAlugueis() {
  const alugueis = await aluguel_collection.find().toArray();
  // Obtém os detalhes do carro para cada aluguel
  for (const aluguel of alugueis) {
    const carroId = aluguel.carro;
    //const carrosTodos = await carros_collection.find().toArray();
    const carrosTodos = await getCarros();
    const carro = carrosTodos.find(carro => carro._id.toString() === carroId);
    aluguel.carro = carro;
  }
  return alugueis;
}

async function aceitarAluguel(idAluguel) {
  try {
    const objectId = new ObjectId(idAluguel);
    const result = await aluguel_collection.updateOne({ _id: objectId }, { $set: { status: "Confirmado" } });

    if (result.modifiedCount === 1) {
      return true; // Aluguel atualizado com sucesso
    } else {
      return false; // Não foi possível atualizar o Aluguel
    }
  } catch (error) {
    console.error('Erro ao editar o veículo:', error);
    return false; // Ocorreu um erro ao editar o Aluguel
  }
}

async function aceitarRecusar(idAluguel) {
  try {
    const objectId = new ObjectId(idAluguel);
    const result = await aluguel_collection.updateOne({ _id: objectId }, { $set: { status: "Rejeitado" } });

    if (result.modifiedCount === 1) {
      return true; // Aluguel atualizado com sucesso
    } else {
      return false; // Não foi possível atualizar o Aluguel
    }
  } catch (error) {
    console.error('Erro ao editar o veículo:', error);
    return false; // Ocorreu um erro ao editar o Aluguel
  }
}

async function verificaExisteAluguelCarro(idCarro) {
  const aluguel = await aluguel_collection.findOne({ carro: idCarro});
  if (aluguel) {
    return aluguel;
  } 
}


exports.verificaExisteAluguelCarro = verificaExisteAluguelCarro;
exports.aceitarRecusar = aceitarRecusar;
exports.aceitarAluguel = aceitarAluguel;
exports.todosAlugueis = todosAlugueis;
exports.excluirVeiculo = excluirVeiculo;
exports.editarVeiculo = editarVeiculo;
exports.updateUserSenha = updateUserSenha;
exports.verificaSenha = verificaSenha;
exports.deleteUserData = deleteUserData;
exports.updateUserData = updateUserData;
exports.saveAluguel = saveAluguel;
exports.getAlugueisByUser = getAlugueisByUser;
exports.saveUser = saveUser;
exports.saveCarros = saveCarros;
exports.getUser = getUser;
exports.existUser = existUser;
exports.getCarros = getCarros;
