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

import { BaseElement, element } from "../../../../base-ui/BaseElement";
import { LitTable } from '../../../../base-ui/table/lit-table';
import { procedurePool } from '../../../database/Procedure';
import { info } from '../../../../log/Log';
import { TableNoData } from '../TableNoData';
import '../TableNoData';
import { LitProgressBar } from '../../../../base-ui/progress-bar/LitProgressBar';
import '../../../../base-ui/progress-bar/LitProgressBar';
import { LitChartColumn } from '../../../../base-ui/chart/column/LitChartColumn';
import '../../../../base-ui/chart/column/LitChartColumn';
import { Utils } from '../../trace/base/Utils';

@element("top10-longest-runtime-process")
export class Top10LongestRunTimeProcess extends BaseElement {
    traceChange: boolean = false;
    private processRunTimeTbl: LitTable | null | undefined;
    private threadRunTimeTbl: LitTable | null | undefined;
    private processRunTimeProgress: LitProgressBar | null | undefined;
    private nodataPro: TableNoData | null | undefined;
    private processRunTimeData: Array<Top10RunTimeData> = [];
    private threadRunTimeData: Array<Top10RunTimeData> = [];
    private processSwitchCountChart: LitChartColumn | null | undefined;
    private threadSwitchCountChart: LitChartColumn | null | undefined;
    private nodataThr: TableNoData | null | undefined;
    private display_pro: HTMLDivElement | null | undefined;
    private display_thr: HTMLDivElement | null | undefined;
    private processId: number | undefined;
    private display_flag: boolean = true;
    private back: HTMLDivElement | null | undefined;
  /**
   * 初始化操作，若trace发生改变，将所有变量设置为默认值并重新请求数据。若trace未改变，跳出初始化
   */
  init() {
    if (!this.traceChange) {
      if (this.processRunTimeTbl!.recycleDataSource.length > 0) {
        this.processRunTimeTbl?.reMeauseHeight();
      }
      return;
    }
    this.traceChange = false;
    this.processRunTimeProgress!.loading = true;
    this.display_flag = true;
    this.display_pro!.style.display = 'block';
    this.display_thr!.style.display = 'none';
    this.queryLogicWorker(
      "scheduling-Process Top10RunTime",
      "query Process Top10 Run Time Analysis Time:",
      this.callBack.bind(this)
    );
  }

  /**
   * 清除已存储数据
   */
  clearData() {
    this.traceChange = true;
    this.processSwitchCountChart!.dataSource = [];
    this.processRunTimeTbl!.recycleDataSource = [];
    this.threadSwitchCountChart!.dataSource = [];
    this.threadRunTimeTbl!.recycleDataSource = [];
    this.processRunTimeData = [];
    this.threadRunTimeData = [];
  }
  
  /**
   * 提交worker线程，进行数据库查询
   * @param option 操作的key值，用于找到并执行对应方法
   * @param log 日志打印内容
   * @param handler 结果回调函数
   * @param pid 需要查询某一进程下线程数据的进程id
   */
  queryLogicWorker(option: string, log: string, handler: (res: Array<Top10RunTimeData>) => void, pid?: number): void {
    let processThreadCountTime = new Date().getTime();
    procedurePool.submitWithName('logic0', option, {pid: pid}, undefined, handler);
    let durTime = new Date().getTime() - processThreadCountTime;
    info(log, durTime);
  }

  /**
   * 元素初始化，将html节点与内部变量进行绑定
   */
  initElements(): void {
    this.processRunTimeProgress = this.shadowRoot!.querySelector<LitProgressBar>('#loading');
    this.nodataPro = this.shadowRoot!.querySelector<TableNoData>('#nodata_Pro');
    this.processRunTimeTbl = this.shadowRoot!.querySelector<LitTable>('#tb-process-run-time');
    this.processSwitchCountChart = this.shadowRoot!.querySelector<LitChartColumn>('#chart_pro');
    this.nodataThr = this.shadowRoot!.querySelector<TableNoData>('#nodata_Thr');
    this.threadRunTimeTbl = this.shadowRoot!.querySelector<LitTable>('#tb-thread-run-time');
    this.threadSwitchCountChart = this.shadowRoot!.querySelector<LitChartColumn>('#chart_thr');
    this.display_pro = this.shadowRoot!.querySelector<HTMLDivElement>('#display_pro');
    this.display_thr = this.shadowRoot!.querySelector<HTMLDivElement>('#display_thr');
    this.back = this.shadowRoot!.querySelector<HTMLDivElement>('#back');
    this.clickEventListener();
    this.hoverEventListener();
  }

  initHtml(): string {
    return `
    <style>
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
        background-color: var(--dark-background,#FFFFFF);
        align-items: center;
        height: 370px;
        padding-left: 5px;
        padding-right: 5px;
        border-radius: 5px
    }
    :host {
        width: 100%;
        height: 100%;
        background: var(--dark-background5,#F6F6F6);
    }
    .tb_cpu_usage{
         overflow: auto;
         background-color: var(--dark-background,#FFFFFF);
         border-radius: 5px;
         border: solid 1px var(--dark-border1,#e0e0e0);
         display: flex;
    }
    .root{
        overflow-y: auto;height: 80vh;background-color: var(--dark-background5,#F6F6F6)
    }
    .bg{
        background-color: var(--dark-background5,#F6F6F6);
        padding-left: 10px;
    }
    .labels{
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        font-size: 9pt;
        padding-right: 15px;
    }
    </style>
    <lit-progress-bar id="loading" style="height: 1px;width: 100%"></lit-progress-bar>
    <table-no-data id="nodata" contentHeight="500px">
    <div class="root">
        <div class="bg" style="display: flex;flex-direction: row;">
            <div id="setting" style="height: 45px;display: flex;flex-direction: row;align-items: center;cursor: pointer">
                上一层
                <span style="width: 10px"></span>
                <lit-icon name="setting" size="20"></lit-icon>
            </div>
        </div>
        <div class="content_grid" id="total">
            <div class="chart_div">
                <div style="line-height: 40px;height: 40px;width: 100%;text-align: center;">Top20线程大中小核占用率</div>
                <lit-chart-column id="chart_total" style="width:100%;height:300px"></lit-chart-column>
            </div>
            <div class="tb_cpu_usage" >
                <lit-table id="tb-thread-usage" hideDownload style="height: 360px;margin: 5px 15px"></lit-table>
            </div>
        </div>
    </div>
    </table-no-data>
    `;
  }
}
