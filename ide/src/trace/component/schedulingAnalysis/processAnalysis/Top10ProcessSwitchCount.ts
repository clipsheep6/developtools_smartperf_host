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

@element('top10-process-switch-count')
export class Top10ProcessSwitchCount extends BaseElement {
  traceChange: boolean = false;
  private processSwitchCountTbl: LitTable | null | undefined;
  private processSwitchCountPie: LitChartPie | null | undefined;
  private processSwitchCountProgress: LitProgressBar | null | undefined;
  private nodata: TableNoData | null | undefined;
  private processSwitchCountData: Array<Top10ProcSwiCount> = [];

  initElements(): void {
    this.nodata = this.shadowRoot!.querySelector<TableNoData>('#nodata');
    this.processSwitchCountProgress = this.shadowRoot!.querySelector<LitProgressBar>('#loading');
    this.processSwitchCountTbl = this.shadowRoot!.querySelector<LitTable>('#tb-process-thread-count');
    this.processSwitchCountPie = this.shadowRoot!.querySelector<LitChartPie>('#pie');
    // @ts-ignore
    this.processSwitchCountTbl!.addEventListener('row-click', (evt: CustomEvent) => {
      let data = evt.detail.data;
      this.queryLogicWorker(
        'scheduling-Process Top10Swicount',
        'query Process Top10 Switch Count Analysis Time:',
        this.callBack.bind(this),
        evt.detail.data.pid
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
  }

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
    procedurePool.submitWithName('logic0', option, {}, undefined, handler);
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
      detail.key === 'switchCount'
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
        pid: arr[i].pid, 
        pName: Utils.PROCESS_MAP.get(arr[i].pid!) === null ? 'Process ' : Utils.PROCESS_MAP.get(arr[i].pid!)!,
        switchCount: arr[i].occurrences
      });
    }
    return result;
  }

  callBack(res: Array<Top10ProcSwiCount>): void {
    this.nodata!.noData = res === undefined || res.length === 0;
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
    this.processSwitchCountProgress!.loading = false;
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
        <div class="bg" style="display: flex;flex-direction: row;">
            <div id="setting" style="height: 45px;display: flex;flex-direction: row;align-items: center;cursor: pointer">
                上一层
                <span style="width: 10px"></span>
                <lit-icon name="setting" size="20"></lit-icon>
            </div>
        </div>
        <table-no-data id='nodata' contentHeight='500px'>
          <div class='switchcount-root'>
            <div style='display: flex;flex-direction: column;align-items: center'>
              <div>Statistics By Process's Switch Count</div>
              <lit-chart-pie id='pie' class='pie-chart'></lit-chart-pie>
            </div>
            <div class='tb_switch_count'>
              <lit-table id='tb-process-thread-count' hideDownload style='height: auto'>
                <lit-table-column width='1fr' title='NO' data-index='NO' key='NO' align='flex-start' order></lit-table-column>
                <lit-table-column width='1fr' title='Process_Id' data-index='pid' key='pid' align='flex-start' order></lit-table-column>
                <lit-table-column width='1fr' title='Process_Name' data-index='pName' key='pName' align='flex-start' order></lit-table-column>
                <lit-table-column width='1fr' title='Switch Count' data-index='switchCount' key='switchCount' align='flex-start' order></lit-table-column>        
              </lit-table>
            </div>
          </div>
        </table-no-data>
        `;
  }
}

interface Top10ProcSwiCount {
  NO?: number,
  pid?: number,
  tid?: number,
  pName?: string,
  switchCount?: number,
  occurrences?: number
}