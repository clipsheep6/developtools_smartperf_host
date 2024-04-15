/*
 * Copyright (C) 2023 Huawei Device Co., Ltd.
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

import { resizeCanvas } from '../helper';
import { BaseElement, element } from '../../BaseElement';
import { LitChartScatterConfig } from './LitChartScatterConfig';

@element('lit-chart-scatter')
export class LitChartScatter extends BaseElement {
  private scatterTipEL: HTMLDivElement | null | undefined;
  private labelsEL: HTMLDivElement | null | undefined;
  canvas: HTMLCanvasElement | undefined | null;
  canvas2: HTMLCanvasElement | undefined | null;
  ctx: CanvasRenderingContext2D | undefined | null;
  originX: number = 0;
  finalX: number = 0;
  originY: number = 0;
  finalY: number = 0;
  options: LitChartScatterConfig | undefined;

  set config(LitChartScatterConfig: LitChartScatterConfig) {
    this.options = LitChartScatterConfig;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.canvas = this.shadowRoot!.querySelector<HTMLCanvasElement>('#canvas');
    this.scatterTipEL = this.shadowRoot!.querySelector<HTMLDivElement>('#tip');
    this.ctx = this.canvas!.getContext('2d', { alpha: true });
    this.labelsEL = this.shadowRoot!.querySelector<HTMLDivElement>('#shape');
    resizeCanvas(this.canvas!);
    this.originX = this.clientWidth * 0.1;
    this.originY = this.clientHeight * 0.9;
    this.finalX = this.clientWidth;
    this.finalY = this.clientHeight * 0.1;
    /*hover效果*/
    this.canvas!.onmousemove = (event) => {
      let pos: Object = {
        x: event.offsetX,
        y: event.offsetY,
      };
      let hoverPoint: Object | boolean = this.checkHover(this.options, pos);
      /**
       * 如果当前有聚焦点
       */
      if (hoverPoint) {
        this.showTip(hoverPoint);
        let samePoint: boolean =
          this.options!.hoverData === hoverPoint ? true : false;
        if (!samePoint) {
          this.resetHoverWithOffScreen();
          this.options!.hoverData = hoverPoint;
        }
        this.paintHover();
      } else {
        //使用离屏canvas恢复
        this.resetHoverWithOffScreen();
        this.hideTip();
      }
    };
  }

  initElements(): void {
    new ResizeObserver((entries, observer) => {
      entries.forEach((it) => {
        resizeCanvas(this.canvas!);
        this.originX = this.clientWidth * 0.1;
        this.originY = this.clientHeight * 0.95;
        this.finalX = this.clientWidth * 0.9;
        this.finalY = this.clientHeight * 0.1;
        this.labelsEL!.innerText = '';
      });
    }).observe(this);
  }
}
