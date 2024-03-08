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

@element('timer-shaft-element')
export class TimerShaftElement extends BaseElement {
  // @ts-ignore
  //------------------------xiugai------------------------
  public usageEL: HTMLDivElement | null | undefined;
  public timerShaftEL: TimerShaftElement | null | undefined;
  public rowsPaneEL: HTMLDivElement | null | undefined;
  _checkExpand: boolean = false; //是否展开
  _usageFoldHeight: number = 56.25;//初始化时折叠的负载区高度
  usageExpandHeight: number = 75; //给定的展开的负载区高度
  _cpuUsageCount: Array<{ cpu: number; ro: number; rate: number }> = [];
  // -------------------jieshu--------------------


  set cpuUsage(value: Array<{ cpu: number; ro: number; rate: number }>) {
    info('set cpuUsage values :', value);
    this._cpuUsage = value;
    //------------------------xiugai------------------------
    this._cpuUsageCount = value;
    if (this._cpuUsageCount.length) {
      this.usageEL!.innerHTML = 'CPU Usage';
    }
    // -----------------jieshu---------------
    if (this._rangeRuler) {
      this._rangeRuler.cpuUsage = this._cpuUsage;
    }
  }

  //------------------------xiugai------------------------
  get checkExpand(): boolean {
    return this._checkExpand;
  }

  set checkExpand(value: boolean) {
    this._checkExpand = value;
  }

  get usageFoldHeight(): number {
    return this._usageFoldHeight;
  }
  set usageFoldHeight(value: number) {
    this._usageFoldHeight = value;
  }
  // ---------------------jieshu-----------------

  reset(): void {
    //---------------xiugai 每次导入trace时触发渲染-----------------
    if (this._rangeRuler && this._sportRuler) {
      sessionStorage.setItem('foldHeight', String(56.25))
      if (this._checkExpand && this._checkExpand === true) {
        this._checkExpand = false;
        sessionStorage.setItem('expand', String(this._checkExpand))
      }
      sessionStorage.setItem('expand', String(this._checkExpand))
      this.usageEL!.innerHTML = '';
      this.usageEL!.style.textAlign = 'center';
      this.usageEL!.style.height = `${100 - 56.25}px`;
      this.usageEL!.style.lineHeight = `${100 - 56.25}px`;
      this.timerShaftEL!.style.height = `${146 - 56.25 + 2}px`;
      this.canvas!.style.height = `${146 - 56.25}px`;
      this.canvas!.height = 146 - 56.25;
      this.rowsPaneEL!.style.maxHeight = `${this.rowsPaneEL!.clientHeight + 200}px`;
      this._rangeRuler.frame.height = 18.75;
      this._sportRuler.frame.y = 43.75;

      this.render();
      this._checkExpand = true;
      this._cpuUsageCount = []//清空判断数据
    }
    // ------------------------jieshu------------------
  }

  initElements(): void {
    this.root = this.shadowRoot?.querySelector('.root');
    this.canvas = this.shadowRoot?.querySelector('.panel');
    this.totalEL = this.shadowRoot?.querySelector('.total');
    this.collect1 = this.shadowRoot?.querySelector('#collect1');
    this.timeTotalEL = this.shadowRoot?.querySelector('.time-total');
    this.timeOffsetEL = this.shadowRoot?.querySelector('.time-offset');
    this.collecBtn = this.shadowRoot?.querySelector('.time-collect');
    this.collectGroup = this.shadowRoot?.querySelector('.collect_group');
    this.collectGroup?.addEventListener('click', (e) => {
      // @ts-ignore
      if (e.target && e.target.tagName === 'INPUT') {
        // @ts-ignore
        window.publish(window.SmartEvent.UI.CollectGroupChange, e.target.value);
      }
    });
    procedurePool.timelineChange = (a: any) => this.rangeChangeHandler?.(a);
    window.subscribe(window.SmartEvent.UI.TimeRange, (b) => this.setRangeNS(b.startNS, b.endNS));
    // -----------------------------xiugai---------------------------------
    this.usageEL = this.shadowRoot?.querySelector('.cpu-usage');
    this.timerShaftEL = this.shadowRoot!.host.parentNode?.querySelector('.timer-shaft');
    this.rowsPaneEL = this.shadowRoot!.host.parentNode?.querySelector('.rows-pane');
    const height = this.canvas?.clientHeight || 0;
    // 点击cpu usage部分，切换折叠展开
    this.usageEL?.addEventListener('click', (e) => {
      if (this._rangeRuler && this.sportRuler && this._cpuUsageCount.length) {
        // 计算需要被收起来的高度：总高度75-（总高度/cpu数量）* 2
        this._usageFoldHeight = this.usageExpandHeight - (this.usageExpandHeight / this._rangeRuler.cpuCountData!) * 2;
        if (this._checkExpand) {
          sessionStorage.setItem('expand', String(this._checkExpand))
          sessionStorage.setItem('foldHeight', String(this._usageFoldHeight))
          this.usageEL!.style.height = '100px';
          this.usageEL!.style.lineHeight = '100px';
          this.usageEL!.style.textAlign = 'center';
          this.timerShaftEL!.style.height = `${height + 2}px`;
          this.canvas!.style.height = `${height}px`;
          this.canvas!.height = height;
          this._rangeRuler.frame.height = 75;
          this.sportRuler.frame.y = 100;
          this.render();
          this._checkExpand = false;
        } else {
          sessionStorage.setItem('expand', String(this._checkExpand))
          sessionStorage.setItem('foldHeight', String(this._usageFoldHeight))
          this.usageEL!.style.textAlign = 'center';
          this.usageEL!.style.height = `${100 - this._usageFoldHeight}px`;
          this.usageEL!.style.lineHeight = `${100 - this._usageFoldHeight}px`;
          this.timerShaftEL!.style.height = `${height - this._usageFoldHeight + 2}px`;
          this.canvas!.style.height = `${height - this._usageFoldHeight}px`;
          this.canvas!.height = height - this._usageFoldHeight;
          this._rangeRuler.frame.height = 75 - this._usageFoldHeight;
          this.sportRuler.frame.y = 100 - this._usageFoldHeight;
          this.render();
          this._checkExpand = true;
        }
      }
    });
    // -------------------------------------jieshu---------------------------
  }
}
