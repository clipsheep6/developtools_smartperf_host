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

import {BaseElement, element} from "../../../base-ui/BaseElement.js";
import {LitChartPie} from "../../../base-ui/chart/pie/LitChartPie.js";
import {procedurePool} from "../../database/Procedure.js";
import {SpSchedulingAnalysis} from "./SpSchedulingAnalysis.js";
import {info} from "../../../log/Log.js";
import {LitTable} from "../../../base-ui/table/lit-table.js";

@element('tab-cpu-details-idle')
export class TabCpuDetailsIdle extends BaseElement {

    private table:LitTable | null | undefined;

    private data:Array<any> = [];

    initElements(): void {
        this.table = this.shadowRoot!.querySelector<LitTable>("#tb-cpu-usage")
    }

    init(cpu:number){
        this.queryPieChartDataByType("CPU Idle",cpu)
    }

    queryPieChartDataByType(type: string,cpu:number) {
        this.queryLoginWorker(`scheduling-${type}`, "query Cpu Frequency Analysis Time:", (res) => {
            this.data = res.get(cpu) || [];
            this.shadowRoot!.querySelector<LitChartPie>("#chart-pie")!.config = {
                appendPadding: 0,
                data: res.get(cpu) || [],
                angleField: 'sum',
                colorField: 'value',
                radius: 1,
                label: {
                    type: 'outer',
                },
                tip:undefined,
                interactions: [
                    {
                        type: 'element-active',
                    },
                ],
            }
            this.table!.recycleDataSource = this.data;
            this.table?.reMeauseHeight()
        })
    }

    queryLoginWorker(option:string,log:string,handler:(res:any) => void){
        let time = new Date().getTime();
        procedurePool.submitWithName("logic1", option, { endTs:SpSchedulingAnalysis.endTs,total:SpSchedulingAnalysis.totalDur }, undefined, handler)
        let durTime = new Date().getTime() - time;
        info(log, durTime)
    }

    initHtml(): string {
        return `
        <style>
        :host {
            width: 100%;
            height: 100%;
            background: var(--dark-background5,#F6F6F6);
        }
        .d-box{
            display: flex;
            margin: 20px;
            height: calc(100vh - 165px);
        }
        .chart-box{
            width: 40%;
        }
        #tb-cpu-usage{
            height: 100%;
        }
        .table-box{
            width: 60%;
            max-height: calc(100vh - 165px);
            border: solid 1px var(--dark-border1,#e0e0e0);
            border-radius: 5px;
            padding: 10px;
        }
        #chart-pie{
            height: calc(100vh - 235px);
        }
        </style>
        <div class="d-box">
            <div class="chart-box">
                <lit-chart-pie  id="chart-pie"></lit-chart-pie>
            </div>
            <div class="table-box">
                <lit-table id="tb-cpu-usage">
                        <lit-table-column width="100px" title="idle" data-index="value" key="value" align="flex-start"></lit-table-column>
                        <lit-table-column width="100px" title="min" data-index="min" key="min" align="flex-start"></lit-table-column>
                        <lit-table-column width="100px" title="max" data-index="max" key="max" align="flex-start"></lit-table-column>
                        <lit-table-column width="200px" title="average" data-index="avg" key="avg" align="flex-start"></lit-table-column>
                 </lit-table>
            </div>
        </div>
        `;
    }
}
