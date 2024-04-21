/*
 * Copyright (C) 2022 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { BaseElement, element } from '../../../../base-ui/BaseElement';
import { LitTable } from '../../../../base-ui/table/lit-table';
import { procedurePool } from '../../../database/Procedure';
import { info } from '../../../../log/Log';
import { TableNoData } from '../TableNoData';
import '../TableNoData';
import { LitProgressBar } from '../../../../base-ui/progress-bar/LitProgressBar';
import '../../../../base-ui/progress-bar/LitProgressBar';
import { LitChartPie } from '../../../../base-ui/chart/pie/LitChartPie';
import '../../../../base-ui/chart/pie/LitChartPie';
import { Utils } from '../../trace/base/Utils';
import { LitIcon } from '../../../../base-ui/icon/LitIcon';

@element('top10-process-switch-count')
export class Top10ProcessSwitchCount extends BaseElement {
  traceChange: boolean = false;
  private processSwitchCountTbl: LitTable | null | undefined;
  private processSwitchCountPie: LitChartPie | null | undefined;
  private processSwitchCountProgress: LitProgressBar | null | undefined;
  private nodataPro: TableNoData | null | undefined;
  private processSwitchCountData: Array<Top10ProcSwiCount> = [];
  private threadSwitchCountTbl: LitTable | null | undefined;
  private threadSwitchCountPie: LitChartPie | null | undefined;
  private nodataThr: TableNoData | null | undefined;
  private display_pro: HTMLDivElement | null | undefined;
  private display_thr: HTMLDivElement | null | undefined;
  private processId: number | undefined;
  private display_flag: boolean = true;
  private back: HTMLDivElement | null | undefined;

  init() {
    if (!this.traceChange) {
      if (this.processSwitchCountTbl!.recycleDataSource.length > 0) {
        this.processSwitchCountTbl?.reMeauseHeight();
      }
      return;
    }
    this.traceChange = false;
    this.processSwitchCountProgress!.loading = true;
    this.queryLogicWorker(
      'scheduling-Process Top10Swicount',
      'query Process Top10 Switch Count Analysis Time:',
      this.callBack.bind(this)
    );
  }

  clearData() {
    this.traceChange = true;
    this.processSwitchCountPie!.dataSource = [];
    this.processSwitchCountTbl!.recycleDataSource = [];
  }

  queryLogicWorker(option: string, log: string, handler: (res: Array<Top10ProcSwiCount>) => void, pid?: number) {
    let processThreadCountTime = new Date().getTime();
    procedurePool.submitWithName('logic0', option, {pid: pid}, undefined, handler);
    let durTime = new Date().getTime() - processThreadCountTime;
    info(log, durTime);
  }

  sortByColumn(detail: any) {
    // @ts-ignore
    function compare(processThreadCountProperty, sort, type) {
      return function (a: any, b: any) {
        if (type === 'number') {
          // @ts-ignore
          return sort === 2
            ? parseFloat(b[processThreadCountProperty]) -
                parseFloat(a[processThreadCountProperty])
            : parseFloat(a[processThreadCountProperty]) -
                parseFloat(b[processThreadCountProperty]);
        } else {
          if (sort === 2) {
            return b[processThreadCountProperty]
              .toString()
              .localeCompare(a[processThreadCountProperty].toString());
          } else {
            return a[processThreadCountProperty]
              .toString()
              .localeCompare(b[processThreadCountProperty].toString());
          }
        }
      };
    }
    if (
      detail.key === 'NO' ||
      detail.key === 'pid' ||
      detail.key === 'switchCount' ||
      detail.key === 'tid'
    ) {
      this.processSwitchCountData.sort(
        compare(detail.key, detail.sort, 'number')
      );
    } else {
      this.processSwitchCountData.sort(
        compare(detail.key, detail.sort, 'string')
      );
    }
    this.processSwitchCountTbl!.recycleDataSource = this.processSwitchCountData;
  }

  organizationData(arr: Array<Top10ProcSwiCount>): Array<Top10ProcSwiCount> {
    let result: Array<Top10ProcSwiCount> = [];
    for (let i = 0; i < arr.length; i++) {
      result.push({
        NO: i + 1, 
        pid: arr[i].pid || this.processId, 
        pName: Utils.PROCESS_MAP.get(arr[i].pid!) === null ? 'Process ' : Utils.PROCESS_MAP.get(arr[i].pid!)!,
        switchCount: arr[i].occurrences,
        tid: arr[i].tid,
        tName:Utils.THREAD_MAP.get(arr[i].tid!) === null ? 'Thread ' : Utils.THREAD_MAP.get(arr[i].tid!)!
      });
    }
    return result;
  }

  callBack(res: Array<Top10ProcSwiCount>): void {
    if (this.display_flag === true) {
      this.nodataPro!.noData = res === undefined || res.length === 0;
      let result: Array<Top10ProcSwiCount> = this.organizationData(res);
      this.processSwitchCountTbl!.recycleDataSource = result;
      this.processSwitchCountTbl!.reMeauseHeight();
      this.processSwitchCountData = result;
      this.processSwitchCountPie!.config = {
        appendPadding: 10,
        data: result,
        angleField: 'switchCount',
        colorField: 'pid',
        radius: 0.8,
        label: {
          type: 'outer',
        },
        hoverHandler: (data) => {
          if (data) {
            this.processSwitchCountTbl!.setCurrentHover(data);
          } else {
            this.processSwitchCountTbl!.mouseOut();
          }
        },
        tip: (obj) => {
          return `
            <div>
              <div>Process_Id:${obj.obj.pid}</div> 
              <div>Process_Name:${obj.obj.pName}</div> 
              <div>Switch Count:${obj.obj.switchCount}</div> 
            </div>
          `;
        },
        interactions: [
          {
            type: 'element-active',
          },
        ],
      };
    } else {
      this.nodataThr!.noData = res === undefined || res.length === 0;
      let result: Array<Top10ProcSwiCount> = this.organizationData(res);
      this.threadSwitchCountTbl!.recycleDataSource = result;
      this.threadSwitchCountTbl!.reMeauseHeight();
      this.processSwitchCountData = result;
      this.threadSwitchCountPie!.config = {
        appendPadding: 10,
        data: result,
        angleField: 'switchCount',
        colorField: 'tid',
        radius: 0.8,
        label: {
          type: 'outer',
        },
        hoverHandler: (data) => {
          if (data) {
            this.processSwitchCountTbl!.setCurrentHover(data);
          } else {
            this.processSwitchCountTbl!.mouseOut();
          }
        },
        tip: (obj) => {
          return `
            <div>
              <div>Thread_Id:${obj.obj.tid}</div> 
              <div>Thread_Name:${obj.obj.tName}</div> 
              <div>Switch Count:${obj.obj.switchCount}</div> 
              <div>Process_Id:${obj.obj.pid}</div> 
            </div>
          `;
        },
        interactions: [
          {
            type: 'element-active',
          },
        ],
      };
    }
    this.processSwitchCountProgress!.loading = false;
  }

  initElements(): void {
    this.processSwitchCountProgress = this.shadowRoot!.querySelector<LitProgressBar>('#loading');
    this.nodataPro = this.shadowRoot!.querySelector<TableNoData>('#nodata_pro');
    this.processSwitchCountTbl = this.shadowRoot!.querySelector<LitTable>('#tb-process-switch-count');
    this.processSwitchCountPie = this.shadowRoot!.querySelector<LitChartPie>('#pie_pro');
    this.nodataThr = this.shadowRoot!.querySelector<TableNoData>('#nodata_thr');
    this.threadSwitchCountTbl = this.shadowRoot!.querySelector<LitTable>('#tb-thread-switch-count');
    this.threadSwitchCountPie = this.shadowRoot!.querySelector<LitChartPie>('#pie_thr');
    this.display_pro = this.shadowRoot!.querySelector<HTMLDivElement>('#display_pro');
    this.display_thr = this.shadowRoot!.querySelector<HTMLDivElement>('#display_thr');
    this.back = this.shadowRoot!.querySelector<HTMLDivElement>('#back');
    // @ts-ignore
    this.processSwitchCountTbl!.addEventListener('row-click', (evt: CustomEvent) => {
      this.display_flag = false;
      let data = evt.detail.data;
      this.processId = data.pid;
      this.display_thr!.style.display = 'block';
      this.display_pro!.style.display = 'none';
      this.queryLogicWorker(
        'scheduling-Process Top10Swicount',
        'query Process Top10 Switch Count Analysis Time:',
        this.callBack.bind(this),
        data.pid
      );
      data.isSelected = true;
      if (evt.detail.callBack) {
        evt.detail.callBack(true);
      }
    });
    this.processSwitchCountTbl!.addEventListener('column-click', (evt) => {
      // @ts-ignore
      this.sortByColumn(evt.detail);
    });
    this.threadSwitchCountTbl!.addEventListener('column-click', (evt) => {
      // @ts-ignore
      this.sortByColumn(evt.detail);
    });
    this.processSwitchCountTbl!.addEventListener('row-hover', (evt) => {
      // @ts-ignore
      if (evt.detail.data) {
        // @ts-ignore
        let data = evt.detail.data;
        data.isHover = true;
        // @ts-ignore
        if (evt.detail.callBack) {
          // @ts-ignore
          evt.detail.callBack(true);
        }
      }
      this.processSwitchCountPie?.showHover();
    });
    this.threadSwitchCountTbl!.addEventListener('row-hover', (evt) => {
      // @ts-ignore
      if (evt.detail.data) {
        // @ts-ignore
        let data = evt.detail.data;
        data.isHover = true;
        // @ts-ignore
        if (evt.detail.callBack) {
          // @ts-ignore
          evt.detail.callBack(true);
        }
      }
      this.processSwitchCountPie?.showHover();
    });
    this.back?.addEventListener('click', (event) => {
      this.display_flag = true;
      this.display_pro!.style.display = 'block';
      this.display_thr!.style.display = 'none';
      this.threadSwitchCountTbl!.recycleDataSource = [];
    });
  }

  initHtml(): string {
    return `
        <style>
        :host {
            width: 100%;
            height: 100%;
            background-color: var(--dark-background5,#F6F6F6);
        }
        .pie-chart{
            display: flex;
            box-sizing: border-box;
            width: 500px;
            height: 500px;
        }
        .tb_switch_count{
            flex: 1;
            overflow: auto ;
            border-radius: 5px;
            border: solid 1px var(--dark-border1,#e0e0e0);
            margin: 15px;
            padding: 5px 15px
        }
        .switchcount-root{
            width: 100%;
            height: 100%;
            box-sizing: border-box;
            display: flex;
            flex-direction: row;
        }
        </style>
        <lit-progress-bar id='loading' style='height: 1px;width: 100%' loading></lit-progress-bar>
        <div id='display_pro'>
          <table-no-data id='nodata_pro' contentHeight='500px'>
            <div class='switchcount-root'>
              <div style='display: flex;flex-direction: column;align-items: center'>
                <div>Statistics By Process's Switch Count</div>
                <lit-chart-pie id='pie_pro' class='pie-chart'></lit-chart-pie>
              </div>
              <div class='tb_switch_count'>
                <lit-table id='tb-process-switch-count' hideDownload style='height: auto'>
                  <lit-table-column width='1fr' title='NO' data-index='NO' key='NO' align='flex-start' order></lit-table-column>
                  <lit-table-column width='1fr' title='Process_Id' data-index='pid' key='pid' align='flex-start' order></lit-table-column>
                  <lit-table-column width='1fr' title='Process_Name' data-index='pName' key='pName' align='flex-start' order></lit-table-column>
                  <lit-table-column width='1fr' title='Switch Count' data-index='switchCount' key='switchCount' align='flex-start' order></lit-table-column>        
                </lit-table>
              </div>
            </div>
          </table-no-data>
        </div>
        <div id='display_thr' style='display: none'>
          <div class="bg" style="display: flex;flex-direction: row;">
            <div id="back" style="height: 45px;display: flex;flex-direction: row;align-items: center;cursor: pointer">
              上一层
              <span style="width: 10px"></span>
              <lit-icon name="arrowleft" size="20"></lit-icon>
            </div>
          </div>
          <table-no-data id='nodata_thr' contentHeight='500px'>
            <div class='switchcount-root'>
              <div style='display: flex;flex-direction: column;align-items: center'>
                <div>Statistics By Thread's Switch Count</div>
                <lit-chart-pie id='pie_thr' class='pie-chart'></lit-chart-pie>
              </div>
              <div class='tb_switch_count'>
                <lit-table id='tb-thread-switch-count' hideDownload style='height: auto'>
                  <lit-table-column width='1fr' title='NO' data-index='NO' key='NO' align='flex-start' order></lit-table-column>
                  <lit-table-column width='1fr' title='Process_Id' data-index='pid' key='pid' align='flex-start' order></lit-table-column>
                  <lit-table-column width='1fr' title='Thread_Id' data-index='tid' key='tid' align='flex-start' order></lit-table-column>
                  <lit-table-column width='1fr' title='Thread_Name' data-index='tName' key='tName' align='flex-start' order></lit-table-column>
                  <lit-table-column width='1fr' title='Switch Count' data-index='switchCount' key='switchCount' align='flex-start' order></lit-table-column>        
                </lit-table>
              </div>
            </div>
          </table-no-data>
        </div>
        `;
  }
}

interface Top10ProcSwiCount {
  NO?: number,
  pid?: number,
  tid?: number,
  pName?: string,
  tName?: string,
  switchCount?: number,
  occurrences?: number
}
