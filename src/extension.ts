import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

function createWebviewPanel(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel(
        'apiFuzzer',
        'API Fuzzer',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    panel.webview.html = getWebviewContent();

    panel.webview.onDidReceiveMessage(
        async (message) => {
            if (message.command === 'generateSpecAndFuzz') {
                let specPath = message.data.specPath;
                if (!specPath) {
                    specPath = await generateOpenApiSpec(message.data);
                    if (specPath) {
                        vscode.window.showInformationMessage('OpenAPI 스펙 파일이 저장되었습니다.');
                    }
                } else {
                    const runFuzz = await vscode.window.showInformationMessage(
                        '기존 OpenAPI 스펙 파일이 선택되었습니다. 퍼징 테스트를 실행하시겠습니까?',
                        '예', '아니오'
                    );
                    if (runFuzz === '예') {
                        await setupWslEnvironment();
                        runApiFuzzer(specPath, message.data);
                    }
                }
            }
        },
        undefined,
        context.subscriptions
    );
}

async function setupWslEnvironment() {
    const sudoPassword = await vscode.window.showInputBox({
        prompt: 'WSL에서 필요한 패키지를 설치하기 위해 sudo 비밀번호를 입력해 주세요.',
        password: true,
        ignoreFocusOut: true,
    });

    if (!sudoPassword) {
        vscode.window.showErrorMessage('비밀번호가 입력되지 않아 설치를 중단합니다.');
        return;
    }

    const terminal = vscode.window.createTerminal({ name: "WSL Setup", shellPath: "wsl" });
    terminal.show();

    terminal.sendText(`echo '${sudoPassword}' | sudo -S apt update`);
    terminal.sendText(`echo '${sudoPassword}' | sudo -S apt install -y libcurl4-openssl-dev libssl-dev libcurl4-nss-dev gcc python3-pip`);
    terminal.sendText(`pip3 install --upgrade APIFuzzer`);

    setTimeout(() => {
        terminal.sendText('echo "WSL 환경 설정 및 APIFuzzer 설치가 완료되었습니다."');
    }, 5000);
}

function getWebviewContent(): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>API Fuzzer</title>
        </head>
        <body>
            <h1>퍼저 설정</h1>
            <form id="form">
                <label>스펙 파일 옵션</label>
                <select id="specOption">
                    <option value="existing">기존 파일 선택</option>
                    <option value="new" selected>새로운 파일 생성</option>
                </select><br><br>

                <div id="existingSpecSection" style="display: none;">
                    <label>기존 파일 경로</label>
                    <input type="file" id="specFile" accept=".json, .yaml"><br><br>
                </div>

                <div id="newSpecSection">
                    <label>타깃 URL</label>
                    <input type="text" id="targetUrl" value="http://localhost:5000" required><br><br>

                    <label>HTTP 메서드</label>
                    <select id="method">
                        <option value="get">GET</option>
                        <option value="post" selected>POST</option>
                        <option value="put">PUT</option>
                        <option value="delete">DELETE</option>
                    </select><br><br>

                    <label>API 경로</label>
                    <input type="text" id="apiPath" value="/login" required><br><br>

                    <label>Body 파라미터를 입력하시겠습니까? (선택)</label>
                    <select id="includeBodyParams">
                        <option value="yes">예</option>
                        <option value="no" selected>아니오</option>
                    </select><br><br>

                    <div id="bodyParamsSection" style="display: none;">
                        <label>Body 파라미터:</label>
                        <input type="text" id="bodyParams" value='[{"name": "email", "type": "string"}, {"name": "password", "type": "string"}]'><br><br>

                        <label>Content-Type:</label>
                        <select id="contentType">
                            <option value="application/json" selected>application/json</option>
                            <option value="multipart/form-data">multipart/form-data</option>
                        </select><br><br>
                    </div>
                </div>

                <label>로그 표시</label>
                <select id="logLevel">
                    <option value="critical">Critical</option>
                    <option value="fatal">Fatal</option>
                    <option value="error">Error</option>
                    <option value="warn">Warn</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                    <option value="debug" selected>Debug</option>
                    <option value="notset">NotSet</option>
                </select><br><br>

                <label>테스트 심층 레벨</label>
                <input type="number" id="testLevel" value="1" min="1" max="2"><br><br>

                <label>추가 헤더 (JSON 형식으로 작성 예: {'Authorization': 'Bearer ~'})</label>
                <input type="text" id="headers" value='[]'><br><br>

                <button type="submit">스펙 파일 생성 및 퍼징 실행</button>
            </form>

            <script>
                const vscode = acquireVsCodeApi();

                document.getElementById('specOption').addEventListener('change', (event) => {
                    const specOption = event.target.value;
                    document.getElementById('existingSpecSection').style.display = specOption === 'existing' ? 'block' : 'none';
                    document.getElementById('newSpecSection').style.display = specOption === 'new' ? 'block' : 'none';
                });

                document.getElementById('includeBodyParams').addEventListener('change', (event) => {
                    const includeBodyParams = event.target.value;
                    const bodyParamsSection = document.getElementById('bodyParamsSection');
                    bodyParamsSection.style.display = includeBodyParams === 'yes' ? 'block' : 'none';
                });

                document.getElementById('form').addEventListener('submit', (event) => {
                    event.preventDefault();
                    const specOption = document.getElementById('specOption').value;
                    let specPath = null;
                    if (specOption === 'existing') {
                        specPath = document.getElementById('specFile').files[0]?.path;
                    }
                    const includeBodyParams = document.getElementById('includeBodyParams').value;
                    const data = {
                        specPath,
                        targetUrl: document.getElementById('targetUrl').value,
                        method: document.getElementById('method').value,
                        apiPath: document.getElementById('apiPath').value,
                        bodyParams: includeBodyParams === 'yes' ? JSON.parse(document.getElementById('bodyParams').value || '[]') : [],
                        contentType: includeBodyParams === 'yes' ? document.getElementById('contentType').value : '',
                        options: {
                            logLevel: document.getElementById('logLevel').value,
                            testLevel: document.getElementById('testLevel').value,
                            headers: JSON.parse(document.getElementById('headers').value || '[]')
                        }
                    };
                    vscode.postMessage({ command: 'generateSpecAndFuzz', data });
                });
            </script>
        </body>
        </html>
    `;
}

async function generateOpenApiSpec(data: { targetUrl: string, method: string, apiPath: string, bodyParams: any[], contentType: string }): Promise<string | null> {
    const openApiSpec: any = {
        openapi: '3.0.0',
        info: { title: 'Generated API Spec', version: '1.0.0' },
        paths: {
            [data.apiPath]: {
                [data.method]: {
                    requestBody: data.bodyParams.length > 0 ? {
                        content: {
                            [data.contentType]: {
                                schema: {
                                    type: 'object',
                                    properties: {}
                                }
                            }
                        }
                    } : undefined,
                    responses: { '200': { description: 'Success' } },
                }
            }
        }
    };

    if (data.bodyParams.length > 0) {
        data.bodyParams.forEach(param => {
            openApiSpec.paths[data.apiPath][data.method].requestBody.content[data.contentType].schema.properties[param.name] = { 
                type: param.type 
            };
        });
    }

    const tmpDir = '/mnt/c/tmp/openapi';
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }
    const randomFileName = generateRandomFileName();
    const specPath = path.join(tmpDir, randomFileName + '.json');
    fs.writeFileSync(specPath, JSON.stringify(openApiSpec, null, 2));
    return specPath;
}

function generateRandomFileName(): string {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000);
    return `generated_openapi_${timestamp}_${randomNum}`;
}

function generateReporterRandomFileName(): string {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000);
    return `generated_reporter_${timestamp}_${randomNum}`;
}

async function runApiFuzzer(specPath: string, data: { targetUrl: string, options: { logLevel: string, testLevel: string, headers: any[] } }) {
    const terminal = vscode.window.createTerminal({ name: "wsl", shellPath: "wsl" });
    terminal.show();

    const wslSpecPath = specPath.replace(/\\/g, '/').replace(/^([a-zA-Z]):/, '/mnt/$1').toLowerCase();

    const headersOption = data.options.headers.length > 0 ? `--headers '${JSON.stringify(data.options.headers)}'` : '';
    const reportFileName = generateReporterRandomFileName() + '.json';
    const wslReportPath = `/mnt/c/mnt/c/tmp/openapi/${reportFileName}`; // Ensure the path is correct
    const command = `APIFuzzer -s ${wslSpecPath} -u ${data.targetUrl} -r ${wslReportPath} --log ${data.options.logLevel} --level ${data.options.testLevel} ${headersOption}`;
    
    terminal.sendText(command);

    setTimeout(async () => {
        // const reportPath = path.join('/mnt/c/mnt/c/tmp/openapi', reportFileName); 
        if (!fs.existsSync(wslReportPath)) {
            terminal.sendText(`${command} > ${wslReportPath}`);
            await new Promise(resolve => setTimeout(resolve, 10000)); 
            vscode.window.showErrorMessage('리포트 파일이 생성되지 않았습니다. 오류 로그를 확인하세요.');
            return;
        }

        vscode.window.showInformationMessage(`리포트 파일이 생성되었습니다: ${wslReportPath}`);
    }, 10000); 
}

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('neon.runFuzzer', () => createWebviewPanel(context));
    context.subscriptions.push(disposable);
}

export function deactivate() {}
