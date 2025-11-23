import * as fs from 'fs/promises';

// --- CONFIGURAÇÃO DA GEMINI API ---
const apiKey = process.env.GEMINI_API_KEY;
//const apiModel = 'gemini-2.5-flash-latest';
const apiModel = 'gemini-2.5-flash-preview-09-2025';
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;
//const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
const KNOWLEDGE_FILE = 'exoplanetas.json';

// --- CONFIGURAÇÃO DE GERAÇÃO (1 CHAMADA) ---
const TOTAL_ITEMS = 25;    // NOVO TOTAL DESEJADO: 25

// Estrutura JSON esperada para cada item (AGORA: um array de 25 objetos)
const responseSchema = {
    type: "ARRAY",
    items: {
        type: "OBJECT",
        properties: {
            "identificacao": {
                "type": "STRING",
                "description": "Designação do exoplaneta conforme a IAU (União Astrônomica Internacional)."
            },
            "tipo": {
                "type": "STRING",
                "description": "Tipo do exoplaneta (ex: gigante gasoso, netuniano, superterra)."
            },
            "detecao": {
                "type": "STRING",
                "description": "Método da deteção do exoplaneta (imagem direta, trânsito, doppler)."
            },
            "ano": {
                "type": "STRING",
                "description": "Ano de descoberta do exoplaneta (ex: '2013')."
            },
            "tags": {
                "type": "ARRAY",
                "description": "Array de 1 a 3 strings que categorizam o exoplaneta (ex: 'habitavel', 'confirmado', 'candidato').",
                "items": { "type": "STRING" }
            }
        },
        "required": ["identificacao", "tipo", "detecao", "ano"]
    }
};

/**
 * Espera de forma assíncrona.
 * @param {number} ms - Milissegundos para esperar.
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Função para gerar o conhecimento em uma única chamada à API.
 * @returns {Promise<Array<Object>>} Array com as 25 novas entradas de conhecimento.
 */
async function generateNewKnowledge(existingKnowledge) {
    // Lista de nomes existentes para não repetição (para incluir no prompt)
    const existingNames = existingKnowledge.map(item => item.nome).join(', ');

    const systemPrompt = `Você é um especialista em astronomia e exoplanetas. ` +
        `Sua tarefa é criar ${TOTAL_ITEMS} novas entradas sobre diferentes exoplanetas ` +
        `com a mesma estrutura JSON. Garanta que cada entrada seja única e relevante. `;

    // NOVO userQuery: Focado em 25 itens e evitando nomes existentes
    const userQuery = `Gere uma lista de ${TOTAL_ITEMS} novos exoplanetas. ` +
        `Siga estritamente a estrutura JSON e o requisito de ser um ARRAY com ` +
        `EXATAMENTE ${TOTAL_ITEMS} objetos. Não inclua os seguintes exoplanetas já existentes ` +
        `na base de dados: ${existingNames || 'Nenhum'}.`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    };

    let response;
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
        try {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
                const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

                if (jsonText) {
                    try {
                        const newKnowledge = JSON.parse(jsonText);
                        
                        if (Array.isArray(newKnowledge) && newKnowledge.length === TOTAL_ITEMS) {
                            console.log(`Sucesso! ${TOTAL_ITEMS} novos itens gerados pela API.`);
                            return newKnowledge;
                        } else {
                            // Se o modelo não gerou o número exato, tentamos novamente
                            const foundItems = Array.isArray(newKnowledge) ? newKnowledge.length : 0;
                            throw new Error(`O array retornado não contém ${TOTAL_ITEMS} itens. ` +
                                `Encontrados: ${foundItems}`);
                        }
                    } catch (parseError) {
                        throw new Error("JSON malformado ou incompleto na resposta da API.");
                    }
                } else {
                    throw new Error("Resposta da API vazia ou sem conteúdo textual.");
                }
            } else {
                throw new Error(`Falha na API com status ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            retries++;
            if (retries < maxRetries) {
                const waitTime = Math.pow(2, retries) * 1000; // 2s, 4s, 8s, ...
                await delay(waitTime);
            } else {
                throw new Error(`Falha ao gerar o conhecimento após várias tentativas: ` +
                    `${error.message}`);
            }
        }
    }
}


/**
 * Função principal para executar o fluxo de trabalho.
 */
async function main() {
    // Verifica se a chave da API está presente
    if (!apiKey) {
        console.error("\n❌ ERRO: A variável de ambiente GEMINI_API_KEY não está definida.");
        console.log("Por favor, crie um arquivo '.env' na raiz do projeto e defina a chave:");
        console.log("GEMINI_API_KEY=\"SUA_CHAVE_AQUI\"");
        return;
    }

    try {
        // 1. Carregar a base de conhecimento existente
        let existingKnowledge = [];
        try {
            const data = await fs.readFile(KNOWLEDGE_FILE, 'utf-8');
            existingKnowledge = JSON.parse(data);
            console.log(`Base de conhecimento inicial carregada. Total de itens: ${existingKnowledge.length}`);
        } catch (e) {
            if (e.code === 'ENOENT') {
                console.log(`O arquivo ${KNOWLEDGE_FILE} não foi encontrado. Iniciando com uma base vazia.`);
            } else {
                throw new Error(
                    `Erro ao ler/analisar ${KNOWLEDGE_FILE}: ${e.message}`
                );
            }
        }

        // 2. Gerar as 25 novas entradas (passando a base existente para o prompt)
        console.log("Aumentando sua base de conhecimento!");
        const newKnowledge = await generateNewKnowledge(existingKnowledge);

        // 3. Combinar as bases
        const totalKnowledge = [...existingKnowledge, ...newKnowledge];
        console.log(`Base de conhecimento combinada. Total final de itens: ${totalKnowledge.length}`);

        // 4. Salvar a nova base no arquivo
        await fs.writeFile(KNOWLEDGE_FILE, JSON.stringify(totalKnowledge, null, 2), 'utf-8');
        console.log(`\n🎉 SUCESSO!`);
        console.log(`O arquivo '${KNOWLEDGE_FILE}' foi atualizado com ${totalKnowledge.length} itens.`);

    } catch (error) {
        console.error("\n❌ ERRO FATAL:", error.message);
        console.log("Verifique se sua chave de API está correta e se há conectividade.");
    }
}

main();
