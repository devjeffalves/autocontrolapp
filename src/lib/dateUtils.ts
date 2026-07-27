/**
 * Utilitários centralizados para tratamento de datas e fuso horário (America/Sao_Paulo UTC-3).
 * Evita o bug de deslocamento de 3 horas em entradas datetime-local e exibições na interface.
 */

/**
 * Converte um objeto Date (ou timestamp) para a string de entrada do HTML <input type="datetime-local"> ("YYYY-MM-DDTHH:mm")
 * utilizando os componentes de HORA LOCAL do navegador do usuário.
 */
export function dateToLocalInputValue(dateInput: Date | string | number = new Date()): string {
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    if (match) {
      return `${match[1]}T${match[2]}`;
    }
  }

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Converte o valor de um input datetime-local ("YYYY-MM-DDTHH:mm") para um objeto Date preservando a hora exata informada pelo usuário.
 */
export function localInputValueToDate(inputValue: string): Date {
  if (!inputValue) return new Date();
  if (typeof inputValue === 'string' && inputValue.includes('T')) {
    const [datePart, timePart] = inputValue.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(hours)) {
      return new Date(year, month - 1, day, hours, minutes || 0);
    }
  }
  const d = new Date(inputValue);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Converte o valor de um input datetime-local ("YYYY-MM-DDTHH:mm") para uma ISO string contendo o timezone real do cliente.
 */
export function localInputValueToISO(inputValue: string): string {
  return localInputValueToDate(inputValue).toISOString();
}

/**
 * Formata uma data/timestamp para exibição de hora em pt-BR (ex: "09:22").
 * Preserva a hora gravada sem subtrair 3 horas indevidamente do fuso horário UTC.
 */
export function formatTimePtBR(dateInput: Date | string | number): string {
  if (!dateInput) return '--:--';
  
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/T(\d{2}):(\d{2})/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }
  }

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '--:--';

  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Formata uma data para exibição no formato pt-BR (ex: "26 de jul. de 2026")
 */
export function formatDatePtBR(dateInput: Date | string | number): string {
  if (!dateInput) return '--/--/----';
  
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '--/--/----';
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}
