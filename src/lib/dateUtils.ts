/**
 * Utilitários centralizados para tratamento de datas e fuso horário de Brasília (America/Sao_Paulo UTC-3).
 * Garante sincronização perfeita entre formulários datetime-local, API no servidor (Vercel Node.js) e exibição na interface.
 */

/**
 * Converte um objeto Date, timestamp ou string ISO para a string de entrada do HTML <input type="datetime-local"> ("YYYY-MM-DDTHH:mm")
 * utilizando estritamente o fuso horário de Brasília (America/Sao_Paulo).
 * Preserva strings no formato local ("YYYY-MM-DDTHH:mm" ou com segundos) intactas quando o usuário está digitando no input.
 */
export function dateToLocalInputValue(dateInput: Date | string | number = new Date()): string {
  if (!dateInput) return '';
  
  if (typeof dateInput === 'string') {
    // Se for string datetime-local sem timezone explícito (ex: "2026-07-28T19:30" ou "2026-07-28T19:30:45"), corta no formato YYYY-MM-DDTHH:mm
    if (dateInput.includes('T') && !dateInput.endsWith('Z') && !dateInput.slice(10).includes('-')) {
      return dateInput.slice(0, 16);
    }
  }

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
 * Converte o valor de um input datetime-local ("YYYY-MM-DDTHH:mm") ou ISO string para um objeto Date garantindo a marcação do fuso de Brasília (-03:00).
 * Função 100% idempotente.
 */
/**
 * Converte o valor de um input datetime-local ("YYYY-MM-DDTHH:mm") ou ISO string para um objeto Date garantindo a marcação do fuso de Brasília (-03:00).
 * Função 100% idempotente.
 */
export function localInputValueToDate(inputValue: string | Date | number): Date {
  if (!inputValue) return new Date();
  if (inputValue instanceof Date) return inputValue;
  if (typeof inputValue === 'number') return new Date(inputValue);

  if (typeof inputValue === 'string') {
    // Se a string já tiver offset explícito (ex: Z ou sufixo com fuso horário + ou -), analisa diretamente
    if (inputValue.endsWith('Z') || (inputValue.includes('T') && (inputValue.slice(10).includes('-') || inputValue.slice(10).includes('+')))) {
      const d = new Date(inputValue);
      return isNaN(d.getTime()) ? new Date() : d;
    }

    // Para string datetime-local padrão ("YYYY-MM-DDTHH:mm"), compor ISO string com fuso de Brasília (-03:00)
    if (inputValue.includes('T')) {
      const [datePart, timePart] = inputValue.split('T');
      const formattedTime = timePart.length >= 5 ? timePart.slice(0, 5) + ':00' : timePart;
      const isoString = `${datePart}T${formattedTime}-03:00`;
      const d = new Date(isoString);
      return isNaN(d.getTime()) ? new Date(inputValue) : d;
    }
  }

  const d = new Date(inputValue);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Converte o valor de um input datetime-local ("YYYY-MM-DDTHH:mm") para uma ISO string contendo o fuso horário UTC correspondente.
 */
export function localInputValueToISO(inputValue: string | Date | number): string {
  return localInputValueToDate(inputValue).toISOString();
}

/**
 * Formata uma data/timestamp para exibição de hora em pt-BR (ex: "14:17") no fuso horário de Brasília (America/Sao_Paulo).
 */
export function formatTimePtBR(dateInput: Date | string | number): string {
  if (!dateInput) return '--:--';
  const date = localInputValueToDate(dateInput);
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
  const date = localInputValueToDate(dateInput);
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

/**
 * Formata duração em minutos para o formato de exibição pt-BR (ex: "2h 15m" ou "45m").
 */
export function formatDuration(totalMin: number): string {
  if (!totalMin || isNaN(totalMin) || totalMin <= 0) return '0m';
  const hours = Math.floor(totalMin / 60);
  const mins = Math.round(totalMin % 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

interface IPause {
  startTime: Date | string | number;
  endTime?: Date | string | number;
}

/**
 * Calcula a duração líquida de trabalho (em minutos), subtraindo o tempo decorrido de todas as pausas registradas.
 */
export function calculateWorkingMinutes(
  startTime: Date | string | number | null | undefined,
  endTime: Date | string | number | null | undefined,
  pauses?: IPause[],
  ridesCount?: number,
  kmTotal?: number
): number {
  if (!startTime) return 0;
  
  const startMs = localInputValueToDate(startTime).getTime();
  let endMs = endTime ? localInputValueToDate(endTime).getTime() : Date.now();
  
  if (isNaN(startMs)) return 0;

  // Se o horário de término for inválido ou igual ao início (ex: registros antigos sem endTime salvo), aplicar estimativa proporcional
  if (endTime && (isNaN(endMs) || endMs <= startMs)) {
    if (ridesCount && ridesCount > 0) {
      endMs = startMs + Math.round(ridesCount * 22) * 60000;
    } else if (kmTotal && kmTotal > 0) {
      endMs = startMs + Math.max(20, Math.round((kmTotal / 25) * 60)) * 60000;
    } else {
      return 0;
    }
  }
  
  const totalDiffMs = endMs - startMs;
  
  const totalPauseMs = (pauses || []).reduce((pAcc: number, p: IPause) => {
    if (!p.startTime) return pAcc;
    const pStart = localInputValueToDate(p.startTime).getTime();
    // Se a pausa não tiver endTime definido, usamos o endMs da própria sessão
    const rawPEnd = p.endTime ? localInputValueToDate(p.endTime).getTime() : endMs;
    if (isNaN(pStart) || isNaN(rawPEnd)) return pAcc;
    
    // A pausa não pode terminar depois do endMs da sessão, nem começar antes do startMs da sessão
    const pEndCapped = Math.min(rawPEnd, endMs);
    const pStartCapped = Math.max(pStart, startMs);
    
    return pAcc + Math.max(0, pEndCapped - pStartCapped);
  }, 0);
  
  const workingMs = Math.max(0, totalDiffMs - totalPauseMs);
  return Math.round(workingMs / 60000);
}


