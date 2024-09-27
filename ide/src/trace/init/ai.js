/*
 * Copyright (C) 2024 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const iconv = require("iconv-lite");
const AI_TYPE = 8;
const SAVE_CMD = 1;
const SAVE_BACK_CMD = 2;
const DIAGNOSIS_BACK_CMD = 4;

// 注册
function init() {
    const apps = require('../app');
    apps.pluginSystem.registerPlugin(AI_TYPE, process, clearDbFile);

}

// 写入DB或诊断信息
function process(session_id, cmd, data) {
    let message;
    let backCmd;
    let filePath = path.join(__dirname, 'db_cache', `${session_id}.db`);// 拼接路径
    let dirPath = path.dirname(filePath);
    if (cmd === SAVE_CMD) {// 写入db文件
        backCmd = SAVE_BACK_CMD;
        // 检查并创建目录  
        fs.mkdir(dirPath, { recursive: true }, (err) => {
            if (err) {
                console.error('创建目录失败:', err);
                return;
            }
            let dataBuffer = Buffer.from(data);
            fs.writeFile(filePath, dataBuffer, (err) => {
                if (err) {
                    message = {
                        code: 1,
                        message: 'File write failed'
                    }

                } else {
                    message = {
                        code: 0,
                        message: 'File written successfully'
                    }
                }
                sendMsg(session_id, backCmd, message);
            });
        });
    } else {//诊断
        backCmd = DIAGNOSIS_BACK_CMD;
        // 检查目录是否存在,判断是否继续诊断
        fs.access(dirPath, fs.constants.F_OK, (errDir) => {
            if (errDir) {
                message = {
                    code: 1,
                    message: 'DB file not imported'
                }
                sendMsg(session_id, backCmd, message);
                return;
            }
            // 目录存在，现在检查文件  
            fs.access(filePath, fs.constants.F_OK, (errFile) => {
                if (errFile) {
                    // 文件不存在  
                    console.error('文件不存在:', errFile);
                    message = {
                        code: 1,
                        message: 'DB file not imported'
                    }
                    sendMsg(session_id, backCmd, message);
                    return;
                }
                // 文件存在时，调用算法库，获取诊断结果
                const mainExePath = path.join(__dirname, '..', 'bin', 'main.exe');
                let command = `"${mainExePath.replace(/\\/g, "/")}" --db_path "${filePath.replace(/\\/g, "/")}" --model "frame_rate_gpu_cache_lack,frame_rate_shader_compiler"`;
                exec(command, {encodeing: 'buffer'}, (error, stdout, stderr) => {
                    // 字节流解码成字符串
                    let stdoutBuffer = iconv.decode(stdout, 'gbk')
                    if (error || (stderr && stderr.length > 0)) {
                        message = {
                            code: 1,
                            message: `error: ${error}`
                        }
                        sendMsg(session_id, backCmd, message);
                        return;
                    }
                    message = {
                        code: 0,
                        message: stdoutBuffer
                    }
                    sendMsg(session_id, backCmd, message);
                })
            });
        });
    }
}

function sendMsg(session_id, cmd, message) {
    const app = require('../app');
    let jsonString = JSON.stringify({
        resultCode: message.code,
        resultMessage: message.message
    });
    app.sendMsgToClient(AI_TYPE, session_id, cmd, new TextEncoder().encode(jsonString));
}

// 删除session对应的文件
function clearDbFile(session_id) {
    console.log('数据库文件删除失败---------:', session_id);
    let filePath = path.join(__dirname, 'db_cache', `${session_id}.db`);// 拼接路径
    console.log('filePath---------:', filePath);
    fs.unlink(filePath, (err) => {
        if (err) {
            console.log('数据库文件删除失败:', err);
            return;
        }
        console.log('数据库文件已删除');
    });
}


module.exports = {
    init
}