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
export const ClassifyCoreSettingHtml = `
    <style>
        :host{
            display: flex;
            padding: 10px 10px;
            flex-direction: column;
        }
        .popover{
            display: flex;
            width: 15%;
            font-weight: bold;
        }
        .max-spacing{
            margin-left: 5px;
        }
        #tb_core_setting{

            height: 135px;
            width: 250px;
            background: var(--dark-background4,#F2F2F2);
            overflow-y: auto ;
            border-radius: 5px;
            border: solid 1px var(--dark-border1,#e0e0e0);
            display: grid;
            grid-template-columns: auto auto auto auto;
        }
        .reset-button{
            opacity: 0.9;
            font-size: 13px;
            color: #0A59F7;
            text-align: center;
            line-height: 16px;
            background: var(--dark-background3,#F4F3F4);
            border: 1px solid var(--dark-background8,#F4F3F4);
            border-radius: 16px;
            padding: 2px 18px;
        }
        .confirm-button{
            opacity: 0.9;
            font-size: 13px;
            color: #0A59F7;
            text-align: center;
            line-height: 16px;
            background: var(--dark-background3,#F4F3F4);
            border: 1px solid var(--dark-background8,#F4F3F4);
            border-radius: 16px;
            padding: 2px 18px;
        }
        #data-mining-popover[visible="true"] #core-mining{
            color: #0A59F7;
        }
        :host([disabledMining]) #core-mining{
            display: none;
        }

        .core_line{
            height: 35px;
            line-height: 35px;
            position: sticky;
            top: 0;
            background: var(--dark-background4,#F2F2F2);
            z-index: 1;
            width: 100%;
        }
    </style>
    <lit-table id="tb-parallel" style="height: auto" tree>
        <lit-table-column class="freq-sample-column" width="20%" title="Process" data-index="title" key="title" align="flex-start" retract>
        </lit-table-column>
        <lit-table-column class="freq-sample-column" width="1fr" title="Tid Count" data-index="tCount" key="tCount" align="flex-start">
        </lit-table-column>
        <lit-table-column class="freq-sample-column" width="1fr" title="Running Dur(ms)" data-index="duration" key="duration" align="flex-start" >
        </lit-table-column>
        <lit-table-column class="freq-sample-column" width="1fr" title="Parallel statistics(ms)" data-index="parallel" key="parallel" align="flex-start" >
        </lit-table-column>
        <lit-table-column class="freq-sample-column" width="1fr" title="All Parallel(%)" data-index="allParallel" key="allParallel" align="flex-start" >
        </lit-table-column>
    </lit-table>
    <lit-table id="tb-core-parallel" style="height: auto" tree >
        <lit-table-column class="freq-sample-column" width="20%" title="Process/Core" data-index="title" key="title" align="flex-start" retract >
        </lit-table-column>
        <lit-table-column class="freq-sample-column" width="1fr" title="Tid Count" data-index="tCount" key="tCount" align="flex-start" >
        </lit-table-column>
        <lit-table-column class="freq-sample-column" width="1fr" title="Running Dur(ms)" data-index="duration" key="duration" align="flex-start" >
        </lit-table-column>
        <lit-table-column class="freq-sample-column" width="1fr" title="Parallel statistics(ms)" data-index="parallel" key="parallel" align="flex-start" >
        </lit-table-column>
        <lit-table-column class="freq-sample-column" width="1fr" title="All Parallel(%)" data-index="allParallel" key="allParallel" align="flex-start" >
        </lit-table-column>
    </lit-table>
    <lit-popover placement="topLeft" class="popover" haveRadio="true" trigger="click" id="data-mining-popover">
        <div slot="content">
            <div class="core_setting_div" id="tb_core_setting" ></div>
            <div style="display: flex;justify-content: space-around; margin-top: 8px">
                <div class="confirm-button">Confirm</div>
                <div class="reset-button">Reset</div>
            </div>
        </div>
        <span class="describe tree max-spacing" id="core-mining">Core Classification</span>
    </lit-popover>
`;