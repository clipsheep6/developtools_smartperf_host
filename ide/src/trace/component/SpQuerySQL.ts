/*
 * Copyright (C) 2022 Huawei Device Co., Ltd.
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

import {BaseElement, element} from "../../base-ui/BaseElement.js";
import {querySql, queryThreadsByPid} from "../database/SqlLite.js";

@element('sp-query-sql')
export class SpQuerySQL extends BaseElement {
    initElements(): void {
        let sqlInput: HTMLInputElement | undefined | null = this.shadowRoot?.querySelector('#sql-input');
        let contentEL: HTMLPreElement | undefined | null = this.shadowRoot?.querySelector<HTMLPreElement>('#content');
        if (sqlInput) {
            sqlInput.addEventListener('change', e => {
                let dateA = new Date().getTime();
                if(sqlInput&&sqlInput.value) {
                    querySql(sqlInput.value).then(res=>{
                        let dur = new Date().getTime() - dateA;
                        contentEL!.innerHTML = `耗时:${dur}ms 记录:${res.length}条\n${JSON.stringify(res,null,4)}`
                    })
                }
            })
        }
    }

    connectedCallback() {
    }

    initHtml(): string {
        return `
<style>
:host{
    width: 100%;
    box-sizing: border-box;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    padding: 30px;
}
input{
    box-sizing: border-box;
    padding: 20px;
    width: 0;
    width: 100%;
    background-color: black;
    color: #f1f1f1;
    font-size: 1.5rem;
}
</style>
<div>
    <input id="sql-input" placeholder="Enter query and press Cmd/Ctrl + Enter" />
    <pre id="content"></pre>
</div>
        `;
    }

}