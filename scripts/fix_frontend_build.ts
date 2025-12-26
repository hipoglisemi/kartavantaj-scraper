import fs from 'fs';
import path from 'path';

const FRONTEND_PATH = '/Users/hipoglisemi/Desktop/kartavantaj';

function fixBuildError() {
    console.log('👷 Fixing useAIProcessor.ts build errors...');
    const hookPath = path.join(FRONTEND_PATH, 'src/hooks/useAIProcessor.ts');

    if (fs.existsSync(hookPath)) {
        // Rewrite the file with correct syntax for the disabled state
        const content = `import { useState, useCallback, useRef } from 'react';
import { campaignParser } from '../services/campaignParser';

export interface AIProcessResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface UseAIProcessorReturn {
    processSingle: (text: string, currentData?: any) => Promise<AIProcessResult>;
    processBatch: (items: any[], onProgress?: (progress: number, status: string, timeRemaining: string) => void) => Promise<any[]>;
    stop: () => void;
    isLoading: boolean;
    status: string;
    progress: number;
    error: string | null;
}

export const useAIProcessor = (): UseAIProcessorReturn => {
    // These states are kept to avoid breaking compiled code even if unused
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);

    const stop = useCallback(() => {
        // No-op
    }, []);

    const processSingle = useCallback(async (text: string, currentData?: any): Promise<AIProcessResult> => {
        return { success: false, error: 'AI is disabled' };
    }, []);

    const processBatch = useCallback(async (
        items: any[],
        onProgress?: (progress: number, status: string, timeRemaining: string) => void
    ): Promise<any[]> => {
        // Immediately return the original items without processing
        return items;
    }, []);

    return {
        processSingle,
        processBatch,
        stop,
        isLoading,
        status,
        progress,
        error
    };
};
`;
        fs.writeFileSync(hookPath, content);
        console.log('✅ Replaced useAIProcessor.ts with clean, syntax-error-free version.');
    }
}

fixBuildError();
