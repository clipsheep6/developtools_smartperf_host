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
import { ColorUtils } from './ColorUtils';
import { LitRadioBox } from '../../../../base-ui/radiobox/LitRadioBox';
import { SpApplication } from '../../../SpApplication';
import { SpSystemTrace } from '../../SpSystemTrace';
import { CustomThemeColorHtml } from './CustomThemeColor.html';

@element('custom-theme-color')
export class CustomThemeColor extends BaseElement {
  private application: SpApplication | undefined | null;
  private radios: NodeListOf<LitRadioBox> | undefined | null;
  private colorsArray: Array<string> = [];
  private colorsEl: HTMLDivElement | undefined | null;
  private theme: Theme = Theme.LIGHT;
  private systemTrace: SpSystemTrace | undefined | null;

  static get observedAttributes(): string[] {
    return ['mode'];
  }

  init(): void {
    window.localStorage.getItem('Theme') === 'light' ? (this.theme = Theme.LIGHT) : (this.theme = Theme.DARK);
    if (window.localStorage.getItem('Theme') === 'light' || !window.localStorage.getItem('Theme')) {
      this.theme = Theme.LIGHT;
    } else {
      this.theme = Theme.DARK;
    }
    this.application!.changeTheme(this.theme);
    this.setRadioChecked(this.theme);
  }

  /**
   * 更新色板
   * @param colorsEl 色板的父元素
   */
  createColorsEl(colorsEl: HTMLDivElement): void {
    for (let i = 0; i < this.colorsArray!.length; i++) {
      let div = document.createElement('div');
      div.className = 'color-wrap';
      let input = document.createElement('input');
      input.type = 'color';
      input.className = 'color';
      input.value = this.colorsArray![i];
      div.appendChild(input);
      colorsEl?.appendChild(div);
      input.addEventListener('change', (evt: unknown): void => {
        //@ts-ignore
        input.value = evt?.target.value; //@ts-ignore
        this.colorsArray![i] = evt?.target.value;
      });
    }
  }

  /**
   * 根据传入的主题改变color setting页面的单选框状态，更新颜色数组
   * @param theme 主题模式
   */
  setRadioChecked(theme: Theme): void {
    for (let i = 0; i < this.radios!.length; i++) {
      if (this.radios![i].innerHTML === theme) {
        this.radios![i].setAttribute('checked', '');
        if (theme === Theme.LIGHT) {
          this.colorsArray =
            window.localStorage.getItem('LightThemeColors') === null
              ? [...ColorUtils.FUNC_COLOR_A]
              : JSON.parse(window.localStorage.getItem('LightThemeColors')!);
        } else {
          this.colorsArray =
            window.localStorage.getItem('DarkThemeColors') === null
              ? [...ColorUtils.FUNC_COLOR_B]
              : JSON.parse(window.localStorage.getItem('DarkThemeColors')!);
        }
      } else {
        this.radios![i].removeAttribute('checked');
      }
    }
    this.colorsEl!.innerHTML = '';
    this.createColorsEl(this.colorsEl!);
  }

  initElements(): void {
    this.colorsEl = this.shadowRoot?.querySelector('.colors') as HTMLDivElement;
    this.application = document.querySelector('body > sp-application') as SpApplication;
    this.systemTrace = this.application.shadowRoot!.querySelector<SpSystemTrace>('#sp-system-trace');
    let close = this.shadowRoot?.querySelector('.page-close');
    this.radioClick();
    close!.addEventListener('click', (): void => {
      if (this.application!.hasAttribute('custom-color')) {
        this.application!.removeAttribute('custom-color');
        this.setAttribute('hidden', '');
      }
      this.cancelOperate();
    });
    let resetBtn = this.shadowRoot?.querySelector<HTMLButtonElement>('#reset');
    let previewBtn = this.shadowRoot?.querySelector<HTMLButtonElement>('#preview');
    let confirmBtn = this.shadowRoot?.querySelector<HTMLButtonElement>('#confirm');

    resetBtn?.addEventListener('click', (): void => {
      if (this.theme === Theme.LIGHT) {
        window.localStorage.setItem('LightThemeColors', JSON.stringify(ColorUtils.FUNC_COLOR_A));
      } else {
        window.localStorage.setItem('DarkThemeColors', JSON.stringify(ColorUtils.FUNC_COLOR_B));
      }
      this.application!.changeTheme(this.theme);
    });

    previewBtn?.addEventListener('click', (): void => {
      this.application!.changeTheme(this.theme, [...this.colorsArray]);
    });

    confirmBtn?.addEventListener('click', (): void => {
      this.confirmOPerate();
    });
    // 鼠标移入该页面，cpu泳道图恢复鼠标移出状态（鼠标移入cpu泳道图有数据的矩形上，和该矩形的tid或者pid不同的矩形会变灰，移出矩形，所有矩形恢复颜色）
    this.addEventListener('mousemove', (): void => {
      this.systemTrace!.tipEL!.style.display = 'none';
      this.systemTrace!.hoverStructNull();
      this.systemTrace!.refreshCanvas(true);
    });
  }

  private radioClick(): void {
    this.radios = this.shadowRoot?.querySelectorAll('.litRadio');
    if (this.radios) {
      for (let i = 0; i < this.radios.length; i++) {
        this.radios![i].shadowRoot!.querySelector<HTMLSpanElement>('.selected')!.classList.add('blue');
        this.radios[i].addEventListener('click', (): void => {
          // 点击颜色模式的单选框，色板切换
          if (this.radios![i].innerHTML === Theme.LIGHT) {
            if (this.radios![i].getAttribute('checked') === null) {
              this.colorsArray =
                window.localStorage.getItem('LightThemeColors') === null
                  ? [...ColorUtils.FUNC_COLOR_A]
                  : JSON.parse(window.localStorage.getItem('LightThemeColors')!);
              this.theme = Theme.LIGHT;
            } else {
              return;
            }
          } else if (this.radios![i].innerHTML === Theme.DARK) {
            if (this.radios![i].getAttribute('checked') === null) {
              this.colorsArray =
                window.localStorage.getItem('DarkThemeColors') === null
                  ? [...ColorUtils.FUNC_COLOR_B]
                  : JSON.parse(window.localStorage.getItem('DarkThemeColors')!);
              this.theme = Theme.DARK;
            } else {
              return;
            }
          }
          this.colorsEl!.innerHTML = '';
          this.createColorsEl(this.colorsEl!);
          this.confirmOPerate();
        });
      }
    }
  }

  confirmOPerate(): void {
    window.localStorage.setItem('Theme', this.theme);
    if (this.theme === Theme.LIGHT) {
      window.localStorage.setItem('LightThemeColors', JSON.stringify([...this.colorsArray]));
    } else {
      window.localStorage.setItem('DarkThemeColors', JSON.stringify([...this.colorsArray]));
    }
    this.application!.changeTheme(this.theme);
    this.setRadioChecked(this.theme);
  }

  cancelOperate(): void {
    if (window.localStorage.getItem('Theme') === 'light' || !window.localStorage.getItem('Theme')) {
      this.theme = Theme.LIGHT;
      this.colorsArray =
        window.localStorage.getItem('LightThemeColors') === null
          ? [...ColorUtils.FUNC_COLOR_A]
          : JSON.parse(window.localStorage.getItem('LightThemeColors')!);
    } else if (window.localStorage.getItem('Theme') === 'dark') {
      this.theme = Theme.DARK;
      this.colorsArray =
        window.localStorage.getItem('DarkThemeColors') === null
          ? [...ColorUtils.FUNC_COLOR_B]
          : JSON.parse(window.localStorage.getItem('DarkThemeColors')!);
    }
    this.application!.changeTheme(this.theme);
    // 恢复颜色模式单选框checked状态
    this.setRadioChecked(this.theme);
  }

  connectedCallback(): void {}

  initHtml(): string {
    return CustomThemeColorHtml;
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (name === 'mode' && newValue === '') {
      this.init();
    }
  }
}
export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}
import { BaseElement, element } from '../../../../base-ui/BaseElement';
import { TraceRowObject } from './TraceRowObject';
import { TraceRow } from './TraceRow';
import { log } from '../../../../log/Log';
// @ts-ignore
@element('trace-row-recycler-view')
export class TraceRowRecyclerView extends BaseElement {
  private recycler: boolean = true;
  private gasketEL: HTMLDivElement | null | undefined;
  private vessel: HTMLDivElement | null | undefined;
  private visibleRowsCount: number = 0; // @ts-ignore
  private visibleObjects: TraceRowObject<unknown>[] = [];
  private totalHeight: number = 0;
  // @ts-ignore
  private _dataSource: Array<TraceRowObject<unknown>> = [];
  private _renderType: string = 'div';
  // @ts-ignore
  get dataSource(): Array<TraceRowObject<unknown>> {
    return this._dataSource;
  }
  // @ts-ignore
  set dataSource(value: Array<TraceRowObject<unknown>>) {
    log(`dataSource TraceRowObject size :${value.length}`);
    this._dataSource = value;
    this.measureHeight();
    this.initUI(); // @ts-ignore
    let els = [...this.shadowRoot!.querySelectorAll<TraceRow<unknown>>('.recycler-cell')];
    for (let i = 0; i < els.length; i++) {
      this.refreshRow(els[i], this.visibleObjects[i]);
    }
  }

  get renderType(): string {
    return this._renderType;
  }

  set renderType(value: string) {
    this._renderType = value;
  }
  // @ts-ignore
  refreshRow(el: TraceRow<unknown>, obj: TraceRowObject<unknown>): void {
    if (!obj) {
      return;
    }
    el.obj = obj;
    el.folder = obj.folder;
    el.style.top = `${obj.top}px`;
    el.name = obj.name || '';
    if (obj.children) {
      el.setAttribute('children', '');
    } else {
      el.removeAttribute('children');
    }
    el.style.visibility = 'visible';
    el.rowId = obj.rowId;
    el.rowType = obj.rowType;
    el.rowParentId = obj.rowParentId;
    el.expansion = obj.expansion;
    el.rowHidden = obj.rowHidden;
    el.setAttribute('height', `${obj.rowHeight}`);
    requestAnimationFrame(() => {});
  }

  initElements(): void {
    this.vessel = this.shadowRoot?.querySelector<HTMLDivElement>('.vessel');
    this.gasketEL = this.shadowRoot?.querySelector<HTMLDivElement>('.gasket'); // @ts-ignore
    let els: Array<TraceRow<unknown>> | undefined | null;
    this.vessel!.onscroll = (ev): void => {
      let top = this.vessel!.scrollTop;
      let skip = 0;
      for (let index = 0; index < this.visibleObjects.length; index++) {
        if (this.visibleObjects[index].top >= top) {
          skip = this.visibleObjects[index].rowIndex - 1;
          break;
        }
      }
      if (skip < 0) {
        skip = 0;
      }
      if (!els) {
        // @ts-ignore
        els = [...this.shadowRoot!.querySelectorAll<TraceRow<unknown>>('.recycler-cell')];
      }
      for (let i = 0; i < els.length; i++) {
        let obj = this.visibleObjects[i + skip];
        this.refreshRow(els[i], obj);
      }
    };
  }

  measureHeight(): void {
    this.visibleObjects = this.dataSource.filter((it) => !it.rowHidden);
    this.totalHeight = this.visibleObjects.map((it) => it.rowHeight).reduce((a, b) => a + b);
    let totalHeight = 0;
    for (let i = 0; i < this.visibleObjects.length; i++) {
      this.visibleObjects[i].top = totalHeight;
      this.visibleObjects[i].rowIndex = i;
      totalHeight += this.visibleObjects[i].rowHeight;
      this.visibleObjects[i].preObject = i === 0 ? null : this.visibleObjects[i - 1];
      this.visibleObjects[i].nextObject = i === this.visibleObjects.length - 1 ? null : this.visibleObjects[i + 1];
    }
    this.gasketEL && (this.gasketEL.style.height = `${this.totalHeight}px`);
  }

  initUI(): void {
    this.visibleRowsCount = Math.ceil(this.clientHeight / 40);
    if (this.visibleRowsCount >= this.visibleObjects.length) {
      this.visibleRowsCount = this.visibleObjects.length;
    }
    if (!this.recycler) {
      this.visibleRowsCount = this.dataSource.length;
    }
    for (let i = 0; i <= this.visibleRowsCount; i++) {
      // @ts-ignore
      let el = new TraceRow<unknown>({
        canvasNumber: 1,
        alpha: true,
        contextId: '2d',
        isOffScreen: true,
      });
      el.className = 'recycler-cell';
      this.vessel?.appendChild(el);
      el.addEventListener('expansion-change', (ev: unknown): void => {
        // @ts-ignore
        el.obj!.expansion = ev.detail.expansion;
        for (let j = 0; j < this.dataSource.length; j++) {
          // @ts-ignore
          if (this.dataSource[j].rowParentId === ev.detail.rowId) {
            // @ts-ignore
            this.dataSource[j].rowHidden = !ev.detail.expansion;
          }
        }
        this.measureHeight(); // @ts-ignore
        let els = [...this.shadowRoot!.querySelectorAll<TraceRow<unknown>>('.recycler-cell')];
        let top = this.vessel!.scrollTop;
        let skip = 0;
        for (let i = 0; i < this.visibleObjects.length; i++) {
          if (this.visibleObjects[i].top >= top) {
            skip = this.visibleObjects[i].rowIndex - 1;
            break;
          }
        }
        if (skip < 0) {
          skip = 0;
        }
        for (let i = 0; i < els.length; i++) {
          let obj = this.visibleObjects[i + skip];
          this.refreshRow(els[i], obj);
        }
      });
    }
  }

  initHtml(): string {
    return `
        <style>
        :host{
            width:100%;
            height:100%;
            display: block;
            position:relative;
        }
        .vessel{
            width:100%;
            height:100%;
            overflow: auto;
            position: absolute;
            display: block;
        }
        .gasket{
            width:100%;
            height:auto;
            top: 0;
            left: 0;
            right:0;
            bottom:0;
            visibility: hidden;
        }
        .recycler-cell{
            position: absolute;
            width:100%;
            visibility: hidden;
            top: 0;
            left: 0;
        }
        </style>
        <div class="vessel">
            <div class="gasket"></div>
        </div>

        `;
  }
}
import { BaseElement, element } from '../../base-ui/BaseElement';
import { SpAdvertisementHtml } from './SpAdvertisement.html';
import { SpStatisticsHttpUtil } from '../../statistics/util/SpStatisticsHttpUtil';

@element('sp-advertisement')
export class SpAdvertisement extends BaseElement {
    private advertisementEL: HTMLElement | undefined | null;
    private closeEL: HTMLElement | undefined | null;
    private noticeEl: HTMLElement | undefined | null;
    private message: string = '';

    initElements(): void {
        // 整个广告
        this.advertisementEL = document.querySelector('body > sp-application')?.shadowRoot?.
            querySelector('#sp-advertisement')?.shadowRoot?.querySelector('#sp-advertisement');
        // 关闭按钮
        this.closeEL = document.querySelector('body > sp-application')?.shadowRoot?.
            querySelector('#sp-advertisement')?.shadowRoot?.querySelector('#close');
        // 公告内容
        this.noticeEl = document.querySelector('body > sp-application')?.shadowRoot?.
            querySelector('#sp-advertisement')?.shadowRoot?.querySelector('#notice');
        this.getMessage();
        setInterval(() => {
            this.getMessage();
        }, 10000);
        this.closeEL?.addEventListener('click', () => {
            this.advertisementEL!.style!.display = 'none';
        })
    }

    private getMessage(): void {
        SpStatisticsHttpUtil.getNotice().then(res => {
            if (res.status === 200) {
                res.text().then((it) => {
                    let resp = JSON.parse(it);
                    if (resp && resp.data && resp.data.data && resp.data.data !== this.message && resp.data.data !== '') {
                        this.message = resp.data.data;
                        if (this.message.startsWith('图片:')) {
                            this.noticeEl!.style.display = 'flex';
                            this.noticeEl!.style.justifyContent = 'center';
                            this.noticeEl!.innerHTML = `<img src ='${this.message.substring(3, this.message.length)}' style='height:150px' 
                        alt = '图片加载失败'></img>`
                        } else if (this.message.startsWith('链接:')) {
                            this.noticeEl!.style.height = 'auto';
                            this.noticeEl!.style.color = '#000';
                            this.noticeEl!.innerHTML = `链接：<a href = '${this.message.substring(3, this.message.length)}' target = 'black'>
                        ${this.message.substring(3, this.message.length)}</a>`
                        } else {
                            this.noticeEl!.style.color = 'red';
                            this.noticeEl!.innerHTML = this.message;
                        }
                        this.advertisementEL!.style!.display = 'block';
                    }
                });
            } else {
                this.message = '请求错误！';
                this.noticeEl!.style.color = 'red';
                this.noticeEl!.innerHTML = this.message;
                this.advertisementEL!.style!.display = 'block';
            }
        })
    }

    initHtml(): string {
        return SpAdvertisementHtml;
    }
}
import { BaseElement, element } from '../../base-ui/BaseElement';
import { SpAdvertisementHtml } from './SpAdvertisement.html';
import { SpStatisticsHttpUtil } from '../../statistics/util/SpStatisticsHttpUtil';

@element('sp-advertisement')
export class SpAdvertisement extends BaseElement {
    private advertisementEL: HTMLElement | undefined | null;
    private closeEL: HTMLElement | undefined | null;
    private noticeEl: HTMLElement | undefined | null;
    private message: string = '';

    initElements(): void {
        // 整个广告
        this.advertisementEL = document.querySelector('body > sp-application')?.shadowRoot?.
            querySelector('#sp-advertisement')?.shadowRoot?.querySelector('#sp-advertisement');
        // 关闭按钮
        this.closeEL = document.querySelector('body > sp-application')?.shadowRoot?.
            querySelector('#sp-advertisement')?.shadowRoot?.querySelector('#close');
        // 公告内容
        this.noticeEl = document.querySelector('body > sp-application')?.shadowRoot?.
            querySelector('#sp-advertisement')?.shadowRoot?.querySelector('#notice');
        this.getMessage();
        setInterval(() => {
            this.getMessage();
        }, 10000);
        this.closeEL?.addEventListener('click', () => {
            this.advertisementEL!.style!.display = 'none';
        })
    }

    private getMessage(): void {
        SpStatisticsHttpUtil.getNotice().then(res => {
            if (res.status === 200) {
                res.text().then((it) => {
                    let resp = JSON.parse(it);
                    if (resp && resp.data && resp.data.data && resp.data.data !== this.message && resp.data.data !== '') {
                        this.message = resp.data.data;
                        if (this.message.startsWith('图片:')) {
                            this.noticeEl!.style.display = 'flex';
                            this.noticeEl!.style.justifyContent = 'center';
                            this.noticeEl!.innerHTML = `<img src ='${this.message.substring(3, this.message.length)}' style='height:150px' 
                        alt = '图片加载失败'></img>`
                        } else if (this.message.startsWith('链接:')) {
                            this.noticeEl!.style.height = 'auto';
                            this.noticeEl!.style.color = '#000';
                            this.noticeEl!.innerHTML = `链接：<a href = '${this.message.substring(3, this.message.length)}' target = 'black'>
                        ${this.message.substring(3, this.message.length)}</a>`
                        } else {
                            this.noticeEl!.style.color = 'red';
                            this.noticeEl!.innerHTML = this.message;
                        }
                        this.advertisementEL!.style!.display = 'block';
                    }
                });
            } else {
                this.message = '请求错误！';
                this.noticeEl!.style.color = 'red';
                this.noticeEl!.innerHTML = this.message;
                this.advertisementEL!.style!.display = 'block';
            }
        })
    }

    initHtml(): string {
        return SpAdvertisementHtml;
    }
}
initHtml(): string {
    return `
        <style>
        :host{
            width:100%;
            height:100%;
            display: block;
            position:relative;
        }
        .vessel{
            width:100%;
            height:100%;
            overflow: auto;
            position: absolute;
            display: block;
        }
        .gasket{
            width:100%;
            height:auto;
            top: 0;
            left: 0;
            right:0;
            bottom:0;
            visibility: hidden;
        }
        .recycler-cell{
            position: absolute;
            width:100%;
            visibility: hidden;
            top: 0;
            left: 0;
        }
        </style>
        <div class="vessel">
            <div class="gasket"></div>
        </div>

        `;
  }
}
import { BaseElement, element } from '../../base-ui/BaseElement';
import { SpAdvertisementHtml } from './SpAdvertisement.html';
import { SpStatisticsHttpUtil } from '../../statistics/util/SpStatisticsHttpUtil';

@element('sp-advertisement')
export class SpAdvertisement extends BaseElement {
    private advertisementEL: HTMLElement | undefined | null;
    private closeEL: HTMLElement | undefined | null;
    private noticeEl: HTMLElement | undefined | null;
    private message: string = '';

    initElements(): void {
        // 整个广告
        this.advertisementEL = document.querySelector('body > sp-application')?.shadowRoot?.
            querySelector('#sp-advertisement')?.shadowRoot?.querySelector('#sp-advertisement');
        // 关闭按钮
        this.closeEL = document.querySelector('body > sp-application')?.shadowRoot?.
            querySelector('#sp-advertisement')?.shadowRoot?.querySelector('#close');
        // 公告内容
        this.noticeEl = document.querySelector('body > sp-application')?.shadowRoot?.
            querySelector('#sp-advertisement')?.shadowRoot?.querySelector('#notice');
        this.getMessage();
        setInterval(() => {
            this.getMessage();
        }, 10000);
        this.closeEL?.addEventListener('click', () => {
            this.advertisementEL!.style!.display = 'none';
        })
    }

    private getMessage(): void {
        SpStatisticsHttpUtil.getNotice().then(res => {
            if (res.status === 200) {
                res.text().then((it) => {
                    let resp = JSON.parse(it);
                    if (resp && resp.data && resp.data.data && resp.data.data !== this.message && resp.data.data !== '') {
                        this.message = resp.data.data;
                        if (this.message.startsWith('图片:')) {
                            this.noticeEl!.style.display = 'flex';
                            this.noticeEl!.style.justifyContent = 'center';
                            this.noticeEl!.innerHTML = `<img src ='${this.message.substring(3, this.message.length)}' style='height:150px' 
                        alt = '图片加载失败'></img>`
                        } else if (this.message.startsWith('链接:')) {
                            this.noticeEl!.style.height = 'auto';
                            this.noticeEl!.style.color = '#000';
                            this.noticeEl!.innerHTML = `链接：<a href = '${this.message.substring(3, this.message.length)}' target = 'black'>
                        ${this.message.substring(3, this.message.length)}</a>`
                        } else {
                            this.noticeEl!.style.color = 'red';
                            this.noticeEl!.innerHTML = this.message;
                        }
                        this.advertisementEL!.style!.display = 'block';
                    }
                });
            } else {
                this.message = '请求错误！';
                this.noticeEl!.style.color = 'red';
                this.noticeEl!.innerHTML = this.message;
                this.advertisementEL!.style!.display = 'block';
            }
        })
    }

    initHtml(): string {
        return SpAdvertisementHtml;
    }
}
import { BaseElement, element } from '../../base-ui/BaseElement';
import { SpAdvertisementHtml } from './SpAdvertisement.html';
import { SpStatisticsHttpUtil } from '../../statistics/util/SpStatisticsHttpUtil';

@element('sp-advertisement')
export class SpAdvertisement extends BaseElement {
    private advertisementEL: HTMLElement | undefined | null;
    private closeEL: HTMLElement | undefined | null;
    private noticeEl: HTMLElement | undefined | null;
    private message: string = '';

    initElements(): void {
        // 整个广告
        this.advertisementEL = document.querySelector('body > sp-application')?.shadowRoot?.
            querySelector('#sp-advertisement')?.shadowRoot?.querySelector('#sp-advertisement');
        // 关闭按钮
        this.closeEL = document.querySelector('body > sp-application')?.shadowRoot?.
            querySelector('#sp-advertisement')?.shadowRoot?.querySelector('#close');
        // 公告内容
        this.noticeEl = document.querySelector('body > sp-application')?.shadowRoot?.
            querySelector('#sp-advertisement')?.shadowRoot?.querySelector('#notice');
        this.getMessage();
        setInterval(() => {
            this.getMessage();
        }, 10000);
        this.closeEL?.addEventListener('click', () => {
            this.advertisementEL!.style!.display = 'none';
        })
    }

    private getMessage(): void {
        SpStatisticsHttpUtil.getNotice().then(res => {
            if (res.status === 200) {
                res.text().then((it) => {
                    let resp = JSON.parse(it);
                    if (resp && resp.data && resp.data.data && resp.data.data !== this.message && resp.data.data !== '') {
                        this.message = resp.data.data;
                        if (this.message.startsWith('图片:')) {
                            this.noticeEl!.style.display = 'flex';
                            this.noticeEl!.style.justifyContent = 'center';
                            this.noticeEl!.innerHTML = `<img src ='${this.message.substring(3, this.message.length)}' style='height:150px' 
                        alt = '图片加载失败'></img>`
                        } else if (this.message.startsWith('链接:')) {
                            this.noticeEl!.style.height = 'auto';
                            this.noticeEl!.style.color = '#000';
                            this.noticeEl!.innerHTML = `链接：<a href = '${this.message.substring(3, this.message.length)}' target = 'black'>
                        ${this.message.substring(3, this.message.length)}</a>`
                        } else {
                            this.noticeEl!.style.color = 'red';
                            this.noticeEl!.innerHTML = this.message;
                        }
                        this.advertisementEL!.style!.display = 'block';
                    }
                });
            } else {
                this.message = '请求错误！';
                this.noticeEl!.style.color = 'red';
                this.noticeEl!.innerHTML = this.message;
                this.advertisementEL!.style!.display = 'block';
            }
        })
    }

    initHtml(): string {
        return SpAdvertisementHtml;
    }
}
