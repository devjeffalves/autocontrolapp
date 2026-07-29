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
 * Converte o valor de um input datetime-local ("YYYY-MM-DDTHH:mm") para um objeto Date no fuso horário local (America/Sao_Paulo).
 */
export function localInputValueToDate(inputValue: string | Date): Date {
  if (!inputValue) return new Date();
  if (inputValue instanceof Date) return inputValue;
  if (typeof inputValue === 'string' && inputValue.includes('T')) {
    const [datePart, timePart] = inputValue.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(hours)) {
      const isServer = typeof window === 'undefined';
      if (isServer) {
        // No servidor (Vercel UTC), ajusta para o fuso horário de Brasília (UTC-3: UTC = Local + 3h)
        return new Date(Date.UTC(year, month - 1, day, hours + 3, minutes || 0));
      } else {
        return new Date(year, month - 1, day, hours, minutes || 0);
      }
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
 * Formata uma data/timestamp para exibição de hora em pt-BR (ex: "14:17") no fuso horário de Brasília (America/Sao_Paulo).
 */
export function formatTimePtBR(dateInput: Date | string | number): string {
  if (!dateInput) return '--:--';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '--:--';

  try {
    return date.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (e) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}

/**
 * Formata uma data para exibição por extenso/numérica no fuso horário de Brasília (America/Sao_Paulo)
 */
export function formatDatePtBR(dateInput: Date | string | number): string {
  if (!dateInput) return '--/--/----';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '--/--/----';

  try {
    return date.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
