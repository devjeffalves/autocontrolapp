/**
 * Utilitários centralizados para tratamento de datas e fuso horário de Brasília (America/Sao_Paulo UTC-3).
 * Garante sincronização perfeita entre formulários datetime-local, API no servidor (Vercel Node.js) e exibição na interface.
 */

/**
 * Converte um objeto Date, timestamp ou string ISO para a string de entrada do HTML <input type="datetime-local"> ("YYYY-MM-DDTHH:mm")
 * utilizando estritamente o fuso horário de Brasília (America/Sao_Paulo).
 */
export function dateToLocalInputValue(dateInput: Date | string | number = new Date()): string {
  if (!dateInput) return '';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00';
    let hours = getPart('hour');
    if (hours === '24') hours = '00';
    
    return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${hours.padStart(2, '0')}:${getPart('minute').padStart(2, '0')}`;
  } catch (e) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}

/**
 * Converte o valor de um input datetime-local ("YYYY-MM-DDTHH:mm") para um objeto Date garantindo a marcação do fuso de Brasília (-03:00).
 */
export function localInputValueToDate(inputValue: string | Date): Date {
  if (!inputValue) return new Date();
  if (inputValue instanceof Date) return inputValue;

  if (typeof inputValue === 'string' && inputValue.includes('T')) {
    // Se a string já tiver offset explícito (ex: Z ou -03:00), analisa diretamente
    if (inputValue.includes('Z') || (inputValue.includes('-') && inputValue.split('T')[1]?.includes('-'))) {
      const d = new Date(inputValue);
      return isNaN(d.getTime()) ? new Date() : d;
    }

    // Para string datetime-local padrão ("YYYY-MM-DDTHH:mm"), compor ISO string com fuso de Brasília (-03:00)
    const [datePart, timePart] = inputValue.split('T');
    const formattedTime = timePart.length === 5 ? timePart + ':00' : timePart;
    const isoString = `${datePart}T${formattedTime}-03:00`;
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? new Date(inputValue) : d;
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
