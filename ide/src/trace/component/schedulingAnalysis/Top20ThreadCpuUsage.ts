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
import {LitTable} from "../../../base-ui/table/lit-table.js";
import {LitChartColumn} from "../../../base-ui/chart/column/LitChartColumn.js";
import "../../../base-ui/chart/column/LitChartColumn.js";
import "./CheckCpuSetting.js"
import "../../../base-ui/icon/LitIcon.js"
import {CheckCpuSetting} from "./CheckCpuSetting.js";
import {procedurePool} from "../../database/Procedure.js";
import {info} from "../../../log/Log.js";
import "../../../base-ui/progress-bar/LitProgressBar.js"
import {LitProgressBar} from "../../../base-ui/progress-bar/LitProgressBar.js";

@element('top20-thread-cpu-usage')
export class Top20ThreadCpuUsage extends BaseElement {

    traceChange:boolean = false;
    private table: LitTable | null | undefined
    private tableBig: LitTable | null | undefined
    private tableMid: LitTable | null | undefined
    private tableSmall: LitTable | null | undefined
    private chartTotal: LitChartColumn | null | undefined
    private chart2: LitChartColumn | null | undefined
    private chart3: LitChartColumn | null | undefined
    private chart4: LitChartColumn | null | undefined
    private cpuSetting:CheckCpuSetting|undefined|null;
    private setting:HTMLDivElement | null | undefined;
    private progress:LitProgressBar | null | undefined;
    private map:Map<string,{chart:LitChartColumn,table:LitTable}> | undefined

    initElements(): void {
        this.progress = this.shadowRoot!.querySelector<LitProgressBar>("#loading")
        this.table = this.shadowRoot!.querySelector<LitTable>("#tb-thread-usage");
        this.tableBig = this.shadowRoot!.querySelector<LitTable>("#tb-thread-big")
        this.tableMid = this.shadowRoot!.querySelector<LitTable>("#tb-thread-mid")
        this.tableSmall = this.shadowRoot!.querySelector<LitTable>("#tb-thread-small")
        this.chartTotal = this.shadowRoot!.querySelector<LitChartColumn>("#chart_total")
        this.chart2 = this.shadowRoot!.querySelector<LitChartColumn>("#chart_2")
        this.chart3 = this.shadowRoot!.querySelector<LitChartColumn>("#chart_3")
        this.chart4 = this.shadowRoot!.querySelector<LitChartColumn>("#chart_4")
        this.map = new Map<string, {chart: LitChartColumn; table: LitTable}>();
        this.map.set("total",{chart:this.chartTotal!,table:this.table!})
        this.map.set("small",{chart:this.chart2!,table:this.tableSmall!})
        this.map.set("mid",{chart:this.chart3!,table:this.tableMid!})
        this.map.set("big",{chart:this.chart4!,table:this.tableBig!})
        this.setting = this.shadowRoot!.querySelector<HTMLDivElement>("#setting");
        this.cpuSetting = this.shadowRoot!.querySelector<CheckCpuSetting>("#cpu_setting");
        this.cpuSetting!.cpuSetListener = ()=>{
            this.cpuSetting!.style.display = "none"
            for (let node of this.shadowRoot!.querySelectorAll(".content_grid")) {
                (node as any).style.display = "grid"
            }
            this.queryData();
        }
        this.setting?.addEventListener("click",(event)=>{
            for (let node of this.shadowRoot!.querySelectorAll(".content_grid")) {
                (node as any).style.display = "none"
            }
            this.cpuSetting!.style.display = "inline"
            this.cpuSetting?.init()
        })
    }

    init() {
        if(!this.traceChange){
            for (let key of this.map!.keys()) {
                this.map!.get(key)!.table.reMeauseHeight();
            }
            return;
        }
        this.traceChange = false;
        if(!CheckCpuSetting.init_setting){
            for (let node of this.shadowRoot!.querySelectorAll(".content_grid")) {
                (node as any).style.display = "none"
            }
            this.cpuSetting!.style.display = "inline"
            this.cpuSetting?.init()
        }else{
            this.queryData()
        }
    }

    clearData(){
        this.traceChange = true;
        for (let key of this.map!.keys()) {
            this.map!.get(key)!.chart.dataSource = []
            this.map!.get(key)!.table.recycleDataSource = []
        }
    }

    queryData(){
        this.progress!.loading = true
        this.queryLogicWorker(`scheduling-Thread CpuUsage`,`query Thread Cpu Usage Analysis Time:`,(res)=>{
            for (let key of this.map!.keys()) {
                let obj = this.map!.get(key)!
                let source:any[] = res.get(key) || []
                source = source.map((it:any,index:number) => {
                    return {
                        pid:it.pid,
                        pName:it.pName,
                        tid:it.tid,
                        tName:it.tName,
                        total:it.total,
                        big:it.big,
                        mid:it.mid,
                        small:it.small,
                        no:index+1,
                        visible:1,
                        bigPercent:it.bigPercent,
                        midPercent:it.midPercent,
                        smallPercent:it.smallPercent,
                        hideHandler:()=>{
                            let arr = source.filter((o) => o.visible === 1);
                            obj.chart.dataSource = key === "total" ? this.getArrayDataBySize(arr) : arr;
                        }
                    }
                })
                obj.chart.config = {
                    data: key === "total" ? this.getArrayDataBySize(source) : source,
                    appendPadding: 10,
                    xField: "tid",
                    yField: key,
                    seriesField: key === "total" ? "size":"",
                    color: (a) => {
                        if (a.size === "big core") {
                            return "#2f72f8"
                        } else if(a.size === "middle core"){
                            return "#ffab67";
                        }else if(a.size === "small core"){
                            return "#a285d2"
                        }else{
                            return  "#0a59f7"
                        }
                    },
                    tip:undefined,
                    label: null,
                }
                obj.table.recycleDataSource =source
            }
            this.progress!.loading = false
        })
    }

    getArrayDataBySize(arr:Array<any>){
        let data:any[] = [];
        for (let obj of arr) {
            data.push({pid:obj.pid, pName:obj.pName, tid:obj.tid, tName:obj.tName, total:obj.big, size:"big core"})
            data.push({pid:obj.pid, pName:obj.pName, tid:obj.tid, tName:obj.tName, total:obj.mid, size:"middle core"})
            data.push({pid:obj.pid, pName:obj.pName, tid:obj.tid, tName:obj.tName, total:obj.small, size:"small core"})
        }
        return data;
    }

    queryLogicWorker(option:string,log:string,handler:(res:any) => void){
        let time = new Date().getTime();
        procedurePool.submitWithName("logic1", option,
            { bigCores:CheckCpuSetting.big_cores,midCores:CheckCpuSetting.mid_cores,smallCores:CheckCpuSetting.small_cores }, undefined, handler)
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
        .content_grid{
            display: grid;
            padding: 15px;
            grid-column-gap: 15px;
            grid-row-gap: 15px;
            grid-template-columns: 1fr 1fr;
            background-color: var(--dark-background5,#F6F6F6);
        }
        .chart_div{
            display: flex;
            flex-direction: column;
            border: solid 1px #e0e0e0;
            background-color: white;
            align-items: center;
            height: 340px;
            padding-left: 5px;
            padding-right: 5px;
            border-radius: 5px
        }
      
        .tb_cpu_usage{
             overflow: auto;
             background-color: white ;
             border-radius: 5px;
             border: solid 1px #e0e0e0;
             display: flex;
        }
        .root{
            overflow-y: auto;height: 80vh;background-color: var(--dark-background5,#F6F6F6)
        }
        .bg{
            background-color: var(--dark-background5,#F6F6F6);
            padding-left: 10px;
        }
        </style>
        
        <div class="root">
            <lit-progress-bar id="loading" style="height: 1px;width: 100%"></lit-progress-bar>
            <div class="bg" style="display: flex;flex-direction: row;">
                <div id="setting" style="height: 45px;display: flex;flex-direction: row;align-items: center;cursor: pointer">
                    CPU Setting
                    <span style="width: 10px"></span>
                    <lit-icon name="setting"></lit-icon>
                </div>
            </div>
            <check-cpu-setting id="cpu_setting" style="display: none"></check-cpu-setting>
            <div class="content_grid">
                <div class="chart_div">
                    <div style="line-height: 40px;height: 40px;width: 100%;text-align: center;">Top20线程大中小核占用率</div>
                    <lit-chart-column id="chart_total" style="width:100%;height:300px"></lit-chart-column>
                </div>
                <div class="tb_cpu_usage" >
                    <lit-table id="tb-thread-usage" style="height: 330px;margin: 5px 15px">
                        <lit-table-column width="50px" title=" " data-index="no" key="no" align="flex-start"></lit-table-column>
                        <lit-table-column width="50px" title="" data-index="visible" key="visible" align="flex-start">
                            <template>
                                <lit-icon name="{{ visible === 1 ? 'eye':'eye-close' }}" onclick="{
                                    let data = this.parentElement.parentElement.data;
                                    data.visible = data.visible === 1 ? 0 : 1
                                    this.name = data.visible === 1 ? 'eye':'eye-close'
                                    data.hideHandler()
                                }"></lit-icon>
                            </template>
                        </lit-table-column>
                        <lit-table-column width="100px" title="tid" data-index="tid" key="tid" align="flex-start"></lit-table-column>
                        <lit-table-column width="200px" title="t_name" data-index="tName" key="tName" align="flex-start"></lit-table-column>
                        <lit-table-column width="100px" title="pid" data-index="pid" key="pid" align="flex-start"></lit-table-column>
                        <lit-table-column width="200px" title="p_name" data-index="pName" key="pName" align="flex-start"></lit-table-column>
                        <lit-table-column width="100px" title="big core" data-index="big" key="big" align="flex-start"></lit-table-column>
                        <lit-table-column width="100px" title="%" data-index="bigPercent" key="bigPercent" align="flex-start"></lit-table-column>
                        <lit-table-column width="100px" title="middle core" data-index="mid" key="mid" align="flex-start"></lit-table-column>
                        <lit-table-column width="100px" title="%" data-index="midPercent" key="midPercent" align="flex-start"></lit-table-column>
                        <lit-table-column width="100px" title="small core" data-index="small" key="small" align="flex-start"></lit-table-column>
                        <lit-table-column width="100px" title="%" data-index="smallPercent" key="smallPercent" align="flex-start"></lit-table-column>
                    </lit-table>
                </div>
            </div>
            <div class="content_grid">
                <div class="chart_div">
                    <div style="line-height: 40px;height: 40px;width: 100%;text-align: center;">Top20线程小核占用率</div>
                    <lit-chart-column id="chart_2" style="width:100%;height:300px"></lit-chart-column>
                </div>
                <div  class="tb_cpu_usage">
                    <lit-table id="tb-thread-small" style="height: 330px;margin: 5px 15px ">
                        <lit-table-column width="50px" title=" " data-index="no" key="no" align="flex-start"></lit-table-column>
                        <lit-table-column width="50px" title="" data-index="visible" key="visible" align="flex-start">
                            <template>
                                <lit-icon name="{{ visible === 1 ? 'eye':'eye-close' }}" onclick="{
                                    let data = this.parentElement.parentElement.data;
                                    data.visible = data.visible === 1 ? 0 : 1
                                    this.name = data.visible === 1 ? 'eye':'eye-close'
                                    data.hideHandler()
                                }"></lit-icon>
                            </template>
                        </lit-table-column>
                        <lit-table-column width="100px" title="tid" data-index="tid" key="tid" align="flex-start"></lit-table-column>
                        <lit-table-column width="200px" title="t_name" data-index="tName" key="tName" align="flex-start"></lit-table-column>
                        <lit-table-column width="100px" title="pid" data-index="pid" key="pid" align="flex-start"></lit-table-column>
                        <lit-table-column width="200px" title="p_name" data-index="pName" key="pName" align="flex-start"></lit-table-column>
                        <lit-table-column width="100px" title="small core" data-index="small" key="small" align="flex-start"></lit-table-column>
                        <lit-table-column width="100px" title="%" data-index="smallPercent" key="smallPercent" align="flex-start"></lit-table-column>
                    </lit-table>
                </div>
            </div>
            <div class="content_grid">
                <div class="chart_div">
                    <div style="line-height: 40px;height: 40px;width: 100%;text-align: center;">Top20线程中核占用率</div>
                    <lit-chart-column id="chart_3" style="width:100%;height:300px"></lit-chart-column>
                </div>
                <div  class="tb_cpu_usage">
                    <lit-table id="tb-thread-mid" style="height: 330px;margin: 5px 15px">
                        <lit-table-column width="50px" title=" " data-index="no" key="no" align="flex-start"></lit-table-column>
                        <lit-table-column width="50px" title="" data-index="visible" key="visible" align="flex-start">
                            <template>
                                <lit-icon name="{{ visible === 1 ? 'eye':'eye-close' }}" onclick="{
                                    let data = this.parentElement.parentElement.data;
                                    data.visible = data.visible === 1 ? 0 : 1
                                    this.name = data.visible === 1 ? 'eye':'eye-close'
                                    data.hideHandler()
                                }"></lit-icon>
                            </template>
                        </lit-table-column>
                        <lit-table-column width="100px" title="tid" data-index="tid" key="tid" align="flex-start"></lit-table-column>
                        <lit-table-column width="200px" title="t_name" data-index="tName" key="tName" align="flex-start"></lit-table-column>
                        <lit-table-column width="100px" title="pid" data-index="pid" key="pid" align="flex-start"></lit-table-column>
                        <lit-table-column width="200px" title="p_name" data-index="pName" key="pName" align="flex-start"></lit-table-column>
                        <lit-table-column width="100px" title="middle core" data-index="mid" key="mid" align="flex-start"></lit-table-column>
                        <lit-table-column width="100px" title="%" data-index="midPercent" key="midPercent" align="flex-start"></lit-table-column>
                    </lit-table>
                </div>
            </div>
            <div class="content_grid">
                <div class="chart_div">
                    <div style="line-height: 40px;height: 40px;width: 100%;text-align: center;">Top20线程大核占用率</div>
                    <lit-chart-column id="chart_4" style="width:100%;height:300px"></lit-chart-column>
                </div>
                <div class="tb_cpu_usage">
                    <lit-table id="tb-thread-big" style="height: 330px;margin: 5px 15px">
                        <lit-table-column width="50px" title=" " data-index="no" key="no" align="flex-start"></lit-table-column>
                        <lit-table-column width="50px" title="" data-index="visible" key="visible" align="flex-start">
                            <template>
                                <lit-icon name="{{ visible === 1 ? 'eye':'eye-close' }}" onclick="{
                                    let data = this.parentElement.parentElement.data;
                                    data.visible = data.visible === 1 ? 0 : 1
                                    this.name = data.visible === 1 ? 'eye':'eye-close'
                                    data.hideHandler()
                                }"></lit-icon>
                            </template>
                        </lit-table-column>
                        <lit-table-column width="100px" title="tid" data-index="tid" key="tid" align="flex-start"></lit-table-column>
                        <lit-table-column width="200px" title="t_name" data-index="tName" key="tName" align="flex-start"></lit-table-column>
                        <lit-table-column width="100px" title="pid" data-index="pid" key="pid" align="flex-start"></lit-table-column>
                        <lit-table-column width="200px" title="p_name" data-index="pName" key="pName" align="flex-start"></lit-table-column>
                        <lit-table-column width="100px" title="big core" data-index="big" key="big" align="flex-start"></lit-table-column>
                        <lit-table-column width="100px" title="%" data-index="bigPercent" key="bigPercent" align="flex-start"></lit-table-column>
                    </lit-table>
                </div>
            </div>
        </div>
        `;
    }
}
