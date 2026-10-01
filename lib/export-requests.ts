import {
  REQUEST_STATUS_LABELS,
  REQUEST_TYPE_LABELS,
  REQUEST_PRIORITY_LABELS,
  CLIENT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  type FinancialRequest,
} from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { formatBRL } from "@/lib/masks";

const FETCH_PAGE_SIZE = 500;

/**
 * Busca todas as solicitações que atendem aos filtros da tela — não apenas a
 * página visível. Pagina até alcançar o total informado pelo próprio endpoint:
 * o PostgREST limita quantas linhas devolve por requisição, então pedir tudo
 * de uma vez truncaria a planilha em silêncio.
 */
export async function fetchAllRequests(params: URLSearchParams): Promise<FinancialRequest[]> {
  const all: FinancialRequest[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (all.length < total) {
    const pageParams = new URLSearchParams(params);
    pageParams.set("page", String(page));
    pageParams.set("page_size", String(FETCH_PAGE_SIZE));

    const res = await fetch(`/api/requests?${pageParams.toString()}`);
    if (!res.ok) throw new Error("Não foi possível carregar as solicitações para exportação.");

    const json = await res.json();
    const batch: FinancialRequest[] = json.data || [];
    all.push(...batch);

    if (typeof json.count === "number") total = json.count;
    // Proteção contra laço infinito caso o total venha maior do que o banco entrega.
    if (batch.length === 0) break;
    page += 1;
  }

  return all;
}

function typeData(r: FinancialRequest) {
  return r.type_specific_data || {};
}

/** Colunas da planilha — uma por campo da solicitação, sem resumir nada. */
const SHEET_COLUMNS: Array<{
  header: string;
  width: number;
  kind: "text" | "money" | "date" | "int";
  value: (r: FinancialRequest) => string | number | Date | null;
}> = [
  { header: "Nº", width: 14, kind: "text", value: (r) => r.request_number },
  { header: "Status", width: 20, kind: "text", value: (r) => REQUEST_STATUS_LABELS[r.status] },
  { header: "Prioridade", width: 12, kind: "text", value: (r) => REQUEST_PRIORITY_LABELS[r.priority] },
  { header: "Título", width: 38, kind: "text", value: (r) => r.title },
  { header: "Tipo de solicitação", width: 20, kind: "text", value: (r) => REQUEST_TYPE_LABELS[r.request_type] },
  { header: "Empresa solicitante", width: 26, kind: "text", value: (r) => r.company?.name || "" },
  { header: "Solicitante", width: 24, kind: "text", value: (r) => r.requester?.full_name || "" },
  { header: "E-mail do solicitante", width: 28, kind: "text", value: (r) => r.requester?.email || "" },
  { header: "Responsável", width: 24, kind: "text", value: (r) => r.assignee?.full_name || "" },
  { header: "Responsável pela autorização", width: 26, kind: "text", value: (r) => r.authorization_responsible || "" },
  { header: "Tipo de cliente", width: 16, kind: "text", value: (r) => CLIENT_TYPE_LABELS[r.client_type] },
  { header: "Cliente", width: 30, kind: "text", value: (r) => r.client_name },
  { header: "Distribuidor", width: 24, kind: "text", value: (r) => r.distributor || "" },
  { header: "CNPJ/CPF", width: 20, kind: "text", value: (r) => r.document },
  { header: "Valor total", width: 16, kind: "money", value: (r) => r.total_amount },
  { header: "Valor a abater", width: 16, kind: "money", value: (r) => r.discount_amount },
  { header: "Forma de pagamento", width: 18, kind: "text", value: (r) => (r.payment_method ? PAYMENT_METHOD_LABELS[r.payment_method] : "") },
  { header: "Números dos boletos", width: 24, kind: "text", value: (r) => r.invoice_numbers || "" },
  { header: "Motivo", width: 50, kind: "text", value: (r) => r.reason },
  { header: "Observações / Detalhes", width: 50, kind: "text", value: (r) => r.details || "" },
  { header: "Valor original", width: 16, kind: "money", value: (r) => typeData(r).valor_original ?? null },
  { header: "Valor renegociado", width: 16, kind: "money", value: (r) => typeData(r).valor_renegociado ?? null },
  { header: "Qtd. parcelas", width: 13, kind: "int", value: (r) => typeData(r).quantidade_parcelas ?? null },
  { header: "Nova data de vencimento", width: 20, kind: "text", value: (r) => (typeData(r).nova_data_vencimento ? formatDate(typeData(r).nova_data_vencimento) : "") },
  { header: "Valor restante", width: 16, kind: "money", value: (r) => typeData(r).valor_restante ?? null },
  { header: "Qtd. boletos", width: 13, kind: "int", value: (r) => typeData(r).quantidade_boletos ?? null },
  { header: "Primeiro vencimento", width: 18, kind: "text", value: (r) => (typeData(r).primeiro_vencimento ? formatDate(typeData(r).primeiro_vencimento) : "") },
  { header: "Intervalo entre vencimentos (dias)", width: 16, kind: "int", value: (r) => typeData(r).intervalo_vencimentos ?? null },
  { header: "Valor do desconto", width: 16, kind: "money", value: (r) => typeData(r).valor_desconto ?? null },
  { header: "Valor final", width: 16, kind: "money", value: (r) => typeData(r).valor_final ?? null },
  { header: "Criada em", width: 20, kind: "date", value: (r) => r.created_at },
  { header: "Atualizada em", width: 20, kind: "date", value: (r) => r.updated_at },
];

/**
 * Converte um instante ISO no "relógio de parede" de São Paulo e devolve um
 * Date cujos componentes UTC são esses valores. O Excel exibe datas pelo valor
 * literal, sem fuso: sem essa conversão a planilha mostraria o horário UTC,
 * três horas à frente do que a tela do sistema mostra.
 */
function excelDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const wallClock = formatDateTime(iso); // dd/MM/yyyy 'às' HH:mm
  const match = wallClock.match(/^(\d{2})\/(\d{2})\/(\d{4}) às (\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, day, month, year, hour, minute] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)));
}

function timestamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Planilha com todos os campos de cada solicitação. */
export async function exportRequestsToExcel(requests: FinancialRequest[]) {
  const writeXlsxFile = (await import("write-excel-file/browser")).default;

  const header = SHEET_COLUMNS.map((c) => ({
    value: c.header,
    fontWeight: "bold" as const,
    backgroundColor: "#F3F4F6",
    wrap: true,
  }));

  const body = requests.map((r) =>
    SHEET_COLUMNS.map((c) => {
      const raw = c.value(r);
      const empty = raw === null || raw === undefined || raw === "";

      if (c.kind === "money") {
        return empty ? null : { value: Number(raw), type: Number, format: '"R$" #,##0.00' };
      }
      if (c.kind === "int") {
        return empty ? null : { value: Number(raw), type: Number, format: "0" };
      }
      if (c.kind === "date") {
        const d = excelDate(raw as string);
        return d ? { value: d, type: Date, format: "dd/mm/yyyy hh:mm" } : null;
      }
      return { value: empty ? "" : String(raw), type: String };
    })
  );

  await writeXlsxFile([header, ...body], {
    columns: SHEET_COLUMNS.map((c) => ({ width: c.width })),
    stickyRowsCount: 1,
  }).toFile(`solicitacoes-${timestamp()}.xlsx`);
}

/** Colunas do PDF — um resumo legível em paisagem, para imprimir ou compartilhar. */
const PDF_COLUMNS: Array<{ header: string; value: (r: FinancialRequest) => string }> = [
  { header: "Nº", value: (r) => r.request_number },
  { header: "Cliente", value: (r) => r.client_name },
  { header: "Distribuidor", value: (r) => r.distributor || "-" },
  { header: "Empresa", value: (r) => r.company?.name || "-" },
  { header: "Tipo", value: (r) => REQUEST_TYPE_LABELS[r.request_type] },
  { header: "Valor total", value: (r) => (r.total_amount !== null ? formatBRL(r.total_amount) : "-") },
  { header: "Status", value: (r) => REQUEST_STATUS_LABELS[r.status] },
  { header: "Responsável", value: (r) => r.assignee?.full_name || "Não atribuído" },
  { header: "Criada em", value: (r) => formatDate(r.created_at) },
];

export async function exportRequestsToPdf(requests: FinancialRequest[]) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const emitidoEm = formatDateTime(new Date().toISOString());

  doc.setFontSize(14);
  doc.text("Central Financeira — Solicitações", 40, 40);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`${requests.length} solicitação(ões) · emitido em ${emitidoEm}`, 40, 56);

  autoTable(doc, {
    startY: 70,
    head: [PDF_COLUMNS.map((c) => c.header)],
    body: requests.map((r) => PDF_COLUMNS.map((c) => c.value(r))),
    styles: { fontSize: 7.5, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 40, right: 40 },
  });

  doc.save(`solicitacoes-${timestamp()}.pdf`);
}
