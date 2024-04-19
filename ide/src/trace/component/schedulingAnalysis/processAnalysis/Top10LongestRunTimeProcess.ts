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
@element("top10-longest-runtime-process")
export class Top10LongestRunTimeProcess extends BaseElement {
  init() {}
  initElements(): void {}

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
