/**
 * Clipboard hook for copy/paste functionality
 */

import { useState, useCallback, useEffect } from 'react';

/**
 * Options for clipboard operations
 */
interface ClipboardOptions {
  timeout?: number;
  onSuccess?: (text: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Return type for useClipboard hook
 */
interface UseClipboardReturn {
  copy: (text: string) => Promise<void>;
  paste: () => Promise<string>;
  copied: boolean;
  error: Error | null;
  isSupported: boolean;
  clear: () => void;
}

/**
 * Hook for clipboard operations with feedback states
 * 
 * @param options - Configuration options
 * @returns Clipboard utilities and state
 * 
 * @example
 * ```ts
 * const { copy, copied, error, isSupported } = useClipboard({
 *   timeout: 2000,
 *   onSuccess: (text) => showToast(`Copied: ${text}`),
 * });
 * 
 * const handleCopy = () => copy('Hello, World!');
 * ```
 */
export function useClipboard(options: ClipboardOptions = {}): UseClipboardReturn {
  const { timeout = 2000, onSuccess, onError } = options;
  
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Check if clipboard API is supported
  const isSupported = Boolean(
    typeof window !== 'undefined' &&
    (navigator.clipboard || document.queryCommandSupported?.('copy'))
  );

  // Clear copied state after timeout
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), timeout);
      return () => clearTimeout(timer);
    }
  }, [copied, timeout]);

  /**
   * Copy text to clipboard
   */
  const copy = useCallback(async (text: string): Promise<void> => {
    if (!isSupported) {
      const err = new Error('Clipboard API not supported');
      setError(err);
      onError?.(err);
      return;
    }

    try {
      // Try modern clipboard API first
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        await copyFallback(text);
      }

      setCopied(true);
      setError(null);
      onSuccess?.(text);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Copy failed');
      setError(error);
      setCopied(false);
      onError?.(error);
    }
  }, [isSupported, onSuccess, onError]);

  /**
   * Paste text from clipboard
   */
  const paste = useCallback(async (): Promise<string> => {
    if (!isSupported || !navigator.clipboard) {
      const err = new Error('Clipboard read not supported');
      setError(err);
      onError?.(err);
      throw err;
    }

    try {
      const text = await navigator.clipboard.readText();
      setError(null);
      return text;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Paste failed');
      setError(error);
      onError?.(error);
      throw error;
    }
  }, [isSupported, onError]);

  /**
   * Clear copied state and error
   */
  const clear = useCallback(() => {
    setCopied(false);
    setError(null);
  }, []);

  return {
    copy,
    paste,
    copied,
    error,
    isSupported,
    clear,
  };
}

/**
 * Fallback copy method for older browsers
 */
function copyFallback(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create a temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    document.body.appendChild(textarea);

    try {
      // Select and copy the text
      textarea.focus();
      textarea.select();
      
      const successful = document.execCommand('copy');
      if (successful) {
        resolve();
      } else {
        reject(new Error('Copy command failed'));
      }
    } catch (err) {
      reject(err);
    } finally {
      document.body.removeChild(textarea);
    }
  });
}

/**
 * Hook for copying formatted text (HTML/rich text)
 * 
 * @param options - Configuration options
 * @returns Rich clipboard utilities
 * 
 * @example
 * ```ts
 * const { copyRich, copied } = useRichClipboard();
 * 
 * const handleCopyFormatted = () => {
 *   copyRich({
 *     text: 'Hello, World!',
 *     html: '<strong>Hello, World!</strong>',
 *   });
 * };
 * ```
 */
export function useRichClipboard(options: ClipboardOptions = {}) {
  const { timeout = 2000, onSuccess, onError } = options;
  
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isSupported = Boolean(
    typeof window !== 'undefined' && navigator.clipboard && 'write' in navigator.clipboard
  );

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), timeout);
      return () => clearTimeout(timer);
    }
  }, [copied, timeout]);

  const copyRich = useCallback(async (content: {
    text: string;
    html?: string;
  }): Promise<void> => {
    if (!isSupported) {
      const err = new Error('Rich clipboard API not supported');
      setError(err);
      onError?.(err);
      return;
    }

    try {
      const clipboardItems = [];
      
      // Add plain text
      clipboardItems.push(
        new ClipboardItem({
          'text/plain': new Blob([content.text], { type: 'text/plain' }),
        })
      );

      // Add HTML if provided
      if (content.html) {
        clipboardItems.push(
          new ClipboardItem({
            'text/html': new Blob([content.html], { type: 'text/html' }),
          })
        );
      }

      await navigator.clipboard.write(clipboardItems);
      
      setCopied(true);
      setError(null);
      onSuccess?.(content.text);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Rich copy failed');
      setError(error);
      setCopied(false);
      onError?.(error);
    }
  }, [isSupported, onSuccess, onError]);

  return {
    copyRich,
    copied,
    error,
    isSupported,
  };
}

/**
 * Hook for copying fantasy sports data with formatting
 * 
 * @returns Fantasy clipboard utilities
 * 
 * @example
 * ```ts
 * const { copyPlayerStats, copyTradeProposal, copyLineup } = useFantasyClipboard();
 * 
 * copyPlayerStats({
 *   name: 'Josh Allen',
 *   position: 'QB',
 *   points: 24.5,
 *   projectedPoints: 22.1,
 * });
 * ```
 */
export function useFantasyClipboard() {
  const { copy } = useClipboard();
  const { copyRich } = useRichClipboard();

  const copyPlayerStats = useCallback(async (player: {
    name: string;
    position: string;
    team?: string;
    points: number;
    projectedPoints?: number;
  }) => {
    const text = [
      `${player.name} (${player.position}${player.team ? ` - ${player.team}` : ''})`,
      `Points: ${player.points}`,
      player.projectedPoints && `Projected: ${player.projectedPoints}`,
    ].filter(Boolean).join('\n');

    const html = [
      `<strong>${player.name}</strong> (${player.position}${player.team ? ` - ${player.team}` : ''})<br>`,
      `Points: <strong>${player.points}</strong><br>`,
      player.projectedPoints && `Projected: ${player.projectedPoints}`,
    ].filter(Boolean).join('');

    await copyRich({ text, html });
  }, [copyRich]);

  const copyLineup = useCallback(async (lineup: Array<{
    position: string;
    player?: {
      name: string;
      points: number;
    };
  }>) => {
    const text = lineup
      .map(slot => {
        if (slot.player) {
          return `${slot.position}: ${slot.player.name} (${slot.player.points} pts)`;
        }
        return `${slot.position}: Empty`;
      })
      .join('\n');

    const html = lineup
      .map(slot => {
        if (slot.player) {
          return `<strong>${slot.position}:</strong> ${slot.player.name} (${slot.player.points} pts)<br>`;
        }
        return `<strong>${slot.position}:</strong> <em>Empty</em><br>`;
      })
      .join('');

    await copyRich({ text, html });
  }, [copyRich]);

  const copyTradeProposal = useCallback(async (trade: {
    fromTeam: string;
    toTeam: string;
    fromPlayers: string[];
    toPlayers: string[];
  }) => {
    const text = [
      `Trade Proposal:`,
      `${trade.fromTeam} trades: ${trade.fromPlayers.join(', ')}`,
      `${trade.toTeam} trades: ${trade.toPlayers.join(', ')}`,
    ].join('\n');

    const html = [
      '<strong>Trade Proposal:</strong><br>',
      `<strong>${trade.fromTeam}</strong> trades: ${trade.fromPlayers.join(', ')}<br>`,
      `<strong>${trade.toTeam}</strong> trades: ${trade.toPlayers.join(', ')}`,
    ].join('');

    await copyRich({ text, html });
  }, [copyRich]);

  const copyLeagueStandings = useCallback(async (standings: Array<{
    rank: number;
    team: string;
    wins: number;
    losses: number;
    points: number;
  }>) => {
    const text = [
      'League Standings:',
      ...standings.map(team => 
        `${team.rank}. ${team.team} (${team.wins}-${team.losses}) - ${team.points} pts`
      ),
    ].join('\n');

    const html = [
      '<strong>League Standings:</strong><br>',
      ...standings.map(team => 
        `${team.rank}. <strong>${team.team}</strong> (${team.wins}-${team.losses}) - ${team.points} pts<br>`
      ),
    ].join('');

    await copyRich({ text, html });
  }, [copyRich]);

  return {
    copyPlayerStats,
    copyLineup,
    copyTradeProposal,
    copyLeagueStandings,
    copy, // For basic text copying
  };
}