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

import { BaseElement, element } from '../../../../base-ui/BaseElement';
import { SpStatisticsHttpUtil } from '../../../../statistics/util/SpStatisticsHttpUtil';
import './Top10LongestRunTimeProcess';
import './Top10ProcessSwitchCount';
import { Top10LongestRunTimeProcess } from './Top10LongestRunTimeProcess';
import { Top10ProcessSwitchCount } from './Top10ProcessSwitchCount';

@element("tab-process-analysis")
export class TabProcessAnalysis extends BaseElement {
  private currentTabID: string | undefined;
  private currentTab: BaseElement | undefined;
  private tab1: HTMLDivElement | null | undefined;
  private tab2: HTMLDivElement | null | undefined;
  private Top10LongestRunTimeProcess: Top10LongestRunTimeProcess | undefined | null;
  private Top10ProcessSwitchCount: Top10ProcessSwitchCount | undefined | null;

  initElements(): void {
    this.tab1 = this.shadowRoot!.querySelector<HTMLDivElement>('#tab1');
    this.tab2 = this.shadowRoot!.querySelector<HTMLDivElement>('#tab2');
    this.Top10LongestRunTimeProcess = this.shadowRoot!.querySelector<Top10LongestRunTimeProcess>('#top10_thread_runTime');
    this.Top10ProcessSwitchCount = this.shadowRoot!.querySelector<Top10ProcessSwitchCount>('#top10_process_switchCount');
    this.tab1!.addEventListener('click', (event) => {
      this.setClickTab(this.tab1!, this.Top10ProcessSwitchCount!);
    });
    this.tab2!.addEventListener('click', (event) => {
      this.setClickTab(this.tab2!, this.Top10LongestRunTimeProcess!);
    });
  }

  init() {
    this.Top10ProcessSwitchCount?.clearData();
    this.hideCurrentTab();
    this.currentTabID = undefined;
    this.setClickTab(this.tab1!, this.Top10ProcessSwitchCount!, true);
  }

  hideCurrentTab() {
    if (this.currentTabID) {
      let clickTab = this.shadowRoot!.querySelector<HTMLDivElement>(`#${this.currentTabID}`);
      if (clickTab) {
        clickTab.className = 'tag_bt';
      }
    }
    if (this.currentTab) {
      this.currentTab.style.display = 'none';
    }
  }

  setClickTab(
    tab: HTMLDivElement,
    showContent:
      | Top10ProcessSwitchCount
      | Top10LongestRunTimeProcess,
    isInit: boolean = false
  ) {
    if (!isInit) {
      let event = showContent.id
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/( |^)[a-z]/g, (L: string) => L.toUpperCase());
      SpStatisticsHttpUtil.addOrdinaryVisitAction({
        event: event,
        action: 'scheduling_analysis',
      });
    }
    if (this.currentTabID) {
      let clickTab = this.shadowRoot!.querySelector<HTMLDivElement>(`#${this.currentTabID}`);
      if (clickTab) {
        clickTab.className = 'tag_bt';
      }
    }
    tab.className = 'tab_click';
    if (tab.id !== this.currentTabID) {
      this.currentTabID = tab.id;
      if (this.currentTab) {
        this.currentTab.style.display = 'none';
      }
      this.currentTab = showContent;
      showContent.style.display = 'inline';
      showContent.init();
    }
  }
  initHtml(): string {
    return `
    <style>
    .tag_bt{
        height: 45px;
        border-radius: 10px;
        border: solid 1px var(--dark-border1,#e0e0e0);
        line-height: 45px;
        text-align: center;
        color: var(--dark-color,#000000);
        background-color: var(--dark-background5,#FFFFFF);
        cursor: pointer;
    }
    :host {
        width: 100%;
        height: 100%;
        background: var(--dark-background5,#F6F6F6);
    }
    .tab_click{
        height: 45px;
        border-radius: 10px;
        border: solid 1px var(--dark-border1,#e0e0e0);
        line-height: 45px;
        text-align: center;
        color: #FFFFFF;
        background-color: #0d47a1;
        cursor: pointer;
    }
    #content{
        background-color: var(--dark-background,#FFFFFF);
    }
    .grid-box{
        display: grid;grid-template-columns: auto auto auto auto auto;grid-column-gap: 15px;padding: 10px;
        background-color: var(--dark-background,#FFFFFF);
    }
    </style>
    <div class="grid-box">
        <div class="tag_bt" id="tab1">Top10切换次数进程</div>
        <div class="tag_bt" id="tab2">Top10运行超长线程</div>
    </div>
    <div id="content">
        <top10-process-switch-count id="top10_process_switchCount" style="display: none"></top10-process-switch-count>
        <top10-longest-runtime-process id="top10_thread_runTime" style="display: none"></top10-longest-runtime-process>
    </div>
    `;
  }
}
