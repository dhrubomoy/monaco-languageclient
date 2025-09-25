/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import getDebugServiceOverride from '@codingame/monaco-vscode-debug-service-override';
import getEnvironmentServiceOverride from '@codingame/monaco-vscode-environment-service-override';
import getExplorerServiceOverride from '@codingame/monaco-vscode-explorer-service-override';
import getKeybindingsServiceOverride from '@codingame/monaco-vscode-keybindings-service-override';
import getLifecycleServiceOverride from '@codingame/monaco-vscode-lifecycle-service-override';
import getLocalizationServiceOverride from '@codingame/monaco-vscode-localization-service-override';
import getPreferencesServiceOverride from '@codingame/monaco-vscode-preferences-service-override';
import '@codingame/monaco-vscode-python-default-extension';
import getRemoteAgentServiceOverride from '@codingame/monaco-vscode-remote-agent-service-override';
import getSearchServiceOverride from '@codingame/monaco-vscode-search-service-override';
import getSecretStorageServiceOverride from '@codingame/monaco-vscode-secret-storage-service-override';
import getStorageServiceOverride from '@codingame/monaco-vscode-storage-service-override';
import getTestingServiceOverride from '@codingame/monaco-vscode-testing-service-override';
import getBannerServiceOverride from '@codingame/monaco-vscode-view-banner-service-override';
import getStatusBarServiceOverride from '@codingame/monaco-vscode-view-status-bar-service-override';
import getTitleBarServiceOverride from '@codingame/monaco-vscode-view-title-bar-service-override';
import { createDefaultLocaleConfiguration } from 'monaco-languageclient/vscode/services';
import { LogLevel } from '@codingame/monaco-vscode-api';
import { MessageTransports } from 'vscode-languageclient';
import type { CodeContent, LanguageClientConfigs, WrapperConfig } from 'monaco-editor-wrapper';
import { configureDefaultWorkerFactory } from 'monaco-editor-wrapper/workers/workerLoaders';
import * as vscode from 'vscode';
import badPyCode from '../../../../resources/python/bad.py?raw';
import helloPyCode from '../../../../resources/python/hello.py?raw';
import hello2PyCode from '../../../../resources/python/hello2.py?raw';

// cannot be imported with assert as json contains comments
import statemachineLanguageConfig from './language-configuration.json?raw';
import responseStatemachineTm from '../syntaxes/statemachine.tmLanguage.json?raw';
import { type ConfigParams, type FileDefinition } from '../../../debugger/common/definitions.js';
import { RegisteredFileSystemProvider, RegisteredMemoryFile, registerFileSystemOverlay } from '@codingame/monaco-vscode-files-service-override';
import { createDefaultWorkspaceContent } from '../../../common/client/utils.js';
import { defaultHtmlAugmentationInstructions, defaultViewsInit } from 'monaco-editor-wrapper/vscode/services';

const createDefaultConfigParams = (homeDir: string, htmlContainer?: HTMLElement): ConfigParams => {
    const files = new Map<string, FileDefinition>();
    const workspaceRoot = `${homeDir}/workspace`;
    const configParams: ConfigParams = {
        extensionName: 'debugger-py-client',
        languageId: 'python',
        documentSelector: ['python', 'py'],
        homeDir,
        workspaceRoot: `${homeDir}/workspace`,
        workspaceFile: vscode.Uri.file(`${homeDir}/.vscode/workspace.code-workspace`),
        htmlContainer,
        protocol: 'ws',
        hostname: 'localhost',
        port: 55555,
        files,
        defaultFile: `${workspaceRoot}/hello2.py`,
        helpContainerCmd: 'docker compose -f ./packages/examples/resources/debugger/docker-compose.yml up -d',
        debuggerExecCall: 'graalpy --dap --dap.WaitAttached --dap.Suspend=true'
    };
    const helloPyPath = `${workspaceRoot}/hello.py`;
    const hello2PyPath = configParams.defaultFile;
    const badPyPath = `${workspaceRoot}/bad.py`;

    files.set('hello.py', { code: helloPyCode, path: helloPyPath, uri: vscode.Uri.file(helloPyPath) });
    files.set('hello2.py', { code: hello2PyCode, path: hello2PyPath, uri: vscode.Uri.file(hello2PyPath) });
    files.set('bad.py', { code: badPyCode, path: badPyPath, uri: vscode.Uri.file(badPyPath) });

    const fileSystemProvider = new RegisteredFileSystemProvider(false);
    fileSystemProvider.registerFile(new RegisteredMemoryFile(files.get('hello.py')!.uri, helloPyCode));
    fileSystemProvider.registerFile(new RegisteredMemoryFile(files.get('hello2.py')!.uri, hello2PyCode));
    fileSystemProvider.registerFile(new RegisteredMemoryFile(files.get('bad.py')!.uri, badPyCode));
    fileSystemProvider.registerFile(new RegisteredMemoryFile(configParams.workspaceFile, createDefaultWorkspaceContent(configParams.workspaceRoot)));
    // fileSystemProvider.registerFile(createDebugLaunchConfigFile(workspaceRoot, configParams.languageId));
    registerFileSystemOverlay(1, fileSystemProvider);

    return configParams;
};

export const createLangiumGlobalConfig = (params: {
    languageServerId: string,
    useLanguageClient: boolean,
    codeContent: CodeContent,
    worker?: Worker,
    messagePort?: MessagePort,
    messageTransports?: MessageTransports,
    htmlContainer: HTMLElement
}): WrapperConfig => {
    const extensionFilesOrContents = new Map<string, string | URL>();
    extensionFilesOrContents.set(`/${params.languageServerId}-statemachine-configuration.json`, statemachineLanguageConfig);
    extensionFilesOrContents.set(`/${params.languageServerId}-statemachine-grammar.json`, responseStatemachineTm);

    const configParams = createDefaultConfigParams('/home/mlc', document.body);

    const languageClientConfigs: LanguageClientConfigs | undefined = params.useLanguageClient && params.worker ? {
        configs: {
            statemachine: {
                clientOptions: {
                    documentSelector: ['statemachine'],
                    workspaceFolder: {
                        index: 0,
                        name: configParams.workspaceRoot,
                        uri: vscode.Uri.parse(configParams.workspaceRoot)
                    },
                },
                connection: {
                    options: {
                        $type: 'WorkerDirect',
                        worker: params.worker,
                        messagePort: params.messagePort,
                    },
                    messageTransports: params.messageTransports
                }
            }
        }
    } : undefined;

    return {
        $type: 'extended',
        htmlContainer: params.htmlContainer,
        logLevel: LogLevel.Debug,
        vscodeApiConfig: {
            serviceOverrides: {
                ...getKeybindingsServiceOverride(),
                ...getLifecycleServiceOverride(),
                ...getLocalizationServiceOverride(createDefaultLocaleConfiguration()),
                ...getBannerServiceOverride(),
                ...getStatusBarServiceOverride(),
                ...getTitleBarServiceOverride(),
                ...getExplorerServiceOverride(),
                ...getRemoteAgentServiceOverride(),
                ...getEnvironmentServiceOverride(),
                ...getSecretStorageServiceOverride(),
                ...getStorageServiceOverride(),
                ...getSearchServiceOverride(),
                ...getDebugServiceOverride(),
                ...getTestingServiceOverride(),
                ...getPreferencesServiceOverride()
            },
            viewsConfig: {
                viewServiceType: 'ViewsService',
                htmlAugmentationInstructions: defaultHtmlAugmentationInstructions,
                viewsInitFunc: defaultViewsInit
            },
            userConfiguration: {
                json: JSON.stringify({
                    'workbench.colorTheme': 'Default Dark Modern',
                    'editor.guides.bracketPairsHorizontal': 'active',
                    'editor.wordBasedSuggestions': 'off',
                    'editor.experimental.asyncTokenization': true,
                    'debug.toolBarLocation': 'docked'
                })
            },
            workspaceConfig: {
                enableWorkspaceTrust: true,
                windowIndicator: {
                    label: 'statemachine-example',
                    tooltip: '',
                    command: ''
                },
                workspaceProvider: {
                    trusted: true,
                    async open() {
                        window.open(window.location.href);
                        return true;
                    },
                    workspace: {
                        workspaceUri: configParams.workspaceFile
                    }
                },
                configurationDefaults: {
                    'window.title': 'statemachine-example${separator}${dirty}${activeEditorShort}'
                },
                productConfiguration: {
                    nameShort: 'statemachine-example',
                    nameLong: 'statemachine-example'
                }
            },
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
                    }]
                }
            },
            filesOrContents: extensionFilesOrContents
        }],
        editorAppConfig: {
            // codeResources: {
            //     modified: params.codeContent
            // },
            monacoWorkerFactory: configureDefaultWorkerFactory
        },
        languageClientConfigs
    };
};
