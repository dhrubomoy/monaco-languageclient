/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import type { Logger } from 'monaco-languageclient/common';
import { useWorkerFactory, type WorkerLoader } from 'monaco-languageclient/workerFactory';

const createWorker = async (workerUrl: string, workerName: string) => {
    // const workerUrl = new URL(file, import.meta.url).href;
    const response = await fetch(workerUrl);

    if (!response.ok) {
        throw new Error(`Failed to fetch worker: ${response.statusText}`);
    }

    const workerCode = await response.text();
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);

    const worker = new Worker(blobUrl, {
        type: 'module',
        name: workerName,
    });

    return worker;
};

export const defineDefaultWorkerLoaders: () => Record<string, WorkerLoader> = () => {
    const defaultTextEditorWorker = () => createWorker(
        new URL('../../../examples/src/assets/monaco-workers/editor.js', import.meta.url).href,
        'TextEditorWorker'
    );
    const defaultTextMateWorker = () => createWorker(
        new URL('../../../examples/src/assets/monaco-workers/textmate.js', import.meta.url).href,
        'TextMateWorker'
    );

    return {
        // if you import monaco api as 'monaco-editor': monaco-editor/esm/vs/editor/editor.worker.js
        TextEditorWorker: defaultTextEditorWorker,
        TextMateWorker: defaultTextMateWorker,
        // these are other possible workers not configured by default
        OutputLinkDetectionWorker: undefined,
        LanguageDetectionWorker: undefined,
        NotebookEditorWorker: undefined,
        LocalFileSearchWorker: undefined
    };
};

export const configureDefaultWorkerFactory = (logger?: Logger) => {
    useWorkerFactory({
        workerLoaders: defineDefaultWorkerLoaders(),
        logger
    });
};
