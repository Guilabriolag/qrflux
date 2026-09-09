/**
 * QrFlux v2
 * Labriolag · LabChain
 *
 * Frontend
 *
 * Responsabilidades:
 *
 * - comunicação com o Worker
 * - emissão de QRNota
 * - validação de QRNota
 * - geração visual do QR
 * - verificação de saúde do Worker
 *
 * O armazenamento NÃO fica aqui.
 * O backend é o Worker.
 */


/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const API =
  "https://qrflux.lab-wokerlabcore.workers.dev";


/* =========================================================
   ELEMENTOS DA INTERFACE
========================================================= */

const valorInput =
  document.getElementById("valor");

const descricaoInput =
  document.getElementById("descricao");

const inputQR =
  document.getElementById("inputQR");

const resultado =
  document.getElementById("resultado");

const status =
  document.getElementById("status");

const workerStatus =
  document.getElementById("workerStatus");

const qrcode =
  document.getElementById("qrcode");

const btnEmitir =
  document.getElementById("btnEmitir");

const btnValidar =
  document.getElementById("btnValidar");


/* =========================================================
   API
========================================================= */

async function api(path, options = {}) {

  const response = await fetch(
    API + path,
    {
      ...options,

      headers: {
        "Content-Type": "application/json",

        ...(options.headers || {})
      }
    }
  );


  let data = null;


  try {

    data =
      await response.json();

  } catch {

    data = null;

  }


  return {
    response,
    data
  };
}


/* =========================================================
   EMITIR QRNOTA
========================================================= */

async function emitir() {

  const valor =
    valorInput.value.trim();

  const descricao =
    descricaoInput.value.trim();


  if (!valor) {

    resultado.textContent =
      "Informe um valor.";

    return;
  }


  resultado.textContent =
    "Emitindo QRNota...";


  qrcode.innerHTML = "";


  btnEmitir.disabled = true;


  try {

    const {
      response,
      data
    } = await api(
      "/emitir",
      {
        method: "POST",

        body: JSON.stringify({
          valor,
          descricao
        })
      }
    );


    if (!response.ok) {

      throw new Error(
        data?.error ||
        "Erro ao emitir QRNota."
      );

    }


    const qrnota =
      data.qrnota;


    if (!qrnota || !qrnota.id) {

      throw new Error(
        "Worker retornou uma QRNota inválida."
      );

    }


    /*
     * O objeto devolvido pelo Worker
     * é transformado no conteúdo
     * transportado pelo QR.
     */

    const payload =
      JSON.stringify(qrnota);


    new QRCode(
      qrcode,
      {
        text: payload,
        width: 180,
        height: 180
      }
    );


    resultado.textContent =
      JSON.stringify(
        qrnota,
        null,
        2
      );


    /*
     * Facilita o teste manual:
     * o JSON também vai para
     * o campo de validação.
     */

    inputQR.value =
      payload;


  } catch (error) {

    resultado.textContent =
      "Erro: " + error.message;


  } finally {

    btnEmitir.disabled = false;

  }

}


/* =========================================================
   VALIDAR QRNOTA
========================================================= */

async function validar() {

  const input =
    inputQR.value.trim();


  if (!input) {

    status.className =
      "status error";

    status.textContent =
      "❌ Informe o conteúdo do QR.";

    return;

  }


  let qrData;


  /*
   * O QR atual contém JSON.
   */

  try {

    qrData =
      JSON.parse(input);

  } catch {

    status.className =
      "status error";

    status.textContent =
      "❌ QR inválido: JSON incorreto.";

    return;

  }


  if (!qrData.id) {

    status.className =
      "status error";

    status.textContent =
      "❌ QR sem ID.";

    return;

  }


  status.className =
    "status";

  status.textContent =
    "Validando...";


  btnValidar.disabled = true;


  try {

    const {
      response,
      data: result
    } = await api(
      "/validar",
      {
        method: "POST",

        body: JSON.stringify({
          id: qrData.id
        })
      }
    );


    /*
     * QR não encontrado.
     */

    if (
      !response.ok &&
      result?.estado === "INEXISTENTE"
    ) {

      status.className =
        "status error";

      status.textContent =
        "❌ QR inexistente.";

      return;

    }


    /*
     * Outros erros do Worker.
     */

    if (!response.ok) {

      throw new Error(
        result?.error ||
        "Erro na validação."
      );

    }


    /*
     * O Worker marcou a nota
     * como liquidada nesta operação.
     */

    if (
      result.estado === "LIQUIDADO" &&
      result.valido === true
    ) {

      status.className =
        "status online";

      status.textContent =
        "✅ QR VÁLIDO · LIQUIDADO · " +
        result.valor;

      return;

    }


    /*
     * O Worker encontrou a nota,
     * mas ela já estava liquidada.
     */

    if (
      result.estado === "LIQUIDADO" &&
      result.valido === false
    ) {

      status.className =
        "status warning";

      status.textContent =
        "⚠️ QR já utilizado.";

      return;

    }


    /*
     * Estado inesperado.
     */

    status.className =
      "status warning";

    status.textContent =
      "Estado: " +
      (result.estado || "DESCONHECIDO");


  } catch (error) {

    status.className =
      "status error";

    status.textContent =
      "❌ Erro: " +
      error.message;


  } finally {

    btnValidar.disabled = false;

  }

}


/* =========================================================
   HEALTH CHECK
========================================================= */

async function verificarWorker() {

  workerStatus.className =
    "status";

  workerStatus.textContent =
    "Verificando Worker...";


  try {

    const {
      response,
      data
    } = await api(
      "/health"
    );


    if (
      response.ok &&
      data?.ok
    ) {

      workerStatus.className =
        "status online";

      workerStatus.textContent =
        "🟢 Worker ONLINE · QrFlux";

      return;

    }


    throw new Error(
      "Worker não respondeu corretamente."
    );


  } catch (error) {

    workerStatus.className =
      "status error";

    workerStatus.textContent =
      "🔴 Worker OFFLINE";

  }

}


/* =========================================================
   EVENTOS DA INTERFACE
========================================================= */

btnEmitir.addEventListener(
  "click",
  emitir
);


btnValidar.addEventListener(
  "click",
  validar
);


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

verificarWorker();
