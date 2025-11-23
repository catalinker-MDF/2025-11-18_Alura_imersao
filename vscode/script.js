let cardContainer = document.querySelector(".card-container");
let campoBusca = document.querySelector("header input");
let dados = [];

async function btBuscaTermo() {
    // Se os dados ainda não foram carregados, busca do JSON.
    if (dados.length === 0) {
        try {
            let infoAstros = await fetch("astros_sistema_solar.json");
            dados = await infoAstros.json();
        } catch (error) {
            console.error("Falha ao buscar dados:", error);
            return; // Interrompe a execução se houver erro
        }
    }

    const termoBuscado = campoBusca.value.toLowerCase();
    if (termoBuscado.length === 0) {
        console.log("campo de pesquisa vazio");
        return;
    }
    const dadosFiltrados = dados.filter(dado => 
        dado.nome.toLowerCase().includes(termoBuscado) || 
        dado.descricao.toLowerCase().includes(termoBuscado) ||
        dado.tipo.toLowerCase().includes(termoBuscado)
    );

    //if (dadosFiltrados.length === 0) return;
    renderizaCards(dadosFiltrados);
}

function renderizaCards(dados) {
    cardContainer.innerHTML = "";
    if (dados.length === 0) {
        const msgAviso = "o termo '" + campoBusca.value + "' não foi encontrado.";
        console.log(msgAviso);
        //let aviso = document.createElement("aviso");
        exibeAviso(msgAviso);
        return
    }

    dados.forEach(element => {
        let article = document.createElement("article");
        article.classList.add("card");
        // trata se a imagem existe ou não
        imagemArquivo = encodeURI(`imagens/${element.imagem}`);
        console.log(imagemArquivo);
        //buscaImagem(imagemArquivo).then(existe => {
        const existe = imagemExiste(imagemArquivo);
        if (existe) { // função async: Promise {<pending>} ???
            console.log(`O arquivo "${imagemArquivo}" FOI encontrado.`);
            propHTML = `
            <div>
            <img src="${imagemArquivo}" alt="${element.nome}" title="${element.nome}" style="max-width: 10rem; margin: 0; border-radius: 8px">
            </div>`;
        } else {
            console.log(`O arquivo "${imagemArquivo}" NÃO foi encontrado.`);
            propHTML = `<div></div>`;
        } 
        //});
        // exibe propriedades do astro
        propHTML += `
        <div>
        <h2>${element.nome}</h2>
        <p>${element.descricao}</p>`;
        if (element.nome_grego != null) {
            propHTML += `<p>Nome Grego: ${element.nome_grego} [${element.significado_grego}]</p>`;
        };
        article.innerHTML += `
        <p>Tipo: ${element.tipo}</p>`;
        // trata o caso do Sol
        if (element.nome == "Sol") {
            propHTML += `
            <p>Distância ao centro da Galáxia: ${(element.distancia_sol_KM / 1000000).toFixed(2)} milhões de Km</p>
            </div>`
        } else {
            propHTML += `
            <p>Distância ao Sol: ${(element.distancia_sol_KM / 1000000).toFixed(2)} milhões de Km</p>
            </div>`
        };
        console.log(propHTML);
        article.innerHTML = propHTML;
        cardContainer.appendChild(article);
    });
} // renderizaCards

//
async function imagemExiste(imagemArquivo) {
    const existe = await buscaImagem(imagemArquivo);
    return existe;
}

// verifica se a imagem do astro está disponível na pasta "imagens"
async function buscaImagem(imagemArquivo) {
  try {
    const existente = await fetch(imagemArquivo, { 
      method: 'HEAD' // HEAD é mais eficiente, pois só pede os cabeçalhos, não o conteúdo do arquivo
    });
    console.log("status: ", existente.status, "   ok: ", existente.ok);
    // Se o status HTTP for 200-299, o arquivo existe
    return existente.ok;
    //if (existente.status == 404) return false;
    //return true;
  } catch (erro) {
    // Erros de rede (ex: sem conexão) ou CORS podem cair aqui
    console.error("Erro ao tentar acessar o arquivo da imagem:", erro);
    return false;
  }
  /* */
} // buscaImagem

/*
    popup de aviso
*/
// Obtém o elemento modal
const modal = document.getElementById("aviso");

// Obtém o elemento <span> que fecha a modal (o "x")
var span = document.getElementsByClassName("modal-fechar")[0];

function exibeAviso(msgAviso) {
  //const modal = document.getElementById('aviso');
  
  const mensagem = document.getElementById('aviso-msg');
  
  // 1. Injeta a mensagem no parágrafo
  if (mensagem) {
    mensagem.textContent = msgAviso; // Usa textContent para segurança
  }
  
  // 2. Exibe a modal (usando o método de classe para melhor prática)
  if (modal) {
    modal.classList.add('exibir'); 
  }
}

// função para fechar o aviso
function fechaAviso() {
  //const modal = document.getElementById('aviso');
  
  if (modal) {
    modal.classList.remove('exibir');
  }
  // limpa o campo de pesquisa e posiciona o cursor (foco)
  campoBusca.value = '';
  campoBusca.focus();
}

// Quando o usuário clica no <span> (x), fecha a modal
span.onclick = function() {
  //modal.style.display = "none";
  //modal.classList.remove('exibir');
  fechaAviso();
}

// Configuração dos botões de fechar (X e clique fora)
const btnFechar = document.querySelector('.fechar');
if (btnFechar) {
    btnFechar.onclick = fechaAviso();
}

window.onclick = function(event) {
   // const modal = document.getElementById('aviso');
    if (event.target === modal) {
        fechaAviso();
    }
}