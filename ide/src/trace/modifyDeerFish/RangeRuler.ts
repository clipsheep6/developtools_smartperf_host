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

import { Graph } from './Graph';
import { Rect } from './Rect';
import { ns2UnitS, TimerShaftElement } from '../TimerShaftElement';
import { ColorUtils, interpolateColorBrightness } from '../base/ColorUtils';
import { CpuStruct } from '../../../database/ui-worker/cpu/ProcedureWorkerCPU';
import { CurrentSlicesTime, SpSystemTrace } from '../../SpSystemTrace';

export class Mark extends Graph {
  name: string | undefined;
  inspectionFrame: Rect;
  private _isHover: boolean = false;

export class RangeRuler extends Graph {
  get cpuCountData(): number | undefined {
    return this._cpuCountData;
  }

  set cpuCountData(value: number | undefined) {
    this._cpuCountData = value;
  }

  drawCpuUsage(): void {
    this.context2D.clearRect(this.frame.x, this.frame.y, this.frame.width, this.frame.height);
    let miniHeight = Math.round(this.frame.height / CpuStruct.cpuCount); //每格高度
    let miniWidth = Math.ceil(this.frame.width / 100); //每格宽度
    this._cpuCountData = CpuStruct.cpuCount;

    if (sessionStorage.getItem('expand') === 'true') {//展开
      miniHeight = Math.round(this.frame.height / CpuStruct.cpuCount);
    } else if (sessionStorage.getItem('expand') === 'false') {
      miniHeight = Math.round(this.frame.height / 2);
    }
    for (let index = 0; index < this._cpuUsage.length; index++) {
      let cpuUsageItem = this._cpuUsage[index];
      const color = interpolateColorBrightness(ColorUtils.MD_PALETTE[cpuUsageItem.cpu], cpuUsageItem.rate);
      this.context2D.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      this.context2D.globalAlpha = cpuUsageItem.rate;
      this.context2D.fillRect(
        this.frame.x + miniWidth * cpuUsageItem.ro,
        this.frame.y + cpuUsageItem.cpu * miniHeight,
        miniWidth,
        miniHeight
      );
    }
  }

  private drawSelectionRange(): void {
    this.context2D.fillStyle = window.getComputedStyle(this.canvas!, null).getPropertyValue('background-color');
    this.rangeRect.x = this.markAObj.frame.x < this.markBObj.frame.x ? this.markAObj.frame.x : this.markBObj.frame.x;
    this.rangeRect.width = Math.abs(this.markBObj.frame.x - this.markAObj.frame.x);
    this.context2D.fillRect(this.rangeRect.x, this.rangeRect.y, this.rangeRect.width, this.rangeRect.height);
    this.context2D.globalAlpha = 1;
    this.context2D.globalAlpha = 0.5;
    this.context2D.fillStyle = '#999999';
    // ----------------------- 绘制选择的阴影高度---------------------
    if (sessionStorage.getItem('expand') === 'true') {//展开
      this.context2D.fillRect(this.frame.x, this.frame.y, this.rangeRect.x, this.rangeRect.height + Number(sessionStorage.getItem('foldHeight')));
      this.context2D.fillRect(
        this.rangeRect.x + this.rangeRect.width,
        this.frame.y,
        this.frame.width - this.rangeRect.width,
        this.rangeRect.height + Number(sessionStorage.getItem('foldHeight'))
      );
    } else if (sessionStorage.getItem('expand') === 'false') {
      this.context2D.fillRect(this.frame.x, this.frame.y, this.rangeRect.x, this.rangeRect.height);
      this.context2D.fillRect(
        this.rangeRect.x + this.rangeRect.width,
        this.frame.y,
        this.frame.width - this.rangeRect.width,
        this.rangeRect.height
      );
    }
    this.context2D.globalAlpha = 1;
    this.context2D.closePath();
    this.markAObj.draw();
    this.markBObj.draw();
  }

  getScale(): number {
    return this.scale;
  }
}