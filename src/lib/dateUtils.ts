/**
 * Utilitários centralizados para tratamento de datas e fuso horário (America/Sao_Paulo UTC-3).
 * Garante sincronização perfeita entre formulários datetime-local, API no servidor e exibição na interface.
 */

/**
 * Converte um objeto Date, timestamp ou string ISO para a string de entrada do HTML <input type="datetime-local"> ("YYYY-MM-DDTHH:mm")
 * utilizando o fuso horário local do navegador.
 */
export function dateToLocalInputValue(dateInput: Date | string | number = new Date()): string {
  if (!dateInput) return '';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Converte o valor de um input datetime-local ("YYYY-MM-DDTHH:mm") para um objeto Date no fuso horário local do navegador.
 */
export function localInputValueToDate(inputValue: string | Date): Date {
  if (!inputValue) return new Date();
  if (inputValue instanceof Date) return inputValue;
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
 * Converte o valor de um input datetime-local ("YYYY-MM-DDTHH:mm") para uma ISO string contendo o fuso horário UTC correspondente.
 */
export function localInputValueToISO(inputValue: string | Date): string {
  return localInputValueToDate(inputValue).toISOString();
}

/**
 * Formata uma data/timestamp para exibição de hora em pt-BR (ex: "10:30") no fuso horário local do usuário.
 */
export function formatTimePtBR(dateInput: Date | string | number): string {
  if (!dateInput) return '--:--';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '--:--';

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Formata uma data para exibição por extenso/numérica no fuso horário local do usuário (ex: "26 de jul. de 2026")
 */
export function formatDatePtBR(dateInput: Date | string | number): string {
  if (!dateInput) return '--/--/----';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '--/--/----';

  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}
