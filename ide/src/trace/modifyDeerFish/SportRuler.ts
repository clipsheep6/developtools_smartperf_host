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

export class SportRuler extends Graph {

  drawInvertedTriangle(time: number, color: string = '#000000') {
    if (time != null && typeof time != undefined) {
      let x = Math.round((this.rulerW * (time - this.range.startNS)) / (this.range.endNS - this.range.startNS));
      this.context2D.beginPath();
      this.context2D.fillStyle = color;
      this.context2D.strokeStyle = color;
      // ----------------xiugai  修改小倒三角位置的绘制---------------------
      if (sessionStorage.getItem('expand') === 'true') {//展开
        this.context2D.moveTo(x - 3, 141);
        this.context2D.lineTo(x + 3, 141);
        this.context2D.lineTo(x, 145);
      } else if (sessionStorage.getItem('expand') === 'false') {
        this.context2D.moveTo(x - 3, 141 - Number(sessionStorage.getItem('foldHeight')));
        this.context2D.lineTo(x + 3, 141 - Number(sessionStorage.getItem('foldHeight')));
        this.context2D.lineTo(x, 145 - Number(sessionStorage.getItem('foldHeight')));
      }
      // --------------------jieshu-------------------------
      this.context2D.fill();
      this.context2D.closePath();
      this.context2D.stroke();
    }
  }

  private drawSlicesTimeText(slicesTime: SlicesTime, startX: number, endX: number): number[] {
    this.context2D.beginPath();
    this.context2D.strokeStyle = slicesTime.color;
    this.context2D.fillStyle = slicesTime.color;
    this.range.slicesTime.color = slicesTime.color; //紫色
    // ---------------------------------------xiugai 修改标记绘制位置-------------------------
    if (sessionStorage.getItem('expand') === 'true') {//展开
      this.context2D.moveTo(startX + TRIWIDTH, 132);
      this.context2D.lineTo(startX, 142);
      this.context2D.lineTo(startX, 132);
      this.context2D.lineTo(startX + TRIWIDTH, 132);

      this.context2D.lineTo(endX - TRIWIDTH, 132);
      this.context2D.lineTo(endX, 132);
      this.context2D.lineTo(endX, 142);
      this.context2D.lineTo(endX - TRIWIDTH, 132);
    } else if (sessionStorage.getItem('expand') === 'false') {
      this.context2D.moveTo(startX + TRIWIDTH, 132 - Number(sessionStorage.getItem('foldHeight')));
      this.context2D.lineTo(startX, 142 - Number(sessionStorage.getItem('foldHeight')));
      this.context2D.lineTo(startX, 132 - Number(sessionStorage.getItem('foldHeight')));
      this.context2D.lineTo(startX + TRIWIDTH, 132 - Number(sessionStorage.getItem('foldHeight')));

      this.context2D.lineTo(endX - TRIWIDTH, 132 - Number(sessionStorage.getItem('foldHeight')));
      this.context2D.lineTo(endX, 132 - Number(sessionStorage.getItem('foldHeight')));
      this.context2D.lineTo(endX, 142 - Number(sessionStorage.getItem('foldHeight')));
      this.context2D.lineTo(endX - TRIWIDTH, 132 - Number(sessionStorage.getItem('foldHeight')));
    }
    // -----------------------jieshu----------------------
  }


  //绘制旗子
  drawFlag(x: number, color: string = '#999999', isFill: boolean = false, textStr: string = '', type: string = '') {
    if (x < 0) return;
    this.context2D.beginPath();
    this.context2D.fillStyle = color;
    this.context2D.strokeStyle = color;
    // ------------------xiugai  修改旗子位置----------------------------
    if (sessionStorage.getItem('expand') === 'true') {
      this.context2D.moveTo(x, 125);
      if (type == 'triangle') {
        this.context2D.lineTo(x + 15, 131);
      } else {
        this.context2D.lineTo(x + 10, 125);
        this.context2D.lineTo(x + 10, 127);
        this.context2D.lineTo(x + 18, 127);
        this.context2D.lineTo(x + 18, 137);
        this.context2D.lineTo(x + 10, 137);
        this.context2D.lineTo(x + 10, 135);
      }
      this.context2D.lineTo(x + 2, 135);
      this.context2D.lineTo(x + 2, 142);
      this.context2D.lineTo(x, 142);
    } else {
      this.context2D.moveTo(x, 125 - Number(sessionStorage.getItem('foldHeight')));
      if (type == 'triangle') {
        this.context2D.lineTo(x + 15, 131 - Number(sessionStorage.getItem('foldHeight')));
      } else {
        this.context2D.lineTo(x + 10, 125 - Number(sessionStorage.getItem('foldHeight')));
        this.context2D.lineTo(x + 10, 127 - Number(sessionStorage.getItem('foldHeight')));
        this.context2D.lineTo(x + 18, 127 - Number(sessionStorage.getItem('foldHeight')));
        this.context2D.lineTo(x + 18, 137 - Number(sessionStorage.getItem('foldHeight')));
        this.context2D.lineTo(x + 10, 137 - Number(sessionStorage.getItem('foldHeight')));
        this.context2D.lineTo(x + 10, 135 - Number(sessionStorage.getItem('foldHeight')));
      }
      this.context2D.lineTo(x + 2, 135 - Number(sessionStorage.getItem('foldHeight')));
      this.context2D.lineTo(x + 2, 142 - Number(sessionStorage.getItem('foldHeight')));
      this.context2D.lineTo(x, 142 - Number(sessionStorage.getItem('foldHeight')));
    }
    // -----------------------------------jieshu--------------------------------

    this.context2D.closePath();
    isFill && this.context2D.fill();
    this.context2D.stroke();
    if (textStr !== '') {
      this.context2D.font = TEXT_FONT;
      const { width } = this.context2D.measureText(textStr);
      this.context2D.fillStyle = 'rgba(255, 255, 255, 0.8)'; //
      // -------------------xiugai 旗子上的字-----------------------
      if (sessionStorage.getItem('expand') === 'true') {
        this.context2D.fillRect(x + 21, 132, width + 4, 12);
        this.context2D.fillStyle = 'black';
        this.context2D.fillText(textStr, x + 23, 142);
      } else {
        this.context2D.fillRect(x + 21, 132 - Number(sessionStorage.getItem('foldHeight')), width + 4, 12);
        this.context2D.fillStyle = 'black';
        this.context2D.fillText(textStr, x + 23, 142 - Number(sessionStorage.getItem('foldHeight')));
      }
      // ----------------------------jieshu---------------------------
      this.context2D.stroke();
    }
  }

  /**
   * 查找鼠标所在位置是否存在"帽子"对象，为了操作方便，框选时把三角形的边长宽度左右各加一个像素。
   * @param x 水平坐标值
   * @returns
   */
  findSlicesTime(x: number, y: number): SlicesTime | null {
    // --------------------------xiugai  修改旗子和标记的小三角重叠时的情况-------------------
    let slicestime;
    if (sessionStorage.getItem('expand') === 'false') {//折叠
      slicestime = this.slicesTimeList.find((slicesTime) => {
        return (
          ((x >= slicesTime.startX - 1 && x <= slicesTime.startX + TRIWIDTH + 1) || // 选中了帽子的左边三角形区域
            (x >= slicesTime.endX - TRIWIDTH - 1 && x <= slicesTime.endX + 1)) && // 选中了帽子的右边三角形区域
          y >= 132 - Number(sessionStorage.getItem('foldHeight')) &&
          y <= 142 - Number(sessionStorage.getItem('foldHeight'))
        );
      });
    } else if (sessionStorage.getItem('expand') === 'true') {
      slicestime = this.slicesTimeList.find((slicesTime) => {
        return (
          ((x >= slicesTime.startX - 1 && x <= slicesTime.startX + TRIWIDTH + 1) || // 选中了帽子的左边三角形区域
            (x >= slicesTime.endX - TRIWIDTH - 1 && x <= slicesTime.endX + 1)) && // 选中了帽子的右边三角形区域
          y >= 132 &&
          y <= 142
        );
      });
    }
    // ----------------------------jieshu-------------------------
    if (!slicestime) {
      return null;
    }
    return slicestime;
  }
}
