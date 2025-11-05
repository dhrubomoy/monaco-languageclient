/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import getKeybindingsServiceOverride from '@codingame/monaco-vscode-keybindings-service-override';
import getLifecycleServiceOverride from '@codingame/monaco-vscode-lifecycle-service-override';
import getLocalizationServiceOverride from '@codingame/monaco-vscode-localization-service-override';
import { LogLevel } from '@codingame/monaco-vscode-api';
import { MessageTransports } from 'vscode-languageclient';
import { createDefaultLocaleConfiguration } from 'monaco-languageclient/vscodeApiLocales';
import type { MonacoVscodeApiConfig } from 'monaco-languageclient/vscodeApiWrapper';
import type { LanguageClientConfig } from 'monaco-languageclient/lcwrapper';
import { useWorkerFactory } from 'monaco-languageclient/workerFactory';
import type { CodeContent, EditorAppConfig } from 'monaco-languageclient/editorApp';

// cannot be imported with assert as json contains comments
import statemachineLanguageConfig from './language-configuration.json?raw';
import responseStatemachineTm from '../syntaxes/statemachine.tmLanguage.json?raw';
import type { ExampleAppConfig } from '../../../common/client/utils.js';

const MyTokenColors = {
    string: { light: '#44751d', dark: '#44751d' },
    escape: { light: '#44751d', dark: '#44751d' },
    keyword: { light: '#6a8fde', dark: '#6a8fde' },
    comment: { light: '#808080', dark: '#808080' },
    field: { light: '#CC9966', dark: '#CC9966' },
    table: { light: '#8e477d', dark: '#8e477d' },
    variable: { light: '#CC99CC', dark: '#CC99CC' },
    normalText: { light: '#000000', dark: '#ffffff' },
};

const getThemeId = (type: 'light' | 'dark') => `my-script-${type}-theme`;

const getTheme = (type: 'light' | 'dark') => {
    return {
        id: getThemeId(type),
        name: `My script ${type} theme`,
        type,
        colors: {},
        tokenColors: [
            {
                scope: [
                    'keyword.control.statemachine',
                ],
                settings: { foreground: MyTokenColors.string[type] },
            },
            {
                scope: 'keyword.control.statemachine',
                settings: { foreground: MyTokenColors.keyword[type] },
            },
            {
                scope: [
                    'comment.block.statemachine',
                    'comment.line.statemachine',
                ],
                settings: { foreground: MyTokenColors.comment[type] },
            },
        ],

        semanticHighlighting: true,
        semanticTokenColors: {
            property: MyTokenColors.field[type],
            namespace: MyTokenColors.table[type],
            variable: MyTokenColors.variable[type],
            struct: MyTokenColors.normalText[type],
        },
    };
};

export const MY_DARK_THEME_ID = getThemeId('dark');
export const MY_LIGHT_THEME_ID = getThemeId('light');
export const MyLightTheme = getTheme('light');
export const MyDarkTheme = getTheme('dark');


export const createLangiumGlobalConfig = (params: {
    languageServerId: string,
    codeContent: CodeContent,
    worker: Worker,
    messagePort?: MessagePort,
    messageTransports?: MessageTransports,
    htmlContainer?: HTMLElement
}): ExampleAppConfig => {
    const extensionFilesOrContents = new Map<string, string | URL>();
    extensionFilesOrContents.set(`/${params.languageServerId}-statemachine-configuration.json`, statemachineLanguageConfig);
    extensionFilesOrContents.set(`/${params.languageServerId}-statemachine-grammar.json`, responseStatemachineTm);
    extensionFilesOrContents.set(`./${params.languageServerId}-${MY_LIGHT_THEME_ID}.json`, JSON.stringify(MyLightTheme, null, 2));
    extensionFilesOrContents.set(`./${params.languageServerId}-${MY_DARK_THEME_ID}.json`, JSON.stringify(MyDarkTheme, null, 2));

    const languageClientConfig: LanguageClientConfig = {
        languageId: 'statemachine',
        clientOptions: {
            documentSelector: ['statemachine']
        },
        connection: {
            options: {
                $type: 'WorkerDirect',
                worker: params.worker,
                messagePort: params.messagePort,
            },
            messageTransports: params.messageTransports
        }
    };

    const vscodeApiConfig: MonacoVscodeApiConfig = {
        $type: 'extended',
        viewsConfig: {
            $type: 'EditorService',
            htmlContainer: params.htmlContainer
        },
        logLevel: LogLevel.Debug,
        serviceOverrides: {
            ...getKeybindingsServiceOverride(),
            ...getLifecycleServiceOverride(),
            ...getLocalizationServiceOverride(createDefaultLocaleConfiguration()),
        },
        // monacoWorkerFactory: configureDefaultWorkerFactory,
        monacoWorkerFactory: (logger) => {
            useWorkerFactory({
                workerLoaders: {
                // if you import monaco api as 'monaco-editor': monaco-editor/esm/vs/editor/editor.worker.js
                    TextEditorWorker: () => new Worker(
                        new URL('../../../assets/monaco-workers/editor.js', import.meta.url),
                        { type: 'module' }
                    ),
                    TextMateWorker: () => new Worker(
                        new URL('../../../assets/monaco-workers/textmate.js', import.meta.url),
                        { type: 'module' }
                    ),
                    // these are other possible workers not configured by default
                    OutputLinkDetectionWorker: undefined,
                    LanguageDetectionWorker: undefined,
                    NotebookEditorWorker: undefined,
                    LocalFileSearchWorker: undefined
                },
                logger
            });
        },
        userConfiguration: {
            json: JSON.stringify({
                'workbench.colorTheme': MY_LIGHT_THEME_ID,
                'editor.guides.bracketPairsHorizontal': 'active',
                'editor.wordBasedSuggestions': 'off',
                'editor.experimental.asyncTokenization': true,
            })
        },
        extensions: [{
            config: {
                name: 'statemachine-example',
                publisher: 'TypeFox',
                version: '1.0.0',
                engines: {
                    vscode: '*'
                },
                contributes: {
                    languages: [{
                        id: 'statemachine',
                        extensions: ['.statemachine'],
                        aliases: ['statemachine', 'Statemachine'],
                        configuration: `./${params.languageServerId}-statemachine-configuration.json`
                    }],
                    grammars: [{
                        language: 'statemachine',
                        scopeName: 'source.statemachine',
                        path: `./${params.languageServerId}-statemachine-grammar.json`
                    }],
                    themes: [
                        {
                            id: MY_LIGHT_THEME_ID,
                            label: MyLightTheme.name,
                            uiTheme: 'vs',
                            path: `./${params.languageServerId}-${MY_LIGHT_THEME_ID}.json`,
                        },
                        {
                            id: MY_DARK_THEME_ID,
                            label: MyDarkTheme.name,
                            uiTheme: 'vs-dark',
                            path: `./${params.languageServerId}-${MY_DARK_THEME_ID}.json`,
                        },
                    ],
                }
            },
            filesOrContents: extensionFilesOrContents
        }]
    };

    const editorAppConfig: EditorAppConfig = {
        codeResources: {
            modified: params.codeContent
        }
    };

    return {
        editorAppConfig,
        vscodeApiConfig,
        languageClientConfig
    };
};
